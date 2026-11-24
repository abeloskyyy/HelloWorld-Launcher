/**
 * HelloWorld Launcher - Cloudflare Worker Telemetry Collector
 * Handles incoming crash reports, startup errors, unhandled exceptions, and diagnostics.
 * Stores structured metadata in Cloudflare D1 and full compressed logs in Cloudflare R2.
 * Includes rate-limiting, NTFY alerts for crashes, and daily 30-day auto-purge.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Launcher-Secret, X-User-Uid, X-User-Uuid',
};

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
let _jwksCache = { keys: null, expiresAt: 0 };

function base64UrlToUint8Array(str) {
  const pad = '='.repeat((4 - (str.length % 4)) % 4);
  const b64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function getGoogleJwks() {
  if (_jwksCache.keys && Date.now() < _jwksCache.expiresAt) {
    return _jwksCache.keys;
  }
  const res = await fetch(GOOGLE_JWKS_URL);
  if (!res.ok) throw new Error('Failed to fetch Google JWKS');
  const data = await res.json();
  _jwksCache = { keys: data.keys || [], expiresAt: Date.now() + 10 * 60 * 1000 };
  return _jwksCache.keys;
}

async function verifyFirebaseIdToken(token, projectId) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;

  const header = JSON.parse(new TextDecoder().decode(base64UrlToUint8Array(parts[0])));
  const payload = JSON.parse(new TextDecoder().decode(base64UrlToUint8Array(parts[1])));

  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp <= nowSec) return null;
  if (payload.aud !== projectId) return null;
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
  const uid = payload.user_id || payload.sub;
  if (!uid || typeof uid !== 'string') return null;

  const keys = await getGoogleJwks();
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) return null;

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const signingInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const signature = base64UrlToUint8Array(parts[2]);
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, signature, signingInput);
  if (!valid) return null;

  return { uid: uid.trim(), email: payload.email || null };
}

/**
 * Strict server-side moderator/admin check against main hwl-db (AUTH_DB)
 * ONLY matches by verified UID / UUID / mc_uuid — NEVER by username!
 */
