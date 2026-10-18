const { spawn } = require('child_process');
const electron = require('electron');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const args = ['.', ...process.argv.slice(2)];

const child = spawn(electron, args, {
  stdio: 'inherit',
  cwd: rootDir,
  env: process.env
});

let exited = false;
function exitCleanly(code = 0) {
  if (exited) return;
  exited = true;
  process.exit(code);
}

child.on('error', (err) => {
  console.error('[Runner Error]', err);
  exitCleanly(1);
});

child.on('close', (code, signal) => {
  // If terminated by Ctrl+C (SIGINT/SIGTERM), exit cleanly with code 0 to suppress npm signal error
  if (signal === 'SIGINT' || signal === 'SIGTERM' || signal === 'SIGBREAK') {
    exitCleanly(0);
    return;
  }
  exitCleanly(code ?? 0);
});

process.on('SIGINT', () => {
  try {
    child.kill('SIGINT');
  } catch (_) {}
  setTimeout(() => exitCleanly(0), 100);
});

process.on('SIGTERM', () => {
  try {
    child.kill('SIGTERM');
  } catch (_) {}
  setTimeout(() => exitCleanly(0), 100);
});

process.on('SIGBREAK', () => {
  try {
    child.kill('SIGBREAK');
  } catch (_) {}
  setTimeout(() => exitCleanly(0), 100);
});
