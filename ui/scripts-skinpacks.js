// ============================================
// Skin Pack Management
// ============================================

let currentSkinFile = null;
let currentCapeId = 'none';
let editingPackId = null;
let loadedCapes = []; // Store loaded capes with their data

// Helper to get current skin URL (file or existing)
function getCurrentSkinUrl(callback) {
    if (currentSkinFile) {
        const reader = new FileReader();
        reader.onload = function (e) { callback(e.target.result); };
        reader.readAsDataURL(currentSkinFile);
    } else if (editingPackId && window.currentPacks && window.currentPacks[editingPackId]) {
        callback(window.currentPacks[editingPackId].skin_preview); // Use preview (base64) or skin_path? Preview is ready.
    } else {
        callback(null);
    }
}

// Refactored update trigger
function triggerPreviewUpdate() {
    getCurrentSkinUrl(function (skinUrl) {
        if (!skinUrl) return;

        const modelType = document.getElementById('skinModelSelect') ? document.getElementById('skinModelSelect').value : 'classic';

        // We can't easily detect legacy from URL without loading image. 
        // For now, assume modern if not file. If file, we could inspect dim, but let's just load.
        const img = new Image();
        img.onload = function () {
            const isLegacy = img.height === 32;

            // Get cape texture from loaded capes
            let capeDataUrl = null;
            if (currentCapeId && currentCapeId !== 'none') {
                const capeData = window.loadedCapes ? window.loadedCapes.find(c => c.id === currentCapeId) : null;
                if (capeData) {
                    capeDataUrl = capeData.base64;
                }
            }
            update3DSkinPreview(skinUrl, capeDataUrl, modelType, isLegacy);
        };
        img.src = skinUrl;
    });
}

