const fs = require('fs');
const path = require('path');
const axios = require('axios');

const localesDir = path.join(__dirname, '../ui/locales');
const sourceFile = path.join(localesDir, 'en.json');

const targetLangs = ['da', 'eu', 'gl'];

async function translateBatch(texts, targetLang) {
    // Protect variables by removing { } temporarily, or just let Google handle it.
    // Usually Google handles {username} fine, but sometimes it translates it.
    // Let's protect them
    let varMap = {};
    let counter = 0;
    
    let processedTexts = texts.map(text => {
        return text.replace(/\{([^}]+)\}/g, (match, p1) => {
            let placeholder = `__VAR${counter}__`;
            varMap[placeholder] = match;
            counter++;
            return placeholder;
        });
    });

    const combined = processedTexts.join(' \n|||\n ');
    
    const params = new URLSearchParams();
    params.append('client', 'gtx');
    params.append('sl', 'en');
    params.append('tl', targetLang);
    params.append('dt', 't');
    params.append('q', combined);

    try {
        const res = await axios.post('https://translate.googleapis.com/translate_a/single', params.toString(), {
            headers: {'Content-Type': 'application/x-www-form-urlencoded'}
        });
        
        let translatedStr = '';
        if (res.data && res.data[0]) {
            res.data[0].forEach(segment => {
                if (segment[0]) translatedStr += segment[0];
            });
        }
        
        // Restore variables
        for (const [placeholder, originalVar] of Object.entries(varMap)) {
            translatedStr = translatedStr.replace(new RegExp(placeholder, 'g'), originalVar);
        }
        
        // Split back
        let results = translatedStr.split(/\s*\|\|\|\s*/);
        
        if (results.length !== texts.length) {
            console.error(`[WARNING] Batch length mismatch for ${targetLang}. Expected ${texts.length}, got ${results.length}`);
            // Fallback: return original texts if split failed
            return texts;
        }
        
        return results;
    } catch (e) {
        console.error(`Error translating batch for ${targetLang}:`, e.message);
        return texts;
    }
}

async function run() {
    const enData = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
    
    // Flatten JSON
    const flatMap = {};
    function flatten(obj, prefix = '') {
        for (const key in obj) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                if (Array.isArray(obj[key])) {
                    obj[key].forEach((item, i) => {
                        flatMap[`${prefix}${key}[${i}]`] = item;
                    });
                } else {
                    flatten(obj[key], `${prefix}${key}.`);
                }
            } else if (typeof obj[key] === 'string') {
                flatMap[`${prefix}${key}`] = obj[key];
            }
        }
    }
    flatten(enData);
    
    const keys = Object.keys(flatMap);
    const values = Object.values(flatMap);
    
    console.log(`Extracted ${keys.length} strings to translate.`);
    
    for (const lang of targetLangs) {
        console.log(`\n--- Starting translation for ${lang} ---`);
        
        let translatedValues = [];
        const BATCH_SIZE = 50;
        
        for (let i = 0; i < values.length; i += BATCH_SIZE) {
            console.log(`Translating batch ${Math.floor(i/BATCH_SIZE)+1} for ${lang}...`);
            const batch = values.slice(i, i + BATCH_SIZE);
            const resBatch = await translateBatch(batch, lang);
            translatedValues = translatedValues.concat(resBatch);
            await new Promise(r => setTimeout(r, 1000)); // sleep 1 second between batches
        }
        
        // Unflatten
        let translatedData = JSON.parse(JSON.stringify(enData)); // clone structure
        
        let valIndex = 0;
        function unflatten(obj) {
            for (const key in obj) {
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    if (Array.isArray(obj[key])) {
                        for(let i=0; i<obj[key].length; i++) {
                            obj[key][i] = translatedValues[valIndex++] || obj[key][i];
                        }
                    } else {
                        unflatten(obj[key]);
                    }
                } else if (typeof obj[key] === 'string') {
                    obj[key] = translatedValues[valIndex++] || obj[key];
                }
            }
        }
        unflatten(translatedData);
        
        fs.writeFileSync(path.join(localesDir, `${lang}.json`), JSON.stringify(translatedData, null, 4));
        console.log(`Finished ${lang}`);
    }
}

run();
