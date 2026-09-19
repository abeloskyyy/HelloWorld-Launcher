// Toast notification system
function showToast(message, type = 'error') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'error' ? 'fas fa-exclamation-circle' : (type === 'info' ? 'fas fa-info-circle' : 'fas fa-check-circle');
    
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

// (switchAccountBtn is declared later when the account switcher section initializes)
// Legacy: logoutBtn no longer exists in HTML — replaced by switchAccountBtn
const logoutBtn = null; // kept for safety (referenced in window.logout but not as event listener)

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

    forge: null,

    neoforge: null

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

        // Save Language
        if (window.applyPendingLanguage) await window.applyPendingLanguage();

        const username = document.getElementById("nickname").value;

        const mcdir = document.getElementById("mcdir").value;

        const addonsPerPage = document.getElementById("addonsPerPage")?.value || 20;

        const uiScale = parseInt(document.getElementById("uiScaleSlider")?.value || 100, 10);

        const devMode = document.getElementById("devModeCheckbox")?.checked || false;

        window.isDevMode = devMode;

        const showSnapshots = document.getElementById("showSnapshotsCheckbox")?.checked || false;

        const showOld = document.getElementById("showOldVersionsCheckbox")?.checked || false;

        const enableTransitions = document.getElementById("enableTransitionsCheckbox")?.checked !== false;

        const hwAccel = document.getElementById("hwAccelCheckbox")?.checked !== false;

        const privacyMode = document.getElementById("privacyModeCheckbox")?.checked || false;


        // Get current data to check for restart requirements

        const currentData = await window.pywebview.api.get_user_json();



        // Transitions apply instantly without restart
        document.body.classList.toggle('disable-transitions', !enableTransitions);

        const restartRequired =
            currentData.dev_mode !== devMode ||
            currentData.hw_accel !== hwAccel;



        // 1. Save core user info

        if (window.pywebview.api.save_user_settings) {
            const payload = { username, mcdir, ui_scale: uiScale };
            if (typeof window.currentLanguage !== 'undefined') {
                payload.language = window.currentLanguage;
            }
            await window.pywebview.api.save_user_settings(payload);
        } else {
            await window.pywebview.api.save_user_json(username, mcdir);
        }



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
            const savedText = window.t('settings.saved_button') !== 'settings.saved_button' ? window.t('settings.saved_button') : 'Saved!';
            btn.innerHTML = `<i class="fas fa-check"></i> ${savedText}`;
            setTimeout(() => {
                btn.classList.remove('btn-success');

                btn.innerHTML = (window.t && window.t('settings.save_btn')) ? window.t('settings.save_btn') : originalContent;

            }, 2000);

        }



        // Alert if restart is needed

        if (restartRequired) {

            window.pywebview.api.info(window.t('toasts.settings_saved_restart') || 'Settings saved. One or more changes (Dev Mode or Hardware Acceleration) require a launcher restart to be applied.');

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
                btn.innerHTML = window.t ? window.t('settings.save_btn') : originalContent;
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



    // Helper function to step loading progress
    const updateLoaderProgress = (percent, text) => {
        const bar = document.getElementById('loaderProgressBar');
        const pct = document.getElementById('loaderPercentage');
        const txt = document.getElementById('loaderStatusText');
        if (bar) bar.style.width = `${percent}%`;
        if (pct) pct.textContent = `${percent}%`;
        if (txt && text) txt.textContent = text;
    };
    updateLoaderProgress(15, window.t('loader.checking_connection') || "Checking connection...");

    // Check internet connection first
    try {

        window.hasInternet = await window.pywebview.api.check_internet();



        if (!window.hasInternet) {

            // Show no internet modal

            const noInternetModal = document.getElementById('noInternetModal');

            if (noInternetModal) {

                noInternetModal.classList.add('show');



                const closeAppBtn = document.getElementById('closeAppBtn');

                const continueAnywayBtn = document.getElementById('continueAnywayBtn');



                if (closeAppBtn) {

                    closeAppBtn.addEventListener('click', async () => {

                        await window.pywebview.api.close_app();

                    });

                }



                if (continueAnywayBtn) {

                    continueAnywayBtn.addEventListener('click', () => {

                        noInternetModal.classList.remove('show');

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
        updateLoaderProgress(35, window.t('loader.downloading_account') || "Downloading account data...");
        const data = await window.pywebview.api.get_user_json();

        // Load saved language
        const langToUse = data.language || window.currentLanguage || 'en';
        if (window.setLanguage) {
            window.setLanguage(langToUse);
            if (typeof window.pendingLanguage !== 'undefined') {
                window.pendingLanguage = langToUse;
                if (window.updateDropdownUI) window.updateDropdownUI();
            }
        }

        console.log('[Init] User data loaded:', data.account_type, data.username);



        // Populate settings inputs

        if (document.getElementById("nickname")) document.getElementById("nickname").value = data.username || "";

        if (document.getElementById("mcdir")) document.getElementById("mcdir").value = data.mcdir || "";

        if (document.getElementById("addonsPerPage")) document.getElementById("addonsPerPage").value = data.addons_per_page || 20;

        if (data.ui_scale) {
            applyUiScale(data.ui_scale, true);
        } else {
            const savedScale = localStorage.getItem('hw_launcher_scale_percent');
            if (savedScale) applyUiScale(savedScale, false);
        }

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

        if (transitionsCheckbox) {
            transitionsCheckbox.checked = (data.enable_transitions !== false);
            if (!transitionsCheckbox._hasTransitionsListener) {
                transitionsCheckbox._hasTransitionsListener = true;
                transitionsCheckbox.addEventListener('change', () => {
                    document.body.classList.toggle('disable-transitions', !transitionsCheckbox.checked);
                });
            }
        }

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


        // Update UI immediately with local state
        updateLoaderProgress(55, window.t('loader.preparing_app') || "Preparing application...");
        await updateUserInterface(data);

        if (data.username && window.hasInternet) {
            loadSkinData(); // non-blocking
        }

        // Register mod download progress listener
        if (window.pywebview.api.on_mod_download_progress) {
            window.pywebview.api.on_mod_download_progress((prog) => {
                if (window.onModDownloadProgress) {
                    window.onModDownloadProgress(prog.projectId, prog.percentage, 'downloading');
                }
            });
        }

        // Load fast local app data and news concurrently
        updateLoaderProgress(75, window.t('loader.fetching_news') || "Fetching latest news & app data...");
        await Promise.all([
            loadOptions(),
            loadProfiles(),
            loadVersions(),
            checkReviewReminder(),
            loadMinecraftNews().catch(err => console.error("Failed to load Minecraft News:", err)),
            loadVersionManifestInfo().catch(err => console.error("Failed to load Version Manifest:", err)),
            loadMinecraftPatchNotes().catch(err => console.error("Failed to load Patch Notes:", err))
        ]);

        // Load launcher version
        try {
            const version = await window.pywebview.api.get_launcher_version();
            const vEl = document.getElementById("launcherVersion");
            if (vEl) vEl.textContent = version;
        } catch (err) { }

        // Resolver estado del sponsor antes de cerrar la pantalla de carga
        try {
            await initSidebarSponsor();
        } catch (e) {
            console.warn("[Init] Sponsor error:", e);
        }

        // Inicializar ajuste de escala
        try {
            initUiScale();
        } catch (e) {
            console.warn("[Init] UI Scale error:", e);
        }

        // Inicializar promoción de compra de Minecraft Premium
        try {
            initBuyMinecraftPromo();
        } catch (e) {
            console.warn("[Init] Buy MC promo error:", e);
        }

        // Ensure user badges are loaded if connected to internet before closing the loading screen
        if (window.hasInternet && data && data.username && (data.account_type === 'microsoft' || data.account_type === 'helloworld')) {
            if (_ownBadgesLoadedFor !== data.username) {
                await loadOwnBadges(data);
            }
        }

        // Hide loader/splash once app data, news, and badges have finished loading
        updateLoaderProgress(100, window.t('loader.ready_to_play') || "Ready to play!");
        await new Promise(r => setTimeout(r, 400));
        const loader = document.getElementById('initialLoader');
        if (loader) {
            loader.classList.add('hidden');
            setTimeout(() => { loader.style.display = 'none'; }, 500);
        }

        // --- BACKGROUND NON-BLOCKING TASKS ---
        const refreshUserSession = async () => {
            const currentData = await window.pywebview.api.get_user_json();
            if ((currentData.account_type === 'microsoft' || currentData.account_type === 'helloworld') && window.hasInternet) {
                try {
                    const res = await window.pywebview.api.refresh_session();
                    if (res.success) {
                        const refreshedData = await window.pywebview.api.get_user_json();
                        await updateUserInterface(refreshedData);
                        loadSkinData();
                    } else if (res.expired && currentData.account_type === 'microsoft') {
                        console.warn("[Init] Session expired");
                        window.pywebview.api.info(window.t("toasts.session_expired") || "Your Microsoft session has expired. Please log in again.");
                        const offlineData = await window.pywebview.api.save_user_json(currentData.username, currentData.mcdir, 'offline');
                        await updateUserInterface(offlineData);
                        loadSkinData();
                    }
                } catch (err) {
                    console.error("[Init] Error refreshing session:", err);
                }
            }
        };

        // Run session refresh non-blocking in background
        refreshUserSession();
        setInterval(refreshUserSession, 60000);

        // Listen for background auto-updates
        if (window.hwlAPI && window.hwlAPI.onUpdaterStatus) {
            window.hwlAPI.onUpdaterStatus((statusData) => {
                if (statusData && statusData.status === 'available') {
                    showToast("New update available! Redirecting...", "success");
                    setTimeout(() => { window.location.href = "updater.html"; }, 1500);
                }
            });
        }

        // Listen for auto-launch profile from shortcuts
        const onAutoLaunch = (profileId) => {
            if (!profileId) return;
            console.log('[AutoLaunch] Received auto launch event for profile:', profileId);
            if (window.isLauncherReady) {
                launchProfileById(profileId);
            } else {
                window.pendingLaunchProfileId = profileId;
            }
        };

        if (window.hwlAPI && window.hwlAPI.onAutoLaunchProfile) {
            window.hwlAPI.onAutoLaunchProfile(onAutoLaunch);
        } else if (window.pywebview && window.pywebview.api && window.pywebview.api.on_auto_launch_profile) {
            window.pywebview.api.on_auto_launch_profile(onAutoLaunch);
        }

    } catch (error) {
        console.error("[Init] Error during initialization:", error);
        updateLoaderProgress(100, window.t('loader.ready') || "Ready!");
        setTimeout(() => {
            const loader = document.getElementById('initialLoader');
            if (loader) {
                loader.classList.add('hidden');
                setTimeout(() => { loader.style.display = 'none'; }, 500);
            }
        }, 300);
    }

    console.log('[Init] Initialization complete');
    window.isLauncherReady = true;

    // Check for pending launch from shortcut
    if (window.pendingLaunchProfileId) {
        const pid = window.pendingLaunchProfileId;
        window.pendingLaunchProfileId = null;
        setTimeout(() => { launchProfileById(pid); }, 350);
    } else if (window.pywebview && window.pywebview.api && window.pywebview.api.get_pending_launch_profile) {
        window.pywebview.api.get_pending_launch_profile().then(pid => {
            if (pid) setTimeout(() => { launchProfileById(pid); }, 350);
        }).catch(() => {});
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLauncher);
} else {
    initLauncher();
}
window.addEventListener('pywebviewready', initLauncher);

// Re-render dynamic elements when language changes
window.addEventListener('language-changed', () => {
    if (typeof window.loadProfiles === 'function') {
        window.loadProfiles(false);
    }
    if (typeof window.loadOptions === 'function') {
        window.loadOptions();
    }
    if (typeof renderSidebarSponsor === 'function') {
        renderSidebarSponsor(currentSponsorConfig);
    }
});

// --- SPONSOR / PROMO (Apex Hosting) ---
const SPONSOR_GIST_URL = 'https://gist.githubusercontent.com/abeloskyyy/ae6861843152ced82beb7f5135ac3863/raw/hwlauncher-promo.json';
const SPONSOR_CACHE_KEY = 'hw_sponsor_promo_data';
const SPONSOR_CACHE_TIME_KEY = 'hw_sponsor_promo_time';
const SPONSOR_CACHE_TTL = 12 * 60 * 60 * 1000; // 12 horas

const DEFAULT_SPONSOR_CONFIG = {
    active: false,
    code: "HWLAUNCHER",
    discount: "25",
    url: "https://billing.apexminecrafthosting.com/aff.php?aff=17119"
};

let currentSponsorConfig = { ...DEFAULT_SPONSOR_CONFIG };

function renderSidebarSponsor(config) {
    currentSponsorConfig = config || DEFAULT_SPONSOR_CONFIG;
    const card = document.getElementById('sidebarSponsorCard');
    if (!card) return;

    if (!currentSponsorConfig || currentSponsorConfig.active !== true) {
        card.classList.add('is-hidden');
        card.style.display = 'none';
        return;
    }

    card.classList.remove('is-hidden');
    card.style.display = '';

    // Discount badge
    const badge = document.getElementById('sponsorDiscountBadge');
    if (badge) {
        let disc = String(currentSponsorConfig.discount || '25').trim();
        if (!disc.endsWith('%')) {
            disc = `${disc}%`;
        }
        badge.innerText = disc;
    }

    // Subtitle translation
    const subtitle = document.getElementById('sponsorSubtitle');
    if (subtitle) {
        subtitle.innerText = (window.t ? window.t('sidebar.sponsor_subtitle') : '') || 'Crea tu servidor con un 25% de descuento';
    }

    // Action button: Copiar código (solo icono)
    const copyBtn = document.getElementById('sponsorCopyBtn');
    if (copyBtn) {
        copyBtn.title = (window.t ? window.t('sidebar.sponsor_copy_hint') : '') || 'Copiar código';
        copyBtn.onclick = (e) => {
            e.stopPropagation();
            const code = (currentSponsorConfig.code || 'HWLAUNCHER').trim();
            navigator.clipboard.writeText(code).then(() => {
                const copyMsg = (window.t ? window.t('sidebar.sponsor_code_copied', { code }) : '') || `Código ${code} copiado al portapapeles`;
                if (typeof showToast === 'function') {
                    showToast(copyMsg, 'success');
                }
                const originalHtml = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fas fa-check" style="color: #C0FF1E;"></i>';
                setTimeout(() => {
                    copyBtn.innerHTML = originalHtml;
                }, 2000);
            }).catch((err) => {
                console.warn('[Sponsor] Error copying code to clipboard:', err);
            });
        };
    }

    // Action button: Abrir enlace (solo icono)
    const openBtn = document.getElementById('sponsorOpenBtn');
    if (openBtn) {
        openBtn.title = (window.t ? window.t('sidebar.sponsor_open_hint') : '') || 'Abrir enlace';
        openBtn.onclick = (e) => {
            e.stopPropagation();
            const targetUrl = currentSponsorConfig.url || DEFAULT_SPONSOR_CONFIG.url;
            if (window.api && typeof window.api.openExternal === 'function') {
                window.api.openExternal(targetUrl);
            } else {
                window.open(targetUrl, '_blank');
            }
        };
    }
}

async function initSidebarSponsor() {
    const card = document.getElementById('sidebarSponsorCard');
    if (!card) return;

    const cachedStr = localStorage.getItem(SPONSOR_CACHE_KEY);

    // 1. Carga inmediata desde caché o valores por defecto (0ms de retraso)
    if (cachedStr) {
        try {
            renderSidebarSponsor(JSON.parse(cachedStr));
        } catch (e) {
            renderSidebarSponsor(DEFAULT_SPONSOR_CONFIG);
        }
    } else {
        renderSidebarSponsor(DEFAULT_SPONSOR_CONFIG);
    }

    // 2. Actualización en segundo plano: consulta la última versión del Gist
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);
        const res = await fetch(`${SPONSOR_GIST_URL}?t=${Date.now()}`, {
            signal: controller.signal,
            cache: 'no-cache'
        });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            localStorage.setItem(SPONSOR_CACHE_KEY, JSON.stringify(data));
            localStorage.setItem(SPONSOR_CACHE_TIME_KEY, Date.now().toString());
            renderSidebarSponsor(data);
        }
    } catch (err) {
        console.warn('[Sponsor] No se pudo obtener promo remota, usando local:', err.message);
    }
}

// --- BUY MINECRAFT PREMIUM PROMO ---
const MINECRAFT_STORE_URL = 'https://www.minecraft.net/es-es/store/minecraft-java-bedrock-edition-pc';

function updateBuyMinecraftVisibility(userData) {
    const card = document.getElementById('sidebarBuyMinecraftCard');
    if (!card) return;

    // Show ONLY for non-premium accounts: no account logged in, helloworld account, or offline
    // Hide ONLY for official Microsoft accounts (Minecraft Premium)
    const isMicrosoftPremium = Boolean(
        userData &&
        userData.username &&
        userData.username.trim() !== '' &&
        userData.account_type === 'microsoft'
    );

    if (isMicrosoftPremium) {
        card.classList.add('is-hidden');
        card.style.display = 'none';
    } else {
        card.classList.remove('is-hidden');
        card.style.display = '';
    }
}
window.updateBuyMinecraftVisibility = updateBuyMinecraftVisibility;

function initBuyMinecraftPromo() {
    const link = document.getElementById('sidebarBuyMcLink');
    if (!link) return;

    link.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.hwlAPI && typeof window.hwlAPI.openExternal === 'function') {
            window.hwlAPI.openExternal(MINECRAFT_STORE_URL);
        } else if (window.api && typeof window.api.openExternal === 'function') {
            window.api.openExternal(MINECRAFT_STORE_URL);
        } else {
            window.open(MINECRAFT_STORE_URL, '_blank');
        }
    };
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBuyMinecraftPromo);
} else {
    initBuyMinecraftPromo();
}

// --- UI SCALE SYSTEM (50% - 150%) ---
function applyUiScale(percent, save = true) {
    const p = Math.max(50, Math.min(150, Math.round(Number(percent) || 100)));
    const factor = p / 100;

    if (window.hwlAPI && typeof window.hwlAPI.setZoomFactor === 'function') {
        window.hwlAPI.setZoomFactor(factor);
    } else if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.setZoomFactor === 'function') {
        window.pywebview.api.setZoomFactor(factor);
    } else if (window.electronAPI && typeof window.electronAPI.setZoomFactor === 'function') {
        window.electronAPI.setZoomFactor(factor);
    } else {
        document.documentElement.style.zoom = factor;
    }

    const badge = document.getElementById('uiScaleValueBadge');
    if (badge) badge.textContent = `${p}%`;
    const slider = document.getElementById('uiScaleSlider');
    if (slider && Number(slider.value) !== p) slider.value = p;

    if (save) {
        localStorage.setItem('hw_launcher_scale', factor.toString());
        localStorage.setItem('hw_launcher_scale_percent', p.toString());
    }
}
window.applyUiScale = applyUiScale;

function initUiScale() {
    const slider = document.getElementById('uiScaleSlider');
    const decBtn = document.getElementById('scaleDecreaseBtn');
    const incBtn = document.getElementById('scaleIncreaseBtn');
    const resetBtn = document.getElementById('scaleResetBtn');

    if (!slider) return;

    const savedPercentStr = localStorage.getItem('hw_launcher_scale_percent');
    let currentPercent = savedPercentStr ? parseInt(savedPercentStr, 10) : 100;
    if (isNaN(currentPercent) || currentPercent < 50 || currentPercent > 150) {
        currentPercent = 100;
    }

    applyUiScale(currentPercent, false);

    slider.addEventListener('input', (e) => {
        applyUiScale(e.target.value, true);
    });

    if (decBtn) {
        decBtn.onclick = (e) => {
            e.preventDefault();
            const current = parseInt(slider.value, 10) || 100;
            const next = Math.max(50, current - 5);
            applyUiScale(next, true);
        };
    }

    if (incBtn) {
        incBtn.onclick = (e) => {
            e.preventDefault();
            const current = parseInt(slider.value, 10) || 100;
            const next = Math.min(150, current + 5);
            applyUiScale(next, true);
        };
    }

    if (resetBtn) {
        resetBtn.onclick = (e) => {
            e.preventDefault();
            applyUiScale(100, true);
        };
    }
}
window.initUiScale = initUiScale;

let _ownBadgesLoadedFor = null;

async function loadOwnBadges(userData) {
    const badgesDisplay = document.getElementById('userBadgesDisplay');
    if (!badgesDisplay) return;

    // Offline account or not logged in: clear badges and return immediately
    if (!userData || !userData.username || userData.account_type === 'offline') {
        badgesDisplay.innerHTML = '';
        _ownBadgesLoadedFor = null;
        return;
    }

    // Anti-offline system: If no internet, badges never load; do not wait or block
    if (!window.hasInternet) {
        badgesDisplay.innerHTML = '';
        _ownBadgesLoadedFor = userData.username;
        return;
    }

    try {
        let badges = [];
        if (window.pywebview && window.pywebview.api && window.pywebview.api.get_own_badges) {
            // Fetch own badges from backend with a safety timeout of 3.5s so loader is never stuck
            const res = await Promise.race([
                window.pywebview.api.get_own_badges(),
                new Promise((resolve) => setTimeout(() => resolve({ success: false, badges: [] }), 3500))
            ]);
            if (res && res.success && Array.isArray(res.badges)) {
                badges = res.badges;
            }
        }

        // Fallback: if badges is empty but user is verified Microsoft, include premium badge
        if (badges.length === 0 && userData.account_type === 'microsoft' && userData.firebase_ms_uid) {
            badges = ['premium'];
        }

        _ownBadgesLoadedFor = userData.username;

        if (badges.length === 0) {
            badgesDisplay.innerHTML = '';
            return;
        }

        // Render compact rosette badge(s)
        if (typeof window.renderBadgesHtml === 'function') {
            badgesDisplay.innerHTML = window.renderBadgesHtml(badges, false);
        } else {
            const BADGE_ROSETTE_SVG = '<svg class="hw-badge-shape" viewBox="0 0 22 22" aria-hidden="true"><path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.887-1.692-.474-.45-1.058-.756-1.692-.887-.633-.13-1.29-.083-1.897.14-.274-.586-.706-1.084-1.246-1.438C12.275 1.808 11.646 1.61 11 1.628c-.646.018-1.275.215-1.816.57-.54.354-.972.852-1.246 1.438-.607-.223-1.264-.27-1.897-.14-.634.131-1.218.437-1.692.887-.45.474-.756 1.058-.887 1.692-.13.633-.083 1.29.14 1.897-.586.274-1.084.706-1.438 1.246C1.808 9.725 1.61 10.354 1.628 11c.018.646.215 1.275.57 1.816.354.54.852.972 1.438 1.246-.223.607-.27 1.264-.14 1.897.131.634.437 1.218.887 1.692.474.45 1.058.756 1.692.887-.633.13-1.29-.083-1.897-.14-.274-.586-.706-1.084-1.246-1.438.541.355 1.17.552 1.816.57.646-.018 1.275-.215 1.816-.57.54-.354.972-.852 1.246-1.438.607.223 1.264.27 1.897.14.634-.131 1.218-.437 1.692-.887.45-.474.756-1.058.887-1.692.13-.633-.083-1.29-.14-1.897.586-.274 1.084-.706 1.438-1.246.355-.541.552-1.17.57-1.816z"/></svg>';
            const defs = {
                premium:   { cls: 'hw-badge-premium', title: 'Cuenta Premium' },
                moderator: { cls: 'hw-badge-moderator', title: 'Moderador' },
                creator:   { cls: 'hw-badge-creator', title: 'Creador' }
            };
            const parts = (badges || []).filter(b => defs[b]).map(b => {
                return `<span class="hw-badge ${defs[b].cls}" title="${defs[b].title}">${BADGE_ROSETTE_SVG}</span>`;
            });
            badgesDisplay.innerHTML = parts.length ? `<span class="hw-badges-row">${parts.join('')}</span>` : '';
        }
    } catch (err) {
        console.warn('[Badges] Error loading own badges:', err);
        _ownBadgesLoadedFor = userData.username;
    }
}
window.loadOwnBadges = loadOwnBadges;

