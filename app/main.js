const { app, BrowserWindow, ipcMain, Menu, Tray, shell, dialog, safeStorage, Notification, nativeImage } = require('electron')
const path = require('path')
const os = require('os')
const http = require('http')
const { URL } = require('url')
const crypto = require('crypto')
const { exec } = require('child_process')
const dns = require('dns').promises
const { pipeline } = require('stream/promises')

// Use graceful-fs to handle EMFILE (too many open files) errors automatically
// Must patch BEFORE loading fs-extra so it uses the patched fs
const gracefulFs = require('graceful-fs')
gracefulFs.gracefulify(require('fs'))

// Limitador inteligente de concurrencia para evitar el límite real del OS (EMFILE/ENOENT)
// minecraft-launcher-core a veces ahoga fs.promises lanzando +3000 promesas a la vez.
class Semaphore {
  constructor(max) {
    this.max = max; this.active = 0; this.queue = [];
  }
  async acquire() {
    if (this.active < this.max) { this.active++; return; }
    return new Promise(resolve => this.queue.push(resolve));
  }
  release() {
    if (this.queue.length > 0) { const next = this.queue.shift(); next(); }
    else { this.active--; }
  }
}
const fsSemaphore = new Semaphore(500); // Límite máximo de 500 archivos abiertos de golpe
const limitFS = (fn) => async function (...args) {
  await fsSemaphore.acquire();
  try { return await fn.apply(this, args); } finally { fsSemaphore.release(); }
};

// Parcheamos fs.promises globalmente
const nativeFs = require('fs');
if (nativeFs.promises) {
  if (nativeFs.promises.stat) nativeFs.promises.stat = limitFS(nativeFs.promises.stat);
  if (nativeFs.promises.readFile) nativeFs.promises.readFile = limitFS(nativeFs.promises.readFile);
  if (nativeFs.promises.access) nativeFs.promises.access = limitFS(nativeFs.promises.access);
}

// Now load fs-extra which will use the patched fs
const fs = require('fs-extra')

// Catch unhandled exceptions & rejections to stop infinite Electron OS popups if edge cases happen
process.on('uncaughtException', (error) => {
  console.error('[Global Error] Uncaught Exception:', error);
  if (app.isPackaged) {
    dialog.showErrorBox('Error de inicio', `${error.message}\n\n${error.stack || ''}`);
    app.quit();
  }
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Global Error] Unhandled Rejection at:', promise, 'reason:', reason);
});

// Clean exit handlers to avoid npm / PowerShell reporting "electron.exe exited with signal SIGINT" on Ctrl+C
let isTerminating = false;
const handleGracefulTermination = () => {
  if (isTerminating) return;
  isTerminating = true;
  try { isQuitting = true; } catch (_) {}
  try {
    if (typeof tray !== 'undefined' && tray && !tray.isDestroyed()) {
      tray.destroy();
    }
  } catch (_) {}
  try {
    if (typeof activeDownloads !== 'undefined' && activeDownloads) {
      for (const [version_id, info] of activeDownloads) {
        try {
          if (info.gameProcess && info.gameProcess.pid) {
            process.kill(info.gameProcess.pid, 'SIGKILL');
          }
        } catch (_) {}
      }
      activeDownloads.clear();
    }
  } catch (_) {}
  try {
    if (app && !app.isDestroyed?.()) {
      app.exit(0);
    }
  } catch (_) {}
  process.exit(0);
};

process.on('SIGINT', handleGracefulTermination);
process.on('SIGTERM', handleGracefulTermination);
process.on('SIGBREAK', handleGracefulTermination);

if (!app.isPackaged && process.platform === 'win32' && process.stdin && process.stdin.isTTY) {
  try {
    process.stdin.resume();
  } catch (_) {}
}

if (process.platform === 'win32') {
  app.setAppUserModelId('com.abelosky.helloworldlauncher');
} else if (process.platform === 'linux' && typeof app.setDesktopName === 'function') {
  app.setDesktopName('helloworld-launcher.desktop');
}

const activeNotifications = new Set();

function hasCommandLineArg(args, flag) {
  if (!Array.isArray(args)) return false;
  return args.some(arg => {
    if (typeof arg !== 'string') return false;
    const clean = arg.trim();
    return clean === flag || clean.startsWith(`${flag}=`);
  });
}

function parseLaunchProfileArg(args) {
  if (!Array.isArray(args)) return null;
  for (const arg of args) {
    if (typeof arg === 'string') {
      const match = arg.match(/^--launch-profile=(.+)$/i);
      if (match) return match[1].replace(/^["']|["']$/g, '');
    }
  }
  const idx = args.indexOf('--launch-profile');
  if (idx !== -1 && idx + 1 < args.length) {
    return String(args[idx + 1]).replace(/^["']|["']$/g, '');
  }
  return null;
}

function getAppLaunchArgs(extraArgs = '') {
  if (app.isPackaged) {
    return extraArgs ? extraArgs.trim() : '';
  }
  const appPath = app.getAppPath();
  return extraArgs ? `"${appPath}" ${extraArgs.trim()}` : `"${appPath}"`;
}

if (hasCommandLineArg(process.argv, '--quit-launcher')) {
  app.quit();
  process.exit(0);
}
if (hasCommandLineArg(process.argv, '--open-discord')) {
  try { shell.openExternal('https://dsc.gg/helloworld-launcher'); } catch (_) {}
}
let pendingOpenSocial = hasCommandLineArg(process.argv, '--open-social');
let pendingAutoLaunchProfileId = parseLaunchProfileArg(process.argv);

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  console.log('[SingleInstance] Another instance is already running. Quitting.');
  app.quit();
  process.exit(0);
} else {
  app.on('second-instance', (event, commandLine) => {
    console.log('[SingleInstance] Second instance launched with commandLine:', commandLine);

    if (hasCommandLineArg(commandLine, '--quit-launcher')) {
      isQuitting = true;
      if (typeof tray !== 'undefined' && tray && !tray.isDestroyed()) {
        try { tray.destroy(); } catch (_) {}
      }
      if (typeof mainWindow !== 'undefined' && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.destroy();
      }
      app.quit();
      setTimeout(() => {
        try {
          if (app && !app.isDestroyed?.()) app.exit(0);
        } catch (_) {}
        process.exit(0);
      }, 400);
      return;
    }

    if (hasCommandLineArg(commandLine, '--open-discord')) {
      try { shell.openExternal('https://dsc.gg/helloworld-launcher'); } catch (_) {}
      return;
    }

    showAndFocusWindow();

    if (hasCommandLineArg(commandLine, '--open-social')) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('navigate-to-chat', { targetTab: 'received' });
      }
      return;
    }

    const targetProfileId = parseLaunchProfileArg(commandLine);
    if (targetProfileId && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('auto-launch-profile', targetProfileId);
    }
  });
}


const { Client } = require('minecraft-launcher-core')
const { applyMclcPatch, markExistingIndexesVerified, isJarValid } = require('./src/utils/mclcPatch')
applyMclcPatch()
const msmc = require('msmc')
const axios = require('axios')
let autoUpdater = null
try {
  autoUpdater = require("electron-updater").autoUpdater
  // Configure AutoUpdater
  autoUpdater.logger = require("electron-log")
  autoUpdater.logger.transports.file.level = "info"
  autoUpdater.autoDownload = false // Let user decide, or set true to auto-download
} catch (e) {
  console.warn("[AutoUpdater] electron-updater could not be loaded:", e.message)
}

// -- Modules --
const rpc = require('./src/utils/rpc')
const paths = require('./src/utils/paths')
markExistingIndexesVerified(paths.getMcDir())
const profileManager = require('./src/handlers/profiles')
const modManager = require('./src/handlers/mods')
const versionUtils = require('./src/utils/version')
const { addServerToServersDat, getServerHistory } = require('./src/utils/serversDat')
const ApiClient = require('./src/utils/apiClient')

// Hardware Acceleration & High-Performance GPU (Max VRAM / Dedicated GPU) Configuration
const configuredGpuPaths = new Set();
function applyGpuPreference(exePath, preferHighPerformance = true) {
  if (process.platform !== 'win32' || !exePath) return;
  const cacheKey = `${exePath}:${preferHighPerformance}`;
  if (configuredGpuPaths.has(cacheKey)) return;
  configuredGpuPaths.add(cacheKey);
  try {
    const { exec } = require('child_process');
    const pref = preferHighPerformance ? 'GpuPreference=2;' : 'GpuPreference=1;';
    const regCmd = `reg add "HKCU\\Software\\Microsoft\\DirectX\\UserGpuPreferences" /v "${exePath}" /t REG_SZ /d "${pref}" /f`;
    exec(regCmd, (err) => {
      if (!err) {
        console.log(`[GPU] Assigned ${exePath} to ${preferHighPerformance ? 'High-Performance Dedicated GPU (Max VRAM)' : 'Power-Saving GPU'}`);
      }
    });
  } catch (e) { }
}

function ensureJavaGpuPreference(jPath, preferHighPerformance = true) {
  if (process.platform !== 'win32' || !jPath || jPath === 'java') return;
  applyGpuPreference(jPath, preferHighPerformance);
  if (/javaw\.exe$/i.test(jPath)) {
    applyGpuPreference(jPath.replace(/javaw\.exe$/i, 'java.exe'), preferHighPerformance);
  } else if (/java\.exe$/i.test(jPath)) {
    applyGpuPreference(jPath.replace(/java\.exe$/i, 'javaw.exe'), preferHighPerformance);
  }
}

function registerAllKnownJavaRuntimes(preferHighPerformance = true) {
  if (process.platform !== 'win32') return;
  try {
    const runtimesDir = path.join(paths.getMcDir(), 'java-runtimes');
    if (fs.existsSync(runtimesDir)) {
      const scanDir = (dir) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            scanDir(fullPath);
          } else if (entry.isFile() && /java(w)?\.exe$/i.test(entry.name)) {
            applyGpuPreference(fullPath, preferHighPerformance);
          }
        }
      };
      scanDir(runtimesDir);
    }
  } catch (_) { }
}

try {
  const userJsonPath = paths.getUserFilePath();
  let hwAccelEnabled = true;
  if (fs.existsSync(userJsonPath)) {
    const data = JSON.parse(fs.readFileSync(userJsonPath, 'utf8'));
    if (data.hw_accel === false) {
      hwAccelEnabled = false;
    }
  }

  if (!hwAccelEnabled) {
    console.log("[GPU] Hardware acceleration is disabled by user setting.");
    app.disableHardwareAcceleration();
    applyGpuPreference(process.execPath, false);
    registerAllKnownJavaRuntimes(false);
  } else {
    console.log("[GPU] Hardware acceleration enabled: forcing high-performance GPU with maximum VRAM.");
    app.commandLine.appendSwitch('force_high_performance_gpu');
    app.commandLine.appendSwitch('force-high-performance-gpu');
    applyGpuPreference(process.execPath, true);
    registerAllKnownJavaRuntimes(true);
    // Environment variables for NVIDIA Optimus & AMD discrete graphics offloading
    process.env.SHIM_MCCOMPAT = '0x800000001';
    process.env.__NV_PRIME_RENDER_OFFLOAD = '1';
    process.env.__GLX_VENDOR_LIBRARY_NAME = 'nvidia';
    process.env.DRI_PRIME = '1';
  }
} catch (e) {
  console.error("Could not read user data for hardware acceleration check:", e);
}

// Ensure the app runs and detects windows correctly on Linux Wayland/X11
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-features', 'WaylandWindowDecorations');
  app.commandLine.appendSwitch('ozone-platform-hint', 'auto');
}

// Initialize launcher
const launcher = new Client()

const JavaRuntimeManager = require('./src/utils/javaRuntime')
const javaRuntime = new JavaRuntimeManager(paths.getMcDir())

// Track active downloads for cancellation
let activeDownloads = new Map() // version_id -> { launcher, gameProcess, cancelled }

// Redirect launcher events to UI and Console
let launcherAssetProgressLogged = false;
let launcherAssetCopyProgressLogged = false;
launcher.on('debug', (e) => {
  if (isLaunchCancelled) return;
  console.log("[Launcher Debug]", e);
  mainWindow && mainWindow.webContents.send('info-message', e);
})
launcher.on('data', (e) => {
  if (isLaunchCancelled) return;
  console.log("[Launcher Data]", e);
  mainWindow && mainWindow.webContents.send('info-message', e);
})
let lastProgressEmitTime = 0;
launcher.on('progress', (e) => {
  if (isLaunchCancelled) return;
  const now = Date.now();
  if (e?.type === 'assets') {
    if (e.task === 0) launcherAssetProgressLogged = false;
    if (!launcherAssetProgressLogged) {
      console.log(`[Launcher Progress] Downloading assets (${e.total || 0} total)`);
      launcherAssetProgressLogged = true;
    }
  } else if (e?.type === 'assets-copy') {
    if (e.task === 0) launcherAssetCopyProgressLogged = false;
    if (!launcherAssetCopyProgressLogged) {
      console.log(`[Launcher Progress] Copying legacy assets (${e.total || 0} total)`);
      launcherAssetCopyProgressLogged = true;
    }
  } else {
    if (now - lastProgressEmitTime > 200 || e.task === e.total || e.task === 0) {
      console.log("[Launcher Progress]", e);
    }
  }
  // Throttle IPC events to at most once per 80ms to keep IPC and UI butter-smooth
  if (now - lastProgressEmitTime > 80 || e.task === e.total || e.task === 0) {
    lastProgressEmitTime = now;
    mainWindow && mainWindow.webContents.send('download-progress', e);
  }
})
launcher.on('close', (code) => {
  // Global close event from MCLC client emitter.
  // Note: Individual processes manage their own lifecycle via child.on('close')
  // and process monitor, so we do not close the entire launcher game state here.
});

let mainWindow = null

// --- Encryption and Data ---
const DEFAULT_USER_DATA = {
  username: "",
  account_type: "offline",
  mcdir: "",
  dev_mode: false,
  show_snapshots: false,
  show_old: false,
  start_on_boot: false,
  discord_rpc_enabled: true,
  app_presence_enabled: true,
  privacy_mode: false,
  show_singleplayer_world: true,
  show_game_version: true,
  show_profile_name: true,
  show_player_ign: true,
  reopen_on_game_close: true,
  addons_per_page: 20,
  launch_count: 0,
  has_reviewed: false,
  onboarding_completed: false,
  last_skin_url: "",
  last_skin_variant: "classic",
  last_cape_url: ""
};

let userDataCache = null;

function applyAutoStartSetting(enable) {
  try {
    const isEnabled = Boolean(enable);
    if (!app.isPackaged) {
      console.log(`[AutoStart] Dev mode: openAtLogin set to ${isEnabled}`);
    }
    app.setLoginItemSettings({
      openAtLogin: isEnabled,
      path: process.execPath,
      args: []
    });
  } catch (err) {
    console.warn('[AutoStart] Error setting login item settings:', err.message);
  }
}


const loadUserData = () => {
  if (userDataCache) return userDataCache;

  let diskData = {};
  let fileExists = false;

  try {
    const userFile = paths.getUserFilePath();
    if (fs.existsSync(userFile)) {
      fileExists = true;
      diskData = fs.readJsonSync(userFile);
      if (safeStorage.isEncryptionAvailable() && diskData.encrypted_tokens) {
        try {
          const decryptedBuffer = safeStorage.decryptString(Buffer.from(diskData.encrypted_tokens, 'hex'));
          const sensitive = JSON.parse(decryptedBuffer);
          Object.assign(diskData, sensitive);
        } catch (e) { }
      }
    }
  } catch (e) {
    console.error("Error loading user data:", e);
  }

  // Merge: Defaults -> Disk Data
  userDataCache = { ...DEFAULT_USER_DATA, ...diskData };

  // Auto-fix: if username ended up as an object (due to a previous bug), extract a string
  if (userDataCache.username && typeof userDataCache.username === 'object') {
    userDataCache.username = userDataCache.username.name || userDataCache.username.username || userDataCache.username.displayName || 'Player';
    console.warn('[loadUserData] username was an object on disk, sanitized to:', userDataCache.username);
  }

  // Auto-fix: if Microsoft account is missing uuid or firebase_ms_uid, try to restore from saved accounts
  if (userDataCache.account_type === 'microsoft') {
    try {
      const savedAccs = loadSavedAccounts();
      const match = savedAccs.find(a => a.type === 'microsoft' && (a.username === userDataCache.username || a.uuid === userDataCache.uuid));
      if (match) {
        let changed = false;
        if ((!userDataCache.uuid || userDataCache.uuid === 'undefined') && match.uuid) {
          userDataCache.uuid = match.uuid;
          changed = true;
        }
        if (!userDataCache.firebase_ms_uid && match.firebase_ms_uid) {
          userDataCache.firebase_ms_uid = match.firebase_ms_uid;
          changed = true;
        }
        if (!userDataCache.last_skin_url && match.last_skin_url) {
          userDataCache.last_skin_url = match.last_skin_url;
          changed = true;
        }
        if (changed) saveUserData(userDataCache);
      }
    } catch (_) {}
  }

  // Sanitize active account avatars to prevent cross-contamination
  if (userDataCache.account_type === 'offline') {
    if (userDataCache.last_avatar_url) {
      userDataCache.last_avatar_url = '';
      saveUserData(userDataCache);
    }
  } else if (userDataCache.account_type === 'microsoft') {
    if (userDataCache.last_avatar_url && (
      userDataCache.last_avatar_url.includes('textures.minecraft.net') ||
      userDataCache.last_avatar_url.includes('ui-avatars.com') ||
      userDataCache.last_avatar_url.startsWith('data:image')
    )) {
      userDataCache.last_avatar_url = '';
      saveUserData(userDataCache);
    }
  }

  // Auto-restore active account from saved accounts if username is empty AND app is ready
  if ((!userDataCache.username || userDataCache.username.trim() === '') && app.isReady()) {
    try {
      const savedAccs = loadSavedAccounts();
      if (savedAccs && savedAccs.length > 0) {
        const sorted = [...savedAccs].sort((a, b) => (b.lastUsed || '').localeCompare(a.lastUsed || ''));
        const latest = sorted[0];
        if (latest && latest.username) {
          userDataCache.username = latest.username;
          userDataCache.account_type = latest.type || 'offline';
          userDataCache.uuid = latest.uuid || '';
          if (latest.type === 'helloworld') {
            userDataCache.last_avatar_url = latest.avatarUrl || '';
            userDataCache.last_skin_url = '';
          } else if (latest.type === 'microsoft') {
            userDataCache.last_avatar_url = (latest.avatarUrl && !latest.avatarUrl.includes('textures.minecraft.net') && !latest.avatarUrl.includes('ui-avatars.com') && !latest.avatarUrl.startsWith('data:image')) ? latest.avatarUrl : '';
            userDataCache.last_skin_url = latest.last_skin_url || '';
          } else {
            userDataCache.last_avatar_url = '';
            userDataCache.last_skin_url = '';
          }
          if (latest.mc_token) userDataCache.mc_token = latest.mc_token;
          if (latest.msmc_auth) userDataCache.msmc_auth = latest.msmc_auth;
          if (latest.firebase_uid) userDataCache.firebase_uid = latest.firebase_uid;
          if (latest.firebase_refresh_token) userDataCache.firebase_refresh_token = latest.firebase_refresh_token;
          if (latest.firebase_ms_uid) userDataCache.firebase_ms_uid = latest.firebase_ms_uid;
          if (latest.firebase_ms_refresh_token) userDataCache.firebase_ms_refresh_token = latest.firebase_ms_refresh_token;
          saveUserData(userDataCache);
          console.log(`[loadUserData] Auto-restored active account from saved_accounts.json: ${latest.username} (${latest.type})`);
        }
      }
    } catch (e) {
      console.warn('[loadUserData] Failed to auto-restore saved account:', e);
    }
  }

  // Ensure mcdir is valid
  if (!userDataCache.mcdir || userDataCache.mcdir.trim() === "") {
    userDataCache.mcdir = paths.getMcDir();
  }

  // Auto-save IF it's a new file or has missing keys (to initialize it)
  if (!fileExists || Object.keys(DEFAULT_USER_DATA).some(k => !new Set(Object.keys(diskData)).has(k))) {
    saveUserData(userDataCache);
  }

  return userDataCache;
};

const saveUserData = (data) => {
  userDataCache = { ...data }; // Update cache immediately

  if (data.mcdir && data.mcdir.trim() !== "" && data.mcdir !== paths.getMcDir()) {
    // Keep it
  } else if (!data.mcdir || data.mcdir.trim() === "") {
    data.mcdir = paths.getMcDir();
    userDataCache.mcdir = data.mcdir;
  }

  const sensitive = {
    mc_token: data.mc_token,
    uuid: data.uuid,
    msmc_auth: data.msmc_auth,
    firebase_uid: data.firebase_uid,
    firebase_refresh_token: data.firebase_refresh_token,
    firebase_id_token: data.firebase_id_token,
    firebase_ms_uid: data.firebase_ms_uid,
    firebase_ms_refresh_token: data.firebase_ms_refresh_token
  };
  const toSave = { ...data };
  delete toSave.mc_token;
  delete toSave.uuid;
  delete toSave.msmc_auth;
  delete toSave.firebase_uid;
  delete toSave.firebase_refresh_token;
  delete toSave.firebase_id_token;
  delete toSave.firebase_ms_uid;
  delete toSave.firebase_ms_refresh_token;
  delete toSave.encrypted_tokens;

  const hasSensitive = sensitive.mc_token || sensitive.msmc_auth || sensitive.firebase_refresh_token || sensitive.firebase_ms_refresh_token;

  if (hasSensitive && safeStorage.isEncryptionAvailable()) {
    try {
      const encrypted = safeStorage.encryptString(JSON.stringify(sensitive));
      toSave.encrypted_tokens = encrypted.toString('hex');
    } catch (e) { console.error("Encryption failed", e); }
  } else {
    Object.assign(toSave, sensitive);
  }

  try {
    const userFile = paths.getUserFilePath();
    fs.ensureDirSync(path.dirname(userFile));
    fs.writeJsonSync(userFile, toSave, { spaces: 2 });
    if (typeof updateTrayMenu === 'function') {
      try { updateTrayMenu(); } catch (_) {}
    }
  } catch (e) {
    console.error("Error saving user data:", e);
  }
}

const normalizeUuid = (uuid) => (uuid || '').replace(/-/g, '').toLowerCase();

// ─── Saved Accounts ───────────────────────────────────────────────────────────
// Each account stored in saved_accounts.json has this shape:
// {
//   id: <string>,            unique identifier (firebase_uid for HW, uuid for MS/offline)
//   type: 'offline' | 'microsoft' | 'helloworld',
//   username: <string>,
//   uuid: <string>,
//   email: <string>,         // helloworld only (email / username identifier used to re-login)
//   msEmail: <string>,       // microsoft only  (for display)
//   avatarUrl: <string>,     // cached avatar url
//   addedAt: <ISO string>,
//   lastUsed: <ISO string>,
//   encrypted_tokens: <hex>, // safeStorage encrypted JSON with sensitive fields
// }
// Sensitive fields (inside encrypted_tokens):
//   mc_token, msmc_auth, firebase_refresh_token, firebase_ms_refresh_token, firebase_uid, firebase_ms_uid

const SAVED_ACCOUNTS_SENSITIVE_KEYS = [
  'mc_token', 'msmc_auth',
  'firebase_uid', 'firebase_refresh_token', 'firebase_id_token',
  'firebase_ms_uid', 'firebase_ms_refresh_token'
];

function loadSavedAccounts() {
  const filePath = paths.getSavedAccountsFilePath();
  let accounts = [];
  try {
    if (fs.existsSync(filePath)) {
      accounts = fs.readJsonSync(filePath) || [];
    }
  } catch (e) {
    console.error('[SavedAccounts] Error loading:', e);
    return [];
  }
  // Decrypt tokens for each account
  for (const acc of accounts) {
    if (acc.encrypted_tokens && safeStorage.isEncryptionAvailable()) {
      try {
        const decrypted = safeStorage.decryptString(Buffer.from(acc.encrypted_tokens, 'hex'));
        const sensitive = JSON.parse(decrypted);
        Object.assign(acc, sensitive);
      } catch (e) {
        console.warn('[SavedAccounts] Could not decrypt tokens for account:', acc.id);
      }
    }
  }

  // Sanitize stored avatars to guarantee strict account isolation
  let accountsChanged = false;
  for (const acc of accounts) {
    if (acc.type === 'offline') {
      if (acc.avatarUrl) {
        acc.avatarUrl = '';
        accountsChanged = true;
      }
    } else if (acc.type === 'microsoft') {
      if (acc.avatarUrl && (acc.avatarUrl.includes('textures.minecraft.net') || acc.avatarUrl.includes('ui-avatars.com'))) {
        acc.avatarUrl = '';
        accountsChanged = true;
      }
      // If a Microsoft account has a base64 avatar leaked from a HelloWorld account of the same username
      if (acc.avatarUrl && acc.avatarUrl.startsWith('data:image')) {
        const hwAcc = accounts.find(a => a.type === 'helloworld' && a.username === acc.username);
        if (hwAcc && !hwAcc.avatarUrl) {
          hwAcc.avatarUrl = acc.avatarUrl;
        }
        acc.avatarUrl = '';
        accountsChanged = true;
      }
    }
  }
  if (accountsChanged) {
    try {
      saveSavedAccounts(accounts);
    } catch (_) {}
  }

  return accounts;
}

function saveSavedAccounts(accounts) {
  const filePath = paths.getSavedAccountsFilePath();
  // Encrypt tokens for each account before writing
  const toWrite = accounts.map(acc => {
    const sensitive = {};
    for (const key of SAVED_ACCOUNTS_SENSITIVE_KEYS) {
      if (acc[key]) sensitive[key] = acc[key];
    }
    const clean = { ...acc };
    for (const key of SAVED_ACCOUNTS_SENSITIVE_KEYS) delete clean[key];
    delete clean.encrypted_tokens;

    const hasSensitive = SAVED_ACCOUNTS_SENSITIVE_KEYS.some(k => acc[k]);
    if (hasSensitive && safeStorage.isEncryptionAvailable()) {
      try {
        clean.encrypted_tokens = safeStorage.encryptString(JSON.stringify(sensitive)).toString('hex');
      } catch (e) {
        console.error('[SavedAccounts] Encryption failed:', e);
        Object.assign(clean, sensitive); // fallback: store plain (should not happen)
      }
    } else {
      Object.assign(clean, sensitive);
    }
    return clean;
  });

  try {
    fs.ensureDirSync(path.dirname(filePath));
    fs.writeJsonSync(filePath, toWrite, { spaces: 2 });
    if (typeof updateTrayMenu === 'function') {
      try { updateTrayMenu(); } catch (_) {}
    }
  } catch (e) {
    console.error('[SavedAccounts] Error saving:', e);
  }
}

// Build a public-safe (no tokens) view of an account for the UI
function safeAccountView(acc) {
  const view = { ...acc };
  for (const key of SAVED_ACCOUNTS_SENSITIVE_KEYS) delete view[key];
  delete view.encrypted_tokens;
  return view;
}

// Add or update the current userData into the saved accounts list
function addOrUpdateSavedAccount(userData) {
  if (!userData || !userData.username) return; // don't save empty sessions
  const accounts = loadSavedAccounts();

  // Determine a stable unique ID for this account
  let accountId;
  if (userData.account_type === 'helloworld') {
    accountId = userData.firebase_uid || buildDeterministicUuid(`helloworld:${userData.username}`);
  } else if (userData.account_type === 'microsoft') {
    accountId = userData.uuid || userData.last_ms_uuid || buildDeterministicUuid(`microsoft:${userData.username}`);
  } else {
    // offline: use a deterministic ID based on username
    accountId = buildDeterministicUuid(`offline:${userData.username}`);
  }

  const now = new Date().toISOString();
  const existingIndex = accounts.findIndex(a => a.id === accountId);

  let cleanAvatarUrl = '';
  if (userData.account_type === 'helloworld') {
    cleanAvatarUrl = userData.last_avatar_url || (existingIndex >= 0 ? accounts[existingIndex].avatarUrl : '') || '';
  } else if (userData.account_type === 'microsoft') {
    const cand = userData.last_avatar_url || (existingIndex >= 0 ? accounts[existingIndex].avatarUrl : '');
    if (cand && typeof cand === 'string' && !cand.includes('textures.minecraft.net') && !cand.includes('ui-avatars.com') && !cand.startsWith('data:image')) {
      cleanAvatarUrl = cand;
    }
  } else {
    // Offline accounts must never have an avatarUrl
    cleanAvatarUrl = '';
  }

  const entry = {
    id: accountId,
    type: userData.account_type || 'offline',
    username: userData.username,
    uuid: userData.uuid || '',
    email: userData.account_type === 'helloworld' ? (userData._loginEmail || '') : '',
    msEmail: userData.account_type === 'microsoft' ? (userData._msEmail || '') : '',
    avatarUrl: cleanAvatarUrl,
    last_skin_url: userData.account_type === 'microsoft' ? (userData.last_skin_url || (existingIndex >= 0 ? accounts[existingIndex].last_skin_url : '') || '') : '',
    last_skin_variant: userData.account_type === 'microsoft' ? (userData.last_skin_variant || (existingIndex >= 0 ? accounts[existingIndex].last_skin_variant : 'classic') || 'classic') : 'classic',
    addedAt: existingIndex >= 0 ? (accounts[existingIndex].addedAt || now) : now,
    lastUsed: now,
    // sensitive (will be encrypted by saveSavedAccounts)
    mc_token: userData.mc_token || '',
    msmc_auth: userData.msmc_auth || '',
    firebase_uid: userData.firebase_uid || '',
    firebase_refresh_token: userData.firebase_refresh_token || '',
    firebase_id_token: userData.firebase_id_token || '',
    firebase_ms_uid: userData.firebase_ms_uid || '',
    firebase_ms_refresh_token: userData.firebase_ms_refresh_token || ''
  };

  if (existingIndex >= 0) {
    accounts[existingIndex] = entry;
  } else {
    accounts.push(entry);
  }

  saveSavedAccounts(accounts);
  return accountId;
}
// ─────────────────────────────────────────────────────────────────────────────


// --- Secrets & External Configuration Loader ---
const cliConfigUrl = (() => {
  const arg = process.argv.find(a => a.startsWith('--config-url=') || a.startsWith('--gist-url='));
  return arg ? arg.split('=')[1].replace(/^"(.*)"$/, '$1') : null;
})();

function loadSecrets() {
  const defaults = {
    FIREBASE_API_KEY: "", // Loaded from secrets.json
    FIREBASE_PROJECT_ID: "helloworld-launcher",
    WORKSHOP_DISCORD_WEBHOOK: "",
    REMOTE_CONFIG_GIST_URL: cliConfigUrl || process.env.REMOTE_CONFIG_GIST_URL || process.env.REMOTE_CONFIG_URL || "https://gist.githubusercontent.com/abeloskyyy/b50089b634ed09f48c921f9c8126a49f/raw/hwlauncher-info.json"
  };
  const candidates = [
    path.join(__dirname, 'secrets.json'),
    path.join(__dirname, '..', 'secrets.json'),
    path.join(paths.getLauncherDir(), 'secrets.json')
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const parsed = fs.readJsonSync(p);
        return { ...defaults, ...parsed };
      }
    } catch (e) {
      console.error('[Secrets] Error reading', p, e.message);
    }
  }
  return defaults;
}

const APP_SECRETS = loadSecrets();
if (cliConfigUrl || process.env.REMOTE_CONFIG_GIST_URL || process.env.REMOTE_CONFIG_URL) {
  APP_SECRETS.REMOTE_CONFIG_GIST_URL = cliConfigUrl || process.env.REMOTE_CONFIG_GIST_URL || process.env.REMOTE_CONFIG_URL;
}
const FIREBASE_API_KEY = APP_SECRETS.FIREBASE_API_KEY;

// --- Maintenance State, Mandatory Update State & Admin Bypass ---
let _isMaintenanceActive = false;
let _adminBypassGranted = false;
let _isMandatoryUpdateActive = false;

// --- Account Auth Helper: Refresh Firebase ID token ---
/**
 * Refresh a Firebase ID token using a stored refresh_token.
 * @returns { uid, idToken, refreshToken }
 */
async function refreshFirebaseToken(refreshToken) {
  try {
    const res = await axios.post(`https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`, {
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    });
    const { user_id, id_token, refresh_token: newRefreshToken } = res.data;
    if (!user_id || !id_token) throw new Error('INVALID_REFRESH_TOKEN');
    return { uid: user_id, idToken: id_token, refreshToken: newRefreshToken || refreshToken };
  } catch (err) {
    if (err.response && err.response.status === 400) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }
    throw err;
  }
}

let hasSyncedVersionThisSession = false;
async function syncClientVersionToUsersDoc(auth, force = false) {
  if (!auth || !auth.uid) return;
  if (hasSyncedVersionThisSession && !force) return;
  try {
    const curVer = app.getVersion();
    if (ApiClient && ApiClient.users && typeof ApiClient.users.syncVersion === 'function') {
      await ApiClient.users.syncVersion(curVer);
    }
    hasSyncedVersionThisSession = true;
    console.log(`[VersionSync] Successfully synced users/${auth.uid} clientVersion to v${curVer}`);
  } catch (err) {
    // silently ignore if offline
  }
}

let cachedSocialAuth = null;
let cachedSocialAuthExpires = 0;
const accountAuthCache = new Map(); // uid -> { uid, idToken, expiresAt, accountId, username, accountType }
const _roleCache = new Map(); // uid -> { roles: { isAdmin, isMod }, expiresAt }

function invalidateSocialAuthCache() {
  cachedSocialAuth = null;
  cachedSocialAuthExpires = 0;
  accountAuthCache.clear();
  _roleCache.clear();
}

async function getAuthForSocialAccount(accountInfo) {
  if (!accountInfo || !accountInfo.refreshToken) return null;
  const cached = accountAuthCache.get(accountInfo.uid);
  if (cached && cached.idToken && Date.now() < cached.expiresAt) {
    return cached;
  }
  try {
    const refreshed = await refreshFirebaseToken(accountInfo.refreshToken);
    const authObj = {
      uid: refreshed.uid || accountInfo.uid,
      idToken: refreshed.idToken,
      refreshToken: refreshed.refreshToken,
      accountId: accountInfo.accountId,
      username: accountInfo.username,
      accountType: accountInfo.accountType,
      expiresAt: Date.now() + 45 * 60 * 1000
    };
    accountAuthCache.set(authObj.uid, authObj);
    return authObj;
  } catch (err) {
    if (err.message === 'INVALID_REFRESH_TOKEN') {
      accountAuthCache.delete(accountInfo.uid);
    }
    return null;
  }
}

// --- Social Helper: Get valid social auth credentials for current user ---
async function getSocialAuth() {
  const userData = loadUserData();
  const currentType = userData.account_type;
  const currentUid = currentType === 'microsoft' ? (userData.firebase_ms_uid || userData.uuid || userData.username) : userData.firebase_uid;
  if (cachedSocialAuth && cachedSocialAuth.uid === currentUid && Date.now() < cachedSocialAuthExpires) {
    return cachedSocialAuth;
  }

  if (userData.account_type === 'helloworld') {
    if (!userData.firebase_refresh_token) throw new Error('NO_SOCIAL_AUTH');
    try {
      const refreshed = await refreshFirebaseToken(userData.firebase_refresh_token);
      userData.firebase_id_token = refreshed.idToken;
      userData.firebase_refresh_token = refreshed.refreshToken;
      saveUserData(userData);
      const authObj = { uid: userData.firebase_uid, idToken: refreshed.idToken, accountType: 'helloworld', username: userData.username };
      cachedSocialAuth = authObj;
      cachedSocialAuthExpires = Date.now() + 45 * 60 * 1000;
      syncClientVersionToUsersDoc(authObj);
      return authObj;
    } catch (err) {
      invalidateSocialAuthCache();
      if (err.message === 'INVALID_REFRESH_TOKEN') {
        userData.firebase_uid = "";
        userData.firebase_refresh_token = "";
        saveUserData(userData);
        throw new Error('NO_SOCIAL_AUTH');
      }
      throw err;
    }
  }
  if (userData.account_type === 'microsoft') {
    if (userData.firebase_ms_refresh_token) {
      try {
        const refreshed = await refreshFirebaseToken(userData.firebase_ms_refresh_token);
        userData.firebase_ms_refresh_token = refreshed.refreshToken;
        saveUserData(userData);
        const authObj = { uid: userData.firebase_ms_uid, idToken: refreshed.idToken, accountType: 'microsoft', username: userData.username };
        cachedSocialAuth = authObj;
        cachedSocialAuthExpires = Date.now() + 45 * 60 * 1000;
        syncClientVersionToUsersDoc(authObj);
        return authObj;
      } catch (err) {
        invalidateSocialAuthCache();
        if (err.message === 'INVALID_REFRESH_TOKEN') {
          userData.firebase_ms_refresh_token = "";
          saveUserData(userData);
        }
      }
    }
    if (!userData.firebase_ms_uid && ApiClient && ApiClient.users && typeof ApiClient.users.checkMicrosoftVerified === 'function') {
      try {
        const msStatus = await ApiClient.users.checkMicrosoftVerified(userData.username, userData.uuid);
        if (msStatus && msStatus.verified && msStatus.firebase_uid) {
          userData.firebase_ms_uid = msStatus.firebase_uid;
          saveUserData(userData);
        }
      } catch (_) {}
    }
    // Microsoft / Premium account authenticated via Minecraft OAuth & Cloudflare backend
    const effectiveUid = userData.firebase_ms_uid || userData.uuid || userData.username;
    if (effectiveUid && userData.username) {
      const authObj = { uid: effectiveUid, idToken: null, accountType: 'microsoft', username: userData.username };
      cachedSocialAuth = authObj;
      cachedSocialAuthExpires = Date.now() + 45 * 60 * 1000;
      return authObj;
    }
    throw new Error('NO_SOCIAL_AUTH');
  }
  throw new Error('NO_SOCIAL_AUTH');
}

// Bind ApiClient token handlers with getSocialAuth & local user fallback
try {
  const getAuthTokenSafe = async () => {
    try {
      return await getSocialAuth();
    } catch (_) {
      const ud = loadUserData();
      return {
        username: ud ? ud.username : '',
        uid: ud ? (ud.firebase_ms_uid || ud.firebase_uid || ud.uuid) : '',
        accountType: ud ? ud.account_type : ''
      };
    }
  };
  ApiClient.setAuthHandlers(getAuthTokenSafe, getAuthTokenSafe);
} catch (_) {}

// --- Social Helper: Deterministic friendship doc ID ---
function friendshipId(uid1, uid2) { return [uid1, uid2].sort().join('__'); }

// --- Social Helper: Lowercase username for prefix-range search ---
function usernameLower(username) {
  return (username || '').toLowerCase();
}
const isValidHexUuid = (uuid) => /^[0-9a-f]{32}$/i.test(uuid || '');
const buildDeterministicUuid = (seed) => crypto.createHash('md5').update(seed).digest('hex');

// --- Helper: Extract email from Microsoft JWT access token ---
function decodeMsJwtEmail(accessToken) {
  try {
    const payload = accessToken.split('.')[1];
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    return (decoded.preferred_username || decoded.email || decoded.unique_name || '').toLowerCase().trim();
  } catch (e) {
    return '';
  }
}
const ensureHelloWorldUuid = (name, uuid) => {
  const normalized = normalizeUuid(uuid);
  if (isValidHexUuid(normalized)) return normalized;
  const safeName = name || 'Steve';
  return buildDeterministicUuid(`HelloWorldPlayer:${safeName}`);
};

const PRESENCE_HEARTBEAT_MS = 45 * 1000;
const PRESENCE_STALE_THRESHOLD_MS = 90 * 1000;

function formatPresenceVersionLabel(version, fallbackMcVersion) {
  if (!version) return fallbackMcVersion || '';
  const info = versionUtils.parseVersionString(version);
  if (!info) return fallbackMcVersion || version;
  if (info.type === 'vanilla') return info.mcVersion || fallbackMcVersion || version;
  return `${info.software} ${info.mcVersion}`;
}

function sanitizeWorldName(name) {
  if (!name) return '';
  const m = String(name).match(/ServerLevel\[([^\]]+)\]/i);
  return (m && m[1]) ? m[1].trim() : String(name).trim();
}

function presenceStatusLabel(status, serverIp, worldName) {
  switch (status) {
    case 'online':
      return 'Online';
    case 'menu':
      return 'In Menu';
    case 'playing': {
      const cleanWorld = sanitizeWorldName(worldName);
      return cleanWorld ? `Playing ${cleanWorld}` : 'Playing Minecraft';
    }
    case 'server':
      return serverIp ? `Playing on ${serverIp}` : 'Playing Multiplayer';
    default:
      return 'Offline';
  }
}

function isPresenceStale(updatedAt) {
  if (!updatedAt) return true;
  const ts = Date.parse(updatedAt);
  if (Number.isNaN(ts)) return true;
  return Date.now() - ts > PRESENCE_STALE_THRESHOLD_MS;
}

class PresenceManager {
  constructor() {
    this.currentState = null;
    this.heartbeatTimer = null;
    this.gameContext = null;
    this.lastServerIp = '';
    this.pendingWorldName = null;
    this.lastServerRealIp = '';
    this.connectionCheckTimer = null;
    this.gameProcessPid = null;
    this.isLeavingSingleplayer = false;
  }

  canUsePresence() {
    const data = loadUserData();
    if (data.account_type === 'helloworld') {
      return Boolean(data.firebase_uid && data.firebase_refresh_token);
    }
    if (data.account_type === 'microsoft') {
      return Boolean(data.firebase_ms_uid && data.firebase_ms_refresh_token);
    }
    return false;
  }

  getUid() {
    const data = loadUserData();
    if (data.account_type === 'helloworld') return data.firebase_uid || null;
    if (data.account_type === 'microsoft') return data.firebase_ms_uid || null;
    return null;
  }

  getPlayerName() {
    const data = loadUserData();
    return data.username || '';
  }

  async withAuth(fn) {
    try {
      const auth = await getSocialAuth();
      await fn(auth);
      return true;
    } catch (e) {
      if (e && e.message && e.message !== 'NO_SOCIAL_AUTH') {
        const status = e?.response?.status;
        const data = e?.response?.data;
        if (status) {
          console.warn('[Presence]', e.message, { status, data });
        } else {
          console.warn('[Presence]', e.message);
        }
      }
      return false;
    }
  }

  statesEqual(a, b) {
    if (!a || !b) return false;
    return a.status === b.status &&
      (a.mcVersion || '') === (b.mcVersion || '') &&
      (a.instanceName || '') === (b.instanceName || '') &&
      (a.serverIp || '') === (b.serverIp || '') &&
      (a.worldName || '') === (b.worldName || '') &&
      (a.statusText || '') === (b.statusText || '') &&
      (a.ign || '') === (b.ign || '');
  }

  async writeState(state) {
    if (!this.canUsePresence()) return;
    const uid = this.getUid();
    if (!uid) return;
    if (this.currentState && this.statesEqual(this.currentState, state)) {
      await this.sendHeartbeat();
      return true;
    }

    const userData = loadUserData();
    if (userData.app_presence_enabled === false) {
      if (this.currentState && this.currentState.status !== 'offline') {
        await this.setOffline();
      }
      return false;
    }

    const privacyMode = userData.privacy_mode === true;
    const showWorldName = userData.show_singleplayer_world !== false;
    const showGameVersion = userData.show_game_version !== false;
    const showProfileName = userData.show_profile_name !== false;
    const showPlayerIgn = userData.show_player_ign !== false;

    // Filter fields according to privacy and presence settings
    const serverIpToWrite = privacyMode ? '' : (state.serverIp || '');
    const worldNameToWrite = showWorldName ? (state.worldName || '') : '';
    const versionToWrite = showGameVersion ? (state.mcVersion || '') : '';
    const profileNameToWrite = showProfileName ? (state.instanceName || '') : '';
    const ignToWrite = showPlayerIgn ? (state.ign || '') : '';

    const now = new Date().toISOString();
    const statusText = state.statusText || presenceStatusLabel(state.status, serverIpToWrite, worldNameToWrite);
    const payload = {
      status: state.status,
      statusText,
      mcVersion: versionToWrite,
      instanceName: profileNameToWrite,
      serverIp: serverIpToWrite,
      worldName: worldNameToWrite,
      playerName: ignToWrite,
      clientVersion: app.getVersion(),
      updatedAt: now
    };
    const wrote = await this.withAuth(async (auth) => {
      if (ApiClient && ApiClient.presence && typeof ApiClient.presence.heartbeat === 'function') {
        await ApiClient.presence.heartbeat(payload);
      }
      return true;
    });
    if (!wrote) return false;
    this.currentState = { ...state, statusText, updatedAt: now };
    this.startHeartbeat();
    return true;
  }

  startHeartbeat() {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), PRESENCE_HEARTBEAT_MS);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  stopConnectionCheck() {
    if (this.connectionCheckTimer) {
      clearInterval(this.connectionCheckTimer);
      this.connectionCheckTimer = null;
    }
    this.lastServerRealIp = '';
  }

  async resolveServerIp(hostname) {
    try {
      console.log(`[Presence] Resolving hostname: ${hostname}`);
      const addresses = await dns.resolve4(hostname);
      const realIp = addresses[0] || null;
      console.log(`[Presence] Resolved ${hostname} to ${realIp}`);
      return realIp;
    } catch (e) {
      console.warn(`[Presence] Failed to resolve ${hostname}:`, e.message);
      return null;
    }
  }

  async checkServerConnection(serverIp) {
    if (!serverIp) return false;

    const [hostname, port] = serverIp.split(':');
    if (!hostname) return false;

    console.log(`[Presence] Checking connection to ${serverIp} (PID: ${this.gameProcessPid})`);

    // Resolve to real IP
    const realIp = await this.resolveServerIp(hostname);
    if (!realIp) {
      console.log(`[Presence] Could not resolve ${hostname}, assuming disconnected`);
      return false;
    }

    this.lastServerRealIp = realIp;

    // Check if there's an active connection to this IP using netstat with PID
    return new Promise((resolve) => {
      exec('netstat -ano', (error, stdout) => {
        if (error) {
          console.warn('[Presence] netstat failed:', error.message);
          resolve(false);
          return;
        }

        // Look for ESTABLISHED connections to the server IP from the game process
        const lines = stdout.split('\n');
        let connectionExists = false;

        for (const line of lines) {
          if (line.includes('ESTABLISHED') && line.includes(realIp)) {
            // Extract PID from the line (last column)
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];

            if (pid && this.gameProcessPid && parseInt(pid) === this.gameProcessPid) {
              connectionExists = true;
              console.log(`[Presence] Found game connection: ${realIp} (PID: ${pid})`);
              break;
            }
          }
        }

        console.log(`[Presence] Connection check for ${realIp}: ${connectionExists ? 'CONNECTED' : 'DISCONNECTED'}`);
        resolve(connectionExists);
      });
    });
  }

  startConnectionCheck() {
    this.stopConnectionCheck();
    // Game process closure is handled natively by child.on('close') -> onGameClosed().
    // Polling process.kill or netstat caused false disconnects on Windows.
  }

  async sendHeartbeat() {
    if (!this.currentState || !this.canUsePresence()) return;
    const uid = this.getUid();
    if (!uid) return;
    const now = new Date().toISOString();
    const wrote = await this.withAuth(async (auth) => {
      if (ApiClient && ApiClient.presence && typeof ApiClient.presence.heartbeat === 'function') {
        await ApiClient.presence.heartbeat({
          status: this.currentState.status || 'online',
          statusText: this.currentState.statusText || '',
          mcVersion: this.currentState.mcVersion || '',
          instanceName: this.currentState.instanceName || '',
          serverIp: this.currentState.serverIp || '',
          worldName: this.currentState.worldName || '',
          playerName: this.currentState.ign || this.getPlayerName(),
          clientVersion: app.getVersion()
        });
      }
      return true;
    });
    if (wrote && this.currentState) {
      this.currentState.updatedAt = now;
    }
  }

  async setLauncherOnline() {
    this.gameContext = null;
    this.lastServerIp = '';
    this.pendingWorldName = null;
    const userData = loadUserData();
    rpc.setEnabled(userData.discord_rpc_enabled !== false);
    rpc.setLauncher();
    if (userData.app_presence_enabled === false) {
      await this.setOffline();
      return;
    }
    if (!this.canUsePresence()) return;
    const wrote = await this.writeState({
      status: 'online',
      mcVersion: '',
      instanceName: '',
      serverIp: '',
      worldName: '',
      ign: this.getPlayerName()
    });
    if (!wrote) {
      console.warn('[Presence] Failed to mark launcher online. Presence will not update until authentication succeeds.');
    } else {
      this.withAuth(async (auth) => { await syncClientVersionToUsersDoc(auth); }).catch(()=>{});
    }
  }

  async ensureLauncherOnline() {
    if (this.gameContext) {
      return;
    }
    await this.setLauncherOnline();
  }

  async setOffline() {
    this.stopHeartbeat();
    if (!this.canUsePresence()) return;
    const uid = this.getUid();
    if (!uid) return;
    const now = new Date().toISOString();
    await this.withAuth(async (auth) => {
      if (ApiClient && ApiClient.presence && typeof ApiClient.presence.offline === 'function') {
        await ApiClient.presence.offline();
      }
      return true;
    }).catch(() => {});
    this.currentState = { status: 'offline', mcVersion: '', instanceName: '', serverIp: '', worldName: '', statusText: presenceStatusLabel('offline'), ign: this.getPlayerName(), updatedAt: now };
    this.gameContext = null;
    this.lastServerIp = '';
    this.pendingWorldName = null;
  }

  async onGameLaunch({ versionLabel, profileName, ign, pid }) {
    this.gameContext = { versionLabel, profileName, ign, worldName: null };
    this.lastServerIp = '';
    this.pendingWorldName = null;
    this.gameProcessPid = pid;
    const userData = loadUserData();
    rpc.setEnabled(userData.discord_rpc_enabled !== false);
    rpc.setMenu({
      version: versionLabel,
      profileName,
      ign,
      showGameVersion: userData.show_game_version !== false,
      showProfileName: userData.show_profile_name !== false,
      showPlayerIgn: userData.show_player_ign !== false
    });
    if (!this.canUsePresence()) return;
    await this.writeState({
      status: 'menu',
      mcVersion: versionLabel,
      instanceName: profileName || '',
      serverIp: '',
      worldName: '',
      ign: ign || this.getPlayerName()
    });
  }

  async onSingleplayerStart(worldName) {
    if (!this.gameContext) return;
    triggerStreakUpdate();
    // Don't start if we're in the process of leaving singleplayer
    if (this.isLeavingSingleplayer) {
      console.log('[Presence] Ignoring singleplayer start - leaving in progress');
      return;
    }
    // Don't start if we're currently on a server
    if (this.lastServerIp) {
      console.log('[Presence] Ignoring singleplayer start - on server');
      return;
    }
    this.gameContext.worldName = sanitizeWorldName(worldName || this.gameContext.worldName || '');
    const { versionLabel, profileName, ign } = this.gameContext;
    const userData = loadUserData();
    rpc.setEnabled(userData.discord_rpc_enabled !== false);
    rpc.setPlaying({
      version: versionLabel,
      profileName,
      ign,
      worldName: this.gameContext.worldName,
      showWorldName: userData.show_singleplayer_world !== false,
      showGameVersion: userData.show_game_version !== false,
      showProfileName: userData.show_profile_name !== false,
      showPlayerIgn: userData.show_player_ign !== false
    });
    if (!this.canUsePresence()) return;
    await this.writeState({
      status: 'playing',
      mcVersion: versionLabel,
      instanceName: profileName || '',
      serverIp: '',
      worldName: this.gameContext.worldName || '',
      ign: ign || this.getPlayerName()
    });
  }

  async onServerJoin(serverIp) {
    if (!this.gameContext) return;
    triggerStreakUpdate();
    const { versionLabel, profileName, ign } = this.gameContext;
    this.lastServerIp = serverIp;
    this.isLeavingSingleplayer = false; // Clear leaving flag when joining server
    this.gameContext.worldName = null; // Clear singleplayer world when joining server
    const userData = loadUserData();
    const privacyMode = userData.privacy_mode === true;
    rpc.setEnabled(userData.discord_rpc_enabled !== false);
    rpc.setServer({
      version: versionLabel,
      profileName,
      ign,
      serverIp,
      privacyMode,
      showGameVersion: userData.show_game_version !== false,
      showProfileName: userData.show_profile_name !== false,
      showPlayerIgn: userData.show_player_ign !== false
    });
    if (!this.canUsePresence()) return;
    await this.writeState({
      status: 'server',
      mcVersion: versionLabel,
      instanceName: profileName || '',
      serverIp: serverIp, // writeState will handle privacy mode
      worldName: '',
      ign: ign || this.getPlayerName()
    });
    // Start network connection monitoring
    this.startConnectionCheck();
  }

  async onServerLeave() {
    if (!this.gameContext) return;
    const { versionLabel, profileName, ign } = this.gameContext;
    // Stop connection monitoring
    this.stopConnectionCheck();
    // Always go back to menu when leaving a server
    // Singleplayer state is managed separately by singleplayer-specific logs
    const userData = loadUserData();
    rpc.setEnabled(userData.discord_rpc_enabled !== false);
    rpc.setMenu({
      version: versionLabel,
      profileName,
      ign,
      showGameVersion: userData.show_game_version !== false,
      showProfileName: userData.show_profile_name !== false,
      showPlayerIgn: userData.show_player_ign !== false
    });
    if (!this.canUsePresence()) return;
    await this.writeState({
      status: 'menu',
      mcVersion: versionLabel,
      instanceName: profileName || '',
      serverIp: '',
      worldName: '',
      ign: ign || this.getPlayerName()
    });
    this.lastServerIp = '';
  }

  async onSingleplayerStop() {
    if (!this.gameContext) return;
    // Don't override if user is already on or connecting to a server
    if (this.lastServerIp) {
      console.log(`[Presence] Ignoring singleplayer stop - active server connection: ${this.lastServerIp}`);
      return;
    }
    const { versionLabel, profileName, ign } = this.gameContext;
    this.gameContext.worldName = null;
    this.pendingWorldName = null;
    this.isLeavingSingleplayer = true;
    const userData = loadUserData();
    rpc.setEnabled(userData.discord_rpc_enabled !== false);
    rpc.setMenu({
      version: versionLabel,
      profileName,
      ign,
      showGameVersion: userData.show_game_version !== false,
      showProfileName: userData.show_profile_name !== false,
      showPlayerIgn: userData.show_player_ign !== false
    });
    if (!this.canUsePresence()) return;
    await this.writeState({
      status: 'menu',
      mcVersion: versionLabel,
      instanceName: profileName || '',
      serverIp: '',
      worldName: '',
      ign: ign || this.getPlayerName()
    });
    setTimeout(() => {
      this.isLeavingSingleplayer = false;
    }, 4000);
  }

  async onGameClosed() {
    this.stopConnectionCheck();
    this.isLeavingSingleplayer = false;
    this.pendingWorldName = null;
    await this.setLauncherOnline();
  }

  handleGameLog(line) {
    if (!line) return;
    const lines = line.split(/\r?\n/);
    if (lines.length > 1) {
      for (const l of lines) {
        this.handleGameLog(l);
      }
      return;
    }
    const cleaned = line.trim();
    if (!cleaned) return;

    if (cleaned.includes('Connecting') || cleaned.includes('server') || cleaned.includes('Server') ||
      cleaned.includes('level') || cleaned.includes('world') || cleaned.includes('integrated') ||
      cleaned.includes('Saving') || cleaned.includes('Stopping')) {
      console.log(`[Presence] Game log: ${cleaned}`);
    }

    // 1. Server connection check - HIGHEST PRIORITY
    // Handles forms: "Connecting to play.example.com, 25565", "Connecting to play.example.com:25565", "Connecting to play.example.com", etc.
    const connectMatch = cleaned.match(/Connecting to\s+([a-zA-Z0-9.\-_]+)(?:[,\s:]+(\d+))?/i) ||
      cleaned.match(/Connecting to '([^:']+)(?::(\d+))?'/i) ||
      cleaned.match(/Logging into ([a-zA-Z0-9.\-_]+)(?::(\d+))?/i) ||
      cleaned.match(/Joining ([a-zA-Z0-9.\-_]+)(?::(\d+))?/i) ||
      cleaned.match(/joined the game/i);

    if (connectMatch) {
      if (cleaned.includes('joined the game')) {
        if (cleaned.includes('Server thread') || cleaned.includes('Integrated Server')) {
          const worldName = this.pendingWorldName || this.gameContext?.worldName || '';
          this.pendingWorldName = null;
          console.log(`[Presence] Player joined singleplayer world: ${worldName}`);
          this.safeRun(this.onSingleplayerStart(worldName));
          return;
        }
        if (!this.lastServerIp) {
          console.log('[Presence] Player joined multiplayer server without explicit IP in log');
          this.safeRun(this.onServerJoin(''));
        }
        return;
      }

      const host = (connectMatch[1] || '').trim();
      const port = (connectMatch[2] || '').trim();
      const serverIp = (!port || port === '25565') ? host : `${host}:${port}`;
      console.log(`[Presence] Detected server connection to: ${serverIp}`);
      this.isLeavingSingleplayer = false;
      this.pendingWorldName = null;
      if (this.gameContext) this.gameContext.worldName = null;
      this.safeRun(this.onServerJoin(serverIp));
      return;
    }

    // 2. Disconnect from server - Genuine disconnects only
    // Exclude in-game chat messages and background connection resets (e.g. server list pings, proxy transfers)
    const isChat = cleaned.includes('[CHAT]') || cleaned.includes('[System] [CHAT]');
    if (!isChat) {
      const isClientDisconnect =
        /(?:Render|Client) thread.*(?:Disconnecting|Disconnected) from server/i.test(cleaned) ||
        /(?:^|\s)Disconnecting from server/i.test(cleaned) ||
        /(?:^|\s)Disconnected from server/i.test(cleaned);

      const isServerDrop =
        /Lost connection:\s*(?:Disconnected|Timed out|Kicked|Server closed|You have been|Internal Exception: io\.netty)/i.test(cleaned) &&
        !/Lost connection:\s*Transferred/i.test(cleaned);

      if (isClientDisconnect || isServerDrop) {
        if (this.lastServerIp) {
          console.log(`[Presence] Detected server disconnect: ${cleaned}`);
          this.safeRun(this.onServerLeave());
          return;
        } else if (this.currentState?.status === 'playing') {
          console.log(`[Presence] Detected singleplayer disconnect: ${cleaned}`);
          this.safeRun(this.onSingleplayerStop());
          return;
        }
      }
    }

    if (/Stopping!/i.test(cleaned) && this.lastServerIp) {
      this.safeRun(this.onServerLeave());
      return;
    }

    // 3. Singleplayer stop - only if NOT on a server
    if (!this.lastServerIp) {
      if (/Stopping singleplayer server/i.test(cleaned) ||
        /Saving worlds/i.test(cleaned) ||
        /Saving the world/i.test(cleaned) ||
        /Saving level/i.test(cleaned)) {
        console.log('[Presence] Detected singleplayer stop');
        this.safeRun(this.onSingleplayerStop());
        return;
      }
    }

    // 4. World loading detection (only if not leaving singleplayer and not on a server)
    if (!this.isLeavingSingleplayer && !this.lastServerIp) {
      const serverLevelMatch = cleaned.match(/ServerLevel\[([^\]]+)\]/i);
      if (serverLevelMatch && serverLevelMatch[1]) {
        this.pendingWorldName = sanitizeWorldName(serverLevelMatch[1]);
        console.log(`[Presence] Detected world name from ServerLevel: ${this.pendingWorldName}`);
      }

      const worldMatch = cleaned.match(/Loaded level '([^']+)'/i) ||
        cleaned.match(/Preparing level "([^"]+)"/i) ||
        cleaned.match(/Loading level '([^']+)'/i) ||
        cleaned.match(/Loading world '([^']+)'/i) ||
        cleaned.match(/loading world '([^']+)'/i) ||
        cleaned.match(/Saving chunks for level '([^']+)'/i);
      if (worldMatch && worldMatch[1]) {
        this.pendingWorldName = sanitizeWorldName(worldMatch[1]);
        console.log(`[Presence] Detected world name: ${this.pendingWorldName}`);
        
        if (this.gameContext && this.currentState && this.currentState.status === 'playing' && !this.gameContext.worldName) {
          this.safeRun(this.onSingleplayerStart(this.pendingWorldName));
        }
      }

      if (/Starting integrated server/i.test(cleaned) ||
        /Starting minecraft server/i.test(cleaned)) {
        const worldName = this.pendingWorldName || this.gameContext?.worldName || '';
        this.pendingWorldName = null;
        console.log(`[Presence] Starting singleplayer world: ${worldName}`);
        this.safeRun(this.onSingleplayerStart(worldName));
        return;
      }

      if (/Server thread/i.test(cleaned) && this.pendingWorldName) {
        const worldName = this.pendingWorldName;
        this.pendingWorldName = null;
        console.log(`[Presence] Starting singleplayer world (from Server thread): ${worldName}`);
        this.safeRun(this.onSingleplayerStart(worldName));
        return;
      }
    }
  }

  safeRun(promise) {
    promise?.catch?.((err) => {
      if (err && err.message && err.message !== 'NO_SOCIAL_AUTH') {
        console.warn('[Presence]', err.message);
      }
    });
  }

  async refreshCurrentPresence() {
    const userData = loadUserData();
    rpc.setEnabled(userData.discord_rpc_enabled !== false);
    if (userData.app_presence_enabled === false) {
      await this.setOffline();
      return;
    }
    if (this.gameContext) {
      const { versionLabel, profileName, ign } = this.gameContext;
      const privacyMode = userData.privacy_mode === true;
      if (this.lastServerIp) {
        rpc.setServer({
          version: versionLabel,
          profileName,
          ign,
          serverIp: this.lastServerIp,
          privacyMode,
          showGameVersion: userData.show_game_version !== false,
          showProfileName: userData.show_profile_name !== false,
          showPlayerIgn: userData.show_player_ign !== false
        });
        await this.writeState({
          status: 'server',
          mcVersion: versionLabel,
          instanceName: profileName || '',
          serverIp: this.lastServerIp,
          worldName: '',
          ign: ign || this.getPlayerName()
        });
      } else if (this.gameContext.worldName) {
        rpc.setPlaying({
          version: versionLabel,
          profileName,
          ign,
          worldName: this.gameContext.worldName,
          showWorldName: userData.show_singleplayer_world !== false,
          showGameVersion: userData.show_game_version !== false,
          showProfileName: userData.show_profile_name !== false,
          showPlayerIgn: userData.show_player_ign !== false
        });
        await this.writeState({
          status: 'playing',
          mcVersion: versionLabel,
          instanceName: profileName || '',
          serverIp: '',
          worldName: this.gameContext.worldName || '',
          ign: ign || this.getPlayerName()
        });
      } else {
        rpc.setMenu({
          version: versionLabel,
          profileName,
          ign,
          showGameVersion: userData.show_game_version !== false,
          showProfileName: userData.show_profile_name !== false,
          showPlayerIgn: userData.show_player_ign !== false
        });
        await this.writeState({
          status: 'menu',
          mcVersion: versionLabel,
          instanceName: profileName || '',
          serverIp: '',
          worldName: '',
          ign: ign || this.getPlayerName()
        });
      }
    } else {
      rpc.setLauncher();
      await this.setLauncherOnline();
    }
  }
}

const presenceManager = new PresenceManager();

function buildPresenceResponse(rawDoc) {
  if (!rawDoc) {
    return {
      state: 'offline',
      statusText: presenceStatusLabel('offline'),
      mcVersion: '',
      instanceName: '',
      serverIp: '',
      clientVersion: '',
      updatedAt: null,
      lastSeenAt: null
    };
  }
  const updatedAt = rawDoc.updatedAt || null;
  const lastSeenAt = rawDoc.lastSeenAt || updatedAt;
  const stale = isPresenceStale(updatedAt) || rawDoc.status === 'offline';
  const status = stale ? 'offline' : (rawDoc.status || 'offline');
  return {
    state: status,
    statusText: stale ? presenceStatusLabel('offline') : (rawDoc.statusText || presenceStatusLabel(status, rawDoc.serverIp, rawDoc.worldName)),
    mcVersion: rawDoc.mcVersion || '',
    instanceName: rawDoc.instanceName || '',
    serverIp: rawDoc.serverIp || '',
    playerName: rawDoc.playerName || '',
    worldName: rawDoc.worldName || '',
    clientVersion: rawDoc.clientVersion || '',
    updatedAt,
    lastSeenAt: lastSeenAt || updatedAt || null
  };
}

async function fetchPresenceForUser(uid, auth, fsDocId = null) {
  if (!uid) return buildPresenceResponse(null);
  try {
    if (ApiClient && ApiClient.presence && typeof ApiClient.presence.getPresence === 'function') {
      const res = await ApiClient.presence.getPresence(uid);
      if (res && res.presence) {
        return buildPresenceResponse(res.presence);
      }
    }
  } catch (e) {
    if (e?.response?.status === 404 || e?.response?.status === 403) {
      return buildPresenceResponse(null);
    }
    console.warn('[Presence] fetchPresenceForUser failed:', e.message || e);
  }
  return buildPresenceResponse(null);
}

// --- Minecraft Process, Window & Daily Streak Detection ---
let activeGameProcesses = new Set(); // Internal ChildProcess instances
const internalGameProcessesMeta = new Map(); // child -> { pid, startTime, streakTimer, windowPollTimer }
let externalMinecraftPids = new Set(); // External detected PIDs (e.g. opened before launcher or externally)
const externalProcessesMeta = new Map(); // pid -> { startTime, firstDetectedAt }
let processMonitorInterval = null;
let lastStreakRecordedDateStr = null;
let lastKnownRunningState = false;

function parseCsvLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}

function isMinecraftGameWindowTitle(rawTitle) {
  if (!rawTitle || typeof rawTitle !== 'string') return false;
  const t = rawTitle.toLowerCase().trim();
  if (!t.includes('minecraft')) return false;
  // Exclude standalone launcher UI windows or headless servers if running in java
  if (t.includes('minecraft server') && !t.includes('1.')) return false;
  if (t.endsWith('launcher') || t.includes('launcher -')) return false;
  return true;
}

function detectSystemMinecraftProcesses() {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      const commands = [
        'tasklist /v /fo csv /fi "IMAGENAME eq javaw.exe"',
        'tasklist /v /fo csv /fi "IMAGENAME eq java.exe"'
      ];
      const results = new Map();
      let pending = commands.length;
      commands.forEach(cmd => {
        const { exec } = require('child_process');
        exec(cmd, { windowsHide: true, timeout: 3500 }, (err, stdout) => {
          if (!err && stdout) {
            const lines = stdout.split(/\r?\n/).filter(l => l.trim().length > 0);
            for (let i = 1; i < lines.length; i++) {
              const cols = parseCsvLine(lines[i]);
              if (cols.length >= 9) {
                const pid = parseInt(cols[1], 10);
                const rawTitle = cols[8].replace(/^"|"$/g, '').trim();
                if (pid && isMinecraftGameWindowTitle(rawTitle)) {
                  results.set(pid, {
                    imageName: cols[0].replace(/^"|"$/g, '').trim(),
                    title: rawTitle
                  });
                }
              }
            }
          }
          pending--;
          if (pending === 0) resolve(results);
        });
      });
    } else if (process.platform === 'darwin' || process.platform === 'linux') {
      const { exec } = require('child_process');
      const results = new Map();
      const parsePsOutput = (stdout) => {
        const lines = stdout.split(/\r?\n/).filter(l => l.trim().length > 0);
        for (const line of lines) {
          const lower = line.toLowerCase();
          if ((lower.includes('minecraft') || lower.includes('net.minecraft')) && (lower.includes('java') || lower.includes('/java'))) {
            const match = line.trim().match(/^(\d+)\s+(.+)$/);
            if (match) {
              const pid = parseInt(match[1], 10);
              if (pid && pid !== process.pid) {
                results.set(pid, { imageName: 'java', title: match[2] });
              }
            }
          }
        }
      };

      if (process.platform === 'linux') {
        exec('wmctrl -lp', { timeout: 2000 }, (err, stdout) => {
          if (!err && stdout) {
            const lines = stdout.split(/\r?\n/).filter(l => l.trim().length > 0);
            for (const line of lines) {
              if (line.toLowerCase().includes('minecraft')) {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 3) {
                  const pid = parseInt(parts[2], 10);
                  if (pid) results.set(pid, { imageName: 'java', title: line });
                }
              }
            }
          }
          if (results.size > 0) return resolve(results);
          // Fallback to ps command if wmctrl is not installed or returned no window
          exec('ps -ax -o pid,command', { timeout: 2500 }, (pErr, pStdout) => {
            if (!pErr && pStdout) parsePsOutput(pStdout);
            resolve(results);
          });
        });
      } else {
        // macOS: Native process list inspection
        exec('ps -ax -o pid,command', { timeout: 2500 }, (pErr, pStdout) => {
          if (!pErr && pStdout) parsePsOutput(pStdout);
          resolve(results);
        });
      }
    } else {
      resolve(new Map());
    }
  });
}

function getRunningMinecraftCount() {
  const allRunningPids = new Set();
  for (const child of activeGameProcesses) {
    if (child && child.pid && !child.killed) {
      allRunningPids.add(child.pid);
    }
  }
  for (const pid of externalMinecraftPids) {
    allRunningPids.add(pid);
  }
  return allRunningPids.size;
}

function isMinecraftRunning() {
  return getRunningMinecraftCount() > 0;
}

function getLocalStatsFilePath() {
  try {
    return path.join(path.dirname(paths.getUserFilePath()), 'stats.json');
  } catch (_) {
    return null;
  }
}

function loadLocalStats() {
  try {
    const filePath = getLocalStatsFilePath();
    if (filePath && fs.existsSync(filePath)) {
      const data = fs.readJsonSync(filePath);
      if (data && typeof data === 'object') return data;
    }
  } catch (_) {}
  const ud = loadUserData();
  const sessions = (ud && typeof ud.launch_count === 'number') ? ud.launch_count : 0;
  return {
    streak: 0,
    maxStreak: 0,
    totalHours: 0,
    totalSessions: sessions,
    totalDaysPlayed: sessions > 0 ? 1 : 0,
    lastPlayed: Date.now(),
    streakCompletedToday: false
  };
}

function saveLocalStats(stats) {
  try {
    const filePath = getLocalStatsFilePath();
    if (filePath) {
      fs.writeJsonSync(filePath, stats, { spaces: 2 });
    }
  } catch (err) {
    console.warn('[Stats] Failed to save local stats:', err.message);
  }
}

async function addPlaytimeToUserStats(playTimeHours) {
  if (playTimeHours <= 0 || isLaunchCancelled) return;
  try {
    const local = loadLocalStats();
    const newHours = (local.totalHours || 0) + playTimeHours;
    const updated = { ...local, totalHours: newHours };
    saveLocalStats(updated);

    // Sync to Cloudflare backend
    try {
      if (ApiClient && ApiClient.stats && typeof ApiClient.stats.record === 'function') {
        ApiClient.stats.record({ addedHours: playTimeHours }).catch(() => {});
      }
    } catch (_) {}

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('stats-updated');
    }
    console.log(`[Stats] Added ${playTimeHours.toFixed(3)}h playtime. New total: ${newHours.toFixed(2)}h`);
  } catch (err) {
    console.error('[Stats] Error updating playtime:', err.message);
  }
}

async function checkDailyStreakForRunningGame() {
  if (!isMinecraftRunning()) return;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // If already confirmed recorded for today in this session, skip
  if (lastStreakRecordedDateStr === todayStr) return;

  const auth = await getSocialAuth().catch(() => null);
  if (!auth) return;

  try {
    let stats = null;
    try {
      if (ApiClient && ApiClient.stats && typeof ApiClient.stats.getMyStats === 'function') {
        const res = await ApiClient.stats.getMyStats();
        if (res && res.success && res.stats) stats = res.stats;
      }
    } catch (e) {
      stats = null;
    }
    const lastDate = stats && stats.lastPlayed ? new Date(stats.lastPlayed).toISOString().split('T')[0] : null;

    if (lastDate === todayStr) {
      lastStreakRecordedDateStr = todayStr;
      return;
    }

    console.log(`[Streak] Minecraft is running on a new day (${todayStr}, lastPlayed was ${lastDate}). Updating streak!`);
    await updateStreakAndSessions();
    lastStreakRecordedDateStr = todayStr;
  } catch (err) {
    console.warn('[Streak] Error checking daily streak:', err.message);
  }
}

async function pollMinecraftProcesses() {
  try {
    const systemProcs = await detectSystemMinecraftProcesses();
    const systemPids = new Set(systemProcs.keys());

    const internalPids = new Set();
    for (const child of activeGameProcesses) {
      if (child && child.pid && !child.killed) {
        internalPids.add(child.pid);
      }
    }

    const newExternalPids = new Set();
    for (const pid of systemPids) {
      if (!internalPids.has(pid)) {
        newExternalPids.add(pid);
        if (!externalProcessesMeta.has(pid)) {
          externalProcessesMeta.set(pid, {
            startTime: Date.now(),
            firstDetectedAt: Date.now()
          });
        }
      }
    }

    // Process closed external processes
    for (const [pid, meta] of externalProcessesMeta) {
      if (!newExternalPids.has(pid)) {
        const elapsedMs = Date.now() - meta.startTime;
        if (elapsedMs >= 30000 && !isLaunchCancelled) {
          addPlaytimeToUserStats(elapsedMs / (1000 * 60 * 60)).catch(() => {});
        }
        externalProcessesMeta.delete(pid);
      }
    }

    externalMinecraftPids = newExternalPids;
    const currentlyRunning = isMinecraftRunning();

    // Check daily streak for any running game instance
    if (currentlyRunning) {
      await checkDailyStreakForRunningGame();
    }

    // State transitions
    const hasUnreadyInternalProcess = Array.from(internalGameProcessesMeta.values()).some(m => !m.isReady);
    if (!lastKnownRunningState && currentlyRunning) {
      lastKnownRunningState = true;
      console.log(`[ProcessMonitor] Minecraft process detected running (count: ${getRunningMinecraftCount()})`);
      if (!hasUnreadyInternalProcess && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('info-message', 'Game Ready');
        mainWindow.webContents.send('game-status', { running: true, count: getRunningMinecraftCount() });
      }
    } else if (lastKnownRunningState && !currentlyRunning) {
      lastKnownRunningState = false;
      console.log('[ProcessMonitor] All Minecraft processes closed');
      handleLauncherClose('all_processes_closed');
    }
  } catch (err) {
    console.warn('[ProcessMonitor] Polling error:', err.message);
  }
}

function startMinecraftProcessMonitor() {
  if (processMonitorInterval) return;
  pollMinecraftProcesses();
  processMonitorInterval = setInterval(pollMinecraftProcesses, 3500);
}

let gameStartTime = null;
let streakSessionTimer = null;
let streakCountedThisRun = false;

function triggerStreakUpdate() {
  if (streakCountedThisRun || isLaunchCancelled) return;
  streakCountedThisRun = true;
  if (streakSessionTimer) {
    clearTimeout(streakSessionTimer);
    streakSessionTimer = null;
  }
  console.log('[Stats] Gameplay threshold met (in-game world/server or verified active playtime), recording streak and session');
  const now = new Date();
  lastStreakRecordedDateStr = now.toISOString().split('T')[0];
  updateStreakAndSessions();
}

async function updateStreakAndSessions() {
  try {
    const local = loadLocalStats();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const lastDate = local.lastPlayed ? new Date(local.lastPlayed).toISOString().split('T')[0] : null;

    let streak = local.streak || 0;
    let totalDaysPlayed = local.totalDaysPlayed || 0;
    let maxStreak = local.maxStreak || streak || 0;

    if (lastDate !== todayStr) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (lastDate === yesterdayStr) {
        streak += 1;
      } else {
        streak = 1;
      }
      totalDaysPlayed += 1;
      if (streak > maxStreak) maxStreak = streak;
    }

    const updated = {
      ...local,
      streak,
      maxStreak,
      lastPlayed: now.getTime(),
      totalSessions: (local.totalSessions || 0) + 1,
      totalDaysPlayed,
      streakCompletedToday: true
    };
    saveLocalStats(updated);

    // Sync to Cloudflare backend
    try {
      if (ApiClient && ApiClient.stats && typeof ApiClient.stats.record === 'function') {
        ApiClient.stats.record({ addedHours: 0 }).catch(() => {});
      }
    } catch (_) {}

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('stats-updated');
    }
  } catch (e) {
    console.error('[Stats] Error updating streak/sessions:', e.message);
  }
}

async function handleLauncherClose(e) {
  if (isMinecraftRunning()) {
    console.log(`[handleLauncherClose] Ignored: ${getRunningMinecraftCount()} instance(s) still active.`);
    return;
  }
  console.log('[Launcher Close]', e);
  lastKnownRunningState = false;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('info-message', 'Game Closed');
    mainWindow.webContents.send('game-status', { running: false, count: 0 });
  }
  presenceManager.safeRun(presenceManager.onGameClosed());

  if (streakSessionTimer) {
    clearTimeout(streakSessionTimer);
    streakSessionTimer = null;
  }

  if (gameStartTime) {
    const elapsedMs = Date.now() - gameStartTime;
    gameStartTime = null;

    if (elapsedMs >= 30000 && !isLaunchCancelled) {
      if (!streakCountedThisRun) {
        triggerStreakUpdate();
      }
      addPlaytimeToUserStats(elapsedMs / (1000 * 60 * 60)).catch(() => {});
    } else {
      console.log(`[Stats] Game session under 30s (${(elapsedMs / 1000).toFixed(1)}s) or cancelled, skipping streak and playtime.`);
    }
  }

  // Restore & maximize launcher window when game closes if enabled (default: true)
  try {
    const userData = loadUserData();
    if (userData.reopen_on_game_close !== false && e !== 'cancelled') {
      maximizeAndFocusLauncher();
    }
  } catch (err) {
    console.error('[handleLauncherClose] Error checking reopen setting:', err);
  }
}

function focusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function maximizeAndFocusLauncher() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const restoreAndFocus = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    try {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      mainWindow.maximize();
      mainWindow.show();
      mainWindow.focus();

      // Ensure launcher comes to foreground on Windows even if backgrounded
      mainWindow.setAlwaysOnTop(true);
      mainWindow.focus();
      mainWindow.setAlwaysOnTop(false);

      try { mainWindow.flashFrame(true); } catch (_) {}
      try { mainWindow.webContents.invalidate(); } catch (_) {}
      try { if (typeof updateTrayMenu === 'function') updateTrayMenu(); } catch (_) {}
    } catch (err) {
      console.error('[Launch] Error restoring/maximizing launcher window:', err);
    }
  };

  restoreAndFocus();
  // Second pass ensures window state is finalized if the OS was transitioning from Minecraft's display mode/fullscreen
  setTimeout(restoreAndFocus, 150);
}

let presencePollingInterval = null;
let presencePollingReady = false;
let presencePollingInitializing = false;
const lastPresenceStates = new Map();
const friendProfileCache = new Map();

function resetPresenceCaches() {
  presencePollingReady = false;
  presencePollingInitializing = false;
  lastPresenceStates.clear();
  friendProfileCache.clear();
}

function getNotificationIconPath() {
  const launcherDir = paths.getLauncherDir();
  const iconInLauncherDir = path.join(launcherDir, 'icon.png');
  if (fs.existsSync(iconInLauncherDir)) {
    return iconInLauncherDir;
  }
  try {
    const candidates = [
      path.join(__dirname, 'build', 'icon.png'),
      path.join(__dirname, 'ui', 'icon.png'),
      path.join(process.resourcesPath, 'icon.png')
    ];
    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        fs.ensureDirSync(launcherDir);
        fs.copyFileSync(cand, iconInLauncherDir);
        return iconInLauncherDir;
      }
    }
  } catch (_) {}
  return path.join(__dirname, 'ui', 'icon.png');
}

async function resolveAvatarFile(profile) {
  if (!profile) return getNotificationIconPath();
  try {
    const avatarsDir = path.join(paths.getLauncherDir(), 'avatars');
    fs.ensureDirSync(avatarsDir);

    const isMicrosoft = profile.accountType === 'microsoft';
    const uid = profile.uid || profile.username || 'custom';

    // 1. If it's a Microsoft account, fetch head skin from mc-heads.net
    if (isMicrosoft) {
      const mcUuid = profile.mcUuid || profile.uuid || profile.username;
      if (mcUuid) {
        const avatarFilePath = path.join(avatarsDir, `ms_${mcUuid}.png`);
        if (fs.existsSync(avatarFilePath)) {
          return avatarFilePath;
        }
        try {
          const resp = await axios.get(`https://mc-heads.net/avatar/${encodeURIComponent(mcUuid)}/128`, {
            responseType: 'arraybuffer',
            timeout: 4000
          });
          if (resp.data && resp.data.length > 0) {
            fs.writeFileSync(avatarFilePath, Buffer.from(resp.data));
            return avatarFilePath;
          }
        } catch (err) {
          console.warn('[NotificationAvatar] Failed to fetch mc-heads avatar:', err.message);
        }
      }
    }

    // 2. If it has avatarBase64 (HelloWorld custom avatar / skin head)
    let avatarBase64 = profile.avatarBase64 || profile.avatarUrl;
    if (avatarBase64 && typeof avatarBase64 === 'string') {
      try {
        let cleanBase64 = avatarBase64;
        if (cleanBase64.includes('base64,')) {
          cleanBase64 = cleanBase64.split('base64,')[1];
        }
        const buf = Buffer.from(cleanBase64, 'base64');
        if (buf.length > 0) {
          const avatarFilePath = path.join(avatarsDir, `${uid}.png`);
          fs.writeFileSync(avatarFilePath, buf);
          return avatarFilePath;
        }
      } catch (b64Err) {
        console.warn('[NotificationAvatar] Failed to parse base64 avatar:', b64Err.message);
      }
    }

    // 3. Web URL avatar
    const avatarUrl = (profile.avatarUrl && profile.avatarUrl.startsWith('http')) ? profile.avatarUrl :
                     (profile.last_avatar_url && profile.last_avatar_url.startsWith('http')) ? profile.last_avatar_url : null;
    if (avatarUrl) {
      try {
        const avatarFilePath = path.join(avatarsDir, `${uid}.png`);
        const resp = await axios.get(avatarUrl, {
          responseType: 'arraybuffer',
          timeout: 4000
        });
        if (resp.data && resp.data.length > 0) {
          fs.writeFileSync(avatarFilePath, Buffer.from(resp.data));
          return avatarFilePath;
        }
      } catch (urlErr) {
        console.warn('[NotificationAvatar] Failed to download web avatar:', urlErr.message);
      }
    }

    // 4. Fallback for HelloWorld / users without avatar: Generate circular letter avatar PNG
    const letter = (profile.username || '?')[0].toUpperCase();
    const colors = ['#2ecc71', '#3498db', '#9b59b6', '#e67e22', '#e74c3c', '#1abc9c', '#f39c12', '#34495e'];
    let hash = 0;
    const nameStr = profile.username || 'User';
    for (let i = 0; i < nameStr.length; i++) hash = (hash * 31 + nameStr.charCodeAt(i)) >>> 0;
    const color = colors[hash % colors.length];
    const letterAvatarPath = path.join(avatarsDir, `letter_${letter}_${color.replace('#','')}.png`);

    if (fs.existsSync(letterAvatarPath)) {
      return letterAvatarPath;
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
      <circle cx="64" cy="64" r="64" fill="${color}"/>
      <text x="64" y="74" font-family="Segoe UI, Arial, sans-serif" font-size="64" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="central">${letter}</text>
    </svg>`;
    try {
      const img = nativeImage.createFromBuffer(Buffer.from(svg));
      if (!img.isEmpty()) {
        fs.writeFileSync(letterAvatarPath, img.toPNG());
        return letterAvatarPath;
      }
    } catch (_) {}

    try {
      const uiAvUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(letter)}&background=${color.replace('#','')}&color=fff&rounded=true&bold=true&format=png&size=128`;
      const resp = await axios.get(uiAvUrl, { responseType: 'arraybuffer', timeout: 3000 });
      if (resp.data && resp.data.length > 0) {
        fs.writeFileSync(letterAvatarPath, Buffer.from(resp.data));
        return letterAvatarPath;
      }
    } catch (_) {}
  } catch (e) {
    console.error('[NotificationAvatar] Error resolving avatar:', e.message);
  }
  return getNotificationIconPath();
}

function buildWindowsToastXml(title, body, imagePath, isAvatar = false) {
  const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  let imageXml = '';
  if (imagePath && fs.existsSync(imagePath)) {
    let normalized = path.resolve(imagePath).replace(/\\/g, '/');
    if (!normalized.startsWith('/')) normalized = '/' + normalized;
    const fileUri = 'file://' + encodeURI(normalized);
    const crop = isAvatar ? ' hint-crop="circle"' : '';
    imageXml = `<image placement="appLogoOverride"${crop} src="${esc(fileUri)}" />`;
  }
  return '<toast>' +
    '<visual><binding template="ToastGeneric">' +
    '<text>' + esc(title) + '</text>' +
    '<text>' + esc(body) + '</text>' +
    imageXml +
    '</binding></visual>' +
    '</toast>';
}

async function showPresenceNotification(title, body, profile) {
  if (!Notification.isSupported() || !title || !body) return;
  let imagePath = null;
  let isAvatar = false;
  if (profile) {
    try {
      imagePath = await resolveAvatarFile(profile);
      isAvatar = true;
    } catch (_) {}
  }
  if (!imagePath) {
    imagePath = getNotificationIconPath();
  }

  const notifOpts = {
    title,
    body,
    silent: false,
    icon: imagePath
  };
  if (process.platform === 'win32') {
    notifOpts.toastXml = buildWindowsToastXml(title, body, imagePath, isAvatar);
  }

  const notif = new Notification(notifOpts);
  activeNotifications.add(notif);
  const cleanup = () => activeNotifications.delete(notif);
  notif.on('close', cleanup);
  notif.on('failed', cleanup);
  const handler = () => {
    cleanup();
    focusMainWindow();
    setTimeout(() => {
      if (mainWindow) {
        mainWindow.webContents.send('navigate-to-chat', { fromPresence: true, friendName: title, targetTab: 'received' });
        mainWindow.webContents.send('navigate-to-inbox', { targetTab: 'received' });
      }
    }, 150);
  };
  notif.on('click', handler);
  notif.on('action', handler);
  notif.show();
}

// --- Multi-language translation helper for main process ---
const localesCache = {};
function getTranslation(key, fallback = '') {
  try {
    const userData = loadUserData();
    const lang = userData?.language || (app ? app.getLocale().split('-')[0] : 'es') || 'es';

    const resolveKey = (obj, pathStr) => {
      if (!obj) return null;
      if (typeof obj[pathStr] === 'string') return obj[pathStr];
      const parts = pathStr.split('.');
      let cur = obj;
      for (const p of parts) {
        if (cur && typeof cur === 'object' && p in cur) {
          cur = cur[p];
        } else {
          return null;
        }
      }
      return typeof cur === 'string' ? cur : null;
    };

    if (!localesCache[lang]) {
      const localePath = path.join(__dirname, 'ui', 'locales', `${lang}.json`);
      if (fs.existsSync(localePath)) {
        localesCache[lang] = fs.readJsonSync(localePath);
      }
    }
    const val = resolveKey(localesCache[lang], key);
    if (val) return val;

    for (const fb of ['es', 'en']) {
      if (!localesCache[fb]) {
        const fallbackPath = path.join(__dirname, 'ui', 'locales', `${fb}.json`);
        if (fs.existsSync(fallbackPath)) {
          localesCache[fallback] = fs.readJsonSync(fallbackPath);
        }
      }
      const fbVal = resolveKey(localesCache[fb], key);
      if (fbVal) return fbVal;
    }
  } catch (_) { }
  return fallback || key;
}

function shouldNotifyPresence(prev, next) {
  if (!next || next.state === 'offline') return null;
  const prevState = prev?.state || 'offline';

  if (next.state === 'server') {
    if (prevState !== 'server' || prev?.serverIp !== next.serverIp) {
      const serverLabel = next.serverIp ? next.serverIp : getTranslation('notif_a_server');
      return `${getTranslation('notif_is_playing_on')} ${serverLabel}`;
    }
    return null;
  }

  if (next.state === 'online' && prevState !== 'online') {
    return getTranslation('notif_is_now_online');
  }

  const playingStates = new Set(['menu', 'playing']);
  const wasPlaying = playingStates.has(prevState) || prevState === 'server';
  if (playingStates.has(next.state) && !wasPlaying) {
    return getTranslation('notif_started_playing_mc');
  }

  return null;
}

async function pollPresence(initPass = false) {
  if (!presenceManager.canUsePresence()) {
    resetPresenceCaches();
    return;
  }

  let auth;
  try {
    auth = await getSocialAuth();
  } catch (e) {
    if (e.message !== 'NO_SOCIAL_AUTH') console.error('[PresencePoll] Auth error:', e.message);
    resetPresenceCaches();
    return;
  }

  try {
    let friends = [];
    if (ApiClient && ApiClient.social && typeof ApiClient.social.getFriends === 'function') {
      const friendsRes = await ApiClient.social.getFriends();
      friends = friendsRes?.friends || [];
    }

    const seenUids = new Set();

    for (const friend of friends) {
      const friendUid = friend.uid;
      if (!friendUid) continue;
      seenUids.add(friendUid);

      friendProfileCache.set(friendUid, friend);

      const presence = friend.presence ? buildPresenceResponse(friend.presence) : await fetchPresenceForUser(friendUid, auth);
      const prev = lastPresenceStates.get(friendUid);
      lastPresenceStates.set(friendUid, presence);

      if (!presencePollingReady || initPass) continue;
      const message = shouldNotifyPresence(prev, presence);
      if (message) {
        const name = friend.username || 'Amigo';
        showPresenceNotification(name, message, friend);
      }
    }

    for (const uid of Array.from(lastPresenceStates.keys())) {
      if (!seenUids.has(uid)) {
        lastPresenceStates.delete(uid);
        friendProfileCache.delete(uid);
      }
    }

    presencePollingReady = true;
  } catch (e) {
    console.error('[PresencePoll] Error:', e.message || e);
  }
}

function startPresencePolling() {
  if (!presenceManager.canUsePresence()) return;
  if (presencePollingInterval) {
    clearInterval(presencePollingInterval);
    presencePollingInterval = null;
  }
  if (!presencePollingReady && !presencePollingInitializing) {
    presencePollingInitializing = true;
    pollPresence(true)
      .then(() => { presencePollingReady = true; })
      .finally(() => { presencePollingInitializing = false; });
  }
  presencePollingInterval = setInterval(pollPresence, 30000);
}

function stopPresencePolling() {
  if (presencePollingInterval) {
    clearInterval(presencePollingInterval);
    presencePollingInterval = null;
  }
  resetPresenceCaches();
}

// ==========================================
// INBOX NOTIFICATION POLLING (Incremental Change Detection)
// ==========================================
let msgPollingInterval = null;
const notifiedInboxMsgIds = new Map();
const userInboxCache = new Map(); // uid -> Array of message objects
let currentPolledUid = null;

function startMessagePolling() {
  if (msgPollingInterval) { clearInterval(msgPollingInterval); msgPollingInterval = null; }
  console.log('[InboxPoll] Starting message sync...');
  pollMessages()
    .then(() => {
      console.log('[InboxPoll] Initial sync completed');
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('force-social-badge-update');
        mainWindow.webContents.send('inbox-updated');
      }
    })
    .catch(err => {
      if (err.message !== 'NO_SOCIAL_AUTH') console.error('[InboxPoll] Initial sync error:', err.message);
    });
  // Check every 15s using incremental query (0 reads if no new messages)
  msgPollingInterval = setInterval(pollMessages, 15000);
  startPresencePolling();
}

function stopMessagePolling() {
  if (msgPollingInterval) { clearInterval(msgPollingInterval); msgPollingInterval = null; }
  currentPolledUid = null;
  invalidateSocialAuthCache();
}

function getAccountsForMessagePolling() {
  const accountsToPoll = [];
  const seenUids = new Set();

  // 1. Current active user
  try {
    const userData = loadUserData();
    if (userData && userData.username) {
      if (userData.account_type === 'helloworld' && userData.firebase_uid && userData.firebase_refresh_token) {
        accountsToPoll.push({
          uid: userData.firebase_uid,
          refreshToken: userData.firebase_refresh_token,
          accountId: userData.firebase_uid,
          username: userData.username,
          accountType: 'helloworld',
          isActive: true
        });
        seenUids.add(userData.firebase_uid);
      } else if (userData.account_type === 'microsoft' && userData.firebase_ms_uid && userData.firebase_ms_refresh_token) {
        accountsToPoll.push({
          uid: userData.firebase_ms_uid,
          refreshToken: userData.firebase_ms_refresh_token,
          accountId: userData.uuid || userData.firebase_ms_uid,
          username: userData.username,
          accountType: 'microsoft',
          isActive: true
        });
        seenUids.add(userData.firebase_ms_uid);
      }
    }
  } catch (_) {}

  // 2. Saved accounts from saved_accounts.json
  try {
    const saved = loadSavedAccounts();
    for (const acc of saved) {
      if (!acc) continue;
      if (acc.type === 'helloworld') {
        const uid = acc.firebase_uid || acc.id;
        const refreshToken = acc.firebase_refresh_token;
        if (uid && refreshToken && !seenUids.has(uid)) {
          accountsToPoll.push({
            uid,
            refreshToken,
            accountId: acc.id || uid,
            username: acc.username,
            accountType: 'helloworld',
            isActive: false
          });
          seenUids.add(uid);
        }
      } else if (acc.type === 'microsoft') {
        const uid = acc.firebase_ms_uid;
        const refreshToken = acc.firebase_ms_refresh_token;
        if (uid && refreshToken && !seenUids.has(uid)) {
          accountsToPoll.push({
            uid,
            refreshToken,
            accountId: acc.id || acc.uuid,
            username: acc.username,
            accountType: 'microsoft',
            isActive: false
          });
          seenUids.add(uid);
        }
      }
    }
  } catch (err) {
    console.warn('[InboxPoll] Error loading saved accounts:', err.message);
  }

  return accountsToPoll;
}

async function pollMessages() {
  try {
    const accounts = getAccountsForMessagePolling();
    if (accounts.length === 0) return;

    for (const accInfo of accounts) {
      try {
        const auth = await getAuthForSocialAccount(accInfo);
        if (!auth || !auth.uid || !auth.idToken) continue;

        if (accInfo.isActive && currentPolledUid !== auth.uid) {
          console.log(`[InboxPoll] Active user switched: old=${currentPolledUid}, new=${auth.uid}`);
          currentPolledUid = auth.uid;
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('force-social-badge-update');
            mainWindow.webContents.send('inbox-updated');
          }
        }

        if (!notifiedInboxMsgIds.has(auth.uid)) {
          notifiedInboxMsgIds.set(auth.uid, new Set());
        }
        const userNotified = notifiedInboxMsgIds.get(auth.uid);
        const localReadSet = localReadInboxMsgIds.get(auth.uid) || new Set();

        const hasCache = userInboxCache.has(auth.uid);
        let cachedMsgs = userInboxCache.get(auth.uid) || [];

        if (!hasCache) {
          // Initial load for this account: fetch once from Cloudflare ApiClient
          let msgs = [];
          try {
            if (ApiClient && ApiClient.inbox && typeof ApiClient.inbox.getInbox === 'function') {
              const res = await ApiClient.inbox.getInbox();
              if (res && res.success && Array.isArray(res.messages)) {
                msgs = res.messages;
              }
            }
          } catch (innerErr) {
            console.warn(`[InboxPoll] Error fetching inbox for ${auth.uid}:`, innerErr.message);
          }

          cachedMsgs = msgs.filter(m => m.senderId !== auth.uid && !m.isSentCopy);
          userInboxCache.set(auth.uid, cachedMsgs);

          const sentCopies = msgs.filter(m => m.isSentCopy === true || m.senderId === auth.uid);
          if (sentCopies.length > 0) {
            const currentSent = userSentInboxCache.get(auth.uid) || [];
            const sentMap = new Map(currentSent.map(m => [m.id, m]));
            for (const sc of sentCopies) {
              if (!sentMap.has(sc.id)) sentMap.set(sc.id, sc);
            }
            userSentInboxCache.set(auth.uid, Array.from(sentMap.values()));
            saveLocalSentInboxMsgs();
          }

          // Silently track read, old (>24h), or self messages
          const now = Date.now();
          cachedMsgs.forEach(m => {
            const isRead = m.read === true || localReadSet.has(m.id);
            const t = typeof m.timestamp === 'string' ? new Date(m.timestamp).getTime() : (Number(m.timestamp) || 0);
            const isOld = t === 0 || (now - t > 24 * 60 * 60 * 1000);
            if (isRead || isOld) {
              userNotified.add(m.id);
            }
          });

          // Find any recent unread candidate to notify on initial start
          const initialNew = cachedMsgs.filter(m => {
            if (userNotified.has(m.id)) return false;
            if (m.read === true || localReadSet.has(m.id)) return false;
            const t = typeof m.timestamp === 'string' ? new Date(m.timestamp).getTime() : (Number(m.timestamp) || 0);
            if (t === 0 || (now - t > 24 * 60 * 60 * 1000)) return false;
            return true;
          });

          initialNew.forEach(m => userNotified.add(m.id));
          if (initialNew.length > 0) {
            const toNotify = initialNew.slice(-5);
            toNotify.forEach((msg, idx) => {
              setTimeout(() => {
                showMsgNotification(msg, {
                  recipientUid: auth.uid,
                  recipientAccountId: auth.accountId,
                  recipientUsername: auth.username,
                  recipientType: auth.accountType,
                  idToken: auth.idToken
                });
              }, idx * 750);
            });
          }
          continue;
        }

        // Incremental check: fetch latest messages from Cloudflare ApiClient
        let newDocs = [];
        try {
          if (ApiClient && ApiClient.inbox && typeof ApiClient.inbox.getInbox === 'function') {
            const res = await ApiClient.inbox.getInbox();
            if (res && res.success && Array.isArray(res.messages)) {
              newDocs = res.messages;
            }
          }
        } catch (innerErr) {
          console.warn(`[InboxPoll] Error in incremental check for ${auth.uid}:`, innerErr.message);
        }

        const existingIds = new Set(cachedMsgs.map(m => m.id));
        const trulyNew = newDocs.filter(m => !existingIds.has(m.id) && m.senderId !== auth.uid && !m.isSentCopy);

        if (trulyNew.length > 0) {
          console.log(`[InboxPoll] ${trulyNew.length} new incoming message(s) detected for ${auth.uid} (${auth.username})`);
          cachedMsgs = [...trulyNew, ...cachedMsgs];
          userInboxCache.set(auth.uid, cachedMsgs);

          cachedMsgs.sort((a, b) => {
            const ta = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : (Number(a.timestamp) || 0);
            const tb = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : (Number(b.timestamp) || 0);
            return tb - ta;
          });

          const toNotify = trulyNew.filter(m => !userNotified.has(m.id));
          toNotify.forEach(m => userNotified.add(m.id));

          // If this is the active user, refresh renderer UI
          const currentData = loadUserData();
          const currentActiveUid = currentData.account_type === 'microsoft' ? currentData.firebase_ms_uid : currentData.firebase_uid;
          if (currentActiveUid === auth.uid && mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('inbox-updated');
            mainWindow.webContents.send('force-social-badge-update');
          }

          toNotify.slice(-5).forEach((msg, idx) => {
            setTimeout(() => {
              showMsgNotification(msg, {
                recipientUid: auth.uid,
                recipientAccountId: auth.accountId,
                recipientUsername: auth.username,
                recipientType: auth.accountType,
                idToken: auth.idToken
              });
            }, idx * 750);
          });
        }
      } catch (accErr) {
        console.warn(`[InboxPoll] Account poll error for ${accInfo.username}:`, accErr.message);
      }
    }
  } catch (e) {
    console.error('[InboxPoll] Error:', e.message);
  }
}

function formatNotificationBody(rawContent) {
  if (!rawContent) return '(media)';
  const str = String(rawContent).trim();
  if (str.startsWith('$$SERVER_SHARE$$')) {
    try {
      const payload = JSON.parse(str.substring('$$SERVER_SHARE$$'.length));
      if (payload && payload.ip) {
        return `${getTranslation('social.server_invite', 'Server invite')}: ${payload.ip}`;
      }
    } catch (_) {}
    return getTranslation('social.server_invite', 'Sent a server invite');
  }
  if (str.startsWith('$$PROFILE_SHARE$$')) {
    try {
      const payload = JSON.parse(str.substring('$$PROFILE_SHARE$$'.length));
      if (payload && payload.profile && payload.profile.name) {
        return `${getTranslation('social.installation', 'Installation')}: ${payload.profile.name}`;
      }
    } catch (_) {}
    return getTranslation('social.installation', 'Shared an installation');
  }
  if (str.startsWith('$$LINK$$')) {
    try {
      const payload = JSON.parse(str.substring('$$LINK$$'.length));
      if (payload && (payload.title || payload.url)) {
        return `${getTranslation('social.link', 'Link')}: ${payload.title || payload.url}`;
      }
    } catch (_) {}
    return getTranslation('social.link', 'Shared a link');
  }
  if (str.startsWith('{')) {
    try {
      const payload = JSON.parse(str);
      if (payload && payload.type === 'seed' && payload.seed) {
        return `${getTranslation('social.seed', 'Seed')}: ${payload.seed}`;
      }
    } catch (_) {}
  }
  return str;
}

function getActiveAccountUid(userData) {
  if (!userData) return null;
  if (userData.account_type === 'microsoft') return userData.firebase_ms_uid || null;
  if (userData.account_type === 'helloworld') return userData.firebase_uid || null;
  return null;
}

function handleNotificationNavigation(recipientInfo) {
  showAndFocusWindow();

  const hasRecipientInfo = Boolean(
    recipientInfo && (
      recipientInfo.recipientUid ||
      recipientInfo.recipientAccountId ||
      recipientInfo.accountId ||
      recipientInfo.recipientUsername ||
      recipientInfo.recipientType
    )
  );

  setTimeout(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (!hasRecipientInfo) return;

    const latestData = loadUserData();
    const latestActiveUid = getActiveAccountUid(latestData);

    let isTargetActive = false;
    if (recipientInfo?.recipientUid && latestActiveUid) {
      isTargetActive = latestActiveUid === recipientInfo.recipientUid;
    } else if (recipientInfo?.recipientType) {
      const isSameType = latestData.account_type === recipientInfo.recipientType;
      const isSameUser = Boolean(latestData.username && (recipientInfo?.recipientUsername || recipientInfo?.username) && latestData.username.toLowerCase() === (recipientInfo.recipientUsername || recipientInfo.username).toLowerCase());
      isTargetActive = isSameType && isSameUser;
    }

    console.log(`[MsgNotif] Navigation: active=${latestData.username}(${latestData.account_type}, uid=${latestActiveUid}) target=${recipientInfo?.recipientUsername || recipientInfo?.username}(${recipientInfo?.recipientType}, uid=${recipientInfo?.recipientUid}) isTargetActive=${isTargetActive}`);

    const targetAccountId = recipientInfo?.recipientAccountId || recipientInfo?.accountId || recipientInfo?.recipientUid;

    if (!isTargetActive && targetAccountId) {
      mainWindow.webContents.send('switch-to-account-and-open-inbox', {
        accountId: targetAccountId,
        recipientUid: recipientInfo.recipientUid,
        recipientUsername: recipientInfo.recipientUsername || recipientInfo.username,
        username: recipientInfo.recipientUsername || recipientInfo.username,
        recipientType: recipientInfo.recipientType,
        targetTab: 'received'
      });
    } else {
      mainWindow.webContents.send('navigate-to-chat', { fromInbox: true, targetTab: 'received' });
      mainWindow.webContents.send('navigate-to-inbox', {
        accountId: targetAccountId,
        recipientUid: recipientInfo?.recipientUid,
        recipientUsername: recipientInfo?.recipientUsername || recipientInfo?.username,
        username: recipientInfo?.recipientUsername || recipientInfo?.username,
        recipientType: recipientInfo?.recipientType,
        targetTab: 'received'
      });
    }
  }, 150);
}

ipcMain.handle('notification-click-navigate', async (e, recipientInfo) => {
  handleNotificationNavigation(recipientInfo);
  return { success: true };
});

async function showMsgNotification(msg, recipientInfo = null) {
  const currentData = loadUserData();
  const currentActiveUid = getActiveAccountUid(currentData);
  const isDifferentAccount = recipientInfo?.recipientUid && recipientInfo.recipientUid !== currentActiveUid;

  let title = msg.senderName || getTranslation('notif_new_message') || 'New Message';
  if (isDifferentAccount && recipientInfo?.recipientUsername) {
    title = `${title} (${recipientInfo.recipientUsername})`;
  }

  const rawBody = msg.content || '';
  const formattedBody = formatNotificationBody(rawBody);
  console.log(`[MsgNotif] title="${title}" body="${formattedBody}" for recipient=${recipientInfo?.recipientUsername || 'current'} (uid=${recipientInfo?.recipientUid || 'none'}, type=${recipientInfo?.recipientType || 'unknown'})`);
  if (!formattedBody && !title) return;

  // 1. Send in-app notification to launcher UI
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('show-in-app-notification', {
      title: title,
      message: formattedBody,
      duration: 6000,
      accountId: recipientInfo?.recipientAccountId || recipientInfo?.accountId || recipientInfo?.recipientUid,
      recipientAccountId: recipientInfo?.recipientAccountId || recipientInfo?.accountId || recipientInfo?.recipientUid,
      recipientUid: recipientInfo?.recipientUid,
      recipientUsername: recipientInfo?.recipientUsername,
      recipientType: recipientInfo?.recipientType,
      username: recipientInfo?.recipientUsername || recipientInfo?.username
    });
  }

  // 2. Desktop Notification
  if (!Notification.isSupported()) {
    console.warn('[MsgNotif] Desktop Notification is not supported on this platform');
    return;
  }

  let imagePath = null;
  let isAvatar = false;
  try {
    let profile = friendProfileCache.get(msg.senderId);
    if (!profile && msg.senderId) {
      try {
        if (ApiClient && ApiClient.users && typeof ApiClient.users.getProfile === 'function') {
          const res = await ApiClient.users.getProfile(msg.senderId);
          if (res && res.success && res.user) {
            profile = res.user;
            friendProfileCache.set(msg.senderId, { ...profile, uid: msg.senderId });
          }
        }
      } catch (_) {}
    }
    if (!profile && msg.senderName) {
      profile = { username: msg.senderName, accountType: 'helloworld' };
    }
    if (profile) {
      imagePath = await resolveAvatarFile(profile);
      isAvatar = true;
    }
  } catch (_) {}

  if (!imagePath) {
    imagePath = getNotificationIconPath();
    isAvatar = false;
  }

  const doNavigate = () => {
    handleNotificationNavigation(recipientInfo);
  };

  try {
    let iconObj = undefined;
    if (imagePath && fs.existsSync(imagePath)) {
      try {
        const ni = nativeImage.createFromPath(imagePath);
        if (!ni.isEmpty()) iconObj = ni;
      } catch (_) {}
    }
    if (!iconObj) {
      const fallbackIcon = getNotificationIconPath();
      if (fallbackIcon && fs.existsSync(fallbackIcon)) {
        try {
          const ni = nativeImage.createFromPath(fallbackIcon);
          if (!ni.isEmpty()) iconObj = ni;
        } catch (_) {}
      }
    }

    const notifOpts = {
      title,
      body: formattedBody || '(media)',
      silent: false,
      icon: iconObj || imagePath
    };
    if (process.platform === 'win32') {
      try {
        notifOpts.toastXml = buildWindowsToastXml(title, formattedBody || '(media)', imagePath, isAvatar);
      } catch (_) {}
    }

    const notif = new Notification(notifOpts);
    activeNotifications.add(notif);
    const cleanupNotif = () => activeNotifications.delete(notif);
    notif.on('close', cleanupNotif);
    notif.on('click', () => {
      cleanupNotif();
      doNavigate();
    });
    notif.on('action', () => {
      cleanupNotif();
      doNavigate();
    });
    notif.on('failed', (evt, err) => {
      cleanupNotif();
      console.warn('[MsgNotif] Native toast notification failed, trying basic fallback:', err);
      try {
        const basic = new Notification({
          title,
          body: formattedBody || '(media)',
          silent: false,
          icon: getNotificationIconPath()
        });
        activeNotifications.add(basic);
        const cleanupBasic = () => activeNotifications.delete(basic);
        basic.on('close', cleanupBasic);
        basic.on('click', () => { cleanupBasic(); doNavigate(); });
        basic.on('action', () => { cleanupBasic(); doNavigate(); });
        basic.show();
      } catch (_) {}
    });
    notif.show();
  } catch (err) {
    console.warn('[MsgNotif] Native toast notification failed, trying basic notification:', err.message);
    try {
      const basicNotif = new Notification({
        title,
        body: formattedBody || '(media)',
        silent: false,
        icon: getNotificationIconPath()
      });
      basicNotif.on('click', doNavigate);
      basicNotif.show();
    } catch (_) {}
  }
}

// --- Local HTTP server for Firebase Auth compatibility (file:// blocks signInWithPopup) ---
let localPort = null;
function startLocalServer() {
  return new Promise((resolve) => {
    const fs = require('fs');
    const mime = {
      '.html': 'text/html', '.js': 'application/javascript',
      '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
      '.ico': 'image/x-icon', '.svg': 'image/svg+xml',
      '.ttf': 'font/ttf', '.woff': 'font/woff', '.woff2': 'font/woff2',
      '.mp4': 'video/mp4', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json'
    };
    const srv = http.createServer((req, res) => {
      const rawUrl = req.url.split('?')[0].split('#')[0];
      const cleanUrl = rawUrl.replace(/^\/ui\//, '/');
      const distDir = path.join(__dirname, 'ui', 'dist');
      const hasDist = fs.existsSync(path.join(distDir, 'index.html'));
      const baseDir = hasDist ? distDir : path.join(__dirname, 'ui');
      let filePath;
      if (cleanUrl === '/tips.txt') {
        const rootTips = path.join(__dirname, 'tips.txt');
        filePath = fs.existsSync(rootTips) ? rootTips : path.join(baseDir, 'tips.txt');
      } else {
        filePath = path.join(baseDir, cleanUrl === '/' ? '/index.html' : cleanUrl);
        // Fallback for images and assets in ui/ when serving dist
        if (hasDist && !fs.existsSync(filePath)) {
          const fallbackPath = path.join(__dirname, 'ui', cleanUrl);
          if (fs.existsSync(fallbackPath)) {
            filePath = fallbackPath;
          }
        }
      }
      const ext = path.extname(filePath);
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });
    const PREFERRED_PORT = 51290;
    srv.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        srv.listen(0, '127.0.0.1', () => {
          localPort = srv.address().port;
          console.log('[LocalServer] Running on fallback port', localPort);
          resolve(localPort);
        });
      }
    });
    srv.listen(PREFERRED_PORT, '127.0.0.1', () => {
      localPort = srv.address().port;
      console.log('[LocalServer] Running on port', localPort);
      resolve(localPort);
    });
  });
}

// --- System Tray & Background Execution ---
let tray = null;
let isQuitting = false;
let hasShownTrayBalloon = false;

function showAndFocusWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  if (!mainWindow.isVisible()) mainWindow.show();
  mainWindow.setAlwaysOnTop(true);
  mainWindow.show();
  mainWindow.focus();
  mainWindow.setAlwaysOnTop(false);
  try {
    mainWindow.flashFrame(true);
  } catch (_) {}
  try { updateTrayMenu(); } catch (_) {}
}

function getTrayIcon() {
  if (process.platform === 'win32') {
    const icoPath = path.join(__dirname, 'build', 'icon.ico');
    if (fs.existsSync(icoPath)) return icoPath;
  }
  const pngPath = path.join(__dirname, 'build', 'icon.png');
  if (fs.existsSync(pngPath)) return pngPath;
  return getNotificationIconPath();
}

function formatProfileTrayLabel(profile) {
  const name = (profile.name || 'Minecraft').trim();
  let ver = (profile.version || '').trim();

  // Convert "Fabric 1.21.11 (0.28.0)" to "Fabric 1.21.11 - 0.28.0"
  ver = ver.replace(/\s*\(([^)]+)\)/, (m, g) => ' - ' + g);

  if (ver && name.toLowerCase() !== ver.toLowerCase()) {
    return `${name} (${ver})`;
  }
  return name || ver || 'Minecraft';
}

function getLastPlayedProfiles(limit = 5) {
  try {
    const data = profileManager.loadProfiles();
    const profilesObj = (data && data.profiles) ? data.profiles : {};
    const list = Object.entries(profilesObj).map(([id, p]) => ({
      id,
      ...p,
      lastPlayedTime: p.last_played ? new Date(p.last_played).getTime() : 0
    }));

    // Sort by lastPlayedTime descending (most recent first)
    list.sort((a, b) => b.lastPlayedTime - a.lastPlayedTime);

    return list.slice(0, limit);
  } catch (err) {
    console.error('[Tray] Error loading last played profiles:', err);
    return [];
  }
}

function isAccountActive(acc, current) {
  if (!current || !acc) return false;
  if (current.account_type !== acc.type) return false;
  if (acc.type === 'microsoft') {
    if (acc.firebase_ms_uid && current.firebase_ms_uid) {
      return acc.firebase_ms_uid === current.firebase_ms_uid;
    }
  } else if (acc.type === 'helloworld') {
    if (acc.firebase_uid && current.firebase_uid) {
      return acc.firebase_uid === current.firebase_uid;
    }
  }
  if (acc.uuid && current.uuid) {
    return acc.uuid.replace(/-/g, '').toLowerCase() === current.uuid.replace(/-/g, '').toLowerCase();
  }
  return Boolean(acc.username && current.username && acc.username.toLowerCase() === current.username.toLowerCase());
}

function updateTrayMenu() {
  if (!tray || tray.isDestroyed()) return;

  const isLocked = Boolean(_isMandatoryUpdateActive || (_isMaintenanceActive && !_adminBypassGranted));

  // Bloqueo de seguridad:
  // Si hay una actualización obligatoria o mantenimiento activo, restringir el menú del tray
  // para evitar saltarse el bloqueo.
  // En funcionamiento normal (incluso con la app oculta en segundo plano), el menú completo permanece activo.
  if (isLocked) {
    const restrictedItems = [
      {
        label: getTranslation('tray.open', 'Abrir HelloWorld Launcher'),
        click: () => showAndFocusWindow()
      }
    ];

    if (_isMandatoryUpdateActive) {
      restrictedItems.push({
        label: `⚠️ ${getTranslation('updater.mandatory_title', 'Actualización obligatoria requerida')}`,
        enabled: false
      });
    } else if (_isMaintenanceActive && !_adminBypassGranted) {
      restrictedItems.push({
        label: `🛠️ ${getTranslation('maintenance.title', 'Servidores en Mantenimiento')}`,
        enabled: false
      });
    }

    restrictedItems.push(
      { type: 'separator' },
      {
        label: getTranslation('tray.discord', 'Discord de la comunidad'),
        click: () => {
          shell.openExternal('https://dsc.gg/helloworld-launcher');
        }
      },
      { type: 'separator' },
      {
        label: getTranslation('tray.quit', 'Salir de HelloWorld Launcher'),
        click: () => {
          isQuitting = true;
          if (tray && !tray.isDestroyed()) {
            try { tray.destroy(); } catch (_) {}
          }
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.destroy();
          }
          app.quit();
          setTimeout(() => {
            try {
              if (app && !app.isDestroyed?.()) app.exit(0);
            } catch (_) {}
            process.exit(0);
          }, 400);
        }
      }
    );

    try {
      tray.setContextMenu(Menu.buildFromTemplate(restrictedItems));
    } catch (_) {}
    try {
      requestUpdateJumpList();
    } catch (_) {}
    return;
  }

  let userLabel = getTranslation('tray.not_connected', 'No conectado');
  let tooltipText = 'HelloWorld Launcher';
  let uData = null;
  try {
    uData = loadUserData();
    if (uData && uData.username) {
      const typeLabel = uData.account_type === 'microsoft' ? 'Microsoft' : (uData.account_type === 'helloworld' ? 'HelloWorld' : 'Offline');
      userLabel = `${uData.username} (${typeLabel})`;
      tooltipText = `HelloWorld Launcher - ${uData.username} (${typeLabel})`;
    }
  } catch (_) {}

  try {
    tray.setToolTip(tooltipText);
  } catch (_) {}

  const savedAccounts = loadSavedAccounts();
  const accountSubmenu = [];

  if (savedAccounts.length > 0) {
    for (const acc of savedAccounts) {
      const typeLabel = acc.type === 'microsoft' ? 'Microsoft' : (acc.type === 'helloworld' ? 'HelloWorld' : 'Offline');
      const active = isAccountActive(acc, uData);
      accountSubmenu.push({
        label: `${acc.username} (${typeLabel})`,
        type: 'radio',
        checked: Boolean(active),
        click: () => {
          if (active) return;
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('tray-switch-account', {
              accountId: acc.id || acc.uuid || acc.username,
              targetType: acc.type,
              username: acc.username
            });
          }
        }
      });
    }
  } else {
    accountSubmenu.push({
      label: getTranslation('tray.no_saved_accounts', 'Sin cuentas guardadas'),
      enabled: false
    });
  }

  accountSubmenu.push({ type: 'separator' });
  accountSubmenu.push({
    label: getTranslation('tray.manage_accounts', 'Gestionar cuentas...'),
    click: () => {
      showAndFocusWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('open-account-switcher');
      }
    }
  });

  const recentProfiles = getLastPlayedProfiles(5);
  const profileMenuItems = [];

  if (recentProfiles.length > 0) {
    for (const p of recentProfiles) {
      const label = formatProfileTrayLabel(p);
      profileMenuItems.push({
        label,
        click: () => {
          showAndFocusWindow();
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('quick-launch-profile', { profileId: p.id });
          }
        }
      });
    }
  } else {
    profileMenuItems.push({
      label: getTranslation('tray.no_recent_profiles', 'Sin perfiles jugados'),
      enabled: false
    });
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: getTranslation('tray.open', 'Abrir HelloWorld Launcher'),
      click: () => showAndFocusWindow()
    },
    { type: 'separator' },
    {
      label: `${getTranslation('tray.connected_as', 'Conectado como')}: ${userLabel}`,
      enabled: false
    },
    {
      label: getTranslation('tray.switch_account', 'Cambiar de cuenta'),
      submenu: accountSubmenu
    },
    {
      label: getTranslation('tray.social', 'Amigos y Social'),
      click: () => {
        showAndFocusWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('navigate-to-chat', { targetTab: 'received' });
        }
      }
    },
    { type: 'separator' },
    ...profileMenuItems,
    { type: 'separator' },
    {
      label: getTranslation('tray.discord', 'Discord de la comunidad'),
      click: () => {
        shell.openExternal('https://dsc.gg/helloworld-launcher');
      }
    },
    { type: 'separator' },
    {
      label: getTranslation('tray.quit', 'Salir de HelloWorld Launcher'),
      click: () => {
        isQuitting = true;
        if (tray && !tray.isDestroyed()) {
          try { tray.destroy(); } catch (_) {}
        }
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.destroy();
        }
        app.quit();
        setTimeout(() => {
          try {
            if (app && !app.isDestroyed?.()) app.exit(0);
          } catch (_) {}
          process.exit(0);
        }, 400);
      }
    }
  ]);

  try {
    tray.setContextMenu(contextMenu);
  } catch (_) {}
  try {
    requestUpdateJumpList();
  } catch (_) {}
}

let updateJumpListTimeout = null;
function requestUpdateJumpList() {
  if (process.platform !== 'win32') return;
  if (updateJumpListTimeout) clearTimeout(updateJumpListTimeout);
  updateJumpListTimeout = setTimeout(() => {
    updateJumpList().catch(err => {
      console.warn('[JumpList] Error updating JumpList:', err);
    });
  }, 200);
}

async function updateJumpList() {
  if (process.platform !== 'win32') return;

  try {
    const isLocked = Boolean(_isMandatoryUpdateActive || (_isMaintenanceActive && !_adminBypassGranted));
    const recentProfiles = isLocked ? [] : getLastPlayedProfiles(5);
    const fallbackIcon = getTrayIcon();

    const recentProfileTasks = [];
    for (const p of recentProfiles) {
      let iconPath = fallbackIcon;
      try {
        const ico = await getProfileIcoPath(p.id, p.icon);
        if (ico && fs.existsSync(ico)) {
          iconPath = ico;
        }
      } catch (_) {}

      const label = formatProfileTrayLabel(p);
      recentProfileTasks.push({
        type: 'task',
        title: label,
        description: `Lanzar ${p.name || label}`,
        program: process.execPath,
        args: getAppLaunchArgs(`--launch-profile="${p.id}"`),
        arguments: getAppLaunchArgs(`--launch-profile="${p.id}"`),
        iconPath,
        iconIndex: 0
      });
    }

    const standardTasks = [];

    if (isLocked) {
      standardTasks.push({
        type: 'task',
        title: getTranslation('tray.open', 'Abrir HelloWorld Launcher'),
        description: getTranslation('tray.open', 'Abrir HelloWorld Launcher'),
        program: process.execPath,
        args: getAppLaunchArgs('--open-launcher'),
        arguments: getAppLaunchArgs('--open-launcher'),
        iconPath: fallbackIcon,
        iconIndex: 0
      });
      standardTasks.push({
        type: 'task',
        title: getTranslation('tray.discord', 'Discord de la comunidad'),
        description: getTranslation('tray.discord', 'Discord de la comunidad'),
        program: process.execPath,
        args: getAppLaunchArgs('--open-discord'),
        arguments: getAppLaunchArgs('--open-discord'),
        iconPath: fallbackIcon,
        iconIndex: 0
      });
      standardTasks.push({
        type: 'task',
        title: getTranslation('tray.quit', 'Salir de HelloWorld Launcher'),
        description: getTranslation('tray.quit', 'Salir de HelloWorld Launcher'),
        program: process.execPath,
        args: getAppLaunchArgs('--quit-launcher'),
        arguments: getAppLaunchArgs('--quit-launcher'),
        iconPath: fallbackIcon,
        iconIndex: 0
      });
    } else {
      standardTasks.push({
        type: 'task',
        title: getTranslation('tray.open', 'Abrir HelloWorld Launcher'),
        description: getTranslation('tray.open', 'Abrir HelloWorld Launcher'),
        program: process.execPath,
        args: getAppLaunchArgs('--open-launcher'),
        arguments: getAppLaunchArgs('--open-launcher'),
        iconPath: fallbackIcon,
        iconIndex: 0
      });
      standardTasks.push({
        type: 'task',
        title: getTranslation('tray.social', 'Amigos y Social'),
        description: getTranslation('tray.social', 'Amigos y Social'),
        program: process.execPath,
        args: getAppLaunchArgs('--open-social'),
        arguments: getAppLaunchArgs('--open-social'),
        iconPath: fallbackIcon,
        iconIndex: 0
      });
      standardTasks.push({
        type: 'task',
        title: getTranslation('tray.discord', 'Discord de la comunidad'),
        description: getTranslation('tray.discord', 'Discord de la comunidad'),
        program: process.execPath,
        args: getAppLaunchArgs('--open-discord'),
        arguments: getAppLaunchArgs('--open-discord'),
        iconPath: fallbackIcon,
        iconIndex: 0
      });
      standardTasks.push({
        type: 'task',
        title: getTranslation('tray.quit', 'Salir de HelloWorld Launcher'),
        description: getTranslation('tray.quit', 'Salir de HelloWorld Launcher'),
        program: process.execPath,
        args: getAppLaunchArgs('--quit-launcher'),
        arguments: getAppLaunchArgs('--quit-launcher'),
        iconPath: fallbackIcon,
        iconIndex: 0
      });
    }

    const categories = [];
    if (recentProfileTasks.length > 0) {
      categories.push({
        type: 'custom',
        name: getTranslation('tray.recent_profiles', 'Instalaciones recientes'),
        items: recentProfileTasks
      });
    }
    categories.push({
      type: 'tasks',
      items: standardTasks
    });

    let jumpRes = 'error';
    try {
      jumpRes = app.setJumpList(categories);
    } catch (_) {
      jumpRes = 'error';
    }

    if (jumpRes !== 'ok') {
      try {
        app.setUserTasks([...recentProfileTasks, ...standardTasks]);
      } catch (err) {
        console.warn('[JumpList] Failed fallback to setUserTasks:', err.message);
      }
    }
  } catch (err) {
    console.warn('[JumpList] Error updating Windows JumpList:', err.message);
  }
}

function createTray() {
  if (tray && !tray.isDestroyed()) return;

  const iconPath = getTrayIcon();
  let trayImage;
  try {
    trayImage = nativeImage.createFromPath(iconPath);
    if (trayImage.isEmpty()) {
      trayImage = nativeImage.createFromPath(path.join(__dirname, 'ui', 'icon.png'));
    }
  } catch (_) {
    trayImage = iconPath;
  }

  try {
    tray = new Tray(trayImage);
    tray.setToolTip('HelloWorld Launcher');

    updateTrayMenu();

    tray.on('click', () => {
      showAndFocusWindow();
    });

    tray.on('double-click', () => {
      showAndFocusWindow();
    });

    tray.on('right-click', () => {
      updateTrayMenu();
    });
  } catch (err) {
    console.error('[Tray] Failed to initialize tray:', err);
  }
}

// --- Windows ---
const createWindow = async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "HelloWorld Launcher",
    icon: path.join(__dirname, 'ui', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true, // Enable webSecurity for production safety
      allowRunningInsecureContent: false,
      backgroundThrottling: false
    },
    backgroundColor: '#0f2027',
    show: false,
    frame: true,
    minWidth: 1000,
    minHeight: 650
  })

  win.maximize();

  if (process.platform === 'darwin') {
    const macMenuTemplate = [
      {
        label: app.name,
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' }
        ]
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'zoom' },
          { role: 'close' }
        ]
      }
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(macMenuTemplate));
  } else {
    Menu.setApplicationMenu(null);
  }

  // Force repaint when window gains focus or is restored from background
  win.on('focus', () => {
    try { win.webContents.invalidate(); } catch (_) {}
  });

  // Synchronize tray menu on window lifecycle changes
  win.on('show', () => {
    try { updateTrayMenu(); } catch (_) {}
  });
  win.on('hide', () => {
    try { updateTrayMenu(); } catch (_) {}
  });
  win.on('minimize', () => {
    try { updateTrayMenu(); } catch (_) {}
  });
  win.on('restore', () => {
    try { updateTrayMenu(); } catch (_) {}
  });

  // Intercept window close (X button or Alt+F4) and hide to system tray instead of exiting
  win.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win.hide();
      if (!hasShownTrayBalloon && process.platform === 'win32' && tray && !tray.isDestroyed()) {
        hasShownTrayBalloon = true;
        try {
          tray.displayBalloon({
            title: 'HelloWorld Launcher',
            content: 'El launcher sigue ejecutándose en segundo plano para recibir notificaciones.',
            icon: getTrayIcon()
          });
        } catch (_) {}
      }
      try { updateTrayMenu(); } catch (_) {}
      return false;
    }
  });

  // Start directly with index.html for instant launch
  const isViteDev = process.env.VITE_DEV === 'true' || process.argv.includes('--vite-dev');
  if (isViteDev) {
    win.loadURL('http://127.0.0.1:5173');
  } else {
    if (!localPort) await startLocalServer();
    win.loadURL(`http://127.0.0.1:${localPort}/index.html`);
  }

  let hasShown = false;
  const showWindow = () => {
    if (hasShown) return;
    hasShown = true;
    try { win.maximize(); } catch (_) {}
    win.show();

    // Check if dev mode is enabled
    const userData = loadUserData();
    if (userData.dev_mode) {
      win.webContents.openDevTools();
    }
  };

  win.once('ready-to-show', showWindow);
  // Resilient fallback: ensure window shows even if ready-to-show takes too long
  setTimeout(showWindow, 3500);

  win.webContents.on('did-finish-load', () => {
    win.webContents.send('sys-ready');
    pollMinecraftProcesses().then(() => {
      if (isMinecraftRunning() && win && !win.isDestroyed()) {
        win.webContents.send('info-message', 'Game Ready');
        win.webContents.send('game-status', { running: true, count: getRunningMinecraftCount() });
      }
    }).catch(() => {});
    if (pendingAutoLaunchProfileId) {
      const pid = pendingAutoLaunchProfileId;
      pendingAutoLaunchProfileId = null;
      setTimeout(() => {
        if (win && !win.isDestroyed()) {
          win.webContents.send('auto-launch-profile', pid);
        }
      }, 1000);
    }
    if (pendingOpenSocial) {
      pendingOpenSocial = false;
      setTimeout(() => {
        if (win && !win.isDestroyed()) {
          win.webContents.send('navigate-to-chat', { targetTab: 'received' });
        }
      }, 1000);
    }
    try {
      requestUpdateJumpList();
    } catch (_) {}
    // Start background checks
    checkLatestVersionsAndInstall();
    // Start background update check after 3 seconds without blocking UI
    setTimeout(() => {
      if (app.isPackaged && autoUpdater) {
        autoUpdater.checkForUpdatesAndNotify();
      }
    }, 3000);
    // Start message polling (no-op if not logged in with social account)
    setTimeout(startMessagePolling, 2000);
  });

  win.webContents.on('will-navigate', (event, url) => {
    // Allow local server navigation (127.0.0.1), open everything else in external browser
    const parsedUrl = new URL(url);
    const isLocal = parsedUrl.hostname === '127.0.0.1' || parsedUrl.hostname === 'localhost';
    if (!isLocal && (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  win.webContents.on('did-fail-load', () => {
    win.webContents.send('sys-error');
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    // Allow Firebase Auth popup (signInWithPopup needs window.open)
    if (url.includes('firebaseapp.com') ||
      url.includes('firebase.com') ||
      url.includes('login.microsoftonline.com') ||
      url.includes('login.live.com') ||
      url.includes('account.live.com') ||
      url.includes('account.microsoft.com') ||
      url.includes('accounts.google.com')) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          autoHideMenuBar: true
        }
      };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow = win;

  // Start Minecraft process & window detection monitor
  startMinecraftProcessMonitor();

  if (presenceManager.canUsePresence()) {
    presenceManager.safeRun(presenceManager.setLauncherOnline());
    startPresencePolling();
  }
}

// --- Background Version Installer ---
let isCheckingBackgroundUpdate = false;

async function checkLatestVersionsAndInstall() {
  if (isCheckingBackgroundUpdate) {
    console.log('[Background Update] Already checking, skipping duplicate call.');
    return;
  }
  isCheckingBackgroundUpdate = true;
  console.log('[Background Update] Checking for latest Minecraft versions...');
  try {
    const manifestUrl = 'https://piston-meta.mojang.com/mc/game/version_manifest.json';
    const response = await axios.get(manifestUrl, { timeout: 5000 });
    const data = response.data;

    const latestRelease = data.latest?.release;
    const latestSnapshot = data.latest?.snapshot;

    if (!latestRelease || !latestSnapshot) {
      console.warn('[Background Update] Could not determine latest release or snapshot.');
      return;
    }

    global.latestReleaseVersion = latestRelease;
    global.latestSnapshotVersion = latestSnapshot;

    const userData = loadUserData();
    let userDataChanged = false;

    const notifyVersionChange = (version, profileName) => {
      const notifTitle = getTranslation('notifications.new_version_title') || getTranslation('notif_new_mc_version') || 'New Minecraft Version';
      const notifDescTemplate = getTranslation('notifications.new_version_desc') || 'Version {version} ({profileName}) is now available to play.';
      const notifBody = notifDescTemplate.replace('{version}', version).replace('{profileName}', profileName);
      const notifIcon = getNotificationIconPath();
      const notifOpts = {
        title: notifTitle,
        body: notifBody,
        icon: notifIcon
      };
      if (process.platform === 'win32') {
        notifOpts.toastXml = buildWindowsToastXml(notifTitle, notifBody, notifIcon, false);
      }
      try { new Notification(notifOpts).show(); } catch (_) {}
      
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('show-in-app-notification', {
          titleKey: 'notifications.new_version_title',
          messageKey: 'notifications.new_version_desc',
          variables: { version, profileName },
          title: notifTitle,
          message: notifBody,
          duration: 10000
        });
      }
    };

    // Notify for release only if version changed from last notified
    if (userData.last_notified_release !== latestRelease) {
      if (userData.last_notified_release) {
        notifyVersionChange(latestRelease, 'Latest release');
      }
      userData.last_notified_release = latestRelease;
      userDataChanged = true;
    }

    // Notify for snapshot only if version changed from last notified
    if (latestSnapshot !== latestRelease && userData.last_notified_snapshot !== latestSnapshot) {
      if (userData.last_notified_snapshot) {
        notifyVersionChange(latestSnapshot, 'Latest snapshot');
      }
      userData.last_notified_snapshot = latestSnapshot;
      userDataChanged = true;
    }

    if (userDataChanged) {
      saveUserData(userData);
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('reload-profiles');
    }
  } catch (error) {
    console.error('[Background Update] Check failed:', error.message);
  } finally {
    isCheckingBackgroundUpdate = false;
  }
}

// --- IPC Handlers ---

// 1. User & Auth
ipcMain.handle('get-user-json', async () => loadUserData())

ipcMain.handle('save-user-json', async (e, data) => {
  const current = loadUserData();
  // Strip undefined values from data so they don't overwrite existing values with undefined
  const cleanedData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
  const newData = { ...current, ...cleanedData };
  // Auto-fix: if username ended up as an object (due to a previous bug), extract a string
  if (newData.username && typeof newData.username === 'object') {
    newData.username = newData.username.name || newData.username.username || newData.username.displayName || 'Player';
    console.warn('[save-user-json] username was an object, sanitized to:', newData.username);
  }
  saveUserData(newData);
  if (newData.start_on_boot !== undefined) {
    applyAutoStartSetting(newData.start_on_boot);
  }
  try {
    presenceManager.refreshCurrentPresence();
  } catch (_) {}
  // Persist offline account into saved accounts list when a username is set
  if (newData.username && newData.account_type === 'offline') {
    try { addOrUpdateSavedAccount(newData); } catch (_) {}
  }
  return newData;
})


ipcMain.handle('login-microsoft', async () => {
  console.log("IPC: login-microsoft (msmc v5 refactor)");
  try {
    const authManager = new msmc.Auth("select_account");

    // Listen to MSMC events
    authManager.on('load', (asset, message) => {
      console.log(`[MSMC Load] ${asset}: ${message}`);
      if (mainWindow) mainWindow.webContents.send('login-update', message);
    });

    console.log("Launching authManager...");
    const result = await authManager.launch("electron");
    console.log("Auth launch returned. Result type:", typeof result);
    console.log("Result keys:", Object.keys(result));
    if (result.getMinecraft) console.log("getMinecraft method exists");
    else console.log("getMinecraft method MISSING");

    // Race getMinecraft with a timeout
    const getProfilePromise = result.getMinecraft();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("getMinecraft timed out after 30s")), 30000)
    );

    console.log("Fetching Minecraft profile...");
    const mcObj = await Promise.race([getProfilePromise, timeoutPromise]);
    console.log("Minecraft Object fetched keys:", Object.keys(mcObj));

    // Safety check
    if (!mcObj || !mcObj.profile) {
      throw new Error("Invalid Minecraft Profile Data");
    }

    const profileData = mcObj.profile;
    console.log("Inner profile name:", profileData.name);

    const userData = loadUserData()
    const previousUuid = userData.uuid || userData.last_ms_uuid;
    
    // Restore existing social verification tokens if this MS account was verified previously
    const savedAccs = loadSavedAccounts();
    const existingMs = savedAccs.find(a => a.uuid === profileData.id || a.last_ms_uuid === profileData.id);
    if (existingMs && existingMs.firebase_ms_uid && existingMs.firebase_ms_refresh_token) {
        userData.firebase_ms_uid = existingMs.firebase_ms_uid;
        userData.firebase_ms_refresh_token = existingMs.firebase_ms_refresh_token;
    } else if (previousUuid && previousUuid !== profileData.id) {
        userData.firebase_ms_uid = "";
        userData.firebase_ms_refresh_token = "";
    }

    // Recover existing Microsoft account UID from Cloudflare D1 Backend if missing (e.g. after fresh install/disk format)
    if (!userData.firebase_ms_uid && ApiClient && ApiClient.users && typeof ApiClient.users.checkMicrosoftVerified === 'function') {
      try {
        const msStatus = await ApiClient.users.checkMicrosoftVerified(profileData.name, profileData.id);
        if (msStatus && msStatus.verified && msStatus.firebase_uid) {
          userData.firebase_ms_uid = msStatus.firebase_uid;
          console.log(`[login-microsoft] Recovered existing Microsoft account UID from backend: ${msStatus.firebase_uid}`);
        }
      } catch (checkErr) {
        console.warn(`[login-microsoft] Could not check backend MS status:`, checkErr.message);
      }
    }

    userData.account_type = "microsoft"
    userData.username = profileData.name
    userData.uuid = profileData.id
    userData.mc_token = mcObj.mcToken // mcToken is on the wrapper
    userData.msmc_auth = result.save() // Save token string ONLY
    userData.firebase_uid = ""
    userData.firebase_refresh_token = ""
    userData.firebase_id_token = ""
    userData.last_avatar_url = ""
    if (existingMs && existingMs.avatarUrl && !existingMs.avatarUrl.includes('textures.minecraft.net') && !existingMs.avatarUrl.includes('ui-avatars.com') && !existingMs.avatarUrl.startsWith('data:image')) {
      userData.last_avatar_url = existingMs.avatarUrl;
    }
    if (userData.firebase_ms_uid && !userData.last_avatar_url) {
      try {
        if (ApiClient && ApiClient.users && typeof ApiClient.users.getProfile === 'function') {
          const msProf = await ApiClient.users.getProfile(userData.firebase_ms_uid);
          if (msProf && msProf.user) {
            const av = msProf.user.avatarUrl || msProf.user.avatar_url || msProf.user.avatarBase64;
            if (av && !av.includes('textures.minecraft.net') && !av.includes('ui-avatars.com') && !av.startsWith('data:image')) {
              userData.last_avatar_url = av;
            }
          }
        }
      } catch (_) {}
    }
    if (profileData.skins && profileData.skins.length > 0 && profileData.skins[0].url) {
      userData.last_skin_url = profileData.skins[0].url;
      userData.last_skin_variant = profileData.skins[0].variant || 'classic';
    }

    saveUserData(userData)

    // Persist this account into saved accounts list
    try {
      // Attempt to get email from the msmc token for display purposes
      let msEmail = '';
      try { msEmail = decodeMsJwtEmail(mcObj.mcToken) || ''; } catch (_) {}
      addOrUpdateSavedAccount({ ...userData, _msEmail: msEmail });
    } catch (saErr) { console.warn('[SavedAccounts] Could not persist MS account:', saErr.message); }

    // Social auth will be set up after silentMicrosoftVerify runs in the renderer

    // Prepare safe payload for IPC
    const safeProfile = {
      name: profileData.name,
      id: profileData.id,
      skin: profileData.skins || []
    };

    if (mainWindow) {
      console.log("Sending login-success to UI");
      mainWindow.webContents.send('login-success', safeProfile);
      mainWindow.webContents.send('force-social-badge-update');
      mainWindow.webContents.send('inbox-updated');
    }
    currentPolledUid = null;
    invalidateSocialAuthCache();
    startMessagePolling();
    presenceManager.safeRun(presenceManager.setLauncherOnline());
    startPresencePolling();

    // Return plain object to renderer invoke as well
    return { success: true, profile: safeProfile }
  } catch (err) {
    console.error("Login Exception Detail:", err);
    if (mainWindow) {
      const msg = err.message || "Unknown Error";
      mainWindow.webContents.send('login-error', msg);
    }
    return { success: false, error: err.message }
  }
})

ipcMain.handle('login-helloworld', async (e, identifier, password) => {
  console.log(`[HelloWorld Login] Attempting login for: ${identifier}`);
  try {
    let email = identifier;

    // 1. Resolve Email if username was provided
    if (!identifier.includes('@')) {
      console.log(`[HelloWorld Login] Resolving username: ${identifier}`);
      try {
        const apiRes = await ApiClient.users.resolveEmail(identifier);
        if (apiRes && apiRes.success && apiRes.email) {
          email = apiRes.email;
          console.log(`[HelloWorld Login] Resolved to email via Backend API: ${email}`);
        }
      } catch (backendErr) {
        console.warn(`[HelloWorld Login] Backend email resolve warning:`, backendErr.message);
      }

      if (!email || email === identifier) {
        return { success: false, error: "Could not resolve username to email. Please log in using your email address." };
      }
    }

    // 2. Authenticate with Firebase Auth REST API
    const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;
    const authRes = await axios.post(authUrl, {
      email: email,
      password: password,
      returnSecureToken: true
    });

    const { localId, idToken, displayName } = authRes.data;
    console.log(`[HelloWorld Login] Auth successful for UID: ${localId}`);

    // 3. Fetch full User Profile (Cloudflare D1 Backend)
    let username = identifier.includes('@') ? (displayName || email.split('@')[0]) : identifier;
    let avatarUrl = "";
    let uuid = localId.replace(/-/g, ''); // Minecraft-compatible UUID usually (Firebase UID is different, but we use it as base)

    try {
      if (ApiClient && ApiClient.users && typeof ApiClient.users.getProfile === 'function') {
        const d1Profile = await ApiClient.users.getProfile(localId);
        if (d1Profile && d1Profile.user) {
          const u = d1Profile.user;
          if (u.username) username = u.username;
          if (u.mc_uuid || u.uuid) uuid = u.mc_uuid || u.uuid;
          if (u.avatar_url || u.avatarUrl || u.avatarBase64) {
            avatarUrl = u.avatar_url || u.avatarUrl || u.avatarBase64;
          }
        }
      }
    } catch (d1Err) {
      console.warn('[HelloWorld Login] D1 profile fetch warning:', d1Err.message);
    }

    uuid = ensureHelloWorldUuid(username, uuid);

    // 4. Persistence
    const userData = loadUserData();
    userData.account_type = "helloworld";
    userData.username = username;
    userData.uuid = uuid;
    userData.last_avatar_url = avatarUrl;
    userData.firebase_uid = localId;
    userData.firebase_refresh_token = authRes.data.refreshToken;
    userData.firebase_id_token = idToken;
    userData.firebase_ms_uid = "";
    userData.firebase_ms_refresh_token = "";
    userData.mc_token = "";
    userData.msmc_auth = "";

    // Clear out old skin/cape data
    userData.last_skin_url = "";
    userData.last_skin_variant = "classic";
    userData.last_cape_url = "";

    saveUserData(userData);

    // Persist this account into saved accounts list
    try {
      addOrUpdateSavedAccount({ ...userData, _loginEmail: identifier });
    } catch (saErr) { console.warn('[SavedAccounts] Could not persist HW account:', saErr.message); }

    // 5. Sync client version to Cloudflare D1
    try {
      if (ApiClient && ApiClient.users && typeof ApiClient.users.syncVersion === 'function') {
        ApiClient.users.syncVersion(app.getVersion()).catch(() => {});
      }
    } catch (_) {}

    const safeProfile = {
      name: username,
      id: uuid,
      avatar_url: avatarUrl,
      skin: [],
      cape: []
    };

    if (mainWindow) {
      mainWindow.webContents.send('login-success', safeProfile);
      mainWindow.webContents.send('force-social-badge-update');
      mainWindow.webContents.send('inbox-updated');
    }

    currentPolledUid = null;
    invalidateSocialAuthCache();
    startMessagePolling();
    presenceManager.safeRun(presenceManager.setLauncherOnline());
    startPresencePolling();

    return { success: true, profile: safeProfile };
  } catch (err) {
    const rawError = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error("[HelloWorld Login] Error:", rawError);
    let errorMessage = "Authentication failed.";

    if (err.response && err.response.data && err.response.data.error) {
      const fbErr = err.response.data.error;
      const code = typeof fbErr === 'string' ? fbErr : (fbErr.message || '');
      if (code === "INVALID_PASSWORD" || code === "INVALID_LOGIN_CREDENTIALS") errorMessage = "Incorrect password.";
      else if (code === "EMAIL_NOT_FOUND") errorMessage = "User not found.";
      else if (code === "USER_DISABLED") errorMessage = "This account has been disabled.";
      else if (code.includes("TOO_MANY_ATTEMPTS_TRY_LATER")) errorMessage = "Too many failed attempts. Please try again later.";
      else if (err.response.status === 403 || code.includes("PERMISSION_DENIED")) errorMessage = "Authentication error. Please check your credentials.";
      else errorMessage = code.replace(/_/g, ' ');
    } else if (err.message) {
      errorMessage = err.message;
    }

    return { success: false, error: errorMessage };
  }
})

ipcMain.handle('logout', async () => {
  _adminBypassGranted = false;
  stopMessagePolling();
  stopPresencePolling();
  presenceManager.safeRun(presenceManager.setOffline());
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('force-social-badge-update');
    mainWindow.webContents.send('inbox-updated');
  }
  const data = loadUserData()

  // NOTE: We do NOT remove the account from saved_accounts.json here.
  // The account remains in the list so the user can switch back to it later.
  // Clear only the active session from user.json.
  if (data.account_type === "microsoft" && data.uuid) {
    data.last_ms_uuid = data.uuid;
  }
  data.username = "";
  data.account_type = "offline";
  data.uuid = "";
  data.mc_token = "";
  data.msmc_auth = "";
  data.last_skin_url = "";
  data.last_skin_variant = "classic";
  data.last_cape_url = "";
  data.last_avatar_url = "";
  data.firebase_uid = "";
  data.firebase_refresh_token = "";
  data.firebase_id_token = "";
  data.firebase_ms_uid = "";
  data.firebase_ms_refresh_token = "";

  saveUserData(data)
  presenceManager.currentState = null;
  presenceManager.gameContext = null;
  presenceManager.stopHeartbeat();
  return data
})

// ─── Account Switcher IPC Handlers ───────────────────────────────────────────

ipcMain.handle('get-saved-accounts', async () => {
  try {
    const current = loadUserData();
    const accounts = loadSavedAccounts();
    // Ensure active account has the most up-to-date avatar
    if (current && current.username) {
      for (const acc of accounts) {
        if (acc.type === 'helloworld' && (acc.id === current.firebase_uid || acc.username === current.username)) {
          if (!acc.avatarUrl && current.last_avatar_url) {
            acc.avatarUrl = current.last_avatar_url;
          }
        }
      }
    }
    // Return safe views (no tokens) sorted by lastUsed desc
    const sorted = [...accounts].sort((a, b) => (b.lastUsed || '').localeCompare(a.lastUsed || ''));
    return { success: true, accounts: sorted.map(safeAccountView) };
  } catch (e) {
    console.error('[SavedAccounts] get-saved-accounts error:', e);
    return { success: false, accounts: [] };
  }
})

ipcMain.handle('remove-saved-account', async (e, accountId) => {
  try {
    let accounts = loadSavedAccounts();
    const wasActive = (() => {
      const current = loadUserData();
      // Find the account by id and check if it matches the active session
      const acc = accounts.find(a => a.id === accountId);
      if (!acc) return false;
      if (current.account_type === 'helloworld') return acc.firebase_uid === current.firebase_uid;
      if (current.account_type === 'microsoft') return acc.uuid === current.uuid;
      if (current.account_type === 'offline') return acc.username === current.username && acc.type === 'offline';
      return false;
    })();

    accounts = accounts.filter(a => a.id !== accountId);
    saveSavedAccounts(accounts);

    // If this was the active account, also clear the active session
    if (wasActive) {
      stopMessagePolling();
      stopPresencePolling();
      presenceManager.safeRun(presenceManager.setOffline());
      const data = loadUserData();
      if (data.account_type === 'microsoft' && data.uuid) data.last_ms_uuid = data.uuid;
      data.username = ''; data.account_type = 'offline'; data.uuid = '';
      data.mc_token = ''; data.msmc_auth = '';
      data.last_skin_url = ''; data.last_skin_variant = 'classic'; data.last_cape_url = '';
      data.last_avatar_url = '';
      data.firebase_uid = ''; data.firebase_refresh_token = '';
      data.firebase_id_token = '';
      data.firebase_ms_uid = ''; data.firebase_ms_refresh_token = '';
      saveUserData(data);
      presenceManager.currentState = null;
      presenceManager.gameContext = null;
      presenceManager.stopHeartbeat();
      return { success: true, sessionCleared: true, newData: data };
    }
    return { success: true, sessionCleared: false };
  } catch (e) {
    console.error('[SavedAccounts] remove-saved-account error:', e);
    return { success: false, error: e.message };
  }
})

ipcMain.handle('remove-all-accounts', async () => {
  try {
    saveSavedAccounts([]);
    stopMessagePolling();
    stopPresencePolling();
    presenceManager.safeRun(presenceManager.setOffline());
    const data = loadUserData();
    if (data.account_type === 'microsoft' && data.uuid) data.last_ms_uuid = data.uuid;
    data.username = ''; data.account_type = 'offline'; data.uuid = '';
    data.mc_token = ''; data.msmc_auth = '';
    data.last_skin_url = ''; data.last_skin_variant = 'classic'; data.last_cape_url = '';
    data.last_avatar_url = '';
    data.firebase_uid = ''; data.firebase_refresh_token = '';
    data.firebase_id_token = '';
    data.firebase_ms_uid = ''; data.firebase_ms_refresh_token = '';
    saveUserData(data);
    presenceManager.currentState = null;
    presenceManager.gameContext = null;
    presenceManager.stopHeartbeat();
    return { success: true, newData: data };
  } catch (e) {
    console.error('[SavedAccounts] remove-all-accounts error:', e);
    return { success: false, error: e.message };
  }
})

ipcMain.handle('switch-account', async (e, accountId, targetType = null) => {
  _adminBypassGranted = false;
  try {
    const accounts = loadSavedAccounts();
    let acc = null;

    // 1. If targetType is specified, prioritize matching that type to prevent username collision
    if (targetType) {
      acc = accounts.find(a => a.type === targetType && (
        a.id === accountId ||
        (a.firebase_uid && a.firebase_uid === accountId) ||
        (a.firebase_ms_uid && a.firebase_ms_uid === accountId) ||
        (a.uuid && a.uuid === accountId) ||
        a.username === accountId
      ));
      if (!acc) {
        const typeMatches = accounts.filter(a => a.type === targetType);
        if (typeMatches.length === 1) {
          acc = typeMatches[0];
        }
      }
    }

    // 2. Exact match by account ID
    if (!acc) {
      acc = accounts.find(a => a.id === accountId);
    }

    // 3. Exact match by Firebase UID (HW or MS)
    if (!acc) {
      acc = accounts.find(a => (a.firebase_uid && a.firebase_uid === accountId) || (a.firebase_ms_uid && a.firebase_ms_uid === accountId));
    }

    // 4. Exact match by Minecraft UUID
    if (!acc) {
      acc = accounts.find(a => a.uuid && a.uuid === accountId);
    }

    // 5. Fallback match by username
    if (!acc) {
      acc = accounts.find(a => a.username === accountId);
    }

    if (!acc) return { success: false, error: 'Account not found' };

    _roleCache.clear();

    stopMessagePolling();
    stopPresencePolling();
    presenceManager.safeRun(presenceManager.setOffline());
    presenceManager.currentState = null;
    presenceManager.gameContext = null;
    presenceManager.stopHeartbeat();

    const currentData = loadUserData();

    if (acc.type === 'offline') {
      // ─ Offline: just set username and uuid
      currentData.account_type = 'offline';
      currentData.username = acc.username;
      currentData.uuid = acc.uuid || buildDeterministicUuid(`offline:${acc.username}`);
      currentData.mc_token = '';
      currentData.msmc_auth = '';
      currentData.firebase_uid = '';
      currentData.firebase_refresh_token = '';
      currentData.firebase_id_token = '';
      currentData.firebase_ms_uid = '';
      currentData.firebase_ms_refresh_token = '';
      currentData.last_skin_url = '';
      currentData.last_skin_variant = 'classic';
      currentData.last_cape_url = '';
      currentData.last_avatar_url = '';
      saveUserData(currentData);

      // Update lastUsed
      const idx = accounts.findIndex(a => a.id === acc.id);
      if (idx >= 0) {
        accounts[idx].avatarUrl = '';
        accounts[idx].lastUsed = new Date().toISOString();
        saveSavedAccounts(accounts);
      }

      return { success: true, newData: currentData };
    }

    if (acc.type === 'helloworld') {
      // ─ HelloWorld: try to refresh Firebase token
      if (!acc.firebase_refresh_token) {
        return { success: false, needsRelogin: true, type: 'helloworld', username: acc.username, email: acc.email };
      }
      try {
        const refreshed = await refreshFirebaseToken(acc.firebase_refresh_token);

        // Load full profile from Cloudflare API
        let username = acc.username;
        let uuid = acc.uuid;
        let avatarUrl = acc.avatarUrl || '';
        try {
          if (ApiClient && ApiClient.users && typeof ApiClient.users.getProfile === 'function') {
            const profileRes = await ApiClient.users.getProfile(refreshed.uid);
            if (profileRes && profileRes.user) {
              if (profileRes.user.username) username = profileRes.user.username;
              if (profileRes.user.uuid || profileRes.user.mc_uuid) uuid = profileRes.user.uuid || profileRes.user.mc_uuid;
              if (profileRes.user.avatarUrl || profileRes.user.avatar_url || profileRes.user.avatarBase64) {
                avatarUrl = profileRes.user.avatarUrl || profileRes.user.avatar_url || profileRes.user.avatarBase64;
              }
            }
          }
        } catch (_) {}

        currentData.account_type = 'helloworld';
        currentData.username = username;
        currentData.uuid = ensureHelloWorldUuid(username, uuid);
        currentData.firebase_uid = refreshed.uid;
        currentData.firebase_refresh_token = refreshed.refreshToken;
        currentData.firebase_id_token = refreshed.idToken;
        currentData.last_avatar_url = avatarUrl;
        currentData.mc_token = acc.mc_token || '';
        currentData.msmc_auth = '';
        currentData.firebase_ms_uid = '';
        currentData.firebase_ms_refresh_token = '';
        currentData.last_skin_url = '';
        currentData.last_skin_variant = 'classic';
        currentData.last_cape_url = '';
        saveUserData(currentData);

        // Update saved account with refreshed token
        const idx = accounts.findIndex(a => a.id === acc.id);
        if (idx >= 0) {
          accounts[idx].firebase_refresh_token = refreshed.refreshToken;
          accounts[idx].firebase_id_token = refreshed.idToken;
          accounts[idx].avatarUrl = avatarUrl;
          accounts[idx].lastUsed = new Date().toISOString();
          saveSavedAccounts(accounts);
        }

        currentPolledUid = null;
        invalidateSocialAuthCache();
        startMessagePolling();
        presenceManager.safeRun(presenceManager.setLauncherOnline());
        startPresencePolling();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('force-social-badge-update');
          mainWindow.webContents.send('inbox-updated');
        }

        return { success: true, newData: currentData };
      } catch (err) {
        if (err.message === 'INVALID_REFRESH_TOKEN') {
          // Token expired — need re-login
          return { success: false, needsRelogin: true, type: 'helloworld', username: acc.username, email: acc.email };
        }
        throw err;
      }
    }

    if (acc.type === 'microsoft') {
      // ─ Microsoft: try to refresh session via the saved msmc refresh_token
      // In msmc v5: result.save() returns the MS refresh_token string.
      // To restore: create a new Auth, call auth.refresh(refreshTokenString).
      if (!acc.msmc_auth) {
        return { success: false, needsRelogin: true, type: 'microsoft' };
      }
      try {
        const authManager = new msmc.Auth("select_account");

        // acc.msmc_auth is the refresh_token string saved by result.save()
        const xboxSession = await authManager.refresh(acc.msmc_auth);
        if (!xboxSession) throw new Error('Could not refresh MSMC session');

        const getProfilePromise = xboxSession.getMinecraft();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('getMinecraft timed out after 30s')), 30000)
        );
        const mcObj = await Promise.race([getProfilePromise, timeoutPromise]);

        if (!mcObj || !mcObj.profile) throw new Error('Invalid Minecraft Profile Data');

        const profileData = mcObj.profile;
        const previousUuid = currentData.uuid || currentData.last_ms_uuid;
        if (previousUuid && previousUuid !== profileData.id) {
          currentData.firebase_ms_uid = '';
          currentData.firebase_ms_refresh_token = '';
        }

        currentData.account_type = 'microsoft';
        currentData.username = profileData.name;
        currentData.uuid = profileData.id;
        currentData.mc_token = mcObj.mcToken;
        currentData.msmc_auth = xboxSession.save(); // updated refresh token
        currentData.firebase_uid = '';
        currentData.firebase_refresh_token = '';
        currentData.firebase_id_token = '';
        // Preserve MS social verification tokens from saved account
        currentData.firebase_ms_uid = acc.firebase_ms_uid || currentData.firebase_ms_uid || '';
        currentData.firebase_ms_refresh_token = acc.firebase_ms_refresh_token || currentData.firebase_ms_refresh_token || '';

        // Check for verified custom avatar on MS account
        let msAvatar = (acc.avatarUrl && typeof acc.avatarUrl === 'string' && !acc.avatarUrl.includes('textures.minecraft.net') && !acc.avatarUrl.includes('ui-avatars.com') && !acc.avatarUrl.startsWith('data:image')) ? acc.avatarUrl : '';
        if (!msAvatar && currentData.firebase_ms_uid) {
          try {
            if (ApiClient && ApiClient.users && typeof ApiClient.users.getProfile === 'function') {
              const msProf = await ApiClient.users.getProfile(currentData.firebase_ms_uid);
              if (msProf && msProf.user) {
                const av = msProf.user.avatarUrl || msProf.user.avatar_url || msProf.user.avatarBase64;
                if (av && !av.includes('textures.minecraft.net') && !av.includes('ui-avatars.com') && !av.startsWith('data:image')) {
                  msAvatar = av;
                }
              }
            }
          } catch (_) {}
        }
        currentData.last_avatar_url = msAvatar;

        if (profileData.skins && profileData.skins.length > 0 && profileData.skins[0].url) {
          currentData.last_skin_url = profileData.skins[0].url;
          currentData.last_skin_variant = profileData.skins[0].variant || 'classic';
        } else {
          currentData.last_skin_url = acc.last_skin_url || '';
          currentData.last_skin_variant = acc.last_skin_variant || 'classic';
        }
        currentData.last_cape_url = '';
        saveUserData(currentData);

        // Update saved account with new refresh token
        const idx = accounts.findIndex(a => a.id === acc.id);
        if (idx >= 0) {
          accounts[idx].msmc_auth = xboxSession.save();
          accounts[idx].mc_token = mcObj.mcToken;
          accounts[idx].uuid = profileData.id;
          accounts[idx].username = profileData.name;
          if (currentData.last_skin_url) {
            accounts[idx].last_skin_url = currentData.last_skin_url;
          }
          accounts[idx].avatarUrl = msAvatar;
          accounts[idx].lastUsed = new Date().toISOString();
          saveSavedAccounts(accounts);
        }

        const safeProfile = { name: profileData.name, id: profileData.id, skin: profileData.skins || [] };
        if (mainWindow) {
          mainWindow.webContents.send('login-success', safeProfile);
          mainWindow.webContents.send('force-social-badge-update');
          mainWindow.webContents.send('inbox-updated');
        }

        currentPolledUid = null;
        invalidateSocialAuthCache();
        startMessagePolling();
        presenceManager.safeRun(presenceManager.setLauncherOnline());
        startPresencePolling();

        return { success: true, newData: currentData };
      } catch (err) {
        console.warn('[SwitchAccount] MS session refresh failed:', err.message);
        // Token expired or invalid — need fresh login via MS popup
        return { success: false, needsRelogin: true, type: 'microsoft' };
      }
    }

    return { success: false, error: 'Unknown account type' };
  } catch (e) {
    console.error('[SavedAccounts] switch-account error:', e);
    return { success: false, error: e.message };
  }
})
// ─────────────────────────────────────────────────────────────────────────────

// 2. Profiles
ipcMain.handle('get-profiles', async () => profileManager.loadProfiles())
ipcMain.handle('get-profiles-for-addon', async (e, type) => {
  const data = profileManager.loadProfiles();
  const profiles = data.profiles || {};
  const filtered = {};
  const mcDir = paths.getMcDir();

  for (const [id, profile] of Object.entries(profiles)) {
    const version = (profile.version || '').toLowerCase();

    if (type === 'resourcepack' || type === 'datapack' || type === 'modpack') {
      filtered[id] = profile;
      continue;
    }

    if (type === 'shader') {
      // Validate strictly if shader support mods are installed
      const profileDir = profile.directory || mcDir;
      const modsDir = path.join(profileDir, 'mods');
      const support = await modManager.validateShaderSupport(modsDir, profile.addons);

      if (support.supported) {
        filtered[id] = profile;
      }
      continue;
    }

    if (version.includes('forge') || version.includes('fabric') || version.includes('neoforge') || version.includes('optifine')) {
      filtered[id] = profile;
    }
  }
  return { profiles: filtered };
})

ipcMain.handle('add-profile', async (e, name, version, icon, directory, jvm_args, java_path) => {
  // Map frontend positional args to profileManager.addProfile
  const info = versionUtils.parseVersionString(version);
  const normVer = info ? info.normalizedId : version;
  return await profileManager.addProfile(name, normVer, icon, directory, jvm_args, java_path);
})

ipcMain.handle('edit-profile', async (e, profile_id, name, version, loader, icon, ram_min, ram_max, jvm_args, width, height, java_path, enable_custom_skins, addons) => {
  let id = profile_id;
  let data = {};

  if (typeof profile_id === 'object' && profile_id !== null) {
    id = profile_id.id || profile_id.profile_id;
    data = { ...profile_id };
    delete data.id;
    delete data.profile_id;
    if (data.version || data.loader) {
      const ver = data.version || data.loader;
      const info = versionUtils.parseVersionString(ver);
      data.version = info ? info.normalizedId : ver;
    }
  } else {
    let ver = version || loader;
    if (ver) {
      const info = versionUtils.parseVersionString(ver);
      data.version = info ? info.normalizedId : ver;
    }
    if (name !== undefined && name !== null) data.name = name;
    if (icon !== undefined && icon !== null) data.icon = icon;
    if (jvm_args !== undefined && jvm_args !== null) data.jvm_args = jvm_args;
    if (java_path !== undefined && java_path !== null) data.java_path = java_path;
    if (ram_min !== undefined && ram_min !== null) data.ram_min = ram_min;
    if (ram_max !== undefined && ram_max !== null) data.ram_max = ram_max;
    if (width !== undefined && width !== null) data.width = width;
    if (height !== undefined && height !== null) data.height = height;
    if (enable_custom_skins !== undefined && enable_custom_skins !== null && typeof enable_custom_skins === 'boolean') {
      data.enable_custom_skins = enable_custom_skins;
    }
    if (Array.isArray(enable_custom_skins)) {
      data.addons = enable_custom_skins;
    }
    if (addons !== undefined && addons !== null) {
      data.addons = addons;
    }
  }
  const result = await profileManager.editProfile(id, data);
  try { updateTrayMenu(); } catch (_) {}
  return result;
})

ipcMain.handle('delete-profile', async (e, id) => {
  const result = await profileManager.deleteProfile(id);
  try { updateTrayMenu(); } catch (_) {}
  return result;
})
ipcMain.handle('get-profile-icon', async (e, f) => profileManager.getProfileIconAsBase64(f))

// --- Profile Windows Shortcuts & ICO generation ---
function pngsToIco(pngBuffers) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(count, 4);

  const dirEntries = [];
  let offset = 6 + (count * 16);

  for (const buf of pngBuffers) {
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    const bWidth = width >= 256 ? 0 : width;
    const bHeight = height >= 256 ? 0 : height;

    const entry = Buffer.alloc(16);
    entry.writeUInt8(bWidth, 0);
    entry.writeUInt8(bHeight, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buf.length, 8);
    entry.writeUInt32LE(offset, 12);

    dirEntries.push(entry);
    offset += buf.length;
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers]);
}

async function getProfileIcoPath(profileId, iconFilename) {
  const fallbackIco = path.join(__dirname, 'build', 'icon.ico');
  if (process.platform !== 'win32') return fallbackIco;

  try {
    const shortcutIconsDir = path.join(app.getPath('userData'), 'profile-shortcuts-icons');
    fs.ensureDirSync(shortcutIconsDir);
    const targetIcoPath = path.join(shortcutIconsDir, `${profileId}.ico`);

    let nImg = null;
    if (typeof iconFilename === 'string' && iconFilename.trim()) {
      if (iconFilename.startsWith('data:image/')) {
        nImg = nativeImage.createFromDataURL(iconFilename);
      } else {
        const candidates = [
          path.join(paths.getProfilesImgDir(), iconFilename),
          path.join(__dirname, 'ui', 'img', 'profiles', iconFilename),
          path.join(__dirname, 'ui', 'img', iconFilename)
        ];
        for (const cand of candidates) {
          if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
            nImg = nativeImage.createFromPath(cand);
            if (nImg && !nImg.isEmpty()) break;
          }
        }
      }
    }

    if (nImg && !nImg.isEmpty()) {
      const sizes = [256, 48, 32, 16];
      const pngBuffers = sizes.map(sz => nImg.resize({ width: sz, height: sz, quality: 'best' }).toPNG());
      const icoBuf = pngsToIco(pngBuffers);
      fs.writeFileSync(targetIcoPath, icoBuf);
      return targetIcoPath;
    }
  } catch (err) {
    console.warn('[Shortcut] Error generating profile ICO, falling back to launcher icon:', err.message);
  }

  return fs.existsSync(fallbackIco) ? fallbackIco : process.execPath;
}

ipcMain.handle('create-profile-shortcut', async (e, arg1, arg2, arg3) => {
  if (process.platform !== 'win32') {
    return { success: false, error: 'Shortcuts are currently only supported on Windows' };
  }
  try {
    let profileId, profileName, icon;
    if (typeof arg1 === 'object' && arg1 !== null) {
      profileId = arg1.profileId;
      profileName = arg1.profileName;
      icon = arg1.icon;
    } else {
      profileId = arg1;
      profileName = arg2;
      icon = arg3;
    }

    if (!profileId) throw new Error('Missing profile ID');

    // Clean profile name for Windows filename (prohibit < > : " / \ | ? * and control chars)
    const cleanName = (profileName || 'Minecraft')
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
      .trim() || 'Minecraft';
    const shortcutFileName = `${cleanName} (HelloWorld Launcher).lnk`;

    const desktopDir = app.getPath('desktop');
    const startMenuDir = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs');
    fs.ensureDirSync(desktopDir);
    fs.ensureDirSync(startMenuDir);

    const desktopPath = path.join(desktopDir, shortcutFileName);
    const startMenuPath = path.join(startMenuDir, shortcutFileName);

    const icoPath = await getProfileIcoPath(profileId, icon);
    const args = app.isPackaged
      ? `--launch-profile="${profileId}"`
      : `"${app.getAppPath()}" --launch-profile="${profileId}"`;

    const shortcutOptions = {
      target: process.execPath,
      args,
      cwd: path.dirname(process.execPath),
      appUserModelId: `com.abelosky.helloworldlauncher.profile.${profileId}`,
      description: `${profileName} - HelloWorld Launcher`,
      icon: icoPath,
      iconIndex: 0
    };

    const created = [];
    const opDesktop = fs.existsSync(desktopPath) ? 'replace' : 'create';
    const resDesktop = shell.writeShortcutLink(desktopPath, opDesktop, shortcutOptions);
    if (resDesktop) created.push('desktop');

    const opStartMenu = fs.existsSync(startMenuPath) ? 'replace' : 'create';
    const resStartMenu = shell.writeShortcutLink(startMenuPath, opStartMenu, shortcutOptions);
    if (resStartMenu) created.push('startMenu');

    console.log(`[WindowsShortcut] Created shortcut for profile ${profileId} (${profileName}) at:`, created, 'icon:', icoPath);
    return { success: true, created };
  } catch (err) {
    console.error('[WindowsShortcut] Failed to create profile shortcut:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-pending-launch-profile', () => {
  const pid = pendingAutoLaunchProfileId;
  pendingAutoLaunchProfileId = null;
  return pid;
});
ipcMain.handle('get-worlds', async (e, profile_id) => {
  const mcDir = paths.getMcDir();
  return profileManager.getWorlds(profile_id, mcDir);
})
ipcMain.handle('read-world-seed', async (e, profile_id, world_name) => {
  const mcDir = paths.getMcDir();
  return await profileManager.readWorldSeed(profile_id, world_name, mcDir);
})
ipcMain.handle('get-documents-path', async () => {
  return app.getPath('documents');
})

// 3. Modrinth / Addons
ipcMain.handle('search-modrinth', async (e, { query, options }) => modManager.searchModrinth(query, options))
ipcMain.handle('get-mod-categories', async (e) => modManager.getModCategories())
ipcMain.handle('get-mod-versions', async (e, { project_id, game_version, loader }) => modManager.getModVersions(project_id, game_version, loader))
ipcMain.handle('get-mod-details', async (e, id) => modManager.getModDetails(id))
ipcMain.handle('get-multiple-mod-details', async (e, ids) => modManager.getMultipleModDetails(ids))
ipcMain.handle('resolve-mod-dependencies', async (e, { version_id, game_version, loader, profile_id, installed_project_ids, world_name, content_type }) => {
  const installedProjectIds = new Set(Array.isArray(installed_project_ids) && content_type !== 'datapack' ? installed_project_ids : []);
  const installedFilenames = new Set();
  const installedDatapackProjectIds = new Set(Array.isArray(installed_project_ids) && content_type === 'datapack' ? installed_project_ids : []);
  const installedDatapackFilenames = new Set();

  if (profile_id) {
    try {
      const profilesData = profileManager.loadProfiles();
      const profile = profilesData?.profiles?.[profile_id];
      if (profile) {
        if (Array.isArray(profile.addons)) {
          for (const addon of profile.addons) {
            if (addon.type === 'datapack') {
              if (!world_name || !addon.world_name || addon.world_name === world_name) {
                if (addon.project_id) installedDatapackProjectIds.add(String(addon.project_id).toLowerCase());
                if (addon.filename) {
                  installedDatapackFilenames.add(addon.filename.toLowerCase());
                  if (addon.filename.endsWith('.disabled')) {
                    installedDatapackFilenames.add(addon.filename.slice(0, -9).toLowerCase());
                  }
                }
              }
            } else {
              // Mods (and resourcepacks/shaders)
              if (addon.project_id) installedProjectIds.add(String(addon.project_id).toLowerCase());
              if (addon.filename) {
                installedFilenames.add(addon.filename.toLowerCase());
                if (addon.filename.endsWith('.disabled')) {
                  installedFilenames.add(addon.filename.slice(0, -9).toLowerCase());
                }
              }
            }
          }
        }
        const mcDir = paths.getMcDir();
        const profileDir = profile.directory || mcDir;
        const modsDir = path.join(profileDir, 'mods');
        if (fs.existsSync(modsDir)) {
          const files = await fs.readdir(modsDir);
          for (const f of files) {
            installedFilenames.add(f.toLowerCase());
            if (f.endsWith('.disabled')) {
              installedFilenames.add(f.slice(0, -9).toLowerCase());
            }
          }
        }
        if (world_name) {
          const dpDir = path.join(profileDir, 'saves', world_name, 'datapacks');
          if (fs.existsSync(dpDir)) {
            const files = await fs.readdir(dpDir);
            for (const f of files) {
              installedDatapackFilenames.add(f.toLowerCase());
              if (f.endsWith('.disabled')) {
                installedDatapackFilenames.add(f.slice(0, -9).toLowerCase());
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('[resolve-mod-dependencies] Error resolving installed addons for profile:', err.message);
    }
  }

  return modManager.resolveModDependencies(
    version_id,
    game_version,
    loader,
    installedProjectIds,
    installedFilenames,
    installedDatapackProjectIds,
    installedDatapackFilenames
  );
})
ipcMain.handle('resolve-modpack-compatibility', async (e, args) => modManager.resolveModpackCompatibility(args))
ipcMain.handle('check-addon-updates', async (e, args) => modManager.checkAddonUpdates(args))

ipcMain.handle('install-addon', async (e, args) => {
  try {
    console.log('[install-addon] Request:', args);
    let { url, filename, profile_id, type, version_id, project_id } = args;

    // Acquire lock for this profile to prevent race conditions
    const lockKey = profile_id;
    while (profileUpdateLocks.has(lockKey)) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    profileUpdateLocks.set(lockKey, true);

    try {
      // Resolve URL from Version ID if provided
      if (!url && version_id) {
        console.log('[install-addon] Resolving version ID:', version_id);
        const vInfo = await modManager.getVersionFromId(version_id, type);
        if (!vInfo.success) {
          console.error('[install-addon] Version resolution failed:', vInfo.error);
          return { success: false, error: "Could not resolve version info: " + vInfo.error };
        }
        url = vInfo.url;
        filename = vInfo.filename;
        console.log('[install-addon] Resolved:', { url, filename });
      }

      const profilesData = profileManager.loadProfiles();
      const profiles = profilesData.profiles;
      const profile = profiles[profile_id];
      if (!profile) return { success: false, error: "Installation Not Found" };

      const mcDir = paths.getMcDir();
      const profileDir = profile.directory || mcDir;

      let targetDir = path.join(profileDir, 'mods'); // default
      if (type === 'resourcepack') targetDir = path.join(profileDir, 'resourcepacks');
      if (type === 'shader') targetDir = path.join(profileDir, 'shaderpacks');
      if (type === 'datapack') {
        if (!args.world_name) return { success: false, error: "World Name Required for Datapack" };
        targetDir = path.join(profileDir, 'saves', args.world_name, 'datapacks');
      }

      if (type === 'modpack') {
        console.log('[install-addon] Installing Modpack:', filename);
        const result = await modManager.installModpack(url, filename, profileDir, (percentage) => {
          if (args.project_id) {
            e.sender.send('mod-download-progress', { projectId: args.project_id, percentage });
          }
        });
        if (result.success) {
          const deps = result.dependencies || {};
          const mcVer = deps.minecraft;
          if (mcVer) {
            let loaderStr = `Vanilla ${mcVer}`;
            if (deps['fabric-loader']) loaderStr = `Fabric ${mcVer} (${deps['fabric-loader']})`;
            else if (deps['forge']) loaderStr = `Forge ${mcVer} (${deps['forge']})`;
            else if (deps['neoforge']) loaderStr = `NeoForge ${mcVer} (${deps['neoforge']})`;
            if (!profile.version || profile.version === 'Vanilla' || profile.version.startsWith('Vanilla')) {
              profile.version = loaderStr;
            }
          }
          profile.addons = profile.addons || [];
          if (project_id && version_id) {
            profile.addons = profile.addons.filter(a => a.project_id !== project_id);
            profile.addons.push({ project_id, version_id, filename, type: 'modpack', state: 'enabled' });
          }
          if (result.installedAddons && Array.isArray(result.installedAddons)) {
            for (const item of result.installedAddons) {
              if (!profile.addons.some(a => a.filename === item.filename)) {
                profile.addons.push({
                  project_id: item.project_id,
                  version_id: item.version_id,
                  filename: item.filename,
                  type: item.type,
                  state: 'enabled'
                });
              }
            }
          }
          profileManager.saveProfiles(profilesData);
        }
        return result;
      }

      if (type === 'shader') {
        console.log('[install-addon] Validating shader support...');
        const check = await modManager.validateShaderSupport(path.join(profileDir, 'mods'), profile.addons);
        if (!check.supported) {
          console.error('[install-addon] Shader support validation failed:', check.reason);
          return { success: false, error: check.reason };
        }
      }

      // Collect old files for this project to remove upon reinstall/version update
      const oldFilesToRemove = new Set();
      if (profile.addons && project_id) {
        for (const a of profile.addons) {
          if (a.project_id === project_id && a.filename) {
            if (type === 'datapack' && a.world_name && args.world_name && a.world_name !== args.world_name) continue;
            oldFilesToRemove.add(a.filename);
          }
        }
      }
      if (type === 'mod' && project_id) {
        try {
          const modDetails = await modManager.getModDetails(project_id);
          if (modDetails && modDetails.slug && fs.existsSync(targetDir)) {
            const slug = String(modDetails.slug).toLowerCase();
            const existingFiles = await fs.readdir(targetDir);
            const otherProjectFilenames = new Set(
              (profile.addons || [])
                .filter(a => a.project_id !== project_id && a.filename)
                .map(a => a.filename.toLowerCase())
            );
            for (const ef of existingFiles) {
              const efLower = ef.toLowerCase();
              if (otherProjectFilenames.has(efLower)) continue;
              const cleanEf = efLower.replace(/\.disabled$/, '').replace(/\.jar$/, '');
              if (cleanEf === slug || cleanEf.startsWith(slug + '-') || cleanEf.startsWith(slug + '_') || cleanEf.startsWith(slug + '+')) {
                oldFilesToRemove.add(ef);
              }
            }
          }
        } catch (_) {}
      }

      const targetFile = path.join(targetDir, filename);
      if (fs.existsSync(targetFile) && !args.force_reinstall) {
        console.log('[install-addon] File already exists, skipping download:', filename);

        // Delete any older files for this project if filename changed
        for (const oldFile of oldFilesToRemove) {
          if (oldFile && oldFile !== filename) {
            try {
              const oldPath = path.join(targetDir, oldFile);
              if (fs.existsSync(oldPath)) await fs.remove(oldPath);
              const oldDisabledPath = path.join(targetDir, oldFile + '.disabled');
              if (fs.existsSync(oldDisabledPath)) await fs.remove(oldDisabledPath);
              console.log('[install-addon] Deleted old mod file on reinstall/update:', oldFile);
            } catch (_) {}
          }
        }

        // Update profile JSON addons metadata anyway to ensure it's tracked
        if (project_id && version_id) {
          profile.addons = profile.addons || [];
          profile.addons = profile.addons.filter(a => {
            if (type === 'datapack') {
              return !(a.project_id === project_id && a.type === 'datapack' && a.world_name === args.world_name);
            }
            return a.project_id !== project_id && a.filename !== filename && !oldFilesToRemove.has(a.filename);
          });
          profile.addons.push({
            project_id,
            version_id,
            filename,
            type,
            world_name: type === 'datapack' ? args.world_name : undefined,
            state: 'enabled'
          });
          profileManager.saveProfiles(profilesData);
        }

        return { success: true, alreadyInstalled: true };
      }

      console.log('[install-addon] Starting download to:', targetDir);

      const result = await modManager.installProject(url, filename, targetDir, (percentage) => {
        // Send progress to renderer
        if (args.project_id) {
          e.sender.send('mod-download-progress', { projectId: args.project_id, percentage });
        }
      });

      // Delete older file(s) for this project on reinstall/version update since filename can change
      if (result.success) {
        for (const oldFile of oldFilesToRemove) {
          if (oldFile && oldFile !== filename) {
            try {
              const oldPath = path.join(targetDir, oldFile);
              if (fs.existsSync(oldPath)) {
                await fs.remove(oldPath);
                console.log('[install-addon] Deleted old mod file on reinstall/update:', oldPath);
              }
              const oldDisabledPath = path.join(targetDir, oldFile + '.disabled');
              if (fs.existsSync(oldDisabledPath)) {
                await fs.remove(oldDisabledPath);
                console.log('[install-addon] Deleted old disabled mod file on reinstall/update:', oldDisabledPath);
              }
            } catch (delErr) {
              console.warn('[install-addon] Failed to delete old mod file:', oldFile, delErr.message);
            }
          }
        }

        // Also if the new file had a leftover .disabled file, clean it up
        try {
          const newDisabled = path.join(targetDir, filename + '.disabled');
          if (fs.existsSync(newDisabled)) await fs.remove(newDisabled);
        } catch (_) {}

        // Update profile JSON with addon metadata after successful download
        if (project_id && version_id) {
          profile.addons = profile.addons || [];
          // Remove older version of same addon
          profile.addons = profile.addons.filter(a => {
            if (type === 'datapack') {
              return !(a.project_id === project_id && a.type === 'datapack' && a.world_name === args.world_name);
            }
            return a.project_id !== project_id && !oldFilesToRemove.has(a.filename);
          });
          profile.addons.push({
            project_id,
            version_id,
            filename,
            type,
            world_name: type === 'datapack' ? args.world_name : undefined,
            state: 'enabled'
          });
          profileManager.saveProfiles(profilesData);
        }
      }

      return result;
    } finally {
      // Release lock
      profileUpdateLocks.delete(lockKey);
    }
  } catch (error) {
    console.error('[install-addon] Critical error:', error);
    return { success: false, error: error.message };
  }
})

ipcMain.handle('get-modrinth-categories', async () => {
  return await modManager.getModCategories();
})

ipcMain.handle('get-installed-addons', async (e, { profile_id, type, world_name }) => {
  const profilesData = profileManager.loadProfiles();
  const profiles = profilesData.profiles;
  const profile = profiles[profile_id];
  if (!profile) return { success: false };

  if (type === 'modpack') {
    const modpackMods = [];
    if (profile.addons) {
      profile.addons.forEach(addon => {
        if (addon.type === 'modpack') {
          modpackMods.push({
            filename: addon.filename,
            display_name: addon.filename ? addon.filename.replace(/\.mrpack$/i, '') : 'Modpack',
            enabled: true,
            type: 'modpack',
            size_mb: '',
            project_id: addon.project_id,
            version_id: addon.version_id,
            missing: false
          });
        }
      });
    }
    return { success: true, mods: modpackMods };
  }

  const mcDir = paths.getMcDir();
  const profileDir = profile.directory || mcDir;

  let targetDir = path.join(profileDir, 'mods');
  if (type === 'resourcepack') targetDir = path.join(profileDir, 'resourcepacks');
  if (type === 'shader') targetDir = path.join(profileDir, 'shaderpacks');
  if (type === 'datapack') {
    if (!world_name) return { success: false, error: "World Name Required" };
    targetDir = path.join(profileDir, 'saves', world_name, 'datapacks');
  }

  const result = await modManager.getInstalledAddons(targetDir, type);

  // Create a map of existing files for quick lookup
  const existingFilesMap = new Map();
  if (result.success) {
    result.mods.forEach(mod => {
      existingFilesMap.set(mod.filename, mod);
    });
  }

  // Merge profile metadata with local files and add missing addons
  const finalMods = result.success ? result.mods : [];

  if (profile.addons) {
    let profileModified = false;
    profile.addons.forEach(addon => {
      if (addon.type !== type) return;

      if (type === 'datapack') {
        if (addon.world_name) {
          if (addon.world_name !== world_name) return;
        } else {
          // If legacy addon entry without world_name, check if file exists in this world
          if (existingFilesMap.has(addon.filename)) {
            addon.world_name = world_name;
            profileModified = true;
          } else {
            return;
          }
        }
      }

      const existingMod = existingFilesMap.get(addon.filename);
      const isEnabled = addon.state ? (addon.state !== 'disabled') : (addon.enabled !== false);
      if (existingMod) {
        // File exists, merge metadata
        existingMod.project_id = addon.project_id;
        existingMod.version_id = addon.version_id;
        // Use state from metadata if available, otherwise infer from filename
        existingMod.enabled = isEnabled;
      } else {
        // File is missing, add it with missing flag
        finalMods.push({
          filename: addon.filename,
          display_name: addon.filename,
          enabled: isEnabled,
          type: 'file',
          size_mb: 'Missing file',
          project_id: addon.project_id,
          version_id: addon.version_id,
          missing: true
        });
      }
    });
    if (profileModified) {
      try { profileManager.saveProfiles(profilesData); } catch (_) {}
    }
  }

  return { success: true, mods: finalMods };
})

ipcMain.handle('toggle-addon', async (e, { filename, profile_id, type, world_name, enabled }) => {
  const profilesData = profileManager.loadProfiles();
  const profiles = profilesData.profiles;
  const profile = profiles[profile_id];
  if (!profile) return { success: false };

  const mcDir = paths.getMcDir();
  const profileDir = profile.directory || mcDir;

  let targetDir = path.join(profileDir, 'mods');
  if (type === 'resourcepack') targetDir = path.join(profileDir, 'resourcepacks');
  if (type === 'shader') targetDir = path.join(profileDir, 'shaderpacks');
  if (type === 'datapack') targetDir = path.join(profileDir, 'saves', world_name, 'datapacks');

  // Find the addon in profile metadata
  const addonIndex = profile.addons ? profile.addons.findIndex(a => {
    if (a.filename !== filename || a.type !== type) return false;
    if (type === 'datapack' && a.world_name && a.world_name !== world_name) return false;
    return true;
  }) : -1;

  if (addonIndex === -1) {
    // If not in metadata, just rename the file on disk
    const actualFilename = enabled ? filename + '.disabled' : filename;
    const targetFilename = enabled ? filename : filename + '.disabled';
    const oldPath = path.join(targetDir, actualFilename);
    const newPath = path.join(targetDir, targetFilename);

    if (fs.existsSync(oldPath)) {
      await fs.rename(oldPath, newPath);
      return { success: true, new_name: targetFilename };
    } else {
      return { success: false, error: 'File not found' };
    }
  }

  const addon = profile.addons[addonIndex];
  const currentFilename = addon.filename;
  const currentState = addon.state || 'enabled';

  // Determine target state based on enabled parameter
  // enabled=true means we want to ENABLE the addon
  // enabled=false means we want to DISABLE the addon
  const targetState = enabled ? 'enabled' : 'disabled';

  // If already in target state, do nothing
  if (currentState === targetState) {
    return { success: true, new_name: currentFilename };
  }

  // Determine new filename based on target state
  let newFilename;
  if (targetState === 'enabled') {
    // Remove .disabled suffix if present
    newFilename = currentFilename.replace(/\.disabled$/, '');
  } else {
    // Add .disabled suffix only if not already present
    newFilename = currentFilename.endsWith('.disabled') ? currentFilename : currentFilename + '.disabled';
  }

  // Rename the file on disk
  const oldPath = path.join(targetDir, currentFilename);
  const newPath = path.join(targetDir, newFilename);

  if (fs.existsSync(oldPath)) {
    await fs.rename(oldPath, newPath);
  }

  // Update metadata
  profile.addons[addonIndex].filename = newFilename;
  profile.addons[addonIndex].state = targetState;
  profileManager.saveProfiles(profilesData);

  return { success: true, new_name: newFilename };
})

ipcMain.handle('delete-addon-file', async (e, { profile_id, type, filename, world_name }) => {
  try {
    const profilesData = profileManager.loadProfiles();
    const profile = profilesData.profiles[profile_id];
    if (!profile) return { success: false };
    const mcDir = paths.getMcDir();
    const profileDir = profile.directory || mcDir;
    let targetDir = path.join(profileDir, 'mods');
    if (type === 'resourcepack') targetDir = path.join(profileDir, 'resourcepacks');
    if (type === 'shader') targetDir = path.join(profileDir, 'shaderpacks');
    if (type === 'datapack') targetDir = path.join(profileDir, 'saves', world_name, 'datapacks');
    const filePath = path.join(targetDir, filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
})

ipcMain.handle('delete-addon', async (e, { filename, profile_id, type, world_name }) => {
  const profilesData = profileManager.loadProfiles();
  const profiles = profilesData.profiles;
  const profile = profiles[profile_id];
  if (!profile) return { success: false };

  const mcDir = paths.getMcDir();
  const profileDir = profile.directory || mcDir;

  let targetDir = path.join(profileDir, 'mods');
  if (type === 'resourcepack') targetDir = path.join(profileDir, 'resourcepacks');
  if (type === 'shader') targetDir = path.join(profileDir, 'shaderpacks');
  if (type === 'datapack') targetDir = path.join(profileDir, 'saves', world_name, 'datapacks');

  // Find the addon in metadata to get the actual filename (with or without .disabled)
  const addon = profile.addons ? profile.addons.find(a => {
    if (a.filename !== filename || a.type !== type) return false;
    if (type === 'datapack' && a.world_name && a.world_name !== world_name) return false;
    return true;
  }) : null;
  const actualFilename = addon ? addon.filename : filename;

  const result = await modManager.deleteAddon(actualFilename, targetDir);

  // Remove from profile metadata
  if (result.success && profile.addons) {
    profile.addons = profile.addons.filter(a => {
      if (a.filename === actualFilename && a.type === type) {
        if (type === 'datapack' && a.world_name && a.world_name !== world_name) return true;
        return false;
      }
      return true;
    });
    profileManager.saveProfiles(profilesData);
  }

  return result;
})

ipcMain.handle('open-addons-folder', async (e, { profile_id, type, world_name }) => {
  const profiles = profileManager.loadProfiles().profiles;
  const profile = profiles[profile_id];
  if (!profile) return { success: false, error: "Installation not found" };

  const mcDir = paths.getMcDir();
  const profileDir = profile.directory || mcDir;

  let targetDir = path.join(profileDir, 'mods');
  if (type === 'resourcepack') targetDir = path.join(profileDir, 'resourcepacks');
  if (type === 'shader') targetDir = path.join(profileDir, 'shaderpacks');
  if (type === 'datapack') {
    if (!world_name) return { success: false, error: "World Name Required" };
    targetDir = path.join(profileDir, 'saves', world_name, 'datapacks');
  }

  if (!fs.existsSync(targetDir)) {
    fs.ensureDirSync(targetDir);
  }

  shell.openPath(targetDir);
  return { success: true };
})

ipcMain.handle('import-addon-file', async (e, { profile_id, type, world_name }) => {
  const profiles = profileManager.loadProfiles().profiles;
  const profile = profiles[profile_id];
  if (!profile) return { success: false, error: "Profile not found" };

  const mcDir = paths.getMcDir();
  const profileDir = profile.directory || mcDir;

  let targetDir = path.join(profileDir, 'mods');
  if (type === 'resourcepack') targetDir = path.join(profileDir, 'resourcepacks');
  if (type === 'shader') targetDir = path.join(profileDir, 'shaderpacks');
  if (type === 'datapack') {
    if (!world_name) return { success: false, error: "World Name Required" };
    targetDir = path.join(profileDir, 'saves', world_name, 'datapacks');
  }

  const filters = [
    { name: 'All Files', extensions: ['*'] }
  ];
  if (type === 'mod') filters.unshift({ name: 'Minecraft Mods', extensions: ['jar'] });
  if (type === 'resourcepack' || type === 'datapack' || type === 'shader') {
    filters.unshift({ name: 'Zip Files', extensions: ['zip'] });
  }

  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog(mainWindow, {
    title: `Import ${type}`,
    properties: ['openFile'],
    filters: filters
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const sourceFile = result.filePaths[0];
    const filename = path.basename(sourceFile);
    const destFile = path.join(targetDir, filename);

    try {
      fs.ensureDirSync(targetDir);
      fs.copySync(sourceFile, destFile);
      return { success: true, filename };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  return { success: false, canceled: true };
});

// 5. User Capes (New)
ipcMain.handle('refresh-session', async () => {
  try {
    const userData = loadUserData();
    console.log(`[Refresh] Checking session type: ${userData.account_type}`);

    if (userData.account_type === 'helloworld') {
      try {
        if (ApiClient && ApiClient.users && typeof ApiClient.users.getProfile === 'function') {
          const target = userData.firebase_uid || userData.username;
          const d1Profile = await ApiClient.users.getProfile(target);
          if (d1Profile && d1Profile.user) {
            const u = d1Profile.user;
            const av = u.avatar_url || u.avatarUrl || u.avatarBase64;
            if (av) {
              userData.last_avatar_url = av;
              saveUserData(userData);
            }
          }
        }
      } catch (err) {
        console.error("[Refresh] Error fetching helloworld avatar:", err.message);
      }

      const safeProfile = {
        name: userData.username,
        id: userData.uuid,
        avatar_url: userData.last_avatar_url || ""
      };
      return { success: true, profile: safeProfile };
    }

    if (userData.account_type !== 'microsoft' || !userData.msmc_auth) {
      return { success: false, error: "Not logged in with Microsoft" };
    }

    // Use centralized refresh helper (handles rate-limiting and credential clearing safely)
    const refreshResult = await refreshMicrosoftSession(userData);
    if (refreshResult.success) {
      const freshData = loadUserData();
      return {
        success: true,
        profile: {
          name: freshData.username,
          id: freshData.uuid,
          avatar_url: freshData.last_avatar_url || ""
        }
      };
    }
    return { success: false, expired: refreshResult.expired || false, error: refreshResult.error };
  } catch (e) {
    console.error("Error refreshing session:", e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('close-app', async () => {
  isQuitting = true;
  try {
    await presenceManager.setOffline();
  } catch (_) {}
  if (tray && !tray.isDestroyed()) {
    try { tray.destroy(); } catch (_) {}
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    try { mainWindow.destroy(); } catch (_) {}
  }
  app.quit();
  setTimeout(() => {
    try {
      if (app && !app.isDestroyed?.()) app.exit(0);
    } catch (_) {}
    process.exit(0);
  }, 500);
});
ipcMain.handle('get-version', () => app.getVersion())
ipcMain.handle('check-internet', async () => {
  // 1. Ultra-fast DNS lookup (~15ms, practically 0 bytes)
  const dnsCheck = () => new Promise((resolve) => {
    const dns = require('dns');
    dns.lookup('google.com', (err) => {
      if (!err) return resolve(true);
      dns.lookup('cloudflare.com', (err2) => {
        resolve(!err2);
      });
    });
  });

  try {
    const hasDns = await dnsCheck();
    if (hasDns) return true;
  } catch (_) {}

  // 2. HTTP 204 / HEAD check fallback (0 bytes payload)
  try {
    await axios.get('https://www.google.com/generate_204', { timeout: 2500 });
    return true;
  } catch (_) {
    try {
      await axios.head('https://piston-meta.mojang.com', { timeout: 2500 });
      return true;
    } catch (_) {
      return false;
    }
  }
})

ipcMain.handle('show-desktop-notification', async (e, { title, body, senderId }) => {
  let imagePath = null;
  let isAvatar = false;
  if (senderId && friendProfileCache.has(senderId)) {
    try {
      imagePath = await resolveAvatarFile(friendProfileCache.get(senderId));
      isAvatar = true;
    } catch (_) {}
  }
  if (!imagePath) {
    imagePath = getNotificationIconPath();
  }
  const notifOpts = {
    title: title || 'HelloWorld Launcher',
    body: body || '',
    silent: false,
    icon: imagePath
  };
  if (process.platform === 'win32') {
    notifOpts.toastXml = buildWindowsToastXml(notifOpts.title, notifOpts.body, imagePath, isAvatar);
  }
  const notif = new Notification(notifOpts);
  activeNotifications.add(notif);
  const cleanup = () => activeNotifications.delete(notif);
  notif.on('close', cleanup);
  notif.on('failed', cleanup);
  const handler = () => {
    cleanup();
    showAndFocusWindow();
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('navigate-to-chat', { fromInbox: true, targetTab: 'received' });
        mainWindow.webContents.send('navigate-to-inbox', { targetTab: 'received' });
      }
    }, 150);
  };
  notif.on('click', handler);
  notif.on('action', handler);
  notif.show();
  return true;
})

// Fetch Web Versions
ipcMain.handle('get-available-versions', async () => {
  console.log("IPC: get-available-versions");
  const mcDir = paths.getMcDir();
  const versionsDir = path.join(mcDir, 'versions');

  let installed = [];
  try {
    if (fs.existsSync(versionsDir)) {
      installed = fs.readdirSync(versionsDir).filter(f =>
        fs.lstatSync(path.join(versionsDir, f)).isDirectory()
      );
    }
  } catch (e) {
    console.error("Error scanning versions:", e);
  }

  let web = [];
  try {
    const manifestUrl = "https://piston-meta.mojang.com/mc/game/version_manifest.json";
    const response = await axios.get(manifestUrl, { timeout: 5000 });
    const data = response.data;
    if (data && data.versions) {
      web = data.versions.map(v => v.id);
    }
  } catch (e) {
    console.error("Error fetching web versions:", e.message);
  }

  return { installed, web };
})

ipcMain.handle('delete-version', async (e, version_id) => {
  console.log("IPC: delete-version", version_id);
  try {
    const mcDir = paths.getMcDir();
    const versionDir = path.join(mcDir, 'versions', version_id);

    if (!fs.existsSync(versionDir)) {
      return { success: false, error: "Version folder not found" };
    }

    // Check if any profile is using this version
    const profiles = profileManager.loadProfiles().profiles || {};
    const inUse = Object.values(profiles).filter(p => p.version === version_id);
    if (inUse.length > 0) {
      const names = inUse.map(p => p.name).join(', ');
      return { success: false, error: `Version is used by profiles: ${names}. Delete or change those profiles first.` };
    }

    fs.removeSync(versionDir);
    console.log(`[delete-version] Removed: ${versionDir}`);
    return { success: true };
  } catch (err) {
    console.error("[delete-version] Error:", err);
    return { success: false, error: err.message };
  }
})

// --- Auto-Updater IPC & Events ---

ipcMain.handle('check-for-updates', () => {
  console.log("IPC: check-for-updates");
  if (!autoUpdater) {
    if (mainWindow) {
      mainWindow.webContents.send('updater-status', { status: 'not-available', info: { version: app.getVersion(), dev: !app.isPackaged } });
    }
    return;
  }
  // Enable dev mode updates if running in dev AND dev-config exists
  if (!app.isPackaged) {
    const devConfigCandidates = [
      path.join(__dirname, 'dev-app-update.yml'),
      path.join(__dirname, '..', 'dev-app-update.yml')
    ];
    const devConfig = devConfigCandidates.find(p => fs.existsSync(p));
    if (devConfig) {
      console.log("Running in dev mode, forcing update config...");
      autoUpdater.forceDevUpdateConfig = true;
    } else {
      console.log("Running in dev mode, but dev-app-update.yml not found. Skipping dev update config.");
      // Manually send not-available so the UI doesn't hang
      if (mainWindow) {
        mainWindow.webContents.send('updater-status', { status: 'not-available', info: { version: app.getVersion(), dev: true } });
      }
      return;
    }
  }
  autoUpdater.checkForUpdatesAndNotify();
  // .checkForUpdates() returns a promise, but we rely on events
})

ipcMain.handle('start-download-update', () => {
  console.log("IPC: start-download-update");
  if (autoUpdater) autoUpdater.downloadUpdate();
})

ipcMain.handle('quit-and-install', () => {
  console.log("IPC: quit-and-install (silent=true, forceRunAfter=true)");
  if (autoUpdater) autoUpdater.quitAndInstall(true, true);
})

// --- Direct Setup Updater Handlers ---

// Función auxiliar para limpiar archivos temporales huérfanos de descargas anteriores
function cleanOrphanedTmpFiles(dir) {
  try {
    if (!dir || !fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const f of files) {
      if (f.includes('.tmp_') || f.startsWith('setup.exe.tmp') || f.startsWith('HelloWorld-Launcher-Setup.exe.tmp')) {
        try { fs.unlinkSync(path.join(dir, f)); } catch (_) {}
      }
    }
  } catch (_) {}
}

let activeInstallerDownload = null;
let activeInstallerDownloadPromise = null;
let activeInstallerDownloadUrl = null;

// Verifica el hash sha512 o sha256 (en hex o base64) de un archivo contra el hash esperado
function verifyFileHash(filePath, expectedHash) {
  if (!expectedHash || typeof expectedHash !== 'string') return true;
  try {
    const cleanExpected = expectedHash.trim();
    if (!cleanExpected) return true;
    if (!fs.existsSync(filePath)) return false;
    const fileBuf = fs.readFileSync(filePath);
    const sha512_b64 = crypto.createHash('sha512').update(fileBuf).digest('base64');
    const sha512_hex = crypto.createHash('sha512').update(fileBuf).digest('hex');
    const sha256_hex = crypto.createHash('sha256').update(fileBuf).digest('hex');
    const sha256_b64 = crypto.createHash('sha256').update(fileBuf).digest('base64');

    return (
      sha512_b64 === cleanExpected ||
      sha512_hex.toLowerCase() === cleanExpected.toLowerCase() ||
      sha256_hex.toLowerCase() === cleanExpected.toLowerCase() ||
      sha256_b64 === cleanExpected
    );
  } catch (err) {
    console.warn('[verifyFileHash] Error verifying file hash:', err.message);
    return false;
  }
}

// Descarga un archivo directamente con soporte de streams, timeouts, reintentos y validación de integridad
async function downloadFileDirectly(downloadUrl, destPath, options = {}) {
  const {
    expectedHash = null,
    minSizeBytes = 1024 * 1024,
    onProgress = null,
    maxAttempts = 5
  } = options;

  let targetUrl = downloadUrl;
  try {
    const urlObj = new URL(downloadUrl);
    if (urlObj.hostname.includes('drive.google.com') || urlObj.hostname.includes('drive.usercontent.google.com')) {
      let fileId = null;
      const matchPath = urlObj.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (matchPath) {
        fileId = matchPath[1];
      } else if (urlObj.searchParams.has('id')) {
        fileId = urlObj.searchParams.get('id');
      }
      if (fileId) {
        targetUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
      }
    }
  } catch (_) {}

  let lastError = null;
  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let tempPath = null;
    let writer = null;
    let inactivityTimer = null;

    try {
      tempPath = destPath + '.tmp_' + Date.now();
      writer = fs.createWriteStream(tempPath);

      console.log(`[downloadFileDirectly] Attempt ${attempt}/${maxAttempts} downloading from:`, targetUrl, 'to:', destPath);

      if (onProgress) {
        onProgress({ transferred: 0, total: 0, percent: 0, speed: 0, attempt, maxAttempts });
      }

      const res = await axios({
        method: 'get',
        url: targetUrl,
        responseType: 'stream',
        timeout: 25000,
        maxRedirects: 15,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Encoding': 'identity',
          'Connection': 'keep-alive'
        }
      });

      activeInstallerDownload = { res, writer, tempPath };

      const contentType = (res.headers['content-type'] || '').toLowerCase();
      if (contentType.includes('text/html')) {
        throw new Error('El enlace devolvió HTML en vez del binario ejecutable.');
      }

      const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
      let downloadedBytes = 0;
      let lastTime = Date.now();
      let lastBytes = 0;

      const resetInactivityTimer = () => {
        if (inactivityTimer) clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
          console.warn(`[downloadFileDirectly] Stream stalled (no data for 15s) on attempt ${attempt}`);
          if (res.data) {
            res.data.destroy(new Error('Descarga estancada: el servidor no envió datos durante 15 segundos'));
          }
        }, 15000);
      };
      resetInactivityTimer();

      res.data.on('data', (chunk) => {
        resetInactivityTimer();
        downloadedBytes += chunk.length;
        const now = Date.now();
        if (now - lastTime >= 250) {
          const speed = (downloadedBytes - lastBytes) / ((now - lastTime) / 1000);
          lastTime = now;
          lastBytes = downloadedBytes;
          let percent = 0;
          if (totalBytes > 0) {
            percent = Math.min(99, Math.round((downloadedBytes / totalBytes) * 100));
          } else {
            const estimatedTotal = 60 * 1024 * 1024;
            percent = Math.min(95, Math.round((downloadedBytes / estimatedTotal) * 100));
          }
          if (onProgress) {
            onProgress({
              transferred: downloadedBytes,
              total: totalBytes,
              percent: percent,
              speed: Math.round(speed),
              attempt: attempt,
              maxAttempts: maxAttempts
            });
          }
        }
      });

      await pipeline(res.data, writer);
      if (inactivityTimer) clearTimeout(inactivityTimer);

      if (totalBytes > 0 && downloadedBytes < totalBytes) {
        throw new Error(`Descarga incompleta: se recibieron ${downloadedBytes} de ${totalBytes} bytes`);
      }
      if (minSizeBytes > 0 && downloadedBytes < minSizeBytes) {
        throw new Error(`El archivo descargado es demasiado pequeño (${(downloadedBytes / (1024 * 1024)).toFixed(1)} MB), descarga incompleta`);
      }

      // Comprobación de hash si se especificó
      if (expectedHash && typeof expectedHash === 'string') {
        const isValid = verifyFileHash(tempPath, expectedHash);
        if (!isValid) {
          throw new Error(`El hash del archivo descargado no coincide con el esperado (${expectedHash})`);
        }
      }

      if (fs.existsSync(destPath)) {
        try { fs.unlinkSync(destPath); } catch (_) {}
      }
      fs.renameSync(tempPath, destPath);

      if (onProgress) {
        onProgress({
          transferred: totalBytes || downloadedBytes,
          total: totalBytes || downloadedBytes,
          percent: 100,
          speed: 0,
          attempt: attempt,
          maxAttempts: maxAttempts
        });
      }

      console.log('[downloadFileDirectly] Download complete and verified:', destPath, `(${downloadedBytes} bytes)`);
      return { success: true, filePath: destPath, size: downloadedBytes };

    } catch (attemptErr) {
      lastError = attemptErr;
      console.warn(`[downloadFileDirectly] Attempt ${attempt}/${maxAttempts} failed:`, attemptErr.message);

      if (inactivityTimer) clearTimeout(inactivityTimer);

      if (writer && !writer.destroyed) {
        try {
          await new Promise((resolve) => {
            writer.on('close', resolve);
            writer.destroy();
            setTimeout(resolve, 300);
          });
        } catch (_) {}
      }

      try {
        if (tempPath && fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch (cleanErr) {
        console.warn('[downloadFileDirectly] Could not remove temp file:', cleanErr.message);
      }

      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, 1200));
      }
    } finally {
      if (activeInstallerDownload && activeInstallerDownload.writer === writer) {
        activeInstallerDownload = null;
      }
    }
  }

  cleanOrphanedTmpFiles(destDir);
  throw lastError || new Error('Failed to download file after multiple attempts');
}

async function findLocalInstallerPath(expectedHash = null) {
  try {
    const execDir = path.dirname(process.env.APPIMAGE || process.execPath);
    let candidates = [];
    if (process.platform === 'win32') {
      candidates = [
        path.join(execDir, 'setup.exe'),
        path.join(execDir, 'HelloWorld-Launcher-Setup.exe'),
        path.join(app.getPath('userData'), 'updates', 'setup.exe'),
        path.join(app.getPath('userData'), 'updates', 'HelloWorld-Launcher-Setup.exe'),
        path.join(execDir, 'Setup.exe'),
        path.join(execDir, 'helloworld-launcher-setup.exe'),
        path.join(__dirname, '..', 'release', 'win', 'HelloWorld-Launcher-Setup.exe'),
        path.join(__dirname, '..', 'dist', 'setup', 'HelloWorld-Launcher-Setup.exe'),
        path.join(__dirname, 'release', 'win', 'HelloWorld-Launcher-Setup.exe'),
        path.join(__dirname, 'dist', 'setup', 'HelloWorld-Launcher-Setup.exe')
      ];
    } else if (process.platform === 'darwin') {
      candidates = [
        path.join(execDir, 'HelloWorld-Launcher.dmg'),
        path.join(execDir, '..', '..', '..', 'HelloWorld-Launcher.dmg'),
        path.join(app.getPath('userData'), 'updates', 'HelloWorld-Launcher.dmg'),
        path.join(__dirname, '..', 'dist', 'HelloWorld-Launcher.dmg'),
        path.join(__dirname, 'dist', 'HelloWorld-Launcher.dmg')
      ];
    } else {
      candidates = [
        path.join(execDir, 'setup.bin'),
        path.join(execDir, 'HelloWorld-Launcher-Setup-Linux.bin'),
        path.join(execDir, 'setup.AppImage'),
        path.join(execDir, 'HelloWorld-Launcher-Setup-Linux.AppImage'),
        path.join(app.getPath('userData'), 'updates', 'setup.bin'),
        path.join(app.getPath('userData'), 'updates', 'HelloWorld-Launcher-Setup-Linux.bin'),
        path.join(execDir, 'HelloWorld-Launcher.AppImage'),
        path.join(execDir, 'helloworld-launcher.AppImage'),
        path.join(execDir, 'helloworld-launcher.deb'),
        path.join(app.getPath('userData'), 'updates', 'helloworld-launcher-linux-amd64.AppImage'),
        path.join(app.getPath('userData'), 'updates', 'helloworld-launcher-linux-amd64.deb'),
        path.join(app.getPath('userData'), 'updates', 'helloworld-launcher-linux-x86_64.rpm'),
        path.join(app.getPath('userData'), 'updates', 'helloworld-launcher-linux-x64.zip'),
        path.join(__dirname, '..', 'dist', 'setup', 'HelloWorld-Launcher-Setup-Linux.bin'),
        path.join(__dirname, '..', 'dist', 'helloworld-launcher.deb'),
        path.join(__dirname, 'dist', 'helloworld-launcher.deb')
      ];
    }

    for (const c of candidates) {
      if (fs.existsSync(c)) {
        const stat = fs.statSync(c);
        if (stat.size > 1024 * 1024) {
          // Si se especificó un hash esperado, verificar para evitar usar un setup desactualizado
          if (expectedHash && typeof expectedHash === 'string') {
            if (!verifyFileHash(c, expectedHash)) {
              console.log(`[findLocalInstallerPath] Local candidate ${c} hash differs from remote expected hash. Skipping to fetch newest setup.`);
              continue;
            }
          }
          return c;
        }
      }
    }
  } catch (e) {
    console.error('[findLocalInstallerPath] Error:', e);
  }
  return null;
}

// Garantiza que exista un setup.exe local con el hash esperado; si no existe o el hash difiere, lo descarga como setup.exe
async function ensureLocalInstaller({ expectedHash = null, setupUrl = null, tag = null } = {}) {
  try {
    if (process.platform !== 'win32') {
      const existing = await findLocalInstallerPath(expectedHash);
      return { exists: Boolean(existing), path: existing, downloaded: false };
    }

    // 1. Verificar si ya existe un candidato local cuyo hash coincida con el esperado
    const existing = await findLocalInstallerPath(expectedHash);
    if (existing) {
      console.log('[ensureLocalInstaller] Matching setup candidate already present locally:', existing);
      return { exists: true, path: existing, downloaded: false };
    }

    console.log(`[ensureLocalInstaller] Setup candidate missing or hash differs from remote (${expectedHash || 'unknown'}). Downloading newest setup.exe...`);

    const updatesDir = path.join(app.getPath('userData'), 'updates');
    if (!fs.existsSync(updatesDir)) {
      fs.mkdirSync(updatesDir, { recursive: true });
    }

    let downloadUrl = setupUrl;
    if (!downloadUrl) {
      const releaseTag = tag || ('v' + app.getVersion());
      downloadUrl = `https://github.com/abeloskyyy/HelloWorld-Launcher/releases/download/${releaseTag}/HelloWorld-Launcher-Setup.exe`;
    }

    const targetSetupExe = path.join(updatesDir, 'setup.exe');
    const targetSetupNamed = path.join(updatesDir, 'HelloWorld-Launcher-Setup.exe');

    // Descargar el nuevo setup.exe directamente y validar su hash
    const dlResult = await downloadFileDirectly(downloadUrl, targetSetupExe, {
      expectedHash: expectedHash,
      minSizeBytes: 1024 * 1024,
      maxAttempts: 3
    });

    if (dlResult && dlResult.success && fs.existsSync(targetSetupExe)) {
      try { fs.copyFileSync(targetSetupExe, targetSetupNamed); } catch (_) {}

      // Si el directorio de instalación de la aplicación es escribible, sincronizar setup.exe allí también
      try {
        const execDir = path.dirname(process.execPath);
        const appSetup = path.join(execDir, 'setup.exe');
        fs.copyFileSync(targetSetupExe, appSetup);
        console.log('[ensureLocalInstaller] Successfully synchronized new setup.exe into application directory:', appSetup);
      } catch (_) {}

      console.log('[ensureLocalInstaller] Successfully downloaded new setup.exe at:', targetSetupExe);
      return { exists: true, path: targetSetupExe, downloaded: true };
    }

    return { exists: false, error: (dlResult && dlResult.error) || 'Failed to download setup.exe' };
  } catch (err) {
    console.error('[ensureLocalInstaller] Error:', err);
    return { exists: false, error: err.message };
  }
}

ipcMain.handle('ensure-local-installer', async (event, params = {}) => {
  return await ensureLocalInstaller(params);
});

ipcMain.handle('check-local-installer', async (event, expectedHash) => {
  const p = await findLocalInstallerPath(expectedHash);
  return { exists: Boolean(p), path: p };
});

ipcMain.handle('check-downloaded-update', async (event, params = {}) => {
  try {
    const updatesDir = path.join(app.getPath('userData'), 'updates');
    if (!fs.existsSync(updatesDir)) return { exists: false };

    // Si no hay descarga activa en memoria, limpiar cualquier .tmp_ huérfano para evitar bloqueos
    if (!activeInstallerDownload) {
      cleanOrphanedTmpFiles(updatesDir);
    }

    let targetPath = null;
    let filename = process.platform === 'win32' ? 'helloworld-launcher-win.zip' : 'helloworld-launcher-update';

    if (params.filePath && typeof params.filePath === 'string' && fs.existsSync(params.filePath)) {
      targetPath = params.filePath;
      filename = path.basename(targetPath);
    } else {
      const downloadUrl = params.downloadUrl;
      if (downloadUrl) {
        try {
          const urlObj = new URL(downloadUrl);
          const parsedBase = path.basename(urlObj.pathname);
          if (parsedBase && (parsedBase.includes('.deb') || parsedBase.includes('.rpm') || parsedBase.includes('.dmg') || parsedBase.includes('.AppImage') || parsedBase.includes('.zip') || parsedBase.includes('.exe'))) {
            filename = parsedBase;
          } else if (process.platform === 'darwin') {
            filename = 'HelloWorld-Launcher.dmg';
          } else if (process.platform === 'linux') {
            filename = 'helloworld-launcher-linux-amd64.AppImage';
          }
        } catch (_) {}
      }
      targetPath = path.join(updatesDir, filename);
    }

    if (!fs.existsSync(targetPath)) return { exists: false };

    const stat = fs.statSync(targetPath);
    if (stat.size < 1024) {
      return { exists: false };
    }

    if (params.expectedHash && typeof params.expectedHash === 'string') {
      const crypto = require('crypto');
      const fileBuf = fs.readFileSync(targetPath);
      const sha512 = crypto.createHash('sha512').update(fileBuf).digest('base64');
      const sha256 = crypto.createHash('sha256').update(fileBuf).digest('hex');
      const cleanExpected = params.expectedHash.trim();
      if (sha512 !== cleanExpected && sha256.toLowerCase() !== cleanExpected.toLowerCase()) {
        console.log('[check-downloaded-update] Existing file hash differs. Redownload required.');
        return { exists: false };
      }
    }

    if (activeInstallerDownload) {
      return { exists: false };
    }

    return { exists: true, filePath: targetPath, size: stat.size };
  } catch (err) {
    console.warn('[check-downloaded-update] Error:', err);
    return { exists: false };
  }
});

ipcMain.handle('cleanup-downloaded-updates', async () => {
  try {
    const updatesDir = path.join(app.getPath('userData'), 'updates');
    if (!fs.existsSync(updatesDir)) return { success: true, removed: 0 };
    let removed = 0;
    for (const file of fs.readdirSync(updatesDir)) {
      const lower = file.toLowerCase();
      if (lower.startsWith('helloworld-launcher') || lower.includes('.tmp_')) {
        try {
          fs.unlinkSync(path.join(updatesDir, file));
          removed++;
        } catch (_) {}
      }
    }
    return { success: true, removed };
  } catch (err) {
    console.warn('[cleanup-downloaded-updates] Error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('prepare-test-update-file', async () => {
  try {
    const updatesDir = path.join(app.getPath('userData'), 'updates');
    if (!fs.existsSync(updatesDir)) {
      fs.mkdirSync(updatesDir, { recursive: true });
    }
    const testZipPath = path.join(updatesDir, 'helloworld-launcher-test-update.zip');
    const AdmZip = require('adm-zip');
    const zip = new AdmZip();
    zip.addFile('update-test.txt', Buffer.from(`HelloWorld-Launcher Test Update generated at ${new Date().toISOString()}`));
    zip.writeZip(testZipPath);
    return { success: true, filePath: testZipPath };
  } catch (err) {
    console.error('[prepare-test-update-file] Error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-platform-info', () => {
  const isAppImage = Boolean(process.env.APPIMAGE);
  const realExec = (process.platform === 'linux' && process.env.APPIMAGE) ? process.env.APPIMAGE : process.execPath;
  const realExecDir = path.dirname(realExec);
  const isSystemInstall = process.platform === 'linux' && (realExec.startsWith('/opt/') || realExec.startsWith('/usr/'));
  const hasSetupBin = process.platform === 'linux' && fs.existsSync(path.join(realExecDir, 'setup.bin'));
  const isUserLevelInstall = process.platform === 'linux' && !isAppImage && !isSystemInstall && (realExecDir.startsWith(os.homedir()) || hasSetupBin);

  let isRpm = false;
  let isDeb = false;
  // User-level / Setup installs update cleanly via .zip + setup.bin, not system RPM/DEB packages
  if (process.platform === 'linux' && !isAppImage && !isUserLevelInstall) {
    try {
      if (fs.existsSync('/etc/fedora-release') || fs.existsSync('/etc/redhat-release')) {
        isRpm = true;
      } else if (fs.existsSync('/etc/debian_version')) {
        isDeb = true;
      } else if (fs.existsSync('/etc/os-release')) {
        const osRelease = fs.readFileSync('/etc/os-release', 'utf8');
        if (/ID_LIKE=.*(?:fedora|rhel|centos|suse)/i.test(osRelease) || /^ID=.*(?:fedora|rhel|centos|rocky|almalinux|opensuse)/m.test(osRelease)) {
          isRpm = true;
        } else if (/ID_LIKE=.*(?:debian|ubuntu)/i.test(osRelease) || /^ID=.*(?:debian|ubuntu|mint|pop)/m.test(osRelease)) {
          isDeb = true;
        }
      }
    } catch (_) {}
    if (!isRpm && !isDeb) {
      const { execSync } = require('child_process');
      try {
        execSync('command -v dpkg', { stdio: 'ignore' });
        isDeb = true;
      } catch (_) {
        try {
          execSync('command -v rpm', { stdio: 'ignore' });
          isRpm = true;
        } catch (_) {}
      }
    }
  }
  return {
    platform: process.platform,
    arch: process.arch,
    isAppImage,
    isUserLevelInstall,
    hasSetupBin,
    isDeb,
    isRpm,
    realExecDir,
    appImagePath: process.env.APPIMAGE || null
  };
});

ipcMain.handle('get-system-memory', () => {
  try {
    const totalBytes = os.totalmem();
    const totalMb = Math.round(totalBytes / (1024 * 1024));
    const totalGb = Math.round((totalBytes / (1024 * 1024 * 1024)) * 10) / 10;
    return { success: true, totalBytes, totalMb, totalGb };
  } catch (err) {
    console.warn('[SystemMemory] Failed to read system memory:', err.message);
    return { success: false, totalMb: 8192, totalGb: 8.0 };
  }
});

let isLaunchingInstaller = false;

ipcMain.handle('launch-installer-and-quit', async (event, optionsOrPath) => {
  if (isLaunchingInstaller) {
    console.log('[launch-installer-and-quit] Duplicate launch request ignored.');
    return { success: true, alreadyLaunching: true };
  }
  isLaunchingInstaller = true;

  try {
    let targetExe = null;
    let updateFile = null;
    let customInstallPath = null;
    let expectedSetupHash = null;
    let setupUrl = null;
    let tag = null;

    if (typeof optionsOrPath === 'object' && optionsOrPath !== null) {
      targetExe = optionsOrPath.installerPath || null;
      updateFile = optionsOrPath.updateFile || null;
      customInstallPath = optionsOrPath.installPath || null;
      expectedSetupHash = optionsOrPath.expectedSetupHash || null;
      setupUrl = optionsOrPath.setupUrl || null;
      tag = optionsOrPath.tag || null;
    } else if (typeof optionsOrPath === 'string') {
      const lower = optionsOrPath.toLowerCase();
      if (lower.endsWith('.zip')) {
        updateFile = optionsOrPath;
      } else {
        targetExe = optionsOrPath;
      }
    }

    if (!targetExe && updateFile && !updateFile.toLowerCase().endsWith('.zip')) {
      targetExe = updateFile;
    }

    if (!targetExe && !updateFile) {
      targetExe = await findLocalInstallerPath(expectedSetupHash);
    }

    const currentPid = process.pid;
    const currentExec = (process.platform === 'linux' && process.env.APPIMAGE) ? process.env.APPIMAGE : process.execPath;
    const currentDir = customInstallPath || path.dirname(currentExec);

    const { execSync, spawn } = require('child_process');
    const hasCommand = (cmd) => {
      try { execSync(`command -v ${cmd}`, { stdio: 'ignore' }); return true; } catch (_) { return false; }
    };

    // ── 1. Linux: AppImage ──────────────────────────────────────────────────
    if (targetExe && !targetExe.toLowerCase().includes('setup') && targetExe.toLowerCase().endsWith('.appimage')) {
      console.log('[launch-installer-and-quit] Launching Linux AppImage update:', targetExe);
      try { fs.chmodSync(targetExe, 0o755); } catch (_) {}

      const currentAppImage = process.env.APPIMAGE;
      const scriptPath = path.join(app.getPath('temp'), `hwl-update-appimage-${Date.now()}.sh`);

      let scriptContent = '';
      if (currentAppImage && fs.existsSync(currentAppImage)) {
        scriptContent = `#!/usr/bin/env bash
while kill -0 ${currentPid} 2>/dev/null; do
  sleep 0.2
done
chmod +x "${targetExe}"
mv -f "${targetExe}" "${currentAppImage}"
chmod +x "${currentAppImage}"
nohup "${currentAppImage}" >/dev/null 2>&1 &
rm -f "$0"
`;
      } else {
        scriptContent = `#!/usr/bin/env bash
while kill -0 ${currentPid} 2>/dev/null; do
  sleep 0.2
done
chmod +x "${targetExe}"
nohup "${targetExe}" >/dev/null 2>&1 &
rm -f "$0"
`;
      }

      fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });
      const child = spawn('bash', [scriptPath], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();

      setTimeout(() => {
        isQuitting = true;
        app.quit();
      }, 500);
      return { success: true };
    }

    // ── 2. Linux: paquete Debian (.deb) ─────────────────────────────────────
    if (targetExe && targetExe.toLowerCase().endsWith('.deb')) {
      console.log('[launch-installer-and-quit] Preparing Linux deb relay update script for:', targetExe);

      const isUserLevel = currentDir.startsWith(os.homedir()) && (() => {
        try {
          fs.accessSync(currentDir, fs.constants.W_OK);
          return true;
        } catch (_) {
          return false;
        }
      })();

      if (isUserLevel ? (!hasCommand('dpkg-deb') && !hasCommand('dpkg')) : !hasCommand('dpkg')) {
        throw new Error('dpkg/dpkg-deb is not available on this Linux distribution');
      }

      const scriptPath = path.join(app.getPath('temp'), `hwl-update-deb-${Date.now()}.sh`);
      const scriptContent = `#!/usr/bin/env bash
OLD_PID=${currentPid}
DEB_PATH="${targetExe}"
LOG="/tmp/hwl_deb_update.log"

echo "Waiting for PID $OLD_PID to exit..." > "$LOG"
while kill -0 $OLD_PID 2>/dev/null; do
  sleep 0.2
done

SUCCESS=0

# A) Si está instalado en espacio de usuario (sin sudo / root):
if [ "${isUserLevel ? '1' : '0'}" = "1" ]; then
  echo "Extracting at user level (no root required)..." >> "$LOG"
  TMP_DIR="/tmp/hwl_deb_user_$$"
  mkdir -p "$TMP_DIR"
  if dpkg-deb -x "$DEB_PATH" "$TMP_DIR" 2>>"$LOG"; then
    SRC_DIR="$TMP_DIR/opt/HelloWorld-Launcher"
    if [ ! -d "$SRC_DIR" ]; then
      SRC_DIR="$TMP_DIR/opt/helloworld-launcher"
    fi
    if [ -d "$SRC_DIR" ]; then
      cp -af "$SRC_DIR/." "${currentDir}/"
      chmod +x "${currentExec}" 2>/dev/null || true
      SUCCESS=1
      echo "User-level files successfully updated in ${currentDir}" >> "$LOG"
    fi
  fi
  rm -rf "$TMP_DIR"
fi

# B) Si es instalación de sistema (/opt), usar elevación nativa pkexec (sin el centro de software):
if [ "$SUCCESS" -eq 0 ]; then
  echo "Installing system-wide package via pkexec..." >> "$LOG"
  if command -v pkexec >/dev/null 2>&1; then
    if pkexec dpkg -i "$DEB_PATH" >> "$LOG" 2>&1; then
      SUCCESS=1
      command -v notify-send >/dev/null 2>&1 && notify-send -a "HelloWorld Launcher" "Actualización completada" "HelloWorld Launcher se ha actualizado con éxito."
    else
      echo "pkexec failed or was cancelled." >> "$LOG"
      command -v notify-send >/dev/null 2>&1 && notify-send -u critical -a "HelloWorld Launcher" "Actualización no completada" "No se pudo instalar el paquete."
    fi
  elif command -v gksudo >/dev/null 2>&1; then
    gksudo -- dpkg -i "$DEB_PATH" && SUCCESS=1
  elif command -v kdesudo >/dev/null 2>&1; then
    kdesudo -- dpkg -i "$DEB_PATH" && SUCCESS=1
  else
    echo "Fallback to sudo in terminal/direct..." >> "$LOG"
    sudo dpkg -i "$DEB_PATH" >> "$LOG" 2>&1 && SUCCESS=1
  fi
fi

# C) Reabrir el launcher automáticamente
echo "Relaunching HelloWorld Launcher..." >> "$LOG"
if [ -x "${currentExec}" ]; then
  nohup "${currentExec}" >/dev/null 2>&1 &
elif command -v helloworld-launcher >/dev/null 2>&1; then
  nohup helloworld-launcher >/dev/null 2>&1 &
elif [ -f "/opt/HelloWorld-Launcher/helloworld-launcher" ]; then
  nohup "/opt/HelloWorld-Launcher/helloworld-launcher" >/dev/null 2>&1 &
fi

rm -f "$0"
`;

      fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });
      const child = spawn('bash', [scriptPath], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();

      setTimeout(() => {
        isQuitting = true;
        app.quit();
      }, 500);
      return { success: true };
    }

    // ── 2b. Linux: paquete RPM (.rpm) ────────────────────────────────────────
    if (targetExe && targetExe.toLowerCase().endsWith('.rpm')) {
      console.log('[launch-installer-and-quit] Preparing Linux rpm relay update script for:', targetExe);

      const isUserLevel = currentDir.startsWith(os.homedir()) && (() => {
        try {
          fs.accessSync(currentDir, fs.constants.W_OK);
          return true;
        } catch (_) {
          return false;
        }
      })();

      const canUserExtract = hasCommand('rpm2cpio') && hasCommand('cpio');
      if (isUserLevel ? (!canUserExtract && !hasCommand('rpm')) : !hasCommand('rpm')) {
        throw new Error('rpm/rpm2cpio is not available on this Linux distribution');
      }

      const scriptPath = path.join(app.getPath('temp'), `hwl-update-rpm-${Date.now()}.sh`);
      const scriptContent = `#!/usr/bin/env bash
OLD_PID=${currentPid}
RPM_PATH="${targetExe}"
LOG="/tmp/hwl_rpm_update.log"

echo "Waiting for PID $OLD_PID to exit..." > "$LOG"
while kill -0 $OLD_PID 2>/dev/null; do
  sleep 0.2
done

SUCCESS=0

# A) Si está instalado en espacio de usuario (sin sudo / root):
if [ "${isUserLevel ? '1' : '0'}" = "1" ]; then
  echo "Extracting at user level (no root required)..." >> "$LOG"
  TMP_DIR="/tmp/hwl_rpm_user_$$"
  mkdir -p "$TMP_DIR"
  if command -v rpm2cpio >/dev/null 2>&1 && command -v cpio >/dev/null 2>&1; then
    (cd "$TMP_DIR" && rpm2cpio "$RPM_PATH" | cpio -idmv >> "$LOG" 2>&1)
    SRC_DIR="$TMP_DIR/opt/HelloWorld-Launcher"
    if [ ! -d "$SRC_DIR" ]; then
      SRC_DIR="$TMP_DIR/opt/helloworld-launcher"
    fi
    if [ -d "$SRC_DIR" ]; then
      cp -af "$SRC_DIR/." "${currentDir}/"
      chmod +x "${currentExec}" 2>/dev/null || true
      SUCCESS=1
      echo "User-level files successfully updated in ${currentDir}" >> "$LOG"
    fi
  fi
  rm -rf "$TMP_DIR"
fi

# B) Si es instalación de sistema (/opt), usar elevación nativa pkexec:
if [ "$SUCCESS" -eq 0 ]; then
  echo "Installing system-wide package via pkexec..." >> "$LOG"
  if command -v pkexec >/dev/null 2>&1; then
    if pkexec rpm -Uvh --replacepkgs "$RPM_PATH" >> "$LOG" 2>&1; then
      SUCCESS=1
      command -v notify-send >/dev/null 2>&1 && notify-send -a "HelloWorld Launcher" "Actualización completada" "HelloWorld Launcher se ha actualizado con éxito."
    else
      echo "pkexec failed or was cancelled." >> "$LOG"
      command -v notify-send >/dev/null 2>&1 && notify-send -u critical -a "HelloWorld Launcher" "Actualización no completada" "No se pudo instalar el paquete RPM."
    fi
  elif command -v gksudo >/dev/null 2>&1; then
    gksudo -- rpm -Uvh --replacepkgs "$RPM_PATH" && SUCCESS=1
  elif command -v kdesudo >/dev/null 2>&1; then
    kdesudo -- rpm -Uvh --replacepkgs "$RPM_PATH" && SUCCESS=1
  else
    echo "Fallback to sudo in terminal/direct..." >> "$LOG"
    sudo rpm -Uvh --replacepkgs "$RPM_PATH" >> "$LOG" 2>&1 && SUCCESS=1
  fi
fi

# C) Reabrir el launcher automáticamente
echo "Relaunching HelloWorld Launcher..." >> "$LOG"
if [ -x "${currentExec}" ]; then
  nohup "${currentExec}" >/dev/null 2>&1 &
elif command -v helloworld-launcher >/dev/null 2>&1; then
  nohup helloworld-launcher >/dev/null 2>&1 &
elif [ -f "/opt/HelloWorld-Launcher/helloworld-launcher" ]; then
  nohup "/opt/HelloWorld-Launcher/helloworld-launcher" >/dev/null 2>&1 &
fi

rm -f "$0"
`;

      fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });
      const child = spawn('bash', [scriptPath], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();

      setTimeout(() => {
        isQuitting = true;
        app.quit();
      }, 500);
      return { success: true };
    }

    // ── 3. macOS: imagen de disco (.dmg) o comprimido (.zip) ────────────────
    if (targetExe && (targetExe.toLowerCase().endsWith('.dmg') || targetExe.toLowerCase().endsWith('.zip'))) {
      console.log('[launch-installer-and-quit] Preparing macOS relay update script for:', targetExe);

      let appBundlePath = '/Applications/HelloWorld-Launcher.app';
      if (currentExec.includes('.app/Contents/MacOS/')) {
        appBundlePath = currentExec.substring(0, currentExec.indexOf('.app/Contents/MacOS/') + 4);
      }

      const scriptPath = path.join(app.getPath('temp'), `hwl-update-mac-${Date.now()}.sh`);
      const scriptContent = `#!/usr/bin/env bash
OLD_PID=${currentPid}
TARGET_APP="${appBundlePath}"
INSTALLER="${targetExe}"
LOG="/tmp/hwl_mac_update.log"
TMP_DIR="/tmp/hwl_mac_staging_$$"

mkdir -p "$TMP_DIR"
echo "Waiting for PID $OLD_PID to exit..." > "$LOG"
while kill -0 $OLD_PID 2>/dev/null; do
  sleep 0.2
done

NEW_APP=""
if [[ "$INSTALLER" == *.dmg ]]; then
  MOUNT_DIR="$TMP_DIR/mount"
  mkdir -p "$MOUNT_DIR"
  echo "Mounting DMG silently: $INSTALLER" >> "$LOG"
  hdiutil attach "$INSTALLER" -nobrowse -readonly -mountpoint "$MOUNT_DIR" >> "$LOG" 2>&1
  if [ -d "$MOUNT_DIR/HelloWorld-Launcher.app" ]; then
    cp -R "$MOUNT_DIR/HelloWorld-Launcher.app" "$TMP_DIR/HelloWorld-Launcher.app"
    NEW_APP="$TMP_DIR/HelloWorld-Launcher.app"
  fi
  hdiutil detach "$MOUNT_DIR" -force >> "$LOG" 2>&1
elif [[ "$INSTALLER" == *.zip ]]; then
  echo "Unzipping macOS update: $INSTALLER" >> "$LOG"
  unzip -q -o "$INSTALLER" -d "$TMP_DIR" >> "$LOG" 2>&1
  if [ -d "$TMP_DIR/HelloWorld-Launcher.app" ]; then
    NEW_APP="$TMP_DIR/HelloWorld-Launcher.app"
  fi
fi

if [ -n "$NEW_APP" ] && [ -d "$NEW_APP" ]; then
  echo "Installing bundle into $TARGET_APP..." >> "$LOG"
  if [ -w "$TARGET_APP" ] || [ -w "$(dirname "$TARGET_APP")" ]; then
    echo "Direct copy (user has write permissions)" >> "$LOG"
    rm -rf "$TARGET_APP"
    cp -R "$NEW_APP" "$TARGET_APP"
  else
    echo "Elevating permissions via macOS osascript..." >> "$LOG"
    osascript -e "do shell script \\"rm -rf '$TARGET_APP' && cp -R '$NEW_APP' '$TARGET_APP'\\" with administrator privileges" >> "$LOG" 2>&1
  fi
  xattr -cr "$TARGET_APP" 2>/dev/null || true
  open -n "$TARGET_APP"
  echo "Relaunched $TARGET_APP successfully." >> "$LOG"
else
  echo "Extraction failed, reopening existing app..." >> "$LOG"
  open -n "$TARGET_APP"
fi

rm -rf "$TMP_DIR" "$0"
`;

      fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });
      const child = spawn('bash', [scriptPath], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();

      setTimeout(() => {
        isQuitting = true;
        app.quit();
      }, 500);
      return { success: true };
    }

    // ── 4. Windows (.exe / Setup o .zip pre-descargado) ──────────────────────
    const execDir = currentDir;

    if (!targetExe || !fs.existsSync(targetExe)) {
      targetExe = await findLocalInstallerPath(expectedSetupHash);
    }

    // Si aún no se encontró setup válido (no existe o hash difiere), asegurar descarga del setup.exe actualizado
    if (!targetExe || !fs.existsSync(targetExe)) {
      console.log('[launch-installer-and-quit] No valid local setup found. Calling ensureLocalInstaller...');
      const ensureRes = await ensureLocalInstaller({ expectedHash: expectedSetupHash, setupUrl, tag });
      if (ensureRes && ensureRes.exists && ensureRes.path) {
        targetExe = ensureRes.path;
      }
    }

    if (targetExe && fs.existsSync(targetExe)) {
      console.log('[launch-installer-and-quit] Executing Setup:', targetExe, 'with installPath:', execDir, 'updateFile:', updateFile);
      if (process.platform !== 'win32') {
        try { fs.chmodSync(targetExe, 0o755); } catch (_) {}
      }

      const args = [
        'update',
        `--install-path=${execDir}`,
        `--install-path-b64=${Buffer.from(execDir).toString('base64')}`
      ];
      if (updateFile && fs.existsSync(updateFile)) {
        args.push(`--update-file=${updateFile}`);
        args.push(`--update-file-b64=${Buffer.from(updateFile).toString('base64')}`);
      }
      args.push('--silent');

      const child = spawn(targetExe, args, {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();

      setTimeout(() => {
        isQuitting = true;
        app.quit();
      }, 500);

      return { success: true };
    }

    // Fallback Linux: Si no hay Setup ejecutable pero tenemos el .zip descargado, extraer via script bash
    if (process.platform === 'linux' && updateFile && fs.existsSync(updateFile) && (updateFile.toLowerCase().endsWith('.zip') || updateFile.toLowerCase().endsWith('.tar.gz'))) {
      console.log('[launch-installer-and-quit] Fallback Linux: updating directly from zip/tar via bash...');
      const scriptPath = path.join(app.getPath('temp'), `hwl-update-linux-${Date.now()}.sh`);
      const scriptContent = `#!/usr/bin/env bash
OLD_PID=${currentPid}
ARCHIVE="${updateFile}"
DEST_DIR="${execDir}"
LOG="/tmp/hwl_linux_zip_update.log"

echo "Waiting for PID $OLD_PID to exit..." > "$LOG"
while kill -0 $OLD_PID 2>/dev/null; do
  sleep 0.2
done

echo "Extracting archive $ARCHIVE into $DEST_DIR..." >> "$LOG"
if [[ "$ARCHIVE" == *.zip ]]; then
  if command -v unzip >/dev/null 2>&1; then
    unzip -q -o "$ARCHIVE" -d "$DEST_DIR" >> "$LOG" 2>&1
  elif command -v python3 >/dev/null 2>&1; then
    python3 -m zipfile -e "$ARCHIVE" "$DEST_DIR" >> "$LOG" 2>&1
  else
    echo "No unzip or python3 found to extract zip!" >> "$LOG"
  fi
elif [[ "$ARCHIVE" == *.tar.gz ]] || [[ "$ARCHIVE" == *.tgz ]]; then
  tar -xzf "$ARCHIVE" -C "$DEST_DIR" >> "$LOG" 2>&1
fi

chmod +x "${currentExec}" 2>/dev/null || true
echo "Relaunching ${currentExec}..." >> "$LOG"
nohup "${currentExec}" >/dev/null 2>&1 &

rm -f "$0"
`;
      fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });
      const child = spawn('bash', [scriptPath], { detached: true, stdio: 'ignore' });
      child.unref();

      setTimeout(() => {
        isQuitting = true;
        app.quit();
      }, 500);

      return { success: true };
    }

    // Fallback: Si no hay Setup ejecutable pero tenemos el .zip descargado, extraer via script PowerShell
    if (updateFile && fs.existsSync(updateFile) && updateFile.toLowerCase().endsWith('.zip')) {
      console.log('[launch-installer-and-quit] Fallback: updating directly from zip via PowerShell...');
      const scriptPath = path.join(app.getPath('temp'), `hwl-update-win-${Date.now()}.ps1`);
      const scriptContent = `
$pidToWait = ${currentPid}
while (Get-Process -Id $pidToWait -ErrorAction SilentlyContinue) {
  Start-Sleep -Milliseconds 200
}
Expand-Archive -Path "${updateFile}" -DestinationPath "${execDir}" -Force
Start-Process -FilePath "${path.join(execDir, 'HelloWorld-Launcher.exe')}"
Remove-Item -Path $PSCommandPath -Force
`;
      fs.writeFileSync(scriptPath, scriptContent);
      const child = spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', scriptPath], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();

      setTimeout(() => {
        isQuitting = true;
        app.quit();
      }, 500);

      return { success: true };
    }

    throw new Error('No setup executable or update file available');
  } catch (err) {
    isLaunchingInstaller = false;
    console.error('[launch-installer-and-quit] Error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('download-installer-file', async (event, downloadUrl) => {
  try {
    if (!downloadUrl) throw new Error('No download URL provided');

    // Si ya existe una descarga en curso de esta misma URL, reutilizar la promesa en vuelo
    if (activeInstallerDownloadPromise && activeInstallerDownloadUrl === downloadUrl) {
      console.log('[download-installer-file] Reusing in-flight download for:', downloadUrl);
      return await activeInstallerDownloadPromise;
    }

    const updatesDir = path.join(app.getPath('userData'), 'updates');
    if (!fs.existsSync(updatesDir)) {
      fs.mkdirSync(updatesDir, { recursive: true });
    }
    cleanOrphanedTmpFiles(updatesDir);

    let filename = process.platform === 'win32' ? 'helloworld-launcher-win.zip' : 'helloworld-launcher-update';
    try {
      const urlObj = new URL(downloadUrl);
      const parsedBase = path.basename(urlObj.pathname);
      if (parsedBase && (parsedBase.includes('.deb') || parsedBase.includes('.rpm') || parsedBase.includes('.bin') || parsedBase.includes('.dmg') || parsedBase.includes('.AppImage') || parsedBase.includes('.zip') || parsedBase.includes('.exe'))) {
        filename = parsedBase;
      } else if (process.platform === 'darwin') {
        filename = 'HelloWorld-Launcher.dmg';
      } else if (process.platform === 'linux') {
        filename = 'helloworld-launcher-linux-x64.zip';
      }
    } catch (_) {}

    const destPath = path.join(updatesDir, filename);
    const minSize = (process.platform === 'win32' && filename.endsWith('.zip')) ? (30 * 1024 * 1024) : (1024 * 1024);

    const onProgress = (pData) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('installer-download-progress', pData);
      }
    };

    activeInstallerDownloadUrl = downloadUrl;
    activeInstallerDownloadPromise = downloadFileDirectly(downloadUrl, destPath, { minSizeBytes: minSize, onProgress })
      .finally(() => {
        activeInstallerDownloadPromise = null;
        activeInstallerDownloadUrl = null;
      });

    return await activeInstallerDownloadPromise;
  } catch (err) {
    console.error('[download-installer-file] Final error:', err);
    return { success: false, error: err.message };
  }
});


// AutoUpdater Events
if (autoUpdater) {
  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdater] Checking for update...');
    if (mainWindow) mainWindow.webContents.send('updater-status', { status: 'checking' });
  })

  autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdater] Update available:', info);
    const userData = loadUserData();
    if (userData.last_notified_app_version !== info.version) {
      userData.last_notified_app_version = info.version;
      saveUserData(userData);
      if (mainWindow) mainWindow.webContents.send('updater-status', { status: 'available', info });
    } else {
      console.log(`[AutoUpdater] User already notified for version ${info.version}, skipping repeat notification.`);
    }
  })

  autoUpdater.on('update-not-available', (info) => {
    console.log('[AutoUpdater] Update not available');
    if (mainWindow) mainWindow.webContents.send('updater-status', { status: 'not-available', info });
  })

  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater] Error:', err);

    // Check if error is due to missing release/latest.yml (404)
    // GitHub returns 404 if no release exists or latest.yml is missing
    if (err.message && (err.message.includes("404") || err.message.includes("latest.yml"))) {
      console.log('[AutoUpdater] Update check failed (likely no release found). Continuing as normal.');
      if (mainWindow) mainWindow.webContents.send('updater-status', { status: 'not-available', info: { version: app.getVersion() } });
      return;
    }

    if (mainWindow) mainWindow.webContents.send('updater-status', { status: 'error', error: err.message });
  })

  autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    console.log(log_message);

    if (mainWindow) mainWindow.webContents.send('updater-status', {
      status: 'downloading',
      progress: progressObj
    });
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[AutoUpdater] Update downloaded');
    if (mainWindow) mainWindow.webContents.send('updater-status', { status: 'downloaded', info });
  })
}

ipcMain.handle('get-vanilla-versions', async () => {
  try {
    const userData = loadUserData();
    const showSnapshots = userData.show_snapshots;
    const showOld = userData.show_old;

    const response = await axios.get('https://launchermeta.mojang.com/mc/game/version_manifest.json', { timeout: 5000 });
    const data = response.data;

    // Return array of version ID strings, filtered by user settings
    return (data.versions || []).filter(v => {
      if (v.type === 'release') return true;
      if (v.type === 'snapshot' && showSnapshots) return true;
      if ((v.type === 'old_beta' || v.type === 'old_alpha') && showOld) return true;
      return false;
    }).map(v => v.id);
  } catch (err) {
    console.error('Error fetching vanilla versions:', err);
    return [];
  }
})

ipcMain.handle('get-forge-mc-versions', async () => {
  try {
    const response = await axios.get('https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json', { timeout: 5000 });
    const data = response.data;
    // Extract unique MC versions from promos
    const versions = Object.keys(data.promos || {})
      .map(key => key.split('-')[0])
      .filter((v, i, arr) => arr.indexOf(v) === i && v)
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    // Return array of version strings
    return versions;
  } catch (err) {
    console.error('Error fetching forge versions:', err);
    return [];
  }
})

function getMcVersionFromNeoForge(nfVersion) {
  if (nfVersion.startsWith('1.')) {
    return nfVersion.split('-')[0];
  }
  const parts = nfVersion.split('.');
  if (parts.length >= 2) {
    const major = parts[0];
    const minor = parts[1];
    const majorNum = parseInt(major, 10);

    if (major === '0') {
      // For snapshot / special versions like 0.25w14craftmine.3-beta
      return minor.split('-')[0];
    }

    if (majorNum >= 26) {
      // A partir de la versión 1.21.11, Minecraft oficial cambió su esquema de versiones a año.drop.patch (ej. 26.1, 26.1.2, 26.2).
      // El formato de NeoForge es año.drop.patch.build (ej. 26.1.2.78 o 26.2.0.8-beta)
      const patch = parts[2] || '0';
      return patch === '0' ? `${major}.${minor}` : `${major}.${minor}.${patch}`;
    } else {
      // Para versiones anteriores (1.20.x y 1.21.x hasta 1.21.11) donde Minecraft mantenía el prefijo "1." y NeoForge no (20.x, 21.x)
      return minor === '0' ? `1.${major}` : `1.${major}.${minor}`;
    }
  }
  return null;
}

async function getNeoForgeAllVersions() {
  try {
    const res = await axios.get('https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge', { timeout: 5000 });
    if (res.data && Array.isArray(res.data.versions)) {
      return res.data.versions;
    }
  } catch (e) {}
  try {
    const resXml = await axios.get('https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml', { timeout: 5000 });
    const matches = [...resXml.data.matchAll(/<version>(.*?)<\/version>/g)].map(m => m[1]);
    return matches;
  } catch (e) {
    console.error('Error fetching NeoForge versions:', e.message);
    return [];
  }
}

ipcMain.handle('get-neoforge-mc-versions', async () => {
  try {
    const allVersions = await getNeoForgeAllVersions();
    const mcVersions = allVersions
      .map(v => getMcVersionFromNeoForge(v))
      .filter((v, i, arr) => v && arr.indexOf(v) === i)
      .sort((a, b) => {
        const aParts = a.split('.').map(Number);
        const bParts = b.split('.').map(Number);
        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
          const aVal = aParts[i] || 0;
          const bVal = bParts[i] || 0;
          if (aVal !== bVal) return bVal - aVal;
        }
        return 0;
      });
    return mcVersions;
  } catch (err) {
    console.error('Error fetching neoforge versions:', err);
    return [];
  }
});

ipcMain.handle('get-fabric-mc-versions', async () => {
  try {
    const response = await axios.get('https://meta.fabricmc.net/v2/versions/game', { timeout: 5000 });
    const data = response.data;
    // Return array of version strings
    const versions = data.filter(v => v.stable).map(v => v.version);
    return versions;
  } catch (err) {
    console.error('Error fetching fabric versions:', err);
    return [];
  }
});

ipcMain.handle('get-loader-versions', async (e, { type, mc_version }) => {
  try {
    if (type === 'fabric') {
      const response = await axios.get(`https://meta.fabricmc.net/v2/versions/loader/${mc_version}`, { timeout: 5000 });
      const data = response.data;
      return data.map(v => v.loader.version);
    } else if (type === 'forge') {
      // Fetch Forge versions from the promotions file
      const response = await axios.get('https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json', { timeout: 5000 });
      const data = response.data;

      // Extract versions that match the requested MC version
      // Format in promos: "1.20.1-latest": "47.2.0", "1.20.1-recommended": "47.1.3"
      const versions = [];
      const promos = data.promos || {};

      for (const [key, value] of Object.entries(promos)) {
        // Check if this promo key starts with our MC version
        if (key.startsWith(mc_version + '-')) {
          // Add the Forge version (value) if not already in the list
          if (!versions.includes(value)) {
            versions.push(value);
          }
        }
      }

      // Sort versions in descending order (newest first)
      versions.sort((a, b) => {
        const aParts = a.split('.').map(Number);
        const bParts = b.split('.').map(Number);

        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
          const aVal = aParts[i] || 0;
          const bVal = bParts[i] || 0;
          if (aVal !== bVal) return bVal - aVal;
        }
        return 0;
      });

      return versions;
    } else if (type === 'neoforge') {
      const allVersions = await getNeoForgeAllVersions();
      const versions = allVersions.filter(v => getMcVersionFromNeoForge(v) === mc_version);
      versions.sort((a, b) => {
        const aParts = a.split(/[-.]/).map(x => parseInt(x, 10) || 0);
        const bParts = b.split(/[-.]/).map(x => parseInt(x, 10) || 0);
        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
          const aVal = aParts[i] || 0;
          const bVal = bParts[i] || 0;
          if (aVal !== bVal) return bVal - aVal;
        }
        return 0;
      });
      return versions;
    }
    return [];
  } catch (err) {
    console.error(`Error fetching ${type} loader versions:`, err);
    return [];
  }
})

// --- Auto-update for Loaders (Fabric, Forge, NeoForge) ---
const loaderUpdateCache = new Map();

async function getLatestLoaderVersion(type, mcVersion) {
  if (!type || type === 'vanilla' || type === 'optifine') return null;
  const cleanType = type.toLowerCase();
  const cacheKey = `${cleanType}:${mcVersion}`;

  const cached = loaderUpdateCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < 300000)) { // 5-min TTL cache
    return cached.version;
  }

  let latestVersion = null;
  try {
    if (cleanType === 'fabric') {
      const response = await axios.get(`https://meta.fabricmc.net/v2/versions/loader/${mcVersion}`, { timeout: 4000 });
      if (Array.isArray(response.data) && response.data.length > 0) {
        latestVersion = response.data[0]?.loader?.version || null;
      }
    } else if (cleanType === 'forge') {
      const response = await axios.get('https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json', { timeout: 4000 });
      const promos = response.data?.promos || {};
      if (promos[`${mcVersion}-recommended`]) {
        latestVersion = promos[`${mcVersion}-recommended`];
      } else if (promos[`${mcVersion}-latest`]) {
        latestVersion = promos[`${mcVersion}-latest`];
      } else {
        const versions = [];
        for (const [key, value] of Object.entries(promos)) {
          if (key.startsWith(mcVersion + '-')) {
            if (!versions.includes(value)) versions.push(value);
          }
        }
        if (versions.length > 0) {
          versions.sort((a, b) => {
            const aParts = a.split('.').map(Number);
            const bParts = b.split('.').map(Number);
            for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
              const aVal = aParts[i] || 0;
              const bVal = bParts[i] || 0;
              if (aVal !== bVal) return bVal - aVal;
            }
            return 0;
          });
          latestVersion = versions[0];
        }
      }
    } else if (cleanType === 'neoforge') {
      const allVersions = await getNeoForgeAllVersions();
      const versions = allVersions.filter(v => getMcVersionFromNeoForge(v) === mcVersion);
      if (versions.length > 0) {
        versions.sort((a, b) => {
          const aParts = a.split(/[-.]/).map(x => parseInt(x, 10) || 0);
          const bParts = b.split(/[-.]/).map(x => parseInt(x, 10) || 0);
          for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
            const aVal = aParts[i] || 0;
            const bVal = bParts[i] || 0;
            if (aVal !== bVal) return bVal - aVal;
          }
          return 0;
        });
        latestVersion = versions[0];
      }
    }
  } catch (err) {
    console.warn(`[getLatestLoaderVersion] Failed for ${cleanType} ${mcVersion}:`, err.message);
  }

  if (latestVersion) {
    loaderUpdateCache.set(cacheKey, { version: latestVersion, timestamp: Date.now() });
  }
  return latestVersion;
}

function isNewerLoader(latest, current) {
  if (!latest) return false;
  if (!current || current === 'unknown' || current === 'none') return true;
  if (latest === current) return false;

  const parseParts = (v) => String(v).split(/[-.+]/).map(p => {
    const n = parseInt(p, 10);
    return isNaN(n) ? p : n;
  });

  const aParts = parseParts(latest);
  const bParts = parseParts(current);
  const len = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < len; i++) {
    const a = aParts[i];
    const b = bParts[i];
    if (a === undefined) return false;
    if (b === undefined) return true;
    if (typeof a === 'number' && typeof b === 'number') {
      if (a !== b) return a > b;
    } else {
      const cmp = String(a).localeCompare(String(b));
      if (cmp !== 0) return cmp > 0;
    }
  }
  return false;
}

async function checkProfileLoaderUpdate(profile) {
  if (!profile || !profile.version) return null;
  const verInfo = versionUtils.parseVersionString(profile.version);
  if (!verInfo || verInfo.type === 'vanilla' || verInfo.type === 'optifine') {
    return null; // Vanilla and OptiFine do not auto-update loaders
  }

  const latestLoader = await getLatestLoaderVersion(verInfo.type, verInfo.mcVersion);
  if (!latestLoader) return null;

  if (isNewerLoader(latestLoader, verInfo.loaderVersion)) {
    const newVersion = `${verInfo.software} ${verInfo.mcVersion} (${latestLoader})`;
    console.log(`[LoaderUpdate] Update found for profile "${profile.name || profile.version}": ${verInfo.loaderVersion || 'none'} -> ${latestLoader}`);
    return {
      old_version: profile.version,
      new_version: newVersion,
      loader: verInfo.software,
      mcVersion: verInfo.mcVersion,
      oldLoaderVersion: verInfo.loaderVersion || 'unknown',
      newLoaderVersion: latestLoader
    };
  }
  return null;
}

ipcMain.handle('check-loader-update', async (e, profileId) => {
  try {
    const profilesData = profileManager.loadProfiles();
    const profile = profilesData?.profiles?.[profileId];
    if (!profile) return null;
    return await checkProfileLoaderUpdate(profile);
  } catch (err) {
    console.error('Error in check-loader-update handler:', err);
    return null;
  }
});

// --- Fabric Library Verification & Repair ---
// MCLC sometimes fails to download Fabric libraries silently (network timeouts, rate limits).
// These helpers verify all Fabric libraries exist and re-download missing/corrupt ones with retry.

function getFabricLibraryPath(mcDir, libraryName) {
  const parts = libraryName.split(':');
  if (parts.length < 3) return null;
  const [group, artifact, version] = parts;
  const classifier = parts[3] || null;
  const fileName = classifier
    ? `${artifact}-${version}-${classifier}.jar`
    : `${artifact}-${version}.jar`;
  const filePath = path.join(mcDir, 'libraries', group.replace(/\./g, path.sep), artifact, version, fileName);
  return { filePath, fileName, group, artifact, version };
}

function buildMavenUrl(baseUrl, group, artifact, version, fileName) {
  return `${baseUrl}${group.replace(/\./g, '/')}/${artifact}/${version}/${fileName}`;
}

function upgradeAsmInVersionJson(mcDir, versionName) {
  if (!versionName) return;
  const jsonPath = path.join(mcDir, 'versions', versionName, `${versionName}.json`);
  if (!fs.existsSync(jsonPath)) return;
  try {
    const profileJson = fs.readJsonSync(jsonPath);
    let modified = false;
    if (profileJson.libraries && Array.isArray(profileJson.libraries)) {
      for (const lib of profileJson.libraries) {
        if (lib.name && lib.name.startsWith('org.ow2.asm:')) {
          const parts = lib.name.split(':');
          // Upgrade ASM to 9.10.1 to support Java 25 / Class file major version 69
          if (parts[2] && parts[2] !== '9.10.1') {
            console.log(`[AsmFix] Upgrading ASM library in ${versionName} from ${lib.name} to 9.10.1 for Java 25 / MC 26.x support`);
            parts[2] = '9.10.1';
            lib.name = parts.join(':');
            lib.url = 'https://maven.fabricmc.net/';
            modified = true;
          }
        } else if (lib.name && lib.name.startsWith('net.fabricmc:sponge-mixin:')) {
          const parts = lib.name.split(':');
          // Upgrade sponge-mixin to 0.17.3+mixin.0.8.7 to fix LaunchClassLoader NoClassDefFoundError on Java 25
          if (parts[2] && parts[2] !== '0.17.3+mixin.0.8.7') {
            console.log(`[MixinFix] Upgrading sponge-mixin in ${versionName} from ${lib.name} to 0.17.3+mixin.0.8.7 for Java 25 support`);
            parts[2] = '0.17.3+mixin.0.8.7';
            lib.name = parts.join(':');
            lib.url = 'https://maven.fabricmc.net/';
            modified = true;
          }
        }
      }
    }
    if (modified) {
      fs.writeJsonSync(jsonPath, profileJson, { spaces: 2 });
    }
  } catch (err) {
    console.warn(`[AsmFix] Failed to check/upgrade ASM in ${versionName}:`, err.message);
  }
}

function verifyFabricLibraries(mcDir, fabricVersionName) {
  upgradeAsmInVersionJson(mcDir, fabricVersionName);
  const fabricJsonPath = path.join(mcDir, 'versions', fabricVersionName, `${fabricVersionName}.json`);
  if (!fs.existsSync(fabricJsonPath)) return { ok: false, missing: [], error: 'Fabric profile JSON not found' };

  let profileJson;
  try { profileJson = fs.readJsonSync(fabricJsonPath); } catch (e) { return { ok: false, missing: [], error: e.message }; }

  const missing = [];
  for (const lib of (profileJson.libraries || [])) {
    const info = getFabricLibraryPath(mcDir, lib.name);
    if (!info) continue;

    try {
      if (!fs.existsSync(info.filePath) || !isJarValid(info.filePath)) {
        missing.push({ ...info, url: lib.url, downloads: lib.downloads, name: lib.name });
      }
    } catch (e) {
      missing.push({ ...info, url: lib.url, downloads: lib.downloads, name: lib.name });
    }
  }

  return { ok: missing.length === 0, missing };
}

async function downloadMissingFabricLibraries(mcDir, fabricVersionName, onProgress) {
  const result = verifyFabricLibraries(mcDir, fabricVersionName);
  if (result.ok) {
    console.log('[FabricFix] All Fabric libraries verified OK.');
    return true;
  }
  if (result.error) {
    console.error(`[FabricFix] Verification error: ${result.error}`);
    return false;
  }

  console.log(`[FabricFix] Found ${result.missing.length} missing/corrupt libraries, downloading...`);
  let repaired = 0;

  for (let i = 0; i < result.missing.length; i++) {
    const lib = result.missing[i];

    // Determine download URL
    let url = null;
    if (lib.downloads && lib.downloads.artifact && lib.downloads.artifact.url) {
      url = lib.downloads.artifact.url;
    } else if (lib.url) {
      url = buildMavenUrl(lib.url, lib.group, lib.artifact, lib.version, lib.fileName);
    }

    if (!url) {
      console.warn(`[FabricFix] No download URL for ${lib.name}, skipping.`);
      continue;
    }

    fs.ensureDirSync(path.dirname(lib.filePath));

    let downloaded = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[FabricFix] Downloading ${lib.fileName} (attempt ${attempt}/3)...`);
        const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
        if (res.data && res.data.byteLength > 0) {
          fs.writeFileSync(lib.filePath, Buffer.from(res.data));
          console.log(`[FabricFix] Downloaded ${lib.fileName} (${res.data.byteLength} bytes)`);
          repaired++;
          downloaded = true;
          break;
        }
      } catch (err) {
        console.warn(`[FabricFix] Attempt ${attempt} failed for ${lib.fileName}: ${err.message}`);
        if (attempt < 3) await new Promise(r => setTimeout(r, 1500 * attempt));
      }
    }

    if (!downloaded) {
      console.error(`[FabricFix] FAILED to download ${lib.fileName} after 3 attempts`);
    }

    if (onProgress) {
      onProgress({
        type: 'version-install',
        task: `Verifying Fabric libraries (${i + 1}/${result.missing.length})...`,
        current: i + 1,
        total: result.missing.length
      });
    }
  }

  // Final verification
  const finalResult = verifyFabricLibraries(mcDir, fabricVersionName);
  if (!finalResult.ok) {
    console.error(`[FabricFix] Still missing ${finalResult.missing.length} libraries after repair: ${finalResult.missing.map(l => l.fileName).join(', ')}`);
  } else {
    console.log(`[FabricFix] All libraries repaired successfully (${repaired} fixed).`);
  }
  return finalResult.ok;
}

// --- Internal Reusable Version Installer ---
async function installVersionLogic(version_id, onProgress, onMessage, onDownloadComplete, onDownloadCancelled) {
  console.log('[installVersionLogic] Starting installation for:', version_id);

  try {
    const mcDir = paths.getMcDir();

    // Initialize download tracking
    const downloadInfo = {
      launcher: null,
      gameProcess: null,
      cancelled: false
    };
    activeDownloads.set(version_id, downloadInfo);

    // Send initial progress
    if (onProgress) onProgress({
      type: 'version-install',
      task: 'Preparing installation...',
      version: version_id,
      current: 0,
      total: 100
    });

    // Determine version type and components using universal versionUtils
    const verInfo = versionUtils.parseVersionString(version_id) || { type: 'vanilla', mcVersion: version_id, loaderVersion: null };
    let versionType = verInfo.type === 'vanilla' ? 'release' : verInfo.type;
    let mcVersion = verInfo.mcVersion;
    let loaderVersion = verInfo.loaderVersion;
    let customVersionId = version_id;

    if (verInfo.type === 'vanilla') {
      const versionLower = mcVersion.toLowerCase();
      if (versionLower.includes('snapshot') || versionLower.includes('pre') || versionLower.includes('rc') || /^\d+w\d+[a-z]$/.test(versionLower)) {
        versionType = 'snapshot';
      } else if (versionLower.includes('alpha') || versionLower.startsWith('a')) {
        versionType = 'old_alpha';
      } else if (versionLower.includes('beta') || versionLower.startsWith('b')) {
        versionType = 'old_beta';
      }
      customVersionId = mcVersion;
    }

    console.log(`[installVersionLogic] Type: ${versionType}, MC Version: ${mcVersion}, Loader: ${loaderVersion}, Full ID: ${version_id}`);

    // Pre-requisites for Modded loaders (Download JSON or Installer)
    if (versionType === 'fabric' && loaderVersion) {
      // Fabric: Download the profile JSON to the versions folder
      const fabricVersionName = `fabric-loader-${loaderVersion}-${mcVersion}`;
      const fabricDir = path.join(mcDir, 'versions', fabricVersionName);
      const fabricJsonPath = path.join(fabricDir, `${fabricVersionName}.json`);

      if (!fs.existsSync(fabricJsonPath)) {
        if (onProgress) onProgress({
          type: 'version-install', task: 'Downloading Fabric installation...', version: version_id, current: 5, total: 100
        });

        try {
          const res = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${mcVersion}/${loaderVersion}/profile/json`).catch(() => {
            throw new Error('Network error or no internet connection');
          });
          if (!res.ok) throw new Error(`Fabric API returned ${res.status}`);
          const profileJson = await res.json();
          fs.ensureDirSync(fabricDir);
          fs.writeJsonSync(fabricJsonPath, profileJson, { spaces: 2 });
          console.log(`[installVersionLogic] Saved Fabric profile JSON: ${fabricJsonPath}`);
          // Update customVersionId to match the downloaded JSON name so MCLC finds it
          customVersionId = fabricVersionName;
        } catch (err) {
          throw new Error(`Failed to download Fabric profile: ${err.message}`);
        }
      } else {
        customVersionId = fabricVersionName;
      }
    }

    let forgeInstallerPath = null;
    if (versionType === 'forge' && loaderVersion) {
      // Forge: Download the installer JAR to the .HWLauncher/temp location
      // MCLC requires the installer JAR for *every* launch for modern Forge.
      const forgeFileName = `forge-${mcVersion}-${loaderVersion}-installer.jar`;
      const tempForgeDir = path.join(mcDir, '.HWLauncher', 'temp');
      fs.ensureDirSync(tempForgeDir);
      forgeInstallerPath = path.join(tempForgeDir, forgeFileName);

      if (!fs.existsSync(forgeInstallerPath)) {
        if (onProgress) onProgress({
          type: 'version-install', task: 'Downloading Forge installer...', version: version_id, current: 5, total: 100
        });

        try {
          // Note: This relies on the standard forge maven path.
          const forgeUrl = `https://maven.minecraftforge.net/net/minecraftforge/forge/${mcVersion}-${loaderVersion}/forge-${mcVersion}-${loaderVersion}-installer.jar`;
          console.log(`[installVersionLogic] Downloading Forge from: ${forgeUrl}`);
          const res = await fetch(forgeUrl).catch(() => {
            throw new Error('Network error or no internet connection');
          });
          if (!res.ok) throw new Error(`Forge Maven returned ${res.status}`);
          const buffer = await res.arrayBuffer();
          fs.writeFileSync(forgeInstallerPath, Buffer.from(buffer));
          console.log(`[installVersionLogic] Saved Forge installer: ${forgeInstallerPath}`);
        } catch (err) {
          throw new Error(`Failed to download Forge installer: ${err.message}`);
        }
      }
    }

    let neoforgeInstallerPath = null;
    if (versionType === 'neoforge' && loaderVersion) {
      // NeoForge: Download the installer JAR to the .HWLauncher/temp location
      const neoforgeFileName = `neoforge-${loaderVersion}-installer.jar`;
      const tempNeoForgeDir = path.join(mcDir, '.HWLauncher', 'temp');
      fs.ensureDirSync(tempNeoForgeDir);
      neoforgeInstallerPath = path.join(tempNeoForgeDir, neoforgeFileName);

      if (!fs.existsSync(neoforgeInstallerPath)) {
        if (onProgress) onProgress({
          type: 'version-install', task: 'Downloading NeoForge installer...', version: version_id, current: 5, total: 100
        });

        try {
          const neoforgeUrl = `https://maven.neoforged.net/releases/net/neoforged/neoforge/${loaderVersion}/neoforge-${loaderVersion}-installer.jar`;
          console.log(`[installVersionLogic] Downloading NeoForge from: ${neoforgeUrl}`);
          const res = await fetch(neoforgeUrl).catch(() => {
            throw new Error('Network error or no internet connection');
          });
          if (!res.ok) throw new Error(`NeoForge Maven returned ${res.status}`);
          const buffer = await res.arrayBuffer();
          fs.writeFileSync(neoforgeInstallerPath, Buffer.from(buffer));
          console.log(`[installVersionLogic] Saved NeoForge installer: ${neoforgeInstallerPath}`);
        } catch (err) {
          throw new Error(`Failed to download NeoForge installer: ${err.message}`);
        }
      }
    }

    // Create a temporary launcher instance for downloading
    const { Client } = require('minecraft-launcher-core');
    const downloadLauncher = new Client();
    downloadInfo.launcher = downloadLauncher;
    let downloadProgress = 0;
    let downloadAssetProgressLogged = false;
    let downloadAssetCopyProgressLogged = false;

    downloadLauncher.on('progress', (progress) => {
      if (downloadInfo.cancelled) return;
      let percentage = progress.total
        ? Math.round((progress.task / progress.total) * 100)
        : Math.min(95, Math.round((++downloadProgress / 2500) * 100));
      let taskDescription = 'Downloading...';
      if (progress.type === 'assets') taskDescription = 'Downloading assets...';
      else if (progress.type === 'classes') taskDescription = 'Downloading libraries...';
      else if (progress.type === 'natives') taskDescription = 'Downloading natives...';

      if (progress.type === 'assets') {
        if (progress.task === 0) downloadAssetProgressLogged = false;
        if (!downloadAssetProgressLogged) {
          console.log(`[installVersionLogic] Downloading assets (${progress.total || 0} total)`);
          downloadAssetProgressLogged = true;
        }
      } else if (progress.type === 'assets-copy') {
        if (progress.task === 0) downloadAssetCopyProgressLogged = false;
        if (!downloadAssetCopyProgressLogged) {
          console.log(`[installVersionLogic] Copying legacy assets (${progress.total || 0} total)`);
          downloadAssetCopyProgressLogged = true;
        }
      } else {
        console.log(`[installVersionLogic] Progress: ${progress.type} - ${percentage}%`);
      }
      if (onProgress) onProgress({
        type: 'version-install', task: taskDescription, version: version_id,
        current: progress.task || downloadProgress,
        total: progress.total || 2500, percentage
      });
    });

    downloadLauncher.on('debug', (msg) => console.log('[Download Debug]', msg));
    downloadLauncher.on('data', (msg) => console.log('[Download Data]', msg));
    downloadLauncher.on('download-status', (e) => {
      if (e.type === 'error') {
        console.error('[Download Error]', e);
        if (!downloadInfo.cancelled && onMessage) onMessage(`Download Error: ${e.message || 'Unknown error'}`);
      }
    });

    let fabricJsonPathVar = null;
    if (versionType === 'fabric' && loaderVersion) {
      const fabricVersionName = `fabric-loader-${loaderVersion}-${mcVersion}`;
      fabricJsonPathVar = path.join(mcDir, 'versions', fabricVersionName, `${fabricVersionName}.json`);
    }

    // Set the version type correctly. MCLC needs 'release' for the base vanilla assets part!
    const resolvedVersionType = (versionType === 'forge' || versionType === 'fabric' || versionType === 'neoforge' || versionType === 'optifine') ? 'release' : versionType;

    const launchOptions = {
      authorization: { access_token: 'null', client_token: 'null', uuid: 'null', name: 'Installer', user_properties: {} },
      root: mcDir,
      version: { number: mcVersion, type: resolvedVersionType },
      memory: { max: '512M', min: '256M' },
      timeout: 10000,
      overrides: { maxSockets: 4 },
      customArgs: []
    };

    if (versionType === 'fabric') {
      launchOptions.version.custom = customVersionId;
      if (typeof fabricJsonPathVar !== 'undefined' && fabricJsonPathVar) launchOptions.overrides = { ...launchOptions.overrides, versionJson: fabricJsonPathVar };
    }

    // We only use MCLC to download the base vanilla assets/libraries.

    try {
      const jPath = await javaRuntime.getJavaPath(mcVersion, (progressObj) => {
        if (onProgress) onProgress(progressObj);
      });
      if (jPath !== 'java') {
        launchOptions.javaPath = jPath;
        console.log(`[installVersionLogic] Using auto-downloaded Java: ${jPath}`);
      }
    } catch (javaErr) {
      console.warn(`[installVersionLogic] Java runtime resolution failed: ${javaErr.message}`);
    }

    console.log('[installVersionLogic] Starting download with options:', launchOptions);

    if (downloadInfo.cancelled) {
      activeDownloads.delete(version_id);
      if (onDownloadCancelled) onDownloadCancelled({ version: version_id });
      return { success: false, message: 'Download cancelled', cancelled: true };
    }

    let gameProcess;
    try {
      // For Forge, MCLC will automatically extract and run the Forge wrapper during the launch resolution
      gameProcess = await downloadLauncher.launch(launchOptions);
      downloadInfo.gameProcess = gameProcess;
    } catch (err) {
      if (downloadInfo.cancelled) {
        activeDownloads.delete(version_id);
        if (onDownloadCancelled) onDownloadCancelled({ version: version_id });
        return { success: false, message: 'Download cancelled', cancelled: true };
      }
      throw err;
    }

    if (downloadInfo.cancelled) {
      if (gameProcess && gameProcess.pid) {
        try { process.kill(gameProcess.pid, 'SIGKILL'); } catch (err) { }
      }
      activeDownloads.delete(version_id);
      if (onDownloadCancelled) onDownloadCancelled({ version: version_id });
      return { success: false, message: 'Download cancelled', cancelled: true };
    }

    // Kill game process immediately — download and forge wrapper processing completed!
    if (gameProcess && gameProcess.pid) {
      console.log('[installVersionLogic] Download complete, terminating game process:', gameProcess.pid);
      setTimeout(() => {
        try {
          if (!downloadInfo.cancelled) {
            process.kill(gameProcess.pid);
            console.log('[installVersionLogic] Game process terminated');
          }
        } catch (err) {
          console.log('[installVersionLogic] Process already terminated or error:', err.message);
        }
      }, 1000);
    }

    await new Promise((resolve) => {
      downloadLauncher.on('close', () => {
        console.log('[installVersionLogic] Download process closed');
        resolve();
      });
      setTimeout(resolve, 5000);
    });

    if (versionType === 'forge' && forgeInstallerPath) {
      console.log('[installVersionLogic] Forge Phase 2: Running Forge installer permanently...');
      if (onProgress) onProgress({
        type: 'version-install', task: 'Running Forge installer (this creates the versions/ folder)...',
        version: version_id, current: 50, total: 100, percentage: 50
      });

      // Use the resolved Java path from MCLC logic if available, else 'java'
      const jPath = launchOptions.javaPath || 'java';

      await new Promise((resolve, reject) => {
        const { spawn } = require('child_process');
        const installerProcess = spawn(jPath, [
          '-jar', forgeInstallerPath,
          '--installClient'
        ], { cwd: mcDir, stdio: ['ignore', 'pipe', 'pipe'] });

        downloadInfo.gameProcess = installerProcess;

        installerProcess.stdout?.on('data', (data) => {
          const msg = data.toString().trim();
          if (msg) console.log('[Forge Installer]', msg);
        });
        installerProcess.stderr?.on('data', (data) => {
          const msg = data.toString().trim();
          if (msg) console.log('[Forge Installer ERR]', msg);
        });

        installerProcess.on('close', (code) => {
          console.log(`[Forge Installer] Exited with code ${code}`);
          if (downloadInfo.cancelled) { resolve(); return; }
          if (code === 0) {
            try { fs.removeSync(path.dirname(forgeInstallerPath)); } catch (e) { } // Cleanup temp folder
            resolve();
          } else {
            reject(new Error(`Forge installer failed with exit code ${code}`));
          }
        });

        installerProcess.on('error', (err) => {
          console.error('[Forge Installer] Spawn error:', err);
          reject(new Error(`Could not run Forge installer: ${err.message}`));
        });
      });
    }

    if (versionType === 'neoforge' && neoforgeInstallerPath) {
      console.log('[installVersionLogic] NeoForge Phase 2: Running NeoForge installer permanently...');
      if (onProgress) onProgress({
        type: 'version-install', task: 'Running NeoForge installer (this creates the versions/ folder)...',
        version: version_id, current: 50, total: 100, percentage: 50
      });

      const jPath = launchOptions.javaPath || 'java';

      await new Promise((resolve, reject) => {
        const { spawn } = require('child_process');
        const installerProcess = spawn(jPath, [
          '-jar', neoforgeInstallerPath,
          '--installClient'
        ], { cwd: mcDir, stdio: ['ignore', 'pipe', 'pipe'] });

        downloadInfo.gameProcess = installerProcess;

        installerProcess.stdout?.on('data', (data) => {
          const msg = data.toString().trim();
          if (msg) console.log('[NeoForge Installer]', msg);
        });
        installerProcess.stderr?.on('data', (data) => {
          const msg = data.toString().trim();
          if (msg) console.log('[NeoForge Installer ERR]', msg);
        });

        installerProcess.on('close', (code) => {
          console.log(`[NeoForge Installer] Exited with code ${code}`);
          if (downloadInfo.cancelled) { resolve(); return; }
          if (code === 0) {
            try { fs.removeSync(path.dirname(neoforgeInstallerPath)); } catch (e) { }
            resolve();
          } else {
            reject(new Error(`NeoForge installer failed with exit code ${code}`));
          }
        });

        installerProcess.on('error', (err) => {
          console.error('[NeoForge Installer] Spawn error:', err);
          reject(new Error(`Could not run NeoForge installer: ${err.message}`));
        });
      });
    }

    // ─── Fabric: Verify & repair libraries after MCLC download ───────────────
    if (versionType === 'fabric' && loaderVersion && !downloadInfo.cancelled) {
      const loaderVersionName = `fabric-loader-${loaderVersion}-${mcVersion}`;
      if (onProgress) onProgress({
        type: 'version-install', task: 'Verifying Fabric libraries...',
        version: version_id, current: 95, total: 100, percentage: 95
      });
      const libsOk = await downloadMissingFabricLibraries(mcDir, loaderVersionName, onProgress);
      if (!libsOk && onMessage) {
        onMessage('Warning: Some Fabric libraries could not be downloaded. The game may fail to start.');
      }
    }

    // ─── Shared completion logic ──────────────────────────────────────────────
    if (downloadInfo.cancelled || !activeDownloads.has(version_id)) {
      console.log('[installVersionLogic] Download was cancelled during completion phase.');
      return { success: false, message: 'Download cancelled', cancelled: true };
    }

    if (onProgress) onProgress({
      type: 'version-install', task: 'Installation complete!',
      version: version_id, current: 100, total: 100, percentage: 100
    });

    console.log('[installVersionLogic] Installation completed for:', version_id);
    activeDownloads.delete(version_id);

    // Notify frontend only after everything is truly done (avoid premature "Done" badges)
    if (onDownloadComplete) onDownloadComplete({ version: version_id });

    return { success: true, message: 'Version installed successfully' };

  } catch (error) {
    console.error('[installVersionLogic] Error:', error);
    activeDownloads.delete(version_id);
    if (onMessage) onMessage(`Installation failed: ${error.message}`);
    return { success: false, message: error.message };
  }
}

ipcMain.handle('install-version', async (e, version_id) => {
  return await installVersionLogic(
    version_id,
    (progress) => e.sender.send('download-progress', progress),
    (msg) => e.sender.send('info-message', msg),
    (data) => e.sender.send('download-complete', data),
    (data) => e.sender.send('download-cancelled', data)
  );
})

// Cancel download handler
ipcMain.handle('cancel-download', async (e, version_id) => {
  console.log('[cancel-download] Cancelling download for:', version_id);

  const downloadInfo = activeDownloads.get(version_id);
  if (!downloadInfo) {
    console.log('[cancel-download] No active download found for:', version_id);
    return { success: false, message: 'No active download found' };
  }

  // Mark as cancelled FIRST
  downloadInfo.cancelled = true;

  // Kill the game process immediately with SIGKILL
  if (downloadInfo.gameProcess && downloadInfo.gameProcess.pid) {
    try {
      // Use SIGKILL for immediate termination
      process.kill(downloadInfo.gameProcess.pid, 'SIGKILL');
      console.log('[cancel-download] Killed game process with SIGKILL:', downloadInfo.gameProcess.pid);
    } catch (err) {
      console.log('[cancel-download] Error killing process:', err.message);
    }
  }

  // Try to remove all event listeners from the launcher
  if (downloadInfo.launcher) {
    try {
      downloadInfo.launcher.removeAllListeners();
      console.log('[cancel-download] Removed all launcher listeners');
    } catch (err) {
      console.log('[cancel-download] Error removing listeners:', err.message);
    }
  }

  // Clean up
  activeDownloads.delete(version_id);

  // Notify UI immediately
  e.sender.send('download-cancelled', { version: version_id });

  console.log('[cancel-download] Download cancelled successfully');
  return { success: true, message: 'Download cancelled' };
})

ipcMain.handle('get-profile-images', async () => {
  try {
    const imgDir = paths.getProfilesImgDir();
    if (!fs.existsSync(imgDir)) {
      return [];
    }
    const files = fs.readdirSync(imgDir);
    return files.filter(f => f.endsWith('.png'));
  } catch (err) {
    console.error('Error getting profile images:', err);
    return [];
  }
})

ipcMain.handle('select-folder', async (e, currentPath) => {
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    defaultPath: currentPath || app.getPath('home')
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
})

ipcMain.handle('select-file', async (e, currentPath, filters) => {
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    defaultPath: currentPath || app.getPath('home'),
    filters: filters || [
      { name: 'Executables', extensions: ['exe', 'bat', 'cmd', 'sh', '*'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
})

ipcMain.handle('open-logs', async () => {
  const mcDir = paths.getMcDir();
  const logsDir = path.join(mcDir, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.ensureDirSync(logsDir);
  }
  await shell.openPath(logsDir);
  return { success: true };
})

ipcMain.handle('get-skin-data', async () => {
  try {
    const userData = loadUserData();

    if (userData.account_type === 'helloworld') {
      return {
        skin: userData.last_avatar_url || null,
        cape: null,
        variant: 'classic'
      };
    }

    // Priority 2: Return Mojang skin if logged in via Microsoft
    if (userData.account_type === 'microsoft' && userData.last_skin_url) {
      return {
        skin: userData.last_skin_url,
        cape: null, // Capes aren't easily cached right now
        variant: userData.last_skin_variant || 'classic'
      };
    }

    // Priority 3: Default head via mc-heads.net if we have a username
    if (userData.username) {
      return {
        skin: `https://mc-heads.net/skin/${userData.username}`,
        cape: null,
        variant: 'classic'
      };
    }
  } catch (e) {
    console.error("[IPC] Error getting skin data:", e);
  }

  return { skin: null, cape: null, variant: 'classic' };
})

ipcMain.handle('get-user-capes', async () => {
  try {
    const userData = loadUserData();

    const processCapeList = async (capes) => {
      const processedCapes = [];
      for (const cape of capes) {
        if (cape.url) {
          try {
            const response = await fetch(cape.url);
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const base64 = "data:image/png;base64," + buffer.toString('base64');
              processedCapes.push({ id: cape.id, name: cape.alias || cape.id, base64 });
            }
          } catch (err) {
            console.error(`Failed to load cape ${cape.alias}:`, err);
          }
        }
      }
      return processedCapes;
    };

    // For Microsoft accounts, fetch capes from Mojang
    if (userData.account_type === 'microsoft') {
      // Step 1: Try cached mc_token first (avoids triggering Xbox rate limits)
      if (userData.mc_token) {
        try {
          const profileRes = await axios.get('https://api.minecraftservices.com/minecraft/profile', {
            headers: { 'Authorization': `Bearer ${userData.mc_token}` }
          });
          if (profileRes.data && profileRes.data.capes) {
            return { success: true, capes: await processCapeList(profileRes.data.capes) };
          }
          return { success: true, capes: [] };
        } catch (profileErr) {
          const status = profileErr.response?.status;
          if (status === 429) {
            console.warn("[Capes] Rate limited by Mojang, returning empty capes.");
            return { success: true, capes: [] };
          }
          if (status !== 401) {
            console.error("[Capes] Error fetching capes (cached token):", profileErr.message);
            return { success: true, capes: [] };
          }
          // 401 only: fall through to full refresh below
          console.log("[Capes] Cached mc_token expired, refreshing session...");
        }
      }

      // Step 2: Full refresh via msmc (only when token is missing or expired)
      if (userData.msmc_auth) {
        try {
          const refreshResult = await refreshMicrosoftSession(userData);
          if (refreshResult.success && refreshResult.access_token) {
            const profileRes = await axios.get('https://api.minecraftservices.com/minecraft/profile', {
              headers: { 'Authorization': `Bearer ${refreshResult.access_token}` }
            });
            if (profileRes.data && profileRes.data.capes) {
              return { success: true, capes: await processCapeList(profileRes.data.capes) };
            }
          }
        } catch (e) {
          console.error("Error fetching Microsoft capes:", e);
        }
      }
    }

    // For HelloWorld accounts, fetch from ApiClient
    if (userData.account_type === 'helloworld') {
      const auth = await getSocialAuth();
      if (auth && auth.uid) {
        try {
          if (ApiClient && ApiClient.users && typeof ApiClient.users.getProfile === 'function') {
            const res = await ApiClient.users.getProfile(auth.uid);
            if (res && res.success && res.user && res.user.capeBase64) {
              return { success: true, capes: [{ id: 'default', name: 'Default Cape', base64: res.user.capeBase64 }] };
            }
          }
        } catch (e) {
          console.error("Error fetching capes:", e);
        }
      }
    }

    return { success: true, capes: [] };
  } catch (e) {
    console.error("Error getting user capes:", e);
    return { success: false, capes: [] };
  }
})

const skinManager = require('./src/handlers/skins.js');

ipcMain.handle('get-skin-packs', async () => {
  try {
    return skinManager.getSkinPacks();
  } catch (e) {
    return { packs: {}, active_pack: null };
  }
})

ipcMain.handle('create-skin-pack', async (e, data) => {
  try {
    const res = await skinManager.createSkinPack(
      data.name,
      data.skin_base64,
      data.skin_model,
      data.cape_id,
      data.cape_base64,
      data.cape_alias
    );
    return res;
  } catch (e) {
    return { success: false, error: e.message };
  }
})

ipcMain.handle('edit-skin-pack', async (e, data) => {
  try {
    const res = await skinManager.editSkinPack(
      data.pack_id,
      data.name,
      data.skin_base64,
      data.skin_model,
      data.cape_id,
      data.cape_base64,
      data.cape_alias
    );
    return res;
  } catch (e) {
    return { success: false, error: e.message };
  }
})

ipcMain.handle('delete-skin-pack', async (e, id) => {
  try {
    const res = await skinManager.deleteSkinPack(id);
    return res;
  } catch (e) {
    return { success: false, error: e.message };
  }
})

ipcMain.handle('activate-skin-pack', async (e, id) => {
  try {
    const userData = loadUserData();
    let token = null;

    if (userData.account_type === 'microsoft' && userData.msmc_auth) {
      const refreshResult = await refreshMicrosoftSession(userData);
      if (refreshResult.success) {
        token = refreshResult.access_token;
      }
    }

    const res = await skinManager.activateSkinPack(id, token);

    // Also update UI representation if we're a helloworld user 
    // or if we just want to update local cache
    if (res.success) {
      const packData = skinManager.getSkinPacks().packs[id];
      if (packData) {
        const newData = loadUserData();
        newData.last_skin_url = packData.skin_preview;
        newData.last_skin_variant = packData.skin_model;
        newData.last_cape_url = packData.cape_preview;
        saveUserData(newData);

        // Notify UI
        if (mainWindow) {
          mainWindow.webContents.send('login-success', {
            name: newData.username,
            id: newData.uuid,
            avatar_url: newData.last_avatar_url,
            skin: [],
            cape: []
          });
        }
      }
    }

    return res;
  } catch (e) {
    return { success: false, error: e.message };
  }
})

ipcMain.handle('info', async (e, message) => {
  dialog.showMessageBox(mainWindow, { type: 'info', title: 'Info', message });
})

ipcMain.handle('error', async (e, message) => {
  dialog.showMessageBox(mainWindow, { type: 'error', title: 'Error', message });
})

ipcMain.handle('confirm', async (e, message) => {
  const res = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    buttons: ['Yes', 'No'],
    title: 'Confirm',
    message
  });
  return res.response === 0;
})



ipcMain.handle('save-version-settings', async (e, showSnapshots, showOld) => {
  const data = loadUserData();
  data.show_snapshots = showSnapshots;
  data.show_old = showOld;
  saveUserData(data);
  return { success: true };
})

ipcMain.handle('save-app-settings', async (e, enableTransitions, hwAccel, privacyMode, reopenOnGameClose) => {
  const data = loadUserData();
  // hwAccel needs restart, enableTransitions is instant
  data.enable_transitions = enableTransitions !== false;
  data.hw_accel = hwAccel !== false;
  data.privacy_mode = privacyMode === true;
  if (reopenOnGameClose !== undefined) {
    data.reopen_on_game_close = reopenOnGameClose !== false;
  }
  saveUserData(data);

  if (process.platform === 'win32') {
    applyGpuPreference(process.execPath, data.hw_accel);
    registerAllKnownJavaRuntimes(data.hw_accel);
  }

  return { success: true };
})

ipcMain.handle('maximize-launcher', async () => {
  maximizeAndFocusLauncher();
  return { success: true };
})

ipcMain.handle('save-addons-per-page', async (e, count) => {
  const data = loadUserData();
  data.addons_per_page = parseInt(count) || 20;
  saveUserData(data);
  return { success: true };
})

ipcMain.handle('save-dev-mode', async (e, enabled) => {
  const data = loadUserData();
  data.dev_mode = enabled;
  saveUserData(data);

  return { success: true };
})

ipcMain.handle('check-review-reminder', async () => {
  const data = loadUserData();

  // Initialize or increment launch count
  if (!data.launch_count) data.launch_count = 0;
  data.launch_count++;

  saveUserData(data);

  if (data.has_reviewed || data.never_review) {
    return false;
  }

  // Show reminder on 5th launch, and if dismissed with 'later', remind every 5 launches
  const lastRemind = data.last_review_remind_launch || 0;
  if (data.launch_count >= 5 && (lastRemind === 0 || (data.launch_count - lastRemind >= 5))) {
    return true;
  }

  return false;
})

ipcMain.handle('get-onboarding-status', async () => {
  const data = loadUserData();
  // Show if NOT completed
  return { showOnboarding: !data.onboarding_completed };
})

ipcMain.handle('complete-onboarding', async () => {
  const data = loadUserData();
  data.onboarding_completed = true;
  saveUserData(data);
  return { success: true };
})

ipcMain.handle('mark-review-action', async (e, action) => {
  const data = loadUserData();
  if (action === 'reviewed') {
    data.has_reviewed = true;
  } else if (action === 'never' || action === 'dismissed') {
    data.never_review = true;
    data.has_reviewed = true;
  } else if (action === 'later') {
    data.last_review_remind_launch = data.launch_count || 5;
  }
  saveUserData(data);
  return { success: true };
})

ipcMain.handle('open-url', async (e, url) => {
  shell.openExternal(url);
  return { success: true };
})

ipcMain.handle('ms-write-verified', async (e, emailKey, email, username, uuid, firebaseUid, firebaseRefreshToken) => {
  try {
    // Store Firebase Auth credentials for social features
    const userData = loadUserData();
    userData.firebase_ms_uid = firebaseUid;
    userData.firebase_ms_refresh_token = firebaseRefreshToken;

    // Check if this MS user has a custom chosen profile avatar in backend
    if (firebaseUid && !userData.last_avatar_url) {
      try {
        if (ApiClient && ApiClient.users && typeof ApiClient.users.getProfile === 'function') {
          const msProf = await ApiClient.users.getProfile(firebaseUid);
          if (msProf && msProf.user) {
            const av = msProf.user.avatarUrl || msProf.user.avatar_url || msProf.user.avatarBase64;
            if (av && !av.includes('textures.minecraft.net') && !av.includes('ui-avatars.com') && !av.startsWith('data:image')) {
              userData.last_avatar_url = av;
            }
          }
        }
      } catch (_) {}
    }

    saveUserData(userData);
    try {
      addOrUpdateSavedAccount(userData);
    } catch (saErr) { console.warn('[SavedAccounts] Could not persist MS verification:', saErr.message); }

    // Primary: Cloudflare D1 Backend
    try {
      if (ApiClient && ApiClient.users && typeof ApiClient.users.verifyMicrosoft === 'function') {
        await ApiClient.users.verifyMicrosoft({ email, username, uuid });
      }
    } catch (cfErr) {
      console.warn('[MS Verify] Cloudflare verify error:', cfErr.message);
    }

    console.log('[MS Verify] Microsoft verified status recorded in Cloudflare D1 for:', email);
    return { success: true };
  } catch (err) {
    console.warn('[MS Verify] Failed to write:', err.message);
    return { success: false, error: err.message };
  }
})

/**
 * Helper to refresh Microsoft Session and return valid auth tokens
 */
async function refreshMicrosoftSession(userData, force = false) {
  if (userData.account_type !== 'microsoft' || !userData.msmc_auth) {
    return {
      success: false,
      access_token: "null",
      client_token: "null",
      uuid: "null",
      name: userData.username || "Steve"
    };
  }

  // Use cached token if refreshed within the last 1 hour (3600000 ms) to speed up game launch
  if (!force && userData.mc_token && userData.uuid && userData.last_refresh_time && (Date.now() - userData.last_refresh_time < 3600000)) {
    console.log("[Auth] Using cached Microsoft session (fast launch)");
    return {
      success: true,
      access_token: userData.mc_token,
      client_token: userData.uuid,
      uuid: userData.uuid,
      name: userData.username
    };
  }

  try {
    console.log("[Auth] Auto-refreshing Microsoft session...");
    const authManager = new msmc.Auth("select_account");
    const xboxManager = await authManager.refresh(userData.msmc_auth);
    const mcObj = await xboxManager.getMinecraft();

    if (mcObj && mcObj.profile) {
      userData.username = mcObj.profile.name;
      userData.uuid = mcObj.profile.id;
      userData.mc_token = mcObj.mcToken;
      userData.msmc_auth = xboxManager.save();
      userData.last_refresh_time = Date.now();

      // Save skin URL if available
      if (mcObj.profile.skins && mcObj.profile.skins.length > 0) {
        userData.last_skin_url = mcObj.profile.skins[0].url;
        userData.last_skin_variant = mcObj.profile.skins[0].variant || 'classic';
      }

      saveUserData(userData);
      try {
        addOrUpdateSavedAccount(userData);
      } catch (saErr) {}
      console.log("[Auth] Token successfully refreshed!");

      return {
        success: true,
        access_token: userData.mc_token,
        client_token: userData.uuid,
        uuid: userData.uuid,
        name: userData.username,
        profile: mcObj.profile
      };
    }
    throw new Error("Installation not found after refresh");
  } catch (err) {
    console.warn("[Auth] Failed to auto-refresh token.", err.message);

    // Detect Mojang/Xbox rate limiting (429) — never clear credentials for this
    const isRateLimited = (err.response && err.response.status === 429) ||
      (err.status === 429) ||
      (err.ts && typeof err.ts === 'string' && err.ts.includes('error.auth'));
    if (isRateLimited) {
      console.warn("[Auth] Rate limited (429). Not clearing credentials.");
      return {
        success: false,
        rateLimited: true,
        access_token: userData.mc_token || "null",
        client_token: userData.uuid || "null",
        uuid: userData.uuid || "null",
        name: userData.username || "Steve"
      };
    }

    // If it's a definitive auth error (not network), clear the tokens
    const isAuthError = err.message && (
      err.message.includes("invalid_grant") ||
      err.message.includes("expired") ||
      err.message.includes("Profile not found")
    );

    if (isAuthError) {
      console.log("[Auth] Definitive auth failure. Clearing cached credentials.");
      userData.mc_token = "";
      userData.msmc_auth = "";
      userData.uuid = "";
      saveUserData(userData);

      return {
        success: false,
        expired: true,
        error: err.message,
        access_token: "null",
        client_token: "null",
        uuid: "null",
        name: userData.username || "Steve"
      };
    }

    return {
      success: false,
      error: err.message,
      access_token: userData.mc_token || "null",
      client_token: userData.uuid || "null",
      uuid: userData.uuid || "null",
      name: userData.username || "Steve"
    };
  }
}

let currentGameProcess = null;
let isLaunchCancelled = false;
let isStartingGame = false;

ipcMain.handle('is-minecraft-running', () => {
  return isMinecraftRunning();
});

ipcMain.handle('get-minecraft-instances', () => {
  return getRunningMinecraftCount();
});

// Lock to prevent race conditions when updating profile metadata
const profileUpdateLocks = new Map();

ipcMain.handle('launch-profile', async (e, { profileId, nickname, force, serverIp, saveServer }) => {
  // Yield to allow the Windows message pump and renderer to paint the spinner and cancel button
  await new Promise(resolve => setTimeout(resolve, 20));
  console.log(`[Launch] launch-profile called with profileId: ${profileId}, force: ${force}, serverIp: ${serverIp || 'none'}, saveServer: ${saveServer}`);
  if (isMinecraftRunning() && !force) {
    console.log("[Launch] Minecraft is already running and force is false.");
    return { status: 'already_running' };
  }
  if (isStartingGame && !force) {
    console.log("[Launch] A game launch is already in progress.");
    return { status: 'already_launching' };
  }
  isStartingGame = true;
  try {
    isLaunchCancelled = false;
    if (launcher) launcher._cancelled = false;
    if (launcher && launcher.handler) launcher.handler._cancelled = false;
    if (activeGameProcesses.size === 0) {
      if (streakSessionTimer) {
        clearTimeout(streakSessionTimer);
        streakSessionTimer = null;
      }
      streakCountedThisRun = false;
      gameStartTime = null;
    }

    const profiles = profileManager.loadProfiles().profiles;
    const profile = profiles[profileId];
    if (!profile) {
      isStartingGame = false;
      return { status: 'error', error: "Profile not found" };
    }

    const verInfo = versionUtils.parseVersionString(profile.version) || { type: 'vanilla', mcVersion: profile.version, loaderVersion: null };
    const isForge = verInfo.type === 'forge';
    const isFabric = verInfo.type === 'fabric';
    const isNeoForge = verInfo.type === 'neoforge';
    const isOptiFine = verInfo.type === 'optifine';
    const isModded = isForge || isFabric || isNeoForge || isOptiFine;

    let mcVersion = verInfo.mcVersion;
    const actualMcDir = paths.getMcDir();

    // 0. Synchronization Check (Version + Addons)
    let isMissingVersion = false;
    let expectedVersionDirName = profile.version;

    // Check which directory actually exists in versions/
    const possibleDirs = versionUtils.getPossibleDirNames(profile.version);
    const versionsFolderPath = path.join(actualMcDir, 'versions');
    let foundDir = null;
    for (const dirName of possibleDirs) {
      if (fs.existsSync(path.join(versionsFolderPath, dirName))) {
        foundDir = dirName;
        break;
      }
    }
    if (foundDir) {
      expectedVersionDirName = foundDir;
    } else if (possibleDirs.length > 0) {
      expectedVersionDirName = possibleDirs[0];
    }

    const versionPath = path.join(actualMcDir, 'versions', expectedVersionDirName);
    const versionJsonFile = path.join(versionPath, `${expectedVersionDirName}.json`);
    const versionJarFile = path.join(versionPath, `${expectedVersionDirName}.jar`);
    console.log(`[Launch] Checking for version at: ${versionPath}`);
    console.log(`[Launch] Expected dir name: ${expectedVersionDirName}, Profile version: ${profile.version}`);

    let corruptedFilesCount = 0;
    if (!fs.existsSync(versionPath)) {
      isMissingVersion = true;
      console.log(`[Launch] Version directory not found, marking as missing`);
    } else if (!fs.existsSync(versionJsonFile) || fs.statSync(versionJsonFile).size === 0) {
      isMissingVersion = true;
      console.log(`[Launch] Version JSON missing or 0 bytes, marking as missing for re-sync`);
    } else if (fs.existsSync(versionJarFile) && !isJarValid(versionJarFile)) {
      console.log(`[Launch] Version JAR corrupted (invalid header or 0 bytes), deleting and marking for re-sync`);
      try { fs.unlinkSync(versionJarFile); } catch (_) {}
      isMissingVersion = true;
      corruptedFilesCount++;
    }

    // Inspect libraries from version JSON for corruption (0-byte, truncated, or HTML blocked files)
    try {
      if (fs.existsSync(versionJsonFile)) {
        const vJson = fs.readJsonSync(versionJsonFile);
        if (vJson && Array.isArray(vJson.libraries)) {
          const librariesDir = path.join(actualMcDir, 'libraries');
          for (const lib of vJson.libraries) {
            let relPath = null;
            let expectedSize = null;
            if (lib.downloads && lib.downloads.artifact && lib.downloads.artifact.path) {
              relPath = lib.downloads.artifact.path;
              expectedSize = lib.downloads.artifact.size;
            } else if (lib.name) {
              const parts = lib.name.split(':');
              if (parts.length >= 3) {
                const groupPath = parts[0].replace(/\./g, path.sep);
                const artifact = parts[1];
                const version = parts[2];
                const classifier = parts[3] ? '-' + parts[3] : '';
                relPath = path.join(groupPath, artifact, version, `${artifact}-${version}${classifier}.jar`);
              }
            }
            if (relPath) {
              const fullLibPath = path.join(librariesDir, relPath);
              if (fs.existsSync(fullLibPath) && fullLibPath.endsWith('.jar') && !isJarValid(fullLibPath, expectedSize)) {
                console.log(`[Launch] Corrupted library detected: ${path.basename(fullLibPath)}, deleting...`);
                try {
                  fs.unlinkSync(fullLibPath);
                  corruptedFilesCount++;
                } catch (_) {}
              }
            }
          }
        }
      }
    } catch (checkLibErr) {
      console.warn('[Launch] Error checking library integrity:', checkLibErr.message);
    }

    if (corruptedFilesCount > 0 && mainWindow) {
      mainWindow.webContents.send('corrupted-files-detected', { count: corruptedFilesCount });
    }

    let missingAddons = [];
    if (profile.addons && profile.addons.length > 0) {
      const profileDir = profile.directory || actualMcDir;
      for (const addon of profile.addons) {
        // Skip disabled addons — they are intentionally off
        if (addon.state === 'disabled' || (addon.state !== 'enabled' && addon.enabled === false)) continue;
        if (addon.type === 'datapack') continue; // Skip datapacks since they require world
        if (addon.type === 'modpack') continue; // Skip modpacks since their contents were already unpacked

        let targetDir = path.join(profileDir, 'mods'); // default
        if (addon.type === 'resourcepack') targetDir = path.join(profileDir, 'resourcepacks');
        if (addon.type === 'shader') targetDir = path.join(profileDir, 'shaderpacks');

        const addonPath = path.join(targetDir, addon.filename);
        // Also check for alternate filename (with/without .disabled)
        const altFilename = addon.filename.endsWith('.disabled')
          ? addon.filename.replace(/\.disabled$/, '')
          : addon.filename + '.disabled';
        const altPath = path.join(targetDir, altFilename);

        if (!fs.existsSync(addonPath) && !fs.existsSync(altPath)) {
          missingAddons.push(addon);
        }
      }
    }

    // Check for compatible updates for Modrinth addons (mods, resourcepacks, shaders)
    let updatedAddons = [];
    if (!isLaunchCancelled && profile.addons && profile.addons.length > 0) {
      try {
        const profileDir = profile.directory || actualMcDir;
        // Don't check addons that are already determined to be missing
        const addonsToCheck = profile.addons.filter(a =>
          !missingAddons.some(m => m.project_id && m.project_id === a.project_id)
        );
        updatedAddons = await modManager.checkAddonUpdates({
          addons: addonsToCheck,
          targetMcVersion: mcVersion,
          targetLoader: verInfo ? verInfo.type : 'vanilla',
          profileDir
        });
      } catch (updateErr) {
        console.warn('[Launch] Warning: failed to check addon updates:', updateErr.message);
      }
    }

    // Check for compatible loader updates (Fabric, Forge, NeoForge)
    let updatedLoader = null;
    if (!isLaunchCancelled && verInfo && verInfo.type !== 'vanilla' && verInfo.type !== 'optifine') {
      try {
        updatedLoader = await checkProfileLoaderUpdate(profile);
      } catch (loaderErr) {
        console.warn('[Launch] Warning: failed to check loader update:', loaderErr.message);
      }
    }

    if (isLaunchCancelled) {
      console.log("[Launch] Launch cancelled during sync check.");
      isStartingGame = false;
      return { status: 'cancelled' };
    }

    if (isMissingVersion || missingAddons.length > 0 || (updatedAddons && updatedAddons.length > 0) || updatedLoader) {
      console.log(`[Launch] Missing files or updates detected. isMissingVersion: ${isMissingVersion}, missingAddons: ${missingAddons.length}, updatedAddons: ${updatedAddons ? updatedAddons.length : 0}, updatedLoader: ${updatedLoader ? updatedLoader.new_version : null}`);
      isStartingGame = false;

      // Update profile.version in profiles.json if loader was updated so profile permanently tracks the latest loader version
      if (updatedLoader && profileId) {
        try {
          profileManager.updateProfileVersion(profileId, updatedLoader.new_version);
          profile.version = updatedLoader.new_version;
        } catch (e) {
          console.warn('[Launch] Could not auto-update profile version in JSON:', e);
        }
      }

      return {
        status: 'missing_files',
        missing_version: isMissingVersion,
        version_id: updatedLoader ? updatedLoader.new_version : profile.version,
        updated_loader: updatedLoader,
        missing_addons: missingAddons,
        updated_addons: updatedAddons || [],
        corrupted_detected: corruptedFilesCount > 0
      };
    }

    await new Promise(resolve => setTimeout(resolve, 10));
    if (isLaunchCancelled) {
      console.log("[Launch] Launch cancelled early before auth.");
      isStartingGame = false;
      return { status: 'cancelled' };
    }
    const userData = loadUserData();

    // 1. Prepare Auth
    let auth;
    if (userData.account_type === 'helloworld') {
      const sessionToken = crypto.randomBytes(16).toString('hex');
      const resolvedUuid = ensureHelloWorldUuid(userData.username, userData.uuid);
      userData.uuid = resolvedUuid;
      saveUserData(userData);

      auth = {
        success: true,
        access_token: sessionToken,
        client_token: sessionToken,
        uuid: resolvedUuid,
        name: userData.username || "Steve"
      };

      console.log(`[Launch] HelloWorld auth: ${auth.name} (${auth.uuid})`);
    } else {
      auth = await refreshMicrosoftSession(userData);
      if (userData.account_type === 'microsoft' && !auth.success && auth.expired) {
        return { status: 'error', error: "Your session has expired. Please log in again." };
      }
      presenceManager.gameContext = null;
    }

    if (userData.account_type === 'offline') {
      if (nickname) auth.name = nickname;
      // Generate a deterministic UUID from the player name so authlib-injector
      // can look up skins consistently for offline players
      const playerName = auth.name || nickname || "Steve";
      const nameHash = crypto.createHash('md5').update(`OfflinePlayer:${playerName}`).digest('hex');
      auth.uuid = nameHash;
      auth.access_token = crypto.randomBytes(16).toString('hex');
      auth.client_token = auth.access_token;
      presenceManager.gameContext = { versionLabel: formatPresenceVersionLabel(profile.version, mcVersion), profileName: profile.name, ign: playerName, worldName: null };
    }

    // 2. Prepare Launch Options
    const presenceVersionLabel = formatPresenceVersionLabel(profile.version, mcVersion);

    const options = {
      authorization: {
        access_token: auth.access_token,
        client_token: auth.client_token,
        uuid: auth.uuid,
        name: auth.name,
        user_properties: JSON.stringify({})
      },
      root: actualMcDir,
      version: {
        number: mcVersion,
        // MCLC requires type='release' for base MC version resolution.
        // Forge/Fabric specifics are handled via options.forge and options.version.custom.
        type: 'release'
      },
      timeout: 10000,
      overrides: {
        gameDirectory: profile.directory || actualMcDir,
        maxSockets: 16
      },
      memory: {
        max: "4G",
        min: "1G"
      }
    };

    if (isModded && expectedVersionDirName !== mcVersion) {
      options.version.custom = expectedVersionDirName;
    }

    // 2.0.5. Custom Loader JVM Arguments (NeoForge, Forge, Fabric, OptiFine)
    // MCLC ignores arguments.jvm from custom version JSONs, which causes modern loaders like NeoForge
    // to crash on startup with "The installation is corrupted!" due to missing -DlibraryDirectory=${library_directory} etc.
    const customVersionName = options.version.custom || (isModded ? expectedVersionDirName : null);
    if (customVersionName) {
      upgradeAsmInVersionJson(actualMcDir, customVersionName);
      const customJsonPath = path.join(actualMcDir, 'versions', customVersionName, `${customVersionName}.json`);
      if (fs.existsSync(customJsonPath)) {
        try {
          const customJson = fs.readJsonSync(customJsonPath);
          if (customJson.arguments && Array.isArray(customJson.arguments.jvm)) {
            if (!options.customArgs) options.customArgs = [];
            const fields = {
              '${library_directory}': path.resolve(path.join(actualMcDir, 'libraries')),
              '${classpath_separator}': process.platform === 'win32' ? ';' : ':',
              '${version_name}': customVersionName,
              '${game_directory}': profile.directory || actualMcDir,
              '${assets_root}': path.resolve(path.join(actualMcDir, 'assets')),
              '${assets_index_name}': customJson.assets || mcVersion,
              '${auth_uuid}': auth.uuid,
              '${auth_access_token}': auth.access_token,
              '${clientid}': auth.access_token,
              '${auth_xuid}': auth.access_token,
              '${version_type}': 'release',
              '${resolution_width}': '856',
              '${resolution_height}': '482'
            };

            const processJvmArg = (argVal) => {
              let strVal = typeof argVal === 'string' ? argVal : String(argVal);
              for (const [key, val] of Object.entries(fields)) {
                if (strVal.includes(key)) {
                  strVal = strVal.split(key).join(val);
                }
              }
              // Avoid duplicating arguments already in customArgs, but repeatable JVM flags
              // (such as --add-opens, --add-exports, -p) must NEVER be deduplicated!
              const repeatableFlags = new Set([
                '--add-opens',
                '--add-exports',
                '--add-modules',
                '--add-reads',
                '--patch-module',
                '-p',
                '--module-path',
                '-cp',
                '-classpath'
              ]);
              if (repeatableFlags.has(strVal) || !options.customArgs.includes(strVal)) {
                options.customArgs.push(strVal);
              }
            };

            for (const item of customJson.arguments.jvm) {
              if (typeof item === 'string') {
                processJvmArg(item);
              } else if (typeof item === 'object' && item !== null) {
                let allowed = true;
                if (Array.isArray(item.rules)) {
                  for (const rule of item.rules) {
                    if (rule.action === 'allow' && rule.os && rule.os.name) {
                      const currentOs = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux';
                      if (rule.os.name !== currentOs) allowed = false;
                    }
                    if (rule.action === 'disallow' && rule.os && rule.os.name) {
                      const currentOs = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux';
                      if (rule.os.name === currentOs) allowed = false;
                    }
                  }
                }
                if (allowed && item.value) {
                  if (Array.isArray(item.value)) {
                    item.value.forEach(processJvmArg);
                  } else {
                    processJvmArg(item.value);
                  }
                }
              }
            }
            console.log('[Launch] Added custom JVM arguments from profile JSON:', options.customArgs);
          }
        } catch (err) {
          console.warn('[Launch] Failed to parse custom JVM arguments:', err.message);
        }
      }
      // Fix Mixin ServiceLoader crash on Java 25 by explicitly specifying the Mixin service class
      if (!options.customArgs) options.customArgs = [];
      if (customVersionName.toLowerCase().includes('fabric')) {
        if (!options.customArgs.includes('-Dmixin.service=net.fabricmc.loader.impl.launch.knot.MixinServiceKnot')) {
          options.customArgs.push('-Dmixin.service=net.fabricmc.loader.impl.launch.knot.MixinServiceKnot');
          console.log('[Launch] Added explicit Fabric Mixin service property for Java 25 support');
        }
      }
    }

    // 2.1. Fabric: Verify & repair libraries before launch
    if (isFabric && profile.version) {
      try {
        if (mainWindow) mainWindow.webContents.send('info-message', 'Verifying Fabric libraries...');
        const libsOk = await downloadMissingFabricLibraries(actualMcDir, expectedVersionDirName, null);
        if (!libsOk) {
          console.warn('[Launch] Some Fabric libraries are still missing after repair attempt.');
          if (mainWindow) mainWindow.webContents.send('info-message', 'Warning: Some Fabric libraries may be missing.');
        }
      } catch (verifyErr) {
        console.warn('[Launch] Fabric library verification failed:', verifyErr.message);
      }
    }

    if (profile.jvm_args) {
      const maxMatch = profile.jvm_args.match(/-Xmx(\d+[GgMm])/);
      if (maxMatch) options.memory.max = maxMatch[1];
      const minMatch = profile.jvm_args.match(/-Xms(\d+[GgMm])/);
      if (minMatch) options.memory.min = minMatch[1];

      // Pass other JVM args if they exist
      const otherArgs = profile.jvm_args.split(' ').filter(arg => !arg.startsWith('-Xmx') && !arg.startsWith('-Xms'));
      if (!options.customArgs) options.customArgs = [];
      if (otherArgs.length > 0) {
        options.customArgs = [...options.customArgs, ...otherArgs];
      }
    }

    // 2.5. Modern Java Fixes (Reflection access)
    // Required for Minecraft 1.17+ (Java 16+). Old versions like 1.2.3 use Java 8 and crash with --add-opens.
    const needsModernArgs = (() => {
      const match = mcVersion.match(/(\d+)\.(\d+)(?:\.(\d+))?/);
      if (!match) return false;
      const major = parseInt(match[1]);
      const minor = parseInt(match[2]);
      return major > 1 || (major === 1 && minor >= 17);
    })();
    if (needsModernArgs) {
      const modernJavaArgs = [
        '--add-opens', 'java.base/java.lang=ALL-UNNAMED',
        '--add-opens', 'java.base/java.lang.invoke=ALL-UNNAMED',
        '--add-opens', 'java.base/java.lang.reflect=ALL-UNNAMED',
        '--add-opens', 'java.base/java.io=ALL-UNNAMED',
        '--add-opens', 'java.base/java.net=ALL-UNNAMED',
        '--add-opens', 'java.base/java.nio=ALL-UNNAMED',
        '--add-opens', 'java.base/java.util=ALL-UNNAMED',
        '--add-opens', 'java.base/java.util.concurrent=ALL-UNNAMED',
        '--add-opens', 'java.base/java.util.concurrent.atomic=ALL-UNNAMED',
        '--add-opens', 'java.base/sun.nio.ch=ALL-UNNAMED',
        '--add-opens', 'java.base/sun.nio.cs=ALL-UNNAMED',
        '--add-opens', 'java.base/sun.security.action=ALL-UNNAMED',
        '--add-opens', 'java.base/sun.util.calendar=ALL-UNNAMED',
        '--add-opens', 'java.security.jgss/sun.security.krb5=ALL-UNNAMED'
      ];
      if (!options.customArgs) options.customArgs = [];
      options.customArgs = [...options.customArgs, ...modernJavaArgs];
    }

    // Add server connection arguments if serverIp is provided
    if (serverIp) {
      const isModern = (() => {
        const match = mcVersion.match(/(\d+)\.(\d+)(?:\.(\d+))?/);
        if (!match) return false;
        const major = parseInt(match[1]);
        const minor = parseInt(match[2]);
        return major > 1 || (major === 1 && minor >= 20);
      })();

      // Modern MC (1.20+) requires --quickPlayMultiplayer, older versions use legacy --server / --port
      options.quickPlay = {
        type: isModern ? "multiplayer" : "legacy",
        identifier: serverIp
      };
      console.log(`[Launch] Auto-connecting to server: ${serverIp} (isModern: ${isModern}, saveServer: ${saveServer})`);

      try {
        const targetGameDir = profile.directory || actualMcDir;
        await addServerToServersDat(targetGameDir, serverIp);
        if (targetGameDir !== actualMcDir) {
          await addServerToServersDat(actualMcDir, serverIp);
        }
      } catch (srvErr) {
        console.warn('[Launch] Could not auto-save server to servers.dat:', srvErr);
      }
    }

    // 3. Java Runtime
    if (isLaunchCancelled) {
      console.log("[Launch] Launch cancelled early before Java runtime check.");
      return { status: 'cancelled' };
    }
    try {
      // Priority: Profile Custom Java Path > Automatic Java Runtime
      const jPath = profile.java_path || await javaRuntime.getJavaPath(mcVersion);
      if (jPath && jPath !== 'java') {
        options.javaPath = jPath;
      }
      const userData = loadUserData();
      if (userData.hw_accel !== false && options.javaPath) {
        ensureJavaGpuPreference(options.javaPath, true);
      }
    } catch (javaErr) {
      console.warn(`[Launch] Java resolution failed: ${javaErr.message}`);
    }

    // 4. Finalize & Launch
    if (isLaunchCancelled) {
      console.log("[Launch] Launch cancelled early before MCLC invocation.");
      isStartingGame = false;
      return { status: 'cancelled' };
    }
    console.log(`[Launch] Starting Minecraft ${mcVersion} for ${auth.name}...`);
    await new Promise(resolve => setTimeout(resolve, 25));

    function checkMinecraftWindow(pid) {
      return new Promise((resolve) => {
        if (!pid) return resolve(false);
        const { exec } = require('child_process');
        if (process.platform === 'win32') {
          exec(`tasklist /v /fo csv /fi "PID eq ${pid}"`, { windowsHide: true, timeout: 2500 }, (err, stdout) => {
            if (!err && stdout) {
              const lines = stdout.split(/\r?\n/).filter(l => l.trim().length > 0);
              for (let i = 1; i < lines.length; i++) {
                const cols = parseCsvLine(lines[i]);
                if (cols.length >= 9) {
                  const title = cols[8].replace(/^"|"$/g, '').trim();
                  if (title && title !== 'N/A' && isMinecraftGameWindowTitle(title)) {
                    return resolve(true);
                  }
                }
              }
            }
            resolve(false);
          });
        } else if (process.platform === 'darwin') {
          // macOS: Check windows belonging to PID via AppleScript System Events
          const script = `tell application "System Events" to get name of every window of (every process whose unix id is ${pid})`;
          exec(`osascript -e '${script}'`, { timeout: 2500 }, (err, stdout) => {
            if (!err && stdout) {
              const cleaned = stdout.trim();
              if (cleaned && cleaned !== 'missing value' && cleaned !== '{}') {
                return resolve(true);
              }
            }
            // Fallback: check count of windows for this process
            const countScript = `tell application "System Events" to count of windows of (every process whose unix id is ${pid})`;
            exec(`osascript -e '${countScript}'`, { timeout: 2000 }, (err2, stdout2) => {
              if (!err2 && stdout2) {
                const count = parseInt(stdout2.trim(), 10);
                if (!isNaN(count) && count > 0) {
                  return resolve(true);
                }
              }
              resolve(false);
            });
          });
        } else {
          // Linux: Query wmctrl (X11/Xwayland) or xdotool
          exec('wmctrl -l -p', { timeout: 2500 }, (err, stdout) => {
            if (!err && stdout) {
              const lines = stdout.split(/\r?\n/).filter(l => l.trim().length > 0);
              for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 5) {
                  const winPid = parseInt(parts[2], 10);
                  const title = parts.slice(4).join(' ');
                  if (winPid === pid || isMinecraftGameWindowTitle(title)) {
                    return resolve(true);
                  }
                }
              }
            }
            // Fallback: search window with xdotool
            exec(`xdotool search --pid ${pid} || xdotool search --name "Minecraft"`, { timeout: 2000 }, (xErr, xStdout) => {
              if (!xErr && xStdout && xStdout.trim().length > 0) {
                return resolve(true);
              }
              resolve(false);
            });
          });
        }
      });
    }

    launcher.launch(options).then(child => {
      isStartingGame = false;
      if (!child) {
        console.error("[Launch] MCLC returned null child process (Java runtime or launch initialization failed).");
        if (getRunningMinecraftCount() === 0) {
          presenceManager.safeRun(presenceManager.onGameClosed());
        }
        if (mainWindow) mainWindow.webContents.send('error', "Could not start the game. Please verify your Java installation and RAM allocation.");
        return;
      }

      let isGameMarkedReady = false;
      let windowPollTimer = null;
      let fallbackReadyTimer = null;

      const triggerGameReady = (reason) => {
        if (isGameMarkedReady) return;
        isGameMarkedReady = true;
        childMeta.isReady = true;
        if (windowPollTimer) {
          clearInterval(windowPollTimer);
          windowPollTimer = null;
        }
        if (fallbackReadyTimer) {
          clearTimeout(fallbackReadyTimer);
          fallbackReadyTimer = null;
        }
        console.log(`[Launch] Game marked READY (${reason})`);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('info-message', 'Game Ready');
          mainWindow.webContents.send('game-status', { running: true, count: getRunningMinecraftCount() });
        }
      };

      if (isLaunchCancelled) {
        console.log("[Launch] Launch cancelled while starting, killing immediately.");
        if (windowPollTimer) {
          clearInterval(windowPollTimer);
          windowPollTimer = null;
        }
        if (fallbackReadyTimer) {
          clearTimeout(fallbackReadyTimer);
          fallbackReadyTimer = null;
        }
        activeGameProcesses.delete(child);
        internalGameProcessesMeta.delete(child);
        try {
          if (process.platform === 'win32' && child.pid) {
            const { exec } = require('child_process');
            exec(`taskkill /pid ${child.pid} /T /F`, () => {});
          } else {
            process.kill(child.pid, 'SIGKILL');
          }
        } catch (e) { }
        if (getRunningMinecraftCount() === 0) {
          currentGameProcess = null;
          lastKnownRunningState = false;
          presenceManager.safeRun(presenceManager.onGameClosed());
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('info-message', "Game Closed");
            mainWindow.webContents.send('game-status', { running: false, count: 0 });
          }
        }
        return;
      }

      const childStartTime = Date.now();
      const childMeta = {
        pid: child.pid,
        startTime: childStartTime,
        isReady: false,
        streakTimer: setTimeout(() => {
          if (!isLaunchCancelled && activeGameProcesses.has(child)) {
            triggerStreakUpdate();
          }
        }, 30000),
        windowPollTimer: null,
        fallbackReadyTimer: null
      };

      // Fallback timer: if after 60 seconds no window or completion log was detected, transition to ready
      fallbackReadyTimer = setTimeout(() => {
        if (!isGameMarkedReady && activeGameProcesses.has(child)) {
          triggerGameReady('Fallback timeout (60s elapsed without window signal)');
        }
      }, 60000);
      childMeta.fallbackReadyTimer = fallbackReadyTimer;

      internalGameProcessesMeta.set(child, childMeta);
      activeGameProcesses.add(child);
      currentGameProcess = child;
      lastKnownRunningState = true;

      // Update Presence / RPC state with PID
      presenceManager.safeRun(presenceManager.onGameLaunch({
        versionLabel: presenceVersionLabel,
        profileName: profile.name,
        ign: auth.name,
        pid: child.pid
      }));

      // Window Detection: Poll every 4-5s for the actual Minecraft window
      if (child.pid) {
        windowPollTimer = setInterval(async () => {
          if (isGameMarkedReady || isLaunchCancelled || !activeGameProcesses.has(child)) {
            if (windowPollTimer) {
              clearInterval(windowPollTimer);
              windowPollTimer = null;
            }
            return;
          }
          try {
            const hasWindow = await checkMinecraftWindow(child.pid);
            if (hasWindow && !isGameMarkedReady) {
              triggerGameReady('Minecraft window detected');
            }
          } catch (e) { }
        }, 4000);
        childMeta.windowPollTimer = windowPollTimer;
      }

      let lastStdoutIpcTime = 0;
      const isMinecraftReadyLog = (msg) => {
        if (!msg) return false;
        // High-confidence completion signatures across Vanilla, Fabric, Forge, NeoForge:
        // Excludes early logs like texture atlas creation or LWJGL library loading.
        return /Connecting to\s+|joined the game|joined singleplayer|Player joined|Stopping worker threads|stage COMPLETE|Mod loading complete|Narrator library for/i.test(msg);
      };

      child.stdout?.on('data', (data) => {
        if (isLaunchCancelled) return;
        const message = data.toString().trim();
        if (!message) return;
        console.log('[Game stdout]', message);
        presenceManager.handleGameLog(message);
        const now = Date.now();
        if (mainWindow && !mainWindow.isDestroyed()) {
          const isReady = isMinecraftReadyLog(message);
          if (isReady || message.includes('Setting user:') || message.includes('Sound engine started') || now - lastStdoutIpcTime > 400) {
            lastStdoutIpcTime = now;
            mainWindow.webContents.send('info-message', `[Game stdout] ${message}`);
            if (isReady) {
              triggerGameReady(`Log detected: ${message.slice(0, 80)}`);
            }
          }
        }
      });

      child.stderr?.on('data', (data) => {
        if (isLaunchCancelled) return;
        const message = data.toString().trim();
        if (!message) return;
        console.error('[Game stderr]', message);
        presenceManager.handleGameLog(message);
        const now = Date.now();
        if (mainWindow && !mainWindow.isDestroyed()) {
          const isReady = isMinecraftReadyLog(message);
          if (isReady || now - lastStdoutIpcTime > 400) {
            lastStdoutIpcTime = now;
            mainWindow.webContents.send('info-message', `[Game stderr] ${message}`);
            if (isReady) {
              triggerGameReady(`Stderr log detected: ${message.slice(0, 80)}`);
            }
          }
        }
      });

      child.on('close', (exitCode) => {
        console.log("[Launch] Game process closed", exitCode);
        const meta = internalGameProcessesMeta.get(child);
        if (meta) {
          if (meta.windowPollTimer) {
            clearInterval(meta.windowPollTimer);
            meta.windowPollTimer = null;
          }
          if (meta.fallbackReadyTimer) {
            clearTimeout(meta.fallbackReadyTimer);
            meta.fallbackReadyTimer = null;
          }
          if (meta.streakTimer) {
            clearTimeout(meta.streakTimer);
            meta.streakTimer = null;
          }
          const elapsedMs = Date.now() - meta.startTime;
          if (elapsedMs >= 30000 && !isLaunchCancelled) {
            addPlaytimeToUserStats(elapsedMs / (1000 * 60 * 60)).catch(() => {});
          }
          internalGameProcessesMeta.delete(child);
        }
        activeGameProcesses.delete(child);
        const remainingCount = getRunningMinecraftCount();
        if (remainingCount === 0) {
          currentGameProcess = null;
          lastKnownRunningState = false;
          handleLauncherClose(exitCode);
        } else {
          console.log(`[Launch] An instance closed, but ${remainingCount} instance(s) still running. Keeping game status.`);
          currentGameProcess = activeGameProcesses.values().next().value || null;
        }
      });

      child.on('error', (err) => {
        console.error("[Launch] Process Error:", err);
        const meta = internalGameProcessesMeta.get(child);
        if (meta) {
          if (meta.windowPollTimer) {
            clearInterval(meta.windowPollTimer);
            meta.windowPollTimer = null;
          }
          if (meta.fallbackReadyTimer) {
            clearTimeout(meta.fallbackReadyTimer);
            meta.fallbackReadyTimer = null;
          }
          if (meta.streakTimer) {
            clearTimeout(meta.streakTimer);
            meta.streakTimer = null;
          }
          internalGameProcessesMeta.delete(child);
        }
        activeGameProcesses.delete(child);
        const remainingCount = getRunningMinecraftCount();
        if (remainingCount === 0) {
          currentGameProcess = null;
          lastKnownRunningState = false;
          handleLauncherClose(err);
        } else {
          currentGameProcess = activeGameProcesses.values().next().value || null;
        }
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('error', "Process Error: " + err.message);
        }
      });
    }).catch(err => {
      isStartingGame = false;
      if (getRunningMinecraftCount() === 0) {
        streakCountedThisRun = false;
        gameStartTime = null;
      }
      console.error("[Launch] Launcher Error:", err);
      if (getRunningMinecraftCount() === 0) {
        presenceManager.safeRun(presenceManager.onGameClosed());
      }
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('error', "Launch Failed: " + err.message);
    });

    // 5. Update Metadata
    try {
      profile.last_played = new Date().toISOString();
      profileManager.saveProfiles({ profiles });
      if (typeof updateTrayMenu === 'function') {
        try { updateTrayMenu(); } catch (_) {}
      }
    } catch (e) { }

    return { success: true };
  } catch (e) {
    isStartingGame = false;
    console.error("[Launch] Critical Exception:", e);
    return { success: false, error: e.message };
  }
})

ipcMain.handle('add-server-to-servers-dat', async (e, serverIp, profileId, serverName) => {
  try {
    if (!serverIp || typeof serverIp !== 'string') return { success: false, error: 'Invalid IP' };
    const cleanIp = serverIp.trim();
    const actualMcDir = paths.getMcDir();

    // 1. Always save in actualMcDir
    await addServerToServersDat(actualMcDir, cleanIp, serverName);

    // 2. Also save in profile custom directory if provided
    if (profileId) {
      try {
        const profiles = profileManager.loadProfiles().profiles;
        const profile = profiles[profileId];
        if (profile && profile.directory && profile.directory !== actualMcDir) {
          await addServerToServersDat(profile.directory, cleanIp, serverName);
          console.log(`[serversDat] Saved ${cleanIp} to profile directory: ${profile.directory}`);
        }
      } catch (profErr) {
        console.warn('[serversDat] Error saving to profile directory:', profErr);
      }
    }
    return { success: true };
  } catch (err) {
    console.warn('[serversDat] Error adding server to servers.dat:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-featured-server-status', async (e, ip) => {
  if (!ip || typeof ip !== 'string') return null;
  const cleanIp = ip.trim();
  const mergedData = {
    online: false,
    icon: null,
    players: null,
    motdHtml: null,
    version: null,
    edition: null
  };

  try {
    const mcJavaPromise = fetch(`https://api.mcstatus.io/v2/status/java/${encodeURIComponent(cleanIp)}`, {
      signal: AbortSignal.timeout(4000)
    }).then(r => r.ok ? r.json() : null).catch(() => null);

    const mcBedrockPromise = fetch(`https://api.mcstatus.io/v2/status/bedrock/${encodeURIComponent(cleanIp)}`, {
      signal: AbortSignal.timeout(4000)
    }).then(r => r.ok ? r.json() : null).catch(() => null);

    const mcsPromise = fetch(`https://api.mcsrvstat.us/3/${encodeURIComponent(cleanIp)}`, {
      headers: { 'User-Agent': 'HelloWorldLauncher/2.1' },
      signal: AbortSignal.timeout(4000)
    }).then(r => r.ok ? r.json() : null).catch(() => null);

    const mtPromise = fetch(`https://api.minetools.eu/ping/${encodeURIComponent(cleanIp)}`, {
      signal: AbortSignal.timeout(4000)
    }).then(r => r.ok ? r.json() : null).catch(() => null);

    const [mc, bedrock, mcs, mt] = await Promise.all([mcJavaPromise, mcBedrockPromise, mcsPromise, mtPromise]);

    const isJavaOnline = Boolean((mc && mc.online) || (mcs && mcs.online) || (mt && !mt.error && mt.version && mt.version.protocol !== -1));
    const isBedrockOnline = Boolean(bedrock && bedrock.online);

    mergedData.online = isJavaOnline || isBedrockOnline;

    if (isJavaOnline && isBedrockOnline) {
      mergedData.edition = 'crossplay';
    } else if (isBedrockOnline) {
      mergedData.edition = 'bedrock';
    } else if (isJavaOnline) {
      mergedData.edition = 'java';
    }

    const cleanMotd = (mcs && mcs.motd && Array.isArray(mcs.motd.clean) ? mcs.motd.clean.join('\n') : '')
      || (mc && mc.motd && mc.motd.clean)
      || (mt && mt.description)
      || '';
    mergedData.motdClean = cleanMotd;

    if (mc) {
      if (mc.icon) mergedData.icon = mc.icon;
      if (mc.players && typeof mc.players.online === 'number') mergedData.players = mc.players;
      if (mc.motd) {
        if (mc.motd.html) mergedData.motdHtml = mc.motd.html;
        else if (mc.motd.clean) mergedData.motdHtml = mc.motd.clean;
      }
      if (mc.version && (mc.version.name_clean || mc.version.name_raw)) {
        mergedData.version = mc.version.name_clean || mc.version.name_raw;
      }
    }

    if (mcs && mcs.online) {
      if (!mergedData.icon && mcs.icon) mergedData.icon = mcs.icon;
      if (!mergedData.players && mcs.players) mergedData.players = mcs.players;
      if (mcs.version && (!mergedData.version || mergedData.version.length < 3)) {
        mergedData.version = mcs.version;
      }
    }

    if (bedrock && bedrock.online) {
      if (!mergedData.version && bedrock.version && bedrock.version.name) {
        mergedData.version = bedrock.version.name;
      }
      if (!mergedData.players && bedrock.players && typeof bedrock.players.online === 'number') {
        mergedData.players = bedrock.players;
      }
      if (!mergedData.motdHtml && bedrock.motd) {
        mergedData.motdHtml = bedrock.motd.html || bedrock.motd.clean;
      }
    }

    if (mt && !mt.error) {
      if (!mergedData.icon && mt.favicon) mergedData.icon = mt.favicon;
      if (!mergedData.players && mt.players && typeof mt.players.online === 'number') {
        mergedData.players = { online: mt.players.online, max: mt.players.max };
      }
      if (!mergedData.motdHtml && mt.description) {
        mergedData.motdHtml = mt.description;
      }
      if (!mergedData.version && mt.version && mt.version.name) {
        mergedData.version = mt.version.name;
      }
    }

    // Secondary scan on MOTD description for Geyser/Crossplay indicators
    const fullText = (cleanMotd + ' ' + (mergedData.motdHtml || '')).toLowerCase();
    if (fullText.includes('geyser') || fullText.includes('crossplay') || (fullText.includes('bedrock') && fullText.includes('java')) || fullText.includes('bedrock port')) {
      mergedData.edition = 'crossplay';
    }

    // Normalize base64 icon if needed
    if (mergedData.icon && typeof mergedData.icon === 'string') {
      const trimmed = mergedData.icon.trim();
      if (!trimmed.startsWith('data:image/') && !trimmed.startsWith('http')) {
        const cleanB64 = trimmed.replace(/\s+/g, '');
        if (cleanB64.length > 50 && /^[A-Za-z0-9+/=]+$/.test(cleanB64)) {
          mergedData.icon = `data:image/png;base64,${cleanB64}`;
        }
      }
    }
  } catch (err) {
    console.warn(`[FeaturedServers] get-featured-server-status error for ${cleanIp}:`, err.message);
  }

  return mergedData;
});

ipcMain.handle('cancel-launch', async () => {
  try {
    isLaunchCancelled = true;
    isStartingGame = false;
    if (streakSessionTimer) {
      clearTimeout(streakSessionTimer);
      streakSessionTimer = null;
    }
    streakCountedThisRun = false;
    gameStartTime = null;
    if (launcher) launcher._cancelled = true;
    if (launcher && launcher.handler) launcher.handler._cancelled = true;
    // Yield to allow UI animations and window message queue to process cleanly
    await new Promise(resolve => setTimeout(resolve, 10));

    if (currentGameProcess && currentGameProcess.pid) {
      const pid = currentGameProcess.pid;
      console.log('[cancel-launch] Killing game process tree for PID:', pid);
      try {
        if (process.platform === 'win32') {
          const { exec } = require('child_process');
          exec(`taskkill /pid ${pid} /T /F`, (err) => {
            if (err) console.warn('[cancel-launch] taskkill note:', err.message);
          });
        } else {
          process.kill(pid, 'SIGKILL');
        }
      } catch (killErr) {
        console.warn('[cancel-launch] Process kill error:', killErr.message);
      }
      activeGameProcesses.delete(currentGameProcess);
      internalGameProcessesMeta.delete(currentGameProcess);
      const remainingCount = getRunningMinecraftCount();
      if (remainingCount === 0) {
        currentGameProcess = null;
        lastKnownRunningState = false;
        handleLauncherClose('cancelled');
      } else {
        currentGameProcess = activeGameProcesses.values().next().value || null;
        console.log(`[cancel-launch] Instance cancelled, but ${remainingCount} other instance(s) still running.`);
      }
      return { success: true };
    }
    return { success: true, message: 'Launch marked as cancelled' };
  } catch (e) {
    isStartingGame = false;
    console.error('[cancel-launch] Error killing:', e);
    return { success: false, error: e.message };
  }
})

ipcMain.handle('open-folder-dialog', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  })
  return canceled ? null : filePaths[0]
})

// ==============================================
// SOCIAL SYSTEM IPC HANDLERS
// ==============================================

ipcMain.handle('social-get-auth', async () => {
  try {
    const auth = await getSocialAuth();
    syncClientVersionToUsersDoc(auth);
    presenceManager.safeRun(presenceManager.setLauncherOnline());
    startPresencePolling();
    return { success: true, uid: auth.uid, accountType: auth.accountType, username: auth.username };
  } catch (e) {
    if (e.message === 'NO_SOCIAL_AUTH') return { success: false, error: 'offline' };
    return { success: false, error: e.message };
  }
});

ipcMain.handle('stats-get-my-stats', async () => {
  try {
    let stats = null;

    // 1. Primary: Cloudflare Worker backend
    try {
      if (ApiClient && ApiClient.stats && typeof ApiClient.stats.getMyStats === 'function') {
        const apiRes = await ApiClient.stats.getMyStats();
        if (apiRes && apiRes.success && apiRes.stats) {
          stats = apiRes.stats;
        }
      }
    } catch (_) {}

    // 2. Fallback to local stats file
    if (!stats || (!stats.totalSessions && !stats.lastPlayed)) {
      stats = loadLocalStats();
    }
    
    // Calculate effective streak for UI display without saving to DB yet
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const lastDate = stats.lastPlayed ? new Date(stats.lastPlayed).toISOString().split('T')[0] : null;
    
    let effectiveStreak = stats.streak || 0;
    let streakCompletedToday = false;
    const dbMaxStreak = stats.maxStreak || 0;
    const dbStreak = stats.streak || 0;
    
    if (lastDate === todayStr) {
      streakCompletedToday = true;
    } else if (lastDate !== yesterdayStr && effectiveStreak > 0) {
      effectiveStreak = 0;
    }
    
    const realMaxStreak = Math.max(dbMaxStreak, dbStreak, effectiveStreak);
    
    stats.streak = effectiveStreak;
    stats.maxStreak = realMaxStreak;
    stats.streakCompletedToday = streakCompletedToday;

    saveLocalStats(stats);
    
    return { success: true, stats };
  } catch (e) {
    const fallbackStats = loadLocalStats();
    return { success: true, stats: fallbackStats, offline: true };
  }
});

ipcMain.handle('stats-get-user', async (e, targetUid) => {
  try {
    let stats = null;
    // Primary: Cloudflare backend
    try {
      if (ApiClient && ApiClient.stats && typeof ApiClient.stats.getUserStats === 'function') {
        const apiRes = await ApiClient.stats.getUserStats(targetUid);
        if (apiRes && apiRes.success && apiRes.stats) {
          stats = apiRes.stats;
        }
      }
    } catch (_) {}

    if (!stats) {
      return { success: true, stats: { streak: 0, maxStreak: 0, totalHours: 0, totalSessions: 0, totalDaysPlayed: 0, streakCompletedToday: false }, offline: true };
    }
    
    // Calculate effective streak for UI display without saving to DB yet
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const lastDate = stats.lastPlayed ? new Date(stats.lastPlayed).toISOString().split('T')[0] : null;
    
    let effectiveStreak = stats.streak || 0;
    let streakCompletedToday = false;
    
    if (lastDate === todayStr) {
      streakCompletedToday = true;
    } else if (lastDate !== yesterdayStr && effectiveStreak > 0) {
      effectiveStreak = 0;
    }
    
    const realMaxStreak = Math.max(stats.maxStreak || 0, stats.streak || 0, effectiveStreak);
    
    stats.streak = effectiveStreak;
    stats.maxStreak = realMaxStreak;
    stats.streakCompletedToday = streakCompletedToday;

    return { success: true, stats };
  } catch (e) {
    return { success: true, stats: { streak: 0, maxStreak: 0, totalHours: 0, totalSessions: 0, totalDaysPlayed: 0, streakCompletedToday: false }, offline: true };
  }
});

ipcMain.handle('stats-revert-today-streak', async () => {
  try {
    if (ApiClient && ApiClient.stats && typeof ApiClient.stats.revertTodayStreak === 'function') {
      const res = await ApiClient.stats.revertTodayStreak();
      if (res && res.success) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('stats-updated');
        }
        return res;
      }
    }
    return { success: false, error: 'NO_STATS' };
  } catch (e) {
    console.error('[Stats] Error reverting today streak:', e.message);
    return { success: false, error: e.message };
  }
});
ipcMain.handle('social-search-user', async (e, query) => {
  try {
    if (!query || query.trim().length < 2) return { success: false, error: 'Query too short' };
    const q = query.trim();
    if (ApiClient && ApiClient.users && typeof ApiClient.users.search === 'function') {
      const apiRes = await ApiClient.users.search(q);
      if (apiRes && apiRes.success && Array.isArray(apiRes.users)) {
        return { success: true, results: apiRes.users };
      }
    }
    return { success: true, results: [] };
  } catch (apiErr) {
    return { success: false, error: apiErr.response?.data?.error || apiErr.message };
  }
});

ipcMain.handle('social-send-request', async (e, toUid) => {
  try {
    const auth = await getSocialAuth();
    if (!auth || !auth.uid) return { success: false, error: 'no_auth' };
    if (toUid === auth.uid) return { success: false, error: 'cannot_self' };

    if (ApiClient && ApiClient.social && typeof ApiClient.social.sendRequest === 'function') {
      const apiRes = await ApiClient.social.sendRequest(toUid);
      if (apiRes) return apiRes;
    }
    return { success: false, error: 'api_unavailable' };
  } catch (apiErr) {
    if (apiErr.response && apiErr.response.data) return apiErr.response.data;
    return { success: false, error: apiErr.message };
  }
});

ipcMain.handle('social-get-requests', async () => {
  try {
    const auth = await getSocialAuth();
    if (!auth || !auth.uid) return { success: true, sent: [], received: [] };

    if (ApiClient && ApiClient.social && typeof ApiClient.social.getRequests === 'function') {
      const apiRes = await ApiClient.social.getRequests();
      if (apiRes && apiRes.success) {
        return {
          success: true,
          sent: Array.isArray(apiRes.sent) ? apiRes.sent : [],
          received: Array.isArray(apiRes.received) ? apiRes.received : []
        };
      }
    }
    return { success: true, sent: [], received: [] };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('social-accept-request', async (e, requestId) => {
  try {
    if (ApiClient && ApiClient.social && typeof ApiClient.social.acceptRequest === 'function') {
      const apiRes = await ApiClient.social.acceptRequest(requestId);
      if (apiRes && (apiRes.success || apiRes.error)) return apiRes;
    }
    return { success: false, error: 'api_unavailable' };
  } catch (apiErr) {
    if (apiErr.response && apiErr.response.data) return apiErr.response.data;
    return { success: false, error: apiErr.message };
  }
});

ipcMain.handle('social-reject-request', async (e, requestId) => {
  try {
    if (ApiClient && ApiClient.social && typeof ApiClient.social.rejectRequest === 'function') {
      const apiRes = await ApiClient.social.rejectRequest(requestId);
      if (apiRes && (apiRes.success || apiRes.error)) return apiRes;
    }
    return { success: false, error: 'api_unavailable' };
  } catch (apiErr) {
    if (apiErr.response && apiErr.response.data) return apiErr.response.data;
    return { success: false, error: apiErr.message };
  }
});

ipcMain.handle('social-cancel-request', async (e, requestId) => {
  try {
    if (ApiClient && ApiClient.social && typeof ApiClient.social.rejectRequest === 'function') {
      const apiRes = await ApiClient.social.rejectRequest(requestId);
      if (apiRes && (apiRes.success || apiRes.error)) return apiRes;
    }
    return { success: false, error: 'api_unavailable' };
  } catch (apiErr) {
    if (apiErr.response && apiErr.response.data) return apiErr.response.data;
    return { success: false, error: apiErr.message };
  }
});

ipcMain.handle('social-get-friends', async () => {
  try {
    const auth = await getSocialAuth();
    if (!auth || !auth.uid) return { success: true, friends: [] };

    if (ApiClient && ApiClient.social && typeof ApiClient.social.getFriends === 'function') {
      const apiRes = await ApiClient.social.getFriends();
      if (apiRes && apiRes.success && Array.isArray(apiRes.friends)) {
        return { success: true, friends: apiRes.friends };
      }
    }
    return { success: true, friends: [] };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('social-create-group', async (e, name, description, imageBase64, members) => {
  try {
    if (ApiClient && ApiClient.chat && typeof ApiClient.chat.createGroup === 'function') {
      const apiRes = await ApiClient.chat.createGroup(name, members, imageBase64);
      if (apiRes && apiRes.success) return apiRes;
    }
    return { success: false, error: 'api_unavailable' };
  } catch (apiErr) {
    if (apiErr.response && apiErr.response.data) return apiErr.response.data;
    return { success: false, error: apiErr.message };
  }
});

ipcMain.handle('social-remove-friend', async (e, targetFriendshipId) => {
  try {
    if (ApiClient && ApiClient.social && typeof ApiClient.social.removeFriend === 'function') {
      const apiRes = await ApiClient.social.removeFriend(targetFriendshipId);
      if (apiRes && (apiRes.success || apiRes.error)) return apiRes;
    }
    return { success: false, error: 'api_unavailable' };
  } catch (apiErr) {
    if (apiErr.response && apiErr.response.data) return apiErr.response.data;
    return { success: false, error: apiErr.message };
  }
});

ipcMain.handle('social-block-user', async (e, targetUid, sourceFriendshipId) => {
  try {
    if (ApiClient && ApiClient.social && typeof ApiClient.social.blockUser === 'function') {
      const apiRes = await ApiClient.social.blockUser(targetUid);
      if (apiRes && (apiRes.success || apiRes.error)) return apiRes;
    }
    return { success: false, error: 'api_unavailable' };
  } catch (apiErr) {
    if (apiErr.response && apiErr.response.data) return apiErr.response.data;
    return { success: false, error: apiErr.message };
  }
});

ipcMain.handle('social-unblock-user', async (e, targetUid) => {
  try {
    if (ApiClient && ApiClient.social && typeof ApiClient.social.unblockUser === 'function') {
      const apiRes = await ApiClient.social.unblockUser(targetUid);
      if (apiRes && (apiRes.success || apiRes.error)) return apiRes;
    }
    return { success: false, error: 'api_unavailable' };
  } catch (apiErr) {
    if (apiErr.response && apiErr.response.data) return apiErr.response.data;
    return { success: false, error: apiErr.message };
  }
});

ipcMain.handle('social-get-blocked', async () => {
  try {
    if (ApiClient && ApiClient.social && typeof ApiClient.social.getBlocked === 'function') {
      const apiRes = await ApiClient.social.getBlocked();
      if (apiRes && apiRes.success && Array.isArray(apiRes.blocked)) {
        return { success: true, blocked: apiRes.blocked };
      }
    }
    return { success: true, blocked: [] };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('social-send-message', async (e, targetFriendshipId, content, replyTo = null) => {
  try {
    if (!content || !content.trim()) return { success: false, error: 'empty_message' };

    if (ApiClient && ApiClient.chat && typeof ApiClient.chat.sendMessage === 'function') {
      const apiRes = await ApiClient.chat.sendMessage(targetFriendshipId, content, replyTo);
      if (apiRes && (apiRes.success || apiRes.msgId || apiRes.messageId)) return apiRes;
    }
    return { success: false, error: 'api_unavailable' };
  } catch (apiErr) {
    if (apiErr.response && apiErr.response.data) return apiErr.response.data;
    return { success: false, error: apiErr.message };
  }
});

ipcMain.handle('social-edit-message', async (e, targetFriendshipId, msgId, newContent) => {
  try {
    if (!newContent || !newContent.trim()) return { success: false, error: 'empty_message' };

    if (ApiClient && ApiClient.chat && typeof ApiClient.chat.editMessage === 'function') {
      const apiRes = await ApiClient.chat.editMessage(targetFriendshipId, msgId, newContent);
      if (apiRes && apiRes.success) return { success: true };
    }
    return { success: false, error: 'api_unavailable' };
  } catch (apiErr) {
    if (apiErr.response && apiErr.response.data) return apiErr.response.data;
    return { success: false, error: apiErr.message };
  }
});

ipcMain.handle('social-delete-message', async (e, targetFriendshipId, msgId) => {
  try {
    if (ApiClient && ApiClient.chat && typeof ApiClient.chat.deleteMessage === 'function') {
      const apiRes = await ApiClient.chat.deleteMessage(targetFriendshipId, msgId);
      if (apiRes && apiRes.success) return { success: true };
    }
    return { success: false, error: 'api_unavailable' };
  } catch (apiErr) {
    if (apiErr.response && apiErr.response.data) return apiErr.response.data;
    return { success: false, error: apiErr.message };
  }
});

ipcMain.handle('social-set-reply', async (e, targetFriendshipId, replyTo) => {
  try {
    if (ApiClient && ApiClient.chat && typeof ApiClient.chat.setReplyState === 'function') {
      const apiRes = await ApiClient.chat.setReplyState(targetFriendshipId, replyTo);
      if (apiRes && apiRes.success) return { success: true };
    }
    return { success: true };
  } catch (apiErr) {
    if (apiErr.response && apiErr.response.data) return apiErr.response.data;
    return { success: false, error: apiErr.message };
  }
});

ipcMain.handle('social-get-reply', async (e, targetFriendshipId) => {
  try {
    if (ApiClient && ApiClient.chat && typeof ApiClient.chat.getReplyState === 'function') {
      const apiRes = await ApiClient.chat.getReplyState(targetFriendshipId);
      if (apiRes && apiRes.success) return { success: true, reply: apiRes.reply || null };
    }
    return { success: true, reply: null };
  } catch (e) {
    return { success: true, reply: null };
  }
});

ipcMain.handle('social-get-messages', async (e, targetFriendshipId, beforeTimestamp) => {
  try {
    if (ApiClient && ApiClient.chat && typeof ApiClient.chat.getMessages === 'function') {
      const apiRes = await ApiClient.chat.getMessages(targetFriendshipId, beforeTimestamp);
      if (apiRes && apiRes.success && Array.isArray(apiRes.messages)) {
        return { success: true, messages: apiRes.messages };
      }
    }
    return { success: true, messages: [] };
  } catch (apiErr) {
    console.error('[Social] social-get-messages error:', apiErr.message);
    return { success: false, error: apiErr.response?.data?.error || apiErr.message, messages: [] };
  }
});

ipcMain.handle('social-mark-read', async (e, targetFriendshipId) => {
  try {
    if (ApiClient && ApiClient.chat && typeof ApiClient.chat.markRead === 'function') {
      const apiRes = await ApiClient.chat.markRead(targetFriendshipId);
      if (apiRes && apiRes.success) return { success: true };
    }
    return { success: true };
  } catch (apiErr) {
    console.error('[Social] social-mark-read error:', apiErr.message);
    return { success: false, error: apiErr.response?.data?.error || apiErr.message };
  }
});

const localReadInboxMsgIds = new Map(); // uid -> Set of read msgIds

function getReadMsgsCachePath() {
  try {
    return path.join(app.getPath('userData'), 'read_inbox_cache.json');
  } catch (_) {
    return null;
  }
}

function loadLocalReadInboxMsgs() {
  try {
    const p = getReadMsgsCachePath();
    if (p && fs.existsSync(p)) {
      const data = fs.readJsonSync(p);
      for (const [uid, ids] of Object.entries(data)) {
        localReadInboxMsgIds.set(uid, new Set(ids));
      }
    }
  } catch (_) {}
}

function saveLocalReadInboxMsgs() {
  try {
    const p = getReadMsgsCachePath();
    if (p) {
      const obj = {};
      for (const [uid, set] of localReadInboxMsgIds.entries()) {
        obj[uid] = [...set];
      }
      fs.writeJsonSync(p, obj);
    }
  } catch (_) {}
}

loadLocalReadInboxMsgs();

const userSentInboxCache = new Map(); // uid -> Array of sent message objects

function getSentMsgsCachePath() {
  try {
    return path.join(app.getPath('userData'), 'sent_inbox_cache.json');
  } catch (_) {
    return null;
  }
}

function loadLocalSentInboxMsgs() {
  try {
    const p = getSentMsgsCachePath();
    if (p && fs.existsSync(p)) {
      const data = fs.readJsonSync(p);
      for (const [uid, msgs] of Object.entries(data)) {
        if (Array.isArray(msgs)) {
          userSentInboxCache.set(uid, msgs);
        }
      }
    }
  } catch (_) {}
}

function saveLocalSentInboxMsgs() {
  try {
    const p = getSentMsgsCachePath();
    if (p) {
      const obj = {};
      for (const [uid, msgs] of userSentInboxCache.entries()) {
        obj[uid] = msgs;
      }
      fs.writeJsonSync(p, obj);
    }
  } catch (_) {}
}

loadLocalSentInboxMsgs();

ipcMain.handle('social-get-badge-counts', async () => {
  try {
    let pendingRequests = 0;
    let unreadMessages = 0;

    try {
      if (ApiClient && ApiClient.social && typeof ApiClient.social.getRequests === 'function') {
        const reqs = await ApiClient.social.getRequests();
        if (reqs && reqs.success && Array.isArray(reqs.received)) {
          pendingRequests = reqs.received.length;
        }
      }
      if (ApiClient && ApiClient.social && typeof ApiClient.social.getFriends === 'function') {
        const fRes = await ApiClient.social.getFriends();
        if (fRes && fRes.success && Array.isArray(fRes.friends)) {
          unreadMessages = fRes.friends.reduce((acc, f) => acc + (f.unread || 0), 0);
        }
      }
      return { success: true, pendingRequests, unreadMessages };
    } catch (_) {}

    return { success: true, pendingRequests, unreadMessages };
  } catch (e) {
    if (e.message === 'NO_SOCIAL_AUTH') return { success: true, pendingRequests: 0, unreadMessages: 0 };
    return { success: false, error: e.message };
  }
});

ipcMain.handle('social-edit-group', async (e, groupId, updates) => {
  try {
    if (ApiClient && ApiClient.chat && typeof ApiClient.chat.editGroup === 'function') {
      const apiRes = await ApiClient.chat.editGroup(groupId, updates);
      if (apiRes && apiRes.success) return apiRes;
    }
    return { success: false, error: 'api_unavailable' };
  } catch (apiErr) {
    return { success: false, error: apiErr.response?.data?.error || apiErr.message };
  }
});

ipcMain.handle('social-add-group-members', async (e, groupId, memberUids) => {
  try {
    if (ApiClient && ApiClient.chat && typeof ApiClient.chat.addGroupMembers === 'function') {
      const apiRes = await ApiClient.chat.addGroupMembers(groupId, memberUids);
      if (apiRes && apiRes.success) return apiRes;
    }
    return { success: false, error: 'api_unavailable' };
  } catch (apiErr) {
    return { success: false, error: apiErr.response?.data?.error || apiErr.message };
  }
});

ipcMain.handle('social-remove-group-member', async (e, groupId, memberUid) => {
  try {
    if (ApiClient && ApiClient.chat && typeof ApiClient.chat.removeGroupMember === 'function') {
      const apiRes = await ApiClient.chat.removeGroupMember(groupId, memberUid);
      if (apiRes && apiRes.success) return apiRes;
    }
    return { success: false, error: 'api_unavailable' };
  } catch (apiErr) {
    return { success: false, error: apiErr.response?.data?.error || apiErr.message };
  }
});

// --- Social Inbox IPC Handlers ---
ipcMain.handle('social-inbox-get', async (e, beforeTimestamp = null) => {
  try {
    if (ApiClient && ApiClient.inbox && typeof ApiClient.inbox.getInbox === 'function') {
      const apiRes = await ApiClient.inbox.getInbox(beforeTimestamp);
      if (apiRes && apiRes.success && Array.isArray(apiRes.messages)) {
        return { success: true, messages: apiRes.messages, lastRead: Date.now() };
      }
    }
    return { success: true, messages: [], lastRead: Date.now() };
  } catch (e) {
    console.error('[Social] Error in social-inbox-get:', e.message);
    return { success: false, error: e.message, messages: [] };
  }
});

ipcMain.handle('social-inbox-send', async (e, recipientUids, content, type = 'text', recipientNames = []) => {
  try {
    const targets = Array.isArray(recipientUids) ? recipientUids : [recipientUids];
    const names = Array.isArray(recipientNames) ? recipientNames : (recipientNames ? [recipientNames] : []);
    if (ApiClient && ApiClient.inbox && typeof ApiClient.inbox.send === 'function') {
      const apiRes = await ApiClient.inbox.send({ targets, names, content, type });
      if (apiRes && apiRes.success) return apiRes;
    }
    return { success: false, error: 'api_unavailable' };
  } catch (apiErr) {
    console.error('[Social] social-inbox-send error:', apiErr.message);
    return { success: false, error: apiErr.response?.data?.error || apiErr.message };
  }
});

ipcMain.handle('social-inbox-get-sent', async (e, beforeTimestamp = null) => {
  try {
    if (ApiClient && ApiClient.inbox && typeof ApiClient.inbox.getSent === 'function') {
      const apiRes = await ApiClient.inbox.getSent(beforeTimestamp);
      if (apiRes && apiRes.success && Array.isArray(apiRes.messages)) {
        return { success: true, messages: apiRes.messages };
      }
    }
    return { success: true, messages: [] };
  } catch (e) {
    console.error('[Social] Error in social-inbox-get-sent:', e.message);
    return { success: false, error: e.message, messages: [] };
  }
});

ipcMain.handle('social-inbox-mark-read', async (e, msgId) => {
  try {
    if (ApiClient && ApiClient.inbox && typeof ApiClient.inbox.markRead === 'function') {
      await ApiClient.inbox.markRead(msgId);
    }
    const auth = await getSocialAuth().catch(() => null);
    if (auth && auth.uid) {
      if (!localReadInboxMsgIds.has(auth.uid)) {
        localReadInboxMsgIds.set(auth.uid, new Set());
      }
      localReadInboxMsgIds.get(auth.uid).add(msgId);
      saveLocalReadInboxMsgs();
    }
    return { success: true };
  } catch (err) {
    console.error('[Social] social-inbox-mark-read error:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-user-profile', async (e, uid, username) => {
  try {
    const auth = await getSocialAuth().catch(() => null);
    let userDoc = null;
    let resolvedUid = uid;

    // 1. Primary: Fetch directly from Cloudflare Backend API
    const targetLookup = uid || (username || (typeof uid === 'string' && !uid.includes('-') && uid.length < 30 ? uid : null));
    if (targetLookup) {
      try {
        const apiRes = await ApiClient.users.getProfile(encodeURIComponent(targetLookup));
        if (apiRes && apiRes.success && apiRes.user) {
          userDoc = {
            ...apiRes.user,
            badges: Array.isArray(apiRes.user.badges) ? apiRes.user.badges : []
          };
          resolvedUid = apiRes.user.uid || resolvedUid;
        }
      } catch (_) {}
    }

    // 2. Presence
    let presence = { state: 'offline' };
    if (resolvedUid) {
      presence = await fetchPresenceForUser(resolvedUid, auth).catch(() => ({ state: 'offline' }));
    }

    // 3. Roles and badges
    const isAdmin = Boolean(userDoc?.isAdmin || userDoc?.role === 'admin' || userDoc?.role === 'owner' || (userDoc?.badges && userDoc.badges.includes('creator')));
    const isModerator = Boolean(isAdmin || userDoc?.isMod || userDoc?.role === 'moderator' || userDoc?.role === 'mod' || (userDoc?.badges && userDoc.badges.includes('moderator')));

    const badges = Array.isArray(userDoc && userDoc.badges) ? [...userDoc.badges] : [];
    if (userDoc && (userDoc.microsoftVerified === true || userDoc.accountType === 'microsoft') && !badges.includes('premium')) {
      badges.push('premium');
    }
    if (isModerator && !badges.includes('moderator')) badges.push('moderator');

    // Graceful fallback user doc if not found
    if (!userDoc) {
      userDoc = {
        username: username || uid || 'Unknown',
        displayName: username || uid || 'Unknown',
        accountType: 'microsoft',
        badges: ['premium'],
        biography: '',
        createdAt: new Date().toISOString()
      };
    }

    return {
      success: true,
      data: { ...(userDoc || {}), uid: resolvedUid || userDoc.id || uid, badges },
      isModerator,
      isAdmin,
      presence
    };
  } catch (e) {
    console.error('[get-user-profile] Error:', e);
    return {
      success: true,
      data: {
        username: username || uid || 'Unknown',
        displayName: username || uid || 'Unknown',
        accountType: 'microsoft',
        badges: ['premium'],
        biography: ''
      },
      isModerator: false,
      isAdmin: false,
      presence: { state: 'offline' }
    };
  }
});

// Fetch current user's own badges (for the account button in the launcher header)
// Strictly handled by account UID to prevent badge collision between different accounts sharing the same username
ipcMain.handle('get-own-badges', async () => {
  try {
    const userData = loadUserData();
    const isMicrosoft = userData.account_type === 'microsoft';
    const targetUid = isMicrosoft ? (userData.firebase_ms_uid || userData.uuid) : (userData.firebase_uid || userData.uuid);

    // 1. Primary: Fetch directly from Cloudflare D1 Backend strictly by UID
    if (targetUid) {
      try {
        const res = await ApiClient.users.getProfile(targetUid);
        if (res && res.success && res.user) {
          const badges = Array.isArray(res.user.badges) ? [...res.user.badges] : [];
          if ((res.user.isAdmin || res.user.role === 'admin' || res.user.role === 'owner') && !badges.includes('moderator')) {
            badges.push('moderator');
          }
          if ((isMicrosoft || res.user.microsoftVerified) && !badges.includes('premium')) {
            badges.push('premium');
          }
          return { success: true, badges };
        }
      } catch (apiErr) {
        console.warn('[get-own-badges] Backend API by UID lookup failed:', apiErr.message);
      }
    }

    // 2. Default fallback: Microsoft accounts have premium badge
    if (isMicrosoft) {
      return { success: true, badges: ['premium'] };
    }

    return { success: true, badges: [] };
  } catch (err) {
    console.error('[get-own-badges] Error:', err);
    return { success: false, badges: [] };
  }
});

ipcMain.handle('add-profile-link', async (e, uid, url, title, type) => {
  try {
    const auth = await getSocialAuth();
    if (auth.uid !== uid) {
      return { success: false, error: 'Cannot edit other users profile' };
    }

    const newLink = { url, title, type, createdAt: new Date().toISOString() };
    if (ApiClient && ApiClient.users && typeof ApiClient.users.getMe === 'function') {
      const meRes = await ApiClient.users.getMe();
      if (meRes && meRes.success && meRes.user) {
        const existingLinks = Array.isArray(meRes.user.links) ? meRes.user.links : [];
        const updatedLinks = [...existingLinks, newLink];
        await ApiClient.users.updateMe({ links: updatedLinks });
        return { success: true };
      }
    }
    return { success: false, error: 'Failed to update links' };
  } catch (e) {
    console.error('[add-profile-link] Error:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('social-promote-admin', async (e, groupId, memberUid) => {
  try {
    if (ApiClient && ApiClient.chat && typeof ApiClient.chat.promoteGroupAdmin === 'function') {
      const res = await ApiClient.chat.promoteGroupAdmin(groupId, memberUid);
      if (res && res.success) return res;
    }
    return { success: false, error: 'api_unavailable' };
  } catch (err) {
    return { success: false, error: err.response?.data?.error || err.message };
  }
});

ipcMain.handle('social-demote-admin', async (e, groupId, adminUid) => {
  try {
    if (ApiClient && ApiClient.chat && typeof ApiClient.chat.demoteGroupAdmin === 'function') {
      const res = await ApiClient.chat.demoteGroupAdmin(groupId, adminUid);
      if (res && res.success) return res;
    }
    return { success: false, error: 'api_unavailable' };
  } catch (err) {
    return { success: false, error: err.response?.data?.error || err.message };
  }
});

ipcMain.handle('social-get-group-details', async (e, groupId) => {
  try {
    if (ApiClient && ApiClient.chat && typeof ApiClient.chat.getGroupDetails === 'function') {
      const res = await ApiClient.chat.getGroupDetails(groupId);
      if (res && res.success) return res;
    }
    return { success: false, error: 'api_unavailable' };
  } catch (err) {
    return { success: false, error: err.response?.data?.error || err.message };
  }
});

ipcMain.handle('get-my-presence-server', async () => {
  try {
    const serverIp = presenceManager?.currentState?.serverIp || presenceManager?.lastServerIp || '';
    return { success: true, serverIp };
  } catch (err) {
    return { success: true, serverIp: '' };
  }
});

ipcMain.handle('get-server-history', async () => {
  try {
    const history = await getServerHistory(paths.getMcDir());
    return { success: true, history };
  } catch (err) {
    console.warn('[IPC] get-server-history failed:', err.message);
    return { success: true, history: [] };
  }
});


// ============================================================
// WORKSHOP SYSTEM - IPC Handlers
// ============================================================

function _wkDec(str) {
  if (!str) return '';
  if (typeof str !== 'string') return String(str);
  if (str.startsWith('http://') || str.startsWith('https://')) return str;
  try {
    const decoded = Buffer.from(str, 'base64').toString('utf8');
    if (/^[\x20-\x7E]+$/.test(decoded)) return decoded;
  } catch(e) {}
  return str;
}

async function _wkGetUserRoles(idToken) {
  if (!idToken) return { isAdmin: false, isMod: false };
  try {
    const parts = idToken.split('.');
    if (parts.length < 2) return { isAdmin: false, isMod: false };
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    const uid = payload.user_id || payload.sub || '';
    if (!uid) return { isAdmin: false, isMod: false };

    const cached = _roleCache.get(uid);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.roles;
    }

    let isAdmin = false;
    let isMod = false;

    // 1. Candidate UIDs (primary UID + linked account UIDs for current user only)
    const candidateUids = new Set([uid]);
    let currentUsername = '';
    try {
      const ud = loadUserData();
      if (ud.username) currentUsername = ud.username;
      if (ud.firebase_uid === uid || ud.firebase_ms_uid === uid || ud.uuid === uid) {
        if (ud.firebase_uid) candidateUids.add(ud.firebase_uid);
        if (ud.firebase_ms_uid) candidateUids.add(ud.firebase_ms_uid);
      }
    } catch (_) {}

    // 2. Query Cloudflare Backend via ApiClient
    const targets = [...candidateUids];
    if (currentUsername && !targets.includes(currentUsername)) {
      targets.push(currentUsername);
    }
    for (const ident of targets) {
      try {
        const res = await ApiClient.users.getProfile(encodeURIComponent(ident));
        if (res && res.success && res.user) {
          const u = res.user;
          const role = (u.role || '').toLowerCase();
          const badges = Array.isArray(u.badges) ? u.badges : [];
          if (u.isAdmin || role === 'admin' || role === 'owner' || badges.includes('creator')) {
            isAdmin = true;
            isMod = true;
            break;
          } else if (u.isMod || role === 'moderator' || role === 'mod' || badges.includes('moderator')) {
            isMod = true;
          }
        }
      } catch (_) {}
    }

    const roles = { isAdmin, isMod: isMod || isAdmin };
    _roleCache.set(uid, { roles, expiresAt: Date.now() + 5 * 60 * 1000 });
    return roles;
  } catch (e) {
    console.warn('[_wkGetUserRoles] Error:', e.message);
    return { isAdmin: false, isMod: false };
  }
}

async function _wkAdminCheck(idToken) {
  const roles = await _wkGetUserRoles(idToken);
  return roles.isAdmin;
}

async function _wkModCheck(idToken) {
  const roles = await _wkGetUserRoles(idToken);
  return roles.isMod;
}

async function _wkNotifyAdmin(item, authorName) {
  const currentSecrets = loadSecrets();
  const rawWebhook = currentSecrets.WORKSHOP_DISCORD_WEBHOOK || APP_SECRETS.WORKSHOP_DISCORD_WEBHOOK || '';
  const webhookUrl = _wkDec(rawWebhook) || rawWebhook;
  if (webhookUrl) {
    try {
      await axios.post(webhookUrl, {
        username: "HelloWorld Workshop Notification",
        embeds: [
          {
            title: "🛠️ **New Workshop Submission!**",
            color: 0x00aa00,
            fields: [
              {
                name: "**Type**",
                value: String(item.type || 'Unknown').toUpperCase(),
                inline: true
              },
              {
                name: "**Author**",
                value: String(authorName || 'Unknown'),
                inline: true
              },
              {
                name: "**Title**",
                value: String(item.title || 'Untitled'),
                inline: false
              },
              {
                name: "**Description**",
                value: String(item.desc || 'No description provided').slice(0, 1000),
                inline: false
              },
              {
                name: "**Item ID**",
                value: `\`${item._id || ''}\``,
                inline: false
              }
            ],
            timestamp: new Date().toISOString()
          }
        ]
      }, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'HelloWorldLauncher/1.0'
        }
      });
      console.log('[Workshop] Successfully sent Discord notification to webhook.');
    } catch(e) {
      console.error('[Workshop] Discord notify failed:', e.response ? `${e.response.status} ${JSON.stringify(e.response.data)}` : e.message);
    }
  } else {
    console.warn('[Workshop] No Discord webhook URL configured.');
  }
}

// --- Workshop Configs Packaging & Extraction ---
function packageProfileConfigs(profileDir) {
  try {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip();
    let hasFiles = false;

    const configPath = path.join(profileDir, 'config');
    const defConfigPath = path.join(profileDir, 'defaultconfigs');
    const optionsPath = path.join(profileDir, 'options.txt');

    const addFolderFiltered = (localDir, zipPrefix) => {
      if (!fs.existsSync(localDir)) return;
      const entries = fs.readdirSync(localDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(localDir, entry.name);
        const zipEntryDir = zipPrefix || '';
        if (entry.isDirectory()) {
          addFolderFiltered(fullPath, zipPrefix ? `${zipPrefix}/${entry.name}` : entry.name);
        } else if (entry.isFile()) {
          const lower = entry.name.toLowerCase();
          // Filter out logs, crash reports, cache and backup files
          if (lower.endsWith('.log') || lower.endsWith('.gz') || lower.endsWith('.bak') || lower.endsWith('.tmp') || lower.endsWith('.old')) continue;
          try {
            const stat = fs.statSync(fullPath);
            if (stat.size > 2 * 1024 * 1024) continue; // Skip single files > 2MB
            zip.addLocalFile(fullPath, zipEntryDir);
            hasFiles = true;
          } catch (_) {}
        }
      }
    };

    if (fs.existsSync(configPath)) {
      addFolderFiltered(configPath, 'config');
    }
    if (fs.existsSync(defConfigPath)) {
      addFolderFiltered(defConfigPath, 'defaultconfigs');
    }
    if (fs.existsSync(optionsPath)) {
      try {
        zip.addLocalFile(optionsPath, '');
        hasFiles = true;
      } catch (_) {}
    }

    if (!hasFiles) return null;

    const buffer = zip.toBuffer();
    // Keep zip buffer under 550KB so base64 string is <= 733KB, well within cloud payload limits
    if (buffer.length > 550 * 1024) {
      console.warn('[packageProfileConfigs] Configs zip exceeds 550KB, skipping to protect payload size:', buffer.length);
      return null;
    }
    console.log(`[packageProfileConfigs] Successfully packaged configs (${buffer.length} bytes compressed)`);
    return buffer.toString('base64');
  } catch (err) {
    console.error('[packageProfileConfigs] Error:', err.message);
    return null;
  }
}

function extractProfileConfigs(profileDir, configZipB64) {
  if (!configZipB64 || typeof configZipB64 !== 'string') return { success: true };
  try {
    const AdmZip = require('adm-zip');
    const buffer = Buffer.from(configZipB64, 'base64');
    const zip = new AdmZip(buffer);
    fs.ensureDirSync(profileDir);
    zip.extractAllTo(profileDir, true);
    console.log(`[extractProfileConfigs] Extracted configs to ${profileDir}`);
    return { success: true };
  } catch (err) {
    console.error('[extractProfileConfigs] Error:', err.message);
    return { success: false, error: err.message };
  }
}

ipcMain.handle('workshop-package-profile', async (e, profileId) => {
  try {
    const profiles = profileManager.loadProfiles().profiles;
    const profile = profiles[profileId];
    if (!profile) return { success: false, error: 'Profile not found' };
    const mcDir = paths.getMcDir();
    const profileDir = profile.directory || mcDir;
    const configZipB64 = packageProfileConfigs(profileDir);
    return { success: true, configZipB64 };
  } catch (err) {
    console.error('[workshop-package-profile]', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('workshop-extract-configs', async (e, { profile_id, configZipB64 }) => {
  try {
    const profiles = profileManager.loadProfiles().profiles;
    const profile = profiles[profile_id];
    if (!profile) return { success: false, error: 'Profile not found' };
    const mcDir = paths.getMcDir();
    const profileDir = profile.directory || mcDir;
    return extractProfileConfigs(profileDir, configZipB64);
  } catch (err) {
    console.error('[workshop-extract-configs]', err.message);
    return { success: false, error: err.message };
  }
});

// GET items (pub = approved public items)
function wkParseItem(item) {
  if (!item) return item;
  if (item.snap && typeof item.snap.addonsJson === 'string') {
    try { item.snap.addons = JSON.parse(item.snap.addonsJson); } catch(_) { item.snap.addons = []; }
    delete item.snap.addonsJson;
  }
  return item;
}

ipcMain.handle('workshop-get-items', async (e, type, xst) => {
  try {
    const res = await ApiClient.workshop.getItems(type || 'modpack', 'latest');
    if (res && res.success && Array.isArray(res.items)) {
      return { success: true, items: res.items };
    }
    return { success: true, items: [] };
  } catch(e) {
    console.error('[workshop-get-items]', e.message);
    return { success: false, items: [], error: e.message };
  }
});

// GET single item by id
ipcMain.handle('workshop-get-item', async (e, id) => {
  try {
    const res = await ApiClient.workshop.getItem(id);
    if (res && res.success && res.item) {
      return { success: true, item: res.item };
    }
    return { success: false, error: 'item_not_found' };
  } catch(e) {
    console.error('[workshop-get-item]', e.message);
    return { success: false, error: e.message };
  }
});

// GET my own items (any status)
ipcMain.handle('workshop-get-my-items', async () => {
  try {
    const res = await ApiClient.workshop.getMyItems();
    if (res && res.success && Array.isArray(res.items)) {
      return { success: true, items: res.items };
    }
    return { success: true, items: [] };
  } catch(e) {
    console.error('[workshop-get-my-items]', e.message);
    return { success: false, items: [], error: e.message };
  }
});

// SUBMIT new workshop item (status: pending = 'pnd')
ipcMain.handle('workshop-submit-item', async (e, data) => {
  try {
    const auth = await getSocialAuth();
    let authorName = auth.uid;
    try {
      const ud = loadUserData();
      authorName = ud.username || ud.displayName || auth.uid;
    } catch (_) {}

    let iconName = data.icon || '';
    let iconB64 = data.iconB64 || null;

    if (typeof iconName === 'string' && iconName.startsWith('data:')) {
      iconB64 = iconName;
      iconName = '';
    }

    // Helper: is this a built-in launcher profile icon?
    const isLauncherIcon = (name) => {
      if (!name || typeof name !== 'string') return false;
      const base = path.basename(name).toLowerCase();
      const p1 = path.join(__dirname, 'ui', 'img', 'profiles', base);
      const p2 = path.join(__dirname, 'ui', 'img', base);
      return fs.existsSync(p1) || fs.existsSync(p2);
    };

    if (iconName && !iconB64) {
      if (!isLauncherIcon(iconName)) {
        try {
          const rawB64 = profileManager.getProfileIconAsBase64(iconName);
          if (rawB64 && (rawB64.startsWith('data:') || rawB64.length > 50)) {
            iconB64 = rawB64;
            iconName = '';
          }
        } catch (err) {
          console.warn('[workshop-submit-item] Could not convert custom icon to base64:', err.message);
        }
      }
    }

    const submitPayload = {
      type: data.type || 'modpack',
      title: (data.title || '').slice(0, 50),
      desc: (data.desc || '').slice(0, 300),
      icon: iconB64 || iconName,
      snap: data.snap || {}
    };

    const res = await ApiClient.workshop.submitItem(submitPayload);
    if (res && res.success && res.id) {
      await _wkNotifyAdmin({ ...submitPayload, _id: res.id }, authorName).catch(() => {});
      return { success: true, id: res.id };
    }
    return { success: false, error: 'submit_failed' };
  } catch(e) {
    console.error('[workshop-submit-item]', e.message);
    return { success: false, error: e.response?.data?.error || e.message };
  }
});

// --- Workshop Stats IPC Handlers ---
ipcMain.handle('workshop-record-view', async (e, id) => {
  try {
    const res = await ApiClient.workshop.recordView(id);
    if (res && res.success) {
      return { success: true };
    }
    return { success: false };
  } catch(err) {
    console.error('[workshop-record-view]', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('workshop-toggle-like', async (e, id) => {
  try {
    const res = await ApiClient.workshop.toggleLike(id);
    if (res && res.success) {
      return { success: true, isLiked: res.liked ?? res.isLiked, likes: res.likes };
    }
    return { success: false, error: 'toggle_like_failed' };
  } catch(err) {
    console.error('[workshop-toggle-like]', err.message);
    return { success: false, error: err.response?.data?.error || err.message };
  }
});

ipcMain.handle('workshop-record-download', async (e, id) => {
  try {
    const res = await ApiClient.workshop.recordDownload(id);
    if (res && res.success) {
      return { success: true };
    }
    return { success: false };
  } catch(err) {
    console.error('[workshop-record-download]', err.message);
    return { success: false, error: err.message };
  }
});

// --- Remote Configuration & Maintenance Handlers ---
const REMOTE_CONFIG_GIST_URL = APP_SECRETS.REMOTE_CONFIG_GIST_URL || 'https://gist.githubusercontent.com/abeloskyyy/b50089b634ed09f48c921f9c8126a49f/raw/hwlauncher-info.json';
let _cachedRemoteConfig = null;

async function fetchRemoteConfigBackend() {
  try {
    const res = await axios.get(REMOTE_CONFIG_GIST_URL, {
      params: { _cb: Date.now() },
      timeout: 5000,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      transformResponse: [(data) => {
        if (!data || typeof data !== 'string') return data;
        try {
          return JSON.parse(data);
        } catch (e1) {
          try {
            const fixed = data.replace(/([0-9]|true|false|null|"|\]|\})\s*(\r?\n)+\s*(")/g, '$1,\n$3');
            return JSON.parse(fixed);
          } catch (_) {
            return data;
          }
        }
      }]
    });
    let data = res.data;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e1) {
        try {
          const fixed = data.replace(/([0-9]|true|false|null|"|\]|\})\s*(\r?\n)+\s*(")/g, '$1,\n$3');
          data = JSON.parse(fixed);
        } catch (_) {}
      }
    }
    if (data && typeof data === 'object') {
      _cachedRemoteConfig = data;
      const maintenanceActive = Boolean(data.maintenance && data.maintenance.enabled);
      if (_isMaintenanceActive !== maintenanceActive) {
        _isMaintenanceActive = maintenanceActive;
        console.log('[Maintenance] State updated:', _isMaintenanceActive ? 'ACTIVE' : 'INACTIVE');
      }
      return { success: true, data: data };
    }
  } catch (err) {
    console.warn('[RemoteConfig] Fetch error:', err.message);
  }
  return { success: Boolean(_cachedRemoteConfig), data: _cachedRemoteConfig };
}

ipcMain.handle('fetch-remote-config', async () => {
  return await fetchRemoteConfigBackend();
});

ipcMain.handle('set-maintenance-state', (event, active) => {
  const next = Boolean(active);
  if (_isMaintenanceActive !== next) {
    _isMaintenanceActive = next;
    console.log('[Maintenance] State updated:', _isMaintenanceActive ? 'ACTIVE' : 'INACTIVE');
    try { updateTrayMenu(); } catch (_) {}
  }
  return { success: true, isMaintenanceActive: _isMaintenanceActive };
});

ipcMain.handle('set-mandatory-update-state', (event, active) => {
  _isMandatoryUpdateActive = Boolean(active);
  console.log('[MandatoryUpdate] State updated:', _isMandatoryUpdateActive ? 'ACTIVE' : 'INACTIVE');
  try { updateTrayMenu(); } catch (_) {}
  return { success: true, isMandatoryUpdateActive: _isMandatoryUpdateActive };
});

ipcMain.handle('get-mandatory-update-state', () => {
  return { isMandatoryUpdateActive: _isMandatoryUpdateActive };
});

ipcMain.handle('enable-admin-bypass', async () => {
  try {
    const auth = await getSocialAuth();
    if (!auth || !auth.idToken) {
      return { success: false, error: 'not_authenticated' };
    }
    const isAdmin = await _wkAdminCheck(auth.idToken);
    if (!isAdmin) {
      return { success: false, error: 'not_admin' };
    }
    _adminBypassGranted = true;
    console.log('[Maintenance] Admin bypass GRANTED for UID:', auth.uid);
    try { updateTrayMenu(); } catch (_) {}
    return { success: true, adminBypassGranted: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-maintenance-state', () => {
  return {
    isMaintenanceActive: _isMaintenanceActive,
    adminBypassGranted: _adminBypassGranted
  };
});

ipcMain.handle('dismiss-announcement', async (event, id) => {
  if (!id) return { success: false };
  const current = loadUserData();
  const list = Array.isArray(current.dismissed_announcements) ? [...current.dismissed_announcements] : [];
  const strId = String(id).trim();
  if (!list.includes(strId)) {
    list.push(strId);
    saveUserData({ ...current, dismissed_announcements: list });
    console.log('[Announcement] Dismissed permanently by ID:', strId);
  }
  return { success: true, dismissed: list };
});

ipcMain.handle('get-dismissed-announcements', async () => {
  const current = loadUserData();
  return Array.isArray(current.dismissed_announcements) ? current.dismissed_announcements : [];
});

ipcMain.handle('workshop-check-admin', async () => {
  try {
    let auth = null;
    try { auth = await getSocialAuth(); } catch (_) {}
    if (auth && auth.idToken) {
      const roles = await _wkGetUserRoles(auth.idToken);
      if (roles.isAdmin || roles.isMod) {
        return { success: true, isAdmin: roles.isAdmin, isMod: roles.isMod };
      }
    }
    // Also check current logged-in user profile from ApiClient strictly by UID
    try {
      const ud = loadUserData();
      const isMicrosoft = ud && ud.account_type === 'microsoft';
      const targetUid = isMicrosoft ? (ud.firebase_ms_uid || ud.uuid) : (ud.firebase_uid || ud.uuid);
      if (targetUid) {
        const res = await ApiClient.users.getProfile(targetUid);
        if (res && res.success && res.user) {
          const u = res.user;
          const role = (u.role || '').toLowerCase();
          const badges = Array.isArray(u.badges) ? u.badges : [];
          const isAdmin = Boolean(u.isAdmin || role === 'admin' || role === 'owner' || badges.includes('creator'));
          const isMod = Boolean(isAdmin || u.isMod || role === 'moderator' || role === 'mod' || badges.includes('moderator'));
          return { success: true, isAdmin, isMod };
        }
      }
    } catch (_) {}

    return { success: true, isAdmin: false, isMod: false };
  } catch(e) {
    return { success: true, isAdmin: false, isMod: false };
  }
});

ipcMain.handle('workshop-admin-get-items', async (e, statusFilter) => {
  try {
    const res = await ApiClient.workshop.getAdminItems(statusFilter || 'all');
    if (res && res.success && Array.isArray(res.items)) {
      return { success: true, items: res.items };
    }
    return { success: true, items: [] };
  } catch(e) {
    console.error('[workshop-admin-get-items]', e.message);
    return { success: false, items: [], error: e.response?.data?.error || e.message };
  }
});

ipcMain.handle('workshop-moderate-item', async (e, id, newStatus, note, isOfficial) => {
  try {
    const res = await ApiClient.workshop.updateStatus(id, newStatus, note, isOfficial);
    if (res && res.success) {
      return { success: true };
    }
    return { success: false, error: 'moderate_failed' };
  } catch(e) {
    console.error('[workshop-moderate-item]', e.message);
    return { success: false, error: e.response?.data?.error || e.message };
  }
});

ipcMain.handle('workshop-delete-item', async (e, id) => {
  try {
    const res = await ApiClient.workshop.deleteItem(id);
    if (res && res.success) {
      return { success: true };
    }
    return { success: false, error: 'delete_failed' };
  } catch(e) {
    console.error('[workshop-delete-item]', e.message);
    return { success: false, error: e.response?.data?.error || e.message };
  }
});
// Windows shortcut maintenance helper

function ensureWindowsShortcut() {
  if (process.platform !== 'win32') return;
  try {
    const startMenuDir = path.join(
      app.getPath('appData'),
      'Microsoft', 'Windows', 'Start Menu', 'Programs'
    );
    if (!fs.existsSync(startMenuDir)) {
      fs.mkdirSync(startMenuDir, { recursive: true });
    }
    const shortcutPath = path.join(startMenuDir, 'HelloWorld Launcher.lnk');

    let iconPath = path.join(__dirname, 'build', 'icon.ico');
    if (!fs.existsSync(iconPath)) {
      iconPath = process.execPath;
    }

    const shortcutOptions = {
      target: process.execPath,
      args: app.isPackaged ? '' : `"${app.getAppPath()}"`,
      cwd: path.dirname(process.execPath),
      appUserModelId: 'com.abelosky.helloworldlauncher',
      description: 'HelloWorld Launcher',
      icon: iconPath,
      iconIndex: 0
    };

    let needWrite = true;
    if (fs.existsSync(shortcutPath)) {
      try {
        const current = shell.readShortcutLink(shortcutPath);
        if (current.appUserModelId === 'com.abelosky.helloworldlauncher' && current.target === process.execPath) {
          needWrite = false;
        }
      } catch (_) {}
    }

    if (needWrite) {
      shell.writeShortcutLink(shortcutPath, fs.existsSync(shortcutPath) ? 'replace' : 'create', shortcutOptions);
      console.log('[WindowsShortcut] Ensured Start Menu shortcut with AppUserModelId:', shortcutPath);
    }

    // Also scan Start Menu and Desktop for profile shortcuts that might still have the main launcher's appUserModelId
    const fixProfileShortcutsInDir = (dir) => {
      if (!fs.existsSync(dir)) return;
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (!file.toLowerCase().endsWith('.lnk')) continue;
          if (file.toLowerCase() === 'helloworld launcher.lnk') continue;
          const fullPath = path.join(dir, file);
          try {
            const sc = shell.readShortcutLink(fullPath);
            const isProfileShortcut = (sc.args && sc.args.includes('--launch-profile')) || file.includes('(HelloWorld Launcher)');
            if (isProfileShortcut && sc.appUserModelId === 'com.abelosky.helloworldlauncher') {
              const updatedOptions = {
                ...sc,
                appUserModelId: 'com.abelosky.helloworldlauncher.profile'
              };
              shell.writeShortcutLink(fullPath, 'replace', updatedOptions);
              console.log('[WindowsShortcut] Disassociated profile shortcut from main launcher AUMID:', fullPath);
            }
          } catch (_) {}
        }
      } catch (_) {}
    };

    fixProfileShortcutsInDir(startMenuDir);
    fixProfileShortcutsInDir(app.getPath('desktop'));
  } catch (e) {
    console.error('[WindowsShortcut] Error updating shortcuts:', e.message);
  }
}

function ensureLinuxDesktopShortcut() {
  if (process.platform !== 'linux') return;
  try {
    const execDir = path.dirname(process.execPath);
    const installIconPath = path.join(execDir, 'icon.png');
    const iconCandidates = [
      path.join(__dirname, 'ui', 'icon.png'),
      path.join(__dirname, 'build', 'icon.png'),
      path.join(process.resourcesPath || '', 'icon.png')
    ];

    let iconBuf = null;
    for (const cand of iconCandidates) {
      try {
        if (cand && fs.existsSync(cand)) {
          iconBuf = fs.readFileSync(cand);
          if (iconBuf && iconBuf.length > 0) break;
        }
      } catch (_) {}
    }

    if (iconBuf) {
      if (app.isPackaged && !fs.existsSync(installIconPath)) {
        try { fs.writeFileSync(installIconPath, iconBuf); } catch (_) {}
      }
      for (const size of ['256x256', '512x512']) {
        try {
          const iconDir = path.join(os.homedir(), '.local', 'share', 'icons', 'hicolor', size, 'apps');
          fs.mkdirSync(iconDir, { recursive: true });
          const themeIcon = path.join(iconDir, 'helloworld-launcher.png');
          if (!fs.existsSync(themeIcon)) {
            fs.writeFileSync(themeIcon, iconBuf);
          }
        } catch (_) {}
      }
    }

    if (!app.isPackaged) return;

    const validIconPath = fs.existsSync(installIconPath) ? installIconPath : 'helloworld-launcher';
    const desktopDirs = [
      path.join(os.homedir(), '.local', 'share', 'applications'),
      path.join(os.homedir(), 'Desktop'),
      path.join(os.homedir(), 'Escritorio')
    ];

    let repaired = false;
    for (const dir of desktopDirs) {
      const desktopFile = path.join(dir, 'helloworld-launcher.desktop');
      if (!fs.existsSync(desktopFile)) continue;
      try {
        const raw = fs.readFileSync(desktopFile, 'utf8');
        const iconMatch = raw.match(/^Icon=(.*)$/m);
        const currentIcon = iconMatch ? iconMatch[1].trim() : '';
        const isValidImage = currentIcon && /\.(png|svg|xpm|ico)$/i.test(currentIcon) && fs.existsSync(currentIcon);
        if (!isValidImage && currentIcon !== 'helloworld-launcher') {
          const updated = iconMatch
            ? raw.replace(/^Icon=.*$/m, `Icon=${validIconPath}`)
            : `${raw.trimEnd()}\nIcon=${validIconPath}\n`;
          fs.writeFileSync(desktopFile, updated, 'utf8');
          repaired = true;
          console.log('[LinuxDesktop] Repaired desktop entry Icon:', desktopFile, '->', validIconPath);
        }
      } catch (_) {}
    }

    if (repaired) {
      exec('update-desktop-database ~/.local/share/applications', () => {});
      exec(`gtk-update-icon-cache -f -t "${path.join(os.homedir(), '.local', 'share', 'icons', 'hicolor')}"`, () => {});
    }
  } catch (e) {
    console.error('[LinuxDesktop] Error checking desktop entry:', e.message);
  }
}

// --- App Events ---
app.whenReady().then(() => {
  try {
    cleanOrphanedTmpFiles(path.join(app.getPath('userData'), 'updates'));
  } catch (_) {}
  try {
    const initUserData = loadUserData();
    if (initUserData.start_on_boot !== undefined) {
      applyAutoStartSetting(initUserData.start_on_boot);
    }
    rpc.setEnabled(initUserData.discord_rpc_enabled !== false);
  } catch (_) {}
  ensureWindowsShortcut();
  ensureLinuxDesktopShortcut();
  getNotificationIconPath();
  // Ensure default profile images exist in user data
  try {
    const srcDir = path.join(__dirname, 'ui', 'img', 'profiles');
    const destDir = paths.getProfilesImgDir();
    if (fs.existsSync(srcDir)) {
      fs.ensureDirSync(destDir);
      const files = fs.readdirSync(srcDir);
      let copiedCount = 0;
      for (const file of files) {
        if (!file.endsWith('.png')) continue;
        const srcFile = path.join(srcDir, file);
        const destFile = path.join(destDir, file);
        if (!fs.existsSync(destFile)) {
          fs.copySync(srcFile, destFile);
          copiedCount++;
        }
      }
      if (copiedCount > 0) {
        console.log(`Default profile images copied (${copiedCount} new files) to:`, destDir);
      }
    }
  } catch (e) {
    console.error("Error copying default profile images:", e);
  }

  // Ensure user.json has a valid mcdir on startup if missing
  // Handled automatically by loadUserData() now.
  loadUserData();

  // Register secure protocol for local files
  const { protocol } = require('electron');
  protocol.registerFileProtocol('launcher', (request, callback) => {
    const url = request.url.replace('launcher://', '');
    try {
      return callback(decodeURIComponent(url));
    } catch (error) {
      console.error('Failed to register protocol', error);
    }
  });

  createWindow();
  createTray();
  try {
    if (process.platform === 'win32') {
      const startMenuLnk = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'HelloWorld Launcher.lnk');
      if (fs.existsSync(startMenuLnk)) {
        const current = shell.readShortcutLink(startMenuLnk);
        if (!current.appUserModelId || current.appUserModelId !== 'com.abelosky.helloworldlauncher') {
          shell.writeShortcutLink(startMenuLnk, 'update', {
            appUserModelId: 'com.abelosky.helloworldlauncher'
          });
        }
      }
    }
  } catch (_) {}
  try {
    requestUpdateJumpList();
  } catch (_) {}
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      showAndFocusWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  if (!isQuitting) return;
  await presenceManager.setOffline();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', async () => {
  isQuitting = true;
  if (tray && !tray.isDestroyed()) {
    try { tray.destroy(); } catch (_) {}
  }
  console.log("App closing, cleaning up processes...");

  // Set presence to offline when launcher closes (await to ensure it completes)
  await presenceManager.setOffline();

  // Abort any active installer download cleanly and delete its temp file
  if (activeInstallerDownload) {
    console.log('[before-quit] Aborting active installer download and cleaning temp files...');
    try {
      if (activeInstallerDownload.res && activeInstallerDownload.res.data) {
        activeInstallerDownload.res.data.destroy();
      }
      if (activeInstallerDownload.writer && !activeInstallerDownload.writer.destroyed) {
        activeInstallerDownload.writer.destroy();
      }
      if (activeInstallerDownload.tempPath && fs.existsSync(activeInstallerDownload.tempPath)) {
        try { fs.unlinkSync(activeInstallerDownload.tempPath); } catch (_) {}
      }
    } catch (_) {}
    activeInstallerDownload = null;
  }

  // 1. Kill all active download game processes
  for (const [version_id, info] of activeDownloads) {
    try {
      if (info.gameProcess && info.gameProcess.pid) {
        console.log(`Killing download process for ${version_id} (PID: ${info.gameProcess.pid})`);
        process.kill(info.gameProcess.pid, 'SIGKILL');
      }
      if (info.launcher) {
        info.launcher.removeAllListeners();
      }
    } catch (e) {
      console.error(`Error cleaning up download ${version_id}:`, e);
    }
  }
  activeDownloads.clear();

  // 2. Kill main game process if running (optional, but good practice)
  // Assuming 'launcher' might have internal state, but MCLC doesn't expose the main process easily globally unless we track it
  // But we have rpc.setIdle() which is good.

  // Hard exit fallback to guarantee process singleton lock is freed
  setTimeout(() => {
    try {
      if (app && !app.isDestroyed?.()) app.exit(0);
    } catch (_) {}
    process.exit(0);
  }, 1000);
});
