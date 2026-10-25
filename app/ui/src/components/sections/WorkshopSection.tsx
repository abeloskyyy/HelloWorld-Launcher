import React, { useState, useEffect } from 'react';

const renderCardSkeletons = (count = 4) => {
  return Array.from({ length: count }).map((_, i) => (
    <div key={i} className="wk-card wk-card-skeleton">
      <div className="wk-card-header">
        <div className="wk-card-icon wk-skeleton-shimmer"></div>
        <div className="wk-card-title-wrap">
          <div className="wk-skeleton-shimmer" style={{ height: '16px', width: '68%', borderRadius: '6px', marginBottom: '6px' }}></div>
          <div className="wk-skeleton-shimmer" style={{ height: '12px', width: '42%', borderRadius: '4px' }}></div>
        </div>
        <div className="wk-skeleton-shimmer" style={{ height: '20px', width: '38px', borderRadius: '12px', marginLeft: 'auto' }}></div>
      </div>
      <div className="wk-card-desc" style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center', minHeight: '58px', maxHeight: '58px' }}>
        <div className="wk-skeleton-shimmer" style={{ height: '12px', width: '100%', borderRadius: '4px' }}></div>
        <div className="wk-skeleton-shimmer" style={{ height: '12px', width: '85%', borderRadius: '4px' }}></div>
        <div className="wk-skeleton-shimmer" style={{ height: '12px', width: '45%', borderRadius: '4px' }}></div>
      </div>
      <div className="wk-card-actions">
        <div className="wk-card-actions-row">
          <div className="wk-skeleton-shimmer" style={{ height: '34px', width: '100%', borderRadius: '8px' }}></div>
        </div>
        <div className="wk-card-actions-row">
          <div className="wk-skeleton-shimmer" style={{ height: '34px', flex: 1, borderRadius: '8px' }}></div>
          <div className="wk-skeleton-shimmer" style={{ height: '34px', width: '38px', borderRadius: '8px', flexShrink: 0 }}></div>
        </div>
      </div>
    </div>
  ));
};