// Initialize skin pack modal handlers
document.addEventListener('DOMContentLoaded', function () {
    const skinFileInput = document.getElementById('skinFileInput');
    const skinFileName = document.getElementById('skinFileName');
    const skinModelSelect = document.getElementById('skinModelSelect');
    const createSkinPackBtn = document.getElementById('createSkinPackBtn');
    const skinPackModal = document.getElementById('skinPackModal');
    const packNameInput = document.getElementById('packName');

    // Handle open modal
    if (createSkinPackBtn && skinPackModal) {
        createSkinPackBtn.addEventListener('click', function () {
            skinPackModal.classList.add('show');
            // Reset to defaults
            if (skinFileName) skinFileName.textContent = 'No file selected';
            if (skinFileInput) skinFileInput.value = '';
            if (packNameInput) packNameInput.value = '';
            clear3DSkinPreview();

            // Initialize the 3D viewer with spin class so it starts at frame 0
            const skinViewer = document.getElementById('skinViewer3D');
            if (skinViewer) {
                skinViewer.classList.add('spin');
            }

            // Load capes dynamically
            loadUserCapes();
        });
    }

    // Handle create pack
    const createPackConfirmBtn = document.getElementById('createPackBtn');
    if (createPackConfirmBtn) {
        createPackConfirmBtn.addEventListener('click', handlePackSubmit);
    }

    // Handle skin file upload
    if (skinFileInput) {
        skinFileInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (!file) return;

            // Validate file type
            if (!file.type.match('image/png')) {
                alert('Please select a PNG file');
                skinFileInput.value = '';
                return;
            }

            // Validate Dimensions (Must be 64x64 or 64x32)
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);
            img.onload = function () {
                URL.revokeObjectURL(objectUrl);
                if ((img.width === 64 && img.height === 64) || (img.width === 64 && img.height === 32)) {
                    // Valid dimensions
                    currentSkinFile = file;
                    if (skinFileName) skinFileName.textContent = file.name;

                    // Hide placeholder, show viewer
                    const placeholder = document.getElementById('skinUploadPlaceholder');
                    const viewerContainer = document.getElementById('skin3DViewer');
                    const uploadContainerDiv = document.getElementById('skinUploadContainer');

                    if (placeholder) placeholder.style.display = 'none';
                    if (viewerContainer) viewerContainer.style.display = 'flex';
                    if (uploadContainerDiv) uploadContainerDiv.classList.add('active');

                    triggerPreviewUpdate();
                } else {
                    alert('Invalid skin dimensions! Skin must be exactly 64x64 or 64x32 pixels.');
                    skinFileInput.value = '';
                }
            };
            img.src = objectUrl;
        });
    }

    // Handle click on upload area to trigger input
    const skinUploadContainer = document.getElementById('skinUploadContainer');
    if (skinUploadContainer) {
        skinUploadContainer.addEventListener('click', function (e) {
            if (e.target.closest('.change-skin-btn')) return;
            if (this.classList.contains('active')) return;
            if (skinFileInput) skinFileInput.click();
        });
    }

    // Handle change skin button
    const changeSkinBtn = document.getElementById('changeSkinBtn');
    if (changeSkinBtn) {
        changeSkinBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (skinFileInput) skinFileInput.click();
        });
    }

    // Handle model type change
    if (skinModelSelect) {
        skinModelSelect.addEventListener('change', triggerPreviewUpdate);
    }

    // Handle modal close - clear preview
    const closeSkinPackModal = document.getElementById('closeSkinPackModal');
    const cancelSkinPackBtn = document.getElementById('cancelSkinPackBtn');

    window.clearSkinPackModal = function () {
        editingPackId = null;
        document.querySelector('#skinPackModal h2').textContent = 'Create Skin Pack';
        const btn = document.getElementById('createPackBtn');
        if (btn) btn.innerHTML = '<i class=\"fas fa-plus\"></i> Create Pack';
        if (skinPackModal) skinPackModal.classList.remove('show');

        currentSkinFile = null;
        currentCapeId = 'none';
        if (skinFileName) skinFileName.textContent = 'No file selected';
        if (skinFileInput) skinFileInput.value = '';

        // Reset UI state
        const placeholder = document.getElementById('skinUploadPlaceholder');
        const viewerContainer = document.getElementById('skin3DViewer');
        const uploadContainerDiv = document.getElementById('skinUploadContainer');

        if (placeholder) placeholder.style.display = 'flex';
        if (viewerContainer) viewerContainer.style.display = 'none';
        if (uploadContainerDiv) uploadContainerDiv.classList.remove('active');

        clear3DSkinPreview();

        // Reset cape selection visual
        const allOpts = document.querySelectorAll('.cape-option');
        allOpts.forEach(opt => opt.classList.remove('selected'));
        const noCape = document.querySelector('.cape-option[data-cape-id="none"]');
        if (noCape) noCape.classList.add('selected');
    }

    if (closeSkinPackModal) {
        closeSkinPackModal.addEventListener('click', window.clearSkinPackModal);
    }
    if (cancelSkinPackBtn) {
        cancelSkinPackBtn.addEventListener('click', window.clearSkinPackModal);
    }

    // Load packs on init
    loadSkinPacks();
});

// Load and display skin packs

