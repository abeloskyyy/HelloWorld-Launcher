import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import type { Env, CustomVariables } from '../types/env';

export const chatApp = new Hono<{ Bindings: Env; Variables: CustomVariables }>();

// GET /api/v1/chat/channels/:id/messages - Historial de mensajes (paginado)
chatApp.get('/channels/:id/messages', requireAuth, async (c) => {
  const user = c.get('user');
  const friendshipId = c.req.param('id');
  const before = c.req.query('before');
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
  const db = c.env.DB;

  // 1. Verificar membresía
  const isMember = await db.prepare('SELECT 1 FROM friendship_members WHERE friendship_id = ? AND uid = ?').bind(friendshipId, user.uid).first();
  if (!isMember) return c.json({ success: false, error: 'not_member' }, 403);

  let query = 'SELECT * FROM messages WHERE friendship_id = ?';
  const bindings: any[] = [friendshipId];

  if (before) {
    query += ' AND created_at < ?';
    bindings.push(before);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  bindings.push(limit);

  const rows = await db.prepare(query).bind(...bindings).all<any>();
  const messages = (rows.results || []).reverse().map(m => ({
    id: m.id,
    senderId: m.sender_id,
    content: m.content,
    timestamp: m.created_at,
    status: m.status,
    edited: Boolean(m.edited),
    editedAt: m.edited_at,
    replyTo: m.reply_to ? {
      id: m.reply_to,
      content: m.reply_content,
      senderId: m.reply_sender,
      senderName: m.reply_sender_name
    } : null
  }));

  return c.json({ success: true, messages });
});

// POST /api/v1/chat/channels/:id/messages - Enviar mensaje
chatApp.post('/channels/:id/messages', requireAuth, async (c) => {
  const user = c.get('user');
  const friendshipId = c.req.param('id');
  const body = await c.req.json<{
    content: string;
    replyTo?: { id: string; content: string; senderId: string; senderName?: string };
  }>();

  if (!body.content || !body.content.trim()) {
    return c.json({ success: false, error: 'empty_message' }, 400);
  }

  const db = c.env.DB;

  // Verificar membresía
  const isMember = await db.prepare('SELECT 1 FROM friendship_members WHERE friendship_id = ? AND uid = ?').bind(friendshipId, user.uid).first();
  if (!isMember) return c.json({ success: false, error: 'not_member' }, 403);

  const msgId = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();

  await db.batch([
    // Insertar mensaje
    db.prepare(`
      INSERT INTO messages (
        id, friendship_id, sender_id, content, status,
        reply_to, reply_content, reply_sender, reply_sender_name, created_at
      ) VALUES (?, ?, ?, ?, 'sent', ?, ?, ?, ?, ?)
    `).bind(
      msgId,
      friendshipId,
      user.uid,
      body.content.trim(),
      body.replyTo?.id || null,
      body.replyTo?.content || null,
      body.replyTo?.senderId || null,
      body.replyTo?.senderName || null,
      now
    ),
    // Actualizar fecha de último mensaje en la conversación
    db.prepare("UPDATE friendships SET last_message_at = ? WHERE id = ?").bind(now, friendshipId),
    // Incrementar no leídos para el resto de miembros
    db.prepare(`
      UPDATE friendship_members SET unread_count = unread_count + 1
      WHERE friendship_id = ? AND uid != ?
    `).bind(friendshipId, user.uid)
  ]);

  return c.json({ success: true, msgId, timestamp: now });
});

// PATCH /api/v1/chat/channels/:id/messages/:msgId - Editar mensaje propio
chatApp.patch('/channels/:id/messages/:msgId', requireAuth, async (c) => {
  const user = c.get('user');
  const friendshipId = c.req.param('id');
  const msgId = c.req.param('msgId');
  const body = await c.req.json<{ content: string }>();

  if (!body.content || !body.content.trim()) {
    return c.json({ success: false, error: 'empty_message' }, 400);
  }

  const db = c.env.DB;
  const msg = await db.prepare('SELECT sender_id FROM messages WHERE id = ? AND friendship_id = ?').bind(msgId, friendshipId).first<any>();
  if (!msg) return c.json({ success: false, error: 'not_found' }, 404);
  if (msg.sender_id !== user.uid) return c.json({ success: false, error: 'not_owner' }, 403);

  const now = new Date().toISOString();
  await db.prepare(`
    UPDATE messages SET content = ?, edited = 1, edited_at = ? WHERE id = ?
  `).bind(body.content.trim(), now, msgId).run();

  return c.json({ success: true, editedAt: now });
});

// DELETE /api/v1/chat/channels/:id/messages/:msgId - Eliminar mensaje propio
chatApp.delete('/channels/:id/messages/:msgId', requireAuth, async (c) => {
  const user = c.get('user');
  const friendshipId = c.req.param('id');
  const msgId = c.req.param('msgId');
  const db = c.env.DB;

  const msg = await db.prepare('SELECT sender_id FROM messages WHERE id = ? AND friendship_id = ?').bind(msgId, friendshipId).first<any>();
  if (!msg) return c.json({ success: false, error: 'not_found' }, 404);
  if (msg.sender_id !== user.uid) return c.json({ success: false, error: 'not_owner' }, 403);

  await db.prepare('DELETE FROM messages WHERE id = ?').bind(msgId).run();
  return c.json({ success: true });
});

// POST /api/v1/chat/channels/:id/read - Marcar conversación como leída
chatApp.post('/channels/:id/read', requireAuth, async (c) => {
  const user = c.get('user');
  const friendshipId = c.req.param('id');
  const db = c.env.DB;

  await db.batch([
    db.prepare('UPDATE friendship_members SET unread_count = 0 WHERE friendship_id = ? AND uid = ?').bind(friendshipId, user.uid),
    db.prepare("UPDATE messages SET status = 'delivered' WHERE friendship_id = ? AND sender_id != ? AND status = 'sent'").bind(friendshipId, user.uid)
  ]);

  return c.json({ success: true });
});

// GET /api/v1/chat/channels/:id/reply-state - Obtener estado de respuesta/borrador
chatApp.get('/channels/:id/reply-state', requireAuth, async (c) => {
  const user = c.get('user');
  const friendshipId = c.req.param('id');
  const row = await c.env.DB.prepare('SELECT reply_state_json FROM friendship_members WHERE friendship_id = ? AND uid = ?').bind(friendshipId, user.uid).first<any>();
  return c.json({ success: true, reply: row?.reply_state_json ? JSON.parse(row.reply_state_json) : null });
});

// POST /api/v1/chat/channels/:id/reply-state - Guardar estado de respuesta/borrador
chatApp.post('/channels/:id/reply-state', requireAuth, async (c) => {
  const user = c.get('user');
  const friendshipId = c.req.param('id');
  const body = await c.req.json<any>();

  await c.env.DB.prepare(`
    UPDATE friendship_members SET reply_state_json = ? WHERE friendship_id = ? AND uid = ?
  `).bind(body.reply ? JSON.stringify(body.reply) : null, friendshipId, user.uid).run();

  return c.json({ success: true });
});

// PATCH /api/v1/chat/groups/:id - Editar metadatos del grupo
chatApp.patch('/groups/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const groupId = c.req.param('id');
  const body = await c.req.json<{ name?: string; icon?: string; imageBase64?: string }>();
  const db = c.env.DB;

  const group = await db.prepare('SELECT admins_json FROM friendships WHERE id = ? AND is_group = 1').bind(groupId).first<any>();
  if (!group) return c.json({ success: false, error: 'group_not_found' }, 404);

  const admins = JSON.parse(group.admins_json || '[]');
  if (!admins.includes(user.uid)) return c.json({ success: false, error: 'not_admin' }, 403);

  const iconVal = body.icon || body.imageBase64;
  await db.prepare('UPDATE friendships SET name = COALESCE(?, name), icon = COALESCE(?, icon) WHERE id = ?')
    .bind(body.name || null, iconVal || null, groupId).run();

  return c.json({ success: true });
});

