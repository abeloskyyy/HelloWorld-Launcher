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
    let chatInterval = null;
    let activeChatFriendship = null; // { id, profile }
    let activeSocialTab = 'friends';
    let activeReqSubtab = 'received';
    let socialModalOpen = false;
    let chatEarliestTimestamp = null;
    let lastPendingRequests = 0;
    let lastUnreadMessages = 0;
    let lastMessageIds = new Set(); // Track loaded message IDs for smart polling
    let replyingTo = null; // { id, content, senderId, senderName }
    let editingMessageId = null; // ID of message being edited
    let cachedFriends = null;   // Last loaded friends array
    let pendingChatOpen = null; // friendshipId to open once friends are loaded
    let currentProfileUid = null; // UID of currently viewed profile
    let profileRefreshInterval = null; // Interval for refreshing profile presence

    // --- Helpers ---
    function showNotification(title, body) {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'granted') {
            new Notification(title, { body, icon: 'ui/icon.png' });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification(title, { body, icon: 'ui/icon.png' });
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

    function premiumBadge() {
        return '<span class="premium-badge"><i class="fas fa-dollar-sign"></i></span>';
    }

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

    // --- Init ---
    window.initSocial = async function () {
        if (socialInitialized || socialInitializing) return;
        socialInitializing = true;
        try {
            const res = await api().social_get_auth();
            if (res && res.success) {
                socialAuth = res;
                socialInitialized = true;
                startBadgePolling();
                // If modal is already open in offline state, refresh it
                if (socialModalOpen) {
                    const offlineMsg = document.getElementById('socialOfflineMsg');
                    const container = document.getElementById('friendsListContainer');
                    if (offlineMsg) offlineMsg.style.display = 'none';
                    if (container) container.style.display = 'block';
                    switchSocialTab(activeSocialTab);
                    startModalPolling();
                }
            }
        } catch (e) {
            console.warn('[Social] initSocial failed:', e.message);
        } finally {
            socialInitializing = false;
        }
    };

    window.onSocialLogout = function () {
        socialAuth = null;
        socialInitialized = false;
        socialInitializing = false;
        lastPendingRequests = 0;
        lastUnreadMessages = 0;
        lastMessageIds.clear();
        stopBadgePolling();
        stopModalPolling();
        closeSocialModal();
        const badge = document.getElementById('socialBadge');
        if (badge) badge.style.display = 'none';
    };

    // --- Badge polling ---
    async function updateBadge() {
        try {
            const res = await api().social_get_badge_counts();
            if (!res || !res.success) return;
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
            // Show notifications for new messages
            if (unread > lastUnreadMessages && lastUnreadMessages >= 0) {
                showNotification('New Message', `You have ${unread} unread message${unread > 1 ? 's' : ''}`);
            }
            lastPendingRequests = pending;
            lastUnreadMessages = unread;
        } catch (e) { /* silently ignore */ }
    }

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
            }, 15000);
        }
    }

    function stopModalPolling() {
        if (modalContentInterval) { clearInterval(modalContentInterval); modalContentInterval = null; }
    }

    // --- Modal open/close ---
    function openSocialModal() {
        const modal = document.getElementById('socialModal');
        if (!modal) return;
        modal.classList.add('show');
        socialModalOpen = true;

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
    }

    function closeSocialModal() {
        const modal = document.getElementById('socialModal');
        if (modal) modal.classList.remove('show');
        socialModalOpen = false;
        stopModalPolling();
        closeChat();
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
        closeChat();
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
    }

    function renderFriendsList(friends) {
        cachedFriends = friends;
        const list = document.getElementById('friendsList');
        if (!list) return;
        if (friends.length === 0) {
            list.innerHTML = '<div class="social-empty"><i class="fas fa-user-friends"></i><p>No friends yet. Add some!</p></div>';
            return;
        }
        list.innerHTML = friends.map(f => {
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
                profileJson = escapeHtml(JSON.stringify({ ...p, isGroup: true, members: f.groupData.members, admin: f.groupData.admin, admins: f.groupData.admins || [f.groupData.admin], description: f.groupData.description || '' }));
                actionHtml = `
                    ${unread}
                    <button class="social-action-btn social-btn-chat" title="Chat" onclick='socialOpenChat("${fidSafe}", ${profileJson})'><i class="fas fa-comment"></i></button>
                    <button class="social-action-btn social-btn-remove" title="Leave Group" onclick='socialRemoveFriend("${fidSafe}", "${escapeHtml(f.groupData.name)}")'><i class="fas fa-sign-out-alt"></i></button>
                `;
            } else {
                p = f.profile;
                avatarHtml = getAvatarHtml(p, 38);
                const pb = p.accountType === 'microsoft' ? premiumBadge() : '';
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
                
                // Simplified status labels - only show basic states
                let stateLabel = 'Offline';
                if (state === 'online') stateLabel = 'Online';
                else if (state === 'menu') stateLabel = 'Playing';
                else if (state === 'playing') stateLabel = 'Playing Singleplayer';
                else if (state === 'server') stateLabel = 'Playing Multiplayer';
                
                // Join button for server and singleplayer
                let joinTarget = '';
                if (state === 'server' && presence.serverIp) {
                    joinTarget = presence.serverIp;
                } else if (state === 'playing' && presence.worldName) {
                    joinTarget = `singleplayer:${presence.worldName}`;
                }
                
                const joinButtonHtml = joinTarget 
                    ? `<button class="social-action-btn social-btn-join" title="Join" onclick='socialJoinServer("${escapeHtml(joinTarget)}", "${escapeHtml(p.username)}")'><i class="fas fa-sign-in-alt"></i></button>` 
                    : '';
                
                const presenceInline = `
                    <div class="friend-presence-badge">
                        <span class="friend-presence-pill ${stateClass}"></span>
                        <span>${escapeHtml(stateLabel)}</span>
                        ${joinButtonHtml}
                    </div>
                `;
                nameHtml = `${escapeHtml(p.username)} ${pb}<div style="margin-top:6px;">${presenceInline}</div>`;
                profileJson = escapeHtml(JSON.stringify(p));
                const uidSafe = escapeHtml(p.uid);
                const nameSafe = escapeHtml(p.username);
                actionHtml = `
                    ${unread}
                    <button class="social-action-btn social-btn-chat" title="Chat" onclick='socialOpenChat("${fidSafe}", ${profileJson})'><i class="fas fa-comment"></i></button>
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

        // Open pending chat if we were navigated from a notification
        if (pendingChatOpen) {
            const target = friends.find(f => f.friendshipId === pendingChatOpen);
            if (target) {
                pendingChatOpen = null;
                openChat(target.friendshipId, target.profile);
            }
        }
    }

    window.socialOpenChat = function (fid, profile) { openChat(fid, profile); };
    window.socialBlockFriend = function (uid, fid, username) { blockFriend(uid, fid, username); };
    window.socialRemoveFriend = function (fid, username) { removeFriend(fid, username); };
    window.socialUnblockUser = function (uid, username) { unblockUser(uid, username); };
    window.socialJoinServer = function (serverIp, username) { openJoinServerModal(serverIp, username); };

    function openJoinServerModal(serverIp, username) {
        const modal = document.getElementById('joinServerModal');
        if (!modal) return;

        // Set server info
        document.getElementById('joinServerIp').textContent = serverIp;
        document.getElementById('joinServerFriend').textContent = username;

        // Load profiles directly from API
        if (window.pywebview && window.pywebview.api) {
            window.pywebview.api.get_profiles().then(profilesData => {
                if (profilesData && profilesData.profiles) {
                    window.profilesData = profilesData;
                    renderJoinServerProfiles(serverIp);
                }
            }).catch(err => {
                console.error('Failed to load profiles:', err);
                const container = document.getElementById('joinServerProfilesList');
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

    function renderJoinServerProfiles(serverIp) {
        const container = document.getElementById('joinServerProfilesList');
        if (!container) return;

        const profiles = window.profilesData?.profiles || {};
        const profileIds = Object.keys(profiles);

        if (profileIds.length === 0) {
            container.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">No profiles available. Create one first.</div>';
            return;
        }

        container.innerHTML = profileIds.map(id => {
            const profile = profiles[id];
            return `
                <div class="join-server-profile-item" onclick="joinServerWithProfile('${id}', '${serverIp}')">
                    <div style="font-weight: 600; color: #fff;">${escapeHtml(profile.name || id)}</div>
                    <div style="font-size: 0.85rem; color: #aaa;">${escapeHtml(profile.version || 'Unknown version')}</div>
                </div>
            `;
        }).join('');
    }

    window.joinServerWithProfile = async function(profileId, serverIp) {
        closeJoinServerModal();
        
        // Close the social modal
        closeSocialModal();
        
        // Close the profile modal
        const profileModal = document.getElementById('userProfileModal');
        if (profileModal) profileModal.style.display = 'none';
        
        // Clear profile refresh interval
        if (profileRefreshInterval) {
            clearInterval(profileRefreshInterval);
            profileRefreshInterval = null;
        }
        currentProfileUid = null;
        
        // Select the profile in the UI explicitly
        const profileSelect = document.getElementById('profileSelect');
        if (profileSelect) {
            profileSelect.value = profileId;
            if (window.selectProfile) {
                window.selectProfile(profileId);
            }
        }
        
        // Wait a tiny bit for the UI state to update before launching
        await new Promise(r => setTimeout(r, 50));
        
        // Launch game with server parameter using the central launch function
        if (typeof window.launchGame === 'function') {
            if (serverIp.startsWith('singleplayer:')) {
                const worldName = serverIp.replace('singleplayer:', '');
                console.log(`Launching singleplayer world ${worldName} with profile ${profileId}`);
                window.pendingServerParam = null;
            } else {
                console.log(`Joining server ${serverIp} with profile ${profileId}`);
                window.pendingServerParam = serverIp;
            }
            window.launchGame();
        } else {
            console.error("Global launchGame function not found!");
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
        if (!confirm(`Block ${username}? They will be removed from friends and unable to send you requests.`)) return;
        try { await api().social_block_user(uid, fid); loadFriends(false); } catch (e) {}
    }

    async function removeFriend(fid, username) {
        if (!confirm(`Remove ${username} from your friends? They can send you a new request later.`)) return;
        try {
            await api().social_remove_friend(fid);
            // Close chat if it's currently open with this friend/group
            if (activeChatFriendship && activeChatFriendship.id === fid) {
                closeChat();
            }
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
                const pb = p.accountType === 'microsoft' ? premiumBadge() : '';
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
            const pb = u.accountType === 'microsoft' ? premiumBadge() : '';
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
            
            // Simplified status labels
            let statusText = 'Offline';
            if (state === 'online') statusText = 'Online';
            else if (state === 'menu') statusText = 'Playing';
            else if (state === 'playing') statusText = 'Playing Singleplayer';
            else if (state === 'server') statusText = 'Playing Multiplayer';
            
            const serverText = presence && presence.state === 'server' && presence.serverIp ? presence.serverIp : '';
            const worldText = presence && presence.state === 'playing' && presence.worldName ? presence.worldName : '';
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
            
            // Handle Join button
            const joinBtn = document.getElementById('profileJoinBtn');
            if (joinBtn) {
                let joinTarget = '';
                if (state === 'server' && serverText) {
                    joinTarget = serverText;
                } else if (state === 'playing' && worldText) {
                    joinTarget = `singleplayer:${worldText}`;
                }
                
                if (joinTarget) {
                    joinBtn.style.display = 'inline-flex';
                    joinBtn.onclick = () => openJoinServerModal(joinTarget, username);
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
        modal.style.display = 'flex';
        
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
        const premiumBadge = document.getElementById('profilePremiumBadge');
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
        if (premiumBadge) premiumBadge.style.display = 'none';
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
        
        const viewStatsBtn = document.getElementById('viewProfileStatsBtn');
        if (viewStatsBtn) {
            viewStatsBtn.onclick = () => {
                if (window.showUserStats) {
                    const avatarUrl = document.getElementById('profileAvatarPreview')?.src;
                    window.showUserStats(uid, username, avatarUrl);
                }
            };
        }

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
            if (currentProfileUid && modal.style.display === 'flex') {
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
                
                // Show premium badge for microsoft accounts
                if (premiumBadge && data.accountType === 'microsoft') {
                    premiumBadge.style.display = 'inline-flex';
                    console.log('[Profile] Showing premium badge for microsoft account');
                } else if (premiumBadge) {
                    premiumBadge.style.display = 'none';
                }
                
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
                
                // Simplified status labels
                let statusText = 'Offline';
                if (state === 'online') statusText = 'Online';
                else if (state === 'menu') statusText = 'Playing';
                else if (state === 'playing') statusText = 'Playing Singleplayer';
                else if (state === 'server') statusText = 'Playing Multiplayer';
                
                const serverText = presence && presence.state === 'server' && presence.serverIp ? presence.serverIp : '';
                const worldText = presence && presence.state === 'playing' && presence.worldName ? presence.worldName : '';
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
                
                // Handle Join button
                const joinBtn = document.getElementById('profileJoinBtn');
                if (joinBtn) {
                    let joinTarget = '';
                    if (state === 'server' && serverText) {
                        joinTarget = serverText;
                    } else if (state === 'playing' && worldText) {
                        joinTarget = `singleplayer:${worldText}`;
                    }
                    
                    if (joinTarget) {
                        joinBtn.style.display = 'inline-flex';
                        joinBtn.onclick = () => openJoinServerModal(joinTarget, username);
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

                // Show/hide Add Link button based on whether it's the user's own profile
                const addLinkBtn = document.getElementById('addLinkBtn');
                if (addLinkBtn) {
                    const isOwnProfile = socialAuth && socialAuth.uid === uid;
                    addLinkBtn.style.display = isOwnProfile ? 'block' : 'none';
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
                            backgroundPreview.appendChild(overlay);
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
                            backgroundPreview.appendChild(overlay);
                            
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

    // Close profile modal
    const closeProfileModalBtn = document.getElementById('closeUserProfileModal');
    if (closeProfileModalBtn) {
        closeProfileModalBtn.addEventListener('click', () => {
            const modal = document.getElementById('userProfileModal');
            if (modal) modal.style.display = 'none';
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
        
        const icon = type === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-check-circle';
        
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
            showToast('Please select a link type');
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
            showToast('Please select a link type');
            if (urlInput) urlInput.focus();
            return;
        }
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        }
        
        try {
            // Send link as a chat message with special format
            const linkData = {
                url: url,
                title: title || url,
                type: selectedShareLinkType.id,
                typeName: selectedShareLinkType.name
            };
            
            const messageContent = `$$LINK$$${JSON.stringify(linkData)}`;
            
            // Optimistic UI: add message immediately
            const container = document.getElementById('chatMessages');
            const myUid = socialAuth.uid;
            const tempId = `temp_${Date.now()}`;
            const typeIcon = getLinkTypeIcon(selectedShareLinkType.id);
            
            const html = `<div class="chat-msg chat-msg-mine" data-sender-id="${myUid}" data-content="${escapeHtml(messageContent)}" data-temp="${tempId}">
              <div class="chat-msg-bubble">
                <div class="chat-link-card">
                    <div class="chat-link-card-header">
                        <div class="chat-link-card-icon">
                            <i class="${typeIcon}"></i>
                        </div>
                        <div class="chat-link-card-info">
                            <div class="chat-link-card-title">${escapeHtml(linkData.title)}</div>
                            <div class="chat-link-card-type">${escapeHtml(linkData.typeName)}</div>
                        </div>
                    </div>
                    <a href="${escapeHtml(linkData.url)}" target="_blank" class="chat-link-card-btn">
                        <i class="fas fa-external-link-alt"></i> Open Link
                    </a>
                </div>
              </div>
            </div>`;
            
            if (container) {
                container.insertAdjacentHTML('beforeend', html);
                container.scrollTop = container.scrollHeight;
            }
            
            const res = await api().social_send_message(activeChatFriendship.id, messageContent);
            
            if (res && res.success) {
                closeShareLinkModal();
                // Remove temp message, will be replaced by real message via polling
                const tempEl = container.querySelector(`[data-temp="${tempId}"]`);
                if (tempEl) tempEl.remove();
            } else {
                // Remove temp message on error
                const tempEl = container.querySelector(`[data-temp="${tempId}"]`);
                if (tempEl) tempEl.remove();
                showToast('Failed to send link: ' + (res && res.error || 'Unknown error'));
                if (urlInput) urlInput.focus();
            }
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
            const pb = (p.accountType === 'microsoft') ? premiumBadge() : '';
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
            const pb = (p.accountType === 'microsoft') ? premiumBadge() : '';
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
        if (!confirm(`Block ${username}?`)) return;
        try {
            await api().social_reject_request(reqId);
            await api().social_block_user(uid, null);
            loadRequests(false);
        } catch (e) {}
    };

    // --- Chat ---
    function openChat(fid, profile) {
        activeChatFriendship = { id: fid, profile };
        const panel = document.getElementById('socialPanelChat');
        if (panel) panel.style.display = 'flex';
        const headerName = document.getElementById('chatHeaderName');
        const headerBadge = document.getElementById('chatHeaderBadge');
        const headerAvatar = document.getElementById('chatHeaderAvatar');
        const headerActions = document.getElementById('chatHeaderActions');
        if (headerName) headerName.textContent = profile.username || '';
        if (headerBadge) headerBadge.innerHTML = profile.accountType === 'microsoft' ? premiumBadge() : '';
        if (headerAvatar) headerAvatar.innerHTML = getAvatarHtml(profile, 36);
        if (headerActions) {
            const isAdmin = profile.isGroup && socialAuth && (profile.admins || []).includes(socialAuth.uid);
            headerActions.style.display = isAdmin ? 'flex' : 'none';
        }
        chatEarliestTimestamp = null;
        lastMessageIds.clear();
        
        // Clear message container immediately to prevent mixing
        const container = document.getElementById('chatMessages');
        if (container) container.innerHTML = '';
        
        loadChatMessages(true);
        // Mark read
        try { api().social_mark_read(fid); updateBadge(); } catch (e) {}
        // Load reply state from Firestore
        loadReplyState();
        // Start chat polling (smart scroll)
        if (chatInterval) clearInterval(chatInterval);
        chatInterval = setInterval(() => loadChatMessages(false), 15000);
    }

    function closeChat() {
        activeChatFriendship = null;
        if (chatInterval) { clearInterval(chatInterval); chatInterval = null; }
        const panel = document.getElementById('socialPanelChat');
        if (panel) panel.style.display = 'none';
    }

    async function loadReplyState() {
        if (!activeChatFriendship) return;
        try {
            const res = await api().social_get_reply(activeChatFriendship.id);
            if (res && res.success && res.reply) {
                const reply = res.reply;
                replyingTo = {
                    id: reply.msgId,
                    content: reply.content,
                    senderId: reply.senderId,
                    senderName: reply.senderName
                };
                // Show reply preview
                const input = document.getElementById('chatInput');
                const inputArea = document.querySelector('.chat-input-area');
                if (!input || !inputArea) return;
                let existingPreview = document.getElementById('chatReplyPreview');
                if (existingPreview) existingPreview.remove();
                const isMyReply = reply.senderId === socialAuth.uid;
                const preview = document.createElement('div');
                preview.id = 'chatReplyPreview';
                preview.className = 'chat-reply-preview-input';
                preview.innerHTML = `
                    <div class="reply-preview-header">
                        <span class="reply-preview-label">↳ Replying to ${isMyReply ? 'yourself' : reply.senderName}</span>
                        <button class="reply-preview-cancel" onclick="cancelReply()">✕</button>
                    </div>
                    <span class="reply-preview-text">${escapeHtml((reply.content || '').slice(0, 60))}${(reply.content || '').length > 60 ? '…' : ''}</span>
                `;
                inputArea.insertBefore(preview, inputArea.firstChild);
            }
        } catch (e) {
            console.error('[Social] loadReplyState error:', e.message);
        }
    }

    async function loadChatMessages(scrollBottom) {
        if (!activeChatFriendship || !socialAuth) return;
        const currentFid = activeChatFriendship.id;
        try {
            const res = await api().social_get_messages(currentFid, null);
            if (!activeChatFriendship || activeChatFriendship.id !== currentFid) return; // Discard if chat changed
            
            if (!res || !res.success) {
                console.warn('[Social] loadChatMessages failed:', res?.error);
                return;
            }
            renderMessages(res.messages || [], scrollBottom, currentFid);
        } catch (e) {
            console.error('[Social] loadChatMessages error:', e.message);
        }
    }

    function renderMessages(msgs, scrollBottom, currentFid) {
        if (!activeChatFriendship || activeChatFriendship.id !== currentFid) return; // Double check
        const container = document.getElementById('chatMessages');
        if (!container) return;
        if (!socialAuth) {
            console.warn('[Social] renderMessages called without socialAuth');
            return;
        }
        
        const myUid = socialAuth.uid;
        
        if (msgs.length === 0) {
            container.innerHTML = '<div class="chat-empty"><p>No messages yet. Say hello!</p></div>';
            lastMessageIds.clear();
            return;
        }

        const isFirstLoad = lastMessageIds.size === 0;

        if (!isFirstLoad) {
            // SILENT SYNC: Find deleted messages
            // We only remove messages from the DOM if they are completely missing from `msgs` 
            // BUT we only consider messages newer than or equal to the oldest message in `msgs`
            const serverMsgIds = new Set(msgs.map(m => m.id));
            const domMsgs = Array.from(container.querySelectorAll('.chat-msg[data-msg-id]'));
            let DOMChanged = false;
            
            domMsgs.forEach(msgEl => {
                const id = msgEl.dataset.msgId;
                if (!serverMsgIds.has(id)) {
                    // Check if it's an old message that wasn't fetched due to pagination limit
                    // Or a temporary sending message. If it's a normal message and it's missing, delete it!
                    if (!msgEl.dataset.temp) {
                        msgEl.remove();
                        lastMessageIds.delete(id);
                        DOMChanged = true;
                    }
                }
            });

            // SILENT SYNC: Find edited messages
            msgs.forEach(serverMsg => {
                const msgEl = container.querySelector(`.chat-msg[data-msg-id="${serverMsg.id}"]`);
                if (msgEl) {
                    const currentContent = msgEl.dataset.content;
                    if (currentContent !== serverMsg.content) {
                        msgEl.dataset.content = serverMsg.content;
                        const textEl = msgEl.querySelector('.chat-msg-text');
                        if (textEl) textEl.textContent = serverMsg.content;
                        const timeEl = msgEl.querySelector('.chat-msg-time');
                        if (timeEl && serverMsg.edited) {
                            timeEl.textContent = formatTime(serverMsg.timestamp) + ' (edited)';
                        }
                        DOMChanged = true;
                    }
                }
            });
            
            // Remove empty placeholder if it exists
            const emptyEl = container.querySelector('.chat-empty');
            if (emptyEl) emptyEl.remove();
            
            if (DOMChanged) {
                // If DOM changed (edits or deletes), refresh friends list to update previews
                setTimeout(() => loadFriends(false), 500);
            }
        }
        
        chatEarliestTimestamp = msgs[0] ? msgs[0].timestamp : null;
        let newMsgs = msgs.filter(m => !lastMessageIds.has(m.id));

        // Resolve any pending temp elements to their real IDs before rendering.
        // This prevents duplicates when the chat poll fires while a send is still in-flight.
        newMsgs = newMsgs.filter(msg => {
            if (msg.senderId === myUid) {
                const tempEl = container.querySelector('[data-temp]:not([data-msg-id])');
                if (tempEl) {
                    tempEl.dataset.msgId = msg.id;
                    delete tempEl.dataset.temp;
                    lastMessageIds.add(msg.id);
                    return false; // already represented in DOM, skip
                }
            }
            return true;
        });
        if (newMsgs.length === 0 && lastMessageIds.size > 0) return;

        // If new messages arrived, refresh friends list to update last message preview
        if (newMsgs.length > 0) {
            setTimeout(() => loadFriends(false), 500);
        }

        // Check if user is near bottom for smart scroll
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        let html = '';
        let prevSender = container.lastElementChild?.dataset.senderId;
        for (const msg of newMsgs) {
            const isMine = msg.senderId === myUid;
            const showAv = msg.senderId !== prevSender && !isMine;
            const cls = isMine ? 'chat-msg chat-msg-mine' : 'chat-msg chat-msg-other';
            const avatarEl = showAv
                ? `<div class="chat-msg-avatar">${getAvatarHtml(activeChatFriendship.profile, 28)}</div>`
                : `<div class="chat-msg-avatar-spacer"></div>`;
            const statusText = isMine && msg.status ? `<span class="chat-msg-status">${msg.status}</span>` : '';
            const editedText = msg.edited ? ' (edited)' : '';
            // Reply preview
            let replyHtml = '';
            if (msg.replyTo) {
                const isMyReply = msg.replySender === myUid;
                let replyText = msg.replyContent || '';
                // Format profile share replies
                if (replyText.startsWith('$$PROFILE_SHARE$$')) {
                    try {
                        const p = JSON.parse(replyText.substring('$$PROFILE_SHARE$$'.length)).profile;
                        replyText = p ? `Installation: ${p.name}` : `Installation: Unknown`;
                    } catch(e) {
                        replyText = 'Installation';
                    }
                }
                replyHtml = `<div class="chat-reply-preview">
                    <span class="chat-reply-label">↳ ${isMyReply ? 'You' : (msg.replySenderName || 'Unknown')}</span>
                    <span class="chat-reply-text">${escapeHtml(replyText.slice(0, 50))}${replyText.length > 50 ? '…' : ''}</span>
                </div>`;
            }
            
            // Check for profile share
            let msgContentHtml = `<span class="chat-msg-text">${escapeHtml(msg.content)}</span>`;
            if (msg.content && msg.content.startsWith('$$PROFILE_SHARE$$')) {
                try {
                    const payload = JSON.parse(msg.content.substring('$$PROFILE_SHARE$$'.length));
                    if (payload && payload.profile) {
                        const p = payload.profile;
                        const defaultIcon = 'ui/img/icon.png';
                        // Icon source will be async loaded via dataset or handled gracefully
                        msgContentHtml = `
                            <div class="chat-profile-card">
                                <div class="chat-profile-card-header">
                                    <img src="${defaultIcon}" class="chat-profile-card-icon" data-async-icon="${p.icon || ''}">
                                    <div class="chat-profile-card-info">
                                        <div class="chat-profile-card-name">${escapeHtml(p.name)}</div>
                                        <div class="chat-profile-card-version">${escapeHtml(formatVersionString(p.version))}</div>
                                    </div>
                                </div>
                                <div class="chat-profile-card-actions">
                                    <button class="chat-profile-card-btn chat-profile-btn-view" onclick="viewSharedProfile('${escapeHtml(msg.content)}')">View Profile</button>
                                    <button class="chat-profile-card-btn chat-profile-btn-install" onclick="installSharedProfile('${escapeHtml(msg.content)}')">Install</button>
                                </div>
                            </div>
                        `;
                    }
                } catch(e) {
                    console.error("Error parsing profile share", e);
                }
            } else if (msg.content && msg.content.startsWith('$$LINK$$')) {
                try {
                    const linkData = JSON.parse(msg.content.substring('$$LINK$$'.length));
                    if (linkData && linkData.url) {
                        const typeIcon = getLinkTypeIcon(linkData.type);
                        msgContentHtml = `
                            <div class="chat-link-card">
                                <div class="chat-link-card-header">
                                    <div class="chat-link-card-icon">
                                        <i class="${typeIcon}"></i>
                                    </div>
                                    <div class="chat-link-card-info">
                                        <div class="chat-link-card-title">${escapeHtml(linkData.title || linkData.url)}</div>
                                        <div class="chat-link-card-type">${escapeHtml(linkData.typeName || 'Link')}</div>
                                    </div>
                                </div>
                                <a href="${escapeHtml(linkData.url)}" target="_blank" class="chat-link-card-btn">
                                    <i class="fas fa-external-link-alt"></i> Open Link
                                </a>
                            </div>
                        `;
                    }
                } catch (e) {
                    console.error('[Social] Failed to parse link share:', e);
                }
            }
            
            // Check for seed card
            if (msg.content) {
                try {
                    const payload = JSON.parse(msg.content);
                    if (payload && payload.type === 'seed' && payload.seed) {
                        msgContentHtml = `
                            <div class="chat-msg-seed-card">
                                <div class="seed-card-header">
                                    <i class="fas fa-seedling"></i>
                                    <span>Seed</span>
                                </div>
                                <div class="seed-card-content">
                                    <span class="seed-value">${escapeHtml(String(payload.seed))}</span>
                                    <button class="seed-copy-btn" onclick="copySeedToClipboard('${escapeHtml(String(payload.seed))}', this)">
                                        <i class="fas fa-copy"></i>
                                    </button>
                                </div>
                            </div>
                        `;
                    }
                } catch(e) {
                    // Not JSON, just regular text
                }
            }

            html += `<div class="${cls}" data-sender-id="${msg.senderId}" data-msg-id="${msg.id}" data-content="${escapeHtml(msg.content)}" data-reply-to="${msg.replyTo || ''}" data-reply-content="${escapeHtml(msg.replyContent || '')}" data-reply-sender="${msg.replySender || ''}" data-reply-sender-name="${escapeHtml(msg.replySenderName || '')}">
              ${!isMine ? avatarEl : ''}
              <div class="chat-msg-bubble">
                ${replyHtml}
                ${msgContentHtml}
                <span class="chat-msg-time">${formatTime(msg.timestamp)}${editedText}</span>
                ${statusText}
              </div>
            </div>`;
            prevSender = msg.senderId;
            lastMessageIds.add(msg.id);
        }
        if (isFirstLoad) {
            // First load - render all
            container.innerHTML = html;
        } else {
            // Append new messages
            container.insertAdjacentHTML('beforeend', html);
        }
        if (scrollBottom || isNearBottom) container.scrollTop = container.scrollHeight;
        
        // Load missing icons asynchronously
        container.querySelectorAll('img[data-async-icon]').forEach(async img => {
            const iconName = img.dataset.asyncIcon;
            if (iconName && !img.dataset.loaded) {
                img.dataset.loaded = "true";
                try {
                    const rawIcon = await api().get_profile_icon(iconName);
                    img.src = window.resolveImageSource ? window.resolveImageSource(rawIcon) : rawIcon;
                } catch(e) {}
            }
        });
        
        // Add event listeners to new messages
        attachMessageEventListeners();
    }

    function attachMessageEventListeners() {
        const container = document.getElementById('chatMessages');
        if (!container || container.dataset.listenersAttached) return;
        container.dataset.listenersAttached = 'true';
        
        container.addEventListener('dblclick', (e) => {
            const msg = e.target.closest('.chat-msg');
            if (!msg || !msg.dataset.msgId) return;
            const msgId = msg.dataset.msgId;
            const content = msg.dataset.content;
            const senderId = msg.dataset.senderId;
            const senderName = senderId === socialAuth.uid ? 'You' : (activeChatFriendship.profile.username || 'Unknown');
            startReply({ id: msgId, content, senderId, senderName });
        });
        
        container.addEventListener('contextmenu', (e) => {
            const msg = e.target.closest('.chat-msg');
            if (!msg || !msg.dataset.msgId) return;
            e.preventDefault();
            showContextMenu(e, msg);
        });
    }

    function startReply(msg) {
        replyingTo = msg;
        editingMessageId = null;
        // Persist to Firestore
        api().social_set_reply(activeChatFriendship.id, msg);
        const input = document.getElementById('chatInput');
        if (!input) return;
        input.focus();
        // Show reply preview above input
        const inputArea = document.querySelector('.chat-input-area');
        if (!inputArea) return;
        let existingPreview = document.getElementById('chatReplyPreview');
        if (existingPreview) existingPreview.remove();
        const isMyReply = msg.senderId === socialAuth.uid;
        const preview = document.createElement('div');
        preview.id = 'chatReplyPreview';
        preview.className = 'chat-reply-preview-input';
        
        let replyText = msg.content || '';
        if (replyText.startsWith('$$PROFILE_SHARE$$')) {
            try {
                const p = JSON.parse(replyText.substring('$$PROFILE_SHARE$$'.length)).profile;
                replyText = p ? `Installation: ${p.name}` : `Installation: Unknown`;
            } catch(e) {
                replyText = 'Installation';
            }
        }
        
        preview.innerHTML = `
            <div class="reply-preview-header">
                <span class="reply-preview-label">↳ Replying to ${isMyReply ? 'yourself' : msg.senderName}</span>
                <button class="reply-preview-cancel" onclick="cancelReply()">✕</button>
            </div>
            <span class="reply-preview-text">${escapeHtml(replyText.slice(0, 60))}${replyText.length > 60 ? '…' : ''}</span>
        `;
        inputArea.insertBefore(preview, inputArea.firstChild);
    }

    function startEdit(msgId, content) {
        editingMessageId = msgId;
        replyingTo = null;
        const input = document.getElementById('chatInput');
        if (!input) return;
        input.value = content;
        input.placeholder = 'Edit your message...';
        input.focus();
        // Remove reply preview if exists
        const replyPreview = document.getElementById('chatReplyPreview');
        if (replyPreview) replyPreview.remove();
        
        // Show edit preview above input
        const inputArea = document.querySelector('.chat-input-area');
        if (!inputArea) return;
        let existingPreview = document.getElementById('chatEditPreview');
        if (existingPreview) existingPreview.remove();
        const preview = document.createElement('div');
        preview.id = 'chatEditPreview';
        preview.className = 'chat-reply-preview-input';
        preview.innerHTML = `
            <div class="reply-preview-header">
                <span class="reply-preview-label" style="color: #34d399">✎ Editing Message</span>
                <button class="reply-preview-cancel" onclick="cancelEdit()">✕</button>
            </div>
            <span class="reply-preview-text">${escapeHtml((content || '').slice(0, 60))}${(content || '').length > 60 ? '…' : ''}</span>
        `;
        inputArea.insertBefore(preview, inputArea.firstChild);
    }
    
    window.cancelEdit = function() {
        editingMessageId = null;
        const input = document.getElementById('chatInput');
        const editPreview = document.getElementById('chatEditPreview');
        if (editPreview) editPreview.remove();
        if (input) {
            input.placeholder = 'Type a message...';
            input.value = '';
        }
    };

    function showContextMenu(e, msgEl) {
        const msgId = msgEl.dataset.msgId;
        const content = msgEl.dataset.content;
        const senderId = msgEl.dataset.senderId;
        const isMine = senderId === socialAuth.uid;
        const isProfileShare = content && content.startsWith('$$PROFILE_SHARE$$');
        const canEdit = isMine && !isProfileShare;
        
        // Remove existing context menu
        const existing = document.getElementById('chatContextMenu');
        if (existing) existing.remove();
        
        const menu = document.createElement('div');
        menu.id = 'chatContextMenu';
        menu.className = 'chat-context-menu';
        
        let menuHtml = '';
        if (isMine) {
            menuHtml += `<button class="context-menu-item context-menu-danger" data-action="delete">🗑 Delete</button>`;
        }
        
        menu.innerHTML = menuHtml;
        menu.style.left = `${e.pageX}px`;
        menu.style.top = `${e.pageY}px`;
        document.body.appendChild(menu);
        
        // Handle clicks
        menu.addEventListener('click', (menuE) => {
            const btn = menuE.target.closest('.context-menu-item');
            if (!btn) return;
            const action = btn.dataset.action;
            if (action === 'delete') {
                showDeleteConfirmation(msgId);
            }
            menu.remove();
        });
        
        // Close on click outside
        const closeMenu = (ev) => {
            if (!menu.contains(ev.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    }

    function showDeleteConfirmation(msgId) {
        const existing = document.getElementById('deleteMessageModal');
        if (existing) existing.remove();
        
        const modal = document.createElement('div');
        modal.id = 'deleteMessageModal';
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-content delete-modal">
                <h3>Delete Message?</h3>
                <p>This action cannot be undone.</p>
                <div class="modal-actions">
                    <button class="btn-secondary" id="cancelDelete">Cancel</button>
                    <button class="btn-danger" id="confirmDelete">Delete</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        document.getElementById('cancelDelete').addEventListener('click', () => modal.remove());
        document.getElementById('confirmDelete').addEventListener('click', async () => {
            const res = await api().social_delete_message(activeChatFriendship.id, msgId);
            if (res && res.success) {
                const msgEl = document.querySelector(`[data-msg-id="${msgId}"]`);
                if (msgEl) msgEl.remove();
            } else {
                console.error('[Social] Failed to delete message:', res?.error);
                showToast('Failed to delete message: ' + (res?.error || 'Unknown Error'));
            }
            modal.remove();
        });
    }

    function handleChatGridButtonClick(e) {
        const btn = e.currentTarget;
        const type = btn.dataset.type;
        
        if (!activeChatFriendship) {
            console.warn('[Social] No active chat to send card to');
            return;
        }

        switch (type) {
            case 'installation':
                // Open share profile modal (existing functionality)
                openShareProfileModal();
                break;
            case 'seed':
                // Open seed modal
                openShareSeedModal();
                break;
            case 'server':
                // TODO: Implement server invite sharing
                showToast('Server invite sharing coming soon!');
                break;
            case 'link':
                // Open share link modal
                openShareLinkModal();
                break;
            default:
                console.warn('[Social] Unknown button type:', type);
        }
    }

    async function sendChatMessage() {
        const input = document.getElementById('chatInput');
        if (!input || !activeChatFriendship) return;
        const content = input.value.trim();
        if (!content) return;
        
        // Handle edit mode
        if (editingMessageId) {
            const res = await api().social_edit_message(activeChatFriendship.id, editingMessageId, content);
            if (res && res.success) {
                // Update message in UI
                const msgEl = document.querySelector(`[data-msg-id="${editingMessageId}"] .chat-msg-text`);
                if (msgEl) msgEl.textContent = content;
                const timeEl = document.querySelector(`[data-msg-id="${editingMessageId}"] .chat-msg-time`);
                if (timeEl) timeEl.textContent = formatTime(new Date().toISOString()) + ' (edited)';
                const containerMsg = document.querySelector(`[data-msg-id="${editingMessageId}"]`);
                if (containerMsg) containerMsg.dataset.content = content;
            } else {
                console.error('[Social] Failed to edit message:', res?.error);
                showToast('Failed to edit message: ' + (res?.error || 'Unknown Error'));
            }
            editingMessageId = null;
            input.value = '';
            cancelEdit();
            input.disabled = false;
            input.focus();
            return;
        }
        
        input.value = '';
        input.disabled = true;
        // Optimistic UI: add "sending" message immediately
        const container = document.getElementById('chatMessages');
        const myUid = socialAuth.uid;
        const tempId = `temp_${Date.now()}`;
        const tempMsg = {
            id: tempId,
            senderId: myUid,
            content,
            timestamp: new Date().toISOString(),
            status: 'sending'
        };
        if (replyingTo) {
            tempMsg.replyTo = replyingTo.id;
            tempMsg.replyContent = replyingTo.content;
            tempMsg.replySender = replyingTo.senderId;
            tempMsg.replySenderName = replyingTo.senderName;
        }
        const prevSender = container.lastElementChild?.dataset.senderId;
        const showAv = prevSender !== myUid;
        let replyHtml = '';
        if (replyingTo) {
            const isMyReply = replyingTo.senderId === myUid;
            let replyText = replyingTo.content || '';
            // Format profile share replies
            if (replyText.startsWith('$$PROFILE_SHARE$$')) {
                try {
                    const p = JSON.parse(replyText.substring('$$PROFILE_SHARE$$'.length)).profile;
                    replyText = p ? `Installation: ${p.name}` : `Installation: Unknown`;
                } catch(e) {
                    replyText = 'Installation';
                }
            }
            replyHtml = `<div class="chat-reply-preview">
                <span class="chat-reply-label">↳ ${isMyReply ? 'You' : replyingTo.senderName}</span>
                <span class="chat-reply-text">${escapeHtml(replyText.slice(0, 50))}${replyText.length > 50 ? '…' : ''}</span>
            </div>`;
        }
        let msgContentHtml = `<span class="chat-msg-text">${escapeHtml(content)}</span>`;
        if (content.startsWith('$$PROFILE_SHARE$$')) {
            try {
                const payload = JSON.parse(content.substring('$$PROFILE_SHARE$$'.length));
                if (payload && payload.profile) {
                    const p = payload.profile;
                    const defaultIcon = 'ui/img/icon.png';
                    msgContentHtml = `
                        <div class="chat-profile-card">
                            <div class="chat-profile-card-header">
                                <img src="${defaultIcon}" class="chat-profile-card-icon" data-async-icon="${p.icon || ''}">
                                <div class="chat-profile-card-info">
                                    <div class="chat-profile-card-name">${escapeHtml(p.name)}</div>
                                    <div class="chat-profile-card-version">${escapeHtml(formatVersionString(p.version))}</div>
                                </div>
                            </div>
                            <div class="chat-profile-card-actions">
                                <button class="chat-profile-card-btn chat-profile-btn-view" onclick="viewSharedProfile('${escapeHtml(content)}')">View Profile</button>
                                <button class="chat-profile-card-btn chat-profile-btn-install" onclick="installSharedProfile('${escapeHtml(content)}')">Install</button>
                            </div>
                        </div>
                    `;
                }
            } catch(e) {}
        }
        
        const html = `<div class="chat-msg chat-msg-mine" data-sender-id="${myUid}" data-content="${escapeHtml(content)}" data-reply-to="${replyingTo ? replyingTo.id : ''}" data-reply-content="${replyingTo ? escapeHtml(replyingTo.content) : ''}" data-reply-sender="${replyingTo ? replyingTo.senderId : ''}" data-reply-sender-name="${replyingTo ? escapeHtml(replyingTo.senderName) : ''}" data-temp="${tempId}">
          <div class="chat-msg-bubble">
            ${replyHtml}
            ${msgContentHtml}
            <span class="chat-msg-time">Sending...</span>
            <span class="chat-msg-status">sending</span>
          </div>
        </div>`;
        container.insertAdjacentHTML('beforeend', html);
        container.scrollTop = container.scrollHeight;
        try {
            const res = await api().social_send_message(activeChatFriendship.id, content, replyingTo);
            if (res && res.success) {
                // Just update the temp message status from "Sending..." to "sent"
                const tempEl = container.querySelector(`[data-temp="${tempId}"] .chat-msg-time`);
                if (tempEl) tempEl.textContent = formatTime(new Date().toISOString());
                const statusEl = container.querySelector(`[data-temp="${tempId}"] .chat-msg-status`);
                if (statusEl) statusEl.textContent = 'sent';
                // Remove the temp attribute so it's treated as a real message
                const msgEl = container.querySelector(`[data-temp="${tempId}"]`);
                if (msgEl) {
                    delete msgEl.dataset.temp;
                    msgEl.dataset.msgId = res.msgId;
                    lastMessageIds.add(res.msgId);
                }
            } else {
                // Show error
                const tempEl = container.querySelector(`[data-temp="${tempId}"] .chat-msg-time`);
                if (tempEl) tempEl.textContent = 'Failed';
            }
        } catch (e) {
            console.error('[Social] sendChatMessage error:', e.message);
            const tempEl = container.querySelector(`[data-temp="${tempId}"] .chat-msg-time`);
            if (tempEl) tempEl.textContent = 'Error';
        }
        input.disabled = false;
        input.focus();
        cancelReply();
    }

    window.cancelReply = function() {
        replyingTo = null;
        editingMessageId = null;
        // Clear from Firestore
        if (activeChatFriendship) {
            api().social_set_reply(activeChatFriendship.id, null);
        }
        const input = document.getElementById('chatInput');
        const replyPreview = document.getElementById('chatReplyPreview');
        if (replyPreview) replyPreview.remove();
        if (input) {
            input.placeholder = 'Type a message...';
            input.value = '';
        }
    };

    // --- Group Chat ---
    let createGroupSelectedFriends = new Set();
    let createGroupImageBase64 = '';

    function openCreateGroupModal() {
        const modal = document.getElementById('createGroupModal');
        if (!modal) return;
        
        // Reset state
        createGroupSelectedFriends.clear();
        createGroupImageBase64 = '';
        
        // Reset UI
        document.getElementById('createGroupStep1').style.display = 'block';
        document.getElementById('createGroupStep2').style.display = 'none';
        document.getElementById('groupNameInput').value = '';
        document.getElementById('groupDescInput').value = '';
        document.getElementById('groupIconPreview').style.display = 'none';
        document.getElementById('groupIconPreview').src = '';
        document.getElementById('groupIconPlaceholder').style.display = 'block';
        document.getElementById('nextCreateGroupBtn').disabled = true;
        document.getElementById('confirmCreateGroupBtn').disabled = true;

        // Render friends list
        renderCreateGroupFriends();

        modal.classList.add('show');
    }

    function closeCreateGroupModal() {
        const modal = document.getElementById('createGroupModal');
        if (modal) modal.classList.remove('show');
    }

    function renderCreateGroupFriends() {
        const list = document.getElementById('groupFriendsList');
        if (!list || !cachedFriends) return;

        // Only show individual friends (not groups)
        const individualFriends = cachedFriends.filter(f => !f.isGroup);

        if (individualFriends.length === 0) {
            list.innerHTML = '<div class="social-empty" style="color: #888; font-size: 13px; text-align: center; padding: 20px;">You need friends to create a group chat.</div>';
            return;
        }

        list.innerHTML = individualFriends.map(f => {
            const p = f.profile;
            const avatarHtml = getAvatarHtml(p, 30);
            const isSelected = createGroupSelectedFriends.has(p.uid);
            
            return `
            <div class="social-user-item" style="cursor: pointer; padding: 6px 10px; border-radius: 6px;" onclick="toggleCreateGroupFriend('${escapeHtml(p.uid)}')">
                <div class="social-item-avatar" style="width: 30px; height: 30px;">${avatarHtml}</div>
                <div class="social-item-info" style="flex: 1;">
                    <div class="social-item-name" style="font-size: 13px;">${escapeHtml(p.username)}</div>
                </div>
                <div class="social-item-actions">
                    <i class="fas ${isSelected ? 'fa-check-square' : 'fa-square'}" style="color: ${isSelected ? '#4facfe' : 'rgba(255,255,255,0.25)'}; font-size: 18px; transition: color 0.2s;"></i>
                </div>
            </div>`;
        }).join('');
    }

    window.toggleCreateGroupFriend = function(uid) {
        if (createGroupSelectedFriends.has(uid)) {
            createGroupSelectedFriends.delete(uid);
        } else {
            createGroupSelectedFriends.add(uid);
        }
        document.getElementById('nextCreateGroupBtn').disabled = createGroupSelectedFriends.size === 0;
        renderCreateGroupFriends();
    };

    function handleGroupImageSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                canvas.width = 128;
                canvas.height = 128;
                const ctx = canvas.getContext('2d');
                
                // Crop and resize logic to make it square
                const size = Math.min(img.width, img.height);
                const startX = (img.width - size) / 2;
                const startY = (img.height - size) / 2;
                
                ctx.drawImage(img, startX, startY, size, size, 0, 0, 128, 128);
                
                createGroupImageBase64 = canvas.toDataURL('image/jpeg', 0.8);
                
                const preview = document.getElementById('groupIconPreview');
                preview.src = createGroupImageBase64;
                preview.style.display = 'block';
                document.getElementById('groupIconPlaceholder').style.display = 'none';
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    async function submitCreateGroup() {
        const name = document.getElementById('groupNameInput').value.trim();
        const desc = document.getElementById('groupDescInput').value.trim();
        
        if (!name) return;

        const btn = document.getElementById('confirmCreateGroupBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';

        try {
            const members = Array.from(createGroupSelectedFriends);
            const res = await api().social_create_group(name, desc, createGroupImageBase64, members);
            
            if (res && res.success) {
                closeCreateGroupModal();
                loadFriends(true); // reload friends to see new group
            } else {
                showToast('Failed to create group: ' + (res?.error || 'Unknown error'));
            }
        } catch (e) {
            console.error('[Social] createGroup error:', e);
            showToast('Failed to create group');
        } finally {
            btn.innerHTML = 'Create';
            btn.disabled = false;
        }
    }

    // --- Group Settings ---
    let currentGroupSettingsId = null;
    let currentGroupSettingsData = null;
    let editGroupImageBase64 = '';

    function openGroupSettingsModal() {
        if (!activeChatFriendship || !activeChatFriendship.profile.isGroup) return;
        currentGroupSettingsId = activeChatFriendship.id;
        currentGroupSettingsData = activeChatFriendship.profile;
        const modal = document.getElementById('groupSettingsModal');
        if (!modal) return;
        modal.classList.add('show');
        switchGroupSettingsTab('info');
        loadGroupSettingsInfo();
        loadGroupMembers();
    }

    function closeGroupSettingsModal() {
        const modal = document.getElementById('groupSettingsModal');
        if (modal) modal.classList.remove('show');
        currentGroupSettingsId = null;
        currentGroupSettingsData = null;
        editGroupImageBase64 = '';
    }

    function switchGroupSettingsTab(tab) {
        const infoTab = document.getElementById('groupTabInfo');
        const membersTab = document.getElementById('groupTabMembers');
        
        document.querySelectorAll('.group-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        
        if (tab === 'info') {
            membersTab.style.opacity = '0';
            setTimeout(() => {
                membersTab.style.display = 'none';
                infoTab.style.display = 'block';
                setTimeout(() => {
                    infoTab.style.opacity = '1';
                }, 10);
            }, 200);
        } else {
            infoTab.style.opacity = '0';
            setTimeout(() => {
                infoTab.style.display = 'none';
                membersTab.style.display = 'block';
                setTimeout(() => {
                    membersTab.style.opacity = '1';
                }, 10);
            }, 200);
        }
    }

    function loadGroupSettingsInfo() {
        if (!currentGroupSettingsData) return;
        document.getElementById('editGroupNameInput').value = currentGroupSettingsData.username || '';
        document.getElementById('editGroupDescInput').value = currentGroupSettingsData.description || '';
        const preview = document.getElementById('editGroupIconPreview');
        const placeholder = document.getElementById('editGroupIconPlaceholder');
        if (currentGroupSettingsData.avatarBase64) {
            preview.src = currentGroupSettingsData.avatarBase64;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
            editGroupImageBase64 = currentGroupSettingsData.avatarBase64;
        } else {
            preview.style.display = 'none';
            placeholder.style.display = 'block';
            editGroupImageBase64 = '';
        }
    }

    async function loadGroupMembers() {
        if (!currentGroupSettingsId) return;
        const res = await api().social_get_group_details(currentGroupSettingsId);
        if (!res || !res.success) return;
        const group = res.group;
        const profiles = res.profiles || [];
        const myUid = socialAuth.uid;
        const isOwner = group.admin === myUid;
        const admins = group.admins || [group.admin];
        const isAdmin = admins.includes(myUid);

        // Render members list
        const list = document.getElementById('groupMembersList');
        if (list) {
            list.innerHTML = profiles.map(p => {
                const isMemberOwner = p.uid === group.admin;
                const isMemberAdmin = admins.includes(p.uid);
                const isMe = p.uid === myUid;
                const canManage = (isOwner || (isAdmin && p.uid !== group.admin)) && !isMe;
                const canPromote = isAdmin && !isMemberAdmin && !isMe;
                const canDemote = isOwner && isMemberAdmin && !isMemberOwner;
                const avatar = getAvatarHtml(p, 36);
                const roleText = isMemberOwner ? 'Owner' : (isMemberAdmin ? 'Admin' : 'Member');
                const roleColor = isMemberOwner ? '#ffd700' : (isMemberAdmin ? '#4facfe' : '#888888');
                const roleBgColor = isMemberOwner ? 'rgba(255,215,0,0.15)' : (isMemberAdmin ? 'rgba(79,172,254,0.15)' : 'rgba(136,136,136,0.15)');
                const roleIcon = isMemberOwner ? 'fa-crown' : (isMemberAdmin ? 'fa-shield-alt' : 'fa-user');
                const youBadge = isMe ? '<div class="member-you-badge">You</div>' : '';
                
                // Check if this member is already a friend
                const isFriend = cachedFriends && cachedFriends.some(f => !f.isGroup && f.profile.uid === p.uid);
                const canSendRequest = !isMe && !isFriend;
                let actions = '';
                if (canPromote) {
                    actions += `<button class="social-action-btn social-btn-add" title="Make Admin" onclick='promoteGroupMember("${escapeHtml(p.uid)}")'><i class="fas fa-shield-alt"></i></button>`;
                }
                if (canDemote) {
                    actions += `<button class="social-action-btn social-btn-block" title="Remove Admin" onclick='demoteGroupAdmin("${escapeHtml(p.uid)}")'><i class="fas fa-shield-alt" style="color:#ff6b6b;"></i></button>`;
                }
                if (canManage) {
                    actions += `<button class="social-action-btn social-btn-remove" title="Remove from Group" onclick='removeGroupMember("${escapeHtml(p.uid)}", "${escapeHtml(p.username)}")'><i class="fas fa-user-minus"></i></button>`;
                }
                // Add friend request button if not already friends
                if (canSendRequest) {
                    actions += `<button class="social-action-btn social-btn-add" title="Send Friend Request" onclick='sendFriendRequest("${escapeHtml(p.uid)}", "${escapeHtml(p.username)}")'><i class="fas fa-user-plus"></i></button>`;
                }
                const actionsCol = actions ? `<div class="social-item-actions">${actions}</div>` : '';
                return `<div class="social-user-item" style="padding: 8px 12px; ${isMe ? 'background: rgba(79,172,254,0.1); border-radius: 8px;' : ''}; display: flex; align-items: center; gap: 12px; margin-bottom: 6px; border-radius: 8px;">
                    <div class="social-item-avatar" style="width:36px;height:36px; flex-shrink: 0; border-radius: 50%; overflow: hidden;">${avatar}</div>
                    <div style="flex:1; display: flex; flex-direction: column; gap: 3px; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: nowrap;">
                            <div style="font-size:14px; font-weight: 500; color: #e0e6ed; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(p.username)}</div>
                            ${youBadge}
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <div class="member-role-badge" style="color:${roleColor}; background: ${roleBgColor}; border: 1px solid ${roleColor}30;"><i class="fas ${roleIcon}"></i>${roleText}</div>
                        </div>
                    </div>
                    ${actionsCol}
                </div>`;
            }).join('');
        }

        // Render add members list (friends not in group)
        const addList = document.getElementById('addMembersList');
        if (addList && cachedFriends) {
            const members = new Set(group.members);
            const nonMembers = cachedFriends.filter(f => !f.isGroup && !members.has(f.profile.uid));
            if (nonMembers.length === 0) {
                addList.innerHTML = '<div class="social-empty" style="padding:10px;"><p style="font-size:12px;">No friends to add</p></div>';
            } else {
                addList.innerHTML = nonMembers.map(f => {
                    const p = f.profile;
                    return `<div class="social-user-item" style="cursor:pointer; padding:6px 10px; border-radius:6px;" onclick='toggleAddGroupMember("${escapeHtml(p.uid)}", this)'>
                        <div class="social-item-avatar" style="width:30px;height:30px;">${getAvatarHtml(p, 30)}</div>
                        <div class="social-item-info" style="flex:1;">
                            <div class="social-item-name" style="font-size:13px;">${escapeHtml(p.username)}</div>
                        </div>
                        <div class="social-item-actions">
                            <i class="fas fa-plus add-member-icon" style="color:#4facfe; font-size:14px;"></i>
                        </div>
                    </div>`;
                }).join('');
            }
        }
    }

    window.toggleAddGroupMember = async function(uid, el) {
        if (!currentGroupSettingsId) return;
        try {
            const res = await api().social_add_group_members(currentGroupSettingsId, [uid]);
            if (res && res.success) {
                el.style.opacity = '0.5';
                el.style.pointerEvents = 'none';
                const icon = el.querySelector('.add-member-icon');
                if (icon) { icon.className = 'fas fa-check'; icon.style.color = '#5cb85c'; }
                // Refresh members
                await loadGroupMembers();
                // Update active chat profile members
                if (activeChatFriendship && activeChatFriendship.profile) {
                    activeChatFriendship.profile.members = res.users || activeChatFriendship.profile.members;
                }
            } else {
                showToast('Failed to add member: ' + (res?.error || 'Unknown error'));
            }
        } catch (e) {
            showToast('Error adding member');
        }
    };

    window.promoteGroupMember = async function(uid) {
        if (!currentGroupSettingsId) return;
        try {
            const res = await api().social_promote_admin(currentGroupSettingsId, uid);
            if (res && res.success) {
                await loadGroupMembers();
            } else {
                showToast('Failed to promote: ' + (res?.error || 'Unknown error'));
            }
        } catch (e) { showToast('Error promoting member'); }
    };

    window.demoteGroupAdmin = async function(uid) {
        if (!currentGroupSettingsId) return;
        try {
            const res = await api().social_demote_admin(currentGroupSettingsId, uid);
            if (res && res.success) {
                await loadGroupMembers();
            } else {
                showToast('Failed to demote: ' + (res?.error || 'Unknown error'));
            }
        } catch (e) { showToast('Error demoting admin'); }
    };

    window.removeGroupMember = async function(uid, username) {
        if (!currentGroupSettingsId) return;
        if (!confirm(`Remove ${username} from the group?`)) return;
        try {
            const res = await api().social_remove_group_member(currentGroupSettingsId, uid);
            if (res && res.success) {
                await loadGroupMembers();
            } else {
                showToast('Failed to remove: ' + (res?.error || 'Unknown error'));
            }
        } catch (e) { showToast('Error removing member'); }
    };

    async function saveGroupInfo() {
        if (!currentGroupSettingsId) return;
        const name = document.getElementById('editGroupNameInput').value.trim();
        const description = document.getElementById('editGroupDescInput').value.trim();
        if (!name) { showToast('Group name is required'); return; }
        const updates = { name, description };
        if (editGroupImageBase64) updates.imageBase64 = editGroupImageBase64;
        else if (currentGroupSettingsData && !currentGroupSettingsData.avatarBase64) updates.imageBase64 = '';
        try {
            const res = await api().social_edit_group(currentGroupSettingsId, updates);
            if (res && res.success) {
                // Update local state
                if (currentGroupSettingsData) {
                    currentGroupSettingsData.username = name;
                    currentGroupSettingsData.description = description;
                    currentGroupSettingsData.avatarBase64 = updates.imageBase64 || currentGroupSettingsData.avatarBase64;
                }
                if (activeChatFriendship && activeChatFriendship.profile) {
                    activeChatFriendship.profile.username = name;
                    activeChatFriendship.profile.description = description;
                    activeChatFriendship.profile.avatarBase64 = updates.imageBase64 || activeChatFriendship.profile.avatarBase64;
                    document.getElementById('chatHeaderName').textContent = name;
                    document.getElementById('chatHeaderAvatar').innerHTML = getAvatarHtml(activeChatFriendship.profile, 36);
                }
                loadFriends(false);
                closeGroupSettingsModal();
            } else {
                showToast('Failed to save: ' + (res?.error || 'Unknown error'));
            }
        } catch (e) { showToast('Error saving group info'); }
    }

    function handleEditGroupImageSelect(e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 128; canvas.height = 128;
                const ctx = canvas.getContext('2d');
                const size = Math.min(img.width, img.height);
                const startX = (img.width - size) / 2;
                const startY = (img.height - size) / 2;
                ctx.drawImage(img, startX, startY, size, size, 0, 0, 128, 128);
                editGroupImageBase64 = canvas.toDataURL('image/jpeg', 0.8);
                const preview = document.getElementById('editGroupIconPreview');
                preview.src = editGroupImageBase64;
                preview.style.display = 'block';
                document.getElementById('editGroupIconPlaceholder').style.display = 'none';
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    function formatVersionString(version) {
        if (!version) return '';
        let v = version.toLowerCase();
        let loaderName = '';
        if (v.startsWith('fabric')) { loaderName = 'Fabric'; v = v.replace(/^fabric(?:-loader)?-?/, ''); }
        else if (v.startsWith('forge')) { loaderName = 'Forge'; v = v.replace(/^forge-?/, ''); }
        else if (v.startsWith('quilt')) { loaderName = 'Quilt'; v = v.replace(/^quilt(?:-loader)?-?/, ''); }
        
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
                        list.innerHTML = '<div style="text-align:center; padding:20px; color:#aaa;">You have no profiles to share.</div>';
                    } else {
                        list.innerHTML = '';
                        for (const profile of profilesArray) {
                            // Skip profiles with latest snapshot/release names
                            const nameLower = (profile.name || '').toLowerCase();
                            if (nameLower === 'latest release' || nameLower === 'latest snapshot') {
                                continue;
                            }
                            
                            let iconSrc = 'ui/img/icon.png';
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
                            
                            div.onclick = () => {
                                closeShareProfileModal();
                                shareProfileToChat(profile, iconSrc);
                            };
                            list.appendChild(div);
                        }
                        
                        // Show message if no shareable profiles
                        if (list.children.length === 0) {
                            list.innerHTML = '<div style="text-align:center; padding:20px; color:#aaa;">No shareable profiles found. Profiles with "latest snapshot" or "latest release" cannot be shared.</div>';
                        }
                    }
                }
            } catch (e) {
                console.error("Error loading profiles:", e);
                list.innerHTML = '<div style="text-align:center; padding:20px; color:#e74c3c;">Error loading profiles.</div>';
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
        if (!activeChatFriendship) return;
        
        // Convert BigInt to string before JSON serialization
        // BigInt cannot be directly serialized by JSON.stringify
        const seedString = typeof seed === 'bigint' ? seed.toString() : String(seed);
        
        const seedData = {
            type: 'seed',
            seed: seedString
        };
        
        const content = JSON.stringify(seedData);
        
        try {
            const res = await api().social_send_message(activeChatFriendship.id, content);
            if (res && res.success) {
                closeShareSeedModal();
                loadChatMessages(true);
            } else {
                showToast('Failed to send seed: ' + (res?.error || 'Unknown error'));
            }
        } catch (e) {
            console.error('Error sending seed:', e);
            showToast('Failed to send seed: ' + e.message);
        }
    }

    window.copySeedToClipboard = function(seed, btn) {
        navigator.clipboard.writeText(seed).then(() => {
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            btn.classList.add('copied');
            
            setTimeout(() => {
                btn.innerHTML = originalHtml;
                btn.classList.remove('copied');
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy seed:', err);
            showToast('Failed to copy to clipboard');
        });
    };

    async function shareProfileToChat(profile, iconSrc) {
        if (!activeChatFriendship) return;
        
        const payload = {
            type: 'profile_share',
            profile: {
                name: profile.name,
                version: profile.version,
                icon: profile.icon,
                jvm_args: profile.jvm_args,
                addons: profile.addons || []
            }
        };
        
        // Send it as stringified JSON starting with a special marker
        const contentStr = '$$PROFILE_SHARE$$' + JSON.stringify(payload);
        
        // Optimistic UI
        const container = document.getElementById('chatMessages');
        const myUid = socialAuth.uid;
        const tempId = `temp_${Date.now()}`;
        
        const html = `<div class="chat-msg chat-msg-mine" data-sender-id="${myUid}" data-content="${escapeHtml(contentStr)}" data-temp="${tempId}">
          <div class="chat-msg-bubble">
            <div class="chat-profile-card">
                <div class="chat-profile-card-header">
                    <img src="${iconSrc}" class="chat-profile-card-icon">
                    <div class="chat-profile-card-info">
                        <div class="chat-profile-card-name">${escapeHtml(profile.name)}</div>
                        <div class="chat-profile-card-version">${escapeHtml(formatVersionString(profile.version))}</div>
                    </div>
                </div>
                <div class="chat-profile-card-actions">
                    <button class="chat-profile-card-btn chat-profile-btn-view" onclick="viewSharedProfile('${escapeHtml(contentStr)}')">View Profile</button>
                    <button class="chat-profile-card-btn chat-profile-btn-install" onclick="installSharedProfile('${escapeHtml(contentStr)}')">Install</button>
                </div>
            </div>
            <span class="chat-msg-time">Sending...</span>
            <span class="chat-msg-status">sending</span>
          </div>
        </div>`;
        container.insertAdjacentHTML('beforeend', html);
        container.scrollTop = container.scrollHeight;
        
        try {
            const res = await api().social_send_message(activeChatFriendship.id, contentStr, null);
            if (res && res.success) {
                const tempEl = container.querySelector(`[data-temp="${tempId}"] .chat-msg-time`);
                if (tempEl) tempEl.textContent = formatTime(new Date().toISOString());
                const statusEl = container.querySelector(`[data-temp="${tempId}"] .chat-msg-status`);
                if (statusEl) statusEl.textContent = 'sent';
                const msgEl = container.querySelector(`[data-temp="${tempId}"]`);
                if (msgEl) {
                    delete msgEl.dataset.temp;
                    msgEl.dataset.msgId = res.msgId;
                    lastMessageIds.add(res.msgId);
                }
            } else {
                const tempEl = container.querySelector(`[data-temp="${tempId}"] .chat-msg-time`);
                if (tempEl) tempEl.textContent = 'Failed';
            }
        } catch (e) {
            console.error('[Social] shareProfile error:', e.message);
            const tempEl = container.querySelector(`[data-temp="${tempId}"] .chat-msg-time`);
            if (tempEl) tempEl.textContent = 'Error';
        }
    }

    // --- Profile View/Install Handlers ---
    window.viewSharedProfile = async function(contentStr) {
        try {
            const payload = JSON.parse(contentStr.substring('$$PROFILE_SHARE$$'.length));
            const p = payload.profile;
            if (!p) return;
            
            const modal = document.getElementById('viewProfileModal');
            if (!modal) return;
            
            document.getElementById('vpName').textContent = p.name || 'Unknown Profile';
            document.getElementById('vpVersion').textContent = formatVersionString(p.version) || 'Unknown Version';
            
            // Icon
            const vpIcon = document.getElementById('vpIcon');
            vpIcon.src = 'ui/img/icon.png';
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
                modsTab.style.display = 'block';
                isModded = true;
            } else if (versionLower.includes('fabric')) {
                loaderEl.textContent = 'Fabric';
                loaderEl.style.display = 'block';
                modsTab.style.display = 'block';
                isModded = true;
            } else {
                loaderEl.style.display = 'none';
                modsTab.style.display = 'none';
            }
            
            // Reset to General tab
            document.querySelectorAll('#viewProfileModal .group-tab-btn').forEach(t => t.classList.remove('active'));
            document.querySelector('#viewProfileModal .group-tab-btn[data-vp-tab="general"]').classList.add('active');
            document.getElementById('vpTabContentGeneral').style.display = 'block';
            document.getElementById('vpTabContentMods').style.display = 'none';
            
            // Load mods if applicable
            const modsList = document.getElementById('vpModsList');
            modsList.innerHTML = '<div style="text-align:center; padding:20px; color:#aaa;">Loading mods...</div>';
            
            if (isModded) {
                if (p.addons && p.addons.length > 0) {
                    (async () => {
                        const htmls = [];
                        for (const addon of p.addons) {
                            if (addon.type !== 'mod') continue;
                            if (addon.project_id) {
                                try {
                                    const details = await api().get_mod_details(addon.project_id);
                                    if (details && details.success && details.details) {
                                        const mod = details.details;
                                        htmls.push(`
                                            <div class="social-user-item" style="padding: 10px; border-radius: 8px;">
                                                <div class="social-item-avatar" style="width:32px; height:32px; border-radius:6px; background: rgba(0,0,0,0.3);">
                                                    <img src="${mod.icon_url || 'ui/img/icon.png'}" style="width:100%; height:100%; object-fit:cover; border-radius:6px;">
                                                </div>
                                                <div class="social-item-info">
                                                    <div class="social-item-name">${escapeHtml(mod.title)}</div>
                                                    <div class="social-item-status" style="font-size:11px; opacity:0.7;">${escapeHtml(addon.filename)}</div>
                                                </div>
                                            </div>
                                        `);
                                        continue;
                                    }
                                } catch(e) { }
                            }
                            
                            // Fallback if no project_id or modrinth lookup failed
                            htmls.push(`
                                <div class="social-user-item" style="padding: 10px; border-radius: 8px;">
                                    <div class="social-item-avatar" style="width:32px; height:32px; border-radius:6px; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
                                        <i class="fas fa-cube" style="color:#aaa;"></i>
                                    </div>
                                    <div class="social-item-info">
                                        <div class="social-item-name">${escapeHtml(addon.filename)}</div>
                                    </div>
                                </div>
                            `);
                        }
                        modsList.innerHTML = htmls.length > 0 ? htmls.join('') : '<div style="text-align:center; padding:20px; color:#aaa;">No mods configured for this profile.</div>';
                    })();
                } else {
                    modsList.innerHTML = '<div style="text-align:center; padding:20px; color:#aaa; font-style:italic;">This profile has no mods configured.</div>';
                }
            }
            
            // Tab switching logic
            document.querySelectorAll('#viewProfileModal .group-tab-btn').forEach(tab => {
                tab.onclick = () => {
                    document.querySelectorAll('#viewProfileModal .group-tab-btn').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    
                    const generalTab = document.getElementById('vpTabContentGeneral');
                    const modsTab = document.getElementById('vpTabContentMods');
                    const tabName = tab.dataset.vpTab;
                    
                    if (tabName === 'general') {
                        modsTab.style.opacity = '0';
                        setTimeout(() => {
                            modsTab.style.display = 'none';
                            generalTab.style.display = 'block';
                            setTimeout(() => {
                                generalTab.style.opacity = '1';
                            }, 10);
                        }, 200);
                    } else if (tabName === 'mods') {
                        generalTab.style.opacity = '0';
                        setTimeout(() => {
                            generalTab.style.display = 'none';
                            modsTab.style.display = 'block';
                            setTimeout(() => {
                                modsTab.style.opacity = '1';
                            }, 10);
                        }, 200);
                    }
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
    
    window.installSharedProfile = async function(contentStr) {
        try {
            const payload = JSON.parse(contentStr.substring('$$PROFILE_SHARE$$'.length));
            const p = payload.profile;
            if (!p) return;
            
            // Store the shared profile data for installation
            window.sharedProfileData = p;
            
            // Open the install profile modal
            const modal = document.getElementById('installProfileModal');
            if (!modal) return;
            
            // Populate fields with shared profile data
            document.getElementById('ipNameInput').value = p.name || '';
            document.getElementById('ipJavaInput').value = '';
            document.getElementById('ipJvmInput').value = p.jvm_args || '';
            
            // Auto-fill game directory with user's configured Minecraft directory
            try {
                const userData = await api().get_user_json();
                document.getElementById('ipDirInput').value = userData.mcdir || '';
            } catch(e) {
                console.error('[Social] Error fetching user mcdir:', e.message);
                document.getElementById('ipDirInput').value = '';
            }
            
            modal.classList.add('show');
        } catch(e) {
            console.error('[Social] installSharedProfile error:', e.message);
        }
    };
    
    window.closeInstallProfileModal = function() {
        const modal = document.getElementById('installProfileModal');
        if (modal) modal.classList.remove('show');
        window.sharedProfileData = null;
    };
    
    window.confirmInstallSharedProfile = async function() {
        const p = window.sharedProfileData;
        if (!p) return;
        
        const name = document.getElementById('ipNameInput').value.trim();
        const dir = document.getElementById('ipDirInput').value.trim();
        const javaPath = document.getElementById('ipJavaInput').value.trim() || null;
        const jvmArgs = document.getElementById('ipJvmInput').value.trim() || p.jvm_args || null;
        
        if (!name) {
            showToast('Please enter a profile name');
            return;
        }
        
        if (!dir) {
            showToast('Please enter a game directory');
            return;
        }
        
        try {
            const result = await api().add_profile(
                name, 
                p.version, 
                p.icon, 
                dir || null, 
                jvmArgs, 
                javaPath
            );
            
            if (result.success) {
                // If the profile has addons, save them
                if (p.addons && p.addons.length > 0) {
                    try {
                        await api().edit_profile(
                            result.profile_id, 
                            name, 
                            p.version, 
                            null, 
                            p.icon, 
                            null, 
                            null, 
                            jvmArgs, 
                            null, 
                            null, 
                            null, 
                            p.addons
                        );
                    } catch(err) {
                        console.error("Error syncing addons to profile", err);
                    }
                }
                
                closeInstallProfileModal();
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
        // Group Settings
        const groupSettingsBtn = document.getElementById('groupSettingsBtn');
        if (groupSettingsBtn) groupSettingsBtn.addEventListener('click', openGroupSettingsModal);

        const closeGroupSettingsBtn = document.getElementById('closeGroupSettingsBtn');
        if (closeGroupSettingsBtn) closeGroupSettingsBtn.addEventListener('click', closeGroupSettingsModal);

        document.querySelectorAll('.group-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => switchGroupSettingsTab(btn.dataset.tab));
        });

        const editGroupIconSelector = document.getElementById('editGroupIconSelector');
        const editGroupImageInput = document.getElementById('editGroupImageInput');
        if (editGroupIconSelector && editGroupImageInput) {
            editGroupIconSelector.addEventListener('click', () => editGroupImageInput.click());
            editGroupImageInput.addEventListener('change', handleEditGroupImageSelect);
        }

        const saveGroupInfoBtn = document.getElementById('saveGroupInfoBtn');
        if (saveGroupInfoBtn) saveGroupInfoBtn.addEventListener('click', saveGroupInfo);

        // Create Group
        const openCreateGroupBtn = document.getElementById('openCreateGroupBtn');
        if (openCreateGroupBtn) openCreateGroupBtn.addEventListener('click', openCreateGroupModal);
        
        const cancelCreateGroupBtn = document.getElementById('cancelCreateGroupBtn');
        if (cancelCreateGroupBtn) cancelCreateGroupBtn.addEventListener('click', closeCreateGroupModal);

        const nextCreateGroupBtn = document.getElementById('nextCreateGroupBtn');
        if (nextCreateGroupBtn) nextCreateGroupBtn.addEventListener('click', () => {
            document.getElementById('createGroupStep1').style.display = 'none';
            document.getElementById('createGroupStep2').style.display = 'block';
        });

        const backCreateGroupBtn = document.getElementById('backCreateGroupBtn');
        if (backCreateGroupBtn) backCreateGroupBtn.addEventListener('click', () => {
            document.getElementById('createGroupStep1').style.display = 'block';
            document.getElementById('createGroupStep2').style.display = 'none';
        });

        const groupNameInput = document.getElementById('groupNameInput');
        if (groupNameInput) groupNameInput.addEventListener('input', (e) => {
            document.getElementById('confirmCreateGroupBtn').disabled = e.target.value.trim().length === 0;
        });

        const groupIconSelector = document.getElementById('groupIconSelector');
        const groupImageInput = document.getElementById('groupImageInput');
        if (groupIconSelector && groupImageInput) {
            groupIconSelector.addEventListener('click', () => groupImageInput.click());
            groupImageInput.addEventListener('change', handleGroupImageSelect);
        }

        const confirmCreateGroupBtn = document.getElementById('confirmCreateGroupBtn');
        if (confirmCreateGroupBtn) confirmCreateGroupBtn.addEventListener('click', submitCreateGroup);

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
                openSocialModal();
            });
        }

        // Close button
        const closeBtn = document.getElementById('closeSocialModal');
        if (closeBtn) closeBtn.addEventListener('click', closeSocialModal);

        // Overlay click to close removed

        // OS notification click → open social modal and navigate to specific chat
        window.addEventListener('navigate-to-chat', (e) => {
            const { friendshipId } = e.detail || {};
            if (!friendshipId) return;
            openSocialModal();
            // If friends are already cached, open immediately
            if (cachedFriends) {
                const target = cachedFriends.find(f => f.friendshipId === friendshipId);
                if (target) { openChat(target.friendshipId, target.profile); return; }
            }
            // Otherwise set pending and let loadFriends handle it
            pendingChatOpen = friendshipId;
            switchSocialTab('friends');
            loadFriends(true);
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

        // Chat grid buttons
        const chatGridBtns = document.querySelectorAll('.chat-grid-btn');
        chatGridBtns.forEach(btn => {
            btn.addEventListener('click', handleChatGridButtonClick);
        });

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
                        showToast('Please select an installation and world');
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
        if (confirmInstallProfileBtn) confirmInstallProfileBtn.addEventListener('click', confirmInstallSharedProfile);

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

        // Chat back button
        const chatBackBtn = document.getElementById('chatBackBtn');
        if (chatBackBtn) chatBackBtn.addEventListener('click', closeChat);

        // Blocked toggle
        const blockedToggleBtn = document.getElementById('blockedToggleBtn');
        if (blockedToggleBtn) blockedToggleBtn.addEventListener('click', toggleBlockedSection);

        // Load more messages
        const loadMoreBtn = document.getElementById('chatLoadMoreBtn');
        if (loadMoreBtn) loadMoreBtn.addEventListener('click', loadMoreMessages);

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

    async function loadMoreMessages() {
        if (!activeChatFriendship || !chatEarliestTimestamp) return;
        try {
            const res = await api().social_get_messages(activeChatFriendship.id, chatEarliestTimestamp);
            if (!res || !res.success || !res.messages.length) return;
            chatEarliestTimestamp = res.messages[0].timestamp;
            const container = document.getElementById('chatMessages');
            if (!container) return;
            const myUid = socialAuth ? socialAuth.uid : '';
            let html = '';
            for (const msg of res.messages) {
                const isMine = msg.senderId === myUid;
                const cls = isMine ? 'chat-msg chat-msg-mine' : 'chat-msg chat-msg-other';
                html += `<div class="${cls}"><div class="chat-msg-bubble"><span class="chat-msg-text">${escapeHtml(msg.content)}</span><span class="chat-msg-time">${formatTime(msg.timestamp)}</span></div></div>`;
            }
            const prev = container.scrollHeight;
            container.insertAdjacentHTML('afterbegin', html);
            container.scrollTop = container.scrollHeight - prev;
        } catch (e) {}
    }

})();
