/**
 * HelloWorld Launcher - Telemetry & Diagnostic System (Cloudflare D1 & R2)
 * Collects crash reports, system specs, terminal/console logs, and unmanaged files.
 * Strictly Opt-In (disabled by default in user.json).
 * Includes:
 * - Rate limiting (client cooldowns)
 * - Payload size caps (5MB uncompressed limit, 250KB crash report limit)
 * - Offline / Retry queue with automatic backoff
 * - Event-driven only (heartbeat removed per user request)
 */

const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const zlib = require('zlib');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const versionUtils = require('./version');

const DEFAULT_ENDPOINT = 'https://hwlauncher-telemetry.abeloskysb.workers.dev/report';
const QUEUE_FLUSH_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const MAX_QUEUE_ITEMS = 5;
const MAX_CRASH_REPORT_CHARS = 250000; // ~250 KB
const MAX_RAW_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

class CircularBuffer {
  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    this.buffer = [];
  }

  push(item) {
    if (this.buffer.length >= this.maxSize) {
      this.buffer.shift();
    }
    this.buffer.push(item);
  }

  toArray() {
    return [...this.buffer];
  }

  tail(count = 150) {
    return this.buffer.slice(-count);
  }

  clear() {
    this.buffer = [];
  }
}

class TelemetryManager {
  constructor() {
    this.app = null;
    this.paths = null;
    this.profileManager = null;

    this.terminalBuffer = new CircularBuffer(1000);
    this.gameBuffer = new CircularBuffer(1500);
    this.rendererBuffer = new CircularBuffer(300);

    this.isStdoutHooked = false;
    this.lastActiveProfileId = null;
    this.lastActiveProfile = null;
    this.isSending = false;

    // Rate Limiting Cooldowns
    this.lastManualSendTime = 0;
    this.lastAutoCrashTime = 0;

    // Offline / Retry Queue
    this.queueFlushTimer = null;
    this.isFlushingQueue = false;
  }

  init(electronApp, pathsUtil, profileManagerUtil) {
    this.app = electronApp;
    this.paths = pathsUtil;
    this.profileManager = profileManagerUtil;

    this.hookTerminalStreams();
    this.startQueueWorker();
  }

  /**
   * Hook Node.js process.stdout & process.stderr to capture terminal logs in ring buffer
   */
  hookTerminalStreams() {
    if (this.isStdoutHooked) return;
    this.isStdoutHooked = true;

    const originalStdoutWrite = process.stdout.write.bind(process.stdout);
    const originalStderrWrite = process.stderr.write.bind(process.stderr);

    process.stdout.write = (chunk, encoding, callback) => {
      try {
        const text = typeof chunk === 'string' ? chunk : chunk ? chunk.toString(encoding || 'utf8') : '';
        if (text) {
          const lines = text.split(/\r?\n/).filter(Boolean);
          const time = new Date().toISOString();
          for (const line of lines) {
            this.terminalBuffer.push(`[${time}] [stdout] ${line}`);
          }
        }
      } catch (_) {}
      return originalStdoutWrite(chunk, encoding, callback);
    };

    process.stderr.write = (chunk, encoding, callback) => {
      try {
        const text = typeof chunk === 'string' ? chunk : chunk ? chunk.toString(encoding || 'utf8') : '';
        if (text) {
          const lines = text.split(/\r?\n/).filter(Boolean);
          const time = new Date().toISOString();
          for (const line of lines) {
            this.terminalBuffer.push(`[${time}] [stderr] ${line}`);
          }
        }
      } catch (_) {}
      return originalStderrWrite(chunk, encoding, callback);
    };
  }

  /**
   * Add a line of Minecraft game output
   */
  addGameLog(stream, message) {
    if (!message) return;
    const time = new Date().toISOString();
    this.gameBuffer.push(`[${time}] [${stream}] ${message}`);
  }

  /**
   * Add a log from the renderer JS console
   */
  addRendererLog(level, message, stack) {
    const time = new Date().toISOString();
    let entry = `[${time}] [console.${level || 'log'}] ${message || ''}`;
    if (stack) entry += `\nStack: ${stack}`;
    this.rendererBuffer.push(entry);
  }

