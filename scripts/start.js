#!/usr/bin/env node

const { spawn } = require('child_process');
const electron = require('electron');

const childEnv = { ...process.env };
delete childEnv.ELECTRON_RUN_AS_NODE;

const child = spawn(electron, ['.', ...process.argv.slice(2)], {
  stdio: 'inherit',
  windowsHide: false,
  env: childEnv
});

let isClosed = false;

child.on('close', (code, signal) => {
  isClosed = true;
  // If terminated via Ctrl+C / SIGINT or SIGTERM, exit cleanly with code 0 without any error messages
  if (code === null && (signal === 'SIGINT' || signal === 'SIGTERM')) {
    process.exit(0);
  }
  process.exit(code ?? 0);
});

child.on('error', (err) => {
  console.error('[Launcher Start Error]', err);
  process.exit(1);
});

const onTerminate = () => {
  if (!isClosed) {
    try {
      child.kill('SIGINT');
    } catch (_) {}
  }
};

process.on('SIGINT', onTerminate);
process.on('SIGTERM', onTerminate);
