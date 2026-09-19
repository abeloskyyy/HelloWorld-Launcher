/**
 * Lightweight i18n manager for HelloWorld Launcher
 */
const I18N_CACHE = {};
window.translations = I18N_CACHE;
// Determine default language from system
let defaultLang = (navigator.language || navigator.userLanguage || 'en').split('-')[0];
if (defaultLang !== 'es' && defaultLang !== 'en') {
    defaultLang = 'en'; // fallback to english if unsupported
}

let currentLanguage = localStorage.getItem('hw_launcher_lang') || defaultLang;
window.currentLanguage = currentLanguage;

async function loadLocale(lang) {
    if (lang !== 'en' && !I18N_CACHE['en']) {
        // Preload English in background for fallbacks
        fetch(`locales/en.json?v=${Date.now()}`)
            .then(res => res.ok ? res.json() : null)
            .then(data => { if (data) I18N_CACHE['en'] = data; })
            .catch(() => {});
    }
    if (I18N_CACHE[lang]) return I18N_CACHE[lang];
    try {
        const res = await fetch(`locales/${lang}.json?v=${Date.now()}`);
        if (!res.ok) throw new Error('Locale not found');
        const data = await res.json();
        I18N_CACHE[lang] = data;
        return data;
    } catch (e) {
        console.error(`Error loading locale ${lang}:`, e);
        return null;
    }
}
window.loadLocale = loadLocale;

function getNestedValue(obj, path) {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

// Function to translate a specific key
window.t = function(key, variables = {}) {
    const localeData = I18N_CACHE[currentLanguage];
    let value = localeData ? getNestedValue(localeData, key) : null;
    
    // Fallback to English if key is missing in the current language
    if (!value && currentLanguage !== 'en') {
        const enData = I18N_CACHE['en'];
        if (enData) {
            value = getNestedValue(enData, key);
        }
    }
    
    if (!value) return key; // ultimate fallback to key string
    
    // Replace variables (e.g. {username})
    for (const [k, v] of Object.entries(variables)) {
        value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
    
    return value;
};

// Function to scan DOM and apply translations
window.applyTranslations = async function() {
    await Promise.all([
        loadLocale(currentLanguage),
        currentLanguage !== 'en' ? loadLocale('en') : Promise.resolve()
    ]);
    
    if (typeof window.updateTipsFromLang === 'function') {
        window.updateTipsFromLang();
    }
    
    window.dispatchEvent(new Event('language-changed'));
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translatedText = window.t(key);
        
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            // For inputs, we should normally use data-i18n-placeholder, but if data-i18n is used, set the placeholder anyway.
            el.placeholder = translatedText;
            return;
        }
        
        // Preserve inner icons if they exist
        const icon = el.querySelector('i');
        if (icon) {
            const temp = document.createElement('div');
            temp.innerHTML = ' ' + translatedText;
            el.innerHTML = '';
            el.appendChild(icon);
            while (temp.firstChild) {
                el.appendChild(temp.firstChild);
            }
        } else {
            el.innerHTML = translatedText;
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = window.t(key);
    });

    document.querySelectorAll('[data-i18n-tooltip]').forEach(el => {
        const key = el.getAttribute('data-i18n-tooltip');
        el.setAttribute('data-tooltip', window.t(key));
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        el.setAttribute('title', window.t(key));
    });
};


window.currentLanguage = currentLanguage;

window.setLanguage = async function(lang) {
    currentLanguage = lang;
    window.currentLanguage = lang;
    localStorage.setItem('hw_launcher_lang', lang);
    await applyTranslations();
    updateDropdownUI();
    
    // Ensure it is saved to the python/electron backend persistently
    if (window.pywebview && window.pywebview.api && window.pywebview.api.save_user_settings) {
        window.pywebview.api.save_user_settings({ language: lang });
    }
};

let pendingLanguage = currentLanguage;
window.pendingLanguage = pendingLanguage;

window.AVAILABLE_LANGS = {
    'en': { flag: 'GB', name: 'English' },
    'es': { flag: 'ES', name: 'Español' },
    'ca': { flag: 'ES-CT', name: 'Català' },
    'ja': { flag: 'JP', name: '日本語' },
    'fr': { flag: 'FR', name: 'Français' },
    'de': { flag: 'DE', name: 'Deutsch' },
    'pt': { flag: 'PT', name: 'Português' },
    'it': { flag: 'IT', name: 'Italiano' },
    'ru': { flag: 'RU', name: 'Русский' },
    'zh': { flag: 'CN', name: '中文' },
    'ko': { flag: 'KR', name: '한국어' },
    'ar': { flag: 'SA', name: 'العربية' },
    'pl': { flag: 'PL', name: 'Polski' },
    'nl': { flag: 'NL', name: 'Nederlands' },
    'sv': { flag: 'SE', name: 'Svenska' },
    'tr': { flag: 'TR', name: 'Türkçe' },
    'hi': { flag: 'IN', name: 'हिन्दी' },
    'th': { flag: 'TH', name: 'ไทย' },
    'el': { flag: 'GR', name: 'Ελληνικά' },
    'cs': { flag: 'CZ', name: 'Čeština' },
    'da': { flag: 'DK', name: 'Dansk' },
    'eu': { flag: 'ES-PV', name: 'Euskara', customFlagUrl: 'img/es-pv.svg' },
    'gl': { flag: 'ES-GA', name: 'Galego', customFlagUrl: 'img/es-ga.svg' }
};

function updateDropdownUI() {
    const langToDisplay = window.pendingLanguage || window.currentLanguage || 'en';
    const langData = window.AVAILABLE_LANGS[langToDisplay] || window.AVAILABLE_LANGS['en'];
    
    // update main UI dropdown
    const mainFlag = document.getElementById('currentLangIcon');
    const mainText = document.getElementById('currentLangText');
    if (mainFlag && mainText) {
        mainFlag.src = langData.customFlagUrl || `https://purecatamphetamine.github.io/country-flag-icons/3x2/${langData.flag}.svg`;
        mainText.textContent = langData.name;
    }

    // update wizard UI dropdown
    const wizFlag = document.getElementById('wizCurrentLangIcon');
    const wizText = document.getElementById('wizCurrentLangText');
    if (wizFlag && wizText) {
        wizFlag.src = langData.customFlagUrl || `https://purecatamphetamine.github.io/country-flag-icons/3x2/${langData.flag}.svg`;
        wizText.textContent = langData.name;
    }
}

// Function called by dropdown items (only updates UI state)
window.selectLanguage = function(lang) {
    window.pendingLanguage = lang;
    updateDropdownUI();
    const menu = document.getElementById('langDropdownMenu');
    if (menu) menu.classList.remove('show');
};

// Called when saving settings
window.applyPendingLanguage = async function() {
    if (window.pendingLanguage !== window.currentLanguage) {
        await window.setLanguage(window.pendingLanguage);
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateDropdownUI();
    
    // Setup dropdown toggle
    const btn = document.getElementById('langDropdownBtn');
    const menu = document.getElementById('langDropdownMenu');
    if (btn && menu) {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!btn.contains(e.target) && !menu.contains(e.target)) {
                menu.classList.remove('show');
            }
        });
    }
});
