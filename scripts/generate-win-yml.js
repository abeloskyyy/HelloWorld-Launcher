const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const packageJson = require('../package.json');

const version = packageJson.version;
const distDir = path.join(__dirname, '..', 'dist');
const outputYml = path.join(distDir, 'latest.yml');

console.log(`🔍 Buscando archivos .exe en dist/...`);

if (!fs.existsSync(distDir)) {
    console.error(`❌ Error: La carpeta dist/ no existe.`);
    process.exit(1);
}

const files = fs.readdirSync(distDir).filter(f => f.endsWith('.exe'));

if (files.length === 0) {
    console.error(`❌ Error: No se encontraron archivos .exe en la carpeta dist/`);
    console.error("Asegúrate de haber compilado la versión de Windows primero.");
    process.exit(1);
}

let ymlFilesSection = '';
// Determinar cuál será el archivo principal (path y sha512 raíz)
// Normalmente es el instalador universal o el de x64 si no hay universal.
let mainExe = files.find(f => f === 'HelloWorld-Launcher-Installer.exe') 
           || files.find(f => f.includes('x64')) 
           || files[0];
let mainSha512 = '';

for (const fileName of files) {
    const filePath = path.join(distDir, fileName);
    const fileBuffer = fs.readFileSync(filePath);
    
    // electron-updater usa sha512 en base64
    const hashSum = crypto.createHash('sha512');
    hashSum.update(fileBuffer);
    const sha512 = hashSum.digest('base64');
    
    const stats = fs.statSync(filePath);

    ymlFilesSection += `  - url: ${fileName}\n    sha512: ${sha512}\n    size: ${stats.size}\n`;

    if (fileName === mainExe) {
        mainSha512 = sha512;
    }
}

// Crear contenido YAML (idéntico al formato de electron-builder para Windows)
const ymlContent = `version: ${version}
files:
${ymlFilesSection}path: ${mainExe}
sha512: ${mainSha512}
releaseDate: '${new Date().toISOString()}'
`;

fs.writeFileSync(outputYml, ymlContent);
console.log(`✅ ¡Éxito! Archivo generado: ${outputYml}`);
console.log("---------------------------------------------------");
console.log(ymlContent);
console.log("---------------------------------------------------");
console.log("👉 Ahora sube 'latest.yml' y los .exe actualizados a GitHub.");
