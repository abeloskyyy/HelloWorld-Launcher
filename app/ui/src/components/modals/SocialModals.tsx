import React from 'react';

export const SocialModals: React.FC = () => {
  return (
    <>
      {/* Social Modal */}
      <div id="socialModal" className="modal social-modal-overlay">
        <div className="social-modal-content">
          <button className="social-close-btn" id="closeSocialModal" title="Close" data-i18n-title="global.close">
            <i className="fas fa-times"></i>
          </button>
          <div className="social-modal-inner">
            {/* Main Panel */}
            <div className="social-panel-main" id="socialPanelMain">
              <div className="social-modal-title">
                <i className="fas fa-user-friends"></i> <span data-i18n="social.title">Social</span>
              </div>
              <div className="social-tabs-nav">
                <button className="social-tab-btn active" data-tab="friends">
                  <i className="fas fa-user-friends"></i> <span data-i18n="social.friends">Friends</span>
                </button>
                <button className="social-tab-btn" data-tab="add">
                  <i className="fas fa-user-plus"></i> <span data-i18n="social.add">Add</span>
                </button>
                <button className="social-tab-btn" data-tab="requests">
                  <i className="fas fa-envelope"></i> <span data-i18n="social.requests">Requests</span>
                  <span id="requestsTabBadge" className="tab-count-badge" style={{ display: 'none' }}>
                    0
                  </span>
                </button>
              </div>

              {/* Tab: Friends */}
              <div id="socialTabFriends" className="social-tab-content active">
                <div id="socialOfflineMsg" className="social-offline-msg" style={{ display: 'none' }}>
                  <i className="fas fa-wifi"></i>
                  <p data-i18n="social.req_account">
                    Social features require a <strong>HelloWorld</strong> or <strong>Premium</strong> account.
                  </p>
                </div>
                <div id="friendsListContainer">
                  <div id="friendsList" className="social-user-list">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="social-user-item social-user-skeleton">
                        <div className="social-item-avatar wk-skeleton-shimmer" style={{ border: 'none' }}></div>
                        <div className="social-item-info" style={{ gap: '6px' }}>
                          <div className="wk-skeleton-shimmer" style={{ height: '14px', width: `${45 + (i % 3) * 15}%`, borderRadius: '4px' }}></div>
                          <div className="wk-skeleton-shimmer" style={{ height: '11px', width: `${30 + (i % 2) * 15}%`, borderRadius: '4px' }}></div>
                        </div>
                        <div className="social-item-actions" style={{ display: 'flex', gap: '6px' }}>
                          <div className="wk-skeleton-shimmer" style={{ width: '28px', height: '28px', borderRadius: '6px' }}></div>
                          <div className="wk-skeleton-shimmer" style={{ width: '28px', height: '28px', borderRadius: '6px' }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div id="blockedSection" style={{ display: 'none' }}>
                    <button className="social-section-toggle" id="blockedToggleBtn">
                      <i className="fas fa-ban"></i> <span data-i18n="social.blocked">Blocked</span>{' '}
                      <span id="blockedCount" className="tab-count-badge">
                        0
                      </span>
                      <i className="fas fa-chevron-down" id="blockedChevron" style={{ marginLeft: 'auto', transition: 'transform 0.2s' }}></i>
                    </button>
                    <div id="blockedList" className="social-user-list" style={{ display: 'none' }}></div>
                  </div>
                </div>
                <div id="friendsLoading" className="social-loading" style={{ display: 'none' }}>
                  <div className="spinner"></div>
                </div>
              </div>

              {/* Tab: Add Friend */}
              <div id="socialTabAdd" className="social-tab-content">
                <div className="social-search-form">
                  <input
                    type="text"
                    id="searchUserInput"
                    className="social-search-input"
                    placeholder="Search by username..."
                    data-i18n="social.search_placeholder"
                    maxLength={32}
                  />
                  <button id="searchUserBtn" className="social-search-btn">
                    <i className="fas fa-search"></i>
                  </button>
                </div>
                <div id="searchUserStatus" className="social-status-msg" style={{ display: 'none' }}></div>
                <div id="searchUserResults" className="social-user-list" style={{ marginTop: '8px' }}></div>
                <div id="searchLoading" className="social-loading" style={{ display: 'none' }}>
                  <div className="spinner"></div>
                </div>
              </div>

              {/* Tab: Requests */}
              <div id="socialTabRequests" className="social-tab-content">
                <div className="requests-subtabs">
                  <button className="req-subtab active" data-subtab="received">
                    <span data-i18n="social.received">Received</span>{' '}
                    <span id="reqReceivedCount" className="tab-count-badge" style={{ display: 'none' }}>
                      0
                    </span>
                  </button>
                  <button className="req-subtab" data-subtab="sent" data-i18n="social.sent">
                    Sent
                  </button>
                </div>
                <div id="reqReceivedList" className="social-user-list"></div>
                <div id="reqSentList" className="social-user-list" style={{ display: 'none' }}></div>
                <div id="requestsLoading" className="social-loading" style={{ display: 'none' }}>
                  <div className="spinner"></div>
                </div>
              </div>
            </div>

            {/* Resize Handle */}
            <div className="social-resize-handle" id="socialResizeHandle"></div>

            {/* Inbox Panel */}
            <div className="social-panel-chat" id="socialPanelInbox" style={{ display: 'none', position: 'relative' }}>
              <div
                className="chat-header inbox-header"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  padding: '0 60px 0 20px',
                  height: '50px',
                  minHeight: '50px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <i className="fas fa-inbox" style={{ color: '#4facfe', fontSize: '16px', flexShrink: 0 }}></i>
                  <h3
                    style={{
                      margin: 0,
                      color: '#fff',
                      fontSize: '16px',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                    data-i18n="social.inbox"
                  >
                    Inbox
                  </h3>
                </div>
              </div>
              <div className="inbox-subtabs-bar">
                <div className="inbox-segmented-control">
                  <button
                    id="inboxTabReceived"
                    className="inbox-tab-btn active"
                    onClick={() => {
                      const win = window as any;
                      if (win.switchInboxTab) win.switchInboxTab('received');
                    }}
                  >
                    <i className="fas fa-inbox"></i>
                    <span data-i18n="social.inbox_received">Recibidos</span>
                  </button>
                  <button
                    id="inboxTabSent"
                    className="inbox-tab-btn"
                    onClick={() => {
                      const win = window as any;
                      if (win.switchInboxTab) win.switchInboxTab('sent');
                    }}
                  >
                    <i className="fas fa-paper-plane"></i>
                    <span data-i18n="social.inbox_sent">Enviados</span>
                  </button>
                </div>
              </div>
              <div className="chat-messages" id="inboxMessages">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="inbox-item social-inbox-skeleton" style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
                      <div className="wk-skeleton-shimmer" style={{ height: '15px', width: `${100 + (i % 3) * 25}px`, borderRadius: '4px' }}></div>
                      <div className="wk-skeleton-shimmer" style={{ height: '11px', width: '45px', borderRadius: '4px' }}></div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div className="wk-skeleton-shimmer" style={{ height: '13px', width: `${85 + (i % 2) * 10}%`, borderRadius: '4px' }}></div>
                      <div className="wk-skeleton-shimmer" style={{ height: '13px', width: `${45 + (i % 3) * 18}%`, borderRadius: '4px' }}></div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Floating Action Button for Broadcast / Compose */}
              <button
                id="inboxBroadcastBtn"
                className="btn-modal-primary inbox-compose-btn"
                onClick={() => {
                  const win = window as any;
                  if (win.openBroadcastModal) win.openBroadcastModal();
                }}
                title="Send Message"
                data-i18n-title="social.send_message"
              >
                <i className="fas fa-plus"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Broadcast Modal */}
      <div id="broadcastModal" className="modal">
        <div
          className="modal-content"
          style={{
            maxWidth: '440px',
            padding: '24px',
            position: 'relative',
            background: 'rgba(30, 35, 45, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}
        >
          <button
            id="cancelBroadcastBtn"
            data-i18n-title="social.cancel_btn"
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(255,255,255,0.05)',
              border: 'none',
              color: '#b0b8c6',
              fontSize: '16px',
              width: '32px',
              height: '32px',
              padding: 0,
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
          >
            <i className="fas fa-times"></i>
          </button>
          <h2 id="broadcastTitle" data-i18n="social.send_message" style={{ marginTop: 0, fontSize: '20px', fontWeight: 600, color: '#fff' }}>
            Send Message
          </h2>

          {/* Step 1: Select Friends */}
          <div id="broadcastStep1">
            <p style={{ color: '#9ca3af', marginBottom: '16px', fontSize: '14px' }} data-i18n="social.select_friends">
              Select friends to send to (Max 10):
            </p>
            <div
              id="broadcastFriendsList"
              className="social-user-list"
              style={{
                maxHeight: '280px',
                background: 'rgba(0,0,0,0.25)',
                borderRadius: '10px',
                padding: '10px',
                border: '1px solid rgba(255,255,255,0.05)'
              }}
            ></div>
            <div className="modal-buttons" style={{ marginTop: '24px', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-primary"
                id="nextBroadcastBtn"
                data-i18n="social.next_btn"
                disabled
                style={{ borderRadius: '8px', padding: '10px 24px', fontWeight: 600 }}
              >
                Next
              </button>
            </div>
          </div>

          {/* Step 2: Select Content Type */}
          <div id="broadcastStep2" style={{ display: 'none' }}>
            <p style={{ color: '#b0b8c6', marginBottom: '15px', fontSize: '14px' }} data-i18n="social.select_content_type">
              What do you want to share?
            </p>
            <div className="chat-input-area" style={{ padding: 0, background: 'transparent', border: 'none' }}>
              <div className="chat-buttons-grid">
                <button className="chat-grid-btn chat-btn-installation" data-type="installation">
                  <i className="fas fa-download"></i>
                  <span data-i18n="social.installation">Installation</span>
                </button>
                <button className="chat-grid-btn chat-btn-seed" data-type="seed">
                  <i className="fas fa-seedling"></i>
                  <span data-i18n="social.seed">Seed</span>
                </button>
                <button className="chat-grid-btn chat-btn-server" data-type="server">
                  <i className="fas fa-server"></i>
                  <span data-i18n="social.server_invite">Server Invite</span>
                </button>
                <button className="chat-grid-btn chat-btn-link" data-type="link">
                  <i className="fas fa-link"></i>
                  <span data-i18n="social.link">Link</span>
                </button>
              </div>
            </div>
            <div className="modal-buttons" style={{ marginTop: '20px' }}>
              <button className="btn btn-secondary" id="backBroadcastBtn" data-i18n="tutorial.back">
                Back
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Share Profile Modal */}
      <div id="shareProfileModal" className="modal">
        <div className="modal-content" style={{ maxWidth: '450px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 style={{ margin: 0, fontSize: '18px' }} data-i18n="installations.share_title">
              Share Installation
            </h2>
          </div>
          <p style={{ color: '#b0b8c6', marginBottom: '15px', fontSize: '14px' }}>
            <span data-i18n="installations.share_instructions">Select an installation to share in the chat.</span>
            <br />
            <span style={{ fontSize: '11px', opacity: 0.8 }} data-i18n="installations.share_icon_note">
              If your installation doesn't have a custom icon, the default icon will be shown.
            </span>
          </p>

          <div
            id="shareProfileList"
            style={{
              maxHeight: '300px',
              overflowY: 'auto',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '8px',
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          ></div>

          <div className="modal-buttons" style={{ marginTop: '20px' }}>
            <button className="btn btn-secondary" id="cancelShareProfileBtn" data-i18n="social.cancel_btn">
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* View Profile Modal */}
      <div id="viewProfileModal" className="modal">
        <div className="modal-content" style={{ maxWidth: '500px', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              padding: '20px 20px 0 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              paddingBottom: '15px'
            }}
          >
            <h2 id="vpHeaderTitle" style={{ margin: 0, fontSize: '18px' }} data-i18n="social.view_installation">
              View Installation
            </h2>
          </div>

          <div className="group-settings-tabs" style={{ display: 'flex', gap: '8px', padding: '15px 20px 0 20px' }}>
            <button className="group-tab-btn active" data-vp-tab="general" style={{ flex: 1 }} data-i18n="social.general">
              General
            </button>
            <button className="group-tab-btn" data-vp-tab="mods" id="vpTabMods" style={{ display: 'none', flex: 1 }} data-i18n="social.mods">
              Mods
            </button>
            <button
              className="group-tab-btn"
              data-vp-tab="resourcepacks"
              id="vpTabResourcePacks"
              style={{ display: 'none', flex: 1 }}
              data-i18n="social.resource_packs"
            >
              Resource Packs
            </button>
            <button
              className="group-tab-btn"
              data-vp-tab="shaders"
              id="vpTabShaders"
              style={{ display: 'none', flex: 1 }}
              data-i18n="social.shaders"
            >
              Shaders
            </button>
          </div>

          <div style={{ padding: '20px', maxHeight: '400px', overflowY: 'auto' }}>
            {/* General Tab */}
            <div id="vpTabContentGeneral" style={{ display: 'block', transition: 'opacity 0.2s ease' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <img
                  id="vpIcon"
                  src="img/icon.png"
                  alt="icon"
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '8px',
                    objectFit: 'cover',
                    imageRendering: 'pixelated',
                    background: 'rgba(0,0,0,0.2)',
                    flexShrink: 0
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h3 id="vpName" style={{ margin: '0 0 4px 0', color: '#fff', fontSize: '26px', lineHeight: 1.2 }} data-i18n="installations.name">
                    Installation Name
                  </h3>
                  <p id="vpVersion" style={{ margin: 0, color: '#b0b8c6', fontSize: '15px' }} data-i18n="installations.version">
                    Version
                  </p>
                  <p id="vpLoader" style={{ margin: '5px 0 0 0', color: '#4facfe', fontSize: '13px', display: 'none' }}></p>
                </div>
              </div>
            </div>

            {/* Mods Tab */}
            <div id="vpTabContentMods" style={{ display: 'none', transition: 'opacity 0.2s ease' }}>
              <div id="vpModsList" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}></div>
            </div>

            {/* Resource Packs Tab */}
            <div id="vpTabContentResourcePacks" style={{ display: 'none', transition: 'opacity 0.2s ease' }}>
              <div id="vpResourcePacksList" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}></div>
            </div>

            {/* Shaders Tab */}
            <div id="vpTabContentShaders" style={{ display: 'none', transition: 'opacity 0.2s ease' }}>
              <div id="vpShadersList" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}></div>
            </div>
          </div>

          <div
            className="modal-buttons"
            style={{
              padding: '20px',
              background: 'rgba(0,0,0,0.2)',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              marginTop: 0
            }}
          >
            <button className="btn btn-secondary" id="closeViewProfileBtn" data-i18n="global.close">
              Close
            </button>
            <button className="btn btn-primary" id="vpInstallBtn">
              <i className="fas fa-download"></i> <span data-i18n="social.profile.install_profile">Install Profile</span>
            </button>
          </div>
        </div>
      </div>

      {/* Install Profile Modal */}
      <div id="installProfileModal" className="modal">
        <div className="modal-content" style={{ maxWidth: '580px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
            <img
              id="ipIconPreview"
              src="img/icon.png"
              alt="Icon"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '8px',
                objectFit: 'cover',
                border: '1px solid rgba(79, 172, 254, 0.3)',
                background: 'rgba(0,0,0,0.2)',
                imageRendering: 'pixelated',
                display: 'none',
                flexShrink: 0
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ margin: 0, fontSize: '18px' }} data-i18n="installations.install_title">
                Install Installation
              </h2>
            </div>
          </div>

          <div className="modal-input-group" style={{ margin: '0 0 15px 0' }}>
            <label htmlFor="ipNameInput" data-i18n="installations.name">
              Installation Name
            </label>
            <input
              type="text"
              id="ipNameInput"
              className="input-text"
              placeholder="Enter installation name"
              data-i18n-placeholder="installations.enter_name"
              maxLength={32}
            />
          </div>

          <div
            className="version-selects-row"
            id="ipModrinthVersionRow"
            style={{ display: 'none', margin: '0 0 15px 0', gap: '14px', alignItems: 'flex-end' }}
          >
            <div className="modal-input-group" style={{ margin: 0, flex: 1, minWidth: 0 }}>
              <label htmlFor="ipSoftwareSelect">
                <span data-i18n="installations.software">Software</span>
                <i
                  className="fa-regular fa-question-circle help-icon"
                  data-tooltip="Choose the software type for this modpack."
                  data-i18n-tooltip="installations.software_modpack_tooltip"
                ></i>
              </label>
              <select id="ipSoftwareSelect" style={{ width: '100%' }}></select>
            </div>
            <div className="modal-input-group" style={{ margin: 0, flex: 1, minWidth: 0 }}>
              <label htmlFor="ipMcVersionSelect">
                <span data-i18n="installations.mc_version">Minecraft Version</span>
                <i
                  className="fa-regular fa-question-circle help-icon"
                  data-tooltip="The Minecraft version this modpack installation will use."
                  data-i18n-tooltip="installations.mc_version_modpack_tooltip"
                ></i>
              </label>
              <select id="ipMcVersionSelect" style={{ width: '100%' }}></select>
            </div>
            <div className="modal-input-group" id="ipLoaderVersionGroup" style={{ margin: 0, flex: 1, minWidth: 0 }}>
              <label htmlFor="ipLoaderVersionSelect">
                <span data-i18n="installations.software_version">Software Version</span>
                <i
                  className="fa-regular fa-question-circle help-icon"
                  data-tooltip="Version of the mod loader."
                  data-i18n-tooltip="installations.software_version_tooltip"
                ></i>
              </label>
              <select id="ipLoaderVersionSelect" style={{ width: '100%' }} disabled>
                <option value="" data-i18n="social.select_loader">
                  Select a loader...
                </option>
              </select>
            </div>
          </div>

          {/* Compatibility Status Box */}
          <div
            id="ipCompatibilityBox"
            style={{
              display: 'none',
              margin: '0 0 15px 0',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '12px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', color: '#fff' }}>
                <i className="fas fa-shield-alt" style={{ color: '#4facfe' }}></i>
                <span data-i18n="installations.compat_check">Compatibility Check</span>
              </span>
              <span id="ipCompatSpinner" style={{ display: 'none', fontSize: '12px', color: '#aaa' }}>
                <i className="fas fa-spinner fa-spin"></i>{' '}
                <span data-i18n="installations.compat_checking">Checking Modrinth...</span>
              </span>
            </div>

            <div id="ipCompatBadges" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
              <div id="ipCompatBadgeOk" className="compat-badge compat-badge-ok">
                <i className="fas fa-check-circle"></i> <span id="ipCompatCountOk">0</span>{' '}
                <span data-i18n="installations.compat_count">compatible</span>
              </div>
              <div id="ipCompatBadgeAuto" className="compat-badge compat-badge-auto" style={{ display: 'none' }}>
                <i className="fas fa-puzzle-piece"></i> <span id="ipCompatCountAuto">0</span>{' '}
                <span data-i18n="installations.compat_auto_added">auto-added</span>
              </div>
              <div id="ipCompatBadgeErr" className="compat-badge compat-badge-err" style={{ display: 'none' }}>
                <i className="fas fa-exclamation-triangle"></i> <span id="ipCompatCountErr">0</span>{' '}
                <span data-i18n="installations.compat_incompatible">incompatible</span>
              </div>
            </div>

            <div id="ipCompatIncompatibleListWrap" style={{ display: 'none' }}>
              <button type="button" id="ipCompatToggleIncompatBtn" className="compat-toggle-btn">
                <span>
                  <i className="fas fa-ban" style={{ color: '#ff5252' }}></i>{' '}
                  <span data-i18n="installations.compat_view_incompatible">View Incompatible Mods</span>
                </span>
                <i className="fas fa-chevron-down toggle-arrow"></i>
              </button>
              <div id="ipCompatIncompatibleList" className="compat-incompat-list" style={{ display: 'none' }}></div>
            </div>
          </div>

          <div className="modal-input-group" style={{ margin: '0 0 15px 0' }}>
            <label htmlFor="ipDirInput" data-i18n="installations.game_directory">
              Game Directory
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                id="ipDirInput"
                className="input-text"
                placeholder="Default directory"
                data-i18n-placeholder="installations.default_dir"
                style={{ flex: 1 }}
              />
              <button type="button" id="ipDirBtn" className="btn-square">
                <i className="fas fa-folder-open"></i>
              </button>
            </div>
          </div>

          <div className="modal-input-group" style={{ margin: '0 0 15px 0' }}>
            <label htmlFor="ipJavaInput">
              <span data-i18n="installations.java_path">Java Executable Path</span>
              <i
                className="fa-regular fa-question-circle help-icon"
                data-tooltip="Custom Java version (javaw.exe). Leave empty to use default."
                data-i18n-tooltip="installations.java_path_tooltip"
              ></i>
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                id="ipJavaInput"
                className="input-text"
                placeholder="Default (Auto-detected)"
                data-i18n-placeholder="installations.default_java"
                style={{ flex: 1 }}
              />
              <button type="button" id="ipJavaBtn" className="btn-square">
                <i className="fas fa-file-code"></i>
              </button>
            </div>
          </div>

          <div className="modal-input-group" style={{ margin: '0 0 20px 0' }}>
            <label htmlFor="ipJvmInput" data-i18n="installations.jvm_args_optional">
              JVM Arguments (Optional)
            </label>
            <input type="text" id="ipJvmInput" className="input-text" placeholder="-Xmx2G ..." />
          </div>

          <div
            className="modal-buttons"
            style={{ marginTop: '24px', display: 'flex', gap: '10px', justifyContent: 'flex-end', alignItems: 'center' }}
          >
            <button className="btn btn-secondary" id="cancelInstallProfileBtn" data-i18n="social.cancel_btn">
              Cancel
            </button>
            <button
              className="btn btn-secondary hidden"
              id="confirmInstallAllBtn"
              style={{ display: 'none !important' }}
              data-i18n="installations.install_all"
            >
              Install All (Force)
            </button>
            <button className="btn btn-primary" id="confirmInstallProfileBtn" data-i18n="social.install">
              Install
            </button>
          </div>
        </div>
      </div>

      {/* Group Settings Modal */}
      <div id="groupSettingsModal" className="modal">
        <div
          className="modal-content group-settings-modal"
          style={{ maxWidth: '440px', padding: '20px', display: 'flex', flexDirection: 'column', maxHeight: '85vh', minHeight: '520px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 style={{ margin: 0, fontSize: '18px' }} data-i18n="social.group_settings">
              Group Settings
            </h2>
            <button id="closeGroupSettingsBtn" style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '18px' }}>
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div
            className="group-settings-tabs"
            style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '15px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              paddingBottom: '10px'
            }}
          >
            <button className="group-tab-btn active" data-tab="info" style={{ flex: 1 }} data-i18n="social.info">
              Info
            </button>
            <button className="group-tab-btn" data-tab="members" style={{ flex: 1 }} data-i18n="social.members">
              Members
            </button>
          </div>

          <div id="groupTabInfo" className="group-tab-content active" style={{ overflowY: 'auto', transition: 'opacity 0.2s ease' }}>
            <div className="modal-input-group" style={{ alignItems: 'center', margin: '10px 0 20px 0' }}>
              <div
                className="icon-selector"
                id="editGroupIconSelector"
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  background: 'rgba(79,172,254,0.1)',
                  border: '2px dashed rgba(79,172,254,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                <img id="editGroupIconPreview" src="" alt="icon" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'none' }} />
                <i id="editGroupIconPlaceholder" className="fas fa-camera" style={{ fontSize: '30px', color: 'rgba(79,172,254,0.5)' }}></i>
                <div
                  className="icon-selector-overlay"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    transition: 'opacity 0.2s'
                  }}
                >
                  <i className="fas fa-upload" style={{ color: 'white' }}></i>
                </div>
              </div>
              <input type="file" id="editGroupImageInput" accept="image/png, image/jpeg, image/webp" style={{ display: 'none' }} />
            </div>
            <div className="modal-input-group" style={{ margin: '0 0 15px 0' }}>
              <label htmlFor="editGroupNameInput" data-i18n="social.group_name">
                Group Name
              </label>
              <input
                type="text"
                id="editGroupNameInput"
                className="input-text"
                placeholder="Enter group name"
                data-i18n-placeholder="social.enter_group_name"
                maxLength={32}
              />
            </div>
            <div className="modal-input-group" style={{ margin: '0 0 20px 0' }}>
              <label htmlFor="editGroupDescInput" data-i18n="workshop.create.desc_label">
                Description
              </label>
              <input
                type="text"
                id="editGroupDescInput"
                className="input-text"
                placeholder="What's this group about?"
                data-i18n-placeholder="social.enter_group_desc"
                maxLength={100}
              />
            </div>
            <button id="saveGroupInfoBtn" className="btn btn-primary" style={{ width: '100%' }} data-i18n="global.save_changes">
              Save Changes
            </button>
          </div>

          <div
            id="groupTabMembers"
            className="group-tab-content"
            style={{ display: 'none', overflowY: 'auto', flex: 1, transition: 'opacity 0.2s ease' }}
          >
            <div id="groupMembersList" className="social-user-list" style={{ maxHeight: 'none' }}></div>
            <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ color: '#b0b8c6', marginBottom: '10px', fontSize: '14px', fontWeight: 600 }}>
                <i className="fas fa-user-plus"></i> <span data-i18n="social.add_members">Add Members</span>
              </p>
              <div
                id="addMembersList"
                className="social-user-list"
                style={{ maxHeight: '200px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '8px' }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* User Profile View Modal */}
      <div id="userProfileModal" className="modal">
        <div
          className="modal-content"
          style={{
            maxWidth: '500px',
            padding: 0,
            background: 'rgba(20,20,25,0.98)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            maxHeight: '85vh',
            overflowY: 'auto'
          }}
        >
          <button
            className="modal-close-btn"
            id="closeUserProfileModal"
            style={{
              position: 'absolute',
              top: '15px',
              right: '15px',
              background: 'rgba(0,0,0,0.5)',
              border: 'none',
              color: 'white',
              width: '32px',
              height: '32px',
              padding: 0,
              borderRadius: '50%',
              cursor: 'pointer',
              zIndex: 10
            }}
          >
            <i className="fas fa-times"></i>
          </button>

          <div
            id="profileLoadingSpinner"
            style={{
              display: 'none',
              position: 'absolute',
              inset: 0,
              background: 'rgb(20,20,25)',
              borderRadius: '16px',
              zIndex: 50,
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'opacity 0.3s ease'
            }}
          >
            <div
              className="spinner"
              style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgba(79,172,254,0.2)',
                borderTopColor: '#4facfe',
                borderRadius: '50%'
              }}
            ></div>
          </div>

          <div
            id="profileBackgroundPreview"
            style={{
              borderRadius: '16px 16px 0 0',
              padding: '26px 20px 22px',
              background: 'rgba(255,255,255,0.05)',
              minHeight: '250px',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
              boxSizing: 'border-box'
            }}
          >
            <div id="profileHeaderCard" className="profile-header-card">
              <h2
                id="profileDisplayName"
                style={{
                  margin: '0 0 14px 0',
                  fontSize: '32px',
                  fontFamily: "'Minecraft', 'Pixel', sans-serif",
                  fontWeight: 'normal',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  position: 'relative',
                  zIndex: 1,
                  color: '#ffffff',
                  background: 'none',
                  width: '100%',
                  flexWrap: 'wrap',
                  textShadow: '2px 2px 0px rgba(0, 0, 0, 0.85)',
                  letterSpacing: '0.5px'
                }}
              >
                <span
                  style={{
                    fontSize: '32px',
                    fontFamily: "'Minecraft', 'Pixel', sans-serif",
                    fontWeight: 'normal',
                    color: '#ffffff',
                    background: 'none',
                    WebkitTextFillColor: '#ffffff',
                    textShadow: '2px 2px 0px rgba(0, 0, 0, 0.85)'
                  }}
                >
                  Player
                </span>
                <span id="profileBadgesContainer" className="hw-badges-row"></span>
              </h2>
              <div id="profileAvatarWrapper" className="hw-avatar-halo-wrapper" style={{ position: 'relative', display: 'inline-flex', zIndex: 1 }}>
                <div className="hw-avatar-halo-ambient"></div>
                <div className="hw-avatar-halo-ring"></div>
                <div className="hw-avatar-halo-sparkle"></div>
                <img
                  id="profileAvatarPreview"
                  src=""
                  alt="Avatar"
                  style={{
                    width: '110px',
                    height: '110px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid rgba(255,255,255,0.25)',
                    imageRendering: 'pixelated',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.35)'
                  }}
                />
                <div
                  id="profileCountryBadge"
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: '-5px',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.7)',
                    display: 'none',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    border: '2px solid rgba(255,255,255,0.3)',
                    zIndex: 10,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                  }}
                >
                  <img id="profileCountryFlagSvg" src="" alt="Country" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              </div>
              <p
                id="profileMemberSince"
                style={{
                  marginTop: '12px',
                  marginBottom: 0,
                  fontSize: '0.85rem',
                  color: '#e2e8f0',
                  fontWeight: 500,
                  textShadow: '0 1px 4px rgba(0, 0, 0, 0.85)'
                }}
              ></p>
            </div>
          </div>

          <div style={{ padding: '25px' }}>
            <div id="profilePresenceSection" style={{ marginBottom: '20px' }}>
              <div
                id="profilePresenceCard"
                style={{
                  background: 'rgba(30, 41, 59, 0.45)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderTop: '2px solid rgba(79, 172, 254, 0.55)',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    <div
                      id="profilePresenceIndicator"
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: '#6b7280',
                        boxShadow: '0 0 8px rgba(107, 114, 128, 0.4)',
                        flexShrink: 0
                      }}
                    ></div>
                    <div
                      id="profilePresenceStatus"
                      style={{
                        fontSize: '1.05rem',
                        fontWeight: 600,
                        color: '#ffffff',
                        letterSpacing: '0.2px',
                        display: 'flex',
                        alignItems: 'center',
                        height: '100%'
                      }}
                      data-i18n="social.status_offline"
                    >
                      Offline
                    </div>
                  </div>
                  <div
                    id="profileJoinBtn"
                    style={{
                      display: 'none',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '0 16px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      borderRadius: '8px',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      height: '32px',
                      width: 'max-content',
                      border: '1px solid rgba(52, 211, 153, 0.3)',
                      background: 'rgba(52, 211, 153, 0.12)',
                      color: '#34d399',
                      transition: 'all 0.2s ease',
                      boxSizing: 'border-box'
                    }}
                    title="Join"
                    data-i18n-title="social.join_server"
                  >
                    <i className="fas fa-sign-in-alt" style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', height: '100%' }}></i>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        height: '100%',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        letterSpacing: '0.5px',
                        lineHeight: 1,
                        paddingTop: '1px'
                      }}
                      data-i18n="social.join_server"
                    >
                      JOIN
                    </div>
                  </div>
                </div>

                <div
                  id="profilePresenceDetails"
                  style={{
                    display: 'none',
                    flexDirection: 'column',
                    gap: '12px',
                    paddingTop: '16px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)'
                  }}
                >
                  <div id="profilePresenceInstanceRow" style={{ display: 'none', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                    <div
                      style={{
                        color: '#94a3b8',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        height: '100%'
                      }}
                      data-i18n="social.installation"
                    >
                      Installation
                    </div>
                    <div
                      id="profilePresenceInstance"
                      style={{
                        color: '#f1f5f9',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        background: 'rgba(255, 255, 255, 0.04)',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                        lineHeight: 'normal',
                        textAlign: 'right',
                        wordBreak: 'break-word'
                      }}
                    >
                      -
                    </div>
                  </div>
                  <div id="profilePresenceServerRow" style={{ display: 'none', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                    <div
                      style={{
                        color: '#94a3b8',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        height: '100%'
                      }}
                      data-i18n="social.profile.server"
                    >
                      Server
                    </div>
                    <div
                      id="profilePresenceServer"
                      style={{
                        color: '#60a5fa',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        background: 'rgba(96, 165, 250, 0.08)',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid rgba(96, 165, 250, 0.15)',
                        lineHeight: 'normal',
                        cursor: 'pointer',
                        textAlign: 'right',
                        wordBreak: 'break-word',
                        transition: 'all 0.2s ease'
                      }}
                      title="Click to copy IP"
                      data-i18n-title="social.profile.click_to_copy_ip"
                    >
                      -
                    </div>
                  </div>
                  <div id="profilePresenceWorldRow" style={{ display: 'none', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                    <div
                      style={{
                        color: '#94a3b8',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        height: '100%'
                      }}
                      data-i18n="social.world"
                    >
                      World
                    </div>
                    <div
                      id="profilePresenceWorld"
                      style={{
                        color: '#34d399',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        background: 'rgba(52, 211, 153, 0.08)',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid rgba(52, 211, 153, 0.15)',
                        lineHeight: 'normal',
                        textAlign: 'right',
                        wordBreak: 'break-word'
                      }}
                    >
                      -
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Embedded Player Statistics Grid */}
            <div id="profileStatsSection" style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#b0b8c6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-chart-line" style={{ color: '#4facfe' }}></i> <span data-i18n="stats.title">Player Statistics</span>
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(255, 170, 0, 0.15)',
                      color: '#ffaa00',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      marginRight: '10px',
                      flexShrink: 0
                    }}
                  >
                    <i className="fas fa-fire"></i>
                  </div>
                  <div>
                    <div style={{ color: '#8b9cc0', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }} data-i18n="stats.streak">
                      Streak
                    </div>
                    <div id="userProfileStreak" style={{ color: '#fff', fontSize: '15px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      0 <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#888' }} data-i18n="stats.days_unit">days</span>
                    </div>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(255, 0, 127, 0.15)',
                      color: '#ff007f',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      marginRight: '10px',
                      flexShrink: 0
                    }}
                  >
                    <i className="fas fa-trophy"></i>
                  </div>
                  <div>
                    <div style={{ color: '#8b9cc0', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }} data-i18n="stats.longest_streak">
                      Longest Streak
                    </div>
                    <div id="userProfileMaxStreak" style={{ color: '#fff', fontSize: '15px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      0 <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#888' }} data-i18n="stats.days_unit">days</span>
                    </div>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(79, 172, 254, 0.15)',
                      color: '#4facfe',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      marginRight: '10px',
                      flexShrink: 0
                    }}
                  >
                    <i className="fas fa-clock"></i>
                  </div>
                  <div>
                    <div style={{ color: '#8b9cc0', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }} data-i18n="stats.total_hours">
                      Total Hours
                    </div>
                    <div id="userProfileHours" style={{ color: '#fff', fontSize: '15px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      0.0 <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#888' }} data-i18n="stats.hours_unit">h</span>
                    </div>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(0, 242, 254, 0.15)',
                      color: '#00f2fe',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      marginRight: '10px',
                      flexShrink: 0
                    }}
                  >
                    <i className="fas fa-calendar-check"></i>
                  </div>
                  <div>
                    <div style={{ color: '#8b9cc0', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }} data-i18n="stats.days_played">
                      Days Played
                    </div>
                    <div id="userProfileDays" style={{ color: '#fff', fontSize: '15px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      0 <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#888' }} data-i18n="stats.days_unit">days</span>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    gridColumn: 'span 2'
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(167, 112, 239, 0.15)',
                      color: '#a770ef',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      marginRight: '10px',
                      flexShrink: 0
                    }}
                  >
                    <i className="fas fa-gamepad"></i>
                  </div>
                  <div>
                    <div style={{ color: '#8b9cc0', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }} data-i18n="stats.sessions">
                      Sessions
                    </div>
                    <div id="userProfileSessions" style={{ color: '#fff', fontSize: '15px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      0
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div id="profileBiographySection" style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#b0b8c6' }} data-i18n="social.biography">
                Biography
              </h4>
              <p
                id="profileBiography"
                style={{
                  margin: 0,
                  color: '#e0e6ed',
                  fontSize: '0.95rem',
                  lineHeight: 1.5,
                  background: 'rgba(0,0,0,0.2)',
                  padding: '12px',
                  borderRadius: '8px',
                  whiteSpace: 'pre-wrap'
                }}
                data-i18n="social.no_biography"
              >
                No biography
              </p>
            </div>

            <div id="profileLinksSection" style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#b0b8c6' }} data-i18n="social.links">
                Links
              </h4>
              <div id="profileLinksContainer" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem', fontStyle: 'italic' }} data-i18n="social.no_links">
                  No links
                </p>
              </div>
            </div>

            <div id="profilePlaystyleSection" style={{ marginBottom: '20px', display: 'none' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#b0b8c6' }} data-i18n="social.playstyle">
                Playstyle
              </h4>
              <div id="profilePlaystyleTags" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 8px' }}></div>
            </div>

            <div id="profileFavoriteMobSection" style={{ marginBottom: '15px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#b0b8c6' }} data-i18n="social.favorite_mob">
                Favorite Mob
              </h4>
              <p
                id="profileFavoriteMob"
                style={{ margin: 0, color: '#e0e6ed', fontSize: '0.95rem', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}
              >
                -
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Link Modal */}
      <div id="addLinkModal" className="modal">
        <div className="modal-content" style={{ maxWidth: '500px', padding: '25px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '20px' }} data-i18n="social.add_link">
              Add Link
            </h2>
            <button id="closeAddLinkBtn" style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '20px' }}>
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="modal-input-group" style={{ marginBottom: '15px' }}>
            <label htmlFor="linkUrlInput">URL</label>
            <input type="text" id="linkUrlInput" placeholder="https://example.com" style={{ width: '100%' }} />
            <p id="linkUrlError" style={{ color: '#f87171', fontSize: '12px', marginTop: '5px', display: 'none' }} data-i18n="social.enter_url">
              Please enter a URL
            </p>
          </div>

          <div className="modal-input-group" style={{ marginBottom: '15px' }}>
            <label htmlFor="linkTitleInput" data-i18n="social.title_optional">
              Title (optional)
            </label>
            <input
              type="text"
              id="linkTitleInput"
              placeholder="My Channel"
              data-i18n-placeholder="social.my_channel_placeholder"
              style={{ width: '100%' }}
            />
          </div>

          <div className="modal-input-group" style={{ marginBottom: '20px' }}>
            <label htmlFor="linkTypeSearch" data-i18n="social.link_type">
              Link Type
            </label>
            <div className="searchable-dropdown" id="linkTypeDropdown">
              <div className="dropdown-trigger" id="linkTypeTrigger">
                <span id="linkTypeSelected" data-i18n="social.select_type">
                  Select type...
                </span>
                <i className="fas fa-chevron-down"></i>
              </div>
              <div className="dropdown-search">
                <input
                  type="text"
                  id="linkTypeSearch"
                  placeholder="Search types..."
                  data-i18n-placeholder="social.share_seed.search_types_placeholder"
                />
              </div>
              <div className="dropdown-options" id="linkTypeOptions"></div>
            </div>
          </div>

          <div className="modal-options">
            <button id="submitLinkBtn" className="btn-blue" data-i18n="social.add_link">
              Add Link
            </button>
            <button id="cancelLinkBtn" className="btn-secondary" data-i18n="social.cancel_btn">
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Share Link Modal */}
      <div id="shareLinkModal" className="modal">
        <div className="modal-content" style={{ maxWidth: '500px', padding: '25px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '20px' }} data-i18n="social.share_link">
              Share Link
            </h2>
            <button id="closeShareLinkBtn" style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '20px' }}>
              <i className="fas fa-times"></i>
            </button>
          </div>

          <p style={{ color: '#b0b8c6', fontSize: '14px', marginBottom: '20px' }} data-i18n="social.share_link_desc">
            Share a link with your friend.
          </p>

          <div className="modal-input-group" style={{ marginBottom: '15px' }}>
            <label htmlFor="shareLinkUrlInput">URL</label>
            <input type="text" id="shareLinkUrlInput" placeholder="https://example.com" style={{ width: '100%' }} />
            <p id="shareLinkUrlError" style={{ color: '#f87171', fontSize: '12px', marginTop: '5px', display: 'none' }} data-i18n="social.enter_url">
              Please enter a URL
            </p>
          </div>

          <div className="modal-input-group" style={{ marginBottom: '15px' }}>
            <label htmlFor="shareLinkTitleInput" data-i18n="social.title_optional">
              Title (optional)
            </label>
            <input
              type="text"
              id="shareLinkTitleInput"
              placeholder="My Channel"
              data-i18n-placeholder="social.my_channel_placeholder"
              style={{ width: '100%' }}
            />
          </div>

          <div className="modal-input-group" style={{ marginBottom: '20px' }}>
            <label htmlFor="shareLinkTypeSearch" data-i18n="social.link_type">
              Link Type
            </label>
            <div className="searchable-dropdown" id="shareLinkTypeDropdown">
              <div className="dropdown-trigger" id="shareLinkTypeTrigger">
                <span id="shareLinkTypeSelected" data-i18n="social.select_type">
                  Select type...
                </span>
                <i className="fas fa-chevron-down"></i>
              </div>
              <div className="dropdown-search">
                <input
                  type="text"
                  id="shareLinkTypeSearch"
                  placeholder="Search types..."
                  data-i18n-placeholder="social.share_seed.search_types_placeholder"
                />
              </div>
              <div className="dropdown-options" id="shareLinkTypeOptions"></div>
            </div>
          </div>

          <div className="modal-options">
            <button id="submitShareLinkBtn" className="btn-blue" data-i18n="social.send_link">
              Send Link
            </button>
            <button id="cancelShareLinkBtn" className="btn-secondary" data-i18n="social.cancel_btn">
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Share Seed Modal */}
      <div id="shareSeedModal" className="modal">
        <div className="modal-content" style={{ maxWidth: '500px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 style={{ margin: 0, fontSize: '18px' }} data-i18n="social.share_seed_title">
              Share Seed
            </h2>
            <button id="closeShareSeedBtn" style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '18px' }}>
              <i className="fas fa-times"></i>
            </button>
          </div>

          <p style={{ color: '#b0b8c6', fontSize: '14px', marginBottom: '20px' }} data-i18n="social.share_seed_desc">
            Share a Minecraft world seed with your friend. Choose to enter it manually or load from an existing world.
          </p>

          {/* Selection Method */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button className="btn btn-secondary seed-method-btn active" data-method="text" style={{ flex: 1 }}>
              <i className="fas fa-keyboard"></i> <span data-i18n="social.share_seed.manual_entry">Manual Entry</span>
            </button>
            <button className="btn btn-secondary seed-method-btn" data-method="world" style={{ flex: 1 }}>
              <i className="fas fa-globe"></i> <span data-i18n="social.share_seed.from_world">From World</span>
            </button>
          </div>

          {/* Manual Entry Section */}
          <div id="seedTextSection" style={{ display: 'block', transition: 'opacity 0.2s ease' }}>
            <div className="modal-input-group" style={{ margin: '0 0 20px 0' }}>
              <label htmlFor="seedTextInput" data-i18n="social.seed_desc">
                Seed (place /seed command in your world or server)
              </label>
              <input
                type="text"
                id="seedTextInput"
                className="input-text"
                placeholder="e.g., 3478381264927704038"
                data-i18n-placeholder="social.share_seed.seed_placeholder"
                maxLength={20}
              />
              <p id="seedValidationError" style={{ color: '#f87171', fontSize: '12px', marginTop: '5px', display: 'none' }} data-i18n="social.seed_hint">
                Seed must be 19-20 digits with optional negative sign
              </p>
            </div>
          </div>

          {/* From World Section */}
          <div id="seedWorldSection" style={{ display: 'none', transition: 'opacity 0.2s ease' }}>
            <div className="modal-input-group" style={{ margin: '0 0 15px 0' }}>
              <label htmlFor="seedProfileSelect" data-i18n="social.select_installation">
                Select Installation
              </label>
              <select id="seedProfileSelect" className="input-text">
                <option value="" data-i18n="social.loading_installations">
                  Loading installations...
                </option>
              </select>
            </div>

            <div className="modal-input-group" style={{ margin: '0 0 20px 0' }}>
              <label htmlFor="seedWorldSelect" data-i18n="social.share_seed.select_world">
                Select World
              </label>
              <select id="seedWorldSelect" className="input-text" disabled>
                <option value="" data-i18n="social.select_installation_first">
                  Select an installation first
                </option>
              </select>
            </div>

            <div
              id="seedLoadingSpinner"
              style={{
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '20px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '8px'
              }}
            >
              <div className="spinner"></div>
              <span style={{ color: '#b0b8c6', fontSize: '14px' }} data-i18n="social.share_seed.reading_seed">
                Reading seed from world...
              </span>
            </div>

            <div
              id="seedError"
              style={{
                display: 'none',
                padding: '15px',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '8px',
                color: '#f87171',
                fontSize: '14px'
              }}
            >
              <i className="fas fa-exclamation-triangle"></i>{' '}
              <span data-i18n="social.share_seed.read_error">Could not read seed. The world may be corrupted.</span>
            </div>
          </div>

          <div className="modal-buttons" style={{ marginTop: '20px' }}>
            <button className="btn btn-secondary" id="cancelShareSeedBtn" data-i18n="social.cancel_btn">
              Cancel
            </button>
            <button className="btn btn-primary" id="sendSeedBtn" data-i18n="social.send_seed">
              Send Seed
            </button>
          </div>
        </div>
      </div>

      {/* Share Server Modal */}
      <div id="shareServerModal" className="modal">
        <div
          className="modal-content"
          style={{
            maxWidth: '440px',
            padding: '24px',
            position: 'relative',
            background: 'rgba(30, 35, 45, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}
        >
          <button
            id="closeShareServerBtn"
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(255,255,255,0.05)',
              border: 'none',
              color: '#b0b8c6',
              fontSize: '16px',
              width: '32px',
              height: '32px',
              padding: 0,
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
          >
            <i className="fas fa-times"></i>
          </button>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(79,172,254,0.25) 0%, rgba(0,242,254,0.15) 100%)',
                border: '1px solid rgba(79,172,254,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4facfe',
                fontSize: '18px',
                flexShrink: 0
              }}
            >
              <i className="fas fa-server"></i>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#fff' }} data-i18n="social.server_invite_title">
                Server Invite
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }} data-i18n="social.server_invite_subtitle">
                Send a server invitation to your friends
              </p>
            </div>
          </div>

          {/* IP Input area */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: '#9ca3af',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                marginBottom: '8px'
              }}
              data-i18n="social.server_ip_label"
            >
              Server IP / Hostname
            </label>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  gap: '10px',
                  transition: 'border-color 0.2s'
                }}
                id="shareServerIpWrapper"
              >
                <i className="fas fa-network-wired" style={{ color: '#4facfe', fontSize: '14px', flexShrink: 0 }}></i>
                <input
                  type="text"
                  id="shareServerIpInput"
                  placeholder="play.example.com or 192.168.1.1:25565"
                  data-i18n-placeholder="social.server_ip_placeholder"
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#fff',
                    fontSize: '14px',
                    fontFamily: "'Consolas', monospace"
                  }}
                  autoComplete="off"
                  spellCheck="false"
                />
                <button
                  id="shareServerClearBtn"
                  title="Clear"
                  data-i18n-title="social.clear"
                  style={{
                    display: 'none',
                    background: 'none',
                    border: 'none',
                    color: '#6b7280',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: '13px',
                    lineHeight: 1,
                    transition: 'color 0.2s'
                  }}
                >
                  <i className="fas fa-times-circle"></i>
                </button>
              </div>
              {/* Auto-detected tag */}
              <div id="shareServerDetectedTag" style={{ display: 'none', marginTop: '8px', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#34d399' }}>
                <i className="fas fa-circle" style={{ fontSize: '7px', animation: 'pulse 2s infinite' }}></i>
                <span data-i18n="social.server_autodetected">Auto-detected — you are currently playing on this server</span>
              </div>
            </div>
          </div>

          {/* Validation error */}
          <div
            id="shareServerError"
            style={{
              display: 'none',
              background: 'rgba(248,113,113,0.1)',
              border: '1px solid rgba(248,113,113,0.3)',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '13px',
              color: '#f87171',
              marginBottom: '16px'
            }}
          >
            <i className="fas fa-exclamation-triangle" style={{ marginRight: '6px' }}></i>
            <span id="shareServerErrorText" data-i18n="social.server_invite_invalid_ip">
              Invalid server address. Use a valid hostname or IP (e.g. hypixel.net, 1.2.3.4:25565).
            </span>
          </div>

          {/* Server history suggestions */}
          <div id="shareServerHistorySection" style={{ display: 'none', marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 600,
                color: '#6b7280',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                marginBottom: '8px'
              }}
            >
              <i className="fas fa-history" style={{ marginRight: '4px' }}></i> <span data-i18n="social.server_recent">Recent servers</span>
            </label>
            <div id="shareServerHistoryList" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}></div>
          </div>

          <p style={{ fontSize: '11px', color: '#4b5563', marginBottom: '16px', lineHeight: 1.5 }} data-i18n="social.server_ip_hint">
            Enter a Minecraft Java Edition server address.
          </p>

          <div className="modal-buttons" style={{ marginTop: '4px' }}>
            <button className="btn btn-secondary" id="cancelShareServerBtn" data-i18n="social.cancel_btn">
              Cancel
            </button>
            <button className="btn btn-primary" id="confirmShareServerBtn" data-i18n="social.send_invite">
              <i className="fas fa-paper-plane"></i> Send Invite
            </button>
          </div>
        </div>
      </div>

      {/* Join Server Modal */}
      <div id="joinServerModal" className="modal">
        <div className="modal-content" style={{ maxWidth: '500px', padding: '20px' }}>
          <div style={{ position: 'relative', textAlign: 'center', marginBottom: '20px' }}>
            <button
              id="closeJoinServerBtn"
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                background: 'none',
                border: 'none',
                color: '#888',
                cursor: 'pointer',
                fontSize: '18px',
                transition: 'color 0.2s'
              }}
            >
              <i className="fas fa-times"></i>
            </button>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }} data-i18n="social.join_server_title">
              Join Server
            </h2>
            <p style={{ color: '#aaa', fontSize: '0.9rem', marginTop: '5px' }} data-i18n="social.join_server_subtitle">
              Select an installation to join the server
            </p>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '10px', textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '1.1rem', color: '#4facfe', fontWeight: 600, fontFamily: "'Consolas', monospace" }} id="joinServerIp">
              server.ip
            </div>
            <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '5px' }}>
              <span data-i18n="social.invited_by">Invited by</span> <span id="joinServerFriend" style={{ color: '#ccc', fontWeight: 600 }}>Friend</span>
            </div>
          </div>
          <div id="joinServerProfilesList" style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '20px' }}></div>

          <div className="modal-buttons" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" id="cancelJoinServerBtn" data-i18n="social.cancel_btn">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SocialModals;
