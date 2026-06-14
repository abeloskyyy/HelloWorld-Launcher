// Toast notification system
function showToast(message, type = 'error') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-check-circle';
    
    toast.innerHTML = `
        <i class="${icon} toast-icon"></i>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.3s ease forwards';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// UI Elements

const selectTrigger = document.getElementById('selectTrigger');

const selectOptions = document.getElementById('selectOptions');

const customSelect = document.getElementById('customSelect');

const originalSelect = document.getElementById('profileSelect');

const createProfileBtn = document.getElementById('createProfileBtn');

const profileModal = document.getElementById('modal');

const cancelModalBtn = document.getElementById('cancelModalBtn');

const acceptProfileBtn = document.getElementById('acceptProfileBtn');

const iconButton = document.getElementById('iconButton');

const iconPreview = document.getElementById('iconPreview');

const placeholderIcon = document.getElementById('placeholderIcon');

const iconDisplay = document.getElementById('iconDisplay');

const selectFolderBtn = document.getElementById('selectFolderBtn');



// Image modal elements

const imageModal = document.getElementById('imageModal');

const imageGrid = document.getElementById('imageGrid');

const cancelImageModalBtn = document.getElementById('cancelImageModalBtn');

const customImageInput = document.getElementById('customImageInput');



// Login Modal Elements

const modalTabs = document.querySelectorAll('.modal-tab');

const loginMicrosoftBtn = document.getElementById('loginMicrosoftBtn');

const loginButton = document.getElementById('loginButton');

const userBadge = document.getElementById('userBadge');

const userDisplayName = document.getElementById('userDisplayName');

const userMenuBtn = document.getElementById('userMenuBtn');

const logoutBtn = document.getElementById('logoutBtn');

const loginModal = document.getElementById('loginModal');

const closeLoginModal = document.getElementById('closeLoginModal');



// Login screens

const loginMethodScreen = document.getElementById('loginMethodScreen');

const loginOfflineScreen = document.getElementById('loginOfflineScreen');

const selectMicrosoftBtn = document.getElementById('selectMicrosoftBtn');

const selectOfflineBtn = document.getElementById('selectOfflineBtn');

const backToMethodBtn = document.getElementById('backToMethodBtn');

const saveOfflineBtn = document.getElementById('saveOfflineBtn');









// Global Variables

let profiles = {};

let editingProfileId = null;

let selectedImageData = null;

let isDownloading = false;

let activeProfileFilter = null;

let currentProfileSoftware = 'vanilla';



// Load Sequence IDs to prevent duplicate rendering on fast concurrent calls

let loadOptionsSeq = 0;

let loadProfilesSeq = 0;

let loadVersionsSeq = 0;

let loadModdableProfilesSeq = 0;

let loadAddonsSeq = 0;

let loadInstalledVersionsSeq = 0;



// Profile Modal Version Selects

const profileSoftwareSelect = document.getElementById('profileSoftwareSelect');

const profileMcVersionSelect = document.getElementById('profileMcVersionSelect');

const profileLoaderVersionGroup = document.getElementById('profileLoaderVersionGroup');

const profileLoaderVersionSelect = document.getElementById('profileLoaderVersionSelect');

const profileLoaderVersionLabel = document.getElementById('profileLoaderVersionLabel');



const versionCache = {

    vanilla: null,

    fabric: null,

    forge: null

};



// Helper to resolve secure image sources

window.resolveImageSource = function (src) {

    if (!src) return '';

    if (src.startsWith('http') || src.startsWith('data:') || src.startsWith('blob:')) {

        return src;

    }

    // Assume local path if not web/data

    // Convert backslashes to slashes

    let normalized = src.replace(/\\/g, '/');

    // Ensure it doesn't already have protocol

    if (!normalized.startsWith('launcher://')) {

        // If it starts with a drive letter (e.g. C:/) prepend launcher://

        if (/^[a-zA-Z]:/.test(normalized) || normalized.startsWith('/')) {

            return 'launcher://' + normalized;

        }

    }

    return normalized;

};



// Manage download state

function startDownloadState() {

    isDownloading = true;

    if (acceptProfileBtn) acceptProfileBtn.disabled = true;

    if (cancelModalBtn) cancelModalBtn.disabled = true;

}



function endDownloadState() {

    isDownloading = false;

    if (acceptProfileBtn) acceptProfileBtn.disabled = false;

    if (cancelModalBtn) cancelModalBtn.disabled = false;

}







async function saveSettings() {

    const btn = document.getElementById("saveSettingsBtn");

    const originalContent = btn ? btn.innerHTML : "Save Settings";



    try {

        const username = document.getElementById("nickname").value;

        const mcdir = document.getElementById("mcdir").value;

        const addonsPerPage = document.getElementById("addonsPerPage")?.value || 20;



        const devMode = document.getElementById("devModeCheckbox")?.checked || false;

        window.isDevMode = devMode;

        const showSnapshots = document.getElementById("showSnapshotsCheckbox")?.checked || false;

        const showOld = document.getElementById("showOldVersionsCheckbox")?.checked || false;

        const enableTransitions = document.getElementById("enableTransitionsCheckbox")?.checked !== false;

        const hwAccel = document.getElementById("hwAccelCheckbox")?.checked !== false;

        const privacyMode = document.getElementById("privacyModeCheckbox")?.checked || false;


        // Get current data to check for restart requirements

        const currentData = await window.pywebview.api.get_user_json();



        const restartRequired =

            currentData.dev_mode !== devMode ||

            currentData.hw_accel !== hwAccel ||

            currentData.enable_transitions !== enableTransitions;



        // 1. Save core user info

        await window.pywebview.api.save_user_json(username, mcdir);



        // 2. Save version listing filters

        await window.pywebview.api.save_version_settings(showSnapshots, showOld);



        // 3. Save developer mode

        await window.pywebview.api.save_dev_mode(devMode);



        // 4. Save app performance settings

        await window.pywebview.api.save_app_settings(enableTransitions, hwAccel, privacyMode);



        // 5. Save addons per page

        await window.pywebview.api.save_addons_per_page(addonsPerPage);



        // UI Feedback: Success mark

        if (btn) {

            btn.classList.add('btn-success');

            btn.innerHTML = '<i class="fas fa-check"></i> Saved!';

            setTimeout(() => {

                btn.classList.remove('btn-success');

                btn.innerHTML = originalContent;

            }, 2000);

        }



        // Alert if restart is needed

        if (restartRequired) {

            window.pywebview.api.info('Settings saved. One or more changes (Dev Mode, Transitions, or Hardware Acceleration) require a launcher restart to be applied.');

        }



        // Clear version cache as snapshots/old might have changed

        versionCache.vanilla = null;



    } catch (err) {

        console.error("Error saving settings:", err);

        if (btn) {

            btn.classList.add('btn-red');

            btn.innerHTML = '<i class="fas fa-times"></i> Error';

            setTimeout(() => {

                btn.classList.remove('btn-red');

                btn.innerHTML = originalContent;

            }, 2000);

        }

    }

}



if (document.getElementById("mcdir")) {

    document.getElementById("mcdir").addEventListener("input", () => {

        const nick = document.getElementById("nickname").value;

        const mcdir = document.getElementById("mcdir").value;

        window.pywebview.api.save_user_json(nick, mcdir);

    });

}



// PyWebView Ready - SINGLE CENTRALIZED INITIALIZATION

const initLauncher = async () => {
    if (window._launcherInitialized) return;
    window._launcherInitialized = true;

    console.log('[Init] pywebviewready event fired');



    // Check internet connection first

    try {

        window.hasInternet = await window.pywebview.api.check_internet();



        if (!window.hasInternet) {

            // Show no internet modal

            const noInternetModal = document.getElementById('noInternetModal');

            if (noInternetModal) {

                noInternetModal.style.display = 'flex';



                const closeAppBtn = document.getElementById('closeAppBtn');

                const continueAnywayBtn = document.getElementById('continueAnywayBtn');



                if (closeAppBtn) {

                    closeAppBtn.addEventListener('click', async () => {

                        await window.pywebview.api.close_app();

                    });

                }



                if (continueAnywayBtn) {

                    continueAnywayBtn.addEventListener('click', () => {

                        noInternetModal.style.display = 'none';

                    });

                }

            }

        }

    } catch (error) {

        console.error('Error checking internet:', error);

    }



    // --- Core Initialization ---

    try {

        // Load initial user data

        const data = await window.pywebview.api.get_user_json();

        console.log('[Init] User data loaded:', data.account_type, data.username);



        // Populate settings inputs

        if (document.getElementById("nickname")) document.getElementById("nickname").value = data.username || "";

        if (document.getElementById("mcdir")) document.getElementById("mcdir").value = data.mcdir || "";

        if (document.getElementById("addonsPerPage")) document.getElementById("addonsPerPage").value = data.addons_per_page || 20;



        const devModeCheckbox = document.getElementById("devModeCheckbox");

        if (devModeCheckbox) {

            devModeCheckbox.checked = data.dev_mode || false;

        }

        window.isDevMode = data.dev_mode || false;



        const showSnapshotsCheckbox = document.getElementById("showSnapshotsCheckbox");

        if (showSnapshotsCheckbox) showSnapshotsCheckbox.checked = data.show_snapshots || false;



        const showOldVersionsCheckbox = document.getElementById("showOldVersionsCheckbox");

        if (showOldVersionsCheckbox) showOldVersionsCheckbox.checked = data.show_old || false;



        const transitionsCheckbox = document.getElementById("enableTransitionsCheckbox");

        if (transitionsCheckbox) transitionsCheckbox.checked = (data.enable_transitions !== false);



        const hwAccelCheckbox = document.getElementById("hwAccelCheckbox");

        if (hwAccelCheckbox) hwAccelCheckbox.checked = (data.hw_accel !== false);

        const privacyModeCheckbox = document.getElementById("privacyModeCheckbox");
        if (privacyModeCheckbox) privacyModeCheckbox.checked = data.privacy_mode || false;


        // Apply visual settings that don't need restart (on load)

        if (data.enable_transitions === false) {

            document.body.classList.add('disable-transitions');

        } else {

            document.body.classList.remove('disable-transitions');

        }



        // Update UI immediately with local state (shows name and "Steve" head as fallback)

        await updateUserInterface(data);

        if (data.username && window.hasInternet) {

            await loadSkinData(); // Try to load last known/cached skin

        }



        // Register mod download progress listener

        if (window.pywebview.api.on_mod_download_progress) {

            window.pywebview.api.on_mod_download_progress((prog) => {

                if (window.onModDownloadProgress) {

                    window.onModDownloadProgress(prog.projectId, prog.percentage, 'downloading');

                }

            });

        }



        // Session Refresh Check

        // Auto-refresh session/skins for premium and helloworld accounts

        const refreshUserSession = async () => {

            const currentData = await window.pywebview.api.get_user_json();

            if ((currentData.account_type === 'microsoft' || currentData.account_type === 'helloworld') && window.hasInternet) {

                try {

                    const res = await window.pywebview.api.refresh_session();

                    if (res.success) {

                        const refreshedData = await window.pywebview.api.get_user_json();

                        await updateUserInterface(refreshedData);

                        await loadSkinData();

                    } else if (res.expired && currentData.account_type === 'microsoft') {

                        console.warn("[Init] Session expired");

                        window.pywebview.api.info("Your Microsoft session has expired. Please log in again.");

                        

                        const offlineData = await window.pywebview.api.save_user_json(currentData.username, currentData.mcdir, 'offline');

                        await updateUserInterface(offlineData);

                        await loadSkinData();

                    }

                } catch (err) {

                    console.error("[Init] Error refreshing session:", err);

                }

            }

        };



        // Run immediately on load

        await refreshUserSession();



        // Run every 60 seconds in the background

        setInterval(refreshUserSession, 60000);



        // Load rest of the app data

        await loadOptions();

        await loadProfiles();

        await loadVersions();

        await checkReviewReminder();



        // Load launcher version

        try {

            const version = await window.pywebview.api.get_launcher_version();

            const vEl = document.getElementById("launcherVersion");

            if (vEl) vEl.textContent = version;

        } catch (err) { }



    } catch (error) {

        console.error("[Init] Error during initialization:", error);

    } finally {

        // Hide loader/splash

        const loader = document.getElementById('initialLoader');

        if (loader) {

            loader.classList.add('hidden');

            setTimeout(() => { loader.style.display = 'none'; }, 500);

        }

    }
    // Load Minecraft News
    try {
        await loadMinecraftNews();
    } catch(err) {
        console.error("Failed to load Minecraft News:", err);
    }

    console.log('[Init] Initialization complete');

};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLauncher);
} else {
    initLauncher();
}
window.addEventListener('pywebviewready', initLauncher);



// --- NEW AUTH FUNCTIONS ---



async function updateUserInterface(userData) {

    const badge = document.getElementById('userBadge');

    const name = document.getElementById('userDisplayName');

    const loginBtn = document.getElementById('loginButton');

    const skinsBtn = document.getElementById('skinsSidebarBtn');



    // Check if logged in (offline, microsoft or helloworld)

    if (userData.username && userData.username !== "") {

        if (badge) badge.style.display = 'flex';

        if (name) name.textContent = userData.username;

        if (loginBtn) loginBtn.style.display = 'none';



        // ONLY Show local skins/capes button for Microsoft accounts

        // HelloWorld skins are managed via the web dashboard only

        if (userData.account_type === 'microsoft') {

            if (skinsBtn) skinsBtn.style.display = 'flex';

        } else {

            if (skinsBtn) skinsBtn.style.display = 'none';

        }



        const editProfileBtn = document.getElementById('editProfileBtn');

        if (editProfileBtn) {

            if (userData.account_type === 'microsoft') {

                // Premium account

                const isVerified = !!(userData.firebase_ms_uid);

                editProfileBtn.style.display = 'block';

                if (isVerified) {

                    editProfileBtn.disabled = false;

                    editProfileBtn.classList.remove('btn-disabled');

                    editProfileBtn.style.removeProperty('cursor');

                    editProfileBtn.style.removeProperty('opacity');

                    editProfileBtn.title = 'Edit Profile';

                } else {

                    editProfileBtn.disabled = false; // Don't use disabled attribute, use class instead

                    editProfileBtn.classList.add('btn-disabled');

                    editProfileBtn.style.cursor = 'default';

                    editProfileBtn.style.opacity = '0.5';

                    editProfileBtn.title = 'Verify your Microsoft account to edit profile';

                }
                
                // Reload stats for Microsoft accounts
                if (window.loadMyStats) {
                    window.loadMyStats();
                }

            } else if (userData.account_type === 'helloworld') {

                // HelloWorld accounts can always edit profile

                editProfileBtn.style.display = 'block';

                editProfileBtn.disabled = false;

                editProfileBtn.classList.remove('btn-disabled');

                editProfileBtn.style.removeProperty('cursor');

                editProfileBtn.style.removeProperty('opacity');

                editProfileBtn.title = 'Edit Profile';
                
                // Reload stats for HelloWorld accounts
                if (window.loadMyStats) {
                    window.loadMyStats();
                }

            } else {

                // Offline accounts cannot edit profile

                editProfileBtn.style.display = 'none';
                
                const streakBadgeContainer = document.getElementById('streakBadgeContainer');
                if (streakBadgeContainer) streakBadgeContainer.style.display = 'none';
                
                const statsBtn = document.getElementById('statsBtn');
                if (statsBtn) statsBtn.style.display = 'none';

            }

        }



        // Show/hide verification banner for unverified Microsoft accounts

        // Use stored firebase_ms_uid (persists across restarts, no port-dependent localStorage)

        const banner = document.getElementById('msVerifyBanner');

        if (banner) {

            const isMs = userData.account_type === 'microsoft';

            const alreadyVerified = !!(userData.firebase_ms_uid);

            const showBanner = isMs && !alreadyVerified;

            banner.style.display = showBanner ? 'flex' : 'none';

        }



        // Render head avatar

        if (window.renderUserHead) {

            if (userData.account_type === 'helloworld') {

                const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.username)}&background=random&color=fff&rounded=true&bold=true&format=svg`;

                const avatarUrl = window.hasInternet ? (userData.last_avatar_url || fallbackUrl) : null;

                await window.renderUserHead(avatarUrl);

            } else if (userData.account_type === 'microsoft') {

                // Use mc-heads for avatar. If they have a premium name it will show, otherwise Steve.

                const skinUrl = window.hasInternet ? `https://mc-heads.net/avatar/${userData.username}` : null;

                await window.renderUserHead(skinUrl);

            } else {

                // Offline

                await window.renderUserHead(null);

            }

        }

    } else {

        if (badge) badge.style.display = 'none';

        if (loginBtn) loginBtn.style.display = 'flex';

        if (skinsBtn) skinsBtn.style.display = 'none';

        

        const editProfileBtn = document.getElementById('editProfileBtn');

        if (editProfileBtn) editProfileBtn.style.display = 'none';

        const streakBadgeContainer = document.getElementById('streakBadgeContainer');
        if (streakBadgeContainer) streakBadgeContainer.style.display = 'none';
        
        const statsBtn = document.getElementById('statsBtn');
        if (statsBtn) statsBtn.style.display = 'none';
    }

    

    // Social button visibility and state

    const socialBtnEl = document.getElementById('socialBtn');

    if (socialBtnEl) {

        const showSocial = userData.username && userData.username !== '' &&

            (userData.account_type === 'helloworld' || userData.account_type === 'microsoft');

        socialBtnEl.style.display = showSocial ? 'flex' : 'none';



        if (showSocial) {

            // Check if Microsoft account is verified

            if (userData.account_type === 'microsoft') {

                const isVerified = !!(userData.firebase_ms_uid);

                if (isVerified) {

                    socialBtnEl.disabled = false;

                    socialBtnEl.classList.remove('btn-disabled');

                    socialBtnEl.style.removeProperty('cursor');

                    socialBtnEl.style.removeProperty('opacity');

                    socialBtnEl.title = 'Social';

                } else {

                    socialBtnEl.disabled = false; // Don't use disabled attribute, use class instead

                    socialBtnEl.classList.add('btn-disabled');

                    socialBtnEl.style.cursor = 'default';

                    socialBtnEl.style.opacity = '0.5';

                    socialBtnEl.title = 'Verify your Microsoft account to use Social';

                }

            } else {

                // HelloWorld accounts can always use social

                socialBtnEl.disabled = false;

                socialBtnEl.classList.remove('btn-disabled');

                socialBtnEl.style.removeProperty('cursor');

                socialBtnEl.style.removeProperty('opacity');

                socialBtnEl.title = 'Social';

            }



            if (typeof window.initSocial === 'function') {

                window.initSocial().catch(() => {});

            }

        } else if (!showSocial && typeof window.onSocialLogout === 'function') {

            window.onSocialLogout();

        }

    }



    // Disable play button if account requires internet but none is available

    const playButton = document.querySelector('.play-button');

    if (playButton) {

        if ((userData.account_type === 'microsoft' || userData.account_type === 'helloworld') && !window.hasInternet) {

            playButton.disabled = true;

            playButton.style.opacity = '0.5';

            playButton.style.cursor = 'not-allowed';

            playButton.title = "Internet connection required for online accounts";

        } else if (!window.isLaunching && !window.isSyncing) {

            playButton.disabled = false;

            playButton.style.opacity = '1';

            playButton.style.cursor = 'pointer';

            playButton.title = "";

        }

    }

}



