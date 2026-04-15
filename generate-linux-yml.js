const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const packageJson = require('./package.json');

const version = packageJson.version;
const distDir = path.join(__dirname, 'dist');
const appImageName = `HelloWorld-Launcher.AppImage`;
const appImagePath = path.join(distDir, appImageName);
const outputYml = path.join(distDir, 'latest-linux.yml');

console.log(`🔍 Buscando: ${appImageName}...`);

if (!fs.existsSync(appImagePath)) {
    console.error(`❌ Error: No encuentro el archivo ${appImageName} en la carpeta dist/`);
    console.error("Asegúrate de haber compilado la versión de Linux primero.");
    process.exit(1);
}

// Calcular SHA512
const fileBuffer = fs.readFileSync(appImagePath);
const hashSum = crypto.createHash('sha512');
hashSum.update(fileBuffer);
const sha512 = hashSum.digest('base64');
const stats = fs.statSync(appImagePath);

// Crear contenido YAML
const ymlContent = `version: ${version}
files:
  - url: ${appImageName}
    sha512: ${sha512}
    size: ${stats.size}
path: ${appImageName}
sha512: ${sha512}
releaseDate: '${new Date().toISOString()}'
`;

fs.writeFileSync(outputYml, ymlContent);
console.log(`✅ ¡Éxito! Archivo generado: ${outputYml}`);
console.log("---------------------------------------------------");
console.log(ymlContent);
console.log("---------------------------------------------------");
console.log("👉 Ahora sube 'latest-linux.yml' y el .AppImage a GitHub.");
