const { contextBridge, ipcRenderer } = require('electron')

// --- Modern API (New Features) ---
contextBridge.exposeInMainWorld('hwlAPI', {
    // User & Auth
    getUserJson: () => ipcRenderer.invoke('get-user-json'),
    saveUserJson: (data) => ipcRenderer.invoke('save-user-json', data),
    loginMicrosoft: () => ipcRenderer.invoke('login-microsoft'),
    logout: () => ipcRenderer.invoke('logout'),

    // Profiles
    getProfiles: () => ipcRenderer.invoke('get-profiles'),
    addProfile: (data) => ipcRenderer.invoke('add-profile', data),
    editProfile: (data) => ipcRenderer.invoke('edit-profile', data),
    deleteProfile: (id) => ipcRenderer.invoke('delete-profile', id),
    getProfileIcon: (filename) => ipcRenderer.invoke('get-profile-icon', filename),
    getWorlds: (profile_id) => ipcRenderer.invoke('get-worlds', profile_id),

    // Mods & Skins
    searchModrinth: (query, options) => ipcRenderer.invoke('search-modrinth', { query, options }),
    getModCategories: () => ipcRenderer.invoke('get-modrinth-categories'),
    getModVersions: (project_id, game_version, loader) => ipcRenderer.invoke('get-mod-versions', { project_id, game_version, loader }),
    getModDetails: (project_id) => ipcRenderer.invoke('get-mod-details', project_id),
    installAddon: (data) => ipcRenderer.invoke('install-addon', data),
    getInstalledAddons: (profile_id, type, world_name) => ipcRenderer.invoke('get-installed-addons', { profile_id, type, world_name }),
    toggleAddon: (filename, profile_id, type, world_name) => ipcRenderer.invoke('toggle-addon', { filename, profile_id, type, world_name }),
    deleteAddon: (filename, profile_id, type, world_name) => ipcRenderer.invoke('delete-addon', { filename, profile_id, type, world_name }),

    getSkinPacks: () => ipcRenderer.invoke('get-skin-packs'),
    createSkinPack: (data) => ipcRenderer.invoke('create-skin-pack', data),
    editSkinPack: (data) => ipcRenderer.invoke('edit-skin-pack', data),
    deleteSkinPack: (id) => ipcRenderer.invoke('delete-skin-pack', id),
    activateSkinPack: (id) => ipcRenderer.invoke('activate-skin-pack', id),

    // Events
    onDownloadProgress: (callback) => ipcRenderer.on('download-progress', (event, data) => callback(data)),
    onInfoMessage: (callback) => ipcRenderer.on('info-message', (event, data) => callback(data)),
    onLoginUpdate: (callback) => ipcRenderer.on('login-update', (event, data) => callback(data)),

    // Auto-Updater
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    startDownloadUpdate: () => ipcRenderer.invoke('start-download-update'),
    quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
    onUpdaterStatus: (callback) => ipcRenderer.on('updater-status', (event, data) => callback(data)),

    // Onboarding
    getOnboardingStatus: () => ipcRenderer.invoke('get-onboarding-status'),
    completeOnboarding: () => ipcRenderer.invoke('complete-onboarding')
});


