import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import type { Env, CustomVariables } from '../types/env';

export const cloudInstallationsApp = new Hono<{ Bindings: Env; Variables: CustomVariables }>();

const MAX_CLOUD_INSTALLATIONS = 35;
const MAX_PAYLOAD_BYTES = 256 * 1024; // 256 KB max JSON payload
const MAX_ADDONS_PER_INSTALLATION = 500;
const UPDATE_COOLDOWN_MS = 15 * 1000; // 15 seconds between edits per installation
const UPDATE_WINDOW_MS = 60 * 1000; // 1 minute sliding window
const MAX_UPDATES_PER_MINUTE = 3;
const MAX_TOGGLES_PER_MINUTE = 10;
const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

function isEligibleCloudUid(uid: string | undefined): uid is string {
  if (!uid || typeof uid !== 'string') return false;
  const trimmed = uid.trim();
  if (!trimmed || trimmed.startsWith('local_')) return false;
  return true;
}

function parseUpdatedAtMs(row: { updated_at_ms?: number | null; updated_at?: string | null }): number {
  if (typeof row.updated_at_ms === 'number' && row.updated_at_ms > 0) {
    return row.updated_at_ms;
  }
  if (row.updated_at) {
    // SQLite CURRENT_TIMESTAMP is UTC "YYYY-MM-DD HH:MM:SS"
    const normalized = row.updated_at.includes('T') ? row.updated_at : row.updated_at.replace(' ', 'T') + 'Z';
    const parsed = Date.parse(normalized);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
}

async function cleanupOldRateLimits(db: D1Database, now: number): Promise<void> {
  try {
    await db.prepare('DELETE FROM cloud_sync_rate_limits WHERE created_at < ?')
      .bind(now - 2 * 60 * 1000)
      .run();
  } catch (_) {}
}

async function checkAndRecordRateLimit(
  db: D1Database,
  uid: string,
  installationId: string,
  action: 'update' | 'create' | 'delete'
): Promise<{ allowed: true } | { allowed: false; retryAfterSec: number; reason: string }> {
  const now = Date.now();
  const windowStart = now - UPDATE_WINDOW_MS;

  if (action === 'update') {
    // 1. Per-installation cooldown (15s)
    const lastForInst = await db.prepare(
      `SELECT MAX(created_at) AS last_ts
       FROM cloud_sync_rate_limits
       WHERE uid = ? AND installation_id = ? AND action = 'update' AND created_at > ?`
    ).bind(uid, installationId, now - UPDATE_COOLDOWN_MS).first<{ last_ts: number | null }>();

    if (lastForInst && lastForInst.last_ts) {
      const remainingMs = UPDATE_COOLDOWN_MS - (now - lastForInst.last_ts);
      if (remainingMs > 0) {
        return {
          allowed: false,
          retryAfterSec: Math.max(1, Math.ceil(remainingMs / 1000)),
          reason: 'installation_cooldown'
        };
      }
    }

    // 2. Per-user sliding window (max 3/min)
    const windowStats = await db.prepare(
      `SELECT COUNT(*) AS cnt, MIN(created_at) AS oldest_ts
       FROM cloud_sync_rate_limits
       WHERE uid = ? AND action = 'update' AND created_at > ?`
    ).bind(uid, windowStart).first<{ cnt: number; oldest_ts: number | null }>();

    if (windowStats && windowStats.cnt >= MAX_UPDATES_PER_MINUTE) {
      const oldestTs = windowStats.oldest_ts || now;
      const remainingMs = UPDATE_WINDOW_MS - (now - oldestTs);
      return {
        allowed: false,
        retryAfterSec: Math.max(1, Math.ceil(remainingMs / 1000)),
        reason: 'user_window_limit'
      };
    }
  } else {
    // create / delete toggle rate limit (10/min per user)
    const toggleStats = await db.prepare(
      `SELECT COUNT(*) AS cnt, MIN(created_at) AS oldest_ts
       FROM cloud_sync_rate_limits
       WHERE uid = ? AND action = ? AND created_at > ?`
    ).bind(uid, action, windowStart).first<{ cnt: number; oldest_ts: number | null }>();

    if (toggleStats && toggleStats.cnt >= MAX_TOGGLES_PER_MINUTE) {
      const oldestTs = toggleStats.oldest_ts || now;
      const remainingMs = UPDATE_WINDOW_MS - (now - oldestTs);
      return {
        allowed: false,
        retryAfterSec: Math.max(1, Math.ceil(remainingMs / 1000)),
        reason: 'toggle_window_limit'
      };
    }
  }

  await db.prepare(
    `INSERT INTO cloud_sync_rate_limits (uid, installation_id, action, created_at)
     VALUES (?, ?, ?, ?)`
  ).bind(uid, installationId, action, now).run();

  await cleanupOldRateLimits(db, now);
  return { allowed: true };
}

async function deleteR2IconIfOwned(bucket: R2Bucket | undefined, uid: string, key: string | null | undefined): Promise<void> {
  if (!bucket || !key || typeof key !== 'string') return;
  const requiredPrefix = `cloud-icons/${uid}/`;
  if (!key.startsWith(requiredPrefix)) return;
  try {
    await bucket.delete(key);
  } catch (err) {
    console.warn(`[CloudInstallations] Failed to delete R2 key ${key}:`, err);
  }
}

function sanitizeAddons(rawAddons: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(rawAddons)) return [];
  const allowedTypes = new Set(['mod', 'resourcepack', 'shader']);
  const result: Array<Record<string, unknown>> = [];

  for (const item of rawAddons) {
    if (!item || typeof item !== 'object') continue;
    const a = item as Record<string, any>;
    const type = typeof a.type === 'string' ? a.type.toLowerCase().trim() : 'mod';
    if (!allowedTypes.has(type)) continue;
    if (!a.project_id || typeof a.project_id !== 'string') continue;

    const state = a.state === 'disabled' || a.enabled === false ? 'disabled' : 'enabled';
    result.push({
      project_id: String(a.project_id).trim().slice(0, 64),
      version_id: a.version_id ? String(a.version_id).trim().slice(0, 64) : '',
      filename: a.filename ? String(a.filename).trim().slice(0, 255) : '',
      type,
      state,
      enabled: state !== 'disabled'
    });

    if (result.length >= MAX_ADDONS_PER_INSTALLATION) break;
  }

  return result;
}

