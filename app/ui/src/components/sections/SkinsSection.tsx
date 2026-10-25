import React from 'react';

export const SkinsSection: React.FC = () => {
  return (
    <div id="skins" className="section">
      <h1 data-i18n="sidebar.skins">Skin Packs</h1>

      <div className="skins-section">
        {/* Packs Grid & Preview Container */}
        <div className="skin-packs-container">
          {/* Left Column (Button + Grid) */}
          <div className="skin-packs-left-col">
            {/* Create Pack Button */}
            <button id="createSkinPackBtn" className="create-profile-btn">
              <i className="fas fa-plus"></i> <span data-i18n="installations.create_new">Crear</span>
            </button>

            {/* Packs Grid */}
            <div id="skinPacksGrid" className="skin-packs-grid">
              {/* Packs will be loaded dynamically here */}
              <div className="no-packs-message">
                <i className="fas fa-tshirt"></i>
                <p data-i18n="skins.no_packs">No skin packs yet</p>
                <p style={{ fontSize: '14px', color: '#666' }} data-i18n="skins.no_packs_desc">
                  Create your first pack to get started
                </p>
              </div>
            </div>
          </div>

          {/* Large Preview (Right) */}
          <div className="skin-packs-preview">
            <div className="large-skin-preview-sticky">
              <div id="largeSkinViewerContainer" className="large-skin-viewer">
                {/* 3D Viewer will be injected here */}
                <div className="placeholder-preview">
                  <i className="fas fa-user-circle"></i>
                  <p data-i18n="skins.no_active">No active skin</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkinsSection;