async function loadSkinData() {

    try {

        const userData = await window.pywebview.api.get_user_json();

        

        const skinImg = document.getElementById('skinPreviewImg');

        const capeImg = document.getElementById('capePreviewImg');

        const badge = document.getElementById('skinVariantBadge');

        const capeBadge = document.getElementById('capeBadge');

        const noCape = document.getElementById('noCapeText');



        // Use fallback avatar logic based on account type

        let avatarUrl = null;

        if (userData.account_type === 'helloworld') {

            const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.username)}&background=random&color=fff&rounded=true&bold=true&format=svg`;

            avatarUrl = window.hasInternet ? (userData.last_avatar_url || fallbackUrl) : null;

        } else if (userData.account_type === 'microsoft' && userData.username) {

            avatarUrl = window.hasInternet ? `https://mc-heads.net/avatar/${userData.username}` : null;

        }



        if (skinImg) {

            skinImg.src = avatarUrl;

        }



        if (badge) badge.style.display = 'none';

        

        if (capeImg) capeImg.style.display = 'none';

        if (capeBadge) capeBadge.style.display = 'none';

        if (noCape) noCape.style.display = 'none';

    } catch (e) {

        console.error("Error loading skin data", e);

    }

}



// Global Login Callbacks

window.onLoginSuccess = async function () {

    const data = await window.pywebview.api.get_user_json();

    await updateUserInterface(data);

    clearLoginFields();



    const selectMicrosoftBtn = document.getElementById('selectMicrosoftBtn');

    if (selectMicrosoftBtn) {

        selectMicrosoftBtn.innerHTML = '<i class="fab fa-microsoft"></i> Login with Microsoft';

        selectMicrosoftBtn.disabled = false;

    }



    const loginMicrosoftBtn = document.getElementById('loginMicrosoftBtn');

    if (loginMicrosoftBtn) {

        loginMicrosoftBtn.innerHTML = '<i class="fab fa-microsoft"></i> Login with Microsoft';

        loginMicrosoftBtn.disabled = false;

    }



    const modal = document.getElementById('loginModal');

    if (modal) modal.classList.remove('show');



    loadSkinData();

};



// IPC Event Listeners (Added for Electron)

window.addEventListener('login-success', async (event) => {

    if (window.onLoginSuccess) {

        window.onLoginSuccess();

    }

    // Silently verify Microsoft account for web login using Firebase Auth

    const profile = event.detail;

    if (profile && profile.account_type !== 'offline') {

        const data = await window.pywebview.api.get_user_json().catch(() => null);

        if (data && data.account_type === 'microsoft') {

            silentMicrosoftVerify(data.username, data.uuid).catch(() => {});

        }

    }

});



async function waitForFirebase(timeout = 5000) {

    const step = 100;

    for (let t = 0; t < timeout; t += step) {

        if (window._launcherFirebase) return window._launcherFirebase;

        await new Promise(r => setTimeout(r, step));

    }

    return null;

}



async function silentMicrosoftVerify(username, uuid) {

    const fb = await waitForFirebase();

    if (!fb) return;

    try {

        // If already signed into Firebase Auth, use that session silently (no popup)

        const msUser = fb.fbAuth.currentUser;

        if (msUser) {

            await writeMsVerified(fb, msUser, username, uuid);

            console.log('[MS Verify] Silently re-verified:', msUser.email);

            return;

        }



        // If no Firebase session, check if already verified in Firestore

        console.log('[MS Verify] No Firebase Auth session. Checking Firestore for existing verification...');

        const PROJECT_ID = 'helloworld-launcher';

        const queryUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;

        const queryBody = {

            structuredQuery: {

                from: [{ collectionId: "microsoftVerified" }],

                where: {

                    fieldFilter: {

                        field: { fieldPath: "username" },

                        op: "EQUAL",

                        value: { stringValue: username }

                    }

                },

                limit: 1

            }

        };



        const queryRes = await fetch(queryUrl, {

            method: 'POST',

            headers: { 'Content-Type': 'application/json' },

            body: JSON.stringify(queryBody)

        }).then(r => r.json());



        if (queryRes && queryRes[0] && queryRes[0].document) {

            const fields = queryRes[0].document.fields;

            const email = fields.email ? fields.email.stringValue : null;

            if (email) {

                console.log('[MS Verify] Found existing verification in Firestore for:', email);

                // Note: We can't restore Firebase Auth session without re-authenticating

                // The user will need to click "Verify now" to restore the session

                console.log('[MS Verify] User needs to click "Verify now" to restore Firebase Auth session');

                return;

            }

        }

        console.log('[MS Verify] No existing verification found in Firestore');

    } catch (e) {

        console.log('[MS Verify] Skipped:', e.code || e.message);

    }

}



async function writeMsVerified(fb, msUser, username, uuid) {

    const email = (msUser.email || msUser.providerData?.[0]?.email || '').toLowerCase();

    if (!email) throw new Error('No email from Microsoft account');

    const emailKey = email.replace(/\./g, '_DOT_').replace(/@/g, '_AT_');

    const refreshToken = msUser.stsTokenManager?.refreshToken || '';

    await window.pywebview.api.ms_write_verified(emailKey, email, username, uuid, msUser.uid, refreshToken);

    return email;

}



async function verifyWithPopup() {

    const fb = await waitForFirebase(8000);

    if (!fb) return { success: false, error: 'Firebase SDK not loaded' };

    const data = await window.pywebview.api.get_user_json().catch(() => null);

    if (!data || data.account_type !== 'microsoft') return { success: false, error: 'Not a Microsoft account' };

    try {

        const provider = new fb.OAuthProvider('microsoft.com');

        const result = await fb.signInWithPopup(fb.fbAuth, provider);

        const email = await writeMsVerified(fb, result.user, data.username, data.uuid);



        // Reload user data from backend to get updated firebase_ms_uid

        const updatedData = await window.pywebview.api.get_user_json();

        await updateUserInterface(updatedData);



        return { success: true, email };

    } catch (e) {

        return { success: false, error: e.message || e.code };

    }

}



window.addEventListener('login-error', (event) => {

    if (window.onLoginError) {

        window.onLoginError(event.detail);

    }

});



window.onLoginError = function (err) {

    window.pywebview.api.error("Login failed: " + err);

    // Reset button state

    const selectMicrosoftBtn = document.getElementById('selectMicrosoftBtn');

    if (selectMicrosoftBtn) {

        selectMicrosoftBtn.innerHTML = '<i class="fab fa-microsoft"></i> Login with Microsoft';

        selectMicrosoftBtn.disabled = false;

    }



    // Also reset the other button if it exists/was used

    const loginMicrosoftBtn = document.getElementById('loginMicrosoftBtn');

    if (loginMicrosoftBtn) {

        loginMicrosoftBtn.innerHTML = '<i class="fab fa-microsoft"></i> Login with Microsoft';

        loginMicrosoftBtn.disabled = false;

    }

};



// Bind Button

if (selectMicrosoftBtn) {

    selectMicrosoftBtn.onclick = () => {

        selectMicrosoftBtn.innerHTML = '<span class="spinner-small"></span> Waiting...';

        selectMicrosoftBtn.disabled = true;

        window.pywebview.api.login_microsoft();

    };

}



window.cancelLaunch = function() {

    window.isLaunching = false;

    // Instantly revert state in UI

    const playButton = document.querySelector('.play-button');

    if (playButton) {

        playButton.disabled = false;

        playButton.style.cursor = 'pointer';

        playButton.style.opacity = '1';

        playButton.innerHTML = playButton.dataset.originalHtml || 'Play';

    }

    const cancelBtn = document.getElementById('cancelLaunchBtn');

    if (cancelBtn) {

        cancelBtn.classList.remove('visible');

        cancelBtn.innerHTML = '<i class="fas fa-times"></i>';

        cancelBtn.disabled = false;

    }



    // Call API to cancel launch in background without blocking UI

    window.pywebview.api.cancel_launch().catch(err => console.error("Cancel launch error:", err));

};



async function launchGame() {

    console.log('[Frontend] launchGame called');

    const profileSelectElement = document.getElementById("profileSelect");



    if (!profileSelectElement || !profileSelectElement.value) {

        window.pywebview.api.error("You must select an installation before playing");

        return;

    }



    const selectedProfile = profileSelectElement.value;



    // Get nickname from user data instead of the login modal

    const userData = await window.pywebview.api.get_user_json();

    const nickname = userData.username || "";



    if (!nickname) {

        window.pywebview.api.error("You must log in before playing");

        return;

    }



    // Block Microsoft accounts if offline (verification requires internet)

    if (userData.account_type === 'microsoft' && !window.hasInternet) {

        window.pywebview.api.error("You cannot play with a Microsoft account without an internet connection. Please use an Offline account to play offline.");

        return;

    }



    // Prevent double-launch

    if (window.isLaunching) return;

    window.isLaunching = true;



    // Show loading state BEFORE async call so it's immediate

    const playButton = document.querySelector('.play-button');

    if (playButton) {

        // Save original in case of error

        playButton.dataset.originalHtml = playButton.innerHTML;

        playButton.disabled = true;

        playButton.style.cursor = 'not-allowed';

        playButton.style.opacity = '0.6';

        playButton.innerHTML = '<span class="spinner"></span> Starting...';

    }

    const cancelBtn = document.getElementById('cancelLaunchBtn');

    if (cancelBtn) {

        cancelBtn.classList.add('visible');

    }



    // Try to launch the game
    const serverParam = window.pendingServerParam || null;
    const result = await pywebview.api.start_game(selectedProfile, nickname, false, serverParam);
    
    if (result.status !== "missing_files" && result.status !== "already_running") {
        window.pendingServerParam = null;
    }

    // Handle duplicate instance

    if (result.status === "already_running") {

        const confirm = await window.pywebview.api.confirm(

            "Minecraft is already open. Do you want to open another instance?"

        );

        if (confirm) {

            // Force launch

            const forceResult = await pywebview.api.start_game(selectedProfile, nickname, true, serverParam);
            window.pendingServerParam = null;

            if (forceResult.status === "error") {

                window.isLaunching = false;

                if (playButton) {

                    playButton.disabled = false;

                    playButton.style.cursor = 'pointer';

                    playButton.style.opacity = '1';

                    playButton.innerHTML = playButton.dataset.originalHtml || 'Play';

                }

                if (cancelBtn) cancelBtn.classList.remove('visible');

                return;

            }

        } else {

            // Revert state

            window.isLaunching = false;

            if (playButton) {

                playButton.disabled = false;

                playButton.style.cursor = 'pointer';

                playButton.style.opacity = '1';

                playButton.innerHTML = playButton.dataset.originalHtml || 'Play';

            }

            if (cancelBtn) cancelBtn.classList.remove('visible');

            return;

        }

    } else if (result.status === "missing_files") {

        // Reset launching lock so sync can re-trigger launchGame() after completion

        window.isLaunching = false;

        startSynchronizationQueue(result, selectedProfile);

        return;

    } else if (result.status === "error") {

        // Revert state

        window.isLaunching = false;

        if (playButton) {

            playButton.disabled = false;

            playButton.style.cursor = 'pointer';

            playButton.style.opacity = '1';

            playButton.innerHTML = playButton.dataset.originalHtml || 'Play';

        }

        if (cancelBtn) cancelBtn.classList.remove('visible');

        return;

    }

}



// Global listener for info messages from main.js (launcher events)

window.addEventListener('info-message', (e) => {

    const msg = String(e.detail);

    if (msg === "Game Closed" || msg.includes("Game Crashed") || msg.includes("has exited") || msg.includes("Game process closed")) {

        // Always re-enable button when game closes, regardless of sync state

        onMinecraftClosed();

    } else if (msg.includes("Sound engine started") || msg.includes("OpenAL initialized")) {

        if (!window.isSyncing) onMinecraftReady();

    }

});



// Reset play button when launch fails (JVM errors, missing files, etc.)

window.addEventListener('error', (e) => {

    const msg = String(e.detail);

    if (msg.includes('Launch Failed') || msg.includes('Process Error')) {

        window.isLaunching = false;

        const playButton = document.querySelector('.play-button');

        if (playButton) {

            playButton.disabled = false;

            playButton.style.cursor = 'pointer';

            playButton.style.opacity = '1';

            playButton.innerHTML = playButton.dataset.originalHtml || 'Play';

        }

        const cancelBtn = document.getElementById('cancelLaunchBtn');

        if (cancelBtn) cancelBtn.classList.remove('visible');

    }

});



function formatVersionName(versionId) {

    if (!versionId) return 'Unknown Version';

    if (versionId.startsWith('fabric-loader-')) {

        const parts = versionId.split('-'); // ['fabric','loader',loader,...,mc,...]

        if (parts.length >= 4) {

            const mc = parts.slice(3).join('.');

            const loader = parts[2];

            return `Fabric ${mc} (${loader})`;

        }

    }

    if (versionId.toLowerCase().startsWith('fabric-') && !versionId.startsWith('fabric-loader-')) {

        const parts = versionId.split('-');

        if (parts.length >= 3) return `Fabric ${parts[1]} (${parts.slice(2).join('-')})`;

    }

    if (versionId.toLowerCase().includes('forge')) {

        const mc = (versionId.match(/(\d+\.\d+(?:\.\d+)?)/) || [])[1] || versionId;

        const fv = (versionId.match(/forge[-.](.+)/i) || [])[1];

        return fv ? `Forge ${mc} (${fv})` : `Forge ${mc}`;

    }

    return `Vanilla ${versionId}`;

}



// --- Synchronization Queue ---

async function startSynchronizationQueue(syncData, profileId) {

    const modal = document.getElementById('syncModal');

    const tasksList = document.getElementById('syncTasksList');

    const progressText = document.getElementById('syncProgressText');

    const progressBar = document.getElementById('syncProgressBar');

    

    // Block game-closed events from re-enabling the play button during sync

    window.isSyncing = true;

    

    // Suppress version-installed toast during sync

    const savedOnDownloadComplete = window.onDownloadComplete;

    window.onDownloadComplete = () => {};

    

    modal.classList.add('show');

    

    // Build queue with filenames as placeholder

    let queue = [];

    if (syncData.missing_version) {

        const vname = formatVersionName(syncData.version_id);

        queue.push({

            type: 'version',

            name: vname,

            displayName: vname,

            id: syncData.version_id

        });

    }

    if (syncData.missing_addons) {

        syncData.missing_addons.forEach(a => {

            queue.push({

                type: 'addon',

                name: a.filename.replace(/\.disabled$/, ''),

                displayName: a.filename.replace(/\.disabled$/, ''),

                data: a

            });

        });

    }

    

    // Render list immediately with placeholders

    const renderItem = (q, i) => {

        const iconClass = q.type === 'version' ? 'fas fa-cube sync-icon-version' : 'fas fa-puzzle-piece sync-icon-addon';

        return `<div id="sync-task-${i}" class="sync-task-item">

            <div class="sync-task-left">

                <i class="${iconClass}"></i>

                <span id="sync-task-label-${i}" class="sync-task-label">${q.displayName}</span>

            </div>

            <div id="sync-task-status-${i}" class="sync-task-status pending"><i class="fas fa-clock"></i> Waiting</div>

        </div>`;

    };

    tasksList.innerHTML = queue.map(renderItem).join('');

    

    // Fetch Modrinth names for addons via backend (bypasses CSP)

    queue.forEach((q, i) => {

        if (q.type === 'addon' && q.data && q.data.project_id) {

            const cached = window.modrinthDetailsCache && window.modrinthDetailsCache[q.data.project_id];

            if (cached && cached.title) {

                q.displayName = cached.title;

                const labelEl = document.getElementById(`sync-task-label-${i}`);

                if (labelEl) labelEl.textContent = cached.title;

                return;

            }

            window.pywebview.api.get_mod_details(q.data.project_id)

                .then(result => {

                    if (result && result.success && result.details && result.details.title) {

                        q.displayName = result.details.title;

                        const labelEl = document.getElementById(`sync-task-label-${i}`);

                        if (labelEl) labelEl.textContent = result.details.title;

                    }

                })

                .catch(() => {});

        }

    });

    

    // Abort controller logic

    window.currentSyncCancelled = false;

    window.currentSyncTask = null;

    

    document.getElementById('cancelSyncBtn').onclick = () => {

        window.currentSyncCancelled = true;

        modal.classList.remove('show');

        

        if (window.currentSyncTask) {

            if (window.currentSyncTask.type === 'version') {

                window.pywebview.api.cancel_download(window.currentSyncTask.id).catch(e => console.error(e));

            }

        }

        

        window.isSyncing = false;

        window.onDownloadComplete = savedOnDownloadComplete;

        window.cancelLaunch(); // Revert play button & clean up backend

    };

    

    const updateTaskStatus = (index, icon, text, cls) => {

        const statusEl = document.getElementById(`sync-task-status-${index}`);

        if (!statusEl) return;

        statusEl.className = `sync-task-status ${cls}`;

        statusEl.innerHTML = `${icon} ${text}`;

    };

    

    // Process queue sequentially

    for (let i = 0; i < queue.length; i++) {

        if (window.currentSyncCancelled) break;

        

        const task = queue[i];

        window.currentSyncTask = task;

        

        updateTaskStatus(i, '<i class="fas fa-spinner fa-spin"></i>', 'Downloading...', 'downloading');

        progressText.textContent = `Downloading ${task.displayName || task.name}...`;

        progressBar.style.width = '0%';

        

        // Auto-scroll to current item

        const taskEl = document.getElementById(`sync-task-${i}`);

        if (taskEl) taskEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        

        try {

            if (task.type === 'version') {

                let highestPct = 0;

                const handleProg = (e) => {

                    if (e.detail.version === task.id) {

                        const pct = e.detail.percentage || 0;

                        // Don't let the bar jump backward when a new phase starts

                        if (pct >= highestPct) {

                            highestPct = pct;

                            progressBar.style.width = `${pct}%`;

                        }

                        progressText.textContent = `${e.detail.task || 'Downloading'}...`;

                    }

                };

                window.addEventListener('download-progress', handleProg);

                

                const res = await window.pywebview.api.install_version(task.id);

                window.removeEventListener('download-progress', handleProg);

                

                if (!res.success) throw new Error(res.message);

                

            } else if (task.type === 'addon') {

                const a = task.data;

                const originalOnModDownloadProgress = window.onModDownloadProgress;

                window.onModDownloadProgress = (projectId, percentage, status) => {

                    if (originalOnModDownloadProgress) originalOnModDownloadProgress(projectId, percentage, status);

                    if (projectId === a.project_id) {

                        progressBar.style.width = `${percentage || 0}%`;

                        const label = task.displayName || a.filename;

                        progressText.textContent = `${label} (${percentage || 0}%)`;

                    }

                };

                

                const res = await window.pywebview.api.install_project(

                    a.project_id, a.version_id, profileId, a.type, null

                );

                

                window.onModDownloadProgress = originalOnModDownloadProgress;

                

                if (!res.success && !res.alreadyInstalled) throw new Error(res.error);

            }

            

            updateTaskStatus(i, '<i class="fas fa-check"></i>', 'Done', 'done');

        } catch (err) {

            console.error(err);

            updateTaskStatus(i, '<i class="fas fa-times"></i>', 'Error', 'error');

            if (window.currentSyncCancelled) break;

            

            window.isSyncing = false;

            window.onDownloadComplete = savedOnDownloadComplete;

            window.pywebview.api.error(`Failed to download: ${err.message}`);

            modal.classList.remove('show');

            // Revert Play Button

            const playBtn = document.querySelector('.play-button');

            if (playBtn) {

                playBtn.disabled = false;

                playBtn.style.cursor = 'pointer';

                playBtn.style.opacity = '1';

                playBtn.innerHTML = playBtn.dataset.originalHtml || 'Play';

            }

            const cancelBtn = document.getElementById('cancelLaunchBtn');

            if (cancelBtn) cancelBtn.classList.remove('visible');

            return;

        }

    }

    

    if (window.currentSyncCancelled) {

        // Delete partial/completed addon file if a download was in progress when cancelled

        if (window.currentSyncTask && window.currentSyncTask.type === 'addon') {

            const a = window.currentSyncTask.data;

            window.pywebview.api.delete_addon_file(profileId, a.type, a.filename).catch(() => {});

        }

        return;

    }

    

    progressText.textContent = "All done! Launching game...";

    progressBar.style.width = '100%';

    

    setTimeout(() => {

        // Restore after backend's 500ms download-complete callback has already fired

        window.onDownloadComplete = savedOnDownloadComplete;

        window.isSyncing = false;

        modal.classList.remove('show');

        launchGame();

    }, 1200);

}