// --- NEW AUTH FUNCTIONS ---



async function updateUserInterface(userData) {
    if (!userData || !userData.username) {
        if (typeof window.onSocialLogout === 'function') {
            window.onSocialLogout();
        }
    }

    const badge = document.getElementById('userBadge');

    const name = document.getElementById('userDisplayName');

    const loginBtn = document.getElementById('loginButton');

    const skinsBtn = document.getElementById('skinsSidebarBtn');



    // Check if logged in (offline, microsoft or helloworld)

    if (userData.username && userData.username !== "") {

        if (badge) badge.style.display = 'flex';

        if (name) name.textContent = userData.username;

        // Load and render user badges in the account button
        await loadOwnBadges(userData);

        if (loginBtn) loginBtn.style.display = 'none';



        // ONLY Show local skins/capes button for Microsoft accounts

        // HelloWorld skins are managed via the web dashboard only

        if (userData.account_type === 'microsoft') {

            if (skinsBtn) {
                skinsBtn.style.display = 'flex';
                skinsBtn.classList.remove('locked-feature');
                skinsBtn.title = 'Skins & Capes';
            }

        } else {

            if (skinsBtn) {
                skinsBtn.style.display = 'flex';
                skinsBtn.classList.add('locked-feature');
                skinsBtn.title = 'Skins & Capes (Microsoft Account Required)';
            }

        }



        const editProfileBtn = document.getElementById('editProfileBtn');
        const viewOwnProfileBtn = document.getElementById('viewOwnProfileBtn');

        if (userData.account_type === 'microsoft') {

            // Premium account

            const isVerified = !!(userData.firebase_ms_uid);

            if (editProfileBtn) {
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
            }

            if (viewOwnProfileBtn) {
                viewOwnProfileBtn.style.display = 'block';

                if (isVerified) {
                    viewOwnProfileBtn.disabled = false;
                    viewOwnProfileBtn.classList.remove('btn-disabled');
                    viewOwnProfileBtn.style.removeProperty('cursor');
                    viewOwnProfileBtn.style.removeProperty('opacity');
                    viewOwnProfileBtn.title = (window.t ? window.t('user_menu.view_profile') : '') || 'View Profile';
                } else {
                    viewOwnProfileBtn.disabled = false;
                    viewOwnProfileBtn.classList.add('btn-disabled');
                    viewOwnProfileBtn.style.cursor = 'default';
                    viewOwnProfileBtn.style.opacity = '0.5';
                    viewOwnProfileBtn.title = (window.t ? window.t('user_menu.verify_to_view_profile') : '') || 'Verify your Microsoft account to view profile';
                }
            }
                
            const statsBtn = document.getElementById('statsBtn');
            if (statsBtn) {
                statsBtn.style.display = 'inline-flex';
                statsBtn.classList.remove('locked-feature');
                statsBtn.title = 'Stats';
            }
            const wkPublishBtn = document.getElementById('wkPublishBtn');
            if (wkPublishBtn) {
                wkPublishBtn.classList.remove('locked-feature');
                wkPublishBtn.title = 'Create Workshop Item';
            }
            // Reload stats for Microsoft accounts
            if (window.loadMyStats) {
                window.loadMyStats();
            }

        } else if (userData.account_type === 'helloworld') {

            // HelloWorld accounts can always edit profile & view profile

            if (editProfileBtn) {
                editProfileBtn.style.display = 'block';
                editProfileBtn.disabled = false;
                editProfileBtn.classList.remove('btn-disabled');
                editProfileBtn.style.removeProperty('cursor');
                editProfileBtn.style.removeProperty('opacity');
                editProfileBtn.title = 'Edit Profile';
            }

            if (viewOwnProfileBtn) {
                viewOwnProfileBtn.style.display = 'block';
                viewOwnProfileBtn.disabled = false;
                viewOwnProfileBtn.classList.remove('btn-disabled');
                viewOwnProfileBtn.style.removeProperty('cursor');
                viewOwnProfileBtn.style.removeProperty('opacity');
                viewOwnProfileBtn.title = (window.t ? window.t('user_menu.view_profile') : '') || 'View Profile';
            }
                
            const statsBtn = document.getElementById('statsBtn');
            if (statsBtn) {
                statsBtn.style.display = 'inline-flex';
                statsBtn.classList.remove('locked-feature');
                statsBtn.title = 'Stats';
            }
            const wkPublishBtn = document.getElementById('wkPublishBtn');
            if (wkPublishBtn) {
                wkPublishBtn.classList.remove('locked-feature');
                wkPublishBtn.title = 'Create Workshop Item';
            }
            // Reload stats for HelloWorld accounts
            if (window.loadMyStats) {
                window.loadMyStats();
            }

        } else {

            // Offline accounts cannot edit profile or view profile

            if (editProfileBtn) editProfileBtn.style.display = 'none';
            if (viewOwnProfileBtn) viewOwnProfileBtn.style.display = 'none';
                
            const streakBadgeContainer = document.getElementById('streakBadgeContainer');
            if (streakBadgeContainer) streakBadgeContainer.style.display = 'none';
                
            const statsBtn = document.getElementById('statsBtn');
            if (statsBtn) {
                statsBtn.style.display = 'inline-flex';
                statsBtn.classList.add('locked-feature');
                statsBtn.title = 'Stats (Account Required)';
            }
            const wkPublishBtn = document.getElementById('wkPublishBtn');
            if (wkPublishBtn) {
                wkPublishBtn.classList.add('locked-feature');
                wkPublishBtn.title = 'Create Workshop Item (Account Required)';
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
                const id = userData.uuid || (userData.username ? encodeURIComponent(userData.username) : null);
                const skinUrl = window.hasInternet ? (id ? `https://crafthead.net/helm/${id}/64` : null) : null;
                await window.renderUserHead(skinUrl);

            } else {

                // Offline

                await window.renderUserHead(null);

            }

        }

    } else {

        if (badge) badge.style.display = 'none';

        const userBadgesDisplay = document.getElementById('userBadgesDisplay');
        if (userBadgesDisplay) userBadgesDisplay.innerHTML = '';

        if (loginBtn) loginBtn.style.display = 'flex';

        if (skinsBtn) {
            skinsBtn.style.display = 'flex';
            skinsBtn.classList.add('locked-feature');
            skinsBtn.title = 'Skins & Capes (Microsoft Account Required)';
        }

        

        const editProfileBtn = document.getElementById('editProfileBtn');

        if (editProfileBtn) editProfileBtn.style.display = 'none';

        const viewOwnProfileBtn = document.getElementById('viewOwnProfileBtn');

        if (viewOwnProfileBtn) viewOwnProfileBtn.style.display = 'none';

        const streakBadgeContainer = document.getElementById('streakBadgeContainer');
        if (streakBadgeContainer) streakBadgeContainer.style.display = 'none';
        
        const statsBtn = document.getElementById('statsBtn');
        if (statsBtn) {
            statsBtn.style.display = 'none';
        }
        const wkPublishBtn = document.getElementById('wkPublishBtn');
        if (wkPublishBtn) {
            wkPublishBtn.classList.add('locked-feature');
            wkPublishBtn.title = 'Create Workshop Item (Account Required)';
        }
    }

    

    // Social button visibility and state

    const socialBtnEl = document.getElementById('socialBtn');

    if (socialBtnEl) {
        const hasAccount = userData && userData.username && userData.username !== '';
        const showSocial = hasAccount &&
            (userData.account_type === 'helloworld' || userData.account_type === 'microsoft');

        socialBtnEl.style.display = hasAccount ? 'flex' : 'none';

        if (showSocial) {

            socialBtnEl.classList.remove('locked-feature');

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

                window.initSocial(true).catch(() => {});

            }

        } else {

            socialBtnEl.classList.add('locked-feature');
            socialBtnEl.classList.remove('btn-disabled');
            socialBtnEl.disabled = false;
            socialBtnEl.style.removeProperty('cursor');
            socialBtnEl.style.removeProperty('opacity');
            socialBtnEl.title = 'Social (Account Required)';

            if (typeof window.onSocialLogout === 'function') {

                window.onSocialLogout();

            }

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

    if (typeof window.checkWkAdminAccess === 'function') {
        window.checkWkAdminAccess();
    }

    if (typeof updateBuyMinecraftVisibility === 'function') {
        updateBuyMinecraftVisibility(userData);
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

        selectMicrosoftBtn.innerHTML = '<i class="fab fa-microsoft"></i> Login with Microsoft <span class="corner-ribbon">Only Minecraft Premium</span>';

        selectMicrosoftBtn.disabled = false;

    }



    const loginMicrosoftBtn = document.getElementById('loginMicrosoftBtn');

    if (loginMicrosoftBtn) {

        loginMicrosoftBtn.innerHTML = '<i class="fab fa-microsoft"></i> Login with Microsoft <span class="corner-ribbon">Only Minecraft Premium</span>';

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

            if (typeof window.hideMsVerifyBanner === 'function') window.hideMsVerifyBanner(true);

            const updatedData = await window.pywebview.api.get_user_json();

            await updateUserInterface(updatedData);

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

                if (typeof window.hideMsVerifyBanner === 'function') window.hideMsVerifyBanner(true);

                const updatedData = await window.pywebview.api.get_user_json();

                await updateUserInterface(updatedData);

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

    window.pywebview.api.error(window.t("toasts.login_failed", {err: err}) || ("Login failed: " + err));

    // Reset button state

    const selectMicrosoftBtn = document.getElementById('selectMicrosoftBtn');

    if (selectMicrosoftBtn) {

        selectMicrosoftBtn.innerHTML = '<i class="fab fa-microsoft"></i> Login with Microsoft <span class="corner-ribbon">Only Minecraft Premium</span>';

        selectMicrosoftBtn.disabled = false;

    }



    // Also reset the other button if it exists/was used

    const loginMicrosoftBtn = document.getElementById('loginMicrosoftBtn');

    if (loginMicrosoftBtn) {

        loginMicrosoftBtn.innerHTML = '<i class="fab fa-microsoft"></i> Login with Microsoft <span class="corner-ribbon">Only Minecraft Premium</span>';

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
    if (window.logIdleTimer) { clearTimeout(window.logIdleTimer); window.logIdleTimer = null; }
    window.isLaunching = false;

    // Instantly revert state in UI

    const playButton = document.querySelector('.play-button');

    if (playButton) {

        playButton.disabled = false;

        playButton.style.cursor = 'pointer';

        playButton.style.opacity = '1';

        playButton.innerHTML = playButton.dataset.originalHtml || window.t('play.play_btn') || 'Play';

    }

    const cancelBtn = document.getElementById('cancelLaunchBtn');

    if (cancelBtn) {

        cancelBtn.classList.remove('visible');

        cancelBtn.innerHTML = '<i class="fas fa-times"></i>';

        cancelBtn.disabled = false;

    }



    // Call API to cancel launch immediately
    window.pywebview.api.cancel_launch().catch(err => console.error("Cancel launch error:", err));
};



async function launchGame() {
    window.launchGame = launchGame;
    console.log('[Frontend] launchGame called');

    const profileSelectElement = document.getElementById("profileSelect");
    if (!profileSelectElement || !profileSelectElement.value) {
        window.pywebview.api.error(window.t("toasts.select_installation_play") || "You must select an installation before playing");
        return;
    }

    // Prevent double-launch
    if (window.isLaunching) return;
    window.isLaunching = true;

    // Show loading state immediately so UI feels fast and responsive
    const playButton = document.querySelector('.play-button');
    if (playButton) {
        if (!playButton.dataset.originalHtml) {
            playButton.dataset.originalHtml = playButton.innerHTML;
        }
        playButton.disabled = true;
        playButton.style.cursor = 'not-allowed';
        playButton.style.opacity = '0.7';
        playButton.innerHTML = '<span class="spinner"></span> ' + (window.t('play.starting') || 'Starting...');
    }

    const cancelBtn = document.getElementById('cancelLaunchBtn');
    if (cancelBtn) {
        cancelBtn.classList.add('visible');
    }

    const revertPlayState = () => {
        window.isLaunching = false;
        if (playButton) {
            playButton.disabled = false;
            playButton.style.cursor = 'pointer';
            playButton.style.opacity = '1';
            playButton.innerHTML = playButton.dataset.originalHtml || window.t('play.play_btn') || 'Play';
        }
        if (cancelBtn) cancelBtn.classList.remove('visible');
    };

    // Ensure browser renders the spinner and cancel button with fully responsive input states
    await new Promise(r => setTimeout(r, 25));

    const selectedProfile = profileSelectElement.value;

    // Get nickname from user data
    const userData = await window.pywebview.api.get_user_json();
    const nickname = userData.username || "";

    if (!nickname) {
        revertPlayState();
        window.pywebview.api.error(window.t("toasts.login_before_play") || "You must log in before playing");
        return;
    }

    // Block Microsoft accounts if offline (verification requires internet)
    if (userData.account_type === 'microsoft' && !window.hasInternet) {
        revertPlayState();
        window.pywebview.api.error(window.t("toasts.microsoft_offline_error") || "You cannot play with a Microsoft account without an internet connection. Please use an Offline account to play offline.");
        return;
    }

    // Check for old versions (<= 1.14) running in the default launcher directory
    try {
        const profilesData = await window.pywebview.api.get_profiles();
        const profile = profilesData && profilesData.profiles ? profilesData.profiles[selectedProfile] : null;
        if (profile) {
            const defaultMcDir = (userData.mcdir || "").trim().replace(/\\/g, '/').toLowerCase();
            const profDir = (profile.directory || "").trim().replace(/\\/g, '/').toLowerCase();
            const isUsingDefaultDir = (!profDir || profDir === defaultMcDir);

            let isOldVersion = false;
            const mcVerMatch = (profile.version || "").match(/\b(?:1\.(\d+)(?:\.(\d+))?|([ab]\d+\.\d+)|\b(\d{2})w(\d{2})[a-z]\b)/i);
            if (mcVerMatch) {
                if (mcVerMatch[1]) {
                    if (parseInt(mcVerMatch[1], 10) <= 14) isOldVersion = true;
                } else if (mcVerMatch[4]) {
                    const year = parseInt(mcVerMatch[4], 10);
                    const week = parseInt(mcVerMatch[5] || "0", 10);
                    if (year < 19 || (year === 19 && week < 34)) {
                        isOldVersion = true;
                    }
                } else {
                    isOldVersion = true;
                }
            }

            if (isUsingDefaultDir && isOldVersion) {
                const continueOld = await window.pywebview.api.confirm(window.t("toasts.old_version_warning") || "You are launching an older version of Minecraft (1.14 or older) in the main launcher directory.\n\nSharing this folder with modern versions will likely cause errors or crashes.\n\nIt is strongly recommended to edit the installation and set a custom 'Game Directory'.\n\nDo you want to launch anyway?");
                if (!continueOld) {
                    revertPlayState();
                    return;
                }
            }
        }
    } catch (err) {
        console.error("Error checking old version directory warning:", err);
    }



    window.logIdleTimer = null;
    const resetLogIdleTimer = () => {
        if (!window.isLaunching || window.isSyncing) return;
        if (window.logIdleTimer) clearTimeout(window.logIdleTimer);
        window.logIdleTimer = setTimeout(() => {
            if (window.isLaunching && !window.isSyncing) {
                console.log("[Launch] 45 seconds without logs passed, considering Minecraft ready.");
                onMinecraftReady();
            }
        }, 45000);
    };
    window._resetLogIdleTimer = resetLogIdleTimer;

    // Try to launch the game
    const serverParam = window.pendingServerParam || null;
    await new Promise(r => setTimeout(r, 10));
    const result = await pywebview.api.start_game(selectedProfile, nickname, false, serverParam);
    
    if (!window.isLaunching || (result && result.status === 'cancelled')) {
        console.log('[Launch] Launch was cancelled by user, ignoring start_game result.');
        window.isLaunching = false;
        return;
    }

    if (result && result.status === 'already_launching') {
        console.log('[Launch] Launch already in progress, ignoring duplicate trigger.');
        return;
    }

    if (result.status !== "missing_files" && result.status !== "already_running") {
        window.pendingServerParam = null;
        if (result.status !== "error") {
            resetLogIdleTimer();
        }
    }

    // Handle duplicate instance
    if (result.status === "already_running") {
        const confirm = await window.pywebview.api.confirm(window.t("toasts.already_open_warning") || "Minecraft is already open. Do you want to open another instance?");
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
                    playButton.innerHTML = playButton.dataset.originalHtml || window.t('play.play_btn') || 'Play';
                }
                if (cancelBtn) cancelBtn.classList.remove('visible');
                return;
            } else {
                resetLogIdleTimer();
            }
        } else {
            // Revert state
            window.isLaunching = false;
            if (playButton) {
                playButton.disabled = false;
                playButton.style.cursor = 'pointer';
                playButton.style.opacity = '1';
                playButton.innerHTML = playButton.dataset.originalHtml || window.t('play.play_btn') || 'Play';
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
            playButton.innerHTML = playButton.dataset.originalHtml || window.t('play.play_btn') || 'Play';
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
    } else if (msg === "Game Ready") {
        onMinecraftReady();
    } else {
        // Reset 45s idle timer on any game log while launching
        if (window.isLaunching && !window.isSyncing && window._resetLogIdleTimer) {
            window._resetLogIdleTimer();
        }
    }
});

// Reset play button when launch fails (JVM errors, missing files, etc.)
window.addEventListener('error', (e) => {
    const msg = String(e.detail);
    if (msg.includes('Launch Failed') || msg.includes('Process Error')) {
        if (window.logIdleTimer) { clearTimeout(window.logIdleTimer); window.logIdleTimer = null; }
        window.isLaunching = false;

        const playButton = document.querySelector('.play-button');

        if (playButton) {

            playButton.disabled = false;

            playButton.style.cursor = 'pointer';

            playButton.style.opacity = '1';

            playButton.innerHTML = playButton.dataset.originalHtml || window.t('play.play_btn') || 'Play';

        }

        const cancelBtn = document.getElementById('cancelLaunchBtn');

        if (cancelBtn) cancelBtn.classList.remove('visible');

    }

});



function formatVersionName(versionId) {
    if (!versionId) return 'Unknown Version';
    if (/^(?:Fabric|Forge|NeoForge|Vanilla|OptiFine)\b/i.test(versionId)) {
        return versionId;
    }
    const lower = versionId.toLowerCase();
    let software = 'Vanilla';
    if (lower.includes('neoforge')) software = 'NeoForge';
    else if (lower.includes('forge')) software = 'Forge';
    else if (lower.includes('fabric')) software = 'Fabric';
    else if (lower.includes('optifine')) software = 'OptiFine';

    if (software === 'Vanilla') return `Vanilla ${versionId.replace(/^vanilla\s+/i, '').trim()}`;

    const matches = versionId.match(/\b\d+\.\d+(?:\.\d+)?(?:-[a-zA-Z][a-zA-Z0-9\.]+)?\b/g) || [];
    const mc = matches.find(m => m.startsWith('1.')) || matches[0] || versionId;
    const loader = matches.find(m => m !== mc) || '';

    return loader ? `${software} ${mc} (${loader})` : `${software} ${mc}`;
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

        

        const taskName = task.displayName || task.name;
        updateTaskStatus(i, '<i class="fas fa-spinner fa-spin"></i>', window.t('loader.downloading_simple') || 'Downloading...', 'downloading');
        progressText.textContent = window.t('loader.downloading_name', { name: taskName }) || `Downloading ${taskName}...`;
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

                        progressText.textContent = window.translateTask ? window.translateTask(e.detail.task) : `${e.detail.task || 'Downloading'}...`;

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

            window.pywebview.api.error(window.t("toasts.download_failed", {err: err.message}) || `Failed to download: ${err.message}`);

            modal.classList.remove('show');

            // Revert Play Button

            const playBtn = document.querySelector('.play-button');

            if (playBtn) {

                playBtn.disabled = false;

                playBtn.style.cursor = 'pointer';

                playBtn.style.opacity = '1';

                playBtn.innerHTML = playBtn.dataset.originalHtml || window.t('play.play_btn') || 'Play';

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

    

    progressText.textContent = window.t('loader.all_done') || "All done! Launching game...";

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
    if (window.logIdleTimer) { clearTimeout(window.logIdleTimer); window.logIdleTimer = null; }
    window.isLaunching = false;

    const playButton = document.querySelector('.play-button');

    if (playButton) {

        playButton.innerHTML = window.t('play.playing') || 'Playing';

        playButton.disabled = false;

        playButton.style.cursor = 'pointer';

        playButton.style.opacity = '1';

    }

    const cancelBtn = document.getElementById('cancelLaunchBtn');

    if (cancelBtn) cancelBtn.classList.remove('visible');

}



// Callback when Minecraft closes
function onMinecraftClosed() {
    if (window.logIdleTimer) { clearTimeout(window.logIdleTimer); window.logIdleTimer = null; }
    window.isLaunching = false;

    const playButton = document.querySelector('.play-button');

    if (playButton) {

        playButton.innerHTML = window.t('play.play_btn') || 'Play';

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

    if (interval > 1) return window.t('time.years_ago').replace('{n}', Math.floor(interval));

    interval = seconds / 2592000;

    if (interval > 1) return window.t('time.months_ago').replace('{n}', Math.floor(interval));

    interval = seconds / 86400;

    if (interval > 1) return window.t('time.days_ago').replace('{n}', Math.floor(interval));

    interval = seconds / 3600;

    if (interval > 1) return window.t('time.hours_ago').replace('{n}', Math.floor(interval));

    interval = seconds / 60;

    if (interval > 1) return window.t('time.minutes_ago').replace('{n}', Math.floor(interval));

    return window.t('time.few_seconds');

}



async function loadVersions() {

    // Stub: version selection is now handled via the profile modal's software/MC/loader dropdowns.

    // Kept for compatibility with download-listeners.js background updates.

    console.log('[loadVersions] stub called');

}



window.loadOptions = async function loadOptions() {

    const seq = ++loadOptionsSeq;

    const profilesData = await window.pywebview.api.get_profiles();

    if (seq !== loadOptionsSeq) return; // Abort if a newer call started

    profiles = profilesData.profiles;



    const wasOpen = selectOptions && selectOptions.classList.contains('active');
    const currentSelectedId = originalSelect ? originalSelect.value : null;

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

            if (versionLower.includes('neoforge') || p.type === 'neoforge') type = 'neoforge';

            else if (versionLower.includes('forge') || p.type === 'forge') type = 'forge';

            else if (versionLower.includes('fabric') || p.type === 'fabric') type = 'fabric';



            return type === activeProfileFilter;

        })

        : profilesArray;



    const displayProfiles = activeProfileFilter ? filteredProfiles : profilesArray;





    if (profilesArray.length === 0) {

        // No hay perfiles: Ocultar icono y mostrar opción de crear

        if (document.getElementById('selectedIcon')) {

            document.getElementById('selectedIcon').style.display = 'none';

        }

        if (document.getElementById('selectedTitle')) {
            const titleEl = document.getElementById('selectedTitle');
            titleEl.textContent = window.t ? window.t('play.no_installations') : "No installations found";
            titleEl.setAttribute('data-i18n', 'play.no_installations');
        }

        if (document.getElementById('selectedSubtitle')) {
            const subtitleEl = document.getElementById('selectedSubtitle');
            subtitleEl.textContent = window.t ? window.t('play.create_installation') : "Create an installation to play";
            subtitleEl.setAttribute('data-i18n', 'play.create_installation');
        }



        if (selectOptions) {

            const createOption = document.createElement('div');

            createOption.className = 'select-option';

            createOption.innerHTML = `

                <div class="option-icon" style="display: flex; align-items: center; justify-content: center; font-size: 24px; color: #fff; background: rgba(255, 255, 255, 0.1);"><i class="fas fa-plus"></i></div>

                <div class="option-content">

                    <div class="option-title" data-i18n="global.create_installation">${(window.t ? window.t('global.create_installation') : '') || 'Create New Installation'}</div>

                    <div class="option-subtitle" data-i18n="play.create_installation">${(window.t ? window.t('play.create_installation') : '') || 'Click to get started'}</div>

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

                let translationKey = 'installations.no_installations_found';
                if (activeProfileFilter === 'vanilla') translationKey = 'installations.no_vanilla_installations_found';
                else if (activeProfileFilter === 'modded') translationKey = 'installations.no_modded_installations_found';
                emptyMsg.innerHTML = `<i class="fas fa-filter"></i> ${window.t(translationKey) || `No ${activeProfileFilter} installations found`}`;



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

                if (versionLower.includes('neoforge') || profile.type === 'neoforge') type = 'neoforge';

                else if (versionLower.includes('forge') || profile.type === 'forge') type = 'forge';

                else if (versionLower.includes('fabric') || profile.type === 'fabric') type = 'fabric';



                const isNeoForgeActive = activeProfileFilter === 'neoforge' ? 'active' : '';
                const isForgeActive = activeProfileFilter === 'forge' ? 'active' : '';
                const isFabricActive = activeProfileFilter === 'fabric' ? 'active' : '';
                const isVanillaActive = activeProfileFilter === 'vanilla' ? 'active' : '';



                if (type === 'neoforge') tags = `<span class="option-tag neoforge ${isNeoForgeActive}" onclick="filterProfiles('neoforge', event)">NEOFORGE</span>`;

                else if (type === 'forge') tags = `<span class="option-tag forge ${isForgeActive}" onclick="filterProfiles('forge', event)">FORGE</span>`;

                else if (type === 'fabric') tags = `<span class="option-tag fabric ${isFabricActive}" onclick="filterProfiles('fabric', event)">FABRIC</span>`;

                else tags = `<span class="option-tag ${isVanillaActive}" onclick="filterProfiles('vanilla', event)">VANILLA</span>`;



                if (profile.mods) tags += `<span class="option-tag">${profile.mods} MODS</span>`;



                const iconUrl = await window.pywebview.api.get_profile_icon(profile.icon);

                profile.iconUrl = iconUrl;



                const lastPlayedText = profile.last_played ? timeAgo(profile.last_played) : (window.t('time.never') || 'Never');



                option.innerHTML = `

                    <img src="${iconUrl}" alt="" class="option-icon">

                    <div class="option-content">

                        <div class="option-title">${profile.name}</div>

                        <div class="option-subtitle">${profile.version} • ${window.t('play.last_played')}: ${lastPlayedText}</div>

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
            const existingProfile = currentSelectedId ? profilesArray.find(p => p.id === currentSelectedId) : null;
            const profileToSelect = existingProfile || profilesArray[0];
            if (profileToSelect) {
                if (existingProfile) {
                    if (originalSelect) originalSelect.value = profileToSelect.id;
                    const lastPlayedText = profileToSelect.last_played ? timeAgo(profileToSelect.last_played) : (window.t('time.never') || 'Never');
                    if (document.getElementById('selectedIcon')) {
                        const iconEl = document.getElementById('selectedIcon');
                        const iconSrc = profileToSelect.iconUrl || (window.resolveImageSource ? window.resolveImageSource(profileToSelect.icon) : null);
                        if (iconSrc && (iconSrc.startsWith('data:') || iconSrc.startsWith('http') || iconSrc.startsWith('launcher://'))) {
                            iconEl.src = iconSrc;
                            iconEl.style.display = 'block';
                        } else {
                            iconEl.style.display = 'none';
                        }
                    }
                    if (document.getElementById('selectedTitle')) {
                        const titleEl = document.getElementById('selectedTitle');
                        titleEl.textContent = profileToSelect.name;
                        titleEl.removeAttribute('data-i18n');
                    }
                    if (document.getElementById('selectedSubtitle')) {
                        const subtitleEl = document.getElementById('selectedSubtitle');
                        subtitleEl.textContent = `${profileToSelect.version} \u2022 ${window.t('play.last_played')}: ${lastPlayedText}`;
                        subtitleEl.removeAttribute('data-i18n');
                    }
                    document.querySelectorAll('.select-option').forEach(opt => opt.classList.remove('selected'));
                    const selectedOpt = document.querySelector(`[data-value="${profileToSelect.id}"]`);
                    if (selectedOpt) selectedOpt.classList.add('selected');
                    if (wasOpen) {
                        if (selectTrigger) selectTrigger.classList.add('active');
                        if (selectOptions) selectOptions.classList.add('active');
                    }
                } else {
                    selectOption(profileToSelect.id, profileToSelect);
                }
            }
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



async function selectOption(id, profile) {
    if (!profile) return;
    if (originalSelect) originalSelect.value = id;
    if (typeof lastUserSelectedAddonProfile !== 'undefined') lastUserSelectedAddonProfile = id;
    if (typeof currentModsProfile !== 'undefined') currentModsProfile = id;

    const lastPlayedText = profile.last_played ? timeAgo(profile.last_played) : (window.t('time.never') || 'Never');

    const iconEl = document.getElementById('selectedIcon');
    if (iconEl) {
        if (!profile.iconUrl && profile.icon) {
            try {
                const iconData = await window.pywebview.api.get_profile_icon(profile.icon);
                if (iconData) {
                    profile.iconUrl = window.resolveImageSource ? window.resolveImageSource(iconData) : iconData;
                }
            } catch (_) {}
        }

        const resolved = profile.iconUrl || (window.resolveImageSource ? window.resolveImageSource(profile.icon) : null);
        if (resolved && (resolved.startsWith('data:') || resolved.startsWith('http') || resolved.startsWith('launcher://'))) {
            iconEl.src = resolved;
            iconEl.style.display = 'block';
        } else {
            iconEl.style.display = 'none';
        }
    }

    if (document.getElementById('selectedTitle')) {
        const titleEl = document.getElementById('selectedTitle');
        titleEl.textContent = profile.name;
        titleEl.removeAttribute('data-i18n');
    }

    if (document.getElementById('selectedSubtitle')) {
        const subtitleEl = document.getElementById('selectedSubtitle');
        subtitleEl.textContent = `${profile.version} \u2022 ${window.t('play.last_played')}: ${lastPlayedText}`;
        subtitleEl.removeAttribute('data-i18n');
    }

    document.querySelectorAll('.select-option').forEach(opt => {
        opt.classList.remove('selected');
    });

    const selectedOpt = document.querySelector(`[data-value="${id}"]`);
    if (selectedOpt) selectedOpt.classList.add('selected');

    closeSelect();
    if (originalSelect) originalSelect.dispatchEvent(new Event('change'));
}
window.selectOption = selectOption;
window.launchGame = launchGame;

async function launchProfileById(profileId) {
    if (!profileId) return;
    console.log('[AutoLaunch] Launching profile by id:', profileId);

    if (typeof showSection === 'function') {
        showSection('play');
    }

    try {
        let profilesData = await window.pywebview.api.get_profiles();
        let profile = profilesData && profilesData.profiles ? profilesData.profiles[profileId] : null;

        if (!profile && typeof loadProfiles === 'function') {
            await loadProfiles();
            profilesData = await window.pywebview.api.get_profiles();
            profile = profilesData && profilesData.profiles ? profilesData.profiles[profileId] : null;
        }

        if (profile) {
            if (!profile.iconUrl && profile.icon) {
                try {
                    const iconData = await window.pywebview.api.get_profile_icon(profile.icon);
                    if (iconData) {
                        profile.iconUrl = window.resolveImageSource ? window.resolveImageSource(iconData) : iconData;
                    }
                } catch (_) {}
            }

            await selectOption(profileId, profile);

            if (window.isLaunching) {
                console.log('[AutoLaunch] Launcher is already launching a game, ignoring duplicate launch');
                return;
            }
            setTimeout(() => {
                if (typeof launchGame === 'function') {
                    launchGame();
                }
            }, 250);
        } else {
            console.warn('[AutoLaunch] Profile not found:', profileId);
        }
    } catch (err) {
        console.error('[AutoLaunch] Error launching profile:', err);
    }
}
window.launchProfileById = launchProfileById;




function toggleSelect() {

    toggleCustomSelect(customSelect);

}



function closeSelect() {

    closeAllCustomSelects();

}



if (selectTrigger) {



    // Local file actions

    const btnOpenFolder = document.getElementById('btnOpenAddonsFolder');

    const btnImport = document.getElementById('btnImportLocalAddon');



    if (btnOpenFolder) btnOpenFolder.addEventListener('click', openAddonsFolder);

    if (btnImport) btnImport.addEventListener('click', importLocalAddonFile);

    selectTrigger.addEventListener('click', (e) => {

        e.stopPropagation();

        toggleCustomSelect(customSelect);

    });

}



document.addEventListener('click', (e) => {

    if (!e.target.closest('.custom-select')) {

        closeAllCustomSelects();

    }

});



const modsSelectTrigger = document.getElementById('modsSelectTrigger');

const modsCustomSelect = document.getElementById('modsCustomSelect');

if (modsSelectTrigger && modsCustomSelect) {

    modsSelectTrigger.addEventListener('click', (e) => {

        e.stopPropagation();

        toggleCustomSelect(modsCustomSelect);

    });

}



const worldSelectTrigger = document.getElementById('worldSelectTrigger');

const worldCustomSelect = document.getElementById('worldCustomSelect');

if (worldSelectTrigger && worldCustomSelect) {

    worldSelectTrigger.addEventListener('click', (e) => {

        e.stopPropagation();

        toggleCustomSelect(worldCustomSelect);

    });

}



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

        const lastPlayedText = profile.last_played ? timeAgo(profile.last_played) : (window.t('time.never') || 'Never');



        const isReserved = isReservedProfileName(profile.name);



        const item = document.createElement("div");

        item.className = "profile-card";

        item.innerHTML = `

            <img src="${iconUrl}" id="profile-img">

            <div class="profile-info">

                <h3>${profile.name}</h3>

                <p>${profile.version} &bull; ${window.t('play.last_played')}: ${lastPlayedText}</p>

            </div>

            <div class="profile-actions">
                <button class="btn-secondary btn-small btn-action-square shortcut-btn" title="${window.t('installations.shortcut_btn') || 'Crear acceso directo en Escritorio e Inicio'}"><i class="fas fa-desktop"></i></button>
                ${isReserved ? '' : `
                <button class="btn-secondary btn-small btn-action-square edit-btn" title="${window.t('installations.edit_btn') || 'Editar'}"><i class="fas fa-edit"></i></button>
                <button class="btn-danger btn-small btn-action-square delete-btn" title="${window.t('installations.delete_btn') || 'Eliminar'}"><i class="fas fa-trash"></i></button>
                `}
            </div>
        `;

        const shortcutBtn = item.querySelector('.shortcut-btn');
        const editBtn = item.querySelector('.edit-btn');
        const deleteBtn = item.querySelector('.delete-btn');

        if (shortcutBtn) {
            shortcutBtn.onclick = async (e) => {
                e.stopPropagation();
                try {
                    shortcutBtn.disabled = true;
                    shortcutBtn.style.opacity = '0.6';
                    const res = await window.pywebview.api.create_profile_shortcut(id, profile.name, profile.icon);
                    if (res && res.success) {
                        showToast(window.t('installations.shortcut_created') || 'Acceso directo creado en el Escritorio y Menú Inicio', 'success');
                    } else {
                        showToast((res && res.error) || window.t('installations.shortcut_failed') || 'Error al crear el acceso directo', 'error');
                    }
                } catch (err) {
                    console.error('Error creating profile shortcut:', err);
                    showToast(err.message || window.t('installations.shortcut_failed') || 'Error al crear el acceso directo', 'error');
                } finally {
                    shortcutBtn.disabled = false;
                    shortcutBtn.style.opacity = '1';
                }
            };
        }

        if (editBtn) {
            editBtn.onclick = (e) => {
                e.stopPropagation();
                openEditProfileModal(id, profile);
            };
        }

        if (deleteBtn) {
            deleteBtn.onclick = async (e) => {
                e.stopPropagation();
                const confirmed = await window.pywebview.api.confirm(window.t('installations.delete_confirm', { name: profile.name }));
                if (confirmed) {
                    const result = await window.pywebview.api.delete_profile(id);
                    if (result.success) {
                        await loadProfiles();
                        await loadOptions();
                        await loadModdableProfiles();
                    } else {
                        window.pywebview.api.error(result.error || window.t('installations.delete_failed'));
                    }
                }
            };
        }



        item.onclick = () => {

            console.log("Installation selected:", id);

        };



        list.appendChild(item);

    }

}



function showSection(sectionId) {
    if (sectionId === 'skins') {
        const skinsBtn = document.getElementById('skinsSidebarBtn');
        if (skinsBtn && skinsBtn.classList.contains('locked-feature')) {
            const modal = document.getElementById('featureLockedSkinsModal');
            if (modal) modal.classList.add('show');
            return;
        }
    }

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
        let basePath = '';
        if (window.hwlAPI && window.hwlAPI.getDocumentsPath) {
            basePath = await window.hwlAPI.getDocumentsPath();
        } else if (window.pywebview && window.pywebview.api && window.pywebview.api.getDocumentsPath) {
            basePath = await window.pywebview.api.getDocumentsPath();
        }

        if (document.getElementById('profileDir')) {
            if (basePath) {
                // Ensure proper slash direction for the system path, fallback to forward slash
                const separator = basePath.includes('\\') ? '\\' : '/';
                const uuid = crypto.randomUUID();
                document.getElementById('profileDir').value = `${basePath}${separator}MinecraftDirectories${separator}${uuid}`;
            } else {
                const userData = await window.pywebview.api.get_user_json();
                document.getElementById('profileDir').value = userData.mcdir || '';
            }
        }
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

    if (acceptProfileBtn) {
        acceptProfileBtn.textContent = (window.t ? window.t('installations.create_btn') : 'Create');
        acceptProfileBtn.setAttribute('data-i18n', 'installations.create_btn');
    }

    const modalTitleEl = document.getElementById('modalTitleText') || document.querySelector('#modal span[data-i18n*="title"], #modal h2');
    if (modalTitleEl) {
        modalTitleEl.textContent = (window.t ? window.t('installations.create_title') : 'Create New Installation');
        modalTitleEl.setAttribute('data-i18n', 'installations.create_title');
    }

}



async function openEditProfileModal(id, profile) {

    editingProfileId = id;



    // 1. Immediately set all inputs synchronously to profile data (no default/UUID glitches during animation)

    if (document.getElementById('profileName')) document.getElementById('profileName').value = profile.name || '';

    if (document.getElementById('profileJVMArgs')) document.getElementById('profileJVMArgs').value = profile.jvm_args || '';

    if (document.getElementById('profileDir')) document.getElementById('profileDir').value = profile.directory || '';

    if (document.getElementById('profileJavaPath')) document.getElementById('profileJavaPath').value = profile.java_path || '';



    if (acceptProfileBtn) {

        acceptProfileBtn.textContent = (window.t ? window.t('global.save_changes') : 'Save Changes');

        acceptProfileBtn.setAttribute('data-i18n', 'global.save_changes');

    }



    const editModalTitleEl = document.getElementById('modalTitleText') || document.querySelector('#modal span[data-i18n*="title"], #modal h2');
    if (editModalTitleEl) {
        editModalTitleEl.textContent = (window.t ? window.t('installations.edit_title') : 'Edit Installation');
        editModalTitleEl.setAttribute('data-i18n', 'installations.edit_title');
    }



    // 2. Parse version string into software / MC version / loader version

    const ver = profile.version || '';

    let software = 'vanilla';

    let mcVersion = ver;

    let loaderVersion = '';



    const lowerVer = ver.toLowerCase();

    const prefixMatch = ver.match(/^(Vanilla|Fabric|Forge|NeoForge|OptiFine)\b/i);

    if (prefixMatch) {

        software = prefixMatch[1].toLowerCase();

        if (software === 'neoforge') software = 'neoforge';

        if (software === 'optifine') software = 'optifine';

        const parenMatch = ver.match(/^([^\s]+)\s+([^\s(]+)(?:\s+\(([^)]+)\))?/i);

        if (parenMatch) {

            mcVersion = parenMatch[2].trim();

            loaderVersion = parenMatch[3] ? parenMatch[3].trim() : '';

        }

    } else if (lowerVer.includes('neoforge')) {

        software = 'neoforge';

        const parts = ver.replace(/neoforge-?/i, '').split('-');

        mcVersion = parts[0] || '';

        loaderVersion = parts.slice(1).join('-');

    } else if (lowerVer.includes('forge')) {

        software = 'forge';

        const parts = ver.replace(/forge-?/i, '').split('-');

        mcVersion = parts[0] || '';

        loaderVersion = parts.slice(1).join('-');

    } else if (lowerVer.includes('fabric')) {

        software = 'fabric';

        if (lowerVer.startsWith('fabric-loader-')) {

            const parts = ver.split('-');

            if (parts.length >= 4) { loaderVersion = parts[2]; mcVersion = parts[3]; }

        } else {

            const parts = ver.replace(/fabric-?/i, '').split('-');

            mcVersion = parts[0] || '';

            loaderVersion = parts.slice(1).join('-');

        }

    } else if (lowerVer.includes('optifine')) {

        software = 'optifine';

        const parts = ver.replace(/optifine-?(?:hd-?)?(?:u-?)?/i, '').split('_');

        if (parts.length >= 2) {

            mcVersion = parts[0].trim();

            loaderVersion = parts.slice(1).join('_').trim();

        }

    } else {

        software = 'vanilla';

        mcVersion = ver.replace(/^vanilla\s+/i, '').trim();

    }



    if (profileSoftwareSelect) profileSoftwareSelect.value = software;

    currentProfileSoftware = software;



    // Immediately pre-populate selectors with the current version so they never show empty or 'vanilla' defaults

    if (profileMcVersionSelect) {

        profileMcVersionSelect.innerHTML = `<option value="${mcVersion}">${mcVersion}</option>`;

        profileMcVersionSelect.value = mcVersion;

    }

    if (software !== 'vanilla') {

        if (profileLoaderVersionSelect) {

            profileLoaderVersionSelect.disabled = false;

            if (loaderVersion) {

                profileLoaderVersionSelect.innerHTML = `<option value="${loaderVersion}">${loaderVersion}</option>`;

                profileLoaderVersionSelect.value = loaderVersion;

            } else {

                profileLoaderVersionSelect.innerHTML = '<option value="">Select a loader...</option>';

            }

        }

    } else {

        if (profileLoaderVersionSelect) {

            profileLoaderVersionSelect.innerHTML = '<option value="">Select a loader...</option>';

            profileLoaderVersionSelect.disabled = true;

        }

    }



    // 3. Immediately set current icon preview
    selectedImageData = profile.icon || 'default.png';
    const iconToLoad = profile.icon || 'default.png';

    if (iconToLoad.startsWith('data:') || iconToLoad.startsWith('http')) {
        if (iconPreview) {
            iconPreview.src = iconToLoad;
            iconPreview.style.display = 'block';
        }
        if (placeholderIcon) placeholderIcon.style.display = 'none';
    } else {
        window.pywebview.api.get_profile_icon(iconToLoad).then(url => {
            if (iconPreview && editingProfileId === id && url) {
                iconPreview.src = url;
                iconPreview.style.display = 'block';
                if (placeholderIcon) placeholderIcon.style.display = 'none';
            }
        }).catch(() => {});
    }

    // 4. Open modal now with all profile values completely set
    if (profileModal) profileModal.classList.add('show');

    // 5. Populate dropdown options in the background without disturbing the selected values
    try {
        await loadProfileMcVersions(software);
        if (profileMcVersionSelect) profileMcVersionSelect.value = mcVersion;

        if (software !== 'vanilla') {
            await loadProfileLoaderVersions(software, mcVersion);
            if (profileLoaderVersionSelect && loaderVersion) {
                profileLoaderVersionSelect.value = loaderVersion;
            }
        }
    } catch (e) {
        console.error("Error loading background profile options:", e);
    }
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

    });

}



