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
const cancelDownloadBtn = document.getElementById('cancelDownloadBtn2');

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

// Función global para actualizar el progreso de instalación
// Función global para actualizar el progreso de instalación
window.updateInstallProgress = function (version, percentage, status) {
    const progressContainer = document.getElementById('downloadProgressContainer');
    const progressBar = document.getElementById('downloadProgressBarFill');
    const progressText = document.getElementById('downloadProgressText');
    const progressPercentage = document.getElementById('downloadProgressPercentage');

    if (progressContainer && progressBar && progressText && progressPercentage) {
        progressContainer.style.display = 'block';
        progressText.textContent = status || `Installing ${version}...`;
        progressBar.style.width = `${percentage}%`;
        progressPercentage.textContent = `${percentage}%`;

        // Don't auto-hide on completion, let onDownloadComplete handle it
    }
};

// Global function called when download completes
window.onDownloadComplete = async function (version) {
    console.log(`Download completed: ${version}`);
    isDownloading = false;
    endDownloadState();

    // Refresh version lists
    await loadVersions();

    // Hide progress after a delay
    setTimeout(() => {
        const progressContainer = document.getElementById('downloadProgressContainer');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
    }, 2000);
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

async function cancelDownload() {
    try {
        const result = await window.pywebview.api.cancel_download();
        if (result.success) {
            console.log('Download cancelled');
            closeDownloadProgress();

            // Don't create profile, just show message
            window.pywebview.api.info('Download cancelled. The version has not been installed.');
        }
    } catch (error) {
        console.error('Error cancelling download:', error);
    }
}


function saveSettings() {
    const username = document.getElementById("nickname").value;
    const mcdir = document.getElementById("mcdir").value;
    const devModeCheckbox = document.getElementById("devModeCheckbox");
    const devMode = devModeCheckbox ? devModeCheckbox.checked : false;

    const showSnapshots = document.getElementById("showSnapshotsCheckbox")?.checked || false;
    const showOld = document.getElementById("showOldVersionsCheckbox")?.checked || false;

    // Get current data to check if dev mode changed
    window.pywebview.api.get_user_json().then(currentData => {
        const devModeChanged = currentData.dev_mode !== devMode;

        window.pywebview.api.save_user_json(username, mcdir).then(async data => {
            // Save dev_mode and other settings separately or extend save_user_json
            // For simplicity and matching current structure, we'll extend saving logic
            try {
                // Update local cache and state
                versionCache.vanilla = null; // Force refresh vanilla versions

                // Custom API calls for extra settings if needed, or update data directly
                // Save version settings
                await window.pywebview.api.save_version_settings(showSnapshots, showOld);

                await window.pywebview.api.save_dev_mode(devMode);

                // Let's modify the user data in backend with new fields
                // Since save_user_json might not handle showSnapshots/showOld yet in its signature,
                // we'll rely on a generic way or update main.py. 
                // Wait, I didn't update save_user_json signature in main.py yet. I should do that first.
                // Actually, I can just send them as part of the data if I update the backend.

                // For now, let's assume we update the backend to handle these in save_user_json or separate calls.
                // I'll update main.py next to handle these.

                if (devModeChanged) {
                    window.pywebview.api.info('Settings saved. Please restart the launcher for developer mode changes to take effect.');
                }
            } catch (err) {
                console.error("Error saving settings:", err);
            }
        });
    });
}

if (document.getElementById("mcdir")) {
    document.getElementById("mcdir").addEventListener("input", () => {
        const nick = document.getElementById("nickname").value;
        const mcdir = document.getElementById("mcdir").value;
        window.pywebview.api.save_user_json(nick, mcdir);
    });
}

// PyWebView Ready
// PyWebView Ready
window.addEventListener('pywebviewready', async () => {
    // Check internet connection first
    try {
        const hasInternet = await window.pywebview.api.check_internet();

        if (!hasInternet) {
            // Show no internet modal
            const noInternetModal = document.getElementById('noInternetModal');
            if (noInternetModal) {
                noInternetModal.style.display = 'flex';

                // Close app button
                const closeAppBtn = document.getElementById('closeAppBtn');
                if (closeAppBtn) {
                    closeAppBtn.addEventListener('click', async () => {
                        await window.pywebview.api.close_app();
                    });
                }

                // Continue anyway button
                const continueAnywayBtn = document.getElementById('continueAnywayBtn');
                if (continueAnywayBtn) {
                    continueAnywayBtn.addEventListener('click', () => {
                        noInternetModal.style.display = 'none';
                    });
                }
            }
        }
    } catch (error) {
        console.error("Error checking internet:", error);
    }

    try {
        await loadOptions();

        const data = await window.pywebview.api.get_user_json();
        if (document.getElementById("nickname")) document.getElementById("nickname").value = data.username || "";
        if (document.getElementById("mcdir")) document.getElementById("mcdir").value = data.mcdir || "";

        // Update UI based on initial data
        await updateUserInterface(data);

        // Microsoft Session Refresh
        if (data.account_type === 'microsoft') {
            console.log("Checking Microsoft session...");
            try {
                const res = await window.pywebview.api.refresh_session();
                if (res.success) {
                    console.log("Session refreshed");
                    await loadSkinData();
                } else if (res.expired) {
                    console.warn("Session expired");
                    window.pywebview.api.info("Your Microsoft session has expired. Please log in again.");
                }
            } catch (err) {
                console.error("Session refresh error:", err);
            }
        }

        // Load developer mode checkbox
        const devModeCheckbox = document.getElementById("devModeCheckbox");
        if (devModeCheckbox) {
            devModeCheckbox.checked = data.dev_mode || false;
        }

        // Load version settings
        const showSnapshotsCheckbox = document.getElementById("showSnapshotsCheckbox");
        if (showSnapshotsCheckbox) {
            showSnapshotsCheckbox.checked = data.show_snapshots || false;
        }

        const showOldVersionsCheckbox = document.getElementById("showOldVersionsCheckbox");
        if (showOldVersionsCheckbox) {
            showOldVersionsCheckbox.checked = data.show_old || false;
        }

        // Load launcher version
        try {
            const version = await window.pywebview.api.get_launcher_version();
            const versionElement = document.getElementById("launcherVersion");
            if (versionElement) {
                versionElement.textContent = version;
            }
        } catch (err) {
            console.error("Error loading version:", err);
        }

        await loadProfiles();
        await loadVersions();
    } catch (error) {
        console.error("Error loading initial data:", error);
    } finally {
        // Ocultar loader
        const loader = document.getElementById('initialLoader');
        if (loader) {
            loader.classList.add('hidden');
            setTimeout(() => {
                loader.style.display = 'none';
            }, 500);
        }
    }
});

// --- NEW AUTH FUNCTIONS ---

async function updateUserInterface(userData) {
    const badge = document.getElementById('userBadge');
    const name = document.getElementById('userDisplayName');
    const loginBtn = document.getElementById('loginButton');
    const skinsBtn = document.getElementById('skinsSidebarBtn');

    // Check if logged in (either offline or microsoft)
    if (userData.username && userData.username !== "") {
        if (badge) badge.style.display = 'flex';
        if (name) name.textContent = userData.username;
        if (loginBtn) loginBtn.style.display = 'none';

        if (userData.account_type === 'microsoft') {
            if (skinsBtn) skinsBtn.style.display = 'flex';
        } else {
            if (skinsBtn) skinsBtn.style.display = 'none';
            // For offline users, show default Steve head
            if (window.renderUserHead) {
                const username = userData.username || 'Steve';
                const skinUrl = `https://mc-heads.net/avatar/${username}`;
                await window.renderUserHead(skinUrl);
            }
        }
    } else {
        if (badge) badge.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'flex';
        if (skinsBtn) skinsBtn.style.display = 'none';
    }
}

async function loadSkinData() {
    try {
        const data = await window.pywebview.api.get_skin_data();
        const userData = await window.pywebview.api.get_user_json();

        const skinImg = document.getElementById('skinPreviewImg');
        const capeImg = document.getElementById('capePreviewImg');
        const badge = document.getElementById('skinVariantBadge');
        const capeBadge = document.getElementById('capeBadge');
        const noCape = document.getElementById('noCapeText');

        // Use crafatar.com for reliable skin rendering
        const username = userData.username || 'Steve';
        const skinUrl = `https://mc-heads.net/avatar/${username}`;

        if (data.skin && skinImg) {
            skinImg.src = data.skin;
            if (badge) badge.textContent = data.variant === 'slim' ? 'Slim (Alex)' : 'Classic (Steve)';
        } else if (skinImg) {
            // Default Steve if no skin
            skinImg.src = skinUrl;
            if (badge) badge.textContent = 'Classic (Steve)';
        }

        if (data.cape && capeImg) {
            capeImg.src = data.cape;
            capeImg.style.display = 'block';
            if (noCape) noCape.style.display = 'none';
            if (capeBadge) capeBadge.style.display = 'inline-block';
        } else {
            if (capeImg) capeImg.style.display = 'none';
            if (noCape) noCape.style.display = 'block';
            if (capeBadge) capeBadge.style.display = 'none';
        }

        // Render 3D head in user badge
        if (window.renderUserHead) {
            await window.renderUserHead(skinUrl);
        }
    } catch (e) {
        console.error("Error loading skin data", e);
    }
}

// Global Login Callbacks
window.onLoginSuccess = async function () {
    const data = await window.pywebview.api.get_user_json();
    await updateUserInterface(data);

    const loginMicrosoftBtn = document.getElementById('loginMicrosoftBtn');
    if (loginMicrosoftBtn) {
        loginMicrosoftBtn.innerHTML = '<i class="fab fa-microsoft"></i> Login with Microsoft';
        loginMicrosoftBtn.disabled = false;
    }

    const modal = document.getElementById('loginModal');
    if (modal) modal.classList.remove('show');

    loadSkinData();
};

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

async function launchGame() {
    const profileSelectElement = document.getElementById("profileSelect");

    if (!profileSelectElement || !profileSelectElement.value) {
        window.pywebview.api.error("You must select a profile before playing");
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

    // Try to launch the game
    const result = await pywebview.api.start_game(selectedProfile, nickname);

    // Handle duplicate instance
    if (result.status === "already_running") {
        const confirm = await window.pywebview.api.confirm(
            "Minecraft is already open. Do you want to open another instance?"
        );
        if (confirm) {
            // Force launch
            const forceResult = await pywebview.api.start_game(selectedProfile, nickname, true);
            if (forceResult.status === "error") {
                return;
            }
        } else {
            return;
        }
    } else if (result.status === "error") {
        return;
    }


    // Show loading state - will be cleared by onMinecraftReady or onMinecraftClosed
    const playButton = document.querySelector('.play-button');
    if (playButton) {
        playButton.disabled = true;
        playButton.style.cursor = 'not-allowed';
        playButton.style.opacity = '0.6';
        playButton.innerHTML = '<span class="spinner"></span> Loading...';
    }
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
}

// Callback when Minecraft closes
function onMinecraftClosed() {
    const playButton = document.querySelector('.play-button');
    if (playButton) {
        playButton.innerHTML = 'Play';
        playButton.disabled = false;
        playButton.style.cursor = 'pointer';
        playButton.style.opacity = '1';
    }

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
    const versionSelect = document.getElementById('profileVersionSelect');
    if (!versionSelect) return;
    versionSelect.innerHTML = '';

    try {
        // Now we only get INSTALLED versions for this dropdown
        const versionsData = await window.pywebview.api.get_available_versions();

        // Helper function to create optgroups
        const createGroup = (label, items) => {
            if (items && items.length > 0) {
                const group = document.createElement('optgroup');
                group.label = label;
                items.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item;
                    option.textContent = item;
                    group.appendChild(option);
                });
                versionSelect.appendChild(group);
            }
        };

        // 1. Instaladas
        if (versionsData.installed && versionsData.installed.length > 0) {
            createGroup('Installed', versionsData.installed);
        } else {
            const option = document.createElement('option');
            option.textContent = "No installed versions found";
            option.disabled = true;
            versionSelect.appendChild(option);
        }

    } catch (error) {
        console.error('Error loading versions:', error);
        window.pywebview.api.error('Error loading version list');
    }
}