  setActiveProfile(profileId, profile = null) {
    this.lastActiveProfileId = profileId;
    if (profile) this.lastActiveProfile = profile;
  }

  /**
   * Check if telemetry is enabled by user in user.json (Default: false)
   */
  isTelemetryEnabled() {
    try {
      if (!this.paths) return false;
      const userFilePath = this.paths.getUserFilePath();
      if (!fs.existsSync(userFilePath)) return false;
      const data = fs.readJsonSync(userFilePath);
      return data && data.telemetry_enabled === true;
    } catch (_) {
      return false;
    }
  }

  getTelemetryEndpoint() {
    try {
      if (!this.paths) return DEFAULT_ENDPOINT;
      const userFilePath = this.paths.getUserFilePath();
      if (fs.existsSync(userFilePath)) {
        const data = fs.readJsonSync(userFilePath);
        if (data && data.telemetry_endpoint && typeof data.telemetry_endpoint === 'string' && data.telemetry_endpoint.startsWith('http')) {
          return data.telemetry_endpoint;
        }
      }
    } catch (_) {}
    return DEFAULT_ENDPOINT;
  }

  getQueueDir() {
    if (!this.paths) return null;
    return path.join(this.paths.getLauncherDir(), 'telemetry_queue');
  }

  /**
   * Gathers hardware and OS specifications
   */
  getSystemSpecs() {
    let distro = null;
    if (process.platform === 'linux') {
      try {
        if (fs.existsSync('/etc/os-release')) {
          const content = fs.readFileSync('/etc/os-release', 'utf8');
          const match = content.match(/^PRETTY_NAME="?([^"\n]+)"?/m) || content.match(/^NAME="?([^"\n]+)"?/m);
          if (match) distro = match[1];
        }
      } catch (_) {}
    } else if (process.platform === 'win32') {
      distro = `Windows ${os.release()}`;
    } else if (process.platform === 'darwin') {
      distro = `macOS ${os.release()}`;
    }

    const cpus = os.cpus() || [];
    const cpuModel = cpus[0]?.model ? cpus[0].model.trim() : 'Unknown CPU';
    const totalRamGb = Math.round((os.totalmem() / (1024 ** 3)) * 100) / 100;
    const freeRamGb = Math.round((os.freemem() / (1024 ** 3)) * 100) / 100;

    let gpuRenderer = 'Default Graphics';
    try {
      if (this.app && typeof this.app.getGPUFeatureStatus === 'function') {
        const status = this.app.getGPUFeatureStatus();
        if (status && status.gpu_compose) {
          gpuRenderer = status.gpu_compose;
        }
      }
    } catch (_) {}

    return {
      os: {
        platform: process.platform,
        release: os.release(),
        arch: os.arch(),
        distro: distro || process.platform,
      },
      hardware: {
        cpu_model: cpuModel,
        cpu_cores: cpus.length,
        total_ram_gb: totalRamGb,
        free_ram_gb: freeRamGb,
        gpu_renderer: gpuRenderer,
      },
    };
  }

  /**
   * Computes SHA-1 hash for addon files (<= 50MB) so Modrinth API can identify them accurately.
   */
  computeFileSha1(fullPath, sizeBytes) {
    try {
      if (!sizeBytes || sizeBytes > 50 * 1024 * 1024) return null;
      const buf = fs.readFileSync(fullPath);
      return crypto.createHash('sha1').update(buf).digest('hex');
    } catch (_) {
      return null;
    }
  }