if (acceptProfileBtn) {

    acceptProfileBtn.addEventListener('click', async () => {

        const profileNameInput = document.getElementById('profileName');

        const profileName = profileNameInput ? profileNameInput.value.trim() : "";



        if (!profileName) {

            window.pywebview.api.error(window.t("toasts.install_name_required") || "Installation name is required");

            return;

        }



        if (isReservedProfileName(profileName)) {

            window.pywebview.api.error(window.t("toasts.name_reserved") || "This name is reserved for automatic installations.");

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
        if (software === 'vanilla') {
            profileVersion = `Vanilla ${mcVersion}`;
        } else if (software === 'forge' && loaderVersion) {
            profileVersion = `Forge ${mcVersion} (${loaderVersion})`;
        } else if (software === 'fabric' && loaderVersion) {
            profileVersion = `Fabric ${mcVersion} (${loaderVersion})`;
        } else if (software === 'neoforge' && loaderVersion) {
            profileVersion = `NeoForge ${mcVersion} (${loaderVersion})`;
        } else if (software === 'optifine' && loaderVersion) {
            profileVersion = `OptiFine ${mcVersion} (${loaderVersion})`;
        }



        // Validación

        const missingFields = [];

        const trimmedName = profileName.trim();



        if (!trimmedName) {

            missingFields.push("Installation Name");

        } else if (trimmedName.length < 2) {

            window.pywebview.api.error(window.t('toasts.name_too_short') || 'Installation name must be at least 2 characters');

            return;

        }

        if (!mcVersion) missingFields.push("Minecraft Version");

        if (software !== 'vanilla' && !loaderVersion) missingFields.push("Loader Version");

        if (!profileDir.trim()) missingFields.push("Directory");



        if (missingFields.length > 0) {

            window.pywebview.api.error(window.t('toasts.fields_empty', {fields: '- ' + missingFields.join('\n- ')}) || `You cannot leave these fields empty:\n- ${missingFields.join('\n- ')}`);

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

                } else {

                    window.pywebview.api.error(result.message);

                }

            } catch (error) {

                console.error('Error creating installation:', error);

                window.pywebview.api.error(window.t('toasts.error_creating_installation') || 'Error creating installation');

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

            } else if (type === 'neoforge') {

                versions = await window.pywebview.api.get_neoforge_mc_versions();

            } else if (type === 'optifine') {
                if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.get_optifine_versions === 'function') {
                    versions = await window.pywebview.api.get_optifine_versions();
                } else {
                    versions = [];
                }
            }
            versionCache[type] = versions;

        }



        profileMcVersionSelect.innerHTML = '';

        if (versions.length === 0) {

            profileMcVersionSelect.innerHTML = `<option value="">${window.t('installations.no_versions_found') || 'No versions found'}</option>`;

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



// Function to translate dynamic progress tasks from Python
window.translateTask = function(task) {
    if (!task) return window.t('loader.downloading_simple') || 'Downloading...';
    // Remove trailing dots for matching
    let baseTask = task;
    if (task.endsWith('...')) baseTask = task.slice(0, -3);
    
    const map = {
        'Downloading assets': 'loader.downloading_assets',
        'Downloading libraries': 'loader.downloading_libraries',
        'Downloading natives': 'loader.downloading_natives',
        'Downloading Fabric installation': 'loader.downloading_fabric',
        'Downloading Forge installer': 'loader.downloading_forge',
        'Downloading NeoForge installer': 'loader.downloading_neoforge',
        'Downloading OptiFine installation': 'loader.downloading_optifine',
        'Downloading': 'loader.downloading_simple',
        'Extracting': 'loader.extracting'
    };
    
    if (map[baseTask]) {
        return (window.t(map[baseTask]) || baseTask) + '...';
    }
    
    // If it starts with Downloading but doesn't match above, we can try to inject it
    if (baseTask.startsWith('Downloading ')) {
        const item = baseTask.replace('Downloading ', '');
        return window.t('loader.downloading_name', { name: item }) || `${baseTask}...`;
    }
    
    return task + (task.endsWith('...') ? '' : '...');
};

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



        if (gdpTitle) gdpTitle.textContent = window.t('loader.downloading_name', { name: version }) || `Downloading ${version}...`;

        if (gdpProgressBar) gdpProgressBar.style.width = `${percentage}%`;

        if (gdpTask) gdpTask.textContent = window.translateTask ? window.translateTask(status) : (status || 'Downloading...');

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

        window.pywebview.api.info(window.t("toasts.version_installed_success", {version: version}) || `Version ${version} installed successfully.`);

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
const loginForgotPasswordScreen = document.getElementById('loginForgotPasswordScreen');



function clearLoginFields() {

    const fields = ['hwEmail', 'hwPassword', 'nickname', 'hwForgotEmail'];

    fields.forEach(id => {

        const el = document.getElementById(id);

        if (el) el.value = '';

    });

    const errorEl = document.getElementById('hwLoginError');

    if (errorEl) errorEl.style.display = 'none';

    const forgotMsgEl = document.getElementById('hwForgotMsg');

    if (forgotMsgEl) forgotMsgEl.style.display = 'none';

}



function showLoginMethodScreen() {

    clearLoginFields();

    if (loginMethodScreen) loginMethodScreen.classList.add('active');

    if (loginOfflineScreen) loginOfflineScreen.classList.remove('active');

    if (loginHelloWorldScreen) loginHelloWorldScreen.classList.remove('active');

    if (loginForgotPasswordScreen) loginForgotPasswordScreen.classList.remove('active');

}



function showLoginOfflineScreen() {

    if (loginMethodScreen) loginMethodScreen.classList.remove('active');

    if (loginOfflineScreen) loginOfflineScreen.classList.add('active');

    if (loginHelloWorldScreen) loginHelloWorldScreen.classList.remove('active');

    if (loginForgotPasswordScreen) loginForgotPasswordScreen.classList.remove('active');

}



function showLoginHelloWorldScreen() {

    if (loginMethodScreen) loginMethodScreen.classList.remove('active');

    if (loginOfflineScreen) loginOfflineScreen.classList.remove('active');

    if (loginHelloWorldScreen) loginHelloWorldScreen.classList.add('active');

    if (loginForgotPasswordScreen) loginForgotPasswordScreen.classList.remove('active');

}



function showLoginForgotPasswordScreen() {

    clearLoginFields();

    if (loginMethodScreen) loginMethodScreen.classList.remove('active');

    if (loginOfflineScreen) loginOfflineScreen.classList.remove('active');

    if (loginHelloWorldScreen) loginHelloWorldScreen.classList.remove('active');

    if (loginForgotPasswordScreen) loginForgotPasswordScreen.classList.add('active');

}



// View Own Profile
const viewOwnProfileBtn = document.getElementById('viewOwnProfileBtn');

if (viewOwnProfileBtn) {
    viewOwnProfileBtn.addEventListener('click', async (e) => {
        e.stopPropagation();

        const badge = document.getElementById('userBadge');
        if (badge) badge.classList.remove('active');

        // Check if button is disabled (unverified account)
        if (viewOwnProfileBtn.disabled || viewOwnProfileBtn.classList.contains('btn-disabled')) {
            e.preventDefault();
            return;
        }

        if (typeof window.viewOwnProfile === 'function') {
            await window.viewOwnProfile();
        } else if (typeof window.viewUserProfile === 'function') {
            try {
                const apiObj = (window.pywebview && window.pywebview.api) || window.electronAPI;
                if (apiObj && apiObj.social_get_auth) {
                    const auth = await apiObj.social_get_auth();
                    if (auth && auth.success && auth.uid) {
                        await window.viewUserProfile(auth.uid, auth.username);
                    }
                }
            } catch (err) {
                console.error('Error viewing own profile:', err);
            }
        }
    });
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

        const dashboardUrl = "https://abeloskyyy.github.io/HelloWorld-Launcher/settings/";

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

            window.pywebview.api.error(window.t('toasts.username_invalid') || 'Username must be 3-16 characters and contain only letters, numbers, and underscores.');

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



const hwForgotPasswordLink = document.getElementById('hwForgotPasswordLink');

if (hwForgotPasswordLink) {

    hwForgotPasswordLink.addEventListener('click', (e) => {

        e.preventDefault();

        showLoginForgotPasswordScreen();

    });

}



const hwForgotBackBtn = document.getElementById('hwForgotBackBtn');

if (hwForgotBackBtn) {

    hwForgotBackBtn.addEventListener('click', () => {

        showLoginHelloWorldScreen();

    });

}



const hwForgotSubmitBtn = document.getElementById('hwForgotSubmitBtn');

const hwForgotMsg = document.getElementById('hwForgotMsg');

if (hwForgotSubmitBtn) {

    hwForgotSubmitBtn.addEventListener('click', async () => {

        const email = document.getElementById('hwForgotEmail').value.trim();

        if (!email) {

            hwForgotMsg.textContent = window.t ? window.t('settings.fill_fields') || "Please enter your email." : "Please enter your email.";

            hwForgotMsg.style.display = 'block';

            hwForgotMsg.style.color = '#ff4444';

            hwForgotMsg.style.background = 'rgba(255, 68, 68, 0.1)';

            return;

        }

        

        hwForgotMsg.style.display = 'none';

        hwForgotSubmitBtn.disabled = true;

        hwForgotSubmitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';

        

        try {

            if (window._launcherFirebase && window._launcherFirebase.sendPasswordResetEmail && window._launcherFirebase.fbAuth) {

                await window._launcherFirebase.sendPasswordResetEmail(window._launcherFirebase.fbAuth, email);

                hwForgotMsg.textContent = window.t ? window.t('toasts.success') || "A password reset link has been sent to your email." : "A password reset link has been sent to your email.";

                hwForgotMsg.style.color = '#4CAF50';

                hwForgotMsg.style.background = 'rgba(76, 175, 80, 0.1)';

                hwForgotMsg.style.display = 'block';

            } else {

                throw new Error("Firebase auth not available in launcher context.");

            }

        } catch (e) {

            let msg = e.message || "Error sending reset email.";

            if (e.code === 'auth/user-not-found') msg = "No user found with this email.";

            else if (e.code === 'auth/invalid-email') msg = "Invalid email format.";

            

            hwForgotMsg.textContent = msg;

            hwForgotMsg.style.color = '#ff4444';

            hwForgotMsg.style.background = 'rgba(255, 68, 68, 0.1)';

            hwForgotMsg.style.display = 'block';

        } finally {

            hwForgotSubmitBtn.disabled = false;

            hwForgotSubmitBtn.innerHTML = 'Send Link';

        }

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



// Enter key navigation for login screens

const _hwEmail = document.getElementById('hwEmail');
const _hwPassword = document.getElementById('hwPassword');
const _nickInput = document.getElementById('nickname');
const _hwForgotEmailInput = document.getElementById('hwForgotEmail');

if (_hwEmail) {
    _hwEmail.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (_hwPassword) _hwPassword.focus();
        }
    });
}

if (_hwPassword) {
    _hwPassword.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (hwLoginBtn) hwLoginBtn.click();
        }
    });
}

