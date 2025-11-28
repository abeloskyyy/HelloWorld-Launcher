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

        if (percentage >= 100) {
            setTimeout(() => {
                progressContainer.style.display = 'none';
            }, 2000);
        }
    }
};

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
    const selectedVersion = document.getElementById("profileSelect").value;
    const nickname = document.getElementById("nickname").value;

    await pywebview.api.start_game(selectedVersion, nickname);

    await loadOptions();
    await cargarPerfiles();
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
        const versionsData = await window.pywebview.api.get_available_versions();

        // Helper function to create optgroups
        const createGroup = (label, items, isComplex = false) => {
            if (items && items.length > 0) {
                const group = document.createElement('optgroup');
                group.label = label;
                items.forEach(item => {
                    const option = document.createElement('option');
                    if (isComplex) {
                        option.value = item.id;
                        option.textContent = item.name;
                    } else {
                        option.value = item;
                        option.textContent = item;
                    }
                    group.appendChild(option);
                });
                versionSelect.appendChild(group);
            }
        };

        // 1. Instaladas
        createGroup('Instaladas', versionsData.installed);

        // 2. Vanilla
        createGroup('Vanilla', versionsData.vanilla);

        // 3. Fabric
        createGroup('Disponibles (Fabric)', versionsData.fabric, true);

        // 4. Forge
        createGroup('Disponibles (Forge)', versionsData.forge, true);

        // 5. Snapshots
        createGroup('Snapshots', versionsData.snapshots);

        // 6. Antiguas
        createGroup('Antiguas', versionsData.old);

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
    if (document.getElementById('profileJVMArgs')) document.getElementById('profileJVMArgs').value = '';
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
        } else {
            await window.pywebview.api.add_profile(profileName, profileVersion, profileIcon, profileDir, profileJVMArgs);
        }

        await cargarPerfiles();
        await loadOptions();
        if (profileModal) profileModal.classList.remove('show');
        resetProfileModal();
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
    if (userBadge) userBadge.style.display = 'none';
    if (loginButton) loginButton.style.display = 'flex';
}

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