function handlePackSubmit() {
    const packNameInput = document.getElementById('packName');
    const name = packNameInput ? packNameInput.value.trim() : '';
    const skinModelSelect = document.getElementById('skinModelSelect');
    const createPackConfirmBtn = document.getElementById('createPackBtn');

    if (!name) {
        alert('Please enter a pack name');
        return;
    }

    if (!editingPackId && !currentSkinFile) {
        alert('Please upload a skin file');
        return;
    }

    const modelType = skinModelSelect ? skinModelSelect.value : 'classic';
    const capeId = currentCapeId;

    // Find cape base64
    let capeBase64 = null;
    if (capeId && capeId !== 'none' && window.loadedCapes) {
        const capeObj = window.loadedCapes.find(c => c.id === capeId);
        if (capeObj) {
            capeBase64 = capeObj.base64;
        }
    }

    createPackConfirmBtn.disabled = true;
    createPackConfirmBtn.textContent = editingPackId ? 'Saving...' : 'Creating...';

    const processSubmission = (skinBase64) => {
        if (editingPackId) {
            // When editing, only pass capeBase64 if we have it
            // Otherwise pass undefined to preserve existing cape_data
            if (capeBase64) {
                window.pywebview.api.edit_skin_pack(editingPackId, name, skinBase64, modelType, capeId, capeBase64)
                    .then(response => handleResponse(response))
                    .catch(handleError);
            } else {
                // Don't pass capeBase64 at all to preserve existing data
                window.pywebview.api.edit_skin_pack(editingPackId, name, skinBase64, modelType, capeId)
                    .then(response => handleResponse(response))
                    .catch(handleError);
            }
        } else {
            window.pywebview.api.create_skin_pack(name, skinBase64, modelType, capeId, capeBase64)
                .then(response => handleResponse(response))
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
        processSubmission(null);
    }
}

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

    modal.classList.add('show');
    if (title) title.textContent = 'Edit Skin Pack';
    if (confirmBtn) {
        confirmBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
    }

    if (nameInput) nameInput.value = pack.name;
    // Set model select
    if (modelSelect) modelSelect.value = pack.skin_model || 'classic';

    if (fileName) fileName.textContent = 'Keep existing skin (upload to change)';
    currentSkinFile = null;

    currentCapeId = pack.cape_id || 'none';

    // If pack has saved cape data, add it to loadedCapes so preview can find it
    if (pack.cape_preview && pack.cape_id && pack.cape_id !== 'none') {
        // Check if cape is already in loadedCapes
        const existingCape = window.loadedCapes?.find(c => c.id === pack.cape_id);
        if (!existingCape) {
            // Add the saved cape to loadedCapes
            if (!window.loadedCapes) window.loadedCapes = [];
            window.loadedCapes.push({
                id: pack.cape_id,
                base64: pack.cape_preview,
                alias: 'Saved Cape'
            });
        }
    }

    // Show Preview immediately
    const viewer = document.getElementById('skin3DViewer');
    const placeholder = document.getElementById('skinUploadPlaceholder');
    const container = document.getElementById('skinUploadContainer');

    if (viewer) viewer.style.display = 'flex';
    if (placeholder) placeholder.style.display = 'none';
    if (container) container.classList.add('active');

    // Load user capes from API
    loadUserCapes();

    // Trigger preview update to show skin and cape
    triggerPreviewUpdate();

    // Also select in UI after delay
    setTimeout(() => {
        const allOpts = document.querySelectorAll('.cape-option');
        allOpts.forEach(opt => {
            opt.classList.remove('selected');
            if (opt.dataset.capeId === currentCapeId) opt.classList.add('selected');
        });

        // Retrigger to ensure cape is applied if it wasn't loaded in first trigger
        triggerPreviewUpdate();
    }, 200);
};

