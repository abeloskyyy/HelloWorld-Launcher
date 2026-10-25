import React from 'react';
import { useAuth } from '../context/AuthContext';

export const SkinsView: React.FC = () => {
  const { user } = useAuth();

  return (
    <div style={{
      padding: '40px 60px',
      color: '#fff',
      height: '100%',
      boxSizing: 'border-box',
      overflowY: 'auto'
    }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>Aspectos y Capas</h1>
        <p style={{ margin: '6px 0 0 0', color: '#8892b0', fontSize: '13px' }}>
          Personaliza el aspecto de tu personaje de Minecraft y tus capas equipadas.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        gap: '30px',
        alignItems: 'start'
      }}>
        {/* Skin Preview Card */}
        <div style={{
          background: 'rgba(22, 25, 38, 0.8)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '180px',
            height: '240px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.06)'
          }}>
            {user?.last_skin_url ? (
              <img
                src={user.last_skin_url}
                alt="Skin 2D Preview"
                style={{ width: '80%', height: '80%', objectFit: 'contain' }}
              />
            ) : (
              <div style={{ textAlign: 'center', color: '#666' }}>
                <i className="fas fa-user" style={{ fontSize: '48px', marginBottom: '8px' }}></i>
                <div style={{ fontSize: '12px' }}>Aspecto por defecto</div>
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>{user?.username || 'Steve'}</h3>
            <span style={{ fontSize: '12px', color: '#4facfe', textTransform: 'uppercase', fontWeight: 600 }}>
              Modelo {user?.last_skin_variant || 'Classic'}
            </span>
          </div>
        </div>

        {/* Skin Packs and Options */}
        <div style={{
          background: 'rgba(22, 25, 38, 0.6)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '28px'
        }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 700 }}>Paquetes de aspectos</h2>
          <p style={{ color: '#8892b0', fontSize: '13px', lineHeight: '1.6' }}>
            Puedes organizar tus aspectos favoritos y alternar entre ellos con un solo clic.
            {user?.account_type !== 'microsoft' && (
              <span style={{ display: 'block', marginTop: '10px', color: '#ffaa00' }}>
                <i className="fas fa-info-circle" style={{ marginRight: '6px' }}></i>
                Nota: La sincronización oficial de skins y capas de Mojang requiere una cuenta de Microsoft.
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
