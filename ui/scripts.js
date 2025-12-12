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

// Función global para actualizar el progreso de instalación
// Función global para actualizar el progreso de instalación
window.updateInstallProgress = function (version, percentage, status) {
    const progressContainer = document.getElementById('downloadProgressContainer');
    const progressBar = document.getElementById('downloadProgressBarFill');
    const progressText = document.getElementById('downloadProgressText');
    const progressPercentage = document.getElementById('downloadProgressPercentage');

    if (progressContainer && progressBar && progressText && progressPercentage) {
        progressContainer.style.display = 'block';
        progressText.textContent = status || `Instalando ${version}...`;
        progressBar.style.width = `${percentage}%`;
        progressPercentage.textContent = `${percentage}%`;

        // Don't auto-hide on completion, let onDownloadComplete handle it
    }
};

// Función global llamada cuando la descarga se completa
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
            window.pywebview.api.info('Descarga cancelada. La versión no se ha instalado.');
        }
    } catch (error) {
        console.error('Error cancelling download:', error);
    }
}


function guardarDatos() {
    const username = document.getElementById("nickname").value;
    const mcdir = document.getElementById("mcdir").value;
    const devModeCheckbox = document.getElementById("devModeCheckbox");
    const devMode = devModeCheckbox ? devModeCheckbox.checked : false;

    // Get current dev mode to check if it changed
    window.pywebview.api.get_user_json().then(currentData => {
        const devModeChanged = currentData.dev_mode !== devMode;

        window.pywebview.api.save_user_json(username, mcdir).then(() => {
            // Save dev_mode separately
            window.pywebview.api.save_dev_mode(devMode).then(() => {
                if (devModeChanged) {
                    window.pywebview.api.info('Configuración guardada. Por favor, reinicia el launcher para que los cambios del modo desarrollador tomen efecto.');
                } else {
                    window.pywebview.api.info('Configuración guardada correctamente.');
                }
            });
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

        // Load developer mode checkbox
        const devModeCheckbox = document.getElementById("devModeCheckbox");
        if (devModeCheckbox) {
            devModeCheckbox.checked = data.dev_mode || false;
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

        await cargarPerfiles();
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

async function launchGame() {
    const profileSelectElement = document.getElementById("profileSelect");

    if (!profileSelectElement || !profileSelectElement.value) {
        window.pywebview.api.error("Debes seleccionar un perfil antes de jugar");
        return;
    }

    const selectedProfile = profileSelectElement.value;

    // Get nickname from user data instead of the login modal
    const userData = await window.pywebview.api.get_user_json();
    const nickname = userData.username || "";

    if (!nickname) {
        window.pywebview.api.error("Debes iniciar sesión antes de jugar");
        return;
    }

    // Try to launch the game
    const result = await pywebview.api.start_game(selectedProfile, nickname);

    // Handle duplicate instance
    if (result.status === "already_running") {
        const confirm = await window.pywebview.api.confirm(
            "Minecraft ya está abierto. ¿Quieres abrir otra instancia?"
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
        playButton.innerHTML = '<span class="spinner"></span> Cargando...';
    }
}

// Callback when Minecraft window is ready
function onMinecraftReady() {
    const playButton = document.querySelector('.play-button');
    if (playButton) {
        playButton.innerHTML = 'Jugando';
        playButton.disabled = false;
        playButton.style.cursor = 'pointer';
        playButton.style.opacity = '1';
    }
}

// Callback when Minecraft closes
function onMinecraftClosed() {
    const playButton = document.querySelector('.play-button');
    if (playButton) {
        playButton.innerHTML = 'Jugar';
        playButton.disabled = false;
        playButton.style.cursor = 'pointer';
        playButton.style.opacity = '1';
    }

    // Reload profiles and options
    loadOptions();
    cargarPerfiles();
}

// Helper Functions
function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return "Hace " + Math.floor(interval) + " años";
    interval = seconds / 2592000;
    if (interval > 1) return "Hace " + Math.floor(interval) + " meses";
    interval = seconds / 86400;
    if (interval > 1) return "Hace " + Math.floor(interval) + " días";
    interval = seconds / 3600;
    if (interval > 1) return "Hace " + Math.floor(interval) + " horas";
    interval = seconds / 60;
    if (interval > 1) return "Hace " + Math.floor(interval) + " minutos";
    return "Hace unos segundos";
}

async function loadVersions() {
    const versionSelect = document.getElementById('profileVersionSelect');
    if (!versionSelect) return;
    versionSelect.innerHTML = '';

    try {
        // Ahora solo obtenemos versiones INSTALADAS para este dropdown
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
            createGroup('Instaladas', versionsData.installed);
        } else {
            const option = document.createElement('option');
            option.textContent = "No hay versiones instaladas";
            option.disabled = true;
            versionSelect.appendChild(option);
        }

    } catch (error) {
        console.error('Error cargando versiones:', error);
        window.pywebview.api.error('Error cargando lista de versiones');
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

    if (profilesArray.length === 0) {
        // No hay perfiles: Ocultar icono y mostrar opción de crear
        if (document.getElementById('selectedIcon')) {
            document.getElementById('selectedIcon').style.display = 'none';
        }
        if (document.getElementById('selectedTitle')) document.getElementById('selectedTitle').textContent = "No tienes perfiles";
        if (document.getElementById('selectedSubtitle')) document.getElementById('selectedSubtitle').textContent = "Crea un perfil para jugar";

        if (selectOptions) {
            const createOption = document.createElement('div');
            createOption.className = 'select-option';
            createOption.innerHTML = `
                <div class="option-icon" style="display: flex; align-items: center; justify-content: center; font-size: 24px; color: #fff; background: rgba(255, 255, 255, 0.1);"><i class="fas fa-plus"></i></div>
                <div class="option-content">
                    <div class="option-title">Crear Nuevo Perfil</div>
                    <div class="option-subtitle">Haz clic para empezar</div>
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

        for (const profile of profilesArray) {
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
                if (profile.type === 'forge') tags = '<span class="option-tag forge">FORGE</span>';
                else if (profile.type === 'fabric') tags = '<span class="option-tag fabric">FABRIC</span>';
                else tags = '<span class="option-tag">VANILLA</span>';

                if (profile.mods) tags += `<span class="option-tag">${profile.mods} MODS</span>`;

                const iconUrl = await window.pywebview.api.get_profile_icon(profile.icon);
                profile.iconUrl = iconUrl;

                const lastPlayedText = profile.last_played ? timeAgo(profile.last_played) : 'Nunca';

                option.innerHTML = `
                    <img src="${iconUrl}" alt="" class="option-icon">
                    <div class="option-content">
                        <div class="option-title">${profile.name}</div>
                        <div class="option-subtitle">Versión ${profile.version} • ${lastPlayedText}</div>
                        <div class="option-tags">${tags}</div>
                    </div>
                `;

                option.addEventListener('click', () => selectOption(id, profile));
                selectOptions.appendChild(option);
            }
        }

        if (profilesArray.length > 0) {
            const firstProfile = profilesArray[0];
            selectOption(firstProfile.id, firstProfile);
        }
    }
}

function selectOption(id, profile) {
    if (originalSelect) originalSelect.value = id;

    const lastPlayedText = profile.last_played ? timeAgo(profile.last_played) : 'Nunca';

    if (document.getElementById('selectedIcon')) {
        document.getElementById('selectedIcon').src = profile.iconUrl || profile.icon;
        document.getElementById('selectedIcon').style.display = 'block';
    }
    if (document.getElementById('selectedTitle')) document.getElementById('selectedTitle').textContent = profile.name;
    if (document.getElementById('selectedSubtitle')) document.getElementById('selectedSubtitle').textContent = `Versión ${profile.version} • ${lastPlayedText}`;

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

async function cargarPerfiles() {
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
        const lastPlayedText = profile.last_played ? timeAgo(profile.last_played) : 'Nunca';

        const item = document.createElement("div");
        item.className = "profile-card";
        item.innerHTML = `
            <img src="${iconUrl}" id="profile-img">
            <div class="profile-info">
                <h3>${profile.name}</h3>
                <p>Versión: ${profile.version} | Última vez: ${lastPlayedText}</p>
            </div>
            <div class="profile-actions">
                <button class="btn-secondary btn-small edit-btn"><i class="fas fa-edit"></i> Editar</button>
                <button class="btn-danger btn-small delete-btn"><i class="fas fa-trash"></i> Eliminar</button>
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

            const confirmado = await window.pywebview.api.confirm(`¿Estás seguro de que quieres eliminar el perfil "${profile.name}"?`);
            if (confirmado) {
                await window.pywebview.api.delete_profile(id);
                await cargarPerfiles();
                await loadOptions();
                await loadModdableProfiles();
            }
        };

        item.onclick = () => {
            console.log("Perfil seleccionado:", id);
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
    window.pywebview.api.get_profile_icon('default.png').then(url => {
        if (iconPreview) {
            iconPreview.src = url;
            iconPreview.style.display = 'block';
        }
        if (placeholderIcon) placeholderIcon.style.display = 'none';
    });

    editingProfileId = null;
    if (acceptProfileBtn) acceptProfileBtn.textContent = "Crear Perfil";
    if (document.querySelector('#modal h2')) document.querySelector('#modal h2').textContent = "Crear Nuevo Perfil";
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
        window.pywebview.api.get_profile_icon(profile.icon).then(url => {
            if (iconPreview) {
                iconPreview.src = url;
                iconPreview.style.display = 'block';
            }
            if (placeholderIcon) placeholderIcon.style.display = 'none';
        });
    }

    if (acceptProfileBtn) acceptProfileBtn.textContent = "Guardar Cambios";
    if (document.querySelector('#modal h2')) document.querySelector('#modal h2').textContent = "Editar Perfil";
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
        const profileName = document.getElementById('profileName').value;
        const profileVersion = document.getElementById('profileVersionSelect').value;
        const profileJVMArgs = document.getElementById('profileJVMArgs').value;
        const profileDir = document.getElementById('profileDir').value;
        const profileIcon = getSelectedIcon();

        // Validación
        const missingFields = [];
        const trimmedName = profileName.trim();
        if (!trimmedName) {
            missingFields.push("Nombre del Perfil");
        } else if (trimmedName.length < 2) {
            window.pywebview.api.error('El nombre del perfil debe tener al menos 2 caracteres');
            return;
        }
        if (!profileVersion) missingFields.push("Versión");
        if (!profileDir.trim()) missingFields.push("Directorio");

        if (missingFields.length > 0) {
            window.pywebview.api.error(`No puedes dejar estos campos vacíos:\n- ${missingFields.join('\n- ')}`);
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
            await cargarPerfiles();
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
                    await cargarPerfiles();
                    await loadOptions();
                    await loadModdableProfiles();
                    if (profileModal) profileModal.classList.remove('show');
                    resetProfileModal();
                } else {
                    window.pywebview.api.error(result.message);
                }
            } catch (error) {
                console.error('Error creating profile:', error);
                window.pywebview.api.error('Error al crear el perfil');
            }
        }
    });
}

// Cancel download button handler
if (cancelDownloadBtn) {
    cancelDownloadBtn.addEventListener('click', async () => {
        // Guardar contenido original y añadir spinner
        const originalContent = cancelDownloadBtn.innerHTML;
        const width = cancelDownloadBtn.offsetWidth;
        const height = cancelDownloadBtn.offsetHeight;

        // Establecer tamaño fijo para evitar redimensionamiento
        cancelDownloadBtn.style.width = width + 'px';
        cancelDownloadBtn.style.height = height + 'px';

        cancelDownloadBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
        cancelDownloadBtn.disabled = true;
        cancelDownloadBtn.style.cursor = 'not-allowed';
        cancelDownloadBtn.style.opacity = '0.7';

        try {
            await cancelDownload();
        } finally {
            // Si el botón sigue existiendo, restaurar estado (aunque probablemente desaparecerá)
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

// Botón de selección de carpeta
if (selectFolderBtn) {
    selectFolderBtn.addEventListener('click', async () => {
        const currentDir = document.getElementById('profileDir').value;
        const selectedPath = await window.pywebview.api.select_folder(currentDir);

        if (selectedPath) {
            document.getElementById('profileDir').value = selectedPath;
        }
    });
}

// Botón de selección de carpeta
if (selectMcdirBtn) {
    selectMcdirBtn.addEventListener('click', async () => {
        const currentDir = document.getElementById('mcdir').value;
        const selectedPath = await window.pywebview.api.select_folder(currentDir);

        if (selectedPath) {
            document.getElementById('mcdir').value = selectedPath;
        }
    });
}

// Abrir modal de imágenes cuando se hace clic en el botón de icono
if (iconButton) {
    iconButton.addEventListener('click', async () => {
        await loadImageModal();
        if (imageModal) imageModal.classList.add('show');
    });
}

// Cerrar modal de imágenes
if (cancelImageModalBtn) {
    cancelImageModalBtn.addEventListener('click', () => {
        if (imageModal) imageModal.classList.remove('show');
    });
}

// Cargar imágenes en el modal
async function loadImageModal() {
    if (!imageGrid) return;

    // Guardar el botón de upload antes de limpiar
    const uploadButton = imageGrid.querySelector('.upload-item');
    const uploadInput = imageGrid.querySelector('#customImageInput');

    // Limpiar solo los items de imagen
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

        // Volver a añadir el botón de upload al final
        if (uploadButton) {
            imageGrid.appendChild(uploadButton);
        }
        if (uploadInput) {
            imageGrid.appendChild(uploadInput);
        }
    } catch (error) {
        console.error('Error cargando imágenes:', error);
    }
}

// Seleccionar imagen del grid
function selectImageFromGrid(imageName, imageUrl) {
    // Marcar la imagen seleccionada en el grid
    document.querySelectorAll('.image-grid-item:not(.upload-item)').forEach(item => {
        item.classList.remove('selected');
    });

    const selectedItem = document.querySelector(`[data-image-name="${imageName}"]`);
    if (selectedItem) selectedItem.classList.add('selected');

    // Actualizar la vista previa en el modal principal
    if (iconPreview) {
        iconPreview.src = imageUrl;
        iconPreview.style.display = 'block';
    }
    if (placeholderIcon) placeholderIcon.style.display = 'none';

    // IMPORTANTE: Guardar el nombre de archivo, no un objeto base64
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
        downloadLoaderVersionSelect.innerHTML = '<option value="">Selecciona una versión de MC</option>';
    }

    // Load MC Versions
    await loadMcVersions(type);
}

async function loadMcVersions(type) {
    downloadMcVersionSelect.innerHTML = '<option value="">Cargando...</option>';
    downloadMcVersionSelect.disabled = true;

    try {
        let versions = [];
        if (type === 'vanilla') {
            versions = await window.pywebview.api.get_vanilla_versions();
        } else if (type === 'fabric') {
            versions = await window.pywebview.api.get_fabric_mc_versions();
        } else if (type === 'forge') {
            versions = await window.pywebview.api.get_forge_mc_versions();
        }

        downloadMcVersionSelect.innerHTML = '';

        if (versions.length === 0) {
            const option = document.createElement('option');
            option.textContent = "No se encontraron versiones";
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
        downloadMcVersionSelect.innerHTML = '<option value="">Error al cargar</option>';
    } finally {
        downloadMcVersionSelect.disabled = false;
    }
}

async function loadLoaderVersions(type, mcVersion) {
    if (!mcVersion) return;

    downloadLoaderVersionSelect.innerHTML = '<option value="">Cargando loaders...</option>';
    downloadLoaderVersionSelect.disabled = true;

    try {
        const loaders = await window.pywebview.api.get_loader_versions(type, mcVersion);

        downloadLoaderVersionSelect.innerHTML = '';

        if (loaders.length === 0) {
            const option = document.createElement('option');
            option.textContent = "No hay loaders disponibles";
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
        downloadLoaderVersionSelect.innerHTML = '<option value="">Error al cargar</option>';
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
        window.pywebview.api.error("Selecciona una versión de Minecraft");
        return;
    }

    let versionIdToInstall = mcVersion;

    if (currentLoaderType !== 'vanilla') {
        const loaderVersion = downloadLoaderVersionSelect.value;
        if (!loaderVersion) {
            window.pywebview.api.error("Selecciona una versión del Loader");
            return;
        }

        // Construct ID based on type
        if (currentLoaderType === 'fabric') {
            // Fabric install expects just the MC version, logic is in main.py
            // But wait, main.py install_version expects "fabric-<mc_version>" or "forge-<forge_version>"
            // For Fabric, we usually install latest loader for that MC version.
            // If we want specific loader, we might need to adjust main.py.
            // For now, let's stick to the existing pattern in main.py: "fabric-<mc_version>"
            // If we want to support specific loader version, we need to pass it.
            // Let's assume for now we pass "fabric-<mc_version>" and main.py installs recommended.
            // OR we update main.py to handle specific loader versions.
            // Given the prompt asked for "version del loader", let's try to pass it.
            // But main.py implementation of install_version for fabric uses:
            // mc_version = version_id.replace("fabric-", "")
            // mll.fabric.install_fabric(mc_version, ...)
            // It doesn't take loader version.

            // For Forge:
            // forge_version = version_id.replace("forge-", "")
            // mll.forge.install_forge_version(forge_version, ...)
            // So for Forge we pass the forge version directly.

            if (currentLoaderType === 'fabric') {
                // For now, let's just use the MC version as the ID suffix, 
                // as mll.fabric.install_fabric installs the latest stable loader by default
                versionIdToInstall = `fabric-${mcVersion}`;
            } else if (currentLoaderType === 'forge') {
                // For Forge, the ID is the forge version string (e.g. "1.20.1-47.1.0")
                versionIdToInstall = `forge-${loaderVersion}`;
            }
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
        }
        if (dlProgressText) {
            dlProgressText.textContent = status || `Descargando ${version}...`;
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
        window.pywebview.api.info(`Versión ${version} instalada correctamente.`);
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
            window.pywebview.api.error('Por favor escribe un nickname válido (sin espacios ni acentos)');
        }
    });
}

// Microsoft login (placeholder)
if (selectMicrosoftBtn) {
    selectMicrosoftBtn.addEventListener('click', () => {
        window.pywebview.api.error('Funcionalidad de Microsoft aún no implementada');
    });
}

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
            window.pywebview.api.error('Error al cerrar sesión');
        }
    });
}

// Initialize login state when pywebview is ready
window.addEventListener('pywebviewready', async () => {
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

        // Click - show immediately
        element.addEventListener('click', (e) => {
            const tooltipText = element.getAttribute('data-tooltip');
            if (!tooltipText) return;

            // Only for help icons
            if (element.classList.contains('help-icon')) {
                e.stopPropagation();
                const rect = element.getBoundingClientRect();
                const x = rect.left + (rect.width / 2);
                const y = rect.top;

                if (currentTooltipElement === element && tooltip.classList.contains('show')) {
                    hideTooltip();
                } else {
                    showTooltip(element, tooltipText, x, y);
                    currentTooltipElement = element;
                }
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

// Global variables for mods
let currentModsProfile = null;
let currentModTab = 'download';
let searchTimeout = null;

// Elements
const modsProfileSelect = document.getElementById('modsProfileSelect');
const noModdableProfiles = document.getElementById('noModdableProfiles');
const modsTabsContainer = document.getElementById('modsTabsContainer');
const modTabs = document.querySelectorAll('.mod-tab');
const modSearchInput = document.getElementById('modSearchInput');
const modSearchBtn = document.getElementById('modSearchBtn');
const modSearchResults = document.getElementById('modSearchResults');
const modSearchLoading = document.getElementById('modSearchLoading');
const installedModsList = document.getElementById('installedModsList');

// Load moddable profiles
async function loadModdableProfiles() {
    if (!modsProfileSelect) return;

    try {
        const data = await window.pywebview.api.get_moddable_profiles();
        const profiles = data.profiles || {};

        modsProfileSelect.innerHTML = '';

        if (Object.keys(profiles).length === 0) {
            // No moddable profiles
            modsProfileSelect.innerHTML = '<option value="">No hay perfiles con mods</option>';
            modsProfileSelect.disabled = true;
            if (noModdableProfiles) noModdableProfiles.style.display = 'block';
            if (modsTabsContainer) modsTabsContainer.style.display = 'none';
            return;
        }

        // Has moddable profiles
        modsProfileSelect.disabled = false;
        if (noModdableProfiles) noModdableProfiles.style.display = 'none';
        if (modsTabsContainer) modsTabsContainer.style.display = 'block';

        // Add profiles to select
        for (const [id, profile] of Object.entries(profiles)) {
            const option = document.createElement('option');
            option.value = id;

            const typeLabel = profile.type === 'forge' ? 'FORGE' : profile.type === 'fabric' ? 'FABRIC' : 'MODDED';
            option.textContent = `${profile.name} (${typeLabel} - ${profile.version})`;

            modsProfileSelect.appendChild(option);
        }

        // Select first profile
        if (modsProfileSelect.options.length > 0) {
            currentModsProfile = modsProfileSelect.value;
            await loadInstalledMods();
        }
    } catch (error) {
        console.error('Error loading moddable profiles:', error);
    }
}
// Profile change handler
if (modsProfileSelect) {
    modsProfileSelect.addEventListener('change', async () => {
        currentModsProfile = modsProfileSelect.value;

        // Clear search input and results
        if (modSearchInput) {
            modSearchInput.value = '';
        }
        if (modSearchResults) {
            modSearchResults.style.display = 'flex';
            modSearchResults.style.justifyContent = 'center';
            modSearchResults.style.alignItems = 'center';
            modSearchResults.innerHTML = `
                <div class="mod-search-empty">
                    <i class="fas fa-search"></i>
                    <p>Busca mods para descargar</p>
                </div>
            `;
        }

        await loadInstalledMods();
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
        loadInstalledMods();
    }
}

// Search mods - automatic on input
if (modSearchInput) {
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
                    <p>Busca mods para descargar</p>
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
        window.pywebview.api.error('Escribe algo para buscar');
        return;
    }

    // Show loading
    modSearchLoading.style.display = 'block';
    modSearchResults.innerHTML = '';

    try {
        const result = await window.pywebview.api.search_modrinth_mods(query);

        modSearchLoading.style.display = 'none';

        if (!result.success) {
            modSearchResults.style.display = 'flex';
            modSearchResults.style.justifyContent = 'center';
            modSearchResults.style.alignItems = 'center';
            modSearchResults.innerHTML = `
                <div class="mod-search-empty">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error al buscar mods: ${result.error}</p>
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
                    <p>No se encontraron mods para "${query}"</p>
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
                <p>Error al buscar mods</p>
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

    card.innerHTML = `
        <div class="mod-card-header">
            ${iconHtml}
            <div class="mod-card-info">
                <div class="mod-card-title">${mod.title}</div>
                <div class="mod-card-author">por ${mod.author}</div>
            </div>
        </div>
        <div class="mod-card-description">${mod.description || 'Sin descripción'}</div>
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
            <button id="btn-mod-${mod.id}" class="btn-primary" onclick="downloadModFromCard('${mod.id}', '${mod.slug}')">
                <i class="fas fa-download"></i> Descargar
            </button>
        </div>
    `;

    return card;
}

// Event Listeners for Mod Download Progress
window.onModDownloadProgress = function (projectId, percentage, status) {
    const btn = document.getElementById(`btn-mod-${projectId}`);
    if (btn) {
        // Change text
        const originalText = btn.getAttribute('data-original-text') || 'Descargar';
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
        btn.innerHTML = `<i class="fas fa-check"></i> Instalado`;
        btn.style.background = '#2ecc71'; // Solid green
        btn.disabled = true;
        btn.style.cursor = 'default';

        // Reset after 3 seconds
        setTimeout(() => {
            const originalText = '<i class="fas fa-download"></i> Descargar';
            btn.innerHTML = originalText;
            btn.style.background = ''; // Reset to CSS default
            btn.disabled = false;
            btn.style.cursor = 'pointer';
        }, 3000);
    }

    // Notification
    window.pywebview.api.info(`Mod descargado: ${filename}`);

    // Refresh installed mods if on that tab
    if (currentModTab === 'installed') {
        loadInstalledMods();
    }
};

window.onModDownloadError = function (projectId, errorMsg) {
    const btn = document.getElementById(`btn-mod-${projectId}`);
    if (btn) {
        btn.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Error`;
        btn.style.background = '#e74c3c'; // Red

        // Reset after 3 seconds
        setTimeout(() => {
            const originalText = '<i class="fas fa-download"></i> Descargar';
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
        window.pywebview.api.error('Selecciona un perfil primero');
        return;
    }

    // Check if button exists and already disabled (redundant check)
    const btn = document.getElementById(`btn-mod-${projectId}`);
    if (btn && btn.disabled) return;

    try {
        // Set initial loading state
        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Iniciando...';
            btn.disabled = true;
        }

        // Get profile info to determine loader and game version
        const profilesData = await window.pywebview.api.get_moddable_profiles();
        const profile = profilesData.profiles[currentModsProfile];

        if (!profile) {
            window.pywebview.api.error('Perfil no encontrado');
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

        // Get compatible versions
        const versionsResult = await window.pywebview.api.get_mod_versions(projectId, gameVersion, loader);

        if (!versionsResult.success || versionsResult.versions.length === 0) {
            window.pywebview.api.error(`No hay versiones compatibles con ${loader} ${gameVersion}`);
            if (btn) {
                btn.innerHTML = '<i class="fas fa-download"></i> Descargar';
                btn.disabled = false;
            }
            return;
        }

        // Use the first (latest) compatible version
        const version = versionsResult.versions[0];

        // Start Download (Now Async)
        const downloadResult = await window.pywebview.api.download_mod(projectId, version.id, currentModsProfile);

        // If immediate error
        if (!downloadResult.success) {
            window.onModDownloadError(projectId, downloadResult.error);
        } else {
            // Success means it started
            console.log("Download started for", projectId);
        }

    } catch (error) {
        console.error('Error downloading mod:', error);
        window.onModDownloadError(projectId, "Error de conexión");
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
                    <p>Error al cargar mods: ${result.error}</p>
                </div>
            `;
            return;
        }

        if (result.mods.length === 0) {
            installedModsList.innerHTML = `
                <div class="no-mods-message">
                    <i class="fas fa-cube"></i>
                    <p>No hay mods instalados en este perfil</p>
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
                <p>Error al cargar mods</p>
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
            <div class="mod-list-details">${mod.size_mb} MB ${mod.enabled ? '• Habilitado' : '• Deshabilitado'}</div>
        </div>
        <div class="mod-list-actions">
            <div class="mod-toggle ${mod.enabled ? 'active' : ''}" onclick="toggleModEnabled('${mod.filename}', ${!mod.enabled})">
                <div class="mod-toggle-slider"></div>
            </div>
            <button class="mod-delete-btn" onclick="deleteModFile('${mod.filename}')">
                <i class="fas fa-trash"></i> Eliminar
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
        window.pywebview.api.error('Error al cambiar estado del mod');
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

    const confirmed = await window.pywebview.api.confirm(`¿Eliminar el mod "${filename.replace('.jar.disabled', '').replace('.jar', '')}"?`);

    if (!confirmed) return;

    try {
        const result = await window.pywebview.api.delete_mod(currentModsProfile, filename);

        if (result.success) {
            window.pywebview.api.info('Mod eliminado');
            await loadInstalledMods();
        } else {
            window.pywebview.api.error(`Error: ${result.error}`);
        }
    } catch (error) {
        console.error('Error deleting mod:', error);
        window.pywebview.api.error('Error al eliminar el mod');
    }
};

// Load moddable profiles when entering mods section
window.addEventListener('pywebviewready', async () => {
    // Wait a bit for other initializations
    setTimeout(async () => {
        await loadModdableProfiles();
    }, 500);
});

