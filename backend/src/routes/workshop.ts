import { Hono } from 'hono';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { requireAdmin, requireModerator } from '../middleware/rbac';
import type { Env, CustomVariables } from '../types/env';

export const workshopApp = new Hono<{ Bindings: Env; Variables: CustomVariables }>();

// GET /api/v1/workshop/items - Listado de items del taller (filtrado por estado y permisos)
workshopApp.get('/items', optionalAuth, async (c) => {
  const user = c.get('user');
  const type = c.req.query('type') || 'modpack';
  const sort = c.req.query('sort') || 'trending';
  const db = c.env.DB;

  const isStaff = user && (user.role === 'admin' || user.role === 'owner' || user.role === 'moderator' || user.role === 'mod');

  let query = 'SELECT * FROM workshop_items WHERE 1=1';
  const bindings: any[] = [];

  if (type && type !== 'all') {
    query += ' AND type = ?';
    bindings.push(type);
  }

  // Regla de seguridad: solo staff o el autor pueden ver items no aprobados
  if (!isStaff) {
    if (user) {
      query += " AND (status = 'pub' OR is_official = 1 OR uid = ?)";
      bindings.push(user.uid);
    } else {
      query += " AND (status = 'pub' OR is_official = 1)";
    }
  }

  if (sort === 'popular') {
    query += ' ORDER BY downloads_count DESC, likes_count DESC';
  } else if (sort === 'latest') {
    query += ' ORDER BY created_at DESC';
  } else {
    // Trending
    query += ' ORDER BY (likes_count * 2 + views_count + downloads_count * 3) DESC, updated_at DESC';
  }

  query += ' LIMIT 100';

  const rows = await db.prepare(query).bind(...bindings).all<any>();

  // Si hay usuario autenticado, comprobar qué items le ha dado like
  let userLikes = new Set<string>();
  if (user) {
    const likeRows = await db.prepare("SELECT item_id FROM workshop_interactions WHERE uid = ? AND type = 'like'").bind(user.uid).all<{ item_id: string }>();
    userLikes = new Set((likeRows.results || []).map(r => r.item_id));
  }

  const items = (rows.results || []).map(r => ({
    id: r.id,
    uid: r.uid,
    authorName: r.author_name,
    title: r.title,
    desc: r.desc,
    icon: r.icon_url || '',
    type: r.type,
    isOfficial: Boolean(r.is_official),
    xst: r.status === 'rej' ? 'njt' : r.status,
    note: r.staff_note || '',
    staffNote: r.staff_note || '',
    likes: r.likes_count,
    downloads: r.downloads_count,
    views: r.views_count,
    liked: userLikes.has(r.id),
    ts: r.created_at,
    snap: {
      version: r.mc_version,
      modLoader: r.mod_loader,
      jvmArgs: r.jvm_args || '',
      addons: JSON.parse(r.addons_json || '[]')
    }
  }));

  return c.json({ success: true, items });
});

// GET /api/v1/workshop/my-items - Modpacks propios del usuario
workshopApp.get('/my-items', requireAuth, async (c) => {
  const user = c.get('user');
  const rows = await c.env.DB.prepare('SELECT * FROM workshop_items WHERE uid = ? ORDER BY created_at DESC').bind(user.uid).all<any>();
  const items = (rows.results || []).map(r => ({
    id: r.id,
    uid: r.uid,
    authorName: r.author_name,
    title: r.title,
    desc: r.desc,
    icon: r.icon_url || '',
    type: r.type,
    isOfficial: Boolean(r.is_official),
    xst: r.status === 'rej' ? 'njt' : r.status,
    note: r.staff_note || '',
    staffNote: r.staff_note || '',
    likes: r.likes_count,
    downloads: r.downloads_count,
    views: r.views_count,
    ts: r.created_at,
    snap: {
      version: r.mc_version,
      modLoader: r.mod_loader,
      jvmArgs: r.jvm_args || '',
      addons: JSON.parse(r.addons_json || '[]')
    }
  }));
  return c.json({ success: true, items });
});