async function loadOptions() {
    const profilesData = await window.pywebview.api.get_profiles();
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
        if (document.getElementById('selectedTitle')) document.getElementById('selectedTitle').textContent = "No profiles found";
        if (document.getElementById('selectedSubtitle')) document.getElementById('selectedSubtitle').textContent = "Create a profile to play";

        if (selectOptions) {
            const createOption = document.createElement('div');
            createOption.className = 'select-option';
            createOption.innerHTML = `
                <div class="option-icon" style="display: flex; align-items: center; justify-content: center; font-size: 24px; color: #fff; background: rgba(255, 255, 255, 0.1);"><i class="fas fa-plus"></i></div>
                <div class="option-content">
                    <div class="option-title">Create New Profile</div>
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
                emptyMsg.innerHTML = `<i class="fas fa-filter"></i> No ${activeProfileFilter} profiles found`;

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
                const versionLower = profile.version.toLowerCase();
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
        alert('Log copied to clipboard');
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

async function loadProfiles() {
    const profilesData = await window.pywebview.api.get_profiles();
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
        const iconUrl = await window.pywebview.api.get_profile_icon(profile.icon);
        const lastPlayedText = profile.last_played ? timeAgo(profile.last_played) : 'Never';

        const item = document.createElement("div");
        item.className = "profile-card";
        item.innerHTML = `
            <img src="${iconUrl}" id="profile-img">
            <div class="profile-info">
                <h3>${profile.name}</h3>
                <p>Version: ${profile.version} | Last played: ${lastPlayedText}</p>
            </div>
            <div class="profile-actions">
                <button class="btn-secondary btn-small edit-btn"><i class="fas fa-edit"></i> Edit</button>
                <button class="btn-danger btn-small delete-btn"><i class="fas fa-trash"></i> Delete</button>
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

            const confirmed = await window.pywebview.api.confirm(`Are you sure you want to delete the profile "${profile.name}"?`);
            if (confirmed) {
                await window.pywebview.api.delete_profile(id);
                await loadProfiles();
                await loadOptions();
                await loadModdableProfiles();
            }
        };

        item.onclick = () => {
            console.log("Profile selected:", id);
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
    if (document.getElementById('profileVersionSelect')) document.getElementById('profileVersionSelect').value = '';

    // Set default JVM arguments with optimized settings
    const defaultJVMArgs = '-Xmx4G -Xms1G -XX:+UnlockExperimentalVMOptions -XX:+UseG1GC -XX:G1NewSizePercent=20 -XX:G1ReservePercent=20 -XX:MaxGCPauseMillis=50 -XX:G1HeapRegionSize=32M';
    if (document.getElementById('profileJVMArgs')) document.getElementById('profileJVMArgs').value = defaultJVMArgs;

    if (document.getElementById('profileDir')) document.getElementById('profileDir').value = '';

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
    if (acceptProfileBtn) acceptProfileBtn.textContent = "Create Profile";
    if (document.querySelector('#modal h2')) document.querySelector('#modal h2').textContent = "Create New Profile";
}

async function openEditProfileModal(id, profile) {
    await resetProfileModal();
    editingProfileId = id;

    if (document.getElementById('profileName')) document.getElementById('profileName').value = profile.name;
    if (document.getElementById('profileVersionSelect')) document.getElementById('profileVersionSelect').value = profile.version;
    if (document.getElementById('profileJVMArgs')) document.getElementById('profileJVMArgs').value = profile.jvm_args || '';
    if (document.getElementById('profileDir')) document.getElementById('profileDir').value = profile.directory || '';

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
    if (document.querySelector('#modal h2')) document.querySelector('#modal h2').textContent = "Edit Profile";
    if (profileModal) profileModal.classList.add('show');
}

if (createProfileBtn) {
    createProfileBtn.addEventListener('click', async () => {
        await loadVersions(); // Refresh versions list
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
        const profileName = document.getElementById('profileName').value;
        const profileVersion = document.getElementById('profileVersionSelect').value;
        const profileJVMArgs = document.getElementById('profileJVMArgs').value;
        const profileDir = document.getElementById('profileDir').value;
        const profileIcon = getSelectedIcon();

        // Validación
        const missingFields = [];
        const trimmedName = profileName.trim();
        if (!trimmedName) {
            missingFields.push("Profile Name");
        } else if (trimmedName.length < 2) {
            window.pywebview.api.error('Profile name must be at least 2 characters');
            return;
        }
        if (!profileVersion) missingFields.push("Version");
        if (!profileDir.trim()) missingFields.push("Directory");

        if (missingFields.length > 0) {
            window.pywebview.api.error(`You cannot leave these fields empty:\n- ${missingFields.join('\n- ')}`);
            return;
        }

        if (editingProfileId) {
            const updatedData = {
                name: profileName,
                version: profileVersion,
                jvm_args: profileJVMArgs,
                directory: profileDir
            };

            if (profileIcon) {
                updatedData.icon = profileIcon;
            }

            await window.pywebview.api.edit_profile(editingProfileId, updatedData);
            await loadProfiles();
            await loadOptions();
            await loadModdableProfiles();
            if (profileModal) profileModal.classList.remove('show');
            resetProfileModal();
        } else {
            // Create new profile
            try {
                // Note: add_profile in backend might still try to install if missing, 
                // but UI now restricts to installed versions.
                const result = await window.pywebview.api.add_profile(profileName, profileVersion, profileIcon, profileDir, profileJVMArgs);

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
                console.error('Error creating profile:', error);
                window.pywebview.api.error('Error creating profile');
            }
        }
    });
}

// Cancel download button handler
if (cancelDownloadBtn) {
    cancelDownloadBtn.addEventListener('click', async () => {
        // Save original content and add spinner
        const originalContent = cancelDownloadBtn.innerHTML;
        const width = cancelDownloadBtn.offsetWidth;
        const height = cancelDownloadBtn.offsetHeight;

        // Set fixed size to prevent resizing
        cancelDownloadBtn.style.width = width + 'px';
        cancelDownloadBtn.style.height = height + 'px';

        cancelDownloadBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
        cancelDownloadBtn.disabled = true;
        cancelDownloadBtn.style.cursor = 'not-allowed';
        cancelDownloadBtn.style.opacity = '0.7';

        try {
            await cancelDownload();
        } finally {
            // If the button still exists, restore state (although it will probably disappear)
            if (cancelDownloadBtn) {
                cancelDownloadBtn.innerHTML = originalContent;
                cancelDownloadBtn.disabled = false;
                cancelDownloadBtn.style.cursor = 'pointer';
                cancelDownloadBtn.style.opacity = '1';
                cancelDownloadBtn.style.width = '';
                cancelDownloadBtn.style.height = '';
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
                selectedImageData = {
                    base64: e.target.result,
                    filename: file.name,
                    type: file.type
                };

                if (iconPreview) {
                    iconPreview.src = e.target.result;
                    iconPreview.style.display = 'block';
                }
                if (placeholderIcon) placeholderIcon.style.display = 'none';

                // Cerrar el modal de imagenes
                if (imageModal) imageModal.classList.remove('show');
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

// Close login modal when clicking outside
if (loginModal) {
    loginModal.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            loginModal.classList.remove('show');
        }
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

// Initial check
window.addEventListener('pywebviewready', checkLoginState);


// ==============================================
// DOWNLOAD MANAGER LOGIC
// ==============================================

const downloadModal = document.getElementById('downloadModal');
const openDownloadModalBtn = document.getElementById('openDownloadModalBtn');
const cancelDownloadModalBtn = document.getElementById('cancelDownloadModalBtn');
const startDownloadBtn = document.getElementById('startDownloadBtn');
const downloadMcVersionSelect = document.getElementById('downloadMcVersion');
const downloadLoaderVersionSelect = document.getElementById('downloadLoaderVersion');
const loaderVersionGroup = document.getElementById('loaderVersionGroup');
const loaderTypeBtns = document.querySelectorAll('.loader-type-btn');
const cancelDownloadBtn2 = document.getElementById('cancelDownloadBtn2');

let currentLoaderType = 'vanilla';
const versionCache = {
    vanilla: null,
    fabric: null,
    forge: null
};

if (openDownloadModalBtn) {
    openDownloadModalBtn.addEventListener('click', () => {
        openDownloadModal();
    });
}

if (cancelDownloadModalBtn) {
    cancelDownloadModalBtn.addEventListener('click', () => {
        if (downloadModal) downloadModal.classList.remove('show');
    });
}

if (startDownloadBtn) {
    startDownloadBtn.addEventListener('click', () => {
        startVersionDownload();
    });
}



// Loader Type Switching
loaderTypeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        switchLoaderType(type);
    });
});

// MC Version Change (for loading loader versions)
if (downloadMcVersionSelect) {
    downloadMcVersionSelect.addEventListener('change', () => {
        if (currentLoaderType !== 'vanilla') {
            loadLoaderVersions(currentLoaderType, downloadMcVersionSelect.value);
        }
    });
}

// Preload versions on startup
async function preloadVersions() {
    console.log("Preloading versions...");
    try {
        // Fetch in parallel
        const [vanilla, fabric, forge] = await Promise.all([
            window.pywebview.api.get_vanilla_versions(),
            window.pywebview.api.get_fabric_mc_versions(),
            window.pywebview.api.get_forge_mc_versions()
        ]);

        versionCache.vanilla = vanilla;
        versionCache.fabric = fabric;
        versionCache.forge = forge;
        console.log("Versions preloaded successfully");
    } catch (err) {
        console.error("Error preloading versions:", err);
    }
}

async function openDownloadModal() {
    if (downloadModal) downloadModal.classList.add('show');

    // Reset UI
    document.getElementById('downloadProgressContainer').style.display = 'none';
    startDownloadBtn.disabled = false;
    cancelDownloadModalBtn.disabled = false;

    // Default to Vanilla
    switchLoaderType('vanilla');
}

async function switchLoaderType(type) {
    currentLoaderType = type;

    // Update buttons
    loaderTypeBtns.forEach(btn => {
        if (btn.dataset.type === type) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Show/Hide Loader Version
    if (type === 'vanilla') {
        loaderVersionGroup.style.display = 'none';
    } else {
        loaderVersionGroup.style.display = 'flex';
        downloadLoaderVersionSelect.innerHTML = '<option value="">Loading...</option>';
    }

    // Load MC Versions
    await loadMcVersions(type);
}

async function loadMcVersions(type) {
    downloadMcVersionSelect.innerHTML = '<option value="">Loading...</option>';
    downloadMcVersionSelect.disabled = true;

    try {
        let versions = [];

        // Check cache first
        if (versionCache[type]) {
            versions = versionCache[type];
        } else {
            // Fallback to fetch if not cached (and update cache)
            if (type === 'vanilla') {
                versions = await window.pywebview.api.get_vanilla_versions();
            } else if (type === 'fabric') {
                versions = await window.pywebview.api.get_fabric_mc_versions();
            } else if (type === 'forge') {
                versions = await window.pywebview.api.get_forge_mc_versions();
            }
            versionCache[type] = versions;
        }

        downloadMcVersionSelect.innerHTML = '';

        if (versions.length === 0) {
            const option = document.createElement('option');
            option.textContent = "No versions found";
            downloadMcVersionSelect.appendChild(option);
        } else {
            versions.forEach(v => {
                const option = document.createElement('option');
                option.value = v;
                option.textContent = v;
                downloadMcVersionSelect.appendChild(option);
            });

            // Trigger change to load loader versions if needed
            if (type !== 'vanilla' && versions.length > 0) {
                downloadMcVersionSelect.value = versions[0];
                loadLoaderVersions(type, versions[0]);
            }
        }

    } catch (error) {
        console.error(`Error loading ${type} versions:`, error);
        downloadMcVersionSelect.innerHTML = '<option value="">Error loading</option>';
    } finally {
        downloadMcVersionSelect.disabled = false;
    }
}

async function loadLoaderVersions(type, mcVersion) {
    if (!mcVersion) return;

    downloadLoaderVersionSelect.innerHTML = '<option value="">Loading...</option>';
    downloadLoaderVersionSelect.disabled = true;

    try {
        const loaders = await window.pywebview.api.get_loader_versions(type, mcVersion);

        downloadLoaderVersionSelect.innerHTML = '';

        if (loaders.length === 0) {
            const option = document.createElement('option');
            option.textContent = "No loaders available";
            downloadLoaderVersionSelect.appendChild(option);
        } else {
            loaders.forEach(l => {
                const option = document.createElement('option');
                option.value = l;
                option.textContent = l;
                downloadLoaderVersionSelect.appendChild(option);
            });
        }

    } catch (error) {
        console.error(`Error loading ${type} loaders:`, error);
        downloadLoaderVersionSelect.innerHTML = '<option value="">Error loading</option>';
    } finally {
        downloadLoaderVersionSelect.disabled = false;
    }
}

// Add Change Listener for MC Version Select
if (downloadMcVersionSelect) {
    downloadMcVersionSelect.addEventListener('change', () => {
        const version = downloadMcVersionSelect.value;
        if (currentLoaderType !== 'vanilla' && version) {
            loadLoaderVersions(currentLoaderType, version);
        }
    });
}

async function startVersionDownload() {
    const mcVersion = downloadMcVersionSelect.value;
    console.log(`[StartDownload] Type: ${currentLoaderType}, MC Version: ${mcVersion}`);

    if (!mcVersion) {
        window.pywebview.api.error("Select a Minecraft version");
        return;
    }

    let versionIdToInstall = mcVersion;

    if (currentLoaderType !== 'vanilla') {
        const loaderVersion = downloadLoaderVersionSelect.value;
        if (!loaderVersion) {
            window.pywebview.api.error("Select a Loader version");
            return;
        }

        // Construct ID based on type
        if (currentLoaderType === 'fabric') {
            // For now, let's just use the MC version as the ID suffix, 
            // as mll.fabric.install_fabric installs the latest stable loader by default
            versionIdToInstall = `fabric-${mcVersion}`;
        } else if (currentLoaderType === 'forge') {
            // For Forge, the ID is the forge version string (e.g. "1.20.1-47.1.0")
            versionIdToInstall = `forge-${loaderVersion}`;
        }
    }

    // UI Updates
    document.getElementById('downloadProgressContainer').style.display = 'block';

    // Disable inputs
    startDownloadBtn.disabled = true;
    cancelDownloadModalBtn.disabled = true;
    downloadMcVersionSelect.disabled = true;
    downloadLoaderVersionSelect.disabled = true;
    loaderTypeBtns.forEach(btn => {
        btn.disabled = true;
        btn.style.pointerEvents = 'none'; // Ensure clicks are blocked
        btn.style.opacity = '0.6';
    });

    isDownloading = true;

    try {
        const result = await window.pywebview.api.install_version(versionIdToInstall);

        if (!result.success) {
            window.pywebview.api.error(result.message);
            closeDownloadProgress();
        }

    } catch (error) {
        console.error("Error starting download:", error);
        closeDownloadProgress();
    }
}

// Helper to close download progress and re-enable inputs
function closeDownloadProgress() {
    isDownloading = false;
    const container = document.getElementById('downloadProgressContainer');
    if (container) container.style.display = 'none';

    // Re-enable inputs
    if (startDownloadBtn) startDownloadBtn.disabled = false;
    if (cancelDownloadModalBtn) cancelDownloadModalBtn.disabled = false;
    if (downloadMcVersionSelect) downloadMcVersionSelect.disabled = false;
    if (downloadLoaderVersionSelect) downloadLoaderVersionSelect.disabled = false;

    loaderTypeBtns.forEach(btn => {
        btn.disabled = false;
        btn.style.pointerEvents = '';
        btn.style.opacity = '';
    });
}

// Override global updateInstallProgress to target the new modal
window.updateInstallProgress = function (version, percentage, status) {
    // Update Profile Modal Progress (if open - unlikely now)
    const progressContainer = document.getElementById('installProgress');
    if (progressContainer && progressContainer.style.display !== 'none') {
        const progressBar = document.getElementById('progressBarFill');
        const progressText = document.querySelector('.install-progress-text');
        const progressPercentage = document.getElementById('progressPercentage');

        if (progressBar) progressBar.style.width = `${percentage}%`;
        if (progressText) progressText.textContent = status;
        if (progressPercentage) progressPercentage.textContent = `${percentage}%`;
    }

    // Update Download Modal Progress
    const dlProgressContainer = document.getElementById('downloadProgressContainer');
    if (dlProgressContainer) {
        // Always show the progress container when updating
        dlProgressContainer.style.display = 'block';

        const dlProgressBar = document.getElementById('downloadProgressBarFill');
        const dlProgressText = document.getElementById('downloadProgressText');
        const dlProgressPercentage = document.getElementById('downloadProgressPercentage');

        if (dlProgressBar) {
            dlProgressBar.style.width = `${percentage}%`;

            // Check for indeterminate state (e.g. running installer)
            if (status && (status.includes("Installer") || status.includes("Patching"))) {
                dlProgressBar.classList.add('indeterminate');
            } else {
                dlProgressBar.classList.remove('indeterminate');
            }
        }
        if (dlProgressText) {
            dlProgressText.textContent = status || `Downloading ${version}...`;
        }
        if (dlProgressPercentage) {
            dlProgressPercentage.textContent = `${percentage}%`;
        }

        console.log(`Progress updated: ${percentage}% - ${status}`);
    }
};


// Override global onDownloadComplete
window.onDownloadComplete = async function (version) {
    console.log(`Download completed: ${version}`);
    isDownloading = false;

    // Refresh lists
    await loadVersions();

    setTimeout(() => {
        if (downloadModal) downloadModal.classList.remove('show');
        closeDownloadProgress();
        window.pywebview.api.info(`Version ${version} installed successfully.`);
    }, 1000);
};

window.onDownloadError = function (errorMsg) {
    console.error(`Download error: ${errorMsg}`);
    isDownloading = false;
    closeDownloadProgress();
    // Error is already shown by backend popup, but we ensure UI is reset
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

// Close modal when clicking outside
if (loginModal) {
    loginModal.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            loginModal.classList.remove('show');
            showLoginMethodScreen();
        }
    });
}

// Screen navigation
function showLoginMethodScreen() {
    if (loginMethodScreen) loginMethodScreen.classList.add('active');
    if (loginOfflineScreen) loginOfflineScreen.classList.remove('active');
}

function showLoginOfflineScreen() {
    if (loginMethodScreen) loginMethodScreen.classList.remove('active');
    if (loginOfflineScreen) loginOfflineScreen.classList.add('active');
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
        const nickname = document.getElementById('nickname').value;
        const invalido = /[\sñÑáéíóúÁÉÍÓÚçÇ]/.test(nickname);
        if (nickname.trim() && !invalido) {
            const mcdir = document.getElementById('mcdir') ? document.getElementById('mcdir').value : '';

            await window.pywebview.api.save_user_json(nickname, mcdir, 'offline');
            showUserBadge(nickname);

            if (loginModal) loginModal.classList.remove('show');
            showLoginMethodScreen();
        } else {
            window.pywebview.api.error('Please enter a valid nickname (no spaces, accents or special characters)');
        }
    });
}

