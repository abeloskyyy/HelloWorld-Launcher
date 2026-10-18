const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT_DIR = path.resolve(__dirname, '..');
const RELEASE_DIR = path.join(ROOT_DIR, 'release', 'linux');

console.log('--- 🐧 Starting Linux Build Process ---');

try {
    const isWindows = os.platform() === 'win32';
    const skipBuild = process.argv.includes('--skip-build');
    
    if (skipBuild) {
        console.log('⏩ Skipping build step (--skip-build flag detected). Using existing artifacts in dist/...');
    } else if (isWindows) {
        console.log('💻 Windows detected. Using WSL for Linux build...');
        
        // Execute bash script in WSL. We will write a small temp script to run in WSL
        // to handle the rsync logic for faster build, then copy artifacts back.
        const wslScript = `
#!/bin/bash
set -e
WINDOWS_DIR=$(pwd)
TEMP_DIR="$HOME/hwlauncher-build-temp"

echo "Copying project to $TEMP_DIR (for performance)..."
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"
rsync -av --exclude 'node_modules' --exclude 'dist' --exclude 'release' --exclude '.git' "$WINDOWS_DIR/" "$TEMP_DIR/"
cp "$WINDOWS_DIR/package.json" "$TEMP_DIR/"

cd "$TEMP_DIR"
echo "Installing dependencies..."
npm install

echo "Building Linux..."
npm run build:linux

echo "Moving artifacts back..."
mkdir -p "$WINDOWS_DIR/dist"
cp -r dist/* "$WINDOWS_DIR/dist/"
        `;
        
        const scriptPath = path.join(ROOT_DIR, 'temp-wsl-build.sh');
        // Convert CRLF to LF for bash
        fs.writeFileSync(scriptPath, wslScript.replace(/\\r\\n/g, '\\n'));
        
        try {
            // Run in WSL, converting Windows path to WSL path
            execSync(`wsl -- bash ./temp-wsl-build.sh`, { cwd: ROOT_DIR, stdio: 'inherit' });
        } finally {
            if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
        }
    } else {
        // Native Linux build
        console.log('Building natively on Linux...');
        execSync('npm run build:linux', { cwd: ROOT_DIR, stdio: 'inherit' });
    }

    // Prepare Release Directory
    console.log('📁 Preparing Release Directory...');
    if (!fs.existsSync(RELEASE_DIR)) {
        fs.mkdirSync(RELEASE_DIR, { recursive: true });
    }

    // Copy Artifacts
    console.log('🚚 Copying artifacts to release folder...');
    
    // Find x64 deb (Debian conventions use 'amd64' for x64)
    const debCandidates = ['helloworld-launcher-linux-amd64.deb', 'helloworld-launcher-linux-x64.deb'];
    const foundDeb = debCandidates.find(name => fs.existsSync(path.join(ROOT_DIR, 'dist', name)));
    
    if (foundDeb) {
        const srcPath = path.join(ROOT_DIR, 'dist', foundDeb);
        // Copy as both amd64 and x64 so updater and scripts find it regardless of naming
        fs.copyFileSync(srcPath, path.join(RELEASE_DIR, 'helloworld-launcher-linux-amd64.deb'));
        console.log(`✅ Copied: helloworld-launcher-linux-amd64.deb`);
        fs.copyFileSync(srcPath, path.join(RELEASE_DIR, 'helloworld-launcher-linux-x64.deb'));
        console.log(`✅ Copied: helloworld-launcher-linux-x64.deb (alias)`);
    } else {
        console.error(`❌ Error: Missing required artifact: helloworld-launcher-linux-amd64.deb / helloworld-launcher-linux-x64.deb in dist/`);
        process.exit(1);
    }

    // Copy optional arm64 deb
    const arm64Deb = path.join(ROOT_DIR, 'dist', 'helloworld-launcher-linux-arm64.deb');
    if (fs.existsSync(arm64Deb)) {
        fs.copyFileSync(arm64Deb, path.join(RELEASE_DIR, 'helloworld-launcher-linux-arm64.deb'));
        console.log(`✅ Copied: helloworld-launcher-linux-arm64.deb`);
    }

    // Copy latest-linux.yml
    const latestLinux = path.join(ROOT_DIR, 'dist', 'latest-linux.yml');
    if (fs.existsSync(latestLinux)) {
        fs.copyFileSync(latestLinux, path.join(RELEASE_DIR, 'latest-linux.yml'));
        console.log(`✅ Copied: latest-linux.yml`);
    } else {
        console.error(`❌ Error: Missing required artifact: latest-linux.yml in dist/`);
        process.exit(1);
    }

    // Copy optional latest-linux-arm64.yml
    const latestArm64Yml = path.join(ROOT_DIR, 'dist', 'latest-linux-arm64.yml');
    if (fs.existsSync(latestArm64Yml)) {
        fs.copyFileSync(latestArm64Yml, path.join(RELEASE_DIR, 'latest-linux-arm64.yml'));
        console.log(`✅ Copied: latest-linux-arm64.yml`);
    }

    // Copy optional manifest.json
    const manifestJson = path.join(ROOT_DIR, 'dist', 'manifest.json');
    if (fs.existsSync(manifestJson)) {
        fs.copyFileSync(manifestJson, path.join(RELEASE_DIR, 'manifest.json'));
        console.log(`✅ Copied: manifest.json`);
    }

    console.log('🎉 Linux Build Complete! All files are in release/linux/');
} catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
}