// Callback when Minecraft window is ready

function onMinecraftReady() {

    const playButton = document.querySelector('.play-button');

    if (playButton) {

        playButton.innerHTML = 'Playing';

        playButton.disabled = false;

        playButton.style.cursor = 'pointer';

        playButton.style.opacity = '1';

    }

    const cancelBtn = document.getElementById('cancelLaunchBtn');

    if (cancelBtn) cancelBtn.classList.remove('visible');

}



// Callback when Minecraft closes

function onMinecraftClosed() {

    window.isLaunching = false;

    const playButton = document.querySelector('.play-button');

    if (playButton) {

        playButton.innerHTML = 'Play';

        playButton.disabled = false;

        playButton.style.cursor = 'pointer';

        playButton.style.opacity = '1';

    }

    const cancelBtn = document.getElementById('cancelLaunchBtn');

    if (cancelBtn) cancelBtn.classList.remove('visible');



    // Reload profiles and options

    loadProfiles();

    loadOptions();

}



// Helper Functions

function timeAgo(dateString) {

    const date = new Date(dateString);

    const now = new Date();

    const seconds = Math.floor((now - date) / 1000);



    let interval = seconds / 31536000;

    if (interval > 1) return Math.floor(interval) + " years ago";

    interval = seconds / 2592000;

    if (interval > 1) return Math.floor(interval) + " months ago";

    interval = seconds / 86400;

    if (interval > 1) return Math.floor(interval) + " days ago";

    interval = seconds / 3600;

    if (interval > 1) return Math.floor(interval) + " hours ago";

    interval = seconds / 60;

    if (interval > 1) return Math.floor(interval) + " minutes ago";

    return "A few seconds ago";

}



async function loadVersions() {

    // Stub: version selection is now handled via the profile modal's software/MC/loader dropdowns.

    // Kept for compatibility with download-listeners.js background updates.

    console.log('[loadVersions] stub called');

}



async function loadOptions() {

    const seq = ++loadOptionsSeq;

    const profilesData = await window.pywebview.api.get_profiles();

    if (seq !== loadOptionsSeq) return; // Abort if a newer call started

    profiles = profilesData.profiles;



    if (selectOptions) selectOptions.innerHTML = '';

    if (originalSelect) originalSelect.innerHTML = '';



    const profilesArray = Object.entries(profiles).map(([id, profile]) => ({

        id,

        ...profile

    }));



    profilesArray.sort((a, b) => {

        const dateA = a.last_played ? new Date(a.last_played) : new Date(0);

        const dateB = b.last_played ? new Date(b.last_played) : new Date(0);

        return dateB - dateA;

    });



    // Filtering logic

    const filteredProfiles = activeProfileFilter

        ? profilesArray.filter(p => {

            const versionLower = p.version.toLowerCase();

            let type = 'vanilla';

            if (versionLower.includes('forge')) type = 'forge';

            else if (versionLower.includes('fabric')) type = 'fabric';



            return type === activeProfileFilter;

        })

        : profilesArray;



    const displayProfiles = activeProfileFilter ? filteredProfiles : profilesArray;





    if (profilesArray.length === 0) {

        // No hay perfiles: Ocultar icono y mostrar opción de crear

        if (document.getElementById('selectedIcon')) {

            document.getElementById('selectedIcon').style.display = 'none';

        }

        if (document.getElementById('selectedTitle')) document.getElementById('selectedTitle').textContent = "No installations found";

        if (document.getElementById('selectedSubtitle')) document.getElementById('selectedSubtitle').textContent = "Create an installation to play";



        if (selectOptions) {

            const createOption = document.createElement('div');

            createOption.className = 'select-option';

            createOption.innerHTML = `

                <div class="option-icon" style="display: flex; align-items: center; justify-content: center; font-size: 24px; color: #fff; background: rgba(255, 255, 255, 0.1);"><i class="fas fa-plus"></i></div>

                <div class="option-content">

                    <div class="option-title">Create New Installation</div>

                    <div class="option-subtitle">Click to get started</div>

                </div>

            `;

            createOption.addEventListener('click', async () => {

                closeSelect();

                await resetProfileModal();

                if (profileModal) profileModal.classList.add('show');

            });

            selectOptions.appendChild(createOption);

        }

    } else {

        // Hay perfiles: Mostrar icono y cargar lista

        if (document.getElementById('selectedIcon')) {

            document.getElementById('selectedIcon').style.display = 'block';

        }



        // If filtering and no results, show message

        if (activeProfileFilter && displayProfiles.length === 0) {

            if (selectOptions) {

                const emptyMsg = document.createElement('div');

                emptyMsg.style.padding = '20px';

                emptyMsg.style.textAlign = 'center';

                emptyMsg.style.color = '#aaa';

                emptyMsg.innerHTML = `<i class="fas fa-filter"></i> No ${activeProfileFilter} installations found`;



                // Add clear filter button

                const clearBtn = document.createElement('button');

                clearBtn.className = 'btn-secondary btn-small';

                clearBtn.style.marginTop = '10px';

                clearBtn.textContent = 'Clear filter';

                clearBtn.onclick = (e) => {

                    e.stopPropagation();

                    filterProfiles(activeProfileFilter, e); // Toggle off

                };



                emptyMsg.appendChild(document.createElement('br'));

                emptyMsg.appendChild(clearBtn);



                selectOptions.appendChild(emptyMsg);

            }

        }



        for (const profile of displayProfiles) {

            const id = profile.id;



            if (originalSelect) {

                const nativeOption = document.createElement("option");

                nativeOption.value = id;

                nativeOption.textContent = profile.name;

                originalSelect.appendChild(nativeOption);

            }



            if (selectOptions) {

                const option = document.createElement('div');

                option.className = 'select-option';

                option.dataset.value = id;



                let tags = '';

                const versionLower = (profile.version || '').toLowerCase();

                let type = 'vanilla';

                if (versionLower.includes('forge')) type = 'forge';

                else if (versionLower.includes('fabric')) type = 'fabric';



                const isForgeActive = activeProfileFilter === 'forge' ? 'active' : '';

                const isFabricActive = activeProfileFilter === 'fabric' ? 'active' : '';

                const isVanillaActive = activeProfileFilter === 'vanilla' ? 'active' : '';



                if (type === 'forge') tags = `<span class="option-tag forge ${isForgeActive}" onclick="filterProfiles('forge', event)">FORGE</span>`;

                else if (type === 'fabric') tags = `<span class="option-tag fabric ${isFabricActive}" onclick="filterProfiles('fabric', event)">FABRIC</span>`;

                else tags = `<span class="option-tag ${isVanillaActive}" onclick="filterProfiles('vanilla', event)">VANILLA</span>`;



                if (profile.mods) tags += `<span class="option-tag">${profile.mods} MODS</span>`;



                const iconUrl = await window.pywebview.api.get_profile_icon(profile.icon);

                profile.iconUrl = iconUrl;



                const lastPlayedText = profile.last_played ? timeAgo(profile.last_played) : 'Never';



                option.innerHTML = `

                    <img src="${iconUrl}" alt="" class="option-icon">

                    <div class="option-content">

                        <div class="option-title">${profile.name}</div>

                        <div class="option-subtitle">Version ${profile.version} • ${lastPlayedText}</div>

                        <div class="option-tags">${tags}</div>

                    </div>

                `;



                option.addEventListener('click', (e) => {

                    // Prevent selection if clicking a tag

                    if (e.target.classList.contains('option-tag')) return;

                    selectOption(id, profile);

                });

                selectOptions.appendChild(option);

            }

        }



        if (profilesArray.length > 0 && !activeProfileFilter) {

            const firstProfile = profilesArray[0];

            selectOption(firstProfile.id, firstProfile);

        }

    }

}



window.filterProfiles = function (type, event) {

    if (event) event.stopPropagation();



    if (activeProfileFilter === type) {

        activeProfileFilter = null; // Toggle off

    } else {

        activeProfileFilter = type;

    }



    // Reload options to apply filter

    loadOptions();



    // Keep dropdown open

    if (selectTrigger && !selectTrigger.classList.contains('active')) {

        toggleSelect();

    }



    // Focus search or something? No, just keep open.

    // If we closed it, re-open it.

    if (selectOptions && !selectOptions.classList.contains('active')) {

        selectOptions.classList.add('active');

        selectTrigger.classList.add('active');

    }

};



// Error Modal Handling

window.showLaunchError = function (type, message, log) {

    const modal = document.getElementById('errorModal');

    const title = document.getElementById('errorModalTitle');

    const msg = document.getElementById('errorModalMessage');

    const logArea = document.getElementById('errorLogContent');

    const javaSection = document.getElementById('javaDownloadSection');



    if (!modal) return;



    msg.textContent = message;

    logArea.value = log;



    // Reset specific sections

    javaSection.style.display = 'none';



    if (type === 'java') {

        title.textContent = 'Java Error';

        javaSection.style.display = 'block';

    } else {

        title.textContent = 'Launch Error';

    }



    modal.classList.add('show');

};



window.closeErrorModal = function () {

    const modal = document.getElementById('errorModal');

    if (modal) modal.classList.remove('show');

};



window.copyErrorLog = function () {

    const logArea = document.getElementById('errorLogContent');

    if (logArea) {

        logArea.select();

        document.execCommand('copy');

        showToast('Log copied to clipboard', 'success');

    }

};



function selectOption(id, profile) {

    if (originalSelect) originalSelect.value = id;



    const lastPlayedText = profile.last_played ? timeAgo(profile.last_played) : 'Never';



    if (document.getElementById('selectedIcon')) {

        document.getElementById('selectedIcon').src = profile.iconUrl || profile.icon;

        document.getElementById('selectedIcon').style.display = 'block';

    }

    if (document.getElementById('selectedTitle')) document.getElementById('selectedTitle').textContent = profile.name;

    if (document.getElementById('selectedSubtitle')) document.getElementById('selectedSubtitle').textContent = `Version ${profile.version} • ${lastPlayedText}`;



    document.querySelectorAll('.select-option').forEach(opt => {

        opt.classList.remove('selected');

    });

    const selectedOpt = document.querySelector(`[data-value="${id}"]`);

    if (selectedOpt) selectedOpt.classList.add('selected');



    closeSelect();

    if (originalSelect) originalSelect.dispatchEvent(new Event('change'));

}



function toggleSelect() {

    if (selectTrigger) selectTrigger.classList.toggle('active');

    if (selectOptions) selectOptions.classList.toggle('active');

}



function closeSelect() {

    if (selectTrigger) selectTrigger.classList.remove('active');

    if (selectOptions) selectOptions.classList.remove('active');

}



if (selectTrigger) {



    // Local file actions

    const btnOpenFolder = document.getElementById('btnOpenAddonsFolder');

    const btnImport = document.getElementById('btnImportLocalAddon');



    if (btnOpenFolder) btnOpenFolder.addEventListener('click', openAddonsFolder);

    if (btnImport) btnImport.addEventListener('click', importLocalAddonFile);

    selectTrigger.addEventListener('click', (e) => {

        e.stopPropagation();

        toggleSelect();

    });

}



document.addEventListener('click', (e) => {

    if (customSelect && !customSelect.contains(e.target)) {

        closeSelect();

    }

});



function isReservedProfileName(name) {

    if (!name) return false;

    const lowerName = name.trim().toLowerCase();

    return lowerName === 'latest release' || lowerName === 'latest snapshot';

}



async function loadProfiles() {

    const seq = ++loadProfilesSeq;

    const profilesData = await window.pywebview.api.get_profiles();

    if (seq !== loadProfilesSeq) return; // Abort if a newer call started

    const profiles = profilesData.profiles;



    const list = document.getElementById("profilesList");

    if (!list) return;

    list.innerHTML = "";



    const profilesArray = Object.entries(profiles).map(([id, profile]) => ({

        id,

        ...profile

    }));



    profilesArray.sort((a, b) => {

        const dateA = a.last_played ? new Date(a.last_played) : new Date(0);

        const dateB = b.last_played ? new Date(b.last_played) : new Date(0);

        return dateB - dateA;

    });



    for (const profile of profilesArray) {

        const id = profile.id;

        const iconUrlRaw = await window.pywebview.api.get_profile_icon(profile.icon);

        const iconUrl = window.resolveImageSource(iconUrlRaw);

        const lastPlayedText = profile.last_played ? timeAgo(profile.last_played) : 'Never';



        const isReserved = isReservedProfileName(profile.name);



        const item = document.createElement("div");

        item.className = "profile-card";

        item.innerHTML = `

            <img src="${iconUrl}" id="profile-img">

            <div class="profile-info">

                <h3>${profile.name}</h3>

                <p>Version: ${profile.version} | Last played: ${lastPlayedText}</p>

            </div>

            <div class="profile-actions">

                <button class="btn-secondary btn-small edit-btn" ${isReserved ? 'disabled title="Managed automatically"' : ''}><i class="fas fa-edit"></i> Edit</button>

                <button class="btn-danger btn-small delete-btn" ${isReserved ? 'disabled title="Managed automatically"' : ''}><i class="fas fa-trash"></i> Delete</button>

            </div>

        `;



        const editBtn = item.querySelector('.edit-btn');

        const deleteBtn = item.querySelector('.delete-btn');



        editBtn.onclick = (e) => {

            e.stopPropagation();

            openEditProfileModal(id, profile);

        };



        deleteBtn.onclick = async (e) => {

            e.stopPropagation();



            const confirmed = await window.pywebview.api.confirm(`Are you sure you want to delete the installation "${profile.name}"?`);

            if (confirmed) {

                const result = await window.pywebview.api.delete_profile(id);

                if (result.success) {

                    await loadProfiles();

                    await loadOptions();

                    await loadModdableProfiles();

                } else {

                    window.pywebview.api.error(result.error || "Failed to delete installation");

                }

            }

        };



        item.onclick = () => {

            console.log("Installation selected:", id);

        };



        list.appendChild(item);

    }

}



function showSection(sectionId) {

    document.querySelectorAll('.section').forEach(section => {

        section.classList.remove('active');

    });



    document.querySelectorAll('.sidebar-button').forEach(button => {

        button.classList.remove('active');

    });



    const section = document.getElementById(sectionId);

    if (section) section.classList.add('active');



    if (event && event.target) {

        event.target.classList.add('active');

    }

}



