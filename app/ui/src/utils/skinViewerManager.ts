import { SkinViewer, IdleAnimation } from 'skinview3d';

let largeViewerInstance: SkinViewer | null = null;
let modalViewerInstance: SkinViewer | null = null;
const cardViewersMap = new Map<HTMLElement, SkinViewer>();

// State trackers for modal viewer real-time updates
let currentModalSkin: string | null = null;
let currentModalCape: string | null = null;
let currentModalModel: 'slim' | 'default' = 'default';

let largeResumeTimer: any = null;
let modalResumeTimer: any = null;

if (typeof window !== 'undefined') {
  window.addEventListener('pointerup', () => {
    if (largeViewerInstance && !largeViewerInstance.autoRotate) {
      if (largeResumeTimer) clearTimeout(largeResumeTimer);
      largeResumeTimer = setTimeout(() => {
        if (largeViewerInstance) largeViewerInstance.autoRotate = true;
      }, 900);
    }
    if (modalViewerInstance && !modalViewerInstance.autoRotate) {
      if (modalResumeTimer) clearTimeout(modalResumeTimer);
      modalResumeTimer = setTimeout(() => {
        if (modalViewerInstance) modalViewerInstance.autoRotate = true;
      }, 900);
    }
  });
}

function isHardwareAccelerationEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const hwCheckbox = document.getElementById('hwAccelCheckbox') as HTMLInputElement | null;
  if (hwCheckbox) {
    return hwCheckbox.checked;
  }
  const cachedUser = (window as any).currentUserData;
  if (cachedUser && cachedUser.hw_accel !== undefined) {
    return cachedUser.hw_accel !== false;
  }
  return true;
}

/**
 * Updates or initializes the large 3D skin viewer in the Skins & Capes section.
 */
export function updateLargeSkinPreview(pack: any) {
  const container = document.getElementById('largeSkinViewerContainer');
  if (!container || !pack || !pack.skin_preview) return;

  const skinUrl = pack.skin_preview;
  const isSlim = pack.skin_model === 'slim';
  const hasCape = pack.cape_id && pack.cape_id !== 'none';
  const capeUrl = hasCape && pack.cape_preview ? pack.cape_preview : null;
  const targetModel = isSlim ? 'slim' : 'default';

  let canvas = container.querySelector('canvas.skinview3d-canvas') as HTMLCanvasElement | null;

  if (!largeViewerInstance || !canvas) {
    container.innerHTML = '';
    canvas = document.createElement('canvas');
    canvas.className = 'skinview3d-canvas';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.cursor = 'grab';

    canvas.addEventListener('mousedown', () => {
      if (canvas) canvas.style.cursor = 'grabbing';
    });
    window.addEventListener('mouseup', () => {
      if (canvas) canvas.style.cursor = 'grab';
    });

    container.appendChild(canvas);

    const width = container.clientWidth > 0 ? container.clientWidth : 280;
    const height = container.clientHeight > 0 ? container.clientHeight : 440;

    const hwAccel = isHardwareAccelerationEnabled();

    largeViewerInstance = new SkinViewer({
      canvas,
      width,
      height,
      skin: skinUrl,
      model: targetModel,
      cape: capeUrl || undefined,
      pixelRatio: hwAccel ? (window.devicePixelRatio || 1) : 1
    });

    largeViewerInstance.controls.enableRotate = true;
    largeViewerInstance.controls.enableZoom = true;
    largeViewerInstance.controls.enablePan = false;
    largeViewerInstance.controls.enableDamping = true;
    largeViewerInstance.controls.dampingFactor = 0.06; // Smooth physical friction / deceleration
    largeViewerInstance.controls.rotateSpeed = 0.65;
    largeViewerInstance.autoRotate = true;
    largeViewerInstance.autoRotateSpeed = 0.45;
    largeViewerInstance.animation = new IdleAnimation();

    // Pause auto-rotate on interaction, and resume with smooth inertia
    largeViewerInstance.controls.addEventListener('start', () => {
      if (largeResumeTimer) clearTimeout(largeResumeTimer);
      if (largeViewerInstance) largeViewerInstance.autoRotate = false;
    });
    largeViewerInstance.controls.addEventListener('end', () => {
      if (largeResumeTimer) clearTimeout(largeResumeTimer);
      largeResumeTimer = setTimeout(() => {
        if (largeViewerInstance) largeViewerInstance.autoRotate = true;
      }, 700);
    });

    const ro = new ResizeObserver(() => {
      if (largeViewerInstance && container.clientWidth > 0 && container.clientHeight > 0) {
        largeViewerInstance.setSize(container.clientWidth, container.clientHeight);
      }
    });
    ro.observe(container);
  } else {
    largeViewerInstance.loadSkin(skinUrl, { model: targetModel });
    if (capeUrl) {
      largeViewerInstance.loadCape(capeUrl);
    } else {
      largeViewerInstance.resetCape();
    }
  }
}

