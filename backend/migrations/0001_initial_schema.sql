-- ============================================================
-- HelloWorld-Launcher Backend - Cloudflare D1 Initial Schema
-- 100% Corroborado con Firestore y Realtime Database en Producción
-- ============================================================

-- 1. Tabla de Usuarios y Perfiles
CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    username_lower TEXT NOT NULL,
    email TEXT,
    uuid TEXT,                               -- UUID de HelloWorld o Minecraft
    mc_uuid TEXT,                            -- UUID de Minecraft (para cuentas MS)
    avatar_url TEXT,
    biography TEXT,
    favorite_mob TEXT,
    country TEXT,
    background TEXT,
    links_json TEXT DEFAULT '[]',            -- Array de enlaces [{title, url}]
    playstyle_tags_json TEXT DEFAULT '[]',   -- Array de tags
    badges_json TEXT DEFAULT '[]',           -- Array de insignias ['premium', 'staff', etc.]
    client_version TEXT,
    account_type TEXT DEFAULT 'helloworld',  -- 'helloworld' | 'microsoft'
    microsoft_verified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_username_lower ON users(username_lower);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. Tabla de Administradores y Moderadores
CREATE TABLE IF NOT EXISTS admins (
    uid TEXT PRIMARY KEY,
    role TEXT NOT NULL CHECK(role IN ('admin', 'owner', 'moderator', 'mod')),
    granted_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE
);

-- 3. Verificación de Cuentas Microsoft
CREATE TABLE IF NOT EXISTS microsoft_verified (
    email_key TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    username TEXT,
    uuid TEXT,
    firebase_uid TEXT,
    verified INTEGER DEFAULT 1,
    verified_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pending_ms_verify (
    token TEXT PRIMARY KEY,
    data_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Estadísticas de Juego (users/${uid}/stats/main)
CREATE TABLE IF NOT EXISTS stats (
    uid TEXT PRIMARY KEY,
    total_hours REAL DEFAULT 0.0,
    streak INTEGER DEFAULT 0,
    max_streak INTEGER DEFAULT 0,
    last_played INTEGER DEFAULT 0,            -- Timestamp en milisegundos
    total_sessions INTEGER DEFAULT 0,
    total_days_played INTEGER DEFAULT 0,
    extra_stats_json TEXT DEFAULT '{}',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE
);

-- 5. Canales de Amistades y Grupos
CREATE TABLE IF NOT EXISTS friendships (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK(type IN ('direct', 'group')),
    is_group INTEGER DEFAULT 0,
    name TEXT,
    icon TEXT,
    admins_json TEXT DEFAULT '[]',
    last_message_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS friendship_members (
    friendship_id TEXT NOT NULL,
    uid TEXT NOT NULL,
    unread_count INTEGER DEFAULT 0,
    reply_state_json TEXT,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (friendship_id, uid),
    FOREIGN KEY (friendship_id) REFERENCES friendships(id) ON DELETE CASCADE,
    FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_friendship_members_uid ON friendship_members(uid);

-- 6. Mensajes de Chat
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    friendship_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'sent',               -- 'sent' | 'delivered' | 'read'
    edited INTEGER DEFAULT 0,
    edited_at DATETIME,
    reply_to TEXT,
    reply_content TEXT,
    reply_sender TEXT,
    reply_sender_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (friendship_id) REFERENCES friendships(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_messages_friendship ON messages(friendship_id, created_at DESC);

-- 7. Solicitudes de Amistad y Bloqueos
CREATE TABLE IF NOT EXISTS friend_requests (
    id TEXT PRIMARY KEY,                      -- fromUid__toUid
    from_uid TEXT NOT NULL,
    to_uid TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_uid) REFERENCES users(uid) ON DELETE CASCADE,
    FOREIGN KEY (to_uid) REFERENCES users(uid) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_friend_requests_to ON friend_requests(to_uid, status);
CREATE INDEX IF NOT EXISTS idx_friend_requests_from ON friend_requests(from_uid, status);

CREATE TABLE IF NOT EXISTS blocks (
    blocker_uid TEXT NOT NULL,
    blocked_uid TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (blocker_uid, blocked_uid)
);

-- 8. Bandeja de Entrada / Notificaciones
CREATE TABLE IF NOT EXISTS inbox (
    id TEXT PRIMARY KEY,
    recipient_uid TEXT NOT NULL,
    recipient_names_json TEXT DEFAULT '[]',
    sender_uid TEXT,
    sender_name TEXT,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    is_sent_copy INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipient_uid) REFERENCES users(uid) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_inbox_recipient ON inbox(recipient_uid, created_at DESC);

-- 9. Workshop (Modpacks Comunitarios y Oficiales)
CREATE TABLE IF NOT EXISTS workshop_items (
    id TEXT PRIMARY KEY,
    uid TEXT NOT NULL,                        -- autor
    author_name TEXT NOT NULL,
    title TEXT NOT NULL,
    desc TEXT,
    icon_url TEXT,
    type TEXT DEFAULT 'modpack',
    is_official INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pnd' CHECK(status IN ('pnd', 'pub', 'rej')),
    staff_note TEXT,
    likes_count INTEGER DEFAULT 0,
    downloads_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    mc_version TEXT NOT NULL,
    mod_loader TEXT NOT NULL,
    jvm_args TEXT,
    addons_json TEXT NOT NULL DEFAULT '[]',   -- IDs y versiones de Modrinth
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_workshop_status ON workshop_items(status, is_official, updated_at DESC);

-- 10. Interacciones de Workshop (Likes, Downloads, Views únicos)
CREATE TABLE IF NOT EXISTS workshop_interactions (
    item_id TEXT NOT NULL,
    uid TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('like', 'download', 'view')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (item_id, uid, type),
    FOREIGN KEY (item_id) REFERENCES workshop_items(id) ON DELETE CASCADE
);

-- 11. Reseñas y Estrellas Web
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    comment TEXT NOT NULL,
    created_at INTEGER NOT NULL               -- Timestamp numérico ms para compatibilidad con RTDB
);
CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(created_at DESC);

-- 12. Perfiles en la Nube (Cloud Sync Installations)
CREATE TABLE IF NOT EXISTS cloud_installations (
    id TEXT PRIMARY KEY,
    uid TEXT NOT NULL,
    name TEXT NOT NULL,
    data_json TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE
);