// GET /api/v1/workshop/admin/items - Listado de moderación para moderadores y administradores
workshopApp.get('/admin/items', requireAuth, requireModerator, async (c) => {
  const statusFilter = c.req.query('status');
  let query = 'SELECT * FROM workshop_items';
  const bindings: any[] = [];
  if (statusFilter && statusFilter !== 'all') {
    if (statusFilter === 'njt' || statusFilter === 'rej') {
      query += " WHERE status IN ('rej', 'njt')";
    } else {
      query += ' WHERE status = ?';
      bindings.push(statusFilter);
    }
  }
  query += ' ORDER BY created_at DESC';
  const rows = await c.env.DB.prepare(query).bind(...bindings).all<any>();
  const items = (rows.results || []).map(r => ({
    id: r.id,
    uid: r.uid,
    authorName: r.author_name,
    title: r.title,
    desc: r.desc,
    icon: r.icon_url || '',
    type: r.type,
    isOfficial: Boolean(r.is_official),
    xst: r.status === 'rej' ? 'njt' : r.status,
    note: r.staff_note || '',
    staffNote: r.staff_note || '',
    likes: r.likes_count,
    downloads: r.downloads_count,
    views: r.views_count,
    ts: r.created_at,
    snap: {
      version: r.mc_version,
      modLoader: r.mod_loader,
      jvmArgs: r.jvm_args || '',
      addons: JSON.parse(r.addons_json || '[]')
    }
  }));
  return c.json({ success: true, items });
});

// GET /api/v1/workshop/items/:id - Detalle completo de un item
workshopApp.get('/items/:id', optionalAuth, async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  const db = c.env.DB;

  const r = await db.prepare('SELECT * FROM workshop_items WHERE id = ?').bind(id).first<any>();
  if (!r) return c.json({ success: false, error: 'item_not_found' }, 404);

  const isStaff = user && (user.role === 'admin' || user.role === 'owner' || user.role === 'moderator' || user.role === 'mod');
  const isAuthor = user && user.uid === r.uid;

  if (r.status !== 'pub' && !r.is_official && !isStaff && !isAuthor) {
    return c.json({ success: false, error: 'forbidden' }, 403);
  }

  let liked = false;
  if (user) {
    const likeRow = await db.prepare("SELECT 1 FROM workshop_interactions WHERE item_id = ? AND uid = ? AND type = 'like'").bind(id, user.uid).first();
    liked = Boolean(likeRow);
  }

  return c.json({
    success: true,
    item: {
      id: r.id,
      uid: r.uid,
      authorName: r.author_name,
      title: r.title,
      desc: r.desc,
      icon: r.icon_url || '',
      type: r.type,
      isOfficial: Boolean(r.is_official),
      xst: r.status === 'rej' ? 'njt' : r.status,
      note: r.staff_note || '',
      staffNote: r.staff_note || '',
      likes: r.likes_count,
      downloads: r.downloads_count,
      views: r.views_count,
      liked,
      ts: r.created_at,
      snap: {
        version: r.mc_version,
        modLoader: r.mod_loader,
        jvmArgs: r.jvm_args || '',
        addons: JSON.parse(r.addons_json || '[]')
      }
    }
  });
});

