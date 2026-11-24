import { Hono } from 'hono';
import { requireAuth, optionalAuth } from '../middleware/auth';
import type { Env, CustomVariables } from '../types/env';

export const usersApp = new Hono<{ Bindings: Env; Variables: CustomVariables }>();

// GET /api/v1/users/me - Perfil del usuario autenticado (creación automática en primer inicio de sesión)
usersApp.get('/me', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  let row = await db.prepare('SELECT * FROM users WHERE uid = ?').bind(user.uid).first<any>();

  if (!row) {
    const cleanHex = user.uid.replace(/-/g, '').toLowerCase();
    row = await db.prepare(`
      SELECT * FROM users
      WHERE mc_uuid = ? OR uuid = ? OR LOWER(REPLACE(COALESCE(mc_uuid, ''), '-', '')) = ?
      LIMIT 1
    `).bind(user.uid, user.uid, cleanHex).first<any>();
  }

  if (!row) {
    // Primer inicio de sesión: inicializar perfil base en D1
    const defaultUsername = user.email ? user.email.split('@')[0] : `user_${user.uid.slice(0, 8)}`;
    const lower = defaultUsername.toLowerCase();

    // Comprobar si username está ocupado
    const existing = await db.prepare('SELECT uid FROM users WHERE username_lower = ?').bind(lower).first();
    const finalUsername = existing ? `${defaultUsername}_${Math.floor(Math.random() * 1000)}` : defaultUsername;
    const finalLower = finalUsername.toLowerCase();

    await db.prepare(`
      INSERT INTO users (uid, username, username_lower, email, account_type, badges_json, links_json, playstyle_tags_json)
      VALUES (?, ?, ?, ?, 'helloworld', '[]', '[]', '[]')
    `).bind(user.uid, finalUsername, finalLower, user.email || null).run();

    row = await db.prepare('SELECT * FROM users WHERE uid = ?').bind(user.uid).first<any>();
  }

  // Parsear campos JSON para el cliente
  const parsedBadges = JSON.parse(row.badges_json || '[]');
  const isAdmin = Boolean(user.role === 'admin' || user.role === 'owner' || parsedBadges.includes('creator'));
  const isMod = Boolean(isAdmin || user.role === 'moderator' || user.role === 'mod' || parsedBadges.includes('moderator'));
  const isMs = row.account_type === 'microsoft' || row.microsoft_verified === 1 || parsedBadges.includes('premium');
  return c.json({
    success: true,
    user: {
      ...row,
      accountType: row.account_type,
      avatarUrl: row.avatar_url,
      avatarBase64: row.avatar_url,
      avatar_url: row.avatar_url,
      favoriteMob: row.favorite_mob,
      mcUuid: row.mc_uuid || row.uuid,
      uuid: row.uuid || row.mc_uuid,
      clientVersion: row.client_version,
      microsoftVerified: Boolean(isMs),
      links: JSON.parse(row.links_json || '[]'),
      playstyleTags: JSON.parse(row.playstyle_tags_json || '[]'),
      badges: parsedBadges,
      role: user.role,
      isAdmin,
      isMod
    }
  });
});

