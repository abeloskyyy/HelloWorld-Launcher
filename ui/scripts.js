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


function guardarDatos() {
    const username = document.getElementById("nickname").value;

    window.pywebview.api.save_user_json(username, "")
        .then(() => alert("Guardado!"));
}


document.getElementById("nickname").addEventListener("input", () => {
    const nick = document.getElementById("nickname").value;
    window.pywebview.api.save_user_json(nick, "");
});


window.addEventListener('pywebviewready', async () => {
    const versions = await window.pywebview.api.get_versions();
    const select = document.getElementById("versionSelect");
    select.innerHTML = "";
    versions.forEach(v => {
        const option = document.createElement("option");
        option.value = v;
        option.textContent = v;
        select.appendChild(option);
    });

    window.pywebview.api.get_user_json().then(data => {
        document.getElementById("nickname").value = data.username || "";
    });
});




async function launchGame() {
    // Leer selección del select
    const selectedVersion = document.getElementById("versionSelect").value;
    // Leer texto del input
    const nickname = document.getElementById("nickname").value;

    // Mandar los datos a Python
    await pywebview.api.start_game(selectedVersion, nickname);
}