// POST /api/v1/workshop/items - Publicar nuevo modpack (Seguridad: Forzado a estado 'pnd' y autor autenticado)
workshopApp.post('/items', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json<any>();
  const db = c.env.DB;

  if (!body.title || !body.title.trim()) {
    return c.json({ success: false, error: 'title_required' }, 400);
  }

  const userDoc = await db.prepare('SELECT username FROM users WHERE uid = ?').bind(user.uid).first<{ username: string }>();
  const authorName = userDoc?.username || user.uid;

  const docId = `wk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  const snap = body.snap || {};
  const mcVersion = snap.version || body.mcVersion || '1.20.1';
  const modLoader = snap.modLoader || body.modLoader || 'Fabric';
  const jvmArgs = snap.jvmArgs || '';
  const addons = Array.isArray(snap.addons) ? snap.addons : [];

  await db.prepare(`
    INSERT INTO workshop_items (
      id, uid, author_name, title, desc, icon_url, type,
      is_official, status, likes_count, downloads_count, views_count,
      mc_version, mod_loader, jvm_args, addons_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'pnd', 0, 0, 0, ?, ?, ?, ?, ?, ?)
  `).bind(
    docId,
    user.uid,
    authorName,
    body.title.trim().slice(0, 50),
    (body.desc || '').slice(0, 300),
    body.icon || '',
    body.type || 'modpack',
    mcVersion,
    modLoader,
    jvmArgs,
    JSON.stringify(addons),
    now,
    now
  ).run();

  return c.json({ success: true, id: docId, status: 'pnd' });
});

// PATCH /api/v1/workshop/items/:id - Editar modpack propio (o admin)
workshopApp.patch('/items/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const body = await c.req.json<any>();
  const db = c.env.DB;

  const item = await db.prepare('SELECT * FROM workshop_items WHERE id = ?').bind(id).first<any>();
  if (!item) return c.json({ success: false, error: 'not_found' }, 404);

  const isAdmin = Boolean(user.isTokenVerified && (user.role === 'admin' || user.role === 'owner'));
  const isAuthor = item.uid === user.uid;

  if (!isAuthor && !isAdmin) {
    return c.json({ success: false, error: 'forbidden' }, 403);
  }

  const updates: string[] = [];
  const bindings: any[] = [];

  if (body.title) {
    updates.push('title = ?');
    bindings.push(body.title.trim().slice(0, 50));
  }
  if (body.desc !== undefined) {
    updates.push('desc = ?');
    bindings.push(body.desc.slice(0, 300));
  }
  if (body.icon !== undefined) {
    updates.push('icon_url = ?');
    bindings.push(body.icon);
  }

  if (body.snap) {
    if (body.snap.version) {
      updates.push('mc_version = ?');
      bindings.push(body.snap.version);
    }
    if (body.snap.modLoader) {
      updates.push('mod_loader = ?');
      bindings.push(body.snap.modLoader);
    }
    if (body.snap.jvmArgs !== undefined) {
      updates.push('jvm_args = ?');
      bindings.push(body.snap.jvmArgs);
    }
    if (Array.isArray(body.snap.addons)) {
      updates.push('addons_json = ?');
      bindings.push(JSON.stringify(body.snap.addons));
    }
  }

  // Solo administradores pueden alterar si es oficial
  if (isAdmin && body.isOfficial !== undefined) {
    updates.push('is_official = ?');
    bindings.push(body.isOfficial ? 1 : 0);
  }

  updates.push("updated_at = datetime('now')");

  if (updates.length > 1) {
    bindings.push(id);
    await db.prepare(`UPDATE workshop_items SET ${updates.join(', ')} WHERE id = ?`).bind(...bindings).run();
  }

  return c.json({ success: true });
});

// DELETE /api/v1/workshop/items/:id - Eliminar modpack (autor o admin)
workshopApp.delete('/items/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const db = c.env.DB;

  const item = await db.prepare('SELECT uid FROM workshop_items WHERE id = ?').bind(id).first<{ uid: string }>();
  if (!item) return c.json({ success: false, error: 'not_found' }, 404);

  const isAdmin = Boolean(user.isTokenVerified && (user.role === 'admin' || user.role === 'owner'));
  if (item.uid !== user.uid && !isAdmin) {
    return c.json({ success: false, error: 'forbidden' }, 403);
  }

  await db.batch([
    db.prepare('DELETE FROM workshop_interactions WHERE item_id = ?').bind(id),
    db.prepare('DELETE FROM workshop_items WHERE id = ?').bind(id)
  ]);

  return c.json({ success: true });
});

// PATCH /api/v1/workshop/items/:id/status - Exclusivo Staff (Aprobación / Rechazo / Oficial de modpack)
workshopApp.patch('/items/:id/status', requireAuth, requireModerator, async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  const body = await c.req.json<{ status?: 'pub' | 'rej' | 'njt' | 'pnd' | null; xst?: string | null; note?: string; isOfficial?: boolean | null }>();
  const db = c.env.DB;

  const updates: string[] = [];
  const bindings: any[] = [];

  const rawStatus = body.status || body.xst;
  if (rawStatus) {
    if (!['pub', 'rej', 'njt', 'pnd'].includes(rawStatus)) {
      return c.json({ success: false, error: 'invalid_status' }, 400);
    }
    const normalizedStatus = rawStatus === 'njt' ? 'rej' : rawStatus;
    updates.push('status = ?', 'staff_note = ?');
    bindings.push(normalizedStatus, body.note || null);
  }

  const isAdmin = Boolean(user.isTokenVerified && (user.role === 'admin' || user.role === 'owner'));
  if (isAdmin && body.isOfficial !== undefined && body.isOfficial !== null) {
    updates.push('is_official = ?');
    bindings.push(body.isOfficial ? 1 : 0);
  }

  if (updates.length === 0) {
    return c.json({ success: false, error: 'nothing_to_update' }, 400);
  }

  updates.push("updated_at = datetime('now')");
  bindings.push(id);

  await db.prepare(`
    UPDATE workshop_items SET ${updates.join(', ')} WHERE id = ?
  `).bind(...bindings).run();

  return c.json({ success: true, status: rawStatus === 'rej' ? 'njt' : rawStatus });
});

// POST /api/v1/workshop/items/:id/like - Alternar Me Gusta (Atómico)
workshopApp.post('/items/:id/like', requireAuth, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const db = c.env.DB;

  const existing = await db.prepare("SELECT 1 FROM workshop_interactions WHERE item_id = ? AND uid = ? AND type = 'like'").bind(id, user.uid).first();

  let liked = false;
  if (existing) {
    // Quitar like
    await db.prepare("DELETE FROM workshop_interactions WHERE item_id = ? AND uid = ? AND type = 'like'").bind(id, user.uid).run();
    await db.prepare('UPDATE workshop_items SET likes_count = MAX(0, likes_count - 1) WHERE id = ?').bind(id).run();
    liked = false;
  } else {
    // Añadir like
    await db.prepare("INSERT INTO workshop_interactions (item_id, uid, type) VALUES (?, ?, 'like')").bind(id, user.uid).run();
    await db.prepare('UPDATE workshop_items SET likes_count = likes_count + 1 WHERE id = ?').bind(id).run();
    liked = true;
  }

  const updated = await db.prepare('SELECT likes_count FROM workshop_items WHERE id = ?').bind(id).first<{ likes_count: number }>();
  return c.json({ success: true, liked, likes: updated?.likes_count || 0 });
});

// POST /api/v1/workshop/items/:id/download - Incrementar descarga (Atómico)
workshopApp.post('/items/:id/download', optionalAuth, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const db = c.env.DB;

  if (user) {
    const existing = await db.prepare("SELECT 1 FROM workshop_interactions WHERE item_id = ? AND uid = ? AND type = 'download'").bind(id, user.uid).first();
    if (!existing) {
      await db.prepare("INSERT INTO workshop_interactions (item_id, uid, type) VALUES (?, ?, 'download')").bind(id, user.uid).run();
      await db.prepare('UPDATE workshop_items SET downloads_count = downloads_count + 1 WHERE id = ?').bind(id).run();
    }
  } else {
    await db.prepare('UPDATE workshop_items SET downloads_count = downloads_count + 1 WHERE id = ?').bind(id).run();
  }

  return c.json({ success: true });
});

// POST /api/v1/workshop/items/:id/view - Incrementar visualización (Atómico)
workshopApp.post('/items/:id/view', optionalAuth, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const db = c.env.DB;

  if (user) {
    const existing = await db.prepare("SELECT 1 FROM workshop_interactions WHERE item_id = ? AND uid = ? AND type = 'view'").bind(id, user.uid).first();
    if (!existing) {
      await db.prepare("INSERT INTO workshop_interactions (item_id, uid, type) VALUES (?, ?, 'view')").bind(id, user.uid).run();
      await db.prepare('UPDATE workshop_items SET views_count = views_count + 1 WHERE id = ?').bind(id).run();
    }
  } else {
    await db.prepare('UPDATE workshop_items SET views_count = views_count + 1 WHERE id = ?').bind(id).run();
  }

  return c.json({ success: true });
});