if (_nickInput) {
    _nickInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const _saveOfflineBtn = document.getElementById('saveOfflineBtn');
            if (_saveOfflineBtn) _saveOfflineBtn.click();
        }
    });
}

if (_hwForgotEmailInput) {
    _hwForgotEmailInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (hwForgotSubmitBtn) hwForgotSubmitBtn.click();
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

        

        // Always redirect to play page when logging out
        if (typeof showSection === 'function') {
            showSection('play');
        }



        // Clear settings inputs

        if (document.getElementById("nickname")) document.getElementById("nickname").value = "";

        

        console.log('[Auth] Logout complete and UI refreshed');



    } catch (error) {

        console.error('Error logging out:', error);

        if (window.pywebview && window.pywebview.api && window.pywebview.api.error) {

            window.pywebview.api.error(window.t('toasts.logout_error') || 'Error logging out');

        }

    }

};



// ══════════════════════════════════════════════════════
// Account Switcher
// ══════════════════════════════════════════════════════

const switchAccountBtn = document.getElementById('switchAccountBtn');

// Helper: get avatar URL for an account (for use in the switcher UI)
function getAccountAvatarUrl(acc) {
    if (acc.type === 'microsoft') {
        const id = acc.uuid || (acc.username ? encodeURIComponent(acc.username) : null);
        if (id) return `https://crafthead.net/helm/${id}/64`;
    }
    if (acc.type === 'helloworld' && acc.avatarUrl) {
        return acc.avatarUrl;
    }
    return null;
}

// Helper: get current active account id to highlight it
async function getCurrentAccountId() {
    try {
        const data = await window.pywebview.api.get_user_json();
        if (!data || !data.username) return null;
        if (data.account_type === 'helloworld') {
            // Match by firebase_uid or by username
            return data.firebase_uid || null;
        }
        if (data.account_type === 'microsoft') {
            return data.uuid || null;
        }
        if (data.account_type === 'offline') {
            // Generate deterministic id like backend does
            return null; // We'll match by username+type for offline
        }
        return null;
    } catch (_) { return null; }
}

// Render the account list inside the modal
async function renderAccountSwitcherList() {
    const listEl = document.getElementById('accountSwitcherList');
    const emptyEl = document.getElementById('accountSwitcherEmpty');
    if (!listEl) return;

    // Show loading state
    listEl.innerHTML = '<div style="display:flex;justify-content:center;padding:32px;"><div class="account-item-spinner"></div></div>';

    let accounts = [];
    try {
        const res = await window.pywebview.api.get_saved_accounts();
        accounts = (res && res.accounts) ? res.accounts : [];
    } catch (e) {
        console.error('[AccountSwitcher] Failed to load accounts:', e);
    }

    // Clear list
    listEl.innerHTML = '';

    if (accounts.length === 0) {
        if (emptyEl) emptyEl.style.display = 'flex';
        listEl.appendChild(emptyEl || document.createElement('div'));
        return;
    }

    if (emptyEl) emptyEl.style.display = 'none';

    // Get current user to mark active
    const currentData = await window.pywebview.api.get_user_json().catch(() => null);

    let hasActive = false;

    accounts.forEach(acc => {
        // Determine if this is the active account
        let isActive = false;
        if (currentData && currentData.username) {
            if (acc.type === 'helloworld' && currentData.account_type === 'helloworld') {
                isActive = acc.id === currentData.firebase_uid;
            } else if (acc.type === 'microsoft' && currentData.account_type === 'microsoft') {
                isActive = acc.uuid === currentData.uuid;
            } else if (acc.type === 'offline' && currentData.account_type === 'offline') {
                isActive = acc.username === currentData.username;
            }
        }
        if (isActive) hasActive = true;

        const item = document.createElement('div');
        item.className = `account-item${isActive ? ' active' : ''}`;
        item.dataset.accountId = acc.id;

        // Avatar
        const avatarEl = document.createElement('div');
        avatarEl.className = 'account-item-avatar';

        const avatarUrl = getAccountAvatarUrl(acc);
        if (avatarUrl) {
            const img = document.createElement('img');
            img.src = avatarUrl;
            img.alt = acc.username;
            img.onerror = () => {
                img.style.display = 'none';
                const fb = document.createElement('i');
                fb.className = 'fas fa-user avatar-fallback';
                avatarEl.appendChild(fb);
            };
            avatarEl.appendChild(img);
        } else {
            const fb = document.createElement('i');
            fb.className = 'fas fa-user avatar-fallback';
            avatarEl.appendChild(fb);
        }

        // Type dot
        const dot = document.createElement('span');
        dot.className = `account-type-dot dot-${acc.type}`;
        avatarEl.appendChild(dot);

        // Info
        const infoEl = document.createElement('div');
        infoEl.className = 'account-item-info';

        const nameEl = document.createElement('div');
        nameEl.className = 'account-item-name';
        nameEl.textContent = acc.username;

        const metaEl = document.createElement('div');
        metaEl.className = 'account-item-meta';

        const badge = document.createElement('span');
        const typeLabel = acc.type === 'microsoft' ? 'Microsoft' : acc.type === 'helloworld' ? 'HelloWorld' : 'Offline';
        const typeIcon = acc.type === 'microsoft' ? 'fab fa-microsoft' : acc.type === 'helloworld' ? 'fas fa-globe' : 'fas fa-user';
        badge.className = `account-type-badge badge-${acc.type}`;
        badge.innerHTML = `<i class="${typeIcon}"></i> ${typeLabel}`;
        metaEl.appendChild(badge);

        if (isActive) {
            const activeBadge = document.createElement('span');
            activeBadge.className = 'account-active-badge';
            activeBadge.textContent = 'Active';
            metaEl.appendChild(activeBadge);
        }

        infoEl.appendChild(nameEl);
        infoEl.appendChild(metaEl);

        // Remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'account-item-remove';
        removeBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i>';

        if (isActive) {
            removeBtn.classList.add('disabled');
            removeBtn.style.opacity = '0.3';
            removeBtn.style.cursor = 'not-allowed';
            const disabledTooltip = window.t ? window.t('user_menu.remove_disabled_tooltip') : 'Select another account first to remove this one';
            removeBtn.setAttribute('data-tooltip', disabledTooltip);
            removeBtn.addEventListener('mouseenter', () => {
                const rect = removeBtn.getBoundingClientRect();
                showTooltip(removeBtn, disabledTooltip, rect.left + rect.width / 2, rect.top);
            });
            removeBtn.addEventListener('mouseleave', () => hideTooltip());
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showToast(disabledTooltip, 'info');
            });
        } else {
            removeBtn.title = window.t ? window.t('user_menu.remove_account') : 'Remove account';
            removeBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await removeAccountFromSwitcher(acc.id, acc.username, item);
            });
        }

        item.appendChild(avatarEl);
        item.appendChild(infoEl);
        item.appendChild(removeBtn);

        // Click to switch (only if not already active)
        if (!isActive) {
            item.addEventListener('click', async () => {
                await switchToAccountFromSwitcher(acc.id, acc.type, acc.username, acc.email || '', item);
            });
        }

        listEl.appendChild(item);
    });
}

// Switch to an account from the modal
window.performAccountSwitch = async function (accountId, openInboxAfter = false, optionalEmail = '', optionalUsername = '', optionalType = '') {
    try {
        const res = await window.pywebview.api.switch_account(accountId, optionalType);

        if (res && res.success && res.newData) {
            // Close modal and refresh UI
            const modal = document.getElementById('accountSwitcherModal');
            if (modal) modal.classList.remove('show');

            await updateUserInterface(res.newData);
            await loadProfiles();
            await loadVersions();
            await loadOptions();

            // Trigger skin reload if needed
            if (res.newData.username && window.hasInternet) loadSkinData();
            if (res.newData.account_type === 'microsoft') {
                silentMicrosoftVerify(res.newData.username, res.newData.uuid).catch(() => {});
            }
            if (typeof window.initSocial === 'function') {
                await window.initSocial(true).catch(() => {});
            }

            const prefix = window.t ? window.t('auth.switched_to') : 'Switched to';
            showToast(`${prefix} ${res.newData.username}`, 'success');
            if (typeof showSection === 'function') {
                showSection('play');
            }

            if (openInboxAfter) {
                setTimeout(async () => {
                    if (typeof window.openSocialModal === 'function') {
                        await window.openSocialModal('received');
                    }
                    if (typeof window.openInbox === 'function') {
                        window.openInbox('received');
                    }
                }, 400);
            }
            return { success: true };
        } else if (res && res.needsRelogin) {
            // Close switcher modal
            const modal = document.getElementById('accountSwitcherModal');
            if (modal) modal.classList.remove('show');

            if (res.type === 'helloworld') {
                // Pre-fill HW login form and open login modal
                const loginModal = document.getElementById('loginModal');
                const hwEmail = document.getElementById('hwEmail');
                const hwPassword = document.getElementById('hwPassword');
                const hwLoginError = document.getElementById('hwLoginError');

                if (hwEmail) hwEmail.value = res.email || optionalEmail || res.username || optionalUsername || '';
                if (hwPassword) hwPassword.value = '';
                if (hwLoginError) { hwLoginError.style.display = 'none'; hwLoginError.textContent = ''; }

                // Navigate to HW login screen
                const screens = document.querySelectorAll('.login-screen');
                screens.forEach(s => s.classList.remove('active'));
                const hwScreen = document.getElementById('loginHelloWorldScreen');
                if (hwScreen) hwScreen.classList.add('active');

                if (loginModal) {
                    loginModal.classList.add('show');
                    showToast((window.t ? window.t('toasts.session_expired') : '') || 'Session expired. Please log in again.', 'error');
                }
            } else if (res.type === 'microsoft') {
                // Trigger MS login flow directly
                showToast('Reconnecting Microsoft account...', 'success');
                const selectMsBtnEl = document.getElementById('selectMicrosoftBtn');
                if (selectMsBtnEl) {
                    selectMsBtnEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
                    selectMsBtnEl.disabled = true;
                }
                try {
                    const msRes = await window.pywebview.api.login_microsoft();
                    if (msRes && msRes.success && msRes.profile) {
                        if (window.onLoginSuccess) window.onLoginSuccess();
                        if (openInboxAfter) {
                            setTimeout(async () => {
                                if (typeof window.openSocialModal === 'function') {
                                    await window.openSocialModal('received');
                                }
                                if (typeof window.openInbox === 'function') {
                                    window.openInbox('received');
                                }
                            }, 350);
                        }
                    } else {
                        showToast('Microsoft login failed.', 'error');
                    }
                } catch (msErr) {
                    console.error('[AccountSwitcher] MS re-login error:', msErr);
                    showToast('Microsoft login error.', 'error');
                } finally {
                    if (selectMsBtnEl) {
                        selectMsBtnEl.innerHTML = '<i class="fab fa-microsoft"></i> Login with Microsoft <span class="corner-ribbon">Only Minecraft Premium</span>';
                        selectMsBtnEl.disabled = false;
                    }
                }
            } else {
                showToast('Could not switch account.', 'error');
            }
            return { success: false, needsRelogin: true };
        } else {
            showToast(res?.error || 'Could not switch account.', 'error');
            return { success: false, error: res?.error };
        }
    } catch (e) {
        console.error('[AccountSwitcher] switch error:', e);
        showToast('Error switching account.', 'error');
        return { success: false, error: e.message };
    }
};

async function switchToAccountFromSwitcher(accountId, accountType, username, email, itemEl) {
    if (!itemEl) return;

    // Show spinner
    const removeBtn = itemEl.querySelector('.account-item-remove');
    if (removeBtn) removeBtn.style.display = 'none';
    const spinner = document.createElement('div');
    spinner.className = 'account-item-spinner';
    itemEl.classList.add('switching');
    itemEl.appendChild(spinner);

    try {
        const res = await window.performAccountSwitch(accountId, false, email, username);
        if (!res || !res.success) {
            itemEl.classList.remove('switching');
            spinner.remove();
            if (removeBtn) removeBtn.style.display = '';
        }
    } catch (_) {
        itemEl.classList.remove('switching');
        spinner.remove();
        if (removeBtn) removeBtn.style.display = '';
    }
}

window.addEventListener('switch-to-account-and-open-inbox', async (event) => {
    const detail = event.detail || {};
    console.log('[Notification] switch-to-account-and-open-inbox received:', detail);
    const targetId = detail.accountId || detail.recipientUid;
    if (targetId) {
        await window.performAccountSwitch(targetId, true, '', detail.recipientUsername || detail.username || '', detail.recipientType || '');
    } else {
        if (typeof window.openSocialModal === 'function') await window.openSocialModal('received');
        if (typeof window.openInbox === 'function') window.openInbox('received');
    }
});

window.addEventListener('quick-launch-profile', async (event) => {
    const detail = event.detail || {};
    const profileId = detail.profileId;
    if (!profileId) return;
    console.log('[Tray] quick-launch-profile received for profile:', profileId);

    // Switch to play section
    if (typeof showSection === 'function') {
        showSection('play');
    }

    // Reset profile filter if active so the requested profile is selectable
    if (typeof activeProfileFilter !== 'undefined' && activeProfileFilter !== null) {
        activeProfileFilter = null;
    }

    try {
        const profilesData = await window.pywebview.api.get_profiles();
        const profile = profilesData && profilesData.profiles ? profilesData.profiles[profileId] : null;
        if (profile) {
            profile.id = profileId;
            if (typeof selectOption === 'function') {
                const iconUrl = await window.pywebview.api.get_profile_icon(profile.icon);
                profile.iconUrl = iconUrl;
                selectOption(profileId, profile);
            } else if (originalSelect) {
                originalSelect.value = profileId;
                originalSelect.dispatchEvent(new Event('change'));
            }

            // Trigger launch after allowing UI state to settle
            setTimeout(() => {
                const playBtn = document.querySelector('.play-button');
                if (playBtn && !playBtn.disabled) {
                    playBtn.click();
                } else if (typeof launchGame === 'function') {
                    launchGame();
                }
            }, 300);
        }
    } catch (err) {
        console.error('[Tray] Error launching profile from quick-launch-profile:', err);
    }
});