window.loadSkinPacks = function () {
    if (!window.pywebview || !window.pywebview.api) {
        // Retry a bit later if API not ready
        setTimeout(window.loadSkinPacks, 500);
        return;
    }

    window.pywebview.api.get_skin_packs().then(data => {
        const grid = document.getElementById('skinPacksGrid');
        if (!grid) return;

        const packs = data.packs || {};
        window.currentPacks = packs; // Store globally for access in activatePack
        const activePackId = data.active_pack;
        const packIds = Object.keys(packs);

        // Clear grid
        grid.innerHTML = '';

        if (packIds.length === 0) {
            grid.innerHTML = `
                <div class="no-packs-message">
                    <i class="fas fa-tshirt"></i>
                    <p>No skin packs yet</p>
                    <p style="font-size: 14px; color: #666;">Create your first pack to get started</p>
                </div>
            `;
            return;
        }

        // Initial Render: Find active pack to show in large preview
        let activePackData = null;
        if (activePackId && packs[activePackId]) {
            activePackData = { ...packs[activePackId], id: activePackId };
        } else if (packIds.length > 0) {
            // Fallback to first if no active
            const firstId = packIds[0];
            activePackData = { ...packs[firstId], id: firstId };
        }

        if (activePackData) {
            updateLargeSkinPreview(activePackData);
        }

        // Render packs
        packIds.forEach(id => {
            const pack = packs[id];
            const isActive = id === activePackId;
            const skinPreview = pack.skin_preview;
            const isSlim = pack.skin_model === 'slim';
            const hasCape = pack.cape_id && pack.cape_id !== 'none';

            const card = document.createElement('div');
            card.className = `skin-pack-card ${isActive ? 'active' : ''}`;
            card.dataset.packId = id; // Store ID for DOM logic

            // Note: Click to preview functionality removed as per user request
            // Only the active skin is shown in the large preview

            // Build 3D viewer HTML structure for the card
            // We use inline styles for background images
            const faces = ['top', 'left', 'front', 'right', 'back', 'bottom'];
            const parts = ['head', 'body', 'left-arm', 'right-arm', 'left-leg', 'right-leg'];

            let viewerHTML = `<div class="mini-3d-viewer"><div class="mc-skin-viewer-9x ${isSlim ? 'slim' : ''} legacy"><div class="player">`;

            parts.forEach(part => {
                viewerHTML += `<div class="${part}">`;
                faces.forEach(face => {
                    viewerHTML += `<div class="${face}" style="background-image: url('${skinPreview}')"></div>`;
                });
                viewerHTML += `<div class="accessory">`;
                faces.forEach(face => {
                    viewerHTML += `<div class="${face}" style="background-image: url('${skinPreview}')"></div>`;
                });
                viewerHTML += `</div></div>`;
            });

            // Add cape if needed
            if (hasCape && pack.cape_preview) {
                viewerHTML += `<div class="cape" style="background-image: url('${pack.cape_preview}')">`;
                faces.forEach(face => {
                    viewerHTML += `<div class="${face}"></div>`;
                });
                viewerHTML += `</div>`;
            }

            viewerHTML += `</div></div></div>`;

            card.innerHTML = `
                <div class="pack-preview-container">
                    ${viewerHTML}
                </div>
                <div class="pack-info">
                    <h3>${pack.name}</h3>
                    <div class="pack-meta">
                        <span>${isSlim ? 'Alex' : 'Steve'}</span>
                        ${hasCape && pack.cape_alias ? `<span>• Cape: ${pack.cape_alias}</span>` : ''}
                    </div>
                </div>
                <div class="pack-actions">
                    ${isActive
                    ? '<button class="btn-small btn-secondary" disabled>Active</button>'
                    : `<button class="btn-small btn-blue" onclick="activatePack('${id}')">Use</button>`
                }
                    <button class="btn-small btn-secondary edit-btn" onclick="editPack('${id}')" style="margin-right: 5px;"><i class="fas fa-edit"></i></button>
                    <button class="btn-small btn-red" onclick="deletePack('${id}')"><i class="fas fa-trash"></i></button>
                </div>
            `;
            grid.appendChild(card);
        });

        // Restore cooldown visuals if needed
        if (typeof updateCooldownVisuals === 'function') {
            updateCooldownVisuals();
        }
    }).catch(err => {
        console.error('Error loading skin packs:', err);
    });
};

