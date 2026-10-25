import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLauncher } from '../../hooks/useLauncher';

export const AccountSwitcherModal: React.FC = () => {
  const { isAccountSwitcherOpen, closeAccountSwitcher, savedAccounts, user, switchAccount, openLoginModal, refreshAccounts } = useAuth();
  const api = useLauncher();

  if (!isAccountSwitcherOpen) return null;

  const handleSwitch = async (id?: string, type?: string) => {
    if (!id) return;
    await switchAccount(id, type);
  };

  const handleRemove = async (e: React.MouseEvent, id?: string) => {
    e.stopPropagation();
    if (!id) return;
    try {
      await api.removeSavedAccount(id);
      await refreshAccounts();
    } catch (err) {
      console.error('Failed to remove account:', err);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        background: '#161926',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        width: '460px',
        maxWidth: '90vw',
        padding: '24px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
        position: 'relative',
        color: '#fff'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Cuentas guardadas</h2>
            <p style={{ margin: '4px 0 0 0', color: '#8892b0', fontSize: '12px' }}>Selecciona una cuenta para jugar</p>
          </div>
          <button
            onClick={closeAccountSwitcher}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              fontSize: '18px',
              cursor: 'pointer'
            }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Account List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '340px', overflowY: 'auto' }}>
          {savedAccounts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#8892b0' }}>
              <i className="fas fa-user-slash" style={{ fontSize: '32px', marginBottom: '10px', opacity: 0.5 }}></i>
              <p>No tienes cuentas guardadas</p>
            </div>
          ) : (
            savedAccounts.map((acc, i) => {
              const isCurrent = user?.username === acc.username && user?.account_type === acc.type;
              return (
                <div
                  key={acc.id || `${acc.username}-${acc.type}-${i}`}
                  onClick={() => handleSwitch(acc.id || acc.uuid || acc.username, acc.type)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: isCurrent ? 'rgba(79, 172, 254, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    border: isCurrent ? '1px solid rgba(79, 172, 254, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={e => {
                    if (!isCurrent) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  }}
                  onMouseLeave={e => {
                    if (!isCurrent) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: acc.type === 'microsoft' ? '#0078d4' : '#ffaa00',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden'
                    }}>
                      {acc.avatarUrl ? (
                        <img src={acc.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <i className={acc.type === 'microsoft' ? 'fab fa-microsoft' : 'fas fa-user'} style={{ color: '#fff' }}></i>
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: '#fff' }}>{acc.username}</div>
                      <div style={{ fontSize: '11px', color: '#8892b0', textTransform: 'capitalize' }}>
                        {acc.type} {acc.msEmail ? `• ${acc.msEmail}` : ''}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isCurrent ? (
                      <span style={{
                        padding: '3px 8px',
                        background: 'rgba(79, 172, 254, 0.2)',
                        color: '#4facfe',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700
                      }}>
                        ACTIVA
                      </span>
                    ) : (
                      <button
                        onClick={e => handleRemove(e, acc.id || acc.uuid || acc.username)}
                        title="Eliminar cuenta"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#666',
                          cursor: 'pointer',
                          padding: '6px'
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ff5c5c'}
                        onMouseLeave={e => e.currentTarget.style.color = '#666'}
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer: Add new account */}
        <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
          <button
            onClick={() => {
              closeAccountSwitcher();
              openLoginModal();
            }}
            style={{
              width: '100%',
              padding: '12px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px dashed rgba(255,255,255,0.2)',
              borderRadius: '8px',
              color: '#4facfe',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(79, 172, 254, 0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          >
            <i className="fas fa-plus"></i> Añadir otra cuenta
          </button>
        </div>
      </div>
    </div>
  );
};
