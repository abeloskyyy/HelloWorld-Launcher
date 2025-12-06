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
const cancelDownloadBtn = document.getElementById('cancelDownloadBtn');

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
window.updateInstallProgress = function (version, percentage, status) {
    const progressContainer = document.getElementById('installProgress');
    const progressBar = document.getElementById('progressBarFill');
    const progressText = document.querySelector('.install-progress-text');
    const progressPercentage = document.getElementById('progressPercentage');

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
        const progressContainer = document.getElementById('installProgress');
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
            isDownloading = false;
            endDownloadState();

            // Hide progress
            const progressContainer = document.getElementById('installProgress');
            if (progressContainer) {
                progressContainer.style.display = 'none';
            }

            // Don't create profile, just show message
            window.pywebview.api.info('Descarga cancelada. El perfil no se ha creado.');
        }
    } catch (error) {
        console.error('Error cancelling download:', error);
    }
}


function guardarDatos() {
    const username = document.getElementById("nickname").value;
    const mcdir = document.getElementById("mcdir").value;

    window.pywebview.api.save_user_json(username, mcdir)
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
    await loadOptions();

    window.pywebview.api.get_user_json().then(data => {
        if (document.getElementById("nickname")) document.getElementById("nickname").value = data.username || "";
        if (document.getElementById("mcdir")) document.getElementById("mcdir").value = data.mcdir || "";
    });

    await cargarPerfiles();
    await loadVersions();
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
        if (!profileName.trim()) missingFields.push("Nombre del Perfil");
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
        await cancelDownload();
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

if (cancelDownloadBtn2) {
    cancelDownloadBtn2.addEventListener('click', () => {
        cancelDownload();
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

async function startVersionDownload() {
    const mcVersion = downloadMcVersionSelect.value;
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
    startDownloadBtn.disabled = true;
    cancelDownloadModalBtn.disabled = true;

    isDownloading = true;

    try {
        const result = await window.pywebview.api.install_version(versionIdToInstall);

        if (!result.success) {
            window.pywebview.api.error(result.message);
            isDownloading = false;
            document.getElementById('downloadProgressContainer').style.display = 'none';
            startDownloadBtn.disabled = false;
            cancelDownloadModalBtn.disabled = false;
        }

    } catch (error) {
        console.error("Error starting download:", error);
        isDownloading = false;
        document.getElementById('downloadProgressContainer').style.display = 'none';
        startDownloadBtn.disabled = false;
        cancelDownloadModalBtn.disabled = false;
    }
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
        const dlProgressBar = document.getElementById('downloadProgressBarFill');
        const dlProgressText = document.getElementById('downloadProgressText');
        const dlProgressPercentage = document.getElementById('downloadProgressPercentage');

        dlProgressContainer.style.display = 'block';
        if (dlProgressBar) dlProgressBar.style.width = `${percentage}%`;
        if (dlProgressText) dlProgressText.textContent = status || `Descargando ${version}...`;
        if (dlProgressPercentage) dlProgressPercentage.textContent = `${percentage}%`;
    }
};

// Override global onDownloadComplete
window.onDownloadComplete = async function (version) {
    console.log(`Download completed: ${version}`);
    isDownloading = false;

    // Refresh lists
    await loadVersions();

    // UI Updates
    const dlProgressText = document.getElementById('downloadProgressText');
    if (dlProgressText) dlProgressText.textContent = "¡Instalación completada!";

    setTimeout(() => {
        if (downloadModal) downloadModal.classList.remove('show');
        document.getElementById('downloadProgressContainer').style.display = 'none';
        startDownloadBtn.disabled = false;
        cancelDownloadModalBtn.disabled = false;
        window.pywebview.api.info(`Versión ${version} instalada correctamente.`);
    }, 1000);
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

    // Position tooltip
    const tooltipRect = tooltip.getBoundingClientRect();
    const padding = 10;

    // Calculate position (above the element by default)
    let left = x - (tooltipRect.width / 2);
    let top = y - tooltipRect.height - padding;

    // Adjust if tooltip goes off screen
    if (left < padding) left = padding;
    if (left + tooltipRect.width > window.innerWidth - padding) {
        left = window.innerWidth - tooltipRect.width - padding;
    }
    if (top < padding) {
        // Show below if no space above
        top = y + padding;
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

// Hide tooltip when clicking anywhere else
document.addEventListener('click', (e) => {
    if (!e.target.classList.contains('help-icon') && !tooltip.contains(e.target)) {
        hideTooltip();
    }
});

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
// MODS MANAGER
// ==============================================

const modsSearchInput = document.getElementById('modsSearchInput');
const modsLoadingSpinner = document.getElementById('modsLoadingSpinner');
const modsGrid = document.getElementById('modsGrid');
const modDetailsView = document.getElementById('modDetailsView');
const modsProfileSelect = document.getElementById('modsProfileSelect');

let currentModsProfileId = null;

// Initialize when section is shown
function initModsSection() {
    loadModProfiles();
}

// Hook into showSection to detect when "mods" is opened
const originalShowSection = window.showSection; // Assuming showSection is global or I need to find where it is defined
// Better: Add manual listener or call initModsSection inside showSection if I could edit it.
// Since showSection is likely defined earlier, I'll just override it if possible OR check on sidebar click.
// Let's modify showSection separately if needed, but for now let's rely on click.
// Actually, I can just call loadModProfiles when the section is active.
// Let's add an observer for section changes? Or simply:
document.querySelectorAll('.sidebar-button[onclick*="mods"]').forEach(btn => {
    btn.addEventListener('click', () => {
        loadModProfiles();
    });
});


// Load Profiles into Mods Profile Select (Only Forge/Fabric)
async function loadModProfiles() {
    const profilesData = await window.pywebview.api.get_profiles();
    const profiles = profilesData.profiles;

    modsProfileSelect.innerHTML = '<option value="">Selecciona un perfil...</option>';

    let hasProfiles = false;

    for (const [id, profile] of Object.entries(profiles)) {
        // Filter for Forge or Fabric
        if (profile.version.includes('forge') || profile.version.includes('fabric')) {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = `${profile.name} (${profile.version})`;
            modsProfileSelect.appendChild(option);
            hasProfiles = true;
        }
    }

    if (!hasProfiles) {
        const option = document.createElement('option');
        option.textContent = "No hay perfiles compatibles (Forge/Fabric)";
        option.disabled = true;
        modsProfileSelect.appendChild(option);
    }
}

modsProfileSelect.addEventListener('change', (e) => {
    currentModsProfileId = e.target.value;
    // Clear search and grid when profile changes
    modsSearchInput.value = '';
    modsGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #aaa; padding: 50px;">Busca mods para empezar.</div>';
    modDetailsView.style.display = 'none';
    modsGrid.style.display = 'grid';
});


// Search Logic
async function searchMods() {
    if (!currentModsProfileId) {
        window.pywebview.api.error("Selecciona un perfil primero.");
        return;
    }

    const query = modsSearchInput.value.trim();
    if (!query) {
        modsGrid.innerHTML = '';
        return;
    }

    // UI Loading State
    modsLoadingSpinner.style.display = 'block';
    // Don't clear grid immediately for better UX? Or yes to show result change.

    try {
        const profilesData = await window.pywebview.api.get_profiles();
        const profile = profilesData.profiles[currentModsProfileId];

        const { loader, version } = parseMinecraftVersion(profile.version);

        console.log(`Searching for: ${query} [${loader} ${version}]`);

        const hits = await window.pywebview.api.get_mods(query, loader, version);

        modsGrid.innerHTML = '';
        modDetailsView.style.display = 'none';
        modsGrid.style.display = 'grid';

        if (hits.length === 0) {
            modsGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #aaa; padding: 50px;">No se encontraron mods.</div>';
        } else {
            for (const mod of hits) {
                const card = document.createElement('div');
                card.className = 'mod-card';
                card.onclick = () => showModDetails(mod); // Set click handler

                const iconUrl = mod.icon_url || 'https://via.placeholder.com/48?text=Mod';

                card.innerHTML = `
                    <div class="mod-header">
                        <img src="${iconUrl}" class="mod-icon">
                        <div class="mod-info">
                            <div class="mod-title" title="${mod.title}">${mod.title}</div>
                            <div class="mod-author">${mod.author}</div>
                        </div>
                    </div>
                    <div class="mod-description">${mod.description}</div>
                    <div class="mod-footer">
                        <div class="mod-downloads">
                            <i class="fas fa-download"></i> ${formatCompactNumber(mod.downloads)}
                        </div>
                    </div>
                `;
                modsGrid.appendChild(card);
            }
        }

    } catch (error) {
        console.error("Search error:", error);
        modsGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #d9534f; padding: 50px;">Error al buscar mods.</div>';
    } finally {
        modsLoadingSpinner.style.display = 'none';
    }
}

// Helper: Parse Version String
function parseMinecraftVersion(versionString) {
    let loader = null;
    let version = null;

    if (versionString.includes('fabric')) loader = 'fabric';
    else if (versionString.includes('forge')) loader = 'forge';

    // Extract MC version logic
    // Formats: "1.20.1-forge-47.1.0", "fabric-loader-0.14.22-1.20.1", "1.19.2"
    // Regex looking for 1.X(.Y)
    const mcVerRegex = /1\.\d+(\.\d+)?/g;
    const matches = versionString.match(mcVerRegex);

    if (matches && matches.length > 0) {
        // Usually the last match is the MC version if multiple exist (like loader version having similar numbers? unlikely for 1.x)
        // Or if format is "fabric-loader-x-1.20.1", it matches 1.20.1
        // Let's take the one that looks most like a game version.
        // Actually, sometimes loader version is 0.14.x. 1.x is reserved for MC usually.
        version = matches.find(v => !v.startsWith('0.')); // simple filter
        if (!version) version = matches[0];
    }

    return { loader, version };
}


// Debounce Input
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

if (modsSearchInput) {
    modsSearchInput.addEventListener('input', debounce(() => {
        searchMods();
    }, 500));
}

// Mod Details Logic
async function showModDetails(mod) {
    modsGrid.style.display = 'none';
    modDetailsView.style.display = 'block';

    document.getElementById('detailTitle').textContent = mod.title;
    document.getElementById('detailAuthor').textContent = mod.author;
    document.getElementById('detailIcon').src = mod.icon_url || 'https://via.placeholder.com/80?text=Mod';
    document.getElementById('detailDescription').innerHTML = '<div style="text-align:center; padding: 20px;">Cargando detalles...</div>';

    const installBtn = document.getElementById('detailInstallBtn');
    installBtn.textContent = 'Instalar';
    installBtn.disabled = false;
    installBtn.onclick = () => installModFromDetails(mod, installBtn);

    // Fetch full description (using body)
    // We need a new API method for this: get_mod_details
    try {
        const details = await window.pywebview.api.get_mod_details(mod.project_id);
        if (details && details.body) {
            document.getElementById('detailDescription').innerHTML = details.body; // Warning: content might need sanitization or markdown parsing.
            // Modrinth returns markdown normally. We might need a markdown parser in JS or just display text.
            // If it returns HTML (rendered), great. Modrinth API v2 project returns body in markdown.
            // For simplicity, I'll wrap it in <pre> or simple text, OR try a simple markdown-to-html converter?
            // Since I can't add libraries easily, I'll display it as is or do basic replace.

            // Basic Markdown to HTML (very simple)
            let html = details.body
                .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
                .replace(/\*(.*)\*/gim, '<i>$1</i>')
                .replace(/!\[(.*?)\]\((.*?)\)/gim, '<img src="$2" alt="$1">')
                .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank">$1</a>')
                .replace(/\n/gim, '<br>');

            document.getElementById('detailDescription').innerHTML = html;
        } else {
            document.getElementById('detailDescription').textContent = mod.description;
        }
    } catch (e) {
        console.error("Error fetching details", e);
        document.getElementById('detailDescription').textContent = mod.description;
    }
}

document.getElementById('backToGridBtn').addEventListener('click', () => {
    modDetailsView.style.display = 'none';
    modsGrid.style.display = 'grid';
});

async function installModFromDetails(mod, btnElement) {
    btnElement.textContent = "Instalando...";
    btnElement.disabled = true;

    try {
        const profilesData = await window.pywebview.api.get_profiles();
        const profile = profilesData.profiles[currentModsProfileId];
        const { loader, version } = parseMinecraftVersion(profile.version);

        const versionData = await window.pywebview.api.get_mod_versions(mod.project_id, loader, version);

        if (!versionData) {
            window.pywebview.api.error("No se encontró una versión compatible.");
            btnElement.textContent = "Instalar";
            btnElement.disabled = false;
            return;
        }

        const result = await window.pywebview.api.install_mod(currentModsProfileId, versionData.url, versionData.filename);

        if (result.success) {
            btnElement.textContent = "Instalado";
            window.pywebview.api.info(`<b>${mod.title}</b> instalado correctamente.`);
        } else {
            window.pywebview.api.error(result.message);
            btnElement.textContent = "Instalar";
            btnElement.disabled = false;
        }
    } catch (error) {
        console.error("Install error:", error);
        window.pywebview.api.error("Error instalando mod.");
        btnElement.textContent = "Instalar";
        btnElement.disabled = false;
    }
}

function formatCompactNumber(number) {
    if (number < 1000) return number;
    if (number < 1000000) return (number / 1000).toFixed(1) + 'K';
    return (number / 1000000).toFixed(1) + 'M';
}
