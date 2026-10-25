import React from 'react';
import { useProfiles } from '../context/ProfilesContext';
import { useNavigation } from '../context/NavigationContext';

export const InstallationsView: React.FC = () => {
  const { profiles, selectedProfile, selectProfile, launchGame, refreshProfiles } = useProfiles();
  const { setActiveSection } = useNavigation();

  return (
    <div style={{
      padding: '40px 60px',
      color: '#fff',
      height: '100%',
      boxSizing: 'border-box',
      overflowY: 'auto'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>Instalaciones</h1>
          <p style={{ margin: '6px 0 0 0', color: '#8892b0', fontSize: '13px' }}>
            Gestiona tus versiones de Minecraft, perfiles de mods y configuraciones.
          </p>
        </div>

        <button
          onClick={() => alert('Próximamente: Asistente para crear nueva instalación')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            border: 'none',
            borderRadius: '10px',
            color: '#fff',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(79, 172, 254, 0.35)'
          }}
        >
          <i className="fas fa-plus"></i> Nueva Instalación
        </button>
      </div>

      {/* Installations List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {profiles.map(profile => {
          const isSelected = profile.id === selectedProfile?.id;
          return (
            <div
              key={profile.id}
              onClick={() => selectProfile(profile)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                background: isSelected ? 'rgba(79, 172, 254, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                border: isSelected ? '1px solid rgba(79, 172, 254, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                backdropFilter: 'blur(10px)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => {
                if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
              }}
              onMouseLeave={e => {
                if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <i className="fas fa-cube" style={{ fontSize: '20px', color: '#4facfe' }}></i>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 700, fontSize: '16px', color: '#fff' }}>{profile.name}</span>
                    {isSelected && (
                      <span style={{
                        padding: '2px 8px',
                        background: 'rgba(79, 172, 254, 0.2)',
                        color: '#4facfe',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700
                      }}>
                        SELECCIONADA
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '12px', color: '#8892b0' }}>
                    <span>{profile.version}</span>
                    {profile.loader && <span>• {profile.loader}</span>}
                    {profile.directory && <span>• {profile.directory}</span>}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    selectProfile(profile);
                    setActiveSection('play');
                    launchGame();
                  }}
                  style={{
                    padding: '8px 20px',
                    background: '#10b981',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  <i className="fas fa-play" style={{ marginRight: '6px' }}></i> Jugar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
