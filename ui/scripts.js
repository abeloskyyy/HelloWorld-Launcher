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

    window.pywebview.api.save_user_json(username, "", "")
        .then(() => alert("Guardado!"));
}



window.addEventListener('pywebviewready', async () => {
    const versions = await pywebview.api.get_versions();
    const select = document.getElementById("versionSelect");
    select.innerHTML = "";
    versions.forEach(v => {
        const option = document.createElement("option");
        option.value = v;
        option.textContent = v;
        select.appendChild(option);
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