// Function to update the large preview
window.updateLargeSkinPreview = function (pack) {
    const container = document.getElementById('largeSkinViewerContainer');
    if (!container) return;

    const skinPreview = pack.skin_preview;
    const isSlim = pack.skin_model === 'slim';
    const hasCape = pack.cape_id && pack.cape_id !== 'none';

    // Build 3D viewer HTML structure
    const faces = ['top', 'left', 'front', 'right', 'back', 'bottom'];
    const parts = ['head', 'body', 'left-arm', 'right-arm', 'left-leg', 'right-leg'];

    // Use mc-skin-viewer-9x and scale with CSS
    // We add 'spin' class for animation if desired, or remove it for static
    // The user didn't explicitly ask for rotation, but "skin seleccionada" might imply static or rotating. 
    // The mini previews spin. Let's make the large one spin too for "w factor".

    let viewerHTML = `<div class="mc-skin-viewer-9x spin ${isSlim ? 'slim' : ''} legacy"><div class="player">`;

    parts.forEach(part => {
        viewerHTML += `<div class="${part}">`;
        faces.forEach(face => {
            viewerHTML += `<div class="${face}" style="background-image: url('${skinPreview}')"></div>`;
        });
        viewerHTML += `<div class="accessory">`;
        faces.forEach(face => {
            viewerHTML += `<div class="${face}" style="background-image: url('${skinPreview}')"></div>`;
        });
        viewerHTML += `</div></div>`;
    });

    // Add cape if needed
    if (hasCape && pack.cape_preview) {
        viewerHTML += `<div class="cape" style="background-image: url('${pack.cape_preview}')">`;
        faces.forEach(face => {
            viewerHTML += `<div class="${face}"></div>`;
        });
        viewerHTML += `</div>`;
    }

    viewerHTML += `</div></div>`;

    container.innerHTML = viewerHTML;

    // Update title/info if needed
    // const titleEl = document.querySelector('.large-skin-preview-sticky h3');
    // if(titleEl) titleEl.textContent = pack.name;
};

// Cooldown System
let activationCooldown = false;
let cooldownTimer = null;
let remainingCooldown = 0;

function updateCooldownVisuals() {
    if (!activationCooldown) return;

    const allUseBtns = document.querySelectorAll('.btn-blue');
    allUseBtns.forEach(btn => {
        btn.classList.add('disabled-cooldown');
        btn.textContent = `Use in ${remainingCooldown}s`;
    });
}

function resetCooldownVisuals() {
    const disabledBtns = document.querySelectorAll('.disabled-cooldown');
    disabledBtns.forEach(btn => {
        btn.classList.remove('disabled-cooldown');
        if (btn.classList.contains('btn-blue')) {
            btn.textContent = 'Use';
        }
    });
}

// Activate a skin pack
window.activatePack = function (packId) {
    if (!window.pywebview || !window.pywebview.api) return;

    if (activationCooldown) {
        console.log("Cooldown active, ignoring click");
        return;
    }

    // Set cooldown (3 seconds)
    activationCooldown = true;
    remainingCooldown = 3;
    updateCooldownVisuals();

    // Start Countdown
    if (cooldownTimer) clearInterval(cooldownTimer);
    cooldownTimer = setInterval(() => {
        remainingCooldown--;
        if (remainingCooldown <= 0) {
            clearInterval(cooldownTimer);
            activationCooldown = false;
            resetCooldownVisuals();
        } else {
            updateCooldownVisuals();
        }
    }, 1000);

    // Optimistic UI Update
    // 1. Update Large Preview
    if (window.currentPacks && window.currentPacks[packId]) {
        const packData = { ...window.currentPacks[packId], id: packId };
        updateLargeSkinPreview(packData);
    }

    // 2. Update UI Buttons and Cards
    const clickedBtn = document.querySelector(`button[onclick="activatePack('${packId}')"]`);
    const container = document.getElementById('skinPacksGrid');

    // Reset previous active state
    if (container) {
        const prevActive = container.querySelector('.skin-pack-card.active');
        if (prevActive) {
            prevActive.classList.remove('active');
            const prevBtn = prevActive.querySelector('.btn-secondary[disabled]');
            if (prevBtn) {
                const prevId = prevActive.dataset.packId;
                prevBtn.className = 'btn-small btn-blue';
                prevBtn.disabled = false;
                prevBtn.textContent = 'Use';
                if (prevId) {
                    prevBtn.setAttribute('onclick', `activatePack('${prevId}')`);
                }
            }
        }
    }

    // specific update for clicked card
    if (clickedBtn) {
        const card = clickedBtn.closest('.skin-pack-card');
        if (card) {
            card.classList.add('active');
        }
        clickedBtn.className = 'btn-small btn-secondary';
        clickedBtn.disabled = true;
        clickedBtn.textContent = 'Active';
    }

    // Force update visuals
    updateCooldownVisuals();

    // Call backend
    window.pywebview.api.activate_skin_pack(packId).then(response => {
        if (!response.success) {
            alert('Error activating skin: ' + (response.error || 'Unknown error'));
            loadSkinPacks();
        } else {
            console.log('Skin activated successfully');
        }
    }).catch(err => {
        alert('Error calling backend: ' + err);
        loadSkinPacks();
    });
};