window.addEventListener('tray-switch-account', async (event) => {
    const detail = event.detail || {};
    const targetId = detail.accountId;
    if (targetId && typeof window.performAccountSwitch === 'function') {
        await window.performAccountSwitch(targetId, false, '', detail.username || '', detail.targetType || '');
    }
});

window.addEventListener('open-account-switcher', async () => {
    if (typeof window.openAccountSwitcher === 'function') {
        await window.openAccountSwitcher();
    }
});

// Remove an account from the switcher
async function removeAccountFromSwitcher(accountId, username, itemEl) {
    const confirmed = await window.pywebview.api.confirm(window.t("toasts.remove_account_confirm", {username: username}) || `Remove "${username}" from saved accounts?`);
    if (!confirmed) return;

    try {
        const res = await window.pywebview.api.remove_saved_account(accountId);
        if (res && res.success) {
            // Animate removal
            if (itemEl) {
                itemEl.style.transition = 'all 0.2s ease';
                itemEl.style.opacity = '0';
                itemEl.style.transform = 'translateX(20px)';
                setTimeout(() => itemEl.remove(), 200);
            }

            if (res.sessionCleared && res.newData) {
                const modalEl = document.getElementById('accountSwitcherModal');
                if (modalEl) modalEl.classList.remove('show');
                await updateUserInterface(res.newData);
                await loadProfiles();
                await loadVersions();
                if (window.renderUserHead) await window.renderUserHead(null).catch(() => {});
                if (typeof showSection === 'function') {
                    showSection('play');
                }
            }

            // Check if list is now empty
            setTimeout(() => {
                const list = document.getElementById('accountSwitcherList');
                const emptyEl = document.getElementById('accountSwitcherEmpty');
                if (list && list.querySelectorAll('.account-item').length === 0 && emptyEl) {
                    emptyEl.style.display = 'flex';
                    list.appendChild(emptyEl);
                }
            }, 250);

        } else {
            showToast('Could not remove account.', 'error');
        }
    } catch (e) {
        console.error('[AccountSwitcher] remove error:', e);
        showToast('Error removing account.', 'error');
    }
}

// Open the account switcher modal
window.openAccountSwitcher = async function () {
    const modal = document.getElementById('accountSwitcherModal');
    if (!modal) return;
    // Close user dropdown
    const userBadgeEl = document.getElementById('userBadge');
    if (userBadgeEl) userBadgeEl.classList.remove('active');

    modal.classList.add('show');
    await renderAccountSwitcherList();
};

// Initialize listeners robustly when DOM is ready
function initAccountSwitcherEvents() {
    const swBtn = document.getElementById('switchAccountBtn');
    if (swBtn && !swBtn._asInit) {
        swBtn._asInit = true;
        swBtn.addEventListener('click', async () => {
            await window.openAccountSwitcher();
        });
    }

    const closeBtn = document.getElementById('closeAccountSwitcherBtn');
    if (closeBtn && !closeBtn._asInit) {
        closeBtn._asInit = true;
        closeBtn.addEventListener('click', () => {
            const modal = document.getElementById('accountSwitcherModal');
            if (modal) modal.classList.remove('show');
        });
    }

    const modalEl = document.getElementById('accountSwitcherModal');
    if (modalEl && !modalEl._asInit) {
        modalEl._asInit = true;
        modalEl.addEventListener('click', (e) => {
            if (e.target === modalEl) {
                modalEl.classList.remove('show');
            }
        });
    }

    const addBtn = document.getElementById('addAccountBtn');
    if (addBtn && !addBtn._asInit) {
        addBtn._asInit = true;
        addBtn.addEventListener('click', () => {
            const modal = document.getElementById('accountSwitcherModal');
            if (modal) modal.classList.remove('show');
            const loginModal = document.getElementById('loginModal');
            const screens = document.querySelectorAll('.login-screen');
            screens.forEach(s => s.classList.remove('active'));
            const methodScreen = document.getElementById('loginMethodScreen');
            if (methodScreen) methodScreen.classList.add('active');
            if (loginModal) loginModal.classList.add('show');
        });
    }

    const signOutAll = document.getElementById('signOutAllBtn');
    if (signOutAll && !signOutAll._asInit) {
        signOutAll._asInit = true;
        signOutAll.addEventListener('click', async (e) => {
            const confirmed = await window.pywebview.api.confirm(window.t("toasts.signout_all_confirm") || "Sign out of all accounts? This will remove all saved accounts.");
            if (!confirmed) return;

            try {
                const res = await window.pywebview.api.remove_all_accounts();
                if (res && res.success && res.newData) {
                    const modal = document.getElementById('accountSwitcherModal');
                    if (modal) modal.classList.remove('show');

                    await updateUserInterface(res.newData);
                    await loadProfiles();
                    await loadVersions();
                    await loadOptions();
                    if (window.renderUserHead) await window.renderUserHead(null).catch(() => {});
                    if (typeof showSection === 'function') {
                        showSection('play');
                    }
                    if (document.getElementById('nickname')) document.getElementById('nickname').value = '';
                    showToast((window.t ? window.t('toasts.signout_all_confirm') : '') || 'Signed out of all accounts.', 'success');
                } else {
                    showToast('Error signing out all accounts.', 'error');
                }
            } catch (e) {
                console.error('[AccountSwitcher] remove-all error:', e);
                showToast('Error signing out.', 'error');
            }
        });
    }
}

// Run immediately and also on DOMContentLoaded
initAccountSwitcherEvents();
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAccountSwitcherEvents);
}


// ══════════════════════════════════════════════════════



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

            window.initSocial(true).catch(() => {});

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

            window.pywebview.api.error(window.t('toasts.verify_failed', {err: res.error}) || ('Verification failed: ' + res.error));

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
let lastUserSelectedAddonProfile = null;

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
    
    if (!submenu) return;
    
    const isVisible = submenu.classList.contains('active');

    if (isVisible) {
        submenu.classList.remove('active');
        if (arrow) arrow.style.transform = 'rotate(0deg)';
    } else {
        submenu.classList.add('active');
        if (arrow) arrow.style.transform = 'rotate(180deg)';
    }
}



// Show Section Override for Content Types

const originalShowSection = window.showSection || function () { };

window.showSection = function (sectionId, contentType = null) {
    if (sectionId === 'mods' && contentType === 'modpack') {
        showSection('workshop');
        if (window.switchWorkshopTab) switchWorkshopTab('modpacks');
        return;
    }

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

        document.getElementById('modsSubmenu').classList.add('active'); // Ensure open

    } else {

        // Activate standard buttons

        const btn = document.querySelector(`.sidebar-button[onclick="showSection('${sectionId}')"]`);

        if (btn) btn.classList.add('active');

    }



    // Specific logic

    if (sectionId === 'mods' && contentType) {

        currentContentType = contentType;

        updateModsSectionUI();

        loadModdableProfiles(true); // Reload/Refilter profiles without duplicate search

        loadModCategories(); // Load categories and trigger initial search for this section

    }

}



function updateModsSectionUI() {

    const titles = {
        'mod': 'Mods',
        'resourcepack': 'Resource Packs',
        'datapack': 'Data Packs',
        'shader': 'Shaders',
        'modpack': 'Modpacks'
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
            'mod': 'Select an installation with Forge, Fabric, or NeoForge to manage mods',
            'resourcepack': 'Select an installation to manage resource packs',
            'datapack': 'Select an installation and a world to manage data packs',
            'shader': 'Select an installation with shader support. Forge/NeoForge: Optifine/Oculus. Fabric: Sodium + Iris',
            'modpack': 'Select an installation to install Modrinth modpacks (.mrpack)'
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

function toggleCustomSelect(selectEl) {
    if (!selectEl || selectEl.classList.contains('disabled')) return;
    const trigger = selectEl.querySelector('.select-trigger');
    const options = selectEl.querySelector('.select-options');
    const isActive = trigger && trigger.classList.contains('active');
    closeAllCustomSelects();
    if (!isActive) {
        if (trigger) trigger.classList.add('active');
        if (options) options.classList.add('active');
    }
}

function closeAllCustomSelects() {
    document.querySelectorAll('.custom-select').forEach(sel => {
        const trigger = sel.querySelector('.select-trigger');
        const options = sel.querySelector('.select-options');
        if (trigger) trigger.classList.remove('active');
        if (options) options.classList.remove('active');
    });
}

function updateModsCustomSelectDisplay(id, profile) {
    const modsSelectedTitle = document.getElementById('modsSelectedTitle');
    const modsSelectedSubtitle = document.getElementById('modsSelectedSubtitle');
    const modsSelectedIcon = document.getElementById('modsSelectedIcon');
    const modsCustomSelect = document.getElementById('modsCustomSelect');

    if (!profile || !id) {
        if (modsSelectedTitle) {
            modsSelectedTitle.textContent = window.t ? window.t('play.no_installations') : "No installations found";
            modsSelectedTitle.setAttribute('data-i18n', 'play.no_installations');
        }
        if (modsSelectedSubtitle) modsSelectedSubtitle.style.display = 'none';
        if (modsSelectedIcon) modsSelectedIcon.style.display = 'none';
        if (modsCustomSelect) modsCustomSelect.classList.add('disabled');
        return;
    }

    if (modsCustomSelect) modsCustomSelect.classList.remove('disabled');
    if (modsSelectedTitle) {
        modsSelectedTitle.textContent = profile.name || id;
        modsSelectedTitle.removeAttribute('data-i18n');
    }
    if (modsSelectedSubtitle) {
        const lastPlayedText = profile.last_played ? (typeof timeAgo === 'function' ? timeAgo(profile.last_played) : profile.last_played) : (window.t('time.never') || 'Never');
        modsSelectedSubtitle.textContent = `${profile.version || 'Unknown'} \u2022 ${window.t('play.last_played')}: ${lastPlayedText}`;
        modsSelectedSubtitle.style.display = 'block';
    }
    if (modsSelectedIcon) {
        if (profile.iconUrl || profile.icon) {
            modsSelectedIcon.src = profile.iconUrl || profile.icon;
            modsSelectedIcon.style.display = 'block';
        } else {
            modsSelectedIcon.style.display = 'none';
        }
    }

    document.querySelectorAll('#modsSelectOptions .select-option').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.dataset.value === id) opt.classList.add('selected');
    });
}

function selectModsProfileOption(id, profile) {
    if (modsProfileSelect) modsProfileSelect.value = id;
    if (typeof lastUserSelectedAddonProfile !== 'undefined') lastUserSelectedAddonProfile = id;
    if (typeof currentModsProfile !== 'undefined') currentModsProfile = id;
    updateModsCustomSelectDisplay(id, profile);
    closeAllCustomSelects();
    if (modsProfileSelect) modsProfileSelect.dispatchEvent(new Event('change'));
}

function updateWorldCustomSelectDisplay(worldName) {
    const worldSelectedTitle = document.getElementById('worldSelectedTitle');
    const worldSelectedSubtitle = document.getElementById('worldSelectedSubtitle');
    const worldCustomSelect = document.getElementById('worldCustomSelect');
    if (!worldName) {
        if (worldSelectedTitle) {
            worldSelectedTitle.textContent = window.t ? window.t('social.select_world') : "Select a world...";
            worldSelectedTitle.removeAttribute('data-i18n');
        }
        if (worldSelectedSubtitle) worldSelectedSubtitle.style.display = 'none';
        if (worldCustomSelect) worldCustomSelect.classList.add('disabled');
        return;
    }
    if (worldCustomSelect) worldCustomSelect.classList.remove('disabled');
    if (worldSelectedTitle) {
        worldSelectedTitle.textContent = worldName;
        worldSelectedTitle.removeAttribute('data-i18n');
    }
    if (worldSelectedSubtitle) {
        worldSelectedSubtitle.textContent = window.t ? window.t('mods_menu.minecraft_world') : 'Minecraft World';
        worldSelectedSubtitle.style.display = 'block';
    }
    document.querySelectorAll('#worldSelectOptions .select-option').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.dataset.value === worldName) opt.classList.add('selected');
    });
}

function selectWorldOption(worldName) {
    if (worldSelect) worldSelect.value = worldName;
    updateWorldCustomSelectDisplay(worldName);
    closeAllCustomSelects();
    if (worldSelect) worldSelect.dispatchEvent(new Event('change'));
}

// Load profiles logic updated

async function loadModdableProfiles(skipSearch = false) {

    if (!modsProfileSelect) return;

    const seq = ++loadModdableProfilesSeq;



    try {

        // Use new backend method with strict filtering

        const data = await window.pywebview.api.get_profiles_for_addon(currentContentType);

        if (seq !== loadModdableProfilesSeq) return; // Abort if a newer call started

        const targetProfiles = data.profiles || {};

        window.currentModdableProfiles = targetProfiles;



        const preferredProfile = lastUserSelectedAddonProfile || currentModsProfile || modsProfileSelect.value || (originalSelect ? originalSelect.value : null);

        modsProfileSelect.innerHTML = '';

        const modsSelectOptions = document.getElementById('modsSelectOptions');

        if (modsSelectOptions) modsSelectOptions.innerHTML = '';



        // Reset world select

        if (worldSelect) {

            worldSelect.innerHTML = '<option value="">Select a world...</option>';

            worldSelect.disabled = true;

            updateWorldCustomSelectDisplay('');

            const worldSelectOptions = document.getElementById('worldSelectOptions');

            if (worldSelectOptions) worldSelectOptions.innerHTML = '';

        }





        if (Object.keys(targetProfiles).length === 0) {

            modsProfileSelect.innerHTML = `<option value="">${window.t('installations.no_compatible_found') || 'No compatible installations found'}</option>`;

            modsProfileSelect.disabled = true;

            updateModsCustomSelectDisplay('', null);

            if (noModdableProfiles) {

                noModdableProfiles.style.display = 'block';



                let msg = "";

                if (currentContentType === 'mod') msg = window.t('installations.no_mod_profiles') || "No installations with Forge, Fabric, or NeoForge found.";
                else if (currentContentType === 'shader') msg = window.t('installations.no_shader_profiles') || "No installations with Shaders support found. (Requires Forge/NeoForge OR Fabric installed).";
                else msg = window.t('installations.no_profiles') || "No installations found.";



                document.getElementById('noModdableMessage').textContent = msg;

            }

            if (modsTabsContainer) modsTabsContainer.style.display = 'none';
            if (typeof updateInstalledAddonsTotal === 'function') updateInstalledAddonsTotal(0);

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
            const verLower = (profile.version || '').toLowerCase();
            const typeLabel = (profile.type === 'neoforge' || verLower.includes('neoforge')) ? 'NEOFORGE' :
                (profile.type === 'forge' || verLower.includes('forge')) ? 'FORGE' :
                (profile.type === 'fabric' || verLower.includes('fabric')) ? 'FABRIC' : 'VANILLA';

            const formattedVer = window.formatVersionString ? window.formatVersionString(profile.version) : profile.version;
            let displayVer = formattedVer;
            if (!/^(?:Forge|Fabric|NeoForge|Vanilla)\b/i.test(formattedVer)) {
                displayVer = `${typeLabel} - ${formattedVer}`;
            }
            option.textContent = `${label} (${displayVer})`;



            // Tooltip via title (native)

            if (currentContentType === 'shader') {

                if (typeLabel === 'FORGE' || typeLabel === 'FABRIC' || typeLabel === 'NEOFORGE') {

                    option.title = "Installation ready for shaders";

                }

            }



            modsProfileSelect.appendChild(option);



            if (modsSelectOptions) {

                const optionDiv = document.createElement('div');

                optionDiv.className = 'select-option compact-select-option';

                optionDiv.dataset.value = id;



                let tags = '';

                let type = 'vanilla';

                if (verLower.includes('neoforge') || profile.type === 'neoforge') type = 'neoforge';

                else if (verLower.includes('forge') || profile.type === 'forge') type = 'forge';

                else if (verLower.includes('fabric') || profile.type === 'fabric') type = 'fabric';



                if (type === 'neoforge') tags = `<span class="option-tag neoforge">NEOFORGE</span>`;

                else if (type === 'forge') tags = `<span class="option-tag forge">FORGE</span>`;

                else if (type === 'fabric') tags = `<span class="option-tag fabric">FABRIC</span>`;

                else tags = `<span class="option-tag">VANILLA</span>`;



                if (profile.mods) tags += `<span class="option-tag">${profile.mods} MODS</span>`;



                const iconUrl = await window.pywebview.api.get_profile_icon(profile.icon);

                profile.iconUrl = iconUrl;



                const lastPlayedText = profile.last_played ? (typeof timeAgo === 'function' ? timeAgo(profile.last_played) : profile.last_played) : (window.t('time.never') || 'Never');



                optionDiv.innerHTML = `

                    <img src="${iconUrl}" alt="" class="option-icon compact-option-icon">

                    <div class="option-content">

                        <div class="option-title">${profile.name}</div>

                        <div class="option-subtitle">${profile.version} • ${window.t('play.last_played')}: ${lastPlayedText}</div>

                        <div class="option-tags">${tags}</div>

                    </div>

                `;



                optionDiv.addEventListener('click', (e) => {

                    e.stopPropagation();

                    selectModsProfileOption(id, profile);

                });

                modsSelectOptions.appendChild(optionDiv);

            }

        }



        // Preserve selected index if possible or select first
        if (modsProfileSelect.options.length > 0) {
            let targetIndex = 0;
            let foundPreferred = false;
            if (preferredProfile) {
                for (let i = 0; i < modsProfileSelect.options.length; i++) {
                    if (modsProfileSelect.options[i].value === preferredProfile) {
                        targetIndex = i;
                        foundPreferred = true;
                        break;
                    }
                }
            }
            modsProfileSelect.selectedIndex = targetIndex;
            currentModsProfile = modsProfileSelect.value;
            if (foundPreferred) {
                lastUserSelectedAddonProfile = currentModsProfile;
            }
            updateModsCustomSelectDisplay(currentModsProfile, targetProfiles[currentModsProfile]);
            await onProfileSelected(skipSearch);
            updateUploadButtonState();
        }

    } catch (error) {

        console.error('Error loading profiles:', error);

    }

}



async function onProfileSelected(skipSearch = false) {

    currentModsProfile = modsProfileSelect.value;
    lastUserSelectedAddonProfile = currentModsProfile;

    if (window.currentModdableProfiles && window.currentModdableProfiles[currentModsProfile]) {
        updateModsCustomSelectDisplay(currentModsProfile, window.currentModdableProfiles[currentModsProfile]);
    }


    // Trigger fresh search for new profile context only when not skipping search

    if (!skipSearch) {

        searchMods(1);

    }



    // If Datapack, load worlds

    if (currentContentType === 'datapack') {

        await loadWorlds(currentModsProfile);

    }



    await loadInstalledAddons(skipSearch);

    updateUploadButtonState();

}



// --- Installed Addons Cache & Button State Helpers ---
window.installedAddonsCache = new Set();

function setButtonInstalledState(btn, projectId) {
    if (!btn) return;
    btn.classList.add('is-installed');
    btn.innerHTML = `<i class="fas fa-check"></i> ${window.t('workshop.modal.installed') || 'Installed'}`;
    btn.style.background = '';
    btn.style.opacity = '';
    btn.style.cursor = '';
    btn.disabled = false;
    btn.setAttribute('data-installed', 'true');
    if (projectId) btn.setAttribute('data-project-id', projectId);
}

function setButtonNormalState(btn, projectId) {
    if (!btn) return;
    btn.classList.remove('is-installed');
    btn.innerHTML = `<i class="fas fa-download"></i> ${window.t('workshop.modal.download') || 'Download'}`;
    btn.style.background = '';
    btn.style.opacity = '';
    btn.style.cursor = '';
    btn.disabled = false;
    btn.removeAttribute('data-installed');
    if (projectId) btn.setAttribute('data-project-id', projectId);
}

function restoreButtonState(projectId) {
    const btn = document.getElementById(`btn-mod-${projectId}`);
    const detailBtn = document.getElementById('modDetailInstallBtn');
    const btns = [btn];
    if (detailBtn && detailBtn.getAttribute('data-project-id') === projectId) {
        btns.push(detailBtn);
    }
    btns.forEach(b => {
        if (b) {
            if (window.installedAddonsCache && window.installedAddonsCache.has(projectId)) {
                setButtonInstalledState(b, projectId);
            } else {
                setButtonNormalState(b, projectId);
            }
        }
    });
}

function updateAllVisibleModButtons() {
    document.querySelectorAll('[id^="btn-mod-"]').forEach(btn => {
        const projectId = btn.getAttribute('data-project-id') || btn.id.replace('btn-mod-', '');
        if (window.installedAddonsCache && window.installedAddonsCache.has(projectId)) {
            setButtonInstalledState(btn, projectId);
        } else {
            setButtonNormalState(btn, projectId);
        }
    });
    const detailBtn = document.getElementById('modDetailInstallBtn');
    if (detailBtn) {
        const projectId = detailBtn.getAttribute('data-project-id');
        if (projectId) {
            if (window.installedAddonsCache && window.installedAddonsCache.has(projectId)) {
                setButtonInstalledState(detailBtn, projectId);
            } else {
                setButtonNormalState(detailBtn, projectId);
            }
        }
    }
}

async function refreshInstalledAddonsCache() {
    if (!currentModsProfile) {
        window.installedAddonsCache = new Set();
        return window.installedAddonsCache;
    }
    let worldName = null;
    if (currentContentType === 'datapack') {
        if (!worldSelect || !worldSelect.value) {
            window.installedAddonsCache = new Set();
            return window.installedAddonsCache;
        }
        worldName = worldSelect.value;
    }
    try {
        const result = await window.pywebview.api.get_installed_addons(currentModsProfile, currentContentType, worldName);
        const cache = new Set();
        if (result && result.success && result.mods) {
            result.mods.forEach(m => {
                if (m.project_id) cache.add(m.project_id);
            });
        }
        window.installedAddonsCache = cache;
        return cache;
    } catch (e) {
        console.error('Error refreshing installed addons cache:', e);
        window.installedAddonsCache = new Set();
        return window.installedAddonsCache;
    }
}

// Renamed from loadInstalledMods

function updateInstalledAddonsTotal(count) {
    const label = document.getElementById('installedAddonsTotalLabel');
    if (label) {
        const c = count !== undefined && count !== null ? count : 0;
        label.textContent = (window.t && window.t('mods_menu.total_addons', {count: c})) || `Total: ${c}`;
    }
}

