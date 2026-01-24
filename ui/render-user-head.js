// Function to render 3D head in user badge
function renderUserHead(skinUrl) {
    const container = document.getElementById('userAvatarHead');
    if (!container) return;

    // If no skin URL, show default icon
    if (!skinUrl) {
        container.innerHTML = '<i class="fas fa-user"></i>';
        return;
    }

    // Build 3D head
    const faces = ['top', 'left', 'front', 'right', 'back', 'bottom'];

    let headHTML = '<div class="user-head-3d"><div class="head">';

    // Main head faces
    faces.forEach(face => {
        headHTML += `<div class="${face}" style="background-image: url('${skinUrl}');"></div>`;
    });

    // Accessory layer (second layer)
    headHTML += '<div class="accessory">';
    faces.forEach(face => {
        headHTML += `<div class="${face}" style="background-image: url('${skinUrl}');"></div>`;
    });
    headHTML += '</div>'; // close accessory

    headHTML += '</div></div>'; // close head and user-head-3d

    container.innerHTML = headHTML;
}

// Export for use in other scripts
window.renderUserHead = renderUserHead;
