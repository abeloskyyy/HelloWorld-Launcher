// Función global para actualizar el progreso de instalación
window.updateInstallProgress = function (version, percentage, status) {
    const progressContainer = document.getElementById('installProgress');
    const progressBar = document.getElementById('progressBarFill');
    const progressText = document.querySelector('.install-progress-text');
    const progressPercentage = document.getElementById('progressPercentage');

    if (progressContainer && progressBar && progressText && progressPercentage) {
        // Mostrar el contenedor de progreso
        progressContainer.style.display = 'block';

        // Actualizar texto
        progressText.textContent = status || `Instalando ${version}...`;

        // Actualizar barra de progreso
        progressBar.style.width = `${percentage}%`;

        // Actualizar porcentaje
        progressPercentage.textContent = `${percentage}%`;

        // Ocultar cuando llegue al 100%
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
        .then(() => alert("Guardado!"));
}


document.getElementById("nickname").addEventListener("input", () => {
    const nick = document.getElementById("nickname").value;
    const mcdir = document.getElementById("mcdir").value;

    window.pywebview.api.save_user_json(nick, mcdir);
});

document.getElementById("mcdir").addEventListener("input", () => {
    const nick = document.getElementById("nickname").value;
    const mcdir = document.getElementById("mcdir").value;

    window.pywebview.api.save_user_json(nick, mcdir);
});


window.addEventListener('pywebviewready', async () => {
    // ------------------- Cargar perfiles en select ------------------- //
    await loadOptions();


    // ------------------- Cargar user.json -------------------- //
    window.pywebview.api.get_user_json().then(data => {
        document.getElementById("nickname").value = data.username || "";
        document.getElementById("mcdir").value = data.mcdir || "";
    });

    // ------------------- Cargar lista de perfiles -------------------- //
    await cargarPerfiles();

    // ------------------- Cargar versiones disponibles -------------------- //
    await loadVersions();
});



async function launchGame() {
    // Leer selección del select
    const selectedVersion = document.getElementById("profileSelect").value;
    // Leer texto del input
    const nickname = document.getElementById("nickname").value;

    // Mandar los datos a Python
    await pywebview.api.start_game(selectedVersion, nickname);

    // Actualizar UI inmediatamente para reflejar "Last Played"
    await loadOptions();
    await cargarPerfiles();
}


// UI

const selectTrigger = document.getElementById('selectTrigger');
const selectOptions = document.getElementById('selectOptions');
const customSelect = document.getElementById('customSelect');
const originalSelect = document.getElementById('profileSelect');
let profiles = {}; // Variable global para perfiles

// Helper para tiempo relativo
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

// Cargar versiones disponibles
async function loadVersions() {
    const versionSelect = document.getElementById('profileVersionSelect');
    versionSelect.innerHTML = '';

    try {
        const versionsData = await window.pywebview.api.get_available_versions();

        // Crear optgroup para versiones instaladas
        if (versionsData.installed && versionsData.installed.length > 0) {
            const installedGroup = document.createElement('optgroup');
            installedGroup.label = '📦 Instaladas';

            versionsData.installed.forEach(version => {
                const option = document.createElement('option');
                option.value = version;
                option.textContent = version;
                installedGroup.appendChild(option);
            });

            versionSelect.appendChild(installedGroup);
        }

        // Crear optgroup para versiones disponibles
        if (versionsData.available && versionsData.available.length > 0) {
            const availableGroup = document.createElement('optgroup');
            availableGroup.label = '☁️ Disponibles (Vanilla)';

            versionsData.available.forEach(version => {
                const option = document.createElement('option');
                option.value = version;
                option.textContent = version;
                availableGroup.appendChild(option);
            });

            versionSelect.appendChild(availableGroup);
        }
    } catch (error) {
        console.error('Error cargando versiones:', error);
    }
}

// Cargar opciones
async function loadOptions() {
    // Obtener perfiles del backend
    const profilesData = await window.pywebview.api.get_profiles();
    profiles = profilesData.profiles;

    selectOptions.innerHTML = '';
    originalSelect.innerHTML = ''; // Limpiar select oculto

    // Convertir a array para ordenar
    const profilesArray = Object.entries(profiles).map(([id, profile]) => ({
        id,
        ...profile
    }));

    // Ordenar por last_played (más reciente primero)
    profilesArray.sort((a, b) => {
        const dateA = a.last_played ? new Date(a.last_played) : new Date(0);
        const dateB = b.last_played ? new Date(b.last_played) : new Date(0);
        return dateB - dateA;
    });

    for (const profile of profilesArray) {
        const id = profile.id;

        // 1. Poblar el select oculto (necesario para que funcione .value)
        const nativeOption = document.createElement("option");
        nativeOption.value = id;
        nativeOption.textContent = profile.name;
        originalSelect.appendChild(nativeOption);

        // 2. Poblar el select personalizado
        const option = document.createElement('div');
        option.className = 'select-option';
        option.dataset.value = id;

        let tags = '';
        if (profile.type === 'forge') {
            tags = '<span class="option-tag forge">FORGE</span>';
        } else if (profile.type === 'fabric') {
            tags = '<span class="option-tag fabric">FABRIC</span>';
        } else {
            tags = '<span class="option-tag">VANILLA</span>';
        }

        if (profile.mods) {
            tags += `<span class="option-tag">${profile.mods} MODS</span>`;
        }

        // Usar get_profile_icon para obtener la ruta correcta de la imagen
        const iconUrl = await window.pywebview.api.get_profile_icon(profile.icon);
        profile.iconUrl = iconUrl; // Guardar URL para uso posterior

        const lastPlayedText = profile.last_played ? timeAgo(profile.last_played) : 'Nunca';

        option.innerHTML = `
            <img src="${iconUrl}" alt="" class="option-icon">
            <div class="option-content">
                <div class="option-title">${profile.name}</div>
                <div class="option-subtitle">Versión ${profile.version} • ${lastPlayedText}</div>
                <div class="option-tags">
                    ${tags}
                </div>
            </div>
        `;

        option.addEventListener('click', () => selectOption(id, profile));
        selectOptions.appendChild(option);
    }

    // Seleccionar primera opción (la más reciente) por defecto
    if (profilesArray.length > 0) {
        const firstProfile = profilesArray[0];
        selectOption(firstProfile.id, firstProfile);
    }
}

// Seleccionar opción
function selectOption(id, profile) {
    // Actualizar select original
    originalSelect.value = id;

    const lastPlayedText = profile.last_played ? timeAgo(profile.last_played) : 'Nunca';

    // Actualizar visual del trigger
    document.getElementById('selectedIcon').src = profile.iconUrl || profile.icon;
    document.getElementById('selectedTitle').textContent = profile.name;
    document.getElementById('selectedSubtitle').textContent = `Versión ${profile.version} • ${lastPlayedText}`;

    // Marcar opción como seleccionada
    document.querySelectorAll('.select-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    const selectedOpt = document.querySelector(`[data-value="${id}"]`);
    if (selectedOpt) selectedOpt.classList.add('selected');

    // Cerrar dropdown
    closeSelect();

    // Disparar evento change en el select original
    originalSelect.dispatchEvent(new Event('change'));
}

// Toggle dropdown
function toggleSelect() {
    selectTrigger.classList.toggle('active');
    selectOptions.classList.toggle('active');
}

function closeSelect() {
    selectTrigger.classList.remove('active');
    selectOptions.classList.remove('active');
}

// Event listeners
selectTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSelect();
});

