-- ============================================================
-- HelloWorld Launcher - Telemetry Database Schema (Cloudflare D1)
-- ============================================================

CREATE TABLE IF NOT EXISTS telemetry_reports (
    id TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    username TEXT NOT NULL,
    account_type TEXT NOT NULL,
    account_id TEXT,
    trigger_reason TEXT NOT NULL,
    launcher_version TEXT NOT NULL,
    os_platform TEXT,
    os_release TEXT,
    os_distro TEXT,
    os_arch TEXT,
    cpu_model TEXT,
    cpu_cores INTEGER,
    total_ram_gb REAL,
    free_ram_gb REAL,
    gpu_renderer TEXT,
    ip_address TEXT,
    ip_country TEXT,
    ip_city TEXT,
    profile_name TEXT,
    game_version TEXT,
    mod_loader TEXT,
    allocated_ram_mb INTEGER,
    managed_mods_count INTEGER,
    unmanaged_mods_json TEXT,
    is_crash BOOLEAN DEFAULT FALSE,
    exit_code INTEGER,
    recent_logs_text TEXT,
    r2_log_key TEXT
);

CREATE INDEX IF NOT EXISTS idx_reports_username ON telemetry_reports(username);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON telemetry_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_reports_crash ON telemetry_reports(is_crash);
CREATE INDEX IF NOT EXISTS idx_reports_trigger ON telemetry_reports(trigger_reason);
