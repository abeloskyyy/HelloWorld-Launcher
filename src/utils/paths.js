const path = require('path');
const fs = require('fs-extra');
const { app } = require('electron');

const os = require('os');

// Default .minecraft path
let defaultMcDir = "";
if (process.platform === 'win32') {
    defaultMcDir = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), '.minecraft');
} else if (process.platform === 'darwin') {
    defaultMcDir = path.join(os.homedir(), 'Library', 'Application Support', 'minecraft');
} else {
    defaultMcDir = path.join(os.homedir(), '.minecraft');
}

// Initial guess: Default .minecraft location
// We need to check if a custom mcdir is set in user.json inside the default location
let currentLauncherDir = path.join(defaultMcDir, '.HWLauncher');
let currentMcDir = defaultMcDir;

// Filenames (Legacy compatibility)
const USER_FILE = 'user.json';
const PROFILES_FILE = 'profiles.json';

const reloadPaths = () => {
    try {
        const userFile = path.join(currentLauncherDir, USER_FILE);
        if (fs.existsSync(userFile)) {
            const data = fs.readJsonSync(userFile);
            if (data.mcdir && data.mcdir.trim() !== "") {
                currentMcDir = data.mcdir;
            } else {
                currentMcDir = defaultMcDir;
            }
            currentLauncherDir = path.join(currentMcDir, '.HWLauncher');
        }
    } catch (e) { }
}

// Initial load
reloadPaths();

module.exports = {
    getMcDir: () => currentMcDir,
    getLauncherDir: () => currentLauncherDir,
    getUserFilePath: () => path.join(currentLauncherDir, USER_FILE),
    getProfilesFilePath: () => path.join(currentLauncherDir, PROFILES_FILE),
    getProfilesImgDir: () => path.join(currentLauncherDir, 'profiles-img'),
    getSkinsDir: () => path.join(currentLauncherDir, 'skin_packs'),
    refresh: reloadPaths // Call this after saving user.json if mcdir changes
};
