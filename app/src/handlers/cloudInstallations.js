const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { app } = require('electron');

const paths = require('../utils/paths');
const ApiClient = require('../utils/apiClient');
const profileManager = require('./profiles');
const modManager = require('./mods');

const MAX_CLOUD_INSTALLATIONS = 35;
const PER_PROFILE_COOLDOWN_MS = 15 * 1000; // 15s between edits of the same installation
const WRITE_WINDOW_MS = 60 * 1000;         // 1 minute sliding window
const MAX_WRITES_PER_MINUTE = 3;           // max 3 auto-sync updates per minute

class CloudInstallationsManager {
  constructor() {
    this._getAuth = null;
    this._getUserData = null;
    this._getMainWindow = null;

    // Rate-limit & coalescing state
    this._pendingProfileIds = new Set();
    this._lastPushByProfile = new Map(); // profileId -> epoch ms
    this._writeTimestamps = [];          // epoch ms of recent auto-sync updates
    this._flushTimer = null;
    this._isFlushing = false;
    this._isSyncingAll = false;
  }

  init({ getAuth, getUserData, getMainWindow }) {
    this._getAuth = getAuth;
    this._getUserData = getUserData;
    this._getMainWindow = getMainWindow;
  }

  _notifyRenderer(payload = {}) {
    try {
      const win = typeof this._getMainWindow === 'function' ? this._getMainWindow() : null;
      if (win && !win.isDestroyed() && win.webContents) {
        win.webContents.send('cloud-profiles-updated', payload);
      }
    } catch (_) {}
  }

  _getDocumentsDir() {
    try {
      if (app && typeof app.getPath === 'function') {
        return app.getPath('documents');
      }
    } catch (_) {}
    return path.join(os.homedir(), 'Documents');
  }

  async getCloudAuthState() {
    const userData = typeof this._getUserData === 'function' ? this._getUserData() : null;
    if (!userData || !userData.account_type || userData.account_type === 'offline') {
      return { eligible: false, reason: 'offline', uid: null, accountType: 'offline' };
    }

    if (userData.account_type !== 'helloworld' && userData.account_type !== 'microsoft') {
      return { eligible: false, reason: 'unsupported_account', uid: null, accountType: userData.account_type };
    }

    let auth = null;
    if (typeof this._getAuth === 'function') {
      try {
        auth = await this._getAuth();
      } catch (_) {}
    }

    const uid = (auth && auth.uid) || userData.firebase_ms_uid || userData.firebase_uid || (userData.account_type === 'microsoft' ? userData.uuid : null);
    if (!uid || typeof uid !== 'string' || uid.startsWith('local_')) {
      return { eligible: false, reason: 'not_authenticated', uid: null, accountType: userData.account_type };
    }

    return {
      eligible: true,
      reason: null,
      uid: String(uid).trim(),
      accountType: userData.account_type
    };
  }

  getSyncEligibleUidSync() {
    const userData = typeof this._getUserData === 'function' ? this._getUserData() : null;
    if (!userData || userData.account_type === 'offline') return null;
    const uid = userData.firebase_ms_uid || userData.firebase_uid || (userData.account_type === 'microsoft' ? userData.uuid : null);
    if (!uid || typeof uid !== 'string' || uid.startsWith('local_')) return null;
    return String(uid).trim();
  }

  /**
   * Filters loaded profiles so cloud profiles from another account on the same PC don't mix.
   * Local profiles (!cloud) are always visible. Cloud profiles are visible when their cloud_uid
   * matches the active authenticated account (including while offline with that account).
   */
  filterProfilesForCurrentUser(profilesData) {
    if (!profilesData || !profilesData.profiles) return profilesData;
    const currentUid = this.getSyncEligibleUidSync();
    const filtered = {};
    for (const [id, prof] of Object.entries(profilesData.profiles)) {
      if (!prof) continue;
      if (prof.cloud === true && prof.cloud_uid) {
        if (!currentUid || prof.cloud_uid !== currentUid) {
          continue;
        }
      }
      filtered[id] = prof;
    }
    return { profiles: filtered };
  }