async function resetProfileModal() {

    if (document.getElementById('profileName')) document.getElementById('profileName').value = '';



    // Reset version selects

    if (profileSoftwareSelect) profileSoftwareSelect.value = 'vanilla';

    if (profileLoaderVersionSelect) {

        profileLoaderVersionSelect.innerHTML = '<option value="">Select a loader...</option>';

        profileLoaderVersionSelect.disabled = true;

    }

    currentProfileSoftware = 'vanilla';

    await loadProfileMcVersions('vanilla');



    // Set default JVM arguments with optimized settings

    const defaultJVMArgs = '-Xmx4G -Xms1G -XX:+UnlockExperimentalVMOptions -XX:+UseG1GC -XX:G1NewSizePercent=20 -XX:G1ReservePercent=20 -XX:MaxGCPauseMillis=50 -XX:G1HeapRegionSize=32M';

    if (document.getElementById('profileJVMArgs')) document.getElementById('profileJVMArgs').value = defaultJVMArgs;



    if (document.getElementById('profileDir')) document.getElementById('profileDir').value = '';

    if (document.getElementById('profileJavaPath')) document.getElementById('profileJavaPath').value = '';



    try {

        const userData = await window.pywebview.api.get_user_json();

        if (document.getElementById('profileDir')) document.getElementById('profileDir').value = userData.mcdir || '';

    } catch (e) {

        console.error("Error fetching default directory:", e);

    }



    selectedImageData = null;



    // Cargar imagen por defecto

    try {

        const url = await window.pywebview.api.get_profile_icon('default.png');

        if (iconPreview) {

            iconPreview.src = url;

            iconPreview.style.display = 'block';

        }

        if (placeholderIcon) placeholderIcon.style.display = 'none';

    } catch (e) {

        console.error("Error loading default icon:", e);

    }



    editingProfileId = null;

    if (acceptProfileBtn) acceptProfileBtn.textContent = "Create Installation";

    if (document.querySelector('#modal h2')) document.querySelector('#modal h2').textContent = "Create New Installation";

}



async function openEditProfileModal(id, profile) {

    await resetProfileModal();

    editingProfileId = id;



    if (document.getElementById('profileName')) document.getElementById('profileName').value = profile.name;

    if (document.getElementById('profileJVMArgs')) document.getElementById('profileJVMArgs').value = profile.jvm_args || '';

    if (document.getElementById('profileDir')) document.getElementById('profileDir').value = profile.directory || '';

    if (document.getElementById('profileJavaPath')) document.getElementById('profileJavaPath').value = profile.java_path || '';



    // Parse version string into software / MC version / loader version

    const ver = profile.version || '';

    let software = 'vanilla';

    let mcVersion = ver;

    let loaderVersion = '';



    if (ver.startsWith('forge-')) {

        software = 'forge';

        const parts = ver.replace('forge-', '').split('-');

        mcVersion = parts[0] || '';

        loaderVersion = parts.slice(1).join('-');

    } else if (ver.startsWith('fabric-')) {

        software = 'fabric';

        const parts = ver.replace('fabric-', '').split('-');

        mcVersion = parts[0] || '';

        loaderVersion = parts.slice(1).join('-');

    }



    if (profileSoftwareSelect) profileSoftwareSelect.value = software;

    currentProfileSoftware = software;

    await loadProfileMcVersions(software);

    if (profileMcVersionSelect) profileMcVersionSelect.value = mcVersion;



    if (software !== 'vanilla') {

        if (profileLoaderVersionSelect) profileLoaderVersionSelect.disabled = false;

        await loadProfileLoaderVersions(software, mcVersion);

        if (profileLoaderVersionSelect) profileLoaderVersionSelect.value = loaderVersion;

    } else {

        if (profileLoaderVersionSelect) profileLoaderVersionSelect.disabled = true;

    }



    // Guardar el icono actual del perfil para edición

    selectedImageData = profile.icon;



    if (profile.icon && profile.icon !== 'default.png') {

        try {

            const url = await window.pywebview.api.get_profile_icon(profile.icon);

            if (iconPreview) {

                iconPreview.src = url;

                iconPreview.style.display = 'block';

            }

            if (placeholderIcon) placeholderIcon.style.display = 'none';

        } catch (e) {

            console.error("Error loading profile icon:", e);

        }

    }



    if (acceptProfileBtn) acceptProfileBtn.textContent = "Save Changes";

    if (document.querySelector('#modal h2')) document.querySelector('#modal h2').textContent = "Edit Installation";

    if (profileModal) profileModal.classList.add('show');

}



if (createProfileBtn) {

    createProfileBtn.addEventListener('click', async () => {

        await resetProfileModal();

        if (profileModal) profileModal.classList.add('show');

    });

}



if (cancelModalBtn) {

    cancelModalBtn.addEventListener('click', () => {

        if (profileModal) profileModal.classList.remove('show');

        resetProfileModal();

    });

}



if (acceptProfileBtn) {

    acceptProfileBtn.addEventListener('click', async () => {

        const profileNameInput = document.getElementById('profileName');

        const profileName = profileNameInput ? profileNameInput.value.trim() : "";



        if (!profileName) {

            window.pywebview.api.error("Installation name is required");

            return;

        }



        if (isReservedProfileName(profileName)) {

            window.pywebview.api.error("This name is reserved for automatic installations.");

            return;

        }



        const software = profileSoftwareSelect ? profileSoftwareSelect.value : 'vanilla';

        const mcVersion = profileMcVersionSelect ? profileMcVersionSelect.value : '';

        const loaderVersion = profileLoaderVersionSelect ? profileLoaderVersionSelect.value : '';

        const profileJVMArgs = document.getElementById('profileJVMArgs').value;

        const profileDir = document.getElementById('profileDir').value;

        const profileJavaPath = document.getElementById('profileJavaPath').value;

        const profileIcon = getSelectedIcon();



        // Build the version string

        let profileVersion = mcVersion;

        if (software === 'forge' && loaderVersion) {

            profileVersion = `forge-${mcVersion}-${loaderVersion}`;

        } else if (software === 'fabric' && loaderVersion) {

            profileVersion = `fabric-${mcVersion}-${loaderVersion}`;

        }



        // Validación

        const missingFields = [];

        const trimmedName = profileName.trim();



        if (!trimmedName) {

            missingFields.push("Installation Name");

        } else if (trimmedName.length < 2) {

            window.pywebview.api.error('Installation name must be at least 2 characters');

            return;

        }

        if (!mcVersion) missingFields.push("Minecraft Version");

        if (software !== 'vanilla' && !loaderVersion) missingFields.push("Loader Version");

        if (!profileDir.trim()) missingFields.push("Directory");



        if (missingFields.length > 0) {

            window.pywebview.api.error(`You cannot leave these fields empty:\n- ${missingFields.join('\n- ')}`);

            return;

        }



        if (editingProfileId) {

            // Edit existing profile - API expects individual arguments

            await window.pywebview.api.edit_profile(

                editingProfileId,    // profile_id

                profileName,         // name

                profileVersion,      // version

                null,                // loader (not used)

                profileIcon,         // icon

                null,                // ram_min (not used)

                null,                // ram_max (not used)

                profileJVMArgs,      // jvm_args

                null,                // width (not used)

                null,                // height (not used)

                profileJavaPath      // java_path

            );

            await loadProfiles();

            await loadOptions();

            await loadModdableProfiles();

            if (profileModal) profileModal.classList.remove('show');

            resetProfileModal();

        } else {

            // Create new profile

            try {

                // Note: add_profile in backend might still try to install if missing, 

                const result = await window.pywebview.api.add_profile(profileName, profileVersion, profileIcon, profileDir, profileJVMArgs, profileJavaPath);



                if (result.success) {

                    await loadProfiles();

                    await loadOptions();

                    await loadModdableProfiles();

                    if (profileModal) profileModal.classList.remove('show');

                    resetProfileModal();

                } else {

                    window.pywebview.api.error(result.message);

                }

            } catch (error) {

                console.error('Error creating installation:', error);

                window.pywebview.api.error('Error creating installation');

            }

        }

    });

}





// Folder selection button

if (selectFolderBtn) {

    selectFolderBtn.addEventListener('click', async () => {

        const currentDir = document.getElementById('profileDir').value;

        const selectedPath = await window.pywebview.api.select_folder(currentDir);



        if (selectedPath) {

            document.getElementById('profileDir').value = selectedPath;

        }

    });

}



// Folder selection button

if (selectMcdirBtn) {

    selectMcdirBtn.addEventListener('click', async () => {

        const currentDir = document.getElementById('mcdir').value;

        const selectedPath = await window.pywebview.api.select_folder(currentDir);



        if (selectedPath) {

            document.getElementById('mcdir').value = selectedPath;

        }

    });

}



// Open images modal when clicking the icon button

if (iconButton) {

    iconButton.addEventListener('click', async () => {

        await loadImageModal();

        if (imageModal) imageModal.classList.add('show');

    });

}



// Close images modal

if (cancelImageModalBtn) {

    cancelImageModalBtn.addEventListener('click', () => {

        if (imageModal) imageModal.classList.remove('show');

    });

}



// Java Path selection button

const selectJavaBtn = document.getElementById('selectJavaBtn');

if (selectJavaBtn) {

    selectJavaBtn.addEventListener('click', async () => {

        const currentPath = document.getElementById('profileJavaPath').value;

        const selectedPath = await window.pywebview.api.select_file(currentPath);



        if (selectedPath) {

            document.getElementById('profileJavaPath').value = selectedPath;

        }

    });

}



// ... existing code ...



// In openProfileModal function (need to find it, assuming it's structured similarly)

// I will rewrite the relevant parts of openProfileModal and save logic if I can find them.

// Since I can't see the whole file, I will append the listener logic securely.



// Wait, I need to see openProfileModal to edit it.

// I'll assume I need to look for it first.



// Load images in the modal

async function loadImageModal() {

    if (!imageGrid) return;



    // Save the upload button before clearing

    const uploadButton = imageGrid.querySelector('.upload-item');

    const uploadInput = imageGrid.querySelector('#customImageInput');



    // Clear only image items

    imageGrid.innerHTML = '';



    try {

        const images = await window.pywebview.api.get_profile_images();



        for (const imageName of images) {

            const imageUrl = await window.pywebview.api.get_profile_icon(imageName);



            const gridItem = document.createElement('div');

            gridItem.className = 'image-grid-item';

            gridItem.dataset.imageName = imageName;



            const img = document.createElement('img');

            img.src = imageUrl;

            img.alt = imageName;



            gridItem.appendChild(img);



            gridItem.addEventListener('click', () => {

                selectImageFromGrid(imageName, imageUrl);

            });



            imageGrid.appendChild(gridItem);

        }



        // Add the upload button back at the end

        if (uploadButton) {

            imageGrid.appendChild(uploadButton);

        }

        if (uploadInput) {

            imageGrid.appendChild(uploadInput);

        }

    } catch (error) {

        console.error('Error loading images:', error);

    }

}



// Select image from the grid

function selectImageFromGrid(imageName, imageUrl) {

    // Mark the selected image in the grid

    document.querySelectorAll('.image-grid-item:not(.upload-item)').forEach(item => {

        item.classList.remove('selected');

    });



    const selectedItem = document.querySelector(`[data-image-name="${imageName}"]`);

    if (selectedItem) selectedItem.classList.add('selected');



    // Update the preview in the main modal

    if (iconPreview) {

        iconPreview.src = imageUrl;

        iconPreview.style.display = 'block';

    }

    if (placeholderIcon) placeholderIcon.style.display = 'none';



    // IMPORTANT: Save the filename, not a base64 object

    selectedImageData = imageName;



    // Cerrar el modal de imagenes

    if (imageModal) imageModal.classList.remove('show');

}



// Event listener para subir imagen personalizada

if (customImageInput) {

    customImageInput.addEventListener('change', function (e) {

        const file = e.target.files[0];



        if (file && file.type.startsWith('image/')) {

            const reader = new FileReader();



            reader.onload = function (e) {

                const img = new Image();

                img.onload = function() {

                    let width = img.width;

                    let height = img.height;

                    const maxSize = 128;



                    if (width > maxSize || height > maxSize) {

                        if (width > height) {

                            height = Math.round((height * maxSize) / width);

                            width = maxSize;

                        } else {

                            width = Math.round((width * maxSize) / height);

                            height = maxSize;

                        }

                    }



                    const canvas = document.createElement('canvas');

                    canvas.width = width;

                    canvas.height = height;

                    const ctx = canvas.getContext('2d');

                    ctx.drawImage(img, 0, 0, width, height);



                    const resizedBase64 = canvas.toDataURL(file.type);



                    selectedImageData = {

                        base64: resizedBase64,

                        filename: file.name,

                        type: file.type

                    };



                    if (iconPreview) {

                        iconPreview.src = resizedBase64;

                        iconPreview.style.display = 'block';

                    }

                    if (placeholderIcon) placeholderIcon.style.display = 'none';



                    // Cerrar el modal de imagenes

                    if (imageModal) imageModal.classList.remove('show');

                };

                img.src = e.target.result;

            };



            reader.readAsDataURL(file);

        }

    });

}



function getSelectedIcon() {

    return selectedImageData;

}



// ==============================================

// LOGIN MODAL FUNCTIONALITY

// ==============================================



// Open login modal

if (loginButton) {

    loginButton.addEventListener('click', () => {

        if (loginModal) loginModal.classList.add('show');

    });

}



// Close login modal

if (closeLoginModal) {

    closeLoginModal.addEventListener('click', () => {

        if (loginModal) loginModal.classList.remove('show');

    });

}






// Tab switching functionality

modalTabs.forEach(tab => {

    tab.addEventListener('click', () => {

        const tabName = tab.getAttribute('data-tab');



        // Remove active class from all tabs and content

        modalTabs.forEach(t => t.classList.remove('active'));

        document.querySelectorAll('.tab-content').forEach(content => {

            content.classList.remove('active');

        });

    });

});





// ==============================================

// NEW LOGIN UX LOGIC

// ==============================================



// Check login state on load

async function checkLoginState() {

    try {

        const userData = await window.pywebview.api.get_user_json();

        if (userData.username && userData.username.trim()) {

            showUserBadge(userData.username);

        } else {

            showLoginButton();

        }

    } catch (error) {

        console.error('Error checking login state:', error);

        showLoginButton();

    }

}



function showUserBadge(username) {

    if (loginButton) loginButton.style.display = 'none';

    if (userBadge) {

        userBadge.style.display = 'flex';

        if (userDisplayName) userDisplayName.textContent = username;

    }

}



function showLoginButton() {

    if (loginButton) loginButton.style.display = 'flex';

    if (userBadge) userBadge.style.display = 'none';

}



// checkLoginState is now called in the main pywebviewready listener







// ==============================================

// PROFILE VERSION SELECT LOGIC

// ==============================================



async function loadProfileMcVersions(type) {

    if (!profileMcVersionSelect) return;

    profileMcVersionSelect.innerHTML = '<option value="">Loading...</option>';

    profileMcVersionSelect.disabled = true;



    try {

        let versions = [];

        if (versionCache[type]) {

            versions = versionCache[type];

        } else {

            if (type === 'vanilla') {

                versions = await window.pywebview.api.get_vanilla_versions();

            } else if (type === 'fabric') {

                versions = await window.pywebview.api.get_fabric_mc_versions();

            } else if (type === 'forge') {

                versions = await window.pywebview.api.get_forge_mc_versions();

            }

            versionCache[type] = versions;

        }



        profileMcVersionSelect.innerHTML = '';

        if (versions.length === 0) {

            profileMcVersionSelect.innerHTML = '<option value="">No versions found</option>';

        } else {

            versions.forEach(v => {

                const option = document.createElement('option');

                option.value = v;

                option.textContent = v;

                profileMcVersionSelect.appendChild(option);

            });

            // Auto-load loader versions for non-vanilla on first open

            if (type !== 'vanilla' && versions.length > 0) {

                await loadProfileLoaderVersions(type, versions[0]);

            }

        }

    } catch (err) {

        console.error(`[Profile] Error loading ${type} MC versions:`, err);

        profileMcVersionSelect.innerHTML = '<option value="">Error loading</option>';

    } finally {

        profileMcVersionSelect.disabled = false;

    }

}



async function loadProfileLoaderVersions(type, mcVersion) {

    if (!profileLoaderVersionSelect || !mcVersion) return;

    profileLoaderVersionSelect.innerHTML = '<option value="">Loading...</option>';

    profileLoaderVersionSelect.disabled = true;



    try {

        const loaders = await window.pywebview.api.get_loader_versions(type, mcVersion);

        profileLoaderVersionSelect.innerHTML = '';

        if (loaders.length === 0) {

            profileLoaderVersionSelect.innerHTML = '<option value="">No loaders available</option>';

        } else {

            loaders.forEach(l => {

                const option = document.createElement('option');

                option.value = l;

                option.textContent = l;

                profileLoaderVersionSelect.appendChild(option);

            });

        }

    } catch (err) {

        console.error(`[Profile] Error loading ${type} loaders:`, err);

        profileLoaderVersionSelect.innerHTML = '<option value="">Error loading</option>';

    } finally {

        profileLoaderVersionSelect.disabled = false;

    }

}



if (profileSoftwareSelect) {

    profileSoftwareSelect.addEventListener('change', async () => {

        const type = profileSoftwareSelect.value;

        currentProfileSoftware = type;

        if (type === 'vanilla') {

            if (profileLoaderVersionSelect) {

                profileLoaderVersionSelect.innerHTML = '<option value="">Select a loader...</option>';

                profileLoaderVersionSelect.disabled = true;

            }

        } else {

            if (profileLoaderVersionSelect) {

                profileLoaderVersionSelect.disabled = false;

                profileLoaderVersionSelect.innerHTML = '<option value="">Loading...</option>';

            }

        }

        await loadProfileMcVersions(type);

    });

}



if (profileMcVersionSelect) {

    profileMcVersionSelect.addEventListener('change', async () => {

        const type = profileSoftwareSelect ? profileSoftwareSelect.value : 'vanilla';

        if (type !== 'vanilla' && profileMcVersionSelect.value) {

            await loadProfileLoaderVersions(type, profileMcVersionSelect.value);

        }

    });

}



// Helper: keep for download-listeners.js compatibility

function closeDownloadProgress() {

    isDownloading = false;

}



// Function to update background download progress (mini floating popup only)

window.updateBackgroundDownloadProgress = function (version, MathPercentage, status, data) {

    const percentage = MathPercentage || 0;



    // Update Global Download Tracker Popup (background downloads only)

    const globalPopup = document.getElementById('globalDownloadPopup');

    if (globalPopup) {

        // Always show for background downloads

        globalPopup.classList.add('visible');



        const gdpTitle = document.getElementById('gdpTitle');

        const gdpProgressBar = document.getElementById('gdpProgressBar');

        const gdpTask = document.getElementById('gdpTask');

        const gdpPercent = document.getElementById('gdpPercent');



        if (gdpTitle) gdpTitle.textContent = `Downloading ${version}...`;

        if (gdpProgressBar) gdpProgressBar.style.width = `${percentage}%`;

        if (gdpTask) gdpTask.textContent = status || 'Downloading...';

        if (gdpPercent) gdpPercent.textContent = `${percentage}%`;

    }



    console.log(`[Background] Progress updated: ${percentage}% - ${status}`);

};