// POST /api/v1/chat/groups/:id/members - Añadir miembros al grupo
chatApp.post('/groups/:id/members', requireAuth, async (c) => {
  const user = c.get('user');
  const groupId = c.req.param('id');
  const body = await c.req.json<{ memberUids: string[] }>();
  const db = c.env.DB;

  const group = await db.prepare('SELECT admins_json FROM friendships WHERE id = ? AND is_group = 1').bind(groupId).first<any>();
  if (!group) return c.json({ success: false, error: 'group_not_found' }, 404);

  const admins = JSON.parse(group.admins_json || '[]');
  if (!admins.includes(user.uid)) return c.json({ success: false, error: 'not_admin' }, 403);

  const stmts: any[] = [];
  for (const mUid of (body.memberUids || [])) {
    stmts.push(
      db.prepare(`
        INSERT INTO friendship_members (friendship_id, uid, unread_count, joined_at)
        VALUES (?, ?, 0, datetime('now'))
        ON CONFLICT(friendship_id, uid) DO NOTHING
      `).bind(groupId, mUid)
    );
  }

  if (stmts.length > 0) {
    await db.batch(stmts);
  }

  return c.json({ success: true });
});

// DELETE /api/v1/chat/groups/:id/members/:uid - Expulsar miembro del grupo
chatApp.delete('/groups/:id/members/:targetUid', requireAuth, async (c) => {
  const user = c.get('user');
  const groupId = c.req.param('id');
  const targetUid = c.req.param('targetUid');
  const db = c.env.DB;

  const group = await db.prepare('SELECT admins_json FROM friendships WHERE id = ? AND is_group = 1').bind(groupId).first<any>();
  if (!group) return c.json({ success: false, error: 'group_not_found' }, 404);

  const admins = JSON.parse(group.admins_json || '[]');
  if (!admins.includes(user.uid) && targetUid !== user.uid) {
    return c.json({ success: false, error: 'not_admin' }, 403);
  }

  await db.prepare('DELETE FROM friendship_members WHERE friendship_id = ? AND uid = ?').bind(groupId, targetUid).run();
  return c.json({ success: true });
});