/**
 * Updates or initializes the modal 3D skin viewer in the Create/Edit Skin Pack modal.
 */
export function update3DSkinPreview(
  skinDataUrl: string | null = null,
  capeDataUrl: string | null = null,
  modelType: string = 'classic'
) {
  const viewer3D = document.getElementById('skin3DViewer');
  const skinViewer = document.getElementById('skinViewer3D');
  const canvas2D = document.getElementById('skinPreviewCanvas');
  const placeholder = document.getElementById('skinUploadPlaceholder');
  const uploadContainer = document.getElementById('skinUploadContainer');

  if (placeholder) placeholder.style.display = 'none';
  if (canvas2D) canvas2D.style.display = 'none';
  if (viewer3D) viewer3D.style.display = 'flex';
  if (uploadContainer) uploadContainer.classList.add('active');

  const container = skinViewer || viewer3D;
  if (!container) return;

  if (skinDataUrl) currentModalSkin = skinDataUrl;
  currentModalCape = capeDataUrl;
  currentModalModel = modelType === 'slim' ? 'slim' : 'default';

  if (!currentModalSkin) return;

  let canvas = container.querySelector('canvas.skinview3d-modal-canvas') as HTMLCanvasElement | null;

  if (!modalViewerInstance || !canvas) {
    container.innerHTML = '';
    canvas = document.createElement('canvas');
    canvas.className = 'skinview3d-modal-canvas';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.cursor = 'grab';

    canvas.addEventListener('mousedown', () => {
      if (canvas) canvas.style.cursor = 'grabbing';
    });
    window.addEventListener('mouseup', () => {
      if (canvas) canvas.style.cursor = 'grab';
    });

    container.appendChild(canvas);

    const width = container.clientWidth > 0 ? container.clientWidth : 300;
    const height = 480;

    const hwAccel = isHardwareAccelerationEnabled();

    modalViewerInstance = new SkinViewer({
      canvas,
      width,
      height,
      skin: currentModalSkin,
      model: currentModalModel,
      cape: currentModalCape || undefined,
      pixelRatio: hwAccel ? (window.devicePixelRatio || 1) : 1
    });

    modalViewerInstance.controls.enableRotate = true;
    modalViewerInstance.controls.enableZoom = true;
    modalViewerInstance.controls.enablePan = false;
    modalViewerInstance.controls.enableDamping = true;
    modalViewerInstance.controls.dampingFactor = 0.06;
    modalViewerInstance.controls.rotateSpeed = 0.65;
    modalViewerInstance.autoRotate = true;
    modalViewerInstance.autoRotateSpeed = 0.45;
    modalViewerInstance.animation = new IdleAnimation();

    // Auto-resume rotation when mouse is released
    modalViewerInstance.controls.addEventListener('start', () => {
      if (modalResumeTimer) clearTimeout(modalResumeTimer);
      if (modalViewerInstance) modalViewerInstance.autoRotate = false;
    });
    modalViewerInstance.controls.addEventListener('end', () => {
      if (modalResumeTimer) clearTimeout(modalResumeTimer);
      modalResumeTimer = setTimeout(() => {
        if (modalViewerInstance) modalViewerInstance.autoRotate = true;
      }, 700);
    });

    const ro = new ResizeObserver(() => {
      if (modalViewerInstance && container.clientWidth > 0) {
        modalViewerInstance.setSize(container.clientWidth, 480);
      }
    });
    ro.observe(container);
  } else {
    // Real-time updates for model, texture, and cape
    modalViewerInstance.loadSkin(currentModalSkin, { model: currentModalModel });
    if (currentModalCape) {
      modalViewerInstance.loadCape(currentModalCape);
    } else {
      modalViewerInstance.resetCape();
    }
  }
}

