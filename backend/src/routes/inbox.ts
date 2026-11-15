import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import type { Env, CustomVariables } from '../types/env';

export const inboxApp = new Hono<{ Bindings: Env; Variables: CustomVariables }>();

// GET /api/v1/inbox - Notificaciones recibidas
inboxApp.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const before = c.req.query('before');
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);

  let query = 'SELECT * FROM inbox WHERE recipient_uid = ? AND is_sent_copy = 0';
  const bindings: any[] = [user.uid];

  if (before) {
    query += ' AND created_at < ?';
    bindings.push(before);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  bindings.push(limit);

  const rows = await c.env.DB.prepare(query).bind(...bindings).all<any>();
  const items = (rows.results || []).map(r => ({
    id: r.id,
    senderId: r.sender_uid,
    senderName: r.sender_name,
    recipientUid: r.recipient_uid,
    recipientNames: JSON.parse(r.recipient_names_json || '[]'),
    type: r.type,
    content: r.content,
    read: Boolean(r.is_read),
    timestamp: r.created_at
  }));

  return c.json({ success: true, messages: items });
});

// GET /api/v1/inbox/sent - Mensajes enviados por el usuario
inboxApp.get('/sent', requireAuth, async (c) => {
  const user = c.get('user');
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);

  const rows = await c.env.DB.prepare(`
    SELECT * FROM inbox
    WHERE sender_uid = ? AND is_sent_copy = 1
    ORDER BY created_at DESC
    LIMIT ?
  `).bind(user.uid, limit).all<any>();

  const items = (rows.results || []).map(r => ({
    id: r.id,
    senderId: r.sender_uid,
    senderName: r.sender_name,
    recipientUid: r.recipient_uid,
    recipientNames: JSON.parse(r.recipient_names_json || '[]'),
    type: r.type,
    content: r.content,
    read: Boolean(r.is_read),
    timestamp: r.created_at
  }));

  return c.json({ success: true, messages: items });
});

// PATCH /api/v1/inbox/:id/read - Marcar notificación como leída
inboxApp.patch('/:id/read', requireAuth, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  await c.env.DB.prepare('UPDATE inbox SET is_read = 1 WHERE id = ? AND recipient_uid = ?').bind(id, user.uid).run();
  return c.json({ success: true });
});

// POST /api/v1/inbox/send - Enviar mensaje / notificación a uno o varios destinatarios
inboxApp.post('/send', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    targets: string[];
    names: string[];
    content: string;
    type?: string;
  }>();

  if (!body.content || !body.content.trim() || !Array.isArray(body.targets) || body.targets.length === 0) {
    return c.json({ success: false, error: 'invalid_payload' }, 400);
  }

  const db = c.env.DB;
  const now = new Date().toISOString();
  const senderDoc = await db.prepare('SELECT username FROM users WHERE uid = ?').bind(user.uid).first<{ username: string }>();
  const senderName = senderDoc?.username || user.uid;

  const stmts: any[] = [];

  // Copia enviada en el historial del remitente
  const sentId = `sent_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  stmts.push(
    db.prepare(`
      INSERT INTO inbox (id, recipient_uid, recipient_names_json, sender_uid, sender_name, type, content, is_read, is_sent_copy, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?)
    `).bind(sentId, user.uid, JSON.stringify(body.names || []), user.uid, senderName, body.type || 'message', body.content.trim(), now)
  );

  // Copia para cada destinatario
  for (const target of body.targets) {
    if (target === user.uid) continue;
    const msgId = `inbox_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    stmts.push(
      db.prepare(`
        INSERT INTO inbox (id, recipient_uid, recipient_names_json, sender_uid, sender_name, type, content, is_read, is_sent_copy, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
      `).bind(msgId, target, JSON.stringify(body.names || []), user.uid, senderName, body.type || 'message', body.content.trim(), now)
    );
  }

  await db.batch(stmts);
  return c.json({ success: true });
});

