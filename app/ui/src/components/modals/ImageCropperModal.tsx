import React from 'react';

export const ImageCropperModal: React.FC = () => {
  return (
    <div className="modal" id="hwlImageCropperModal" style={{ zIndex: 999999 }}>
      <div className="modal-content cropper-modal-card">
        <div className="cropper-header">
          <span className="cropper-title" data-i18n="cropper.title">
            <i className="fas fa-crop-alt"></i> Recortar Imagen
          </span>
          <button type="button" className="modal-close-btn" id="hwlCropperCloseBtn" title="Close">
            &times;
          </button>
        </div>

        <div className="cropper-body">
          <div className="cropper-canvas-container" id="hwlCropperContainer">
            <canvas id="hwlCropperCanvas" width="340" height="340"></canvas>
            <div className="cropper-grid-overlay"></div>
          </div>

          <div className="cropper-controls-wrapper">
            <div className="cropper-zoom-bar">
              <i className="fas fa-search-minus cropper-icon"></i>
              <input
                type="range"
                id="hwlCropperZoomSlider"
                min="1"
                max="4"
                step="0.05"
                defaultValue="1"
                className="cropper-slider"
              />
              <i className="fas fa-search-plus cropper-icon"></i>
              <button type="button" id="hwlCropperResetZoomBtn" className="cropper-icon-btn" title="Reset Zoom">
                <i className="fas fa-rotate-left"></i>
              </button>
            </div>

            <div className="cropper-metadata-row" style={{ justifyContent: 'center' }}>
              <span className="cropper-hint" data-i18n="cropper.hint">
                <i className="fas fa-arrows-up-down-left-right"></i> Arrastra para encuadrar • Rueda del ratón para zoom
              </span>
            </div>
          </div>
        </div>

        <div className="modal-options">
          <button type="button" id="hwlCropperCancelBtn" className="btn-secondary" data-i18n="cropper.cancel_btn">
            Cancelar
          </button>
          <button type="button" id="hwlCropperConfirmBtn" className="btn-primary" data-i18n="cropper.apply_btn">
            <i className="fas fa-check"></i> Aplicar y Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropperModal;
