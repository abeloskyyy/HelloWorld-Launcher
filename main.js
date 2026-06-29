const { app, BrowserWindow, ipcMain, Menu, shell, dialog, safeStorage, Notification } = require('electron')
const path = require('path')
const http = require('http')
const { URL } = require('url')
const crypto = require('crypto')
const { exec } = require('child_process')
const dns = require('dns').promises

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
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Global Error] Unhandled Rejection at:', promise, 'reason:', reason);
});


const { Client } = require('minecraft-launcher-core')
const msmc = require('msmc')
const axios = require('axios')
const { autoUpdater } = require("electron-updater")

// Configure AutoUpdater
autoUpdater.logger = require("electron-log")
autoUpdater.logger.transports.file.level = "info"
autoUpdater.autoDownload = false // Let user decide, or set true to auto-download

// -- Modules --
const rpc = require('./src/utils/rpc')
const paths = require('./src/utils/paths')
const profileManager = require('./src/handlers/profiles')
const modManager = require('./src/handlers/mods')

// Hardware Acceleration Check before App Ready
try {
  const userJsonPath = paths.getUserFilePath();
  if (fs.existsSync(userJsonPath)) {
    const data = JSON.parse(fs.readFileSync(userJsonPath, 'utf8'));
    if (data.hw_accel === false) {
      console.log("Hardware acceleration is disabled by user setting.");
      app.disableHardwareAcceleration();
    }
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
  console.log("[Launcher Debug]", e);
  mainWindow && mainWindow.webContents.send('info-message', e);
})
launcher.on('data', (e) => {
  console.log("[Launcher Data]", e);
  mainWindow && mainWindow.webContents.send('info-message', e);
})
launcher.on('progress', (e) => {
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
    console.log("[Launcher Progress]", e);
  }
  mainWindow && mainWindow.webContents.send('download-progress', e);
})
launcher.on('close', handleLauncherClose);

let mainWindow = null

// --- Encryption and Data ---
const DEFAULT_USER_DATA = {
  username: "",
  account_type: "offline",
  mcdir: "",
  dev_mode: false,
  show_snapshots: false,
  show_old: false,
  addons_per_page: 20,
  launch_count: 0,
  has_reviewed: false,
  onboarding_completed: false,
  last_skin_url: "",
  last_skin_variant: "classic",
  last_cape_url: ""
};

let userDataCache = null;

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

  // Ensure mcdir is valid
  if (!userDataCache.mcdir || userDataCache.mcdir.trim() === "") {
    userDataCache.mcdir = paths.getMcDir();
  }

  // Auto-save IF it's a new file or has missing keys (to initialize it)
  if (!fileExists || Object.keys(DEFAULT_USER_DATA).some(k => !new Set(Object.keys(diskData)).has(k))) {
    saveUserData(userDataCache);
  }

  return userDataCache;
}

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
  } catch (e) {
    console.error("Error saving user data:", e);
  }
}

const normalizeUuid = (uuid) => (uuid || '').replace(/-/g, '').toLowerCase();

// --- Firebase / Social Constants ---
const FIREBASE_API_KEY = "AIzaSyACXEDO5R48HrlxVCyz8fBGimEIVkY2QSM";
const FIREBASE_PROJECT_ID = "helloworld-launcher";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

// --- Social Helper: Parse Firestore doc fields ---
function parseFirestoreFields(fields) {
  if (!fields) return {};
  const out = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v.stringValue !== undefined) out[k] = v.stringValue;
    else if (v.integerValue !== undefined) out[k] = parseInt(v.integerValue);
    else if (v.doubleValue !== undefined) out[k] = v.doubleValue;
    else if (v.booleanValue !== undefined) out[k] = v.booleanValue;
    else if (v.timestampValue !== undefined) out[k] = v.timestampValue;
    else if (v.nullValue !== undefined) out[k] = null;
    else if (v.arrayValue !== undefined) {
      out[k] = (v.arrayValue.values || []).map(item => {
        if (item.stringValue !== undefined) return item.stringValue;
        else if (item.integerValue !== undefined) return parseInt(item.integerValue);
        else if (item.doubleValue !== undefined) return item.doubleValue;
        else if (item.booleanValue !== undefined) return item.booleanValue;
        else if (item.mapValue !== undefined) return parseFirestoreFields(item.mapValue.fields || {});
        else return null;
      });
    }
  }
  return out;
}

// --- Social Helper: Build Firestore fields from plain object ---
function buildFSFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') fields[k] = { stringValue: v };
    else if (typeof v === 'boolean') fields[k] = { booleanValue: v };
    else if (typeof v === 'number') fields[k] = Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    else if (v === null) fields[k] = { nullValue: null };
    else if (Array.isArray(v)) fields[k] = { arrayValue: { values: v.map(i => ({ stringValue: String(i) })) } };
  }
  return fields;
}

// --- Social Helper: Firestore REST calls ---
async function fsGet(docPath, idToken) {
  const res = await axios.get(`${FIRESTORE_BASE}/${docPath}`, { headers: { Authorization: `Bearer ${idToken}` } });
  return { id: docPath.split('/').pop(), ...parseFirestoreFields(res.data.fields) };
}
async function fsSet(docPath, obj, idToken, mask) {
  const url = mask
    ? `${FIRESTORE_BASE}/${docPath}?${mask.map(f => `updateMask.fieldPaths=${f}`).join('&')}`
    : `${FIRESTORE_BASE}/${docPath}`;
  const res = await axios.patch(url, { fields: buildFSFields(obj) }, { headers: { Authorization: `Bearer ${idToken}` } });
  return res.data;
}
async function fsDel(docPath, idToken) {
  await axios.delete(`${FIRESTORE_BASE}/${docPath}`, { headers: { Authorization: `Bearer ${idToken}` } });
}
async function fsUpdate(docPath, data, idToken) {
  const fields = buildFSFields(data);
  const mask = Object.keys(data).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  await axios.patch(`${FIRESTORE_BASE}/${docPath}?${mask}`, { fields }, { headers: { Authorization: `Bearer ${idToken}` } });
}
async function fsQuery(collectionId, filters, idToken, orderBy, limit = 50) {
  const makeFilter = (f) => ({ fieldFilter: { field: { fieldPath: f.field }, op: f.op, value: f.value } });
  const where = filters.length === 1 ? makeFilter(filters[0])
    : { compositeFilter: { op: 'AND', filters: filters.map(makeFilter) } };
  const body = { structuredQuery: { from: [{ collectionId }], where, limit } };
  if (orderBy) body.structuredQuery.orderBy = [{ field: { fieldPath: orderBy }, direction: 'DESCENDING' }];
  const res = await axios.post(`${FIRESTORE_BASE}:runQuery`, body,
    idToken ? { headers: { Authorization: `Bearer ${idToken}` } } : {});
  return (res.data || []).filter(r => r.document).map(r => ({
    id: r.document.name.split('/').pop(),
    ...parseFirestoreFields(r.document.fields)
  }));
}
async function fsQuerySub(parentPath, collectionId, filters, idToken, orderBy, limit = 50) {
  const makeFilter = (f) => ({ fieldFilter: { field: { fieldPath: f.field }, op: f.op, value: f.value } });
  const body = { structuredQuery: { from: [{ collectionId }], limit } };
  if (filters.length === 1) body.structuredQuery.where = makeFilter(filters[0]);
  else if (filters.length > 1) body.structuredQuery.where = { compositeFilter: { op: 'AND', filters: filters.map(makeFilter) } };
  if (orderBy) body.structuredQuery.orderBy = [{ field: { fieldPath: orderBy }, direction: 'DESCENDING' }];
  const res = await axios.post(`${FIRESTORE_BASE}/${parentPath}:runQuery`, body,
    { headers: { Authorization: `Bearer ${idToken}` } });
  return (res.data || []).filter(r => r.document).map(r => ({
    id: r.document.name.split('/').pop(),
    ...parseFirestoreFields(r.document.fields)
  }));
}

// --- Social Helper: Refresh Firebase ID token ---
async function refreshFirebaseToken(refreshToken) {
  try {
    const res = await axios.post(`https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`, {
      grant_type: 'refresh_token', refresh_token: refreshToken
    });
    return { idToken: res.data.id_token, refreshToken: res.data.refresh_token, uid: res.data.user_id };
  } catch (err) {
    if (err.response && err.response.status === 400) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }
    throw err;
  }
}

// --- Social Helper: Get valid social auth credentials for current user ---
async function getSocialAuth() {
  const userData = loadUserData();
  if (userData.account_type === 'helloworld') {
    if (!userData.firebase_refresh_token) throw new Error('NO_SOCIAL_AUTH');
    try {
      const refreshed = await refreshFirebaseToken(userData.firebase_refresh_token);
      userData.firebase_id_token = refreshed.idToken;
      userData.firebase_refresh_token = refreshed.refreshToken;
      saveUserData(userData);
      return { uid: userData.firebase_uid, idToken: refreshed.idToken, accountType: 'helloworld', username: userData.username };
    } catch (err) {
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
    if (!userData.firebase_ms_refresh_token) throw new Error('NO_SOCIAL_AUTH');
    try {
      const refreshed = await refreshFirebaseToken(userData.firebase_ms_refresh_token);
      userData.firebase_ms_refresh_token = refreshed.refreshToken;
      saveUserData(userData);
      return { uid: userData.firebase_ms_uid, idToken: refreshed.idToken, accountType: 'microsoft', username: userData.username };
    } catch (err) {
      if (err.message === 'INVALID_REFRESH_TOKEN') {
        userData.firebase_ms_uid = "";
        userData.firebase_ms_refresh_token = "";
        saveUserData(userData);
        throw new Error('NO_SOCIAL_AUTH');
      }
      throw err;
    }
  }
  throw new Error('NO_SOCIAL_AUTH');
}

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
  const lower = version.toLowerCase();
  if (lower.startsWith('fabric-loader-')) {
    const parts = version.split('-');
    if (parts.length >= 4) {
      const mc = parts[3];
      return `Fabric ${mc}`;
    }
  }
  if (lower.startsWith('fabric-')) {
    const parts = version.split('-');
    if (parts.length >= 2) {
      return `Fabric ${parts[1]}`;
    }
  }
  if (lower.startsWith('forge-')) {
    const parts = version.split('-');
    if (parts.length >= 2) {
      return `Forge ${parts[1]}`;
    }
  }
  return fallbackMcVersion || version;
}

