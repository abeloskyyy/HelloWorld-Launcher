import { createMiddleware } from 'hono/factory';
import type { Env, CustomVariables } from '../types/env';

export const requireAdmin = createMiddleware<{ Bindings: Env; Variables: CustomVariables }>(async (c, next) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  if (!user.isTokenVerified) {
    return c.json({ success: false, error: 'Forbidden: Cryptographically verified token required for admin actions' }, 403);
  }

  const role = (user.role || '').toLowerCase();
  if (role !== 'admin' && role !== 'owner') {
    return c.json({ success: false, error: 'Forbidden: Admin access required' }, 403);
  }

  await next();
});

export const requireModerator = createMiddleware<{ Bindings: Env; Variables: CustomVariables }>(async (c, next) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  if (!user.isTokenVerified) {
    return c.json({ success: false, error: 'Forbidden: Cryptographically verified token required for staff actions' }, 403);
  }

  const role = (user.role || '').toLowerCase();
  if (role !== 'admin' && role !== 'owner' && role !== 'moderator' && role !== 'mod') {
    return c.json({ success: false, error: 'Forbidden: Staff access required' }, 403);
  }

  await next();
});

