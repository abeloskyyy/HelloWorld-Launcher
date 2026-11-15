/**
 * HelloWorld Launcher - Interactive 1:1 Image Cropper & Compressor
 * 
 * Permite recortar cualquier imagen a ratio 1:1, hacer zoom y paneo interactivo centrado,
 * redimensionar a máximo 512x512 (preservando tamaños menores <=512px como pixel art nativo),
 * y comprimir a WebP (calidad 85%) o PNG con el peso óptimo.
 */

(function () {
  let cropperModal = null;
  let cropperCanvas = null;
  let cropperCtx = null;
  let zoomSlider = null;
  let resetZoomBtn = null;
  let confirmBtn = null;
  let cancelBtn = null;
  let closeBtn = null;

  let currentImage = null;
  let currentZoom = 1.0;
  let panX = 0;
  let panY = 0;
  let isDragging = false;
  let startDragX = 0;
  let startDragY = 0;
  let baseScale = 1.0;

  let currentResolve = null;
  let currentReject = null;

  const VIEWPORT_SIZE = 340;

  function initElements() {
    cropperModal = document.getElementById('hwlImageCropperModal');
    cropperCanvas = document.getElementById('hwlCropperCanvas');
    if (cropperCanvas) {
      cropperCtx = cropperCanvas.getContext('2d');
    }
    zoomSlider = document.getElementById('hwlCropperZoomSlider');
    resetZoomBtn = document.getElementById('hwlCropperResetZoomBtn');
    confirmBtn = document.getElementById('hwlCropperConfirmBtn');
    cancelBtn = document.getElementById('hwlCropperCancelBtn');
    closeBtn = document.getElementById('hwlCropperCloseBtn');

    if (!cropperCanvas || cropperCanvas._initialized) return;
    cropperCanvas._initialized = true;

    // Mouse drag
    cropperCanvas.addEventListener('mousedown', (e) => {
      if (!currentImage) return;
      isDragging = true;
      startDragX = e.clientX - panX;
      startDragY = e.clientY - panY;
      cropperCanvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging || !currentImage) return;
      panX = e.clientX - startDragX;
      panY = e.clientY - startDragY;
      clampPan();
      renderCropper();
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        if (cropperCanvas) cropperCanvas.style.cursor = 'grab';
      }
    });

    // Mouse wheel zoom (zoom to center)
    cropperCanvas.addEventListener('wheel', (e) => {
      if (!currentImage) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(currentZoom + delta);
    }, { passive: false });

    // Slider zoom
    if (zoomSlider) {
      zoomSlider.addEventListener('input', (e) => {
        setZoom(parseFloat(e.target.value));
      });
    }

    if (resetZoomBtn) {
      resetZoomBtn.addEventListener('click', () => {
        currentZoom = 1.0;
        if (zoomSlider) zoomSlider.value = '1';
        centerImage();
      });
    }

    if (confirmBtn) {
      confirmBtn.addEventListener('click', applyCrop);
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', cancelCrop);
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', cancelCrop);
    }
  }

  function setZoom(val) {
    const oldZoom = currentZoom;
    const newZoom = Math.max(1.0, Math.min(4.0, val));
    if (oldZoom === newZoom) return;

    if (currentImage) {
      const oldEffScale = baseScale * oldZoom;
      const newEffScale = baseScale * newZoom;

      // Mantener el centro del viewport fijo en la imagen
      const viewCenterX = VIEWPORT_SIZE / 2;
      const viewCenterY = VIEWPORT_SIZE / 2;

      const imgPointX = (viewCenterX - panX) / oldEffScale;
      const imgPointY = (viewCenterY - panY) / oldEffScale;

      panX = viewCenterX - (imgPointX * newEffScale);
      panY = viewCenterY - (imgPointY * newEffScale);
    }

    currentZoom = newZoom;
    if (zoomSlider) zoomSlider.value = currentZoom;
    clampPan();
    renderCropper();
  }

  function centerImage() {
    if (!currentImage) return;
    const effScale = baseScale * currentZoom;
    const w = currentImage.width * effScale;
    const h = currentImage.height * effScale;
    panX = (VIEWPORT_SIZE - w) / 2;
    panY = (VIEWPORT_SIZE - h) / 2;
    clampPan();
    renderCropper();
  }

  function clampPan() {
    if (!currentImage) return;
    const effScale = baseScale * currentZoom;
    const w = currentImage.width * effScale;
    const h = currentImage.height * effScale;

    // No permitir huecos vacíos dentro del viewport cuadrado
    if (w >= VIEWPORT_SIZE) {
      panX = Math.min(0, Math.max(VIEWPORT_SIZE - w, panX));
    } else {
      panX = (VIEWPORT_SIZE - w) / 2;
    }

    if (h >= VIEWPORT_SIZE) {
      panY = Math.min(0, Math.max(VIEWPORT_SIZE - h, panY));
    } else {
      panY = (VIEWPORT_SIZE - h) / 2;
    }
  }

  function renderCropper() {
    if (!cropperCtx || !currentImage) return;

    cropperCtx.clearRect(0, 0, VIEWPORT_SIZE, VIEWPORT_SIZE);

    // Fondo ajedrezado sutil para transparencias
    const checkSize = 10;
    for (let y = 0; y < VIEWPORT_SIZE; y += checkSize) {
      for (let x = 0; x < VIEWPORT_SIZE; x += checkSize) {
        cropperCtx.fillStyle = ((x / checkSize + y / checkSize) % 2 === 0) ? '#181b22' : '#222734';
        cropperCtx.fillRect(x, y, checkSize, checkSize);
      }
    }

    const effScale = baseScale * currentZoom;
    const drawW = currentImage.width * effScale;
    const drawH = currentImage.height * effScale;

    // Para pixel art muy pequeño (<=64px), mantener bordes nítidos sin desenfocar
    if (currentImage.width <= 64 && currentImage.height <= 64) {
      cropperCtx.imageSmoothingEnabled = false;
    } else {
      cropperCtx.imageSmoothingEnabled = true;
      cropperCtx.imageSmoothingQuality = 'high';
    }

    cropperCtx.drawImage(currentImage, panX, panY, drawW, drawH);
  }

  function applyCrop() {
    if (!currentImage || !currentResolve) return;

    const effScale = baseScale * currentZoom;

    // Coordenadas en la imagen fuente original
    const srcX = Math.max(0, -panX / effScale);
    const srcY = Math.max(0, -panY / effScale);
    const srcSize = Math.min(
      VIEWPORT_SIZE / effScale,
      currentImage.width - srcX,
      currentImage.height - srcY
    );

    // Regla de dimensiones:
    // "si mide 32x32 se queda asi, y maximo 512x512"
    let outSize = Math.round(srcSize);
    if (outSize > 512) {
      outSize = 512;
    }

    const outCanvas = document.createElement('canvas');
    outCanvas.width = outSize;
    outCanvas.height = outSize;
    const outCtx = outCanvas.getContext('2d');

    if (outSize <= 64) {
      outCtx.imageSmoothingEnabled = false;
    } else {
      outCtx.imageSmoothingEnabled = true;
      outCtx.imageSmoothingQuality = 'high';
    }

    outCtx.drawImage(
      currentImage,
      srcX, srcY, srcSize, srcSize,
      0, 0, outSize, outSize
    );

    // Compresión ideal: WebP con calidad 0.85 (ultra ligero ~25KB), fallback a PNG
    let finalDataUrl;
    try {
      finalDataUrl = outCanvas.toDataURL('image/webp', 0.85);
      if (!finalDataUrl.startsWith('data:image/webp')) {
        finalDataUrl = outCanvas.toDataURL('image/png');
      }
    } catch (_) {
      finalDataUrl = outCanvas.toDataURL('image/png');
    }

    closeModal();
    currentResolve({
      dataUrl: finalDataUrl,
      width: outSize,
      height: outSize,
      format: finalDataUrl.startsWith('data:image/webp') ? 'webp' : 'png'
    });
    currentResolve = null;
    currentReject = null;
  }

  function cancelCrop() {
    closeModal();
    if (currentReject) {
      currentReject(new Error('cropper_cancelled'));
      currentResolve = null;
      currentReject = null;
    }
  }

  function closeModal() {
    if (cropperModal) {
      cropperModal.classList.remove('show');
    }
  }

  /**
   * Abre el modal de recorte para un File o dataURL
   */
  window.hwlOpenCropper = function (fileOrDataUrl) {
    initElements();

    // Asegurar traducciones aplicadas al modal
    if (typeof window.applyTranslations === 'function') {
      window.applyTranslations();
    }

    return new Promise((resolve, reject) => {
      currentResolve = resolve;
      currentReject = reject;

      const img = new Image();
      img.onload = function () {
        currentImage = img;
        currentZoom = 1.0;
        if (zoomSlider) zoomSlider.value = '1';

        // Escala base para que la menor dimensión llene exactamente los 340px
        baseScale = Math.max(VIEWPORT_SIZE / img.width, VIEWPORT_SIZE / img.height);
        centerImage();

        if (cropperModal) {
          cropperModal.classList.add('show');
        }
      };

      img.onerror = function () {
        reject(new Error('failed_to_load_image'));
      };

      if (typeof fileOrDataUrl === 'string') {
        img.src = fileOrDataUrl;
      } else if (fileOrDataUrl instanceof File || fileOrDataUrl instanceof Blob) {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('failed_to_read_file'));
        reader.readAsDataURL(fileOrDataUrl);
      } else {
        reject(new Error('invalid_image_source'));
      }
    });
  };

  // Inicializar listeners al cargar el DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initElements);
  } else {
    initElements();
  }
})();