function presenceStatusLabel(status, serverIp, worldName) {
  switch (status) {
    case 'online':
      return 'Online';
    case 'menu':
      return 'In Menu';
    case 'playing':
      return worldName ? `Playing ${worldName}` : 'Playing Minecraft';
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

    // Check privacy mode setting
    const userData = loadUserData();
    const privacyMode = userData.privacy_mode === true;

    // Hide server IP if privacy mode is enabled
    const serverIpToWrite = privacyMode ? '' : (state.serverIp || '');

    const now = new Date().toISOString();
    const statusText = state.statusText || presenceStatusLabel(state.status, serverIpToWrite, state.worldName);
    const payload = {
      status: state.status,
      statusText,
      mcVersion: state.mcVersion || '',
      instanceName: state.instanceName || '',
      serverIp: serverIpToWrite,
      worldName: state.worldName || '',
      playerName: state.ign || '',
      updatedAt: now
    };
    const wrote = await this.withAuth(async (auth) => {
      await fsSet(`presence/${uid}`, payload, auth.idToken);
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
    if (!this.lastServerIp) return;

    console.log(`[Presence] Starting connection check for ${this.lastServerIp}`);
    this.connectionCheckTimer = setInterval(async () => {
      if (!this.lastServerIp) {
        this.stopConnectionCheck();
        return;
      }

      const isConnected = await this.checkServerConnection(this.lastServerIp);
      if (!isConnected && this.currentState?.status === 'server') {
        console.log('[Presence] Server connection lost, updating state');
        this.safeRun(this.onServerLeave());
        this.stopConnectionCheck();
      }
    }, 5000); // Check every 5 seconds
  }

  async sendHeartbeat() {
    if (!this.currentState || !this.canUsePresence()) return;
    const uid = this.getUid();
    if (!uid) return;
    const now = new Date().toISOString();
    const wrote = await this.withAuth(async (auth) => {
      await fsSet(`presence/${uid}`, { updatedAt: now }, auth.idToken, ['updatedAt']);
    });
    if (wrote && this.currentState) {
      this.currentState.updatedAt = now;
    }
  }

  async setLauncherOnline() {
    this.gameContext = null;
    this.lastServerIp = '';
    this.pendingWorldName = null;
    rpc.setLauncher();
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
      await fsSet(`presence/${uid}`, {
        status: 'offline',
        statusText: presenceStatusLabel('offline'),
        mcVersion: '',
        instanceName: '',
        serverIp: '',
        worldName: '',
        playerName: this.getPlayerName(),
        updatedAt: now,
        lastSeenAt: now
      }, auth.idToken);
    });
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
    rpc.setMenu({ version: versionLabel, profileName, ign });
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
    this.gameContext.worldName = worldName || this.gameContext.worldName || '';
    const { versionLabel, profileName, ign } = this.gameContext;
    rpc.setPlaying({ version: versionLabel, profileName, ign, worldName: this.gameContext.worldName });
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
    const { versionLabel, profileName, ign } = this.gameContext;
    this.lastServerIp = serverIp;
    this.isLeavingSingleplayer = false; // Clear leaving flag when joining server
    this.gameContext.worldName = null; // Clear singleplayer world when joining server
    const userData = loadUserData();
    const privacyMode = userData.privacy_mode === true;
    rpc.setServer({ version: versionLabel, profileName, ign, serverIp, privacyMode });
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
    rpc.setMenu({ version: versionLabel, profileName, ign });
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
    const { versionLabel, profileName, ign } = this.gameContext;
    this.gameContext.worldName = null;
    this.pendingWorldName = null; // Clear pending world name to prevent re-activation
    this.isLeavingSingleplayer = true; // Set flag to prevent re-activation
    rpc.setMenu({ version: versionLabel, profileName, ign });
    if (!this.canUsePresence()) return;
    await this.writeState({
      status: 'menu',
      mcVersion: versionLabel,
      instanceName: profileName || '',
      serverIp: '',
      worldName: '',
      ign: ign || this.getPlayerName()
    });
    // Clear flag after a longer delay to allow all saving logs to process
    setTimeout(() => {
      this.isLeavingSingleplayer = false;
    }, 5000);
  }

  async onGameClosed() {
    this.stopConnectionCheck();
    this.isLeavingSingleplayer = false; // Clear flag on game close
    this.pendingWorldName = null; // Clear pending world name
    await this.setLauncherOnline(); // Set to launcher online, not offline
  }

  handleGameLog(line) {
    if (!line) return;
    const cleaned = line.trim();
    if (!cleaned) return;

    // Debug: log all relevant lines
    if (cleaned.includes('Connecting') || cleaned.includes('server') || cleaned.includes('Server') ||
      cleaned.includes('level') || cleaned.includes('world') || cleaned.includes('integrated') ||
      cleaned.includes('Saving') || cleaned.includes('Stopping')) {
      console.log(`[Presence] Game log: ${cleaned}`);
    }

    // Check for singleplayer stop FIRST - highest priority
    if (/Stopping singleplayer server/i.test(cleaned) ||
      /Saving worlds/i.test(cleaned) ||
      /Saving the world/i.test(cleaned) ||
      /Saving level/i.test(cleaned) ||
      (/lost connection/i.test(cleaned) && cleaned.includes('Disconnected'))) {
      console.log('[Presence] Detected singleplayer stop');
      this.safeRun(this.onSingleplayerStop());
      return;
    }

    // Skip all world detection if we're leaving singleplayer
    if (this.isLeavingSingleplayer) {
      console.log('[Presence] Skipping world detection - leaving singleplayer');
      return;
    }

    // Multiple patterns for world loading - extract name from ServerLevel[Name] format
    const serverLevelMatch = cleaned.match(/ServerLevel\[([^\]]+)\]/i);
    if (serverLevelMatch && serverLevelMatch[1]) {
      this.pendingWorldName = serverLevelMatch[1];
      console.log(`[Presence] Detected world name from ServerLevel: ${this.pendingWorldName}`);
    }

    const worldMatch = cleaned.match(/Loaded level '([^']+)'/i) ||
      cleaned.match(/Preparing level "([^"]+)"/i) ||
      cleaned.match(/Loading level '([^']+)'/i) ||
      cleaned.match(/Loading world '([^']+)'/i) ||
      cleaned.match(/loading world '([^']+)'/i) ||
      cleaned.match(/Saving chunks for level '([^']+)'/i);
    if (worldMatch && worldMatch[1]) {
      this.pendingWorldName = worldMatch[1];
      console.log(`[Presence] Detected world name: ${this.pendingWorldName}`);
      
      if (this.gameContext && this.currentState && this.currentState.status === 'playing' && !this.gameContext.worldName) {
        this.safeRun(this.onSingleplayerStart(this.pendingWorldName));
      }
    }

    // Multiple patterns for integrated server start - only trigger when we have a world name
    if (/Starting integrated server/i.test(cleaned) ||
      /Starting minecraft server/i.test(cleaned)) {
      const worldName = this.pendingWorldName || this.gameContext?.worldName || '';
      this.pendingWorldName = null;
      console.log(`[Presence] Starting singleplayer world: ${worldName}`);
      this.safeRun(this.onSingleplayerStart(worldName));
      return;
    }

    // Also trigger on Server thread if we have a pending world name
    if (/Server thread/i.test(cleaned) && this.pendingWorldName) {
      const worldName = this.pendingWorldName;
      this.pendingWorldName = null;
      console.log(`[Presence] Starting singleplayer world (from Server thread): ${worldName}`);
      this.safeRun(this.onSingleplayerStart(worldName));
      return;
    }

    // Multiple patterns for server connection
    const connectMatch = cleaned.match(/Connecting to ([^,]+),\s*(\d+)/i) ||
      cleaned.match(/Connecting to '([^:]+):(\d+)'/i) ||
      cleaned.match(/Connecting to ([^:]+):(\d+)/i) ||
      cleaned.match(/Logging into ([^:]+):(\d+)/i) ||
      cleaned.match(/Joining ([^:]+):(\d+)/i) ||
      cleaned.match(/joined the game/i);
    if (connectMatch) {
      // If it's "joined the game", we can't get IP from this, but we know we're on a server
      if (cleaned.includes('joined the game')) {
        if (cleaned.includes('Server thread') || cleaned.includes('Integrated Server')) {
          const worldName = this.pendingWorldName || this.gameContext?.worldName || '';
          this.pendingWorldName = null;
          console.log(`[Presence] Player joined singleplayer world: ${worldName}`);
          this.safeRun(this.onSingleplayerStart(worldName));
          return;
        }
        console.log('[Presence] Player joined a server (no IP in log)');
        // We'll stay in menu state since we don't have the IP
        return;
      }
      const host = (connectMatch[1] || '').trim();
      const port = (connectMatch[2] || '').trim();
      const serverIp = port === '25565' ? host : `${host}:${port}`;
      console.log(`[Presence] Detected server connection to: ${serverIp}`);
      this.safeRun(this.onServerJoin(serverIp));
      return;
    }
    if (/Disconnected from server/i.test(cleaned) || /Disconnecting from server/i.test(cleaned) || /Lost connection/i.test(cleaned) || /Connection closed/i.test(cleaned)) {
      this.safeRun(this.onServerLeave());
      return;
    }
    if (/Stopping!/i.test(cleaned) && this.lastServerIp) {
      this.safeRun(this.onServerLeave());
    }
  }

  safeRun(promise) {
    promise?.catch?.((err) => {
      if (err && err.message && err.message !== 'NO_SOCIAL_AUTH') {
        console.warn('[Presence]', err.message);
      }
    });
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
    updatedAt,
    lastSeenAt: lastSeenAt || updatedAt || null
  };
}

async function fetchPresenceForUser(uid, auth) {
  if (!uid || !auth) return buildPresenceResponse(null);
  try {
    const doc = await fsGet(`presence/${uid}`, auth.idToken);
    return buildPresenceResponse(doc);
  } catch (e) {
    if (e?.response?.status === 404) {
      return buildPresenceResponse(null);
    }
    if (e?.response?.status === 403) {
      console.warn('[Presence] fetchPresenceForUser unauthorized (403). Check Firestore rules allow read on presence/* for friends.');
    } else {
      console.warn('[Presence] fetchPresenceForUser failed:', e.message || e);
    }
    return buildPresenceResponse(null);
  }
}

let gameStartTime = null;

async function updateStreakAndSessions() {
  try {
    const auth = await getSocialAuth().catch(() => null);
    if (!auth) return;
    
    let stats;
    try {
      stats = await fsGet(`users/${auth.uid}/stats/main`, auth.idToken);
    } catch (e) {
      stats = { streak: 0, lastPlayed: 0, totalHours: 0, totalSessions: 0, totalDaysPlayed: 0 };
    }
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const lastDate = stats.lastPlayed ? new Date(stats.lastPlayed).toISOString().split('T')[0] : null;
    
    let streak = stats.streak || 0;
    let totalDaysPlayed = stats.totalDaysPlayed || 0;
    
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
    }
    
    const updates = {
      streak,
      lastPlayed: now.getTime(),
      totalSessions: (stats.totalSessions || 0) + 1,
      totalDaysPlayed
    };
    
    await fsSet(`users/${auth.uid}/stats/main`, { ...stats, ...updates }, auth.idToken);
    
    if (mainWindow) {
      mainWindow.webContents.send('stats-updated');
    }
  } catch (e) {
    console.error('[Stats] Error updating streak/sessions:', e.message);
  }
}