  /**
   * Collects ALL profile addons (both managed with project_id/version_id and unmanaged files on disk),
   * including mods, resourcepacks, shaderpacks, and datapacks, enriched with size, mtime, state and SHA-1.
   */
  collectProfileAddons(actualMcDir, activeProfile) {
    const unmanagedFiles = [];
    const managedAddons = [];

    const normalizeName = (fn) => String(fn || '').toLowerCase().replace(/\.disabled$/i, '');

    // Index managed addons by (type + normalized filename)
    const managedByKey = new Map();
    const matchedManagedKeys = new Set();

    if (activeProfile && Array.isArray(activeProfile.addons)) {
      for (const addon of activeProfile.addons) {
        if (!addon || !addon.filename) continue;
        const type = addon.type || 'mod';
        const key = `${type}:${normalizeName(addon.filename)}`;
        managedByKey.set(key, addon);
      }
    }

    const safeStat = (fullPath) => {
      try {
        const stat = fs.statSync(fullPath);
        return {
          size: stat.isDirectory() ? 0 : stat.size,
          mtime: stat.mtime.toISOString(),
          isDir: stat.isDirectory(),
        };
      } catch (_) {
        return { size: 0, mtime: new Date().toISOString(), isDir: false };
      }
    };

    const scanDir = (dirPath, type, worldName = null, filterFn = null) => {
      if (!dirPath || !fs.existsSync(dirPath)) return;
      try {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          if (file === '.DS_Store' || file === 'desktop.ini') continue;
          const lower = file.toLowerCase();
          if (filterFn && !filterFn(lower)) continue;

          const fullPath = path.join(dirPath, file);
          const info = safeStat(fullPath);
          const isDisabled = lower.endsWith('.disabled');
          const key = `${type}:${normalizeName(file)}`;
          const managedMeta = managedByKey.get(key);
          const sha1 = !info.isDir ? this.computeFileSha1(fullPath, info.size) : null;

          if (managedMeta) {
            matchedManagedKeys.add(key);
            const metaDisabled = managedMeta.state ? managedMeta.state === 'disabled' : (managedMeta.enabled === false);
            managedAddons.push({
              type,
              filename: file,
              name: managedMeta.name || managedMeta.display_name || null,
              project_id: managedMeta.project_id || null,
              version_id: managedMeta.version_id || null,
              size_bytes: info.size,
              modified_at: info.mtime,
              is_disabled: isDisabled || metaDisabled,
              sha1,
              world_name: worldName || managedMeta.world_name || null,
              is_managed: true,
              missing: false,
            });
          } else {
            unmanagedFiles.push({
              type,
              filename: file,
              size_bytes: info.size,
              modified_at: info.mtime,
              is_disabled: isDisabled,
              sha1,
              world_name: worldName || null,
              is_managed: false,
            });
          }
        }
      } catch (_) {}
    };

    if (actualMcDir && fs.existsSync(actualMcDir)) {
      // 1. mods/
      scanDir(path.join(actualMcDir, 'mods'), 'mod', null, (l) => l.endsWith('.jar') || l.endsWith('.jar.disabled'));
      // 2. resourcepacks/
      scanDir(path.join(actualMcDir, 'resourcepacks'), 'resourcepack');
      // 3. shaderpacks/
      scanDir(path.join(actualMcDir, 'shaderpacks'), 'shader');
      // 4. saves/*/datapacks/
      const savesDir = path.join(actualMcDir, 'saves');
      if (fs.existsSync(savesDir)) {
        try {
          const worlds = fs.readdirSync(savesDir);
          for (const world of worlds) {
            const dpDir = path.join(savesDir, world, 'datapacks');
            if (fs.existsSync(dpDir)) {
              scanDir(dpDir, 'datapack', world);
            }
          }
        } catch (_) {}
      }
    }

    // Include any managed addons from profile.addons that were missing on disk or are modpacks
    if (activeProfile && Array.isArray(activeProfile.addons)) {
      for (const addon of activeProfile.addons) {
        if (!addon || !addon.filename) continue;
        const type = addon.type || 'mod';
        const key = `${type}:${normalizeName(addon.filename)}`;
        if (!matchedManagedKeys.has(key)) {
          const metaDisabled = addon.state ? addon.state === 'disabled' : (addon.enabled === false);
          managedAddons.push({
            type,
            filename: addon.filename,
            name: addon.name || addon.display_name || null,
            project_id: addon.project_id || null,
            version_id: addon.version_id || null,
            size_bytes: addon.size_bytes || 0,
            modified_at: addon.modified_at || null,
            is_disabled: metaDisabled,
            sha1: null,
            world_name: addon.world_name || null,
            is_managed: true,
            missing: type !== 'modpack',
          });
        }
      }
    }

