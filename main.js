const { app, BrowserWindow, ipcMain, Menu, shell, dialog, safeStorage } = require('electron')
const path = require('path')

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
const limitFS = (fn) => async function(...args) {
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
const skinManager = require('./src/handlers/skins')

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
launcher.on('debug', (e) => {
  console.log("[Launcher Debug]", e);
  mainWindow && mainWindow.webContents.send('info-message', e);
})
launcher.on('data', (e) => {
  console.log("[Launcher Data]", e);
  mainWindow && mainWindow.webContents.send('info-message', e);
})
launcher.on('progress', (e) => {
  console.log("[Launcher Progress]", e);
  mainWindow && mainWindow.webContents.send('download-progress', e);
})
launcher.on('close', (e) => {
  console.log("[Launcher Close]", e);
  mainWindow && mainWindow.webContents.send('info-message', "Game Closed");
  // Check Discord RPC
  rpc.setIdle();
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
  addons_per_page: 20,
  launch_count: 0,
  has_reviewed: false,
  onboarding_completed: false,
  last_skin_url: "",
  last_skin_variant: "classic"
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
    msmc_auth: data.msmc_auth
  };
  const toSave = { ...data };
  delete toSave.mc_token;
  delete toSave.uuid;
  delete toSave.msmc_auth;
  delete toSave.encrypted_tokens;

  const hasSensitive = sensitive.mc_token || sensitive.msmc_auth;

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
    fs.writeJsonSync(userFile, toSave, { spaces: 4 });
    paths.refresh();
  } catch (e) { }
}