// PATCH /api/v1/users/me - Actualizar perfil propio (auto-crea fila en D1 si aún no existe)
usersApp.patch('/me', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json<any>();
  const db = c.env.DB;

  let current = await db.prepare('SELECT * FROM users WHERE uid = ?').bind(user.uid).first<any>();
  if (!current) {
    const requestedName = (typeof body.username === 'string' && body.username.trim())
      ? body.username.trim()
      : (user.email ? user.email.split('@')[0] : `user_${user.uid.slice(0, 8)}`);
    const lower = requestedName.toLowerCase();
    const taken = await db.prepare('SELECT uid FROM users WHERE username_lower = ?').bind(lower).first();
    if (taken && typeof body.username === 'string' && body.username.trim()) {
      return c.json({ success: false, error: 'username_taken' }, 400);
    }
    const finalUsername = taken ? `${requestedName}_${Math.floor(Math.random() * 1000)}` : requestedName;
    await db.prepare(`
      INSERT INTO users (uid, username, username_lower, email, account_type, badges_json, links_json, playstyle_tags_json)
      VALUES (?, ?, ?, ?, 'helloworld', '[]', '[]', '[]')
    `).bind(user.uid, finalUsername, finalUsername.toLowerCase(), user.email || null).run();
    current = await db.prepare('SELECT * FROM users WHERE uid = ?').bind(user.uid).first<any>();
  }

  const updates: string[] = [];
  const bindings: any[] = [];

  // Actualizar Username (comprobando colisión)
  if (body.username && typeof body.username === 'string') {
    const trimmed = body.username.trim();
    const lower = trimmed.toLowerCase();
    if (lower !== current.username_lower) {
      const taken = await db.prepare('SELECT uid FROM users WHERE username_lower = ? AND uid != ?').bind(lower, user.uid).first();
      if (taken) {
        return c.json({ success: false, error: 'username_taken' }, 400);
      }
      updates.push('username = ?', 'username_lower = ?');
      bindings.push(trimmed, lower);
    }
  }

  const avatarVal = body.avatar_url !== undefined ? body.avatar_url : (body.avatarUrl !== undefined ? body.avatarUrl : body.avatarBase64);
  if (avatarVal !== undefined) {
    updates.push('avatar_url = ?');
    bindings.push(avatarVal);
  }
  if (body.biography !== undefined) {
    updates.push('biography = ?');
    bindings.push(body.biography);
  }
  const favMob = body.favorite_mob !== undefined ? body.favorite_mob : body.favoriteMob;
  if (favMob !== undefined) {
    updates.push('favorite_mob = ?');
    bindings.push(favMob);
  }
  if (body.country !== undefined) {
    updates.push('country = ?');
    bindings.push(body.country);
  }
  if (body.background !== undefined) {
    updates.push('background = ?');
    bindings.push(body.background);
  }
  const acctType = body.account_type !== undefined ? body.account_type : body.accountType;
  if (acctType !== undefined) {
    updates.push('account_type = ?');
    bindings.push(acctType);
  }
  const mcUuid = body.mc_uuid !== undefined ? body.mc_uuid : (body.mcUuid !== undefined ? body.mcUuid : body.uuid);
  if (mcUuid !== undefined) {
    updates.push('mc_uuid = ?', 'uuid = ?');
    bindings.push(mcUuid, mcUuid);
  }
  const clientVer = body.client_version !== undefined ? body.client_version : body.clientVersion;
  if (clientVer !== undefined) {
    updates.push('client_version = ?');
    bindings.push(clientVer);
  }
  if (Array.isArray(body.links)) {
    updates.push('links_json = ?');
    bindings.push(JSON.stringify(body.links));
  }
  if (Array.isArray(body.playstyleTags)) {
    updates.push('playstyle_tags_json = ?');
    bindings.push(JSON.stringify(body.playstyleTags));
  }

  // Insignias solo modificables por Administradores con token criptográfico verificado
  if (Array.isArray(body.badges)) {
    const role = (user.role || '').toLowerCase();
    if (user.isTokenVerified && (role === 'admin' || role === 'owner')) {
      updates.push('badges_json = ?');
      bindings.push(JSON.stringify(body.badges));
    }
  }

  updates.push("updated_at = datetime('now')");

  if (updates.length > 1) {
    bindings.push(user.uid);
    await db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE uid = ?`).bind(...bindings).run();
  }

  const updatedRow = await db.prepare('SELECT * FROM users WHERE uid = ?').bind(user.uid).first<any>();
  const updatedBadges = JSON.parse(updatedRow.badges_json || '[]');
  const updatedIsMs = updatedRow.account_type === 'microsoft' || updatedRow.microsoft_verified === 1 || updatedBadges.includes('premium');
  return c.json({
    success: true,
    user: {
      ...updatedRow,
      accountType: updatedRow.account_type,
      avatarUrl: updatedRow.avatar_url,
      avatarBase64: updatedRow.avatar_url,
      favoriteMob: updatedRow.favorite_mob,
      mcUuid: updatedRow.mc_uuid || updatedRow.uuid,
      uuid: updatedRow.uuid || updatedRow.mc_uuid,
      clientVersion: updatedRow.client_version,
      microsoftVerified: Boolean(updatedIsMs),
      links: JSON.parse(updatedRow.links_json || '[]'),
      playstyleTags: JSON.parse(updatedRow.playstyle_tags_json || '[]'),
      badges: updatedBadges,
      role: user.role
    }
  });
});

// POST /api/v1/users/me/sync-version - Registrar versión de cliente del usuario
usersApp.post('/me/sync-version', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ clientVersion: string }>();
  if (!body.clientVersion) return c.json({ success: false, error: 'clientVersion required' }, 400);

  await c.env.DB.prepare(`
    UPDATE users SET client_version = ?, updated_at = datetime('now') WHERE uid = ?
  `).bind(body.clientVersion, user.uid).run();

  return c.json({ success: true });
});

// GET /api/v1/users/search - Búsqueda de usuarios (autocompletado insensible a mayúsculas/minúsculas)
usersApp.get('/search', optionalAuth, async (c) => {
  const q = (c.req.query('q') || '').trim().toLowerCase();
  if (!q) return c.json({ success: true, users: [], results: [] });

  const rows = await c.env.DB.prepare(`
    SELECT uid, username, account_type, avatar_url, mc_uuid, uuid, client_version, badges_json
    FROM users
    WHERE username_lower LIKE ?
    ORDER BY username_lower ASC
    LIMIT 30
  `).bind(`%${q}%`).all<any>();

  const results = (rows.results || []).map(r => ({
    uid: r.uid,
    username: r.username,
    accountType: r.account_type,
    avatarUrl: r.avatar_url,
    avatarBase64: r.avatar_url,
    mcUuid: r.mc_uuid || r.uuid,
    uuid: r.uuid || r.mc_uuid,
    clientVersion: r.client_version,
    badges: JSON.parse(r.badges_json || '[]')
  }));

  return c.json({ success: true, users: results, results });
});

// GET /api/v1/users/resolve-email/:username - Resolver email por username para login (sin depender de Firestore)
usersApp.get('/resolve-email/:username', optionalAuth, async (c) => {
  const username = c.req.param('username').toLowerCase();
  const db = c.env.DB;

  const row = await db.prepare('SELECT email FROM users WHERE username_lower = ? AND email IS NOT NULL LIMIT 1')
    .bind(username)
    .first<{ email: string }>();

  if (!row || !row.email) {
    return c.json({ success: false, error: 'User not found' }, 404);
  }

  return c.json({ success: true, email: row.email });
});

// POST /api/v1/users/microsoft/verify - Vincular verificación de cuenta Microsoft oficial
usersApp.post('/microsoft/verify', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    email: string;
    username: string;
    uuid: string;
  }>();

  if (!body.email || !body.username || !body.uuid) {
    return c.json({ success: false, error: 'Missing email, username or uuid' }, 400);
  }

  const emailKey = body.email.replace(/\./g, '_DOT_').replace(/@/g, '_AT_');
  const db = c.env.DB;

  // 1. Guardar en tabla microsoft_verified
  await db.prepare(`
    INSERT INTO microsoft_verified (email_key, email, username, uuid, firebase_uid, verified, verified_at)
    VALUES (?, ?, ?, ?, ?, 1, datetime('now'))
    ON CONFLICT(email_key) DO UPDATE SET
      username = excluded.username,
      uuid = excluded.uuid,
      firebase_uid = excluded.firebase_uid,
      verified = 1,
      verified_at = datetime('now')
  `).bind(emailKey, body.email, body.username, body.uuid, user.uid).run();

  // 2. Obtener badges existentes y añadir 'premium'
  const current = await db.prepare('SELECT badges_json FROM users WHERE uid = ?').bind(user.uid).first<{ badges_json: string }>();
  let badges: string[] = [];
  try {
    if (current?.badges_json) badges = JSON.parse(current.badges_json);
  } catch (_) {}
  if (!badges.includes('premium')) badges.push('premium');

  // 3. Crear o actualizar users en D1
  await db.prepare(`
    INSERT INTO users (uid, username, username_lower, email, uuid, mc_uuid, account_type, microsoft_verified, badges_json, links_json, playstyle_tags_json)
    VALUES (?, ?, ?, ?, ?, ?, 'microsoft', 1, ?, '[]', '[]')
    ON CONFLICT(uid) DO UPDATE SET
      account_type = 'microsoft',
      username = excluded.username,
      username_lower = excluded.username_lower,
      email = COALESCE(excluded.email, users.email),
      uuid = excluded.uuid,
      mc_uuid = excluded.mc_uuid,
      microsoft_verified = 1,
      badges_json = excluded.badges_json,
      updated_at = datetime('now')
  `).bind(user.uid, body.username, body.username.toLowerCase(), body.email, body.uuid, body.uuid, JSON.stringify(badges)).run();

  return c.json({ success: true, emailKey, verified: true });
});

// GET /api/v1/users/microsoft/status - Comprobar si una cuenta Microsoft ya está verificada
usersApp.get('/microsoft/status', optionalAuth, async (c) => {
  const username = c.req.query('username');
  const uuid = c.req.query('uuid');
  const email = c.req.query('email');
  if (!username && !uuid && !email) return c.json({ success: false, verified: false }, 400);

  const normalizedEmail = email ? email.trim().toLowerCase() : null;
  const emailKey = normalizedEmail ? normalizedEmail.replace(/\./g, '_DOT_').replace(/@/g, '_AT_') : null;

  const row = await c.env.DB.prepare(`
    SELECT * FROM microsoft_verified
    WHERE (? IS NOT NULL AND uuid = ?)
       OR (? IS NOT NULL AND LOWER(username) = LOWER(?))
       OR (? IS NOT NULL AND (email_key = ? OR LOWER(email) = ?))
    LIMIT 1
  `).bind(
    uuid || null, uuid || '',
    username || null, username || '',
    normalizedEmail, emailKey || '', normalizedEmail || ''
  ).first<any>();

  if (row && (row.verified === 1 || row.verified === true)) {
    let resolvedUid = row.firebase_uid || '';
    if (!resolvedUid) {
      const u = await c.env.DB.prepare(`
        SELECT uid FROM users WHERE mc_uuid = ? OR uuid = ? OR LOWER(username) = ? LIMIT 1
      `).bind(row.uuid || '', row.uuid || '', (row.username || '').toLowerCase()).first<{ uid: string }>();
      if (u?.uid) resolvedUid = u.uid;
    }
    return c.json({
      success: true,
      verified: true,
      email: row.email,
      firebase_uid: resolvedUid,
      username: row.username,
      uuid: row.uuid
    });
  }

  // Fallback: Si no está en microsoft_verified, comprobar directamente en users
  const cleanHex = uuid ? uuid.replace(/-/g, '').toLowerCase() : '';
  const userRow = await c.env.DB.prepare(`
    SELECT uid, username, email, mc_uuid, uuid, microsoft_verified, account_type FROM users
    WHERE (? IS NOT NULL AND (mc_uuid = ? OR uuid = ? OR LOWER(REPLACE(COALESCE(mc_uuid, ''), '-', '')) = ?))
       OR (? IS NOT NULL AND LOWER(username) = LOWER(?))
       OR (? IS NOT NULL AND LOWER(email) = LOWER(?))
    LIMIT 1
  `).bind(
    uuid || null, uuid || '', uuid || '', cleanHex || '',
    username || null, username || '',
    normalizedEmail, normalizedEmail || ''
  ).first<any>();

  if (userRow && (userRow.microsoft_verified === 1 || userRow.account_type === 'microsoft' || userRow.mc_uuid)) {
    return c.json({
      success: true,
      verified: true,
      email: userRow.email || '',
      firebase_uid: userRow.uid,
      username: userRow.username,
      uuid: userRow.mc_uuid || userRow.uuid
    });
  }

  return c.json({ success: true, verified: false });
});

// GET /api/v1/users/microsoft/pending-verify/:token
usersApp.get('/microsoft/pending-verify/:token', optionalAuth, async (c) => {
  const token = c.req.param('token');
  const row = await c.env.DB.prepare('SELECT * FROM pending_ms_verify WHERE token = ?').bind(token).first<any>();
  if (!row) return c.json({ success: false, error: 'token_not_found' }, 404);
  return c.json({ success: true, token: row.token, data: JSON.parse(row.data_json || '{}') });
});

// POST /api/v1/users/microsoft/pending-verify
usersApp.post('/microsoft/pending-verify', requireAuth, async (c) => {
  const body = await c.req.json<{ token: string; data: any }>();
  if (!body.token) return c.json({ success: false, error: 'token required' }, 400);

  await c.env.DB.prepare(`
    INSERT INTO pending_ms_verify (token, data_json, created_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(token) DO UPDATE SET data_json = excluded.data_json
  `).bind(body.token, JSON.stringify(body.data || {})).run();

  return c.json({ success: true });
});

// GET /api/v1/users/role-by-id/:identifier - Verificación estricta de rol staff/moderador SOLO por UID/UUID (NUNCA por username)
usersApp.get('/role-by-id/:identifier', optionalAuth, async (c) => {
  const rawId = (c.req.param('identifier') || '').trim();
  if (!rawId || rawId.startsWith('local_') || rawId.length < 16) {
    return c.json({ success: true, found: false, role: 'user', isAdmin: false, isMod: false });
  }

  const db = c.env.DB;
  const cleanHex = rawId.replace(/-/g, '').toLowerCase();

  const row = await db.prepare(`
    SELECT uid, badges_json, account_type
    FROM users
    WHERE uid = ?
       OR uuid = ?
       OR mc_uuid = ?
       OR LOWER(REPLACE(COALESCE(uuid, ''), '-', '')) = ?
       OR LOWER(REPLACE(COALESCE(mc_uuid, ''), '-', '')) = ?
    LIMIT 1
  `).bind(rawId, rawId, rawId, cleanHex, cleanHex).first<{ uid: string; badges_json: string | null; account_type: string | null }>();

  const resolvedUid = row?.uid || rawId;
  const adminRow = await db.prepare('SELECT role FROM admins WHERE uid = ? LIMIT 1')
    .bind(resolvedUid)
    .first<{ role: string }>()
    .catch(() => null);

  let parsedBadges: string[] = [];
  if (row?.badges_json) {
    try { parsedBadges = JSON.parse(row.badges_json); } catch (_) {}
  }

  const roleStr = (adminRow?.role || '').toLowerCase();
  const isAdmin = Boolean(roleStr === 'admin' || roleStr === 'owner' || parsedBadges.includes('creator'));
  const isMod = Boolean(isAdmin || roleStr === 'moderator' || roleStr === 'mod' || parsedBadges.includes('moderator'));

  return c.json({
    success: true,
    found: Boolean(row || adminRow),
    uid: resolvedUid,
    role: roleStr || (isAdmin ? 'admin' : isMod ? 'moderator' : 'user'),
    isAdmin,
    isMod
  });
});

// GET /api/v1/users/:uidOrUsername - Perfil público por UID, UUID o nombre de usuario
usersApp.get('/:uidOrUsername', optionalAuth, async (c) => {
  const identifier = c.req.param('uidOrUsername');
  const accountType = c.req.query('accountType');
  const db = c.env.DB;

  let row = await db.prepare('SELECT * FROM users WHERE uid = ?').bind(identifier).first<any>();
  if (!row) {
    const cleanUuid = identifier.replace(/-/g, '').toLowerCase();
    row = await db.prepare(`
      SELECT * FROM users
      WHERE uuid = ? OR mc_uuid = ? OR LOWER(REPLACE(COALESCE(uuid, ''), '-', '')) = ? OR LOWER(REPLACE(COALESCE(mc_uuid, ''), '-', '')) = ?
      LIMIT 1
    `).bind(identifier, identifier, cleanUuid, cleanUuid).first<any>();
  }
  if (!row) {
    if (accountType) {
      row = await db.prepare(`
        SELECT * FROM users
        WHERE username_lower = ? AND account_type = ?
        ORDER BY created_at DESC
        LIMIT 1
      `).bind(identifier.toLowerCase(), accountType).first<any>();
    } else {
      row = await db.prepare(`
        SELECT * FROM users
        WHERE username_lower = ?
        ORDER BY created_at DESC
        LIMIT 1
      `).bind(identifier.toLowerCase()).first<any>();
    }
  }

  if (!row) {
    return c.json({ success: false, error: 'user_not_found' }, 404);
  }

  // Ocultar email en perfiles públicos a menos que sea el propio usuario
  const currentUser = c.get('user');
  const isSelf = currentUser && currentUser.uid === row.uid;

  const parsedBadges = JSON.parse(row.badges_json || '[]');
  const isMs = row.account_type === 'microsoft' || row.microsoft_verified === 1 || parsedBadges.includes('premium');
  const adminRow = await db.prepare('SELECT role FROM admins WHERE uid = ?').bind(row.uid).first<{ role: string }>().catch(() => null);
  const roleStr = (adminRow?.role || '').toLowerCase();
  const isAdmin = Boolean(roleStr === 'admin' || roleStr === 'owner' || parsedBadges.includes('creator'));
  const isMod = Boolean(isAdmin || roleStr === 'moderator' || roleStr === 'mod' || parsedBadges.includes('moderator'));

  return c.json({
    success: true,
    user: {
      uid: row.uid,
      username: row.username,
      accountType: row.account_type,
      avatarUrl: row.avatar_url,
      avatarBase64: row.avatar_url,
      avatar_url: row.avatar_url,
      mcUuid: row.mc_uuid || row.uuid,
      uuid: row.uuid || row.mc_uuid,
      microsoftVerified: Boolean(isMs),
      role: roleStr || (isAdmin ? 'admin' : isMod ? 'moderator' : 'user'),
      isAdmin,
      isMod,
      biography: row.biography,
      favoriteMob: row.favorite_mob,
      country: row.country,
      background: row.background,
      clientVersion: row.client_version,
      links: JSON.parse(row.links_json || '[]'),
      playstyleTags: JSON.parse(row.playstyle_tags_json || '[]'),
      badges: parsedBadges,
      email: isSelf ? row.email : undefined,
      createdAt: row.created_at,
      created_at: row.created_at
    }
  });
});

