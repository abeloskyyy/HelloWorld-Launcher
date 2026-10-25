import React from 'react';

export const LoginModal: React.FC = () => {
  return (
    <>
      {/* Login Modal */}
      <div className="modal" id="loginModal">
        <div className="modal-content login-modal">
          <button className="modal-close-btn" id="closeLoginModal">
            <i className="fas fa-times"></i>
          </button>

          {/* Screen 1: Method Selection */}
          <div id="loginMethodScreen" className="login-screen active">
            <span className="modal-title" data-i18n="login.how_to_play">
              How do you want to play?
            </span>
            <p style={{ textAlign: 'center', marginBottom: '30px', color: '#666' }} data-i18n="login.choose_method">
              Choose your login method
            </p>

            <button className="btn-primary btn-large" id="selectMicrosoftBtn">
              <i className="fab fa-microsoft"></i> <span data-i18n="login.login_microsoft">Login with Microsoft</span>{' '}
              <span className="corner-ribbon" data-i18n="login.only_premium">
                Only Minecraft Premium
              </span>
            </button>

            <button
              className="btn-primary btn-large"
              id="selectHelloWorldBtn"
              style={{
                backgroundColor: '#ffaa00',
                marginTop: '15px',
                border: 'none',
                fontWeight: 600,
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                color: '#fff'
              }}
            >
              <i className="fas fa-globe"></i> <span data-i18n="login.login_helloworld">Login with HelloWorld</span>
            </button>

            <button className="btn-secondary btn-link" id="selectOfflineBtn" data-i18n="login.offline_mode">
              Continue in Offline mode
            </button>

            <button
              className="btn-secondary btn-link"
              id="selectSavedAccountsBtn"
              style={{
                marginTop: '6px',
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: '#4facfe'
              }}
            >
              <i className="fas fa-users"></i>{' '}
              <span data-i18n="login.select_saved_account">Or switch to a saved account</span>
            </button>
          </div>

          {/* Screen 2: Offline Mode */}
          <div id="loginOfflineScreen" className="login-screen">
            <span className="modal-title" data-i18n="offline_login.title">
              Offline Mode
            </span>
            <p style={{ textAlign: 'center', marginBottom: '20px', color: '#666' }} data-i18n="offline_login.enter_nickname">
              Enter your nickname to play
            </p>

            <div className="modal-input-group">
              <label>
                <span data-i18n="offline_login.nickname">Nickname</span>
                <i
                  className="fa-regular fa-question-circle help-icon"
                  data-i18n-tooltip="offline_login.nickname_tooltip"
                  data-tooltip="Your in-game username. Only letters and numbers, no spaces or special characters."
                ></i>
              </label>
              <input
                id="nickname"
                type="text"
                data-i18n-placeholder="offline_login.placeholder"
                placeholder="Type your nickname"
              />
            </div>

            <div className="modal-options">
              <button className="btn-secondary" id="backToMethodBtn" style={{ color: '#a3a3a3' }}>
                <i className="fas fa-arrow-left"></i> <span data-i18n="tutorial.back">Back</span>
              </button>
              <button className="btn-primary" id="saveOfflineBtn" data-i18n="offline_login.enter_btn">
                Enter
              </button>
            </div>
          </div>

          {/* Screen 3: HelloWorld Auth */}
          <div id="loginHelloWorldScreen" className="login-screen">
            <span className="modal-title" data-i18n="login.hw_account">
              HelloWorld Account
            </span>
            <p style={{ textAlign: 'center', marginBottom: '20px', color: '#666' }} data-i18n="login.hw_desc">
              Log in with your HelloWorld web account
            </p>

            <div className="modal-input-group">
              <label data-i18n="login.email_or_username">Email or Username</label>
              <input
                id="hwEmail"
                type="text"
                placeholder="Email or Username"
                data-i18n-placeholder="login.email_or_username"
              />
            </div>

            <div className="modal-input-group" style={{ marginTop: '15px' }}>
              <label data-i18n="login.password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="hwPassword"
                  type="password"
                  placeholder="••••••••"
                  style={{ paddingRight: '40px', width: '100%' }}
                />
                <i
                  className="fa-regular fa-eye hw-toggle-password"
                  data-target="hwPassword"
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    cursor: 'pointer',
                    color: '#888'
                  }}
                ></i>
              </div>
            </div>

            {/* Error Container */}
            <div
              id="hwLoginError"
              style={{
                color: '#ff4444',
                fontSize: '0.9em',
                marginTop: '15px',
                textAlign: 'center',
                display: 'none',
                background: 'rgba(255, 68, 68, 0.1)',
                padding: '8px',
                borderRadius: '8px'
              }}
            ></div>

            <div style={{ textAlign: 'right', marginTop: '5px' }}>
              <a
                href="#"
                id="hwForgotPasswordLink"
                style={{ color: '#ffaa00', textDecoration: 'none', fontSize: '0.85em' }}
                data-i18n="login.forgot_password"
              >
                Forgot Password?
              </a>
            </div>

            <div className="modal-options" style={{ marginTop: '20px' }}>
              <button className="btn-secondary" id="hwBackBtn" style={{ color: '#a3a3a3' }}>
                <i className="fas fa-arrow-left"></i> <span data-i18n="tutorial.back">Back</span>
              </button>
              <button
                className="btn-primary"
                id="hwLoginBtn"
                style={{
                  background: 'linear-gradient(135deg, #ffaa00 0%, #ff8c00 100%)',
                  color: '#fff',
                  fontWeight: 600,
                  border: 'none',
                  boxShadow: '0 4px 15px rgba(255, 140, 0, 0.4)'
                }}
                data-i18n="login.login_btn"
              >
                Log In
              </button>
            </div>
            <p style={{ textAlign: 'center', marginTop: '15px', fontSize: '0.9em', opacity: 0.8, color: '#888' }}>
              <span data-i18n="login.no_account">No account yet?</span>{' '}
              <a
                href="https://abeloskyyy.github.io/HelloWorld-Launcher/?register=true"
                target="_blank"
                rel="noreferrer"
                style={{ color: '#ffaa00', textDecoration: 'none', fontWeight: 600 }}
              >
                <span data-i18n="login.create_account">Create an account here</span>
              </a>
            </p>
          </div>

          {/* Screen 4: Forgot Password */}
          <div id="loginForgotPasswordScreen" className="login-screen">
            <span className="modal-title" data-i18n="login.reset_password">
              Reset Password
            </span>
            <p style={{ textAlign: 'center', marginBottom: '20px', color: '#666' }} data-i18n="login.reset_desc">
              Enter your email to receive a password reset link.
            </p>

            <div className="modal-input-group">
              <label data-i18n="login.email">Email</label>
              <input
                id="hwForgotEmail"
                type="email"
                placeholder="Email Address"
                data-i18n-placeholder="login.email_address_placeholder"
              />
            </div>

            <div
              id="hwForgotMsg"
              style={{
                color: '#ff4444',
                fontSize: '0.9em',
                marginTop: '15px',
                textAlign: 'center',
                display: 'none',
                background: 'rgba(255, 68, 68, 0.1)',
                padding: '8px',
                borderRadius: '8px'
              }}
            ></div>

            <div className="modal-options" style={{ marginTop: '20px' }}>
              <button className="btn-secondary" id="hwForgotBackBtn" style={{ color: '#a3a3a3' }}>
                <i className="fas fa-arrow-left"></i> <span data-i18n="tutorial.back">Back</span>
              </button>
              <button
                className="btn-primary"
                id="hwForgotSubmitBtn"
                style={{
                  background: 'linear-gradient(135deg, #ffaa00 0%, #ff8c00 100%)',
                  color: '#fff',
                  fontWeight: 600,
                  border: 'none',
                  boxShadow: '0 4px 15px rgba(255, 140, 0, 0.4)'
                }}
                data-i18n="social.send_link"
              >
                Send Link
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Account Switcher Modal */}
      <div className="modal" id="accountSwitcherModal">
        <div className="modal-content account-switcher-modal">
          <div className="account-switcher-header">
            <div className="account-switcher-title">
              <i className="fas fa-users-cog"></i>
              <span data-i18n="account_switcher.title">Accounts</span>
            </div>
            <button className="modal-close-btn" id="closeAccountSwitcherBtn">
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="account-switcher-body">
            <div id="accountSwitcherList" className="account-switcher-list">
              {/* Account items rendered here dynamically */}
              <div className="account-switcher-empty" id="accountSwitcherEmpty" style={{ display: 'none' }}>
                <i className="fas fa-user-slash"></i>
                <p data-i18n="account_switcher.no_saved">No saved accounts</p>
                <span data-i18n="account_switcher.login_to_add">Log in to add accounts here</span>
              </div>
            </div>
          </div>

          <div className="account-switcher-footer">
            <button className="account-switcher-add-btn" id="addAccountBtn">
              <i className="fas fa-plus"></i> <span data-i18n="account_switcher.add_account">Add Account</span>
            </button>
            <button className="account-switcher-signout-all-btn" id="signOutAllBtn">
              <i className="fas fa-sign-out-alt"></i>{' '}
              <span data-i18n="account_switcher.sign_out_all">Sign Out All</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feature Locked HW/MS Modal */}
      <div className="modal" id="featureLockedHWModal">
        <div
          className="modal-content"
          style={{ maxWidth: '480px', textAlign: 'center', padding: '35px 30px', borderColor: '#ffaa00' }}
        >
          <div style={{ fontSize: '48px', color: '#ffaa00', marginBottom: '15px' }}>
            <i className="fas fa-lock"></i>
          </div>
          <span className="modal-title" style={{ display: 'block', fontSize: '24px', marginBottom: '15px' }} data-i18n="login.account_required">
            Account Required
          </span>
          <p style={{ color: '#ccc', fontSize: '15px', lineHeight: 1.6, marginBottom: '25px' }} data-i18n="login.account_required_desc">
            You need a HelloWorld or Microsoft account to use this feature.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              id="openRegisterWebBtn"
              className="btn-primary"
              style={{
                width: '100%',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #ffaa00, #ff7700)',
                border: 'none',
                padding: '12px'
              }}
              data-i18n="login.create_hw_account"
            >
              <i className="fas fa-user-plus" style={{ marginRight: '8px' }}></i> Create a HelloWorld Account
            </button>
            <button
              onClick={() => {
                const el = document.getElementById('featureLockedHWModal');
                if (el) el.classList.remove('show');
              }}
              className="btn-secondary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
              data-i18n="global.close"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Feature Locked Skins Modal */}
      <div className="modal" id="featureLockedSkinsModal">
        <div
          className="modal-content"
          style={{ maxWidth: '480px', textAlign: 'center', padding: '35px 30px', borderColor: '#4facfe' }}
        >
          <div style={{ fontSize: '48px', color: '#4facfe', marginBottom: '15px' }}>
            <i className="fas fa-tshirt"></i>
          </div>
          <span className="modal-title" style={{ display: 'block', fontSize: '24px', marginBottom: '15px' }} data-i18n="login.ms_account_required">
            Microsoft Account Required
          </span>
          <p style={{ color: '#ccc', fontSize: '15px', lineHeight: 1.6, marginBottom: '25px' }}>
            <span data-i18n="skins.locked_desc">
              You need to buy Minecraft and log in with a <strong>Microsoft account</strong> to use custom skins and capes in the launcher.
            </span>
            <br />
            <br />
            <span style={{ color: '#ffaa00' }}>
              <i className="fas fa-info-circle"></i>{' '}
              <span data-i18n="skins.locked_planned">Support for skins with HelloWorld accounts is planned for the future!</span>
            </span>
          </p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={() => {
                const el = document.getElementById('featureLockedSkinsModal');
                if (el) el.classList.remove('show');
              }}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
              data-i18n="skins.locked_btn"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginModal;
