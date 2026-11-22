import { Hono } from 'hono';
import { requireAuth, optionalAuth } from '../middleware/auth';
import type { Env, CustomVariables } from '../types/env';

export const statsApp = new Hono<{ Bindings: Env; Variables: CustomVariables }>();

// GET /api/v1/stats/:uid - Obtener estadísticas de un usuario (público o autenticado)
statsApp.get('/:uid', optionalAuth, async (c) => {
  const targetUid = c.req.param('uid');
  const user = c.get('user');
  let effectiveUid = targetUid;
  if (targetUid === 'me') {
    if (!user || !user.uid) {
      return c.json({ success: false, error: 'Unauthorized: login required for /me' }, 401);
    }
    effectiveUid = user.uid;
  }
  const db = c.env.DB;

  let row = await db.prepare('SELECT * FROM stats WHERE uid = ?').bind(effectiveUid).first<any>();

  if (!row) {
    // Buscar si effectiveUid es un Mojang UUID, UUID secundario, o nombre de usuario
    const cleanHex = effectiveUid.replace(/-/g, '').toLowerCase();
    row = await db.prepare(`
      SELECT s.* FROM stats s
      JOIN users u ON u.uid = s.uid
      WHERE u.uid = ? OR u.mc_uuid = ? OR u.uuid = ? OR LOWER(REPLACE(COALESCE(u.mc_uuid, ''), '-', '')) = ? OR LOWER(u.username) = LOWER(?)
      LIMIT 1
    `).bind(effectiveUid, effectiveUid, effectiveUid, cleanHex, effectiveUid).first<any>();
  }

  if (!row) {
    // Si no tiene estadísticas registradas aún
    row = {
      uid: effectiveUid,
      total_hours: 0,
      streak: 0,
      max_streak: 0,
      last_played: 0,
      total_sessions: 0,
      total_days_played: 0,
      extra_stats_json: '{}'
    };
  }

  // Calcular racha efectiva según la fecha actual
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const lastDate = row.last_played ? new Date(row.last_played).toISOString().split('T')[0] : null;

  let effectiveStreak = row.streak || 0;
  let streakCompletedToday = false;
  const dbMaxStreak = row.max_streak || 0;
  const dbStreak = row.streak || 0;

  if (lastDate === todayStr) {
    streakCompletedToday = true;
  } else if (lastDate !== yesterdayStr && effectiveStreak > 0) {
    // Racha perdida
    effectiveStreak = 0;
  }

  const realMaxStreak = Math.max(dbMaxStreak, dbStreak);

  return c.json({
    success: true,
    stats: {
      totalHours: row.total_hours || 0,
      streak: effectiveStreak,
      maxStreak: realMaxStreak,
      lastPlayed: row.last_played || 0,
      totalSessions: row.total_sessions || 0,
      totalDaysPlayed: row.total_days_played || 0,
      streakCompletedToday,
      extra: JSON.parse(row.extra_stats_json || '{}')
    }
  });
});

// POST /api/v1/stats/record - Registrar fin de sesión de juego y actualizar horas/rachas
statsApp.post('/record', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    addedHours?: number;
    extraStats?: any;
  }>();

  const db = c.env.DB;
  let current = await db.prepare('SELECT * FROM stats WHERE uid = ?').bind(user.uid).first<any>();

  if (!current) {
    await db.prepare(`
      INSERT INTO stats (uid, total_hours, streak, max_streak, last_played, total_sessions, total_days_played)
      VALUES (?, 0, 0, 0, 0, 0, 0)
    `).bind(user.uid).run();
    current = { total_hours: 0, streak: 0, max_streak: 0, last_played: 0, total_sessions: 0, total_days_played: 0 };
  }

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const lastDate = current.last_played ? new Date(current.last_played).toISOString().split('T')[0] : null;

  let streak = current.streak || 0;
  let totalDaysPlayed = current.total_days_played || 0;
  let maxStreak = current.max_streak || streak || 0;

  if (lastDate !== todayStr) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastDate === yesterdayStr) {
      streak += 1;
    } else {
      streak = 1;
    }
    totalDaysPlayed += 1;
    if (streak > maxStreak) maxStreak = streak;
  }

  const newTotalHours = Math.round(((current.total_hours || 0) + (body.addedHours || 0)) * 100) / 100;
  const newSessions = (current.total_sessions || 0) + 1;
  const nowMs = now.getTime();

  await db.prepare(`
    UPDATE stats SET
      total_hours = ?,
      streak = ?,
      max_streak = ?,
      last_played = ?,
      total_sessions = ?,
      total_days_played = ?,
      updated_at = datetime('now')
    WHERE uid = ?
  `).bind(newTotalHours, streak, maxStreak, nowMs, newSessions, totalDaysPlayed, user.uid).run();

  return c.json({
    success: true,
    stats: {
      totalHours: newTotalHours,
      streak,
      maxStreak,
      lastPlayed: nowMs,
      totalSessions: newSessions,
      totalDaysPlayed,
      streakCompletedToday: true
    }
  });
});

// POST /api/v1/stats/revert-streak - Revertir racha errónea del día
statsApp.post('/revert-streak', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const current = await db.prepare('SELECT * FROM stats WHERE uid = ?').bind(user.uid).first<any>();
  if (!current || !current.last_played) return c.json({ success: false, error: 'NO_STATS' });

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const lastDate = new Date(current.last_played).toISOString().split('T')[0];
  if (lastDate !== todayStr) return c.json({ success: false, message: 'Streak was not recorded today' });

  const newStreak = Math.max(0, (current.streak || 1) - 1);
  const newSessions = Math.max(0, (current.total_sessions || 1) - 1);
  const newDays = Math.max(0, (current.total_days_played || 1) - 1);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  await db.prepare(`
    UPDATE stats SET streak = ?, total_sessions = ?, total_days_played = ?, last_played = ?, updated_at = datetime('now')
    WHERE uid = ?
  `).bind(newStreak, newSessions, newDays, newStreak > 0 ? yesterday.getTime() : 0, user.uid).run();

  return c.json({ success: true, newStreak });
});