// Override global updateInstallProgress

window.updateInstallProgress = function (version, MathPercentage, status, data) {

    const percentage = MathPercentage || 0;

    // Don't route to background popup during sync — sync modal handles its own progress

    if (!window.isSyncing) {

        window.updateBackgroundDownloadProgress(version, percentage, status, data);

    }

    console.log(`[Manual] Progress updated: ${percentage}% - ${status}`);

};





// Override global onDownloadComplete

window.onDownloadComplete = async function (version) {

    console.log(`Download completed: ${version}`);

    isDownloading = false;

    closeDownloadProgress();

    setTimeout(() => {

        window.pywebview.api.info(`Version ${version} installed successfully.`);

    }, 1000);

};



window.onDownloadError = function (errorMsg) {

    console.error(`Download error: ${errorMsg}`);

    isDownloading = false;

    closeDownloadProgress();

};





// Open login modal

if (loginButton) {

    loginButton.addEventListener('click', () => {

        showLoginMethodScreen();

        if (loginModal) loginModal.classList.add('show');

    });

}



// Close login modal

if (closeLoginModal) {

    closeLoginModal.addEventListener('click', () => {

        if (loginModal) loginModal.classList.remove('show');

        showLoginMethodScreen();

    });

}







// Screen navigation

const loginHelloWorldScreen = document.getElementById('loginHelloWorldScreen');



function clearLoginFields() {

    const fields = ['hwEmail', 'hwPassword', 'nickname'];

    fields.forEach(id => {

        const el = document.getElementById(id);

        if (el) el.value = '';

    });

    const errorEl = document.getElementById('hwLoginError');

    if (errorEl) errorEl.style.display = 'none';

}



function showLoginMethodScreen() {

    clearLoginFields();

    if (loginMethodScreen) loginMethodScreen.classList.add('active');

    if (loginOfflineScreen) loginOfflineScreen.classList.remove('active');

    if (loginHelloWorldScreen) loginHelloWorldScreen.classList.remove('active');

}



function showLoginOfflineScreen() {

    if (loginMethodScreen) loginMethodScreen.classList.remove('active');

    if (loginOfflineScreen) loginOfflineScreen.classList.add('active');

    if (loginHelloWorldScreen) loginHelloWorldScreen.classList.remove('active');

}



function showLoginHelloWorldScreen() {

    if (loginMethodScreen) loginMethodScreen.classList.remove('active');

    if (loginOfflineScreen) loginOfflineScreen.classList.remove('active');

    if (loginHelloWorldScreen) loginHelloWorldScreen.classList.add('active');

}



// Edit Profile (Dashboard) redirect

const editProfileBtn = document.getElementById('editProfileBtn');

if (editProfileBtn) {

    editProfileBtn.addEventListener('click', async (e) => {

        // Check if button is disabled (unverified premium account)

        if (editProfileBtn.disabled || editProfileBtn.classList.contains('btn-disabled')) {

            e.preventDefault();

            e.stopPropagation();

            return;

        }

        const dashboardUrl = "https://abeloskyyy.github.io/HelloWorld-Launcher/?edit_profile=true";

        if (window.electronAPI && window.electronAPI.openUrl) {

            await window.electronAPI.openUrl(dashboardUrl);

        } else if (window.pywebview && window.pywebview.api && window.pywebview.api.open_url) {

            await window.pywebview.api.open_url(dashboardUrl);

        } else {

            window.open(dashboardUrl, '_blank');

        }

    });

}



// Select offline mode

if (selectOfflineBtn) {

    selectOfflineBtn.addEventListener('click', () => {

        showLoginOfflineScreen();

    });

}



// Back to method selection

if (backToMethodBtn) {

    backToMethodBtn.addEventListener('click', () => {

        showLoginMethodScreen();

    });

}



// Save offline login

if (saveOfflineBtn) {

    saveOfflineBtn.addEventListener('click', async () => {

        const nickname = document.getElementById('nickname').value.trim();

        const isValid = /^[a-zA-Z0-9_]{3,16}$/.test(nickname);

        if (isValid) {

            const mcdir = document.getElementById('mcdir') ? document.getElementById('mcdir').value : '';



            const data = await window.pywebview.api.save_user_json(nickname, mcdir, 'offline');



            await updateUserInterface(data);

            await loadSkinData();



            if (loginModal) loginModal.classList.remove('show');

            showLoginMethodScreen();

        } else {

            window.pywebview.api.error('Username must be 3-16 characters and contain only letters, numbers, and underscores.');

        }

    });

}



// HelloWorld login

const selectHelloWorldBtn = document.getElementById('selectHelloWorldBtn');

if (selectHelloWorldBtn) {

    selectHelloWorldBtn.addEventListener('click', () => {

        showLoginHelloWorldScreen();

    });

}



const hwBackBtn = document.getElementById('hwBackBtn');

if (hwBackBtn) {

    hwBackBtn.addEventListener('click', () => {

        showLoginMethodScreen();

    });

}



const hwLoginBtn = document.getElementById('hwLoginBtn');

const hwLoginError = document.getElementById('hwLoginError');



if (hwLoginBtn) {

    hwLoginBtn.addEventListener('click', async () => {

        const identifier = document.getElementById('hwEmail').value;

        const password = document.getElementById('hwPassword').value;

        

        if (!identifier || !password) {

            hwLoginError.textContent = "Please fill in both fields.";

            hwLoginError.style.display = 'block';

            return;

        }



        hwLoginError.style.display = 'none';

        hwLoginBtn.disabled = true;

        hwLoginBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';

        

        try {

            const result = await window.pywebview.api.login_helloworld(identifier, password);

            if (result.success) {

                if (loginModal) loginModal.classList.remove('show');

                showLoginMethodScreen();

                

                // Fetch updated user data and refresh UI

                const data = await window.pywebview.api.get_user_json();

                await updateUserInterface(data);

                await loadSkinData();

            } else {

                hwLoginError.textContent = result.error || "Login failed";

                hwLoginError.style.display = 'block';

            }

        } catch (e) {

            hwLoginError.textContent = "Error communicating with backend.";

            hwLoginError.style.display = 'block';

        } finally {

            hwLoginBtn.disabled = false;

            hwLoginBtn.innerHTML = 'Log In';

        }

    });

}



// Password toggle for HelloWorld screen

document.querySelectorAll('.hw-toggle-password').forEach(toggle => {

    toggle.addEventListener('click', function() {

        const input = document.getElementById(this.getAttribute('data-target'));

        if (input.type === 'password') {

            input.type = 'text';

            this.classList.remove('fa-eye');

            this.classList.add('fa-eye-slash');

        } else {

            input.type = 'password';

            this.classList.remove('fa-eye-slash');

            this.classList.add('fa-eye');

        }

    });

});



// User badge toggle (click anywhere on badge)

if (userBadge) {

    userBadge.addEventListener('click', (e) => {

        e.stopPropagation();

        userBadge.classList.toggle('active');

    });

}



// Close dropdown when clicking outside

document.addEventListener('click', (e) => {

    if (userBadge && !userBadge.contains(e.target)) {

        userBadge.classList.remove('active');

    }

});



// Logout function

window.logout = async function () {

    try {

        console.log('[Auth] Logging out...');

        const newData = await window.pywebview.api.logout_user();

        

        // Refresh EVERYTHING globaly

        await updateUserInterface(newData);

        

        // Reload profiles and versions to ensure UI is in sync

        await loadProfiles();

        await loadVersions();

        await loadOptions();

        

        // Reset skin preview to default

        if (window.renderUserHead) {

            await window.renderUserHead(null);

        }

        

        // If skins section is open, we should probably close it or refresh it

        const currentSection = document.querySelector('.section.active');

        if (currentSection && (currentSection.id === 'skins-section' || currentSection.id === 'mods-section')) {

            showSection('home');

        }



        // Clear settings inputs

        if (document.getElementById("nickname")) document.getElementById("nickname").value = "";

        

        console.log('[Auth] Logout complete and UI refreshed');



    } catch (error) {

        console.error('Error logging out:', error);

        if (window.pywebview && window.pywebview.api && window.pywebview.api.error) {

            window.pywebview.api.error('Error logging out');

        }

    }

};



if (logoutBtn) {

    logoutBtn.addEventListener('click', async () => {

        await window.logout();

    });

}



const msVerifyBannerBtn = document.getElementById('msVerifyBannerBtn');

const msVerifyBanner = document.getElementById('msVerifyBanner');

const msVerifyBannerClose = document.getElementById('msVerifyBannerClose');



function hideMsVerifyBanner(verified = false) {

    const banner = msVerifyBanner || document.getElementById('msVerifyBanner');

    if (!banner || banner.style.display === 'none') return;

    banner.classList.add('hiding');

    banner.addEventListener('transitionend', () => {

        banner.style.display = 'none';

        banner.classList.remove('hiding');

    }, { once: true });



    // Re-initialize social to refresh friends list after successful verification

    if (verified) {

        if (typeof window.initSocial === 'function') {

            window.initSocial().catch(() => {});

        }

    }

}

window.hideMsVerifyBanner = hideMsVerifyBanner;



if (msVerifyBannerBtn) {

    msVerifyBannerBtn.addEventListener('click', async () => {

        msVerifyBannerBtn.disabled = true;

        msVerifyBannerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';

        const res = await verifyWithPopup();

        if (res.success) {

            hideMsVerifyBanner(true);

        } else {

            window.pywebview.api.error('Verification failed: ' + res.error);

            msVerifyBannerBtn.disabled = false;

            msVerifyBannerBtn.innerHTML = '<i class="fas fa-shield-alt"></i> Verify now';

        }

    });

}



if (msVerifyBannerClose) {

    msVerifyBannerClose.addEventListener('click', () => hideMsVerifyBanner());

}



// Initialization is now handled in the main pywebviewready listener above (line ~172)





// ==============================================

// TOOLTIP SYSTEM

// ==============================================



// Create tooltip element

const tooltip = document.createElement('div');

tooltip.className = 'tooltip';

document.body.appendChild(tooltip);



let tooltipTimeout = null;

let currentTooltipElement = null;



// Function to show tooltip

function showTooltip(element, text, x, y) {

    tooltip.textContent = text;

    tooltip.classList.add('show');

    tooltip.classList.remove('bottom'); // Reset class



    // Position tooltip

    const tooltipRect = tooltip.getBoundingClientRect();

    const padding = 10;



    // Calculate position (above the element by default)

    let left = x - (tooltipRect.width / 2);

    let top = y - tooltipRect.height - padding;



    // Adjust if tooltip goes off screen horizontally

    if (left < padding) left = padding;

    if (left + tooltipRect.width > window.innerWidth - padding) {

        left = window.innerWidth - tooltipRect.width - padding;

    }



    // Check if it fits above, if not, put it below

    if (top < padding) {

        // Show below if no space above

        // Use element's bottom position for better accuracy if possible, 

        // passing element rect or y as bottom would be better, but using y + padding as a heuristic for now 

        // based on existing call sites (x=center, y=top). 

        // Wait, call sites pass y=rect.top. So y is top.

        // If we want below, we need rect.bottom. 

        // Let's recalculate based on element to be safe since we have it.



        const rect = element.getBoundingClientRect();

        top = rect.bottom + padding;



        tooltip.classList.add('bottom');

    }



    tooltip.style.left = left + 'px';

    tooltip.style.top = top + 'px';

}



// Function to hide tooltip

function hideTooltip() {

    tooltip.classList.remove('show');

    currentTooltipElement = null;

}



// Add event listeners to all elements with data-tooltip

function initializeTooltips() {

    const tooltipElements = document.querySelectorAll('[data-tooltip]');



    tooltipElements.forEach(element => {

        if (element.dataset.tooltipInitialized) return;

        element.dataset.tooltipInitialized = 'true';



        // Mouse enter - start timer

        element.addEventListener('mouseenter', (e) => {

            const tooltipText = element.getAttribute('data-tooltip');

            if (!tooltipText) return;



            currentTooltipElement = element;

            const rect = element.getBoundingClientRect();

            const x = rect.left + (rect.width / 2);

            const y = rect.top;



            // Show tooltip after 0.5 seconds

            tooltipTimeout = setTimeout(() => {

                if (currentTooltipElement === element) {

                    showTooltip(element, tooltipText, x, y);

                }

            }, 500);

        });



        // Mouse leave - cancel timer and hide

        element.addEventListener('mouseleave', () => {

            if (tooltipTimeout) {

                clearTimeout(tooltipTimeout);

                tooltipTimeout = null;

            }

            if (currentTooltipElement === element) {

                hideTooltip();

            }

        });



        // Click - show immediately (toggle for help icons)

        element.addEventListener('click', (e) => {

            const tooltipText = element.getAttribute('data-tooltip');

            if (!tooltipText) return;



            // Only for help icons

            if (element.classList.contains('help-icon')) {

                e.stopPropagation(); // Stop event bubbling

                e.preventDefault();  // Prevent default action (like label checkbox toggling)



                // If already showing THIS tooltip, hide it

                if (currentTooltipElement === element && tooltipTimeout === 'manual') {

                    hideTooltip();

                    return;

                }



                // Hide potential existing tooltip

                hideTooltip();



                const rect = element.getBoundingClientRect();

                const x = rect.left + (rect.width / 2);

                const y = rect.top;



                showTooltip(element, tooltipText, x, y);

                currentTooltipElement = element;



                // Mark as manually opened so mouseleave doesn't auto-hide immediately if unintended

                if (tooltipTimeout) clearTimeout(tooltipTimeout);

                tooltipTimeout = 'manual';

            }

        });

    });

}







// Hide tooltip on scroll

window.addEventListener('scroll', hideTooltip, true);



// Initialize tooltips when DOM is ready

if (document.readyState === 'loading') {

    document.addEventListener('DOMContentLoaded', initializeTooltips);

} else {

    initializeTooltips();

}



// Re-initialize tooltips when new content is added (for dynamic content)

const observer = new MutationObserver(() => {

    initializeTooltips();

});



observer.observe(document.body, {

    childList: true,

    subtree: true

});



// ==============================================

// MODS SECTION FUNCTIONALITY

// ==============================================



// Global variables for mods/content

let currentModsProfile = null;

let currentModTab = 'download';

let searchTimeout = null;

let installedAddonsInterval = null;

let currentContentType = 'mod'; // 'mod', 'resourcepack', 'datapack', 'shader'



// Elements

const modsSectionTitle = document.querySelector('#mods h1');

const worldSelectorContainer = document.getElementById('worldSelectorContainer');

const worldSelect = document.getElementById('worldSelect');

const modsProfileSelect = document.getElementById('modsProfileSelect');

const noModdableProfiles = document.getElementById('noModdableProfiles');

const modsTabsContainer = document.getElementById('modsTabsContainer');

const modTabs = document.querySelectorAll('.mod-tab');

const modSearchInput = document.getElementById('modSearchInput');

const modSearchBtn = document.getElementById('modSearchBtn');

const modSearchResults = document.getElementById('modSearchResults');

const modSearchLoading = document.getElementById('modSearchLoading');

const installedModsList = document.getElementById('installedModsList');



// Toggle Sidebar Menu

function toggleModsMenu() {

    const submenu = document.getElementById('modsSubmenu');

    const arrow = document.getElementById('modsMenuArrow');

    const isVisible = submenu.style.display !== 'none';



    submenu.style.display = isVisible ? 'none' : 'block';

    arrow.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(180deg)';

}



// Show Section Override for Content Types

const originalShowSection = window.showSection || function () { };

window.showSection = function (sectionId, contentType = null) {

    // Hide all sections logic (assumed exists in global scope or we reimplement basic toggle)

    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));

    document.querySelectorAll('.sidebar-button').forEach(b => b.classList.remove('active'));



    // Activate section

    const target = document.getElementById(sectionId);

    if (target) target.classList.add('active');



    // Clear installed addons refresh interval when leaving mods section

    if (sectionId !== 'mods' && installedAddonsInterval) {

        clearInterval(installedAddonsInterval);

        installedAddonsInterval = null;

    }



    // Sidebar active state

    if (sectionId === 'mods') {

        const submenuItem = document.querySelector(`.submenu-item[onclick*="'${contentType}'"]`);

        if (submenuItem) submenuItem.classList.add('active');

        document.getElementById('modsMenuBtn').classList.add('active');

        document.getElementById('modsSubmenu').style.display = 'block'; // Ensure open

    } else {

        // Activate standard buttons

        const btn = document.querySelector(`.sidebar-button[onclick="showSection('${sectionId}')"]`);

        if (btn) btn.classList.add('active');

    }



    // Specific logic

    if (sectionId === 'mods' && contentType) {

        currentContentType = contentType;

        updateModsSectionUI();

        loadModdableProfiles(); // Reload/Refilter profiles

    }

}



function updateModsSectionUI() {

    const titles = {

        'mod': 'Mods',

        'resourcepack': 'Resource Packs',

        'datapack': 'Data Packs',

        'shader': 'Shaders'

    };

    if (modsSectionTitle) modsSectionTitle.textContent = titles[currentContentType];



    // Reset specific UI elements

    if (worldSelectorContainer) worldSelectorContainer.style.display = 'none';

    if (noModdableProfiles) noModdableProfiles.style.display = 'none';

    updateUploadButtonState();



    // Update profile tooltip per addon type

    const profileHelpIcon = document.querySelector('#mods .input-group .help-icon');

    if (profileHelpIcon) {

        const tooltips = {

            'mod': 'Select an installation with Forge or Fabric to manage mods',

            'resourcepack': 'Select an installation to manage resource packs',

            'datapack': 'Select an installation and a world to manage data packs',

            'shader': 'Select an installation with shader support. Forge: requires Optifine. Fabric: requires Sodium + Iris'

        };

        profileHelpIcon.setAttribute('data-tooltip', tooltips[currentContentType] || tooltips['mod']);

    }



    // Initial empty search instead of 'Search mods to download'

    if (modSearchInput) {

        modSearchInput.value = '';

        modSearchInput.placeholder = `Search ${titles[currentContentType]} in Modrinth...`;

    }

    document.getElementById('modSearchResults').style.display = 'grid';

    document.getElementById('modSearchResults').innerHTML = `

        <div class="mod-search-empty">

            <span class="filter-loading">Loading top ${titles[currentContentType]}...</span>

        </div>

    `;



    // Logic specific to type

    const modsContainer = document.getElementById('mods');

    if (currentContentType === 'datapack') {

        if (worldSelectorContainer) worldSelectorContainer.style.display = 'block';

        if (modsContainer) modsContainer.classList.add('is-datapack');

    } else {

        if (modsContainer) modsContainer.classList.remove('is-datapack');

    }

}



