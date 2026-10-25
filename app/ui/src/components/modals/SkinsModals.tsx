import React from 'react';

export const SkinsModals: React.FC = () => {
  return (
    <div id="skinPackModal" className="modal">
      <div className="modal-content skin-pack-modal-content">
        <button className="modal-close-btn" id="closeSkinPackModal">
          <i className="fas fa-times"></i>
        </button>

        <h2 data-i18n="skins.create_modal_title">Create Skin Pack</h2>

        <div style={{ display: 'flex', gap: '30px', marginTop: '20px' }}>
          {/* Left Side: Inputs */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {/* Pack Name */}
            <div className="modal-input-group" style={{ margin: 0 }}>
              <label>
                <span data-i18n="skins.pack_name">Pack Name</span>
                <i
                  className="fa-regular fa-question-circle help-icon"
                  data-tooltip="Give your skin pack a memorable name"
                  data-i18n-tooltip="skins.pack_name_tooltip"
                ></i>
              </label>
              <input
                id="packName"
                type="text"
                placeholder="e.g., My Cool Look"
                data-i18n-placeholder="skins.pack_name_placeholder"
                style={{ position: 'relative', zIndex: 10 }}
              />
            </div>

            {/* Skin Model */}
            <div className="modal-input-group" style={{ margin: 0 }}>
              <label>
                <span data-i18n="skins.model">Skin Model</span>
                <i
                  className="fa-regular fa-question-circle help-icon"
                  data-tooltip="Classic (Steve) has normal arms, Slim (Alex) has thinner arms"
                  data-i18n-tooltip="skins.model_tooltip"
                ></i>
              </label>
              <select id="skinModelSelect">
                <option value="classic" data-i18n="skins.model_classic">
                  Classic (Steve)
                </option>
                <option value="slim" data-i18n="skins.model_slim">
                  Slim (Alex)
                </option>
              </select>
            </div>

            {/* Cape Selection */}
            <div className="modal-input-group" style={{ margin: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <label>
                <span data-i18n="skins.cape_label">Cape</span>
                <i
                  className="fa-regular fa-question-circle help-icon"
                  data-tooltip="Select a cape from your available capes"
                  data-i18n-tooltip="skins.cape_tooltip"
                ></i>
              </label>
              <div
                id="capeSelectionGrid"
                className="cape-selection-grid"
                style={{ overflowY: 'auto', maxHeight: '450px', paddingRight: '5px' }}
              >
                <div className="cape-option" data-cape-id="none">
                  <div className="cape-preview-box no-cape">
                    <i className="fas fa-ban"></i>
                  </div>
                  <span data-i18n="skins.no_cape">No Cape</span>
                </div>
                {/* Capes will be loaded dynamically */}
              </div>
            </div>
          </div>

          {/* Right Side: Upload & Preview */}
          <div style={{ flex: 1 }}>
            <label style={{ color: '#aaa', fontWeight: 500, fontSize: '14px', marginBottom: '8px', display: 'block' }}>
              <span data-i18n="skins.file">Skin File</span>
              <i
                className="fa-regular fa-question-circle help-icon"
                data-tooltip="Click to upload a Minecraft skin PNG file (64x64 or 64x32)"
                data-i18n-tooltip="skins.file_tooltip"
              ></i>
            </label>

            <div id="skinUploadContainer" className="skin-upload-area">
              <input type="file" id="skinFileInput" accept=".png" style={{ display: 'none' }} />

              {/* Placeholder State */}
              <div id="skinUploadPlaceholder" className="skin-upload-placeholder">
                <div className="upload-icon-circle">
                  <i className="fas fa-cloud-upload-alt"></i>
                </div>
                <h3 data-i18n="skins.click_upload">Click to Upload Skin</h3>
                <p data-i18n="skins.supports_png">Supports 64x64 and 64x32 .png files</p>
              </div>

              {/* Viewer State */}
              <div id="skin3DViewer" className="skin-3d-viewer-container" style={{ display: 'none', position: 'relative', width: '100%', height: '100%', minHeight: '480px' }}>
                <div id="skinViewer3D" style={{ width: '100%', height: '100%' }}></div>

                <button id="changeSkinBtn" className="change-skin-btn" type="button">
                  <i className="fas fa-pencil-alt"></i>
                </button>
              </div>
            </div>

            <span id="skinFileName" style={{ display: 'none' }} data-i18n="skins.no_file">
              No file selected
            </span>
            <canvas id="skinPreviewCanvas" width="128" height="128" style={{ display: 'none' }}></canvas>
          </div>
        </div>

        <div className="modal-options" style={{ marginTop: '30px' }}>
          <button id="createPackBtn" className="btn-primary">
            <i className="fas fa-plus"></i> <span data-i18n="skins.create_pack_short">Create Pack</span>
          </button>
          <button id="cancelSkinPackBtn" className="btn-secondary" data-i18n="social.cancel_btn">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default SkinsModals;