/**
 * Clears the modal 3D skin viewer.
 */
export function clear3DSkinPreview() {
  currentModalSkin = null;
  currentModalCape = null;
  currentModalModel = 'default';
  if (modalResumeTimer) clearTimeout(modalResumeTimer);

  const viewer3D = document.getElementById('skin3DViewer');
  const placeholder = document.getElementById('skinUploadPlaceholder');
  const uploadContainer = document.getElementById('skinUploadContainer');
  if (viewer3D) viewer3D.style.display = 'none';
  if (placeholder) placeholder.style.display = 'flex';
  if (uploadContainer) uploadContainer.classList.remove('active');

  if (modalViewerInstance) {
    try {
      modalViewerInstance.dispose();
    } catch (_) {}
    modalViewerInstance = null;
  }
}

/**
 * Renders a lightweight 3D character into a card preview canvas.
 */
export function renderCardSkin(containerEl: HTMLElement, pack: any) {
  if (!containerEl || !pack || !pack.skin_preview) return;

  if (cardViewersMap.has(containerEl)) {
    try {
      cardViewersMap.get(containerEl)?.dispose();
    } catch (_) {}
    cardViewersMap.delete(containerEl);
  }

  containerEl.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.className = 'skinview3d-card-canvas';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  containerEl.appendChild(canvas);

  const isSlim = pack.skin_model === 'slim';
  const hasCape = pack.cape_id && pack.cape_id !== 'none';
  const capeUrl = hasCape && pack.cape_preview ? pack.cape_preview : null;

  const width = containerEl.clientWidth > 0 ? containerEl.clientWidth : 200;
  const height = containerEl.clientHeight > 0 ? containerEl.clientHeight : 220;

  try {
    const hwAccel = isHardwareAccelerationEnabled();

    const viewer = new SkinViewer({
      canvas,
      width,
      height,
      skin: pack.skin_preview,
      model: isSlim ? 'slim' : 'default',
      cape: capeUrl || undefined,
      pixelRatio: hwAccel ? (window.devicePixelRatio || 1) : 1
    });

    // Upright frontal camera angle with gentle 3D perspective (facing forward, not rotated sideways)
    viewer.playerWrapper.rotation.set(0, 0, 0);
    viewer.playerObject.rotation.set(0, 0, 0);
    viewer.camera.position.set(0, 0, 1);
    viewer.camera.rotation.set(0, 0, 0);
    viewer.adjustCameraDistance();

    viewer.controls.enableRotate = true;
    viewer.controls.enableZoom = false;
    viewer.controls.enablePan = false;
    viewer.controls.enableDamping = true;
    viewer.controls.dampingFactor = 0.08;
    viewer.controls.rotateSpeed = 0.6;

    let hoverResumeTimer: any = null;
    viewer.controls.addEventListener('start', () => {
      if (hoverResumeTimer) clearTimeout(hoverResumeTimer);
      viewer.autoRotate = false;
    });
    viewer.controls.addEventListener('end', () => {
      if (hoverResumeTimer) clearTimeout(hoverResumeTimer);
      hoverResumeTimer = setTimeout(() => {
        viewer.autoRotate = true;
      }, 700);
    });

    containerEl.addEventListener('mouseenter', () => {
      viewer.autoRotate = true;
      viewer.autoRotateSpeed = 0.8;
    });
    containerEl.addEventListener('mouseleave', () => {
      viewer.autoRotate = false;
      viewer.playerWrapper.rotation.y = 0;
      viewer.playerObject.rotation.y = 0;
    });

    cardViewersMap.set(containerEl, viewer);
  } catch (err) {
    console.error('[SkinViewer] Failed to render card skin:', err);
  }
}

// Global window registration
const win = window as any;
win.skinViewerManager = {
  updateLargeSkinPreview,
  update3DSkinPreview,
  clear3DSkinPreview,
  renderCardSkin
};
win.updateLargeSkinPreview = updateLargeSkinPreview;
win.update3DSkinPreview = update3DSkinPreview;
win.clear3DSkinPreview = clear3DSkinPreview;
win.renderCardSkin = renderCardSkin;