// GET /api/v1/cloud-installations - Authoritative list of user's cloud installations
cloudInstallationsApp.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  if (!isEligibleCloudUid(user?.uid)) {
    return c.json({ success: false, error: 'auth_required_for_cloud' }, 401);
  }

  const rows = await c.env.DB.prepare(
    `SELECT id, name, data_json, icon_r2_key, updated_at, updated_at_ms
     FROM cloud_installations
     WHERE uid = ?
     ORDER BY updated_at_ms DESC, updated_at DESC`
  ).bind(user.uid).all<{
    id: string;
    name: string;
    data_json: string;
    icon_r2_key: string | null;
    updated_at: string | null;
    updated_at_ms: number | null;
  }>();

  const items = (rows.results || []).map((row) => {
    let parsedData: Record<string, any> = {};
    try {
      parsedData = JSON.parse(row.data_json || '{}');
    } catch (_) {}
    return {
      id: row.id,
      name: row.name,
      data: parsedData,
      updatedAt: parseUpdatedAtMs(row)
    };
  });

  return c.json({
    success: true,
    items,
    count: items.length,
    limit: MAX_CLOUD_INSTALLATIONS
  });
});

// PUT /api/v1/cloud-installations/:id - Create or update a cloud installation
cloudInstallationsApp.put('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  if (!isEligibleCloudUid(user?.uid)) {
    return c.json({ success: false, error: 'auth_required_for_cloud' }, 401);
  }

  const id = (c.req.param('id') || '').trim();
  if (!SAFE_ID_REGEX.test(id)) {
    return c.json({ success: false, error: 'invalid_installation_id' }, 400);
  }

  const rawText = await c.req.text();
  if (rawText.length > MAX_PAYLOAD_BYTES) {
    return c.json({ success: false, error: 'payload_too_large', maxBytes: MAX_PAYLOAD_BYTES }, 413);
  }

  let body: Record<string, any>;
  try {
    body = JSON.parse(rawText || '{}');
  } catch (_) {
    return c.json({ success: false, error: 'invalid_json' }, 400);
  }

  const mode = body.mode === 'update' ? 'update' : 'create';
  const rawData = body.data && typeof body.data === 'object' ? body.data : {};
  const name = String(body.name || rawData.name || '').trim().slice(0, 100);
  if (!name) {
    return c.json({ success: false, error: 'missing_name' }, 400);
  }

  if (Array.isArray(rawData.addons) && rawData.addons.length > MAX_ADDONS_PER_INSTALLATION) {
    return c.json({ success: false, error: 'too_many_addons', maxAddons: MAX_ADDONS_PER_INSTALLATION }, 400);
  }

  const existing = await c.env.DB.prepare(
    `SELECT id, data_json, icon_r2_key, updated_at, updated_at_ms
     FROM cloud_installations
     WHERE id = ? AND uid = ?`
  ).bind(id, user.uid).first<{
    id: string;
    data_json: string;
    icon_r2_key: string | null;
    updated_at: string | null;
    updated_at_ms: number | null;
  }>();

  // Critical: if auto-syncing an existing cloud installation that was deleted/pulled on another PC,
  // return authoritative 404 not_found so client marks it cloud: false instead of resurrecting it!
  if (mode === 'update' && !existing) {
    return c.json({ success: false, error: 'not_found' }, 404);
  }

  // Enforce 35-installation limit when creating a new cloud installation
  if (!existing) {
    const countRow = await c.env.DB.prepare(
      'SELECT COUNT(*) AS cnt FROM cloud_installations WHERE uid = ?'
    ).bind(user.uid).first<{ cnt: number }>();

    if (countRow && countRow.cnt >= MAX_CLOUD_INSTALLATIONS) {
      return c.json({
        success: false,
        error: 'cloud_limit_reached',
        limit: MAX_CLOUD_INSTALLATIONS,
        count: countRow.cnt
      }, 403);
    }
  }

  // Enforce persistent D1 rate limiting
  const rlAction: 'update' | 'create' = existing ? 'update' : 'create';
  const rl = await checkAndRecordRateLimit(c.env.DB, user.uid, id, rlAction);
  if (!rl.allowed) {
    c.header('Retry-After', String(rl.retryAfterSec));
    return c.json({
      success: false,
      error: 'rate_limited',
      reason: rl.reason,
      retryAfterSec: rl.retryAfterSec
    }, 429);
  }

  // Parse existing data_json for icon preservation if custom icon didn't change
  let existingData: Record<string, any> = {};
  if (existing?.data_json) {
    try { existingData = JSON.parse(existing.data_json); } catch (_) {}
  }

  const oldR2Key = existing?.icon_r2_key || null;
  const iconType = rawData.icon_type === 'custom' ? 'custom' : 'default';
  const requestedR2Key = typeof body.iconR2Key === 'string' ? body.iconR2Key.trim() : null;

  let finalR2Key: string | null = null;
  let finalIconUrl: string | null = null;
  let finalIconName: string | null = null;

  if (iconType === 'default') {
    finalIconName = String(rawData.icon_name || 'default.png').trim().slice(0, 128);
    finalIconUrl = null;
    finalR2Key = null;
  } else {
    // Custom icon: validate any newly supplied R2 key belongs strictly to this user + installation
    if (requestedR2Key) {
      const expectedPrefix = `cloud-icons/${user.uid}/${id}_`;
      if (!requestedR2Key.startsWith(expectedPrefix)) {
        return c.json({ success: false, error: 'invalid_icon_key' }, 400);
      }
      finalR2Key = requestedR2Key;
      const baseUrl = (c.env.BASE_URL || 'https://api.hwlauncher.abelosky.com').replace(/\/+$/, '');
      finalIconUrl = `${baseUrl}/storage/${requestedR2Key}`;
    } else if (oldR2Key && oldR2Key.startsWith(`cloud-icons/${user.uid}/`)) {
      // Custom icon did not change — preserve server's existing R2 key and URL
      finalR2Key = oldR2Key;
      finalIconUrl = typeof existingData.icon_url === 'string' ? existingData.icon_url : null;
    } else {
      // Custom icon requested without uploaded R2 object — fallback safely to default
      finalIconName = 'default.png';
      finalIconUrl = null;
      finalR2Key = null;
    }
  }

  const sanitizedData: Record<string, any> = {
    schema_version: 1,
    name,
    version: String(rawData.version || '').trim().slice(0, 128),
    loader_version: rawData.loader_version ? String(rawData.loader_version).trim().slice(0, 64) : null,
    icon_type: finalR2Key ? 'custom' : 'default',
    icon_name: finalR2Key ? null : (finalIconName || 'default.png'),
    icon_url: finalIconUrl,
    directory_rel: typeof rawData.directory_rel === 'string' ? rawData.directory_rel.trim().slice(0, 260) : `documents:MinecraftDirectories/${id}`,
    jvm_args: typeof rawData.jvm_args === 'string' ? rawData.jvm_args.slice(0, 1024) : '',
    ram_min: rawData.ram_min ?? null,
    ram_max: rawData.ram_max ?? null,
    width: typeof rawData.width === 'number' ? rawData.width : (rawData.width ? Number(rawData.width) || null : null),
    height: typeof rawData.height === 'number' ? rawData.height : (rawData.height ? Number(rawData.height) || null : null),
    enable_custom_skins: rawData.enable_custom_skins !== false,
    last_played: typeof rawData.last_played === 'string' ? rawData.last_played.slice(0, 64) : null,
    addons: sanitizeAddons(rawData.addons)
  };

  const serializedData = JSON.stringify(sanitizedData);
  if (serializedData.length > MAX_PAYLOAD_BYTES) {
    return c.json({ success: false, error: 'payload_too_large', maxBytes: MAX_PAYLOAD_BYTES }, 413);
  }

  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  if (existing) {
    await c.env.DB.prepare(
      `UPDATE cloud_installations
       SET name = ?, data_json = ?, icon_r2_key = ?, updated_at = ?, updated_at_ms = ?
       WHERE id = ? AND uid = ?`
    ).bind(name, serializedData, finalR2Key, nowIso, nowMs, id, user.uid).run();
  } else {
    await c.env.DB.prepare(
      `INSERT INTO cloud_installations (id, uid, name, data_json, icon_r2_key, updated_at, updated_at_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, user.uid, name, serializedData, finalR2Key, nowIso, nowMs).run();
  }

  // Clean up previous R2 icon if it changed or switched to a default icon
  if (oldR2Key && oldR2Key !== finalR2Key) {
    await deleteR2IconIfOwned(c.env.STORAGE_BUCKET, user.uid, oldR2Key);
  }

  return c.json({
    success: true,
    item: {
      id,
      name,
      data: sanitizedData,
      updatedAt: nowMs
    },
    updatedAt: nowMs
  });
});

// DELETE /api/v1/cloud-installations/:id - Delete cloud installation and its R2 icon
cloudInstallationsApp.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  if (!isEligibleCloudUid(user?.uid)) {
    return c.json({ success: false, error: 'auth_required_for_cloud' }, 401);
  }

  const id = (c.req.param('id') || '').trim();
  if (!SAFE_ID_REGEX.test(id)) {
    return c.json({ success: false, error: 'invalid_installation_id' }, 400);
  }

  const rl = await checkAndRecordRateLimit(c.env.DB, user.uid, id, 'delete');
  if (!rl.allowed) {
    c.header('Retry-After', String(rl.retryAfterSec));
    return c.json({
      success: false,
      error: 'rate_limited',
      reason: rl.reason,
      retryAfterSec: rl.retryAfterSec
    }, 429);
  }

  const existing = await c.env.DB.prepare(
    `SELECT id, icon_r2_key, data_json
     FROM cloud_installations
     WHERE id = ? AND uid = ?`
  ).bind(id, user.uid).first<{ id: string; icon_r2_key: string | null; data_json: string | null }>();

  if (existing) {
    await deleteR2IconIfOwned(c.env.STORAGE_BUCKET, user.uid, existing.icon_r2_key);
    await c.env.DB.prepare(
      'DELETE FROM cloud_installations WHERE id = ? AND uid = ?'
    ).bind(id, user.uid).run();
  }

  return c.json({
    success: true,
    deleted: true,
    existed: Boolean(existing)
  });
});
