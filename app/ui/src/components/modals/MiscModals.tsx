import React from 'react';

export const MiscModals: React.FC = () => {
  const handleSelectWizLanguage = (code: string, name: string, flag: string) => {
    const win = window as any;
    if (typeof win.selectWizLanguage === 'function') {
      win.selectWizLanguage(code, name, flag);
    }
  };

  return (
    <>
      {/* Replay Onboarding FAB */}
      <button id="replayTutorialBtn" className="settings-action-btn" title="Replay Tutorial" data-i18n-title="settings.replay_tutorial">
        <i className="fas fa-graduation-cap"></i>
      </button>

      {/* Review Floating Button */}
      <button id="reviewFloatingBtn" className="review-fab" title="Leave a Review" data-i18n-title="global.leave_review">
        <i className="fas fa-star"></i>
      </button>

      {/* Donation Floating Button */}
      <button id="donationFloatingBtn" className="donation-fab" title="Support on Ko-fi" data-i18n-title="global.support_kofi">
        <i className="fas fa-heart"></i>
      </button>

      {/* Review Reminder Modal (Full Screen Overlay) */}
      <div id="reviewReminderModal" className="full-screen-overlay">
        <div className="review-overlay-content">
          <div className="heart-icon-container">
            <i className="fas fa-heart"></i>
          </div>
          <h1 className="overlay-title" data-i18n="review.title">
            Enjoying HelloWorld Launcher?
          </h1>
          <p className="overlay-subtitle">
            <span data-i18n="review.subtitle">Your feedback helps us improve. Please confirm if you'd like to leave a review!</span>
          </p>

          <div className="overlay-actions">
            <button id="doReviewBtn" className="btn-primary btn-overlay-action">
              <i className="fas fa-star"></i> <span data-i18n="review.leave_review">Leave a Review</span>
            </button>
            <button id="remindLaterBtn" className="btn-secondary btn-overlay-action">
              <span data-i18n="review.remind_later">Not now, maybe later</span>
            </button>
          </div>

          <div className="overlay-footer">
            <label className="checkbox-container">
              <input type="checkbox" id="neverShowAgainCheckbox" />
              <span className="checkmark"></span>
              <span className="checkbox-label" data-i18n="global.dont_show_again">
                Don't show this again
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Onboarding Wizard Modal */}
      <div id="onboardingOverlay" className="onboarding-overlay">
        <div className="onboarding-modal">
          <div className="onboarding-header">
            <div className="onboarding-progress">
              <div className="progress-dot active" data-step="1"></div>
              <div className="progress-dot" data-step="2"></div>
              <div className="progress-dot" data-step="3"></div>
              <div className="progress-dot" data-step="4"></div>
              <div className="progress-dot" data-step="5"></div>
              <div className="progress-dot" data-step="6"></div>
            </div>
          </div>

          <div className="onboarding-body">
            {/* Step 1: Config */}
            <div className="onboarding-step active" id="step1">
              <h2 className="onboarding-title" data-i18n="tutorial.step1_title">
                Welcome to HelloWorld Launcher
              </h2>
              <p className="onboarding-description" data-i18n="tutorial.step1_desc">
                Let's set up the basics to get you started correctly.
              </p>

              <div className="config-grid">
                {/* Minecraft Directory */}
                <div className="config-item">
                  <div className="config-label-row">
                    <span className="config-label">
                      <i className="fas fa-folder"></i> <span data-i18n="tutorial.mc_folder">Minecraft Folder</span>
                    </span>
                  </div>
                  <div className="config-info">
                    <span data-i18n="tutorial.mc_folder_desc">
                      The location where all your game files, worlds, and screenshots will be stored. We've detected a default for you. Versions will install here, but you can change the directory for each installation.
                    </span>
                  </div>
                  <div className="folder-input-group">
                    <input type="text" className="folder-input" id="wizMcDir" readOnly />
                    <button className="btn-folder" id="wizBtnSelectFolder">
                      <i className="fas fa-folder-open"></i>
                    </button>
                  </div>
                </div>

                {/* Developer Mode */}
                <div className="config-item">
                  <div className="config-label-row">
                    <span className="config-label">
                      <i className="fas fa-code"></i> <span data-i18n="tutorial.dev_mode">Developer Mode</span>
                    </span>
                    <label className="toggle-switch-large">
                      <input type="checkbox" id="wizDevMode" />
                      <span className="toggle-slider-large"></span>
                    </label>
                  </div>
                  <div className="config-info">
                    <span data-i18n="tutorial.dev_mode_desc">
                      Enables advanced debugging tools and allows you to load local development configurations. Useful for creators.
                    </span>
                  </div>
                </div>

                {/* Show Snapshots */}
                <div className="config-item">
                  <div className="config-label-row">
                    <span className="config-label">
                      <i className="fas fa-flask"></i> <span data-i18n="tutorial.show_snapshots">Show Snapshots</span>
                    </span>
                    <label className="toggle-switch-large">
                      <input type="checkbox" id="wizShowSnapshots" />
                      <span className="toggle-slider-large"></span>
                    </label>
                  </div>
                  <div className="config-info">
                    <span data-i18n="tutorial.show_snapshots_desc">
                      Access experimental versions of Minecraft that are still in development. Expect bugs and instability.
                    </span>
                  </div>
                </div>

                {/* Show Old */}
                <div className="config-item">
                  <div className="config-label-row">
                    <span className="config-label">
                      <i className="fas fa-history"></i> <span data-i18n="tutorial.show_old">Show Old Versions</span>
                    </span>
                    <label className="toggle-switch-large">
                      <input type="checkbox" id="wizShowOld" />
                      <span className="toggle-slider-large"></span>
                    </label>
                  </div>
                  <div className="config-info">
                    <span data-i18n="tutorial.desc1_config">
                      Enable to see Beta and Alpha versions of the game in the version installer.
                    </span>
                  </div>
                </div>

                {/* Language Option */}
                <div className="config-item">
                  <div className="config-label-row">
                    <span className="config-label">
                      <i className="fas fa-language"></i> <span data-i18n="tutorial.language">Language</span>
                    </span>
                    <input type="hidden" id="wizLanguageSelect" defaultValue="en" />
                    <div className="lang-dropdown-container" id="wizLangDropdownContainer">
                      <button
                        type="button"
                        className="lang-dropdown-btn"
                        id="wizLangDropdownBtn"
                        style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', width: '160px' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img
                            id="wizCurrentLangIcon"
                            src="https://purecatamphetamine.github.io/country-flag-icons/3x2/GB.svg"
                            alt="flag"
                            style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                          />
                          <span id="wizCurrentLangText" style={{ fontWeight: 500 }}>
                            English
                          </span>
                        </div>
                        <i className="fas fa-chevron-down" style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.5)' }}></i>
                      </button>
                      <div
                        className="lang-dropdown-menu"
                        id="wizLangDropdownMenu"
                        style={{ width: '160px', bottom: '100%', top: 'auto', marginBottom: '8px' }}
                      >
                        <div className="lang-dropdown-item" onClick={() => handleSelectWizLanguage('en', 'English', 'GB')}>
                          <img
                            src="https://purecatamphetamine.github.io/country-flag-icons/3x2/GB.svg"
                            alt="UK Flag"
                            style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                          />
                          <span style={{ fontWeight: 500 }}>English</span>
                        </div>
                        <div className="lang-dropdown-item" onClick={() => handleSelectWizLanguage('es', 'Español', 'ES')}>
                          <img
                            src="https://purecatamphetamine.github.io/country-flag-icons/3x2/ES.svg"
                            alt="Spain Flag"
                            style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                          />
                          <span style={{ fontWeight: 500 }}>Español</span>
                        </div>
                        <div className="lang-dropdown-item" onClick={() => handleSelectWizLanguage('ca', 'Català', 'ES-CT')}>
                          <img
                            src="https://purecatamphetamine.github.io/country-flag-icons/3x2/ES-CT.svg"
                            alt="Catalonia Flag"
                            style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                          />
                          <span style={{ fontWeight: 500 }}>Català</span>
                        </div>
                        <div className="lang-dropdown-item" onClick={() => handleSelectWizLanguage('ja', '日本語', 'JP')}>
                          <img
                            src="https://purecatamphetamine.github.io/country-flag-icons/3x2/JP.svg"
                            alt="Japan Flag"
                            style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                          />
                          <span style={{ fontWeight: 500 }}>日本語</span>
                        </div>
                        <div className="lang-dropdown-item" onClick={() => handleSelectWizLanguage('fr', 'Français', 'FR')}>
                          <img
                            src="https://purecatamphetamine.github.io/country-flag-icons/3x2/FR.svg"
                            alt="France Flag"
                            style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                          />
                          <span style={{ fontWeight: 500 }}>Français</span>
                        </div>
                        <div className="lang-dropdown-item" onClick={() => handleSelectWizLanguage('de', 'Deutsch', 'DE')}>
                          <img
                            src="https://purecatamphetamine.github.io/country-flag-icons/3x2/DE.svg"
                            alt="Germany Flag"
                            style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                          />
                          <span style={{ fontWeight: 500 }}>Deutsch</span>
                        </div>
                        <div className="lang-dropdown-item" onClick={() => handleSelectWizLanguage('pt', 'Português', 'PT')}>
                          <img
                            src="https://purecatamphetamine.github.io/country-flag-icons/3x2/PT.svg"
                            alt="Portugal Flag"
                            style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                          />
                          <span style={{ fontWeight: 500 }}>Português</span>
                        </div>
                        <div className="lang-dropdown-item" onClick={() => handleSelectWizLanguage('it', 'Italiano', 'IT')}>
                          <img
                            src="https://purecatamphetamine.github.io/country-flag-icons/3x2/IT.svg"
                            alt="Italy Flag"
                            style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                          />
                          <span style={{ fontWeight: 500 }}>Italiano</span>
                        </div>
                        <div className="lang-dropdown-item" onClick={() => handleSelectWizLanguage('ru', 'Русский', 'RU')}>
                          <img
                            src="https://purecatamphetamine.github.io/country-flag-icons/3x2/RU.svg"
                            alt="Russia Flag"
                            style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                          />
                          <span style={{ fontWeight: 500 }}>Русский</span>
                        </div>
                        <div className="lang-dropdown-item" onClick={() => handleSelectWizLanguage('zh', '中文', 'CN')}>
                          <img
                            src="https://purecatamphetamine.github.io/country-flag-icons/3x2/CN.svg"
                            alt="China Flag"
                            style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                          />
                          <span style={{ fontWeight: 500 }}>中文</span>
                        </div>
                        <div className="lang-dropdown-item" onClick={() => handleSelectWizLanguage('ko', '한국어', 'KR')}>
                          <img
                            src="https://purecatamphetamine.github.io/country-flag-icons/3x2/KR.svg"
                            alt="Korea Flag"
                            style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                          />
                          <span style={{ fontWeight: 500 }}>한국어</span>
                        </div>
                        <div className="lang-dropdown-item" onClick={() => handleSelectWizLanguage('ar', 'العربية', 'SA')}>
                          <img
                            src="https://purecatamphetamine.github.io/country-flag-icons/3x2/SA.svg"
                            alt="Saudi Arabia Flag"
                            style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                          />
                          <span style={{ fontWeight: 500 }}>العربية</span>
                        </div>
                        <div className="lang-dropdown-item" onClick={() => handleSelectWizLanguage('pl', 'Polski', 'PL')}>
                          <img
                            src="https://purecatamphetamine.github.io/country-flag-icons/3x2/PL.svg"
                            alt="Poland Flag"
                            style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                          />
                          <span style={{ fontWeight: 500 }}>Polski</span>
                        </div>
                        <div className="lang-dropdown-item" onClick={() => handleSelectWizLanguage('nl', 'Nederlands', 'NL')}>
                          <img
                            src="https://purecatamphetamine.github.io/country-flag-icons/3x2/NL.svg"
                            alt="Netherlands Flag"
                            style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                          />
                          <span style={{ fontWeight: 500 }}>Nederlands</span>
                        </div>
                        <div className="lang-dropdown-item" onClick={() => handleSelectWizLanguage('sv', 'Svenska', 'SE')}>
                          <img
                            src="https://purecatamphetamine.github.io/country-flag-icons/3x2/SE.svg"
                            alt="Sweden Flag"
                            style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                          />
                          <span style={{ fontWeight: 500 }}>Svenska</span>
                        </div>
                        <div className="lang-dropdown-item" onClick={() => handleSelectWizLanguage('tr', 'Türkçe', 'TR')}>
                          <img
                            src="https://purecatamphetamine.github.io/country-flag-icons/3x2/TR.svg"
                            alt="Turkey Flag"
                            style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                          />
                          <span style={{ fontWeight: 500 }}>Türkçe</span>
                        </div>
                        <div className="lang-dropdown-item" onClick={() => handleSelectWizLanguage('hi', 'हिन्दी', 'IN')}>
                          <img
                            src="https://purecatamphetamine.github.io/country-flag-icons/3x2/IN.svg"
                            alt="India Flag"
                            style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                          />
                          <span style={{ fontWeight: 500 }}>हिन्दी</span>
                        </div>
                        <div className="lang-dropdown-item" onClick={() => handleSelectWizLanguage('th', 'ไทย', 'TH')}>
                          <img
                            src="https://purecatamphetamine.github.io/country-flag-icons/3x2/TH.svg"
                            alt="Thailand Flag"
                            style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                          />
                          <span style={{ fontWeight: 500 }}>ไทย</span>
                        </div>
                        <div className="lang-dropdown-item" onClick={() => handleSelectWizLanguage('el', 'Ελληνικά', 'GR')}>
                          <img
                            src="https://purecatamphetamine.github.io/country-flag-icons/3x2/GR.svg"
                            alt="Greece Flag"
                            style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                          />
                          <span style={{ fontWeight: 500 }}>Ελληνικά</span>
                        </div>
                        <div className="lang-dropdown-item" onClick={() => handleSelectWizLanguage('cs', 'Čeština', 'CZ')}>
                          <img
                            src="https://purecatamphetamine.github.io/country-flag-icons/3x2/CZ.svg"
                            alt="Czechia Flag"
                            style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                          />
                          <span style={{ fontWeight: 500 }}>Čeština</span>
                        </div>
                        <div className="lang-dropdown-item" onClick={() => handleSelectWizLanguage('da', 'Dansk', 'DK')}>
                          <img
                            src="https://purecatamphetamine.github.io/country-flag-icons/3x2/DK.svg"
                            alt="Denmark Flag"
                            style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                          />
                          <span style={{ fontWeight: 500 }}>Dansk</span>
                        </div>
                        <div className="lang-dropdown-item" onClick={() => handleSelectWizLanguage('eu', 'Euskara', 'ES-PV')}>
                          <img
                            src="img/es-pv.svg"
                            alt="Basque Flag"
                            style={{ width: '22px', borderRadius: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                          />
                          <span style={{ fontWeight: 500 }}>Euskara</span>
                        </div>
                        <div className="lang-dropdown-item" onClick={() => handleSelectWizLanguage('gl', 'Galego', 'ES-GA')}>
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
                  <div className="config-info">
                    <span data-i18n="tutorial.language_desc">Select your preferred language.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Tutorial Intro */}
            <div className="onboarding-step" id="step2">
              <h2 className="onboarding-title" data-i18n="tutorial.title2_alt">
                Interactive Tutorial
              </h2>
              <p className="onboarding-description">
                <span data-i18n="tutorial.desc2_intro">
                  We will now guide you through the process of creating your first installation.
                </span>{' '}
                <span data-i18n="tutorial.desc2">
                  This interactive tour will show you exactly where to click and what each option does.
                </span>
              </p>
              <div className="tutorial-actions" style={{ marginTop: '40px', display: 'flex', gap: '20px', justifyContent: 'center' }}>
                <button
                  id="startTutorialBtn"
                  className="btn-blue"
                  style={{
                    padding: '15px 30px',
                    fontSize: '16px',
                    minWidth: '150px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <i className="fas fa-play"></i> <span data-i18n="tutorial.start">Start</span>
                </button>
                <button
                  id="skipTutorialBtn"
                  className="btn-secondary"
                  style={{
                    padding: '15px 30px',
                    fontSize: '16px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: 'white',
                    minWidth: '150px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span data-i18n="tutorial.skip">Skip</span>
                </button>
              </div>
            </div>

            {/* Step 3: Tutorial Completed */}
            <div className="onboarding-step" id="step3">
              <h2 className="onboarding-title" data-i18n="tutorial.title3">
                Tutorial Completed!
              </h2>
              <p className="onboarding-description">
                <span data-i18n="tutorial.desc3">
                  Great job! You have successfully learned how to manage versions and installations. You can always replay this tutorial later from the settings.
                </span>
              </p>
              <div className="tutorial-actions" style={{ marginTop: '40px', display: 'flex', gap: '20px', justifyContent: 'center' }}>
                <button
                  id="repeatTutorialBtn"
                  className="btn-secondary"
                  style={{
                    padding: '15px 30px',
                    fontSize: '16px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: 'white',
                    minWidth: '150px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <i className="fas fa-redo"></i> <span data-i18n="tutorial.repeat">Repeat</span>
                </button>
                <button
                  id="nextStepBtn"
                  className="btn-blue"
                  style={{
                    padding: '15px 30px',
                    fontSize: '16px',
                    minWidth: '150px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span data-i18n="tutorial.next_step">Next Step</span> <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            </div>

            {/* Step 4: Accounts (Interactive) */}
            <div className="onboarding-step" id="step4">
              <h2 className="onboarding-title" data-i18n="tutorial.title4">
                Identity &amp; Access
              </h2>
              <p className="onboarding-description">
                <span data-i18n="tutorial.desc4">
                  Log in easily. <strong>Note:</strong> Custom Skins and Capes features are exclusively available for Microsoft Accounts.
                </span>
              </p>
              <div className="tutorial-actions" style={{ marginTop: '40px', display: 'flex', gap: '20px', justifyContent: 'center' }}>
                <button
                  id="startTutorialStep2Btn"
                  className="btn-blue"
                  style={{
                    padding: '15px 30px',
                    fontSize: '16px',
                    minWidth: '150px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <i className="fas fa-play"></i> <span data-i18n="tutorial.start">Start</span>
                </button>
                <button
                  id="skipTutorialStep2Btn"
                  className="btn-secondary"
                  style={{
                    padding: '15px 30px',
                    fontSize: '16px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: 'white',
                    minWidth: '150px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span data-i18n="tutorial.skip">Skip</span>
                </button>
              </div>
            </div>

            {/* Step 5: Addons (Interactive) */}
            <div className="onboarding-step" id="step5">
              <h2 className="onboarding-title" data-i18n="tutorial.title5">
                Powerful Add-ons
              </h2>
              <p className="onboarding-description">
                <span data-i18n="tutorial.desc5">
                  Install Mods, Resource Packs, Data Packs, and Shaders directly from the launcher with one click.
                </span>
              </p>
              <div className="tutorial-actions" style={{ marginTop: '40px', display: 'flex', gap: '20px', justifyContent: 'center' }}>
                <button
                  id="startTutorialStep3Btn"
                  className="btn-blue"
                  style={{
                    padding: '15px 30px',
                    fontSize: '16px',
                    minWidth: '150px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <i className="fas fa-play"></i> <span data-i18n="tutorial.start">Start</span>
                </button>
                <button
                  id="skipTutorialStep3Btn"
                  className="btn-secondary"
                  style={{
                    padding: '15px 30px',
                    fontSize: '16px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: 'white',
                    minWidth: '150px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span data-i18n="tutorial.skip">Skip</span>
                </button>
              </div>
            </div>

            {/* Step 6: Finish */}
            <div className="onboarding-step" id="step6">
              <h2 className="onboarding-title" data-i18n="tutorial.title6">
                You're Ready!
              </h2>
              <p className="onboarding-description">
                <span data-i18n="tutorial.desc6">Jump in and start your adventure. You can replay this tutorial from the button</span>{' '}
                <span className="inline-replay-badge" title="Replay Tutorial" data-i18n-title="settings.replay_tutorial">
                  <i className="fas fa-graduation-cap"></i>
                </span>
                .
              </p>
              <div className="video-frame" id="tutorialVideoFrame">
                <video id="tutorialFinalVideo" src="videos/tutorial-final.mp4" loop muted playsInline autoPlay preload="auto"></video>
                <iframe
                  id="tutorialYoutubeIframe"
                  style={{ display: 'none', width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }}
                  allow="autoplay; encrypted-media"
                  title="Tutorial Video"
                ></iframe>
                <div id="tutorialVideoPlaceholder" className="video-placeholder" style={{ display: 'none' }}>
                  <div className="placeholder-glow"></div>
                  <div className="placeholder-icon-wrap">
                    <img
                      src="img/icon.png"
                      alt="HelloWorld"
                      className="placeholder-logo"
                      onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
                    />
                  </div>
                  <h3 className="placeholder-title">HelloWorld Launcher</h3>
                  <p className="placeholder-subtitle" data-i18n="tutorial.placeholder_subtitle">
                    Tu Minecraft, sin límites y optimizado al máximo
                  </p>
                  <div className="placeholder-features">
                    <span className="placeholder-chip">
                      <i className="fas fa-bolt"></i> <span data-i18n="tutorial.chip_perf">Alto Rendimiento</span>
                    </span>
                    <span className="placeholder-chip">
                      <i className="fas fa-shield-alt"></i> <span data-i18n="tutorial.chip_safe">100% Seguro</span>
                    </span>
                    <span className="placeholder-chip">
                      <i className="fas fa-cubes"></i> <span data-i18n="tutorial.chip_mods">Mods &amp; Datapacks</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="onboarding-footer">
            <button className="btn-back" id="wizBackBtn" style={{ minWidth: '130px', justifyContent: 'center' }}>
              <i className="fas fa-arrow-left"></i> <span data-i18n="tutorial.back">Back</span>
            </button>
            <button className="btn-next" id="wizNextBtn" style={{ minWidth: '130px', justifyContent: 'center' }}>
              <span data-i18n="tutorial.next">Next</span> <i className="fas fa-arrow-right"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Global Download Tracker Popup */}
      <div id="globalDownloadPopup" className="global-download-popup">
        <div className="gdp-header">
          <i className="fas fa-cloud-download-alt"></i>{' '}
          <span id="gdpTitle" data-i18n="tutorial_spotlight.step3.downloading_title">
            Downloading...
          </span>
        </div>
        <div className="gdp-progress-container">
          <div id="gdpProgressBar" className="gdp-progress-bar"></div>
        </div>
        <div className="gdp-footer">
          <span id="gdpTask" data-i18n="loader.preparing">
            Preparing...
          </span>
          <span id="gdpPercent">0%</span>
        </div>
      </div>

      {/* Stats Modal */}
      <div id="statsModal" className="modal">
        <div
          className="modal-content profile-viewer-modal"
          style={{
            maxWidth: '520px',
            padding: '24px',
            borderRadius: '16px',
            background: 'rgba(20,20,28,0.98)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              paddingBottom: '12px',
              borderBottom: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(79, 172, 254, 0.15)',
                  color: '#4facfe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px'
                }}
              >
                <i className="fas fa-chart-line"></i>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#fff' }} data-i18n="stats.title">
                  Player Statistics
                </h3>
                <div id="statsUsername" style={{ fontSize: '0.85rem', color: '#8b9cc0', marginTop: '2px' }}>
                  Username
                </div>
              </div>
            </div>
            <button
              id="closeStatsModalBtn"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          {/* Statistics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', textAlign: 'left' }}>
            <div
              style={{
                background: 'rgba(255,255,255,0.04)',
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(255, 170, 0, 0.15)',
                  color: '#ffaa00',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  marginRight: '14px',
                  flexShrink: 0
                }}
              >
                <i className="fas fa-fire"></i>
              </div>
              <div>
                <div
                  style={{
                    color: '#8b9cc0',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    letterSpacing: '0.5px'
                  }}
                  data-i18n="stats.streak"
                >
                  Streak
                </div>
                <div
                  id="statsModalStreak"
                  style={{
                    color: '#fff',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '4px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  0 <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#888' }} data-i18n="stats.days_unit">days</span>
                </div>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(255,255,255,0.04)',
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(255, 0, 127, 0.15)',
                  color: '#ff007f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  marginRight: '14px',
                  flexShrink: 0
                }}
              >
                <i className="fas fa-trophy"></i>
              </div>
              <div>
                <div
                  style={{
                    color: '#8b9cc0',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    letterSpacing: '0.5px'
                  }}
                  data-i18n="stats.longest_streak"
                >
                  Longest Streak
                </div>
                <div
                  id="statsModalMaxStreak"
                  style={{
                    color: '#fff',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '4px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  0 <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#888' }} data-i18n="stats.days_unit">days</span>
                </div>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(255,255,255,0.04)',
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(79, 172, 254, 0.15)',
                  color: '#4facfe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  marginRight: '14px',
                  flexShrink: 0
                }}
              >
                <i className="fas fa-clock"></i>
              </div>
              <div>
                <div
                  style={{
                    color: '#8b9cc0',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    letterSpacing: '0.5px'
                  }}
                  data-i18n="stats.total_hours"
                >
                  Total Hours
                </div>
                <div
                  id="statsModalHours"
                  style={{
                    color: '#fff',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '4px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  0.0 <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#888' }} data-i18n="stats.hours_unit">h</span>
                </div>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(255,255,255,0.04)',
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(0, 242, 254, 0.15)',
                  color: '#00f2fe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  marginRight: '14px',
                  flexShrink: 0
                }}
              >
                <i className="fas fa-calendar-check"></i>
              </div>
              <div>
                <div
                  style={{
                    color: '#8b9cc0',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    letterSpacing: '0.5px'
                  }}
                  data-i18n="stats.days_played"
                >
                  Days Played
                </div>
                <div
                  id="statsModalDays"
                  style={{
                    color: '#fff',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '4px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  0 <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#888' }} data-i18n="stats.days_unit">days</span>
                </div>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(255,255,255,0.04)',
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                gridColumn: 'span 2'
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(167, 112, 239, 0.15)',
                  color: '#a770ef',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  marginRight: '14px',
                  flexShrink: 0
                }}
              >
                <i className="fas fa-gamepad"></i>
              </div>
              <div>
                <div
                  style={{
                    color: '#8b9cc0',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    letterSpacing: '0.5px'
                  }}
                  data-i18n="stats.sessions"
                >
                  Sessions
                </div>
                <div id="statsModalSessions" style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'baseline', gap: '4px', whiteSpace: 'nowrap' }}>
                  0
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Donation / Ko-fi Modal */}
      <div id="donationModal" className="modal">
        <div
          className="modal-content donation-modal-content"
          style={{
            maxWidth: '520px',
            textAlign: 'center',
            background: 'linear-gradient(145deg, rgba(26, 26, 46, 0.95), rgba(22, 33, 62, 0.95))',
            border: '1px solid rgba(255, 117, 140, 0.4)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.7), 0 0 30px rgba(255, 117, 140, 0.2)',
            borderRadius: '20px',
            padding: '35px 30px'
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(255, 117, 140, 0.15)',
              border: '2px solid #ff758c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              animation: 'heartbeat 2s infinite'
            }}
          >
            <i className="fas fa-heart" style={{ fontSize: '38px', color: '#ff758c' }}></i>
          </div>
          <h2 style={{ fontSize: '26px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>
            <span data-i18n="donations.title">Support HelloWorld Launcher!</span>
          </h2>
          <p style={{ color: '#ccc', fontSize: '15px', lineHeight: 1.6, marginBottom: '25px', padding: '0 10px' }}>
            <span data-i18n="donations.desc">
              Creating and maintaining HelloWorld Launcher takes hundreds of hours of coding, server costs, and dedication. If you enjoy using the launcher and want to help keep it alive and growing, consider supporting me on Ko-fi! Every coffee makes a huge difference.
            </span>
          </p>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '15px 20px',
              marginBottom: '25px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              textAlign: 'left',
              fontSize: '14px',
              color: '#ddd'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <i className="fas fa-check-circle" style={{ color: '#5cb85c', fontSize: '16px' }}></i>{' '}
              <span data-i18n="donations.benefit1">Help cover server &amp; download bandwidth costs</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <i className="fas fa-check-circle" style={{ color: '#5cb85c', fontSize: '16px' }}></i>{' '}
              <span data-i18n="donations.benefit2">Support ongoing development &amp; new features</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <i className="fas fa-check-circle" style={{ color: '#5cb85c', fontSize: '16px' }}></i>{' '}
              <span data-i18n="donations.benefit3">Show appreciation for the hard work!</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <button
              id="closeDonationModalBtn"
              className="btn-secondary"
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <span data-i18n="donations.maybe_later">Maybe Later</span>
            </button>
            <button
              id="openKofiBtn"
              className="btn-primary"
              style={{
                flex: 1.5,
                padding: '14px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #ff5e62 0%, #ff9966 100%)',
                border: 'none',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 5px 15px rgba(255, 94, 98, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <i className="fas fa-external-link-alt"></i> <span data-i18n="donations.open_kofi">Open Ko-fi</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default MiscModals;