// POST /api/v1/chat/groups - Crear nuevo grupo de chat
chatApp.post('/groups', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ name: string; icon?: string; memberUids: string[] }>();

  if (!body.name || !body.name.trim()) return c.json({ success: false, error: 'group_name_required' }, 400);

  const groupId = `group_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const allMembers = Array.from(new Set([user.uid, ...(body.memberUids || [])]));
  const db = c.env.DB;

  const stmts: any[] = [
    db.prepare(`
      INSERT INTO friendships (id, type, is_group, name, icon, admins_json, created_at)
      VALUES (?, 'group', 1, ?, ?, ?, datetime('now'))
    `).bind(groupId, body.name.trim(), body.icon || null, JSON.stringify([user.uid]))
  ];

  for (const mUid of allMembers) {
    stmts.push(
      db.prepare(`
        INSERT INTO friendship_members (friendship_id, uid, unread_count, joined_at)
        VALUES (?, ?, 0, datetime('now'))
      `).bind(groupId, mUid)
    );
  }

  await db.batch(stmts);
  return c.json({ success: true, groupId });
});

// GET /api/v1/chat/groups/:id - Obtener detalles del grupo y perfiles de miembros
chatApp.get('/groups/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const groupId = c.req.param('id');
  const db = c.env.DB;

  const isMember = await db.prepare('SELECT 1 FROM friendship_members WHERE friendship_id = ? AND uid = ?').bind(groupId, user.uid).first();
  if (!isMember) return c.json({ success: false, error: 'not_member' }, 403);

  const group = await db.prepare('SELECT * FROM friendships WHERE id = ? AND is_group = 1').bind(groupId).first<any>();
  if (!group) return c.json({ success: false, error: 'group_not_found' }, 404);

  const members = await db.prepare('SELECT uid FROM friendship_members WHERE friendship_id = ?').bind(groupId).all<{ uid: string }>();
  const memberUids = (members.results || []).map(m => m.uid);
  const admins = JSON.parse(group.admins_json || '[]');

  const profiles: any[] = [];
  for (const mUid of memberUids) {
    const p = await db.prepare('SELECT uid, username, account_type, avatar_url, client_version, badges_json FROM users WHERE uid = ?').bind(mUid).first<any>();
    if (p) {
      profiles.push({
        uid: p.uid,
        username: p.username,
        accountType: p.account_type,
        avatarBase64: p.avatar_url || '',
        avatarUrl: p.avatar_url || '',
        clientVersion: p.client_version || '',
        badges: JSON.parse(p.badges_json || '[]')
      });
    } else {
      profiles.push({ uid: mUid, username: 'Unknown', accountType: 'helloworld', avatarBase64: '', badges: [] });
    }
  }

  return c.json({
    success: true,
    group: {
      id: group.id,
      name: group.name,
      description: '',
      imageBase64: group.icon || '',
      icon: group.icon || '',
      members: memberUids,
      admin: admins[0] || user.uid,
      admins,
      createdAt: group.created_at
    },
    profiles
  });
});

// POST /api/v1/chat/groups/:id/admins - Promover miembro a admin de grupo
chatApp.post('/groups/:id/admins', requireAuth, async (c) => {
  const user = c.get('user');
  const groupId = c.req.param('id');
  const body = await c.req.json<{ memberUid: string }>();
  const db = c.env.DB;

  const group = await db.prepare('SELECT admins_json FROM friendships WHERE id = ? AND is_group = 1').bind(groupId).first<any>();
  if (!group) return c.json({ success: false, error: 'group_not_found' }, 404);

  const admins = JSON.parse(group.admins_json || '[]');
  if (!admins.includes(user.uid)) return c.json({ success: false, error: 'not_admin' }, 403);

  const isMember = await db.prepare('SELECT 1 FROM friendship_members WHERE friendship_id = ? AND uid = ?').bind(groupId, body.memberUid).first();
  if (!isMember) return c.json({ success: false, error: 'not_member' }, 404);

  if (!admins.includes(body.memberUid)) {
    admins.push(body.memberUid);
    await db.prepare('UPDATE friendships SET admins_json = ? WHERE id = ?').bind(JSON.stringify(admins), groupId).run();
  }

  return c.json({ success: true, admins });
});

// DELETE /api/v1/chat/groups/:id/admins/:adminUid - Degradar admin de grupo
chatApp.delete('/groups/:id/admins/:adminUid', requireAuth, async (c) => {
  const user = c.get('user');
  const groupId = c.req.param('id');
  const adminUid = c.req.param('adminUid');
  const db = c.env.DB;

  const group = await db.prepare('SELECT admins_json FROM friendships WHERE id = ? AND is_group = 1').bind(groupId).first<any>();
  if (!group) return c.json({ success: false, error: 'group_not_found' }, 404);

  const admins = JSON.parse(group.admins_json || '[]');
  const owner = admins[0];
  if (user.uid !== owner && user.uid !== adminUid) {
    return c.json({ success: false, error: 'not_owner' }, 403);
  }

  const newAdmins = admins.filter((a: string) => a !== adminUid);
  if (newAdmins.length === 0) newAdmins.push(user.uid);

  await db.prepare('UPDATE friendships SET admins_json = ? WHERE id = ?').bind(JSON.stringify(newAdmins), groupId).run();
  return c.json({ success: true, admins: newAdmins });
});
