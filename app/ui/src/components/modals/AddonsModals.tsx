import React from 'react';

export const AddonsModals: React.FC = () => {
  const handleCloseModDetails = () => {
    const win = window as any;
    if (typeof win.closeModDetails === 'function') {
      win.closeModDetails();
    }
  };

  return (
    <>
      {/* Mod Details Modal */}
      <div id="modDetailsModal" className="modal">
        <div className="modal-content mod-details-modal">
          <button className="modal-close-btn" onClick={handleCloseModDetails} style={{ zIndex: 10 }}>
            <i className="fas fa-times"></i>
          </button>

          <div className="mod-details-header">
            <img src="" alt="" className="mod-details-icon" id="modDetailIcon" />
            <div className="mod-details-title-section">
              <div className="mod-details-title" id="modDetailTitle">
                Mod Title
              </div>
              <div className="mod-details-author" id="modDetailAuthor">
                by Author
              </div>
              <div className="mod-card-categories" id="modDetailCategories"></div>
            </div>
            <div
              style={{
                minWidth: '160px',
                width: 'auto',
                marginRight: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end'
              }}
            >
              <button id="modDetailInstallBtn" className="btn-primary">
                <i className="fas fa-download"></i> <span data-i18n="social.install">Install</span>
              </button>
            </div>
          </div>

          <div className="mod-details-content">
            <div className="mod-details-main">
              <div id="modDetailDescription" className="markdown-body">
                <div style={{ textAlign: 'center', padding: '50px' }}>
                  <span className="spinner"></span>
                </div>
              </div>
            </div>

            <div className="mod-details-sidebar">
              <div className="sidebar-section">
                <div className="sidebar-title" data-i18n="workshop.modal.sidebar_info">
                  Information
                </div>
                <div className="info-row">
                  <span className="info-label" data-i18n="workshop.modal.downloads">
                    Downloads
                  </span>
                  <span className="info-value" id="modDetailDownloads" data-i18n="global.loading">
                    Loading...
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label" data-i18n="workshop.modal.updated">
                    Updated
                  </span>
                  <span className="info-value" id="modDetailUpdated" data-i18n="global.loading">
                    Loading...
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label" data-i18n="workshop.modal.license">
                    License
                  </span>
                  <span className="info-value" id="modDetailLicense" data-i18n="global.loading">
                    Loading...
                  </span>
                </div>
              </div>

              <div className="sidebar-section">
                <div className="sidebar-title" data-i18n="workshop.modal.sidebar_gallery">
                  Gallery
                </div>
                <div className="mod-gallery" id="modDetailGallery"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mod Dependencies Modal */}
      <div id="modDepsModal" className="modal">
        <div className="modal-content mod-deps-modal-content">
          {/* Header */}
          <div className="mod-deps-header">
            <div className="mod-deps-header-icon">
              <i className="fas fa-puzzle-piece"></i>
            </div>
            <div className="mod-deps-header-text">
              <h2 className="mod-deps-title" data-i18n="workshop.deps.title">
                Mod Dependencies
              </h2>
              <p className="mod-deps-subtitle" data-i18n="workshop.deps.subtitle">
                The following dependencies were found for this mod.
              </p>
            </div>
            <button
              id="modDepsCloseBtn"
              className="modal-close-btn"
              onClick={() => {
                const win = window as any;
                if (typeof win.closeModDepsModal === 'function') win.closeModDepsModal();
              }}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          {/* Loading State */}
          <div id="modDepsLoading" className="mod-deps-loading">
            <div className="mod-deps-spinner"></div>
            <span data-i18n="workshop.deps.resolving">Resolving dependencies...</span>
          </div>

          {/* Content */}
          <div id="modDepsContent" style={{ display: 'none' }}>
            {/* Required Section */}
            <div id="modDepsRequiredSection" className="mod-deps-section" style={{ display: 'none' }}>
              <div className="mod-deps-separator mod-deps-separator-required">
                <i className="fas fa-exclamation-circle"></i>
                <span data-i18n="workshop.deps.required_section">Required Dependencies</span>
                <span id="modDepsRequiredCount" className="mod-deps-count"></span>
              </div>
              <div id="modDepsRequiredList" className="mod-deps-list"></div>
            </div>

            {/* Optional Section */}
            <div id="modDepsOptionalSection" className="mod-deps-section" style={{ display: 'none' }}>
              <div className="mod-deps-separator mod-deps-separator-optional">
                <i className="fas fa-plus-circle"></i>
                <span data-i18n="workshop.deps.optional_section">Optional Dependencies</span>
                <span id="modDepsOptionalCount" className="mod-deps-count"></span>
              </div>
              <div id="modDepsOptionalList" className="mod-deps-list"></div>
            </div>

            {/* Already Installed Section */}
            <div id="modDepsInstalledSection" className="mod-deps-section" style={{ display: 'none' }}>
              <div className="mod-deps-separator mod-deps-separator-installed">
                <i className="fas fa-check-circle"></i>
                <span data-i18n="workshop.deps.installed_section">Already Installed</span>
                <span id="modDepsInstalledCount" className="mod-deps-count"></span>
              </div>
              <div id="modDepsInstalledList" className="mod-deps-list"></div>
            </div>

            {/* No deps state */}
            <div id="modDepsEmpty" className="mod-deps-empty" style={{ display: 'none' }}>
              <i className="fas fa-check-circle"></i>
              <span data-i18n="workshop.deps.no_deps">No dependencies found.</span>
            </div>
          </div>

          {/* Footer Buttons */}
          <div id="modDepsFooter" className="mod-deps-footer" style={{ display: 'none' }}>
            <button
              id="modDepsCancelBtn"
              className="btn btn-secondary mod-deps-btn"
              onClick={() => {
                const win = window as any;
                if (typeof win.closeModDepsModal === 'function') win.closeModDepsModal(true);
              }}
            >
              <i className="fas fa-times"></i>
              <span data-i18n="workshop.deps.btn_cancel">Skip</span>
            </button>
            <button
              id="modDepsRequiredBtn"
              className="btn btn-secondary mod-deps-btn mod-deps-btn-req"
              onClick={() => {
                const win = window as any;
                if (typeof win.installModDeps === 'function') win.installModDeps('required');
              }}
            >
              <i className="fas fa-exclamation-circle"></i>
              <span data-i18n="workshop.deps.btn_required">Required Only</span>
            </button>
            <button
              id="modDepsAllBtn"
              className="btn btn-primary mod-deps-btn mod-deps-btn-all"
              onClick={() => {
                const win = window as any;
                if (typeof win.installModDeps === 'function') win.installModDeps('all');
              }}
            >
              <i className="fas fa-download"></i>
              <span data-i18n="workshop.deps.btn_all">Download All</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddonsModals;
