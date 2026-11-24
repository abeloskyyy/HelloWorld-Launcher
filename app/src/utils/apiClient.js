const axios = require('axios');

let _primaryUrl = 'https://api.hwlauncher.abelosky.com';
let _fallbackUrl = 'https://hwlauncher-api.abeloskysb.workers.dev';
let _activeUrl = _primaryUrl;
let _apiVersion = 'v1';

let _getToken = null;
let _refreshToken = null;

function setBaseUrl(primary, fallback = null, version = 'v1') {
  if (primary) _primaryUrl = primary.replace(/\/+$/, '');
  if (fallback) _fallbackUrl = fallback.replace(/\/+$/, '');
  _activeUrl = _primaryUrl;
  _apiVersion = version || 'v1';
}

function setAuthHandlers(tokenGetter, tokenRefresher) {
  _getToken = tokenGetter;
  _refreshToken = tokenRefresher;
}

function getApiEndpoint(endpointPath) {
  const cleanPath = endpointPath.replace(/^\/+/, '');
  return `${_activeUrl}/api/${_apiVersion}/${cleanPath}`;
}

const LAUNCHER_SECRET = 'hwl_sec_7f9b8c2d1e0a4f5b9c8d7e6a5b4c3d2e1';

async function request(method, endpointPath, options = {}) {
  const { data, params, requiresAuth = false, retryOnAuth = true } = options;

  let headers = { ...(options.headers || {}) };
  headers['X-Launcher-Secret'] = LAUNCHER_SECRET;
  let authData = null;

  if (typeof _getToken === 'function') {
    try {
      authData = await _getToken();
      if (authData) {
        if (authData.idToken) {
          headers['Authorization'] = `Bearer ${authData.idToken}`;
        }
        if (authData.username) {
          headers['X-User-Username'] = authData.username;
        }
        if (authData.uid) {
          headers['X-User-Uid'] = authData.uid;
        }
      }
    } catch (authErr) {
      if (requiresAuth && !headers['Authorization'] && !headers['X-User-Username']) {
        throw authErr;
      }
    }
  }

  const url = getApiEndpoint(endpointPath);

  try {
    const res = await axios({
      method,
      url,
      data,
      params,
      headers,
      timeout: options.timeout || 10000
    });
    return res.data;
  } catch (err) {
    // 1. Reintento si el token de Firebase ha caducado (401 Unauthorized)
    if (err.response && err.response.status === 401 && requiresAuth && retryOnAuth && typeof _refreshToken === 'function') {
      try {
        const refreshed = await _refreshToken();
        if (refreshed && refreshed.idToken) {
          headers['Authorization'] = `Bearer ${refreshed.idToken}`;
          const retryRes = await axios({
            method,
            url,
            data,
            params,
            headers,
            timeout: options.timeout || 10000
          });
          return retryRes.data;
        }
      } catch (refreshErr) {
        console.warn('[ApiClient] Token refresh failed:', refreshErr.message);
      }
    }

    // 2. Conmutación a Fallback URL si falla la conexión al dominio principal (DNS, timeout o 502/503)
    if (_activeUrl === _primaryUrl && _fallbackUrl && (!err.response || err.response.status >= 500 || err.code === 'ENOTFOUND')) {
      console.warn(`[ApiClient] Switching to fallback API URL: ${_fallbackUrl}`);
      _activeUrl = _fallbackUrl;
      const fallbackUrl = getApiEndpoint(endpointPath);
      const fallbackRes = await axios({
        method,
        url: fallbackUrl,
        data,
        params,
        headers,
        timeout: options.timeout || 10000
      });
      return fallbackRes.data;
    }

    throw err;
  }
}

