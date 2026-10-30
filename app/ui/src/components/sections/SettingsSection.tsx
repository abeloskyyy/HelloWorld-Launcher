import React from 'react';

export const SettingsSection: React.FC = () => {
  const [isDevMode, setIsDevMode] = React.useState(false);

  React.useEffect(() => {
    const checkDevMode = () => {
      const win = window as any;
      const cb = document.getElementById('devModeCheckbox') as HTMLInputElement | null;
      setIsDevMode(Boolean(cb?.checked || win.isDevMode));
    };

    checkDevMode();
    const interval = setInterval(checkDevMode, 1000);
    const cb = document.getElementById('devModeCheckbox');
    if (cb) cb.addEventListener('change', checkDevMode);

    return () => {
      clearInterval(interval);
      if (cb) cb.removeEventListener('change', checkDevMode);
    };
  }, []);

  const handleTestUpdate = () => {
    const win = window as any;
    if (typeof win.triggerTestUpdateFlow === 'function') {
      win.triggerTestUpdateFlow();
    }
  };

  const handleSelectLanguage = (lang: string) => {
    const win = window as any;
    if (typeof win.selectLanguage === 'function') {
      win.selectLanguage(lang);
    }
  };

  const handleSaveSettings = () => {
    const win = window as any;
    if (typeof win.saveSettings === 'function') {
      win.saveSettings();
    }
  };

  return (
    <div id="settings" className="section">
      <h1 data-i18n="sidebar.settings">Settings</h1>
      <div className="play-section">
        <div className="input-group" style={{ marginBottom: '25px' }}>
          <label data-i18n="settings.language">Language / Idioma</label>
          <div className="lang-dropdown-container" id="langDropdownContainer">
            <button type="button" className="lang-dropdown-btn" id="langDropdownBtn">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img
                  id="currentLangIcon"
                  src=""
                  alt="flag"
                  style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                />
                <span id="currentLangText" style={{ fontWeight: 500 }}></span>
              </div>
              <i className="fas fa-chevron-down" style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.5)' }}></i>
            </button>
            <div className="lang-dropdown-menu" id="langDropdownMenu">
              <div className="lang-dropdown-item" onClick={() => handleSelectLanguage('en')}>
                <img
                  src="https://purecatamphetamine.github.io/country-flag-icons/3x2/GB.svg"
                  alt="UK Flag"
                  style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                />
                <span style={{ fontWeight: 500 }}>English</span>
              </div>
              <div className="lang-dropdown-item" onClick={() => handleSelectLanguage('es')}>
                <img
                  src="https://purecatamphetamine.github.io/country-flag-icons/3x2/ES.svg"
                  alt="Spain Flag"
                  style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                />
                <span style={{ fontWeight: 500 }}>Español</span>
              </div>
              <div className="lang-dropdown-item" onClick={() => handleSelectLanguage('ca')}>
                <img
                  src="https://purecatamphetamine.github.io/country-flag-icons/3x2/ES-CT.svg"
                  alt="Catalonia Flag"
                  style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                />
                <span style={{ fontWeight: 500 }}>Català</span>
              </div>
              <div className="lang-dropdown-item" onClick={() => handleSelectLanguage('ja')}>
                <img
                  src="https://purecatamphetamine.github.io/country-flag-icons/3x2/JP.svg"
                  alt="Japan Flag"
                  style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                />
                <span style={{ fontWeight: 500 }}>日本語</span>
              </div>
              <div className="lang-dropdown-item" onClick={() => handleSelectLanguage('fr')}>
                <img
                  src="https://purecatamphetamine.github.io/country-flag-icons/3x2/FR.svg"
                  alt="France Flag"
                  style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                />
                <span style={{ fontWeight: 500 }}>Français</span>
              </div>
              <div className="lang-dropdown-item" onClick={() => handleSelectLanguage('de')}>
                <img
                  src="https://purecatamphetamine.github.io/country-flag-icons/3x2/DE.svg"
                  alt="Germany Flag"
                  style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                />
                <span style={{ fontWeight: 500 }}>Deutsch</span>
              </div>
              <div className="lang-dropdown-item" onClick={() => handleSelectLanguage('pt')}>
                <img
                  src="https://purecatamphetamine.github.io/country-flag-icons/3x2/PT.svg"
                  alt="Portugal Flag"
                  style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                />
                <span style={{ fontWeight: 500 }}>Português</span>
              </div>
              <div className="lang-dropdown-item" onClick={() => handleSelectLanguage('it')}>
                <img
                  src="https://purecatamphetamine.github.io/country-flag-icons/3x2/IT.svg"
                  alt="Italy Flag"
                  style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                />
                <span style={{ fontWeight: 500 }}>Italiano</span>
              </div>
              <div className="lang-dropdown-item" onClick={() => handleSelectLanguage('ru')}>
                <img
                  src="https://purecatamphetamine.github.io/country-flag-icons/3x2/RU.svg"
                  alt="Russia Flag"
                  style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                />
                <span style={{ fontWeight: 500 }}>Русский</span>
              </div>
              <div className="lang-dropdown-item" onClick={() => handleSelectLanguage('zh')}>
                <img
                  src="https://purecatamphetamine.github.io/country-flag-icons/3x2/CN.svg"
                  alt="China Flag"
                  style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                />
                <span style={{ fontWeight: 500 }}>中文</span>
              </div>
              <div className="lang-dropdown-item" onClick={() => handleSelectLanguage('ko')}>
                <img
                  src="https://purecatamphetamine.github.io/country-flag-icons/3x2/KR.svg"
                  alt="Korea Flag"
                  style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                />
                <span style={{ fontWeight: 500 }}>한국어</span>
              </div>
              <div className="lang-dropdown-item" onClick={() => handleSelectLanguage('ar')}>
                <img
                  src="https://purecatamphetamine.github.io/country-flag-icons/3x2/SA.svg"
                  alt="Saudi Arabia Flag"
                  style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                />
                <span style={{ fontWeight: 500 }}>العربية</span>
              </div>
              <div className="lang-dropdown-item" onClick={() => handleSelectLanguage('pl')}>
                <img
                  src="https://purecatamphetamine.github.io/country-flag-icons/3x2/PL.svg"
                  alt="Poland Flag"
                  style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                />
                <span style={{ fontWeight: 500 }}>Polski</span>
              </div>
              <div className="lang-dropdown-item" onClick={() => handleSelectLanguage('nl')}>
                <img
                  src="https://purecatamphetamine.github.io/country-flag-icons/3x2/NL.svg"
                  alt="Netherlands Flag"
                  style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                />
                <span style={{ fontWeight: 500 }}>Nederlands</span>
              </div>
              <div className="lang-dropdown-item" onClick={() => handleSelectLanguage('sv')}>
                <img
                  src="https://purecatamphetamine.github.io/country-flag-icons/3x2/SE.svg"
                  alt="Sweden Flag"
                  style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                />
                <span style={{ fontWeight: 500 }}>Svenska</span>
              </div>
              <div className="lang-dropdown-item" onClick={() => handleSelectLanguage('tr')}>
                <img
                  src="https://purecatamphetamine.github.io/country-flag-icons/3x2/TR.svg"
                  alt="Turkey Flag"
                  style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                />
                <span style={{ fontWeight: 500 }}>Türkçe</span>
              </div>
              <div className="lang-dropdown-item" onClick={() => handleSelectLanguage('hi')}>
                <img
                  src="https://purecatamphetamine.github.io/country-flag-icons/3x2/IN.svg"
                  alt="India Flag"
                  style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                />
                <span style={{ fontWeight: 500 }}>हिन्दी</span>
              </div>
              <div className="lang-dropdown-item" onClick={() => handleSelectLanguage('th')}>
                <img
                  src="https://purecatamphetamine.github.io/country-flag-icons/3x2/TH.svg"
                  alt="Thailand Flag"
                  style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                />
                <span style={{ fontWeight: 500 }}>ไทย</span>
              </div>
              <div className="lang-dropdown-item" onClick={() => handleSelectLanguage('el')}>
                <img
                  src="https://purecatamphetamine.github.io/country-flag-icons/3x2/GR.svg"
                  alt="Greece Flag"
                  style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                />
                <span style={{ fontWeight: 500 }}>Ελληνικά</span>
              </div>
              <div className="lang-dropdown-item" onClick={() => handleSelectLanguage('cs')}>
                <img
                  src="https://purecatamphetamine.github.io/country-flag-icons/3x2/CZ.svg"
                  alt="Czechia Flag"
                  style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                />
                <span style={{ fontWeight: 500 }}>Čeština</span>
              </div>
              <div className="lang-dropdown-item" onClick={() => handleSelectLanguage('da')}>
                <img
                  src="https://purecatamphetamine.github.io/country-flag-icons/3x2/DK.svg"
                  alt="Denmark Flag"
                  style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                />
                <span style={{ fontWeight: 500 }}>Dansk</span>
              </div>
              <div className="lang-dropdown-item" onClick={() => handleSelectLanguage('eu')}>
                <img
                  src="img/es-pv.svg"
                  alt="Basque Flag"
                  style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                />
                <span style={{ fontWeight: 500 }}>Euskara</span>
              </div>
              <div className="lang-dropdown-item" onClick={() => handleSelectLanguage('gl')}>
                <img
                  src="img/es-ga.svg"
                  alt="Galician Flag"
                  style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                />
                <span style={{ fontWeight: 500 }}>Galego</span>
              </div>
            </div>
          </div>
        </div>

        <div className="input-group">
          <label>
            <span data-i18n="settings.mc_dir">.minecraft Directory</span>
            <i
              className="fa-regular fa-question-circle help-icon"
              style={{ color: '#fff' }}
              data-tooltip="Folder where game versions will be detected (independent of mods, worlds, which are detected in each installation's directory)."
              data-i18n-tooltip="settings.mc_dir_tooltip"
            ></i>
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input id="mcdir" type="text" style={{ flex: 1 }} />
            <button type="button" id="selectMcdirBtn" className="btn-square">
              <i className="fas fa-folder-open"></i>
            </button>
          </div>
        </div>

        <div className="input-group" style={{ marginTop: '15px' }}>
          <label>
            <span data-i18n="settings.addons_page">Addons per Page</span>
            <i
              className="fa-regular fa-question-circle help-icon"
              style={{ color: '#fff' }}
              data-tooltip="Number of addons to load per page in the search results (Modrinth)"
              data-i18n-tooltip="settings.addons_page_tooltip"
            ></i>
          </label>
          <input
            id="addonsPerPage"
            type="number"
            min="5"
            max="100"
            defaultValue="20"
            style={{
              width: '100px',
              padding: '10px',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '2px solid rgba(79, 172, 254, 0.3)',
              borderRadius: '5px',
              color: '#fff',
              fontSize: '15px'
            }}
          />
        </div>

        {/* UI Scale Control */}
        <div
          className="input-group"
          style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}
        >
          <label
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}
          >
            <span>
              <span data-i18n="settings.ui_scale">UI Scale</span>
              <i
                className="fa-regular fa-question-circle help-icon"
                style={{ color: '#fff' }}
                data-tooltip="Adjust the overall scale and zoom level of the launcher interface (50% - 150%)."
                data-i18n-tooltip="settings.ui_scale_tooltip"
              ></i>
            </span>
            <span id="uiScaleValueBadge" className="scale-value-badge">
              100%
            </span>
          </label>
          <div className="scale-slider-container">
            <button type="button" className="btn-scale-step" id="scaleDecreaseBtn" title="Decrease Scale (-5%)">
              <i className="fas fa-minus"></i>
            </button>
            <input
              id="uiScaleSlider"
              type="range"
              min="50"
              max="150"
              step="5"
              defaultValue="100"
              className="scale-range-slider"
            />
            <button type="button" className="btn-scale-step" id="scaleIncreaseBtn" title="Increase Scale (+5%)">
              <i className="fas fa-plus"></i>
            </button>
            <button type="button" className="btn-scale-reset" id="scaleResetBtn" title="Reset to 100%">
              <i className="fas fa-undo"></i>
            </button>
          </div>
        </div>

        <div className="input-group">
          <div className="toggle-container">
            <label className="toggle-switch">
              <input type="checkbox" id="devModeCheckbox" />
              <span className="toggle-slider"></span>
            </label>
            <span className="toggle-label">
              <span data-i18n="settings.dev_mode">Developer Mode</span>
              <i
                className="fa-regular fa-question-circle help-icon"
                style={{ color: '#fff' }}
                data-tooltip="Enables development tools: F5 to reload, Minecraft console visible, and browser DevTools. Requires launcher restart."
                data-i18n-tooltip="settings.dev_mode_tooltip"
              ></i>
            </span>
          </div>
        </div>

        {/* Developer Mode Testing Tools */}
        {isDevMode && (
          <div
            id="devUpdateTestContainer"
            className="dev-mode-test-container"
            style={{
              marginTop: '10px',
              marginBottom: '15px',
              padding: '14px 18px',
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px dashed rgba(59, 130, 246, 0.4)',
              borderRadius: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#93c5fd', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fas fa-flask"></i>
                  <span data-i18n="settings.test_update_title">Test Background Update</span>
                </div>
                <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '3px' }} data-i18n="settings.test_update_desc">
                  Simulate background update detection, download progress badge, and setup relay.
                </div>
              </div>
              <button
                type="button"
                id="testUpdateFlowBtn"
                className="btn-secondary"
                onClick={handleTestUpdate}
                style={{
                  background: 'rgba(59, 130, 246, 0.2)',
                  borderColor: 'rgba(59, 130, 246, 0.4)',
                  color: '#60a5fa',
                  padding: '7px 15px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <i className="fas fa-play"></i>
                <span data-i18n="settings.test_update_btn">Test Update Flow</span>
              </button>
            </div>
          </div>
        )}

        <div
          className="input-group"
          style={{ paddingTop: '15px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', marginTop: '15px' }}
        >
          <div className="toggle-container">
            <label className="toggle-switch">
              <input type="checkbox" id="enableTransitionsCheckbox" defaultChecked />
              <span className="toggle-slider"></span>
            </label>
            <span className="toggle-label">
              <span data-i18n="settings.transitions">Enable Transitions & Animations</span>
              <i
                className="fa-regular fa-question-circle help-icon"
                style={{ color: '#fff' }}
                data-tooltip="Controls UI animations, starfield background, and smooth transitions. Disabling this resolves latency on slower systems."
                data-i18n-tooltip="settings.transitions_tooltip"
              ></i>
            </span>
          </div>
        </div>

        <div className="input-group">
          <div className="toggle-container">
            <label className="toggle-switch">
              <input type="checkbox" id="hwAccelCheckbox" defaultChecked />
              <span className="toggle-slider"></span>
            </label>
            <span className="toggle-label">
              <span data-i18n="settings.hw_accel">Hardware Acceleration (High-Performance GPU)</span>
              <i
                className="fa-regular fa-question-circle help-icon"
                style={{ color: '#fff' }}
                data-tooltip="Forces the dedicated GPU with maximum VRAM (NVIDIA/AMD) for both the Launcher and Minecraft. Disabling forces integrated GPU or CPU. Requires launcher restart."
                data-i18n-tooltip="settings.hw_accel_tooltip"
              ></i>
            </span>
          </div>
        </div>

        <div
          className="input-group"
          style={{ paddingTop: '15px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', marginTop: '15px' }}
        >
          <div className="toggle-container">
            <label className="toggle-switch">
              <input type="checkbox" id="showSnapshotsCheckbox" />
              <span className="toggle-slider"></span>
            </label>
            <span className="toggle-label">
              <span data-i18n="settings.show_snapshots">Show Snapshots</span>
              <i
                className="fa-regular fa-question-circle help-icon"
                style={{ color: '#fff' }}
                data-tooltip="Shows development versions (snapshots) in the version selector."
                data-i18n-tooltip="settings.show_snapshots_tooltip"
              ></i>
            </span>
          </div>
        </div>

        <div className="input-group">
          <div className="toggle-container">
            <label className="toggle-switch">
              <input type="checkbox" id="showOldVersionsCheckbox" />
              <span className="toggle-slider"></span>
            </label>
            <span className="toggle-label">
              <span data-i18n="settings.show_old">Show Old Versions</span>
              <i
                className="fa-regular fa-question-circle help-icon"
                style={{ color: '#fff' }}
                data-tooltip="Shows old Alpha and Beta versions in the version selector."
                data-i18n-tooltip="settings.show_old_tooltip"
              ></i>
            </span>
          </div>
        </div>

        <div
          className="input-group"
          style={{ paddingTop: '15px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', marginTop: '15px' }}
        >
          <div className="toggle-container">
            <label className="toggle-switch">
              <input type="checkbox" id="privacyModeCheckbox" />
              <span className="toggle-slider"></span>
            </label>
            <span className="toggle-label">
              <span data-i18n="settings.privacy">Privacy Mode</span>
              <i
                className="fa-regular fa-question-circle help-icon"
                style={{ color: '#fff' }}
                data-tooltip="Hides your server IP address from friends in Rich Presence. Your status will still show you're playing on a server, but the IP will be hidden."
                data-i18n-tooltip="settings.privacy_tooltip"
              ></i>
            </span>
          </div>
        </div>

        <div
          className="input-group"
          style={{ paddingTop: '15px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', marginTop: '15px' }}
        >
          <div className="toggle-container">
            <label className="toggle-switch">
              <input type="checkbox" id="reopenOnGameCloseCheckbox" defaultChecked />
              <span className="toggle-slider"></span>
            </label>
            <span className="toggle-label">
              <span data-i18n="settings.reopen_on_game_close">Reopen Launcher on Game Close</span>
              <i
                className="fa-regular fa-question-circle help-icon"
                style={{ color: '#fff' }}
                data-tooltip="Automatically restores, maximizes, and focuses the launcher when Minecraft closes."
                data-i18n-tooltip="settings.reopen_on_game_close_tooltip"
              ></i>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '25px 0 10px 0' }}>
          <button id="saveSettingsBtn" className="btn-primary" onClick={handleSaveSettings} data-i18n="settings.save_btn">
            Save Settings
          </button>
        </div>

        {/* Launcher Version */}
        <div
          style={{
            marginTop: '30px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            textAlign: 'center',
            marginBottom: '30px'
          }}
        >
          <p style={{ color: '#aaa', fontSize: '13px' }}>
            <span data-i18n="settings.launcher_version">Launcher Version:</span>{' '}
            <span id="launcherVersion" style={{ color: '#5cb85c', fontWeight: 600 }}>
              Loading...
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsSection;
