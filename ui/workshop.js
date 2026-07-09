// ================================================
// WORKSHOP SYSTEM - workshop.js
// ================================================
(function () {
    'use strict';

    let activeWkTab = 'modpacks';
    let workshopInitialized = false;
    let wkModpacksLoaded = false; // Cache flag — avoid full reload on tab switch

    function api() { return window.pywebview && window.pywebview.api; }

    function escHtml(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function showWkToast(msg, type) {
        type = type || 'error';
        if (window.showToast) window.showToast(msg, type);
    }

    let currentWkUserUid = null;
    let allCommunityModPacks = [];

    async function getLoginState() {
        try {
            const data = await api().get_user_json();
            if (!data || !data.username) { currentWkUserUid = null; return 'none'; }
            currentWkUserUid = data.account_type === 'microsoft' ? (data.firebase_ms_uid || null) : (data.firebase_uid || null);
            if (data.account_type === 'microsoft' || data.account_type === 'helloworld') return 'online';
            return 'offline';
        } catch (e) { currentWkUserUid = null; return 'none'; }
    }

    window.formatVersionString = function(version) {
        if (!version) return 'Unknown Version';
        const raw = String(version).trim();
        if (/^(?:Fabric|Forge|NeoForge|Quilt|Vanilla)\s+1\.\d+/i.test(raw) && (raw.includes('(') || /^Vanilla\s+/i.test(raw))) return raw;

        const lower = raw.toLowerCase();
        let loaderName = null;
        if (lower.includes('neoforge')) loaderName = 'NeoForge';
        else if (lower.includes('forge')) loaderName = 'Forge';
        else if (lower.includes('fabric')) loaderName = 'Fabric';
        else if (lower.includes('quilt')) loaderName = 'Quilt';
        else if (lower.includes('optifine')) loaderName = 'OptiFine';

        const matches = raw.match(/\b\d+\.\d+(?:\.\d+)?(?:-[a-zA-Z0-9\.]+)?\b/g) || [];
        let mcVer = matches.find(function(m) { return m.startsWith('1.'); });
        if (!mcVer && matches.length > 0) mcVer = matches[0];
        let loaderVer = matches.find(function(m) { return m !== mcVer; });

        if (loaderName) {
            if (mcVer && loaderVer) return loaderName + ' ' + mcVer + ' (' + loaderVer + ')';
            if (mcVer) return loaderName + ' ' + mcVer;
            return loaderName + ' (' + raw + ')';
        } else {
            if (lower.startsWith('vanilla')) return raw;
            if (mcVer) return 'Vanilla ' + mcVer;
            return 'Vanilla ' + raw;
        }
    };
    function formatVersionString(version) { return window.formatVersionString(version); }

    function getLoaderFromVersion(version) {
        const v = (version || '').toLowerCase();
        if (v.includes('forge')) return 'Forge';
        if (v.includes('fabric')) return 'Fabric';
        if (v.includes('quilt')) return 'Quilt';
        if (v.includes('neoforge')) return 'NeoForge';
        return null;
    }

    async function resolveIcon(iconName, iconBase64) {
        if (iconBase64) return iconBase64;
        if (!iconName) return 'ui/img/icon.png';
        try {
            const raw = await api().get_profile_icon(iconName);
            return window.resolveImageSource ? window.resolveImageSource(raw) : raw;
        } catch (e) { return 'ui/img/icon.png'; }
    }

    function showWkLoadingScreen() {
        const screen = document.getElementById('wkLoadingScreen');
        if (!screen) return;
        // Position the overlay to cover the main-content area (excluding sidebar)
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            const rect = mainContent.getBoundingClientRect();
            screen.style.left = rect.left + 'px';
            screen.style.top = rect.top + 'px';
            screen.style.width = rect.width + 'px';
            screen.style.height = rect.height + 'px';
            screen.style.right = 'auto';
            screen.style.bottom = 'auto';
        }
        screen.style.display = 'flex';
        screen.classList.remove('fade-out');
    }

    function hideWkLoadingScreen() {
        const screen = document.getElementById('wkLoadingScreen');
        if (screen) {
            screen.classList.add('fade-out');
            setTimeout(() => {
                if (screen && screen.classList.contains('fade-out')) screen.style.display = 'none';
            }, 400);
        }
    }

    window.switchWorkshopTab = function (tab) {
        if (activeWkTab === tab) return; // Already on this tab — do nothing
        const prevTab = activeWkTab;
        activeWkTab = tab;

        document.querySelectorAll('.workshop-tab-btn').forEach(function(b) {
            b.classList.toggle('active', b.dataset.tab === tab);
        });

        // Animate out the current panel, then show the new one
        const panels = document.querySelectorAll('.workshop-tab-panel');
        panels.forEach(function(p) {
            if (p.dataset.panel === prevTab && p.style.display !== 'none') {
                p.classList.add('wk-panel-exit');
                setTimeout(function() {
                    p.style.display = 'none';
                    p.classList.remove('wk-panel-exit');
                }, 220);
            }
        });

        setTimeout(function() {
            panels.forEach(function(p) {
                if (p.dataset.panel === tab) {
                    p.style.display = 'block';
                    p.classList.add('wk-panel-enter');
                    setTimeout(function() { p.classList.remove('wk-panel-enter'); }, 320);
                }
            });

            if (tab === 'modpacks') {
                // Only reload if data hasn't been loaded yet
                if (!wkModpacksLoaded) {
                    showWkLoadingScreen();
                    loadWorkshopModPacks().then(function() {
                        wkModpacksLoaded = true;
                        hideWkLoadingScreen();
                    });
                }
                // If already loaded, just show — no spinner, no reload
            } else if (tab === 'admin') {
                loadWorkshopAdminItems('pnd');
            }
        }, 180);
    };

    async function restoreWkAccordionStates() {
        let states = {};
        try {
            if (api() && api().get_user_json) {
                const user = await api().get_user_json();
                // Only read wkAccordionStates if it's a plain object (not undefined or corrupt)
                const raw = user && user.wkAccordionStates;
                if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
                    states = raw;
                }
            }
        } catch(e) {}
        ['wkMyBody', 'wkOfficialBody', 'wkCommunityBody', 'wkModrinthBody'].forEach(id => {
            try {
                const saved = states[id] || localStorage.getItem('wk_acc_' + id);
                if (saved) {
                    const body = document.getElementById(id);
                    const btn = document.querySelector('[data-accordion="' + id + '"]');
                    if (body) {
                        const shouldOpen = saved === 'open';
                        if (shouldOpen) {
                            body.classList.add('open');
                        } else {
                            body.classList.remove('open');
                        }
                        if (btn) {
                            const arrow = btn.querySelector('.wk-accordion-arrow');
                            if (arrow) arrow.style.transform = shouldOpen ? 'rotate(180deg)' : 'rotate(0deg)';
                        }
                    }
                }
            } catch(e) {}
        });
    }

    window.toggleWkAccordion = async function (id) {
        const body = document.getElementById(id);
        const btn = document.querySelector('[data-accordion="' + id + '"]');
        if (!body) return;
        const isOpen = body.classList.contains('open');
        const newState = !isOpen;
        if (newState) {
            body.classList.add('open');
        } else {
            body.classList.remove('open');
        }
        if (btn) {
            const arrow = btn.querySelector('.wk-accordion-arrow');
            if (arrow) arrow.style.transform = newState ? 'rotate(180deg)' : 'rotate(0deg)';
        }
        try {
            localStorage.setItem('wk_acc_' + id, newState ? 'open' : 'closed');
            if (api() && api().get_user_json && api().save_user_settings) {
                const user = await api().get_user_json();
                const states = (user && user.wkAccordionStates && typeof user.wkAccordionStates === 'object') ? user.wkAccordionStates : {};
                states[id] = newState ? 'open' : 'closed';
                // save_user_settings does a merge (not overwrite) so username stays untouched
                await api().save_user_settings({ wkAccordionStates: states });
            }
        } catch(e) {}
    };

    let isWkAdmin = false;
    let isWkMod = false;
    let activeAdminFilter = 'pnd';

    async function checkAdminAccess() {
        try {
            const res = await api().workshop_check_admin();
            isWkAdmin = res && res.isAdmin;
            isWkMod = res && (res.isMod || res.isAdmin);
            const btn = document.getElementById('wkAdminTabBtn');
            if (btn) btn.style.display = (isWkAdmin || isWkMod) ? 'inline-block' : 'none';
        } catch(e) {
            isWkAdmin = false;
            isWkMod = false;
        }
    }

    let wkModrinthCurrentPage = 1;
    let wkModrinthCurrentQuery = '';
    let wkModrinthCurrentSort = 'relevance';
    let wkModrinthListenersInitialized = false;
    let wkModrinthIsLoading = false;
    let wkModrinthNoMore = false;
    let wkModrinthObserver = null;

    function initWkModrinthListeners() {
        if (wkModrinthListenersInitialized) return;
        wkModrinthListenersInitialized = true;

        const modrinthSearch = document.getElementById('wkModrinthSearchInput');
        let modrinthTimeout = null;
        if (modrinthSearch) {
            modrinthSearch.addEventListener('input', function(e) {
                wkModrinthCurrentQuery = e.target.value.trim();
                clearTimeout(modrinthTimeout);
                modrinthTimeout = setTimeout(function() {
                    window.loadWkModrinthModPacks(1, false);
                }, 400);
            });
        }

        const sentinel = document.getElementById('wkModrinthSentinel');
        if (sentinel && !wkModrinthObserver) {
            wkModrinthObserver = new IntersectionObserver(function(entries) {
                if (entries[0].isIntersecting && !wkModrinthIsLoading && !wkModrinthNoMore) {
                    const modrinthBody = document.getElementById('wkModrinthBody');
                    if (modrinthBody && modrinthBody.classList.contains('open')) {
                        window.loadWkModrinthModPacks(wkModrinthCurrentPage + 1, true);
                    }
                }
            }, { root: null, rootMargin: '300px', threshold: 0.1 });
            wkModrinthObserver.observe(sentinel);
        }
    }

    window.loadWkModrinthModPacks = async function(page = 1, append = false) {
        if (wkModrinthIsLoading) return;
        wkModrinthIsLoading = true;
        wkModrinthCurrentPage = page;
        if (!append) wkModrinthNoMore = false;

        const grid = document.getElementById('wkModrinthGrid');
        const loading = document.getElementById('wkModrinthLoading');
        const moreLoading = document.getElementById('wkModrinthMoreLoading');
        if (!grid) { wkModrinthIsLoading = false; return; }

        if (!append) {
            if (loading) loading.style.display = 'flex';
            if (moreLoading) moreLoading.style.display = 'none';
            grid.innerHTML = '';
        } else {
            if (moreLoading) moreLoading.style.display = 'flex';
        }

        try {
            const limit = 20;
            const queryOptions = {
                sort: wkModrinthCurrentSort,
                limit: limit,
                offset: (page - 1) * limit
            };
            const result = await window.pywebview.api.search_modrinth_mods(wkModrinthCurrentQuery, queryOptions, 'modpack');
            
            if (loading) loading.style.display = 'none';
            if (moreLoading) moreLoading.style.display = 'none';

            if (!result || !result.success) {
                if (!append) {
                    grid.innerHTML = '<div class="wk-empty" style="grid-column: 1/-1;"><i class="fas fa-exclamation-triangle"></i><p>Error searching Modrinth modpacks.</p></div>';
                }
                wkModrinthIsLoading = false;
                return;
            }

            if (result.results.length === 0) {
                if (!append) {
                    grid.innerHTML = '<div class="wk-empty" style="grid-column: 1/-1;"><i class="fas fa-search"></i><p>No Modrinth modpacks found.</p></div>';
                }
                wkModrinthNoMore = true;
                wkModrinthIsLoading = false;
                return;
            }

            if (result.results.length < limit) {
                wkModrinthNoMore = true;
            }

            result.results.forEach(function(mod) {
                if (typeof window.createModCard === 'function') {
                    const card = window.createModCard(mod, 'modpack');
                    grid.appendChild(card);
                }
            });

            wkModrinthIsLoading = false;

            // If sentinel is still visible after appending (e.g. on large screens or initial load), load next page
            const sentinel = document.getElementById('wkModrinthSentinel');
            if (sentinel && !wkModrinthNoMore) {
                const rect = sentinel.getBoundingClientRect();
                if (rect.top < window.innerHeight + 300) {
                    window.loadWkModrinthModPacks(wkModrinthCurrentPage + 1, true);
                }
            }

        } catch (e) {
            if (loading) loading.style.display = 'none';
            if (moreLoading) moreLoading.style.display = 'none';
            if (!append) {
                grid.innerHTML = '<div class="wk-empty" style="grid-column: 1/-1;"><i class="fas fa-exclamation-triangle"></i><p>Error loading Modrinth.</p></div>';
            }
            wkModrinthIsLoading = false;
        }
    };

    window.initWorkshop = async function () {
        initWkModrinthListeners();
        await restoreWkAccordionStates();

        if (workshopInitialized && wkModpacksLoaded) {
            // Already loaded — just refresh admin access silently, no full reload
            checkAdminAccess();
            hideWkLoadingScreen();
            return;
        }

        showWkLoadingScreen();
        workshopInitialized = true;
        await Promise.all([
            loadWorkshopModPacks(),
            checkAdminAccess()
        ]);
        wkModpacksLoaded = true;
        hideWkLoadingScreen();
    };

    async function loadWorkshopModPacks() {
        const officialGrid = document.getElementById('wkOfficialGrid');
        const communityGrid = document.getElementById('wkCommunityGrid');
        const communityLock = document.getElementById('wkCommunityLock');
        if (!officialGrid) return;

        officialGrid.innerHTML = '<div class="wk-loading"><div class="wk-spinner"></div><span>Loading...</span></div>';
        if (communityGrid) communityGrid.innerHTML = '<div class="wk-loading"><div class="wk-spinner"></div><span>Loading...</span></div>';

        const loginState = await getLoginState();

        // Single API call — split result into official / community
        let allItems = [];
        try {
            const res = await api().workshop_get_items('modpack', 'pub');
            allItems = (res && res.items) || [];
        } catch (e) {
            officialGrid.innerHTML = '<div class="wk-empty"><i class="fas fa-exclamation-circle"></i><p>Could not load.</p></div>';
            if (communityGrid) communityGrid.innerHTML = '<div class="wk-empty"><i class="fas fa-exclamation-circle"></i><p>Could not load.</p></div>';
        }

        renderModPackGrid(officialGrid, allItems.filter(function(i) { return i.isOfficial; }));

        if (loginState !== 'online') {
            if (communityLock) communityLock.style.display = 'flex';
            if (communityGrid) communityGrid.innerHTML = '';
            await renderMyPendingItems();
            if (typeof window.loadWkModrinthModPacks === 'function') await window.loadWkModrinthModPacks(1);
            return;
        }

        if (communityLock) communityLock.style.display = 'none';
        allCommunityModPacks = allItems.filter(function(i) { return !i.isOfficial; });
        filterAndSortCommunityModPacks();

        await renderMyPendingItems();
        if (typeof window.loadWkModrinthModPacks === 'function') await window.loadWkModrinthModPacks(1);
    }

    window.filterAndSortCommunityModPacks = function() {
        const communityGrid = document.getElementById('wkCommunityGrid');
        if (!communityGrid) return;
        
        const searchInput = document.getElementById('wkCommunitySearchInput');
        const sortSelect = document.getElementById('wkCommunitySortSelect');
        const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
        const sortType = sortSelect ? sortSelect.value : 'newest';
        
        let filtered = allCommunityModPacks.filter(function(item) {
            if (!query) return true;
            const title = (item.title || '').toLowerCase();
            const desc = (item.desc || '').toLowerCase();
            const author = (item.authorName || '').toLowerCase();
            if (title.includes(query) || desc.includes(query) || author.includes(query)) return true;
            
            const snap = item.snap || {};
            const ver = (snap.version || '').toLowerCase();
            if (ver.includes(query)) return true;
            
            const addons = snap.addons || [];
            for (let i = 0; i < addons.length; i++) {
                const addon = addons[i];
                if (addon) {
                    const addonName = (addon.display_name || addon.title || addon.filename || '').toLowerCase();
                    if (addonName.includes(query)) return true;
                }
            }
            return false;
        });
        
        filtered.sort(function(a, b) {
            const dlA = a.downloads || 0;
            const dlB = b.downloads || 0;
            const lkA = a.likes || (a.likedBy ? a.likedBy.length : 0) || 0;
            const lkB = b.likes || (b.likedBy ? b.likedBy.length : 0) || 0;
            const vwA = a.views || 0;
            const vwB = b.views || 0;
            const timeA = a.ts ? new Date(a.ts).getTime() : 0;
            const timeB = b.ts ? new Date(b.ts).getTime() : 0;
            
            if (sortType === 'downloads_desc') return dlB - dlA;
            if (sortType === 'downloads_asc') return dlA - dlB;
            if (sortType === 'likes_desc') return lkB - lkA;
            if (sortType === 'likes_asc') return lkA - lkB;
            if (sortType === 'views_desc') return vwB - vwA;
            if (sortType === 'views_asc') return vwA - vwB;
            if (sortType === 'oldest') return timeA - timeB;
            return timeB - timeA; // newest by default
        });
        
        renderModPackGrid(communityGrid, filtered);
    };

    window.toggleWkSortMenu = function(e) {
        if (e && e.stopPropagation) e.stopPropagation();
        const menu = document.getElementById('wkSortMenu');
        if (menu) menu.classList.toggle('show');
    };

    window.selectWkSort = function(val, label, e) {
        if (e && e.stopPropagation) e.stopPropagation();
        const input = document.getElementById('wkCommunitySortSelect');
        const labelSpan = document.getElementById('wkSortLabel');
        const menu = document.getElementById('wkSortMenu');
        if (input) input.value = val;
        if (labelSpan) labelSpan.textContent = label;
        if (menu) menu.classList.remove('show');
        
        document.querySelectorAll('.wk-sort-item').forEach(function(item) {
            item.classList.toggle('active', item.dataset.val === val);
        });
        
        if (typeof window.filterAndSortCommunityModPacks === 'function') {
            window.filterAndSortCommunityModPacks();
        }
    };

    document.addEventListener('click', function(e) {
        const menu = document.getElementById('wkSortMenu');
        if (menu && menu.classList.contains('show') && !e.target.closest('.wk-custom-sort-wrap')) {
            menu.classList.remove('show');
        }
    });

    async function renderMyPendingItems() {
        const mySection = document.getElementById('wkMyItemsSection');
        const myGrid = document.getElementById('wkMyItemsGrid');
        if (!mySection || !myGrid) return;
        try {
            const res = await api().workshop_get_my_items();
            const items = (res && res.items) || [];
            if (items.length === 0) { mySection.style.display = 'none'; return; }
            mySection.style.display = 'block';
            myGrid.innerHTML = items.map(function(item) { return renderModPackCardHTML(item, 'mine'); }).join('');
            loadCardIcons(myGrid);
        } catch (e) {
            mySection.style.display = 'none';
        }
    }

    function renderModPackGrid(container, items) {
        if (!container) return;
        if (!items || items.length === 0) {
            container.innerHTML = '<div class="wk-empty"><i class="fas fa-box-open"></i><p>No mod packs yet.</p></div>';
            return;
        }
        container.innerHTML = items.map(function(item) { return renderModPackCardHTML(item, 'public'); }).join('');
        loadCardIcons(container);
    }

    function renderModPackCardHTML(item, context) {
        const statusBadge = (context === 'mine' || context === 'admin') ? '<span class="wk-status-badge wk-status-' + (item.xst || 'pnd') + '">' + getStatusLabel(item.xst) + '</span>' : '';
        const canInstall = (item.xst === 'pub' || context === 'public') && context !== 'admin';
        const deniedNote = ((context === 'mine' || context === 'admin') && item.xst === 'njt' && item.note) ? '<div class="wk-denied-note"><i class="fas fa-ban"></i> ' + escHtml(item.note) + '</div>' : '';
        
        // Top right download count (not in 'mine', because in 'mine' stats are below description)
        const dlBadge = context !== 'mine' ? 
            '<div class="wk-card-dl-badge" title="Downloads"><i class="fas fa-download"></i> <span class="wk-dl-count-' + escHtml(item.id) + '">' + (item.downloads || 0) + '</span></div>' : '';
        
        // Stats block for 'mine' below description
        const mineStatsBlock = context === 'mine' ? 
            '<div class="wk-card-stats-block">' +
                '<div class="wk-card-stat-line"><i class="fas fa-download" style="color: #4facfe;"></i> <span><strong style="color:#fff;" class="wk-dl-count-' + escHtml(item.id) + '">' + (item.downloads || 0) + '</strong> Downloads</span></div>' +
                '<div class="wk-card-stat-line"><i class="fas fa-heart" style="color: #ff5252;"></i> <span><strong style="color:#fff;" class="wk-like-count-' + escHtml(item.id) + '">' + (item.likes || 0) + '</strong> Likes</span></div>' +
                '<div class="wk-card-stat-line"><i class="fas fa-eye" style="color: #00e676;"></i> <span><strong style="color:#fff;">' + (item.views || 0) + '</strong> Views</span></div>' +
            '</div>' : '';

        const adminActions = context === 'admin' ? 
            '<button class="wk-btn wk-btn-approve" onclick="approveWkItem(\'' + escHtml(item.id) + '\')" title="Approve"><i class="fas fa-check"></i></button>' +
            (isWkAdmin ? '<button class="wk-btn wk-btn-official" onclick="toggleOfficialWkItem(\'' + escHtml(item.id) + '\', ' + (item.isOfficial ? 'true' : 'false') + ')" title="' + (item.isOfficial ? 'Remove Official' : 'Make Official') + '"><i class="' + (item.isOfficial ? 'fas' : 'far') + ' fa-star" ' + (item.isOfficial ? 'style="color:#ffaa00;"' : '') + '></i></button>' : '') +
            '<button class="wk-btn wk-btn-reject" onclick="rejectWkItem(\'' + escHtml(item.id) + '\')" title="Deny"><i class="fas fa-ban"></i></button>' +
            (isWkAdmin ? '<button class="wk-btn wk-btn-delete" onclick="deleteWkItem(\'' + escHtml(item.id) + '\')" title="Delete"><i class="fas fa-trash"></i></button>' : '') : '';
        const myActions = context === 'mine' ? 
            '<button class="wk-btn wk-btn-delete" onclick="deleteWkItem(\'' + escHtml(item.id) + '\')" title="Delete"><i class="fas fa-trash"></i></button>' : '';
        
        // Like button for cards in bottom right (except in 'mine') - ONLY HEART, NO NUMBER!
        const isLiked = Array.isArray(item.likedBy) && currentWkUserUid && item.likedBy.includes(currentWkUserUid);
        const likeBtn = context !== 'mine' ? 
            '<button class="wk-btn wk-like-btn-card ' + (isLiked ? 'liked' : '') + '" onclick="toggleWkLike(\'' + escHtml(item.id) + '\', event)" title="Like" data-id="' + escHtml(item.id) + '" style="margin-left: auto;">' +
                '<i class="' + (isLiked ? 'fas fa-heart' : 'far fa-heart') + '"></i>' +
            '</button>' : '';

        return '<div class="wk-card" data-id="' + escHtml(item.id) + '">' +
            statusBadge +
            '<div class="wk-card-header">' +
                '<img class="wk-card-icon" src="ui/img/icon.png" data-icon="' + escHtml(item.icon || '') + '" data-iconb64="' + escHtml(item.iconB64 || '') + '">' +
                '<div class="wk-card-title-wrap">' +
                    '<div class="wk-card-title">' + escHtml(item.title) + '</div>' +
                    '<div class="wk-card-author">' + escHtml(item.authorName || 'Unknown') + '</div>' +
                '</div>' +
                dlBadge +
            '</div>' +
            '<div class="wk-card-desc">' + escHtml((item.desc || '').slice(0, 120)) + ((item.desc || '').length > 120 ? '\u2026' : '') + '</div>' +
            mineStatsBlock +
            deniedNote +
            '<div class="wk-card-actions">' +
                '<button class="wk-btn wk-btn-secondary" onclick="openWkItemModal(\'' + escHtml(item.id) + '\')"><i class="fas fa-info-circle"></i> More Info</button>' +
                (canInstall ? '<button class="wk-btn wk-btn-primary" onclick="installWkModPack(\'' + escHtml(item.id) + '\')"><i class="fas fa-download"></i> Install</button>' : '') +
                adminActions +
                myActions +
                likeBtn +
            '</div>' +
        '</div>';
    }

    function getStatusLabel(xst) {
        if (xst === 'pub') return 'Public';
        if (xst === 'njt') return 'Denied';
        return 'Pending Review';
    }

    function loadCardIcons(container) {
        container.querySelectorAll('.wk-card-icon[data-icon]').forEach(async function(img) {
            if (img.dataset.loaded) return;
            img.dataset.loaded = 'true';
            const src = await resolveIcon(img.dataset.icon, img.dataset.iconb64 || null);
            img.src = src;
        });
    }

    let wkItemCache = {};

    async function getWkItem(id) {
        if (wkItemCache[id]) return wkItemCache[id];
        try {
            const res = await api().workshop_get_item(id);
            if (res && res.item) { wkItemCache[id] = res.item; return res.item; }
        } catch (e) {}
        return null;
    }

    window.openWkItemModal = async function (id) {
        if (window._wkViewTimer) { clearTimeout(window._wkViewTimer); window._wkViewTimer = null; }
        const modal = document.getElementById('wkItemModal');
        if (!modal) return;

        document.getElementById('wkModalIcon').src = 'ui/img/icon.png';
        document.getElementById('wkModalTitle').textContent = 'Loading...';
        document.getElementById('wkModalDesc').textContent = '';
        document.getElementById('wkModalVersion').textContent = '';
        const authorEl = document.getElementById('wkModalAuthor');
        const dateEl = document.getElementById('wkModalDate');
        if (authorEl) authorEl.textContent = 'Loading...';
        if (dateEl) dateEl.textContent = 'Loading...';
        const loaderEl = document.getElementById('wkModalLoader');
        if (loaderEl) { loaderEl.textContent = ''; loaderEl.style.display = 'none'; }
        const modsList = document.getElementById('wkModalModsList');
        if (modsList) modsList.innerHTML = '<div style="text-align:center;padding:20px;color:#aaa;">Loading...</div>';
        const installBtn = document.getElementById('wkModalInstallBtn');
        if (installBtn) installBtn.dataset.id = id;
        const modsTabBtn = document.getElementById('wkModalModsTabBtn');
        const rpTabBtn = document.getElementById('wkModalResourcePacksTabBtn');
        const shTabBtn = document.getElementById('wkModalShadersTabBtn');
        if (modsTabBtn) modsTabBtn.style.display = 'none';
        if (rpTabBtn) rpTabBtn.style.display = 'none';
        if (shTabBtn) shTabBtn.style.display = 'none';

        modal.classList.add('show');
        switchWkModalTab('general');

        const item = await getWkItem(id);
        if (!item) { document.getElementById('wkModalTitle').textContent = 'Not found'; return; }

        const iconSrc = await resolveIcon(item.icon, item.iconB64 || null);
        document.getElementById('wkModalIcon').src = iconSrc;
        document.getElementById('wkModalTitle').textContent = item.title || '';
        document.getElementById('wkModalDesc').textContent = item.desc || '';
        if (authorEl) authorEl.textContent = item.authorName || 'Unknown';
        if (dateEl) {
            try {
                dateEl.textContent = item.ts ? new Date(item.ts).toLocaleDateString() : 'Unknown date';
            } catch (_) {
                dateEl.textContent = item.ts || 'Unknown date';
            }
        }

        const snap = item.snap || {};
        document.getElementById('wkModalVersion').textContent = formatVersionString(snap.version || '');

        const loader = getLoaderFromVersion(snap.version || '');
        if (loaderEl) {
            if (loader) {
                loaderEl.textContent = loader;
                loaderEl.style.display = 'inline-block';
            } else {
                loaderEl.style.display = 'none';
            }
        }
        const addons = snap.addons || [];
        const mods = addons.filter(function(a) { return a && (a.type === 'mod' || a.type === 'file' || (!a.type && (a.filename && a.filename.endsWith('.jar'))) || (!a.type && a.project_id)); });
        const resourcepacks = addons.filter(function(a) { return a && (a.type === 'resourcepack' || (!a.type && a.filename && a.filename.endsWith('.zip'))); });
        const shaders = addons.filter(function(a) { return a && a.type === 'shader'; });

        if (modsTabBtn) modsTabBtn.style.display = (mods.length > 0 || loader) ? 'inline-block' : 'none';
        if (rpTabBtn) rpTabBtn.style.display = resourcepacks.length > 0 ? 'inline-block' : 'none';
        if (shTabBtn) shTabBtn.style.display = shaders.length > 0 ? 'inline-block' : 'none';

        loadWkModalAddonList('wkModalModsList', mods, 'No mods in this pack.', 'fa-cube');
        loadWkModalAddonList('wkModalResourcePacksList', resourcepacks, 'No resource packs in this pack.', 'fa-palette');
        loadWkModalAddonList('wkModalShadersList', shaders, 'No shaders in this pack.', 'fa-magic');

        const adminBar = document.getElementById('wkModalAdminBar');
        if (adminBar) {
            adminBar.style.display = (isWkAdmin || isWkMod) ? 'flex' : 'none';
            if ((isWkAdmin || isWkMod) && item) {
                const approveBtn = document.getElementById('wkModalApproveBtn');
                const rejectBtn = document.getElementById('wkModalRejectBtn');
                const officialBtn = document.getElementById('wkModalOfficialBtn');
                const deleteBtn = document.getElementById('wkModalDeleteBtn');
                if (approveBtn) approveBtn.dataset.id = id;
                if (rejectBtn) rejectBtn.dataset.id = id;
                if (officialBtn) {
                    officialBtn.style.display = isWkAdmin ? 'inline-block' : 'none';
                    officialBtn.dataset.id = id;
                    officialBtn.dataset.official = item.isOfficial ? 'true' : 'false';
                    officialBtn.innerHTML = item.isOfficial ? '<i class="fas fa-star" style="color:#ffaa00;"></i> Official' : '<i class="far fa-star"></i> Make Official';
                }
                if (deleteBtn) {
                    deleteBtn.style.display = isWkAdmin ? 'inline-block' : 'none';
                    deleteBtn.dataset.id = id;
                }
            }
        }

        // Populate modal stats and like button - ONLY HEART, NO NUMBER!
        const modalLikeBtn = document.getElementById('wkModalLikeBtn');
        if (modalLikeBtn) {
            modalLikeBtn.dataset.id = id;
            const isLiked = Array.isArray(item.likedBy) && currentWkUserUid && item.likedBy.includes(currentWkUserUid);
            modalLikeBtn.className = 'wk-btn wk-like-btn-card ' + (isLiked ? 'liked' : '');
            modalLikeBtn.innerHTML = isLiked ? '<i class="fas fa-heart" style="color:#ff5252;"></i>' : '<i class="far fa-heart"></i>';
        }
        const dlEl = document.getElementById('wkModalDownloads');
        const lkEl = document.getElementById('wkModalLikes');
        const vwEl = document.getElementById('wkModalViews');
        if (dlEl) dlEl.textContent = item.downloads || (item.dlUsers ? item.dlUsers.length : 0) || 0;
        if (lkEl) lkEl.textContent = item.likes || (item.likedBy ? item.likedBy.length : 0) || 0;
        if (vwEl) vwEl.textContent = item.views || 0;

        // Start 3-second view timer for non-authors
        if (item && item.uid !== currentWkUserUid) {
            window._wkViewTimer = setTimeout(async function() {
                try {
                    const res = await api().workshop_record_view(id);
                    if (res && res.success) {
                        if (wkItemCache[id]) wkItemCache[id].views = res.views;
                        const vSpan = document.getElementById('wkModalViews');
                        const modalEl = document.getElementById('wkItemModal');
                        if (vSpan && modalEl && modalEl.classList.contains('show')) {
                            vSpan.textContent = res.views;
                        }
                    }
                } catch(e) {}
            }, 3000);
        }
    };

    window.closeWkItemModal = function () {
        if (window._wkViewTimer) { clearTimeout(window._wkViewTimer); window._wkViewTimer = null; }
        const modal = document.getElementById('wkItemModal');
        if (modal) modal.classList.remove('show');
    };

    window.switchWkModalTab = function (tab) {
        document.querySelectorAll('.wk-modal-tab-btn').forEach(function(b) { b.classList.toggle('active', b.dataset.tab === tab); });
        ['general', 'mods', 'resourcepacks', 'shaders'].forEach(function(t) {
            const el = document.getElementById(t === 'general' ? 'wkModalGeneral' : (t === 'mods' ? 'wkModalMods' : (t === 'resourcepacks' ? 'wkModalResourcePacks' : 'wkModalShaders')));
            if (el) el.style.display = (tab === t) ? 'block' : 'none';
        });
    };

    async function loadWkModalAddonList(containerId, items, emptyText, iconClass) {
        const container = document.getElementById(containerId);
        if (!container) return;
        if (!items || items.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:20px;color:#aaa;font-style:italic;">' + emptyText + '</div>';
            return;
        }
        const htmls = [];
        for (let i = 0; i < items.length; i++) {
            const addon = items[i];
            if (addon.project_id) {
                try {
                    const details = await api().get_mod_details(addon.project_id);
                    if (details && details.success && details.details) {
                        const mod = details.details;
                        htmls.push('<div class="wk-mod-item"><div class="wk-mod-icon"><img src="' + escHtml(mod.icon_url || 'ui/img/icon.png') + '" onerror="this.src=\'ui/img/icon.png\'"></div><div class="wk-mod-info"><div class="wk-mod-name">' + escHtml(mod.title) + '</div><div class="wk-mod-file">' + escHtml(addon.filename || '') + '</div></div></div>');
                        continue;
                    }
                } catch (e) {}
            }
            htmls.push('<div class="wk-mod-item"><div class="wk-mod-icon"><i class="fas ' + iconClass + '" style="color:#4facfe;font-size:18px;"></i></div><div class="wk-mod-info"><div class="wk-mod-name">' + escHtml(addon.display_name || addon.filename || 'Unknown item') + '</div></div></div>');
        }
        container.innerHTML = htmls.join('');
    }

    window.installWkModPack = async function (id) {
        let item = wkItemCache[id];
        if (!item) item = await getWkItem(id);
        if (!item) { showWkToast('Could not load mod pack data'); return; }
        
        // Record download if not author
        if (item.uid !== currentWkUserUid) {
            try {
                api().workshop_record_download(id).then(function(res) {
                    if (res && res.success) {
                        if (wkItemCache[id]) {
                            wkItemCache[id].downloads = res.downloads;
                            wkItemCache[id].dlUsers = res.dlUsers;
                        }
                        document.querySelectorAll('.wk-dl-count-' + id).forEach(function(el) {
                            el.textContent = res.downloads;
                        });
                        const dlEl = document.getElementById('wkModalDownloads');
                        if (dlEl && document.getElementById('wkModalInstallBtn')?.dataset.id === id) {
                            dlEl.textContent = res.downloads;
                        }
                    }
                }).catch(function(){});
            } catch(e) {}
        }

        const snap = item.snap || {};
        const payload = {
            profile: {
                name: item.title || 'Mod Pack',
                version: snap.version || '',
                icon: item.icon || '',
                addons: snap.addons || [],
                jvm_args: snap.jvmArgs || null
            }
        };
        const contentStr = '$$PROFILE_SHARE$$' + JSON.stringify(payload);
        if (window.installSharedProfile) {
            window.closeWkItemModal();
            window.installSharedProfile(contentStr);
        } else {
            showWkToast('Install function not available');
        }
    };

    window.toggleWkLike = async function(id, event) {
        if (event && event.stopPropagation) event.stopPropagation();
        if (!currentWkUserUid) {
            showWkToast('You must be logged in to like items.');
            return;
        }
        let item = wkItemCache[id];
        if (!item) item = await getWkItem(id);
        if (item && item.uid === currentWkUserUid) {
            showWkToast('You cannot like your own modpack.');
            return;
        }
        try {
            const res = await api().workshop_toggle_like(id);
            if (res && res.success) {
                if (wkItemCache[id]) {
                    wkItemCache[id].likes = res.likes;
                    wkItemCache[id].likedBy = res.likedBy;
                }
                document.querySelectorAll('.wk-like-count-' + id).forEach(function(el) {
                    el.textContent = res.likes;
                });
                document.querySelectorAll('.wk-like-btn-card[data-id="' + id + '"]').forEach(function(btn) {
                    btn.classList.toggle('liked', res.isLiked);
                    const icon = btn.querySelector('i');
                    if (icon) icon.className = res.isLiked ? 'fas fa-heart' : 'far fa-heart';
                });
                const modalLikeBtn = document.getElementById('wkModalLikeBtn');
                if (modalLikeBtn && modalLikeBtn.dataset.id === id) {
                    modalLikeBtn.classList.toggle('liked', res.isLiked);
                    const icon = modalLikeBtn.querySelector('i');
                    if (icon) icon.className = res.isLiked ? 'fas fa-heart' : 'far fa-heart';
                    const countSpan = document.getElementById('wkModalLikeCount');
                    if (countSpan) countSpan.textContent = res.likes;
                }
                const modalLikesStat = document.getElementById('wkModalLikes');
                if (modalLikesStat && document.getElementById('wkModalInstallBtn')?.dataset.id === id) {
                    modalLikesStat.textContent = res.likes;
                }
            } else {
                showWkToast((res && res.error) || 'Failed to like item');
            }
        } catch(e) {
            showWkToast('Error: ' + e.message);
        }
    };

    // Create Modal & Profile Selector
    let wkCreateStep = 1;
    let wkCreateType = null;
    let wkSelectedInstallation = null;
    let wkCustomIconBase64 = null;
    let wkCustomIconName = null;
    let wkLoadedProfiles = [];

    window.openWkCreateModal = function () {
        const btn = document.getElementById('wkPublishBtn');
        if (btn && btn.classList.contains('locked-feature')) {
            const modal = document.getElementById('featureLockedHWModal');
            if (modal) modal.classList.add('show');
            return;
        }
        wkCreateStep = 1;
        wkCreateType = null;
        wkSelectedInstallation = null;
        wkCustomIconBase64 = null;
        wkCustomIconName = null;
        resetWkCreateModal();
        const modal = document.getElementById('wkCreateModal');
        if (modal) modal.classList.add('show');
        const input = document.getElementById('wkCreateTitle');
        if (input) setTimeout(() => input.focus(), 50);
    };

    window.closeWkCreateModal = function () {
        const modal = document.getElementById('wkCreateModal');
        if (modal) modal.classList.remove('show');
    };

    function resetWkCreateModal() {
        const s1 = document.getElementById('wkCreateStep1');
        const s2 = document.getElementById('wkCreateStep2');
        if (s1) { s1.style.display = 'block'; s1.style.opacity = '1'; }
        if (s2) { s2.style.display = 'none'; s2.style.opacity = '0'; }
        const titleEl = document.getElementById('wkCreateTitle');
        const descEl = document.getElementById('wkCreateDesc');
        if (titleEl) titleEl.value = '';
        if (descEl) descEl.value = '';
        
        const card = document.getElementById('wkSelectedProfileCard');
        if (card) card.classList.add('empty');
        const titleText = document.getElementById('wkSelectedProfileTitle');
        if (titleText) titleText.textContent = 'Select an installation...';
        const subText = document.getElementById('wkSelectedProfileSubtitle');
        if (subText) subText.textContent = 'Click to choose which installation to pack';
        
        const placeholder = document.getElementById('wkCreateIconPlaceholder');
        const preview = document.getElementById('wkCreateIconPreview');
        if (placeholder) placeholder.style.display = 'flex';
        if (preview) { preview.style.display = 'none'; preview.src = ''; }
        
        const extWarn = document.getElementById('wkExternalAddonsWarning');
        if (extWarn) extWarn.style.display = 'none';
        
        document.querySelectorAll('.wk-type-btn').forEach(function(b) { b.classList.remove('selected'); });
    }

    window.selectWkCreateType = function (type) {
        if (type === 'theme') { showWkToast('Themes coming soon!'); return; }
        wkCreateType = type;
        document.querySelectorAll('.wk-type-btn').forEach(function(b) { b.classList.toggle('selected', b.dataset.type === type); });
        goToWkCreateStep2();
    };

    window.goToWkCreateStep2 = function () {
        const s1 = document.getElementById('wkCreateStep1');
        const s2 = document.getElementById('wkCreateStep2');
        if (!s1 || !s2) return;
        s1.style.transition = 'opacity 0.2s ease';
        s1.style.opacity = '0';
        setTimeout(function() {
            s1.style.display = 'none';
            s2.style.display = 'block';
            s2.style.opacity = '0';
            s2.style.transition = 'opacity 0.25s ease';
            setTimeout(function() { s2.style.opacity = '1'; }, 20);
        }, 200);
    };

    window.backWkCreateStep = function () {
        const s1 = document.getElementById('wkCreateStep1');
        const s2 = document.getElementById('wkCreateStep2');
        if (!s1 || !s2) return;
        s2.style.opacity = '0';
        setTimeout(function() {
            s2.style.display = 'none';
            s1.style.display = 'block';
            setTimeout(function() { s1.style.opacity = '1'; }, 20);
        }, 200);
    };

    // Profile Select Sub-Modal
    window.openWkProfileSelectModal = async function () {
        const modal = document.getElementById('wkProfileSelectModal');
        const list = document.getElementById('wkProfileSelectList');
        if (!modal || !list) return;
        
        list.innerHTML = '<div class="wk-loading"><div class="wk-spinner"></div><span>Loading installations...</span></div>';
        modal.classList.add('show');
        
        try {
            const res = await api().get_profiles();
            const profilesMap = (res && res.profiles) ? res.profiles : (res || {});
            wkLoadedProfiles = Object.entries(profilesMap).map(function([id, p]) {
                return Object.assign({ id: id }, p);
            }).filter(function(p) {
                const nameLow = String(p.name || '').trim().toLowerCase();
                return nameLow !== 'latest release' && nameLow !== 'latest snapshot';
            });
            if (wkLoadedProfiles.length === 0) {
                list.innerHTML = '<div class="wk-empty"><i class="fas fa-folder-open"></i><p>No installations found. Create one first!</p></div>';
                return;
            }
            list.innerHTML = wkLoadedProfiles.map(function(p) {
                const modCount = (p.addons || []).filter(function(a){ return a && a.type === 'mod'; }).length;
                return '<div class="wk-profile-item-card" onclick="selectWkProfileForPack(\'' + escHtml(p.id) + '\')">' +
                    '<div class="wk-profile-item-icon"><img src="ui/img/icon.png" data-icon="' + escHtml(p.icon || '') + '"></div>' +
                    '<div class="wk-profile-item-info">' +
                        '<div class="wk-profile-item-name">' + escHtml(p.name) + '</div>' +
                        '<div class="wk-profile-item-meta">' + escHtml(formatVersionString(p.version || 'Vanilla')) + ' &bull; ' + modCount + ' mods</div>' +
                    '</div>' +
                    '<i class="fas fa-chevron-right wk-profile-item-arrow"></i>' +
                '</div>';
            }).join('');
            
            list.querySelectorAll('img[data-icon]').forEach(async function(img) {
                const src = await resolveIcon(img.dataset.icon, null);
                img.src = src;
            });
        } catch (e) {
            list.innerHTML = '<div class="wk-empty"><p>Error loading installations</p></div>';
        }
    };

    window.closeWkProfileSelectModal = function () {
        const modal = document.getElementById('wkProfileSelectModal');
        if (modal) modal.classList.remove('show');
    };

    window.selectWkProfileForPack = async function (id) {
        const p = wkLoadedProfiles.find(function(x){ return String(x.id) === String(id); });
        if (!p) return;
        
        let profileAddons = p.addons || [];
        try {
            const resMods = await api().get_installed_addons(p.id, 'mod');
            const resRp = await api().get_installed_addons(p.id, 'resourcepack');
            const resSh = await api().get_installed_addons(p.id, 'shader');
            let combined = [];
            if (resMods && resMods.success && resMods.mods) combined = combined.concat(resMods.mods.map(function(m){ return Object.assign({}, m, {type: 'mod', state: (m.enabled !== false && m.state !== 'disabled') ? 'enabled' : 'disabled', enabled: (m.enabled !== false && m.state !== 'disabled')}); }));
            if (resRp && resRp.success && resRp.mods) combined = combined.concat(resRp.mods.map(function(m){ return Object.assign({}, m, {type: 'resourcepack', state: (m.enabled !== false && m.state !== 'disabled') ? 'enabled' : 'disabled', enabled: (m.enabled !== false && m.state !== 'disabled')}); }));
            if (resSh && resSh.success && resSh.mods) combined = combined.concat(resSh.mods.map(function(m){ return Object.assign({}, m, {type: 'shader', state: (m.enabled !== false && m.state !== 'disabled') ? 'enabled' : 'disabled', enabled: (m.enabled !== false && m.state !== 'disabled')}); }));
            if (combined.length > 0) profileAddons = combined;
        } catch(err) {}

        wkSelectedInstallation = {
            id: p.id,
            name: p.name || '',
            version: p.version || '',
            icon: p.icon || '',
            jvm_args: p.jvm_args || null,
            addons: profileAddons
        };

        const titleEl = document.getElementById('wkCreateTitle');
        if (titleEl && !titleEl.value) titleEl.value = p.name || '';

        const card = document.getElementById('wkSelectedProfileCard');
        if (card) card.classList.remove('empty');
        
        const titleText = document.getElementById('wkSelectedProfileTitle');
        if (titleText) titleText.textContent = p.name;
        
        // Only count addons that have a Modrinth project_id (these are the ones that will actually be published)
        const modCountWithId = profileAddons.filter(function(a){ return a && a.project_id; }).length;
        const modCountTotal = profileAddons.filter(function(a){ return a && (a.type === 'mod' || a.type === 'file' || (a.filename && a.filename.endsWith('.jar')) || a.project_id); }).length || profileAddons.length;
        const subText = document.getElementById('wkSelectedProfileSubtitle');
        const customCount = modCountTotal - modCountWithId;
        let subtitleText = 'Version: ' + formatVersionString(p.version || 'Vanilla') + ' \u2022 ' + modCountWithId + ' mods to publish';
        if (customCount > 0) subtitleText += ' (' + customCount + ' custom/local excluded)';
        if (subText) subText.textContent = subtitleText;

        // Show/hide the external addons warning
        const extWarn = document.getElementById('wkExternalAddonsWarning');
        const extWarnDesc = document.getElementById('wkExternalAddonsWarningDesc');
        if (extWarn) {
            if (customCount > 0) {
                extWarn.style.display = 'flex';
                if (extWarnDesc) {
                    extWarnDesc.textContent = customCount + ' local/manual mod' + (customCount > 1 ? 's' : '') +
                        ' won\'t be uploaded (no Modrinth ID). Only mods installed through HelloWorld will be published.';
                }
            } else {
                extWarn.style.display = 'none';
            }
        }

        if (!wkCustomIconName) {
            wkCustomIconName = p.icon || '';
            const placeholder = document.getElementById('wkCreateIconPlaceholder');
            const preview = document.getElementById('wkCreateIconPreview');
            if (placeholder) placeholder.style.display = 'none';
            if (preview) {
                preview.style.display = 'block';
                preview.src = await resolveIcon(p.icon, null);
            }
        }
        closeWkProfileSelectModal();
    };

    window.openWkIconSelector = function (e) {
        if (e && e.stopPropagation) e.stopPropagation();
        window._wkIconMode = true;
        const imageModal = document.getElementById('imageModal');
        if (window.loadImageModal) {
            window.loadImageModal().then(function() {
                if (imageModal) imageModal.classList.add('show');
            });
        } else {
            if (imageModal) imageModal.classList.add('show');
        }
    };

    window.submitWkItem = async function () {
        const titleEl = document.getElementById('wkCreateTitle');
        const descEl = document.getElementById('wkCreateDesc');
        const title = (titleEl ? titleEl.value : '').trim().slice(0, 30);
        const desc = (descEl ? descEl.value : '').trim().slice(0, 200);
        if (!title) { showWkToast('Please enter a title'); return; }
        if (title.length > 30) { showWkToast('Title must be at most 30 characters'); return; }
        if (!desc) { showWkToast('Please enter a description'); return; }
        if (desc.length > 200) { showWkToast('Description must be at most 200 characters'); return; }
        if (!wkSelectedInstallation) { showWkToast('Please select an installation'); return; }

        const btn = document.getElementById('wkSubmitBtn');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...'; }

        try {
            // Filter addons: only include those with a Modrinth project_id and version_id.
            // Custom/local mods (detected from files without IDs) are excluded from workshop uploads.
            const allAddons = wkSelectedInstallation.addons || [];
            const publishableAddons = allAddons.filter(function(a) {
                return a && a.project_id && a.project_id.length > 0;
            });
            const snap = {
                version: wkSelectedInstallation.version || '',
                addons: publishableAddons,
                jvmArgs: wkSelectedInstallation.jvm_args || null
            };
            const data = {
                type: 'modpack',
                title: title,
                desc: desc,
                icon: wkCustomIconName || wkSelectedInstallation.icon || '',
                iconB64: wkCustomIconBase64 || null,
                snap: snap
            };
            const res = await api().workshop_submit_item(data);
            if (res && res.success) {
                window.closeWkCreateModal();
                showWkToast('Mod pack submitted for review!', 'success');
                wkItemCache = {};
                setTimeout(function() { renderMyPendingItems(); }, 500);
            } else {
                showWkToast((res && res.error) || 'Submission failed');
            }
        } catch (e) {
            showWkToast('Error: ' + e.message);
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit for Review'; }
        }
    };

    // --- Admin Moderation Functions ---
    window.filterWkAdminItems = function(filter) {
        activeAdminFilter = filter || 'pnd';
        document.querySelectorAll('.wk-admin-filter-btn').forEach(function(b) {
            b.classList.toggle('active', b.dataset.filter === activeAdminFilter);
        });
        loadWorkshopAdminItems(activeAdminFilter);
    };

    async function loadWorkshopAdminItems(statusFilter) {
        const grid = document.getElementById('wkAdminGrid');
        if (!grid) return;
        grid.innerHTML = '<div class="wk-loading"><div class="wk-spinner"></div><span>Loading admin items...</span></div>';
        try {
            const res = await api().workshop_admin_get_items(statusFilter || activeAdminFilter);
            const items = (res && res.items) || [];
            if (items.length === 0) {
                grid.innerHTML = '<div class="wk-empty"><i class="fas fa-shield-alt"></i><p>No items found for this filter.</p></div>';
                return;
            }
            grid.innerHTML = items.map(function(item) { return renderModPackCardHTML(item, 'admin'); }).join('');
            loadCardIcons(grid);
        } catch(e) {
            grid.innerHTML = '<div class="wk-empty"><i class="fas fa-exclamation-circle"></i><p>Error loading admin items.</p></div>';
        }
    }

    window.approveWkItem = async function(id) {
        if (!confirm('Approve and publish this item to the community?')) return;
        try {
            const res = await api().workshop_moderate_item(id, 'pub', '', null);
            if (res && res.success) {
                showWkToast('Item approved successfully', 'success');
                wkItemCache = {};
                if (activeWkTab === 'admin') loadWorkshopAdminItems(activeAdminFilter);
                if (activeWkTab === 'modpacks') loadWorkshopModPacks();
                closeWkItemModal();
            } else {
                showWkToast((res && res.error) || 'Failed to approve item');
            }
        } catch(e) { showWkToast('Error: ' + e.message); }
    };

    let currentRejectId = null;
    window.rejectWkItem = function(id) {
        currentRejectId = id;
        const modal = document.getElementById('wkRejectModal');
        const input = document.getElementById('wkRejectNoteInput');
        if (input) input.value = '';
        if (modal) modal.classList.add('show');
        if (input) setTimeout(() => input.focus(), 50);
    };

    window.closeWkRejectModal = function() {
        const modal = document.getElementById('wkRejectModal');
        if (modal) modal.classList.remove('show');
        currentRejectId = null;
    };

    window.confirmRejectWkItem = async function() {
        if (!currentRejectId) return;
        const input = document.getElementById('wkRejectNoteInput');
        const note = input ? input.value.trim() : '';
        if (!note) {
            showWkToast('Please specify a reason for rejection', 'error');
            return;
        }
        const btn = document.getElementById('wkConfirmRejectBtn');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Denying...'; }
        try {
            const res = await api().workshop_moderate_item(currentRejectId, 'njt', note, null);
            if (res && res.success) {
                showWkToast('Item rejected', 'success');
                wkItemCache = {};
                closeWkRejectModal();
                if (activeWkTab === 'admin') loadWorkshopAdminItems(activeAdminFilter);
                if (activeWkTab === 'modpacks') loadWorkshopModPacks();
                closeWkItemModal();
            } else {
                showWkToast((res && res.error) || 'Failed to reject item');
            }
        } catch(e) { 
            showWkToast('Error: ' + e.message); 
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-ban"></i> Deny'; }
        }
    };

    window.toggleOfficialWkItem = async function(id, currentOfficial) {
        const newOfficial = !currentOfficial;
        if (!confirm(newOfficial ? 'Mark this modpack as OFFICIAL?' : 'Remove official status from this modpack?')) return;
        try {
            const res = await api().workshop_moderate_item(id, null, null, newOfficial);
            if (res && res.success) {
                showWkToast(newOfficial ? 'Marked as Official' : 'Removed official status', 'success');
                wkItemCache = {};
                if (activeWkTab === 'admin') loadWorkshopAdminItems(activeAdminFilter);
                if (activeWkTab === 'modpacks') loadWorkshopModPacks();
                closeWkItemModal();
            } else {
                showWkToast((res && res.error) || 'Failed to change official status');
            }
        } catch(e) { showWkToast('Error: ' + e.message); }
    };

    window.deleteWkItem = async function(id) {
        if (!confirm('WARNING! Are you sure you want to PERMANENTLY DELETE this item from the database? This action cannot be undone.')) return;
        try {
            const res = await api().workshop_delete_item(id);
            if (res && res.success) {
                showWkToast('Item permanently deleted', 'success');
                wkItemCache = {};
                if (activeWkTab === 'admin') loadWorkshopAdminItems(activeAdminFilter);
                if (activeWkTab === 'modpacks') loadWorkshopModPacks();
                if (typeof renderMyPendingItems === 'function') renderMyPendingItems();
                closeWkItemModal();
            } else {
                showWkToast((res && res.error) || 'Failed to delete item');
            }
        } catch(e) { showWkToast('Error: ' + e.message); }
    };

    // Hook showSection
    document.addEventListener('DOMContentLoaded', function() {
        const origShowSection = window.showSection;
        if (origShowSection) {
            window.showSection = function(sectionId, contentType) {
                origShowSection(sectionId, contentType);
                if (sectionId === 'workshop') window.initWorkshop();
            };
        }

        // Hook imageModal icon selection for workshop
        const imageGrid = document.getElementById('imageGrid');
        if (imageGrid) {
            imageGrid.addEventListener('click', function(e) {
                if (!window._wkIconMode) return;
                const item = e.target.closest('.image-grid-item');
                if (!item || item.classList.contains('upload-item')) return;
                window._wkIconMode = false;
                const iconName = item.dataset.icon || item.dataset.src || '';
                wkCustomIconName = iconName;
                wkCustomIconBase64 = null;
                resolveIcon(iconName, null).then(function(src) {
                    const placeholder = document.getElementById('wkCreateIconPlaceholder');
                    const preview = document.getElementById('wkCreateIconPreview');
                    if (placeholder) placeholder.style.display = 'none';
                    if (preview) { preview.style.display = 'block'; preview.src = src; }
                });
                const imageModal = document.getElementById('imageModal');
                if (imageModal) imageModal.classList.remove('show');
            });
        }

        // Hook custom upload in imageModal for workshop
        const customImageInput = document.getElementById('customImageInput');
        if (customImageInput) {
            customImageInput.addEventListener('change', function(e) {
                if (!window._wkIconMode) return;
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                window._wkIconMode = false;
                const reader = new FileReader();
                reader.onload = function(ev) {
                    const dataUrl = ev.target.result;
                    const img = new Image();
                    img.onload = function() {
                        const canvas = document.createElement('canvas');
                        const maxSize = 128;
                        let w = img.width, h = img.height;
                        if (w > maxSize || h > maxSize) {
                            if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
                            else { w = Math.round(w * maxSize / h); h = maxSize; }
                        }
                        canvas.width = w; canvas.height = h;
                        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                        const resized = canvas.toDataURL('image/png');
                        wkCustomIconBase64 = resized;
                        wkCustomIconName = 'custom_' + Date.now();
                        const placeholder = document.getElementById('wkCreateIconPlaceholder');
                        const preview = document.getElementById('wkCreateIconPreview');
                        if (placeholder) placeholder.style.display = 'none';
                        if (preview) { preview.style.display = 'block'; preview.src = resized; }
                        const imageModal = document.getElementById('imageModal');
                        if (imageModal) imageModal.classList.remove('show');
                    };
                    img.src = dataUrl;
                };
                reader.readAsDataURL(file);
            });
        }
        restoreWkAccordionStates();
    });

    window.addEventListener('pywebviewready', function() {
        restoreWkAccordionStates();
    });

})();