async function handleLauncherClose(e) {
  console.log('[Launcher Close]', e);
  if (mainWindow) mainWindow.webContents.send('info-message', 'Game Closed');
  presenceManager.safeRun(presenceManager.onGameClosed());

  if (gameStartTime) {
    const playTimeHours = (Date.now() - gameStartTime) / (1000 * 60 * 60);
    gameStartTime = null;
    try {
      const auth = await getSocialAuth().catch(() => null);
      if (auth) {
        let stats;
        try {
          stats = await fsGet(`users/${auth.uid}/stats/main`, auth.idToken);
        } catch (e) {
          stats = { totalHours: 0 };
        }
        const newHours = (stats.totalHours || 0) + playTimeHours;
        await fsSet(`users/${auth.uid}/stats/main`, { ...stats, totalHours: newHours }, auth.idToken);
        
        if (mainWindow) {
          mainWindow.webContents.send('stats-updated');
        }
      }
    } catch (e) {
      console.error('[Stats] Error updating playtime:', e.message);
    }
  }
}

function focusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
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

function showPresenceNotification(title, body) {
  if (!Notification.isSupported() || !title || !body) return;
  const notif = new Notification({ title, body, silent: false });
  const handler = () => {
    focusMainWindow();
    setTimeout(() => {
      if (mainWindow) mainWindow.webContents.send('navigate-to-chat', { fromPresence: true, friendName: title });
    }, 150);
  };
  notif.on('click', handler);
  notif.on('action', handler);
  notif.show();
}

