import React from 'react';

export const TopBanners: React.FC = () => {
  return (
    <>
      {/* Microsoft verification banner */}
      <div id="msVerifyBanner" style={{ display: 'none' }}>
        <i className="fab fa-microsoft"></i>
        <span data-i18n="banners.ms_verify_text">
          Your Microsoft account is not verified. Web login won't work until you verify.
        </span>
        <button id="msVerifyBannerBtn">
          <i className="fas fa-shield-alt"></i> <span data-i18n="banners.verify_now">Verify now</span>
        </button>
        <button id="msVerifyBannerClose" title="Dismiss" data-i18n-title="banners.dismiss">
          <i className="fas fa-times"></i>
        </button>
      </div>

      {/* HelloWorld Services Down Banner */}
      <div id="hwServicesDownBanner" style={{ display: 'none' }}>
        <i className="fas fa-exclamation-triangle" style={{ color: '#ffcc00', fontSize: '15px', flexShrink: 0 }}></i>
        <span data-i18n="banners.hw_services_down">
          HelloWorld services are temporarily down. Login, friends, chat, and workshop modpacks are unavailable.
        </span>
      </div>

      {/* Maintenance Admin Bypass Banner */}
      <div
        id="maintenanceAdminBypassBanner"
        style={{
          display: 'none',
          background: 'linear-gradient(90deg, #d97706, #f59e0b)',
          color: '#000',
          padding: '7px 18px',
          fontSize: '13px',
          fontWeight: 700,
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 99999,
          boxShadow: '0 2px 10px rgba(245, 158, 11, 0.3)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fas fa-tools"></i>
          <span data-i18n="maintenance.admin_bypass_badge">🛠️ Modo Mantenimiento Activo — Bypass de Administrador Habilitado</span>
        </div>
        <span
          style={{
            fontSize: '11px',
            background: 'rgba(0,0,0,0.25)',
            color: '#fff',
            padding: '2px 8px',
            borderRadius: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
        >
          ADMIN BYPASS
        </span>
      </div>

      {/* Community Announcement Banner */}
      <div id="announcementBanner" className="announcement-banner type-event" style={{ display: 'none' }}>
        <div className="announcement-left">
          <img id="announcementIconImg" className="announcement-icon-img" src="" alt="Icon" style={{ display: 'none' }} />
          <i id="announcementIconFallback" className="fas fa-bullhorn announcement-icon-fallback"></i>
          <span id="announcementBadge" className="announcement-badge" style={{ display: 'none' }}></span>
        </div>
        <div className="announcement-ticker-track" id="announcementTickerTrack">
          <div id="announcementTickerContent" className="announcement-ticker-content">
            <span id="announcementMessageText1" className="announcement-text"></span>
            <span id="announcementMessageText2" className="announcement-text" aria-hidden="true"></span>
          </div>
        </div>
        <div className="announcement-right" id="announcementRightGroup">
          <div className="announcement-buttons" id="announcementButtonsContainer"></div>
          <button id="announcementCloseBtn" className="announcement-close-btn" title="Descartar aviso" style={{ display: 'none' }}>
            <i className="fas fa-times"></i>
          </button>
        </div>
      </div>
    </>
  );
};

export default TopBanners;