export const WorkshopSection: React.FC = () => {
  const [accStates, setAccStates] = useState(() => ({
    wkMyBody: typeof window !== 'undefined' ? localStorage.getItem('wk_acc_wkMyBody') === 'open' : false,
    wkOfficialBody: typeof window !== 'undefined' ? localStorage.getItem('wk_acc_wkOfficialBody') !== 'closed' : true,
    wkCommunityBody: typeof window !== 'undefined' ? localStorage.getItem('wk_acc_wkCommunityBody') !== 'closed' : true,
    wkModrinthBody: typeof window !== 'undefined' ? localStorage.getItem('wk_acc_wkModrinthBody') !== 'closed' : true,
  }));

  useEffect(() => {
    const win = window as any;
    const triggerInit = () => {
      if (typeof win.initWorkshop === 'function') {
        win.initWorkshop();
      }
    };
    triggerInit();
    const handleSection = (e: any) => {
      if (e.detail && e.detail.section === 'workshop') {
        triggerInit();
      }
    };
    window.addEventListener('section-changed', handleSection);
    return () => window.removeEventListener('section-changed', handleSection);
  }, []);

  const handleOpenWkCreateModal = () => {
    const win = window as any;
    if (typeof win.openWkCreateModal === 'function') {
      win.openWkCreateModal();
    }
  };

  const handleSwitchWorkshopTab = (tab: string) => {
    const win = window as any;
    if (typeof win.switchWorkshopTab === 'function') {
      win.switchWorkshopTab(tab);
    }
  };

  const handleToggleWkAccordion = (id: string) => {
    setAccStates(prev => {
      const nextVal = !(prev as any)[id];
      const next = { ...prev, [id]: nextVal };
      try {
        localStorage.setItem('wk_acc_' + id, nextVal ? 'open' : 'closed');
      } catch (_) {}
      return next;
    });
    const win = window as any;
    if (typeof win.toggleWkAccordion === 'function') {
      win.toggleWkAccordion(id);
    }
  };

  const handleFilterCommunity = () => {
    const win = window as any;
    if (typeof win.filterAndSortCommunityModPacks === 'function') {
      win.filterAndSortCommunityModPacks();
    }
  };

  const handleToggleWkSortMenu = (e: React.MouseEvent) => {
    const win = window as any;
    if (typeof win.toggleWkSortMenu === 'function') {
      win.toggleWkSortMenu(e.nativeEvent);
    }
  };

  const handleSelectWkSort = (val: string, label: string, e: React.MouseEvent) => {
    const win = window as any;
    if (typeof win.selectWkSort === 'function') {
      win.selectWkSort(val, label, e.nativeEvent);
    }
  };

  const handleFilterWkAdmin = (filter: string) => {
    const win = window as any;
    if (typeof win.filterWkAdminItems === 'function') {
      win.filterWkAdminItems(filter);
    }
  };

  return (
    <>
      {/* Workshop Section */}
      <div id="workshop" className="section">
        <div className="workshop-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <h1 style={{ margin: 0 }} data-i18n="sidebar.workshop">
                Workshop
              </h1>
              <button
                className="wk-header-plus-btn"
                id="wkPublishBtn"
                onClick={handleOpenWkCreateModal}
                title="Create Workshop Item"
                data-i18n-title="workshop.create_item_tooltip"
              >
                <i className="fas fa-plus"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="workshop-tabs">
          <button
            className="workshop-tab-btn active"
            data-tab="modpacks"
            onClick={() => handleSwitchWorkshopTab('modpacks')}
            data-i18n="workshop.tabs.modpacks"
          >
            <i className="fas fa-cubes"></i> Mod Packs
          </button>
          <button
            className="workshop-tab-btn workshop-tab-disabled"
            data-tab="themes"
            title="Coming soon"
            data-i18n-title="workshop.themes_soon"
          >
            <i className="fas fa-palette"></i> <span data-i18n="workshop.tabs.themes">Themes</span>{' '}
            <span className="wk-soon-badge" data-i18n="workshop.soon">
              Soon
            </span>
          </button>
          <button
            className="workshop-tab-btn"
            data-tab="admin"
            id="wkAdminTabBtn"
            style={{ display: 'none' }}
            onClick={() => handleSwitchWorkshopTab('admin')}
            data-i18n="workshop.tabs.admin"
          >
            <i className="fas fa-shield-alt"></i> Moderation
          </button>
        </div>

        {/* Mod Packs Panel */}
        <div className="workshop-tab-panel" data-panel="modpacks" style={{ display: 'block' }}>
          {/* My Items (pending/denied) */}
          <div id="wkMyItemsSection" style={{ display: 'none', marginBottom: '16px' }}>
            <div className="wk-accordion-header" data-accordion="wkMyBody" onClick={() => handleToggleWkAccordion('wkMyBody')}>
              <div className="wk-accordion-label">
                <i className="fas fa-user-clock"></i>
                <span data-i18n="workshop.my_items">My Submissions</span>
              </div>
              <i className="fas fa-chevron-down wk-accordion-arrow" style={{ transform: accStates.wkMyBody ? 'rotate(180deg)' : 'rotate(0deg)' }}></i>
            </div>
            <div className={`wk-accordion-body ${accStates.wkMyBody ? 'open' : ''}`} id="wkMyBody">
              <div>
                <div className="wk-grid" id="wkMyItemsGrid"></div>
              </div>
            </div>
          </div>

          {/* Official Mod Packs */}
          <div className="wk-accordion-header" data-accordion="wkOfficialBody" onClick={() => handleToggleWkAccordion('wkOfficialBody')}>
            <div className="wk-accordion-label">
              <i className="fas fa-star"></i>
              <span data-i18n="workshop.official_modpacks">Official Mod Packs</span>
              <span className="wk-official-badge" data-i18n="workshop.official_badge">
                By HelloWorld
              </span>
            </div>
            <i className="fas fa-chevron-down wk-accordion-arrow" style={{ transform: accStates.wkOfficialBody ? 'rotate(180deg)' : 'rotate(0deg)' }}></i>
          </div>
          <div className={`wk-accordion-body ${accStates.wkOfficialBody ? 'open' : ''}`} id="wkOfficialBody">
            <div>
              <div className="wk-grid" id="wkOfficialGrid">
                {renderCardSkeletons(2)}
              </div>
            </div>
          </div>

          {/* Community Mod Packs */}
          <div
            className="wk-accordion-header"
            data-accordion="wkCommunityBody"
            onClick={() => handleToggleWkAccordion('wkCommunityBody')}
            style={{ marginTop: '16px' }}
          >
            <div className="wk-accordion-label">
              <i className="fas fa-users"></i>
              <span data-i18n="workshop.community_modpacks">Community Mod Packs</span>
            </div>
            <i className="fas fa-chevron-down wk-accordion-arrow" style={{ transform: accStates.wkCommunityBody ? 'rotate(180deg)' : 'rotate(0deg)' }}></i>
          </div>
          <div className={`wk-accordion-body ${accStates.wkCommunityBody ? 'open' : ''}`} id="wkCommunityBody" style={{ position: 'relative' }}>
            <div>
              {/* Lock overlay for non-online users */}
              <div id="wkCommunityLock" className="wk-community-lock" style={{ display: 'none' }}>
                <i className="fas fa-lock"></i>
                <p data-i18n="workshop.community_lock">
                  Sign in with a HelloWorld or Microsoft account to browse &amp; install community mod packs
                </p>
              </div>
              <div
                className="wk-community-controls"
                style={{
                  display: 'flex',
                  gap: '12px',
                  marginBottom: '12px',
                  marginTop: 0,
                  alignItems: 'center',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                  <i
                    className="fas fa-search"
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#7a8299',
                      pointerEvents: 'none',
                      zIndex: 3
                    }}
                  ></i>
                  <input
                    type="text"
                    id="wkCommunitySearchInput"
                    placeholder="Search community modpacks, versions, addons..."
                    data-i18n-placeholder="workshop.community_search"
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      position: 'relative',
                      zIndex: 2,
                      pointerEvents: 'auto',
                      userSelect: 'text',
                      WebkitUserSelect: 'text'
                    }}
                    onInput={handleFilterCommunity}
                    onClick={(e) => (e.currentTarget as HTMLInputElement).focus()}
                    onMouseDown={(e) => (e.currentTarget as HTMLInputElement).focus()}
                  />
                </div>
                <div className="wk-custom-sort-wrap" style={{ position: 'relative', userSelect: 'none' }}>
                  <input type="hidden" id="wkCommunitySortSelect" defaultValue="newest" />
                  <div className="wk-custom-sort-btn" onClick={handleToggleWkSortMenu}>
                    <i className="fas fa-sort-amount-down" style={{ color: '#4facfe' }}></i>
                    <span id="wkSortLabel" data-i18n="workshop.sort.newest">
                      Newest
                    </span>
                    <i className="fas fa-chevron-down wk-sort-arrow"></i>
                  </div>
                  <div className="wk-custom-sort-menu" id="wkSortMenu">
                    <div
                      className="wk-sort-item active"
                      data-val="newest"
                      onClick={(e) => handleSelectWkSort('newest', 'Newest', e)}
                      data-i18n="workshop.sort.newest"
                    >
                      <i className="fas fa-sparkles"></i> Newest
                    </div>
                    <div
                      className="wk-sort-item"
                      data-val="oldest"
                      onClick={(e) => handleSelectWkSort('oldest', 'Oldest', e)}
                      data-i18n="workshop.sort.oldest"
                    >
                      <i className="fas fa-history"></i> Oldest
                    </div>
                    <div className="wk-sort-divider"></div>
                    <div
                      className="wk-sort-item"
                      data-val="downloads_desc"
                      onClick={(e) => handleSelectWkSort('downloads_desc', 'Most Downloads', e)}
                      data-i18n="workshop.sort.downloads_desc"
                    >
                      <i className="fas fa-download" style={{ color: '#4facfe' }}></i> Most Downloads
                    </div>
                    <div
                      className="wk-sort-item"
                      data-val="downloads_asc"
                      onClick={(e) => handleSelectWkSort('downloads_asc', 'Least Downloads', e)}
                      data-i18n="workshop.sort.downloads_asc"
                    >
                      <i className="fas fa-download" style={{ opacity: 0.4 }}></i> Least Downloads
                    </div>
                    <div className="wk-sort-divider"></div>
                    <div
                      className="wk-sort-item"
                      data-val="likes_desc"
                      onClick={(e) => handleSelectWkSort('likes_desc', 'Most Likes', e)}
                      data-i18n="workshop.sort.likes_desc"
                    >
                      <i className="fas fa-heart" style={{ color: '#ff5252' }}></i> Most Likes
                    </div>
                    <div
                      className="wk-sort-item"
                      data-val="likes_asc"
                      onClick={(e) => handleSelectWkSort('likes_asc', 'Least Likes', e)}
                      data-i18n="workshop.sort.likes_asc"
                    >
                      <i className="fas fa-heart" style={{ opacity: 0.4 }}></i> Least Likes
                    </div>
                    <div className="wk-sort-divider"></div>
                    <div
                      className="wk-sort-item"
                      data-val="views_desc"
                      onClick={(e) => handleSelectWkSort('views_desc', 'Most Views', e)}
                      data-i18n="workshop.sort.views_desc"
                    >
                      <i className="fas fa-eye" style={{ color: '#00e676' }}></i> Most Views
                    </div>
                    <div
                      className="wk-sort-item"
                      data-val="views_asc"
                      onClick={(e) => handleSelectWkSort('views_asc', 'Least Views', e)}
                      data-i18n="workshop.sort.views_asc"
                    >
                      <i className="fas fa-eye" style={{ opacity: 0.4 }}></i> Least Views
                    </div>
                  </div>
                </div>
              </div>
              <div className="wk-grid" id="wkCommunityGrid">
                {renderCardSkeletons(4)}
              </div>
            </div>
          </div>

          {/* Modrinth Mod Packs */}
          <div
            className="wk-accordion-header"
            data-accordion="wkModrinthBody"
            onClick={() => handleToggleWkAccordion('wkModrinthBody')}
            style={{ marginTop: '16px' }}
          >
            <div className="wk-accordion-label">
              <i className="fas fa-boxes"></i>
              <span data-i18n="workshop.modrinth.title">Modrinth Mod Packs</span>
              <span
                className="wk-official-badge"
                data-i18n="workshop.modrinth.badge"
                style={{
                  background: 'rgba(30, 215, 96, 0.2)',
                  color: '#1ed760',
                  border: '1px solid rgba(30, 215, 96, 0.4)'
                }}
              >
                Modrinth API
              </span>
            </div>
            <i className="fas fa-chevron-down wk-accordion-arrow" style={{ transform: accStates.wkModrinthBody ? 'rotate(180deg)' : 'rotate(0deg)' }}></i>
          </div>
          <div className={`wk-accordion-body ${accStates.wkModrinthBody ? 'open' : ''}`} id="wkModrinthBody" style={{ position: 'relative' }}>
            <div>
              <div style={{ marginBottom: '16px', marginTop: '4px' }}>
                <input
                  type="text"
                  id="wkModrinthSearchInput"
                  className="mod-search-bar"
                  placeholder="Search Modrinth modpacks..."
                  data-i18n-placeholder="workshop.modrinth.search"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff'
                  }}
                />
              </div>
              <div id="wkModrinthLoading" className="wk-loading" style={{ display: 'none' }}>
                <div className="wk-spinner"></div>
                <span data-i18n="workshop.modrinth.searching">Searching Modrinth...</span>
              </div>
              <div className="wk-grid" id="wkModrinthGrid"></div>
              <div id="wkModrinthSentinel" style={{ height: '20px', width: '100%', marginTop: '20px' }}></div>
              <div id="wkModrinthMoreLoading" className="wk-loading" style={{ display: 'none', padding: '16px 0' }}>
                <div className="wk-spinner"></div>
                <span data-i18n="workshop.modrinth.loading_more">Loading more modpacks...</span>
              </div>
            </div>
          </div>
        </div>

        {/* Themes Panel */}
        <div className="workshop-tab-panel" data-panel="themes" style={{ display: 'none' }}>
          <div className="wk-empty" style={{ marginTop: '60px' }}>
            <i className="fas fa-palette" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}></i>
            <p data-i18n="workshop.themes_soon">Themes are coming soon!</p>
          </div>
        </div>

        {/* Admin Panel */}
        <div className="workshop-tab-panel" data-panel="admin" style={{ display: 'none' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: '#ffaa00', fontWeight: 600 }}>
              <i className="fas fa-shield-alt"></i> <span data-i18n="workshop.admin.panel_title">Moderation Panel:</span>
            </span>
            <button
              className="wk-admin-filter-btn active"
              data-filter="pnd"
              onClick={() => handleFilterWkAdmin('pnd')}
              data-i18n="workshop.admin.pending"
            >
              Pending (Review)
            </button>
            <button
              className="wk-admin-filter-btn"
              data-filter="njt"
              onClick={() => handleFilterWkAdmin('njt')}
              data-i18n="workshop.admin.denied"
            >
              Denied
            </button>
            <button
              className="wk-admin-filter-btn"
              data-filter="pub"
              onClick={() => handleFilterWkAdmin('pub')}
              data-i18n="workshop.admin.approved"
            >
              Approved
            </button>
            <button
              className="wk-admin-filter-btn"
              data-filter="all"
              onClick={() => handleFilterWkAdmin('all')}
              data-i18n="workshop.admin.all"
            >
              All
            </button>
          </div>
          <div className="wk-grid" id="wkAdminGrid">
            <div className="wk-loading">
              <div className="wk-spinner"></div>
              <span data-i18n="workshop.admin.loading">Loading admin items...</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default WorkshopSection;
