import React from 'react';

export const UserAreaControls: React.FC = () => {
  return (
    <>
      {/* Login Button / User Badge */}
      <div id="userAreaControls">
        <button id="statsBtn" className="social-btn" style={{ display: 'none' }} title="Stats" data-i18n-title="social.stats_title">
          <i className="fas fa-chart-bar"></i>
          <span className="lock-badge"><i className="fas fa-lock"></i></span>
        </button>
        <button id="socialBtn" className="social-btn" style={{ display: 'none' }} title="Social" data-i18n-title="social.social_title">
          <i className="fas fa-user-friends"></i>
          <span id="socialBadge" className="social-badge-count"></span>
          <span className="lock-badge"><i className="fas fa-lock"></i></span>
        </button>
        <div id="userBadgeWrapper" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
          <div id="userBadge" className="user-badge" style={{ display: 'none', minWidth: '260px', maxWidth: '360px', width: 'auto' }}>
            <div className="user-avatar" id="userAvatarHead">
              <i className="fas fa-user"></i>
            </div>
            <span id="userDisplayName"></span>
            <span id="userBadgesDisplay" className="hw-badges-row" style={{ marginLeft: '3px' }}></span>
            {/* Dropdown menu */}
            <div className="user-dropdown" id="userDropdown">
              <button className="dropdown-item" id="viewOwnProfileBtn" data-i18n="user_menu.view_profile">
                <i className="fas fa-id-card"></i> View Profile
              </button>
              <button className="dropdown-item" id="editProfileBtn" data-i18n="user_menu.edit_profile">
                <i className="fas fa-user-edit"></i> Edit Profile
              </button>
              <button className="dropdown-item" id="switchAccountBtn" data-i18n="user_menu.switch_account">
                <i className="fas fa-exchange-alt"></i> Switch Account
              </button>
            </div>
          </div>

          {/* Streak Badge positioned below User Badge */}
          <div
            id="streakBadgeContainer"
            style={{
              display: 'none',
              width: '100%',
              maxWidth: '160px',
              marginLeft: 'auto',
              marginRight: 0,
              aspectRatio: '1 / 1',
              position: 'relative',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 99,
              background: 'rgba(20, 20, 30, 0.5)',
              backdropFilter: 'blur(8px)',
              borderRadius: '12px',
              border: '1px solid rgba(255,170,0,0.2)',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
              overflow: 'hidden'
            }}
          >
            <div
              className="css-fire-container"
              style={{
                position: 'absolute',
                bottom: '25px',
                left: '-20px',
                width: '100%',
                height: '100%',
                zIndex: 1,
                filter: 'url(#gooey-fire)',
                opacity: 0,
                transition: 'opacity 1s ease-in-out'
              }}
            >
              <div className="flame-base" style={{ width: '80px', height: '50px', marginLeft: '20px' }}></div>
              <div className="flame-particle p1" style={{ width: '55px', height: '55px' }}></div>
              <div className="flame-particle p2" style={{ width: '65px', height: '65px' }}></div>
              <div className="flame-particle p3" style={{ width: '40px', height: '40px' }}></div>
              <div className="flame-particle p4" style={{ width: '50px', height: '50px' }}></div>
              <div className="flame-particle p5" style={{ width: '70px', height: '70px' }}></div>
              <div className="flame-particle p6" style={{ width: '60px', height: '60px' }}></div>
              <div className="flame-particle p7" style={{ width: '45px', height: '45px' }}></div>
              <div className="flame-particle p8" style={{ width: '50px', height: '50px' }}></div>
              <div className="flame-particle p9" style={{ width: '35px', height: '35px' }}></div>
              <div className="flame-particle p10" style={{ width: '55px', height: '55px' }}></div>
              <div className="flame-particle p11" style={{ width: '65px', height: '65px' }}></div>
              <div className="flame-particle p12" style={{ width: '40px', height: '40px' }}></div>
              <div className="flame-particle p13" style={{ width: '45px', height: '45px' }}></div>
              <div className="flame-particle p14" style={{ width: '50px', height: '50px' }}></div>
              <div className="flame-particle p15" style={{ width: '60px', height: '60px' }}></div>
            </div>
            <span
              id="streakCount"
              className="streak-text"
              style={{
                position: 'relative',
                zIndex: 2,
                fontSize: '52px',
                fontWeight: 900,
                color: '#fff',
                textShadow: '0 3px 6px rgba(0,0,0,0.9), 0 0 12px rgba(255,170,0,0.8)',
                lineHeight: 1,
                marginTop: '10px'
              }}
            >
              0
            </span>
            <span
              style={{
                position: 'relative',
                zIndex: 2,
                fontSize: '14px',
                textTransform: 'uppercase',
                color: '#ffcc00',
                fontWeight: 800,
                textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                marginTop: '4px',
                textAlign: 'center',
                lineHeight: 1.2
              }}
              data-i18n="sidebar.streak_days"
            >
              Days of<br />Streak
            </span>
            <i
              className="fas fa-info-circle"
              data-i18n-tooltip="sidebar.streak_tooltip"
              data-tooltip="Increments automatically on your first login to the game each day."
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                color: 'rgba(255,255,255,0.4)',
                cursor: 'help',
                fontSize: '14px',
                zIndex: 5,
                transition: 'color 0.2s'
              }}
              onMouseOver={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
              onMouseOut={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
            ></i>
          </div>

          {/* Profile Completion Bar (shown below streak for logged-in users) */}
          <div id="profileCompletionBar" style={{ display: 'none', width: '100%', padding: '0 2px', pointerEvents: 'none' }}>
            <div className="pcb-header">
              <span className="pcb-label" data-i18n="sidebar.profile_label">Profile</span>
              <span className="pcb-percent" id="pcbPercent">0%</span>
            </div>
            <div className="pcb-track" id="pcbTrack">
              <div className="pcb-fill" id="pcbFill" style={{ width: '0%' }}></div>
            </div>
            <div className="pcb-steps" id="pcbSteps"></div>
          </div>
        </div>
      </div>

      {/* SVG Filter for Gooey Fire Effect */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="gooey-fire">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>

      <button className="login-button" id="loginButton" data-i18n="sidebar.login">
        <i className="fas fa-user"></i> Login
      </button>
    </>
  );
};

export default UserAreaControls;
