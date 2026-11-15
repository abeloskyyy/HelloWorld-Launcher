import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import type { Env, CustomVariables } from '../types/env';

export const socialApp = new Hono<{ Bindings: Env; Variables: CustomVariables }>();

// GET /api/v1/social/friends - Lista de amigos y grupos con último mensaje y contador de no leídos
socialApp.get('/friends', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  // 1. Obtener todas las membresías del usuario
  const members = await db.prepare(`
    SELECT fm.friendship_id, fm.unread_count, fm.reply_state_json,
           f.type, f.is_group, f.name, f.icon, f.admins_json, f.last_message_at, f.created_at
    FROM friendship_members fm
    JOIN friendships f ON fm.friendship_id = f.id
    WHERE fm.uid = ?
    ORDER BY COALESCE(f.last_message_at, f.created_at) DESC
  `).bind(user.uid).all<any>();

  const list = await Promise.all(
    (members.results || []).map(async (m) => {
      // Obtener todos los miembros de este canal
      const allMembers = await db.prepare(`
        SELECT uid FROM friendship_members WHERE friendship_id = ?
      `).bind(m.friendship_id).all<{ uid: string }>();

      const uids = (allMembers.results || []).map(r => r.uid);
      const otherUid = uids.find(id => id !== user.uid) || user.uid;

      // Obtener último mensaje
      const lastMsg = await db.prepare(`
        SELECT id, sender_id, content, status, created_at, reply_to
        FROM messages
        WHERE friendship_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `).bind(m.friendship_id).first<any>();

      let profile: any = null;
      let presence: any = { status: 'offline' };
      if (!m.is_group && otherUid) {
        const p = await db.prepare(`
          SELECT uid, username, account_type, avatar_url, client_version, badges_json
        FROM users WHERE uid = ?
        `).bind(otherUid).first<any>();
        if (p) {
          profile = {
            uid: p.uid,
            username: p.username,
            accountType: p.account_type,
            avatarBase64: p.avatar_url || '',
            clientVersion: p.client_version || '',
            badges: JSON.parse(p.badges_json || '[]')
          };
        } else {
          profile = { uid: otherUid, username: 'Unknown', accountType: 'helloworld', avatarBase64: '', clientVersion: '', badges: [] };
        }

        try {
          const rawPres = await c.env.PRESENCE_KV.get(`presence:${otherUid}`);
          if (rawPres) {
            const pRec = JSON.parse(rawPres);
            const isOnline = (Date.now() - pRec.lastSeen) <= 35000 && pRec.status !== 'offline';
            presence = isOnline ? pRec : { status: 'offline' };
          }
        } catch (_) {}
      }

      const adminsList = JSON.parse(m.admins_json || '[]');

      return {
        id: m.friendship_id,
        friendshipId: m.friendship_id,
        type: m.type,
        isGroup: Boolean(m.is_group),
        groupData: m.is_group ? {
          name: m.name,
          description: '',
          imageBase64: m.icon || '',
          members: uids,
          admin: adminsList[0] || user.uid,
          admins: adminsList,
          memberVersions: {}
        } : null,
        name: m.name,
        icon: m.icon,
        admins: adminsList,
        users: uids,
        unread: m.unread_count || 0,
        replyState: m.reply_state_json ? JSON.parse(m.reply_state_json) : null,
        lastMsg: lastMsg ? {
          id: lastMsg.id,
          senderId: lastMsg.sender_id,
          content: lastMsg.content,
          timestamp: lastMsg.created_at,
          status: lastMsg.status
        } : null,
        lastMessageAt: m.last_message_at || m.created_at,
        profile,
        presence
      };
    })
  );

  return c.json({ success: true, friends: list });
});

// GET /api/v1/social/requests - Solicitudes de amistad enviadas y recibidas
socialApp.get('/requests', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const sentRows = await db.prepare(`
    SELECT fr.id, fr.from_uid, fr.to_uid, fr.status, fr.created_at,
           u.username, u.avatar_url, u.account_type
    FROM friend_requests fr
    JOIN users u ON fr.to_uid = u.uid
    WHERE fr.from_uid = ? AND fr.status = 'pending'
    ORDER BY fr.created_at DESC
  `).bind(user.uid).all<any>();

  const recvRows = await db.prepare(`
    SELECT fr.id, fr.from_uid, fr.to_uid, fr.status, fr.created_at,
           u.username, u.avatar_url, u.account_type
    FROM friend_requests fr
    JOIN users u ON fr.from_uid = u.uid
    WHERE fr.to_uid = ? AND fr.status = 'pending'
    ORDER BY fr.created_at DESC
  `).bind(user.uid).all<any>();

  const formatReq = (r: any, targetUidField: string) => ({
    id: r.id,
    fromUid: r.from_uid,
    toUid: r.to_uid,
    status: r.status,
    createdAt: r.created_at,
    profile: {
      uid: r[targetUidField],
      username: r.username,
      avatarUrl: r.avatar_url,
      avatarBase64: r.avatar_url,
      accountType: r.account_type,
      badges: r.account_type === 'microsoft' ? ['premium'] : []
    }
  });

  return c.json({
    success: true,
    sent: (sentRows.results || []).map(r => formatReq(r, 'to_uid')),
    received: (recvRows.results || []).map(r => formatReq(r, 'from_uid'))
  });
});

