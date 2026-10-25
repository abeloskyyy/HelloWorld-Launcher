import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';

export const TopBar: React.FC = () => {
  const { user, openLoginModal, openAccountSwitcher, logout } = useAuth();
  const { setActiveSection } = useNavigation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const isLoggedIn = Boolean(user && user.username && user.username.trim());

  return (
    <header className="launcher-topbar" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 24px',
      background: 'rgba(15, 17, 26, 0.75)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      zIndex: 100,
      position: 'relative'
    }}>
      {/* Brand Logo & Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', userSelect: 'none' }}>
        <img src="img/icon.png" alt="Logo" style={{ width: '28px', height: '28px', filter: 'drop-shadow(0 2px 8px rgba(79, 172, 254, 0.4))' }} />
        <span style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '0.5px', color: '#fff' }}>
          HelloWorld <span style={{ color: '#4facfe' }}>Launcher</span>
        </span>
      </div>

      {/* User Controls & Profile Area */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Quick Social & Stats shortcuts */}
        {isLoggedIn && (
          <>
            <button
              onClick={() => setActiveSection('social')}
              className="social-btn"
              title="Social & Chat"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#e0e0e0',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <i className="fas fa-user-friends"></i>
            </button>
          </>
        )}

        {/* User Badge or Login Button */}
        {isLoggedIn ? (
          <div style={{ position: 'relative' }}>
            <div
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '6px 14px 6px 8px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(79, 172, 254, 0.3)',
                borderRadius: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
              }}
            >
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: '#4facfe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                {user?.last_skin_url ? (
                  <img src={user.last_skin_url} alt="Skin" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <i className="fas fa-user" style={{ color: '#fff', fontSize: '13px' }}></i>
                )}
              </div>
              <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>{user?.username}</span>
              <span style={{
                fontSize: '10px',
                textTransform: 'uppercase',
                padding: '2px 6px',
                borderRadius: '4px',
                background: user?.account_type === 'microsoft' ? 'rgba(0, 164, 239, 0.2)' : 'rgba(255, 170, 0, 0.2)',
                color: user?.account_type === 'microsoft' ? '#00a4ef' : '#ffaa00',
                fontWeight: 700
              }}>
                {user?.account_type}
              </span>
              <i className={`fas fa-chevron-${isDropdownOpen ? 'up' : 'down'}`} style={{ color: '#888', fontSize: '11px', marginLeft: '4px' }}></i>
            </div>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  background: 'rgba(22, 25, 38, 0.95)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '8px',
                  minWidth: '180px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  zIndex: 200
                }}
              >
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    openAccountSwitcher();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '8px 12px',
                    background: 'none',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '13px'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(79, 172, 254, 0.15)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <i className="fas fa-exchange-alt" style={{ color: '#4facfe' }}></i> Cambiar cuenta
                </button>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '6px 0' }} />
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    logout();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '8px 12px',
                    background: 'none',
                    border: 'none',
                    color: '#ff5c5c',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '13px'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 92, 92, 0.15)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <i className="fas fa-sign-out-alt"></i> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={openLoginModal}
            className="btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '20px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(79, 172, 254, 0.35)',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
          >
            <i className="fas fa-user"></i> Iniciar Sesión
          </button>
        )}
      </div>
    </header>
  );
};
