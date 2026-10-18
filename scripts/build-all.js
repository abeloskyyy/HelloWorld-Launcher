const { execSync } = require('child_process');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

console.log('🌍 Starting Global Build Process (WITHOUT SETUP - Preserving SmartScreen Reputation)...');

try {
    console.log('\n=======================================');
    console.log('1. Building Windows (Launcher ZIP only, preserving Setup)');
    console.log('=======================================');
    execSync('node scripts/build-win.js --skip-setup', { cwd: ROOT_DIR, stdio: 'inherit' });

    console.log('\n=======================================');
    console.log('2. Building Linux');
    console.log('=======================================');
    execSync('node scripts/build-linux.js', { cwd: ROOT_DIR, stdio: 'inherit' });

    console.log('\n=======================================');
    console.log('✅ Global Build Complete (without rebuilding Setup)!');
    console.log('Check the "release" directory for your assets.');
    console.log('=======================================');
} catch (error) {
    console.error('❌ Global Build failed:', error.message);
    process.exit(1);
}
