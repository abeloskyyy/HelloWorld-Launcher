import React from 'react';

export const PlaySection: React.FC = () => {
  const handleLaunchGame = () => {
    const win = window as any;
    if (typeof win.launchGame === 'function') {
      win.launchGame();
    }
  };

  const handleCancelLaunch = () => {
    const win = window as any;
    if (typeof win.cancelLaunch === 'function') {
      win.cancelLaunch();
    }
  };

  const handleSwitchNewsTab = (tab: string, animate?: boolean) => {
    const win = window as any;
    if (typeof win.switchNewsTab === 'function') {
      win.switchNewsTab(tab, animate);
    }
  };

  const handleFilterPatchNotes = (filter: string) => {
    const win = window as any;
    if (typeof win.filterPatchNotes === 'function') {
      win.filterPatchNotes(filter);
    }
  };

  const handlePatchNotesSearch = (val: string) => {
    const win = window as any;
    if (typeof win.onPatchNotesSearchInput === 'function') {
      win.onPatchNotesSearchInput(val);
    }
  };

  return (
    <div id="play" className="section active">
      <h1 data-i18n="sidebar.play">Play</h1>
      <select id="profileSelect" style={{ display: 'none' }}></select>
      <div className="play-section">
        <div className="custom-select" id="customSelect">
          <div className="select-trigger" id="selectTrigger">
            <div className="select-trigger-content">
              <img
                src=""
                alt=""
                className="select-trigger-icon"
                id="selectedIcon"
                style={{ display: 'none' }}
                onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
              />
              <div className="select-trigger-text">
                <div className="select-trigger-title" id="selectedTitle" data-i18n="play.no_installations">
                  No installations found
                </div>
                <div className="select-trigger-subtitle" id="selectedSubtitle" data-i18n="play.create_installation">
                  Create an installation to play
                </div>
              </div>
            </div>
            <div className="select-arrow"></div>
          </div>

          <div className="select-options" id="selectOptions">
            {/* Options will be loaded dynamically here */}
          </div>
        </div>

        <div className="play-action-container" style={{ display: 'flex', width: '100%' }}>
          <button className="play-button" onClick={handleLaunchGame} data-i18n="play.play_btn">
            Play
          </button>
          <button
            className="cancel-launch-button"
            id="cancelLaunchBtn"
            onClick={handleCancelLaunch}
            title="Cancel Launch"
            data-i18n-title="play.cancel_launch"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Minecraft News & Patch Notes Section */}
        <div className="news-patch-section-wrapper">
          {/* Full-Width Tab Header with Sliding Indicator */}
          <div className="news-patch-tabs-container no-servers" id="newsPatchTabsContainer">
            <div id="newsPatchTabIndicator" className="news-patch-tab-indicator tab-news-active"></div>
            <button
              className="news-patch-tab-btn"
              id="tabBtnServers"
              onClick={() => handleSwitchNewsTab('servers', true)}
              style={{ display: 'none' }}
            >
              <i className="fas fa-server" style={{ color: '#10b981' }}></i>
              <span data-i18n="play.servers_tab">Servidores</span>
            </button>
            <button
              className="news-patch-tab-btn active"
              id="tabBtnNews"
              onClick={() => handleSwitchNewsTab('news', true)}
            >
              <i className="fas fa-newspaper" style={{ color: '#4facfe' }}></i>
              <span data-i18n="play.news_tab">Noticias</span>
            </button>
            <button
              className="news-patch-tab-btn"
              id="tabBtnPatchNotes"
              onClick={() => handleSwitchNewsTab('patchnotes', true)}
            >
              <i className="fas fa-scroll" style={{ color: '#a855f7' }}></i>
              <span data-i18n="play.patchnotes_tab">Changelog</span>
            </button>
          </div>

          {/* Sliding Panels Viewport */}
          <div className="news-patch-viewport">
            <div id="newsPatchPanelsSlider" className="news-patch-panels-slider tabs-2">
              {/* Slide 0: Servers (hidden if no active servers) */}
              <div className="news-patch-panel-slide" id="slideFeaturedServers" style={{ display: 'none' }}>
                <div id="featuredServersContainer" className="featured-servers-container">
                  {/* Servers will be populated here by scripts.js */}
                </div>
                <div id="featuredServersPromoBanner" className="featured-servers-promo-banner" style={{ display: 'none' }}>
                  {/* Promo message will be populated dynamically */}
                </div>
              </div>

              {/* Slide 1: News */}
              <div className="news-patch-panel-slide" id="slideNews">
                <div id="minecraftNewsContainer" className="minecraft-news-container">
                  {/* News will be populated here by scripts.js */}
                </div>
              </div>

              {/* Slide 2: Changelog */}
              <div className="news-patch-panel-slide" id="slidePatchNotes">
                <div className="changelog-top-bar">
                  <div className="patch-notes-filters">
                    <button
                      className="patch-filter-btn"
                      id="filterBtnAll"
                      onClick={() => handleFilterPatchNotes('all')}
                      data-i18n="play.filter_all"
                    >
                      Todas
                    </button>
                    <button
                      className="patch-filter-btn active"
                      id="filterBtnRelease"
                      onClick={() => handleFilterPatchNotes('release')}
                      data-i18n="play.filter_releases"
                    >
                      Releases
                    </button>
                    <button
                      className="patch-filter-btn"
                      id="filterBtnSnapshot"
                      onClick={() => handleFilterPatchNotes('snapshot')}
                      data-i18n="play.filter_snapshots"
                    >
                      Snapshots
                    </button>
                  </div>
                  <div className="patch-notes-search-box">
                    <i className="fas fa-search patch-search-icon"></i>
                    <input
                      type="text"
                      id="patchNotesSearchInput"
                      className="patch-search-input"
                      placeholder="Buscar versión..."
                      onInput={(e) => handlePatchNotesSearch((e.target as HTMLInputElement).value)}
                    />
                  </div>
                  <div className="latest-versions-indicator" id="latestVersionsIndicator">
                    <span className="version-badge-pill release" title="Última Release">
                      <i className="fas fa-check-circle"></i> <span data-i18n="play.latest_release">Release:</span>{' '}
                      <b id="latestReleaseVer">...</b>
                    </span>
                    <span className="version-badge-pill snapshot" title="Última Snapshot">
                      <i className="fas fa-flask"></i> <span data-i18n="play.latest_snapshot">Snapshot:</span>{' '}
                      <b id="latestSnapshotVer">...</b>
                    </span>
                  </div>
                </div>
                <div id="minecraftPatchNotesContainer" className="minecraft-patchnotes-container">
                  {/* Patch notes will be populated here by scripts.js */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaySection;