// Delete a skin pack
window.deletePack = function (packId) {
    if (!window.pywebview || !window.pywebview.api) return;

    window.pywebview.api.confirm('Are you sure you want to delete this skin pack?').then(confirmed => {
        if (!confirmed) return;

        window.pywebview.api.delete_skin_pack(packId).then(response => {
            if (response.success) {
                loadSkinPacks();
            } else {
                alert('Error deleting pack: ' + (response.error || 'Unknown error'));
            }
        }).catch(err => alert('Error calling backend: ' + err));
    });
};

// Load User Capes Dynamically
window.loadUserCapes = function () {
    if (!window.pywebview || !window.pywebview.api) return;

    const grid = document.getElementById('capeSelectionGrid');
    if (!grid) return;

    // Show Loader
    grid.style.position = 'relative';
    grid.style.minHeight = '100px'; // Ensure height for loader
    grid.innerHTML = `
        <div id="capeLoader" style="
            position: absolute; 
            top: 50%; 
            left: 50%; 
            transform: translate(-50%, -50%); 
            z-index: 10; 
            display: flex; 
            flex-direction: column; 
            align-items: center;
        ">
            <div class="spinner"></div>
            <div style="margin-top: 10px; font-size: 12px; color: #aaa;">Loading Capes...</div>
        </div>
    `;

    window.pywebview.api.get_user_capes().then(response => {
        // Clear Loader
        grid.innerHTML = '';
        window.loadedCapes = []; // CRITICAL: Use window.loadedCapes not loadedCapes

        // Add "None" option
        const noneOption = document.createElement('div');
        noneOption.className = 'cape-option';
        if (currentCapeId === 'none') noneOption.classList.add('selected');
        noneOption.dataset.capeId = 'none';
        noneOption.innerHTML = `
            <div class="cape-preview-box no-cape">
                <i class="fas fa-ban"></i>
            </div>
            <span>None</span>
        `;
        noneOption.addEventListener('click', function () { handleCapeSelection(this); });
        grid.appendChild(noneOption);

        if (response.success && response.capes) {
            response.capes.forEach(cape => {
                // Store cape data globally
                window.loadedCapes.push({
                    id: cape.id,
                    alias: cape.alias,
                    base64: cape.base64
                });

                const opt = document.createElement('div');
                opt.className = 'cape-option';
                if (currentCapeId === cape.id) opt.classList.add('selected');
                opt.dataset.capeId = cape.id;

                // Show Cape Image (Cropped to Front)
                // Cape front is at x=1, y=1, w=10, h=16
                // Texture size is usually 64 wide.
                // Multiplier: 40px width / 10px texture = 4x scale.
                // Background size: 64 * 4 = 256px
                // Background pos x: -1 * 4 = -4px
                // Background pos y: -1 * 4 = -4px

                opt.innerHTML = `
                    <div class="cape-preview-box">
                         <div style="
                            width: 40px; 
                            height: 64px; 
                            background-image: url('${cape.base64}'); 
                            background-size: 256px auto; 
                            background-position: -4px -4px; 
                            background-repeat: no-repeat;
                            image-rendering: pixelated;
                            box-shadow: 2px 2px 5px rgba(0,0,0,0.5);
                        "></div>
                    </div>
                    <span>${cape.alias || 'Cape'}</span>
                `;
                opt.addEventListener('click', function () { handleCapeSelection(this); });
                grid.appendChild(opt);
            });
        }
    }).catch(e => {
        console.error("Error loading capes", e);
        grid.innerHTML = '<div style="color: #d9534f; padding: 20px;">Error loading capes</div>';
    });
}