async function loadInstalledAddons(silent = false) {

    if (!installedModsList) return;

    const seq = ++loadAddonsSeq;



    const hasExistingItems = installedModsList.querySelector('.mod-list-item');

    if (!silent && !hasExistingItems) {

        installedModsList.innerHTML = '<div style="text-align:center; padding: 20px;"><div class="spinner"></div></div>';

    }



    let worldName = null;

    if (currentContentType === 'datapack') {

        if (!worldSelect || !worldSelect.value) {

            installedModsList.innerHTML = `

                <div class="no-mods-message">

                    <i class="fas fa-globe"></i>

                    <p>${window.t('mods_menu.select_world') || 'Select a world to view Data Packs'}</p>
                </div>`;

            updateInstalledAddonsTotal(0);

            return;

        }

        worldName = worldSelect.value;

    }



    try {

        // Backend call (updated to get_installed_addons)

        const result = await window.pywebview.api.get_installed_addons(currentModsProfile, currentContentType, worldName);

        if (seq !== loadAddonsSeq) return; // Abort if a newer call started

        window.installedAddonsCache = new Set();
        if (result && result.success && result.mods) {
            result.mods.forEach(m => {
                if (m.project_id) window.installedAddonsCache.add(m.project_id);
            });
        }
        updateAllVisibleModButtons();



        const savedScrollTop = installedModsList.scrollTop;
        installedModsList.innerHTML = '';



        if (!result.success || result.mods.length === 0) {

            installedModsList.innerHTML = `

                <div class="no-mods-message">

                    <i class="fas fa-box-open"></i>

                    <p>${window.t('mods_menu.no_installed', {type: currentContentType}) || `No ${currentContentType}s installed`}</p>
                </div>`;

            updateInstalledAddonsTotal(0);

            return;

        }



        updateInstalledAddonsTotal(result.mods.length);

        result.mods.forEach(mod => {

            const item = createInstalledItem(mod);

            installedModsList.appendChild(item);

        });

        installedModsList.scrollTop = savedScrollTop;



    } catch (error) {

        console.error('Error loading installed addons:', error);

        installedModsList.innerHTML = `<p style="color:red; text-align:center;">${window.t('mods_menu.error_loading') || 'Error loading items'}</p>`;

        updateInstalledAddonsTotal(0);

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

        window.pywebview.api.error(window.t("toasts.select_installation_first") || "Please select an installation first.");

        return;

    }



    if (currentContentType === 'datapack' && (!worldSelect || !worldSelect.value)) {

        window.pywebview.api.error(window.t("toasts.select_world_first") || "Please select a world first.");

        return;

    }



    try {

        const result = await window.pywebview.api.import_addon_file(currentModsProfile, currentContentType, worldSelect?.value);

        if (result.success) {

            window.pywebview.api.info(window.t("toasts.addon_imported_success") || "Addon imported successfully!");

            await loadInstalledAddons(true); // Refresh list silently

        } else if (result.error) {

            window.pywebview.api.error(window.t("toasts.import_failed", {err: result.error}) || ("Import failed: " + result.error));

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
    else if (currentContentType === 'modpack') iconClass = 'fas fa-boxes';

    if (itemData.missing) iconClass = 'fas fa-exclamation-triangle';



    // Type label

    const typeLabel = itemData.type === 'folder' ? (window.t('mods_menu.folder') || 'Folder') : (window.t('mods_menu.file') || 'File');

    

    // Size or missing indicator
    const actionsDisabled = itemData.missing ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : '';
    const toggleDisabled = itemData.missing ? 'disabled' : '';

    let detailsDisplay = itemData.missing
        ? (window.t('mods_menu.missing_file') || 'Missing file')
        : `${itemData.size_mb} MB • ${itemData.enabled ? (window.t('mods_menu.enabled') || 'Enabled') : (window.t('mods_menu.disabled') || 'Disabled')} • ${typeLabel}`;
    let actionsHtml = `
        <div class="mod-list-actions">
            <button class="mod-delete-btn" ${actionsDisabled} onclick="deleteAddon('${itemData.filename}')"><i class="fas fa-trash"></i> ${window.t('mods_menu.delete') || 'Delete'}</button>
            <div class="mod-toggle ${itemData.enabled ? 'active' : ''}" ${toggleDisabled} onclick="window.toggleAddon('${itemData.filename}', ${!itemData.enabled})">
                <div class="mod-toggle-slider"></div>
            </div>
        </div>
    `;

    if (itemData.type === 'modpack') {
        detailsDisplay = 'Modpack';
        actionsHtml = `<div class="mod-list-actions"></div>`;
    }

    div.innerHTML = `
        <div class="mod-list-icon">
            <i class="${iconClass}"></i>
        </div>
        <div class="mod-list-info">
            <div class="mod-list-name">${itemData.display_name}</div>
            <div class="mod-list-details">${detailsDisplay}</div>
        </div>
        ${actionsHtml}
    `;



    // Fetch and display Modrinth rich data if project_id exists
    const projectId = itemData.project_id || itemData.projectId;
    if (projectId) {
      const iconContainer = div.querySelector('.mod-list-icon');
      const nameContainer = div.querySelector('.mod-list-name');

      const viewDetailsText = (window.t && window.t('mods_menu.view_details')) || 'View details';

      const openDetails = (e) => {
        if (e) {
          e.stopPropagation();
          e.preventDefault();
        }
        if (typeof window.openModDetails === 'function') {
          window.openModDetails(projectId);
        }
      };

      if (iconContainer) {
        iconContainer.classList.add('clickable');
        iconContainer.setAttribute('tabindex', '0');
        iconContainer.setAttribute('role', 'button');
        iconContainer.title = viewDetailsText;
        iconContainer.addEventListener('click', openDetails);
        iconContainer.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') openDetails(e);
        });
      }

      if (nameContainer) {
        nameContainer.classList.add('clickable');
        nameContainer.setAttribute('tabindex', '0');
        nameContainer.setAttribute('role', 'button');
        nameContainer.title = viewDetailsText;
        nameContainer.addEventListener('click', openDetails);
        nameContainer.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') openDetails(e);
        });
      }

      // Show spinner while fetching
      if (iconContainer) {
        iconContainer.innerHTML = `<div class="spinner" style="width: 24px; height: 24px; border-width: 2px;"></div>`;
      }
      if (nameContainer) {
        nameContainer.innerHTML = `<span style="color: #888;">Loading ${itemData.display_name}...</span>`;
      }

      const loadRichData = async () => {
        let details = modrinthDetailsCache[projectId];
        if (!details) {
          try {
            const result = await window.pywebview.api.get_mod_details(projectId);
            if (result.success && result.details) {
              details = result.details;
              modrinthDetailsCache[projectId] = details;
            }
          } catch (e) {
            console.error("Failed fetching addon details", e);
          }
        }

        if (details) {
          if (iconContainer) {
            iconContainer.innerHTML = details.icon_url 
              ? `<img src="${details.icon_url}" style="width: 100%; height: 100%; border-radius: 8px; object-fit: cover;">` 
              : `<i class="${iconClass}"></i>`;
          }
          if (nameContainer) {
            nameContainer.textContent = details.title || itemData.display_name;
            nameContainer.title = details.description ? `${details.description}\n\n• ${viewDetailsText}` : viewDetailsText;
          }
        } else {
          // Fallback on error
          if (iconContainer) iconContainer.innerHTML = `<i class="${iconClass}"></i>`;
          if (nameContainer) nameContainer.textContent = itemData.display_name;
        }
      };

      loadRichData();
    }



    return div;

}



window.deleteAddon = async function (filename) {

    if (!currentModsProfile) return;

    // Use Python API confirm dialog

    const confirmed = await window.pywebview.api.confirm(window.t("toasts.delete_file_confirm", {filename: filename}) || `Are you sure you want to delete ${filename}?`);

    if (!confirmed) return;



    let worldName = null;

    if (currentContentType === 'datapack') worldName = worldSelect.value;



    try {

        const res = await window.pywebview.api.delete_addon(filename, currentModsProfile, currentContentType, worldName);

        if (res.success) {

            await loadInstalledAddons(true);

        } else {

            console.error("Delete failed:", res.error);

            window.pywebview.api.error(window.t("toasts.delete_failed", {err: res.error || "Unknown error"}) || ("Failed to delete: " + (res.error || "Unknown error")));

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

            await loadInstalledAddons(true);

        } else {

            window.pywebview.api.error(window.t('toasts.toggle_addon_error', {err: res.error || 'Unknown error'}) || ('Error toggling addon: ' + (res.error || 'Unknown error')));

        }

    } catch (error) {

        console.error('Error toggling addon:', error);

    }

};



async function loadWorlds(profileId) {

    if (!worldSelect) return;

    worldSelect.innerHTML = '<option value="">Loading...</option>';

    worldSelect.disabled = true;

    updateWorldCustomSelectDisplay('');

    const worldSelectOptions = document.getElementById('worldSelectOptions');

    if (worldSelectOptions) worldSelectOptions.innerHTML = '';



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



                if (worldSelectOptions) {

                    const optionDiv = document.createElement('div');

                    optionDiv.className = 'select-option compact-select-option';

                    optionDiv.dataset.value = w.name;

                    optionDiv.innerHTML = `

                        <div class="option-icon compact-option-icon" style="display:flex;align-items:center;justify-content:center;color:#4facfe;background:rgba(79,172,254,0.15);font-size:16px;width:32px;height:32px;border-radius:6px;flex-shrink:0;"><i class="fas fa-globe-americas"></i></div>

                            <div class="option-title">${w.name}</div>
                            <div class="option-subtitle">${window.t ? window.t('mods_menu.minecraft_world') : 'Minecraft World'}</div>

                        </div>

                    `;

                    optionDiv.addEventListener('click', (e) => {

                        e.stopPropagation();

                        selectWorldOption(w.name);

                    });

                    worldSelectOptions.appendChild(optionDiv);

                }

            });



            if (worldSelect.options.length > 1) {

                // Auto-select the first actual world (skip the empty placeholder at index 0)
                worldSelect.selectedIndex = 1;

                // Remove disabled state from custom select
                const worldCustomSelectEl = document.getElementById('worldCustomSelect');
                if (worldCustomSelectEl) worldCustomSelectEl.classList.remove('disabled');

                updateWorldCustomSelectDisplay(worldSelect.value);

                // Trigger change event to update installed addons list
                worldSelect.dispatchEvent(new Event('change'));

            }

        } else {

            const opt = document.createElement('option');

            opt.textContent = window.t ? window.t('social.no_worlds_found') : 'No worlds found';

            worldSelect.appendChild(opt);

            updateWorldCustomSelectDisplay('');

            const worldSelectedTitle = document.getElementById('worldSelectedTitle');

            if (worldSelectedTitle) worldSelectedTitle.textContent = window.t ? window.t('social.no_worlds_found') : 'No worlds found';

        }

    } catch (e) {

        console.error("Error loading worlds", e);

        worldSelect.innerHTML = '<option value="">Error loading worlds</option>';

        updateWorldCustomSelectDisplay('');

        const worldSelectedTitle = document.getElementById('worldSelectedTitle');

        if (worldSelectedTitle) worldSelectedTitle.textContent = "Error loading worlds";

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

                loadInstalledAddons(true);

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
        else if (currentContentType === 'modpack') categoryTypeFilter = 'modpack';



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

        gridContainer.className = 'categories-list';

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



// --- Custom Sort Dropdown Logic ---

(function initSortCustomSelect() {

    const sortTrigger = document.getElementById('sortTrigger');
    const sortOptions = document.getElementById('sortOptions');
    const sortLabel = document.getElementById('sortLabel');
    const sortIcon = document.getElementById('sortIcon');
    const sortArrow = document.getElementById('sortArrow');
    const modSortSelect = document.getElementById('modSortSelect');
    const sortCustomSelect = document.getElementById('sortCustomSelect');

    if (!sortTrigger || !sortOptions) return;

    // Toggle open/close
    sortTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = sortOptions.classList.contains('open');
        sortOptions.classList.toggle('open', !isOpen);
        sortTrigger.classList.toggle('open', !isOpen);
    });

    // Handle option selection
    sortOptions.querySelectorAll('.sort-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            e.stopPropagation();
            const value = opt.dataset.value;
            const iconClass = opt.dataset.icon;
            const labelText = opt.querySelector('span').textContent;

            // Update trigger label & icon
            if (sortLabel) sortLabel.textContent = labelText;
            if (sortIcon && iconClass) {
                sortIcon.className = iconClass + ' sort-trigger-icon';
            }

            // Update selection highlight
            sortOptions.querySelectorAll('.sort-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');

            // Sync native select
            if (modSortSelect) {
                modSortSelect.value = value;
                modSortSelect.dispatchEvent(new Event('change'));
            }

            // Close dropdown
            sortOptions.classList.remove('open');
            sortTrigger.classList.remove('open');

            // Trigger search
            searchMods(1);
        });
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (sortCustomSelect && !sortCustomSelect.contains(e.target)) {
            sortOptions.classList.remove('open');
            sortTrigger.classList.remove('open');
        }
    });

    // Update label text after i18n is applied
    window.addEventListener('i18nApplied', () => {
        const selected = sortOptions.querySelector('.sort-option.selected');
        if (selected && sortLabel) {
            sortLabel.textContent = selected.querySelector('span').textContent;
        }
    });

})();



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

            if (typeof updateWorldCustomSelectDisplay === 'function') {

                updateWorldCustomSelectDisplay(worldSelect.value);

            }

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
                excludeCategories: excludedCats.length > 0 ? excludedCats : undefined,
                loader: undefined
            },
            offset: (currentModPage - 1) * 20
        };

        if (currentModsProfile && currentContentType === 'mod') {
            try {
                const profilesData = await window.pywebview.api.get_profiles();
                if (profilesData && profilesData.profiles && profilesData.profiles[currentModsProfile]) {
                    const vStr = profilesData.profiles[currentModsProfile].version || '';
                    let parsedLoader = undefined;
                    if (vStr.toLowerCase().includes('fabric')) parsedLoader = 'fabric';
                    else if (vStr.toLowerCase().includes('neoforge')) parsedLoader = 'neoforge';
                    else if (vStr.toLowerCase().includes('forge')) parsedLoader = 'forge';
                    queryOptions.filters.loader = parsedLoader;
                }
            } catch (e) {
                console.warn("Failed to fetch profiles for loader filtering:", e);
            }
        }



        // Pass structured options

        const result = await window.pywebview.api.search_modrinth_mods(query, queryOptions, currentContentType);



        modSearchLoading.style.display = 'none';

        await refreshInstalledAddonsCache();



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

                    <p>${window.t('mods_menu.no_mods_found', {query: query}) || `No mods found for "${query}"`}</p>

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



function createModCard(mod, forcedType) {
    if (forcedType) mod.project_type = forcedType;
    const effectiveType = mod.project_type || currentContentType;

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



    const modCategoriesArray = Array.isArray(mod.categories) ? mod.categories : [];
    const categories = modCategoriesArray.slice(0, 3).map(cat =>

        `<span class="mod-category-badge">${cat}</span>`

    ).join('');



    card.onclick = () => {
        if (effectiveType) currentContentType = effectiveType;
        else if (mod.project_id && document.getElementById('wkModrinthGrid')?.contains(card)) currentContentType = 'modpack';
        openModDetails(mod.project_id);
    };

    // Use project_id because Modrinth search returns project_id, not id

    const modId = mod.project_id;
    const isInstalled = window.installedAddonsCache && window.installedAddonsCache.has(modId);
    const btnClass = isInstalled ? 'btn-primary is-installed' : 'btn-primary';
    const installedTxt = (window.t && window.t('workshop.modal.installed')) || 'Installed';
    const downloadTxt = (window.t && window.t('workshop.modal.download')) || 'Download';
    const btnText = isInstalled ? `<i class="fas fa-check"></i> ${installedTxt}` : `<i class="fas fa-download"></i> ${downloadTxt}`;
    const dataInstalled = isInstalled ? 'data-installed="true"' : '';



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

            <button id="btn-mod-${modId}" class="${btnClass}" ${dataInstalled} data-project-id="${modId}" onclick="event.stopPropagation(); downloadModFromCard('${modId}', '${mod.slug}', '${effectiveType}', '${(mod.title || '').replace(/'/g, "\\'")}', '${(mod.icon_url || '').replace(/'/g, "\\'")}')">

                ${btnText}

            </button>

        </div>

    `;



    return card;

}



// Mod Details Modal Logic

window.openModDetails = async function (projectId) {

    const modal = document.getElementById('modDetailsModal');
    if (!modal) return;

    if (!modal._backdropInit) {
        modal._backdropInit = true;
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                window.closeModDetails();
            }
        });
    }



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
        if (details.project_type) currentContentType = details.project_type;



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
        const targetProjectId = details.id || projectId;
        await refreshInstalledAddonsCache();
        const isInstalled = window.installedAddonsCache && window.installedAddonsCache.has(targetProjectId);
        if (isInstalled) {
            setButtonInstalledState(installBtn, targetProjectId);
        } else {
            setButtonNormalState(installBtn, targetProjectId);
        }

        installBtn.onclick = () => {

            downloadModFromCard(targetProjectId, details.slug, details.project_type || currentContentType, details.title, details.icon_url, true);

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
    const detailBtn = document.getElementById('modDetailInstallBtn');
    const btns = [btn];
    if (detailBtn && detailBtn.getAttribute('data-project-id') === projectId) {
        btns.push(detailBtn);
    }
    
    // Update Mod Dependency Modal Progress Bar (if exists)
    const depProg = document.getElementById(`dep-progress-${projectId}`);
    if (depProg) {
        depProg.style.width = percentage + '%';
    }

    btns.forEach(b => {
        if (b) {
            b.classList.remove('is-installed');
            const originalText = b.getAttribute('data-original-text') || window.t('workshop.modal.download') || 'Download';
            if (!b.getAttribute('data-original-text')) {
                b.setAttribute('data-original-text', originalText);
            }
            b.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${percentage}%`;
            b.disabled = true;
            b.style.cursor = 'wait';
            b.style.background = `linear-gradient(to right, #2ecc71 ${percentage}%, #95a5a6 ${percentage}%)`;
            b.style.borderColor = 'transparent';
            b.style.opacity = '1';
        }
    });

};



window.onModDownloadComplete = function (projectId, filename) {

    if (!window.installedAddonsCache) window.installedAddonsCache = new Set();
    window.installedAddonsCache.add(projectId);

    const btn = document.getElementById(`btn-mod-${projectId}`);
    const detailBtn = document.getElementById('modDetailInstallBtn');
    const btns = [btn];
    if (detailBtn && detailBtn.getAttribute('data-project-id') === projectId) {
        btns.push(detailBtn);
    }
    btns.forEach(b => {
        if (b) {
            b.style.background = '';
            b.style.borderColor = '';
            b.style.opacity = '';
            b.style.cursor = '';
            setButtonInstalledState(b, projectId);
        }
    });



    // Refresh installed mods if on that tab

    if (currentModTab === 'installed') {

        loadInstalledAddons(true); // Changed from loadInstalledMods

    }
    if (currentContentType === 'modpack') {
        if (typeof loadProfiles === 'function') loadProfiles();
        if (typeof loadModdableProfiles === 'function') loadModdableProfiles(true);
        if (typeof showWkToast === 'function') {
            showWkToast('Modpack instalado correctamente');
        }
    } else {
        // Silently refresh installed addons for current profile without resetting mod search or redrawing profile lists
        if (typeof loadInstalledAddons === 'function') loadInstalledAddons(true);
    }

};