// Microsoft login (placeholder) - Removed, handled by global bind
// if (selectMicrosoftBtn) { ... }

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

// Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await window.pywebview.api.logout_user();
            nickname.value = '';
            showLoginButton();
            if (userBadge) userBadge.classList.remove('active');
        } catch (error) {
            console.error('Error logging out:', error);
            window.pywebview.api.error('Error logging out');
        }
    });
}

// Initialize login state when pywebview is ready
window.addEventListener('pywebviewready', async () => {
    // Start initializing things in parallel
    preloadVersions(); // Don't await, let it run in background
    await checkLoginState();
});

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

    // Reset search
    if (modSearchInput) {
        modSearchInput.value = '';
        modSearchInput.placeholder = `Search ${titles[currentContentType]} in Modrinth...`;
    }
    document.getElementById('modSearchResults').innerHTML = `
        <div class="mod-search-empty">
            <i class="fas fa-search"></i>
            <p>Search ${titles[currentContentType]} to download</p>
        </div>
    `;
    // Ensure display is correct to avoid flicker/misalignment
    document.getElementById('modSearchResults').style.display = 'flex';
    document.getElementById('modSearchResults').style.justifyContent = 'center';

    // Logic specific to type
    if (currentContentType === 'datapack') {
        if (worldSelectorContainer) worldSelectorContainer.style.display = 'block';
    }
}

