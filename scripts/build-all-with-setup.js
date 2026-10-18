const { execSync } = require('child_process');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

console.log('🌍 Starting Global Build Process (WITH SETUP)...');

try {
    console.log('\n=======================================');
    console.log('1. Building Windows (Including Setup EXE)');
    console.log('=======================================');
    execSync('node scripts/build-win.js', { cwd: ROOT_DIR, stdio: 'inherit' });

    console.log('\n=======================================');
    console.log('2. Building Linux');
    console.log('=======================================');
    execSync('node scripts/build-linux.js', { cwd: ROOT_DIR, stdio: 'inherit' });

    console.log('\n=======================================');
    console.log('✅ Global Build (With Setup) Complete!');
    console.log('Check the "release" directory for your assets.');
    console.log('=======================================');
} catch (error) {
    console.error('❌ Global Build failed:', error.message);
    process.exit(1);
}
