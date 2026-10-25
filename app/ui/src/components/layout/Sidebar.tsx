import React from 'react';

export const Sidebar: React.FC = () => {
  const [activeSection, setActiveSection] = React.useState('play');
  const [activeSubtype, setActiveSubtype] = React.useState<string | null>(null);

  const [isModsSubmenuOpen, setIsModsSubmenuOpen] = React.useState(false);

  React.useEffect(() => {
    const handleSectionChange = (e: any) => {
      if (e.detail?.section) {
        setActiveSection(e.detail.section);
        if (e.detail.section === 'mods') {
          setIsModsSubmenuOpen(true);
        }
        if (e.detail.subType !== undefined) {
          setActiveSubtype(e.detail.subType);
        }
      }
    };
    window.addEventListener('section-changed', handleSectionChange);
    return () => window.removeEventListener('section-changed', handleSectionChange);
  }, []);

  const handleShowSection = (section: string, subType?: string) => {
    setActiveSection(section);
    setActiveSubtype(subType || null);
    if (section === 'mods') {
      setIsModsSubmenuOpen(true);
    }
    const win = window as any;
    if (typeof win.showSection === 'function') {
      win.showSection(section, subType);
    }
  };

  const handleToggleModsMenu = () => {
    setIsModsSubmenuOpen(prev => !prev);
    const win = window as any;
    if (typeof win.toggleModsMenu === 'function') {
      win.toggleModsMenu();
    }
  };

  const handleSwitchWorkshopTab = (tab: string) => {
    const win = window as any;
    if (typeof win.switchWorkshopTab === 'function') {
      win.switchWorkshopTab(tab);
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <img src="img/icon/title.png" alt="HelloWorld Launcher" className="sidebar-logo" />
      </div>

      <button
        className={`sidebar-button ${activeSection === 'play' ? 'active' : ''}`}
        id="playNavBtn"
        data-section="play"
        onClick={() => handleShowSection('play')}
        data-i18n="sidebar.play"
      >
        <i className="fas fa-gamepad"></i> Play
      </button>

      <button
        className={`sidebar-button ${activeSection === 'profiles' ? 'active' : ''}`}
        id="profilesNavBtn"
        data-section="profiles"
        onClick={() => handleShowSection('profiles')}
        data-i18n="sidebar.installations"
      >
        <i className="fas fa-user"></i> Installations
      </button>

      <div className="sidebar-group">
        <button
          className={`sidebar-button ${activeSection === 'mods' ? 'active' : ''}`}
          onClick={handleToggleModsMenu}
          id="modsMenuBtn"
          data-section="mods"
        >
          <i className="fas fa-puzzle-piece"></i>
          <span data-i18n="sidebar.addons">Add-ons</span>
          <svg
            id="modsMenuArrow"
            className="mods-menu-chevron"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              marginLeft: 'auto',
              flexShrink: 0,
              transform: isModsSubmenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <div className={`sidebar-submenu ${isModsSubmenuOpen ? 'active' : ''}`} id="modsSubmenu">
          <button
            className={`sidebar-button submenu-item ${activeSection === 'mods' && activeSubtype === 'mod' ? 'active' : ''}`}
            data-section="mods"
            data-content-type="mod"
            onClick={() => handleShowSection('mods', 'mod')}
            data-i18n="sidebar.mods"
          >
            <i className="fas fa-cube"></i> Mods
          </button>
          <button
            className={`sidebar-button submenu-item ${activeSection === 'mods' && activeSubtype === 'resourcepack' ? 'active' : ''}`}
            data-section="mods"
            data-content-type="resourcepack"
            onClick={() => handleShowSection('mods', 'resourcepack')}
            data-i18n="sidebar.resource_packs"
          >
            <i className="fas fa-palette"></i> Resource Packs
          </button>
          <button
            className={`sidebar-button submenu-item ${activeSection === 'mods' && activeSubtype === 'datapack' ? 'active' : ''}`}
            data-section="mods"
            data-content-type="datapack"
            onClick={() => handleShowSection('mods', 'datapack')}
            data-i18n="sidebar.data_packs"
          >
            <i className="fas fa-code"></i> Data Packs
          </button>
          <button
            className={`sidebar-button submenu-item ${activeSection === 'mods' && activeSubtype === 'shader' ? 'active' : ''}`}
            data-section="mods"
            data-content-type="shader"
            onClick={() => handleShowSection('mods', 'shader')}
            data-i18n="sidebar.shaders"
          >
            <i className="fas fa-sun"></i> Shaders
          </button>
          <div
            style={{
              padding: '10px 14px',
              marginTop: '6px',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              fontSize: '0.8em',
              color: 'rgba(255,255,255,0.6)',
              lineHeight: 1.4
            }}
          >
            <span data-i18n="sidebar.modpacks_tip1">Looking for modpacks? You can find them in the</span>{' '}
            <span
              onClick={() => {
                handleShowSection('workshop');
                handleSwitchWorkshopTab('modpacks');
              }}
              style={{ color: '#4facfe', textDecoration: 'underline', fontWeight: 500, cursor: 'pointer' }}
              data-i18n="sidebar.modpacks_tip2"
            >
              Workshop
            </span>.
          </div>
        </div>
      </div>

      <button
        className={`sidebar-button ${activeSection === 'workshop' ? 'active' : ''}`}
        id="workshopNavBtn"
        data-section="workshop"
        onClick={() => handleShowSection('workshop')}
        data-i18n="sidebar.workshop"
      >
        <i className="fas fa-store"></i> Workshop
      </button>

      <button
        className={`sidebar-button ${activeSection === 'skins' ? 'active' : ''}`}
        onClick={() => handleShowSection('skins')}
        id="skinsSidebarBtn"
        data-section="skins"
        style={{ display: 'none' }}
        data-i18n="sidebar.skins"
      >
        <i className="fas fa-tshirt"></i> Skins & Capes
        <span className="lock-badge"><i className="fas fa-lock"></i></span>
      </button>

      <button
        className={`sidebar-button ${activeSection === 'settings' ? 'active' : ''}`}
        id="settingsNavBtn"
        data-section="settings"
        onClick={() => handleShowSection('settings')}
        data-i18n="sidebar.settings"
      >
        <i className="fas fa-cog"></i> Settings
      </button>

      {/* Sidebar Bottom Promos (Sponsor, Buy Minecraft, Discord) */}
      <div className="sidebar-promos">
        {/* Sponsor Banner (Apex Hosting) */}
        <div className="sidebar-sponsor is-hidden" id="sidebarSponsorCard" style={{ display: 'none' }}>
          <a
            href="https://billing.apexminecrafthosting.com/aff.php?aff=17119"
            target="_blank"
            rel="noreferrer"
            className="sponsor-sidebar-card"
            id="sidebarSponsorLink"
            title="Apex Hosting"
            data-i18n-title="sidebar.sponsor_title"
          >
            <div className="sponsor-sidebar-icon" id="sponsorSidebarIcon">
              <img src="" alt="Sponsor" id="sponsorIconImg" className="sponsor-apex-img" style={{ display: 'none' }} />
              <i className="fas fa-server sponsor-fallback-icon" id="sponsorFallbackIcon"></i>
            </div>
            <div className="sponsor-sidebar-content">
              <span className="sponsor-sidebar-title" id="sponsorTitle" data-i18n="sidebar.sponsor_title">
                Apex Hosting
              </span>
              <span className="sponsor-sidebar-subtitle" id="sponsorSubtitle" data-i18n="sidebar.sponsor_subtitle">
                Crea tu servidor
              </span>
            </div>
            <div className="sponsor-sidebar-right">
              <div className="sponsor-discount-badge" id="sponsorDiscountBadge">-25%</div>
              <button
                type="button"
                className="sponsor-action-btn"
                id="sponsorCopyBtn"
                title="Copiar código"
                data-i18n-title="sidebar.sponsor_copy_hint"
              >
                <i className="fas fa-copy"></i>
              </button>
            </div>
          </a>
        </div>

        {/* Buy Minecraft Premium Banner (Only visible for non-premium accounts) */}
        <div className="sidebar-buy-mc" id="sidebarBuyMinecraftCard" style={{ display: 'none' }}>
          <a
            href="https://www.minecraft.net/es-es/store/minecraft-java-bedrock-edition-pc"
            target="_blank"
            rel="noreferrer"
            className="buy-mc-sidebar-link"
            id="sidebarBuyMcLink"
            title="Comprar Minecraft Oficial"
            data-i18n-title="sidebar.buy_minecraft_hint"
          >
            <div className="buy-mc-sidebar-icon">
              <img src="img/icon.png" alt="Launcher Icon" className="buy-mc-icon-img" />
            </div>
            <div className="buy-mc-sidebar-content">
              <span className="buy-mc-sidebar-title" data-i18n="sidebar.buy_minecraft_title">
                Comprar Minecraft
              </span>
              <span className="buy-mc-sidebar-subtitle" data-i18n="sidebar.buy_minecraft_subtitle">
                Consigue tu cuenta Premium
              </span>
            </div>
            <i className="fas fa-external-link-alt buy-mc-sidebar-arrow"></i>
          </a>
        </div>

        {/* Discord Link */}
        <div className="sidebar-discord">
          <a href="https://dsc.gg/helloworld-launcher" target="_blank" rel="noreferrer" className="discord-sidebar-link">
            <div className="discord-sidebar-icon">
              <i className="fab fa-discord"></i>
            </div>
            <div className="discord-sidebar-content">
              <span className="discord-sidebar-title" data-i18n="sidebar.discord_title">
                Join Community
              </span>
              <span className="discord-sidebar-subtitle" data-i18n="sidebar.discord_subtitle">
                Get support & updates
              </span>
            </div>
            <i className="fas fa-external-link-alt discord-sidebar-arrow"></i>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