window.onModDownloadError = function (projectId, errorMsg) {

    const btn = document.getElementById(`btn-mod-${projectId}`);
    const detailBtn = document.getElementById('modDetailInstallBtn');
    const btns = [btn];
    if (detailBtn && detailBtn.getAttribute('data-project-id') === projectId) {
        btns.push(detailBtn);
    }
    btns.forEach(b => {
        if (b) {
            b.classList.remove('is-installed');
            b.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Error`;
            b.style.background = '#e74c3c'; // Red
            b.style.opacity = '1';
            setTimeout(() => {
                b.style.background = '';
                b.style.opacity = '';
                if (window.installedAddonsCache && window.installedAddonsCache.has(projectId)) {
                    setButtonInstalledState(b, projectId);
                } else {
                    setButtonNormalState(b, projectId);
                }
            }, 3000);
        }
    });

    window.pywebview.api.error(window.t("toasts.error_prefix", {msg: errorMsg}) || `Error: ${errorMsg}`);

};



window.downloadModFromCard = async function (projectId, slug, forcedType, modTitle, modIconUrl, closeModalOnProceed = false) {
    if (forcedType) currentContentType = forcedType;
    if (!forcedType && document.getElementById(`btn-mod-${projectId}`) && document.getElementById('wkModrinthGrid')?.contains(document.getElementById(`btn-mod-${projectId}`))) {
        currentContentType = 'modpack';
    }

    const btn = document.getElementById(`btn-mod-${projectId}`);
    const detailBtn = document.getElementById('modDetailInstallBtn');
    const activeBtn = (detailBtn && detailBtn.getAttribute('data-project-id') === projectId) ? detailBtn : btn;

    if (btn && btn.disabled) return;
    if (activeBtn && activeBtn.disabled) return;

    await refreshInstalledAddonsCache();
    const isAlreadyInstalled = (window.installedAddonsCache && window.installedAddonsCache.has(projectId)) || 
                               (btn && btn.getAttribute('data-installed') === 'true') ||
                               (detailBtn && detailBtn.getAttribute('data-installed') === 'true' && detailBtn.getAttribute('data-project-id') === projectId);

    if (isAlreadyInstalled) {
        const confirmed = await window.pywebview.api.confirm(window.t("toasts.reinstall_addon_confirm") || "This addon is already installed in the current profile. Do you want to reinstall it?");
        if (!confirmed) {
            return;
        }
    }

    if (closeModalOnProceed) {
        if (typeof closeModDetails === 'function') closeModDetails();
    }

    try {
        const btnsToLoad = [btn];
        if (detailBtn && detailBtn.getAttribute('data-project-id') === projectId && !closeModalOnProceed) {
            btnsToLoad.push(detailBtn);
        }
        btnsToLoad.forEach(b => {
            if (b) {
                b.classList.remove('is-installed');
                b.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting...';
                b.disabled = true;
            }
        });

        if (currentContentType === 'modpack') {
            const versionsResult = await window.pywebview.api.get_mod_versions(projectId, null, null);
            let version = null;
            if (versionsResult && versionsResult.success && versionsResult.versions) {
                const list = versionsResult.versions;
                version = list.find(v => v.version_type === 'release' && v.featured)
                    || list.find(v => v.version_type === 'release')
                    || list.find(v => v.featured)
                    || list.find(v => v.version_type === 'beta')
                    || list[0]
                    || null;
            }

            if (!version || !version.id) {
                window.pywebview.api.error(window.t('toasts.no_downloadable_versions') || 'No downloadable versions found for this modpack');
                if (btn) {
                    btn.innerHTML = `<i class="fas fa-download"></i> ${window.t('workshop.modal.download') || 'Download'}`;
                    btn.disabled = false;
                }
                return;
            }

            let modName = modTitle || document.getElementById('modDetailTitle')?.textContent;
            let iconUrl = modIconUrl || document.getElementById('modDetailIcon')?.src;
            if (!modName || modName === 'Loading...' || modName === 'Modrinth Modpack' || !iconUrl || iconUrl === window.location.href || iconUrl.includes('placeholder')) {
                try {
                    const resDetails = await window.pywebview.api.get_mod_details(projectId);
                    if (resDetails?.success && resDetails?.details) {
                        if (resDetails.details.title) modName = resDetails.details.title;
                        if (resDetails.details.icon_url) iconUrl = resDetails.details.icon_url;
                    }
                } catch(e) {}
            }
            modName = modName || 'Modrinth Modpack';
            iconUrl = (iconUrl && iconUrl !== window.location.href && !iconUrl.includes('placeholder')) ? iconUrl : null;

            if (window.openModrinthModpackInstallModal) {
                window.openModrinthModpackInstallModal(projectId, version, modName, iconUrl, null);
                const modDetailsModal = document.getElementById('modDetailsModal');
                if (modDetailsModal) modDetailsModal.classList.remove('show');
            } else {
                console.error("openModrinthModpackInstallModal is not defined");
            }
            if (btn) {
                btn.innerHTML = `<i class="fas fa-download"></i> ${window.t('workshop.modal.download') || 'Download'}`;
                btn.disabled = false;
            }
            return;
        }

        if (!currentModsProfile) {
            window.pywebview.api.error(window.t('toasts.select_installation_short') || 'Select an installation first');
            restoreButtonState(projectId);
            return;
        }



        // Get profile info to determine loader and game version (use generic profile getter)

        // Previous bug: get_moddable_profiles ONLY returned forge/fabric, so vanilla profiles (DPs/RPs) were missing -> "Profile not found"

        // We can reuse get_profiles_for_addon which is already filtered correctly for currentContentType

        const profilesData = await window.pywebview.api.get_profiles_for_addon(currentContentType);

        const profile = profilesData.profiles[currentModsProfile];



        if (!profile) {

            window.pywebview.api.error(window.t('toasts.installation_not_found') || 'Installation not found');

            restoreButtonState(projectId);

            return;

        }



        // Determine loader type — check both profile.type and the version string.

        // Forge installer creates versions like "1.20.1-forge-47.4.10" (no profile.type set),

        // while our internal ID is "forge-1.20.1-47.4.10". Both must be detected as Forge.

        const versionStr = String(profile.version || '').toLowerCase();
        const isNeoForgeProfile = profile.type === 'neoforge' || versionStr.includes('neoforge');
        const isForgeProfile = !isNeoForgeProfile && (profile.type === 'forge' || versionStr.includes('forge'));
        const isFabricProfile = !isForgeProfile && !isNeoForgeProfile && (profile.type === 'fabric' || versionStr.includes('fabric'));

        const loader = isFabricProfile ? 'fabric' : isNeoForgeProfile ? 'neoforge' : isForgeProfile ? 'forge' : 'fabric';

        const matches = String(profile.version || '').match(/\b\d+\.\d+(?:\.\d+)?\b/g) || [];
        let gameVersion = matches.find(m => m.startsWith('1.')) || matches[0] || profile.version;



        // For Shaders and RPs, loader might not matter, or we treat "canvas/iris/optifine" as loaders?

        // Modrinth API often returns versions compatible with "minecraft", but for shaders it might list "iris" as loader.

        // We should pass 'iris' or 'optifine' if we are on fabric/forge respectively for shaders? 

        // Or just pass null to get all and let user decide?

        // Let's pass the loader derived from profile for Mods/Shaders. For RPs/DPs, loader is irrelevant (null).



        // Loader logic

        let searchLoader = loader;
        if (currentContentType === 'resourcepack' || currentContentType === 'datapack' || currentContentType === 'modpack') {
            searchLoader = null;
        } else if (currentContentType === 'shader') {

            // For shaders, Modrinth usually expects 'iris' or 'optifine'

            if (loader === 'fabric') searchLoader = 'iris';
            else if (loader === 'forge' || loader === 'neoforge') searchLoader = 'optifine';
            else searchLoader = null; // Fallback

        }



        // Get compatible versions

        const versionsResult = await window.pywebview.api.get_mod_versions(projectId, gameVersion, searchLoader);

        let version = null;

        const selectBestVersion = (list) => {
            if (!list || list.length === 0) return null;
            return list.find(v => v.version_type === 'release' && v.featured)
                || list.find(v => v.version_type === 'release')
                || list.find(v => v.featured)
                || list.find(v => v.version_type === 'beta')
                || list[0];
        };



        if (!versionsResult.success || versionsResult.versions.length === 0) {

            // Error Message Logic

            let msg = "";

            if (currentContentType === 'resourcepack' || currentContentType === 'datapack') {

                // For resourcepacks and datapacks, allow installation anyway with confirmation
                const confirmed = await window.pywebview.api.confirm(window.t("toasts.install_anyway_confirm", {version: gameVersion}) || `No compatible versions found for Minecraft ${gameVersion}. Do you want to install anyway?`);

                if (!confirmed) {
                    restoreButtonState(projectId);
                    return;
                }

                // If confirmed, fetch all versions (not filtered by game version)
                const allVersionsResult = await window.pywebview.api.get_mod_versions(projectId, null, null);

                if (!allVersionsResult.success || allVersionsResult.versions.length === 0) {
                    window.pywebview.api.error(window.t('toasts.no_versions_project') || 'No versions available for this project');
                    restoreButtonState(projectId);
                    return;
                }

                // Use the recommended stable/featured version
                version = selectBestVersion(allVersionsResult.versions);

            } else if (currentContentType === 'shader') {

                // Mention mapped loader

                const shaderLoader = (loader === 'fabric') ? 'Iris' : 'Optifine';

                msg = `No compatible versions for ${shaderLoader} on Minecraft ${gameVersion}`;

                window.pywebview.api.error(msg);

                restoreButtonState(projectId);

                return;

            } else {

                // Mods

                msg = `No compatible versions for ${loader} ${gameVersion}`;

                window.pywebview.api.error(msg);

                restoreButtonState(projectId);

                return;

            }

        } else {

            // Use the recommended stable/featured compatible version
            version = selectBestVersion(versionsResult.versions);

        }



        // For Datapack, get world

        let worldName = null;

        if (currentContentType === 'datapack') {

            worldName = worldSelect ? worldSelect.value : null;

            if (!worldName) {

                window.pywebview.api.error(window.t('toasts.select_world_first_no_dot') || 'Please select a world first');

                restoreButtonState(projectId);

                return;

            }

        }
        // For mods: check and handle dependencies BEFORE downloading the main mod
        if (currentContentType === 'mod') {
            btnsToLoad.forEach(b => { if (b) b.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ...'; });
            try {
                const depsResult = await window.pywebview.api.resolve_mod_dependencies(
                    version.id,
                    gameVersion,
                    loader,
                    currentModsProfile
                );

                const hasDepsToInstall = depsResult && depsResult.success &&
                    ((depsResult.required && depsResult.required.length > 0) ||
                     (depsResult.optional && depsResult.optional.length > 0));

                if (hasDepsToInstall) {
                    // Restore button text while modal is open
                    btnsToLoad.forEach(b => { if (b) { b.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${window.t && window.t('workshop.deps.resolving') || 'Resolving...'}`; b.disabled = true; } });

                    // Open deps modal and wait for user choice
                    const depChoice = await window.openModDepsModal(depsResult, {
                        projectId,
                        versionId: version.id,
                        profileId: currentModsProfile,
                        contentType: currentContentType,
                        worldName
                    });

                    // depChoice: 'all' | 'required' | 'cancel'
                    if (!depChoice || depChoice === 'cancel') {
                        // User skipped deps — just install the main mod
                    } else {
                        // Install selected deps first (silently, no button state changes needed)
                        const depsToInstall = depChoice === 'all'
                            ? [...(depsResult.required || []), ...(depsResult.optional || [])]
                            : [...(depsResult.required || [])];

                        for (const dep of depsToInstall) {
                            if (!dep.resolved_version) continue;
                            const depFile = (dep.resolved_version.files || []).find(f => f.primary) || dep.resolved_version.files[0];
                            if (!depFile) continue;
                            
                            const depCard = document.getElementById(`dep-card-${dep.project_id}`);
                            if (depCard) depCard.classList.add('is-downloading');
                            
                            try {
                                await window.pywebview.api.install_project(
                                    dep.project_id,
                                    dep.resolved_version.id,
                                    currentModsProfile,
                                    'mod',
                                    null,
                                    false
                                );
                            } catch (depErr) {
                                console.warn('[deps] Failed to install dep', dep.project_id, depErr);
                            }
                            
                            if (depCard) {
                                depCard.classList.remove('is-downloading');
                                depCard.classList.add('is-installed');
                                const progFill = document.getElementById(`dep-progress-${dep.project_id}`);
                                if (progFill) progFill.style.width = '100%';
                            }
                        }
                        if (window.showToast) window.showToast(window.t && window.t('workshop.deps.toast_dep_done') || 'Dependencies installed!', 'success');
                        if (window.closeModDepsModal) window.closeModDepsModal(); // Close modal only when done
                    }
                }
            } catch (depErr) {
                console.warn('[deps] Dependency resolution error (non-critical):', depErr);
            }
            // Reset button text to downloading state
            btnsToLoad.forEach(b => { if (b) { b.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ...'; } });
        }

        // Start Download (Now Async) - New "install_project" method
        const downloadResult = await window.pywebview.api.install_project(projectId, version.id, currentModsProfile, currentContentType, worldName, isAlreadyInstalled);

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

async function loadInstalledMods(silent = false) {
    await loadInstalledAddons(silent);
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

            window.pywebview.api.error(window.t('toasts.error_prefix', {msg: result.error}) || `Error: ${result.error}`);

        }

    } catch (error) {

        console.error('Error toggling mod:', error);

        window.pywebview.api.error(window.t('toasts.change_mod_state_error') || 'Error changing mod state');

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

        // Check if it's an external link (http/https) and NOT local/localhost

        const rawHref = target.getAttribute('href') || '';

        if (rawHref === '#' || rawHref.startsWith('#') || rawHref.startsWith('javascript:')) return;

        if ((url.startsWith('http://') || url.startsWith('https://')) && !url.includes('localhost:') && !url.includes('127.0.0.1:')) {

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



    const confirmed = await window.pywebview.api.confirm(window.t("toasts.delete_mod_confirm", {mod: filename.replace('.jar.disabled', '').replace('.jar', '')}) || `Delete the mod "${filename.replace('.jar.disabled', '').replace('.jar', '')}"?`);



    if (!confirmed) return;



    try {

        const result = await window.pywebview.api.delete_mod(currentModsProfile, filename);



        if (result.success) {

            await loadInstalledMods();

        } else {

            window.pywebview.api.error(window.t('toasts.error_prefix', {msg: result.error}) || `Error: ${result.error}`);

        }

    } catch (error) {

        console.error('Error deleting mod:', error);

        window.pywebview.api.error(window.t('toasts.delete_mod_error') || 'Error deleting mod');

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
const donationFloatingBtn = document.getElementById('donationFloatingBtn');
const donationModal = document.getElementById('donationModal');
const closeDonationModalBtn = document.getElementById('closeDonationModalBtn');
const openKofiBtn = document.getElementById('openKofiBtn');

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

if (donationFloatingBtn) {
    donationFloatingBtn.addEventListener('click', () => {
        if (donationModal) donationModal.classList.add('show');
    });
}

if (closeDonationModalBtn) {
    closeDonationModalBtn.addEventListener('click', () => {
        if (donationModal) donationModal.classList.remove('show');
    });
}

if (openKofiBtn) {
    openKofiBtn.addEventListener('click', () => {
        window.pywebview.api.open_url("https://ko-fi.com/abelosky");
        if (donationModal) donationModal.classList.remove('show');
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

        const isAvatarProvider = skinUrl.includes('crafthead.net') || skinUrl.includes('mc-heads.net') || skinUrl.includes('minotar.net') || skinUrl.includes('ui-avatars.com') || skinUrl.startsWith('data:image/');

        const img = new Image();
        if (!isAvatarProvider) {
            img.crossOrigin = "Anonymous";
        }

        img.onload = () => {
            const isFullSkin = !isAvatarProvider &&
                               (img.width === img.height || img.width === img.height * 2) &&
                               (img.width % 64 === 0 || img.width === 32);

            if (isFullSkin) {
                const headDataUrl = window.cropHeadFromSkin ? window.cropHeadFromSkin(img) : null;
                if (headDataUrl) {
                    container.innerHTML = '';
                    const headImg = new Image();
                    headImg.src = headDataUrl;
                    headImg.style.width = '100%';
                    headImg.style.height = '100%';
                    headImg.style.borderRadius = '50%';
                    headImg.style.imageRendering = 'pixelated';
                    container.appendChild(headImg);
                }
            } else {
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
            if (!container.querySelector('img')) {
                container.innerHTML = '<i class="fas fa-user"></i>';
            }
            resolve();
        };

        img.src = skinUrl;
    });
};

// IPC listener for in-app notifications
if (window.electronAPI && window.electronAPI.on) {
    window.electronAPI.on('show-in-app-notification', async (data) => {
        let stack = document.getElementById('in-app-notifications-stack');
        if (!stack) {
            stack = document.createElement('div');
            stack.id = 'in-app-notifications-stack';
            document.body.appendChild(stack);
        }

        // Ensure translations are loaded before trying to translate the notification keys
        if (window.loadLocale && window.currentLanguage) {
            await window.loadLocale(window.currentLanguage);
        }

        const title = data.titleKey ? (window.t ? window.t(data.titleKey, data.variables || {}) : data.titleKey) : data.title;
        const message = data.messageKey ? (window.t ? window.t(data.messageKey, data.variables || {}) : data.messageKey) : data.message;

        // Cap at 3 visible notifications in the stack — dismiss the oldest if exceeding
        const activeItems = Array.from(stack.querySelectorAll('.in-app-notif-item:not(.closing)'));
        if (activeItems.length >= 3) {
            const oldest = activeItems[0];
            if (oldest) {
                oldest.classList.add('closing');
                setTimeout(() => { try { oldest.remove(); } catch (_) {} }, 300);
            }
        }

        const notifItem = document.createElement('div');
        notifItem.className = 'in-app-notif-item';

        const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

        notifItem.innerHTML = `
            <div class="notification-icon">
                <i class="fas fa-bell"></i>
            </div>
            <div class="notification-content">
                <h4>${esc(title)}</h4>
                <p>${esc(message)}</p>
            </div>
            <div class="notification-close" title="Close">
                <i class="fas fa-times"></i>
            </div>
        `;

        let isDismissed = false;
        const dismissItem = () => {
            if (isDismissed) return;
            isDismissed = true;
            notifItem.classList.add('closing');
            notifItem.addEventListener('animationend', () => {
                try { notifItem.remove(); } catch (_) {}
            }, { once: true });
            setTimeout(() => {
                try { notifItem.remove(); } catch (_) {}
            }, 350);
        };

        let autoDismissTimer = setTimeout(dismissItem, data.duration || 6000);

        // Pause timer on hover so user can easily read and click
        notifItem.addEventListener('mouseenter', () => {
            clearTimeout(autoDismissTimer);
        });
        notifItem.addEventListener('mouseleave', () => {
            if (!isDismissed) {
                autoDismissTimer = setTimeout(dismissItem, 2500);
            }
        });

        // Close button click
        const closeBtn = notifItem.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                clearTimeout(autoDismissTimer);
                dismissItem();
            });
        }

        // Notification body click
        notifItem.addEventListener('click', async (e) => {
            if (e.target.closest('.notification-close')) return;
            clearTimeout(autoDismissTimer);
            dismissItem();

            // Delegate to main process navigation (same behavior as native Windows notifications)
            if (window.electronAPI && typeof window.electronAPI.notificationClickNavigate === 'function') {
                try {
                    await window.electronAPI.notificationClickNavigate(data);
                    return;
                } catch (err) {
                    console.warn('[InAppNotif] notificationClickNavigate error, falling back:', err);
                }
            } else if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.notification_click_navigate === 'function') {
                try {
                    await window.pywebview.api.notification_click_navigate(data);
                    return;
                } catch (err) {
                    console.warn('[InAppNotif] pywebview notification_click_navigate error:', err);
                }
            }

            const targetId = data.accountId || data.recipientAccountId || data.recipientUid;
            if (targetId && window.performAccountSwitch) {
                try {
                    const userData = await window.pywebview.api.get_user_json();
                    const currentActiveUid = userData?.account_type === 'microsoft'
                        ? (userData?.firebase_ms_uid || null)
                        : (userData?.account_type === 'helloworld' ? (userData?.firebase_uid || null) : null);
                    let isTargetActive = false;
                    if (data.recipientUid && currentActiveUid) {
                        isTargetActive = currentActiveUid === data.recipientUid;
                    } else if (data.recipientType) {
                        isTargetActive = userData?.account_type === data.recipientType && (
                            !(data.recipientUsername || data.username) || (userData?.username && userData.username.toLowerCase() === (data.recipientUsername || data.username).toLowerCase())
                        );
                    }
                    if (!isTargetActive) {
                        await window.performAccountSwitch(targetId, true, '', data.recipientUsername || data.username || '', data.recipientType || '');
                        return;
                    }
                } catch (_) {}
            }
            if (typeof window.openSocialModal === 'function') await window.openSocialModal('received');
            if (typeof window.openInbox === 'function') window.openInbox('received');
        });

        stack.appendChild(notifItem);
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
        const response = await fetch('https://launchercontent.mojang.com/v2/news.json', { signal: AbortSignal.timeout(10000) });
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

        // Wait up to 1.5s for visible news images to load so they don't pop in after loader hides
        const newsImgs = Array.from(container.querySelectorAll('img')).slice(0, 6);
        await Promise.all(newsImgs.map(img => new Promise(resolve => {
            if (img.complete) resolve();
            else {
                const timer = setTimeout(resolve, 1500);
                img.onload = () => { clearTimeout(timer); resolve(); };
                img.onerror = () => { clearTimeout(timer); resolve(); };
            }
        })));

    } catch (err) {
        console.error("Error loading news:", err);
        container.innerHTML = '<p style="color: #666; font-size: 12px; text-align: center;">Failed to load latest news.</p>';
    }
}

// --- Version Manifest & Patch Notes Logic ---
let globalLatestRelease = '';
let globalLatestSnapshot = '';
let allPatchNotesEntries = [];
let cachedManifestVersions = [];
let currentPatchFilter = 'release';
const patchNotesCache = {};

async function loadVersionManifestInfo() {
    try {
        const response = await fetch('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json', { signal: AbortSignal.timeout(8000) });
        if (!response.ok) return;
        const data = await response.json();
        if (data && data.latest) {
            globalLatestRelease = data.latest.release || '';
            globalLatestSnapshot = data.latest.snapshot || '';
            if (data.versions) {
                cachedManifestVersions = data.versions;
            }

            const relEl = document.getElementById('latestReleaseVer');
            const snapEl = document.getElementById('latestSnapshotVer');
            if (relEl && globalLatestRelease && !relEl.textContent) relEl.textContent = globalLatestRelease;
            if (snapEl && globalLatestSnapshot && !snapEl.textContent) snapEl.textContent = globalLatestSnapshot;
        }
    } catch (err) {
        console.warn("[PatchNotes] Failed to fetch version manifest:", err);
    }
}

async function loadMinecraftPatchNotes() {
    const container = document.getElementById('minecraftPatchNotesContainer');
    if (!container) return;

    if (!window.hasInternet) {
        container.innerHTML = `<p style="color: #888; font-size: 13px; text-align: center; padding: 20px;">${window.t('play.error_loading_patchnotes') || 'No internet connection'}</p>`;
        return;
    }

    try {
        const response = await fetch('https://launchercontent.mojang.com/v2/javaPatchNotes.json', { signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error('Patch notes fetch failed');
        const data = await response.json();

        if (!data || !data.entries || data.entries.length === 0) {
            container.innerHTML = '<p style="color: #888; font-size: 13px; text-align: center; padding: 20px;">No patch notes available.</p>';
            return;
        }

        // Keep ONLY entries with a valid changelog contentPath from official Mojang patch notes
        allPatchNotesEntries = data.entries.filter(e => e && e.contentPath);

        // Extract precise Release and Snapshot version names from patch notes entries
        const latestRelEntry = allPatchNotesEntries.find(e => e.type === 'release');
        const latestSnapEntry = allPatchNotesEntries.find(e => e.type === 'snapshot');

        const relEl = document.getElementById('latestReleaseVer');
        const snapEl = document.getElementById('latestSnapshotVer');

        if (relEl && latestRelEntry) {
            relEl.textContent = latestRelEntry.version || latestRelEntry.title.replace('Minecraft: Java Edition ', '').replace('Minecraft ', '');
        }
        if (snapEl && latestSnapEntry) {
            const snapName = latestSnapEntry.version || latestSnapEntry.title.replace('Minecraft ', '');
            snapEl.textContent = snapName;
        }

        renderPatchNotesList();
    } catch (err) {
        console.error("Error loading patch notes:", err);
        container.innerHTML = `<p style="color: #888; font-size: 13px; text-align: center; padding: 20px;">${window.t('play.error_loading_patchnotes') || 'Failed to load patch notes.'}</p>`;
    }
}

let currentSearchQuery = '';

function onPatchNotesSearchInput(query) {
    currentSearchQuery = (query || '').toLowerCase().trim();
    renderPatchNotesList();
}

function renderPatchNotesList() {
    const container = document.getElementById('minecraftPatchNotesContainer');
    if (!container) return;

    let filtered = allPatchNotesEntries;
    if (currentPatchFilter === 'release') {
        filtered = allPatchNotesEntries.filter(e => e.type === 'release');
    } else if (currentPatchFilter === 'snapshot') {
        filtered = allPatchNotesEntries.filter(e => e.type === 'snapshot');
    }

    if (currentSearchQuery) {
        filtered = filtered.filter(e => 
            (e.title && e.title.toLowerCase().includes(currentSearchQuery)) ||
            (e.version && e.version.toLowerCase().includes(currentSearchQuery)) ||
            (e.shortText && e.shortText.toLowerCase().includes(currentSearchQuery))
        );
    }

    const displayEntries = filtered;

    if (displayEntries.length === 0) {
        container.innerHTML = '<p style="color: #888; font-size: 13px; text-align: center; padding: 20px;">No se encontraron versiones para esta búsqueda.</p>';
        return;
    }

    let html = '';
    displayEntries.forEach(item => {
        const dateObj = item.date ? new Date(item.date) : null;
        const formattedDate = dateObj ? dateObj.toLocaleDateString(window.currentLanguage === 'es' ? 'es-ES' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
        
        let imgUrl = item.image && item.image.url ? item.image.url : '';
        if (imgUrl && imgUrl.startsWith('/')) {
            imgUrl = 'https://launchercontent.mojang.com' + imgUrl;
        } else if (!imgUrl) {
            imgUrl = 'img/icon/icon.png';
        }

        const isRelease = item.type === 'release';
        const badgeClass = isRelease ? 'release' : 'snapshot';
        const badgeText = isRelease ? (window.t('play.release_badge') || 'Release') : (window.t('play.snapshot_badge') || 'Snapshot');
        
        const safeTitle = (item.title || '').replace(/'/g, "\\'").replace(/"/g, "&quot;");
        const contentPath = item.contentPath || '';

        html += `
            <div class="patch-note-card" onclick="openPatchNotesDetail('${contentPath}', '${safeTitle}', '${formattedDate}', '${item.type}', '${imgUrl}')">
                <img src="${imgUrl}" alt="${safeTitle}" class="patch-note-img-thumb" onerror="this.onerror=null; this.src='img/icon/icon.png';">
                <div class="patch-note-card-content">
                    <div>
                        <div class="patch-note-card-header">
                            <span class="patch-note-badge ${badgeClass}">${badgeText} ${item.version ? item.version : ''}</span>
                            <span class="patch-note-card-date"><i class="far fa-calendar-alt"></i> ${formattedDate}</span>
                        </div>
                        <div class="patch-note-card-title">${item.title}</div>
                        <div class="patch-note-card-excerpt">${item.shortText || ''}</div>
                    </div>
                    <div class="patch-note-read-link">
                        <span>${window.t('play.read_changelog') || 'Ver changelog completo'}</span>
                        <i class="fas fa-arrow-right"></i>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function filterPatchNotes(filterType) {
    currentPatchFilter = filterType;
    document.querySelectorAll('.patch-filter-btn').forEach(btn => {
        if (btn.getAttribute('data-filter') === filterType || btn.id === 'filterBtn' + filterType.charAt(0).toUpperCase() + filterType.slice(1)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    renderPatchNotesList();
}

function switchNewsTab(tabName) {
    const slider = document.getElementById('newsPatchPanelsSlider');
    const indicator = document.getElementById('newsPatchTabIndicator');
    const btnNews = document.getElementById('tabBtnNews');
    const btnPatch = document.getElementById('tabBtnPatchNotes');

    if (tabName === 'news') {
        if (slider) {
            slider.classList.remove('tab-1-active');
            slider.classList.add('tab-0-active');
        }
        if (indicator) {
            indicator.classList.remove('tab-1-active');
            indicator.classList.add('tab-0-active');
        }
        if (btnNews) btnNews.classList.add('active');
        if (btnPatch) btnPatch.classList.remove('active');
    } else {
        if (slider) {
            slider.classList.remove('tab-0-active');
            slider.classList.add('tab-1-active');
        }
        if (indicator) {
            indicator.classList.remove('tab-0-active');
            indicator.classList.add('tab-1-active');
        }
        if (btnNews) btnNews.classList.remove('active');
        if (btnPatch) btnPatch.classList.add('active');

        if (allPatchNotesEntries.length === 0) {
            loadMinecraftPatchNotes();
        }
    }
}

async function openPatchNotesDetail(contentPath, title, dateStr, type, imgUrl) {
    const modal = document.getElementById('patchNotesModal');
    const modalTitle = document.getElementById('patchNotesModalTitle');
    const modalBadge = document.getElementById('patchNotesModalBadge');
    const modalDate = document.getElementById('patchNotesModalDate');
    const modalBody = document.getElementById('patchNotesModalBody');

    if (!modal || !modalBody) return;

    modal.classList.remove('closing');
    if (modalTitle) modalTitle.textContent = title || 'Minecraft Patch Notes';
    if (modalDate) modalDate.innerHTML = `<i class="far fa-calendar-alt"></i> ${dateStr || ''}`;
    
    if (modalBadge) {
        const isRelease = type === 'release';
        modalBadge.className = `patch-note-badge ${isRelease ? 'release' : 'snapshot'}`;
        modalBadge.textContent = isRelease ? (window.t('play.release_badge') || 'Release') : (window.t('play.snapshot_badge') || 'Snapshot');
    }

    modalBody.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; gap: 15px; color: #a855f7;">
            <i class="fas fa-spinner fa-spin" style="font-size: 32px;"></i>
            <span style="font-size: 14px; color: #ccc;">${window.t('play.loading_patchnotes') || 'Cargando changelog...'}</span>
        </div>
    `;

    modal.style.display = 'flex';

    // Check if fallback manifest entry
    if (contentPath.startsWith('manifest:')) {
        const verId = contentPath.replace('manifest:', '');
        modalBody.innerHTML = `
            <div style="padding: 10px 0;">
                <h3 style="color: #c084fc; font-size: 17px; margin-bottom: 12px;">Minecraft Java Edition ${verId}</h3>
                <p style="color: #ccc; line-height: 1.6; margin-bottom: 16px;">
                    Esta es una versión oficial de Minecraft (${type === 'release' ? 'Release' : 'Snapshot/Alpha/Beta'}) lanzada el <strong>${dateStr}</strong>.
                </p>
                <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 10px;">
                    <div><i class="fas fa-cube" style="color: #34d399; margin-right: 8px;"></i> <strong>Versión:</strong> ${verId}</div>
                    <div><i class="far fa-calendar-alt" style="color: #60a5fa; margin-right: 8px;"></i> <strong>Fecha de lanzamiento:</strong> ${dateStr}</div>
                    <div><i class="fas fa-tag" style="color: #c084fc; margin-right: 8px;"></i> <strong>Tipo de compilación:</strong> ${type.toUpperCase()}</div>
                    <div><i class="fas fa-info-circle" style="color: #fbbf24; margin-right: 8px;"></i> <strong>Información:</strong> Esta versión está disponible para instalar y jugar directamente desde la sección de Instalaciones de HelloWorld Launcher.</div>
                </div>
            </div>
        `;
        return;
    }

    try {
        let htmlBody = '';
        if (patchNotesCache[contentPath]) {
            htmlBody = patchNotesCache[contentPath];
        } else {
            const url = 'https://launchercontent.mojang.com/v2/' + contentPath;
            const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
            if (!res.ok) throw new Error('Failed to load detail');
            const data = await res.json();
            htmlBody = data.body || '<p>No content available for this patch.</p>';
            
            // Remove redundant leading H1 title if present in HTML body
            htmlBody = htmlBody.replace(/^\s*<h1[^>]*>.*?<\/h1>/i, '');
            // Fix relative images in HTML body if any
            htmlBody = htmlBody.replace(/src="\/v2\//g, 'src="https://launchercontent.mojang.com/v2/');
            patchNotesCache[contentPath] = htmlBody;
        }

        modalBody.innerHTML = htmlBody;
    } catch (err) {
        console.error("Error opening patch notes detail:", err);
        modalBody.innerHTML = `<p style="color: #ef4444; padding: 20px; text-align: center;">${window.t('play.error_loading_patchnotes') || 'Error al cargar las notas de actualización.'}</p>`;
    }
}

function closePatchNotesModal() {
    const modal = document.getElementById('patchNotesModal');
    if (!modal || modal.style.display === 'none' || modal.classList.contains('closing')) return;

    modal.classList.add('closing');
    setTimeout(() => {
        modal.style.display = 'none';
        modal.classList.remove('closing');
    }, 200);
}

// Close modal on Escape key press
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closePatchNotesModal();
    }
});

// Global UI Transition Interceptor
function initTransitionInterceptors() {
    const attachToElements = () => {
        const selector = '.modal, .social-modal-overlay, .onboarding-overlay, .full-screen-overlay, .select-options, .sidebar-submenu, .global-download-popup, #in-app-notification, .user-badge, .toast';
        document.querySelectorAll(selector).forEach(el => {
            if (el._hasTransitionInterceptor) return;
            el._hasTransitionInterceptor = true;

            const origRemove = el.classList.remove.bind(el.classList);
            const origToggle = el.classList.toggle.bind(el.classList);
            const origAdd = el.classList.add.bind(el.classList);

            el.classList.add = function(...tokens) {
                if (el._closingTimeout) {
                    clearTimeout(el._closingTimeout);
                    el._closingTimeout = null;
                }
                origRemove('closing');
                return origAdd(...tokens);
            };

            el.classList.remove = function(...tokens) {
                if (document.body.classList.contains('disable-transitions') || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
                    if (el._closingTimeout) {
                        clearTimeout(el._closingTimeout);
                        el._closingTimeout = null;
                    }
                    origRemove('closing');
                    return origRemove(...tokens);
                }
                const transitionClasses = ['show', 'active', 'visible'];
                const targetClass = tokens.find(t => transitionClasses.includes(t));
                if (targetClass && el.classList.contains(targetClass)) {
                    el.classList.add('closing');
                    el._closingTimeout = setTimeout(() => {
                        origRemove(...tokens);
                        origRemove('closing');
                        el._closingTimeout = null;
                    }, 240);
                    return;
                }
                return origRemove(...tokens);
            };

            el.classList.toggle = function(token, force) {
                const shouldAdd = force !== undefined ? force : !el.classList.contains(token);
                if (shouldAdd) {
                    el.classList.add(token);
                    return true;
                } else {
                    el.classList.remove(token);
                    return false;
                }
            };
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachToElements);
    } else {
        attachToElements();
    }
    // Periodic check to attach to dynamically created elements
    setInterval(attachToElements, 2000);
}
initTransitionInterceptors();

// --- Locked Feature Handlers ---
document.addEventListener('click', (e) => {
    const btn = e.target.closest('#socialBtn, #statsBtn, #skinsSidebarBtn, #wkPublishBtn');
    if (btn && btn.classList.contains('locked-feature')) {
        e.preventDefault();
        e.stopPropagation();
        if (btn.id === 'skinsSidebarBtn') {
            const modal = document.getElementById('featureLockedSkinsModal');
            if (modal) modal.classList.add('show');
        } else {
            const modal = document.getElementById('featureLockedHWModal');
            if (modal) modal.classList.add('show');
        }
    }
}, true);

function initLockedFeatureListeners() {
    const openRegisterWebBtn = document.getElementById('openRegisterWebBtn');
    if (openRegisterWebBtn) {
        openRegisterWebBtn.addEventListener('click', async () => {
            const url = "https://abeloskyyy.github.io/HelloWorld-Launcher/?register=true";
            if (window.electronAPI && window.electronAPI.openUrl) {
                await window.electronAPI.openUrl(url);
            } else if (window.pywebview && window.pywebview.api && window.pywebview.api.open_url) {
                await window.pywebview.api.open_url(url);
            } else {
                window.open(url, '_blank');
            }
            const modal = document.getElementById('featureLockedHWModal');
            if (modal) modal.classList.remove('show');
        });
    }
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLockedFeatureListeners);
} else {
    initLockedFeatureListeners();
}

// Fix Electron/Chromium input focus bug in overlay modals
document.addEventListener('mousedown', (e) => {
    const input = e.target.closest('input:not([type="file"]):not([type="checkbox"]):not([type="radio"]), textarea');
    if (input && !input.disabled && !input.readOnly) {
        setTimeout(() => input.focus(), 10);
    }
}, true);

// HW Services Down Banner
window.showServicesDownBanner = function() {
    const hwBanner = document.getElementById('hwServicesDownBanner');
    if (hwBanner) {
        hwBanner.style.display = 'flex';
        const msBanner = document.getElementById('msVerifyBanner');
        if (msBanner) msBanner.style.display = 'none';
    }
};

// Close button removed intentionally

if (window.hwlAPI && window.hwlAPI.onServicesDown429) {
    window.hwlAPI.onServicesDown429(() => {
        window.showServicesDownBanner();
    });
}

// =======================================================
// MOD DEPENDENCIES MODAL CONTROLLER
// =======================================================

(function () {
    'use strict';

    let _modDepsResolve = null; // Promise resolver for user choice
    let _modDepsData = null;    // Cached deps result

    function t(key, params) {
        if (window.t) return window.t(key, params);
        return key;
    }

    function esc(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function buildDepCard(dep, badgeClass, badgeText, isInstalled) {
        const p = dep.project || {};
        const name = esc(p.title || dep.project_id);
        const authors = (p.team || (p.author ? [p.author] : []));
        const author = esc(authors && authors.length > 0 ? authors[0] : '');
        const desc = esc(p.description || '');
        const iconUrl = p.icon_url || '';
        const iconHtml = iconUrl
            ? `<img class="mod-dep-icon" src="${esc(iconUrl)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="mod-dep-icon-placeholder" style="display:none"><i class="fas fa-puzzle-piece"></i></div>`
            : `<div class="mod-dep-icon-placeholder"><i class="fas fa-puzzle-piece"></i></div>`;

        const authorStr = author ? (t('workshop.deps.author', { author }) || `by ${author}`) : '';

        return `<div id="dep-card-${dep.project_id}" class="mod-dep-card${isInstalled ? ' is-installed' : ''}">
            ${iconHtml}
            <div class="mod-dep-info">
                <div class="mod-dep-name">${name}</div>
                ${authorStr ? `<div class="mod-dep-author">${esc(authorStr)}</div>` : ''}
                ${desc ? `<div class="mod-dep-desc">${desc}</div>` : ''}
            </div>
            <span class="mod-dep-badge ${badgeClass}">${badgeText}</span>
            <div class="mod-dep-progress-bg">
                <div id="dep-progress-${dep.project_id}" class="mod-dep-progress-fill"></div>
            </div>
        </div>`;
    }

    function renderSection(listEl, countEl, sectionEl, deps, badgeClass, badgeText, isInstalled) {
        if (!deps || deps.length === 0) {
            if (sectionEl) sectionEl.style.display = 'none';
            return;
        }
        if (sectionEl) sectionEl.style.display = '';
        if (countEl) countEl.textContent = deps.length;
        if (listEl) {
            listEl.innerHTML = deps.map(d => buildDepCard(d, badgeClass, badgeText, isInstalled)).join('');
        }
    }

    window.openModDepsModal = function (depsResult, _ctx) {
        _modDepsData = depsResult;

        const modal = document.getElementById('modDepsModal');
        const loadingEl = document.getElementById('modDepsLoading');
        const contentEl = document.getElementById('modDepsContent');
        const footerEl = document.getElementById('modDepsFooter');
        const emptyEl = document.getElementById('modDepsEmpty');

        if (!modal) return Promise.resolve('cancel');

        // Reset state
        if (loadingEl) loadingEl.style.display = 'none';
        if (contentEl) contentEl.style.display = 'block';
        if (emptyEl) emptyEl.style.display = 'none';

        const required = depsResult.required || [];
        const optional = depsResult.optional || [];
        const alreadyInstalled = depsResult.alreadyInstalled || [];

        const reqText = t('workshop.deps.required_section') || 'Required';
        const optText = t('workshop.deps.optional_section') || 'Optional';
        const instText = t('workshop.deps.installed_section') || 'Installed';

        renderSection(
            document.getElementById('modDepsRequiredList'),
            document.getElementById('modDepsRequiredCount'),
            document.getElementById('modDepsRequiredSection'),
            required, 'mod-dep-badge-required', reqText, false
        );
        renderSection(
            document.getElementById('modDepsOptionalList'),
            document.getElementById('modDepsOptionalCount'),
            document.getElementById('modDepsOptionalSection'),
            optional, 'mod-dep-badge-optional', optText, false
        );
        renderSection(
            document.getElementById('modDepsInstalledList'),
            document.getElementById('modDepsInstalledCount'),
            document.getElementById('modDepsInstalledSection'),
            alreadyInstalled, 'mod-dep-badge-installed', instText, true
        );

        const hasAny = required.length > 0 || optional.length > 0 || alreadyInstalled.length > 0;
        if (!hasAny && emptyEl) {
            emptyEl.style.display = 'flex';
        }

        // Show/hide Required Only button
        if (footerEl) {
            footerEl.style.display = 'flex';
            if (required.length === 0) {
                footerEl.classList.add('no-required');
            } else {
                footerEl.classList.remove('no-required');
            }
        }

        // Update footer button labels with i18n and reset states
        const cancelBtn = document.getElementById('modDepsCancelBtn');
        const reqBtn = document.getElementById('modDepsRequiredBtn');
        const allBtn = document.getElementById('modDepsAllBtn');
        
        if (cancelBtn) { 
            cancelBtn.disabled = false;
            cancelBtn.innerHTML = `<i class="fas fa-times"></i> <span data-i18n="workshop.deps.btn_cancel">${t('workshop.deps.btn_cancel') || 'Skip'}</span>`;
        }
        if (reqBtn) { 
            reqBtn.style.display = '';
            reqBtn.disabled = false;
            reqBtn.innerHTML = `<i class="fas fa-exclamation-circle"></i> <span data-i18n="workshop.deps.btn_required">${t('workshop.deps.btn_required') || 'Required Only'}</span>`;
        }
        if (allBtn) { 
            allBtn.disabled = false;
            let btnText = t('workshop.deps.btn_all') || 'Download All';
            if (optional.length === 0 && required.length > 0) {
                // No optionals: rename "Download All" to "Download Required"
                btnText = t('workshop.deps.btn_required') || 'Required Only';
                if (reqBtn) reqBtn.style.display = 'none';
            }
            allBtn.innerHTML = `<i class="fas fa-download"></i> <span data-i18n="workshop.deps.btn_all">${btnText}</span>`;
        }

        modal.classList.add('show');

        // Apply i18n translation to newly rendered elements
        if (window.applyI18n) window.applyI18n(modal);

        // Return a Promise that resolves when user clicks a button
        return new Promise((resolve) => {
            _modDepsResolve = resolve;
        });
    };

    window.closeModDepsModal = function (cancel = false) {
        const modal = document.getElementById('modDepsModal');
        if (modal) modal.classList.remove('show');
        if (_modDepsResolve) {
            _modDepsResolve(cancel ? 'cancel' : null);
            _modDepsResolve = null;
        }
    };

    window.installModDeps = function (mode) {
        // Disable buttons
        const reqBtn = document.getElementById('modDepsRequiredBtn');
        const allBtn = document.getElementById('modDepsAllBtn');
        const cancelBtn = document.getElementById('modDepsCancelBtn');
        
        const optCount = document.getElementById('modDepsOptionalCount')?.textContent || '0';
        const reqCount = document.getElementById('modDepsRequiredCount')?.textContent || '0';
        const hasDownloads = mode === 'all' ? (parseInt(optCount) + parseInt(reqCount) > 0) : (parseInt(reqCount) > 0);

        if (reqBtn) reqBtn.disabled = true;
        if (allBtn) {
            allBtn.disabled = true;
            if (hasDownloads) {
                const originalText = allBtn.querySelector('span') ? allBtn.querySelector('span').textContent : allBtn.textContent;
                allBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + originalText;
            }
        }
        if (cancelBtn) cancelBtn.disabled = true;

        if (_modDepsResolve) {
            _modDepsResolve(mode); // 'all' or 'required'
            _modDepsResolve = null;
            // DO NOT close modal immediately. The caller will handle it.
        }
    };

    // Close when clicking backdrop
    document.addEventListener('click', (e) => {
        const modal = document.getElementById('modDepsModal');
        if (modal && modal.classList.contains('show') && e.target === modal) {
            window.closeModDepsModal(true);
        }
    });

})();

// --- Modal Backdrop Click Dismissal for Global Modals ---
document.addEventListener('click', (e) => {
    ['errorModal', 'statsModal', 'loginModal', 'featureLockedHWModal', 'featureLockedSkinsModal'].forEach(id => {
        const modal = document.getElementById(id);
        if (modal && modal.classList.contains('show') && e.target === modal) {
            if (id === 'errorModal' && window.closeErrorModal) window.closeErrorModal();
            else modal.classList.remove('show');
        }
    });
});

// --- Global Escape Key Handling for Modals and Submodals ---
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;

    // Ordered list of submodals first (high priority to close without closing base modal)
    const submodals = [
        { id: 'errorModal', close: () => window.closeErrorModal && window.closeErrorModal() },
        { id: 'broadcastModal', close: () => window.closeBroadcastModal && window.closeBroadcastModal() },
        { id: 'shareProfileModal', close: () => window.closeShareProfileModal && window.closeShareProfileModal() },
        { id: 'shareSeedModal', close: () => window.closeShareSeedModal && window.closeShareSeedModal() },
        { id: 'shareServerModal', close: () => window.closeShareServerModal && window.closeShareServerModal() },
        { id: 'shareLinkModal', close: () => { const m = document.getElementById('shareLinkModal'); if (m) m.classList.remove('show'); } },
        { id: 'joinServerModal', close: () => { const m = document.getElementById('joinServerModal'); if (m) m.classList.remove('show'); } },
        { id: 'viewProfileModal', close: () => window.closeViewProfileModal && window.closeViewProfileModal() },
        { id: 'installProfileModal', close: () => window.closeInstallProfileModal && window.closeInstallProfileModal() },
        { id: 'userProfileModal', close: () => { const m = document.getElementById('userProfileModal'); if (m) m.classList.remove('show'); } },
        { id: 'wkProfileSelectModal', close: () => window.closeWkProfileSelectModal && window.closeWkProfileSelectModal() },
        { id: 'wkRejectModal', close: () => window.closeWkRejectModal && window.closeWkRejectModal() },
        { id: 'modDepsModal', close: () => window.closeModDepsModal && window.closeModDepsModal(true) },
        { id: 'imageModal', close: () => { const m = document.getElementById('imageModal'); if (m) m.classList.remove('show'); } }
    ];

    for (const sm of submodals) {
        const el = document.getElementById(sm.id);
        if (el && (el.classList.contains('show') || (el.style.display && el.style.display !== 'none'))) {
            sm.close();
            e.stopPropagation();
            return;
        }
    }

    // Next, check base modals
    const baseModals = [
        { id: 'wkCreateModal', close: () => window.closeWkCreateModal && window.closeWkCreateModal() },
        { id: 'wkItemModal', close: () => window.closeWkItemModal && window.closeWkItemModal() },
        { id: 'modDetailsModal', close: () => { const m = document.getElementById('modDetailsModal'); if (m) m.classList.remove('show'); } },
        { id: 'statsModal', close: () => { const m = document.getElementById('statsModal'); if (m) m.classList.remove('show'); } },
        { id: 'socialModal', close: () => window.closeSocialModal && window.closeSocialModal() },
        { id: 'loginModal', close: () => { const m = document.getElementById('loginModal'); if (m) m.classList.remove('show'); } },
        { id: 'accountSwitcherModal', close: () => { const m = document.getElementById('accountSwitcherModal'); if (m) m.classList.remove('show'); } },
        { id: 'donationModal', close: () => { const m = document.getElementById('donationModal'); if (m) m.classList.remove('show'); } },
        { id: 'featureLockedHWModal', close: () => { const m = document.getElementById('featureLockedHWModal'); if (m) m.classList.remove('show'); } },
        { id: 'featureLockedSkinsModal', close: () => { const m = document.getElementById('featureLockedSkinsModal'); if (m) m.classList.remove('show'); } }
    ];

    for (const bm of baseModals) {
        const el = document.getElementById(bm.id);
        if (el && (el.classList.contains('show') || (el.style.display && el.style.display !== 'none'))) {
            bm.close();
            e.stopPropagation();
            return;
        }
    }
});


