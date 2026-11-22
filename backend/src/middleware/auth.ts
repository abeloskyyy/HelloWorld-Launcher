import { createMiddleware } from 'hono/factory';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Env, CustomVariables } from '../types/env';

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!_jwks) {
    _jwks = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL), {
      cooldownDuration: 30000,
      cacheMaxAge: 600000
    });
  }
  return _jwks;
}

/**
 * Resuelve el rol y UID de un usuario desde D1 (tabla admins + users.badges_json)
 * ESTRICTAMENTE basado en UID (nunca por nombre de usuario, para evitar colisiones entre cuentas distintas con el mismo nick)
 */
async function resolveRole(db: D1Database, uid?: string, username?: string): Promise<{ uid: string; role: 'admin' | 'owner' | 'moderator' | 'mod' | 'user' }> {
  let role: 'admin' | 'owner' | 'moderator' | 'mod' | 'user' = 'user';
  let resolvedUid = uid || '';

  // 1. Si se envía un UID, verificar si corresponde directamente o a mc_uuid / uuid de un usuario ya registrado en D1
  if (resolvedUid) {
    try {
      const cleanHex = resolvedUid.replace(/-/g, '').toLowerCase();
      const existingUser = await db.prepare(`
        SELECT uid, badges_json FROM users
        WHERE uid = ? OR mc_uuid = ? OR uuid = ? OR LOWER(REPLACE(COALESCE(mc_uuid, ''), '-', '')) = ?
        LIMIT 1
      `).bind(resolvedUid, resolvedUid, resolvedUid, cleanHex).first<{ uid: string; badges_json: string }>();

      if (existingUser && existingUser.uid) {
        resolvedUid = existingUser.uid;
        if (existingUser.badges_json) {
          const badges: string[] = JSON.parse(existingUser.badges_json || '[]');
          if (badges.includes('creator')) role = 'admin';
          else if (badges.includes('moderator')) role = 'moderator';
        }
      }
    } catch (_) {}
  }

  // 2. Verificación directa en la tabla admins estrictamente por UID
  if (resolvedUid) {
    try {
      const adminRow = await db.prepare('SELECT role FROM admins WHERE uid = ?').bind(resolvedUid).first<{ role: string }>();
      if (adminRow && adminRow.role) {
        role = adminRow.role as any;
      }
    } catch (_) {}
  }

  // 3. Verificación secundaria de badges en la tabla users estrictamente por UID
  if (role === 'user' && resolvedUid) {
    try {
      const userRow = await db.prepare('SELECT uid, badges_json FROM users WHERE uid = ?').bind(resolvedUid).first<{ uid: string; badges_json: string }>();
      if (userRow && userRow.badges_json) {
        const badges: string[] = JSON.parse(userRow.badges_json || '[]');
        if (badges.includes('creator')) role = 'admin';
        else if (badges.includes('moderator')) role = 'moderator';
      }
    } catch (_) {}
  }

  return { uid: resolvedUid || uid || (username ? `local_${username}` : ''), role };
}

/**
 * Middleware que verifica autenticación:
 * 1. Firma interna del Launcher de escritorio (X-Launcher-Secret + X-User-Username / X-User-Uid)
 * 2. O Firebase ID Token en Authorization: Bearer <token>
 */
export const requireAuth = createMiddleware<{ Bindings: Env; Variables: CustomVariables }>(async (c, next) => {
  // 1. Verificación por secreto interno del Launcher
  const launcherSecret = c.req.header('X-Launcher-Secret');
  const userUsername = c.req.header('X-User-Username');
  const userUid = c.req.header('X-User-Uid');
  const expectedSecret = c.env.LAUNCHER_SECRET || 'hwl_sec_7f9b8c2d1e0a4f5b9c8d7e6a5b4c3d2e1';

  if (launcherSecret && launcherSecret === expectedSecret && (userUid || userUsername)) {
    const { uid } = await resolveRole(c.env.DB, userUid, userUsername);
    c.set('user', {
      uid,
      role: 'user', // CRITICAL: Static launcher secret can never claim staff or admin privileges
      isTokenVerified: false
    });
    return await next();
  }

  // 2. Verificación por Firebase ID Token
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Unauthorized: missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.slice(7).trim();
  const projectId = c.env.FIREBASE_PROJECT_ID || 'helloworld-launcher';

  try {
    const JWKS = getJWKS();
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId
    });

    const uid = (payload.user_id as string) || (payload.sub as string);
    if (!uid) {
      return c.json({ success: false, error: 'Unauthorized: token missing user_id' }, 401);
    }

    const { role } = await resolveRole(c.env.DB, uid);

    c.set('user', {
      uid,
      email: payload.email as string | undefined,
      role,
      isTokenVerified: true
    });

    await next();
  } catch (err: any) {
    return c.json({ success: false, error: 'Unauthorized: ' + (err.message || 'invalid token') }, 401);
  }
});

/**
 * Middleware de autenticación opcional
 */
export const optionalAuth = createMiddleware<{ Bindings: Env; Variables: CustomVariables }>(async (c, next) => {
  // 1. Verificación por secreto interno del Launcher
  const launcherSecret = c.req.header('X-Launcher-Secret');
  const userUsername = c.req.header('X-User-Username');
  const userUid = c.req.header('X-User-Uid');
  const expectedSecret = c.env.LAUNCHER_SECRET || 'hwl_sec_7f9b8c2d1e0a4f5b9c8d7e6a5b4c3d2e1';

  if (launcherSecret && launcherSecret === expectedSecret && (userUid || userUsername)) {
    try {
      const { uid } = await resolveRole(c.env.DB, userUid, userUsername);
      c.set('user', { uid, role: 'user', isTokenVerified: false });
    } catch (_) {}
    return await next();
  }

  // 2. Verificación por Firebase ID Token
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const projectId = c.env.FIREBASE_PROJECT_ID || 'helloworld-launcher';
    try {
      const JWKS = getJWKS();
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: `https://securetoken.google.com/${projectId}`,
        audience: projectId
      });
      const uid = (payload.user_id as string) || (payload.sub as string);
      if (uid) {
        const { role } = await resolveRole(c.env.DB, uid);
        c.set('user', { uid, email: payload.email as string | undefined, role, isTokenVerified: true });
      }
    } catch (_) {}
  }
  await next();
});
