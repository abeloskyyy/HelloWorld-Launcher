import React from 'react';

export const WorkshopModals: React.FC = () => {
  const handleCloseWkItemModal = () => {
    const win = window as any;
    if (typeof win.closeWkItemModal === 'function') {
      win.closeWkItemModal();
    }
  };

  const handleToggleWkLike = (id: string, e: React.MouseEvent) => {
    const win = window as any;
    if (typeof win.toggleWkLike === 'function') {
      win.toggleWkLike(id, e.nativeEvent);
    }
  };

  const handleSwitchWkModalTab = (tab: string) => {
    const win = window as any;
    if (typeof win.switchWkModalTab === 'function') {
      win.switchWkModalTab(tab);
    }
  };

  const handleApproveWkItem = (id: string) => {
    const win = window as any;
    if (typeof win.approveWkItem === 'function') {
      win.approveWkItem(id);
    }
  };

  const handleRejectWkItem = (id: string) => {
    const win = window as any;
    if (typeof win.rejectWkItem === 'function') {
      win.rejectWkItem(id);
    }
  };

  const handleToggleOfficialWkItem = (id: string, isOfficial: boolean) => {
    const win = window as any;
    if (typeof win.toggleOfficialWkItem === 'function') {
      win.toggleOfficialWkItem(id, isOfficial);
    }
  };

  const handleDeleteWkItem = (id: string) => {
    const win = window as any;
    if (typeof win.deleteWkItem === 'function') {
      win.deleteWkItem(id);
    }
  };

  const handleInstallWkModPack = (id: string) => {
    const win = window as any;
    if (typeof win.installWkModPack === 'function') {
      win.installWkModPack(id);
    }
  };

  const handleCloseWkRejectModal = () => {
    const win = window as any;
    if (typeof win.closeWkRejectModal === 'function') {
      win.closeWkRejectModal();
    }
  };

  const handleConfirmRejectWkItem = () => {
    const win = window as any;
    if (typeof win.confirmRejectWkItem === 'function') {
      win.confirmRejectWkItem();
    }
  };

  const handleCloseWkCreateModal = () => {
    const win = window as any;
    if (typeof win.closeWkCreateModal === 'function') {
      win.closeWkCreateModal();
    }
  };

  const handleSelectWkCreateType = (type: string) => {
    const win = window as any;
    if (typeof win.selectWkCreateType === 'function') {
      win.selectWkCreateType(type);
    }
  };

  const handleOpenWkProfileSelectModal = () => {
    const win = window as any;
    if (typeof win.openWkProfileSelectModal === 'function') {
      win.openWkProfileSelectModal();
    }
  };

  const handleOpenWkIconSelector = (e: React.MouseEvent) => {
    const win = window as any;
    if (typeof win.openWkIconSelector === 'function') {
      win.openWkIconSelector(e.nativeEvent);
    }
  };

  const handleBackWkCreateStep = () => {
    const win = window as any;
    if (typeof win.backWkCreateStep === 'function') {
      win.backWkCreateStep();
    }
  };

  const handleSubmitWkItem = () => {
    const win = window as any;
    if (typeof win.submitWkItem === 'function') {
      win.submitWkItem();
    }
  };

  const handleCloseWkProfileSelectModal = () => {
    const win = window as any;
    if (typeof win.closeWkProfileSelectModal === 'function') {
      win.closeWkProfileSelectModal();
    }
  };

  return (
    <>
      {/* Workshop Item Info Modal */}
      <div id="wkItemModal" className="modal">
        <div className="modal-content wk-item-modal-content">
          <button className="modal-close-btn" onClick={handleCloseWkItemModal}>
            <i className="fas fa-times"></i>
          </button>

          <div className="wk-modal-header">
            <img id="wkModalIcon" src="img/icon.png" className="wk-modal-icon" alt="icon" />
            <div
              className="wk-modal-header-info"
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: '14px',
                paddingRight: '40px'
              }}
            >
              <div
                id="wkModalTitle"
                className="wk-modal-title"
                style={{
                  marginBottom: 0,
                  maxWidth: 'calc(100% - 55px)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                data-i18n="global.loading"
              >
                Loading...
              </div>
              <button
                className="wk-btn wk-like-btn-card"
                id="wkModalLikeBtn"
                onClick={(e) => handleToggleWkLike((e.currentTarget as any).dataset.id, e)}
                title="Like"
                data-i18n-title="workshop.modal.likes"
                style={{ flexShrink: 0 }}
              >
                <i className="far fa-heart"></i>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="wk-modal-tabs">
            <button
              className="wk-modal-tab-btn active"
              data-tab="general"
              onClick={() => handleSwitchWkModalTab('general')}
              data-i18n="workshop.modal.tabs_general"
            >
              General
            </button>
            <button
              className="wk-modal-tab-btn"
              id="wkModalModsTabBtn"
              data-tab="mods"
              onClick={() => handleSwitchWkModalTab('mods')}
              style={{ display: 'none' }}
              data-i18n="workshop.modal.tabs_mods"
            >
              Mods
            </button>
            <button
              className="wk-modal-tab-btn"
              id="wkModalResourcePacksTabBtn"
              data-tab="resourcepacks"
              onClick={() => handleSwitchWkModalTab('resourcepacks')}
              style={{ display: 'none' }}
              data-i18n="workshop.modal.tabs_resourcepacks"
            >
              Resource Packs
            </button>
            <button
              className="wk-modal-tab-btn"
              id="wkModalShadersTabBtn"
              data-tab="shaders"
              onClick={() => handleSwitchWkModalTab('shaders')}
              style={{ display: 'none' }}
              data-i18n="workshop.modal.tabs_shaders"
            >
              Shaders
            </button>
          </div>

          {/* General Tab */}
          <div id="wkModalGeneral" className="wk-modal-tab-content" style={{ display: 'block' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '6px',
                flexWrap: 'wrap'
              }}
            >
              <i className="fas fa-code-branch" style={{ color: '#4CAF50' }}></i>
              <span style={{ color: '#aaa', fontSize: '13px' }} data-i18n="workshop.modal.version">
                Version:
              </span>
              <div id="wkModalVersion" className="wk-modal-version" style={{ margin: 0, fontWeight: 600, color: '#fff' }}></div>
              <span id="wkModalLoader" className="wk-loader-badge" style={{ display: 'none', marginLeft: 'auto' }}></span>
            </div>
            <div
              style={{
                display: 'flex',
                gap: '20px',
                marginBottom: '16px',
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#ddd',
                alignItems: 'center',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fas fa-user" style={{ color: '#4facfe' }}></i>
                <span style={{ color: '#aaa' }} data-i18n="workshop.modal.author">
                  Author:{' '}
                </span>
                <strong id="wkModalAuthor" style={{ color: '#fff' }}></strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fas fa-calendar-alt" style={{ color: '#f093fb' }}></i>
                <span style={{ color: '#aaa' }} data-i18n="workshop.modal.uploaded">
                  Uploaded:{' '}
                </span>
                <strong id="wkModalDate" style={{ color: '#fff' }}></strong>
              </div>
            </div>
            <div
              id="wkModalStatsBox"
              style={{
                display: 'flex',
                gap: '20px',
                marginBottom: '16px',
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#ddd',
                alignItems: 'center',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title="Downloads" data-i18n-title="workshop.modal.downloads">
                <i className="fas fa-download" style={{ color: '#4facfe' }}></i>
                <span style={{ color: '#aaa' }} data-i18n="workshop.modal.downloads">
                  Downloads:{' '}
                </span>
                <strong id="wkModalDownloads" style={{ color: '#fff' }}>
                  0
                </strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title="Likes" data-i18n-title="workshop.modal.likes">
                <i className="fas fa-heart" style={{ color: '#ff5252' }}></i>
                <span style={{ color: '#aaa' }} data-i18n="workshop.modal.likes">
                  Likes:{' '}
                </span>
                <strong id="wkModalLikes" style={{ color: '#fff' }}>
                  0
                </strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title="Views" data-i18n-title="workshop.modal.views">
                <i className="fas fa-eye" style={{ color: '#00e676' }}></i>
                <span style={{ color: '#aaa' }} data-i18n="workshop.modal.views">
                  Views:{' '}
                </span>
                <strong id="wkModalViews" style={{ color: '#fff' }}>
                  0
                </strong>
              </div>
            </div>
            <p id="wkModalDesc" className="wk-modal-desc"></p>
          </div>

          {/* Mods Tab */}
          <div id="wkModalMods" className="wk-modal-tab-content" style={{ display: 'none' }}>
            <div id="wkModalModsList" className="wk-mods-list"></div>
          </div>

          {/* Resource Packs Tab */}
          <div id="wkModalResourcePacks" className="wk-modal-tab-content" style={{ display: 'none' }}>
            <div id="wkModalResourcePacksList" className="wk-mods-list"></div>
          </div>

          {/* Shaders Tab */}
          <div id="wkModalShaders" className="wk-modal-tab-content" style={{ display: 'none' }}>
            <div id="wkModalShadersList" className="wk-mods-list"></div>
          </div>

          {/* Admin Moderation Bar */}
          <div id="wkModalAdminBar" className="wk-modal-admin-bar" style={{ display: 'none' }}>
            <div className="wk-admin-bar-title">
              <i className="fas fa-shield-alt"></i> <span data-i18n="workshop.modal.admin_title">Admin Moderation</span>
            </div>
            <div className="wk-admin-bar-actions">
              <button
                className="wk-btn wk-btn-approve"
                id="wkModalApproveBtn"
                onClick={(e) => handleApproveWkItem((e.currentTarget as any).dataset.id)}
                data-i18n="workshop.modal.approve"
              >
                <i className="fas fa-check"></i> Approve
              </button>
              <button
                className="wk-btn wk-btn-reject"
                id="wkModalRejectBtn"
                onClick={(e) => handleRejectWkItem((e.currentTarget as any).dataset.id)}
                data-i18n="workshop.modal.deny"
              >
                <i className="fas fa-ban"></i> Deny
              </button>
              <button
                className="wk-btn wk-btn-official"
                id="wkModalOfficialBtn"
                onClick={(e) =>
                  handleToggleOfficialWkItem(
                    (e.currentTarget as any).dataset.id,
                    (e.currentTarget as any).dataset.official === 'true'
                  )
                }
                data-i18n="workshop.modal.official"
              >
                <i className="fas fa-star"></i> Official
              </button>
              <button
                className="wk-btn wk-btn-delete"
                id="wkModalDeleteBtn"
                onClick={(e) => handleDeleteWkItem((e.currentTarget as any).dataset.id)}
                data-i18n="workshop.modal.delete"
              >
                <i className="fas fa-trash"></i> Delete
              </button>
            </div>
          </div>

          <div className="wk-modal-footer">
            <button className="wk-btn wk-btn-secondary" onClick={handleCloseWkItemModal} data-i18n="global.close">
              Close
            </button>
            <button
              className="wk-btn wk-btn-primary"
              id="wkModalInstallBtn"
              onClick={(e) => handleInstallWkModPack((e.currentTarget as any).dataset.id)}
              data-i18n="workshop.modal.download"
            >
              <i className="fas fa-download"></i> Download
            </button>
          </div>
        </div>
      </div>

      {/* Workshop Reject Modal */}
      <div id="wkRejectModal" className="modal">
        <div
          className="modal-content"
          style={{
            maxWidth: '480px',
            padding: '25px',
            background: '#101622',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '19px', color: '#ffaa00' }} data-i18n="workshop.reject.title">
              <i className="fas fa-ban"></i> Deny Item
            </h2>
            <button
              onClick={handleCloseWkRejectModal}
              style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '20px' }}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
          <p style={{ color: '#ccc', fontSize: '14px', marginBottom: '15px' }} data-i18n="workshop.reject.desc">
            Please specify the reason for rejection so the author can fix and resubmit:
          </p>
          <div className="modal-input-group" style={{ marginBottom: '20px' }}>
            <textarea
              id="wkRejectNoteInput"
              rows={4}
              placeholder="e.g.: Missing files or icon does not follow guidelines..."
              data-i18n-placeholder="workshop.reject.placeholder"
              style={{
                width: '100%',
                padding: '10px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px',
                color: '#fff',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            ></textarea>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button className="wk-btn wk-btn-secondary" onClick={handleCloseWkRejectModal} data-i18n="social.cancel_btn">
              Cancel
            </button>
            <button
              className="wk-btn wk-btn-reject"
              id="wkConfirmRejectBtn"
              onClick={handleConfirmRejectWkItem}
              data-i18n="workshop.modal.deny"
            >
              <i className="fas fa-ban"></i> Deny
            </button>
          </div>
        </div>
      </div>

      {/* Workshop Create Modal */}
      <div id="wkCreateModal" className="modal">
        <div className="modal-content wk-create-modal-content">
          <button className="modal-close-btn" onClick={handleCloseWkCreateModal}>
            <i className="fas fa-times"></i>
          </button>
          <h2 className="wk-create-title-heading" data-i18n="workshop.create.title">
            <i className="fas fa-plus-circle"></i> Create Workshop Item
          </h2>

          {/* Step 1: Type Selection */}
          <div id="wkCreateStep1" className="wk-step-container">
            <p className="wk-create-step-label" data-i18n="workshop.create.step1_label">
              Select the type of content you want to create and share:
            </p>
            <div className="wk-type-grid">
              <div className="wk-type-btn" data-type="modpack" onClick={() => handleSelectWkCreateType('modpack')}>
                <i className="fas fa-cubes"></i>
                <span data-i18n="workshop.create.type_modpack">Mod Pack</span>
                <small data-i18n="workshop.create.type_modpack_desc">A preset installation with mods</small>
              </div>
              <div
                className="wk-type-btn wk-type-disabled"
                data-type="theme"
                onClick={() => handleSelectWkCreateType('theme')}
              >
                <i className="fas fa-palette"></i>
                <span data-i18n="workshop.create.type_theme">Theme</span>
                <small data-i18n="workshop.create.type_theme_desc">Coming soon</small>
                <span className="wk-soon-badge" data-i18n="workshop.soon">
                  Soon
                </span>
              </div>
            </div>
          </div>

          {/* Step 2: Mod Pack Details */}
          <div id="wkCreateStep2" className="wk-step-container" style={{ display: 'none' }}>
            <div className="wk-form-group">
              <label className="wk-form-label">
                <span data-i18n="workshop.create.title_label">Title</span> <span style={{ color: '#ff6b6b' }}>*</span>{' '}
                <span data-i18n="workshop.char_limit_30">(max 30 chars)</span>
              </label>
              <input
                id="wkCreateTitle"
                className="wk-input"
                type="text"
                placeholder="e.g. Magic & Tech Odyssey"
                data-i18n-placeholder="workshop.create.title_placeholder"
                maxLength={30}
              />
            </div>

            <div className="wk-form-group" style={{ marginTop: '16px' }}>
              <label className="wk-form-label">
                <span data-i18n="workshop.create.desc_label">Description</span> <span style={{ color: '#ff6b6b' }}>*</span>{' '}
                <span data-i18n="workshop.char_limit_200">(max 200 chars)</span>
              </label>
              <textarea
                id="wkCreateDesc"
                className="wk-textarea"
                rows={3}
                placeholder="Describe what makes this mod pack awesome..."
                data-i18n-placeholder="workshop.create.desc_placeholder"
                maxLength={200}
              ></textarea>
            </div>

            <div className="wk-form-group" style={{ marginTop: '20px' }}>
              <label className="wk-form-label">
                <span data-i18n="workshop.create.base_profile_label">Base Installation &amp; Icon</span>{' '}
                <span style={{ color: '#ff6b6b' }}>*</span>
              </label>

              <div id="wkSelectedProfileCard" className="wk-profile-select-card empty" onClick={handleOpenWkProfileSelectModal}>
                <div className="wk-profile-card-content">
                  <div
                    className="wk-profile-icon-wrap"
                    onClick={handleOpenWkIconSelector}
                    title="Change Icon"
                    data-i18n-title="workshop.modal.sidebar_info"
                  >
                    <div id="wkCreateIconPlaceholder" className="wk-icon-empty-placeholder">
                      <i className="fas fa-cube"></i>
                    </div>
                    <img id="wkCreateIconPreview" src="" className="wk-profile-icon-img" alt="icon preview" style={{ display: 'none' }} />
                    <div className="wk-profile-icon-overlay">
                      <i className="fas fa-camera"></i>
                    </div>
                  </div>

                  <div className="wk-profile-info-text">
                    <div id="wkSelectedProfileTitle" className="wk-selected-title" data-i18n="workshop.create.select_profile_title">
                      Select an installation...
                    </div>
                    <div
                      id="wkSelectedProfileSubtitle"
                      className="wk-selected-subtitle"
                      data-i18n="workshop.create.select_profile_subtitle"
                    >
                      Click to choose which installation to pack
                    </div>
                  </div>
                </div>
                <div className="wk-profile-select-arrow">
                  <i className="fas fa-chevron-right"></i>
                </div>
              </div>
            </div>

            {/* Warning: external/local addons won't be uploaded */}
            <div id="wkExternalAddonsWarning" className="wk-external-addons-warning" style={{ display: 'none' }}>
              <i className="fas fa-exclamation-triangle wk-ext-warn-icon"></i>
              <div className="wk-ext-warn-body">
                <div className="wk-ext-warn-title" data-i18n="workshop.create.warn_title">
                  Some addons won't be included
                </div>
                <div className="wk-ext-warn-desc" id="wkExternalAddonsWarningDesc" data-i18n="workshop.create.warn_desc">
                  Local/manual mods without a Modrinth ID are excluded from Workshop uploads. Only mods installed through
                  HelloWorld will be published.
                </div>
              </div>
            </div>

            <div className="wk-create-step-actions" style={{ justifyContent: 'space-between', marginTop: '24px' }}>
              <button className="wk-btn wk-btn-secondary" onClick={handleBackWkCreateStep}>
                <i className="fas fa-arrow-left"></i> <span data-i18n="tutorial.back">Back</span>
              </button>
              <button className="wk-btn wk-btn-primary" id="wkSubmitBtn" onClick={handleSubmitWkItem} data-i18n="workshop.create.submit">
                <i className="fas fa-paper-plane"></i> Submit for Review
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Workshop Profile Select Sub-Modal */}
      <div id="wkProfileSelectModal" className="modal">
        <div className="modal-content wk-profile-modal-content">
          <div className="wk-submodal-header">
            <h3 data-i18n="workshop.create.select_base_title">Select Base Installation</h3>
            <button className="modal-close-btn" onClick={handleCloseWkProfileSelectModal}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          <p className="wk-submodal-desc">
            <span data-i18n="installations.share_desc">
              Choose which of your installations will be packaged and shared in this mod pack.
            </span>
          </p>
          <div id="wkProfileSelectList" className="wk-profile-select-list"></div>
        </div>
      </div>
    </>
  );
};

export default WorkshopModals;
