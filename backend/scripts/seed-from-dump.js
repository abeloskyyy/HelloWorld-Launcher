/**
 * Script de Transformación y Migración de Datos de Firebase Dump a Cloudflare D1
 * Lee firebase_dump/*.json y genera backend/migrations/0002_migrated_data.sql
 */

const fs = require('fs');
const path = require('path');

const dumpDir = path.resolve(__dirname, '..', '..', 'firebase_dump');
const outSqlPath = path.resolve(__dirname, '..', 'migrations', '0002_migrated_data.sql');

if (!fs.existsSync(dumpDir)) {
  console.error('❌ No se encontró la carpeta firebase_dump/. Ejecuta primero scripts/dump-firebase.js');
  process.exit(1);
}

function esc(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return isNaN(val) ? '0' : String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
}

const sqlLines = [
  '-- ============================================================',
  '-- HelloWorld-Launcher: Datos Reales Migrados de Firebase',
  `-- Generado automáticamente: ${new Date().toISOString()}`,
  '-- ============================================================',
  'BEGIN TRANSACTION;'
];

// 1. Migrar Usuarios y Subcolecciones (stats, inbox)
const usersPath = path.join(dumpDir, 'firestore_users.json');
if (fs.existsSync(usersPath)) {
  const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
  console.log(`📦 Procesando ${users.length} usuarios...`);

  for (const u of users) {
    const uid = u._id;
    const username = u.username || `user_${uid.slice(0, 6)}`;
    const usernameLower = (u.usernameLower || username).toLowerCase();
    const email = u.email || null;
    const uuid = u.uuid || null;
    const mcUuid = u.mcUuid || null;
    const avatarUrl = u.avatarBase64 || null; // En R2 o URL
    const biography = u.biography || null;
    const favoriteMob = u.favoriteMob || null;
    const country = u.country || null;
    const background = u.background || null;
    const linksJson = JSON.stringify(u.links || []);
    const playstyleTagsJson = JSON.stringify(u.playstyleTags || []);
    const badgesJson = JSON.stringify(u.badges || []);
    const clientVersion = u.clientVersion || null;
    const accountType = u.accountType || 'helloworld';
    const msVerified = u.microsoftVerified ? 1 : 0;
    const createdAt = u.createdAt ? (typeof u.createdAt === 'object' ? u.createdAt._seconds ? new Date(u.createdAt._seconds * 1000).toISOString() : new Date().toISOString() : u.createdAt) : new Date().toISOString();
    const updatedAt = u.updatedAt || createdAt;

    sqlLines.push(`
INSERT INTO users (uid, username, username_lower, email, uuid, mc_uuid, avatar_url, biography, favorite_mob, country, background, links_json, playstyle_tags_json, badges_json, client_version, account_type, microsoft_verified, created_at, updated_at)
VALUES (${esc(uid)}, ${esc(username)}, ${esc(usernameLower)}, ${esc(email)}, ${esc(uuid)}, ${esc(mcUuid)}, ${esc(avatarUrl)}, ${esc(biography)}, ${esc(favoriteMob)}, ${esc(country)}, ${esc(background)}, ${esc(linksJson)}, ${esc(playstyleTagsJson)}, ${esc(badgesJson)}, ${esc(clientVersion)}, ${esc(accountType)}, ${msVerified}, ${esc(createdAt)}, ${esc(updatedAt)})
ON CONFLICT(uid) DO UPDATE SET username = excluded.username, username_lower = excluded.username_lower, email = excluded.email, client_version = excluded.client_version, updated_at = excluded.updated_at;`);

    // Subcolección stats
    if (u._subcollections?.stats) {
      for (const s of u._subcollections.stats) {
        const totalHours = s.totalHours || 0;
        const streak = s.streak || 0;
        const maxStreak = s.maxStreak || streak || 0;
        const lastPlayed = typeof s.lastPlayed === 'number' ? s.lastPlayed : 0;
        const totalSessions = s.totalSessions || 0;
        const totalDaysPlayed = s.totalDaysPlayed || 0;

        sqlLines.push(`
INSERT INTO stats (uid, total_hours, streak, max_streak, last_played, total_sessions, total_days_played, updated_at)
VALUES (${esc(uid)}, ${totalHours}, ${streak}, ${maxStreak}, ${lastPlayed}, ${totalSessions}, ${totalDaysPlayed}, datetime('now'))
ON CONFLICT(uid) DO UPDATE SET total_hours = excluded.total_hours, streak = excluded.streak, max_streak = excluded.max_streak, last_played = excluded.last_played, total_sessions = excluded.total_sessions, total_days_played = excluded.total_days_played;`);
      }
    }

    // Subcolección inbox
    if (u._subcollections?.inbox) {
      for (const inb of u._subcollections.inbox) {
        const inbId = inb._id || inb.id || `inb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const recUid = inb.recipientUid || uid;
        const recNames = JSON.stringify(inb.recipientNames || []);
        const senderUid = inb.senderId || null;
        const senderName = inb.senderName || 'Sistema';
        const type = inb.type || 'message';
        const content = inb.content || '';
        const isRead = inb.read ? 1 : 0;
        const isSentCopy = inb.isSentCopy ? 1 : 0;
        const ts = inb.timestamp || new Date().toISOString();

        sqlLines.push(`
INSERT INTO inbox (id, recipient_uid, recipient_names_json, sender_uid, sender_name, type, content, is_read, is_sent_copy, created_at)
VALUES (${esc(inbId)}, ${esc(recUid)}, ${esc(recNames)}, ${esc(senderUid)}, ${esc(senderName)}, ${esc(type)}, ${esc(content)}, ${isRead}, ${isSentCopy}, ${esc(ts)})
ON CONFLICT(id) DO NOTHING;`);
      }
    }
  }
}

// 2. Migrar Administradores
const adminsPath = path.join(dumpDir, 'firestore_admins.json');
if (fs.existsSync(adminsPath)) {
  const admins = JSON.parse(fs.readFileSync(adminsPath, 'utf8'));
  console.log(`📦 Procesando ${admins.length} administradores...`);
  for (const a of admins) {
    const role = (a.role || 'admin').toLowerCase();
    sqlLines.push(`
INSERT INTO admins (uid, role, created_at)
VALUES (${esc(a._id)}, ${esc(role)}, datetime('now'))
ON CONFLICT(uid) DO UPDATE SET role = excluded.role;`);
  }
}

// 3. Migrar Verificación Microsoft
const msPath = path.join(dumpDir, 'firestore_microsoftVerified.json');
if (fs.existsSync(msPath)) {
  const msList = JSON.parse(fs.readFileSync(msPath, 'utf8'));
  console.log(`📦 Procesando ${msList.length} verificaciones Microsoft...`);
  for (const m of msList) {
    const emailKey = m._id;
    const email = m.email || '';
    const username = m.username || null;
    const uuid = m.uuid || null;
    const firebaseUid = m.firebaseUid || '';
    const verifiedAt = m.verifiedAt || new Date().toISOString();

    sqlLines.push(`
INSERT INTO microsoft_verified (email_key, email, username, uuid, firebase_uid, verified, verified_at)
VALUES (${esc(emailKey)}, ${esc(email)}, ${esc(username)}, ${esc(uuid)}, ${esc(firebaseUid)}, 1, ${esc(verifiedAt)})
ON CONFLICT(email_key) DO UPDATE SET verified = 1;`);
  }
}

// 4. Migrar Solicitudes de Amistad
const reqPath = path.join(dumpDir, 'firestore_friendRequests.json');
if (fs.existsSync(reqPath)) {
  const reqs = JSON.parse(fs.readFileSync(reqPath, 'utf8'));
  console.log(`📦 Procesando ${reqs.length} solicitudes de amistad...`);
  for (const r of reqs) {
    const id = r._id;
    const fromUid = r.fromUid;
    const toUid = r.toUid;
    const status = r.status || 'pending';
    const createdAt = r.createdAt || new Date().toISOString();

    sqlLines.push(`
INSERT INTO friend_requests (id, from_uid, to_uid, status, created_at)
VALUES (${esc(id)}, ${esc(fromUid)}, ${esc(toUid)}, ${esc(status)}, ${esc(createdAt)})
ON CONFLICT(id) DO UPDATE SET status = excluded.status;`);
  }
}

// 5. Migrar Amistades, Miembros y Mensajes
const friendsPath = path.join(dumpDir, 'firestore_friendships.json');
if (fs.existsSync(friendsPath)) {
  const friendships = JSON.parse(fs.readFileSync(friendsPath, 'utf8'));
  console.log(`📦 Procesando ${friendships.length} amistades y canales...`);

  for (const f of friendships) {
    const fid = f._id;
    const isGroup = f.isGroup ? 1 : 0;
    const type = isGroup ? 'group' : 'direct';
    const name = f.name || null;
    const icon = f.icon || null;
    const adminsJson = JSON.stringify(f.admins || []);
    const lastMsgAt = f.lastMessageAt || f.updatedAt || null;
    const createdAt = f.createdAt || new Date().toISOString();

    sqlLines.push(`
INSERT INTO friendships (id, type, is_group, name, icon, admins_json, last_message_at, created_at)
VALUES (${esc(fid)}, ${esc(type)}, ${isGroup}, ${esc(name)}, ${esc(icon)}, ${esc(adminsJson)}, ${esc(lastMsgAt)}, ${esc(createdAt)})
ON CONFLICT(id) DO NOTHING;`);

    // Miembros
    const users = f.users || [];
    for (const mUid of users) {
      let unreadCount = 0;
      if (f._subcollections?.unread) {
        const uDoc = f._subcollections.unread.find(u => u._id === mUid);
        if (uDoc && typeof uDoc.count === 'number') unreadCount = uDoc.count;
      }
      sqlLines.push(`
INSERT INTO friendship_members (friendship_id, uid, unread_count, joined_at)
VALUES (${esc(fid)}, ${esc(mUid)}, ${unreadCount}, ${esc(createdAt)})
ON CONFLICT(friendship_id, uid) DO NOTHING;`);
    }

    // Mensajes
    if (f._subcollections?.messages) {
      for (const msg of f._subcollections.messages) {
        const msgId = msg._id || msg.id;
        const senderId = msg.senderId;
        const content = msg.content || '';
        const status = msg.status || 'delivered';
        const ts = msg.timestamp || new Date().toISOString();

        sqlLines.push(`
INSERT INTO messages (id, friendship_id, sender_id, content, status, created_at)
VALUES (${esc(msgId)}, ${esc(fid)}, ${esc(senderId)}, ${esc(content)}, ${esc(status)}, ${esc(ts)})
ON CONFLICT(id) DO NOTHING;`);
      }
    }
  }
}

// 6. Migrar Workshop (Puros metadatos, eliminando zips en base64)
const wkPath = path.join(dumpDir, 'firestore_workshop.json');
if (fs.existsSync(wkPath)) {
  const items = JSON.parse(fs.readFileSync(wkPath, 'utf8'));
  console.log(`📦 Procesando ${items.length} items de Workshop...`);

  for (const item of items) {
    const id = item._id;
    const uid = item.uid;
    const authorName = item.authorName || 'Staff';
    const title = item.title || 'Modpack';
    const desc = item.desc || '';
    const iconUrl = item.icon || '';
    const type = item.type || 'modpack';
    const isOfficial = item.isOfficial ? 1 : 0;
    const status = item.xst || 'pub';
    const staffNote = item.note || null;
    const likes = item.likes || 0;
    const downloads = item.downloads || 0;
    const views = item.views || 0;
    const createdAt = item.ts || new Date().toISOString();

    const snap = item.snap || {};
    const mcVersion = snap.version || '1.20.1';
    const modLoader = 'Fabric'; // Default
    const jvmArgs = snap.jvmArgs || '';

    let addons = [];
    if (snap.addonsJson) {
      try { addons = JSON.parse(snap.addonsJson); } catch (_) {}
    } else if (Array.isArray(snap.addons)) {
      addons = snap.addons;
    }

    sqlLines.push(`
INSERT INTO workshop_items (id, uid, author_name, title, desc, icon_url, type, is_official, status, staff_note, likes_count, downloads_count, views_count, mc_version, mod_loader, jvm_args, addons_json, created_at, updated_at)
VALUES (${esc(id)}, ${esc(uid)}, ${esc(authorName)}, ${esc(title)}, ${esc(desc)}, ${esc(iconUrl)}, ${esc(type)}, ${isOfficial}, ${esc(status)}, ${esc(staffNote)}, ${likes}, ${downloads}, ${views}, ${esc(mcVersion)}, ${esc(modLoader)}, ${esc(jvmArgs)}, ${esc(JSON.stringify(addons))}, ${esc(createdAt)}, ${esc(createdAt)})
ON CONFLICT(id) DO NOTHING;`);
  }
}

// 7. Migrar Reseñas Web de RTDB
const rtdbPath = path.join(dumpDir, 'rtdb_full.json');
if (fs.existsSync(rtdbPath)) {
  const rtdb = JSON.parse(fs.readFileSync(rtdbPath, 'utf8'));
  if (rtdb.reviews) {
    const reviews = Object.entries(rtdb.reviews);
    console.log(`📦 Procesando ${reviews.length} reseñas web...`);
    for (const [revId, rev] of reviews) {
      const name = rev.name || 'Anonymous';
      const rating = parseInt(rev.rating || 5, 10);
      const comment = rev.comment || '';
      const ts = typeof rev.timestamp === 'number' ? rev.timestamp : Date.now();

      sqlLines.push(`
INSERT INTO reviews (id, name, rating, comment, created_at)
VALUES (${esc(revId)}, ${esc(name)}, ${rating}, ${esc(comment)}, ${ts})
ON CONFLICT(id) DO NOTHING;`);
    }
  }
}

sqlLines.push('COMMIT;');

fs.writeFileSync(outSqlPath, sqlLines.join('\n'), 'utf8');
console.log(`\n✅ Archivo SQL generado con éxito: ${outSqlPath}`);
console.log(`Total de sentencias SQL generadas: ${sqlLines.length}\n`);

