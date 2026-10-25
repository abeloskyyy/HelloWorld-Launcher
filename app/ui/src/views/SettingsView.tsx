import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLauncher } from '../hooks/useLauncher';

export const SettingsView: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const api = useLauncher();

  const [mcdir, setMcdir] = useState(user?.mcdir || '');
  const [hwAccel, setHwAccel] = useState(user?.hw_accel ?? true);
  const [transitions, setTransitions] = useState(user?.enable_transitions ?? true);
  const [privacy, setPrivacy] = useState(user?.privacy_mode ?? false);
  const [reopenOnGameClose, setReopenOnGameClose] = useState(user?.reopen_on_game_close ?? true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSelectFolder = async () => {
    try {
      const selected = await api.selectFolder(mcdir);
      if (selected) {
        setMcdir(selected);
      }
    } catch (e) {
      console.error('Failed to select folder:', e);
    }
  };

  const handleSave = async () => {
    try {
      await api.saveUserJson({
        mcdir,
        hw_accel: hwAccel,
        enable_transitions: transitions,
        privacy_mode: privacy,
        reopen_on_game_close: reopenOnGameClose
      });
      await api.saveAppSettings(transitions, hwAccel, privacy, reopenOnGameClose);
      await refreshUser();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  };

  return (
    <div style={{
      padding: '40px 60px',
      color: '#fff',
      height: '100%',
      boxSizing: 'border-box',
      overflowY: 'auto'
    }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>Ajustes del Launcher</h1>
        <p style={{ margin: '6px 0 0 0', color: '#8892b0', fontSize: '13px' }}>
          Configura tus preferencias generales, directorios y opciones de rendimiento.
        </p>
      </div>

      {savedSuccess && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.2)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          color: '#10b981',
          padding: '12px 18px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <i className="fas fa-check-circle"></i>
          <span>Ajustes guardados correctamente</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '640px' }}>
        {/* Minecraft Directory */}
        <div style={{
          background: 'rgba(22, 25, 38, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>
            Directorio de Minecraft (.minecraft)
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={mcdir}
              onChange={e => setMcdir(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 14px',
                background: '#0e111a',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '13px'
              }}
            />
            <button
              onClick={handleSelectFolder}
              style={{
                padding: '10px 16px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '13px'
              }}
            >
              Examinar
            </button>
          </div>
        </div>

        {/* Performance & Visual toggles */}
        <div style={{
          background: 'rgba(22, 25, 38, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>Aceleración por hardware (GPU)</div>
              <div style={{ color: '#8892b0', fontSize: '12px' }}>Usa la GPU para renderizado más fluido y menos uso de CPU.</div>
            </div>
            <input
              type="checkbox"
              checked={hwAccel}
              onChange={e => setHwAccel(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>Animaciones y transiciones</div>
              <div style={{ color: '#8892b0', fontSize: '12px' }}>Efectos suaves de movimiento en la interfaz.</div>
            </div>
            <input
              type="checkbox"
              checked={transitions}
              onChange={e => setTransitions(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>Maximizar launcher al cerrar el juego</div>
              <div style={{ color: '#8892b0', fontSize: '12px' }}>Restaura, maximiza y enfoca el launcher automáticamente cuando Minecraft se cierra.</div>
            </div>
            <input
              type="checkbox"
              checked={reopenOnGameClose}
              onChange={e => setReopenOnGameClose(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
          </label>
        </div>

        {/* Save Button */}
        <div>
          <button
            onClick={handleSave}
            style={{
              padding: '12px 30px',
              background: '#4facfe',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(79, 172, 254, 0.35)'
            }}
          >
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};
