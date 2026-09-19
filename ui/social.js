// ================================================
// SOCIAL SYSTEM - social.js
// ================================================

(function () {
    'use strict';

    // --- State ---
    let socialAuth = null;
    let socialInitialized = false;
    let socialInitializing = false;
    let badgeInterval = null;
    let modalContentInterval = null;
    let activeSocialTab = 'friends';
    let activeReqSubtab = 'received';
    let socialModalOpen = false;
    let lastPendingRequests = 0;
    let lastUnreadMessages = 0;
    let cachedFriends = null;   // Last loaded friends array
    let currentProfileUid = null; // UID of currently viewed profile
    let profileRefreshInterval = null; // Interval for refreshing profile presence

    // --- Helpers ---
    function showNotification(title, body, senderId) {
        if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.show_desktop_notification === 'function') {
            window.pywebview.api.show_desktop_notification({ title, body, senderId });
            return;
        }
        if (!('Notification' in window)) return;
        const attachClick = (n) => {
            n.onclick = () => {
                window.focus();
                if (typeof openSocialModal === 'function') openSocialModal('received');
                if (typeof window.openInbox === 'function') window.openInbox('received');
            };
        };
        if (Notification.permission === 'granted') {
            const n = new Notification(title, { body, icon: 'img/icon.png' });
            attachClick(n);
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    const n = new Notification(title, { body, icon: 'img/icon.png' });
                    attachClick(n);
                }
            });
        }
    }

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function getAvatarHtml(profile, size) {
        const sz = size || 38;
        const letter = (profile.username || '?')[0].toUpperCase();
        if (profile.accountType === 'microsoft' && profile.mcUuid) {
            return `<img src="https://mc-heads.net/avatar/${profile.mcUuid}/${sz}" alt="" style="width:100%;height:100%;object-fit:cover;image-rendering:pixelated;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="avatar-letter" style="display:none">${letter}</span>`;
        }
        if (profile.avatarBase64) {
            return `<img src="${profile.avatarBase64}" alt="" style="width:100%;height:100%;object-fit:cover;image-rendering:pixelated;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="avatar-letter" style="display:none">${letter}</span>`;
        }
        return `<span class="avatar-letter">${letter}</span>`;
    }

    // --- Badge definitions ---
    const BADGE_DEFS = {
        premium:   { cls: 'hw-badge-premium',   icon: 'fa-dollar-sign', key: 'badges.premium',   defaultTitle: 'Cuenta Premium' },
        moderator: { cls: 'hw-badge-moderator',  icon: 'fa-wrench',      key: 'badges.moderator', defaultTitle: 'Moderador'      },
        creator:   { cls: 'hw-badge-creator',    icon: 'fa-crown',       key: 'badges.creator',   defaultTitle: 'Creador'        },
    };

    // Authentic 12-scallop Twitter/Meta verified rosette SVG
    const BADGE_ROSETTE_SVG = '<svg class="hw-badge-shape" viewBox="0 0 22 22" aria-hidden="true"><path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.887-1.692-.474-.45-1.058-.756-1.692-.887-.633-.13-1.29-.083-1.897.14-.274-.586-.706-1.084-1.246-1.438C12.275 1.808 11.646 1.61 11 1.628c-.646.018-1.275.215-1.816.57-.54.354-.972.852-1.246 1.438-.607-.223-1.264-.27-1.897-.14-.634.131-1.218.437-1.692.887-.45.474-.756 1.058-.887 1.692-.13.633-.083 1.29.14 1.897-.586.274-1.084.706-1.438 1.246C1.808 9.725 1.61 10.354 1.628 11c.018.646.215 1.275.57 1.816.354.54.852.972 1.438 1.246-.223.607-.27 1.264-.14 1.897.131.634.437 1.218.887 1.692.474.45 1.058.756 1.692.887.633.13 1.29.083 1.897-.14.274.586.706 1.084 1.246 1.438.541.355 1.17.552 1.816.57.646-.018 1.275-.215 1.816-.57.54-.354.972-.852 1.246-1.438.607.223 1.264.27 1.897.14.634-.131 1.218-.437 1.692-.887.45-.474.756-1.058.887-1.692.13-.633.083-1.29-.14-1.897.586-.274 1.084-.706 1.438-1.246.355-.541.552-1.17.57-1.816z"/></svg>';

    /**
     * Renders an HTML string with badge icons for a given badges array.
     * @param {string[]} badges  - e.g. ["premium", "moderator"]
     * @param {boolean}  large   - if true adds hw-badge-lg class for profile modal
     * @returns {string} HTML string with .hw-badges-row container
     */
    function renderBadgesHtml(badges, large = false) {
        if (!Array.isArray(badges) || badges.length === 0) return '';
        const lgCls = large ? ' hw-badge-lg' : '';
        const parts = badges
            .filter(b => BADGE_DEFS[b])
            .map(b => {
                const def = BADGE_DEFS[b];
                const title = (typeof window.t === 'function' && window.t(def.key) && window.t(def.key) !== def.key)
                    ? window.t(def.key)
                    : (def.defaultTitle || def.key);
                return `<span class="hw-badge ${def.cls}${lgCls}" title="${title}" data-i18n-title="${def.key}">${BADGE_ROSETTE_SVG}<i class="fas ${def.icon}"></i></span>`;
            });
        if (parts.length === 0) return '';
        return `<span class="hw-badges-row">${parts.join('')}</span>`;
    }

    // Legacy shim — kept for safety, maps to renderBadgesHtml(['premium'])
    function premiumBadge() {
        return renderBadgesHtml(['premium']);
    }

    // Badge priority hierarchy for profile avatar halos (Creator > Moderator > Premium)
    const BADGE_HALO_PRIORITY = {
        creator:   { rank: 3, haloClass: 'hw-halo-creator',   name: 'creator' },
        moderator: { rank: 2, haloClass: 'hw-halo-moderator', name: 'moderator' },
        premium:   { rank: 1, haloClass: 'hw-halo-premium',   name: 'premium' }
    };

    /**
     * Finds the highest priority badge from an array of badges
     * @param {string[]} badges
     * @returns {object|null}
     */
    function getHighestPriorityBadge(badges) {
        if (!Array.isArray(badges) || badges.length === 0) return null;
        let highest = null;
        let maxRank = 0;
        for (const b of badges) {
            const key = (typeof b === 'string' ? b : (b && b.id)).toLowerCase();
            const conf = BADGE_HALO_PRIORITY[key];
            if (conf && conf.rank > maxRank) {
                maxRank = conf.rank;
                highest = conf;
            }
        }
        return highest;
    }

    /**
     * Updates an avatar halo wrapper based on the most important badge
     * @param {string|HTMLElement} wrapper
     * @param {string[]} badges
     */
    function updateAvatarHalo(wrapper, badges) {
        const el = typeof wrapper === 'string' ? document.getElementById(wrapper) : wrapper;
        if (!el) return;
        el.classList.remove('hw-halo-creator', 'hw-halo-moderator', 'hw-halo-premium');
        const topBadge = getHighestPriorityBadge(badges);
        if (topBadge) {
            el.classList.add(topBadge.haloClass);
        }
    }

    window.renderBadgesHtml = renderBadgesHtml;
    window.updateAvatarHalo = updateAvatarHalo;
    window.getHighestPriorityBadge = getHighestPriorityBadge;

    function sanitizeWorldName(name) {
        if (!name) return '';
        const m = String(name).match(/ServerLevel\[([^\]]+)\]/i);
        return (m && m[1]) ? m[1].trim() : String(name).trim();
    }
    window.sanitizeWorldName = sanitizeWorldName;

    function formatPresenceStatus(presence) {
        if (!presence) {
            return (window.t ? window.t('social.status_offline') : null) || 'Desconectado';
        }
        const state = presence.state || presence.status || 'offline';
        const serverIp = presence.serverIp ? presence.serverIp.trim() : '';
        const worldName = presence.worldName ? sanitizeWorldName(presence.worldName) : '';

        if (state === 'server') {
            if (serverIp) {
                if (window.t) {
                    const translated = window.t('social.status_playing_server', { server: serverIp });
                    if (translated && translated !== 'social.status_playing_server') return translated;
                }
                return `Jugando en ${serverIp}`;
            }
            return (window.t ? window.t('social.status_playing_multiplayer') : null) || 'Jugando en multijugador';
        }

        if (state === 'playing') {
            if (worldName) {
                if (window.t) {
                    const translated = window.t('social.status_playing_world', { world: worldName });
                    if (translated && translated !== 'social.status_playing_world') return translated;
                }
                return `Jugando en ${worldName}`;
            }
            return (window.t ? window.t('social.status_playing_singleplayer') : null) || 'Jugando a un jugador';
        }

        if (state === 'menu') {
            return (window.t ? window.t('social.status_menu') : null) || 'En el menú';
        }

        if (state === 'online') {
            return (window.t ? window.t('social.status_online') : null) || 'En línea';
        }

        return (window.t ? window.t('social.status_offline') : null) || 'Desconectado';
    }
    window.formatPresenceStatus = formatPresenceStatus;

    function formatTime(ts) {
        if (!ts) return '';
        const d = new Date(ts);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (isToday) return time;
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + time;
    }

    function api() {
        return window.pywebview && window.pywebview.api;
    }

    function formatVersionString(version) {
        if (!version) return '';
        if (window.formatVersionString) return window.formatVersionString(version);
        let v = version.toLowerCase();
        let loaderName = '';
        if (v.startsWith('fabric')) { loaderName = 'Fabric'; v = v.replace(/^fabric(?:-loader)?-?/, ''); }
        else if (v.startsWith('forge')) { loaderName = 'Forge'; v = v.replace(/^forge-?/, ''); }
        
        if (loaderName) {
            const split = v.split('-');
            if (split.length >= 2) {
                return `${loaderName} ${split[0]} (${split.slice(1).join('-')})`;
            } else if (split.length === 1 && split[0]) {
                return `${loaderName} ${split[0]}`;
            }
            return loaderName;
        }
        return version;
    }

    // --- Init ---
    window.initSocial = async function (force = false) {
        if ((socialInitialized || socialInitializing) && !force) return;
        socialInitializing = true;
        if (force) {
            socialAuth = null;
            socialInitialized = false;
            cachedFriends = null;
            lastPendingRequests = 0;
            lastUnreadMessages = 0;
        }
        if (!window.APP_VERSION && api() && api().get_launcher_version) {
            try { window.APP_VERSION = await api().get_launcher_version(); } catch(e){}
        }
        try {
            if (!api() || !api().social_get_auth) return;
            const res = await api().social_get_auth();
            if (res && res.success) {
                socialAuth = res;
                socialInitialized = true;
                startBadgePolling();
                await updateBadge();
                // If modal is already open, refresh it with new account data
                if (socialModalOpen) {
                    const offlineMsg = document.getElementById('socialOfflineMsg');
                    const container = document.getElementById('friendsListContainer');
                    if (offlineMsg) offlineMsg.style.display = 'none';
                    if (container) container.style.display = 'block';
                    switchSocialTab(activeSocialTab);
                    startModalPolling();
                    if (typeof loadFriends === 'function') loadFriends(true);
                    if (typeof loadRequests === 'function') loadRequests(true);
                    const inboxPanel = document.getElementById('socialPanelInbox');
                    if (inboxPanel && inboxPanel.style.display !== 'none' && typeof loadInboxMessages === 'function') {
                        loadInboxMessages(true);
                    }
                }
            } else {
                window.onSocialLogout();
            }
        } catch (e) {
            console.warn('[Social] initSocial failed:', e.message);
            window.onSocialLogout();
        } finally {
            socialInitializing = false;
        }
    };

    window.onSocialLogout = function () {
        socialAuth = null;
        socialInitialized = false;
        socialInitializing = false;
        cachedFriends = null;
        lastPendingRequests = 0;
        lastUnreadMessages = 0;
        stopBadgePolling();
        stopModalPolling();
        closeSocialModal();
        const badge = document.getElementById('socialBadge');
        if (badge) badge.style.display = 'none';
    };

    // --- Badge polling ---
    async function updateBadge() {
        try {
            if (!api() || !api().social_get_badge_counts) return;
            const res = await api().social_get_badge_counts();
            if (!res || !res.success) {
                const el = document.getElementById('socialBadge');
                if (el) el.style.display = 'none';
                return;
            }
            const pending = res.pendingRequests || 0;
            const unread = res.unreadMessages || 0;
            const total = pending + unread;
            const el = document.getElementById('socialBadge');
            if (el) {
                el.textContent = total > 99 ? '99+' : String(total);
                el.style.display = total > 0 ? 'flex' : 'none';
            }
            const tabBadge = document.getElementById('requestsTabBadge');
            if (tabBadge) {
                tabBadge.textContent = pending;
                tabBadge.style.display = pending > 0 ? 'inline-flex' : 'none';
            }
            // Show notifications for new requests
            if (pending > lastPendingRequests && lastPendingRequests >= 0) {
                showNotification('New Friend Request', `You have ${pending} pending friend request${pending > 1 ? 's' : ''}`);
            }
            lastPendingRequests = pending;
            lastUnreadMessages = unread;
        } catch (e) { /* silently ignore */ }
    }

    window.addEventListener('force-social-badge-update', async () => {
        if (!socialAuth || !socialInitialized) {
            await window.initSocial(true).catch(() => {});
        } else {
            await updateBadge();
        }
    });

    window.addEventListener('login-success', () => {
        window.initSocial(true).catch(() => {});
    });

    window.updateSocialBadges = updateBadge;

    function startBadgePolling() {
        updateBadge();
        if (!badgeInterval) {
            badgeInterval = setInterval(updateBadge, 15000);
        }
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    function stopBadgePolling() {
        if (badgeInterval) { clearInterval(badgeInterval); badgeInterval = null; }
    }

    function startModalPolling() {
        if (!modalContentInterval) {
            modalContentInterval = setInterval(() => {
                if (!socialModalOpen || !socialAuth) return;
                if (activeSocialTab === 'friends') loadFriends(false);
                else if (activeSocialTab === 'requests') loadRequests(false);
            }, 10000);
        }
    }

    function stopModalPolling() {
        if (modalContentInterval) { clearInterval(modalContentInterval); modalContentInterval = null; }
    }

    // --- Modal open/close ---
    async function openSocialModal(targetInboxTab = 'received') {
        const modal = document.getElementById('socialModal');
        if (!modal) return;
        modal.classList.remove('closing');
        modal.classList.add('show');
        socialModalOpen = true;

        if (!socialAuth && typeof window.initSocial === 'function') {
            await window.initSocial(true).catch(() => {});
        }

        // Load saved panel width from user config
        const MIN_WIDTH = 220;
        const MAX_WIDTH = 520;
        const mainPanel = document.getElementById('socialPanelMain');
        if (mainPanel) {
            (async () => {
                try {
                    const data = await window.hwlAPI.getUserJson();
                    if (data && data.social_panel_width) {
                        const w = parseInt(data.social_panel_width, 10);
                        if (w >= MIN_WIDTH && w <= MAX_WIDTH) {
                            mainPanel.style.setProperty('width', w + 'px', 'important');
                        }
                    } else {
                        mainPanel.style.setProperty('width', '320px', 'important');
                    }
                } catch (e) {
                    mainPanel.style.setProperty('width', '320px', 'important');
                }
            })();
        }

        const offlineMsg = document.getElementById('socialOfflineMsg');
        const container = document.getElementById('friendsListContainer');

        if (!socialAuth) {
            document.querySelectorAll('.social-tab-content').forEach(t => t.classList.remove('active'));
            const ft = document.getElementById('socialTabFriends');
            if (ft) ft.classList.add('active');
            document.querySelectorAll('.social-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'friends'));
            if (offlineMsg) offlineMsg.style.display = 'flex';
            if (container) container.style.display = 'none';
            return;
        }
        if (offlineMsg) offlineMsg.style.display = 'none';
        if (container) container.style.display = 'block';
        switchSocialTab(activeSocialTab);
        startModalPolling();
        if (typeof window.openInbox === 'function') window.openInbox(targetInboxTab || 'received');
    }

    function closeSocialModal() {
        const modal = document.getElementById('socialModal');
        if (modal) modal.classList.remove('show');
        socialModalOpen = false;
        stopModalPolling();
        closeChat();
        // Always reset inbox subtab to 'received' so reopening always starts on Received
        currentInboxTab = 'received';
        const btnRecv = document.getElementById('inboxTabReceived');
        const btnSent = document.getElementById('inboxTabSent');
        if (btnRecv) btnRecv.classList.add('active');
        if (btnSent) btnSent.classList.remove('active');
        if (typeof window.closeInbox === 'function') window.closeInbox();
        // Clear all lists and inputs
        const friendsList = document.getElementById('friendsList');
        if (friendsList) friendsList.innerHTML = '';
        const searchInput = document.getElementById('searchUserInput');
        if (searchInput) searchInput.value = '';
        const searchResults = document.getElementById('searchUserResults');
        if (searchResults) searchResults.innerHTML = '';
        const searchStatus = document.getElementById('searchUserStatus');
        if (searchStatus) { searchStatus.textContent = ''; searchStatus.style.display = 'none'; }
        const reqReceived = document.getElementById('reqReceivedList');
        if (reqReceived) reqReceived.innerHTML = '';
        const reqSent = document.getElementById('reqSentList');
        if (reqSent) reqSent.innerHTML = '';
        const blockedList = document.getElementById('blockedList');
        if (blockedList) blockedList.innerHTML = '';
        const blockedSection = document.getElementById('blockedSection');
        if (blockedSection) blockedSection.style.display = 'none';
    }
    window.openSocialModal = openSocialModal;
    window.closeSocialModal = closeSocialModal;

    // --- Tabs ---
    function switchSocialTab(tab) {
        activeSocialTab = tab;
        document.querySelectorAll('.social-tab-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.tab === tab);
        });
        const tabMap = { friends: 'socialTabFriends', add: 'socialTabAdd', requests: 'socialTabRequests' };
        document.querySelectorAll('.social-tab-content').forEach(c => {
            c.classList.toggle('active', c.id === tabMap[tab]);
        });
        if (!socialAuth) return;
        if (tab === 'friends') loadFriends(true);
        else if (tab === 'requests') loadRequests(true);
    }

    // --- Friends Tab ---
    async function loadFriends(showLoading) {
        const loading = document.getElementById('friendsLoading');
        const container = document.getElementById('friendsListContainer');
        if (showLoading) {
            if (loading) loading.style.display = 'flex';
            if (container) container.style.display = 'none';
        }
        try {
            const res = await api().social_get_friends();
            if (loading) loading.style.display = 'none';
            if (container) container.style.display = 'block';
            renderFriendsList(res && res.success ? (res.friends || []) : []);
        } catch (e) {
            if (loading) loading.style.display = 'none';
            if (container) container.style.display = 'block';
            renderFriendsList([]);
        }
        loadBlocked();
        // Removed loadInboxMessages from loadFriends to prevent double-fetching which destroys the blue dot
    }

    function renderFriendsList(friends) {
        cachedFriends = friends;
        const list = document.getElementById('friendsList');
        if (!list) return;
        if (friends.length === 0) {
            list.innerHTML = '<div class="social-empty"><i class="fas fa-user-friends"></i><p>No friends yet. Add some!</p></div>';
            return;
        }
        list.innerHTML = friends.filter(f => !f.isGroup).map(f => {
            const isGroup = f.isGroup;
            let p, avatarHtml, nameHtml, profileJson, actionHtml;
            const unread = f.unread > 0 ? `<span class="chat-unread-badge">${f.unread}</span>` : '';
            
            // Last message preview removed as requested
            const lastMsg = '';
            const fidSafe = escapeHtml(f.friendshipId);

            if (isGroup) {
                p = { username: f.groupData.name, avatarBase64: f.groupData.imageBase64, accountType: 'helloworld' };
                avatarHtml = f.groupData.imageBase64 ? `<img src="${f.groupData.imageBase64}" style="width:100%;height:100%;object-fit:cover">` : `<span class="avatar-letter">${f.groupData.name.charAt(0).toUpperCase()}</span>`;
                nameHtml = `<i class="fas fa-users" style="margin-right:5px;color:#888;"></i>${escapeHtml(f.groupData.name)}`;
                profileJson = escapeHtml(JSON.stringify({ ...p, isGroup: true, members: f.groupData.members, admin: f.groupData.admin, admins: f.groupData.admins || [f.groupData.admin], memberVersions: f.groupData.memberVersions || {}, description: f.groupData.description || '' }));
                actionHtml = `
                    ${unread}

                    <button class="social-action-btn social-btn-remove" title="Leave Group" onclick='socialRemoveFriend("${fidSafe}", "${escapeHtml(f.groupData.name)}")'><i class="fas fa-sign-out-alt"></i></button>
                `;
            } else {
                p = f.profile;
                avatarHtml = getAvatarHtml(p, 38);
                const pb = renderBadgesHtml(Array.isArray(p.badges) ? p.badges : (p.accountType === 'microsoft' ? ['premium'] : []));
                const presence = f.presence || {};
                const state = presence.state || 'offline';
                const pillClassMap = {
                    online: 'presence-indicator-online',
                    menu: 'presence-indicator-menu',
                    playing: 'presence-indicator-playing',
                    server: 'presence-indicator-server',
                    offline: 'presence-indicator-offline'
                };
                // Map menu to playing class, playing to singleplayer class
                const displayStateClass = state === 'menu' ? 'presence-indicator-playing' : 
                                         state === 'playing' ? 'presence-indicator-playing' :
                                         pillClassMap[state] || 'presence-indicator-offline';
                const stateClass = displayStateClass;
                
                // Formatted & translated status label
                const stateLabel = formatPresenceStatus(presence);
                
                // Join button ONLY for multiplayer server (never for singleplayer)
                let joinTarget = '';
                if (state === 'server' && presence && presence.serverIp) {
                    joinTarget = presence.serverIp.trim();
                }
                
                const joinBtnText = (window.t ? (window.t('social.join_server') || 'UNIRSE') : 'UNIRSE').toUpperCase();
                const joinButtonHtml = joinTarget 
                    ? `<button class="social-btn-join friend-join-btn" title="${escapeHtml(joinBtnText)}" onclick='socialJoinServer("${escapeHtml(joinTarget)}", "${escapeHtml(p.username)}")'>${escapeHtml(joinBtnText)}</button>` 
                    : '';
                
                const presenceInline = `
                    <div class="friend-presence-badge">
                        <span class="friend-presence-pill ${stateClass}"></span>
                        <span>${escapeHtml(stateLabel)}</span>
                        ${joinButtonHtml}
                    </div>
                `;
                nameHtml = `${escapeHtml(p.username)} ${pb}<div style="margin-top:6px;">${presenceInline}</div>`;
                const pWithVer = Object.assign({}, p, { clientVersion: p.clientVersion || (presence && presence.clientVersion) || '' });
                profileJson = escapeHtml(JSON.stringify(pWithVer));

                const uidSafe = escapeHtml(p.uid);
                const nameSafe = escapeHtml(p.username);
                actionHtml = `
                    ${unread}

                    <button class="social-action-btn social-btn-block" title="Block" onclick='socialBlockFriend("${uidSafe}", "${fidSafe}", "${nameSafe}")'><i class="fas fa-ban"></i></button>
                    <button class="social-action-btn social-btn-remove" title="Remove" onclick='socialRemoveFriend("${fidSafe}", "${nameSafe}")'><i class="fas fa-user-minus"></i></button>
                `;
            }

            const usernameClickAttr = isGroup ? '' : `style="cursor: pointer;" onclick='viewUserProfile("${escapeHtml(p.uid)}", "${escapeHtml(p.username)}")'`;

            return `<div class="social-user-item">
              <div class="social-item-avatar">${avatarHtml}</div>
              <div class="social-item-info">
                <div class="social-item-name" ${usernameClickAttr}>${nameHtml}</div>
                ${lastMsg}
              </div>
              <div class="social-item-actions">
                ${actionHtml}
              </div>
            </div>`;
        }).join('');
    }

    window.socialOpenChat = function () { if (typeof window.openInbox === 'function') window.openInbox('received'); };
    window.socialBlockFriend = function (uid, fid, username) { blockFriend(uid, fid, username); };
    window.socialRemoveFriend = function (fid, username) { removeFriend(fid, username); };
    window.socialUnblockUser = function (uid, username) { unblockUser(uid, username); };
    window.socialJoinServer = function (serverIp, username) { openJoinServerModal(serverIp, username); };

    function openJoinServerModal(serverIp, username) {
        const modal = document.getElementById('joinServerModal');
        if (!modal) return;

        // Set server info
        const ipEl = document.getElementById('joinServerIp');
        if (ipEl) ipEl.textContent = serverIp || '';
        
        const friendEl = document.getElementById('joinServerFriend');
        const invitedContainer = friendEl ? friendEl.parentElement : null;
        if (friendEl) {
            if (username && username.trim()) {
                friendEl.textContent = username.trim();
                if (invitedContainer) invitedContainer.style.display = 'block';
            } else {
                if (invitedContainer) invitedContainer.style.display = 'none';
            }
        }

        const container = document.getElementById('joinServerProfilesList');
        if (container) {
            container.innerHTML = `<div style="color: #888; text-align: center; padding: 20px;">${window.t ? window.t('social.loading_installations') || 'Cargando instalaciones...' : 'Cargando instalaciones...'}</div>`;
        }

        // Load profiles directly from API
        const clientApi = (typeof api === 'function' && api()) || (window.pywebview && window.pywebview.api);
        if (clientApi && typeof clientApi.get_profiles === 'function') {
            clientApi.get_profiles().then(profilesData => {
                if (profilesData && profilesData.profiles) {
                    window.profilesData = profilesData;
                    renderJoinServerProfiles(serverIp);
                } else if (container) {
                    container.innerHTML = `<div style="color: #888; text-align: center; padding: 20px;">${window.t ? window.t('social.no_installations') || 'No installations available. Create one first.' : 'No installations available. Create one first.'}</div>`;
                }
            }).catch(err => {
                console.error('Failed to load profiles:', err);
                if (container) {
                    container.innerHTML = '<div style="color: #f87171; text-align: center; padding: 20px;">Failed to load profiles.</div>';
                }
            });
        }

        modal.classList.add('show');
    }

    function closeJoinServerModal() {
        const modal = document.getElementById('joinServerModal');
        if (modal) modal.classList.remove('show');
    }

    async function renderJoinServerProfiles(serverIp) {
        const container = document.getElementById('joinServerProfilesList');
        if (!container) return;

        const profiles = window.profilesData?.profiles || {};
        const profileIds = Object.keys(profiles);

        if (profileIds.length === 0) {
            container.innerHTML = `<div style="color: #888; text-align: center; padding: 20px;">${window.t ? window.t('social.no_installations') || 'No installations available. Create one first.' : 'No installations available. Create one first.'}</div>`;
            return;
        }

        const clientApi = (typeof api === 'function' && api()) || (window.pywebview && window.pywebview.api);
        const htmlArr = await Promise.all(profileIds.map(async id => {
            const profile = profiles[id];
            
            // Resolve icon
            let resolvedIcon = profile.icon;
            if (profile.icon && clientApi && clientApi.get_profile_icon) {
                try { resolvedIcon = await clientApi.get_profile_icon(profile.icon); } catch (_) {}
            }
            if (resolvedIcon && window.resolveImageSource) {
                resolvedIcon = window.resolveImageSource(resolvedIcon);
            }

            const iconHtml = resolvedIcon
                ? `<img src="${resolvedIcon}" style="width:38px; height:38px; border-radius:8px; object-fit:cover; flex-shrink:0;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><div style="display:none; width:38px; height:38px; border-radius:8px; background:linear-gradient(135deg,rgba(79,172,254,0.3),rgba(0,242,254,0.15)); align-items:center; justify-content:center; flex-shrink:0;"><i class='fas fa-cube' style='color:#4facfe; font-size:16px;'></i></div>`
                : `<div style="width:38px; height:38px; border-radius:8px; background:linear-gradient(135deg,rgba(79,172,254,0.3),rgba(0,242,254,0.15)); display:flex; align-items:center; justify-content:center; flex-shrink:0;"><i class='fas fa-cube' style='color:#4facfe; font-size:16px;'></i></div>`;

            // Format version label
            let versionLabel = profile.version || 'Unknown';
            try {
                if (window.versionUtils && window.versionUtils.parseVersionString) {
                    const parsed = window.versionUtils.parseVersionString(profile.version);
                    if (parsed && parsed.type !== 'vanilla') {
                        const loaderName = parsed.type.charAt(0).toUpperCase() + parsed.type.slice(1);
                        versionLabel = parsed.loaderVersion
                            ? `${loaderName} ${parsed.loaderVersion} (MC ${parsed.mcVersion})`
                            : `${loaderName} (MC ${parsed.mcVersion})`;
                    } else if (parsed) {
                        versionLabel = `Vanilla ${parsed.mcVersion}`;
                    }
                }
            } catch(_) {}

            return `
                <div class="join-server-profile-item" data-profile-id="${escapeHtml(id)}" style="display:flex; align-items:center; gap:12px; padding: 10px; margin: 0 4px 4px 4px; border-radius: 8px; transition: background 0.2s; cursor: pointer;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
                    ${iconHtml}
                    <div style="min-width:0; text-align: left;">
                        <div style="font-weight:600; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(profile.name || id)}</div>
                        <div style="font-size:0.8rem; color:#6b7280; margin-top:2px;">${escapeHtml(versionLabel)}</div>
                    </div>
                </div>
            `;
        }));
        
        container.innerHTML = htmlArr.join('');
        container.querySelectorAll('.join-server-profile-item').forEach(item => {
            const pId = item.dataset.profileId;
            item.onclick = () => window.joinServerWithProfile(pId, serverIp);
        });
    }

    window.joinServerWithProfile = async function(profileId, serverIp) {
        closeJoinServerModal();

        // Copy server IP to clipboard as convenience for player
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(serverIp).catch(() => {});
        }

        // Close social and profile modals
        closeSocialModal();
        const profileModal = document.getElementById('userProfileModal');
        if (profileModal) profileModal.classList.remove('show');

        // Clear profile refresh interval
        if (profileRefreshInterval) {
            clearInterval(profileRefreshInterval);
            profileRefreshInterval = null;
        }
        currentProfileUid = null;

        console.log(`[Social] Joining server ${serverIp} with profile ${profileId}`);

        // Update selected profile in UI
        const profiles = window.profilesData?.profiles || {};
        const profile = profiles[profileId];
        if (typeof window.selectOption === 'function' && profile) {
            window.selectOption(profileId, profile);
        } else {
            const profileSelect = document.getElementById('profileSelect');
            if (profileSelect) {
                profileSelect.value = profileId;
                try { profileSelect.dispatchEvent(new Event('change')); } catch (_) {}
            }
        }

        // Go to play section
        if (typeof showSection === 'function') {
            showSection('play');
        }

        // Store server IP — launchGame reads window.pendingServerParam
        window.pendingServerParam = serverIp;
        console.log('[Social] pendingServerParam set to:', serverIp);

        // Delegate to launchGame which handles all UI states (play button, cancel, etc.)
        const launcherFn = (typeof launchGame === 'function' && launchGame) || (typeof window.launchGame === 'function' && window.launchGame);
        if (launcherFn) {
            await launcherFn();
        } else {
            console.error('[Social] launchGame is not available');
            if (typeof showToast === 'function') showToast('Could not launch game.', 'error');
        }
    };


    // Initialize join server modal event listeners
    function initJoinServerModal() {
        const closeBtn = document.getElementById('closeJoinServerBtn');
        const cancelBtn = document.getElementById('cancelJoinServerBtn');
        if (closeBtn) closeBtn.addEventListener('click', closeJoinServerModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeJoinServerModal);
    }

    // Call initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initJoinServerModal);
    } else {
        initJoinServerModal();
    }

    async function blockFriend(uid, fid, username) {
        const confirmMsg = (window.t ? window.t('social.confirm_block_long', { username }) : '') || `Block ${username}? They will be removed from friends and unable to send you requests.`;
        if (!confirm(confirmMsg)) return;
        try { await api().social_block_user(uid, fid); loadFriends(false); } catch (e) {}
    }

    async function removeFriend(fid, username) {
        const confirmMsg = (window.t ? window.t('social.confirm_remove_friend', { username }) : '') || `Remove ${username} from your friends? They can send you a new request later.`;
        if (!confirm(confirmMsg)) return;
        try {
            await api().social_remove_friend(fid);
            loadFriends(false);
        } catch (e) {}
    }

    // --- Blocked ---
    async function loadBlocked() {
        try {
            const res = await api().social_get_blocked();
            if (!res || !res.success) return;
            const section = document.getElementById('blockedSection');
            const list = document.getElementById('blockedList');
            const count = document.getElementById('blockedCount');
            if (!section) return;
            if (!res.blocked || res.blocked.length === 0) { section.style.display = 'none'; return; }
            section.style.display = 'block';
            if (count) count.textContent = res.blocked.length;
            if (list) list.innerHTML = res.blocked.map(b => {
                const p = b.profile;
                const pb = renderBadgesHtml(Array.isArray(p.badges) ? p.badges : (p.accountType === 'microsoft' ? ['premium'] : []));
                const uidSafe = escapeHtml(p.uid);
                const nameSafe = escapeHtml(p.username);
                return `<div class="social-user-item blocked-item">
                  <div class="social-item-avatar">${getAvatarHtml(p, 38)}</div>
                  <div class="social-item-info">
                    <div class="social-item-name">${escapeHtml(p.username)} ${pb}</div>
                    <span class="social-item-sublabel">Blocked</span>
                  </div>
                  <div class="social-item-actions">
                    <button class="social-action-btn social-btn-unblock" title="Unblock" onclick='socialUnblockUser("${uidSafe}", "${nameSafe}")'>
                      <i class="fas fa-user-check"></i>
                    </button>
                  </div>
                </div>`;
            }).join('');
        } catch (e) {}
    }

    function toggleBlockedSection() {
        const list = document.getElementById('blockedList');
        const chevron = document.getElementById('blockedChevron');
        if (!list) return;
        const visible = list.style.display !== 'none';
        list.style.display = visible ? 'none' : 'block';
        if (chevron) chevron.style.transform = visible ? 'rotate(0deg)' : 'rotate(180deg)';
    }

    async function unblockUser(uid, username) {
        try { await api().social_unblock_user(uid); loadFriends(false); } catch (e) {}
    }

    // --- Add Friend Tab ---
    async function searchUser() {
        const input = document.getElementById('searchUserInput');
        const q = input ? input.value.trim() : '';
        if (!q || q.length < 2) { showSearchStatus('Please enter at least 2 characters.', 'error'); return; }
        const loading = document.getElementById('searchLoading');
        const results = document.getElementById('searchUserResults');
        const status = document.getElementById('searchUserStatus');
        if (loading) loading.style.display = 'flex';
        if (results) results.innerHTML = '';
        if (status) status.style.display = 'none';
        try {
            const res = await api().social_search_user(q);
            if (loading) loading.style.display = 'none';
            if (!res || !res.success) { showSearchStatus('Search failed: ' + (res && res.error || 'Unknown error'), 'error'); return; }
            if (!res.results || res.results.length === 0) { showSearchStatus('No users found with that username.', 'error'); return; }
            renderSearchResults(res.results);
        } catch (e) {
            if (loading) loading.style.display = 'none';
            showSearchStatus('Search failed: ' + e.message, 'error');
        }
    }

    function renderSearchResults(users) {
        const list = document.getElementById('searchUserResults');
        if (!list) return;
        list.innerHTML = users.map(u => {
            const pb = renderBadgesHtml(Array.isArray(u.badges) ? u.badges : (u.accountType === 'microsoft' ? ['premium'] : []));
            const sub = u.accountType === 'microsoft' ? 'Premium' : 'HelloWorld';
            const uidSafe = escapeHtml(u.uid);
            const usernameSafe = escapeHtml(u.username);
            return `<div class="social-user-item" id="search-item-${uidSafe}">
              <div class="social-item-avatar">${getAvatarHtml(u, 38)}</div>
              <div class="social-item-info">
                <div class="social-item-name" style="cursor: pointer;" onclick='viewUserProfile("${uidSafe}", "${usernameSafe}")'>${usernameSafe} ${pb}</div>
                <span class="social-item-sublabel">${sub}</span>
              </div>
              <div class="social-item-actions">
                <button class="social-action-btn social-btn-view" id="view-btn-${uidSafe}" title="View profile" onclick='viewUserProfile("${uidSafe}", "${usernameSafe}")' style="min-width: 60px;">
                  <i class="fas fa-user"></i> <span>View</span>
                </button>
                <button class="social-action-btn social-btn-add" id="add-btn-${uidSafe}" title="Send friend request" onclick='socialSendRequest("${uidSafe}")'>
                  <i class="fas fa-user-plus"></i> Add
                </button>
              </div>
            </div>`;
        }).join('');
    }

    window.socialSendRequest = async function (uid) {
        const btn = document.getElementById(`add-btn-${uid}`);
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
        try {
            const res = await api().social_send_request(uid);
            if (res && res.success) {
                if (btn) { btn.innerHTML = '<i class="fas fa-check"></i> Sent'; btn.classList.add('social-btn-sent'); }
                showSearchStatus('Friend request sent!', 'success');
                updateBadge();
            } else {
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-user-plus"></i> Add'; }
                const msgs = {
                    already_friends: 'You are already friends with this user.',
                    request_already_sent: 'Request already sent to this user.',
                    request_already_received: 'This user already sent you a request — check Requests!',
                    cannot_self: 'You cannot add yourself.',
                    user_not_found: 'User not found.'
                };
                showSearchStatus(msgs[(res && res.error)] || ('Error: ' + (res && res.error)), 'error');
            }
        } catch (e) {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-user-plus"></i> Add'; }
            showSearchStatus('Error: ' + e.message, 'error');
        }
    };

    // Refresh profile presence only (called by interval)
    async function refreshProfilePresence(uid, username) {
        try {
            const res = await api().get_user_profile(uid);
            if (!res || !res.success || !res.data) return;
            
            const presence = res.presence || res.data.presence || null;
            const state = presence ? (presence.state || 'offline') : 'offline';
            
            const statusText = formatPresenceStatus(presence);
            
            const serverText = presence && presence.state === 'server' && presence.serverIp ? presence.serverIp : '';
            const worldText = presence && presence.state === 'playing' && presence.worldName ? sanitizeWorldName(presence.worldName) : '';
            const instanceText = presence && presence.instanceName ? presence.instanceName : '';
            const versionText = presence && presence.mcVersion ? presence.mcVersion : '';
            const instanceDisplay = instanceText && versionText ? `${instanceText} (${versionText})` : (instanceText || versionText || '');

            const presenceStatus = document.getElementById('profilePresenceStatus');
            const presenceIndicator = document.getElementById('profilePresenceIndicator');
            const presenceCard = document.getElementById('profilePresenceCard');
            const presenceDetails = document.getElementById('profilePresenceDetails');
            
            if (presenceStatus) presenceStatus.textContent = statusText;
            
            // Show installation if available
            const instanceRow = document.getElementById('profilePresenceInstanceRow');
            const instanceSpan = document.getElementById('profilePresenceInstance');
            if (instanceRow && instanceSpan) {
                if (instanceDisplay) {
                    instanceRow.style.display = 'flex';
                    instanceSpan.textContent = instanceDisplay;
                } else {
                    instanceRow.style.display = 'none';
                }
            }
            
            // Show server IP if available
            const serverRow = document.getElementById('profilePresenceServerRow');
            const serverSpan = document.getElementById('profilePresenceServer');
            if (serverRow && serverSpan) {
                if (serverText) {
                    serverRow.style.display = 'flex';
                    serverSpan.textContent = serverText;
                } else {
                    serverRow.style.display = 'none';
                }
            }
            
            // Show world name if available
            const worldRow = document.getElementById('profilePresenceWorldRow');
            const worldSpan = document.getElementById('profilePresenceWorld');
            if (worldRow && worldSpan) {
                if (worldText) {
                    worldRow.style.display = 'flex';
                    worldSpan.textContent = worldText;
                } else {
                    worldRow.style.display = 'none';
                }
            }
            
            // Show/hide details section
            if (presenceDetails) {
                const hasDetail = instanceDisplay || serverText || worldText;
                presenceDetails.style.display = hasDetail ? 'flex' : 'none';
            }

            if (presenceIndicator) {
                presenceIndicator.classList.remove('presence-indicator-online', 'presence-indicator-menu', 'presence-indicator-playing', 'presence-indicator-server', 'presence-indicator-offline');
                // Map menu to playing class, playing to playing class (both green)
                const stateClassMap = {
                    online: 'presence-indicator-online',
                    menu: 'presence-indicator-playing',
                    playing: 'presence-indicator-playing',
                    server: 'presence-indicator-server',
                    offline: 'presence-indicator-offline'
                };
                presenceIndicator.classList.add(stateClassMap[state] || 'presence-indicator-offline');
            }
            if (presenceCard) presenceCard.style.opacity = '1';
            
            // Handle Join button - only for multiplayer server
            const joinBtn = document.getElementById('profileJoinBtn');
            if (joinBtn) {
                const isOwnProfile = socialAuth && socialAuth.uid === uid;
                let joinTarget = '';
                if (state === 'server' && serverText) {
                    joinTarget = serverText;
                }
                
                if (joinTarget && !isOwnProfile) {
                    joinBtn.style.display = 'inline-flex';
                    joinBtn.onclick = () => window.socialJoinServer(joinTarget, username);
                } else {
                    joinBtn.style.display = 'none';
                }
            }
        } catch (e) {
            console.error('Failed to refresh profile presence:', e);
        }
    }

    // View User Profile
    window.viewUserProfile = async function (uid, username) {
        const modal = document.getElementById('userProfileModal');
        if (!modal) return;
        
        // Set current profile UID
        currentProfileUid = uid;
        
        // Clear existing refresh interval
        if (profileRefreshInterval) {
            clearInterval(profileRefreshInterval);
            profileRefreshInterval = null;
        }
        
        // Show loading state
        modal.classList.add('show');
        
        // Show loading spinner
        const loadingSpinner = document.getElementById('profileLoadingSpinner');
        if (loadingSpinner) {
            loadingSpinner.style.display = 'flex';
            loadingSpinner.style.opacity = '1';
        }
        
        // Reset modal content
        const displayName = document.getElementById('profileDisplayName');
        const avatarPreview = document.getElementById('profileAvatarPreview');
        const biography = document.getElementById('profileBiography');
        const linksContainer = document.getElementById('profileLinksContainer');
        const favoriteMob = document.getElementById('profileFavoriteMob');
        const backgroundPreview = document.getElementById('profileBackgroundPreview');
        const countryBadge = document.getElementById('profileCountryBadge');
        const countryFlagSvg = document.getElementById('profileCountryFlagSvg');
        const badgesContainer = document.getElementById('profileBadgesContainer');
        const presenceCard = document.getElementById('profilePresenceCard');
        const presenceIndicator = document.getElementById('profilePresenceIndicator');
        const presenceStatus = document.getElementById('profilePresenceStatus');
        const presenceServer = document.getElementById('profilePresenceServer');
        const presenceWorld = document.getElementById('profilePresenceWorld');
        const presenceInstance = document.getElementById('profilePresenceInstance');
        const presenceDetails = document.getElementById('profilePresenceDetails');
        const serverRow = document.getElementById('profilePresenceServerRow');
        const worldRow = document.getElementById('profilePresenceWorldRow');
        const instanceRow = document.getElementById('profilePresenceInstanceRow');
        const joinBtn = document.getElementById('profileJoinBtn');
        
        if (displayName) {
            const nameSpan = displayName.querySelector('span');
            if (nameSpan) nameSpan.textContent = username;
            else displayName.textContent = username;
        }
        if (badgesContainer) badgesContainer.innerHTML = '';
        const avatarWrapper = document.getElementById('profileAvatarWrapper');
        if (avatarWrapper) {
            avatarWrapper.classList.remove('hw-halo-creator', 'hw-halo-moderator', 'hw-halo-premium');
        }
        if (avatarPreview) avatarPreview.src = `https://ui-avatars.com/api/?name=${username}&background=random&color=fff&rounded=true&bold=true&format=svg`;
        if (biography) biography.textContent = 'Loading...';
        if (linksContainer) linksContainer.innerHTML = '<p style="margin: 0; color: #6b7280; font-size: 0.9rem; font-style: italic;">Loading...</p>';
        if (favoriteMob) favoriteMob.textContent = '-';
        if (presenceStatus) presenceStatus.textContent = 'Loading...';
        const memberSinceEl = document.getElementById('profileMemberSince');
        if (memberSinceEl) memberSinceEl.textContent = '';
        const playstyleSection = document.getElementById('profilePlaystyleSection');
        if (playstyleSection) playstyleSection.style.display = 'none';
        const playstyleTags = document.getElementById('profilePlaystyleTags');
        if (playstyleTags) playstyleTags.innerHTML = '';
        if (serverRow) serverRow.style.display = 'none';
        if (worldRow) worldRow.style.display = 'none';
        if (instanceRow) instanceRow.style.display = 'none';
        if (presenceDetails) presenceDetails.style.display = 'none';
        if (joinBtn) joinBtn.style.display = 'none';
        
        // Reset embedded stats grid
        const pStreak = document.getElementById('userProfileStreak');
        const pMaxStreak = document.getElementById('userProfileMaxStreak');
        const pHours = document.getElementById('userProfileHours');
        const pDays = document.getElementById('userProfileDays');
        const pSessions = document.getElementById('userProfileSessions');
        if (pStreak) pStreak.textContent = '-';
        if (pMaxStreak) pMaxStreak.textContent = '-';
        if (pHours) pHours.textContent = '-';
        if (pDays) pDays.textContent = '-';
        if (pSessions) pSessions.textContent = '-';

        if (presenceIndicator) {
            presenceIndicator.classList.remove('presence-indicator-online', 'presence-indicator-menu', 'presence-indicator-playing', 'presence-indicator-server', 'presence-indicator-offline');
            presenceIndicator.classList.add('presence-indicator-offline');
        }
        if (presenceCard) presenceCard.style.opacity = '0.6';
        
        // Reset background
        if (backgroundPreview) {
            backgroundPreview.style.background = 'rgba(255,255,255,0.05)';
            backgroundPreview.style.backgroundImage = '';
            backgroundPreview.style.backgroundSize = '';
            backgroundPreview.style.backgroundPosition = '';
            backgroundPreview.style.backgroundRepeat = '';
            const existingOverlay = backgroundPreview.querySelector('.background-overlay');
            if (existingOverlay) existingOverlay.remove();
        }
        
        // Hide country badge
        if (countryBadge) countryBadge.style.display = 'none';
        
        // Start 5-second refresh interval for presence
        profileRefreshInterval = setInterval(() => {
            if (currentProfileUid && modal.classList.contains('show')) {
                refreshProfilePresence(currentProfileUid, username);
            }
        }, 5000);
        
        try {
            // Fetch user profile data from Firestore
            const res = await api().get_user_profile(uid);
            console.log('Profile data response:', res);
            
            if (res && res.success && res.data) {
                const data = res.data;
                console.log('Profile data:', data);
                
                // Update display name
                if (displayName) {
                    const nameSpan = displayName.querySelector('span');
                    if (nameSpan) nameSpan.textContent = data.displayName || username;
                    else displayName.textContent = data.displayName || username;
                }
                
                // Render all badges for this profile (large size) and apply aura halo
                // data.badges is always provided by the backend (with auto-migration for legacy accounts)
                const profileBadges = Array.isArray(data.badges) && data.badges.length > 0
                    ? data.badges
                    : (data.accountType === 'microsoft' ? ['premium'] : []);
                if (badgesContainer) {
                    badgesContainer.innerHTML = renderBadgesHtml(profileBadges, true);
                }
                updateAvatarHalo('profileAvatarWrapper', profileBadges);
                
                // Update avatar if available
                if (data.avatarBase64 && avatarPreview) {
                    // Check if avatarBase64 already has the prefix
                    const avatarSrc = data.avatarBase64.startsWith('data:') ? data.avatarBase64 : `data:image/png;base64,${data.avatarBase64}`;
                    avatarPreview.src = avatarSrc;
                } else if (data.accountType === 'microsoft' && data.uuid && avatarPreview) {
                    // Premium account with no custom avatar - use mc-heads
                    avatarPreview.src = `https://mc-heads.net/avatar/${data.uuid}`;
                }
                
                // Update biography
                if (biography) {
                    biography.textContent = data.biography || 'No biography';
                }

                // Update Member Since
                const memberSinceEl = document.getElementById('profileMemberSince');
                if (memberSinceEl) {
                    let memberSinceText = '';
                    const createdAt = data.createdAt || data.created_at;
                    if (createdAt) {
                        const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt._seconds ? createdAt._seconds * 1000 : createdAt);
                        if (!isNaN(date.getTime())) {
                            const opts = { year: 'numeric', month: 'long' };
                            memberSinceText = `Member since ${date.toLocaleDateString('en-US', opts)}`;
                        }
                    }
                    memberSinceEl.textContent = memberSinceText;
                }

                // Update Playstyle Tags
                const playstyleSection = document.getElementById('profilePlaystyleSection');
                const playstyleTagsEl = document.getElementById('profilePlaystyleTags');
                if (playstyleSection && playstyleTagsEl) {
                    const tags = data.playstyleTags;
                    if (tags && Array.isArray(tags) && tags.length > 0) {
                        playstyleTagsEl.innerHTML = tags.map(tag => {
                            const def = PLAYSTYLE_TAGS.find(t => t.id === tag);
                            if (!def) return '';
                            const iconHtml = def.icon ? `<i class="${def.icon}" style="color:${def.color};font-size:10px;line-height:1;flex-shrink:0;"></i>` : '';
                            return `<span class="playstyle-badge" style="background:${def.bg};border:1px solid ${def.border};">${iconHtml}<span style="color:${def.color};font-size:12px;font-weight:600;line-height:1;">${escapeHtml(def.label)}</span></span>`;
                        }).join('');
                        playstyleSection.style.display = 'block';
                    } else {
                        playstyleSection.style.display = 'none';
                    }
                }

                // Update favorite mob
                if (favoriteMob) {
                    favoriteMob.textContent = data.favoriteMob || '-';
                }

                // Update presence info
                const presence = res.presence || data.presence || null;
                const state = presence ? (presence.state || 'offline') : 'offline';
                
                const statusText = formatPresenceStatus(presence);
                
                const serverText = presence && presence.state === 'server' && presence.serverIp ? presence.serverIp : '';
                const worldText = presence && presence.state === 'playing' && presence.worldName ? sanitizeWorldName(presence.worldName) : '';
                const instanceText = presence && presence.instanceName ? presence.instanceName : '';
                const versionText = presence && presence.mcVersion ? presence.mcVersion : '';
                const instanceDisplay = instanceText && versionText ? `${instanceText} (${versionText})` : (instanceText || versionText || '');

                if (presenceStatus) presenceStatus.textContent = statusText;
                
                // Show installation if available
                const instanceRow = document.getElementById('profilePresenceInstanceRow');
                const instanceSpan = document.getElementById('profilePresenceInstance');
                if (instanceRow && instanceSpan) {
                    if (instanceDisplay) {
                        instanceRow.style.display = 'flex';
                        instanceSpan.textContent = instanceDisplay;
                    } else {
                        instanceRow.style.display = 'none';
                    }
                }
                
                // Show server IP if available (privacy check is done on the sender's side)
                const serverRow = document.getElementById('profilePresenceServerRow');
                const serverSpan = document.getElementById('profilePresenceServer');
                if (serverRow && serverSpan) {
                    if (serverText) {
                        serverRow.style.display = 'flex';
                        serverSpan.textContent = serverText;
                        serverSpan.dataset.ip = serverText;
                    } else {
                        serverRow.style.display = 'none';
                    }
                }
                
                // Show world name if available
                const worldRow = document.getElementById('profilePresenceWorldRow');
                const worldSpan = document.getElementById('profilePresenceWorld');
                if (worldRow && worldSpan) {
                    if (worldText) {
                        worldRow.style.display = 'flex';
                        worldSpan.textContent = worldText;
                    } else {
                        worldRow.style.display = 'none';
                    }
                }
                
                // Show/hide details section
                if (presenceDetails) {
                    const hasDetail = instanceDisplay || serverText || worldText;
                    presenceDetails.style.display = hasDetail ? 'flex' : 'none';
                }

                if (presenceIndicator) {
                    presenceIndicator.classList.remove('presence-indicator-online', 'presence-indicator-menu', 'presence-indicator-playing', 'presence-indicator-server', 'presence-indicator-offline');
                    // Map menu to playing class, playing to playing class (both green)
                    const stateClassMap = {
                        online: 'presence-indicator-online',
                        menu: 'presence-indicator-playing',
                        playing: 'presence-indicator-playing',
                        server: 'presence-indicator-server',
                        offline: 'presence-indicator-offline'
                    };
                    presenceIndicator.classList.add(stateClassMap[state] || 'presence-indicator-offline');
                }
                if (presenceCard) presenceCard.style.opacity = '1';
                
                // Handle Join button - only for multiplayer server
                const joinBtn = document.getElementById('profileJoinBtn');
                if (joinBtn) {
                    const isOwnProfile = socialAuth && socialAuth.uid === uid;
                    let joinTarget = '';
                    if (state === 'server' && serverText) {
                        joinTarget = serverText;
                    }
                    
                    if (joinTarget && !isOwnProfile) {
                        joinBtn.style.display = 'inline-flex';
                        joinBtn.onclick = () => window.socialJoinServer(joinTarget, username);
                    } else {
                        joinBtn.style.display = 'none';
                    }
                }
                
                // Update links
                if (linksContainer && data.links && data.links.length > 0) {
                    const validLinks = data.links.filter(link => link && (link.url || link.title));
                    if (validLinks.length > 0) {
                        linksContainer.innerHTML = validLinks.map(link => {
                            const url = link.url || '';
                            const title = link.title || url || 'Link';
                            return `
                            <a href="${escapeHtml(url)}" target="_blank" style="display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: linear-gradient(135deg, rgba(79,172,254,0.15) 0%, rgba(79,172,254,0.05) 100%); border: 1px solid rgba(79,172,254,0.2); border-radius: 10px; text-decoration: none; color: #e0e6ed; transition: all 0.2s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" onmouseover="this.style.background='linear-gradient(135deg, rgba(79,172,254,0.25) 0%, rgba(79,172,254,0.1) 100%)'; this.style.borderColor='rgba(79,172,254,0.4)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(79,172,254,0.2)';" onmouseout="this.style.background='linear-gradient(135deg, rgba(79,172,254,0.15) 0%, rgba(79,172,254,0.05) 100%)'; this.style.borderColor='rgba(79,172,254,0.2)'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)';">
                                <div style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: rgba(79,172,254,0.2); border-radius: 8px; flex-shrink: 0;">
                                    <i class="fas fa-link" style="color: #4facfe; font-size: 18px;"></i>
                                </div>
                                <span style="flex: 1; font-weight: 500; font-size: 1rem; letter-spacing: 0.3px; text-align: left; line-height: 1.2;">${escapeHtml(title)}</span>
                                <div style="display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: rgba(255,255,255,0.05); border-radius: 6px; flex-shrink: 0;">
                                    <i class="fas fa-external-link-alt" style="color: #6b7280; font-size: 15px; transition: color 0.2s;" onmouseover="this.style.color='#4facfe'" onmouseout="this.style.color='#6b7280'"></i>
                                </div>
                            </a>
                        `}).join('');
                    } else {
                        linksContainer.innerHTML = '<p style="margin: 0; color: #6b7280; font-size: 0.9rem; font-style: italic;">No links</p>';
                    }
                } else if (linksContainer) {
                    linksContainer.innerHTML = '<p style="margin: 0; color: #6b7280; font-size: 0.9rem; font-style: italic;">No links</p>';
                }
                
                // Apply background
                if (backgroundPreview && data.background) {
                    const gradients = {
                        'gradient1': 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
                        'gradient2': 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                        'gradient3': 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                        'gradient4': 'linear-gradient(135deg, #e67e22 0%, #d35400 100%)',
                        'gradient5': 'linear-gradient(135deg, #e91eb6 0%, #f363e7 100%)'
                    };
                    
                    const imageBackgrounds = {
                        'minecraft1': 'url(img/backgrounds/minecraft1.png)',
                        'minecraft2': 'url(img/backgrounds/minecraft2.png)',
                        'minecraft3': 'url(img/backgrounds/minecraft3.png)',
                        'minecraft4': 'url(img/backgrounds/minecraft4.png)',
                        'minecraft5': 'url(img/backgrounds/minecraft5.png)',
                        'minecraft6': 'url(img/backgrounds/minecraft6.png)',
                        'minecraft7': 'url(img/backgrounds/minecraft7.png)',
                        'minecraft8': 'url(img/backgrounds/minecraft8.png)',
                        'minecraft9': 'url(img/backgrounds/minecraft9.png)'
                    };
                    
                    const overlay = document.createElement('div');
                    overlay.className = 'background-overlay';
                    overlay.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; border-radius: 16px 16px 0 0; z-index: 0; pointer-events: none;';
                    
                    if (gradients[data.background]) {
                        overlay.style.background = gradients[data.background];
                        // Gradients load immediately
                        if (gradients[data.background] || imageBackgrounds[data.background]) {
                            const existingOverlay = backgroundPreview.querySelector('.background-overlay');
                            const existingDarkening = backgroundPreview.querySelector('.darkening-overlay');
                            if (existingOverlay) existingOverlay.remove();
                            if (existingDarkening) existingDarkening.remove();
                            backgroundPreview.prepend(overlay);
                        }
                    } else if (imageBackgrounds[data.background]) {
                        // Load image and wait for it to load before hiding spinner
                        const img = new Image();
                        img.onload = () => {
                            overlay.style.backgroundImage = imageBackgrounds[data.background];
                            overlay.style.backgroundSize = 'cover';
                            overlay.style.backgroundPosition = 'center';
                            overlay.style.backgroundRepeat = 'no-repeat';
                            
                            const existingOverlay = backgroundPreview.querySelector('.background-overlay');
                            const existingDarkening = backgroundPreview.querySelector('.darkening-overlay');
                            if (existingOverlay) existingOverlay.remove();
                            if (existingDarkening) existingDarkening.remove();
                            backgroundPreview.prepend(overlay);
                            
                            // Hide spinner after image loads with fade-out animation
                            if (loadingSpinner) {
                                loadingSpinner.style.opacity = '0';
                                setTimeout(() => {
                                    if (loadingSpinner) loadingSpinner.style.display = 'none';
                                }, 300);
                            }
                        };
                        img.onerror = () => {
                            // Hide spinner even if image fails to load with fade-out animation
                            if (loadingSpinner) {
                                loadingSpinner.style.opacity = '0';
                                setTimeout(() => {
                                    if (loadingSpinner) loadingSpinner.style.display = 'none';
                                }, 300);
                            }
                        };
                        img.src = imageBackgrounds[data.background].replace('url(', '').replace(')', '');
                    }
                } else {
                    // No background, hide spinner with fade-out animation
                    if (loadingSpinner) {
                        loadingSpinner.style.opacity = '0';
                        setTimeout(() => {
                            if (loadingSpinner) loadingSpinner.style.display = 'none';
                        }, 300);
                    }
                }
                
                // Update country badge
                if (countryBadge && countryFlagSvg && data.country && data.country !== '' && data.country !== 'OTHER') {
                    countryFlagSvg.src = `https://flagcdn.com/w80/${data.country.toLowerCase()}.png`;
                    countryBadge.style.display = 'flex';
                }
                
                // Fetch and display player stats directly in profile
                try {
                    if (api() && api().stats_get_user) {
                        const statsRes = await api().stats_get_user(uid);
                        const stats = (statsRes && statsRes.success && statsRes.stats) ? statsRes.stats : { streak: 0, maxStreak: 0, totalHours: 0, totalDaysPlayed: 0, totalSessions: 0 };
                        const streakEl = document.getElementById('userProfileStreak');
                        const maxStreakEl = document.getElementById('userProfileMaxStreak');
                        const hoursEl = document.getElementById('userProfileHours');
                        const daysEl = document.getElementById('userProfileDays');
                        const sessionsEl = document.getElementById('userProfileSessions');
                        
                        const daysUnit = (typeof window.t === 'function') ? window.t('stats.days_unit') : 'days';
                        const hoursUnit = (typeof window.t === 'function') ? window.t('stats.hours_unit') : 'h';
                        
                        if (streakEl) streakEl.innerHTML = `${stats.streak !== undefined ? stats.streak : 0} <span style="font-size: 11px; font-weight: normal; color: #888;">${daysUnit}</span>`;
                        if (maxStreakEl) maxStreakEl.innerHTML = `${stats.maxStreak !== undefined ? stats.maxStreak : (stats.streak || 0)} <span style="font-size: 11px; font-weight: normal; color: #888;">${daysUnit}</span>`;
                        const th = typeof stats.totalHours === 'number' ? stats.totalHours.toFixed(1) : (stats.totalHours || '0.0');
                        if (hoursEl) hoursEl.innerHTML = `${th} <span style="font-size: 11px; font-weight: normal; color: #888;">${hoursUnit}</span>`;
                        if (daysEl) daysEl.innerHTML = `${stats.totalDaysPlayed || 0} <span style="font-size: 11px; font-weight: normal; color: #888;">${daysUnit}</span>`;
                        if (sessionsEl) sessionsEl.textContent = `${stats.totalSessions || 0}`;
                    }
                } catch (stErr) {
                    console.error('[Profile] Error fetching stats for profile:', stErr);
                }
                
            } else {
                console.log('Failed to load profile or no data');
                if (biography) biography.textContent = 'No biography';
                if (linksContainer) linksContainer.innerHTML = '<p style="margin: 0; color: #6b7280; font-size: 0.9rem; font-style: italic;">No links</p>';
                if (loadingSpinner) {
                    loadingSpinner.style.opacity = '0';
                    setTimeout(() => {
                        if (loadingSpinner) loadingSpinner.style.display = 'none';
                    }, 300);
                }
            }
        } catch (e) {
            console.error('Failed to fetch user profile:', e);
            if (biography) biography.textContent = 'No biography';
            if (linksContainer) linksContainer.innerHTML = '<p style="margin: 0; color: #6b7280; font-size: 0.9rem; font-style: italic;">No links</p>';
            if (loadingSpinner) {
                loadingSpinner.style.opacity = '0';
                setTimeout(() => {
                    if (loadingSpinner) loadingSpinner.style.display = 'none';
                }, 300);
            }
            if (presenceStatus) presenceStatus.textContent = 'Offline';
            if (presenceVersion) {
                presenceVersion.textContent = '-';
                if (presenceVersion.parentElement) presenceVersion.parentElement.style.display = 'none';
            }
            if (presenceInstance) {
                presenceInstance.textContent = '-';
                if (presenceInstance.parentElement) presenceInstance.parentElement.style.display = 'none';
            }
            if (presenceServer) {
                presenceServer.textContent = '-';
                if (presenceServer.parentElement) presenceServer.parentElement.style.display = 'none';
            }
            if (presenceDetails) presenceDetails.style.display = 'none';
            if (presenceIndicator) {
                presenceIndicator.classList.remove('presence-indicator-online', 'presence-indicator-menu', 'presence-indicator-playing', 'presence-indicator-server', 'presence-indicator-offline');
                presenceIndicator.classList.add('presence-indicator-offline');
            }
            if (presenceCard) presenceCard.style.opacity = '0.6';
        }
    };

    // View Own Profile
    window.viewOwnProfile = async function () {
        try {
            let uid = socialAuth && socialAuth.uid;
            let username = socialAuth && socialAuth.username;

            if (!uid && typeof api === 'function' && api() && api().social_get_auth) {
                try {
                    const res = await api().social_get_auth();
                    if (res && res.success && res.uid) {
                        socialAuth = res;
                        uid = res.uid;
                        username = res.username;
                    }
                } catch (e) {
                    console.error('[Social] Error fetching social_get_auth for own profile:', e);
                }
            }

            if (!uid && typeof api === 'function' && api() && api().get_user_json) {
                try {
                    const udata = await api().get_user_json();
                    if (udata) {
                        uid = udata.firebase_uid || udata.firebase_ms_uid;
                        username = udata.username;
                    }
                } catch (e) {
                    console.error('[Social] Error fetching get_user_json for own profile:', e);
                }
            }

            if (uid) {
                await window.viewUserProfile(uid, username || 'Player');
            } else {
                console.warn('[Social] Could not determine own UID to view profile');
            }
        } catch (err) {
            console.error('[Social] Error in viewOwnProfile:', err);
        }
    };

    // Close profile modal
    const closeProfileModalBtn = document.getElementById('closeUserProfileModal');
    if (closeProfileModalBtn) {
        closeProfileModalBtn.addEventListener('click', () => {
            const modal = document.getElementById('userProfileModal');
            if (modal) modal.classList.remove('show');
            // Clear profile refresh interval
            if (profileRefreshInterval) {
                clearInterval(profileRefreshInterval);
                profileRefreshInterval = null;
            }
            currentProfileUid = null;
        });
    }

    // --- Playstyle Tags Data ---
    const PLAYSTYLE_TAGS = [
        // Combat / PvP
        { id: 'pvp',         label: 'PvP',           icon: 'fas fa-shield-halved', bg: 'rgba(239,68,68,0.15)',    color: '#f87171', border: 'rgba(239,68,68,0.3)' },
        { id: 'pvp_pro',     label: 'PvP Pro',        icon: 'fas fa-fire',          bg: 'rgba(220,38,38,0.18)',    color: '#ef4444', border: 'rgba(220,38,38,0.35)' },
        // Building
        { id: 'builder',     label: 'Builder',        icon: 'fas fa-hammer',        bg: 'rgba(251,191,36,0.15)',   color: '#fbbf24', border: 'rgba(251,191,36,0.3)' },
        { id: 'architect',   label: 'Architect',      icon: 'fas fa-drafting-compass', bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
        // Survival
        { id: 'survival',    label: 'Survival',       icon: 'fas fa-tree',          bg: 'rgba(34,197,94,0.15)',    color: '#4ade80', border: 'rgba(34,197,94,0.3)' },
        { id: 'hardcore',    label: 'Hardcore',       icon: 'fas fa-skull',         bg: 'rgba(127,29,29,0.25)',    color: '#fca5a5', border: 'rgba(185,28,28,0.4)' },
        // Technical
        { id: 'redstone',    label: 'Redstone',       icon: 'fas fa-bolt',          bg: 'rgba(239,68,68,0.12)',    color: '#fca5a5', border: 'rgba(239,68,68,0.25)' },
        { id: 'technical',   label: 'Technical',      icon: 'fas fa-cog',           bg: 'rgba(107,114,128,0.2)',   color: '#9ca3af', border: 'rgba(107,114,128,0.35)' },
        { id: 'farms',       label: 'Farm Builder',   icon: 'fas fa-tractor',       bg: 'rgba(132,204,22,0.15)',   color: '#a3e635', border: 'rgba(132,204,22,0.3)' },
        // Exploration
        { id: 'explorer',    label: 'Explorer',       icon: 'fas fa-compass',       bg: 'rgba(6,182,212,0.15)',    color: '#22d3ee', border: 'rgba(6,182,212,0.3)' },
        { id: 'speedrunner', label: 'Speedrunner',    icon: 'fas fa-person-running', bg: 'rgba(168,85,247,0.15)',  color: '#c084fc', border: 'rgba(168,85,247,0.3)' },
        // Social
        { id: 'socialite',   label: 'Socialite',      icon: 'fas fa-users',         bg: 'rgba(236,72,153,0.15)',   color: '#f472b6', border: 'rgba(236,72,153,0.3)' },
        { id: 'roleplayer',  label: 'Roleplayer',     icon: 'fas fa-masks-theater', bg: 'rgba(139,92,246,0.15)',   color: '#a78bfa', border: 'rgba(139,92,246,0.3)' },
        // Modded
        { id: 'modded',      label: 'Modded',         icon: 'fas fa-puzzle-piece',  bg: 'rgba(79,172,254,0.15)',   color: '#60a5fa', border: 'rgba(79,172,254,0.3)' },
        { id: 'modpack',     label: 'Modpack Player', icon: 'fas fa-layer-group',   bg: 'rgba(59,130,246,0.15)',   color: '#93c5fd', border: 'rgba(59,130,246,0.3)' },
        // Creative
        { id: 'creative',    label: 'Creative',       icon: 'fas fa-paintbrush',    bg: 'rgba(234,179,8,0.15)',    color: '#fde047', border: 'rgba(234,179,8,0.3)' },
        { id: 'artist',      label: 'Pixel Artist',   icon: 'fas fa-palette',       bg: 'rgba(244,114,182,0.15)',  color: '#f9a8d4', border: 'rgba(244,114,182,0.3)' },
        // Misc
        { id: 'streamer',    label: 'Streamer',       icon: 'fas fa-video',         bg: 'rgba(124,58,237,0.15)',   color: '#c4b5fd', border: 'rgba(124,58,237,0.3)' },
        { id: 'casual',      label: 'Casual',         icon: 'fas fa-couch',         bg: 'rgba(75,85,99,0.2)',      color: '#9ca3af', border: 'rgba(75,85,99,0.35)' },
        { id: 'minigames',   label: 'Minigames',      icon: 'fas fa-gamepad',       bg: 'rgba(20,184,166,0.15)',   color: '#2dd4bf', border: 'rgba(20,184,166,0.3)' },
        { id: 'skyblock',    label: 'Skyblock',       icon: 'fas fa-cloud',         bg: 'rgba(14,165,233,0.15)',   color: '#38bdf8', border: 'rgba(14,165,233,0.3)' },
    ];

    // --- Link Types Data ---
    const linkTypes = [
        { id: 'youtube', name: 'YouTube', icon: 'fab fa-youtube' },
        { id: 'twitch', name: 'Twitch', icon: 'fab fa-twitch' },
        { id: 'twitter', name: 'Twitter/X', icon: 'fab fa-twitter' },
        { id: 'instagram', name: 'Instagram', icon: 'fab fa-instagram' },
        { id: 'discord', name: 'Discord', icon: 'fab fa-discord' },
        { id: 'reddit', name: 'Reddit', icon: 'fab fa-reddit' },
        { id: 'github', name: 'GitHub', icon: 'fab fa-github' },
        { id: 'tiktok', name: 'TikTok', icon: 'fab fa-tiktok' },
        { id: 'spotify', name: 'Spotify', icon: 'fab fa-spotify' },
        { id: 'steam', name: 'Steam', icon: 'fab fa-steam' },
        { id: 'minecraft', name: 'Minecraft Web', icon: 'fas fa-cube' },
        { id: 'modrinth', name: 'Modrinth', icon: 'fas fa-cube' },
        { id: 'curseforge', name: 'CurseForge', icon: 'fas fa-cube' },
        { id: 'planetminecraft', name: 'Planet Minecraft', icon: 'fas fa-globe' },
        { id: 'website', name: 'Website', icon: 'fas fa-globe' },
        { id: 'blog', name: 'Blog', icon: 'fas fa-blog' },
        { id: 'portfolio', name: 'Portfolio', icon: 'fas fa-briefcase' },
        { id: 'linkedin', name: 'LinkedIn', icon: 'fab fa-linkedin' },
        { id: 'facebook', name: 'Facebook', icon: 'fab fa-facebook' },
        { id: 'telegram', name: 'Telegram', icon: 'fab fa-telegram' },
        { id: 'whatsapp', name: 'WhatsApp', icon: 'fab fa-whatsapp' },
        { id: 'snapchat', name: 'Snapchat', icon: 'fab fa-snapchat' },
        { id: 'pinterest', name: 'Pinterest', icon: 'fab fa-pinterest' },
        { id: 'soundcloud', name: 'SoundCloud', icon: 'fab fa-soundcloud' },
        { id: 'bandcamp', name: 'Bandcamp', icon: 'fab fa-bandcamp' },
        { id: 'kick', name: 'Kick', icon: 'fas fa-broadcast-tower' },
        { id: 'other', name: 'Other', icon: 'fas fa-link' }
    ];

    let selectedLinkType = null;
    let selectedShareLinkType = null;

    function getLinkTypeIcon(typeId) {
        const type = linkTypes.find(t => t.id === typeId);
        return type ? type.icon : 'fas fa-link';
    }

    // Toast notification system
    function showToast(message, type = 'error') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = type === 'error' ? 'fas fa-exclamation-circle' : (type === 'info' ? 'fas fa-info-circle' : 'fas fa-check-circle');
        
        toast.innerHTML = `
            <i class="${icon} toast-icon"></i>
            <span class="toast-message">${message}</span>
        `;
        
        container.appendChild(toast);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'toastSlideOut 0.3s ease forwards';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    // --- Link Modal Functions ---
    function initLinkModal() {
        const addLinkBtn = document.getElementById('addLinkBtn');
        const closeAddLinkBtn = document.getElementById('closeAddLinkBtn');
        const cancelLinkBtn = document.getElementById('cancelLinkBtn');
        const submitLinkBtn = document.getElementById('submitLinkBtn');
        const dropdownTrigger = document.getElementById('linkTypeTrigger');
        const dropdownOptions = document.getElementById('linkTypeOptions');
        const dropdownSearch = document.getElementById('linkTypeSearch');

        if (addLinkBtn) {
            addLinkBtn.addEventListener('click', openAddLinkModal);
        }

        if (closeAddLinkBtn) {
            closeAddLinkBtn.addEventListener('click', closeAddLinkModal);
        }

        if (cancelLinkBtn) {
            cancelLinkBtn.addEventListener('click', closeAddLinkModal);
        }

        if (submitLinkBtn) {
            submitLinkBtn.addEventListener('click', submitLink);
        }

        // Dropdown toggle
        if (dropdownTrigger) {
            dropdownTrigger.addEventListener('click', () => {
                dropdownTrigger.classList.toggle('active');
                dropdownOptions.classList.toggle('show');
                if (dropdownOptions.classList.contains('show')) {
                    renderLinkOptions(linkTypes);
                    if (dropdownSearch) dropdownSearch.focus();
                }
            });
        }

        // Search functionality
        if (dropdownSearch) {
            dropdownSearch.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                const filtered = linkTypes.filter(type => 
                    type.name.toLowerCase().includes(query) || 
                    type.id.toLowerCase().includes(query)
                );
                renderLinkOptions(filtered);
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#linkTypeDropdown')) {
                if (dropdownTrigger) dropdownTrigger.classList.remove('active');
                if (dropdownOptions) dropdownOptions.classList.remove('show');
            }
        });
    }

    function renderLinkOptions(types) {
        const dropdownOptions = document.getElementById('linkTypeOptions');
        if (!dropdownOptions) return;

        if (types.length === 0) {
            dropdownOptions.innerHTML = '<div class="dropdown-option no-results">No types found</div>';
            return;
        }

        dropdownOptions.innerHTML = types.map(type => `
            <div class="dropdown-option ${selectedLinkType && selectedLinkType.id === type.id ? 'selected' : ''}" 
                 data-type-id="${type.id}" 
                 data-type-name="${type.name}"
                 onclick="selectLinkType('${type.id}', '${type.name}')">
                <i class="${type.icon}"></i>
                <span>${type.name}</span>
            </div>
        `).join('');
    }

    window.selectLinkType = function(id, name) {
        selectedLinkType = { id, name };
        const selectedSpan = document.getElementById('linkTypeSelected');
        if (selectedSpan) selectedSpan.textContent = name;
        
        const dropdownTrigger = document.getElementById('linkTypeTrigger');
        const dropdownOptions = document.getElementById('linkTypeOptions');
        if (dropdownTrigger) dropdownTrigger.classList.remove('active');
        if (dropdownOptions) dropdownOptions.classList.remove('show');
        
        renderLinkOptions(linkTypes);
    };

    function openAddLinkModal() {
        const modal = document.getElementById('addLinkModal');
        if (!modal) return;
        
        modal.classList.add('show');
        selectedLinkType = null;
        
        // Reset form
        const urlInput = document.getElementById('linkUrlInput');
        const titleInput = document.getElementById('linkTitleInput');
        const selectedSpan = document.getElementById('linkTypeSelected');
        const dropdownSearch = document.getElementById('linkTypeSearch');
        const urlError = document.getElementById('linkUrlError');
        
        if (urlInput) urlInput.value = '';
        if (titleInput) titleInput.value = '';
        if (selectedSpan) selectedSpan.textContent = 'Select type...';
        if (dropdownSearch) dropdownSearch.value = '';
        if (urlError) urlError.style.display = 'none';
        
        renderLinkOptions(linkTypes);
    }

    function closeAddLinkModal() {
        const modal = document.getElementById('addLinkModal');
        if (modal) modal.classList.remove('show');
        selectedLinkType = null;
    }

    async function submitLink() {
        const urlInput = document.getElementById('linkUrlInput');
        const titleInput = document.getElementById('linkTitleInput');
        const submitBtn = document.getElementById('submitLinkBtn');
        const urlError = document.getElementById('linkUrlError');
        
        const url = urlInput ? urlInput.value.trim() : '';
        const title = titleInput ? titleInput.value.trim() : '';
        
        // Clear previous errors
        if (urlError) urlError.style.display = 'none';
        
        if (!url) {
            // Show inline error instead of alert
            if (urlError) {
                urlError.style.display = 'block';
                urlError.textContent = 'Please enter a URL';
            }
            if (urlInput) urlInput.focus();
            return;
        }
        
        if (!selectedLinkType) {
            showToast(window.t ? window.t('toasts.select_link_type') : 'Please select a link type');
            if (urlInput) urlInput.focus();
            return;
        }
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
        }
        
        try {
            // Call the API to add the link
            const res = await api().add_profile_link(currentProfileUid, url, title, selectedLinkType.id);
            
            if (res && res.success) {
                closeAddLinkModal();
                // Refresh the profile to show the new link
                if (currentProfileUid) {
                    // Get the username from the modal title
                    const displayName = document.getElementById('profileDisplayName');
                    const username = displayName ? displayName.textContent.trim() : '';
                    viewUserProfile(currentProfileUid, username);
                }
            } else {
                showToast('Failed to add link: ' + (res && res.error || 'Unknown error'));
                if (urlInput) urlInput.focus();
            }
        } catch (e) {
            showToast('Error adding link: ' + e.message);
            if (urlInput) urlInput.focus();
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Add Link';
            }
        }
    }

    // Initialize link modal on load
    initLinkModal();

    // --- Share Link Modal Functions ---
    function initShareLinkModal() {
        const closeShareLinkBtn = document.getElementById('closeShareLinkBtn');
        const cancelShareLinkBtn = document.getElementById('cancelShareLinkBtn');
        const submitShareLinkBtn = document.getElementById('submitShareLinkBtn');
        const dropdownTrigger = document.getElementById('shareLinkTypeTrigger');
        const dropdownOptions = document.getElementById('shareLinkTypeOptions');
        const dropdownSearch = document.getElementById('shareLinkTypeSearch');

        if (closeShareLinkBtn) {
            closeShareLinkBtn.addEventListener('click', closeShareLinkModal);
        }

        if (cancelShareLinkBtn) {
            cancelShareLinkBtn.addEventListener('click', closeShareLinkModal);
        }

        if (submitShareLinkBtn) {
            submitShareLinkBtn.addEventListener('click', submitShareLink);
        }

        // Dropdown toggle
        if (dropdownTrigger) {
            dropdownTrigger.addEventListener('click', () => {
                dropdownTrigger.classList.toggle('active');
                dropdownOptions.classList.toggle('show');
                if (dropdownOptions.classList.contains('show')) {
                    renderShareLinkOptions(linkTypes);
                    if (dropdownSearch) dropdownSearch.focus();
                }
            });
        }

        // Search functionality
        if (dropdownSearch) {
            dropdownSearch.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                const filtered = linkTypes.filter(type => 
                    type.name.toLowerCase().includes(query) || 
                    type.id.toLowerCase().includes(query)
                );
                renderShareLinkOptions(filtered);
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#shareLinkTypeDropdown')) {
                if (dropdownTrigger) dropdownTrigger.classList.remove('active');
                if (dropdownOptions) dropdownOptions.classList.remove('show');
            }
        });
    }

    function renderShareLinkOptions(types) {
        const dropdownOptions = document.getElementById('shareLinkTypeOptions');
        if (!dropdownOptions) return;

        if (types.length === 0) {
            dropdownOptions.innerHTML = '<div class="dropdown-option no-results">No types found</div>';
            return;
        }

        dropdownOptions.innerHTML = types.map(type => `
            <div class="dropdown-option ${selectedShareLinkType && selectedShareLinkType.id === type.id ? 'selected' : ''}" 
                 data-type-id="${type.id}" 
                 data-type-name="${type.name}"
                 onclick="selectShareLinkType('${type.id}', '${type.name}')">
                <i class="${type.icon}"></i>
                <span>${type.name}</span>
            </div>
        `).join('');
    }

    window.selectShareLinkType = function(id, name) {
        selectedShareLinkType = { id, name };
        const selectedSpan = document.getElementById('shareLinkTypeSelected');
        if (selectedSpan) selectedSpan.textContent = name;
        
        const dropdownTrigger = document.getElementById('shareLinkTypeTrigger');
        const dropdownOptions = document.getElementById('shareLinkTypeOptions');
        if (dropdownTrigger) dropdownTrigger.classList.remove('active');
        if (dropdownOptions) dropdownOptions.classList.remove('show');
        
        renderShareLinkOptions(linkTypes);
    };

    function openShareLinkModal() {
        const modal = document.getElementById('shareLinkModal');
        if (!modal) return;
        
        modal.classList.add('show');
        selectedShareLinkType = null;
        
        // Reset form
        const urlInput = document.getElementById('shareLinkUrlInput');
        const titleInput = document.getElementById('shareLinkTitleInput');
        const selectedSpan = document.getElementById('shareLinkTypeSelected');
        const dropdownSearch = document.getElementById('shareLinkTypeSearch');
        const urlError = document.getElementById('shareLinkUrlError');
        
        if (urlInput) urlInput.value = '';
        if (titleInput) titleInput.value = '';
        if (selectedSpan) selectedSpan.textContent = 'Select type...';
        if (dropdownSearch) dropdownSearch.value = '';
        if (urlError) urlError.style.display = 'none';
        
        renderShareLinkOptions(linkTypes);
    }

    function closeShareLinkModal() {
        const modal = document.getElementById('shareLinkModal');
        if (modal) modal.classList.remove('show');
        selectedShareLinkType = null;
    }

    async function submitShareLink() {
        const urlInput = document.getElementById('shareLinkUrlInput');
        const titleInput = document.getElementById('shareLinkTitleInput');
        const submitBtn = document.getElementById('submitShareLinkBtn');
        const urlError = document.getElementById('shareLinkUrlError');
        
        const url = urlInput ? urlInput.value.trim() : '';
        const title = titleInput ? titleInput.value.trim() : '';
        
        // Clear previous errors
        if (urlError) urlError.style.display = 'none';
        
        if (!url) {
            // Show inline error instead of alert
            if (urlError) {
                urlError.style.display = 'block';
                urlError.textContent = 'Please enter a URL';
            }
            if (urlInput) urlInput.focus();
            return;
        }
        
        // Validate URL starts with http:// or https://
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            if (urlError) {
                urlError.style.display = 'block';
                urlError.textContent = 'URL must start with http:// or https://';
            }
            if (urlInput) urlInput.focus();
            return;
        }
        
        if (!selectedShareLinkType) {
            showToast(window.t ? window.t('toasts.select_link_type') : 'Please select a link type');
            if (urlInput) urlInput.focus();
            return;
        }
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        }
        
        try {
            const linkData = {
                url: url,
                title: title || url,
                type: selectedShareLinkType.id,
                typeName: selectedShareLinkType.name
            };
            
            const messageContent = `$$LINK$$${JSON.stringify(linkData)}`;
            closeShareLinkModal();
            await broadcastContent(messageContent, 'link');
        } catch (e) {
            showToast('Error sending link: ' + e.message);
            if (urlInput) urlInput.focus();
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Send Link';
            }
        }
    }

    // Initialize share link modal on load
    initShareLinkModal();

    function showSearchStatus(msg, type) {
        const el = document.getElementById('searchUserStatus');
        if (!el) return;
        el.textContent = msg;
        el.className = 'social-status-msg ' + (type === 'success' ? 'status-success' : 'status-error');
        el.style.display = 'block';
    }

    // --- Requests Tab ---
    async function loadRequests(showLoading) {
        const loading = document.getElementById('requestsLoading');
        if (showLoading && loading) loading.style.display = 'flex';
        try {
            const res = await api().social_get_requests();
            if (loading) loading.style.display = 'none';
            if (!res || !res.success) return;
            renderReceivedRequests(res.received || []);
            renderSentRequests(res.sent || []);
            const cnt = (res.received || []).length;
            const el = document.getElementById('reqReceivedCount');
            if (el) { el.textContent = cnt; el.style.display = cnt > 0 ? 'inline-flex' : 'none'; }
            updateBadge();
        } catch (e) {
            if (loading) loading.style.display = 'none';
        }
    }

    function renderReceivedRequests(reqs) {
        const list = document.getElementById('reqReceivedList');
        if (!list) return;
        if (reqs.length === 0) { list.innerHTML = '<div class="social-empty"><i class="fas fa-inbox"></i><p>No pending requests</p></div>'; return; }
        list.innerHTML = reqs.map(r => {
            const p = r.profile || {};
            const pb = renderBadgesHtml(Array.isArray(p.badges) ? p.badges : (p.accountType === 'microsoft' ? ['premium'] : []));
            const idSafe = escapeHtml(r.id);
            const uidSafe = escapeHtml(p.uid);
            const nameSafe = escapeHtml(p.username || 'Unknown');
            return `<div class="social-user-item">
              <div class="social-item-avatar">${getAvatarHtml(p, 38)}</div>
              <div class="social-item-info">
                <div class="social-item-name">${escapeHtml(p.username || 'Unknown')} ${pb}</div>
                <span class="social-item-sublabel">Wants to be your friend</span>
              </div>
              <div class="social-item-actions">
                <button class="social-action-btn social-btn-accept" title="Accept" onclick='socialAcceptRequest("${idSafe}")'><i class="fas fa-check"></i></button>
                <button class="social-action-btn social-btn-reject" title="Reject" onclick='socialRejectRequest("${idSafe}")'><i class="fas fa-times"></i></button>
                <button class="social-action-btn social-btn-block" title="Block" onclick='socialBlockFromRequest("${uidSafe}", "${idSafe}", "${nameSafe}")'><i class="fas fa-ban"></i></button>
              </div>
            </div>`;
        }).join('');
    }

    function renderSentRequests(reqs) {
        const list = document.getElementById('reqSentList');
        if (!list) return;
        if (reqs.length === 0) { list.innerHTML = '<div class="social-empty"><i class="fas fa-paper-plane"></i><p>No sent requests</p></div>'; return; }
        list.innerHTML = reqs.map(r => {
            const p = r.profile || {};
            const pb = renderBadgesHtml(Array.isArray(p.badges) ? p.badges : (p.accountType === 'microsoft' ? ['premium'] : []));
            const idSafe = escapeHtml(r.id);
            return `<div class="social-user-item">
              <div class="social-item-avatar">${getAvatarHtml(p, 38)}</div>
              <div class="social-item-info">
                <div class="social-item-name">${escapeHtml(p.username || 'Unknown')} ${pb}</div>
                <span class="social-item-sublabel">Request pending</span>
              </div>
              <div class="social-item-actions">
                <button class="social-action-btn social-btn-reject" title="Cancel request" onclick='socialCancelRequest("${idSafe}")'><i class="fas fa-times"></i></button>
              </div>
            </div>`;
        }).join('');
    }

    function switchReqSubtab(subtab) {
        activeReqSubtab = subtab;
        document.querySelectorAll('.req-subtab').forEach(b => b.classList.toggle('active', b.dataset.subtab === subtab));
        const recv = document.getElementById('reqReceivedList');
        const sent = document.getElementById('reqSentList');
        if (recv) recv.style.display = subtab === 'received' ? 'block' : 'none';
        if (sent) sent.style.display = subtab === 'sent' ? 'block' : 'none';
    }

    window.socialAcceptRequest = async function (id) {
        try { const res = await api().social_accept_request(id); if (res && res.success) { loadRequests(false); updateBadge(); } } catch (e) {}
    };
    window.socialRejectRequest = async function (id) {
        try { const res = await api().social_reject_request(id); if (res && res.success) loadRequests(false); } catch (e) {}
    };
    window.socialCancelRequest = async function (id) {
        try { const res = await api().social_cancel_request(id); if (res && res.success) loadRequests(false); } catch (e) {}
    };
    window.socialBlockFromRequest = async function (uid, reqId, username) {
        const confirmMsg = (window.t ? window.t('social.confirm_block', { username }) : '') || `Block ${username}?`;
        if (!confirm(confirmMsg)) return;
        try {
            await api().social_reject_request(reqId);
            await api().social_block_user(uid, null);
            loadRequests(false);
        } catch (e) {}
    };

    // --- Chat deprecated: Replaced by Inbox system ---
    function openChat() {
        if (typeof window.openInbox === 'function') window.openInbox('received');
    }

    function closeChat() {}

    window.closeViewProfileModal = function() {
        const modal = document.getElementById('viewProfileModal');
        if (modal) modal.classList.remove('show');
    };

    window.openShareProfileModal = async function() {
        const modal = document.getElementById('shareProfileModal');
        if (!modal) return;
        
        const list = document.getElementById('shareProfileList');
        if (list) {
            list.innerHTML = '<div style="text-align:center; padding:20px; color:#aaa;">Loading profiles...</div>';
            
            try {
                const res = await api().get_profiles();
                if (res && res.profiles) {
                    const profilesArray = Object.entries(res.profiles).map(([id, p]) => ({ id, ...p }));
                    
                    if (profilesArray.length === 0) {
                        list.innerHTML = '<div style="text-align:center; padding:20px; color:#aaa;">You have no installations to share.</div>';
                    } else {
                        list.innerHTML = '';
                        for (const profile of profilesArray) {
                            // Skip profiles with latest snapshot/release names
                            const nameLower = (profile.name || '').toLowerCase();
                            if (nameLower === 'latest release' || nameLower === 'latest snapshot') {
                                continue;
                            }
                            
                            let iconSrc = 'img/icon.png';
                            if (profile.icon) {
                                try {
                                    const rawIcon = await api().get_profile_icon(profile.icon);
                                    iconSrc = window.resolveImageSource ? window.resolveImageSource(rawIcon) : rawIcon;
                                } catch (e) {}
                            }
                            
                            const div = document.createElement('div');
                            div.className = 'social-user-item';
                            div.style = 'cursor: pointer; padding: 10px; border-radius: 8px;';
                            div.innerHTML = `
                                <div class="social-item-avatar" style="width:40px; height:40px; border-radius:6px;">
                                    <img src="${iconSrc}" style="width:100%; height:100%; object-fit:cover; image-rendering:pixelated;">
                                </div>
                                <div class="social-item-info">
                                    <div class="social-item-name">${escapeHtml(profile.name)}</div>
                                    <div class="social-item-status" style="font-size:11px;">${escapeHtml(formatVersionString(profile.version))}</div>
                                </div>
                                <button class="social-btn-primary" style="padding: 6px 12px; font-size: 12px; background: rgba(79,172,254,0.2); color: #4facfe; border: 1px solid rgba(79,172,254,0.3); border-radius: 4px; cursor: pointer;">Share</button>
                            `;
                            
                            div.onclick = async () => {
                                closeShareProfileModal();
                                try {
                                    const resMods = await api().get_installed_addons(profile.id, 'mod');
                                    const resRp = await api().get_installed_addons(profile.id, 'resourcepack');
                                    const resSh = await api().get_installed_addons(profile.id, 'shader');
                                    let combined = [];
                                    if (resMods && resMods.success && resMods.mods) combined = combined.concat(resMods.mods.filter(m => m.project_id && m.version_id).map(m => ({...m, type: 'mod'})));
                                    if (resRp && resRp.success && resRp.mods) combined = combined.concat(resRp.mods.filter(m => m.project_id && m.version_id).map(m => ({...m, type: 'resourcepack'})));
                                    if (resSh && resSh.success && resSh.mods) combined = combined.concat(resSh.mods.filter(m => m.project_id && m.version_id).map(m => ({...m, type: 'shader'})));
                                    if (combined.length > 0) profile.addons = combined;
                                } catch(err) {}
                                shareProfileToChat(profile, iconSrc);
                            };
                            list.appendChild(div);
                        }
                        
                        // Show message if no shareable profiles
                        if (list.children.length === 0) {
                            list.innerHTML = '<div style="text-align:center; padding:20px; color:#aaa;">No shareable installations found. Installations with "latest snapshot" or "latest release" cannot be shared.</div>';
                        }
                    }
                }
            } catch (e) {
                console.error("Error loading profiles:", e);
                list.innerHTML = '<div style="text-align:center; padding:20px; color:#e74c3c;">Error loading installations.</div>';
            }
        }
        
        modal.classList.add('show');
    };

    window.closeShareProfileModal = function() {
        const modal = document.getElementById('shareProfileModal');
        if (modal) modal.classList.remove('show');
    };

    // Seed Modal Functions
    window.openShareSeedModal = async function() {
        const modal = document.getElementById('shareSeedModal');
        if (!modal) return;
        
        // Reset state
        document.getElementById('seedTextInput').value = '';
        document.getElementById('seedValidationError').style.display = 'none';
        document.getElementById('seedProfileSelect').innerHTML = '<option value="">Loading installations...</option>';
        document.getElementById('seedWorldSelect').innerHTML = '<option value="">Select an installation first</option>';
        document.getElementById('seedWorldSelect').disabled = true;
        document.getElementById('seedLoadingSpinner').style.display = 'none';
        document.getElementById('seedError').style.display = 'none';
        
        // Set default method to text
        switchSeedMethod('text');
        
        // Load profiles
        loadSeedProfiles();
        
        modal.classList.add('show');
    };

    window.closeShareSeedModal = function() {
        const modal = document.getElementById('shareSeedModal');
        if (modal) modal.classList.remove('show');
    };

    function switchSeedMethod(method) {
        const textSection = document.getElementById('seedTextSection');
        const worldSection = document.getElementById('seedWorldSection');
        const buttons = document.querySelectorAll('.seed-method-btn');
        
        buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.method === method);
        });
        
        if (method === 'text') {
            // Fade out world section, then fade in text section
            worldSection.style.opacity = '0';
            setTimeout(() => {
                worldSection.style.display = 'none';
                textSection.style.display = 'block';
                setTimeout(() => {
                    textSection.style.opacity = '1';
                }, 10);
            }, 200);
        } else {
            // Fade out text section, then fade in world section
            textSection.style.opacity = '0';
            setTimeout(() => {
                textSection.style.display = 'none';
                worldSection.style.display = 'block';
                setTimeout(() => {
                    worldSection.style.opacity = '1';
                }, 10);
            }, 200);
        }
    }

    async function loadSeedProfiles() {
        const select = document.getElementById('seedProfileSelect');
        if (!select) return;
        const currentVal = select.value;
        
        try {
            const res = await api().get_profiles();
            if (res && res.profiles) {
                const profilesArray = Object.entries(res.profiles).map(([id, p]) => ({ id, ...p }));
                
                select.innerHTML = '<option value="">Select an installation...</option>';
                
                for (const profile of profilesArray) {
                    const nameLower = (profile.name || '').toLowerCase();
                    if (nameLower === 'latest release' || nameLower === 'latest snapshot') {
                        continue;
                    }
                    
                    const option = document.createElement('option');
                    option.value = profile.id;
                    option.textContent = `${profile.name} (${formatVersionString(profile.version)})`;
                    select.appendChild(option);
                }
                if (currentVal && Array.from(select.options).some(o => o.value === currentVal)) {
                    select.value = currentVal;
                }
            }
        } catch (e) {
            console.error('Error loading profiles for seed:', e);
            select.innerHTML = '<option value="">Error loading installations</option>';
        }
    }

    async function loadSeedWorlds(profileId) {
        const select = document.getElementById('seedWorldSelect');
        if (!select) return;
        
        select.innerHTML = '<option value="">Loading worlds...</option>';
        select.disabled = true;
        
        try {
            const res = await api().get_worlds(profileId);
            if (res && res.worlds) {
                select.innerHTML = '<option value="">Select a world...</option>';
                
                for (const world of res.worlds) {
                    const option = document.createElement('option');
                    option.value = world.name;
                    option.textContent = world.name;
                    select.appendChild(option);
                }
                
                select.disabled = false;
            } else {
                select.innerHTML = '<option value="">No worlds found</option>';
            }
        } catch (e) {
            console.error('Error loading worlds:', e);
            select.innerHTML = '<option value="">Error loading worlds</option>';
        }
    }

    function validateSeedInput(seed) {
        if (!seed) return false;
        
        // Remove optional negative sign for validation
        const numericPart = seed.startsWith('-') ? seed.substring(1) : seed;
        
        // Must be 19-20 digits total (including optional -)
        if (seed.length < 19 || seed.length > 20) return false;
        
        // Must be all digits (after optional -)
        if (!/^-?\d+$/.test(seed)) return false;
        
        // Numeric part must be 19-20 digits
        if (numericPart.length < 19 || numericPart.length > 20) return false;
        
        return true;
    }

    async function readSeedFromWorld(profileId, worldName) {
        const spinner = document.getElementById('seedLoadingSpinner');
        const errorDiv = document.getElementById('seedError');
        
        spinner.style.display = 'flex';
        errorDiv.style.display = 'none';
        
        try {
            const res = await window.hwlAPI.read_world_seed(profileId, worldName);
            spinner.style.display = 'none';
            
            if (res && res.success && res.seed !== undefined) {
                return res.seed;
            } else {
                errorDiv.style.display = 'block';
                return null;
            }
        } catch (e) {
            console.error('Error reading seed:', e);
            spinner.style.display = 'none';
            errorDiv.style.display = 'block';
            return null;
        }
    }

    async function sendSeedCard(seed) {
        const seedString = typeof seed === 'bigint' ? seed.toString() : String(seed);
        const seedData = {
            type: 'seed',
            seed: seedString
        };
        const content = JSON.stringify(seedData);
        if (typeof closeShareSeedModal === 'function') closeShareSeedModal();
        broadcastContent(content, 'seed');
    }

    window.copySeedToClipboard = function(seed, btn) {
        navigator.clipboard.writeText(seed).then(() => {
            const originalHtml = btn.innerHTML;
            const copiedText = (window.t && window.t('social.copied')) ? window.t('social.copied') : 'Copied!';
            btn.innerHTML = `<i class="fas fa-check"></i> ${copiedText}`;
            btn.classList.add('copied');
            
            setTimeout(() => {
                btn.innerHTML = originalHtml;
                btn.classList.remove('copied');
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy seed:', err);
            showToast((window.t && window.t('social.error')) ? window.t('social.error') : 'Failed to copy to clipboard');
        });
    };

    async function shareProfileToChat(profile, iconSrc) {
        let shareableIcon = iconSrc;
        if (!shareableIcon && profile.icon) {
            try {
                const rawIcon = await api().get_profile_icon(profile.icon);
                shareableIcon = rawIcon;
            } catch(e) {}
        }
        if (!shareableIcon) shareableIcon = profile.icon;

        const payload = {
            type: 'profile_share',
            profile: {
                name: profile.name,
                version: profile.version,
                icon: shareableIcon,
                jvm_args: profile.jvm_args,
                addons: profile.addons || []
            }
        };
        const contentStr = '$$PROFILE_SHARE$$' + JSON.stringify(payload);
        if (typeof closeShareProfileModal === 'function') closeShareProfileModal();
        broadcastContent(contentStr, 'installation');
    }

    // --- Profile View/Install Handlers ---
    window.viewSharedProfile = async function(contentStr) {
        try {
            const payload = JSON.parse(contentStr.substring('$$PROFILE_SHARE$$'.length));
            const p = payload.profile;
            if (!p) return;
            
            const modal = document.getElementById('viewProfileModal');
            if (!modal) return;
            
            document.getElementById('vpName').textContent = p.name || 'Unknown Installation';
            document.getElementById('vpVersion').textContent = formatVersionString(p.version) || 'Unknown Version';
            
            // Icon
            const vpIcon = document.getElementById('vpIcon');
            vpIcon.src = 'img/icon.png';
            if (p.icon) {
                try {
                    const rawIcon = await api().get_profile_icon(p.icon);
                    vpIcon.src = window.resolveImageSource ? window.resolveImageSource(rawIcon) : rawIcon;
                } catch(e) {}
            }
            
            // Loader
            const versionLower = (p.version || '').toLowerCase();
            const loaderEl = document.getElementById('vpLoader');
            const modsTab = document.getElementById('vpTabMods');
            
            let isModded = false;
            if (versionLower.includes('forge')) {
                loaderEl.textContent = 'Forge';
                loaderEl.style.display = 'block';
                isModded = true;
            } else if (versionLower.includes('fabric')) {
                loaderEl.textContent = 'Fabric';
                loaderEl.style.display = 'block';
                isModded = true;
            } else {
                loaderEl.style.display = 'none';
            }
            const rpTab = document.getElementById('vpTabResourcePacks');
            const shTab = document.getElementById('vpTabShaders');
            if (rpTab) rpTab.style.display = 'none';
            if (shTab) shTab.style.display = 'none';

            const addons = p.addons || [];
            const mods = addons.filter(function(a) { return a && (a.type === 'mod' || a.type === 'file' || (!a.type && (a.filename && a.filename.endsWith('.jar'))) || (!a.type && a.project_id)); });
            const resourcepacks = addons.filter(function(a) { return a && (a.type === 'resourcepack' || (!a.type && a.filename && a.filename.endsWith('.zip'))); });
            const shaders = addons.filter(function(a) { return a && a.type === 'shader'; });

            if (mods.length > 0 || isModded) modsTab.style.display = 'block';
            else modsTab.style.display = 'none';
            if (rpTab && resourcepacks.length > 0) rpTab.style.display = 'block';
            if (shTab && shaders.length > 0) shTab.style.display = 'block';

            // Reset to General tab
            document.querySelectorAll('#viewProfileModal .group-tab-btn').forEach(t => t.classList.remove('active'));
            document.querySelector('#viewProfileModal .group-tab-btn[data-vp-tab="general"]').classList.add('active');
            ['General', 'Mods', 'ResourcePacks', 'Shaders'].forEach(t => {
                const el = document.getElementById('vpTabContent' + t);
                if (el) el.style.display = (t === 'General') ? 'block' : 'none';
            });
            
            const loadVpList = async (listId, items, emptyMsg, iconClass) => {
                const listEl = document.getElementById(listId);
                if (!listEl) return;
                if (!items || items.length === 0) {
                    listEl.innerHTML = `<div style="text-align:center; padding:20px; color:#aaa; font-style:italic;">${emptyMsg}</div>`;
                    return;
                }
                const htmls = [];
                for (const addon of items) {
                    if (addon.project_id) {
                        try {
                            const details = await api().get_mod_details(addon.project_id);
                            if (details && details.success && details.details) {
                                const mod = details.details;
                                htmls.push(`
                                    <div class="social-user-item" style="padding: 10px; border-radius: 8px;">
                                        <div class="social-item-avatar" style="width:32px; height:32px; border-radius:6px; background: rgba(0,0,0,0.3);">
                                            <img src="${mod.icon_url || 'img/icon.png'}" style="width:100%; height:100%; object-fit:cover; border-radius:6px;">
                                        </div>
                                        <div class="social-item-info">
                                            <div class="social-item-name">${escapeHtml(mod.title)}</div>
                                            <div class="social-item-status" style="font-size:11px; opacity:0.7;">${escapeHtml(addon.filename || '')}</div>
                                        </div>
                                    </div>
                                `);
                                continue;
                            }
                        } catch(e) {}
                    }
                    htmls.push(`
                        <div class="social-user-item" style="padding: 10px; border-radius: 8px;">
                            <div class="social-item-avatar" style="width:32px; height:32px; border-radius:6px; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
                                <i class="fas ${iconClass}" style="color:#4facfe;"></i>
                            </div>
                            <div class="social-item-info">
                                <div class="social-item-name">${escapeHtml(addon.display_name || addon.filename || 'Unknown item')}</div>
                            </div>
                        </div>
                    `);
                }
                listEl.innerHTML = htmls.join('');
            };

            loadVpList('vpModsList', mods, 'No mods configured.', 'fa-cube');
            loadVpList('vpResourcePacksList', resourcepacks, 'No resource packs configured.', 'fa-palette');
            loadVpList('vpShadersList', shaders, 'No shaders configured.', 'fa-magic');
            
            // Tab switching logic
            document.querySelectorAll('#viewProfileModal .group-tab-btn').forEach(tab => {
                tab.onclick = () => {
                    document.querySelectorAll('#viewProfileModal .group-tab-btn').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    const tabName = tab.dataset.vpTab;
                    const mapName = tabName === 'general' ? 'General' : (tabName === 'mods' ? 'Mods' : (tabName === 'resourcepacks' ? 'ResourcePacks' : 'Shaders'));
                    ['General', 'Mods', 'ResourcePacks', 'Shaders'].forEach(t => {
                        const el = document.getElementById('vpTabContent' + t);
                        if (el) el.style.display = (t === mapName) ? 'block' : 'none';
                    });
                };
            });
            
            // Install button logic
            const installBtn = document.getElementById('vpInstallBtn');
            installBtn.onclick = () => {
                closeViewProfileModal();
                installSharedProfile(contentStr);
            };
            
            modal.classList.add('show');
        } catch(e) {
            console.error("Error displaying profile:", e);
        }
    };
    
    async function getDefaultInstallationDirectory() {
        try {
            let basePath = '';
            if (window.hwlAPI && typeof window.hwlAPI.getDocumentsPath === 'function') {
                basePath = await window.hwlAPI.getDocumentsPath();
            } else if (typeof api === 'function' && api() && typeof api().getDocumentsPath === 'function') {
                basePath = await api().getDocumentsPath();
            } else if (typeof api === 'function' && api() && typeof api().get_documents_path === 'function') {
                basePath = await api().get_documents_path();
            } else if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.getDocumentsPath === 'function') {
                basePath = await window.pywebview.api.getDocumentsPath();
            }

            if (basePath) {
                const separator = basePath.includes('\\') ? '\\' : '/';
                const uuid = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('dir-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9));
                return `${basePath}${separator}MinecraftDirectories${separator}${uuid}`;
            }

            let fallbackBase = '';
            try {
                const userData = await api().get_user_json();
                fallbackBase = userData.mcdir || '';
            } catch (_) {}

            if (fallbackBase) {
                const separator = fallbackBase.includes('\\') ? '\\' : '/';
                const uuid = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('dir-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9));
                return `${fallbackBase}${separator}MinecraftDirectories${separator}${uuid}`;
            }
            return '';
        } catch (e) {
            console.error('[Social] Error generating default installation directory:', e);
            return '';
        }
    }

    window.runSharedProfileCompatCheck = async function() {
        const p = window.sharedProfileData;
        const confirmInstallAllBtn = document.getElementById('confirmInstallAllBtn');
        const compatBox = document.getElementById('ipCompatibilityBox');

        // For Modrinth modpacks, versions are uploaded directly to Modrinth.
        // Individual mod resolution does not apply and "Install All (Force)" must never be shown!
        if (!p || p.isModrinthModpack || !p.addons || p.addons.length === 0) {
            if (compatBox) compatBox.style.display = 'none';
            if (confirmInstallAllBtn) {
                confirmInstallAllBtn.classList.add('hidden');
                confirmInstallAllBtn.style.setProperty('display', 'none', 'important');
            }
            return;
        }

        const swSelect = document.getElementById('ipSoftwareSelect');
        const mcSelect = document.getElementById('ipMcVersionSelect');
        const targetLoader = swSelect ? swSelect.value : 'fabric';
        const targetMc = mcSelect ? mcSelect.value : '';
        if (!targetMc) return;

        const spinner = document.getElementById('ipCompatSpinner');
        const badgeOk = document.getElementById('ipCompatBadgeOk');
        const badgeAuto = document.getElementById('ipCompatBadgeAuto');
        const badgeErr = document.getElementById('ipCompatBadgeErr');
        const countOk = document.getElementById('ipCompatCountOk');
        const countAuto = document.getElementById('ipCompatCountAuto');
        const countErr = document.getElementById('ipCompatCountErr');
        const incompatWrap = document.getElementById('ipCompatIncompatibleListWrap');
        const incompatList = document.getElementById('ipCompatIncompatibleList');

        if (compatBox) compatBox.style.display = 'block';
        if (spinner) spinner.style.display = 'inline-block';

        try {
            const resolver = (api() && api().resolve_modpack_compatibility) || 
                             (window.hwlAPI && window.hwlAPI.resolveModpackCompatibility);
            if (!resolver) {
                if (spinner) spinner.style.display = 'none';
                if (confirmInstallAllBtn) {
                    confirmInstallAllBtn.classList.add('hidden');
                    confirmInstallAllBtn.style.setProperty('display', 'none', 'important');
                }
                return;
            }

            const res = await resolver({
                addons: p.addons,
                targetMcVersion: targetMc,
                targetLoader: targetLoader,
                autoIncludeMissingDeps: true
            });

            if (spinner) spinner.style.display = 'none';

            if (res && res.success) {
                window.lastCompatReport = res;
                if (countOk) countOk.textContent = res.compatible.length;

                if (badgeAuto && countAuto) {
                    if (res.autoAdded && res.autoAdded.length > 0) {
                        badgeAuto.style.display = 'inline-flex';
                        countAuto.textContent = res.autoAdded.length;
                    } else {
                        badgeAuto.style.display = 'none';
                    }
                }

                if (badgeErr && countErr) {
                    if (res.incompatible && res.incompatible.length > 0) {
                        badgeErr.style.display = 'inline-flex';
                        countErr.textContent = res.incompatible.length;

                        if (incompatWrap && incompatList) {
                            incompatWrap.style.display = 'block';
                            incompatList.innerHTML = res.incompatible.map(item => {
                                const cleanName = item.name || (item.filename ? item.filename.replace(/\.(jar|zip|mrpack)$/i, '').replace(/[-_+](fabric|forge|neoforge|quilt|mc)?v?[0-9].*$/i, '').replace(/[-_]/g, ' ').trim() : '') || item.project_id || 'Unknown Mod';
                                return `
                                    <div class="compat-incompat-item">
                                        <div class="item-title">${escapeHtml(cleanName)}</div>
                                        <div class="item-reason">${escapeHtml(item.reason || 'Incompatible')}</div>
                                    </div>
                                `;
                            }).join('');
                        }
                        if (confirmInstallAllBtn && !p.isModrinthModpack) {
                            confirmInstallAllBtn.classList.remove('hidden');
                            confirmInstallAllBtn.style.setProperty('display', 'inline-flex', 'important');
                        }
                    } else {
                        badgeErr.style.display = 'none';
                        if (incompatWrap) incompatWrap.style.display = 'none';
                        if (confirmInstallAllBtn) {
                            confirmInstallAllBtn.classList.add('hidden');
                            confirmInstallAllBtn.style.setProperty('display', 'none', 'important');
                        }
                    }
                }
            }
        } catch (e) {
            console.error('[CompatCheck] Error:', e);
            if (spinner) spinner.style.display = 'none';
            if (confirmInstallAllBtn) {
                confirmInstallAllBtn.classList.add('hidden');
                confirmInstallAllBtn.style.setProperty('display', 'none', 'important');
            }
        }
    };

    window.installSharedProfile = async function(contentStr) {
        try {
            const payload = JSON.parse(contentStr.substring('$$PROFILE_SHARE$$'.length));
            const p = payload.profile;
            if (!p) return;
            
            // Store the shared profile data for installation
            window.sharedProfileData = p;
            window.lastCompatReport = null;
            
            // Open the install profile modal IMMEDIATELY to avoid delay
            const modal = document.getElementById('installProfileModal');
            if (!modal) return;
            modal.classList.add('show');
            
            // Reset compatibility UI and secondary button
            const compatBox = document.getElementById('ipCompatibilityBox');
            if (compatBox) compatBox.style.display = 'none';
            const incompatList = document.getElementById('ipCompatIncompatibleList');
            if (incompatList) incompatList.style.display = 'none';
            const toggleBtn = document.getElementById('ipCompatToggleIncompatBtn');
            if (toggleBtn) toggleBtn.classList.remove('open');
            const confirmInstallAllBtn = document.getElementById('confirmInstallAllBtn');
            if (confirmInstallAllBtn) {
                confirmInstallAllBtn.classList.add('hidden');
                confirmInstallAllBtn.style.setProperty('display', 'none', 'important');
            }

            // Preview icon if available
            const ipIconPreview = document.getElementById('ipIconPreview');
            if (ipIconPreview) {
                const previewSrc = (p.icon && (p.icon.startsWith('data:') || p.icon.startsWith('http'))) ? p.icon : (p.iconUrl || '');
                if (previewSrc) {
                    ipIconPreview.src = previewSrc;
                    ipIconPreview.style.display = 'block';
                } else {
                    ipIconPreview.style.display = 'none';
                }
            }

            // Populate fields with shared profile data
            const defaultJVMArgs = '-Xmx4G -Xms1G -XX:+UnlockExperimentalVMOptions -XX:+UseG1GC -XX:G1NewSizePercent=20 -XX:G1ReservePercent=20 -XX:MaxGCPauseMillis=50 -XX:G1HeapRegionSize=32M';
            document.getElementById('ipNameInput').value = p.name || '';
            document.getElementById('ipJavaInput').value = p.java_path || '';
            document.getElementById('ipJvmInput').value = p.jvm_args || defaultJVMArgs;
            
            const modrinthRow = document.getElementById('ipModrinthVersionRow');
            
            // Auto-fill game directory with dedicated UUID directory
            getDefaultInstallationDirectory().then(dirPath => {
                const dirInput = document.getElementById('ipDirInput');
                if (dirInput) dirInput.value = dirPath || '';
            });

            // If profile has addons, configure version selects to allow choosing Minecraft version
            if (p.addons && p.addons.length > 0 && modrinthRow) {
                modrinthRow.style.display = 'flex';

                const swSelect = document.getElementById('ipSoftwareSelect');
                const mcSelect = document.getElementById('ipMcVersionSelect');
                const loaderSelect = document.getElementById('ipLoaderVersionSelect');

                // Determine initial software & mcVersion from p.version
                let initialLoader = 'fabric';
                let initialMc = '';
                if (p.version) {
                    const match = p.version.match(/^(Fabric|Forge|NeoForge|Vanilla|Quilt)\s+([0-9.]+)/i);
                    if (match) {
                        initialLoader = match[1].toLowerCase();
                        initialMc = match[2];
                    } else {
                        const m = p.version.match(/([0-9]+\.[0-9]+(?:\.[0-9]+)?)/);
                        if (m) initialMc = m[1];
                    }
                }

                if (swSelect) {
                    swSelect.innerHTML = `
                        <option value="fabric">Fabric</option>
                        <option value="forge">Forge</option>
                        <option value="neoforge">NeoForge</option>
                    `;
                    if (['fabric', 'forge', 'neoforge'].includes(initialLoader)) {
                        swSelect.value = initialLoader;
                    } else {
                        swSelect.value = 'fabric';
                    }
                }

                const updateLoaderSelect = async (selSw, selMc) => {
                    if (!loaderSelect) return;
                    loaderSelect.innerHTML = '<option value="">Loading...</option>';
                    loaderSelect.disabled = true;
                    try {
                        const loaders = await api().get_loader_versions(selSw, selMc);
                        loaderSelect.innerHTML = '';
                        if (!loaders || loaders.length === 0) {
                            loaderSelect.innerHTML = '<option value="">Default loader</option>';
                        } else {
                            loaders.forEach(l => {
                                const opt = document.createElement('option');
                                opt.value = l;
                                opt.textContent = l;
                                loaderSelect.appendChild(opt);
                            });
                            loaderSelect.disabled = false;
                        }
                    } catch(e) {
                        loaderSelect.innerHTML = '<option value="">Default loader</option>';
                    }
                };

                const updateMcSelect = async (selSw, preferredMc = null) => {
                    if (!mcSelect) return;
                    mcSelect.innerHTML = '<option value="">Loading...</option>';
                    mcSelect.disabled = true;
                    try {
                        let versions = [];
                        if (selSw === 'fabric') versions = await api().get_fabric_mc_versions();
                        else if (selSw === 'forge') versions = await api().get_forge_mc_versions();
                        else if (selSw === 'neoforge') versions = await api().get_neoforge_mc_versions();
                        else versions = await api().get_vanilla_versions();

                        mcSelect.innerHTML = '';
                        if (!versions || versions.length === 0) {
                            mcSelect.innerHTML = '<option value="">No versions found</option>';
                        } else {
                            versions.forEach(v => {
                                const opt = document.createElement('option');
                                opt.value = v;
                                opt.textContent = v;
                                mcSelect.appendChild(opt);
                            });
                        }
                        mcSelect.disabled = false;

                        let chosenMc = preferredMc;
                        if (!chosenMc || (versions && !versions.includes(chosenMc))) {
                            chosenMc = mcSelect.options.length > 0 ? mcSelect.options[0].value : '';
                        }
                        if (chosenMc) mcSelect.value = chosenMc;

                        await updateLoaderSelect(selSw, chosenMc);
                        await window.runSharedProfileCompatCheck();
                    } catch(e) {
                        console.error('[Social] Error updating mcSelect:', e);
                    }
                };

                if (swSelect) {
                    swSelect.onchange = async () => {
                        await updateMcSelect(swSelect.value, null);
                    };
                }

                if (mcSelect) {
                    mcSelect.onchange = async () => {
                        await updateLoaderSelect(swSelect ? swSelect.value : 'fabric', mcSelect.value);
                        await window.runSharedProfileCompatCheck();
                    };
                }

                await updateMcSelect(swSelect ? swSelect.value : 'fabric', initialMc);
            } else {
                if (modrinthRow) modrinthRow.style.display = 'none';
            }
        } catch(e) {
            console.error('[Social] installSharedProfile error:', e.message);
        }
    };
    
    window.openModrinthModpackInstallModal = async function(projectId, versionObj, defaultName, iconUrl, worldName) {
        window.sharedProfileData = {
            isModrinthModpack: true,
            projectId: projectId,
            versionObj: versionObj,
            name: defaultName || 'Modrinth Modpack',
            iconUrl: iconUrl,
            worldName: worldName || null
        };
        
        // Open modal IMMEDIATELY to eliminate latency
        const modal = document.getElementById('installProfileModal');
        if (!modal) return;
        modal.classList.add('show');
        
        // Reset compatibility UI and secondary button
        const compatBox = document.getElementById('ipCompatibilityBox');
        if (compatBox) compatBox.style.display = 'none';
        const confirmInstallAllBtn = document.getElementById('confirmInstallAllBtn');
        if (confirmInstallAllBtn) {
            confirmInstallAllBtn.classList.add('hidden');
            confirmInstallAllBtn.style.setProperty('display', 'none', 'important');
        }

        // Show modpack icon preview
        const ipIconPreview = document.getElementById('ipIconPreview');
        if (ipIconPreview) {
            if (iconUrl) {
                ipIconPreview.src = iconUrl;
                ipIconPreview.style.display = 'block';
            } else {
                ipIconPreview.style.display = 'none';
            }
        }
        if (!iconUrl && projectId) {
            api().get_mod_details(projectId).then(res => {
                if (res && res.success && res.details && res.details.icon_url) {
                    if (window.sharedProfileData && window.sharedProfileData.projectId === projectId) {
                        window.sharedProfileData.iconUrl = res.details.icon_url;
                        if (ipIconPreview) {
                            ipIconPreview.src = res.details.icon_url;
                            ipIconPreview.style.display = 'block';
                        }
                    }
                }
            }).catch(() => {});
        }

        const defaultJVMArgs = '-Xmx4G -Xms1G -XX:+UnlockExperimentalVMOptions -XX:+UseG1GC -XX:G1NewSizePercent=20 -XX:G1ReservePercent=20 -XX:MaxGCPauseMillis=50 -XX:G1HeapRegionSize=32M';
        document.getElementById('ipNameInput').value = defaultName || 'Modrinth Modpack';
        document.getElementById('ipJavaInput').value = '';
        document.getElementById('ipJvmInput').value = defaultJVMArgs;
        
        const modrinthRow = document.getElementById('ipModrinthVersionRow');
        if (modrinthRow) modrinthRow.style.display = 'flex';
        
        // Auto-complete UUID installation directory
        getDefaultInstallationDirectory().then(dirPath => {
            const dirInput = document.getElementById('ipDirInput');
            if (dirInput) dirInput.value = dirPath || '';
        });
        
        // Fetch all modpack versions from Modrinth to populate dropdowns asynchronously
        let allVersions = [];
        try {
            const resVersions = await api().get_mod_versions(projectId, null, null);
            if (resVersions && resVersions.success && resVersions.versions && resVersions.versions.length > 0) {
                allVersions = resVersions.versions;
            }
        } catch (e) {
            console.error('[Social] Error fetching modpack versions:', e);
        }
        if (allVersions.length === 0 && versionObj) {
            allVersions = [versionObj];
        }
        window.sharedProfileData.allVersions = allVersions;
        
        const swSelect = document.getElementById('ipSoftwareSelect');
        const mcSelect = document.getElementById('ipMcVersionSelect');
        const loaderSelect = document.getElementById('ipLoaderVersionSelect');
        
        if (swSelect && mcSelect && loaderSelect) {
            swSelect.innerHTML = '';
            
            const loadersSet = new Set();
            allVersions.forEach(v => {
                if (v.loaders && Array.isArray(v.loaders)) {
                    v.loaders.forEach(l => loadersSet.add(l.toLowerCase()));
                }
            });
            
            const formatSw = (s) => {
                if (s === 'fabric') return 'Fabric';
                if (s === 'forge') return 'Forge';
                if (s === 'neoforge') return 'NeoForge';
                if (s === 'vanilla') return 'Vanilla';
                return s.charAt(0).toUpperCase() + s.slice(1);
            };
            
            const order = ['fabric', 'forge', 'neoforge', 'vanilla'];
            const sortedLoaders = Array.from(loadersSet).sort((a, b) => {
                const ia = order.indexOf(a);
                const ib = order.indexOf(b);
                if (ia !== -1 && ib !== -1) return ia - ib;
                if (ia !== -1) return -1;
                if (ib !== -1) return 1;
                return a.localeCompare(b);
            });
            
            if (sortedLoaders.length === 0) sortedLoaders.push('fabric');
            
            sortedLoaders.forEach(l => {
                const opt = document.createElement('option');
                opt.value = l;
                opt.textContent = formatSw(l);
                swSelect.appendChild(opt);
            });
            
            let defaultLoader = versionObj && versionObj.loaders && versionObj.loaders[0] ? versionObj.loaders[0].toLowerCase() : sortedLoaders[0];
            if (!sortedLoaders.includes(defaultLoader)) defaultLoader = sortedLoaders[0];
            swSelect.value = defaultLoader;
            
            const updateLoaderVersions = async (selectedSw, selectedMc) => {
                if (!selectedMc || selectedSw === 'vanilla') {
                    loaderSelect.innerHTML = '<option value="">Select a loader...</option>';
                    loaderSelect.disabled = true;
                    return;
                }
                loaderSelect.innerHTML = '<option value="">Loading...</option>';
                loaderSelect.disabled = true;
                try {
                    const loaders = await api().get_loader_versions(selectedSw, selectedMc);
                    loaderSelect.innerHTML = '';
                    if (!loaders || loaders.length === 0) {
                        loaderSelect.innerHTML = '<option value="">No loaders available</option>';
                    } else {
                        loaders.forEach(l => {
                            const opt = document.createElement('option');
                            opt.value = l;
                            opt.textContent = l;
                            loaderSelect.appendChild(opt);
                        });
                        loaderSelect.disabled = false;
                    }
                } catch (e) {
                    console.error('[Social] Error loading loader versions:', e);
                    loaderSelect.innerHTML = '<option value="">Error loading</option>';
                }
            };
            
            const updateMcVersions = async (selectedSw, targetMcVer = null) => {
                mcSelect.innerHTML = '<option value="">Loading...</option>';
                mcSelect.disabled = true;
                
                const mcSet = new Set();
                allVersions.forEach(v => {
                    if (v.loaders && Array.isArray(v.loaders) && v.loaders.some(l => l.toLowerCase() === selectedSw)) {
                        if (v.game_versions && Array.isArray(v.game_versions)) {
                            v.game_versions.forEach(mc => mcSet.add(mc));
                        }
                    }
                });
                
                mcSelect.innerHTML = '';
                if (mcSet.size === 0) {
                    mcSelect.innerHTML = '<option value="">No versions found</option>';
                } else {
                    Array.from(mcSet).forEach(mc => {
                        const opt = document.createElement('option');
                        opt.value = mc;
                        opt.textContent = mc;
                        mcSelect.appendChild(opt);
                    });
                }
                mcSelect.disabled = false;
                
                let mcToSelect = targetMcVer;
                if (!mcToSelect || !mcSet.has(mcToSelect)) {
                    mcToSelect = mcSelect.options.length > 0 ? mcSelect.options[0].value : '';
                }
                if (mcToSelect) mcSelect.value = mcToSelect;
                
                await updateLoaderVersions(selectedSw, mcToSelect);
            };
            
            swSelect.onchange = async () => {
                await updateMcVersions(swSelect.value, null);
            };
            
            mcSelect.onchange = async () => {
                await updateLoaderVersions(swSelect.value, mcSelect.value);
            };
            
            let defaultMc = versionObj && versionObj.game_versions && versionObj.game_versions[0] ? versionObj.game_versions[0] : null;
            await updateMcVersions(defaultLoader, defaultMc);
        }
    };

    window.closeInstallProfileModal = function() {
        const modal = document.getElementById('installProfileModal');
        if (modal) modal.classList.remove('show');
        window.sharedProfileData = null;
        window.lastCompatReport = null;
        const compatBox = document.getElementById('ipCompatibilityBox');
        if (compatBox) compatBox.style.display = 'none';
        const incompatList = document.getElementById('ipCompatIncompatibleList');
        if (incompatList) incompatList.style.display = 'none';
        const toggleBtn = document.getElementById('ipCompatToggleIncompatBtn');
        if (toggleBtn) toggleBtn.classList.remove('open');
        const confirmInstallAllBtn = document.getElementById('confirmInstallAllBtn');
        if (confirmInstallAllBtn) {
            confirmInstallAllBtn.classList.add('hidden');
            confirmInstallAllBtn.style.setProperty('display', 'none', 'important');
        }
        const ipIconPreview = document.getElementById('ipIconPreview');
        if (ipIconPreview) {
            ipIconPreview.src = '';
            ipIconPreview.style.display = 'none';
        }
    };
    
    window.confirmInstallSharedProfile = async function(opts = {}) {
        const forceAll = !!(opts && opts.forceAll);
        const p = window.sharedProfileData;
        if (!p) return;
        
        const name = document.getElementById('ipNameInput').value.trim();
        const dir = document.getElementById('ipDirInput').value.trim();
        const javaPath = document.getElementById('ipJavaInput').value.trim() || null;
        const jvmArgs = document.getElementById('ipJvmInput').value.trim() || p.jvm_args || null;
        
        if (!name) {
            showToast(window.t ? window.t('toasts.enter_install_name') : 'Please enter an installation name');
            return;
        }
        
        if (!dir) {
            showToast(window.t ? window.t('toasts.enter_game_dir') : 'Please enter a game directory');
            return;
        }

        if (forceAll) {
            const warnMsg = (window.t ? window.t('installations.install_all_confirm') : 'Some mods may be incompatible with the selected version and could cause Minecraft to crash. Are you sure you want to install all mods anyway?');
            if (!window.confirm(warnMsg)) {
                return;
            }
        }
        
        if (p.isModrinthModpack) {
            try {
                const swSelect = document.getElementById('ipSoftwareSelect');
                const mcSelect = document.getElementById('ipMcVersionSelect');
                const loaderSelect = document.getElementById('ipLoaderVersionSelect');
                
                const software = swSelect ? swSelect.value : 'fabric';
                const mcVersion = mcSelect ? mcSelect.value : '';
                const loaderVersion = loaderSelect && !loaderSelect.disabled ? loaderSelect.value : '';
                
                let profileVersion = mcVersion || 'Vanilla';
                if (software === 'vanilla') {
                    profileVersion = `Vanilla ${mcVersion}`;
                } else if (software === 'forge' && loaderVersion) {
                    profileVersion = `Forge ${mcVersion} (${loaderVersion})`;
                } else if (software === 'fabric' && loaderVersion) {
                    profileVersion = `Fabric ${mcVersion} (${loaderVersion})`;
                } else if (software === 'neoforge' && loaderVersion) {
                    profileVersion = `NeoForge ${mcVersion} (${loaderVersion})`;
                } else if (software === 'optifine' && loaderVersion) {
                    profileVersion = `OptiFine ${mcVersion} (${loaderVersion})`;
                }
                
                // 1) Pass Modrinth icon URL directly to backend
                let iconArg = p.iconUrl || p.icon || 'default.png';
                if ((!iconArg || iconArg === 'default.png') && p.projectId) {
                    try {
                        const d = await api().get_mod_details(p.projectId);
                        if (d && d.success && d.details && d.details.icon_url) {
                            iconArg = d.details.icon_url;
                        }
                    } catch(e) {}
                }
                
                // 2) Create profile with chosen version and downloaded icon
                const resCreate = await api().add_profile(name, profileVersion, iconArg, dir || null, jvmArgs, javaPath);
                
                if (resCreate && resCreate.success) {
                    const newProfileId = resCreate.profile_id || resCreate.id;
                    closeInstallProfileModal();
                    showToast('Installing modpack ' + name + '...', 'info');
                    
                    // 3) Find matching mrpack version from Modrinth
                    let chosenVersionObj = p.versionObj;
                    if (p.allVersions && Array.isArray(p.allVersions)) {
                        const match = p.allVersions.find(v => 
                            v.loaders && v.loaders.some(l => l.toLowerCase() === software) &&
                            v.game_versions && v.game_versions.includes(mcVersion) &&
                            v.version_type === 'release' && v.featured
                        ) || p.allVersions.find(v => 
                            v.loaders && v.loaders.some(l => l.toLowerCase() === software) &&
                            v.game_versions && v.game_versions.includes(mcVersion) &&
                            v.version_type === 'release'
                        ) || p.allVersions.find(v => 
                            v.loaders && v.loaders.some(l => l.toLowerCase() === software) &&
                            v.game_versions && v.game_versions.includes(mcVersion)
                        );
                        if (match) chosenVersionObj = match;
                    }
                    const versionId = chosenVersionObj ? chosenVersionObj.id : null;
                    
                    // 4) Download and install modpack (.mrpack) into the new profile
                    const downloadResult = await api().install_project(p.projectId, versionId, newProfileId, 'modpack', p.worldName);
                    
                    if (!downloadResult || !downloadResult.success) {
                        if (window.onModDownloadError) window.onModDownloadError(p.projectId, downloadResult ? downloadResult.error : 'Unknown error');
                        else showToast('Failed to download modpack: ' + (downloadResult ? downloadResult.error : 'Unknown error'));
                    } else {
                        if (window.onModDownloadComplete) window.onModDownloadComplete(p.projectId, chosenVersionObj ? chosenVersionObj.filename : 'modpack.mrpack');
                        else showToast('Modpack ' + name + ' installed successfully!', 'success');
                    }
                    
                    if (window.loadProfiles) await window.loadProfiles();
                    if (window.loadOptions) await window.loadOptions();
                    if (window.loadModdableProfiles) await window.loadModdableProfiles();
                } else {
                    showToast('Failed to create installation: ' + (resCreate ? resCreate.error : 'Unknown error'));
                }
            } catch(e) {
                console.error('[Social] Modrinth modpack install error:', e.message);
                showToast('Error installing modpack: ' + e.message);
            }
            return;
        }
        
        try {
            let finalVersion = p.version || 'Vanilla';
            const swSelect = document.getElementById('ipSoftwareSelect');
            const mcSelect = document.getElementById('ipMcVersionSelect');
            const loaderSelect = document.getElementById('ipLoaderVersionSelect');

            if (swSelect && mcSelect && mcSelect.value) {
                const sw = swSelect.value;
                const mc = mcSelect.value;
                const ldr = loaderSelect && !loaderSelect.disabled ? loaderSelect.value : '';
                if (sw === 'vanilla') finalVersion = `Vanilla ${mc}`;
                else if (sw === 'fabric') finalVersion = ldr ? `Fabric ${mc} (${ldr})` : `Fabric ${mc}`;
                else if (sw === 'forge') finalVersion = ldr ? `Forge ${mc} (${ldr})` : `Forge ${mc}`;
                else if (sw === 'neoforge') finalVersion = ldr ? `NeoForge ${mc} (${ldr})` : `NeoForge ${mc}`;
            }

            let profileIconArg = p.icon || p.iconB64 || p.iconUrl || 'default.png';
            const result = await api().add_profile(
                name, 
                finalVersion, 
                profileIconArg, 
                dir || null, 
                jvmArgs, 
                javaPath
            );
            
            if (result.success) {
                // If the profile has configs in snapshot, extract them to the profile folder
                if (p.configZipB64 && api().workshop_extract_configs) {
                    try {
                        await api().workshop_extract_configs(result.profile_id, p.configZipB64);
                    } catch (cfgErr) {
                        console.error("[Social] Error extracting modpack configs:", cfgErr.message);
                    }
                }

                // If compatibility check was performed, determine candidate addons
                let candidateAddons = p.addons;
                if (!forceAll && window.lastCompatReport && window.lastCompatReport.success) {
                    candidateAddons = [
                        ...(window.lastCompatReport.compatible || []),
                        ...(window.lastCompatReport.autoAdded || [])
                    ];
                } else if (forceAll && window.lastCompatReport && window.lastCompatReport.success) {
                    // For forceAll, upgrade compatible ones to matching versions, keep incompatible ones as-is, and append auto-added dependencies!
                    const compMap = new Map();
                    (window.lastCompatReport.compatible || []).forEach(c => compMap.set(c.project_id, c));
                    const merged = (p.addons || []).map(a => compMap.get(a.project_id) || a);
                    const seenIds = new Set(merged.map(a => a.project_id));
                    (window.lastCompatReport.autoAdded || []).forEach(dep => {
                        if (!seenIds.has(dep.project_id)) {
                            merged.push(dep);
                            seenIds.add(dep.project_id);
                        }
                    });
                    candidateAddons = merged;
                }

                // If the profile has addons, save them
                if (candidateAddons && candidateAddons.length > 0) {
                    try {
                        const normAddons = candidateAddons.filter(a => a.project_id && a.version_id).map(function(a){
                            const isEn = (a.enabled !== false && a.state !== 'disabled');
                            let ext = '.jar';
                            if (a.type === 'resourcepack' || a.type === 'shader') ext = '.zip';
                            return {
                                project_id: a.project_id,
                                version_id: a.version_id,
                                filename: a.filename || `${a.project_id}${ext}`,
                                type: a.type || 'mod',
                                state: isEn ? 'enabled' : 'disabled',
                                enabled: isEn
                            };
                        });
                        await api().edit_profile(
                            result.profile_id, 
                            name, 
                            finalVersion, 
                            null, 
                            p.icon || profileIconArg, 
                            null, 
                            null, 
                            jvmArgs, 
                            null, 
                            null, 
                            null, 
                            null, 
                            normAddons
                        );
                    } catch(err) {
                        console.error("Error syncing addons to profile", err);
                    }
                }
                
                closeInstallProfileModal();
                showToast('Profile ' + name + ' installed successfully!', 'success');
                // Refresh UI lists
                if (window.loadProfiles) await window.loadProfiles();
                if (window.loadOptions) await window.loadOptions();
            } else {
                showToast('Failed to install profile: ' + (result.error || 'Unknown error'));
            }
        } catch(e) {
            console.error('[Social] confirmInstallSharedProfile error:', e.message);
            showToast('Error installing profile: ' + e.message);
        }
    };

    // --- DOM ready setup ---
    document.addEventListener('DOMContentLoaded', () => {
        // Social button
        const socialBtn = document.getElementById('socialBtn');
        if (socialBtn) {
            socialBtn.addEventListener('click', (e) => {
                // Prevent click if button is disabled
                if (socialBtn.classList.contains('btn-disabled')) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                openSocialModal('received');
            });
        }

        // Close button
        const closeBtn = document.getElementById('closeSocialModal');
        if (closeBtn) closeBtn.addEventListener('click', closeSocialModal);

        // OS notification click / navigation events → open social modal and inbox
        window.addEventListener('navigate-to-chat', (e) => {
            const targetTab = e?.detail?.targetTab || 'received';
            openSocialModal(targetTab);
            if (typeof window.openInbox === 'function') window.openInbox(targetTab);
        });

        window.addEventListener('navigate-to-inbox', async (e) => {
            const detail = e?.detail;
            const targetId = detail?.accountId || detail?.recipientUid;
            const targetTab = detail?.targetTab || 'received';
            if (targetId && window.performAccountSwitch) {
                try {
                    const userData = await window.pywebview.api.get_user_json();
                    const currentActiveUid = userData?.account_type === 'microsoft'
                        ? (userData?.firebase_ms_uid || null)
                        : (userData?.account_type === 'helloworld' ? (userData?.firebase_uid || null) : null);
                    let isTargetActive = false;
                    if (detail.recipientUid && currentActiveUid) {
                        isTargetActive = currentActiveUid === detail.recipientUid;
                    } else if (detail.recipientType) {
                        isTargetActive = userData?.account_type === detail.recipientType && (
                            !detail.recipientUsername || (userData?.username && userData.username.toLowerCase() === detail.recipientUsername.toLowerCase())
                        );
                    }
                    if (!isTargetActive) {
                        await window.performAccountSwitch(targetId, true, '', detail.recipientUsername || detail.username || '', detail.recipientType || '');
                        return;
                    }
                } catch (_) {}
            }
            if (typeof window.openSocialModal === 'function') await window.openSocialModal(targetTab);
            else openSocialModal(targetTab);
            if (typeof window.openInbox === 'function') window.openInbox(targetTab);
        });

        window.addEventListener('inbox-updated', () => {
            if (typeof loadInboxMessages === 'function') loadInboxMessages(false);
            if (typeof updateBadge === 'function') updateBadge();
        });

        // Tab buttons
        document.querySelectorAll('.social-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => switchSocialTab(btn.dataset.tab));
        });

        // Request subtabs
        document.querySelectorAll('.req-subtab').forEach(btn => {
            btn.addEventListener('click', () => switchReqSubtab(btn.dataset.subtab));
        });

        // Search
        const searchBtn = document.getElementById('searchUserBtn');
        if (searchBtn) searchBtn.addEventListener('click', searchUser);
        const searchInput = document.getElementById('searchUserInput');
        if (searchInput) searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') searchUser(); });

        const cancelShareProfileBtn = document.getElementById('cancelShareProfileBtn');
        if (cancelShareProfileBtn) cancelShareProfileBtn.addEventListener('click', closeShareProfileModal);

        // Seed Modal
        const closeShareSeedBtn = document.getElementById('closeShareSeedBtn');
        if (closeShareSeedBtn) closeShareSeedBtn.addEventListener('click', closeShareSeedModal);

        const cancelShareSeedBtn = document.getElementById('cancelShareSeedBtn');
        if (cancelShareSeedBtn) cancelShareSeedBtn.addEventListener('click', closeShareSeedModal);

        document.querySelectorAll('.seed-method-btn').forEach(btn => {
            btn.addEventListener('click', () => switchSeedMethod(btn.dataset.method));
        });

        const seedProfileSelect = document.getElementById('seedProfileSelect');
        if (seedProfileSelect) {
            seedProfileSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    loadSeedWorlds(e.target.value);
                } else {
                    document.getElementById('seedWorldSelect').innerHTML = '<option value="">Select an installation first</option>';
                    document.getElementById('seedWorldSelect').disabled = true;
                }
            });
        }

        const sendSeedBtn = document.getElementById('sendSeedBtn');
        if (sendSeedBtn) {
            sendSeedBtn.addEventListener('click', async () => {
                const activeMethod = document.querySelector('.seed-method-btn.active').dataset.method;
                
                if (activeMethod === 'text') {
                    const seedInput = document.getElementById('seedTextInput');
                    const seed = seedInput.value.trim();
                    const errorDiv = document.getElementById('seedValidationError');
                    
                    if (!validateSeedInput(seed)) {
                        errorDiv.style.display = 'block';
                        return;
                    }
                    
                    errorDiv.style.display = 'none';
                    await sendSeedCard(seed);
                } else {
                    const profileId = document.getElementById('seedProfileSelect').value;
                    const worldName = document.getElementById('seedWorldSelect').value;
                    
                    if (!profileId || !worldName) {
                        showToast(window.t ? window.t('toasts.select_install_world') : 'Please select an installation and world');
                        return;
                    }
                    
                    const seed = await readSeedFromWorld(profileId, worldName);
                    if (seed !== null) {
                        await sendSeedCard(String(seed));
                    }
                }
            });
        }

        const closeViewProfileBtn = document.getElementById('closeViewProfileBtn');
        if (closeViewProfileBtn) closeViewProfileBtn.addEventListener('click', closeViewProfileModal);

        // Install Profile Modal
        const cancelInstallProfileBtn = document.getElementById('cancelInstallProfileBtn');
        if (cancelInstallProfileBtn) cancelInstallProfileBtn.addEventListener('click', closeInstallProfileModal);

        const confirmInstallProfileBtn = document.getElementById('confirmInstallProfileBtn');
        if (confirmInstallProfileBtn) confirmInstallProfileBtn.addEventListener('click', () => confirmInstallSharedProfile());

        const confirmInstallAllBtn = document.getElementById('confirmInstallAllBtn');
        if (confirmInstallAllBtn) confirmInstallAllBtn.addEventListener('click', () => confirmInstallSharedProfile({ forceAll: true }));

        const toggleCompatIncompatBtn = document.getElementById('ipCompatToggleIncompatBtn');
        if (toggleCompatIncompatBtn) {
            toggleCompatIncompatBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const list = document.getElementById('ipCompatIncompatibleList');
                if (list) {
                    const isHidden = list.style.display === 'none' || !list.style.display;
                    list.style.display = isHidden ? 'flex' : 'none';
                    toggleCompatIncompatBtn.classList.toggle('open', isHidden);
                }
            });
        }

        const ipDirBtn = document.getElementById('ipDirBtn');
        if (ipDirBtn) ipDirBtn.addEventListener('click', async () => {
            const currentDir = document.getElementById('ipDirInput').value.trim();
            const selectedDir = await api().select_folder(currentDir);
            if (selectedDir) document.getElementById('ipDirInput').value = selectedDir;
        });

        const ipJavaBtn = document.getElementById('ipJavaBtn');
        if (ipJavaBtn) ipJavaBtn.addEventListener('click', async () => {
            // select_file API doesn't exist, so we'll use select_folder to select the directory
            // User can then manually type the java executable name
            const currentDir = document.getElementById('ipJavaInput').value.trim();
            const selectedDir = await api().select_folder(currentDir);
            if (selectedDir) document.getElementById('ipJavaInput').value = selectedDir;
        });

        // Blocked toggle
        const blockedToggleBtn = document.getElementById('blockedToggleBtn');
        if (blockedToggleBtn) blockedToggleBtn.addEventListener('click', toggleBlockedSection);

        // Resize handle + config persistence
        const resizeHandle = document.getElementById('socialResizeHandle');
        const mainPanel = document.getElementById('socialPanelMain');
        const MIN_WIDTH = 220;
        const MAX_WIDTH = 520;

        if (resizeHandle && mainPanel) {
            let resizing = false;
            let startX = 0;
            let startWidth = 0;
            resizeHandle.addEventListener('mousedown', (e) => {
                resizing = true;
                startX = e.clientX;
                startWidth = mainPanel.offsetWidth;
                resizeHandle.classList.add('dragging');
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
                e.preventDefault();
            });
            document.addEventListener('mousemove', (e) => {
                if (!resizing) return;
                const newW = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth + (e.clientX - startX)));
                mainPanel.style.setProperty('width', newW + 'px', 'important');
            });
            document.addEventListener('mouseup', async () => {
                if (!resizing) return;
                resizing = false;
                resizeHandle.classList.remove('dragging');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                const finalWidth = mainPanel.offsetWidth;
                try {
                    await window.hwlAPI.saveUserJson({ social_panel_width: finalWidth });
                } catch (e) {
                    // Silent fail
                }
            });
        }
    });

    let currentInboxTab = 'received';

    window.switchInboxTab = function(tab) {
        currentInboxTab = (tab === 'sent') ? 'sent' : 'received';
        const btnRecv = document.getElementById('inboxTabReceived');
        const btnSent = document.getElementById('inboxTabSent');
        if (btnRecv) btnRecv.classList.toggle('active', currentInboxTab === 'received');
        if (btnSent) btnSent.classList.toggle('active', currentInboxTab === 'sent');
        loadInboxMessages(true);
    };

    window.openInbox = function(targetTab = 'received') {
        currentInboxTab = (targetTab === 'sent') ? 'sent' : 'received';
        const panel = document.getElementById('socialPanelInbox');
        if (panel) panel.style.display = 'flex';
        const btnRecv = document.getElementById('inboxTabReceived');
        const btnSent = document.getElementById('inboxTabSent');
        if (btnRecv) btnRecv.classList.toggle('active', currentInboxTab === 'received');
        if (btnSent) btnSent.classList.toggle('active', currentInboxTab === 'sent');
        loadInboxMessages(true);
    };

    window.closeInbox = function() {
        const panel = document.getElementById('socialPanelInbox');
        if (panel) panel.style.display = 'none';
    };

    window.handleInboxHover = function(el) {
        if (!el) return;
        el.style.background = 'rgba(255, 255, 255, 0.04)';
        const dot = el.querySelector('.inbox-unread-dot');
        const msgId = el.dataset.msgId;
        if (dot || el.classList.contains('is-unread')) {
            if (dot) dot.remove();
            el.classList.remove('is-unread');
            if (msgId && api() && typeof api().social_inbox_mark_read === 'function') {
                api().social_inbox_mark_read(msgId).then(() => {
                    if (typeof updateBadge === 'function') updateBadge();
                }).catch(() => {});
            }
        }
    };

    async function loadInboxMessages(initial = false) {
        if (!socialAuth) return;
        try {
            const isSentTab = currentInboxTab === 'sent';
            if (isSentTab) {
                const res = (api() && typeof api().social_inbox_get_sent === 'function')
                    ? await api().social_inbox_get_sent()
                    : { success: true, messages: [] };
                if (res && res.success && res.messages) {
                    renderInboxMessages(res.messages, initial, null, true);
                }
            } else {
                const res = await api().social_inbox_get();
                if (res && res.success && res.messages) {
                    renderInboxMessages(res.messages, initial, res.lastRead, false);
                }
            }
        } catch(e) {
            console.error('[Social] Error loading inbox messages:', e);
        }
    }

    function renderInboxMessages(messages, scrollToBottom, lastRead, isSentTab = false) {
        const container = document.getElementById('inboxMessages');
        if (!container) return;

        const displayMessages = isSentTab
            ? (messages || [])
            : (messages || []).filter(msg => {
                if (msg.isSentCopy) return false;
                if (socialAuth && msg.senderId === socialAuth.uid) return false;
                return true;
            });

        if (displayMessages.length === 0) {
            let noMsgText = isSentTab ? 'No sent messages yet.' : 'No messages yet.';
            if (window.t) {
                if (isSentTab) {
                    const tSent = window.t('social.no_sent_messages_yet');
                    if (tSent && tSent !== 'social.no_sent_messages_yet') noMsgText = tSent;
                } else {
                    const t1 = window.t('social.no_messages_yet');
                    if (t1 && t1 !== 'social.no_messages_yet') noMsgText = t1;
                    else {
                        const t2 = window.t('social.no_messages');
                        if (t2 && t2 !== 'social.no_messages') noMsgText = t2;
                    }
                }
            }
            container.innerHTML = `<div style="text-align:center;color:#888;padding:32px 20px;font-size:13px;"><i class="fas ${isSentTab ? 'fa-paper-plane' : 'fa-inbox'}" style="display:block;font-size:26px;margin-bottom:12px;opacity:0.35;color:#4facfe;"></i>${escapeHtml(noMsgText)}</div>`;
            return;
        }

        displayMessages.sort((a, b) => {
            const ta = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : (Number(a.timestamp) || 0);
            const tb = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : (Number(b.timestamp) || 0);
            return tb - ta;
        });

        const viewText = (window.t && window.t('social.view') !== 'social.view') ? window.t('social.view') : 'View';
        const installText = (window.t && window.t('social.install') !== 'social.install') ? window.t('social.install') : 'Install';
        const copyText = (window.t && window.t('social.copy') !== 'social.copy') ? window.t('social.copy') : 'Copy';

        container.innerHTML = '';
        displayMessages.forEach(msg => {
            let contentHtml = escapeHtml(msg.content);
            let realSenderName = escapeHtml(msg.senderName || 'User');
            if (socialAuth && msg.senderId === socialAuth.uid) {
                const youText = window.t ? (window.t('social.you') || 'You') : 'You';
                realSenderName = (youText && youText !== 'social.you') ? youText : 'You';
            } else if (cachedFriends) {
                const f = cachedFriends.find(cf => !cf.isGroup && cf.profile && cf.profile.uid === msg.senderId);
                if (f && f.profile && f.profile.username) {
                    realSenderName = escapeHtml(f.profile.username);
                }
            }

            // In Sent mode, header format requested by user:
            // "ENVIADOR (icono flecha) ENVIADO"
            let titleHtml = '';
            if (isSentTab) {
                const youText = (window.t && window.t('social.you') && window.t('social.you') !== 'social.you') ? window.t('social.you') : 'Tú';
                const senderDisplay = escapeHtml(msg.senderName || youText);

                let recipientDisplay = '';
                if (Array.isArray(msg.recipientNames) && msg.recipientNames.length > 0) {
                    recipientDisplay = msg.recipientNames.map(n => escapeHtml(n)).join(', ');
                } else if (msg.recipientNames && typeof msg.recipientNames === 'string') {
                    recipientDisplay = escapeHtml(msg.recipientNames);
                } else {
                    const rUids = Array.isArray(msg.recipientUids) ? msg.recipientUids : (msg.recipientUid ? [msg.recipientUid] : []);
                    const rNames = rUids.map(uid => {
                        if (cachedFriends) {
                            const f = cachedFriends.find(cf => !cf.isGroup && cf.profile && cf.profile.uid === uid);
                            if (f && f.profile && f.profile.username) return f.profile.username;
                        }
                        return uid;
                    });
                    recipientDisplay = rNames.length > 0 ? rNames.map(n => escapeHtml(n)).join(', ') : 'Destinatario';
                }

                titleHtml = `<span style="color: #4facfe; font-weight: 700;">${senderDisplay}</span> <i class="fas fa-arrow-right" style="font-size: 11px; margin: 0 6px; color: #60a5fa; opacity: 0.85;"></i> <span style="color: #93c5fd; font-weight: 600;">${recipientDisplay}</span>`;
            } else {
                titleHtml = `<span style="color: #4facfe; font-weight: 600;">${realSenderName}</span>`;
            }

            // Format profile share
            if (msg.type === 'profile_share' || (typeof msg.content === 'string' && msg.content.startsWith('$$PROFILE_SHARE$$'))) {
                try {
                    const profileData = msg.type === 'profile_share' ? JSON.parse(msg.content) : JSON.parse(msg.content.replace('$$PROFILE_SHARE$$', ''));
                    const p = profileData.profile;
                    
                    let modsHtml = '';
                    if (p.addons && p.addons.length > 0) {
                        const mods = p.addons.filter(a => a && (a.type === 'mod' || a.type === 'file' || (!a.type && a.filename && a.filename.endsWith('.jar')) || (!a.type && a.project_id)));
                        const resourcepacks = p.addons.filter(a => a && (a.type === 'resourcepack' || (!a.type && a.filename && a.filename.endsWith('.zip'))));
                        const shaders = p.addons.filter(a => a && a.type === 'shader');
                        let summary = [];
                        if (mods.length > 0) summary.push(`<span style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; margin-right: 5px;">${mods.length} Mods</span>`);
                        if (resourcepacks.length > 0) summary.push(`<span style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; margin-right: 5px;">${resourcepacks.length} Resource Packs</span>`);
                        if (shaders.length > 0) summary.push(`<span style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; margin-right: 5px;">${shaders.length} Shaders</span>`);
                        if (summary.length > 0) {
                            modsHtml = `<div style="font-size: 11px; color: #b0b8c6; margin-top: 8px; display: flex; flex-wrap: wrap; gap: 4px;">${summary.join('')}</div>`;
                        }
                    }

                    // Flat UI for installation share
                    const defaultIcon = 'img/icon.png';
                    contentHtml = `
                        <div style="margin-top: 8px; display: flex; align-items: flex-start; gap: 15px;">
                            <img src="${defaultIcon}" data-async-icon="${escapeHtml(p.icon || '')}" style="width: 48px; height: 48px; border-radius: 8px; object-fit: cover;">
                            <div style="flex: 1;">
                                <div style="font-weight: 600; font-size: 14px; color: #fff;">${escapeHtml(p.name)}</div>
                                <div style="font-size: 12px; color: #aaa; margin-top: 2px;">Version ${escapeHtml(formatVersionString(p.version))}</div>
                                ${modsHtml}
                                <div style="margin-top: 10px; display: flex; gap: 10px;">
                                    <button onclick="viewSharedProfile('${escapeHtml(msg.content)}')" style="background: rgba(255,255,255,0.1); border: none; color: #fff; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">${escapeHtml(viewText)}</button>
                                    <button onclick="installSharedProfile('${escapeHtml(msg.content)}')" style="background: rgba(79, 172, 254, 0.2); border: 1px solid rgba(79, 172, 254, 0.45); color: #4facfe; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s;" onmouseover="this.style.background='rgba(79, 172, 254, 0.32)'; this.style.borderColor='rgba(79, 172, 254, 0.7)';" onmouseout="this.style.background='rgba(79, 172, 254, 0.2)'; this.style.borderColor='rgba(79, 172, 254, 0.45)';">${escapeHtml(installText)}</button>
                                </div>
                            </div>
                        </div>`;
                } catch(e) {}
            }
            // Format seed share
            else if (msg.type === 'seed' || (typeof msg.content === 'string' && msg.content.startsWith('$$SEED_SHARE$$'))) {
                try {
                    const seedData = JSON.parse(msg.content.replace('$$SEED_SHARE$$', ''));
                    contentHtml = `
                        <div style="margin-top: 8px; display: flex; align-items: center; gap: 12px; background: rgba(0,0,0,0.15); padding: 12px; border-radius: 8px;">
                            <div style="background: rgba(79, 172, 254, 0.2); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #4facfe;">
                                <i class="fas fa-seedling"></i>
                            </div>
                            <div style="flex: 1;">
                                <div style="font-size: 12px; color: #aaa;">${window.t ? window.t('social.seed') || 'Minecraft Seed' : 'Minecraft Seed'}</div>
                                <div style="font-size: 14px; color: #fff; font-family: monospace; letter-spacing: 1px;">${escapeHtml(seedData.seed)}</div>
                            </div>
                            <button onclick="copySeedToClipboard('${escapeHtml(seedData.seed)}', this)" style="background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">${escapeHtml(copyText)}</button>
                        </div>`;
                } catch(e) {}
            }
            // Format server share
            else if (msg.type === 'server' || (typeof msg.content === 'string' && msg.content.startsWith('$$SERVER_SHARE$$'))) {
                try {
                    const serverData = JSON.parse(msg.content.replace('$$SERVER_SHARE$$', ''));
                    contentHtml = `
                        <div style="margin-top: 8px; display: flex; align-items: center; gap: 12px; background: rgba(0,0,0,0.15); padding: 12px; border-radius: 8px;">
                            <div style="background: rgba(79, 172, 254, 0.2); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #4facfe;">
                                <i class="fas fa-server"></i>
                            </div>
                            <div style="flex: 1;">
                                <div style="font-size: 12px; color: #aaa;">${window.t ? window.t('social.server_invite_title') || 'Server Invite' : 'Server Invite'}</div>
                                <div style="font-size: 14px; color: #fff; font-weight: 600;">${escapeHtml(serverData.ip)}</div>
                            </div>
                            <button onclick="socialJoinServer('${escapeHtml(serverData.ip)}', '${escapeHtml(msg.senderName || realSenderName)}')" style="background: #4facfe; border: none; color: #fff; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; white-space: nowrap; transition: background 0.2s;" onmouseover="this.style.background='#3b9cf0'" onmouseout="this.style.background='#4facfe'">${window.t ? window.t('social.join_server') || 'Join' : 'Join'}</button>
                        </div>`;
                } catch(e) {}
            }
            // Format link share
            else if (msg.type === 'link' || (typeof msg.content === 'string' && msg.content.startsWith('$$LINK$$'))) {
                try {
                    const linkData = JSON.parse(msg.content.replace('$$LINK$$', ''));
                    const typeIcon = typeof getLinkTypeIcon === 'function' ? getLinkTypeIcon(linkData.type) : 'fas fa-link';
                    const linkTitle = linkData.title || linkData.url || 'Shared Link';
                    const linkType = linkData.typeName || 'Link';
                    const openText = window.t ? (window.t('social.open_link') || 'Open Link') : 'Open Link';
                    contentHtml = `
                        <div style="margin-top: 8px; display: flex; align-items: center; gap: 12px; background: rgba(0,0,0,0.15); padding: 12px; border-radius: 8px;">
                            <div style="background: rgba(79, 172, 254, 0.2); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #4facfe;">
                                <i class="${escapeHtml(typeIcon)}"></i>
                            </div>
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-size: 14px; color: #fff; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(linkTitle)}</div>
                                <div style="font-size: 12px; color: #aaa;">${escapeHtml(linkType)}</div>
                            </div>
                            <a href="${escapeHtml(linkData.url)}" target="_blank" style="background: #4facfe; border: none; color: #fff; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; transition: background 0.2s;" onmouseover="this.style.background='#3b9cf0'" onmouseout="this.style.background='#4facfe'"><i class="fas fa-external-link-alt"></i> ${escapeHtml(openText)}</a>
                        </div>`;
                } catch(e) {}
            } else {
                contentHtml = parseBBCodes(contentHtml);
            }
            
            const isUnread = !isSentTab && (msg.read === false || msg.read === 'false') && (!socialAuth || msg.senderId !== socialAuth.uid);
            let unreadDot = isUnread ? `<div class="inbox-unread-dot" style="width: 8px; height: 8px; border-radius: 50%; background: #4facfe; margin-right: 8px; flex-shrink: 0;"></div>` : '';
            
            // Render as flat inbox item (email style)
            const html = `
            <div class="inbox-item ${isUnread ? 'is-unread' : ''}" data-msg-id="${escapeHtml(msg.id)}" style="padding: 16px 24px; border-bottom: 1px solid rgba(255,255,255,0.05); width: 100%; box-sizing: border-box; background: transparent; transition: background 0.2s; cursor: default;" onmouseover="handleInboxHover(this)" onmouseout="this.style.background='transparent'">
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 2px;">
                        ${unreadDot}
                        ${titleHtml}
                    </div>
                    <span style="font-size: 11px; color: #6b7280; flex-shrink: 0; margin-left: 8px;">${formatTime(msg.timestamp)}</span>
                </div>
                <div style="color: #e5e7eb; font-size: 14px; line-height: 1.5; word-break: break-word;">
                    ${contentHtml}
                </div>
            </div>`;
            container.insertAdjacentHTML('beforeend', html);
        });

        // Load missing icons asynchronously
        container.querySelectorAll('img[data-async-icon]').forEach(async img => {
            const iconName = img.dataset.asyncIcon;
            if (!iconName) return;
            try {
                const rawIcon = await api().get_profile_icon(iconName);
                if (rawIcon) img.src = window.resolveImageSource ? window.resolveImageSource(rawIcon) : rawIcon;
            } catch (e) {}
        });

        container.scrollTop = 0;
    }
    let selectedBroadcastFriends = [];

    window.openBroadcastModal = async function() {
        document.getElementById('broadcastStep1').style.display = 'block';
        document.getElementById('broadcastStep2').style.display = 'none';
        selectedBroadcastFriends = [];
        
        const modal = document.getElementById('broadcastModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('show');
        }

        const list = document.getElementById('broadcastFriendsList');
        if (!cachedFriends) {
            if (list) {
                const loadingText = window.t ? (window.t('workshop.loading') || 'Loading...') : 'Loading...';
                list.innerHTML = `<div class="social-empty"><div class="spinner" style="width:20px;height:20px;border:2px solid rgba(79,172,254,0.2);border-top-color:#4facfe;border-radius:50%;margin:0 auto 8px auto;"></div>${loadingText}</div>`;
            }
            try {
                const res = await api().social_get_friends();
                if (res && res.success) {
                    cachedFriends = res.friends || [];
                }
            } catch (e) {
                console.error('Error fetching friends for broadcast:', e);
            }
        }
        renderBroadcastFriends();
    };

    window.closeBroadcastModal = function() {
        const modal = document.getElementById('broadcastModal');
        if (modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
        }
    };

    function renderBroadcastFriends() {
        const list = document.getElementById('broadcastFriendsList');
        if (!cachedFriends || cachedFriends.length === 0) {
            const emptyText = window.t ? window.t('social.no_friends_found') : 'No friends found.';
            list.innerHTML = `<div class="social-empty">${emptyText}</div>`;
            return;
        }
        const friends = cachedFriends;
        
        let html = '';
        friends.forEach(f => {
            if (f.isGroup) return;
            const checked = selectedBroadcastFriends.includes(f.profile.uid) ? 'checked' : '';
            html += `
            <label class="social-user-item" style="cursor:pointer; display: flex; align-items: center; margin-bottom: 5px; padding: 8px; border-radius: 8px; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
                <div style="position: relative; margin-right: 15px; display: flex; align-items: center;">
                    <input type="checkbox" onchange="toggleBroadcastFriend('${f.profile.uid}', this.parentNode.parentNode)" ${checked} style="appearance: none; -webkit-appearance: none; width: 22px; height: 22px; border: 2px solid rgba(255,255,255,0.2); border-radius: 6px; background: rgba(0,0,0,0.2); cursor: pointer; transition: all 0.2s; outline: none;" onchange="this.style.background=this.checked?'#4facfe':'rgba(0,0,0,0.2)';this.style.borderColor=this.checked?'#4facfe':'rgba(255,255,255,0.2)'">
                    <i class="fas fa-check" style="position: absolute; left: 5px; top: 5px; color: white; font-size: 12px; pointer-events: none; opacity: ${selectedBroadcastFriends.includes(f.profile.uid) ? 1 : 0}; transition: opacity 0.2s;"></i>
                </div>
                <div class="social-item-avatar" style="margin-right: 12px;">${getAvatarHtml(f.profile, 36)}</div>
                <div class="social-item-info">
                    <div class="social-item-name">${escapeHtml(f.profile.username)}</div>
                </div>
            </label>`;
        });
        list.innerHTML = html;
        updateBroadcastNextBtn();
    }

    window.toggleBroadcastFriend = function(uid, el) {
        const idx = selectedBroadcastFriends.indexOf(uid);
        if (idx === -1) {
            if (selectedBroadcastFriends.length >= 10) return; // Max 10
            selectedBroadcastFriends.push(uid);
        } else {
            selectedBroadcastFriends.splice(idx, 1);
        }
        
        const cb = el.querySelector('input[type="checkbox"]');
        const icon = el.querySelector('.fa-check');
        if(cb) {
            cb.checked = selectedBroadcastFriends.includes(uid);
            cb.style.background = cb.checked ? '#4facfe' : 'rgba(0,0,0,0.2)';
            cb.style.borderColor = cb.checked ? '#4facfe' : 'rgba(255,255,255,0.2)';
        }
        if(icon) {
            icon.style.opacity = selectedBroadcastFriends.includes(uid) ? 1 : 0;
        }
        
        updateBroadcastNextBtn();
    };
    function updateBroadcastNextBtn() {
        const btn = document.getElementById('nextBroadcastBtn');
        if(btn) {
            btn.disabled = selectedBroadcastFriends.length === 0;
            const nextText = window.t ? window.t('social.next_btn') : 'Next';
            btn.textContent = `${nextText} (${selectedBroadcastFriends.length}/10)`;
        }
    }

    async function broadcastContent(contentStr, type) {
        if (!selectedBroadcastFriends || selectedBroadcastFriends.length === 0) {
            showToast('No friends selected', 'warning');
            return;
        }
        try {
            const recipientNames = selectedBroadcastFriends.map(uid => {
                if (cachedFriends) {
                    const f = cachedFriends.find(cf => !cf.isGroup && cf.profile && cf.profile.uid === uid);
                    if (f && f.profile && f.profile.username) return f.profile.username;
                }
                return uid;
            });

            const res = await api().social_inbox_send(selectedBroadcastFriends, contentStr, type, recipientNames);
            if (res.success) {
                let toastMsg = 'Sent successfully!'; if(window.t) { const res = window.t('social.sent_success'); if(res && res !== 'social.sent_success') toastMsg = res; }
                showToast(toastMsg, 'success');
                closeBroadcastModal();
                selectedBroadcastFriends = [];
                if (typeof loadInboxMessages === 'function') loadInboxMessages(false);
            } else {
                showToast('Failed to send: ' + res.error, 'error');
            }
        } catch(e) {
            showToast('Error: ' + e.message, 'error');
        }
    }

    function initBroadcastAndSubmodals() {
        const inboxBtn = document.getElementById('inboxBroadcastBtn');
        if(inboxBtn) inboxBtn.addEventListener('click', openBroadcastModal);
        
        const nextBroadcastBtn = document.getElementById('nextBroadcastBtn');
        if(nextBroadcastBtn) nextBroadcastBtn.addEventListener('click', () => {
            document.getElementById('broadcastStep1').style.display = 'none';
            document.getElementById('broadcastStep2').style.display = 'block';
        });

        const cancelBroadcastBtn = document.getElementById('cancelBroadcastBtn');
        if(cancelBroadcastBtn) cancelBroadcastBtn.addEventListener('click', closeBroadcastModal);

        const backBroadcastBtn = document.getElementById('backBroadcastBtn');
        if(backBroadcastBtn) backBroadcastBtn.addEventListener('click', () => {
            document.getElementById('broadcastStep1').style.display = 'block';
            document.getElementById('broadcastStep2').style.display = 'none';
        });
        
        document.querySelectorAll('#broadcastStep2 .chat-grid-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.currentTarget.getAttribute('data-type');
                closeBroadcastModal();
                if (type === 'installation') openShareProfileModal();
                else if (type === 'seed') openShareSeedModal();
                else if (type === 'server') openShareServerModal();
                else if (type === 'link') openShareLinkModal();
            });
        });

        // Backdrop click handling for social submodals
        const socialSubmodals = [
            { id: 'broadcastModal', close: closeBroadcastModal },
            { id: 'shareProfileModal', close: closeShareProfileModal },
            { id: 'shareSeedModal', close: closeShareSeedModal },
            { id: 'shareServerModal', close: () => { if (window.closeShareServerModal) window.closeShareServerModal(); } },
            { id: 'shareLinkModal', close: closeShareLinkModal },
            { id: 'joinServerModal', close: closeJoinServerModal },
            { id: 'viewProfileModal', close: closeViewProfileModal },
            { id: 'installProfileModal', close: closeInstallProfileModal },
            { id: 'groupSettingsModal', close: () => { const m = document.getElementById('groupSettingsModal'); if (m) { m.classList.remove('show'); m.style.display = 'none'; } } },
            { id: 'userProfileModal', close: () => {
                const m = document.getElementById('userProfileModal');
                if (m) m.classList.remove('show');
                if (profileRefreshInterval) {
                    clearInterval(profileRefreshInterval);
                    profileRefreshInterval = null;
                }
                currentProfileUid = null;
            }}
        ];
        socialSubmodals.forEach(({ id, close }) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('click', (e) => {
                    if (e.target === el) close();
                });
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBroadcastAndSubmodals);
    } else {
        initBroadcastAndSubmodals();
    }

    // --- Share Server Modal ---
    function isValidServerAddress(addr) {
        if (!addr || !addr.trim()) return false;
        const trimmed = addr.trim();
        // Split host:port
        const lastColon = trimmed.lastIndexOf(':');
        let host = trimmed;
        let port = null;
        if (lastColon > 0) {
            const possiblePort = trimmed.slice(lastColon + 1);
            if (/^\d+$/.test(possiblePort)) {
                port = parseInt(possiblePort, 10);
                host = trimmed.slice(0, lastColon);
                if (port < 1 || port > 65535) return false;
            }
        }
        // IPv4
        if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
            return host.split('.').every(n => parseInt(n) <= 255);
        }
        // Hostname: labels separated by dots, each label is alphanumeric+hyphens, not starting/ending with hyphen
        const hostnameRe = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (hostnameRe.test(host) && host.length <= 253) return true;
        return false;
    }

    let _shareServerDetectedIp = '';

    window.openShareServerModal = async function() {
        const modal = document.getElementById('shareServerModal');
        if (!modal) return;

        // Reset state
        const input = document.getElementById('shareServerIpInput');
        const detectedTag = document.getElementById('shareServerDetectedTag');
        const errorDiv = document.getElementById('shareServerError');
        const clearBtn = document.getElementById('shareServerClearBtn');
        const wrapper = document.getElementById('shareServerIpWrapper');
        const historySection = document.getElementById('shareServerHistorySection');
        const historyList = document.getElementById('shareServerHistoryList');

        if (input) input.value = '';
        if (detectedTag) detectedTag.style.display = 'none';
        if (errorDiv) errorDiv.style.display = 'none';
        if (clearBtn) clearBtn.style.display = 'none';
        if (historySection) historySection.style.display = 'none';
        if (historyList) historyList.innerHTML = '';
        _shareServerDetectedIp = '';

        // Load server history and auto-detect in parallel
        const [presenceRes, historyRes] = await Promise.allSettled([
            api().get_my_presence_server().catch(() => null),
            api().get_server_history().catch(() => null)
        ]);

        // Auto-detect current server
        const presenceData = presenceRes.status === 'fulfilled' ? presenceRes.value : null;
        if (presenceData && presenceData.serverIp && presenceData.serverIp.trim()) {
            _shareServerDetectedIp = presenceData.serverIp.trim();
            if (input) input.value = _shareServerDetectedIp;
            if (detectedTag) detectedTag.style.display = 'flex';
            if (clearBtn) clearBtn.style.display = 'inline-flex';
        }

        // Show server history as clickable pills
        const historyData = historyRes.status === 'fulfilled' ? historyRes.value : null;
        if (historyData && historyData.history && historyData.history.length > 0) {
            const currentIp = _shareServerDetectedIp;
            // Show up to 5 recent servers (excluding current auto-detected one)
            const suggestions = historyData.history.filter(s => s !== currentIp).slice(0, 5);
            if (suggestions.length > 0 && historySection && historyList) {
                historyList.innerHTML = suggestions.map(s => `
                    <button onclick="window._selectShareServerHistory('${escapeHtml(s)}')" style="background: rgba(79,172,254,0.1); border: 1px solid rgba(79,172,254,0.25); color: #9ca3af; padding: 4px 10px; border-radius: 20px; cursor: pointer; font-size: 11px; font-family: 'Consolas', monospace; transition: all 0.2s; white-space: nowrap;" onmouseover="this.style.background='rgba(79,172,254,0.2)';this.style.color='#fff';this.style.borderColor='rgba(79,172,254,0.5)'" onmouseout="this.style.background='rgba(79,172,254,0.1)';this.style.color='#9ca3af';this.style.borderColor='rgba(79,172,254,0.25)'">${escapeHtml(s)}</button>
                `).join('');
                historySection.style.display = 'block';
            }
        }

        modal.classList.add('show');
        if (input) setTimeout(() => input.focus(), 100);
    };

    // Helper to select a history suggestion
    window._selectShareServerHistory = function(ip) {
        const input = document.getElementById('shareServerIpInput');
        const clearBtn = document.getElementById('shareServerClearBtn');
        const detectedTag = document.getElementById('shareServerDetectedTag');
        const errorDiv = document.getElementById('shareServerError');
        const wrapper = document.getElementById('shareServerIpWrapper');
        if (input) { input.value = ip; input.focus(); }
        if (clearBtn) clearBtn.style.display = 'inline-flex';
        if (detectedTag) detectedTag.style.display = 'none';
        if (errorDiv) errorDiv.style.display = 'none';
        if (wrapper) wrapper.style.borderColor = 'rgba(79,172,254,0.5)';
    };

    window.closeShareServerModal = function() {
        const modal = document.getElementById('shareServerModal');
        if (modal) modal.classList.remove('show');
    };

    document.addEventListener('DOMContentLoaded', () => {
        // Share Server Modal listeners
        const closeBtn = document.getElementById('closeShareServerBtn');
        const cancelBtn = document.getElementById('cancelShareServerBtn');
        const confirmBtn = document.getElementById('confirmShareServerBtn');
        const input = document.getElementById('shareServerIpInput');
        const clearBtn = document.getElementById('shareServerClearBtn');
        const wrapper = document.getElementById('shareServerIpWrapper');
        const errorDiv = document.getElementById('shareServerError');
        const errorText = document.getElementById('shareServerErrorText');
        const detectedTag = document.getElementById('shareServerDetectedTag');

        if (closeBtn) closeBtn.addEventListener('click', window.closeShareServerModal);
        if (cancelBtn) cancelBtn.addEventListener('click', window.closeShareServerModal);

        // Input events
        if (input) {
            input.addEventListener('input', () => {
                const val = input.value.trim();
                if (clearBtn) clearBtn.style.display = val ? 'inline-flex' : 'none';
                // Hide auto-detected tag if user changed the value
                if (val !== _shareServerDetectedIp && detectedTag) detectedTag.style.display = 'none';
                if (val === _shareServerDetectedIp && _shareServerDetectedIp && detectedTag) detectedTag.style.display = 'flex';
                // Hide error on typing
                if (errorDiv) errorDiv.style.display = 'none';
                if (wrapper) wrapper.style.borderColor = 'rgba(255,255,255,0.12)';
            });
            input.addEventListener('focus', () => {
                if (wrapper) wrapper.style.borderColor = 'rgba(79,172,254,0.5)';
            });
            input.addEventListener('blur', () => {
                if (wrapper) wrapper.style.borderColor = 'rgba(255,255,255,0.12)';
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') confirmBtn && confirmBtn.click();
                if (e.key === 'Escape') window.closeShareServerModal();
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (input) { input.value = ''; input.focus(); }
                clearBtn.style.display = 'none';
                if (detectedTag) detectedTag.style.display = 'none';
                if (errorDiv) errorDiv.style.display = 'none';
                if (wrapper) wrapper.style.borderColor = 'rgba(255,255,255,0.12)';
            });
        }

        if (confirmBtn) {
            confirmBtn.addEventListener('click', async () => {
                const ip = input ? input.value.trim() : '';
                // Validate
                if (!ip) {
                    if (errorText) errorText.textContent = window.t ? window.t('social.server_invite_enter_ip') || 'Please enter a server address.' : 'Please enter a server address.';
                    if (errorDiv) errorDiv.style.display = 'block';
                    if (wrapper) wrapper.style.borderColor = 'rgba(248,113,113,0.5)';
                    if (input) input.focus();
                    return;
                }
                if (!isValidServerAddress(ip)) {
                    if (errorText) errorText.textContent = window.t ? window.t('social.server_invite_invalid_ip') || 'Invalid server address. Use a valid hostname or IP (e.g. hypixel.net, 1.2.3.4:25565).' : 'Invalid server address. Use a valid hostname or IP (e.g. hypixel.net, 1.2.3.4:25565).';
                    if (errorDiv) errorDiv.style.display = 'block';
                    if (wrapper) wrapper.style.borderColor = 'rgba(248,113,113,0.5)';
                    if (input) input.focus();
                    return;
                }

                // Send
                const contentStr = '$$SERVER_SHARE$$' + JSON.stringify({ ip });
                window.closeShareServerModal();
                broadcastContent(contentStr, 'server');
            });
        }
    });

})();