// Load profiles logic updated
async function loadModdableProfiles() {
    if (!modsProfileSelect) return;

    try {
        // Use new backend method with strict filtering
        const data = await window.pywebview.api.get_profiles_for_addon(currentContentType);
        const targetProfiles = data.profiles || {};

        modsProfileSelect.innerHTML = '';

        // Reset world select
        if (worldSelect) {
            worldSelect.innerHTML = '<option value="">Select a world...</option>';
            worldSelect.disabled = true;
        }

        if (Object.keys(targetProfiles).length === 0) {
            modsProfileSelect.innerHTML = '<option value="">No compatible profiles found</option>';
            modsProfileSelect.disabled = true;
            if (noModdableProfiles) {
                noModdableProfiles.style.display = 'block';

                let msg = "";
                if (currentContentType === 'mod') msg = "No profiles with Forge or Fabric found.";
                else if (currentContentType === 'shader') msg = "No profiles with Shaders support found. (Requires Forge with Optifine OR Fabric with Iris+Sodium installed).";
                else msg = "No profiles found.";

                document.getElementById('noModdableMessage').textContent = msg;
            }
            if (modsTabsContainer) modsTabsContainer.style.display = 'none';
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
                    option.title = "Profile ready for shaders";
                }
            }

            modsProfileSelect.appendChild(option);
        }

        // Select first and trigger load
        if (modsProfileSelect.options.length > 0) {
            modsProfileSelect.selectedIndex = 0;
            currentModsProfile = modsProfileSelect.value;
            await onProfileSelected();
        }
    } catch (error) {
        console.error('Error loading profiles:', error);
    }
}

