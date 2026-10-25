import React, { useState } from 'react';
import { useProfiles } from '../context/ProfilesContext';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';

export const PlayView: React.FC = () => {
  const { profiles, selectedProfile, selectProfile, launchGame, isLaunching, isPlaying, cancelLaunch } = useProfiles();
  const { user, openLoginModal } = useAuth();
  const { setActiveSection } = useNavigation();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handlePlayClick = () => {
    if (!user || !user.username) {
      openLoginModal();
      return;
    }
    if (isLaunching) {
      cancelLaunch();
    } else if (!isPlaying) {
      launchGame();
    }
  };

  return (
    <div style={{
      position: 'relative',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      padding: '40px 60px',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      {/* Dynamic Background Image */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundImage: 'url("img/backgrounds/minecraft1.webp")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'brightness(0.65) saturate(1.1)',
        zIndex: 1
      }} />

      {/* Subtle Gradient Overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'linear-gradient(to top, rgba(10, 12, 18, 0.95) 0%, rgba(10, 12, 18, 0.4) 60%, rgba(10, 12, 18, 0.7) 100%)',
        zIndex: 2
      }} />

      {/* Main Content Area */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        {/* Left Side: Selected Installation Information */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '480px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '20px',
            padding: '4px 12px',
            width: 'fit-content'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4facfe', boxShadow: '0 0 8px #4facfe' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#e0e0e0' }}>
              Minecraft Java Edition • {selectedProfile?.version || '1.21.1'}
            </span>
          </div>

          <h1 style={{
            margin: 0,
            fontSize: '38px',
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.5px',
            textShadow: '0 4px 16px rgba(0,0,0,0.5)'
          }}>
            {selectedProfile?.name || 'Última Versión'}
          </h1>

          <p style={{ margin: 0, color: '#a0aec0', fontSize: '14px', lineHeight: '1.5' }}>
            {selectedProfile?.loader ? `Cargador de mods: ${selectedProfile.loader}` : 'Instalación Vanilla limpia y lista para jugar.'}
          </p>

          {/* Installation Selector Trigger */}
          <div style={{ position: 'relative', marginTop: '6px' }}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '10px 16px',
                background: 'rgba(22, 25, 38, 0.85)',
                backdropFilter: 'blur(14px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                minWidth: '240px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fas fa-cube" style={{ color: '#4facfe' }}></i>
                <span>{selectedProfile?.name || 'Seleccionar instalación'}</span>
              </div>
              <i className={`fas fa-chevron-${isDropdownOpen ? 'up' : 'down'}`} style={{ color: '#888', fontSize: '11px' }}></i>
            </button>

            {isDropdownOpen && (
              <div style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                marginBottom: '8px',
                background: 'rgba(22, 25, 38, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '12px',
                padding: '6px',
                minWidth: '260px',
                maxHeight: '220px',
                overflowY: 'auto',
                boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
                zIndex: 100
              }}>
                {profiles.map(p => (
                  <div
                    key={p.id}
                    onClick={() => {
                      selectProfile(p);
                      setIsDropdownOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: p.id === selectedProfile?.id ? 'rgba(79, 172, 254, 0.2)' : 'transparent',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                    onMouseEnter={e => {
                      if (p.id !== selectedProfile?.id) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    }}
                    onMouseLeave={e => {
                      if (p.id !== selectedProfile?.id) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontSize: '11px', color: '#8892b0' }}>{p.version}</div>
                    </div>
                    {p.id === selectedProfile?.id && (
                      <i className="fas fa-check" style={{ color: '#4facfe', fontSize: '12px' }}></i>
                    )}
                  </div>
                ))}
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setActiveSection('installations');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 12px',
                    background: 'none',
                    border: 'none',
                    color: '#4facfe',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600
                  }}
                >
                  <i className="fas fa-cog"></i> Administrar instalaciones...
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Big Play Button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handlePlayClick}
            disabled={isPlaying}
            style={{
              padding: '18px 60px',
              fontSize: '20px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              borderRadius: '16px',
              border: 'none',
              color: '#fff',
              background: isPlaying
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : isLaunching
                ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
                : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              boxShadow: isPlaying
                ? '0 10px 30px rgba(16, 185, 129, 0.4)'
                : isLaunching
                ? '0 10px 30px rgba(239, 68, 68, 0.4)'
                : '0 10px 35px rgba(79, 172, 254, 0.5)',
              cursor: isPlaying ? 'default' : 'pointer',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            {isPlaying ? (
              <>
                <i className="fas fa-gamepad"></i> Jugando
              </>
            ) : isLaunching ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Cancelar
              </>
            ) : (
              <>
                <i className="fas fa-play"></i> JUGAR
              </>
            )}
          </button>
          <span style={{ fontSize: '11px', color: '#8892b0' }}>
            {isPlaying ? 'El juego está en ejecución' : isLaunching ? 'Iniciando Minecraft...' : 'Presiona para iniciar'}
          </span>
        </div>
      </div>
    </div>
  );
};