// POST /api/v1/social/requests - Enviar solicitud de amistad
socialApp.post('/requests', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ toUid: string }>();
  if (!body.toUid || body.toUid === user.uid) {
    return c.json({ success: false, error: 'invalid_target' }, 400);
  }

  const db = c.env.DB;

  // 1. Comprobar bloqueos en ambas direcciones
  const isBlocked = await db.prepare(`
    SELECT 1 FROM blocks
    WHERE (blocker_uid = ? AND blocked_uid = ?) OR (blocker_uid = ? AND blocked_uid = ?)
  `).bind(user.uid, body.toUid, body.toUid, user.uid).first();
  if (isBlocked) return c.json({ success: false, error: 'blocked_user' }, 403);

  // 2. Comprobar si ya son amigos directos
  const alreadyFriends = await db.prepare(`
    SELECT fm1.friendship_id
    FROM friendship_members fm1
    JOIN friendship_members fm2 ON fm1.friendship_id = fm2.friendship_id
    JOIN friendships f ON f.id = fm1.friendship_id
    WHERE fm1.uid = ? AND fm2.uid = ? AND f.type = 'direct'
  `).bind(user.uid, body.toUid).first();
  if (alreadyFriends) return c.json({ success: false, error: 'already_friends' }, 400);

  // 3. Comprobar si ya existe solicitud
  const existingSent = await db.prepare('SELECT status FROM friend_requests WHERE from_uid = ? AND to_uid = ?').bind(user.uid, body.toUid).first<{ status: string }>();
  if (existingSent && existingSent.status === 'pending') {
    return c.json({ success: false, error: 'request_already_sent' }, 400);
  }

  const existingRecv = await db.prepare('SELECT status FROM friend_requests WHERE from_uid = ? AND to_uid = ?').bind(body.toUid, user.uid).first<{ status: string }>();
  if (existingRecv && existingRecv.status === 'pending') {
    return c.json({ success: false, error: 'request_already_received' }, 400);
  }

  const reqId = `${user.uid}__${body.toUid}`;
  await db.prepare(`
    INSERT INTO friend_requests (id, from_uid, to_uid, status, created_at)
    VALUES (?, ?, ?, 'pending', datetime('now'))
    ON CONFLICT(id) DO UPDATE SET status = 'pending', created_at = datetime('now')
  `).bind(reqId, user.uid, body.toUid).run();

  return c.json({ success: true, requestId: reqId });
});

// POST /api/v1/social/requests/:id/accept - Aceptar solicitud de amistad
socialApp.post('/requests/:id/accept', requireAuth, async (c) => {
  const user = c.get('user');
  const reqId = c.req.param('id');
  const db = c.env.DB;

  const req = await db.prepare('SELECT * FROM friend_requests WHERE id = ?').bind(reqId).first<any>();
  if (!req || req.to_uid !== user.uid) {
    return c.json({ success: false, error: 'request_not_found' }, 404);
  }

  const uids = [req.from_uid, req.to_uid].sort();
  const friendshipId = `dm__${uids[0]}__${uids[1]}`;

  // Crear amistad y asociar miembros
  await db.batch([
    db.prepare('DELETE FROM friend_requests WHERE id = ?').bind(reqId),
    db.prepare(`
      INSERT INTO friendships (id, type, is_group, created_at)
      VALUES (?, 'direct', 0, datetime('now'))
      ON CONFLICT(id) DO NOTHING
    `).bind(friendshipId),
    db.prepare(`
      INSERT INTO friendship_members (friendship_id, uid, unread_count, joined_at)
      VALUES (?, ?, 0, datetime('now'))
      ON CONFLICT(friendship_id, uid) DO NOTHING
    `).bind(friendshipId, req.from_uid),
    db.prepare(`
      INSERT INTO friendship_members (friendship_id, uid, unread_count, joined_at)
      VALUES (?, ?, 0, datetime('now'))
      ON CONFLICT(friendship_id, uid) DO NOTHING
    `).bind(friendshipId, req.to_uid)
  ]);

  return c.json({ success: true, friendshipId });
});