// --- Legacy Adapter (Python pywebview Compatibility) ---
const pywebviewAPI = {
    // Auth & User
    get_user_json: () => ipcRenderer.invoke('get-user-json'),
    save_user_json: (username, mcdir, account_type) => ipcRenderer.invoke('save-user-json', { username, mcdir, account_type }),
    login_microsoft: () => ipcRenderer.invoke('login-microsoft'),
    logout_user: () => ipcRenderer.invoke('logout'),
    refresh_session: () => ipcRenderer.invoke('refresh-session'),
    check_internet: () => ipcRenderer.invoke('check-internet'),
    close_app: () => ipcRenderer.invoke('close-app'),

    // Profiles
    get_profiles: () => ipcRenderer.invoke('get-profiles'),
    get_profile_icon: (filename) => ipcRenderer.invoke('get-profile-icon', filename),
    get_profile_images: () => ipcRenderer.invoke('get-profile-images'),
    get_profiles_for_addon: (type) => ipcRenderer.invoke('get-profiles-for-addon', type),
    add_profile: (name, version, icon, directory, jvm_args, java_path) =>
        ipcRenderer.invoke('add-profile', name, version, icon, directory, jvm_args, java_path),
    edit_profile: (profile_id, name, version, loader, icon, ram_min, ram_max, jvm_args, width, height, java_path) =>
        ipcRenderer.invoke('edit-profile', profile_id, name, version, loader, icon, ram_min, ram_max, jvm_args, width, height, java_path),
    delete_profile: (profile_id) => ipcRenderer.invoke('delete-profile', profile_id),
    get_worlds: (profile_id) => ipcRenderer.invoke('get-worlds', profile_id),

    // Versions & Game
    get_available_versions: () => ipcRenderer.invoke('get-available-versions'),
    get_vanilla_versions: () => ipcRenderer.invoke('get-vanilla-versions'),
    get_forge_mc_versions: () => ipcRenderer.invoke('get-forge-mc-versions'),
    get_fabric_mc_versions: () => ipcRenderer.invoke('get-fabric-mc-versions'),
    get_loader_versions: (type, mc_version) => ipcRenderer.invoke('get-loader-versions', { type, mc_version }),
    install_version: (version_id) => ipcRenderer.invoke('install-version', version_id),
    get_launcher_version: () => ipcRenderer.invoke('get-version'),
    start_game: (profileId, nickname, force) => ipcRenderer.invoke('launch-profile', { profileId, nickname, force }),

    // Settings
    save_version_settings: (showSnapshots, showOld) => ipcRenderer.invoke('save-version-settings', showSnapshots, showOld),
    save_app_settings: (enableTransitions, hwAccel) => ipcRenderer.invoke('save-app-settings', enableTransitions, hwAccel),
    save_dev_mode: (enabled) => ipcRenderer.invoke('save-dev-mode', enabled),
    select_folder: (current_path) => ipcRenderer.invoke('select-folder', current_path),

    // Skins
    get_skin_data: () => ipcRenderer.invoke('get-skin-data'),
    get_user_capes: () => ipcRenderer.invoke('get-user-capes'),
    get_skin_packs: () => ipcRenderer.invoke('get-skin-packs'),
    create_skin_pack: (name, skin_base64, skin_model, cape_id, cape_base64) => ipcRenderer.invoke('create-skin-pack', { name, skin_base64, skin_model, cape_id, cape_base64 }),
    edit_skin_pack: (pack_id, name, skin_base64, skin_model, cape_id, cape_base64) => ipcRenderer.invoke('edit-skin-pack', { pack_id, name, skin_base64, skin_model, cape_id, cape_base64 }),
    delete_skin_pack: (id) => ipcRenderer.invoke('delete-skin-pack', id),
    activate_skin_pack: (id) => ipcRenderer.invoke('activate-skin-pack', id),

    // Addons
    get_installed_addons: (profile_id, type, world_name) => ipcRenderer.invoke('get-installed-addons', { profile_id, type, world_name }),
    get_installed_mods: (profile_id) => ipcRenderer.invoke('get-installed-addons', { profile_id, type: 'mod' }),
    get_mod_categories: () => ipcRenderer.invoke('get-mod-categories'),
    open_addons_folder: (profile_id, type, world_name) => ipcRenderer.invoke('open-addons-folder', { profile_id, type, world_name }),
    import_addon_file: (profile_id, type, world_name) => ipcRenderer.invoke('import-addon-file', { profile_id, type, world_name }),
    search_modrinth_mods: (query, options, project_type) => {
        let finalOptions = options || {};
        finalOptions.projectType = project_type || 'mod';
        return ipcRenderer.invoke('search-modrinth', {
            query,
            options: finalOptions
        });
    },
    get_mod_details: (project_id) => ipcRenderer.invoke('get-mod-details', project_id),
    get_mod_versions: (project_id, game_version, loader) => ipcRenderer.invoke('get-mod-versions', { project_id, game_version, loader }),
    install_project: (project_id, version_id, profile_id, type, world_name) =>
        ipcRenderer.invoke('install-addon', {
            project_id, version_id, profile_id, type, world_name
        }),
    on_mod_download_progress: (callback) => ipcRenderer.on('mod-download-progress', (_event, data) => callback(data)),
    toggle_mod: (arg1, arg2, arg3, arg4) => {
        // Handle BOTH signatures:
        // 1. (filename, profile_id, type, world_name)
        // 2. (profile_id, filename, enabled)
        if (arg1 && arg1.includes('-') && arg1.length > 30) {
            // Arg1 is likely a UUID/ProfileID (Legacy call pattern)
            return ipcRenderer.invoke('toggle-addon', { filename: arg2, profile_id: arg1, type: 'mod' });
        }
        // Normal pattern
        return ipcRenderer.invoke('toggle-addon', { filename: arg1, profile_id: arg2, type: arg3, world_name: arg4 });
    },
    delete_mod: (profile_id, filename) => ipcRenderer.invoke('delete-addon', { filename, profile_id, type: 'mod' }),
    delete_addon: (filename, profile_id, type, world_name) => ipcRenderer.invoke('delete-addon', { filename, profile_id, type, world_name }),

    // Misc
    check_review_reminder: () => ipcRenderer.invoke('check-review-reminder'),
    mark_review_action: (action) => ipcRenderer.invoke('mark-review-action', action),
    open_url: (url) => ipcRenderer.invoke('open-url', url),

    // UI Dialogs
    info: (msg) => ipcRenderer.invoke('info', msg),
    error: (msg) => ipcRenderer.invoke('error', msg),
    confirm: (msg) => ipcRenderer.invoke('confirm', msg),
    open_logs: () => ipcRenderer.invoke('open-logs'), // Implement if needed

    cancel_download: (version_id) => ipcRenderer.invoke('cancel-download', version_id),
    save_addons_per_page: (count) => ipcRenderer.invoke('save-addons-per-page', count),
    delete_version: (version_id) => ipcRenderer.invoke('delete-version', version_id)
};