    return { managedAddons, unmanagedFiles };
  }

  /**
   * Backwards-compatible helper for unmanaged files only.
   */
  scanUnmanagedFiles(actualMcDir, activeProfile) {
    return this.collectProfileAddons(actualMcDir, activeProfile).unmanagedFiles;
  }

  /**
   * Looks for the most recent crash-report file in crash-reports/ generated in the last 5 minutes.
   * Checks the instance directory first, then falls back to the default .minecraft directory.
   */
  findRecentCrashReport(actualMcDir, fallbackDir = null) {
    const candidates = [actualMcDir, fallbackDir].filter(Boolean);
    for (const targetDir of candidates) {
      try {
        const crashDir = path.join(targetDir, 'crash-reports');
        if (!fs.existsSync(crashDir)) continue;

        const files = fs.readdirSync(crashDir);
        let latestFile = null;
        let latestTime = 0;
        const now = Date.now();

        for (const file of files) {
          if (!file.endsWith('.txt')) continue;
          const fullPath = path.join(crashDir, file);
          const stat = fs.statSync(fullPath);
          // Only consider if modified in the last 5 minutes (300,000 ms)
          if (now - stat.mtimeMs < 300000 && stat.mtimeMs > latestTime) {
            latestTime = stat.mtimeMs;
            latestFile = fullPath;
          }
        }

        if (latestFile) {
          const content = fs.readFileSync(latestFile, 'utf8');
          // Enforce max crash report length to prevent massive payloads
          return content.slice(0, MAX_CRASH_REPORT_CHARS);
        }
      } catch (_) {}
    }
    return null;
  }

  /**
   * Main telemetry dispatch function (100% silent in background)
   */
  async sendReport(triggerReason = 'manual_diagnostic', extraData = {}) {
    // 1. Strict Opt-In check
    if (!this.isTelemetryEnabled()) {
      return { skipped: true, reason: 'opt_out' };
    }

    const now = Date.now();

    // 2. Client-side Rate Limiting
    if (triggerReason === 'manual_diagnostic') {
      if (now - this.lastManualSendTime < 30000) {
        const remaining = Math.ceil((30000 - (now - this.lastManualSendTime)) / 1000);
        return { skipped: true, rate_limited: true, remaining };
      }
      this.lastManualSendTime = now;
    } else if (extraData.is_crash || triggerReason.includes('crash')) {
      if (now - this.lastAutoCrashTime < 10000) {
        return { skipped: true, rate_limited: true };
      }
      this.lastAutoCrashTime = now;
    }

    if (this.isSending) return { skipped: true, reason: 'busy' };
    this.isSending = true;

    let payload = null;

    try {
      // 3. Read User Info
      let user = {};
      try {
        if (this.paths && fs.existsSync(this.paths.getUserFilePath())) {
          user = fs.readJsonSync(this.paths.getUserFilePath());
        }
      } catch (_) {}

      const username = (user.username && user.username.trim()) || 'Unknown';
      const accountType = user.account_type || 'offline';
      let accountId =
        accountType === 'microsoft'
          ? (user.firebase_ms_uid || user.uuid || user.firebase_uid || null)
          : (user.firebase_uid || user.uuid || null);

      // Fallback: resolve account_id / uuid from saved_accounts.json (where active account IDs live)
      if (!accountId && this.paths && typeof this.paths.getSavedAccountsFilePath === 'function') {
        try {
          const savedPath = this.paths.getSavedAccountsFilePath();
          if (savedPath && fs.existsSync(savedPath)) {
            const accounts = fs.readJsonSync(savedPath);
            if (Array.isArray(accounts)) {
              const match =
                accounts.find(
                  (a) =>
                    a &&
                    String(a.username || '').toLowerCase() === username.toLowerCase() &&
                    String(a.type || a.account_type || '').toLowerCase() === accountType.toLowerCase()
                ) ||
                accounts.find((a) => a && String(a.username || '').toLowerCase() === username.toLowerCase());
              if (match) {
                accountId = match.firebase_ms_uid || match.firebase_uid || match.id || match.uuid || null;
              }
            }
          }
        } catch (_) {}
      }

      // 4. Read Active Profile Info (refresh from disk if possible so addons metadata is up to date)
      let profile = extraData.profile || this.lastActiveProfile || null;
      const profileId = extraData.profileId || this.lastActiveProfileId || null;

      if (this.profileManager) {
        try {
          const profilesData = this.profileManager.loadProfiles();
          if (profilesData && profilesData.profiles) {
            if (profileId && profilesData.profiles[profileId]) {
              profile = profilesData.profiles[profileId];
            } else if (!profile) {
              const nonBuiltins = Object.keys(profilesData.profiles).filter(
                (k) => k !== 'latest-release' && k !== 'latest-snapshot'
              );
              if (nonBuiltins.length > 0) {
                profile = profilesData.profiles[nonBuiltins[0]];
              } else {
                profile = profilesData.profiles['latest-release'] || null;
              }
            }
          }
        } catch (_) {}
      }

      // Instance / Minecraft directory
      const defaultMcDir = this.paths ? this.paths.getMcDir() : null;
      const actualInstanceDir = (profile && profile.directory) || defaultMcDir;

      // 5. Collect ALL profile addons (managed + unmanaged, with SHA-1 and disk stats)
      const { managedAddons, unmanagedFiles } = this.collectProfileAddons(actualInstanceDir, profile);

      // Parse Mod Loader and Game Version
      let modLoader = null;
      let gameVersion = profile?.version || null;
      if (profile && profile.version) {
        try {
          const verInfo = versionUtils.parseVersionString(profile.version);
          if (verInfo) {
            gameVersion = verInfo.mcVersion || profile.version;
            if (verInfo.type === 'vanilla') {
              modLoader = 'Vanilla';
            } else {
              modLoader = verInfo.loaderVersion
                ? `${verInfo.software} ${verInfo.loaderVersion}`
                : verInfo.software;
            }
          }
        } catch (_) {}
      }

      // Parse Allocated RAM in MB from JVM arguments (-Xmx2G -> 2048, -Xmx4096M -> 4096, default 4096)
      let allocatedRamMb = null;
      if (profile) {
        allocatedRamMb = 4096; // Default fallback in launcher
        if (profile.jvm_args && typeof profile.jvm_args === 'string') {
          const xmxMatch = profile.jvm_args.match(/-Xmx(\d+)([gGmM])/i);
          if (xmxMatch) {
            const val = parseInt(xmxMatch[1], 10);
            const unit = xmxMatch[2].toUpperCase();
            allocatedRamMb = unit === 'G' ? val * 1024 : val;
          }
        }
      }

      // 6. Gather Specs
      const specs = this.getSystemSpecs();

      // 7. Gather Logs Excerpt (last ~150 lines for D1 quick view)
      const recentTerminal = this.terminalBuffer.tail(50);
      const recentGame = this.gameBuffer.tail(75);
      const recentRenderer = this.rendererBuffer.tail(25);
      const combinedExcerpt = [
        '=== TERMINAL EXCERPT ===',
        ...recentTerminal,
        '=== GAME EXCERPT ===',
        ...recentGame,
        '=== RENDERER EXCERPT ===',
        ...recentRenderer,
      ];
      if (extraData.crash_report) {
        combinedExcerpt.push('=== CRASH REPORT ===', extraData.crash_report.slice(0, 3000));
      }

      // 8. Full Logs Bundle (compressed for R2 & complete diagnostic snapshot)
      let terminalLogs = this.terminalBuffer.toArray();
      let gameLogs = this.gameBuffer.toArray();
      let rendererLogs = this.rendererBuffer.toArray();

      const fullLogBundle = {
        timestamp: new Date().toISOString(),
        username,
        trigger_reason: triggerReason,
        launcher_version: (this.app && this.app.getVersion()) || '3.2.0',
        account: {
          username,
          type: accountType,
          id: accountId,
        },
        system_specs: specs,
        profile: {
          name: profile?.name || null,
          game_version: gameVersion,
          mod_loader: modLoader,
          allocated_ram_mb: allocatedRamMb,
          instance_directory: actualInstanceDir,
          managed_mods_count: managedAddons.length,
          addons: managedAddons,
        },
        extra: extraData,
        terminal_logs: terminalLogs,
        game_logs: gameLogs,
        renderer_logs: rendererLogs,
        crash_report: extraData.crash_report || null,
        unmanaged_files: unmanagedFiles,
      };

      // Weight guard: Ensure raw payload is below MAX_RAW_PAYLOAD_BYTES (5MB)
      let rawJsonBuffer = Buffer.from(JSON.stringify(fullLogBundle), 'utf8');
      if (rawJsonBuffer.length > MAX_RAW_PAYLOAD_BYTES) {
        // Truncate logs by half to stay safe
        fullLogBundle.terminal_logs = terminalLogs.slice(-400);
        fullLogBundle.game_logs = gameLogs.slice(-600);
        fullLogBundle.renderer_logs = rendererLogs.slice(-100);
        rawJsonBuffer = Buffer.from(JSON.stringify(fullLogBundle), 'utf8');
      }

      let fullLogsCompressedB64 = null;
      try {
        const gzipped = zlib.gzipSync(rawJsonBuffer);
        fullLogsCompressedB64 = gzipped.toString('base64');
      } catch (gzipErr) {
        console.error('[Telemetry] Failed to gzip logs:', gzipErr);
      }

      // 9. Build Payload
      payload = {
        username,
        account_type: accountType,
        account_id: accountId,
        trigger_reason: triggerReason,
        launcher_version: (this.app && this.app.getVersion()) || '3.2.0',
        is_crash: !!extraData.is_crash || triggerReason.includes('crash') || triggerReason.includes('error'),
        exit_code: typeof extraData.exit_code === 'number' ? extraData.exit_code : null,
        os: specs.os,
        hardware: specs.hardware,
        profile: {
          name: profile?.name || 'Default',
          game_version: gameVersion || profile?.version || 'Unknown',
          mod_loader: modLoader,
          allocated_ram_mb: allocatedRamMb,
          managed_mods_count: Array.isArray(profile?.addons) ? profile.addons.length : 0,
        },
        unmanaged_files: unmanagedFiles,
        recent_logs_text: combinedExcerpt.join('\n').slice(0, 15000),
        full_logs_compressed: fullLogsCompressedB64,
      };

      // 10. Silent HTTP Post Request to Cloudflare Worker
      const endpoint = this.getTelemetryEndpoint();
      const respBody = await this.httpPostJson(endpoint, payload);
      let parsedResp = null;
      try { parsedResp = JSON.parse(respBody); } catch (_) {}
      if (parsedResp?.ntfy && parsedResp.ntfy.ok === false) {
        console.warn('[Telemetry] Report stored, but NTFY alert failed:', parsedResp.ntfy);
      }
      return { success: true, id: parsedResp?.id, ntfy: parsedResp?.ntfy };
    } catch (err) {
      console.warn('[Telemetry] Silent dispatch error (suppressed):', err.message);
      // If dispatch failed due to connectivity or server issue, enqueue for offline retry
      if (payload) {
        this.enqueueReport(payload);
      }
      return { success: false, error: err.message, enqueued: !!payload };
    } finally {
      this.isSending = false;
    }
  }

  /**
   * Enqueue a failed report to disk for retry
   */
  enqueueReport(payload) {
    try {
      const queueDir = this.getQueueDir();
      if (!queueDir) return;
      fs.ensureDirSync(queueDir);

      const files = fs.readdirSync(queueDir).filter((f) => f.endsWith('.json')).sort();
      // Keep maximum MAX_QUEUE_ITEMS, purge oldest
      if (files.length >= MAX_QUEUE_ITEMS) {
        const toDelete = files.slice(0, files.length - MAX_QUEUE_ITEMS + 1);
        for (const f of toDelete) {
          try {
            fs.removeSync(path.join(queueDir, f));
          } catch (_) {}
        }
      }

      const filename = `queued_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.json`;
      fs.writeJsonSync(path.join(queueDir, filename), payload);
    } catch (_) {}
  }

  /**
   * Flushes offline queued reports
   */
  async flushQueue() {
    if (this.isFlushingQueue || !this.isTelemetryEnabled()) return;
    this.isFlushingQueue = true;

    try {
      const queueDir = this.getQueueDir();
      if (!queueDir || !fs.existsSync(queueDir)) return;

      const files = fs.readdirSync(queueDir).filter((f) => f.endsWith('.json')).sort();
      if (files.length === 0) return;

      const endpoint = this.getTelemetryEndpoint();

      for (const file of files) {
        const filePath = path.join(queueDir, file);
        try {
          const payload = fs.readJsonSync(filePath);
          await this.httpPostJson(endpoint, payload);
          fs.removeSync(filePath);
        } catch (postErr) {
          // If network still unavailable or 429, halt flush until next interval
          break;
        }
      }
    } catch (_) {
    } finally {
      this.isFlushingQueue = false;
    }
  }

  /**
   * Start retry worker timer for offline queued reports
   */
  startQueueWorker() {
    if (this.queueFlushTimer) clearInterval(this.queueFlushTimer);
    // Initial retry check after 10s
    setTimeout(() => this.flushQueue(), 10000);
    // Recurring retry check every 2 minutes
    this.queueFlushTimer = setInterval(() => {
      this.flushQueue();
    }, QUEUE_FLUSH_INTERVAL_MS);
  }

  /**
   * Helper: Silent HTTPS POST
   */
  httpPostJson(urlString, jsonPayload) {
    return new Promise((resolve, reject) => {
      try {
        const url = new URL(urlString);
        const data = Buffer.from(JSON.stringify(jsonPayload), 'utf8');
        const isHttps = url.protocol === 'https:';
        const client = isHttps ? https : http;

        const req = client.request(
          {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname + (url.search || ''),
            method: 'POST',
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': data.length,
              'User-Agent': `HelloWorld-Launcher/${(this.app && this.app.getVersion()) || '3.2.0'} (Telemetry)`,
            },
          },
          (res) => {
            let body = '';
            res.on('data', (d) => (body += d));
            res.on('end', () => {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve(body);
              } else {
                reject(new Error(`Server returned HTTP ${res.statusCode}: ${body.slice(0, 100)}`));
              }
            });
          }
        );

        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Telemetry request timed out (10s)'));
        });

        req.write(data);
        req.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Called when Minecraft process terminates with error or non-zero exitCode
   */
  async onGameCrash(profile, exitCode) {
    const defaultMcDir = this.paths ? this.paths.getMcDir() : null;
    const instanceDir = (profile && profile.directory) || defaultMcDir;
    const crashReport = this.findRecentCrashReport(instanceDir, defaultMcDir);
    return this.sendReport('game_crash', {
      is_crash: true,
      exit_code: exitCode,
      crash_report: crashReport,
      profileId: profile?.id,
      profile: profile,
    });
  }

  /**
   * Called on uncaught exceptions in the launcher main process
   */
  async onLauncherCrash(err) {
    return this.sendReport('launcher_crash', {
      is_crash: true,
      error_message: err?.message,
      error_stack: err?.stack,
    });
  }

  /**
   * Called when early initialization or startup fails
   */
  async onLauncherStartupError(err) {
    return this.sendReport('launcher_startup_error', {
      is_crash: true,
      error_message: err?.message,
      error_stack: err?.stack,
    });
  }

  stop() {
    if (this.queueFlushTimer) {
      clearInterval(this.queueFlushTimer);
      this.queueFlushTimer = null;
    }
  }
}

// Export singleton instance
module.exports = new TelemetryManager();
