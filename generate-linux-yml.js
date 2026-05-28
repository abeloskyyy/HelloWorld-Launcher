const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const packageJson = require('./package.json');

const version = packageJson.version;
const distDir = path.join(__dirname, 'dist');
const outputYml = path.join(distDir, 'latest-linux.yml');

console.log(`🔍 Buscando archivos .AppImage en dist/...`);

const files = fs.readdirSync(distDir).filter(f => f.endsWith('.AppImage'));

if (files.length === 0) {
    console.error(`❌ Error: No se encontraron archivos .AppImage en la carpeta dist/`);
    console.error("Asegúrate de haber compilado la versión de Linux primero.");
    process.exit(1);
}

let ymlFilesSection = '';
let firstAppImageName = files[0];
let firstSha512 = '';

for (const fileName of files) {
    const filePath = path.join(distDir, fileName);
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha512');
    hashSum.update(fileBuffer);
    const sha512 = hashSum.digest('base64');
    const stats = fs.statSync(filePath);

    ymlFilesSection += `  - url: ${fileName}
    sha512: ${sha512}
    size: ${stats.size}
`;

    if (fileName === firstAppImageName) {
        firstSha512 = sha512;
    }
}

// Crear contenido YAML
const ymlContent = `version: ${version}
files:
${ymlFilesSection}path: ${firstAppImageName}
sha512: ${firstSha512}
releaseDate: '${new Date().toISOString()}'
`;

fs.writeFileSync(outputYml, ymlContent);
console.log(`✅ ¡Éxito! Archivo generado: ${outputYml}`);
console.log("---------------------------------------------------");
console.log(ymlContent);
console.log("---------------------------------------------------");
console.log("👉 Ahora sube 'latest-linux.yml' y los .AppImage a GitHub.");