// Load profiles logic updated

async function loadModdableProfiles() {

    if (!modsProfileSelect) return;

    const seq = ++loadModdableProfilesSeq;



    try {

        // Use new backend method with strict filtering

        const data = await window.pywebview.api.get_profiles_for_addon(currentContentType);

        if (seq !== loadModdableProfilesSeq) return; // Abort if a newer call started

        const targetProfiles = data.profiles || {};



        modsProfileSelect.innerHTML = '';



        // Reset world select

        if (worldSelect) {

            worldSelect.innerHTML = '<option value="">Select a world...</option>';

            worldSelect.disabled = true;

        }



        // Load Categories when Moddable Profiles are loaded (Section activation)

        loadModCategories();





        if (Object.keys(targetProfiles).length === 0) {

            modsProfileSelect.innerHTML = '<option value="">No compatible installations found</option>';

            modsProfileSelect.disabled = true;

            if (noModdableProfiles) {

                noModdableProfiles.style.display = 'block';



                let msg = "";

                if (currentContentType === 'mod') msg = "No installations with Forge or Fabric found.";

                else if (currentContentType === 'shader') msg = "No installations with Shaders support found. (Requires Forge with Optifine OR Fabric with Iris+Sodium installed).";

                else msg = "No installations found.";



                document.getElementById('noModdableMessage').textContent = msg;

            }

            if (modsTabsContainer) modsTabsContainer.style.display = 'none';

            updateUploadButtonState();

            return;

        }



        modsProfileSelect.disabled = false;

        if (noModdableProfiles) noModdableProfiles.style.display = 'none';

        if (modsTabsContainer) modsTabsContainer.style.display = 'block';



        for (const [id, profile] of Object.entries(targetProfiles)) {

            const option = document.createElement('option');

            option.value = id;



            let label = profile.name;

            const typeLabel = (profile.type === 'forge' || (profile.version && profile.version.includes('forge'))) ? 'FORGE' :

                (profile.type === 'fabric' || (profile.version && profile.version.includes('fabric'))) ? 'FABRIC' : 'VANILLA';

            option.textContent = `${label} (${typeLabel} - ${profile.version})`;



            // Tooltip via title (native)

            if (currentContentType === 'shader') {

                if (typeLabel === 'FORGE' || typeLabel === 'FABRIC') {

                    option.title = "Installation ready for shaders";

                }

            }



            modsProfileSelect.appendChild(option);

        }



        // Select first and trigger load

        if (modsProfileSelect.options.length > 0) {

            modsProfileSelect.selectedIndex = 0;

            currentModsProfile = modsProfileSelect.value;

            await onProfileSelected();

            updateUploadButtonState();

        }

    } catch (error) {

        console.error('Error loading profiles:', error);

    }

}



async function onProfileSelected() {

    currentModsProfile = modsProfileSelect.value;



    // Trigger fresh search for new profile context (keeps results visible)

    searchMods(1);



    // If Datapack, load worlds

    if (currentContentType === 'datapack') {

        await loadWorlds(currentModsProfile);

    }



    await loadInstalledAddons();

    updateUploadButtonState();

}



// Renamed from loadInstalledMods

async function loadInstalledAddons() {

    if (!installedModsList) return;

    const seq = ++loadAddonsSeq;



    // Show loading

    installedModsList.innerHTML = '<div style="text-align:center; padding: 20px;"><div class="spinner"></div></div>';



    let worldName = null;

    if (currentContentType === 'datapack') {

        if (!worldSelect || !worldSelect.value) {

            installedModsList.innerHTML = `

                <div class="no-mods-message">

                    <i class="fas fa-globe"></i>

                    <p>Select a world to view Data Packs</p>

                </div>`;

            return;

        }

        worldName = worldSelect.value;

    }



    try {

        // Backend call (updated to get_installed_addons)

        const result = await window.pywebview.api.get_installed_addons(currentModsProfile, currentContentType, worldName);

        if (seq !== loadAddonsSeq) return; // Abort if a newer call started



        installedModsList.innerHTML = '';



        if (!result.success || result.mods.length === 0) {

            installedModsList.innerHTML = `

                <div class="no-mods-message">

                    <i class="fas fa-box-open"></i>

                    <p>No ${currentContentType}s installed</p>

                </div>`;

            return;

        }



        result.mods.forEach(mod => {

            const item = createInstalledItem(mod);

            installedModsList.appendChild(item);

        });



    } catch (error) {

        console.error('Error loading installed addons:', error);

        installedModsList.innerHTML = '<p style="color:red; text-align:center;">Error loading items</p>';

    }

}



// --- Local Addon Management ---

async function openAddonsFolder() {

    if (!currentModsProfile) return;

    try {

        await window.pywebview.api.open_addons_folder(currentModsProfile, currentContentType, worldSelect?.value);

    } catch (error) {

        console.error('Error opening addons folder:', error);

    }

}



// Enable/disable action buttons based on profile + world selection

function updateUploadButtonState() {

    const btnUpload = document.getElementById('btnImportLocalAddon');

    const btnFolder = document.getElementById('btnOpenAddonsFolder');



    let enabled = !!currentModsProfile;

    if (enabled && currentContentType === 'datapack') {

        enabled = !!(worldSelect && worldSelect.value);

    }

    if (btnUpload) btnUpload.disabled = !enabled;

    if (btnFolder) btnFolder.disabled = !enabled;

}



async function importLocalAddonFile() {

    if (!currentModsProfile) {

        window.pywebview.api.error("Please select an installation first.");

        return;

    }



    if (currentContentType === 'datapack' && (!worldSelect || !worldSelect.value)) {

        window.pywebview.api.error("Please select a world first.");

        return;

    }



    try {

        const result = await window.pywebview.api.import_addon_file(currentModsProfile, currentContentType, worldSelect?.value);

        if (result.success) {

            window.pywebview.api.info("Addon imported successfully!");

            await loadInstalledAddons(); // Refresh list

        } else if (result.error) {

            window.pywebview.api.error("Import failed: " + result.error);

        }

    } catch (error) {

        console.error('Error importing addon:', error);

    }

}



const modrinthDetailsCache = {};



// Create Item Element

function createInstalledItem(itemData) {

    const div = document.createElement('div');

    // Use classes defined in CSS (.mod-list-item, etc)

    div.className = 'mod-list-item';

    div.dataset.filename = itemData.filename;

    if (!itemData.enabled) div.classList.add('disabled');

    if (itemData.missing) div.classList.add('missing-file');



    // Icon (generic or specific)

    let iconClass = 'fas fa-cube';

    if (currentContentType === 'resourcepack') iconClass = 'fas fa-palette';

    else if (currentContentType === 'shader') iconClass = 'fas fa-sun';

    else if (currentContentType === 'datapack') iconClass = 'fas fa-code';

    if (itemData.missing) iconClass = 'fas fa-exclamation-triangle';



    // Type label

    const typeLabel = itemData.type === 'folder' ? 'Folder' : 'File';

    

    // Size or missing indicator

    const sizeDisplay = itemData.missing ? 'Missing file' : `${itemData.size_mb} MB`;

    

    // Disable actions for missing files

    const actionsDisabled = itemData.missing ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : '';

    const toggleDisabled = itemData.missing ? 'disabled' : '';



    div.innerHTML = `

        <div class="mod-list-icon">

            <i class="${iconClass}"></i>

        </div>

        <div class="mod-list-info">

            <div class="mod-list-name">${itemData.display_name}</div>

            <div class="mod-list-details">${sizeDisplay} • ${itemData.enabled ? 'Enabled' : 'Disabled'} • ${typeLabel}</div>

        </div>

        <div class="mod-list-actions">

            <!-- Delete -->

            <button class="mod-delete-btn" ${actionsDisabled} onclick="deleteAddon('${itemData.filename}')"><i class="fas fa-trash"></i> Delete</button>

            <!-- Toggle -->

            <div class="mod-toggle ${itemData.enabled ? 'active' : ''}" ${toggleDisabled} onclick="window.toggleAddon('${itemData.filename}', ${!itemData.enabled})">

                <div class="mod-toggle-slider"></div>

            </div>

        </div>

    `;



    // Fetch and display Modrinth rich data if project_id exists

    if (itemData.project_id) {

      const iconContainer = div.querySelector('.mod-list-icon');

      const nameContainer = div.querySelector('.mod-list-name');



      // Show spinner while fetching

      iconContainer.innerHTML = `<div class="spinner" style="width: 24px; height: 24px; border-width: 2px;"></div>`;

      nameContainer.innerHTML = `<span style="color: #888;">Loading ${itemData.display_name}...</span>`;



      const loadRichData = async () => {

        let details = modrinthDetailsCache[itemData.project_id];

        if (!details) {

          try {

            const result = await window.pywebview.api.get_mod_details(itemData.project_id);

            if (result.success && result.details) {

              details = result.details;

              modrinthDetailsCache[itemData.project_id] = details;

            }

          } catch (e) {

            console.error("Failed fetching addon details", e);

          }

        }



        if (details) {

          iconContainer.innerHTML = details.icon_url 

            ? `<img src="${details.icon_url}" style="width: 100%; height: 100%; border-radius: 8px; object-fit: cover;">` 

            : `<i class="${iconClass}"></i>`;

          nameContainer.textContent = details.title || itemData.display_name;

          nameContainer.title = details.description || '';

        } else {

          // Fallback on error

          iconContainer.innerHTML = `<i class="${iconClass}"></i>`;

          nameContainer.textContent = itemData.display_name;

        }

      };



      loadRichData();

    }



    return div;

}



window.deleteAddon = async function (filename) {

    if (!currentModsProfile) return;

    // Use Python API confirm dialog

    const confirmed = await window.pywebview.api.confirm(`Are you sure you want to delete ${filename}?`);

    if (!confirmed) return;



    let worldName = null;

    if (currentContentType === 'datapack') worldName = worldSelect.value;



    try {

        const res = await window.pywebview.api.delete_addon(filename, currentModsProfile, currentContentType, worldName);

        if (res.success) {

            await loadInstalledAddons();

        } else {

            console.error("Delete failed:", res.error);

            window.pywebview.api.error("Failed to delete: " + (res.error || 'Unknown error'));

        }

    } catch (e) {

        console.error("Error deleting addon:", e);

    }

};



window.toggleAddon = async function (filename, enabled) {

    // If clicked from div onclick, enabled param is the NEW state

    if (!currentModsProfile) return;



    let worldName = null;

    if (currentContentType === 'datapack') worldName = worldSelect.value;



    try {

        const res = await window.pywebview.api.toggle_mod(currentModsProfile, currentContentType, filename, enabled, worldName);

        if (res.success) {

            await loadInstalledAddons();

        } else {

            window.pywebview.api.error('Error toggling addon: ' + (res.error || 'Unknown error'));

        }

    } catch (error) {

        console.error('Error toggling addon:', error);

    }

};



async function loadWorlds(profileId) {

    if (!worldSelect) return;

    worldSelect.innerHTML = '<option value="">Loading...</option>';

    worldSelect.disabled = true;



    try {

        const result = await window.pywebview.api.get_worlds(profileId);

        worldSelect.innerHTML = '<option value="">Select a world...</option>';



        if (result.success && result.worlds.length > 0) {

            worldSelect.disabled = false;

            result.worlds.forEach(w => {

                const opt = document.createElement('option');

                opt.value = w.name; // Folder name

                opt.textContent = w.name;

                worldSelect.appendChild(opt);

            });

        } else {

            const opt = document.createElement('option');

            opt.textContent = "No worlds found";

            worldSelect.appendChild(opt);

        }

    } catch (e) {

        console.error("Error loading worlds", e);

        worldSelect.innerHTML = '<option value="">Error loading worlds</option>';

    }

}



// Profile change handler

if (modsProfileSelect) {

    modsProfileSelect.addEventListener('change', async () => {

        await onProfileSelected();

    });

}



// Tab switching

modTabs.forEach(tab => {

    tab.addEventListener('click', () => {

        const tabName = tab.dataset.tab;

        switchModTab(tabName);

    });

});