async function onProfileSelected() {
    currentModsProfile = modsProfileSelect.value;

    // Clean search
    if (modSearchInput) modSearchInput.value = '';
    // Reset Results
    if (modSearchResults) modSearchResults.innerHTML = '';

    // If Datapack, load worlds
    if (currentContentType === 'datapack') {
        await loadWorlds(currentModsProfile);
    }

    await loadInstalledAddons();
}

// Renamed from loadInstalledMods
async function loadInstalledAddons() {
    if (!installedModsList) return;

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

// Create Item Element
function createInstalledItem(itemData) {
    const div = document.createElement('div');
    // Use classes defined in CSS (.mod-list-item, etc)
    div.className = 'mod-list-item';
    if (!itemData.enabled) div.classList.add('disabled');

    // Icon (generic or specific)
    let iconClass = 'fas fa-cube';
    if (currentContentType === 'resourcepack') iconClass = 'fas fa-palette';
    else if (currentContentType === 'shader') iconClass = 'fas fa-sun';
    else if (currentContentType === 'datapack') iconClass = 'fas fa-code';

    // Type label
    const typeLabel = itemData.type === 'folder' ? 'Folder' : 'File';

    div.innerHTML = `
        <div class="mod-list-icon">
            <i class="${iconClass}"></i>
        </div>
        <div class="mod-list-info">
            <div class="mod-list-name">${itemData.display_name}</div>
            <div class="mod-list-details">${itemData.size_mb} MB • ${itemData.enabled ? 'Enabled' : 'Disabled'} • ${typeLabel}</div>
        </div>
        <div class="mod-list-actions">
            <!-- Delete -->
            <button class="mod-delete-btn" onclick="deleteAddon('${itemData.filename}')"><i class="fas fa-trash"></i> Delete</button>
            <!-- Toggle -->
            <div class="mod-toggle ${itemData.enabled ? 'active' : ''}" onclick="toggleAddon('${itemData.filename}', ${!itemData.enabled})">
                <div class="mod-toggle-slider"></div>
            </div>
        </div>
    `;
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
        const res = await window.pywebview.api.delete_addon(currentModsProfile, filename, currentContentType, worldName);
        if (res.success) {
            await loadInstalledAddons();
        } else {
            console.error("Delete failed:", res.error);
            window.pywebview.api.alert("Failed to delete: " + res.error);
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
        await window.pywebview.api.toggle_mod(currentModsProfile, filename, enabled, currentContentType, worldName);
        await loadInstalledAddons();
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

    // Load content if needed
    if (tabName === 'installed') {
        loadInstalledAddons(); // Changed from loadInstalledMods
    }
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
        });
    }

    // Debounced search on input
    modSearchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);

        const query = modSearchInput.value.trim();

        if (query.length === 0) {
            // Clear results if search is empty
            modSearchResults.style.display = 'flex';
            modSearchResults.style.justifyContent = 'center';
            modSearchResults.style.alignItems = 'center';
            modSearchResults.innerHTML = `
                <div class="mod-search-empty">
                    <i class="fas fa-search"></i>
                    <p>Search for mods to download</p>
                </div>
            `;
            return;
        }

        if (query.length >= 3) {
            searchTimeout = setTimeout(() => {
                modSearchResults.style.display = 'grid';
                searchMods();
            }, 500);
        }
    });
}