async function verifyModeratorAccess(request, env) {
  if (!env.AUTH_DB) {
    return { allowed: false, reason: 'auth_db_not_bound' };
  }

  const candidateIds = new Set();

  // 1. Cryptographically verified Firebase ID Token (HelloWorld / verified MS)
  const authHeader = request.headers.get('Authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const projectId = env.FIREBASE_PROJECT_ID || 'helloworld-launcher';
    try {
      const verified = await verifyFirebaseIdToken(token, projectId);
      if (verified && verified.uid) {
        candidateIds.add(verified.uid);
      }
    } catch (err) {
      console.warn('[Telemetry Auth] Firebase token verification failed:', err.message);
    }
  }

  // 2. Launcher-authenticated UID/UUID (for verified Microsoft / HelloWorld accounts)
  const launcherSecret = request.headers.get('X-Launcher-Secret') || '';
  const expectedSecret = env.LAUNCHER_SECRET || '';
  if (expectedSecret && launcherSecret === expectedSecret) {
    const hdrUid = (request.headers.get('X-User-Uid') || '').trim();
    const hdrUuid = (request.headers.get('X-User-Uuid') || '').trim();
    if (hdrUid && !hdrUid.startsWith('local_') && hdrUid.length >= 16) {
      candidateIds.add(hdrUid);
    }
    if (hdrUuid && !hdrUuid.startsWith('local_') && hdrUuid.length >= 16) {
      candidateIds.add(hdrUuid);
    }
  }

  if (candidateIds.size === 0) {
    return { allowed: false, reason: 'missing_identity' };
  }

  // 3. Strictly query AUTH_DB (users + admins) by exact uid / uuid / mc_uuid ONLY (ZERO username lookup!)
  for (const id of candidateIds) {
    const cleanHex = id.replace(/-/g, '').toLowerCase();
    try {
      const userRow = await env.AUTH_DB.prepare(`
        SELECT uid, badges_json, account_type
        FROM users
        WHERE uid = ?
           OR uuid = ?
           OR mc_uuid = ?
           OR LOWER(REPLACE(COALESCE(uuid, ''), '-', '')) = ?
           OR LOWER(REPLACE(COALESCE(mc_uuid, ''), '-', '')) = ?
        LIMIT 1
      `).bind(id, id, id, cleanHex, cleanHex).first();

      const resolvedUid = userRow?.uid || id;
      const adminRow = await env.AUTH_DB.prepare(
        'SELECT role FROM admins WHERE uid = ? LIMIT 1'
      ).bind(resolvedUid).first();

      let badges = [];
      if (userRow?.badges_json) {
        try { badges = JSON.parse(userRow.badges_json); } catch (_) {}
      }

      const roleStr = String(adminRow?.role || '').toLowerCase();
      const isAdmin = roleStr === 'admin' || roleStr === 'owner' || badges.includes('creator');
      const isMod = isAdmin || roleStr === 'moderator' || roleStr === 'mod' || badges.includes('moderator');

      if (isMod) {
        return {
          allowed: true,
          uid: resolvedUid,
          role: roleStr || (isAdmin ? 'admin' : 'moderator'),
          isAdmin,
          isMod
        };
      }
    } catch (dbErr) {
      console.error('[Telemetry Auth] D1 role check error:', dbErr);
    }
  }

  return { allowed: false, reason: 'forbidden_not_moderator' };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// In-memory rate limiting per Cloudflare Worker isolate (10 requests per minute per IP)
const rateLimitMap = new Map();
function isRateLimited(key, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  const records = (rateLimitMap.get(key) || []).filter((t) => now - t < windowMs);
  if (records.length >= maxRequests) {
    return true;
  }
  records.push(now);
  rateLimitMap.set(key, records);
  return false;
}

/**
 * Sends real-time telemetry / crash / diagnostic alert to Abelosky via NTFY.
 * Uses JSON publish API (POST https://ntfy.sh/) with automatic fallback to topic endpoint.
 */
async function sendNtfyTelemetryAlert(env, data, id) {
  const server = String(env.NTFY_SERVER || 'https://ntfy.sh').replace(/\/+$/, '');
  const topic = String(env.NTFY_TOPIC || 'helloworld_launcher_ai_notify_29373').trim();
  if (!topic) return { ok: false, status: 0, error: 'Missing NTFY_TOPIC' };

  const isCrash = Boolean(data.isCrash);
  const title = isCrash
    ? `[Crash Detectado] ${data.username || 'Usuario'}`
    : `[Diagnostico Manual] ${data.username || 'Usuario'}`;

  const tags = isCrash ? ['rotating_light', 'beetle'] : ['clipboard', 'satellite'];
  const priority = isCrash ? 4 : 3;

  const lines = [
    `Usuario: ${data.username || 'Desconocido'} (${data.accountType || 'offline'})`,
    `Motivo: ${data.triggerReason}${data.exitCode !== null && data.exitCode !== undefined ? ` (Exit Code: ${data.exitCode})` : ''}`,
    `Perfil: ${data.profileName || 'Default'} - ${data.gameVersion || 'N/A'}${data.modLoader ? ` (${data.modLoader})` : ''}`,
    `SO: ${data.osDistro || data.osPlatform || 'Desconocido'}`,
    `RAM Asignada: ${data.allocatedRamMb ? data.allocatedRamMb + ' MB' : 'N/A'}`,
    `Reporte ID: ${id}`,
  ];
  const message = lines.join('\n');
  const clickUrl = `https://hwlauncher-telemetry.abeloskysb.workers.dev/reports/${id}`;

  const authHeaders = {};
  if (env.NTFY_TOKEN) {
    authHeaders['Authorization'] = `Bearer ${String(env.NTFY_TOKEN).trim()}`;
  }

  let lastError = '';
  let lastStatus = 0;

  // Retry up to 2 attempts to survive transient 429/5xx on shared Cloudflare Worker egress IPs
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      // Method 1: JSON publish API (POST https://ntfy.sh/)
      const res = await fetch(`${server}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'HelloWorld-Launcher-Telemetry/3.2.0',
          ...authHeaders,
        },
        body: JSON.stringify({
          topic,
          title,
          message,
          priority,
          tags,
          click: clickUrl,
        }),
      });

      if (res.ok) {
        return { ok: true, status: res.status, method: 'json', attempt };
      }

      const errText = await res.text().catch(() => '');
      lastStatus = res.status;
      lastError = `json=${res.status}:${errText.slice(0, 120)}`;
      console.error(`[NTFY JSON Error attempt ${attempt}] HTTP ${res.status}: ${errText}`);

      // Method 2: Topic endpoint with pure-ASCII headers
      const fallbackRes = await fetch(`${server}/${encodeURIComponent(topic)}`, {
        method: 'POST',
        headers: {
          'Title': title.replace(/[^\x20-\x7E]/g, ''),
          'Priority': String(priority),
          'Tags': tags.join(','),
          'Click': clickUrl,
          'Content-Type': 'text/plain; charset=utf-8',
          'User-Agent': 'HelloWorld-Launcher-Telemetry/3.2.0',
          ...authHeaders,
        },
        body: message,
      });

      if (fallbackRes.ok) {
        return { ok: true, status: fallbackRes.status, method: 'topic_fallback', attempt };
      }

      const fbText = await fallbackRes.text().catch(() => '');
      lastStatus = fallbackRes.status;
      lastError += ` | fallback=${fallbackRes.status}:${fbText.slice(0, 120)}`;
      console.error(`[NTFY Fallback Error attempt ${attempt}] HTTP ${fallbackRes.status}: ${fbText}`);
    } catch (err) {
      lastError = err?.message || String(err);
      console.error(`[NTFY Alert Exception attempt ${attempt}]`, err);
    }

    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 700));
    }
  }

  return { ok: false, status: lastStatus, error: lastError };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Health check
    if (url.pathname === '/' || url.pathname === '/health') {
      return jsonResponse({
        status: 'ok',
        service: 'hwlauncher-telemetry',
        timestamp: new Date().toISOString(),
        has_d1: !!env.DB,
        has_r2: !!env.BUCKET,
      });
    }

    // --- Ingestion Endpoint: POST /report ---
    if (request.method === 'POST' && (url.pathname === '/report' || url.pathname === '/api/report')) {
      try {
        // 1. Content size guard: reject payloads > 10MB
        const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
        if (contentLength > 10 * 1024 * 1024) {
          return jsonResponse({ error: 'Payload Too Large. Max size is 10MB.' }, 413);
        }

        // 2. Client IP & Rate Limiting (max 10 requests / min)
        const ip =
          request.headers.get('cf-connecting-ip') ||
          request.headers.get('x-real-ip') ||
          request.headers.get('x-forwarded-for') ||
          '127.0.0.1';

        if (isRateLimited(ip, 10, 60000)) {
          return jsonResponse({ error: 'Too Many Requests', retry_after: 60 }, 429);
        }

        const payload = await request.json();
        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        const country = request.cf?.country || payload.geo?.country || 'Unknown';
        const city = request.cf?.city || payload.geo?.city || 'Unknown';

        const username = String(payload.username || 'Unknown').trim();
        const accountType = String(payload.account_type || 'offline').trim();
        const accountId = payload.account_id ? String(payload.account_id) : null;
        const triggerReason = String(payload.trigger_reason || 'diagnostic').trim();
        const launcherVersion = String(payload.launcher_version || '3.2.0').trim();

        const isCrash = !!payload.is_crash || triggerReason.includes('crash') || triggerReason.includes('error');
        const exitCode = typeof payload.exit_code === 'number' ? payload.exit_code : null;

        // System Specs
        const osPlatform = payload.os?.platform || null;
        const osRelease = payload.os?.release || null;
        const osDistro = payload.os?.distro || null;
        const osArch = payload.os?.arch || null;
        const cpuModel = payload.hardware?.cpu_model || null;
        const cpuCores = payload.hardware?.cpu_cores || null;
        const totalRamGb = payload.hardware?.total_ram_gb || null;
        const freeRamGb = payload.hardware?.free_ram_gb || null;
        const gpuRenderer = payload.hardware?.gpu_renderer || null;

        // Profile Info
        const profileName = payload.profile?.name || null;
        const gameVersion = payload.profile?.game_version || null;
        const modLoader = payload.profile?.mod_loader || null;
        const allocatedRamMb = payload.profile?.allocated_ram_mb || null;
        const managedModsCount = payload.profile?.managed_mods_count || 0;

        // Unmanaged / manual files (mods, resourcepacks, shaders)
        const unmanagedModsJson = payload.unmanaged_files
          ? JSON.stringify(payload.unmanaged_files)
          : payload.unmanaged_mods_json || '[]';

        // Recent logs excerpt (last ~150 lines) for fast SQL preview
        const recentLogsText = payload.recent_logs_text || (Array.isArray(payload.logs_excerpt) ? payload.logs_excerpt.join('\n') : '');

        let r2LogKey = null;

        // If compressed full logs are provided and R2 bucket is bound, upload to R2
        if (payload.full_logs_compressed && env.BUCKET) {
          try {
            const rawBytes = base64ToUint8Array(payload.full_logs_compressed);
            r2LogKey = `logs/${username}/${Date.now()}_${id}.json.gz`;
            await env.BUCKET.put(r2LogKey, rawBytes, {
              httpMetadata: {
                contentType: 'application/gzip',
                contentEncoding: 'gzip',
              },
              customMetadata: {
                username,
                report_id: id,
                trigger_reason: triggerReason,
                created_at: now,
              },
            });
          } catch (r2Err) {
            console.error('[Telemetry Worker] Failed to save logs to R2:', r2Err);
            r2LogKey = null;
          }
        }

        // Insert into Cloudflare D1
        if (env.DB) {
          await env.DB.prepare(
            `INSERT INTO telemetry_reports (
              id, created_at, username, account_type, account_id, trigger_reason,
              launcher_version, os_platform, os_release, os_distro, os_arch,
              cpu_model, cpu_cores, total_ram_gb, free_ram_gb, gpu_renderer,
              ip_address, ip_country, ip_city, profile_name, game_version,
              mod_loader, allocated_ram_mb, managed_mods_count, unmanaged_mods_json,
              is_crash, exit_code, recent_logs_text, r2_log_key
            ) VALUES (
              ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?, ?
            )`
          )
            .bind(
              id,
              now,
              username,
              accountType,
              accountId,
              triggerReason,
              launcherVersion,
              osPlatform,
              osRelease,
              osDistro,
              osArch,
              cpuModel,
              cpuCores,
              totalRamGb,
              freeRamGb,
              gpuRenderer,
              ip,
              country,
              city,
              profileName,
              gameVersion,
              modLoader,
              allocatedRamMb,
              managedModsCount,
              unmanagedModsJson,
              isCrash ? 1 : 0,
              exitCode,
              recentLogsText ? recentLogsText.slice(0, 15000) : null,
              r2LogKey
            )
            .run();
        }

        // If crash, error or manual diagnostic, dispatch real-time NTFY alert to Abelosky
        const shouldAlert = isCrash || triggerReason === 'manual_diagnostic';
        let ntfyResult = { skipped: true };
        if (shouldAlert) {
          ntfyResult = await sendNtfyTelemetryAlert(
            env,
            {
              username,
              accountType,
              triggerReason,
              exitCode,
              profileName,
              gameVersion,
              modLoader,
              allocatedRamMb,
              osDistro,
              osPlatform,
              isCrash,
            },
            id
          );
        }

        return jsonResponse({
          success: true,
          id,
          r2_log_key: r2LogKey,
          ntfy: ntfyResult,
          message: 'Report received and processed',
        });
      } catch (err) {
        console.error('[Telemetry Worker] Ingest error:', err);
        return jsonResponse({ error: 'Failed to ingest telemetry', details: err.message }, 500);
      }
    }

    // --- Strict Moderator Auth Check Endpoint: GET /auth/check ---
    if (request.method === 'GET' && (url.pathname === '/auth/check' || url.pathname === '/api/auth/check')) {
      const auth = await verifyModeratorAccess(request, env);
      return jsonResponse({
        success: true,
        hasAccess: Boolean(auth.allowed),
        role: auth.role || 'user',
        uid: auth.uid || null,
      });
    }

    // --- Stats API: GET /reports/stats ---
    if (request.method === 'GET' && (url.pathname === '/reports/stats' || url.pathname === '/api/reports/stats')) {
      const auth = await verifyModeratorAccess(request, env);
      if (!auth.allowed) {
        return jsonResponse({ error: 'Forbidden: moderator privileges required.' }, 403);
      }
      if (!env.DB) return jsonResponse({ error: 'D1 Database not bound' }, 500);

      const total = await env.DB.prepare('SELECT COUNT(*) as count FROM telemetry_reports').first();
      const crashes = await env.DB.prepare('SELECT COUNT(*) as count FROM telemetry_reports WHERE is_crash = 1').first();
      const topVersions = await env.DB.prepare('SELECT game_version, COUNT(*) as count FROM telemetry_reports WHERE game_version IS NOT NULL GROUP BY game_version ORDER BY count DESC LIMIT 1').first();
      const topLoaders = await env.DB.prepare("SELECT mod_loader, COUNT(*) as count FROM telemetry_reports WHERE mod_loader IS NOT NULL AND mod_loader != 'Vanilla' GROUP BY mod_loader ORDER BY count DESC LIMIT 1").first();

      return jsonResponse({
        success: true,
        stats: {
          total_reports: total?.count || 0,
          total_crashes: crashes?.count || 0,
          top_version: topVersions?.game_version || 'N/A',
          top_loader: topLoaders?.mod_loader || 'N/A',
        },
      });
    }

    // --- Query API: GET /reports?username=... (Moderators only) ---
    if (request.method === 'GET' && (url.pathname === '/reports' || url.pathname === '/api/reports')) {
      const auth = await verifyModeratorAccess(request, env);
      if (!auth.allowed) {
        return jsonResponse({ error: 'Forbidden: moderator privileges required.' }, 403);
      }

      if (!env.DB) {
        return jsonResponse({ error: 'D1 Database not bound to Worker' }, 500);
      }

      const targetUsername = url.searchParams.get('username');
      const crashOnly = url.searchParams.get('crash_only') === '1' || url.searchParams.get('crash_only') === 'true';
      const modLoader = url.searchParams.get('mod_loader');
      const gameVersion = url.searchParams.get('game_version');
      const osPlatform = url.searchParams.get('os_platform');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
      const offset = parseInt(url.searchParams.get('offset') || '0', 10);

      let query = 'SELECT * FROM telemetry_reports';
      const params = [];
      const conditions = [];

      if (targetUsername) {
        conditions.push('(LOWER(username) LIKE LOWER(?) OR id = ?)');
        params.push(`%${targetUsername}%`, targetUsername);
      }

      if (crashOnly) {
        conditions.push('is_crash = 1');
      }

      if (modLoader && modLoader !== 'all') {
        conditions.push('LOWER(mod_loader) LIKE LOWER(?)');
        params.push(`%${modLoader}%`);
      }

      if (gameVersion && gameVersion !== 'all') {
        conditions.push('game_version = ?');
        params.push(gameVersion);
      }

      if (osPlatform && osPlatform !== 'all') {
        conditions.push('LOWER(os_platform) = LOWER(?)');
        params.push(osPlatform);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const results = await env.DB.prepare(query).bind(...params).all();

      return jsonResponse({
        success: true,
        count: results.results?.length || 0,
        filters: { username: targetUsername, crash_only: crashOnly, mod_loader: modLoader, game_version: gameVersion, os_platform: osPlatform, limit, offset },
        reports: results.results || [],
      });
    }

    // --- Delete Single Report: DELETE /reports/:id ---
    const deleteMatch = url.pathname.match(/^\/(?:api\/)?reports\/([a-zA-Z0-9_-]+)$/);
    if (request.method === 'DELETE' && deleteMatch) {
      const auth = await verifyModeratorAccess(request, env);
      if (!auth.allowed) {
        return jsonResponse({ error: 'Forbidden: moderator privileges required.' }, 403);
      }
      if (!env.DB) return jsonResponse({ error: 'D1 not bound' }, 500);

      const reportId = deleteMatch[1];
      const res = await env.DB.prepare('SELECT r2_log_key FROM telemetry_reports WHERE id = ?').bind(reportId).first();
      if (!res) return jsonResponse({ error: 'Report not found' }, 404);

      if (env.BUCKET && res.r2_log_key) {
        try {
          await env.BUCKET.delete(res.r2_log_key);
        } catch (_) {}
      }

      await env.DB.prepare('DELETE FROM telemetry_reports WHERE id = ?').bind(reportId).run();
      return jsonResponse({ success: true, message: 'Report deleted', id: reportId });
    }

    // --- Query Single Report: GET /reports/:id ---
    const reportMatch = url.pathname.match(/^\/(?:api\/)?reports\/([a-zA-Z0-9_-]+)$/);
    if (request.method === 'GET' && reportMatch) {
      const auth = await verifyModeratorAccess(request, env);
      if (!auth.allowed) {
        return jsonResponse({ error: 'Forbidden: moderator privileges required.' }, 403);
      }
      const reportId = reportMatch[1];
      if (!env.DB) return jsonResponse({ error: 'D1 Database not bound' }, 500);

      const res = await env.DB.prepare('SELECT * FROM telemetry_reports WHERE id = ?').bind(reportId).first();
      if (!res) return jsonResponse({ error: 'Report not found' }, 404);

      return jsonResponse({ success: true, report: res });
    }

    // --- Download Full Log from R2: GET /reports/:id/logs ---
    const logsMatch = url.pathname.match(/^\/(?:api\/)?reports\/([a-zA-Z0-9_-]+)\/logs$/);
    if (request.method === 'GET' && logsMatch) {
      const auth = await verifyModeratorAccess(request, env);
      if (!auth.allowed) {
        return jsonResponse({ error: 'Forbidden: moderator privileges required.' }, 403);
      }
      const reportId = logsMatch[1];
      if (!env.DB || !env.BUCKET) return jsonResponse({ error: 'Storage or Database not bound' }, 500);

      const res = await env.DB.prepare('SELECT r2_log_key FROM telemetry_reports WHERE id = ?').bind(reportId).first();
      if (!res || !res.r2_log_key) {
        return jsonResponse({ error: 'No R2 log file attached to this report' }, 404);
      }

      const object = await env.BUCKET.get(res.r2_log_key);
      if (!object) return jsonResponse({ error: 'Log object not found in R2' }, 404);

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      headers.set('Access-Control-Allow-Origin', '*');

      return new Response(object.body, { headers });
    }

    // --- Manual / Maintenance Purge Endpoint: POST /reports/purge ---
    if (request.method === 'POST' && url.pathname === '/reports/purge') {
      const auth = await verifyModeratorAccess(request, env);
      if (!auth.allowed) {
        return jsonResponse({ error: 'Forbidden: moderator privileges required.' }, 403);
      }

      const days = parseInt(url.searchParams.get('days') || '30', 10);
      if (!env.DB) return jsonResponse({ error: 'D1 not bound' }, 500);

      // Clean matching R2 objects
      const oldReports = await env.DB.prepare(
        `SELECT r2_log_key FROM telemetry_reports WHERE created_at < datetime('now', '-${days} days') AND r2_log_key IS NOT NULL`
      ).all();

      if (env.BUCKET && oldReports.results) {
        for (const row of oldReports.results) {
          if (row.r2_log_key) {
            try {
              await env.BUCKET.delete(row.r2_log_key);
            } catch (_) {}
          }
        }
      }

      const del = await env.DB.prepare(
        `DELETE FROM telemetry_reports WHERE created_at < datetime('now', '-${days} days')`
      ).run();

      return jsonResponse({ success: true, message: `Purged reports older than ${days} days`, deleted: del });
    }

    return jsonResponse({ error: 'Not found' }, 404);
  },

  /**
   * Scheduled Cron Handler: Automatically purges reports & logs older than 30 days
   * Runs daily at 03:00 UTC via [triggers.crons]
   */
  async scheduled(event, env, ctx) {
    if (!env.DB) return;
    try {
      console.log('[Telemetry Cron] Starting 30-day auto-purge...');
      // 1. Delete matching R2 log files
      const oldReports = await env.DB.prepare(
        "SELECT r2_log_key FROM telemetry_reports WHERE created_at < datetime('now', '-30 days') AND r2_log_key IS NOT NULL LIMIT 200"
      ).all();

      if (env.BUCKET && oldReports.results && oldReports.results.length > 0) {
        for (const row of oldReports.results) {
          if (row.r2_log_key) {
            try {
              await env.BUCKET.delete(row.r2_log_key);
            } catch (_) {}
          }
        }
      }

      // 2. Delete rows from D1
      const res = await env.DB.prepare(
        "DELETE FROM telemetry_reports WHERE created_at < datetime('now', '-30 days')"
      ).run();
      console.log('[Telemetry Cron] Successfully purged old telemetry reports from D1:', res);
    } catch (err) {
      console.error('[Telemetry Cron] Purge error:', err);
    }
  },
};