function switchModTab(tabName) {

    currentModTab = tabName;



    // Update tab buttons

    modTabs.forEach(tab => {

        if (tab.dataset.tab === tabName) {

            tab.classList.add('active');

        } else {

            tab.classList.remove('active');

        }

    });



    // Update tab content

    document.querySelectorAll('.mod-tab-content').forEach(content => {

        content.classList.remove('active');

    });



    const activeContent = document.getElementById(`modTab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);

    if (activeContent) {

        activeContent.classList.add('active');

    }



    // Clear any existing refresh interval

    if (installedAddonsInterval) {

        clearInterval(installedAddonsInterval);

        installedAddonsInterval = null;

    }



    // Load content if needed and start auto-refresh for installed tab

    if (tabName === 'installed') {

        loadInstalledAddons();

        installedAddonsInterval = setInterval(() => {

            if (currentModTab === 'installed') {

                loadInstalledAddons();

            }

        }, 5000);

    }

}



// --- Filter state ---

let activeCategoryFilters = {}; // 'category_name': 'include' | 'exclude'



async function loadModCategories() {

    const container = document.getElementById('modCategoriesContainer');

    if (!container) return;



    // Only load if not loaded or if we need a fresh state

    container.innerHTML = '<span class="filter-loading">Loading categories...</span>';

    activeCategoryFilters = {}; // Reset filters on reload



    try {

        const result = await window.pywebview.api.get_mod_categories();

        container.innerHTML = ''; // Clear loading



        if (!result || !result.success) {

            container.innerHTML = '<span class="filter-loading">Failed to load categories</span>';

            return;

        }



        // Filter and sort categories

        // Typical project types to match currentContentType

        let categoryTypeFilter = currentContentType;

        if (currentContentType === 'mod' || currentContentType === 'datapack') categoryTypeFilter = 'mod';

        else if (currentContentType === 'resourcepack') categoryTypeFilter = 'resourcepack';

        else if (currentContentType === 'shader') categoryTypeFilter = 'shader';



        let relevantCategories = result.categories.filter(c => c.project_type === categoryTypeFilter);



        // Sort alphabetically

        relevantCategories.sort((a, b) => a.name.localeCompare(b.name));



        if (!relevantCategories || relevantCategories.length === 0) {

            console.log("No categories found for this project type");

            container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 10px; color: #888;">No categories available for this type</div>';



            // CRITICAL: Even if no categories, we MUST trigger the initial search

            searchMods(1);

            return;

        }



        // Create the two-column grid container

        const gridContainer = document.createElement('div');

        gridContainer.className = 'categories-list collapsed';

        gridContainer.id = 'categoriesGrid';



        relevantCategories.forEach(cat => {

            const row = document.createElement('div');

            row.className = 'category-row';

            row.id = `cat-row-${cat.name}`;



            const nameSpan = document.createElement('span');

            nameSpan.className = 'category-name';

            nameSpan.textContent = cat.name;



            const btnGroup = document.createElement('div');

            btnGroup.className = 'category-btn-group';



            // Include Button

            const btnInclude = document.createElement('button');

            btnInclude.className = 'category-btn cat-btn-include';

            btnInclude.innerHTML = '<i class="fas fa-check"></i>';

            btnInclude.title = 'Include';

            btnInclude.onclick = () => toggleCategoryFilter(cat.name, 'include', row, btnInclude, btnExclude);



            // Exclude Button

            const btnExclude = document.createElement('button');

            btnExclude.className = 'category-btn cat-btn-exclude';

            btnExclude.innerHTML = '<i class="fas fa-times"></i>';

            btnExclude.title = 'Exclude';

            btnExclude.onclick = () => toggleCategoryFilter(cat.name, 'exclude', row, btnInclude, btnExclude);



            btnGroup.appendChild(btnInclude);

            btnGroup.appendChild(btnExclude);



            row.appendChild(nameSpan);

            row.appendChild(btnGroup);



            gridContainer.appendChild(row);

        });



        container.appendChild(gridContainer);



        // Add expand/collapse toggle if there are many categories

        if (relevantCategories.length > 5) {

            const toggleBtn = document.createElement('div');

            toggleBtn.className = 'categories-expand-toggle';

            toggleBtn.innerHTML = `

                <div class="toggle-line"></div>

                <span class="toggle-text">Show More</span>

                <i class="fas fa-chevron-down" style="font-size: 10px; color: #888; transition: transform 0.3s;"></i>

                <div class="toggle-line"></div>

            `;



            toggleBtn.addEventListener('click', () => {

                const isCollapsed = gridContainer.classList.contains('collapsed');

                if (isCollapsed) {

                    gridContainer.classList.remove('collapsed');

                    gridContainer.classList.add('expanded');

                    toggleBtn.querySelector('.toggle-text').textContent = 'Show Less';

                    toggleBtn.querySelector('.fa-chevron-down').style.transform = 'rotate(180deg)';

                } else {

                    gridContainer.classList.remove('expanded');

                    gridContainer.classList.add('collapsed');

                    toggleBtn.querySelector('.toggle-text').textContent = 'Show More';

                    toggleBtn.querySelector('.fa-chevron-down').style.transform = 'rotate(0deg)';

                }

            });



            container.appendChild(toggleBtn);

        }



        // Trigger initial default search

        searchMods(1);



    } catch (e) {

        console.error("Error loading mod categories", e);

        container.innerHTML = '<span class="filter-loading">Error loading categories</span>';



        // Trigger initial default search even if categories fail

        searchMods(1);

    }

}



function toggleCategoryFilter(catName, type, rowElement, includeBtn, excludeBtn) {

    // Current state check

    const currentState = activeCategoryFilters[catName];



    // Reset UI

    rowElement.classList.remove('row-include', 'row-exclude');

    includeBtn.classList.remove('active');

    excludeBtn.classList.remove('active');



    if (currentState === type) {

        // Toggle OFF (reset to neutral)

        delete activeCategoryFilters[catName];

    } else {

        // Toggle ON

        activeCategoryFilters[catName] = type;

        if (type === 'include') {

            rowElement.classList.add('row-include');

            includeBtn.classList.add('active');

        } else {

            rowElement.classList.add('row-exclude');

            excludeBtn.classList.add('active');

        }

    }

}



// Apply Filters Button Listener

const applyFiltersBtn = document.getElementById('applyFiltersBtn');

if (applyFiltersBtn) {

    applyFiltersBtn.addEventListener('click', () => {

        // Trigger search with current filters from page 1

        searchMods(1);

    });

}



// Search mods - automatic on input

if (modSearchInput) {

    // Profile change handler (Installed Mods)

    // Note: Handled by modsProfileSelect change event calling onProfileSelected -> loadInstalledAddons



    // Load Installed Mods (Old function, alias to new one if called elsewhere)

    // But we replaced call sites.

    async function loadInstalledMods() {

        await loadInstalledAddons();

    }



    // World select change

    if (worldSelect) {

        worldSelect.addEventListener('change', () => {

            loadInstalledAddons(); // Reload list for new world

            updateUploadButtonState();

        });

    }



    // Debounced search on input

    modSearchInput.addEventListener('input', () => {

        clearTimeout(searchTimeout);



        const query = modSearchInput.value.trim();



        // Always search, even if empty, to show top defaults

        if (query.length >= 0) {

            searchTimeout = setTimeout(() => {

                modSearchResults.style.display = 'grid';

                searchMods(1);

            }, 500);

        }

    });

}



let currentModPage = 1;



async function searchMods(page = 1) {

    currentModPage = page;

    const query = modSearchInput.value.trim();



    // Show loading

    modSearchLoading.style.display = 'block';

    document.getElementById('modDetailTitle').textContent = 'Loading...';

    modSearchResults.innerHTML = '';



    // Get Sort Options

    const sortSelect = document.getElementById('modSortSelect');

    const sortIndex = sortSelect ? sortSelect.value : 'relevance';



    // Prepare filter arrays

    const includedCats = [];

    const excludedCats = [];

    Object.keys(activeCategoryFilters).forEach(cat => {

        if (activeCategoryFilters[cat] === 'include') includedCats.push(cat);

        if (activeCategoryFilters[cat] === 'exclude') excludedCats.push(cat);

    });



    try {

        const queryOptions = {

            projectType: currentContentType,

            index: sortIndex,

            filters: {

                categories: includedCats.length > 0 ? includedCats : undefined,

                excludeCategories: excludedCats.length > 0 ? excludedCats : undefined

            },

            offset: (currentModPage - 1) * 20

        };



        // Pass structured options

        const result = await window.pywebview.api.search_modrinth_mods(query, queryOptions, currentContentType);



        modSearchLoading.style.display = 'none';



        if (!result.success) {

            modSearchResults.style.display = 'flex';

            modSearchResults.style.justifyContent = 'center';

            modSearchResults.style.alignItems = 'center';

            modSearchResults.innerHTML = `

                <div class="mod-search-empty">

                    <i class="fas fa-exclamation-triangle"></i>

                    <p>Error searching mods: ${result.error}</p>

                </div>

            `;

            return;

        }



        if (result.results.length === 0) {

            modSearchResults.style.display = 'flex';

            modSearchResults.style.justifyContent = 'center';

            modSearchResults.style.alignItems = 'center';

            modSearchResults.innerHTML = `

                <div class="mod-search-empty">

                    <i class="fas fa-search"></i>

                    <p>No mods found for "${query}"</p>

                </div>

            `;

            return;

        }



        // Display results

        modSearchResults.innerHTML = '';

        result.results.forEach(mod => {

            const card = createModCard(mod);

            modSearchResults.appendChild(card);

        });



        // Update Pagination UI

        const paginationContainer = document.getElementById('modSearchPagination');

        const btnPrev = document.getElementById('btnPrevPage');

        const btnNext = document.getElementById('btnNextPage');

        const pageIndicator = document.getElementById('pageIndicator');



        if (paginationContainer) {

            paginationContainer.style.display = 'flex';

            pageIndicator.textContent = currentModPage;



            btnPrev.disabled = currentModPage === 1;

            // Modrinth returns offset and limit usually, let's just check length for now

            btnNext.disabled = result.results.length < 20;



            // Setup listeners only once (remove old ones if necessary by replacing clone)

            const newBtnPrev = btnPrev.cloneNode(true);

            const newBtnNext = btnNext.cloneNode(true);

            btnPrev.parentNode.replaceChild(newBtnPrev, btnPrev);

            btnNext.parentNode.replaceChild(newBtnNext, btnNext);



            newBtnPrev.addEventListener('click', () => {

                if (currentModPage > 1) searchMods(currentModPage - 1);

            });

            newBtnNext.addEventListener('click', () => {

                searchMods(currentModPage + 1);

            });

        }

    } catch (error) {

        console.error('Error searching mods:', error);

        modSearchLoading.style.display = 'none';

        modSearchResults.style.display = 'flex';

        modSearchResults.style.justifyContent = 'center';

        modSearchResults.style.alignItems = 'center';

        modSearchResults.innerHTML = `

            <div class="mod-search-empty">

                <i class="fas fa-exclamation-triangle"></i>

                <p>Error searching mods</p>

            </div>

        `;

    }

}



function createModCard(mod) {

    const card = document.createElement('div');

    card.className = 'mod-card';



    const iconHtml = mod.icon_url

        ? `<img src="${mod.icon_url}" alt="${mod.title}" class="mod-card-icon">`

        : `<div class="mod-card-icon placeholder"><i class="fas fa-cube"></i></div>`;



    const downloadsFormatted = mod.downloads >= 1000000

        ? (mod.downloads / 1000000).toFixed(1) + 'M'

        : mod.downloads >= 1000

            ? (mod.downloads / 1000).toFixed(1) + 'K'

            : mod.downloads;



    const categories = mod.categories.slice(0, 3).map(cat =>

        `<span class="mod-category-badge">${cat}</span>`

    ).join('');



    card.onclick = () => openModDetails(mod.project_id);

    // Use project_id because Modrinth search returns project_id, not id

    const modId = mod.project_id;



    card.innerHTML = `

        <div class="mod-card-header">

            ${iconHtml}

            <div class="mod-card-info">

                <div class="mod-card-title">${mod.title}</div>

                <div class="mod-card-author">by ${mod.author}</div>

            </div>

        </div>

        <div class="mod-card-description">${mod.description || 'No description'}</div>

        <div class="mod-card-stats">

            <div class="mod-card-stat">

                <i class="fas fa-download"></i>

                <span>${downloadsFormatted}</span>

            </div>

        </div>

        <div class="mod-card-categories">

            ${categories}

        </div>

        <div class="mod-card-actions">

            <button id="btn-mod-${modId}" class="btn-primary" onclick="event.stopPropagation(); downloadModFromCard('${modId}', '${mod.slug}')">

                <i class="fas fa-download"></i> Download

            </button>

        </div>

    `;



    return card;

}



// Mod Details Modal Logic

window.openModDetails = async function (projectId) {

    const modal = document.getElementById('modDetailsModal');

    if (!modal) return;



    // Reset content

    document.getElementById('modDetailTitle').textContent = 'Loading...';

    document.getElementById('modDetailAuthor').textContent = '';

    document.getElementById('modDetailDescription').innerHTML = '<div style="text-align: center; padding: 50px;"><span class="spinner"></span></div>';

    document.getElementById('modDetailIcon').src = '';

    document.getElementById('modDetailIcon').style.display = 'none';

    document.getElementById('modDetailGallery').innerHTML = '';

    document.getElementById('modDetailCategories').innerHTML = '';



    modal.classList.add('show');



    try {

        // First set preliminary data if we have it from the search results? 

        // We could pass the whole mod object to openModDetails but for now let's just fetch full details.



        const result = await window.pywebview.api.get_mod_details(projectId);



        if (!result.success) {

            document.getElementById('modDetailDescription').innerHTML = `<p style="color: red;">Error: ${result.error}</p>`;

            return;

        }



        const details = result.details;



        // Update UI

        document.getElementById('modDetailTitle').textContent = details.title;

        // document.getElementById('modDetailAuthor').textContent = `por ${details.author}`; // Author often unknown via this endpoint

        document.getElementById('modDetailAuthor').style.display = 'none'; // Hide if unknown



        if (details.icon_url) {

            document.getElementById('modDetailIcon').src = details.icon_url;

            document.getElementById('modDetailIcon').style.display = 'block';

        }



        // Render Markdown

        if (details.body && window.marked) {

            document.getElementById('modDetailDescription').innerHTML = marked.parse(details.body);

        } else {

            document.getElementById('modDetailDescription').textContent = details.description || 'No description';

        }



        // Stats

        document.getElementById('modDetailDownloads').textContent = details.downloads.toLocaleString();



        // Helper date format

        const date = new Date(details.updated);

        document.getElementById('modDetailUpdated').textContent = date.toLocaleDateString();



        let licenseText = 'Unknown';

        if (details.license) {

            if (typeof details.license === 'string') licenseText = details.license;

            else if (details.license.name) licenseText = details.license.name;

            else if (details.license.id) licenseText = details.license.id;

        }

        document.getElementById('modDetailLicense').textContent = licenseText;



        // Categories

        const catsHtml = details.categories.map(cat =>

            `<span class="mod-category-badge">${cat}</span>`

        ).join('');

        document.getElementById('modDetailCategories').innerHTML = catsHtml;



        // Gallery

        const galleryContainer = document.getElementById('modDetailGallery');

        if (details.gallery && details.gallery.length > 0) {

            details.gallery.forEach(img => {

                const imgEl = document.createElement('img');

                imgEl.src = img.url;

                imgEl.className = 'gallery-image';

                imgEl.onclick = () => window.open(img.url, '_blank'); // Simple view

                galleryContainer.appendChild(imgEl);

            });

        } else {

            galleryContainer.innerHTML = '<span style="color: #666; font-size: 13px;">No images</span>';

        }



        // Update install button

        const installBtn = document.getElementById('modDetailInstallBtn');

        installBtn.onclick = () => {

            closeModDetails();

            downloadModFromCard(details.id, details.slug);

        };



    } catch (error) {

        console.error("Error opening mod details:", error);

        document.getElementById('modDetailDescription').innerHTML = `<p style="color: red;">Unexpected error</p>`;

    }

};



window.closeModDetails = function () {

    const modal = document.getElementById('modDetailsModal');

    if (modal) {

        modal.classList.remove('show');

    }

};



// Event Listeners for Mod Download Progress

window.onModDownloadProgress = function (projectId, percentage, status) {

    const btn = document.getElementById(`btn-mod-${projectId}`);

    if (btn) {

        // Change text

        const originalText = btn.getAttribute('data-original-text') || 'Download';

        if (!btn.getAttribute('data-original-text')) {

            btn.setAttribute('data-original-text', originalText);

        }



        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${percentage}%`;

        btn.disabled = true;

        btn.style.cursor = 'wait';



        // Progress background effect (Grey to Green)

        // Background starts grey (#95a5a6) and fills with Green (#2ecc71)

        btn.style.background = `linear-gradient(to right, #2ecc71 ${percentage}%, #95a5a6 ${percentage}%)`;

        btn.style.borderColor = 'transparent';

    }

};



window.onModDownloadComplete = function (projectId, filename) {

    const btn = document.getElementById(`btn-mod-${projectId}`);

    if (btn) {

        btn.innerHTML = `<i class="fas fa-check"></i> Installed`;

        btn.style.background = '#2ecc71'; // Solid green

        btn.disabled = true;

        btn.style.cursor = 'default';



        // Reset after 3 seconds

        setTimeout(() => {

            const originalText = '<i class="fas fa-download"></i> Download';

            btn.innerHTML = originalText;

            btn.style.background = ''; // Reset to CSS default

            btn.disabled = false;

            btn.style.cursor = 'pointer';

        }, 3000);

    }



    // Refresh installed mods if on that tab

    if (currentModTab === 'installed') {

        loadInstalledAddons(); // Changed from loadInstalledMods

    }

};