// --- Windows ---
const createWindow = () => {
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

  // Start with Updater (Splash)
  win.loadFile(path.join(__dirname, 'ui/updater.html'))

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
  });

  win.webContents.on('will-navigate', (event, url) => {
    // If navigation is to a remote URL, open in external browser
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow = win
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
    const response = await fetch(manifestUrl);
    if (!response.ok) throw new Error(`Failed to fetch manifest: ${response.status}`);
    const data = await response.json();

    const latestRelease = data.latest?.release;
    const latestSnapshot = data.latest?.snapshot;

    if (!latestRelease || !latestSnapshot) {
      console.warn('[Background Update] Could not determine latest release or snapshot.');
      return;
    }

    console.log(`[Background Update] Latest Release: ${latestRelease}, Latest Snapshot: ${latestSnapshot}`);

    const mcDir = paths.getMcDir();
    const versionsDir = path.join(mcDir, 'versions');

    // Helper to install silently and create/update profile
    const installAndProfile = async (version, profileName) => {
      if (activeDownloads.has(version)) {
        console.log(`[Background Update] Version ${version} is already being downloaded. Skipping.`);
        return;
      }

      const versionDir = path.join(versionsDir, version);
      let isInstalled = fs.existsSync(versionDir);

      if (!isInstalled) {
        console.log(`[Background Update] Version ${version} not found. Starting background installation...`);
        const result = await installVersionLogic(
          version,
          (progress) => {
            progress.isBackgroundUpdate = true;
            if (mainWindow) mainWindow.webContents.send('download-progress', progress);
          },
          null,
          (data) => {
            data.isBackgroundUpdate = true;
            if (mainWindow) mainWindow.webContents.send('download-complete', data);
            
            // Tell the frontend to reload profiles so it shows up instantly without restarting
            if (mainWindow) mainWindow.webContents.send('reload-profiles');
          },
          null
        );
        if (result.success) {
          console.log(`[Background Update] Successfully installed ${version}.`);
          isInstalled = true;
        } else {
          console.error(`[Background Update] Failed to install ${version}: ${result.message}`);
        }
      } else {
        console.log(`[Background Update] Version ${version} is already installed.`);
      }

      // If installed (or newly installed), ensure profile exists
      if (isInstalled) {
        const profilesData = profileManager.loadProfiles();
        const profiles = profilesData.profiles || {};

        let existingProfileId = null;
        for (const [id, prof] of Object.entries(profiles)) {
          if (prof.name === profileName) {
            existingProfileId = id;
            break;
          }
        }

        if (existingProfileId) {
          // Update existing — always ensure directory, icon and version are correct
          const existingProfile = profiles[existingProfileId];
          const needsUpdate = existingProfile.version !== version || !existingProfile.directory;
          if (needsUpdate) {
            console.log(`[Background Update] Updating profile "${profileName}" to version ${version}.`);
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
          profileManager.addProfile(profileName, version, 'default.png', mcDir, '', null, true);
          if (mainWindow) mainWindow.webContents.send('reload-profiles');
        }
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
    userData.account_type = "microsoft"
    userData.username = profileData.name
    userData.uuid = profileData.id
    userData.mc_token = mcObj.mcToken // mcToken is on the wrapper
    userData.msmc_auth = result.save() // Save token string ONLY

    saveUserData(userData)

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

ipcMain.handle('logout', async () => {
  const data = loadUserData()

  // Clear persistent auth data
  data.username = "";
  data.account_type = "offline";
  data.uuid = "";
  data.mc_token = "";
  data.msmc_auth = "";
  data.last_skin_url = "";
  data.last_skin_variant = "classic";

  saveUserData(data)
  return data
})

ipcMain.handle('refresh-session', async () => {
  console.log("IPC: refresh-session");
  try {
    const userData = loadUserData();
    if (userData.account_type !== 'microsoft' || !userData.msmc_auth) {
      console.log("[Refresh] Skipping: Not a Microsoft account or no auth string.");
      return { success: false, error: "No Microsoft session to refresh" };
    }

    const refreshResult = await refreshMicrosoftSession(userData);
    
    if (refreshResult.success) {
        const safeProfile = {
            name: userData.username,
            id: userData.uuid,
            skin: userData.last_skin_url ? [{ url: userData.last_skin_url, variant: userData.last_skin_variant }] : []
        };
        return { success: true, profile: safeProfile };
    } else {
        return { success: false, expired: true, error: refreshResult.error || "Session refresh failed" };
    }

  } catch (err) {
    console.error("[Refresh] Critical Error:", err);
    return { success: false, expired: true, error: err.message };
  }
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
  // Frontend passes positional args: 
  // id, name, version, loader, icon, ram_min, ram_max, jvm_args, width, height, java_path

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

// 3. Modrinth / Addons
ipcMain.handle('search-modrinth', async (e, { query, options }) => modManager.searchModrinth(query, options))
ipcMain.handle('get-mod-categories', async (e) => modManager.getModCategories())
ipcMain.handle('get-mod-versions', async (e, { project_id, game_version, loader }) => modManager.getModVersions(project_id, game_version, loader))
ipcMain.handle('get-mod-details', async (e, id) => modManager.getModDetails(id))

ipcMain.handle('install-addon', async (e, args) => {
  try {
    console.log('[install-addon] Request:', args);
    let { url, filename, profile_id, type, version_id } = args;

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

    const profiles = profileManager.loadProfiles().profiles;
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
      return { success: true, alreadyInstalled: true };
    }

    console.log('[install-addon] Starting download to:', targetDir);

    return await modManager.installProject(url, filename, targetDir, (percentage) => {
      // Send progress to renderer
      // We assume 'args.project_id' is available (it is part of args destructuring or lookups)
      // Wait, args.project_id might be undefined if we passed only version_id?
      // But scripts.js sends project_id.
      if (args.project_id) {
        e.sender.send('mod-download-progress', { projectId: args.project_id, percentage });
      }
    });
  } catch (error) {
    console.error('[install-addon] Critical error:', error);
    return { success: false, error: error.message };
  }
})

ipcMain.handle('get-modrinth-categories', async () => {
  return await modManager.getModCategories();
})

ipcMain.handle('get-installed-addons', async (e, { profile_id, type, world_name }) => {
  const profiles = profileManager.loadProfiles().profiles;
  const profile = profiles[profile_id];
  if (!profile) return { success: false };

  const mcDir = paths.getMcDir();
  const profileDir = profile.directory || mcDir;

  let targetDir = path.join(profileDir, 'mods');
  if (type === 'resourcepack') targetDir = path.join(profileDir, 'resourcepacks');
  if (type === 'shader') targetDir = path.join(profileDir, 'shaderpacks');
  if (type === 'datapack') {
    if (!world_name) return { success: false, error: "World Name Required for Datapack" };
    targetDir = path.join(profileDir, 'saves', world_name, 'datapacks');
  }

  return await modManager.getInstalledAddons(targetDir, type);
})

ipcMain.handle('toggle-addon', async (e, { filename, profile_id, type, world_name }) => {
  const profiles = profileManager.loadProfiles().profiles;
  const profile = profiles[profile_id];
  if (!profile) return { success: false };

  const mcDir = paths.getMcDir();
  const profileDir = profile.directory || mcDir;

  let targetDir = path.join(profileDir, 'mods');
  if (type === 'resourcepack') targetDir = path.join(profileDir, 'resourcepacks');
  if (type === 'shader') targetDir = path.join(profileDir, 'shaderpacks');
  if (type === 'datapack') targetDir = path.join(profileDir, 'saves', world_name, 'datapacks');

  return await modManager.toggleAddon(filename, targetDir)
})

ipcMain.handle('delete-addon', async (e, { filename, profile_id, type, world_name }) => {
  const profiles = profileManager.loadProfiles().profiles;
  const profile = profiles[profile_id];
  if (!profile) return { success: false };

  const mcDir = paths.getMcDir();
  const profileDir = profile.directory || mcDir;

  let targetDir = path.join(profileDir, 'mods');
  if (type === 'resourcepack') targetDir = path.join(profileDir, 'resourcepacks');
  if (type === 'shader') targetDir = path.join(profileDir, 'shaderpacks');
  if (type === 'datapack') targetDir = path.join(profileDir, 'saves', world_name, 'datapacks');

  return await modManager.deleteAddon(filename, targetDir)
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

  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: `Import ${type}`,
    properties: ['openFile'],
    filters: filters
  });

  if (canceled || filePaths.length === 0) return { success: false, canceled: true };

  const sourceFile = filePaths[0];
  const filename = path.basename(sourceFile);
  const destFile = path.join(targetDir, filename);

  try {
    fs.ensureDirSync(targetDir);
    fs.copySync(sourceFile, destFile);
    return { success: true, filename };
  } catch (err) {
    return { success: false, error: err.message };
  }
})

// 4. Skins
ipcMain.handle('get-skin-packs', async () => skinManager.getSkinPacks());
ipcMain.handle('create-skin-pack', async (e, args) => skinManager.createSkinPack(args.name, args.skin_base64, args.skin_model, args.cape_id, args.cape_base64));
ipcMain.handle('edit-skin-pack', async (e, args) => skinManager.editSkinPack(args.pack_id, args.name, args.skin_base64, args.skin_model, args.cape_id, args.cape_base64));
ipcMain.handle('delete-skin-pack', async (e, id) => skinManager.deleteSkinPack(id));
ipcMain.handle('activate-skin-pack', async (e, id) => {
  const userData = loadUserData();
  if (userData.account_type !== 'microsoft' || !userData.mc_token) return { success: false, error: 'Login required' };
  return skinManager.activateSkinPack(id, userData.mc_token);
});

// 5. User Capes (New)
ipcMain.handle('get-user-capes', async () => {
  try {
    const userData = loadUserData();
    if (userData.account_type !== 'microsoft' || !userData.msmc_auth) {
      return { success: false, error: "Not logged in with Microsoft" };
    }

    console.log("Refreshing session to fetch capes...");
    const authManager = new msmc.Auth("select_account");
    const xboxManager = await authManager.refresh(userData.msmc_auth);
    const mcObj = await xboxManager.getMinecraft();

    if (!mcObj || !mcObj.profile || !mcObj.profile.capes) {
      return { success: true, capes: [] };
    }

    const capes = mcObj.profile.capes;
    const processedCapes = [];

    for (const cape of capes) {
      if (cape.url) {
        try {
          const response = await fetch(cape.url);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64 = "data:image/png;base64," + buffer.toString('base64');
            processedCapes.push({
              id: cape.id,
              alias: cape.alias,
              base64: base64
            });
          }
        } catch (err) {
          console.error(`Failed to load cape ${cape.alias}:`, err);
        }
      }
    }

    return { success: true, capes: processedCapes };
  } catch (e) {
    console.error("Error fetching user capes:", e);
    return { success: false, error: e.message };
  }
});

// --- Legacy Handlers ---
ipcMain.handle('close-app', () => app.quit())
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
    const response = await fetch(manifestUrl);
    if (response.ok) {
      const data = await response.json();
      if (data && data.versions) {
        web = data.versions.map(v => v.id);
      }
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

    const response = await fetch('https://launchermeta.mojang.com/mc/game/version_manifest.json');
    const data = await response.json();

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
    const response = await fetch('https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json');
    const data = await response.json();
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
    const response = await fetch('https://meta.fabricmc.net/v2/versions/game');
    const data = await response.json();
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
      const response = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${mc_version}`);
      const data = await response.json();
      return data.map(v => v.loader.version);
    } else if (type === 'forge') {
      // Fetch Forge versions from the promotions file
      const response = await fetch('https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json');
      const data = await response.json();

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
    } else if (versionLower.startsWith('fabric-')) {
      versionType = 'fabric';
      const parts = version_id.split('-'); // e.g. ["fabric", "1.21.7", "0.15.6"]
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
          const res = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${mcVersion}/${loaderVersion}/profile/json`);
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
          const res = await fetch(forgeUrl);
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

    downloadLauncher.on('progress', (progress) => {
      if (downloadInfo.cancelled) return;
      let percentage = progress.total
        ? Math.round((progress.task / progress.total) * 100)
        : Math.min(95, Math.round((++downloadProgress / 2500) * 100));
      let taskDescription = 'Downloading...';
      if (progress.type === 'assets') taskDescription = 'Downloading assets...';
      else if (progress.type === 'classes') taskDescription = 'Downloading libraries...';
      else if (progress.type === 'natives') taskDescription = 'Downloading natives...';
      
      console.log(`[installVersionLogic] Progress: ${progress.type} - ${percentage}%`);
      if (onProgress) onProgress({
        type: 'version-install', task: taskDescription, version: version_id,
        current: progress.task || downloadProgress,
        total: progress.total || 2500, percentage
      });
    });

    downloadLauncher.on('debug', (msg) => console.log('[Download Debug]', msg));
    downloadLauncher.on('data',  (msg) => console.log('[Download Data]', msg));
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
    const resolvedVersionType = versionType === 'forge' ? 'release' : versionType;

    const launchOptions = {
      authorization: { access_token: 'null', client_token: 'null', uuid: 'null', name: 'Installer', user_properties: {} },
      root: mcDir,
      version: { number: mcVersion, type: resolvedVersionType },
      memory: { max: '512M', min: '256M' },
      customArgs: []
    };

    if (versionType === 'fabric') {
      launchOptions.version.custom = customVersionId;
      if (fabricJsonPathVar) launchOptions.overrides = { versionJson: fabricJsonPathVar };
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
        try { process.kill(gameProcess.pid, 'SIGKILL'); } catch (err) {}
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
            try { fs.removeSync(path.dirname(forgeInstallerPath)); } catch(e){} // Cleanup temp folder
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

    // ─── Shared completion logic ──────────────────────────────────────────────
    if (downloadInfo.cancelled || !activeDownloads.has(version_id)) {
      console.log('[installVersionLogic] Download was cancelled during completion phase.');
      return { success: false, message: 'Download cancelled', cancelled: true };
    }

    if (onProgress) onProgress({
      type: 'version-install', task: 'Installation complete!',
      version: version_id, current: 100, total: 100, percentage: 100
    });

    setTimeout(() => {
      if (onDownloadComplete) onDownloadComplete({ version: version_id });
    }, 500);

    console.log('[installVersionLogic] Installation completed for:', version_id);
    activeDownloads.delete(version_id);
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

    // Priority 1: Check for active local skin pack (Skin Packs menu selection)
    const packs = skinManager.getSkinPacks();
    if (packs && packs.active_pack) {
      const activePackData = packs.packs[packs.active_pack];
      if (activePackData && activePackData.skin_preview) {
        return {
          skin: activePackData.skin_preview,
          cape: activePackData.cape_preview,
          variant: activePackData.skin_model || 'classic'
        };
      }
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

ipcMain.handle('save-app-settings', async (e, enableTransitions, hwAccel) => {
  const data = loadUserData();
  // hwAccel needs restart, enableTransitions is instant
  data.enable_transitions = enableTransitions !== false;
  data.hw_accel = hwAccel !== false;
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

ipcMain.handle('launch-profile', async (e, { profileId, nickname, force }) => {
    try {
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
        const userData = loadUserData();

        // 1. Prepare Auth
        const auth = await refreshMicrosoftSession(userData);
        if (userData.account_type === 'microsoft' && !auth.success && auth.expired) {
            return { status: 'error', error: "Your session has expired. Please log in again." };
        }

        if (nickname && userData.account_type === 'offline') {
            auth.name = nickname;
        }

        // 2. Prepare Launch Options
        const options = {
            authorization: {
                access_token: auth.access_token,
                client_token: auth.client_token,
                uuid: auth.uuid,
                name: auth.name,
                user_properties: {}
            },
            root: actualMcDir,
            version: {
                number: mcVersion,
                // MCLC requires type='release' for base MC version resolution.
                // Forge/Fabric specifics are handled via options.forge and options.version.custom.
                type: 'release'
            },
            overrides: {
                gameDirectory: profile.directory || actualMcDir
            },
            memory: {
                max: "4G",
                min: "1G"
            }
        };

        if (isForge || isFabric) {
            options.version.custom = profile.version;
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
        // Required for Forge/Fabric on Java 16+
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
        
        // Update RPC
        rpc.setPlaying(mcVersion, auth.name);

        launcher.launch(options).then(child => {
            currentGameProcess = child;
            
            child.on('close', () => {
                console.log("[Launch] Game process closed");
                currentGameProcess = null;
                rpc.setIdle();
                if (mainWindow) mainWindow.webContents.send('info-message', "Game Closed");
            });

            child.on('error', (err) => {
                console.error("[Launch] Process Error:", err);
                if (mainWindow) mainWindow.webContents.send('error', "Process Error: " + err.message);
            });
        }).catch(err => {
            console.error("[Launch] Launcher Error:", err);
            rpc.setIdle();
            if (mainWindow) mainWindow.webContents.send('error', "Launch Failed: " + err.message);
        });

        // 5. Update Metadata
        try {
            profile.last_played = new Date().toISOString();
            profileManager.saveProfiles({ profiles });
        } catch (e) {}

        return { success: true };
    } catch (e) {
        console.error("[Launch] Critical Exception:", e);
        return { success: false, error: e.message };
    }
})

ipcMain.handle('open-folder-dialog', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  })
  return canceled ? null : filePaths[0]
})

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

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  console.log("App closing, cleaning up processes...");

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
})