// POST /api/v1/social/requests/:id/reject - Rechazar solicitud de amistad
socialApp.post('/requests/:id/reject', requireAuth, async (c) => {
  const user = c.get('user');
  const reqId = c.req.param('id');
  const db = c.env.DB;

  const req = await db.prepare('SELECT * FROM friend_requests WHERE id = ?').bind(reqId).first<any>();
  if (!req || (req.to_uid !== user.uid && req.from_uid !== user.uid)) {
    return c.json({ success: false, error: 'request_not_found' }, 404);
  }

  await db.prepare('DELETE FROM friend_requests WHERE id = ?').bind(reqId).run();
  return c.json({ success: true });
});

// DELETE /api/v1/social/friends/:friendshipId - Eliminar amigo
socialApp.delete('/friends/:friendshipId', requireAuth, async (c) => {
  const user = c.get('user');
  const fid = c.req.param('friendshipId');
  const db = c.env.DB;

  const member = await db.prepare('SELECT 1 FROM friendship_members WHERE friendship_id = ? AND uid = ?').bind(fid, user.uid).first();
  if (!member) return c.json({ success: false, error: 'not_member' }, 403);

  const fsRow = await db.prepare('SELECT is_group FROM friendships WHERE id = ?').bind(fid).first<any>();
  if (fsRow && fsRow.is_group) {
    await db.prepare('DELETE FROM friendship_members WHERE friendship_id = ? AND uid = ?').bind(fid, user.uid).run();
    const remaining = await db.prepare('SELECT COUNT(*) as count FROM friendship_members WHERE friendship_id = ?').bind(fid).first<any>();
    if (!remaining || remaining.count === 0) {
      await db.batch([
        db.prepare('DELETE FROM messages WHERE friendship_id = ?').bind(fid),
        db.prepare('DELETE FROM friendships WHERE id = ?').bind(fid)
      ]);
    }
  } else {
    await db.batch([
      db.prepare('DELETE FROM friendship_members WHERE friendship_id = ?').bind(fid),
      db.prepare('DELETE FROM messages WHERE friendship_id = ?').bind(fid),
      db.prepare('DELETE FROM friendships WHERE id = ?').bind(fid)
    ]);
  }

  return c.json({ success: true });
});

// GET /api/v1/social/blocks - Lista de usuarios bloqueados
socialApp.get('/blocks', requireAuth, async (c) => {
  const user = c.get('user');
  const rows = await c.env.DB.prepare(`
    SELECT b.blocked_uid, u.username, u.avatar_url, u.account_type
    FROM blocks b
    JOIN users u ON b.blocked_uid = u.uid
    WHERE b.blocker_uid = ?
  `).bind(user.uid).all<any>();

  return c.json({
    success: true,
    blocked: (rows.results || []).map(r => ({
      uid: r.blocked_uid,
      username: r.username,
      avatarUrl: r.avatar_url,
      accountType: r.account_type,
      profile: {
        uid: r.blocked_uid,
        username: r.username,
        avatarUrl: r.avatar_url,
        avatarBase64: r.avatar_url,
        accountType: r.account_type,
        badges: r.account_type === 'microsoft' ? ['premium'] : []
      }
    }))
  });
});

// POST /api/v1/social/blocks/:targetUid - Bloquear usuario
socialApp.post('/blocks/:targetUid', requireAuth, async (c) => {
  const user = c.get('user');
  const targetUid = c.req.param('targetUid');
  if (targetUid === user.uid) return c.json({ success: false, error: 'cannot_block_self' }, 400);

  const db = c.env.DB;

  await db.batch([
    db.prepare(`
      INSERT INTO blocks (blocker_uid, blocked_uid, created_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(blocker_uid, blocked_uid) DO NOTHING
    `).bind(user.uid, targetUid),
    // Eliminar solicitudes de amistad cruzadas
    db.prepare('DELETE FROM friend_requests WHERE (from_uid = ? AND to_uid = ?) OR (from_uid = ? AND to_uid = ?)').bind(user.uid, targetUid, targetUid, user.uid)
  ]);

  return c.json({ success: true });
});

// DELETE /api/v1/social/blocks/:targetUid - Desbloquear usuario
socialApp.delete('/blocks/:targetUid', requireAuth, async (c) => {
  const user = c.get('user');
  const targetUid = c.req.param('targetUid');
  await c.env.DB.prepare('DELETE FROM blocks WHERE blocker_uid = ? AND blocked_uid = ?').bind(user.uid, targetUid).run();
  return c.json({ success: true });
});