  // --- Built-in vs Custom Icon Detection ---
  isBuiltInIcon(iconName) {
    if (!iconName || typeof iconName !== 'string') return true;
    const trimmed = iconName.trim();
    if (!trimmed) return true;
    if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return false;
    }
    const base = path.basename(trimmed);
    const uiProfilePath = path.join(__dirname, '../../ui/img/profiles', base);
    return fs.existsSync(uiProfilePath);
  }

  _readLocalCustomIcon(iconFilename) {
    if (!iconFilename || typeof iconFilename !== 'string') return null;
    const imgDir = paths.getProfilesImgDir();
    const fullPath = path.join(imgDir, path.basename(iconFilename));
    if (!fs.existsSync(fullPath)) return null;

    const buffer = fs.readFileSync(fullPath);
    if (!buffer || buffer.length === 0) return null;

    let mimeType = 'image/png';
    if (buffer.length >= 12 && buffer.toString('utf8', 0, 4) === 'RIFF' && buffer.toString('utf8', 8, 12) === 'WEBP') {
      mimeType = 'image/webp';
    } else if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      mimeType = 'image/jpeg';
    }
    return { buffer, mimeType };
  }

  // --- Portable Relative Paths ---
  toRelativeDirectory(absDir, profileId) {
    if (!absDir || typeof absDir !== 'string' || !absDir.trim()) {
      return `documents:MinecraftDirectories/${profileId}`;
    }

    const normAbs = path.resolve(absDir);
    const docsDir = path.resolve(this._getDocumentsDir());
    const mcDir = path.resolve(paths.getMcDir());

    const relDocs = path.relative(docsDir, normAbs);
    if (relDocs && !relDocs.startsWith('..') && !path.isAbsolute(relDocs)) {
      const posixRel = relDocs.split(path.sep).join('/');
      return `documents:${posixRel}`;
    }

    const relMc = path.relative(mcDir, normAbs);
    if (relMc === '') {
      return 'mcdir:';
    }
    if (relMc && !relMc.startsWith('..') && !path.isAbsolute(relMc)) {
      const posixRel = relMc.split(path.sep).join('/');
      return `mcdir:${posixRel}`;
    }

    // Custom absolute folder outside both roots -> safe portable fallback for other PCs
    return `documents:MinecraftDirectories/${profileId}`;
  }

  fromRelativeDirectory(dirRel, profileId) {
    const fallback = path.join(this._getDocumentsDir(), 'MinecraftDirectories', profileId);
    if (!dirRel || typeof dirRel !== 'string') return fallback;

    const colonIdx = dirRel.indexOf(':');
    if (colonIdx === -1) return fallback;

    const prefix = dirRel.slice(0, colonIdx);
    const relRaw = dirRel.slice(colonIdx + 1).trim();

    // Prevent path traversal
    const segments = relRaw ? relRaw.split('/').filter(Boolean) : [];
    if (segments.some(s => s === '..' || s === '.' || s.includes('\\') || s.includes(':'))) {
      return fallback;
    }

    let baseRoot = null;
    if (prefix === 'documents') {
      baseRoot = this._getDocumentsDir();
    } else if (prefix === 'mcdir') {
      baseRoot = paths.getMcDir();
    } else {
      return fallback;
    }

    const resolved = segments.length > 0 ? path.join(baseRoot, ...segments) : baseRoot;
    const checkRel = path.relative(path.resolve(baseRoot), path.resolve(resolved));
    if (checkRel.startsWith('..') || path.isAbsolute(checkRel)) {
      return fallback;
    }
    return resolved;
  }

  // --- Hardware-Aware RAM Clamping ---
  _parseRamToMB(val) {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'number' && !Number.isNaN(val)) {
      // Heuristic: values <= 128 are likely GB, larger are MB
      return val <= 128 ? Math.round(val * 1024) : Math.round(val);
    }
    const str = String(val).trim().toUpperCase();
    const m = str.match(/^(\d+(?:\.\d+)?)\s*(G|GB|M|MB)?$/);
    if (!m) return null;
    const num = parseFloat(m[1]);
    const unit = m[2] || '';
    if (unit === 'G' || unit === 'GB' || (!unit && num <= 128)) return Math.round(num * 1024);
    return Math.round(num);
  }

  clampRamForCurrentMachine(fields) {
    const out = { ...fields };
    try {
      const totalMemMB = Math.floor(os.totalmem() / (1024 * 1024));
      if (!totalMemMB || totalMemMB <= 0) return out;
      // Safe cap: 75% of system memory rounded down to 512 MB steps, minimum 1024 MB
      const maxSafeMB = Math.max(1024, Math.floor((totalMemMB * 0.75) / 512) * 512);

      const ramMaxMB = this._parseRamToMB(out.ram_max);
      if (ramMaxMB && ramMaxMB > maxSafeMB) {
        out.ram_max = typeof out.ram_max === 'string' && out.ram_max.toUpperCase().includes('G')
          ? `${Math.max(1, Math.floor(maxSafeMB / 1024))}G`
          : maxSafeMB;
      }

      const effectiveMaxMB = this._parseRamToMB(out.ram_max) || maxSafeMB;
      const ramMinMB = this._parseRamToMB(out.ram_min);
      if (ramMinMB && ramMinMB > effectiveMaxMB) {
        out.ram_min = typeof out.ram_min === 'string' && out.ram_min.toUpperCase().includes('G')
          ? `${Math.max(1, Math.floor(effectiveMaxMB / 1024))}G`
          : effectiveMaxMB;
      }

      if (typeof out.jvm_args === 'string' && out.jvm_args.trim()) {
        out.jvm_args = out.jvm_args.replace(/-Xmx(\d+)([GMgm])/g, (match, numStr, unit) => {
          const valMB = unit.toUpperCase() === 'G' ? parseInt(numStr, 10) * 1024 : parseInt(numStr, 10);
          if (valMB > maxSafeMB) {
            return maxSafeMB % 1024 === 0 ? `-Xmx${maxSafeMB / 1024}G` : `-Xmx${maxSafeMB}M`;
          }
          return match;
        });
        out.jvm_args = out.jvm_args.replace(/-Xms(\d+)([GMgm])/g, (match, numStr, unit) => {
          const valMB = unit.toUpperCase() === 'G' ? parseInt(numStr, 10) * 1024 : parseInt(numStr, 10);
          if (valMB > maxSafeMB) {
            return maxSafeMB % 1024 === 0 ? `-Xms${maxSafeMB / 1024}G` : `-Xms${maxSafeMB}M`;
          }
          return match;
        });
      }
    } catch (_) {}
    return out;
  }

  // --- External Addons Scanner ---
  async scanExternalAddons(profileId) {
    const profilesData = profileManager.loadProfiles();
    const profile = profilesData?.profiles?.[profileId];
    if (!profile) {
      return { success: false, error: 'profile_not_found', externalAddons: [], syncableCount: 0 };
    }

    const mcDir = paths.getMcDir();
    const profileDir = profile.directory || mcDir;
    const trackedAddons = Array.isArray(profile.addons) ? profile.addons : [];

    // Build quick lookup of tracked Modrinth filenames per type
    const trackedByType = {
      mod: new Set(),
      resourcepack: new Set(),
      shader: new Set()
    };

    let syncableCount = 0;
    for (const a of trackedAddons) {
      if (!a || !a.project_id) continue;
      const t = (a.type || 'mod').toLowerCase();
      if (!trackedByType[t]) continue;
      syncableCount++;
      if (a.filename) {
        const lower = String(a.filename).toLowerCase();
        trackedByType[t].add(lower);
        trackedByType[t].add(lower.replace(/\.disabled$/, ''));
        trackedByType[t].add(lower.endsWith('.disabled') ? lower : lower + '.disabled');
      }
    }

    const dirsToScan = [
      { type: 'mod', dir: path.join(profileDir, 'mods') },
      { type: 'resourcepack', dir: path.join(profileDir, 'resourcepacks') },
      { type: 'shader', dir: path.join(profileDir, 'shaderpacks') }
    ];

    const externalAddons = [];
    for (const entry of dirsToScan) {
      try {
        if (!fs.existsSync(entry.dir)) continue;
        const res = await modManager.getInstalledAddons(entry.dir, entry.type);
        if (res && res.success && Array.isArray(res.mods)) {
          for (const file of res.mods) {
            if (!file || !file.filename) continue;
            const fnLower = String(file.filename).toLowerCase();
            if (!trackedByType[entry.type].has(fnLower)) {
              externalAddons.push({
                filename: file.filename,
                display_name: file.display_name || file.filename,
                type: entry.type
              });
            }
          }
        }
      } catch (err) {
        console.warn(`[CloudInstallations] Error scanning ${entry.type}:`, err.message);
      }
    }

    return {
      success: true,
      externalAddons,
      syncableCount
    };
  }

  _buildCloudPayload(profileId, profile) {
    const isDefaultIcon = this.isBuiltInIcon(profile.icon);
    const allowedTypes = new Set(['mod', 'resourcepack', 'shader']);
    const cleanAddons = [];

    if (Array.isArray(profile.addons)) {
      for (const a of profile.addons) {
        if (!a || !a.project_id) continue;
        const t = String(a.type || 'mod').toLowerCase();
        if (!allowedTypes.has(t)) continue;
        const state = a.state === 'disabled' || a.enabled === false ? 'disabled' : 'enabled';
        cleanAddons.push({
          project_id: a.project_id,
          version_id: a.version_id || '',
          filename: a.filename || '',
          type: t,
          state,
          enabled: state !== 'disabled'
        });
      }
    }

    return {
      schema_version: 1,
      name: profile.name || 'Minecraft',
      version: profile.version || '',
      loader_version: profile.loader_version || null,
      icon_type: isDefaultIcon ? 'default' : 'custom',
      icon_name: isDefaultIcon ? (profile.icon || 'default.png') : null,
      directory_rel: this.toRelativeDirectory(profile.directory, profileId),
      jvm_args: profile.jvm_args || '',
      ram_min: profile.ram_min ?? null,
      ram_max: profile.ram_max ?? null,
      width: profile.width ?? null,
      height: profile.height ?? null,
      enable_custom_skins: profile.enable_custom_skins !== false,
      last_played: profile.last_played || null,
      addons: cleanAddons
    };
  }

  _clearCloudFields(profile) {
    profile.cloud = false;
    delete profile.cloud_uid;
    delete profile.cloud_updated_at;
    delete profile.cloud_dirty;
    delete profile.cloud_icon_dirty;
  }

  _classifyApiError(err) {
    const status = err?.response?.status || null;
    const data = err?.response?.data || {};
    const code = data?.error || err?.code || null;
    const retryAfter = Number(data?.retryAfterSec || err?.response?.headers?.['retry-after'] || 0) || 0;
    const isNetwork = !err?.response || status >= 500;
    return { status, code, data, retryAfter, isNetwork, message: data?.message || err?.message || 'Unknown error' };
  }

  async _uploadCustomIcon(profileId, profile) {
    const iconData = this._readLocalCustomIcon(profile.icon);
    if (!iconData) return null;
    const res = await ApiClient.storage.uploadCloudIcon(iconData.buffer, iconData.mimeType, profileId);
    if (res && res.success && res.r2Key) {
      return { r2Key: res.r2Key, iconUrl: res.iconUrl };
    }
    return null;
  }

  // --- User Actions: Upload / Download / Delete ---

  async getStatus() {
    const auth = await this.getCloudAuthState();
    const profilesData = profileManager.loadProfiles();
    let localCloudCount = 0;
    if (auth.eligible && profilesData?.profiles) {
      for (const p of Object.values(profilesData.profiles)) {
        if (p && p.cloud === true && p.cloud_uid === auth.uid) {
          localCloudCount++;
        }
      }
    }
    return {
      eligible: auth.eligible,
      reason: auth.reason,
      uid: auth.uid,
      accountType: auth.accountType,
      count: localCloudCount,
      limit: MAX_CLOUD_INSTALLATIONS
    };
  }

  async uploadProfileToCloud(profileId, { confirmExternal = false } = {}) {
    const auth = await this.getCloudAuthState();
    if (!auth.eligible) {
      return { success: false, error: 'auth_required', reason: auth.reason };
    }

    const profilesData = profileManager.loadProfiles();
    const profile = profilesData?.profiles?.[profileId];
    if (!profile) {
      return { success: false, error: 'profile_not_found' };
    }
    if (profile.isBuiltIn || profileManager.isReservedName(profile.name)) {
      return { success: false, error: 'reserved_profile' };
    }

    // 1. Scan for external addons unless user already confirmed
    if (!confirmExternal) {
      const scan = await this.scanExternalAddons(profileId);
      if (scan.success && scan.externalAddons.length > 0) {
        return {
          success: false,
          requiresExternalConfirm: true,
          externalAddons: scan.externalAddons,
          syncableCount: scan.syncableCount
        };
      }
    }

    // 2. Local quick limit check (server also enforces strictly)
    let localCloudCount = 0;
    for (const [id, p] of Object.entries(profilesData.profiles)) {
      if (id !== profileId && p && p.cloud === true && p.cloud_uid === auth.uid) {
        localCloudCount++;
      }
    }
    if (localCloudCount >= MAX_CLOUD_INSTALLATIONS) {
      return { success: false, error: 'cloud_limit_reached', limit: MAX_CLOUD_INSTALLATIONS };
    }

    try {
      const payload = this._buildCloudPayload(profileId, profile);
      let iconR2Key = null;

      if (payload.icon_type === 'custom') {
        const uploaded = await this._uploadCustomIcon(profileId, profile);
        if (uploaded) {
          iconR2Key = uploaded.r2Key;
        } else {
          // Local custom icon file missing -> fallback cleanly to default
          payload.icon_type = 'default';
          payload.icon_name = 'default.png';
        }
      }

      const res = await ApiClient.cloudInstallations.upsert(profileId, {
        name: payload.name,
        data: payload,
        iconR2Key,
        mode: 'create'
      });

      if (!res || !res.success) {
        return { success: false, error: res?.error || 'upload_failed' };
      }

      // Update local profile cleanly with minimal sync metadata (no duplication!)
      const freshData = profileManager.loadProfiles();
      if (freshData?.profiles?.[profileId]) {
        freshData.profiles[profileId].cloud = true;
        freshData.profiles[profileId].cloud_uid = auth.uid;
        freshData.profiles[profileId].cloud_updated_at = res.updatedAt || Date.now();
        freshData.profiles[profileId].cloud_dirty = false;
        delete freshData.profiles[profileId].cloud_icon_dirty;
        profileManager.saveProfiles(freshData);
      }

      this._lastPushByProfile.set(profileId, Date.now());
      this._notifyRenderer({ action: 'uploaded', profileId });
      return { success: true, updatedAt: res.updatedAt };
    } catch (err) {
      const info = this._classifyApiError(err);
      if (info.status === 403 && info.code === 'cloud_limit_reached') {
        return { success: false, error: 'cloud_limit_reached', limit: info.data?.limit || MAX_CLOUD_INSTALLATIONS };
      }
      if (info.status === 429) {
        return { success: false, error: 'rate_limited', retryAfterSec: info.retryAfter };
      }
      console.error('[CloudInstallations] Upload error:', info.message);
      return { success: false, error: info.code || 'upload_failed', message: info.message };
    }
  }

  async downloadProfileFromCloud(profileId) {
    const auth = await this.getCloudAuthState();
    if (!auth.eligible) {
      return { success: false, error: 'auth_required', reason: auth.reason };
    }

    const profilesData = profileManager.loadProfiles();
    const profile = profilesData?.profiles?.[profileId];
    if (!profile) {
      return { success: false, error: 'profile_not_found' };
    }

    try {
      // If custom icon is missing locally, try downloading from cloud BEFORE deleting from backend
      if (!this.isBuiltInIcon(profile.icon)) {
        const localIconPath = path.join(paths.getProfilesImgDir(), path.basename(profile.icon || `${profileId}.png`));
        if (!fs.existsSync(localIconPath)) {
          try {
            const listRes = await ApiClient.cloudInstallations.list();
            const remote = listRes?.items?.find(i => i.id === profileId);
            if (remote?.data?.icon_url) {
              const savedIcon = await profileManager.saveIconFromUrl(profileId, remote.data.icon_url);
              if (savedIcon) {
                profile.icon = savedIcon;
              }
            }
          } catch (_) {}
        }
      }

      await ApiClient.cloudInstallations.remove(profileId);

      // Keep full profile & addons locally, flip cloud -> false and strip sync fields
      const freshData = profileManager.loadProfiles();
      if (freshData?.profiles?.[profileId]) {
        if (profile.icon) freshData.profiles[profileId].icon = profile.icon;
        this._clearCloudFields(freshData.profiles[profileId]);
        profileManager.saveProfiles(freshData);
      }

      this._pendingProfileIds.delete(profileId);
      this._notifyRenderer({ action: 'downloaded', profileId });
      return { success: true };
    } catch (err) {
      const info = this._classifyApiError(err);
      if (info.status === 404) {
        // Already gone on server -> cleanly mark local
        const freshData = profileManager.loadProfiles();
        if (freshData?.profiles?.[profileId]) {
          this._clearCloudFields(freshData.profiles[profileId]);
          profileManager.saveProfiles(freshData);
        }
        this._pendingProfileIds.delete(profileId);
        this._notifyRenderer({ action: 'downloaded', profileId });
        return { success: true };
      }
      if (info.status === 429) {
        return { success: false, error: 'rate_limited', retryAfterSec: info.retryAfter };
      }
      console.error('[CloudInstallations] Download/remove error:', info.message);
      return { success: false, error: info.code || 'download_failed', message: info.message };
    }
  }

  async deleteFromCloudIfSynced(profileId) {
    const profilesData = profileManager.loadProfiles();
    const profile = profilesData?.profiles?.[profileId];
    if (!profile || profile.cloud !== true) {
      return { success: true, skipped: true };
    }

    const auth = await this.getCloudAuthState();
    if (!auth.eligible || (profile.cloud_uid && profile.cloud_uid !== auth.uid)) {
      return { success: true, skipped: true };
    }

    try {
      await ApiClient.cloudInstallations.remove(profileId);
      this._pendingProfileIds.delete(profileId);
      return { success: true, deletedFromCloud: true };
    } catch (err) {
      const info = this._classifyApiError(err);
      if (info.status === 404) {
        this._pendingProfileIds.delete(profileId);
        return { success: true, deletedFromCloud: true };
      }
      console.warn('[CloudInstallations] Failed to delete from cloud:', info.message);
      return { success: false, error: info.code || 'cloud_delete_failed', message: info.message };
    }
  }

  // --- Rate-Limited Auto-Sync Queue (15s per profile + max 3/min) ---

  scheduleAutoSync(profileId, { iconChanged = false } = {}) {
    try {
      const profilesData = profileManager.loadProfiles();
      const profile = profilesData?.profiles?.[profileId];
      if (!profile || profile.cloud !== true) return;

      const currentUid = this.getSyncEligibleUidSync();
      if (!currentUid || (profile.cloud_uid && profile.cloud_uid !== currentUid)) return;

      profile.cloud_dirty = true;
      if (iconChanged) {
        profile.cloud_icon_dirty = true;
      }
      profileManager.saveProfiles(profilesData);

      this._pendingProfileIds.add(profileId);
      this._scheduleNextFlush();
    } catch (err) {
      console.warn('[CloudInstallations] scheduleAutoSync error:', err.message);
    }
  }

  _pruneWriteTimestamps(now) {
    this._writeTimestamps = this._writeTimestamps.filter(ts => now - ts < WRITE_WINDOW_MS);
  }

  _computeNextFlushDelayMs() {
    const now = Date.now();
    this._pruneWriteTimestamps(now);

    let windowWait = 0;
    if (this._writeTimestamps.length >= MAX_WRITES_PER_MINUTE) {
      const oldest = this._writeTimestamps[0];
      windowWait = Math.max(250, WRITE_WINDOW_MS - (now - oldest) + 250);
    }

    let minProfileWait = Infinity;
    for (const id of this._pendingProfileIds) {
      const last = this._lastPushByProfile.get(id) || 0;
      const wait = Math.max(0, PER_PROFILE_COOLDOWN_MS - (now - last));
      if (wait < minProfileWait) minProfileWait = wait;
    }

    if (minProfileWait === Infinity) return null;
    // Small 1.5s coalescing buffer if ready immediately so rapid edits batch cleanly
    const baseWait = minProfileWait === 0 ? 1500 : minProfileWait;
    return Math.max(windowWait, baseWait);
  }

  _scheduleNextFlush(explicitDelayMs = null) {
    if (this._flushTimer) {
      clearTimeout(this._flushTimer);
      this._flushTimer = null;
    }
    if (this._pendingProfileIds.size === 0) return;

    const delay = explicitDelayMs !== null ? explicitDelayMs : this._computeNextFlushDelayMs();
    if (delay === null) return;

    this._flushTimer = setTimeout(() => {
      this._flushTimer = null;
      this._flushPendingQueue();
    }, delay);
  }

  hasReadyPendingSync() {
    if (this._pendingProfileIds.size === 0) return false;
    const now = Date.now();
    this._pruneWriteTimestamps(now);
    if (this._writeTimestamps.length >= MAX_WRITES_PER_MINUTE) return false;
    for (const id of this._pendingProfileIds) {
      const last = this._lastPushByProfile.get(id) || 0;
      if (now - last >= PER_PROFILE_COOLDOWN_MS) return true;
    }
    return false;
  }

  async flushReadyPendingBeforeQuit(timeoutMs = 2000) {
    if (!this.hasReadyPendingSync()) return;
    if (this._flushTimer) {
      clearTimeout(this._flushTimer);
      this._flushTimer = null;
    }
    try {
      await Promise.race([
        this._flushPendingQueue(),
        new Promise(resolve => setTimeout(resolve, timeoutMs))
      ]);
    } catch (_) {}
  }

  async _flushPendingQueue() {
    if (this._isFlushing || this._pendingProfileIds.size === 0) return;
    this._isFlushing = true;

    try {
      const auth = await this.getCloudAuthState();
      if (!auth.eligible) {
        this._pendingProfileIds.clear();
        return;
      }

      const now = Date.now();
      this._pruneWriteTimestamps(now);

      if (this._writeTimestamps.length >= MAX_WRITES_PER_MINUTE) {
        this._scheduleNextFlush();
        return;
      }

      // Pick first pending profile whose per-profile cooldown has elapsed
      let targetId = null;
      for (const id of this._pendingProfileIds) {
        const last = this._lastPushByProfile.get(id) || 0;
        if (now - last >= PER_PROFILE_COOLDOWN_MS) {
          targetId = id;
          break;
        }
      }

      if (!targetId) {
        this._scheduleNextFlush();
        return;
      }

      const profilesData = profileManager.loadProfiles();
      const profile = profilesData?.profiles?.[targetId];
      if (!profile || profile.cloud !== true || profile.cloud_uid !== auth.uid) {
        this._pendingProfileIds.delete(targetId);
        return;
      }

      const payload = this._buildCloudPayload(targetId, profile);
      let iconR2Key = null;

      // Upload custom icon only if it changed (or was marked icon-dirty)
      if (payload.icon_type === 'custom' && profile.cloud_icon_dirty) {
        const uploaded = await this._uploadCustomIcon(targetId, profile);
        if (uploaded) {
          iconR2Key = uploaded.r2Key;
        }
      }

      try {
        const res = await ApiClient.cloudInstallations.upsert(targetId, {
          name: payload.name,
          data: payload,
          iconR2Key,
          mode: 'update'
        });

        const pushDoneAt = Date.now();
        this._lastPushByProfile.set(targetId, pushDoneAt);
        this._writeTimestamps.push(pushDoneAt);
        this._pendingProfileIds.delete(targetId);

        const freshData = profileManager.loadProfiles();
        if (freshData?.profiles?.[targetId]) {
          freshData.profiles[targetId].cloud_updated_at = res?.updatedAt || pushDoneAt;
          freshData.profiles[targetId].cloud_dirty = false;
          delete freshData.profiles[targetId].cloud_icon_dirty;
          profileManager.saveProfiles(freshData);
        }
      } catch (err) {
        const info = this._classifyApiError(err);

        if (info.status === 404 && info.code === 'not_found') {
          // Authoritative: deleted or pulled down from another PC -> demote to local cleanly
          console.log(`[CloudInstallations] Profile ${targetId} no longer exists in cloud (404). Marking cloud=false locally.`);
          this._pendingProfileIds.delete(targetId);
          const freshData = profileManager.loadProfiles();
          if (freshData?.profiles?.[targetId]) {
            this._clearCloudFields(freshData.profiles[targetId]);
            profileManager.saveProfiles(freshData);
          }
          this._notifyRenderer({ action: 'demoted_missing', profileId: targetId });
        } else if (info.status === 429) {
          // Server rate limit hit -> honor Retry-After
          const waitMs = Math.max(5000, (info.retryAfter || 15) * 1000);
          console.log(`[CloudInstallations] Rate limited on ${targetId}; retrying in ${Math.round(waitMs / 1000)}s`);
          this._scheduleNextFlush(waitMs);
          return;
        } else {
          // Network or 5xx error: keep cloud: true + cloud_dirty: true for later reconnect sync
          console.warn(`[CloudInstallations] Auto-sync deferred for ${targetId} (${info.message})`);
          this._pendingProfileIds.delete(targetId);
        }
      }
    } finally {
      this._isFlushing = false;
      if (this._pendingProfileIds.size > 0 && !this._flushTimer) {
        this._scheduleNextFlush();
      }
    }
  }

  // --- Full Bidirectional Reconciliation ---

  async syncAllFromCloud() {
    if (this._isSyncingAll) return { success: true, skipped: true };
    const auth = await this.getCloudAuthState();
    if (!auth.eligible) {
      return { success: false, skipped: true, reason: auth.reason };
    }

    this._isSyncingAll = true;
    try {
      let listRes;
      try {
        listRes = await ApiClient.cloudInstallations.list();
      } catch (err) {
        // Network/server/auth error -> DO NOT touch local profiles (offline resilience!)
        const info = this._classifyApiError(err);
        console.warn(`[CloudInstallations] syncAllFromCloud skipped due to error (${info.status || 'network'}): ${info.message}`);
        return { success: false, offline: info.isNetwork, error: info.code || info.message };
      }

      if (!listRes || listRes.success !== true || !Array.isArray(listRes.items)) {
        return { success: false, error: 'invalid_response' };
      }

      // Authoritative cloud list received (HTTP 200)
      const remoteMap = new Map();
      for (const item of listRes.items) {
        if (item && item.id) remoteMap.set(item.id, item);
      }

      const profilesData = profileManager.loadProfiles();
      if (!profilesData.profiles) profilesData.profiles = {};
      const localProfiles = profilesData.profiles;
      let modified = false;
      const dirtyToPush = [];

      // Step A: Reconcile existing local profiles belonging to this user's cloud
      for (const [id, local] of Object.entries(localProfiles)) {
        if (!local || local.isBuiltIn || profileManager.isReservedName(local.name)) continue;
        if (local.cloud !== true || local.cloud_uid !== auth.uid) continue;

        const remote = remoteMap.get(id);
        if (!remote) {
          // Authoritatively absent from cloud -> deleted/pulled on another device
          this._clearCloudFields(local);
          modified = true;
          continue;
        }

        // Present on both local and remote
        if (local.cloud_dirty === true) {
          // Offline local edits win! Schedule push to cloud
          dirtyToPush.push(id);
          continue;
        }

        const remoteUpdatedAt = Number(remote.updatedAt) || 0;
        const localUpdatedAt = Number(local.cloud_updated_at) || 0;
        if (remoteUpdatedAt > localUpdatedAt) {
          const rData = remote.data || {};
          const clamped = this.clampRamForCurrentMachine({
            ram_min: rData.ram_min,
            ram_max: rData.ram_max,
            jvm_args: rData.jvm_args || ''
          });

          local.name = rData.name || remote.name || local.name;
          local.version = rData.version || local.version;
          if (rData.loader_version) local.loader_version = rData.loader_version;
          local.jvm_args = clamped.jvm_args;
          if (clamped.ram_min !== null && clamped.ram_min !== undefined) local.ram_min = clamped.ram_min;
          if (clamped.ram_max !== null && clamped.ram_max !== undefined) local.ram_max = clamped.ram_max;
          if (rData.width) local.width = rData.width;
          if (rData.height) local.height = rData.height;
          if (typeof rData.enable_custom_skins === 'boolean') local.enable_custom_skins = rData.enable_custom_skins;
          if (rData.last_played && (!local.last_played || rData.last_played > local.last_played)) {
            local.last_played = rData.last_played;
          }

          // Merge addons: replace cloud-tracked types while preserving any local datapacks
          const preservedDatapacks = Array.isArray(local.addons)
            ? local.addons.filter(a => a && a.type === 'datapack')
            : [];
          const syncedAddons = Array.isArray(rData.addons) ? rData.addons : [];
          local.addons = [...syncedAddons, ...preservedDatapacks];

          // Update icon if changed
          if (rData.icon_type === 'default' && rData.icon_name) {
            local.icon = rData.icon_name;
          } else if (rData.icon_type === 'custom' && rData.icon_url) {
            try {
              const saved = await profileManager.saveIconFromUrl(id, rData.icon_url);
              if (saved) local.icon = saved;
            } catch (_) {}
          }

          local.cloud_updated_at = remoteUpdatedAt;
          local.cloud_dirty = false;
          modified = true;
        }
      }

      // Step B: Hydrate remote-only cloud installations onto this PC
      for (const [id, remote] of remoteMap.entries()) {
        if (localProfiles[id]) continue;
        const rData = remote.data || {};
        const clamped = this.clampRamForCurrentMachine({
          ram_min: rData.ram_min,
          ram_max: rData.ram_max,
          jvm_args: rData.jvm_args || ''
        });

        let localIcon = 'default.png';
        if (rData.icon_type === 'custom' && rData.icon_url) {
          try {
            localIcon = await profileManager.saveIconFromUrl(id, rData.icon_url);
          } catch (_) {
            localIcon = 'default.png';
          }
        } else if (rData.icon_name) {
          localIcon = rData.icon_name;
        }

        const resolvedDir = this.fromRelativeDirectory(rData.directory_rel, id);

        localProfiles[id] = {
          name: rData.name || remote.name || 'Minecraft',
          version: rData.version || '',
          ...(rData.loader_version ? { loader_version: rData.loader_version } : {}),
          icon: localIcon,
          directory: resolvedDir,
          jvm_args: clamped.jvm_args || '',
          ...(clamped.ram_min !== null && clamped.ram_min !== undefined ? { ram_min: clamped.ram_min } : {}),
          ...(clamped.ram_max !== null && clamped.ram_max !== undefined ? { ram_max: clamped.ram_max } : {}),
          ...(rData.width ? { width: rData.width } : {}),
          ...(rData.height ? { height: rData.height } : {}),
          java_path: '',
          enable_custom_skins: rData.enable_custom_skins !== false,
          ...(rData.last_played ? { last_played: rData.last_played } : {}),
          addons: Array.isArray(rData.addons) ? rData.addons : [],
          cloud: true,
          cloud_uid: auth.uid,
          cloud_updated_at: Number(remote.updatedAt) || Date.now(),
          cloud_dirty: false
        };
        modified = true;
      }

      if (modified) {
        profileManager.saveProfiles(profilesData);
        this._notifyRenderer({ action: 'synced_all', count: listRes.items.length });
      }

      for (const dirtyId of dirtyToPush) {
        this._pendingProfileIds.add(dirtyId);
      }
      if (dirtyToPush.length > 0) {
        this._scheduleNextFlush();
      }

      return { success: true, count: listRes.items.length, limit: listRes.limit || MAX_CLOUD_INSTALLATIONS, modified };
    } finally {
      this._isSyncingAll = false;
    }
  }
}

module.exports = new CloudInstallationsManager();
