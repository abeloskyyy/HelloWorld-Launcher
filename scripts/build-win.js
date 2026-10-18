const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const INSTALLER_DIR = path.join(ROOT_DIR, 'installer');
const RELEASE_DIR = path.join(ROOT_DIR, 'release', 'win');

const skipSetup = process.argv.includes('--skip-setup');

console.log(`--- 🚀 Starting Windows Build Process ${skipSetup ? '(WITHOUT SETUP)' : '(WITH SETUP)'} ---`);

try {
    // 1. Build Launcher (ZIP)
    console.log('📦 Building Launcher (ZIP)...');
    if (!fs.existsSync(path.join(ROOT_DIR, 'node_modules', 'electron-updater'))) {
        console.log('Installing missing launcher dependencies (electron-updater)...');
        execSync('npm install', { cwd: ROOT_DIR, stdio: 'inherit' });
    }
    execSync('npm run build:win', { cwd: ROOT_DIR, stdio: 'inherit' });

    // 2. Build Installer (EXE)
    if (!skipSetup) {
        console.log('📦 Building Installer (EXE)...');
        // Ensure dependencies are installed
        if (!fs.existsSync(path.join(INSTALLER_DIR, 'node_modules'))) {
            console.log('Installing installer dependencies...');
            execSync('npm install', { cwd: INSTALLER_DIR, stdio: 'inherit' });
        }
        execSync('npm run build:win', { cwd: INSTALLER_DIR, stdio: 'inherit' });
    } else {
        console.log('⏩ Skipping Installer build (--skip-setup flag active to preserve SmartScreen reputation).');
    }

    // 3. Prepare Release Directory
    console.log('📁 Preparing Release Directory...');
    if (!fs.existsSync(RELEASE_DIR)) {
        fs.mkdirSync(RELEASE_DIR, { recursive: true });
    }

    // 4. Copy Artifacts
    console.log('🚚 Copying artifacts to release folder...');
    const artifacts = [
        { src: path.join(ROOT_DIR, 'dist', 'helloworld-launcher-win.zip'), dest: 'helloworld-launcher-win.zip' },
        { src: path.join(ROOT_DIR, 'dist', 'setup', 'HelloWorld-Launcher-Setup.exe'), dest: 'HelloWorld-Launcher-Setup.exe', optional: skipSetup },
        { src: path.join(ROOT_DIR, 'dist', 'manifest.json'), dest: 'manifest.json', optional: true }
    ];

    for (const artifact of artifacts) {
        const destPath = path.join(RELEASE_DIR, artifact.dest);
        if (fs.existsSync(artifact.src)) {
            if (artifact.dest === 'HelloWorld-Launcher-Setup.exe' && skipSetup && fs.existsSync(destPath)) {
                console.log(`ℹ️ Preserving existing: ${artifact.dest} (not overwriting to retain SmartScreen reputation)`);
            } else {
                fs.copyFileSync(artifact.src, destPath);
                console.log(`✅ Copied: ${artifact.dest}`);
            }
        } else if (!artifact.optional) {
            console.error(`❌ Error: Missing required artifact: ${artifact.src}`);
            process.exit(1);
        } else if (artifact.dest === 'HelloWorld-Launcher-Setup.exe') {
            if (fs.existsSync(destPath)) {
                console.log(`ℹ️ Preserving existing: ${artifact.dest} in release folder`);
            } else {
                console.log(`ℹ️ Notice: ${artifact.dest} not found in dist/setup or release/win. (Skipped build)`);
            }
        }
    }

    // 5. Generate latest.yml for the installer
    console.log('📝 Generating latest.yml...');
    const crypto = require('crypto');
    const version = require('../package.json').version;
    const exeName = 'HelloWorld-Launcher-Setup.exe';
    const exePath = path.join(RELEASE_DIR, exeName);
    
    if (fs.existsSync(exePath)) {
        const fileBuffer = fs.readFileSync(exePath);
        const hashSum = crypto.createHash('sha512');
        hashSum.update(fileBuffer);
        const sha512 = hashSum.digest('base64');
        const stats = fs.statSync(exePath);
        
        const ymlContent = `version: ${version}
files:
  - url: ${exeName}
    sha512: ${sha512}
    size: ${stats.size}
path: ${exeName}
sha512: ${sha512}
releaseDate: '${new Date().toISOString()}'
`;
        fs.writeFileSync(path.join(RELEASE_DIR, 'latest.yml'), ymlContent);
        console.log('✅ Generated latest.yml');
    } else if (!skipSetup) {
        console.error('❌ Cannot generate latest.yml: Installer EXE not found!');
        process.exit(1);
    } else {
        console.log('ℹ️ Setup EXE not present in release/win/; skipping latest.yml generation.');
    }

    console.log('🎉 Windows Build Complete! All files are in release/win/');
} catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
}