function shouldNotifyPresence(prev, next) {
  if (!next || next.state === 'offline') return null;
  const prevState = prev?.state || 'offline';

  if (next.state === 'server') {
    if (prevState !== 'server' || prev?.serverIp !== next.serverIp) {
      const serverLabel = next.serverIp ? next.serverIp : 'un servidor';
      return `está jugando en ${serverLabel}`;
    }
    return null;
  }

  if (next.state === 'online' && prevState !== 'online') {
    return 'se ha conectado';
  }

  const playingStates = new Set(['menu', 'playing']);
  const wasPlaying = playingStates.has(prevState) || prevState === 'server';
  if (playingStates.has(next.state) && !wasPlaying) {
    return 'ha empezado a jugar Minecraft';
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
    const friendships = await fsQuery('friendships', [
      { field: 'users', op: 'ARRAY_CONTAINS', value: { stringValue: auth.uid } }
    ], auth.idToken, null, 100);

    const seenUids = new Set();

    for (const fsDoc of friendships) {
      if (fsDoc.isGroup) continue;
      const friendUid = (fsDoc.users || []).find(u => u !== auth.uid);
      if (!friendUid) continue;
      seenUids.add(friendUid);

      let profile = friendProfileCache.get(friendUid);
      if (!profile) {
        try {
          profile = await fsGet(`users/${friendUid}`, auth.idToken);
          friendProfileCache.set(friendUid, { ...profile, uid: friendUid });
        } catch (_) {
          profile = { uid: friendUid, username: 'Unknown', accountType: 'helloworld' };
        }
      }

      const presence = await fetchPresenceForUser(friendUid, auth);
      const prev = lastPresenceStates.get(friendUid);
      lastPresenceStates.set(friendUid, presence);

      if (!presencePollingReady || initPass) continue;
      const message = shouldNotifyPresence(prev, presence);
      if (message) {
        const name = profile?.username || 'Amigo';
        showPresenceNotification(name, message);
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
// MESSAGE NOTIFICATION POLLING
// ==========================================
let msgPollingInterval = null;
let seenMsgIds = {};            // { friendshipId: Set<id> } — immune to clock skew
let msgPollingReady = false;    // true after first init pass
let msgPollingInitializing = false; // guard against concurrent init passes

function startMessagePolling() {
  if (msgPollingInterval) { clearInterval(msgPollingInterval); msgPollingInterval = null; }
  if (!msgPollingReady && !msgPollingInitializing) {
    msgPollingInitializing = true;
    seenMsgIds = {};
    console.log('[MsgPoll] Init pass starting...');
    pollMessages()
      .then(() => {
        msgPollingReady = true; msgPollingInitializing = false;
        console.log('[MsgPoll] Init done -', Object.keys(seenMsgIds).length, 'chats tracked');
      })
      .catch(err => {
        msgPollingInitializing = false;
        if (err.message !== 'NO_SOCIAL_AUTH') console.error('[MsgPoll] Init error:', err.message);
      });
  } else if (!msgPollingReady) {
    console.log('[MsgPoll] Init already in progress, skipping duplicate');
  } else {
    console.log('[MsgPoll] Restarting interval (already initialized)');
  }
  msgPollingInterval = setInterval(pollMessages, 15000);
  startPresencePolling();
}

function stopMessagePolling() {
  if (msgPollingInterval) { clearInterval(msgPollingInterval); msgPollingInterval = null; }
  msgPollingReady = false;
  msgPollingInitializing = false;
  seenMsgIds = {};
}

async function pollMessages() {
  try {
    const auth = await getSocialAuth();
    const friendships = await fsQuery('friendships', [
      { field: 'users', op: 'ARRAY_CONTAINS', value: { stringValue: auth.uid } }
    ], auth.idToken, null, 50);

    for (const friendship of friendships) {
      const fid = friendship.id;
      if (!seenMsgIds[fid]) seenMsgIds[fid] = new Set();
      try {
        const res = await axios.get(
          `${FIRESTORE_BASE}/friendships/${fid}/messages?pageSize=1000`,
          { headers: { Authorization: `Bearer ${auth.idToken}` } }
        );
        const msgs = (res.data.documents || []).map(doc => ({
          id: doc.name.split('/').pop(),
          ...parseFirestoreFields(doc.fields)
        }));

        if (!msgPollingReady) {
          // Init pass: mark ALL current messages as already seen
          msgs.forEach(m => seenMsgIds[fid].add(m.id));
          console.log(`[MsgPoll] Init: ${msgs.length} existing msgs marked seen`);
          continue;
        }

        // Find messages from others whose ID we haven't seen yet
        const newMsgs = msgs
          .filter(m => m.senderId !== auth.uid && !seenMsgIds[fid].has(m.id))
          .sort((a, b) => a.timestamp < b.timestamp ? -1 : 1);

        // Mark all as seen (including old ones in case set was rebuilt)
        msgs.forEach(m => seenMsgIds[fid].add(m.id));

        if (newMsgs.length > 0) console.log(`[MsgPoll] ${newMsgs.length} new msg(s) in fid=${fid.slice(-8)}`);

        for (const msg of newMsgs) {
          console.log(`[MsgPoll] Notifying: from="${msg.senderName}" body="${msg.content}"`);
          showMsgNotification(msg, fid);
        }
      } catch (innerErr) {
        console.error(`[MsgPoll] Error fetching fid=${fid.slice(-8)}:`, innerErr.message);
      }
    }
  } catch (e) {
    if (e.message !== 'NO_SOCIAL_AUTH') console.error('[MsgPoll] Error:', e.message);
  }
}

function formatNotificationBody(rawContent) {
  if (!rawContent) return '(media)';
  const str = String(rawContent).trim();
  if (str.startsWith('$$PROFILE_SHARE$$')) {
    try {
      const payload = JSON.parse(str.substring('$$PROFILE_SHARE$$'.length));
      if (payload && payload.profile && payload.profile.name) {
        return `Shared an installation: ${payload.profile.name}`;
      }
    } catch (_) {}
    return 'Shared an installation';
  }
  if (str.startsWith('$$LINK$$')) {
    try {
      const payload = JSON.parse(str.substring('$$LINK$$'.length));
      if (payload && (payload.title || payload.url)) {
        return `Shared a link: ${payload.title || payload.url}`;
      }
    } catch (_) {}
    return 'Shared a link';
  }
  if (str.startsWith('{')) {
    try {
      const payload = JSON.parse(str);
      if (payload && payload.type === 'seed' && payload.seed) {
        return `Sent a seed: ${payload.seed}`;
      }
    } catch (_) {}
  }
  return str;
}

function buildWindowsToastXml(title, body, friendshipId) {
  const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  // Minimal valid WinRT toast XML without reply input box
  return '<toast>' +
    '<visual><binding template="ToastGeneric">' +
    '<text>' + esc(title) + '</text>' +
    '<text>' + esc(body) + '</text>' +
    '</binding></visual>' +
    '</toast>';
}

function showMsgNotification(msg, friendshipId) {
  if (!Notification.isSupported()) return;
  const title = msg.senderName || 'New message';
  const rawBody = msg.content || '';
  const formattedBody = formatNotificationBody(rawBody);
  console.log(`[MsgNotif] title="${title}" body="${formattedBody}" fid=${friendshipId}`);
  if (!formattedBody && !title) return;

  let iconPath;
  try {
    const p = path.join(__dirname, 'build', 'icon.png');
    if (require('fs').existsSync(p)) iconPath = p;
  } catch (_) { }

  const notifOpts = {
    title,
    body: formattedBody || '(media)',
    silent: false,
    ...(iconPath ? { icon: iconPath } : {})
  };
  if (process.platform === 'win32') {
    notifOpts.toastXml = buildWindowsToastXml(title, formattedBody || '(media)', friendshipId);
  }

  const notif = new Notification(notifOpts);

  // Click → focus window and navigate to chat
  const doNavigate = () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    // Small delay so window is ready before IPC message
    setTimeout(() => {
      if (mainWindow) mainWindow.webContents.send('navigate-to-chat', { friendshipId, senderName: msg.senderName || '' });
    }, 150);
  };

  notif.on('click', doNavigate);
  notif.show();
}

async function sendMsgFromMain(friendshipId, content, replyMsg) {
  try {
    const auth = await getSocialAuth();
    const userData = loadUserData();
    const msgId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const now = new Date().toISOString();
    const msgData = {
      senderId: auth.uid,
      senderName: userData.username || '',
      content: content.trim(),
      timestamp: now,
      status: 'sent'
    };
    if (replyMsg) {
      msgData.replyTo = replyMsg.id;
      msgData.replyContent = replyMsg.content;
      msgData.replySender = replyMsg.senderId;
      msgData.replySenderName = replyMsg.senderName;
    }
    await fsSet(`friendships/${friendshipId}/messages/${msgId}`, msgData, auth.idToken);
    await fsSet(`friendships/${friendshipId}`, { lastMessageAt: now }, auth.idToken, ['lastMessageAt']);

    // Increment unread for all other users
    try {
      const fDoc = await fsGet(`friendships/${friendshipId}`, auth.idToken);
      const otherUids = (fDoc.users || []).filter(u => u !== auth.uid);
      for (const otherUid of otherUids) {
        let currentUnread = 0;
        try { const ud = await fsGet(`friendships/${friendshipId}/unread/${otherUid}`, auth.idToken); currentUnread = ud.count || 0; } catch (_) { }
        await fsSet(`friendships/${friendshipId}/unread/${otherUid}`, { count: currentUnread + 1 }, auth.idToken);
      }
    } catch (_) { }

    lastSeenMsgTimestamps[friendshipId] = now;
  } catch (e) {
    console.error('[MsgPoll] Send error:', e.message);
  }
}

// --- Local HTTP server for Firebase Auth compatibility (file:// blocks signInWithPopup) ---
let localPort = null;
function startLocalServer() {
  return new Promise((resolve) => {
    const fs = require('fs');
    const mime = {
      '.html': 'text/html', '.js': 'application/javascript',
      '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg',
      '.ico': 'image/x-icon', '.svg': 'image/svg+xml',
      '.ttf': 'font/ttf', '.woff': 'font/woff', '.woff2': 'font/woff2',
      '.mp4': 'video/mp4'
    };
    const srv = http.createServer((req, res) => {
      let filePath = path.join(__dirname, 'ui', req.url === '/' ? '/index.html' : req.url);
      const ext = path.extname(filePath);
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });
    srv.listen(0, 'localhost', () => {
      localPort = srv.address().port;
      console.log('[LocalServer] Running on port', localPort);
      resolve(localPort);
    });
  });
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
      allowRunningInsecureContent: false
    },
    backgroundColor: '#1a1a1a',
    show: false,
    frame: true,
    minWidth: 1000,
    minHeight: 650
  })

  win.maximize()
  Menu.setApplicationMenu(null);

  // Start with Updater (Splash) — served from localhost for Firebase Auth compatibility
  if (!localPort) await startLocalServer();
  win.loadURL(`http://localhost:${localPort}/updater.html`)

  win.once('ready-to-show', () => {
    win.show();

    // Check if dev mode is enabled
    const userData = loadUserData();
    if (userData.dev_mode) {
      win.webContents.openDevTools();
    }
  })

  win.webContents.on('did-finish-load', () => {
    win.webContents.send('sys-ready');
    // Start background checks
    checkLatestVersionsAndInstall();
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
    if (url.includes('firebaseapp.com/__/auth/') ||
      url.includes('login.microsoftonline.com') ||
      url.includes('login.live.com') ||
      url.includes('accounts.google.com')) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow = win;

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

    console.log(`[Background Update] Latest Release: ${latestRelease}, Latest Snapshot: ${latestSnapshot}`);

    const mcDir = paths.getMcDir();
    const versionsDir = path.join(mcDir, 'versions');

    // Helper to update profile and notify without installing
    const installAndProfile = async (version, profileName) => {
      const versionDir = path.join(versionsDir, version);
      let isInstalled = fs.existsSync(versionDir);

      const profilesData = profileManager.loadProfiles();
      const profiles = profilesData.profiles || {};

      let existingProfileId = null;
      for (const [id, prof] of Object.entries(profiles)) {
        if (prof.name === profileName) {
          existingProfileId = id;
          break;
        }
      }

      let versionChanged = false;

      if (existingProfileId) {
        // Update existing — always ensure directory, icon and version are correct
        const existingProfile = profiles[existingProfileId];
        const needsUpdate = existingProfile.version !== version || !existingProfile.directory;
        if (needsUpdate) {
          console.log(`[Background Update] Updating profile "${profileName}" to version ${version}.`);
          versionChanged = true;
          if (typeof profileManager.forceEditProfile === 'function') {
            profileManager.forceEditProfile(existingProfileId, { version: version, icon: 'default.png', directory: mcDir });
          } else {
            profileManager.editProfile(existingProfileId, { version: version, icon: 'default.png', directory: mcDir });
          }
          if (mainWindow) mainWindow.webContents.send('reload-profiles');
        }
      } else {
        // Create new
        console.log(`[Background Update] Creating profile "${profileName}" for version ${version}.`);
        versionChanged = true;
        profileManager.addProfile(profileName, version, 'default.png', mcDir, '', null, true);
        if (mainWindow) mainWindow.webContents.send('reload-profiles');
      }

      if (versionChanged) {
        console.log(`[Background Update] Version ${version} is now available. Sending notification...`);
        new Notification({
          title: 'Nueva versión de Minecraft',
          body: `La versión ${version} (${profileName}) ya está disponible para jugar.`
        }).show();
        
        if (mainWindow) {
          mainWindow.webContents.send('show-in-app-notification', {
            title: 'Nueva versión de Minecraft',
            message: `La versión ${version} (${profileName}) ya está disponible para jugar.`,
            duration: 10000
          });
        }
      } else if (isInstalled) {
        console.log(`[Background Update] Version ${version} is already installed.`);
      }
    };

    // Trigger both asynchronously
    await installAndProfile(latestRelease, 'Latest release');
    // Only process snapshot if it differs from release to avoid redundant work
    if (latestSnapshot !== latestRelease) {
      await installAndProfile(latestSnapshot, 'Latest snapshot');
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
  saveUserData(newData);
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
    
    // If the user logs in with a DIFFERENT Microsoft account, clear the old social verification
    if (previousUuid && previousUuid !== profileData.id) {
        userData.firebase_ms_uid = "";
        userData.firebase_ms_refresh_token = "";
    }

    userData.account_type = "microsoft"
    userData.username = profileData.name
    userData.uuid = profileData.id
    userData.mc_token = mcObj.mcToken // mcToken is on the wrapper
    userData.msmc_auth = result.save() // Save token string ONLY

    saveUserData(userData)

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
    }
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
    const PROJECT_ID = FIREBASE_PROJECT_ID;
    let email = identifier;

    // 1. Resolve Email if username was provided
    if (!identifier.includes('@')) {
      console.log(`[HelloWorld Login] Resolving username: ${identifier}`);
      const queryUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/usernames/${encodeURIComponent(identifier.toLowerCase())}?key=${FIREBASE_API_KEY}`;
      
      try {
        const queryRes = await axios.get(queryUrl);
        if (queryRes.data && queryRes.data.fields) {
          email = queryRes.data.fields.email ? queryRes.data.fields.email.stringValue : null;
          if (!email) throw new Error("Could not find email associated with this username.");
          console.log(`[HelloWorld Login] Resolved to email: ${email}`);
        } else {
          throw new Error("Username not found. Please register first.");
        }
      } catch (err) {
        if (err.response && err.response.status === 404) {
          throw new Error("Username not found. Please register first.");
        }
        throw err;
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

    // 3. Fetch full User Profile from Firestore to get Skin/Variant
    const docUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${localId}`;
    const docRes = await axios.get(docUrl, {
      headers: { Authorization: `Bearer ${idToken}` }
    });

    let username = identifier.includes('@') ? (displayName || email.split('@')[0]) : identifier;
    let avatarUrl = "";
    let uuid = localId.replace(/-/g, ''); // Minecraft-compatible UUID usually (Firebase UID is different, but we use it as base)

    if (docRes.data && docRes.data.fields) {
      const f = docRes.data.fields;
      if (f.username) username = f.username.stringValue;
      if (f.uuid) uuid = f.uuid.stringValue;
      if (f.avatarBase64) {
        avatarUrl = f.avatarBase64.stringValue || "";
      }
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

    // Clear out old skin/cape data
    userData.last_skin_url = "";
    userData.last_skin_variant = "classic";
    userData.last_cape_url = "";

    saveUserData(userData);

    // 5. Update users doc with social-searchable fields (merge: only update these fields)
    try {
      await fsUpdate(`users/${localId}`, {
        accountType: 'helloworld', username, mcUuid: uuid,
        usernameLower: usernameLower(username), updatedAt: new Date().toISOString()
      }, idToken);
    } catch (spErr) {
      console.warn('[HelloWorld Login] Could not update users doc:', spErr.message);
    }

    const safeProfile = {
      name: username,
      id: uuid,
      avatar_url: avatarUrl,
      skin: [],
      cape: []
    };

    if (mainWindow) {
      mainWindow.webContents.send('login-success', safeProfile);
    }

    startMessagePolling();
    presenceManager.safeRun(presenceManager.setLauncherOnline());
    startPresencePolling();

    return { success: true, profile: safeProfile };
  } catch (err) {
    console.error("[HelloWorld Login] Error:", err.response ? JSON.stringify(err.response.data) : err.message);
    let errorMessage = "Authentication failed.";

    if (err.response && err.response.data && err.response.data.error) {
      const code = err.response.data.error.message;
      if (code === "INVALID_PASSWORD") errorMessage = "Incorrect password.";
      else if (code === "EMAIL_NOT_FOUND") errorMessage = "User not found.";
      else if (code === "USER_DISABLED") errorMessage = "This account has been disabled.";
      else errorMessage = code.replace(/_/g, ' ');
    } else {
      errorMessage = err.message;
    }

    return { success: false, error: errorMessage };
  }
})

ipcMain.handle('logout', async () => {
  stopMessagePolling();
  stopPresencePolling();
  presenceManager.safeRun(presenceManager.setOffline());
  const data = loadUserData()

  // Clear persistent auth data
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
  data.firebase_uid = "";
  data.firebase_refresh_token = "";
  data.firebase_id_token = "";

  saveUserData(data)
  presenceManager.currentState = null;
  presenceManager.gameContext = null;
  presenceManager.stopHeartbeat();
  return data
})

// 2. Profiles
ipcMain.handle('get-profiles', async () => profileManager.loadProfiles())
ipcMain.handle('get-profiles-for-addon', async (e, type) => {
  const data = profileManager.loadProfiles();
  const profiles = data.profiles || {};
  const filtered = {};
  const mcDir = paths.getMcDir();

  for (const [id, profile] of Object.entries(profiles)) {
    const version = (profile.version || '').toLowerCase();

    if (type === 'resourcepack' || type === 'datapack') {
      filtered[id] = profile;
      continue;
    }

    if (type === 'shader') {
      // Validate strictly if shader support mods are installed
      const profileDir = profile.directory || mcDir;
      const modsDir = path.join(profileDir, 'mods');
      const support = await modManager.validateShaderSupport(modsDir);

      if (support.supported) {
        filtered[id] = profile;
      }
      continue;
    }

    if (version.includes('forge') || version.includes('fabric') || version.includes('quilt')) {
      filtered[id] = profile;
    }
  }
  return { profiles: filtered };
})

ipcMain.handle('add-profile', async (e, name, version, icon, directory, jvm_args, java_path) => {
  // Map frontend positional args to profileManager.addProfile
  return profileManager.addProfile(name, version, icon, directory, jvm_args, java_path);
})

ipcMain.handle('edit-profile', async (e, profile_id, name, version, loader, icon, ram_min, ram_max, jvm_args, width, height, java_path) => {
  const data = {
    name,
    version: version || loader,
    icon,
    jvm_args: jvm_args || '',
    java_path: java_path || ''
  };

  return profileManager.editProfile(profile_id, data);
})

ipcMain.handle('delete-profile', async (e, id) => profileManager.deleteProfile(id))
ipcMain.handle('get-profile-icon', async (e, f) => profileManager.getProfileIconAsBase64(f))
ipcMain.handle('get-worlds', async (e, profile_id) => {
  const mcDir = paths.getMcDir();
  return profileManager.getWorlds(profile_id, mcDir);
})
ipcMain.handle('read-world-seed', async (e, profile_id, world_name) => {
  const mcDir = paths.getMcDir();
  return await profileManager.readWorldSeed(profile_id, world_name, mcDir);
})

// 3. Modrinth / Addons
ipcMain.handle('search-modrinth', async (e, { query, options }) => modManager.searchModrinth(query, options))
ipcMain.handle('get-mod-categories', async (e) => modManager.getModCategories())
ipcMain.handle('get-mod-versions', async (e, { project_id, game_version, loader }) => modManager.getModVersions(project_id, game_version, loader))
ipcMain.handle('get-mod-details', async (e, id) => modManager.getModDetails(id))

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
        const vInfo = await modManager.getVersionFromId(version_id);
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

      if (type === 'shader') {
        console.log('[install-addon] Validating shader support...');
        const check = await modManager.validateShaderSupport(path.join(profileDir, 'mods'));
        if (!check.supported) {
          console.error('[install-addon] Shader support validation failed:', check.reason);
          return { success: false, error: check.reason };
        }
      }

      const targetFile = path.join(targetDir, filename);
      if (fs.existsSync(targetFile)) {
        console.log('[install-addon] File already exists, skipping download:', filename);

        // Update profile JSON addons metadata anyway to ensure it's tracked
        if (project_id && version_id) {
          profile.addons = profile.addons || [];
          profile.addons = profile.addons.filter(a => a.project_id !== project_id && a.filename !== filename);
          profile.addons.push({ project_id, version_id, filename, type, state: 'enabled' });
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

      // Update profile JSON with addon metadata after successful download
      if (result.success && project_id && version_id) {
        profile.addons = profile.addons || [];
        // Remove older version of same mod
        profile.addons = profile.addons.filter(a => a.project_id !== project_id);
        profile.addons.push({
          project_id,
          version_id,
          filename,
          type,
          state: 'enabled'
        });
        profileManager.saveProfiles(profilesData);
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
    profile.addons.forEach(addon => {
      if (addon.type !== type) return;

      const existingMod = existingFilesMap.get(addon.filename);
      if (existingMod) {
        // File exists, merge metadata
        existingMod.project_id = addon.project_id;
        existingMod.version_id = addon.version_id;
        // Use state from metadata if available, otherwise infer from filename
        existingMod.enabled = addon.state === 'enabled';
      } else {
        // File is missing, add it with missing flag
        finalMods.push({
          filename: addon.filename,
          display_name: addon.filename,
          enabled: addon.state === 'enabled',
          type: 'file',
          size_mb: 'Missing file',
          project_id: addon.project_id,
          version_id: addon.version_id,
          missing: true
        });
      }
    });
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
  const addonIndex = profile.addons ? profile.addons.findIndex(a => a.filename === filename && a.type === type) : -1;

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

ipcMain.handle('delete-addon-file', async (e, { profile_id, type, filename }) => {
  try {
    const profilesData = profileManager.loadProfiles();
    const profile = profilesData.profiles[profile_id];
    if (!profile) return { success: false };
    const mcDir = paths.getMcDir();
    const profileDir = profile.directory || mcDir;
    let targetDir = path.join(profileDir, 'mods');
    if (type === 'resourcepack') targetDir = path.join(profileDir, 'resourcepacks');
    if (type === 'shader') targetDir = path.join(profileDir, 'shaderpacks');
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
  const addon = profile.addons ? profile.addons.find(a => a.filename === filename && a.type === type) : null;
  const actualFilename = addon ? addon.filename : filename;

  const result = await modManager.deleteAddon(actualFilename, targetDir);

  // Remove from profile metadata
  if (result.success && profile.addons) {
    profile.addons = profile.addons.filter(a => !(a.filename === actualFilename && a.type === type));
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
        const PROJECT_ID = "helloworld-launcher";
        const queryUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
        const queryBody = {
          structuredQuery: {
            from: [{ collectionId: "users" }],
            where: {
              fieldFilter: {
                field: { fieldPath: "username" },
                op: "EQUAL",
                value: { stringValue: userData.username }
              }
            },
            limit: 1
          }
        };

        const queryRes = await axios.post(queryUrl, queryBody);
        if (queryRes.data && queryRes.data[0] && queryRes.data[0].document) {
          const fields = queryRes.data[0].document.fields;
          if (fields.avatarBase64) {
            userData.last_avatar_url = fields.avatarBase64.stringValue || "";
            saveUserData(userData);
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
      // Validate microsoftVerified in Firestore — clear local uid if deleted remotely
      if (userData.firebase_ms_uid && userData.firebase_ms_refresh_token) {
        try {
          const refreshed = await refreshFirebaseToken(userData.firebase_ms_refresh_token);
          const userDoc = await fsGet(`users/${userData.firebase_ms_uid}`, refreshed.idToken);
          if (!userDoc || !userDoc.microsoftVerified) {
            console.log('[Refresh] microsoftVerified not found in Firestore — clearing local verification');
            const ud = loadUserData();
            ud.firebase_ms_uid = '';
            ud.firebase_ms_refresh_token = '';
            saveUserData(ud);
          }
        } catch (verifyErr) {
          const is404 = verifyErr.response && verifyErr.response.status === 404;
          if (is404) {
            console.log('[Refresh] users doc not found in Firestore — clearing local verification');
            const ud = loadUserData();
            ud.firebase_ms_uid = '';
            ud.firebase_ms_refresh_token = '';
            saveUserData(ud);
          } else {
            console.warn('[Refresh] Could not check microsoftVerified:', verifyErr.message);
          }
        }
      }
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

// --- Legacy Handlers ---
ipcMain.handle('close-app', async () => {
  await presenceManager.setOffline();
  app.quit();
})
ipcMain.handle('get-version', () => app.getVersion())
ipcMain.handle('check-internet', async () => {
  try {
    // Fast check by fetching Mojang manifest
    await axios.get('https://piston-meta.mojang.com/mc/game/version_manifest.json', { timeout: 3000 });
    return true;
  } catch (e) {
    return false;
  }
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
  // Enable dev mode updates if running in dev AND dev-config exists
  if (!app.isPackaged) {
    const devConfig = path.join(__dirname, 'dev-app-update.yml');
    if (fs.existsSync(devConfig)) {
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
  autoUpdater.downloadUpdate();
})

ipcMain.handle('quit-and-install', () => {
  console.log("IPC: quit-and-install");
  autoUpdater.quitAndInstall();
})

// AutoUpdater Events
autoUpdater.on('checking-for-update', () => {
  console.log('[AutoUpdater] Checking for update...');
  if (mainWindow) mainWindow.webContents.send('updater-status', { status: 'checking' });
})

autoUpdater.on('update-available', (info) => {
  console.log('[AutoUpdater] Update available:', info);
  if (mainWindow) mainWindow.webContents.send('updater-status', { status: 'available', info });
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
    }
    return [];
  } catch (err) {
    console.error(`Error fetching ${type} loader versions:`, err);
    return [];
  }
})

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

function verifyFabricLibraries(mcDir, fabricVersionName) {
  const fabricJsonPath = path.join(mcDir, 'versions', fabricVersionName, `${fabricVersionName}.json`);
  if (!fs.existsSync(fabricJsonPath)) return { ok: false, missing: [], error: 'Fabric profile JSON not found' };

  let profileJson;
  try { profileJson = fs.readJsonSync(fabricJsonPath); } catch (e) { return { ok: false, missing: [], error: e.message }; }

  const missing = [];
  for (const lib of (profileJson.libraries || [])) {
    const info = getFabricLibraryPath(mcDir, lib.name);
    if (!info) continue;

    try {
      if (!fs.existsSync(info.filePath) || fs.statSync(info.filePath).size === 0) {
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

    // Determine version type and components
    const versionLower = version_id.toLowerCase();
    let versionType = 'release';
    let mcVersion = version_id;
    let loaderVersion = null;
    let customVersionId = version_id;

    if (versionLower.startsWith('forge-')) {
      versionType = 'forge';
      const parts = version_id.split('-'); // e.g. ["forge", "1.20.1", "47.2.0"]
      if (parts.length >= 3) {
        mcVersion = parts[1];
        loaderVersion = parts.slice(2).join('-');
      } else {
        mcVersion = parts[1];
      }
    } else if (versionLower.startsWith('fabric-loader-')) {
      // Format: fabric-loader-LOADER-MCVERSION (e.g. fabric-loader-0.19.1-26.1)
      versionType = 'fabric';
      const parts = version_id.split('-');
      if (parts.length >= 4) {
        loaderVersion = parts[2]; // "0.19.1"
        mcVersion = parts[3]; // "26.1"
      }
    } else if (versionLower.startsWith('fabric-')) {
      // Format: fabric-MCVERSION-LOADER (e.g. fabric-1.21.7-0.15.6)
      versionType = 'fabric';
      const parts = version_id.split('-');
      if (parts.length >= 3) {
        mcVersion = parts[1];
        loaderVersion = parts.slice(2).join('-');
      } else {
        mcVersion = parts[1];
      }
    } else {
      // Vanilla: Detect type properly (Default is release)
      if (versionLower.includes('snapshot') || versionLower.includes('pre') || versionLower.includes('rc') || /^\d+w\d+[a-z]$/.test(versionLower)) {
        versionType = 'snapshot';
      } else if (versionLower.includes('alpha') || versionLower.startsWith('a')) {
        versionType = 'old_alpha';
      } else if (versionLower.includes('beta') || versionLower.startsWith('b')) {
        versionType = 'old_beta';
      }
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
      const forgeFileName = `${version_id}-installer.jar`;
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
    const resolvedVersionType = (versionType === 'forge' || versionType === 'fabric') ? 'release' : versionType;

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
      if (fabricJsonPathVar) launchOptions.overrides = { ...launchOptions.overrides, versionJson: fabricJsonPathVar };
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

    // ─── Fabric: Verify & repair libraries after MCLC download ───────────────
    if (versionType === 'fabric' && loaderVersion && !downloadInfo.cancelled) {
      const fabricVersionName = `fabric-loader-${loaderVersion}-${mcVersion}`;
      if (onProgress) onProgress({
        type: 'version-install', task: 'Verifying Fabric libraries...',
        version: version_id, current: 95, total: 100, percentage: 95
      });
      const libsOk = await downloadMissingFabricLibraries(mcDir, fabricVersionName, onProgress);
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

    // For HelloWorld accounts, fetch from Firestore
    if (userData.account_type === 'helloworld') {
      const auth = await getSocialAuth();
      if (auth) {
        try {
          const userDoc = await fsGet(`users/${auth.uid}`, auth.idToken);
          if (userDoc.capeBase64) {
            return { success: true, capes: [{ id: 'default', name: 'Default Cape', base64: userDoc.capeBase64 }] };
          }
        } catch (e) {
          console.error("Error fetching Firestore capes:", e);
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

ipcMain.handle('save-app-settings', async (e, enableTransitions, hwAccel, privacyMode) => {
  const data = loadUserData();
  // hwAccel needs restart, enableTransitions is instant
  data.enable_transitions = enableTransitions !== false;
  data.hw_accel = hwAccel !== false;
  data.privacy_mode = privacyMode === true;
  saveUserData(data);
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

  // Show reminder on 5th launch if not already reviewed
  if (data.launch_count === 5 && !data.has_reviewed) {
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
  if (action === 'reviewed' || action === 'dismissed') {
    data.has_reviewed = true;
    saveUserData(data);
  }
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
    saveUserData(userData);

    // Get a fresh idToken to write to Firestore
    const refreshed = await refreshFirebaseToken(firebaseRefreshToken);

    // Write microsoftVerified for web login check
    const emailK = emailKey || email.replace(/\./g, '_DOT_').replace(/@/g, '_AT_');
    await fsSet(`microsoftVerified/${emailK}`, {
      email, username, uuid, verified: true, verifiedAt: new Date().toISOString()
    }, refreshed.idToken);

    // Create/update users doc so this account is discoverable in social features
    await fsUpdate(`users/${firebaseUid}`, {
      accountType: 'microsoft', username, uuid,
      mcUuid: uuid, usernameLower: usernameLower(username),
      microsoftVerified: true,
      updatedAt: new Date().toISOString()
    }, refreshed.idToken);

    console.log('[MS Verify] users doc + microsoftVerified written for:', email);
    return { success: true };
  } catch (err) {
    console.warn('[MS Verify] Failed to write:', err.message);
    return { success: false, error: err.message };
  }
})

/**
 * Helper to refresh Microsoft Session and return valid auth tokens
 */
async function refreshMicrosoftSession(userData) {
  if (userData.account_type !== 'microsoft' || !userData.msmc_auth) {
    return {
      success: false,
      access_token: "null",
      client_token: "null",
      uuid: "null",
      name: userData.username || "Steve"
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

      // Save skin URL if available
      if (mcObj.profile.skins && mcObj.profile.skins.length > 0) {
        userData.last_skin_url = mcObj.profile.skins[0].url;
        userData.last_skin_variant = mcObj.profile.skins[0].variant || 'classic';
      }

      saveUserData(userData);
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

// Lock to prevent race conditions when updating profile metadata
const profileUpdateLocks = new Map();

ipcMain.handle('launch-profile', async (e, { profileId, nickname, force, serverIp }) => {
  console.log(`[Launch] launch-profile called with profileId: ${profileId}, force: ${force}, serverIp: ${serverIp || 'none'}`);
  try {
    isLaunchCancelled = false;
    const profiles = profileManager.loadProfiles().profiles;
    const profile = profiles[profileId];
    if (!profile) return { status: 'error', error: "Profile not found" };

    const isForge = profile.version.toLowerCase().includes('forge');
    const isFabric = profile.version.toLowerCase().includes('fabric');

    // Robust version extraction
    let mcVersion = profile.version;
    if (isFabric && profile.version.startsWith('fabric-loader-')) {
      const parts = profile.version.split('-');
      // Fabric format: fabric-loader-LOADER-MCVERSION
      if (parts.length >= 4) mcVersion = parts[3];
    } else if (isForge || isFabric) {
      const versionMatch = profile.version.match(/(\d+\.\d+(\.\d+)?)/);
      if (versionMatch) mcVersion = versionMatch[0];
    }

    const actualMcDir = paths.getMcDir();

    // 0. Synchronization Check (Version + Addons)
    let isMissingVersion = false;
    let expectedVersionDirName = profile.version;

    // For Fabric, ensure we have the correct directory name format
    if (isFabric) {
      if (profile.version.startsWith('fabric-') && !profile.version.startsWith('fabric-loader-')) {
        // Format: fabric-MCVERSION-LOADER -> transform to fabric-loader-LOADER-MCVERSION
        const parts = profile.version.split('-');
        if (parts.length >= 3) {
          expectedVersionDirName = `fabric-loader-${parts.slice(2).join('-')}-${parts[1]}`;
        }
      }
      // fabric-loader-LOADER-MCVERSION format is already correct
    }

    const versionPath = path.join(actualMcDir, 'versions', expectedVersionDirName);
    console.log(`[Launch] Checking for version at: ${versionPath}`);
    console.log(`[Launch] Expected dir name: ${expectedVersionDirName}, Profile version: ${profile.version}`);

    if (!fs.existsSync(versionPath)) {
      isMissingVersion = true;
      console.log(`[Launch] Version directory not found, marking as missing`);
    }

    let missingAddons = [];
    if (profile.addons && profile.addons.length > 0) {
      const profileDir = profile.directory || actualMcDir;
      for (const addon of profile.addons) {
        // Skip disabled addons — they are intentionally off
        if (addon.state === 'disabled') continue;
        if (addon.type === 'datapack') continue; // Skip datapacks since they require world

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

    if (isMissingVersion || missingAddons.length > 0) {
      console.log(`[Launch] Missing files detected. isMissingVersion: ${isMissingVersion}, missingAddons: ${missingAddons.length}`);
      return {
        status: 'missing_files',
        missing_version: isMissingVersion,
        version_id: profile.version,
        missing_addons: missingAddons
      };
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
        maxSockets: 4
      },
      memory: {
        max: "4G",
        min: "1G"
      }
    };

    if (isForge) {
      options.version.custom = profile.version;
    }
    if (isFabric) {
      options.version.custom = expectedVersionDirName;
    }

    // 2.1. Fabric: Verify & repair libraries before launch
    if (isFabric && profile.version) {
      try {
        if (mainWindow) mainWindow.webContents.send('info-message', 'Verifying Fabric libraries...');
        const libsOk = await downloadMissingFabricLibraries(actualMcDir, profile.version, null);
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
      // Use quickPlay type "legacy" to pass --server <ip> --port <port> to the game arguments
      options.quickPlay = {
        type: "legacy",
        identifier: serverIp
      };
      console.log(`[Launch] Auto-connecting to server: ${serverIp}`);
    }

    // 3. Java Runtime
    try {
      // Priority: Profile Custom Java Path > Automatic Java Runtime
      const jPath = profile.java_path || await javaRuntime.getJavaPath(mcVersion);
      if (jPath && jPath !== 'java') {
        options.javaPath = jPath;
      }
    } catch (javaErr) {
      console.warn(`[Launch] Java resolution failed: ${javaErr.message}`);
    }

    // 4. Finalize & Launch
    console.log(`[Launch] Starting Minecraft ${mcVersion} for ${auth.name}...`);

    launcher.launch(options).then(child => {
      if (!child) {
        console.error("[Launch] MCLC returned null child process (Java runtime or launch initialization failed).");
        presenceManager.safeRun(presenceManager.onGameClosed());
        if (mainWindow) mainWindow.webContents.send('error', "No se pudo iniciar el juego. Verifica tu instalación de Java o memoria RAM.");
        return;
      }
      if (isLaunchCancelled) {
        console.log("[Launch] Launch cancelled while starting, killing immediately.");
        try { process.kill(child.pid, 'SIGKILL'); } catch (e) { }
        return;
      }

      gameStartTime = Date.now();
      updateStreakAndSessions();

      currentGameProcess = child;

      // Update Presence / RPC state with PID
      presenceManager.safeRun(presenceManager.onGameLaunch({
        versionLabel: presenceVersionLabel,
        profileName: profile.name,
        ign: auth.name,
        pid: child.pid
      }));

      child.stdout?.on('data', (data) => {
        const message = data.toString().trim();
        if (!message) return;
        console.log('[Game stdout]', message);
        presenceManager.handleGameLog(message);
        if (mainWindow) mainWindow.webContents.send('info-message', `[Game stdout] ${message}`);
      });

      child.stderr?.on('data', (data) => {
        const message = data.toString().trim();
        if (!message) return;
        console.error('[Game stderr]', message);
        presenceManager.handleGameLog(message);
        if (mainWindow) mainWindow.webContents.send('info-message', `[Game stderr] ${message}`);
      });

      child.on('close', () => {
        console.log("[Launch] Game process closed");
        currentGameProcess = null;
        presenceManager.safeRun(presenceManager.onGameClosed());
        if (mainWindow) mainWindow.webContents.send('info-message', "Game Closed");
      });

      child.on('error', (err) => {
        console.error("[Launch] Process Error:", err);
        presenceManager.safeRun(presenceManager.onGameClosed());
        if (mainWindow) mainWindow.webContents.send('error', "Process Error: " + err.message);
      });
    }).catch(err => {
      console.error("[Launch] Launcher Error:", err);
      presenceManager.safeRun(presenceManager.onGameClosed());
      if (mainWindow) mainWindow.webContents.send('error', "Launch Failed: " + err.message);
    });

    // 5. Update Metadata
    try {
      profile.last_played = new Date().toISOString();
      profileManager.saveProfiles({ profiles });
    } catch (e) { }

    return { success: true };
  } catch (e) {
    console.error("[Launch] Critical Exception:", e);
    return { success: false, error: e.message };
  }
})

ipcMain.handle('cancel-launch', async () => {
  try {
    isLaunchCancelled = true;
    if (currentGameProcess && currentGameProcess.pid) {
      process.kill(currentGameProcess.pid, 'SIGKILL');
      console.log('[cancel-launch] Killed game process');
      currentGameProcess = null;
      return { success: true };
    }
    return { success: true, message: 'Launch marked as cancelled (pending process kill)' };
  } catch (e) {
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
    const auth = await getSocialAuth();
    const stats = await fsGet(`users/${auth.uid}/stats/main`, auth.idToken);
    
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
      // Streak lost
      effectiveStreak = 0;
    }
    
    // Override streak property for UI, and pass completion status
    stats.streak = effectiveStreak;
    stats.streakCompletedToday = streakCompletedToday;
    
    return { success: true, stats };
  } catch (e) {
    if (e.message === 'NO_SOCIAL_AUTH') return { success: false, error: 'offline' };
    return { success: true, stats: { streak: 0, totalHours: 0, totalSessions: 0, totalDaysPlayed: 0, streakCompletedToday: false } };
  }
});

ipcMain.handle('stats-get-user', async (e, targetUid) => {
  try {
    const auth = await getSocialAuth();
    const stats = await fsGet(`users/${targetUid}/stats/main`, auth.idToken);
    
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
      // Streak lost
      effectiveStreak = 0;
    }
    
    // Override streak property for UI, and pass completion status
    stats.streak = effectiveStreak;
    stats.streakCompletedToday = streakCompletedToday;

    return { success: true, stats };
  } catch (e) {
    if (e.message === 'NO_SOCIAL_AUTH') return { success: false, error: 'offline' };
    return { success: true, stats: { streak: 0, totalHours: 0, totalSessions: 0, totalDaysPlayed: 0, streakCompletedToday: false } };
  }
});

ipcMain.handle('social-search-user', async (e, query) => {
  try {
    const auth = await getSocialAuth();
    if (!query || query.trim().length < 2) return { success: false, error: 'Query too short' };
    const q = query.trim();
    const results = [];
    const seenUids = new Set([auth.uid]);

    // Prefix range search on usernameLower (e.g. "abe" matches "abelosky")
    const token = q.toLowerCase();
    const allResults = await fsQuery('users', [
      { field: 'usernameLower', op: 'GREATER_THAN_OR_EQUAL', value: { stringValue: token } },
      { field: 'usernameLower', op: 'LESS_THAN', value: { stringValue: token + '\uf8ff' } }
    ], auth.idToken, null, 20);
    for (const u of allResults) {
      if (!seenUids.has(u.id)) {
        seenUids.add(u.id);
        results.push({ uid: u.id, username: u.username, mcUuid: u.mcUuid || u.uuid, accountType: u.accountType || 'helloworld', avatarBase64: u.avatarBase64 || '' });
      }
    }

    return { success: true, results };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('social-send-request', async (e, toUid) => {
  try {
    const auth = await getSocialAuth();
    if (toUid === auth.uid) return { success: false, error: 'cannot_self' };

    // Check if blocked by target user — direct GET, rule allows if blockedUid == auth.uid
    try {
      await fsGet(`blocks/${toUid}__${auth.uid}`, auth.idToken);
      return { success: false, error: 'user_not_found' };
    } catch (_) { }

    // Check existing friendship
    const fid = friendshipId(auth.uid, toUid);
    try { await fsGet(`friendships/${fid}`, auth.idToken); return { success: false, error: 'already_friends' }; } catch (_) { }

    // Check if we already sent a request — direct GET of known doc ID
    try {
      const sent = await fsGet(`friendRequests/${auth.uid}__${toUid}`, auth.idToken);
      if (sent.status === 'pending') return { success: false, error: 'request_already_sent' };
    } catch (_) { }

    // Check if they already sent us a request — direct GET of known doc ID
    try {
      const received = await fsGet(`friendRequests/${toUid}__${auth.uid}`, auth.idToken);
      if (received.status === 'pending') return { success: false, error: 'request_already_received' };
    } catch (_) { }

    const reqId = `${auth.uid}__${toUid}`;
    await fsSet(`friendRequests/${reqId}`, {
      fromUid: auth.uid, toUid, status: 'pending', createdAt: new Date().toISOString()
    }, auth.idToken);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('social-get-requests', async () => {
  try {
    const auth = await getSocialAuth();
    const allSent = await fsQuery('friendRequests', [
      { field: 'fromUid', op: 'EQUAL', value: { stringValue: auth.uid } }
    ], auth.idToken);
    const sent = allSent.filter(r => r.status === 'pending');
    const allReceived = await fsQuery('friendRequests', [
      { field: 'toUid', op: 'EQUAL', value: { stringValue: auth.uid } }
    ], auth.idToken);
    const received = allReceived.filter(r => r.status === 'pending');

    // Enrich with profile data
    const enrich = async (reqs, uidField) => {
      return Promise.all(reqs.map(async r => {
        const uid = r[uidField];
        try { const p = await fsGet(`users/${uid}`, auth.idToken); return { ...r, profile: { ...p, uid } }; }
        catch (_) { return { ...r, profile: { uid, username: 'Unknown', accountType: 'helloworld' } }; }
      }));
    };
    return { success: true, sent: await enrich(sent, 'toUid'), received: await enrich(received, 'fromUid') };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('social-accept-request', async (e, requestId) => {
  try {
    const auth = await getSocialAuth();
    let req;
    try { req = await fsGet(`friendRequests/${requestId}`, auth.idToken); }
    catch (_) { return { success: false, error: 'request_not_found' }; }
    if (req.toUid !== auth.uid) return { success: false, error: 'not_authorized' };

    const fid = friendshipId(auth.uid, req.fromUid);
    await fsSet(`friendships/${fid}`, {
      users: [auth.uid, req.fromUid], createdAt: new Date().toISOString(), lastMessageAt: new Date().toISOString()
    }, auth.idToken);
    await fsDel(`friendRequests/${requestId}`, auth.idToken);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('social-reject-request', async (e, requestId) => {
  try {
    const auth = await getSocialAuth();
    await fsDel(`friendRequests/${requestId}`, auth.idToken);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('social-cancel-request', async (e, requestId) => {
  try {
    const auth = await getSocialAuth();
    await fsDel(`friendRequests/${requestId}`, auth.idToken);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('social-get-friends', async () => {
  try {
    const auth = await getSocialAuth();
    // No orderBy here — ARRAY_CONTAINS + orderBy on different field requires composite index.
    // Sort client-side instead.
    const friendships = await fsQuery('friendships', [
      { field: 'users', op: 'ARRAY_CONTAINS', value: { stringValue: auth.uid } }
    ], auth.idToken, null, 100);

    const friends = await Promise.all(friendships.map(async fs => {
      // Last message preview
      let lastMsg = null;
      try {
        const msgs = await fsQuerySub(`friendships/${fs.id}`, 'messages', [], auth.idToken, 'timestamp', 1);
        if (msgs.length > 0) lastMsg = msgs[0];
      } catch (_) { }

      // Unread count
      let unread = 0;
      try {
        const unreadDoc = await fsGet(`friendships/${fs.id}/unread/${auth.uid}`, auth.idToken);
        unread = unreadDoc.count || 0;
      } catch (_) { }

      if (fs.isGroup) {
        return {
          friendshipId: fs.id,
          isGroup: true,
          groupData: { name: fs.name, description: fs.description, imageBase64: fs.imageBase64, members: fs.users, admin: fs.admin, admins: fs.admins || [fs.admin] },
          lastMsg, unread, lastMessageAt: fs.lastMessageAt
        };
      }

      const friendUid = (fs.users || []).find(u => u !== auth.uid);
      if (!friendUid) return null;
      let profile = { uid: friendUid, username: 'Unknown', accountType: 'helloworld' };
      try { profile = await fsGet(`users/${friendUid}`, auth.idToken); } catch (_) { }

      const presence = await fetchPresenceForUser(friendUid, auth);

      return {
        friendshipId: fs.id,
        profile: { ...profile, uid: friendUid },
        presence,
        lastMsg,
        unread,
        lastMessageAt: fs.lastMessageAt
      };
    }));

    const sorted = friends.filter(Boolean).sort((a, b) => {
      const ta = a.lastMessageAt || '';
      const tb = b.lastMessageAt || '';
      return tb > ta ? 1 : tb < ta ? -1 : 0;
    });
    return { success: true, friends: sorted };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('social-create-group', async (e, name, description, imageBase64, members) => {
  try {
    const auth = await getSocialAuth();
    if (!members.includes(auth.uid)) members.push(auth.uid);
    const groupId = `group_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const now = new Date().toISOString();
    await fsSet(`friendships/${groupId}`, {
      isGroup: true,
      name,
      description: description || '',
      imageBase64: imageBase64 || '',
      users: members,
      admin: auth.uid,
      admins: [auth.uid],
      createdAt: now,
      lastMessageAt: now
    }, auth.idToken);
    return { success: true, groupId };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

async function deleteFriendshipCompletely(fid, idToken) {
  const deleteSub = async (sub) => {
    try {
      let hasMore = true;
      while (hasMore) {
        const docs = await fsQuerySub(`friendships/${fid}`, sub, [], idToken, null, 100);
        if (docs.length === 0) hasMore = false;
        else {
          for (const d of docs) await fsDel(`friendships/${fid}/${sub}/${d.id}`, idToken);
        }
      }
    } catch (e) { console.error(`Error deleting subcollection ${sub} of ${fid}:`, e.message); }
  };
  await deleteSub('messages');
  await deleteSub('unread');
  await deleteSub('replyState');
  await fsDel(`friendships/${fid}`, idToken);
}

ipcMain.handle('social-remove-friend', async (e, targetFriendshipId) => {
  try {
    const auth = await getSocialAuth();
    const doc = await fsGet(`friendships/${targetFriendshipId}`, auth.idToken);

    if (doc.isGroup) {
      // Leave group
      const newUsers = (doc.users || []).filter(u => u !== auth.uid);
      const newAdmins = (doc.admins || []).filter(u => u !== auth.uid);
      if (newUsers.length === 0) {
        // Delete group if empty
        await deleteFriendshipCompletely(targetFriendshipId, auth.idToken);
      } else {
        const update = { users: newUsers };
        // If owner leaves, transfer ownership to next admin or first member
        if (doc.admin === auth.uid) {
          const nextAdmin = newAdmins.length > 0 ? newAdmins[0] : newUsers[0];
          update.admin = nextAdmin;
          // Ensure new owner is in admins
          if (!newAdmins.includes(nextAdmin)) {
            update.admins = [...newAdmins, nextAdmin];
          } else {
            update.admins = newAdmins;
          }
        } else {
          update.admins = newAdmins;
        }
        await fsSet(`friendships/${targetFriendshipId}`, update, auth.idToken, Object.keys(update));
      }
    } else {
      // Remove friend (DM)
      await deleteFriendshipCompletely(targetFriendshipId, auth.idToken);
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('social-block-user', async (e, targetUid, sourceFriendshipId) => {
  try {
    const auth = await getSocialAuth();
    const blockId = `${auth.uid}__${targetUid}`;
    await fsSet(`blocks/${blockId}`, { blockerUid: auth.uid, blockedUid: targetUid, createdAt: new Date().toISOString() }, auth.idToken);
    if (sourceFriendshipId) {
      try { await deleteFriendshipCompletely(sourceFriendshipId, auth.idToken); } catch (_) { }
    }
    // Cancel any pending requests between the two
    const reqId1 = `${auth.uid}__${targetUid}`;
    const reqId2 = `${targetUid}__${auth.uid}`;
    try { await fsDel(`friendRequests/${reqId1}`, auth.idToken); } catch (_) { }
    try { await fsDel(`friendRequests/${reqId2}`, auth.idToken); } catch (_) { }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('social-unblock-user', async (e, targetUid) => {
  try {
    const auth = await getSocialAuth();
    const blockId = `${auth.uid}__${targetUid}`;
    await fsDel(`blocks/${blockId}`, auth.idToken);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('social-get-blocked', async () => {
  try {
    const auth = await getSocialAuth();
    const blocks = await fsQuery('blocks', [
      { field: 'blockerUid', op: 'EQUAL', value: { stringValue: auth.uid } }
    ], auth.idToken);
    const enriched = await Promise.all(blocks.map(async b => {
      let profile = { uid: b.blockedUid, username: 'Unknown', accountType: 'helloworld' };
      try { profile = await fsGet(`users/${b.blockedUid}`, auth.idToken); } catch (_) { }
      return { blockId: b.id, profile: { ...profile, uid: b.blockedUid } };
    }));
    return { success: true, blocked: enriched };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('social-send-message', async (e, targetFriendshipId, content, replyTo = null) => {
  try {
    const auth = await getSocialAuth();
    if (!content || !content.trim()) return { success: false, error: 'empty_message' };
    const msgId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const now = new Date().toISOString();
    const msgData = {
      senderId: auth.uid,
      content: content.trim(),
      timestamp: now,
      status: 'sent'
    };
    if (replyTo) {
      msgData.replyTo = replyTo.id;
      msgData.replyContent = replyTo.content;
      msgData.replySender = replyTo.senderId;
      msgData.replySenderName = replyTo.senderName;
    }
    await fsSet(`friendships/${targetFriendshipId}/messages/${msgId}`, msgData, auth.idToken);
    // Update friendship lastMessageAt
    await fsSet(`friendships/${targetFriendshipId}`, { lastMessageAt: now }, auth.idToken, ['lastMessageAt']);
    // Increment unread for all other users
    const fDoc = await fsGet(`friendships/${targetFriendshipId}`, auth.idToken);
    const otherUids = (fDoc.users || []).filter(u => u !== auth.uid);
    for (const otherUid of otherUids) {
      let currentUnread = 0;
      try { const ud = await fsGet(`friendships/${targetFriendshipId}/unread/${otherUid}`, auth.idToken); currentUnread = ud.count || 0; } catch (_) { }
      await fsSet(`friendships/${targetFriendshipId}/unread/${otherUid}`, { count: currentUnread + 1 }, auth.idToken);
    }
    return { success: true, msgId };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('social-edit-message', async (e, targetFriendshipId, msgId, newContent) => {
  try {
    const auth = await getSocialAuth();
    if (!newContent || !newContent.trim()) return { success: false, error: 'empty_message' };
    const msgDoc = await fsGet(`friendships/${targetFriendshipId}/messages/${msgId}`, auth.idToken);
    if (msgDoc.senderId !== auth.uid) return { success: false, error: 'not_owner' };

    // Pass the full document back to satisfy strict Firestore rules
    const updatedMsg = {
      ...msgDoc,
      content: newContent.trim(),
      edited: true,
      editedAt: new Date().toISOString()
    };
    delete updatedMsg.id; // remove local id property

    await fsSet(`friendships/${targetFriendshipId}/messages/${msgId}`, updatedMsg, auth.idToken);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('social-delete-message', async (e, targetFriendshipId, msgId) => {
  try {
    const auth = await getSocialAuth();
    const msgDoc = await fsGet(`friendships/${targetFriendshipId}/messages/${msgId}`, auth.idToken);
    if (msgDoc.senderId !== auth.uid) return { success: false, error: 'not_owner' };
    await fsDel(`friendships/${targetFriendshipId}/messages/${msgId}`, auth.idToken);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('social-set-reply', async (e, targetFriendshipId, replyTo) => {
  try {
    const auth = await getSocialAuth();
    const replyData = replyTo ? {
      msgId: replyTo.id,
      content: replyTo.content,
      senderId: replyTo.senderId,
      senderName: replyTo.senderName
    } : null;
    await fsSet(`friendships/${targetFriendshipId}/replyState/${auth.uid}`, { reply: replyData }, auth.idToken);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('social-get-reply', async (e, targetFriendshipId) => {
  try {
    const auth = await getSocialAuth();
    const doc = await fsGet(`friendships/${targetFriendshipId}/replyState/${auth.uid}`, auth.idToken);
    return { success: true, reply: doc.reply || null };
  } catch (e) {
    return { success: true, reply: null };
  }
});

ipcMain.handle('social-get-messages', async (e, targetFriendshipId, beforeTimestamp) => {
  try {
    const auth = await getSocialAuth();
    // Use listDocuments for subcollection without filters (avoids 400 error from runQuery with empty where)
    const res = await axios.get(`${FIRESTORE_BASE}/friendships/${targetFriendshipId}/messages?pageSize=1000`,
      { headers: { Authorization: `Bearer ${auth.idToken}` } });
    const allMsgs = (res.data.documents || []).map(doc => ({
      id: doc.name.split('/').pop(),
      ...parseFirestoreFields(doc.fields)
    }));
    const msgs = beforeTimestamp ? allMsgs.filter(m => m.timestamp < beforeTimestamp) : allMsgs;
    const sorted = msgs.sort((a, b) => a.timestamp > b.timestamp ? 1 : a.timestamp < b.timestamp ? -1 : 0);
    return { success: true, messages: sorted };
  } catch (e) {
    console.error('[Social] social-get-messages error:', e.message);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('social-mark-read', async (e, targetFriendshipId) => {
  try {
    const auth = await getSocialAuth();
    await fsSet(`friendships/${targetFriendshipId}/unread/${auth.uid}`, { count: 0 }, auth.idToken);
    // Mark messages from other users as delivered
    try {
      const msgs = await fsQuerySub(`friendships/${targetFriendshipId}`, 'messages', [], auth.idToken, null, 100);
      for (const msg of msgs) {
        if (msg.senderId !== auth.uid && (!msg.status || msg.status === 'sent')) {
          await fsSet(`friendships/${targetFriendshipId}/messages/${msg.id}`, { status: 'delivered' }, auth.idToken, ['status']);
        }
      }
    } catch (_) { }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('social-get-badge-counts', async () => {
  try {
    const auth = await getSocialAuth();
    const allRecv = await fsQuery('friendRequests', [
      { field: 'toUid', op: 'EQUAL', value: { stringValue: auth.uid } }
    ], auth.idToken, null, 100);
    const received = allRecv.filter(r => r.status === 'pending');
    const friendships = await fsQuery('friendships', [
      { field: 'users', op: 'ARRAY_CONTAINS', value: { stringValue: auth.uid } }
    ], auth.idToken, null, 100);
    let totalUnread = 0;
    for (const fs of friendships) {
      try { const ud = await fsGet(`friendships/${fs.id}/unread/${auth.uid}`, auth.idToken); totalUnread += ud.count || 0; } catch (_) { }
    }
    return { success: true, pendingRequests: received.length, unreadMessages: totalUnread };
  } catch (e) {
    if (e.message === 'NO_SOCIAL_AUTH') return { success: true, pendingRequests: 0, unreadMessages: 0 };
    return { success: false, error: e.message };
  }
});

ipcMain.handle('social-edit-group', async (e, groupId, updates) => {
  try {
    const auth = await getSocialAuth();
    const doc = await fsGet(`friendships/${groupId}`, auth.idToken);
    if (!doc.isGroup) return { success: false, error: 'not_a_group' };
    const admins = doc.admins || [doc.admin];
    if (!admins.includes(auth.uid)) return { success: false, error: 'not_admin' };
    const allowed = {};
    if (updates.name !== undefined) allowed.name = updates.name;
    if (updates.description !== undefined) allowed.description = updates.description;
    if (updates.imageBase64 !== undefined) allowed.imageBase64 = updates.imageBase64;
    if (Object.keys(allowed).length === 0) return { success: false, error: 'no_changes' };
    await fsSet(`friendships/${groupId}`, allowed, auth.idToken, Object.keys(allowed));
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('social-add-group-members', async (e, groupId, memberUids) => {
  try {
    const auth = await getSocialAuth();
    const doc = await fsGet(`friendships/${groupId}`, auth.idToken);
    if (!doc.isGroup) return { success: false, error: 'not_a_group' };
    const admins = doc.admins || [doc.admin];
    if (!admins.includes(auth.uid)) return { success: false, error: 'not_admin' };
    const currentUsers = doc.users || [];
    const newUsers = [...new Set([...currentUsers, ...memberUids])];
    await fsSet(`friendships/${groupId}`, { users: newUsers }, auth.idToken, ['users']);
    return { success: true, users: newUsers };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('social-remove-group-member', async (e, groupId, memberUid) => {
  try {
    const auth = await getSocialAuth();
    const doc = await fsGet(`friendships/${groupId}`, auth.idToken);
    if (!doc.isGroup) return { success: false, error: 'not_a_group' };
    const admins = doc.admins || [doc.admin];
    const isAdmin = admins.includes(auth.uid);
    const isOwner = doc.admin === auth.uid;
    // Only admin can remove others; user can remove themselves via leave group (social-remove-friend)
    if (memberUid !== auth.uid && !isAdmin) return { success: false, error: 'not_admin' };
    if (memberUid === doc.admin && !isOwner) return { success: false, error: 'cannot_remove_owner' };
    if (memberUid === doc.admin) return { success: false, error: 'owner_must_transfer' };
    const newUsers = (doc.users || []).filter(u => u !== memberUid);
    const newAdmins = (doc.admins || []).filter(u => u !== memberUid);
    if (newUsers.length === 0) {
      await deleteFriendshipCompletely(groupId, auth.idToken);
    } else {
      await fsSet(`friendships/${groupId}`, { users: newUsers, admins: newAdmins }, auth.idToken, ['users', 'admins']);
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('get-user-profile', async (e, uid) => {
  try {
    const auth = await getSocialAuth();
    // Fetch user data from Firestore users collection
    const userDoc = await fsGet(`users/${uid}`, auth.idToken);
    const presence = await fetchPresenceForUser(uid, auth);
    return { success: true, data: userDoc, presence };
  } catch (e) {
    console.error('[get-user-profile] Error:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('add-profile-link', async (e, uid, url, title, type) => {
  try {
    const auth = await getSocialAuth();
    // Verify user is editing their own profile
    if (auth.uid !== uid) {
      return { success: false, error: 'Cannot edit other users profile' };
    }

    // Get current user document
    const userDoc = await fsGet(`users/${uid}`, auth.idToken);
    const existingLinks = userDoc.links || [];

    // Add new link
    const newLink = { url, title, type, createdAt: new Date().toISOString() };
    const updatedLinks = [...existingLinks, newLink];

    // Update user document
    await fsSet(`users/${uid}`, { links: updatedLinks }, auth.idToken, ['links']);

    return { success: true };
  } catch (e) {
    console.error('[add-profile-link] Error:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('social-promote-admin', async (e, groupId, memberUid) => {
  try {
    const auth = await getSocialAuth();
    const doc = await fsGet(`friendships/${groupId}`, auth.idToken);
    if (!doc.isGroup) return { success: false, error: 'not_a_group' };
    const admins = doc.admins || [doc.admin];
    if (!admins.includes(auth.uid)) return { success: false, error: 'not_admin' };
    if (!(doc.users || []).includes(memberUid)) return { success: false, error: 'not_member' };
    if (admins.includes(memberUid)) return { success: false, error: 'already_admin' };
    const newAdmins = [...admins, memberUid];
    await fsSet(`friendships/${groupId}`, { admins: newAdmins }, auth.idToken, ['admins']);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('social-demote-admin', async (e, groupId, adminUid) => {
  try {
    const auth = await getSocialAuth();
    const doc = await fsGet(`friendships/${groupId}`, auth.idToken);
    if (!doc.isGroup) return { success: false, error: 'not_a_group' };
    if (doc.admin !== auth.uid) return { success: false, error: 'not_owner' };
    if (adminUid === doc.admin) return { success: false, error: 'cannot_demote_self' };
    const admins = doc.admins || [doc.admin];
    if (!admins.includes(adminUid)) return { success: false, error: 'not_admin' };
    const newAdmins = admins.filter(u => u !== adminUid);
    await fsSet(`friendships/${groupId}`, { admins: newAdmins }, auth.idToken, ['admins']);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('social-get-group-details', async (e, groupId) => {
  try {
    const auth = await getSocialAuth();
    const doc = await fsGet(`friendships/${groupId}`, auth.idToken);
    if (!doc.isGroup) return { success: false, error: 'not_a_group' };
    if (!(doc.users || []).includes(auth.uid)) return { success: false, error: 'not_member' };
    const profiles = await Promise.all((doc.users || []).map(async uid => {
      try { const p = await fsGet(`users/${uid}`, auth.idToken); return { ...p, uid: p.uid || p.id || uid }; } catch (_) { return { uid, username: 'Unknown', accountType: 'helloworld' }; }
    }));
    return {
      success: true,
      group: {
        id: groupId,
        name: doc.name,
        description: doc.description || '',
        imageBase64: doc.imageBase64 || '',
        members: doc.users || [],
        admin: doc.admin,
        admins: doc.admins || [doc.admin],
        createdAt: doc.createdAt
      },
      profiles
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Required for Windows toast notifications - must be before app.whenReady()
if (process.platform === 'win32') app.setAppUserModelId('com.abelosky.helloworldlauncher');

// --- App Events ---
app.whenReady().then(() => {
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
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', async () => {
  await presenceManager.setOffline();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', async () => {
  console.log("App closing, cleaning up processes...");

  // Set presence to offline when launcher closes (await to ensure it completes)
  await presenceManager.setOffline();

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
});