// Catálogo de llamadas estructuradas para el Launcher
const ApiClient = {
  setBaseUrl,
  setAuthHandlers,
  get activeUrl() { return _activeUrl; },

  // === Módulo Users ===
  users: {
    getMe: () => request('GET', 'users/me', { requiresAuth: true }),
    updateMe: (data) => request('PATCH', 'users/me', { data, requiresAuth: true }),
    syncVersion: (clientVersion) => request('POST', 'users/me/sync-version', { data: { clientVersion }, requiresAuth: true }),
    getProfile: (uidOrUsername) => request('GET', `users/${uidOrUsername}`, { requiresAuth: false }),
    search: (query) => request('GET', 'users/search', { params: { q: query }, requiresAuth: false }),
    verifyMicrosoft: (payload) => request('POST', 'users/microsoft/verify', { data: payload, requiresAuth: true }),
    checkMicrosoftVerified: (username, uuid) => request('GET', 'users/microsoft/status', { params: { username, uuid }, requiresAuth: false }),
    resolveEmail: (username) => request('GET', `users/resolve-email/${encodeURIComponent(username)}`, { requiresAuth: false }),
    getPendingVerify: (token) => request('GET', `users/microsoft/pending-verify/${token}`, { requiresAuth: false }),
    setPendingVerify: (token, data) => request('POST', 'users/microsoft/pending-verify', { data: { token, data }, requiresAuth: true })
  },

  // === Módulo Stats ===
  stats: {
    getMyStats: () => request('GET', 'stats/me', { requiresAuth: true }),
    getStats: (uid) => request('GET', `stats/${uid}`, { requiresAuth: true }),
    recordSession: (addedHours, extraStats) => request('POST', 'stats/record', { data: { addedHours, extraStats }, requiresAuth: true }),
    revertTodayStreak: () => request('POST', 'stats/revert-streak', { requiresAuth: true })
  },

  // === Módulo Presence ===
  presence: {
    heartbeat: (payload) => request('POST', 'presence/heartbeat', { data: payload, requiresAuth: true }),
    offline: () => request('POST', 'presence/offline', { requiresAuth: true }),
    getPresence: (uid) => request('GET', `presence/${uid}`, { requiresAuth: true }),
    getBatchPresence: (uids) => request('GET', 'presence/batch', { params: { uids: Array.isArray(uids) ? uids.join(',') : uids }, requiresAuth: true })
  },

  // === Módulo Social & Amigos ===
  social: {
    getFriends: () => request('GET', 'social/friends', { requiresAuth: true }),
    getRequests: () => request('GET', 'social/requests', { requiresAuth: true }),
    sendRequest: (toUid) => request('POST', 'social/requests', { data: { toUid }, requiresAuth: true }),
    acceptRequest: (requestId) => request('POST', `social/requests/${requestId}/accept`, { requiresAuth: true }),
    rejectRequest: (requestId) => request('POST', `social/requests/${requestId}/reject`, { requiresAuth: true }),
    removeFriend: (friendshipId) => request('DELETE', `social/friends/${friendshipId}`, { requiresAuth: true }),
    getBlocked: () => request('GET', 'social/blocks', { requiresAuth: true }),
    blockUser: (targetUid) => request('POST', `social/blocks/${targetUid}`, { requiresAuth: true }),
    unblockUser: (targetUid) => request('DELETE', `social/blocks/${targetUid}`, { requiresAuth: true })
  },

  // === Módulo Chat ===
  chat: {
    getMessages: (channelId, before) => request('GET', `chat/channels/${channelId}/messages`, { params: { before }, requiresAuth: true }),
    sendMessage: (channelId, content, replyTo) => request('POST', `chat/channels/${channelId}/messages`, { data: { content, replyTo }, requiresAuth: true }),
    editMessage: (channelId, msgId, content) => request('PATCH', `chat/channels/${channelId}/messages/${msgId}`, { data: { content }, requiresAuth: true }),
    deleteMessage: (channelId, msgId) => request('DELETE', `chat/channels/${channelId}/messages/${msgId}`, { requiresAuth: true }),
    markRead: (channelId) => request('POST', `chat/channels/${channelId}/read`, { requiresAuth: true }),
    getReplyState: (channelId) => request('GET', `chat/channels/${channelId}/reply-state`, { requiresAuth: true }),
    setReplyState: (channelId, reply) => request('POST', `chat/channels/${channelId}/reply-state`, { data: { reply }, requiresAuth: true }),
    createGroup: (name, memberUids, icon) => request('POST', 'chat/groups', { data: { name, memberUids, icon }, requiresAuth: true }),
    editGroup: (groupId, updates) => request('PATCH', `chat/groups/${groupId}`, { data: updates, requiresAuth: true }),
    getGroupDetails: (groupId) => request('GET', `chat/groups/${groupId}`, { requiresAuth: true }),
    promoteGroupAdmin: (groupId, memberUid) => request('POST', `chat/groups/${groupId}/admins`, { data: { memberUid }, requiresAuth: true }),
    demoteGroupAdmin: (groupId, adminUid) => request('DELETE', `chat/groups/${groupId}/admins/${adminUid}`, { requiresAuth: true }),
    addGroupMembers: (groupId, memberUids) => request('POST', `chat/groups/${groupId}/members`, { data: { memberUids }, requiresAuth: true }),
    removeGroupMember: (groupId, memberUid) => request('DELETE', `chat/groups/${groupId}/members/${memberUid}`, { requiresAuth: true })
  },

  // === Módulo Inbox ===
  inbox: {
    getInbox: (before) => request('GET', 'inbox', { params: { before }, requiresAuth: true }),
    getSent: (before) => request('GET', 'inbox/sent', { params: { before }, requiresAuth: true }),
    markRead: (msgId) => request('PATCH', `inbox/${msgId}/read`, { requiresAuth: true }),
    send: (payload) => request('POST', 'inbox/send', { data: payload, requiresAuth: true })
  },

  // === Módulo Workshop ===
  workshop: {
    getItems: (type = 'modpack', sort = 'trending') => request('GET', 'workshop/items', { params: { type, sort }, requiresAuth: false }),
    getItem: (id) => request('GET', `workshop/items/${id}`, { requiresAuth: false }),
    getMyItems: () => request('GET', 'workshop/my-items', { requiresAuth: true }),
    getAdminItems: (status = 'all') => request('GET', 'workshop/admin/items', { params: { status }, requiresAuth: true }),
    submitItem: (data) => request('POST', 'workshop/items', { data, requiresAuth: true }),
    updateItem: (id, data) => request('PATCH', `workshop/items/${id}`, { data, requiresAuth: true }),
    deleteItem: (id) => request('DELETE', `workshop/items/${id}`, { requiresAuth: true }),
    updateStatus: (id, status, note, isOfficial) => request('PATCH', `workshop/items/${id}/status`, { data: { status, note, isOfficial }, requiresAuth: true }),
    moderateItem: (id, data) => request('PATCH', `workshop/items/${id}/status`, { data, requiresAuth: true }),
    toggleLike: (id) => request('POST', `workshop/items/${id}/like`, { requiresAuth: true }),
    recordDownload: (id) => request('POST', `workshop/items/${id}/download`, { requiresAuth: false }),
    recordView: (id) => request('POST', `workshop/items/${id}/view`, { requiresAuth: false })
  },

  // === Módulo Reviews ===
  reviews: {
    getReviews: () => request('GET', 'reviews', { requiresAuth: false }),
    submitReview: (data) => request('POST', 'reviews', { data, requiresAuth: false })
  },

  // === Módulo Stats ===
  stats: {
    getMyStats: () => request('GET', 'stats/me', { requiresAuth: true }),
    getUserStats: (uid) => request('GET', `stats/${uid}`, { requiresAuth: false }),
    record: (data) => request('POST', 'stats/record', { data, requiresAuth: true })
  },

  // === Módulo Storage R2 ===
  storage: {
    uploadAvatar: (fileBuffer, mimeType) => request('POST', 'storage/upload/avatar', {
      data: fileBuffer,
      headers: { 'Content-Type': mimeType },
      requiresAuth: true
    }),
    uploadIcon: (fileBuffer, mimeType) => request('POST', 'storage/upload/icon', {
      data: fileBuffer,
      headers: { 'Content-Type': mimeType },
      requiresAuth: true
    }),
    uploadCloudIcon: (fileBuffer, mimeType, profileId) => request('POST', `storage/upload/cloud-icon?profileId=${encodeURIComponent(profileId)}`, {
      data: fileBuffer,
      headers: {
        'Content-Type': mimeType,
        'X-Profile-Id': String(profileId)
      },
      requiresAuth: true,
      timeout: 20000
    })
  },

  // === Módulo Cloud Installations ===
  cloudInstallations: {
    list: () => request('GET', 'cloud-installations', { requiresAuth: true, timeout: 15000 }),
    upsert: (id, payload) => request('PUT', `cloud-installations/${encodeURIComponent(id)}`, {
      data: payload,
      requiresAuth: true,
      timeout: 15000
    }),
    remove: (id) => request('DELETE', `cloud-installations/${encodeURIComponent(id)}`, {
      requiresAuth: true,
      timeout: 15000
    })
  }
};

module.exports = ApiClient;