window.onModDownloadError = function (projectId, errorMsg) {

    const btn = document.getElementById(`btn-mod-${projectId}`);

    if (btn) {

        btn.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Error`;

        btn.style.background = '#e74c3c'; // Red



        // Reset after 3 seconds

        setTimeout(() => {

            const originalText = '<i class="fas fa-download"></i> Download';

            btn.innerHTML = originalText;

            btn.style.background = ''; // Reset

            btn.disabled = false;

            btn.style.cursor = 'pointer';

        }, 3000);

    }

    window.pywebview.api.error(`Error: ${errorMsg}`);

};



window.downloadModFromCard = async function (projectId, slug) {

    if (!currentModsProfile) {

        window.pywebview.api.error('Select an installation first');

        return;

    }



    // Check if button exists and already disabled (redundant check)

    const btn = document.getElementById(`btn-mod-${projectId}`);

    if (btn && btn.disabled) return;



    try {

        // Set initial loading state

        if (btn) {

            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting...';

            btn.disabled = true;

        }



        // Get profile info to determine loader and game version (use generic profile getter)

        // Previous bug: get_moddable_profiles ONLY returned forge/fabric, so vanilla profiles (DPs/RPs) were missing -> "Profile not found"

        // We can reuse get_profiles_for_addon which is already filtered correctly for currentContentType

        const profilesData = await window.pywebview.api.get_profiles_for_addon(currentContentType);

        const profile = profilesData.profiles[currentModsProfile];



        if (!profile) {

            window.pywebview.api.error('Installation not found');

            if (btn) btn.disabled = false;

            return;

        }



        // Determine loader type — check both profile.type and the version string.

        // Forge installer creates versions like "1.20.1-forge-47.4.10" (no profile.type set),

        // while our internal ID is "forge-1.20.1-47.4.10". Both must be detected as Forge.

        const versionStr = (profile.version || '').toLowerCase();

        const isForgeProfile = profile.type === 'forge' ||

            versionStr.startsWith('forge-') ||

            versionStr.includes('-forge-') ||

            versionStr.includes('forge');

        const isFabricProfile = !isForgeProfile && (

            profile.type === 'fabric' ||

            versionStr.startsWith('fabric-') ||

            versionStr.includes('fabric-loader')

        );

        const loader = isForgeProfile ? 'forge' : isFabricProfile ? 'fabric' : 'forge';



        // Extract game version from profile version

        let gameVersion = profile.version;



        // For Fabric: handle formats like "fabric-loader-0.17.3-1.21.1" or "fabric-1.21.1"

        // For Forge: handle formats like "forge-1.20.1-47.1.0" or "1.20.1-forge-47.1.0"



        // Remove loader prefix if present

        gameVersion = gameVersion.replace(/^(forge-|fabric-)/i, '');



        // For Fabric loader format: "loader-X.X.X-MC_VERSION"

        // Extract the part after the last hyphen which is the MC version

        if (gameVersion.startsWith('loader-')) {

            const parts = gameVersion.split('-');

            // Last part should be the MC version

            if (parts.length >= 3) {

                gameVersion = parts[parts.length - 1];

            }

        } else {

            // For other formats, extract just the MC version (e.g., "1.20.1" from "1.20.1-47.1.0")

            const versionMatch = gameVersion.match(/^(\d+\.\d+(?:\.\d+)?)/);

            if (versionMatch) {

                gameVersion = versionMatch[1];

            }

        }



        // For Shaders and RPs, loader might not matter, or we treat "canvas/iris/optifine" as loaders?

        // Modrinth API often returns versions compatible with "minecraft", but for shaders it might list "iris" as loader.

        // We should pass 'iris' or 'optifine' if we are on fabric/forge respectively for shaders? 

        // Or just pass null to get all and let user decide?

        // Let's pass the loader derived from profile for Mods/Shaders. For RPs/DPs, loader is irrelevant (null).



        // Loader logic

        let searchLoader = loader;

        if (currentContentType === 'resourcepack' || currentContentType === 'datapack') {

            searchLoader = null;

        } else if (currentContentType === 'shader') {

            // For shaders, Modrinth usually expects 'iris' or 'optifine'

            if (loader === 'fabric') searchLoader = 'iris';

            else if (loader === 'forge') searchLoader = 'optifine';

            else searchLoader = null; // Fallback

        }



        // Get compatible versions

        const versionsResult = await window.pywebview.api.get_mod_versions(projectId, gameVersion, searchLoader);

        let version = null;



        if (!versionsResult.success || versionsResult.versions.length === 0) {

            // Error Message Logic

            let msg = "";

            if (currentContentType === 'resourcepack' || currentContentType === 'datapack') {

                // For resourcepacks and datapacks, allow installation anyway with confirmation
                const confirmMsg = `No compatible versions found for Minecraft ${gameVersion}. Do you want to install anyway?`;
                const confirmed = await window.pywebview.api.confirm(confirmMsg);

                if (!confirmed) {
                    if (btn) {
                        btn.innerHTML = '<i class="fas fa-download"></i> Download';
                        btn.disabled = false;
                    }
                    return;
                }

                // If confirmed, fetch all versions (not filtered by game version)
                const allVersionsResult = await window.pywebview.api.get_mod_versions(projectId, null, null);

                if (!allVersionsResult.success || allVersionsResult.versions.length === 0) {
                    window.pywebview.api.error('No versions available for this project');
                    if (btn) {
                        btn.innerHTML = '<i class="fas fa-download"></i> Download';
                        btn.disabled = false;
                    }
                    return;
                }

                // Use the latest version
                version = allVersionsResult.versions[0];

            } else if (currentContentType === 'shader') {

                // Mention mapped loader

                const shaderLoader = loader === 'fabric' ? 'Iris' : 'Optifine';

                msg = `No compatible versions for ${shaderLoader} on Minecraft ${gameVersion}`;

                window.pywebview.api.error(msg);

                if (btn) {

                    btn.innerHTML = '<i class="fas fa-download"></i> Download';

                    btn.disabled = false;

                }

                return;

            } else {

                // Mods

                msg = `No compatible versions for ${loader} ${gameVersion}`;

                window.pywebview.api.error(msg);

                if (btn) {

                    btn.innerHTML = '<i class="fas fa-download"></i> Download';

                    btn.disabled = false;

                }

                return;

            }

        } else {

            // Use the first (latest) compatible version

            version = versionsResult.versions[0];

        }



        // For Datapack, get world

        let worldName = null;

        if (currentContentType === 'datapack') {

            worldName = worldSelect ? worldSelect.value : null;

            if (!worldName) {

                window.pywebview.api.error('Please select a world first');

                if (btn) {

                    btn.innerHTML = '<i class="fas fa-download"></i> Download';

                    btn.disabled = false;

                }

                return;

            }

        }



        // Start Download (Now Async) - New "install_project" method

        const downloadResult = await window.pywebview.api.install_project(projectId, version.id, currentModsProfile, currentContentType, worldName);



        // If immediate error

        if (!downloadResult.success) {

            window.onModDownloadError(projectId, downloadResult.error);

        } else {

            // Success

            console.log("Download finished for", projectId);

            window.onModDownloadComplete(projectId, version.filename);

        }



    } catch (error) {

        console.error('Error downloading mod:', error);

        window.onModDownloadError(projectId, "Connection error");

    }

};



// Load installed mods

async function loadInstalledMods() {

    if (!currentModsProfile || !installedModsList) return;



    try {

        const result = await window.pywebview.api.get_installed_mods(currentModsProfile);



        if (!result.success) {

            installedModsList.innerHTML = `

                <div class="no-mods-message">

                    <i class="fas fa-exclamation-triangle"></i>

                    <p>Error loading mods: ${result.error}</p>

                </div>

            `;

            return;

        }



        if (result.mods.length === 0) {

            installedModsList.innerHTML = `

                <div class="no-mods-message">

                    <i class="fas fa-cube"></i>

                    <p>No mods installed in this profile</p>

                </div>

            `;

            return;

        }



        // Display mods

        installedModsList.innerHTML = '';

        result.mods.forEach(mod => {

            const item = createModListItem(mod);

            installedModsList.appendChild(item);

        });

    } catch (error) {

        console.error('Error loading installed mods:', error);

        installedModsList.innerHTML = `

            <div class="no-mods-message">

                <i class="fas fa-exclamation-triangle"></i>

                <p>Error loading mods</p>

            </div>

        `;

    }

}



function createModListItem(mod) {

    const item = document.createElement('div');

    item.className = `mod-list-item ${mod.enabled ? '' : 'disabled'}`;



    item.innerHTML = `

        <div class="mod-list-icon">

            <i class="fas fa-cube"></i>

        </div>

        <div class="mod-list-info">

            <div class="mod-list-name">${mod.display_name}</div>

            <div class="mod-list-details">${mod.size_mb} MB ${mod.enabled ? '• Enabled' : '• Disabled'}</div>

        </div>

        <div class="mod-list-actions">

            <div class="mod-toggle ${mod.enabled ? 'active' : ''}" onclick="toggleModEnabled('${mod.filename}', ${!mod.enabled})">

                <div class="mod-toggle-slider"></div>

            </div>

            <button class="mod-delete-btn" onclick="deleteModFile('${mod.filename}')">

                <i class="fas fa-trash"></i> Delete

            </button>

        </div>

    `;



    return item;

}



window.toggleModEnabled = async function (filename, enabled) {

    if (!currentModsProfile) return;



    try {

        const result = await window.pywebview.api.toggle_mod(currentModsProfile, filename, enabled);



        if (result.success) {

            await loadInstalledMods();

        } else {

            window.pywebview.api.error(`Error: ${result.error}`);

        }

    } catch (error) {

        console.error('Error toggling mod:', error);

        window.pywebview.api.error('Error changing mod state');

    }

};



// ============================================

// DISABLE BROWSER SHORTCUTS (unless dev mode is on)

// ============================================

document.addEventListener('keydown', function (e) {

    // Check if developer mode is enabled synchronously

    const devMode = window.isDevMode === true;



    // If developer mode is enabled, allow all shortcuts

    if (devMode) {

        return true;

    }



    // Otherwise, block developer shortcuts

    // Tab - Block traversing buttons

    if (e.key === 'Tab') {

        e.preventDefault();

        return false;

    }

    // F5 - Refresh

    if (e.key === 'F5') {

        e.preventDefault();

        return false;

    }



    // Ctrl+R - Refresh

    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {

        e.preventDefault();

        return false;

    }



    // F12 - Dev Tools

    if (e.key === 'F12') {

        e.preventDefault();

        return false;

    }



    // Ctrl+Shift+I - Dev Tools

    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {

        e.preventDefault();

        return false;

    }



    // Ctrl+Shift+J - Console

    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'J') {

        e.preventDefault();

        return false;

    }



    // Ctrl+Shift+C - Inspect Element

    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {

        e.preventDefault();

        return false;

    }



    // Ctrl+U - View Source

    if ((e.ctrlKey || e.metaKey) && e.key === 'u') {

        e.preventDefault();

        return false;

    }



    // Shift+F10 - Context Menu (keyboard)

    if (e.shiftKey && e.key === 'F10') {

        e.preventDefault();

        return false;

    }



    // F11 - Fullscreen (optional, uncomment if you want to disable)

    // if (e.key === 'F11') {

    //     e.preventDefault();

    //     return false;

    // }

});



// Intercept all <a> tag clicks to open in external browser

document.addEventListener('click', function (e) {

    const target = e.target.closest('a');

    if (target && target.href) {

        const url = target.href;

        // Check if it's an external link (http/https)

        if (url.startsWith('http://') || url.startsWith('https://')) {

            e.preventDefault();

            if (window.electronAPI && window.electronAPI.openUrl) {

                window.electronAPI.openUrl(url);

            } else if (window.pywebview && window.pywebview.api && window.pywebview.api.open_url) {

                window.pywebview.api.open_url(url);

            } else {

                window.open(url, '_blank');

            }

        }

    }

});



// Disable right-click context menu

document.addEventListener('contextmenu', function (e) {

    e.preventDefault();

    return false;

});

window.deleteModFile = async function (filename) {

    if (!currentModsProfile) return;



    const confirmed = await window.pywebview.api.confirm(`Delete the mod "${filename.replace('.jar.disabled', '').replace('.jar', '')}"?`);



    if (!confirmed) return;



    try {

        const result = await window.pywebview.api.delete_mod(currentModsProfile, filename);



        if (result.success) {

            await loadInstalledMods();

        } else {

            window.pywebview.api.error(`Error: ${result.error}`);

        }

    } catch (error) {

        console.error('Error deleting mod:', error);

        window.pywebview.api.error('Error deleting mod');

    }

};



// loadModdableProfiles is called when showSection('mods', type) is triggered





// --- Starfield Animation (Canvas) ---

const canvas = document.getElementById('starfield');

if (canvas) {

    const ctx = canvas.getContext('2d');

    let width, height;



    // Star properties

    const stars = [];

    const numStars = 200;

    const speed = 0.5;



    function resize() {

        width = window.innerWidth;

        height = window.innerHeight;

        canvas.width = width;

        canvas.height = height;

    }



    function initStars() {

        stars.length = 0;

        for (let i = 0; i < numStars; i++) {

            stars.push({

                x: Math.random() * width,

                y: Math.random() * height,

                size: Math.random() * 2,

                opacity: Math.random(),

                speed: Math.random() * speed + 0.1

            });

        }

    }



    function animate() {

        ctx.clearRect(0, 0, width, height);



        ctx.fillStyle = "white";



        for (let i = 0; i < stars.length; i++) {

            const star = stars[i];



            // Move star

            star.y -= star.speed;



            // Reset if off screen

            if (star.y < 0) {

                star.y = height;

                star.x = Math.random() * width;

            }



            // Draw star

            ctx.globalAlpha = star.opacity;

            ctx.beginPath();

            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);

            ctx.fill();

        }



        requestAnimationFrame(animate);

    }



    window.addEventListener('resize', () => {

        resize();

        initStars(); // Re-init on resize to fill screen

    });



    resize();

    initStars();

    animate();

}



// === Review System Logic ===

const REVIEW_URL = "https://hwlauncher.abelosky.com/?review=true";



// Elements

const reviewFloatingBtn = document.getElementById('reviewFloatingBtn');

const reviewReminderModal = document.getElementById('reviewReminderModal');

const doReviewBtn = document.getElementById('doReviewBtn');

const remindLaterBtn = document.getElementById('remindLaterBtn');

const neverShowAgainCheckbox = document.getElementById('neverShowAgainCheckbox');



// Open URL Handler

function openReviewUrl() {

    window.pywebview.api.open_url(REVIEW_URL);

}



// Check if we need to show the reminder

async function checkReviewReminder() {

    try {

        const shouldShow = await window.pywebview.api.check_review_reminder();

        if (shouldShow && reviewReminderModal) {

            // Show modal immediately

            reviewReminderModal.classList.add('show');

        }

    } catch (e) {

        console.error("Error checking review reminder:", e);

    }

}



// Event Listeners

if (reviewFloatingBtn) {

    reviewFloatingBtn.addEventListener('click', () => {

        openReviewUrl();

    });

}



if (doReviewBtn) {

    doReviewBtn.addEventListener('click', async () => {

        openReviewUrl();

        await window.pywebview.api.mark_review_action('reviewed');

        if (reviewReminderModal) reviewReminderModal.classList.remove('show');

    });

}



if (remindLaterBtn) {

    remindLaterBtn.addEventListener('click', async () => {

        // Check if "Don't show again" is checked

        if (neverShowAgainCheckbox && neverShowAgainCheckbox.checked) {

            await window.pywebview.api.mark_review_action('never');

        } else {

            await window.pywebview.api.mark_review_action('later');

        }

        if (reviewReminderModal) reviewReminderModal.classList.remove('show');

    });

}





// Helper function to extract the 2D front face of a skin as a Base64 data URL

window.cropHeadFromSkin = function(img) {

    const canvas = document.createElement('canvas');

    canvas.width = 64; // High res for head

    canvas.height = 64;

    const ctx = canvas.getContext('2d');

    ctx.imageSmoothingEnabled = false;



    // 1. Draw Head Base (8,8 -> 8x8)

    const s = img.width / 8;

    ctx.drawImage(img, s, s, s, s, 0, 0, 64, 64);



    // 2. Draw Hat Overlay (40,8 -> 8x8)

    ctx.drawImage(img, s * 5, s, s, s, 0, 0, 64, 64);



    return canvas.toDataURL();

};



// Function to render head image in user badge

window.renderUserHead = function(skinUrl) {

    return new Promise((resolve) => {

        const container = document.getElementById('userAvatarHead');

        if (!container) {

            resolve();

            return;

        }



        if (!skinUrl) {

            container.innerHTML = '<i class="fas fa-user"></i>';

            resolve();

            return;

        }



        const img = new Image();

        img.crossOrigin = "Anonymous";

        img.onload = () => {

            // Logic to detect if it's a full skin texture or a pre-cropped avatar

            // Known avatar providers usually provide square images that are NOT 64x64 or 64x32 textures.

            // Full skins are almost always 64, 128, 256... px wide and 1:1 or 2:1 ratio.

            const isAvatarProvider = skinUrl.includes('mc-heads.net') || skinUrl.includes('minotar.net') || skinUrl.includes('ui-avatars.com') || skinUrl.startsWith('data:image/');

            const isFullSkin = !isAvatarProvider &&

                               (img.width === img.height || img.width === img.height * 2) &&

                               (img.width % 64 === 0 || img.width === 32); 



            if (isFullSkin) {

                // It's a full skin texture, we need to crop the head (8,8, 8x8)

                const headDataUrl = window.cropHeadFromSkin(img);



                container.innerHTML = '';

                const headImg = new Image();

                headImg.src = headDataUrl;

                headImg.style.width = '100%';

                headImg.style.height = '100%';

                headImg.style.borderRadius = '50%';

                headImg.style.imageRendering = 'pixelated';

                container.appendChild(headImg);

            } else {

                // It's already an avatar (like from mc-heads.net)

                container.innerHTML = '';

                img.style.width = '100%';

                img.style.height = '100%';

                img.style.objectFit = 'cover';

                img.style.borderRadius = '50%';

                img.style.imageRendering = 'pixelated';

                container.appendChild(img);

            }

            resolve();

        };

        img.onerror = () => {
            container.innerHTML = '<i class="fas fa-user"></i>';
            resolve();
        };
        img.src = skinUrl;
    });
}

// IPC listener for in-app notifications
if (window.electronAPI && window.electronAPI.on) {
    window.electronAPI.on('show-in-app-notification', (data) => {
        let container = document.getElementById('in-app-notification');
        if (!container) {
            container = document.createElement('div');
            container.id = 'in-app-notification';
            document.body.appendChild(container);
        }
        
        container.innerHTML = `
            <div class="notification-icon">
                <i class="fas fa-bell"></i>
            </div>
            <div class="notification-content">
                <h4>${data.title}</h4>
                <p>${data.message}</p>
            </div>
            <div class="notification-close" onclick="document.getElementById('in-app-notification').classList.remove('show')">
                <i class="fas fa-times"></i>
            </div>
        `;
        
        // Reset animation if it's already showing
        container.classList.remove('show');
        
        // Force reflow
        void container.offsetWidth;
        
        container.classList.add('show');
        
        if (window.inAppNotificationTimeout) {
            clearTimeout(window.inAppNotificationTimeout);
        }
        
        window.inAppNotificationTimeout = setTimeout(() => {
            container.classList.remove('show');
        }, data.duration || 10000);
    });
}





// Helper function to extract the 2D front face of a skin as a Base64 data URL

window.cropHeadFromSkin = function(img) {

    const canvas = document.createElement('canvas');

    canvas.width = 64; // High res for head

    canvas.height = 64;

    const ctx = canvas.getContext('2d');

    ctx.imageSmoothingEnabled = false;



    // 1. Draw Head Base (8,8 -> 8x8)

    const s = img.width / 8;

    ctx.drawImage(img, s, s, s, s, 0, 0, 64, 64);



    // 2. Draw Hat Overlay (40,8 -> 8x8)

    ctx.drawImage(img, s * 5, s, s, s, 0, 0, 64, 64);



    return canvas.toDataURL();

};



// Function to render head image in user badge

window.renderUserHead = function(skinUrl) {

    return new Promise((resolve) => {

        const container = document.getElementById('userAvatarHead');

        if (!container) {

            resolve();

            return;

        }



        if (!skinUrl) {

            container.innerHTML = '<i class="fas fa-user"></i>';

            resolve();

            return;

        }



        const img = new Image();

        img.crossOrigin = "Anonymous";

        img.onload = () => {

            // Logic to detect if it's a full skin texture or a pre-cropped avatar

            // Known avatar providers usually provide square images that are NOT 64x64 or 64x32 textures.

            // Full skins are almost always 64, 128, 256... px wide and 1:1 or 2:1 ratio.

            const isAvatarProvider = skinUrl.includes('mc-heads.net') || skinUrl.includes('minotar.net') || skinUrl.includes('ui-avatars.com') || skinUrl.startsWith('data:image/');

            const isFullSkin = !isAvatarProvider &&

                               (img.width === img.height || img.width === img.height * 2) &&

                               (img.width % 64 === 0 || img.width === 32); 



            if (isFullSkin) {

                // It's a full skin texture, we need to crop the head (8,8, 8x8)

                const headDataUrl = window.cropHeadFromSkin(img);



                container.innerHTML = '';

                const headImg = new Image();

                headImg.src = headDataUrl;

                headImg.style.width = '100%';

                headImg.style.height = '100%';

                headImg.style.borderRadius = '50%';

                headImg.style.imageRendering = 'pixelated';

                container.appendChild(headImg);

            } else {

                // It's already an avatar (like from mc-heads.net)

                container.innerHTML = '';

                img.style.width = '100%';

                img.style.height = '100%';

                img.style.objectFit = 'cover';

                img.style.borderRadius = '50%';

                img.style.imageRendering = 'pixelated';

                container.appendChild(img);

            }

            resolve();

        };

        img.onerror = () => {
            container.innerHTML = '<i class="fas fa-user"></i>';
            resolve();
        };
        img.src = skinUrl;
    });
}

// IPC listener for in-app notifications
if (window.electronAPI && window.electronAPI.on) {
    window.electronAPI.on('show-in-app-notification', (data) => {
        let container = document.getElementById('in-app-notification');
        if (!container) {
            container = document.createElement('div');
            container.id = 'in-app-notification';
            document.body.appendChild(container);
        }
        
        container.innerHTML = `
            <div class="notification-icon">
                <i class="fas fa-bell"></i>
            </div>
            <div class="notification-content">
                <h4>${data.title}</h4>
                <p>${data.message}</p>
            </div>
            <div class="notification-close" onclick="document.getElementById('in-app-notification').classList.remove('show')">
                <i class="fas fa-times"></i>
            </div>
        `;
        
        // Reset animation if it's already showing
        container.classList.remove('show');
        
        // Force reflow
        void container.offsetWidth;
        
        container.classList.add('show');
        
        if (window.inAppNotificationTimeout) {
            clearTimeout(window.inAppNotificationTimeout);
        }
        
        window.inAppNotificationTimeout = setTimeout(() => {
            container.classList.remove('show');
        }, data.duration || 10000);
    });
}

// --- Minecraft News Fetching ---

async function loadMinecraftNews() {
    const container = document.getElementById('minecraftNewsContainer');
    if (!container) return;

    if (!window.hasInternet) {
        container.style.display = 'none';
        return;
    }

    try {
        const response = await fetch('https://launchercontent.mojang.com/v2/news.json');
        if (!response.ok) throw new Error('News fetch failed');
        const data = await response.json();
        
        if (!data || !data.entries || data.entries.length === 0) return;

        // Take top 15 news items for scrollable view
        const latestNews = data.entries.slice(0, 15);
        
        let html = '';
        latestNews.forEach(item => {
            const date = new Date(item.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            // Mojang image urls might be relative or missing domain
            let imgUrl = item.playPageImage && item.playPageImage.url ? item.playPageImage.url : '';
            if (imgUrl && imgUrl.startsWith('/')) {
                imgUrl = 'https://launchercontent.mojang.com' + imgUrl;
            } else if (!imgUrl) {
                imgUrl = 'img/icon/icon.png'; // fallback image
            }

            html += `
                <a href="${item.readMoreLink}" target="_blank" class="news-card">
                    <img src="${imgUrl}" alt="${item.title}" class="news-image" onerror="this.src='img/icon/icon.png'">
                    <div class="news-content">
                        <div class="news-category">${item.category || 'News'}</div>
                        <div class="news-title">${item.title}</div>
                        <div class="news-date">${date}</div>
                    </div>
                </a>
            `;
        });

        container.innerHTML = html;

    } catch (err) {
        console.error("Error loading news:", err);
        container.innerHTML = '<p style="color: #666; font-size: 12px; text-align: center;">Failed to load latest news.</p>';
    }
}
