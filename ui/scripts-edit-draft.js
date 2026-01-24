
// Edit Logic
let editingPackId = null;

// Open modal for editing
window.editPack = function (packId) {
    if (!window.currentPacks || !window.currentPacks[packId]) return;

    const pack = window.currentPacks[packId];
    editingPackId = packId;

    const modal = document.getElementById('skinPackModal');
    const title = modal.querySelector('h2');
    const confirmBtn = document.getElementById('createPackBtn');
    const nameInput = document.getElementById('packName');
    const modelSelect = document.getElementById('skinModelSelect');
    const fileName = document.getElementById('skinFileName');

    // Update Modal UI
    modal.classList.add('show');
    if (title) title.textContent = 'Edit Skin Pack';
    if (confirmBtn) {
        confirmBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        confirmBtn.onclick = null; // Remove old listener (handled via shared function now)
    }

    // Fill Data
    if (nameInput) nameInput.value = pack.name;
    if (modelSelect) modelSelect.value = pack.skin_model || 'classic';

    // Use existing preview if available
    if (fileName) fileName.textContent = 'Keep existing skin (upload to change)';
    currentSkinFile = null; // Reset file input, logic handles null as "no change"

    // Set Cape
    currentCapeId = pack.cape_id || 'none';

    // Update Previews
    // We need to fetch the base64 or url again? We have it in pack.skin_preview
    if (pack.skin_preview) {
        // Show current skin in preview
        const viewer = document.getElementById('skin3DViewer');
        const placeholder = document.getElementById('skinUploadPlaceholder');
        const container = document.getElementById('skinUploadContainer');

        if (viewer) viewer.style.display = 'flex';
        if (placeholder) placeholder.style.display = 'none';
        if (container) container.classList.add('active');

        // Render existing skin
        update3DSkinPreview(pack.skin_preview, pack.cape_preview, pack.skin_model, false); // Assuming false for isLegacy? We don't know dimensions easily without loading img.
        // Actually update3DSkinPreview expects image URLs. pack.skin_preview is a data URL.

        // We need to know if legacy. usually we can infer or pass default.
        // Let's load the image to check dimensions
        const img = new Image();
        img.onload = function () {
            const isLegacy = img.height === 32;
            update3DSkinPreview(pack.skin_preview, pack.cape_preview, pack.skin_model, isLegacy);
        };
        img.src = pack.skin_preview;
    }

    // Select Cape in UI
    const allOpts = document.querySelectorAll('.cape-option');
    allOpts.forEach(opt => {
        opt.classList.remove('selected');
        if (opt.dataset.capeId === currentCapeId) opt.classList.add('selected');
    });
};

// Override clear function to reset edit mode
const originalClear = window.clearSkinPackModal; // Oops, it's defined inside closure. I need to redefine or hook it.
// I'll rewrite the clear function in the replacement.

// Updated handlePackSubmit (extracted for reuse)
function handlePackSubmit() {
    const packNameInput = document.getElementById('packName');
    const name = packNameInput ? packNameInput.value.trim() : '';
    const skinModelSelect = document.getElementById('skinModelSelect');
    const createPackConfirmBtn = document.getElementById('createPackBtn');

    if (!name) {
        alert('Please enter a pack name');
        return;
    }

    // Validation: 
    // If Creating: Need file.
    // If Editing: File is optional.
    if (!editingPackId && !currentSkinFile) {
        alert('Please upload a skin file');
        return;
    }

    const modelType = skinModelSelect ? skinModelSelect.value : 'classic';
    const capeId = currentCapeId;

    createPackConfirmBtn.disabled = true;
    createPackConfirmBtn.textContent = editingPackId ? 'Saving...' : 'Creating...';

    const processSubmission = (skinBase64) => {
        if (editingPackId) {
            // Edit Mode
            window.pywebview.api.edit_skin_pack(editingPackId, name, skinBase64, modelType, capeId)
                .then(response => {
                    handleResponse(response);
                })
                .catch(handleError);
        } else {
            // Create Mode
            window.pywebview.api.create_skin_pack(name, skinBase64, modelType, capeId)
                .then(response => {
                    handleResponse(response);
                })
                .catch(handleError);
        }
    };

    const handleResponse = (response) => {
        createPackConfirmBtn.disabled = false;
        createPackConfirmBtn.innerHTML = editingPackId ? '<i class="fas fa-save"></i> Save Changes' : '<i class="fas fa-plus"></i> Create Pack';

        if (response.success) {
            clearSkinPackModal();
            if (window.loadSkinPacks) window.loadSkinPacks();
        } else {
            alert('Error: ' + (response.error || 'Unknown error'));
        }
    };

    const handleError = (err) => {
        createPackConfirmBtn.disabled = false;
        createPackConfirmBtn.innerHTML = editingPackId ? '<i class="fas fa-save"></i> Save Changes' : '<i class="fas fa-plus"></i> Create Pack';
        alert('Error calling backend: ' + err);
    };

    if (currentSkinFile) {
        const reader = new FileReader();
        reader.onload = function (e) {
            processSubmission(e.target.result);
        };
        reader.readAsDataURL(currentSkinFile);
    } else {
        // Only valid for editing
        processSubmission(null);
    }
}
