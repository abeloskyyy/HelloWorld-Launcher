const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function patchYaml() {
  const distDir = path.join(__dirname, '..', 'dist');
  const yamlPath = path.join(distDir, 'latest-linux.yml');

  if (!fs.existsSync(yamlPath)) {
    console.log('latest-linux.yml not found. Skipping patch.');
    return;
  }

  const debFiles = fs.readdirSync(distDir).filter(f => f.endsWith('.deb'));
  if (debFiles.length === 0) {
    console.log('No .deb files found to append.');
    return;
  }

  let yamlContent = fs.readFileSync(yamlPath, 'utf8');

  // If already patched, skip
  if (yamlContent.includes('.deb')) {
    console.log('latest-linux.yml already contains .deb files. Skipping patch.');
    return;
  }

  let newFilesBlock = '';
  for (const file of debFiles) {
    const filePath = path.join(distDir, file);
    const stat = fs.statSync(filePath);
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha512');
    hashSum.update(fileBuffer);
    const sha512 = hashSum.digest('base64');
    
    newFilesBlock += `  - url: ${file}\n    sha512: ${sha512}\n    size: ${stat.size}\n`;
  }

  // Insert before the `path:` line
  yamlContent = yamlContent.replace(/^path:/m, `${newFilesBlock}path:`);

  fs.writeFileSync(yamlPath, yamlContent, 'utf8');
  console.log('Successfully patched latest-linux.yml with .deb files.');
}

patchYaml();