// Cerrar al hacer clic fuera
document.addEventListener('click', (e) => {
    if (!customSelect.contains(e.target)) {
        closeSelect();
    }
});


async function cargarPerfiles() {
    // ------------------- Cargar perfiles -------------------- //
    const profilesData = await window.pywebview.api.get_profiles();
    const profiles = profilesData.profiles;

    const list = document.getElementById("profilesList");
    list.innerHTML = ""; // limpiar

    // Convertir a array para ordenar
    const profilesArray = Object.entries(profiles).map(([id, profile]) => ({
        id,
        ...profile
    }));

    // Ordenar por last_played (más reciente primero)
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
                <button class="btn-secondary btn-small">✏️ Editar</button>
                <button class="btn-danger btn-small">🗑️ Eliminar</button>
            </div>
        `;

        // Opcional: clic para seleccionar el perfil
        item.onclick = () => {
            console.log("Perfil seleccionado:", id);
        };

        list.appendChild(item);
    }
}

function showSection(sectionId) {
    // Ocultar todas las secciones
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Desactivar todos los botones
    document.querySelectorAll('.sidebar-button').forEach(button => {
        button.classList.remove('active');
    });

    // Mostrar la sección seleccionada
    document.getElementById(sectionId).classList.add('active');

    // Activar el botón correspondiente
    if (event && event.target) {
        event.target.classList.add('active');
    }
}




const createProfileBtn = document.getElementById('createProfileBtn');
const profileModal = document.getElementById('modal');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const acceptProfileBtn = document.getElementById('acceptProfileBtn');

createProfileBtn.addEventListener('click', () => {
    profileModal.classList.add('show');
});

cancelModalBtn.addEventListener('click', () => {
    profileModal.classList.remove('show');
});

acceptProfileBtn.addEventListener('click', async () => {
    const profileName = document.getElementById('profileName').value;
    const profileVersion = document.getElementById('profileVersionSelect').value;
    const profileJVMArgs = document.getElementById('profileJVMArgs').value;
    const profileDir = document.getElementById('profileDir').value;
    const profileIcon = getSelectedIcon();

    await window.pywebview.api.add_profile(profileName, profileVersion, profileIcon, profileDir, profileJVMArgs);
    await cargarPerfiles();
    await loadOptions();
    profileModal.classList.remove('show');
});



const iconInput = document.getElementById('iconInput');
const iconPreview = document.getElementById('iconPreview');
const placeholderIcon = document.getElementById('placeholderIcon');
const iconSelector = document.getElementById('iconSelector');

let selectedImageData = null;

iconInput.addEventListener('change', function (e) {
    const file = e.target.files[0];

    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();

        reader.onload = function (e) {
            // Guardar los datos de la imagen
            selectedImageData = {
                base64: e.target.result,
                filename: file.name,
                type: file.type
            };

            // Mostrar preview
            iconPreview.src = e.target.result;
            iconPreview.style.display = 'block';
            placeholderIcon.style.display = 'none';
            iconSelector.classList.add('has-image');
        };

        reader.readAsDataURL(file);
    }
});

// Función para obtener la imagen seleccionada (opcional)
function getSelectedIcon() {
    return selectedImageData;
}