async function searchMods() {
    const query = modSearchInput.value.trim();

    if (!query) {
        window.pywebview.api.error('Type something to search');
        return;
    }

    // Show loading
    modSearchLoading.style.display = 'block';
    document.getElementById('modDetailTitle').textContent = 'Loading...';
    modSearchResults.innerHTML = '';

    try {
        // Pass currentContentType as project_type
        const result = await window.pywebview.api.search_modrinth_mods(query, null, currentContentType);

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

    card.onclick = () => openModDetails(mod.id);

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
            <button id="btn-mod-${mod.id}" class="btn-primary" onclick="event.stopPropagation(); downloadModFromCard('${mod.id}', '${mod.slug}')">
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

        document.getElementById('modDetailLicense').textContent = details.license;

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
        window.pywebview.api.error('Select a profile first');
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
            window.pywebview.api.error('Profile not found');
            if (btn) btn.disabled = false;
            return;
        }

        // Determine loader type
        const loader = profile.type === 'forge' ? 'forge' : 'fabric';

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

        if (!versionsResult.success || versionsResult.versions.length === 0) {
            // Error Message Logic
            let msg = "";
            if (currentContentType === 'resourcepack' || currentContentType === 'datapack') {
                // No loader mentioned
                msg = `No compatible versions for Minecraft ${gameVersion}`;
            } else if (currentContentType === 'shader') {
                // Mention mapped loader
                const shaderLoader = loader === 'fabric' ? 'Iris' : 'Optifine';
                msg = `No compatible versions for ${shaderLoader} on Minecraft ${gameVersion}`;
            } else {
                // Mods
                msg = `No compatible versions for ${loader} ${gameVersion}`;
            }

            window.pywebview.api.error(msg);
            if (btn) {
                btn.innerHTML = '<i class="fas fa-download"></i> Download';
                btn.disabled = false;
            }
            return;
        }

        // Use the first (latest) compatible version
        const version = versionsResult.versions[0];

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
            // Success means it started
            console.log("Download started for", projectId);
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
document.addEventListener('keydown', async function (e) {
    // Check if developer mode is enabled
    let devMode = false;
    try {
        const userData = await window.pywebview.api.get_user_json();
        devMode = userData.dev_mode || false;
    } catch (err) {
        // If we can't check, assume dev mode is off
        devMode = false;
    }

    // If developer mode is enabled, allow all shortcuts
    if (devMode) {
        return true;
    }

    // Otherwise, block developer shortcuts
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

// Load moddable profiles when entering mods section
window.addEventListener('pywebviewready', async () => {
    // Wait a bit for other initializations
    setTimeout(async () => {
        await loadModdableProfiles();
    }, 500);
});

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

// Add check to the startup sequence
window.addEventListener('pywebviewready', () => {
    // Check immediately on startup
    checkReviewReminder();
});



// Function to render head image in user badge
function renderUserHead(skinUrl) {
    return new Promise((resolve) => {
        console.log('renderUserHead called with:', skinUrl);
        const container = document.getElementById('userAvatarHead');

        if (!container) {
            resolve();
            return;
        }

        // If no skin URL, show default icon
        if (!skinUrl) {
            console.log('No skin URL, showing default icon');
            container.innerHTML = '<i class="fas fa-user"></i>';
            resolve();
            return;
        }

        // Preload image to wait for it
        const img = new Image();
        img.onload = () => {
            console.log('Head image loaded');
            container.innerHTML = '';
            container.appendChild(img);
            resolve();
        };
        img.onerror = () => {
            console.log('Head image failed to load');
            // Show default on error
            container.innerHTML = '<i class="fas fa-user"></i>';
            resolve();
        };

        // Set styles
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '5px';
        img.style.imageRendering = 'pixelated';
        img.alt = 'Player Head';

        img.src = skinUrl;
    });
}

// Export for use
window.renderUserHead = renderUserHead;

// Export for use
window.renderUserHead = renderUserHead;
