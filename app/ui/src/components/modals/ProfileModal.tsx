import React from 'react';

export const ProfileModal: React.FC = () => {
  return (
    <>
      {/* Create Profile Modal */}
      <div className="modal" id="modal">
        <div className="modal-content">
          <span id="modalTitleText" data-i18n="installations.create_title">
            Create New Installation
          </span>
          <div className="profile-icon-display" id="iconDisplay">
            <img src="" alt="Installation Icon" className="profile-icon-img" id="iconPreview" style={{ display: 'none' }} />
            <span className="placeholder-icon-small" id="placeholderIcon">
              <i className="fas fa-user"></i>
            </span>
          </div>
          <button
            type="button"
            className="btn-add-icon"
            id="iconButton"
            data-tooltip="Select a custom icon to visually identify this installation"
            data-i18n="installations.add_icon"
            data-i18n-tooltip="installations.add_icon_tooltip"
          >
            Add Icon
          </button>
          <div className="modal-input-group">
            <label>
              <span data-i18n="installations.name">Installation Name</span>
              <i
                className="fa-regular fa-question-circle help-icon"
                data-tooltip="Name to identify this installation. Example: 'Survival 1.20', 'SkyFactory Modpack'"
                data-i18n-tooltip="installations.name_tooltip"
              ></i>
            </label>
            <input id="profileName" type="text" />
          </div>
          <div className="version-selects-row">
            <div className="modal-input-group">
              <label>
                <span data-i18n="installations.software">Software</span>
                <i
                  className="fa-regular fa-question-circle help-icon"
                  data-tooltip="Choose the software type: Vanilla for the original game, Forge or Fabric to use mods."
                  data-i18n-tooltip="installations.software_tooltip"
                ></i>
              </label>
              <select id="profileSoftwareSelect">
                <option value="vanilla">Vanilla</option>
                <option value="forge">Forge</option>
                <option value="fabric">Fabric</option>
                <option value="neoforge">NeoForge</option>
              </select>
            </div>
            <div className="modal-input-group">
              <label>
                <span data-i18n="installations.mc_version">Minecraft Version</span>
                <i
                  className="fa-regular fa-question-circle help-icon"
                  data-tooltip="The Minecraft version this installation will use."
                  data-i18n-tooltip="installations.mc_version_tooltip"
                ></i>
              </label>
              <select id="profileMcVersionSelect">
                <option value="" data-i18n="installations.loading">
                  Loading...
                </option>
              </select>
            </div>
            <div className="modal-input-group" id="profileLoaderVersionGroup">
              <label id="profileLoaderVersionLabel">
                <span data-i18n="installations.software_version">Software Version</span>
                <i
                  className="fa-regular fa-question-circle help-icon"
                  data-tooltip="Version of the mod loader (Forge or Fabric). Only active when not Vanilla."
                  data-i18n-tooltip="installations.software_version_tooltip"
                ></i>
              </label>
              <select id="profileLoaderVersionSelect" disabled>
                <option value="" data-i18n="social.select_loader">
                  Select a loader...
                </option>
              </select>
            </div>
          </div>
          <div className="modal-input-group">
            <label>
              <span data-i18n="installations.directory">Directory</span>
              <i
                className="fa-regular fa-question-circle help-icon"
                data-tooltip="Folder where this installation's data will be saved (worlds, mods, settings). Each installation can have its own folder."
                data-i18n-tooltip="installations.directory_tooltip"
              ></i>
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input id="profileDir" type="text" style={{ flex: 1 }} />
              <button type="button" id="selectFolderBtn" className="btn-square">
                <i className="fas fa-folder-open"></i>
              </button>
            </div>
          </div>
          {/* Maximum RAM Allocation (-Xmx) Slider */}
          <div className="modal-input-group ram-allocation-group">
            <div className="ram-header-row">
              <label htmlFor="profileRamSlider" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                <span data-i18n="installations.ram_allocation">RAM Allocation (-Xmx)</span>
                <i
                  className="fa-regular fa-question-circle help-icon"
                  data-tooltip="Configure the maximum memory Minecraft can use (-Xmx). Adjusts automatically to your PC's RAM."
                  data-i18n-tooltip="installations.ram_allocation_tooltip"
                ></i>
              </label>
              <div className="ram-badge-container">
                <span id="profileRamValue" className="ram-value-badge">4.0 GB</span>
              </div>
            </div>

            <div className="ram-slider-wrapper">
              <div className="ram-slider-container">
                <div className="ram-slider-track-wrap">
                  <input
                    id="profileRamSlider"
                    type="range"
                    min="512"
                    max="12288"
                    step="512"
                    defaultValue="4096"
                    className="ram-range-slider"
                  />
                  {/* Ticks Labels */}
                  <div className="ram-scale-ticks" id="ramScaleTicks">
                    <span className="ram-scale-tick" style={{ left: 0 }}>512 MB</span>
                    <span className="ram-scale-tick" style={{ left: 'calc(11px + (100% - 22px) * 0.1304)', transform: 'translateX(-50%)' }}>2 GB</span>
                    <span className="ram-scale-tick" style={{ left: 'calc(11px + (100% - 22px) * 0.3043)', transform: 'translateX(-50%)' }}>4 GB</span>
                    <span className="ram-scale-tick" style={{ left: 'calc(11px + (100% - 22px) * 0.4783)', transform: 'translateX(-50%)' }}>6 GB</span>
                    <span className="ram-scale-tick" style={{ left: 'calc(11px + (100% - 22px) * 0.6522)', transform: 'translateX(-50%)' }}>8 GB</span>
                    <span className="ram-scale-tick" style={{ left: 'calc(11px + (100% - 22px) * 0.8261)', transform: 'translateX(-50%)' }}>10 GB</span>
                    <span className="ram-scale-tick" id="profileRamMaxTick" style={{ right: 0, left: 'auto' }}>12 GB</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-scale-reset"
                  id="profileRamResetBtn"
                  title="Reset to recommended RAM"
                  data-i18n-title="installations.ram_reset"
                >
                  <i className="fas fa-magic"></i>
                </button>
              </div>

              {/* Dynamic Contextual Tip / Warning */}
              <div id="profileRamTip" className="ram-tip-box tip-optimal">
                <i id="profileRamTipIcon" className="fas fa-check-circle"></i>
                <span id="profileRamTipText" data-i18n="installations.ram_tip_optimal">
                  Ideal balance: smooth gameplay without Java Garbage Collection (GC) latency spikes.
                </span>
              </div>
            </div>
          </div>

          <div className="modal-input-group">
            <label>
              <span data-i18n="installations.jvm_args">JVM Arguments</span>
              <i
                className="fa-regular fa-question-circle help-icon"
                data-tooltip="Advanced JVM parameters. Automatically synchronized with the RAM slider."
                data-i18n-tooltip="installations.jvm_args_tooltip"
              ></i>
            </label>
            <input id="profileJVMArgs" type="text" />
          </div>
          <div className="modal-input-group">
            <label>
              <span data-i18n="installations.java_path">Java Executable Path</span>
              <i
                className="fa-regular fa-question-circle help-icon"
                data-tooltip="Custom Java version (javaw.exe). Leave empty to use default."
                data-i18n-tooltip="installations.java_path_tooltip"
              ></i>
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                id="profileJavaPath"
                type="text"
                style={{ flex: 1 }}
                placeholder="Default (Auto-detected)"
                data-i18n-placeholder="installations.default_java"
              />
              <button type="button" id="selectJavaBtn" className="btn-square">
                <i className="fas fa-folder-open"></i>
              </button>
            </div>
          </div>

          <div className="modal-options">
            <button id="acceptProfileBtn" className="btn-primary" data-i18n="installations.create_btn">
              Create
            </button>
            <button id="cancelModalBtn" className="btn-secondary" data-i18n="social.cancel_btn">
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Image Selection Modal */}
      <div className="modal" id="imageModal">
        <div className="modal-content image-selector-modal">
          <span data-i18n="installations.select_image">Select Installation Image</span>
          <div className="image-grid" id="imageGrid">
            {/* Images will be loaded dynamically here */}
            {/* Custom upload button at the end of the grid */}
            <label htmlFor="customImageInput" className="image-grid-item upload-item">
              <span className="upload-plus">
                <i className="fas fa-plus"></i>
              </span>
            </label>
            <input type="file" id="customImageInput" className="icon-input" accept="image/png,image/jpeg,image/jpg,image/gif" />
          </div>
          <div className="modal-options">
            <button id="cancelImageModalBtn" className="btn-secondary" data-i18n="social.cancel_btn">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfileModal;
