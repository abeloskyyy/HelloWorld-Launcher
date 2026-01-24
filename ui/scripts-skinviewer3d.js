// ============================================
// 3D Skin Viewer Functions
// ============================================

/**
 * Initialize the 3D skin viewer
 */
function init3DSkinViewer() {
    const viewer3D = document.getElementById('skin3DViewer');
    const canvas2D = document.getElementById('skinPreviewCanvas');

    if (viewer3D) {
        viewer3D.style.display = 'none';
    }
    if (canvas2D) {
        canvas2D.style.display = 'none';
    }
}

/**
 * Update the 3D skin preview with skin and cape textures
 * @param {string} skinDataUrl - Data URL of the skin image
 * @param {string|null} capeDataUrl - Data URL of the cape image (null if no cape)
 * @param {string} modelType - 'classic' or 'slim'
 * @param {boolean} isLegacy - Whether the skin is in legacy format (64x32)
 */
function update3DSkinPreview(skinDataUrl, capeDataUrl = null, modelType = 'classic', isLegacy = false) {
    const viewer3D = document.getElementById('skin3DViewer');
    const skinViewer = document.getElementById('skinViewer3D');
    const canvas2D = document.getElementById('skinPreviewCanvas');

    if (!viewer3D || !skinViewer) {
        console.error('3D Skin viewer elements not found');
        return;
    }

    // Hide 2D canvas, show 3D viewer
    if (canvas2D) canvas2D.style.display = 'none';
    viewer3D.style.display = 'block';

    // Apply skin texture to all player elements (except cape)
    const playerElements = skinViewer.querySelectorAll('.player > *:not(.cape) *');
    playerElements.forEach(element => {
        element.style.backgroundImage = `url(${skinDataUrl})`;
    });

    // Apply model type (slim/classic)
    if (modelType === 'slim') {
        skinViewer.classList.add('slim');
    } else {
        skinViewer.classList.remove('slim');
    }

    // Apply legacy format if needed
    if (isLegacy) {
        skinViewer.classList.add('legacy');
    } else {
        skinViewer.classList.remove('legacy');
    }

    // Enable automatic rotation (only add if not already spinning)
    // This prevents the animation from restarting when changing layers
    if (!skinViewer.classList.contains('spin')) {
        skinViewer.classList.add('spin');
    }

    // Handle cape
    const capeContainer = skinViewer.querySelector('.cape');
    if (capeDataUrl) {
        // Apply cape texture to the container (children inherit it)
        if (capeContainer) {
            capeContainer.style.backgroundImage = `url(${capeDataUrl})`;
            capeContainer.style.display = 'block';

            // Ensure faces also have context if needed (though inherit works)
            // Debug log
            console.log('Cape applied to viewer:', capeDataUrl.substring(0, 30) + '...');
        }

        skinViewer.classList.remove('legacy-cape');
    } else {
        // Hide cape
        if (capeContainer) {
            capeContainer.style.backgroundImage = '';
            capeContainer.style.display = 'none';
        }
        skinViewer.classList.remove('legacy-cape');
    }
}

/**
 * Toggle 3D preview visibility
 * @param {boolean} show - Whether to show or hide the 3D preview
 */
function toggle3DPreview(show) {
    const viewer3D = document.getElementById('skin3DViewer');
    const canvas2D = document.getElementById('skinPreviewCanvas');

    if (viewer3D) {
        viewer3D.style.display = show ? 'block' : 'none';
    }
    if (canvas2D) {
        canvas2D.style.display = show ? 'none' : 'none'; // Keep 2D hidden when using 3D
    }
}

/**
 * Clear the 3D skin preview
 */
function clear3DSkinPreview() {
    const viewer3D = document.getElementById('skin3DViewer');
    const skinViewer = document.getElementById('skinViewer3D');

    if (viewer3D) {
        viewer3D.style.display = 'none';
    }

    if (skinViewer) {
        // Clear all background images
        const allElements = skinViewer.querySelectorAll('*');
        allElements.forEach(element => {
            element.style.backgroundImage = '';
        });

        // Remove all classes including spin
        skinViewer.classList.remove('slim', 'legacy', 'legacy-cape', 'spin');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    init3DSkinViewer();
});