contextBridge.exposeInMainWorld('pywebview', {
    api: pywebviewAPI
});

// Listen for Main Process signal to trigger ready
ipcRenderer.on('sys-ready', () => {
    // Dispatch legacy event
    window.dispatchEvent(new Event('pywebviewready'));
    console.log("Legacy Event Dispatched: pywebviewready");
});

ipcRenderer.on('login-success', (event, profile) => {
    window.dispatchEvent(new CustomEvent('login-success', { detail: profile }));
});

ipcRenderer.on('login-error', (event, error) => {
    window.dispatchEvent(new CustomEvent('login-error', { detail: error }));
});

// Global Event Dispatchers for Legacy UI
ipcRenderer.on('info-message', (event, data) => {
    window.dispatchEvent(new CustomEvent('info-message', { detail: data }));
});

ipcRenderer.on('download-progress', (event, data) => {
    window.dispatchEvent(new CustomEvent('download-progress', { detail: data }));
});

ipcRenderer.on('download-complete', (event, data) => {
    window.dispatchEvent(new CustomEvent('download-complete', { detail: data }));
});

ipcRenderer.on('download-cancelled', (event, data) => {
    window.dispatchEvent(new CustomEvent('download-cancelled', { detail: data }));
});

ipcRenderer.on('reload-profiles', (event, data) => {
    window.dispatchEvent(new CustomEvent('reload-profiles', { detail: data }));
});

// Expose electronAPI for direct event listening
contextBridge.exposeInMainWorld('electronAPI', {
    on: (channel, callback) => {
        const validChannels = ['download-progress', 'download-complete', 'download-cancelled', 'info-message', 'login-update', 'reload-profiles'];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, data) => callback(data));
        }
    },
    removeListener: (channel, callback) => {
        ipcRenderer.removeListener(channel, callback);
    }
});
