-- ============================================================
-- Migration 0003: Cloud Installations Enhancements & Rate Limits
-- ============================================================

-- 1. Add server-managed R2 icon key and exact UTC epoch ms timestamp
ALTER TABLE cloud_installations ADD COLUMN icon_r2_key TEXT;
ALTER TABLE cloud_installations ADD COLUMN updated_at_ms INTEGER DEFAULT 0;

-- 2. Index for fast user listing & 35-installation limit counting
CREATE INDEX IF NOT EXISTS idx_cloud_installations_uid
  ON cloud_installations(uid, updated_at_ms DESC);

-- 3. Persistent multi-edge rate limit table for Cloud Sync operations
CREATE TABLE IF NOT EXISTS cloud_sync_rate_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid TEXT NOT NULL,
    installation_id TEXT,
    action TEXT NOT NULL CHECK(action IN ('update', 'create', 'delete', 'upload_icon')),
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cloud_rl_uid_action_time
  ON cloud_sync_rate_limits(uid, action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cloud_rl_uid_inst_time
  ON cloud_sync_rate_limits(uid, installation_id, action, created_at DESC);
