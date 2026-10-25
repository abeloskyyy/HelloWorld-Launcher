import React from 'react';

export const ModsSection: React.FC = () => {
  return (
    <div id="mods" className="section">
      <h1 data-i18n="sidebar.mods">Mods</h1>
      <div className="mods-section">
        <div className="mods-outer-flex">
          {/* LEFT: All mods content */}
          <div className="mods-content-area">
            {/* Profile Selector */}
            <div className="input-group">
              <label style={{ marginBottom: '8px' }}>
                <span data-i18n="social.installation">Installation</span>
                <i
                  className="fa-regular fa-question-circle help-icon"
                  style={{ color: '#fff' }}
                  data-tooltip="Select an installation with Forge or Fabric to manage mods"
                  data-i18n-tooltip="addons.forge_fabric_tooltip"
                ></i>
              </label>
              <select id="modsProfileSelect" style={{ display: 'none' }}>
                <option value="" data-i18n="mods_menu.loading_installations">
                  Loading installations...
                </option>
              </select>
              <div className="custom-select compact-custom-select" id="modsCustomSelect">
                <div className="select-trigger" id="modsSelectTrigger">
                  <div className="select-trigger-content">
                    <img src="" alt="" className="select-trigger-icon" id="modsSelectedIcon" style={{ display: 'none' }} />
                    <div className="select-trigger-text">
                      <div className="select-trigger-title" id="modsSelectedTitle" data-i18n="mods_menu.loading_installations">
                        Loading installations...
                      </div>
                      <div className="select-trigger-subtitle" id="modsSelectedSubtitle" style={{ display: 'none' }}></div>
                    </div>
                  </div>
                  <div className="select-arrow"></div>
                </div>
                <div className="select-options" id="modsSelectOptions"></div>
              </div>
            </div>

            {/* World Selector (Only for Data Packs) */}
            <div id="worldSelectorContainer" className="input-group" style={{ display: 'none', marginTop: '26px' }}>
              <label style={{ marginBottom: '8px' }}>
                <span data-i18n="social.world">World</span>
                <i
                  className="fa-regular fa-question-circle help-icon"
                  style={{ color: '#fff' }}
                  data-tooltip="Select a world to install Data Packs into"
                  data-i18n-tooltip="addons.datapack_world_tooltip"
                ></i>
              </label>
              <select id="worldSelect" style={{ display: 'none' }}>
                <option value="" data-i18n="global.select_world">
                  Select a world...
                </option>
              </select>
              <div className="custom-select compact-custom-select" id="worldCustomSelect">
                <div className="select-trigger" id="worldSelectTrigger">
                  <div className="select-trigger-content">
                    <div className="select-trigger-icon-fallback" id="worldSelectedIcon">
                      <i className="fas fa-globe-americas"></i>
                    </div>
                    <div className="select-trigger-text">
                      <div className="select-trigger-title" id="worldSelectedTitle" data-i18n="global.select_world">
                        Select a world...
                      </div>
                      <div className="select-trigger-subtitle" id="worldSelectedSubtitle" style={{ display: 'none' }}></div>
                    </div>
                  </div>
                  <div className="select-arrow"></div>
                </div>
                <div className="select-options" id="worldSelectOptions"></div>
              </div>
            </div>

            {/* Message if no moddable profiles */}
            <div id="noModdableProfiles" className="no-moddable-profiles" style={{ display: 'none' }}>
              <i className="fas fa-info-circle"></i>
              <p id="noModdableMessage" data-i18n="mods_menu.no_moddable">
                No installations with Forge or Fabric. Create an installation with a mod loader to download mods.
              </p>
            </div>

            {/* Tab Container */}
            <div id="modsTabsContainer" style={{ display: 'none' }}>
              {/* Tabs */}
              <div className="mods-tabs">
                <button className="mod-tab active" data-tab="download" data-i18n="mods_menu.tab_download">
                  <i className="fas fa-download"></i> Download
                </button>
                <button className="mod-tab" data-tab="installed" data-i18n="mods_menu.tab_installed">
                  <i className="fas fa-cube"></i> Installed
                </button>
              </div>

              {/* Tab Content: Download */}
              <div id="modTabDownload" className="mod-tab-content active">
                <div className="mods-download-flex">
                  <div className="mods-download-main">
                    {/* Search Bar */}
                    <div className="mod-search-container">
                      <input
                        type="text"
                        id="modSearchInput"
                        className="mod-search-bar"
                        placeholder="Search mods in Modrinth..."
                        data-i18n-placeholder="mods_menu.search_placeholder"
                      />
                    </div>

                    {/* Loading State */}
                    <div id="modSearchLoading" className="mod-search-loading" style={{ display: 'none' }}>
                      <div className="spinner"></div>
                      <p data-i18n="mods_menu.searching">Searching mods...</p>
                    </div>

                    {/* Results Grid */}
                    <div id="modSearchResults" className="mod-grid"></div>

                    {/* Pagination Controls */}
                    <div
                      id="modSearchPagination"
                      className="pagination-controls"
                      style={{
                        display: 'none',
                        justifyContent: 'center',
                        gap: '0px',
                        marginTop: '15px',
                        alignItems: 'center'
                      }}
                    >
                      <button
                        id="btnPrevPage"
                        className="btn-square"
                        style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0, margin: 0 }}
                        disabled
                      >
                        <i className="fas fa-chevron-left"></i>
                      </button>
                      <button
                        id="pageIndicator"
                        className="btn-square"
                        style={{
                          pointerEvents: 'none',
                          fontWeight: 'bold',
                          borderRadius: 0,
                          margin: 0,
                          background: 'rgba(79, 172, 254, 0.2)',
                          color: '#fff'
                        }}
                      >
                        1
                      </button>
                      <button
                        id="btnNextPage"
                        className="btn-square"
                        style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, margin: 0 }}
                      >
                        <i className="fas fa-chevron-right"></i>
                      </button>
                    </div>
                  </div>

                  {/* RIGHT: Filter Panel (inside download tab only) */}
                  <div className="mod-sidebar-filters" id="modFiltersContainer">
                    <div className="mod-filters-header">
                      <h3 data-i18n="mods_menu.filters_sort">
                        <i className="fas fa-sliders-h"></i> Filters &amp; Sort
                      </h3>
                    </div>

                    <div className="mod-filters-body" style={{ overflowY: 'auto' }}>
                      {/* Custom Sort Dropdown */}
                      <div className="filter-group">
                        <label data-i18n="mods_menu.sort_by">
                          <i className="fas fa-sort-amount-down"></i> Sort By
                        </label>
                        {/* Hidden native select for value compatibility */}
                        <select id="modSortSelect" style={{ display: 'none' }}>
                          <option value="relevance" data-i18n="mods_menu.sort_relevance">
                            Relevance
                          </option>
                          <option value="downloads" data-i18n="mods_menu.sort_downloads">
                            Most Downloaded
                          </option>
                          <option value="newest" data-i18n="mods_menu.sort_newest">
                            Recently Uploaded
                          </option>
                          <option value="updated" data-i18n="mods_menu.sort_updated">
                            Recently Updated
                          </option>
                        </select>
                        {/* Custom styled dropdown */}
                        <div className="sort-custom-select" id="sortCustomSelect">
                          <div className="sort-trigger" id="sortTrigger">
                            <i className="fas fa-star sort-trigger-icon" id="sortIcon"></i>
                            <span id="sortLabel" data-i18n="mods_menu.sort_relevance">
                              Relevance
                            </span>
                            <i className="fas fa-chevron-down sort-arrow" id="sortArrow"></i>
                          </div>
                          <div className="sort-options" id="sortOptions">
                            <div className="sort-option selected" data-value="relevance" data-icon="fas fa-star">
                              <i className="fas fa-star"></i>
                              <span data-i18n="mods_menu.sort_relevance">Relevance</span>
                            </div>
                            <div className="sort-option" data-value="downloads" data-icon="fas fa-download">
                              <i className="fas fa-download"></i>
                              <span data-i18n="mods_menu.sort_downloads">Most Downloaded</span>
                            </div>
                            <div className="sort-option" data-value="newest" data-icon="fas fa-clock">
                              <i className="fas fa-clock"></i>
                              <span data-i18n="mods_menu.sort_newest">Recently Uploaded</span>
                            </div>
                            <div className="sort-option" data-value="updated" data-icon="fas fa-sync">
                              <i className="fas fa-sync"></i>
                              <span data-i18n="mods_menu.sort_updated">Recently Updated</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="filter-group filter-group-categories">
                        <label data-i18n="mods_menu.categories">
                          <i className="fas fa-tags"></i> Categories
                        </label>
                        <div id="modCategoriesContainer" className="mod-categories-container">
                          <span className="filter-loading" data-i18n="mods_menu.loading_categories">
                            Loading...
                          </span>
                        </div>
                      </div>
                    </div>

                    <button id="applyFiltersBtn" className="btn-apply-filters" data-i18n="mods_menu.apply_changes">
                      <i className="fas fa-check"></i> Apply Changes
                    </button>
                  </div>
                </div>
              </div>

              {/* Tab Content: Installed */}
              <div id="modTabInstalled" className="mod-tab-content">
                {/* Action Bar for Local Files */}
                <div className="installed-mods-actions">
                  <button
                    className="btn-secondary btn-small"
                    id="btnOpenAddonsFolder"
                    title="Open local folder"
                    data-i18n="mods_menu.open_folder"
                  >
                    <i className="fas fa-folder-open"></i> Open Folder
                  </button>
                  <button
                    className="btn-upload-addon"
                    id="btnImportLocalAddon"
                    disabled
                    data-tooltip="Upload a custom addon file"
                    data-i18n-tooltip="addons.upload_addon_tooltip"
                  >
                    <i className="fas fa-file-upload"></i>
                  </button>
                  <span id="installedAddonsTotalLabel" className="installed-addons-total" data-i18n="global.total_addons">
                    Total: 0
                  </span>
                </div>

                {/* Installed Mods List */}
                <div id="installedModsList" className="installed-mods-list">
                  {/* Mods will be loaded dynamically */}
                  <div className="no-mods-message">
                    <i className="fas fa-cube"></i>
                    <p data-i18n="mods_menu.no_mods_installed">No mods installed in this installation</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModsSection;
