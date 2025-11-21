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
    // ------------------- Cargar versiones ------------------- //
    const versions = await window.pywebview.api.get_versions();
    const select = document.getElementById("versionSelect");
    select.innerHTML = "";
    versions.forEach(v => {
        const option = document.createElement("option");
        option.value = v;
        option.textContent = v;
        select.appendChild(option);
    });

    
    // ------------------- Cargar user.json -------------------- //
    window.pywebview.api.get_user_json().then(data => {
        document.getElementById("nickname").value = data.username || "";
        document.getElementById("mcdir").value = data.mcdir || "";
    });



    // ------------------- Cargar perfiles -------------------- //
    const profilesData = await window.pywebview.api.get_profiles();
    const profiles = profilesData.profiles;

    const list = document.getElementById("profilesList");
    list.innerHTML = ""; // limpiar

    for (const id in profiles) {
        const p = profiles[id];

        const item = document.createElement("div");
        item.className = "profile-item";
        item.innerHTML = `
            <div class="profile-card">
                <img src="` + window.pywebview.api.get_profile_icon(p.icon) + `" id="profile-img">
                <div class="profile-info">
                    <h3>${p.name}</h3>
                    <p>Versión: ${p.version} | Última vez: Hace 2 horas</p>
                </div>
                <div class="profile-actions">
                    <button class="btn-secondary btn-small">✏️ Editar</button>
                    <button class="btn-danger btn-small">🗑️ Eliminar</button>
                </div>
            </div>
        `;

        // Opcional: clic para seleccionar el perfil
        item.onclick = () => {
            console.log("Perfil seleccionado:", id);
        };

        list.appendChild(item);
    }
});







async function launchGame() {
    // Leer selección del select
    const selectedVersion = document.getElementById("versionSelect").value;
    // Leer texto del input
    const nickname = document.getElementById("nickname").value;

    // Mandar los datos a Python
    await pywebview.api.start_game(selectedVersion, nickname);
}










// UI

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
    event.target.classList.add('active');
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
    const profileVersion = document.getElementById('versionSelect').value;
    const profileJVMArgs = document.getElementById('profileJVMArgs').value;
    const profileDir = document.getElementById('profileDir').value;
    const profileIcon = getSelectedIcon();

    await window.pywebview.api.add_profile(profileName, profileVersion, profileIcon, profileDir, profileJVMArgs);
    profileModal.classList.remove('show');
});



const iconInput = document.getElementById('iconInput');
const iconPreview = document.getElementById('iconPreview');
const placeholderIcon = document.getElementById('placeholderIcon');
const iconSelector = document.getElementById('iconSelector');

let selectedImageData = null;

iconInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
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
            
            // Enviar a Python (pywebview)
            if (window.pywebview) {
                window.pywebview.api.set_profile_icon(selectedImageData);
            }
        };
        
        reader.readAsDataURL(file);
    }
});

// Función para obtener la imagen seleccionada (opcional)
function getSelectedIcon() {
    return selectedImageData;
}