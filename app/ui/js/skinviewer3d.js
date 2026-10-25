// ============================================
// 3D Skin Viewer Functions - skinview3d WebGL Engine
// ============================================

function init3DSkinViewer() {
    const viewer3D = document.getElementById('skin3DViewer');
    const canvas2D = document.getElementById('skinPreviewCanvas');
    if (viewer3D) viewer3D.style.display = 'none';
    if (canvas2D) canvas2D.style.display = 'none';
}

function update3DSkinPreview(skinDataUrl, capeDataUrl = null, modelType = 'classic', isLegacy = false) {
    if (window.skinViewerManager && typeof window.skinViewerManager.update3DSkinPreview === 'function') {
        window.skinViewerManager.update3DSkinPreview(skinDataUrl, capeDataUrl, modelType);
        return;
    }
    if (typeof window.update3DSkinPreview === 'function' && window.update3DSkinPreview !== update3DSkinPreview) {
        window.update3DSkinPreview(skinDataUrl, capeDataUrl, modelType);
    }
}

function toggle3DPreview(show) {
    const viewer3D = document.getElementById('skin3DViewer');
    if (viewer3D) {
        viewer3D.style.display = show ? 'block' : 'none';
    }
}

function clear3DSkinPreview() {
    if (window.skinViewerManager && typeof window.skinViewerManager.clear3DSkinPreview === 'function') {
        window.skinViewerManager.clear3DSkinPreview();
        return;
    }
    const viewer3D = document.getElementById('skin3DViewer');
    if (viewer3D) viewer3D.style.display = 'none';
}

window.init3DSkinViewer = init3DSkinViewer;
window.update3DSkinPreview = update3DSkinPreview;
window.toggle3DPreview = toggle3DPreview;
window.clear3DSkinPreview = clear3DSkinPreview;

document.addEventListener('DOMContentLoaded', function () {
    init3DSkinViewer();
});