function handleCapeSelection(element) {
    // Remove selected from all
    const all = document.querySelectorAll('.cape-option');
    all.forEach(el => el.classList.remove('selected'));

    // Add to clicked
    element.classList.add('selected');

    // Update global
    currentCapeId = element.dataset.capeId;

    // Use triggerPreviewUpdate
    triggerPreviewUpdate();
}

// Smart update to preserve rotation
function update3DSkinPreview(skinData, capeData, model, isLegacy) {
    const container = document.getElementById('skinViewer3D');
    if (!container) return;

    const isSlim = model === 'slim';

    // Check if we already have a viewer we can update
    let viewer = container.querySelector('.mc-skin-viewer-11x');
    if (viewer) {
        // Update Classes
        if (isSlim) viewer.classList.add('slim'); else viewer.classList.remove('slim');

        if (isLegacy) viewer.classList.add('legacy-cape'); else viewer.classList.remove('legacy-cape');

        // Update Skin Textures
        // Select all non-cape faces (and non-player container)
        // Accessing children of children directly is safest
        // Structure: .player > .part > .face
        // And .player > .part > .accessory > .face
        const allSkinFaces = viewer.querySelectorAll('.player > div:not(.cape) div');
        allSkinFaces.forEach(div => {
            div.style.backgroundImage = `url('${skinData}')`;
        });

        // Update Cape
        let capeDiv = viewer.querySelector('.player > .cape');
        if (capeData) {
            if (capeDiv) {
                // Update existing cape
                capeDiv.style.backgroundImage = `url('${capeData}')`;
                // Note: The faces inherit, but we set style on parent cape div in loop below. 
                // Actually my loop below sets it on faces? 
                // Let's see original: <div class="cape" style="bg-image..."><div class="face"></div>...
                // So setting on capeDiv is enough due to inheritance?
                // Let's set on capeDiv AND faces to be sure/consistent with recreation logic
                // Actually inheritance is forced in CSS line 1473: background-image: inherit !important;
                // So setting on capeDiv is enough!
            } else {
                // Create Cape if missing
                const faces = ['top', 'left', 'front', 'right', 'back', 'bottom'];
                let capeHTML = `<div class="cape" style="background-image: url('${capeData}')">`;
                faces.forEach(face => {
                    capeHTML += `<div class="${face}"></div>`;
                });
                capeHTML += `</div>`;
                viewer.querySelector('.player').insertAdjacentHTML('beforeend', capeHTML);
            }
        } else {
            if (capeDiv) capeDiv.remove();
        }
        return;
    }

    // Fallback: Create New
    // Build 3D viewer HTML structure
    const faces = ['top', 'left', 'front', 'right', 'back', 'bottom'];
    const parts = ['head', 'body', 'left-arm', 'right-arm', 'left-leg', 'right-leg'];

    // Modal viewer always spins
    let viewerHTML = `<div class="mc-skin-viewer-11x spin ${isSlim ? 'slim' : ''} ${isLegacy ? 'legacy-cape' : ''}"><div class="player">`;

    parts.forEach(part => {
        viewerHTML += `<div class="${part}">`;
        faces.forEach(face => {
            viewerHTML += `<div class="${face}" style="background-image: url('${skinData}')"></div>`;
        });
        viewerHTML += `<div class="accessory">`;
        faces.forEach(face => {
            viewerHTML += `<div class="${face}" style="background-image: url('${skinData}')"></div>`;
        });
        viewerHTML += `</div></div>`;
    });

    // Add cape if needed
    if (capeData) {
        viewerHTML += `<div class="cape" style="background-image: url('${capeData}')">`;
        faces.forEach(face => {
            viewerHTML += `<div class="${face}"></div>`;
        });
        viewerHTML += `</div>`;
    }

    viewerHTML += `</div></div>`;
    container.innerHTML = viewerHTML;
}

function clear3DSkinPreview() {
    const container = document.getElementById('skinViewer3D');
    if (container) container.innerHTML = '';
}

// Add these to window just in case
window.update3DSkinPreview = update3DSkinPreview;
window.clear3DSkinPreview = clear3DSkinPreview;
