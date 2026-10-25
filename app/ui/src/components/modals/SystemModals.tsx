import React from 'react';

export const SystemModals: React.FC = () => {
  const handleCopyErrorLog = () => {
    const win = window as any;
    if (typeof win.copyErrorLog === 'function') {
      win.copyErrorLog();
    }
  };

  const handleCloseErrorModal = () => {
    const win = window as any;
    if (typeof win.closeErrorModal === 'function') {
      win.closeErrorModal();
    }
  };

  const handleClosePatchNotesModal = () => {
    const win = window as any;
    if (typeof win.closePatchNotesModal === 'function') {
      win.closePatchNotesModal();
    }
  };

  return (
    <>
      {/* Toast Notification Container */}
      <div
        id="toastContainer"
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}
      ></div>

      {/* Sync Modal */}
      <div className="modal" id="syncModal">
        <div className="modal-content sync-modal-content">
          <div className="sync-modal-header">
            <span className="sync-modal-title" data-i18n="loader.syncing">
              Synchronizing Files
            </span>
          </div>
          <p className="sync-modal-subtitle" data-i18n="loader.downloading_missing">
            Downloading missing files for this installation.
          </p>

          <div id="syncTasksList" className="sync-tasks-list">
            {/* Queue Items go here */}
          </div>

          <div className="sync-progress-section">
            <div className="sync-progress-bar-wrap">
              <div id="syncProgressBar" className="sync-progress-bar-fill" style={{ width: '0%' }}></div>
            </div>
            <div id="syncProgressText" className="sync-progress-text" data-i18n="loader.preparing">
              Preparing...
            </div>
          </div>

          <div className="modal-options sync-modal-options">
            <button id="cancelSyncBtn" className="btn-secondary" data-i18n="social.cancel_btn">
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* No Internet Modal */}
      <div className="modal" id="noInternetModal">
        <div className="modal-content no-internet-modal">
          <div className="no-internet-icon">
            <span className="no-internet-symbol">⚠</span>
          </div>
          <span className="modal-title" data-i18n="loader.no_internet">
            No Internet Connection
          </span>
          <p className="no-internet-message" data-i18n="loader.no_internet_desc">
            Could not detect an internet connection. Some features may not be available:
          </p>
          <ul className="no-internet-features">
            <li data-i18n="loader.feat_mods">Mod searching and downloading</li>
            <li data-i18n="loader.feat_updates">Automatic updates</li>
            <li data-i18n="loader.feat_versions">Downloading new Minecraft versions</li>
          </ul>

          <button className="btn-primary btn-large" id="closeAppBtn" data-i18n="global.close_app">
            ✕ Close Application
          </button>

          <button className="btn-continue-anyway" id="continueAnywayBtn" data-i18n="loader.continue_anyway">
            Continue anyway
          </button>
        </div>
      </div>

      {/* New Update Screen (Optional / Mandatory) */}
      <div id="updateModal" className="fullscreen-update" style={{ display: 'none' }}>
        <div className="fullscreen-update-card" id="updateCard">
          <div className="update-header-section">
            <span id="updateBadge" className="update-badge" data-i18n="updater.new_version_badge">
              NEW UPDATE
            </span>
            <div className="update-icon-wrap" id="updateIconWrap">
              <i className="fas fa-rocket update-icon" id="updateIcon"></i>
            </div>
            <h2 className="update-title" id="updateTitle" data-i18n="updater.new_version">
              New Version Available
            </h2>
            <div className="update-version-row">
              <span className="update-ver-tag" id="updateCurrentVer">
                v2.1.0
              </span>
              <i className="fas fa-arrow-right update-ver-arrow"></i>
              <span className="update-ver-tag highlight" id="updateLatestVer">
                v2.2.0
              </span>
            </div>
            <p className="update-subtitle" id="updateSubtitle">
              A new version of HelloWorld Launcher is available with new features and improvements.
            </p>
          </div>

          {/* Changelog Container with Custom Scrollbar */}
          <div className="update-changelog-container">
            <div className="update-changelog-header">
              <i className="fas fa-list-ul"></i>
              <span id="updateChangelogTitle" data-i18n="updater.release_notes">
                Release Notes &amp; Changelog
              </span>
            </div>
            <div className="update-changelog-body" id="updateChangelogContent">
              {/* Markdown rendered here */}
            </div>
          </div>

          {/* Download Progress Section (Shown during setup check/download) */}
          <div className="update-progress-section" id="updateProgressSection" style={{ display: 'none' }}>
            <div className="update-progress-status-row">
              <span id="updateProgressStatusText" data-i18n="updater.downloading_installer">
                Downloading installer...
              </span>
              <span id="updateProgressPercent">0%</span>
            </div>
            <div className="update-progress-bar-bg">
              <div className="update-progress-bar-fill" id="updateProgressBarFill" style={{ width: '0%' }}></div>
            </div>
            <div className="update-progress-stats">
              <span id="updateProgressSpeed">0 MB/s</span>
              <span id="updateProgressSize">0 MB / 0 MB</span>
            </div>
          </div>

          {/* Action Buttons and Checkbox */}
          <div className="update-actions-footer">
            <div className="update-footer-left">
              <label className="update-checkbox-label" id="updateDontRemindLabel">
                <input type="checkbox" id="updateDontRemindCheckbox" />
                <span data-i18n="updater.dont_remind">Don't remind me again for this version</span>
              </label>
            </div>
            <div className="update-footer-right">
              <button className="btn-secondary update-btn" id="updateLaterBtn">
                <span data-i18n="updater.later">Later</span>
              </button>
              <button className="btn-primary update-btn" id="updateNowBtn">
                <i className="fas fa-arrow-down" id="updateNowIcon"></i>
                <span id="updateNowText" data-i18n="updater.update_now">
                  Update Now
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Maintenance Screen (Full Screen Standalone) */}
      <div id="maintenanceModal" className="fullscreen-maintenance" style={{ display: 'none' }}>
        <div className="fullscreen-maintenance-card">
          <div className="maintenance-icon-wrap">
            <i className="fas fa-tools maintenance-icon"></i>
          </div>
          <h2 className="maintenance-title" id="maintenanceTitle" data-i18n="maintenance.title">
            Servidores en Mantenimiento
          </h2>
          <p className="maintenance-subtitle" id="maintenanceSubtitle" data-i18n="maintenance.subtitle">
            Estamos realizando mejoras y optimizaciones en nuestros servidores. HelloWorld Launcher volverá a estar disponible en breve.
          </p>

          {/* Dynamic Message box from Gist */}
          <div className="maintenance-notice-box" id="maintenanceNoticeBox">
            <div className="maintenance-notice-header">
              <i className="fas fa-info-circle"></i>
              <span>Notice</span>
            </div>
            <div className="maintenance-notice-body" id="maintenanceMessageText">
              We are currently upgrading our backend infrastructure and database to improve performance. The launcher will be back online shortly. Thank you for your patience!
            </div>
            <div className="maintenance-estimated-time" id="maintenanceEstimatedTime" style={{ display: 'none' }}>
              <i className="far fa-clock"></i> <span id="maintenanceEstimatedTimeText"></span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="maintenance-actions">
            <button className="btn-primary maintenance-btn" id="maintenanceCheckBtn">
              <i className="fas fa-sync-alt" id="maintenanceCheckIcon" style={{ marginRight: '8px' }}></i>
              <span id="maintenanceCheckText" data-i18n="maintenance.check_again">
                Comprobar de nuevo
              </span>
            </button>
            <a
              className="btn-secondary maintenance-btn maintenance-status-link"
              id="maintenanceStatusBtn"
              href="#"
              target="_blank"
              rel="noreferrer"
              style={{ display: 'none' }}
            >
              <i className="fab fa-discord" style={{ marginRight: '8px' }}></i>
              <span data-i18n="maintenance.status_page">Ver Estado del Servicio</span>
            </a>

            {/* Admin Bypass Button */}
            <button className="btn-admin-bypass maintenance-btn" id="maintenanceAdminBypassBtn" style={{ display: 'none' }}>
              <i className="fas fa-user-shield" style={{ marginRight: '8px' }}></i>
              <span data-i18n="maintenance.admin_bypass">Admin Bypass</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Modal */}
      <div id="errorModal" className="modal">
        <div className="modal-content" style={{ width: '600px', backgroundColor: '#2b2b2b', color: '#fff' }}>
          <h2 id="errorModalTitle" style={{ color: '#ff5555', marginBottom: '15px' }} data-i18n="error.launch_error">
            Launch Error
          </h2>
          <p id="errorModalMessage" style={{ color: '#ddd', marginBottom: '20px' }} data-i18n="error.minecraft_launch_error">
            An error occurred while starting Minecraft.
          </p>

          <div
            id="javaDownloadSection"
            style={{
              display: 'none',
              marginBottom: '20px',
              background: 'rgba(255, 170, 0, 0.1)',
              padding: '15px',
              borderRadius: '5px',
              borderLeft: '4px solid #ffaa00'
            }}
          >
            <p style={{ marginBottom: '10px', color: '#ffaa00' }} data-i18n="error.java_error">
              It seems you need a newer version of Java.
            </p>
            <a
              href="https://adoptium.net/"
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
              style={{ display: 'inline-block', textDecoration: 'none', textAlign: 'center' }}
            >
              <span data-i18n="error.download_java">Download Java (Adoptium)</span>
            </a>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#aaa' }} data-i18n="error.error_log">
              Error log:
            </label>
            <textarea
              id="errorLogContent"
              readOnly
              style={{
                width: '100%',
                height: '200px',
                background: '#1a1a1a',
                color: '#ddd',
                border: '1px solid #444',
                padding: '10px',
                fontFamily: 'monospace',
                fontSize: '12px',
                resize: 'vertical'
              }}
            ></textarea>
          </div>

          <div className="modal-options">
            <button onClick={handleCopyErrorLog} className="btn-secondary" data-i18n="error.copy_log">
              Copy Log
            </button>
            <button onClick={handleCloseErrorModal} className="btn-secondary" data-i18n="global.close">
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Minecraft Patch Notes Modal */}
      <div
        id="patchNotesModal"
        className="patch-notes-modal-overlay"
        style={{ display: 'none' }}
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClosePatchNotesModal();
        }}
      >
        <div className="patch-notes-modal-content">
          <div className="patch-notes-modal-header">
            <div className="patch-notes-modal-title-area">
              <span id="patchNotesModalBadge" className="patch-note-badge release">
                Release
              </span>
              <h2 id="patchNotesModalTitle">Minecraft Java Edition</h2>
              <span id="patchNotesModalDate" className="patch-notes-modal-date">
                <i className="far fa-calendar-alt"></i> 15 Sep 2026
              </span>
            </div>
            <button
              className="patch-notes-modal-close"
              onClick={handleClosePatchNotesModal}
              title="Cerrar"
              data-i18n-title="play.close_modal"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div id="patchNotesModalBody" className="patch-notes-modal-body">
            {/* HTML content from Mojang will be rendered here */}
          </div>
        </div>
      </div>
    </>
  );
};

export default SystemModals;
