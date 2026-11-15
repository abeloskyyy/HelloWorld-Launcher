import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import type { Env, CustomVariables } from '../types/env';

export const presenceApp = new Hono<{ Bindings: Env; Variables: CustomVariables }>();

const TIMEOUT_MS = 35000; // 35 segundos de umbral para desconexión automática
const KV_TTL_SECONDS = 120; // 120 segundos para limpieza automática de KV

interface PresenceRecord {
  status: string;
  statusText?: string;
  mcVersion?: string;
  instanceName?: string;
  serverIp?: string;
  worldName?: string;
  playerName?: string;
  clientVersion?: string;
  lastSeen: number;
}

// POST /api/v1/presence/heartbeat - Latido enviado cada 20 segundos
presenceApp.post('/heartbeat', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json<Partial<PresenceRecord>>();
  const kv = c.env.PRESENCE_KV;

  const record: PresenceRecord = {
    status: body.status || 'online',
    statusText: body.statusText || '',
    mcVersion: body.mcVersion || '',
    instanceName: body.instanceName || '',
    serverIp: body.serverIp || '',
    worldName: body.worldName || '',
    playerName: body.playerName || '',
    clientVersion: body.clientVersion || '',
    lastSeen: Date.now()
  };

  await kv.put(`presence:${user.uid}`, JSON.stringify(record), {
    expirationTtl: KV_TTL_SECONDS
  });

  return c.json({ success: true, status: record.status, lastSeen: record.lastSeen });
});

// POST /api/v1/presence/offline - Desconexión explícita inmediata (al cerrar el launcher)
presenceApp.post('/offline', requireAuth, async (c) => {
  const user = c.get('user');
  const kv = c.env.PRESENCE_KV;

  const record: PresenceRecord = {
    status: 'offline',
    lastSeen: 0
  };

  await kv.put(`presence:${user.uid}`, JSON.stringify(record), { expirationTtl: 60 });
  return c.json({ success: true });
});

// GET /api/v1/presence/batch?uids=u1,u2,u3 - Consulta masiva para la lista de amigos
presenceApp.get('/batch', requireAuth, async (c) => {
  const uidsParam = c.req.query('uids') || '';
  const uids = uidsParam.split(',').map(u => u.trim()).filter(Boolean);
  const kv = c.env.PRESENCE_KV;
  const now = Date.now();

  const results: Record<string, any> = {};

  await Promise.all(
    uids.map(async (uid) => {
      try {
        const raw = await kv.get(`presence:${uid}`);
        if (!raw) {
          results[uid] = { status: 'offline' };
          return;
        }
        const record: PresenceRecord = JSON.parse(raw);
        const isOnline = (now - record.lastSeen) <= TIMEOUT_MS && record.status !== 'offline';
        results[uid] = isOnline ? record : { status: 'offline' };
      } catch (_) {
        results[uid] = { status: 'offline' };
      }
    })
  );

  return c.json({ success: true, presence: results });
});

// GET /api/v1/presence/:uid - Consulta individual
presenceApp.get('/:uid', requireAuth, async (c) => {
  const uid = c.req.param('uid');
  const kv = c.env.PRESENCE_KV;

  const raw = await kv.get(`presence:${uid}`);
  if (!raw) {
    return c.json({ success: true, presence: { status: 'offline' } });
  }

  const record: PresenceRecord = JSON.parse(raw);
  const isOnline = (Date.now() - record.lastSeen) <= TIMEOUT_MS && record.status !== 'offline';

  if (!isOnline) {
    return c.json({ success: true, presence: { status: 'offline' } });
  }

  return c.json({ success: true, presence: record });
});
