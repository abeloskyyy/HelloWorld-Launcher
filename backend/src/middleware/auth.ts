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
 * Middleware que verifica el Firebase ID Token enviado en Authorization: Bearer <token>
 * Valida la firma RS256 contra las claves públicas oficiales de Google (0 ms cold start).
 */
export const requireAuth = createMiddleware<{ Bindings: Env; Variables: CustomVariables }>(async (c, next) => {
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

    // Consulta de rol en D1 para RBAC (tabla admins + fallback a badges_json en users)
    let role: 'admin' | 'owner' | 'moderator' | 'mod' | 'user' = 'user';
    try {
      const adminRow = await c.env.DB.prepare('SELECT role FROM admins WHERE uid = ?').bind(uid).first<{ role: string }>();
      if (adminRow && adminRow.role) {
        role = adminRow.role as any;
      } else {
        const userRow = await c.env.DB.prepare('SELECT badges_json FROM users WHERE uid = ?').bind(uid).first<{ badges_json: string }>();
        if (userRow && userRow.badges_json) {
          const badges: string[] = JSON.parse(userRow.badges_json || '[]');
          if (badges.includes('creator')) role = 'admin';
          else if (badges.includes('moderator')) role = 'moderator';
        }
      }
    } catch (_) {}

    c.set('user', {
      uid,
      email: payload.email as string | undefined,
      role
    });

    await next();
  } catch (err: any) {
    return c.json({ success: false, error: 'Unauthorized: ' + (err.message || 'invalid token') }, 401);
  }
});

/**
 * Middleware de autenticación opcional (para endpoints como reviews o búsqueda que funcionan anónimos pero registran el UID si existe)
 */
export const optionalAuth = createMiddleware<{ Bindings: Env; Variables: CustomVariables }>(async (c, next) => {
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
        let role: any = 'user';
        try {
          const adminRow = await c.env.DB.prepare('SELECT role FROM admins WHERE uid = ?').bind(uid).first<{ role: string }>();
          if (adminRow && adminRow.role) {
            role = adminRow.role;
          } else {
            const userRow = await c.env.DB.prepare('SELECT badges_json FROM users WHERE uid = ?').bind(uid).first<{ badges_json: string }>();
            if (userRow && userRow.badges_json) {
              const badges: string[] = JSON.parse(userRow.badges_json || '[]');
              if (badges.includes('creator')) role = 'admin';
              else if (badges.includes('moderator')) role = 'moderator';
            }
          }
        } catch (_) {}
        c.set('user', { uid, email: payload.email as string | undefined, role });
      }
    } catch (_) {}
  }
  await next();
});

