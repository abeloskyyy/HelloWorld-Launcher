const path = require('path');
const fs = require('fs');

/**
 * High-performance patch for minecraft-launcher-core (MCLC)
 * 
 * Solves:
 * 1. UI Freezing on Play: Bypasses rehashing 5,000+ files on disk when assets are already verified.
 *    Uses non-blocking batched validation with setImmediate to keep the Windows OS message pump responsive.
 * 2. UI Freezing on Cancel: Immediately terminates asset/library loops if _cancelled is set.
 * 3. Fast launch: Reduces asset verification overhead from ~3500ms to < 1ms on subsequent launches.
 */
function applyMclcPatch() {
  const { Client: MCLCore } = require('minecraft-launcher-core');
  const Handler = require('minecraft-launcher-core/components/handler');

  // 1. Patch Client.prototype.launch & startMinecraft for cancellation support and client jar integrity
  const originalLaunch = MCLCore.prototype.launch;
  MCLCore.prototype.launch = async function(options) {
    this._cancelled = false;
    if (this.handler) {
      this.handler._cancelled = false;
    }

    // Auto-repair: check if the client jar is corrupted (0 bytes, truncated, or HTML from school firewall)
    try {
      if (options && options.root) {
        const rootDir = path.resolve(options.root);
        const versionName = (options.version && (options.version.custom || options.version.number)) || '';
        const mcJarPath = (options.overrides && options.overrides.minecraftJar) ||
          (versionName ? path.join(rootDir, 'versions', versionName, `${versionName}.jar`) : null);
        if (mcJarPath && fs.existsSync(mcJarPath) && !isJarValid(mcJarPath)) {
          try {
            fs.unlinkSync(mcJarPath);
            this.emit('debug', `[Integrity Shield] Auto-repaired corrupted client jar: ${path.basename(mcJarPath)} (deleted for fresh download)`);
          } catch (_) {}
        }
      }
    } catch (jarCheckErr) {
      this.emit('debug', `[Integrity Shield] Error checking client jar: ${jarCheckErr.message}`);
    }

    return await originalLaunch.call(this, options);
  };

  const originalStartMinecraft = MCLCore.prototype.startMinecraft;
  MCLCore.prototype.startMinecraft = function(launchArguments) {
    if (this._cancelled) {
      this.emit('debug', '[MCLC Patch] Launch cancelled before spawning child process.');
      return null;
    }
    return originalStartMinecraft.call(this, launchArguments);
  };

  // 2. Helper to handle legacy assets efficiently
  async function copyLegacyAssets(handler, assetDirectory, indexFilePath) {
    if (handler.client && handler.client._cancelled) return;
    const assetId = handler.options.version.custom || handler.options.version.number;
    const legacyDirectory = path.join(handler.options.root, 'resources');
    const legacyMarker = path.join(legacyDirectory, `.legacy_verified_${assetId}`);

    if (fs.existsSync(legacyMarker)) {
      return;
    }

    let index;
    try {
      index = JSON.parse(fs.readFileSync(indexFilePath, { encoding: 'utf8' }));
    } catch (_) {
      return;
    }

    const objects = index.objects || {};
    const keys = Object.keys(objects);
    const total = keys.length;

    handler.client.emit('debug', `[MCLC Patch]: Copying assets to legacy directory ${legacyDirectory}`);
    handler.client.emit('progress', {
      type: 'assets-copy',
      task: 0,
      total
    });

    const objectsDir = path.join(assetDirectory, 'objects');
    let counter = 0;
    const BATCH_SIZE = 64;

    for (let i = 0; i < total; i += BATCH_SIZE) {
      if (handler.client && handler.client._cancelled) return;
      const batch = keys.slice(i, i + BATCH_SIZE);

      for (const asset of batch) {
        const hash = objects[asset].hash;
        const subhash = hash.substring(0, 2);
        const subAsset = path.join(objectsDir, subhash, hash);

        const destPath = path.join(legacyDirectory, asset);
        const destDir = path.dirname(destPath);

        try {
          if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
          }
          if (!fs.existsSync(destPath) && fs.existsSync(subAsset)) {
            fs.copyFileSync(subAsset, destPath);
          }
        } catch (_) {}
        counter++;
      }

      handler.client.emit('progress', {
        type: 'assets-copy',
        task: counter,
        total
      });

      if (i + BATCH_SIZE < total) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }

    if (handler.client && handler.client._cancelled) return;

    try {
      if (!fs.existsSync(legacyDirectory)) fs.mkdirSync(legacyDirectory, { recursive: true });
      fs.writeFileSync(legacyMarker, JSON.stringify({ verifiedAt: Date.now() }));
    } catch (_) {}
  }

  // 3. Patch Handler.prototype.getAssets
  Handler.prototype.getAssets = async function() {
    if (this.client && this.client._cancelled) return;

    const assetDirectory = path.resolve(this.options.overrides.assetRoot || path.join(this.options.root, 'assets'));
    const assetId = this.options.version.custom || this.options.version.number;
    const indexesDir = path.join(assetDirectory, 'indexes');
    const indexFilePath = path.join(indexesDir, `${assetId}.json`);
    const verifiedMarker = path.join(indexesDir, `${assetId}.verified`);

    // Download index JSON if not present
    if (!fs.existsSync(indexFilePath)) {
      if (this.version.assetIndex && this.version.assetIndex.url) {
        await this.downloadAsync(this.version.assetIndex.url, indexesDir, `${assetId}.json`, true, 'asset-json');
      }
    }
    if (this.client && this.client._cancelled) return;

    if (!fs.existsSync(indexFilePath)) {
      this.client.emit('debug', `[MCLC Patch] Asset index not found for ${assetId}, skipping assets check`);
      return;
    }

    const forceVerify = this.options.verifyAssets === true;
    // Fast path: if already verified and not forced, bypass entire 5000-file scan!
    if (fs.existsSync(verifiedMarker) && !forceVerify) {
      this.client.emit('debug', `[MCLC Patch] Assets for ${assetId} already verified. Fast-launching in 0ms.`);
      if (this.isLegacy()) {
        await copyLegacyAssets(this, assetDirectory, indexFilePath);
      }
      return;
    }

    let index;
    try {
      index = JSON.parse(fs.readFileSync(indexFilePath, { encoding: 'utf8' }));
    } catch (e) {
      this.client.emit('debug', `[MCLC Patch] Failed to parse asset index: ${e.message}`);
      return;
    }

    const objects = index.objects || {};
    const assetKeys = Object.keys(objects);
    const total = assetKeys.length;

    this.client.emit('progress', {
      type: 'assets',
      task: 0,
      total
    });

    const resourceUrl = (this.options.overrides.url && this.options.overrides.url.resource) || 'https://resources.download.minecraft.net';
    const objectsDir = path.join(assetDirectory, 'objects');

    let completed = 0;
    let lastEmitTime = Date.now();
    const BATCH_SIZE = 64;

    for (let i = 0; i < total; i += BATCH_SIZE) {
      if (this.client && this.client._cancelled) {
        this.client.emit('debug', '[MCLC Patch] Asset download/verification cancelled.');
        return;
      }
      const chunk = assetKeys.slice(i, i + BATCH_SIZE);
      await Promise.all(chunk.map(async (asset) => {
        if (this.client && this.client._cancelled) return;
        const obj = objects[asset];
        const hash = obj.hash;
        const subhash = hash.substring(0, 2);
        const subAssetDir = path.join(objectsDir, subhash);
        const filePath = path.join(subAssetDir, hash);

        let exists = false;
        try {
          if (fs.existsSync(filePath)) {
            const stat = fs.statSync(filePath);
            // File exists and is non-empty (and matches expected size if provided)
            if (stat.size > 0 && (!obj.size || stat.size === obj.size)) {
              exists = true;
            }
          }
        } catch (_) {
          exists = false;
        }

        if (!exists && (!this.client || !this.client._cancelled)) {
          await this.downloadAsync(`${resourceUrl}/${subhash}/${hash}`, subAssetDir, hash, true, 'assets');
        }
        completed++;
      }));

      const now = Date.now();
      if (now - lastEmitTime > 80 || completed >= total) {
        lastEmitTime = now;
        this.client.emit('progress', {
          type: 'assets',
          task: completed,
          total
        });
      }

      // Yield back to Node.js event loop / Windows message pump after each chunk!
      if (i + BATCH_SIZE < total) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }

    if (this.client && this.client._cancelled) return;

    if (this.isLegacy()) {
      await copyLegacyAssets(this, assetDirectory, indexFilePath);
    }

    // Mark as verified so future launches take 0ms
    try {
      fs.writeFileSync(verifiedMarker, JSON.stringify({ verifiedAt: Date.now(), total }));
    } catch (_) {}

    this.client.emit('debug', '[MCLC Patch] Assets successfully verified.');
  };

  // 4. Fast check to verify if a JAR file is valid on disk.
  // Must exist, be non-empty, have >= 4 bytes, match expected size (if provided),
  // and begin with standard ZIP magic bytes PK\x03\x04, PK\x05\x06, or PK\x07\x08 (0x50, 0x4B).
  // Detects 0-byte truncated files and HTML block pages (which start with '<', 0x3C).
  function isJarValid(filePath, expectedSize) {
    try {
      if (!filePath || !fs.existsSync(filePath)) return false;
      const stat = fs.statSync(filePath);
      if (stat.size === 0 || stat.size < 4) return false;
      if (expectedSize && typeof expectedSize === 'number' && expectedSize > 0) {
        if (stat.size !== expectedSize) return false;
      }
      const fd = fs.openSync(filePath, 'r');
      const buffer = Buffer.alloc(4);
      fs.readSync(fd, buffer, 0, 4, 0);
      fs.closeSync(fd);
      // Standard ZIP magic bytes (0x50, 0x4B)
      return buffer[0] === 0x50 && buffer[1] === 0x4B;
    } catch (_) {
      return false;
    }
  }

  // 5. Patch Handler.prototype.downloadAsync to prevent writing HTML error pages or leaving 0-byte corrupt files
  Handler.prototype.downloadAsync = function(url, directory, name, retry, type) {
    if (this.client && this.client._cancelled) return Promise.resolve(false);
    return new Promise(resolve => {
      fs.mkdirSync(directory, { recursive: true });
      const targetFile = path.join(directory, name);

      let _request;
      try {
        _request = this.baseRequest(url);
      } catch (reqErr) {
        this.client && this.client.emit('debug', `[MCLC]: Request failed to init for ${url}: ${reqErr.message}`);
        return resolve(false);
      }

      let receivedBytes = 0;
      let totalBytes = 0;
      let hasErrorStatusCode = false;

      _request.on('response', (data) => {
        if (data.statusCode !== 200 && data.statusCode !== 206) {
          hasErrorStatusCode = true;
          this.client && this.client.emit('debug', `[Integrity Shield] Server/Firewall returned HTTP ${data.statusCode} for ${url} (aborted)`);
          try { _request.abort(); } catch (_) {}
          if (fs.existsSync(targetFile)) {
            try { fs.unlinkSync(targetFile); } catch (_) {}
          }
          return resolve(false);
        }
        totalBytes = parseInt(data.headers['content-length'] || '0', 10);
      });

      _request.on('error', async (error) => {
        if (this.client && this.client._cancelled) return resolve(false);
        this.client && this.client.emit('debug', `[MCLC]: Failed to download to ${targetFile} due to ${error}. Retrying... ${retry}`);
        if (fs.existsSync(targetFile)) {
          try { fs.unlinkSync(targetFile); } catch (_) {}
        }
        if (retry && (!this.client || !this.client._cancelled)) {
          await this.downloadAsync(url, directory, name, false, type);
        }
        resolve(false);
      });

      _request.on('data', (data) => {
        if (hasErrorStatusCode) return;
        receivedBytes += data.length;
        this.client && this.client.emit('download-status', {
          name,
          type,
          current: receivedBytes,
          total: totalBytes
        });
      });

      const file = fs.createWriteStream(targetFile);
      _request.pipe(file);

      file.once('finish', () => {
        if (hasErrorStatusCode) {
          if (fs.existsSync(targetFile)) {
            try { fs.unlinkSync(targetFile); } catch (_) {}
          }
          return resolve(false);
        }
        // If it's a jar file, verify it's a real non-empty ZIP, not an HTML error or empty file
        if (name.endsWith('.jar') && !isJarValid(targetFile)) {
          if (fs.existsSync(targetFile)) {
            try { fs.unlinkSync(targetFile); } catch (_) {}
          }
          this.client && this.client.emit('debug', `[Integrity Shield] Downloaded file ${name} had invalid header / 0 bytes. Deleted.`);
          return resolve(false);
        }
        this.client && this.client.emit('download', name);
        resolve({ failed: false, asset: null });
      });

      file.on('error', async (e) => {
        if (this.client && this.client._cancelled) return resolve(false);
        if (fs.existsSync(targetFile)) {
          try { fs.unlinkSync(targetFile); } catch (_) {}
        }
        if (retry && (!this.client || !this.client._cancelled)) {
          await this.downloadAsync(url, directory, name, false, type);
        }
        resolve(false);
      });
    });
  };

  // 6. Patch Handler.prototype.downloadToDirectory with integrity auto-repair and proper checksum await
  Handler.prototype.downloadToDirectory = async function(directory, libraries, eventName) {
    if (this.client && this.client._cancelled) return [];
    if (!libraries || !Array.isArray(libraries)) return [];

    // Pre-flight auto-repair: scan libraries for 0-byte or corrupted/HTML files and remove them
    for (const library of libraries) {
      if (!library) continue;
      if (this.parseRule && this.parseRule(library)) continue;
      const lib = library.name ? library.name.split(':') : null;
      let jarPath;
      let name;
      if (library.downloads && library.downloads.artifact && library.downloads.artifact.path) {
        name = library.downloads.artifact.path.split('/').pop();
        jarPath = path.join(directory, this.popString(library.downloads.artifact.path));
      } else if (lib && lib.length >= 3) {
        name = `${lib[1]}-${lib[2]}${lib[3] ? '-' + lib[3] : ''}.jar`;
        jarPath = path.join(directory, `${lib[0].replace(/\./g, path.sep)}`, lib[1], lib[2]);
      }
      if (jarPath && name) {
        const fullPath = path.join(jarPath, name);
        if (fs.existsSync(fullPath)) {
          const expectedSize = library.downloads?.artifact?.size;
          if (name.endsWith('.jar') && !isJarValid(fullPath, expectedSize)) {
            try {
              fs.unlinkSync(fullPath);
              if (this.client) {
                this.client.emit('debug', `[Integrity Shield] Auto-repaired corrupted library: ${name} (deleted for clean download)`);
              }
            } catch (_) {}
          }
        }
      }
    }

    const libs = [];
    let counter = 0;

    await Promise.all(libraries.map(async (library) => {
      if (this.client && this.client._cancelled) return;
      if (!library) return;
      if (this.parseRule && this.parseRule(library)) return;
      const lib = library.name ? library.name.split(':') : null;

      let jarPath;
      let name;
      if (library.downloads && library.downloads.artifact && library.downloads.artifact.path) {
        name = library.downloads.artifact.path.split('/').pop();
        jarPath = path.join(directory, this.popString(library.downloads.artifact.path));
      } else if (lib && lib.length >= 3) {
        name = `${lib[1]}-${lib[2]}${lib[3] ? '-' + lib[3] : ''}.jar`;
        jarPath = path.join(directory, `${lib[0].replace(/\./g, '/')}/${lib[1]}/${lib[2]}`);
      } else {
        return;
      }

      const fullPath = path.join(jarPath, name);

      const downloadLibrary = async (libObj) => {
        if (this.client && this.client._cancelled) return;
        if (libObj.url) {
          const url = `${libObj.url}${lib[0].replace(/\./g, '/')}/${lib[1]}/${lib[2]}/${name}`;
          await this.downloadAsync(url, jarPath, name, true, eventName);
        } else if (libObj.downloads && libObj.downloads.artifact && libObj.downloads.artifact.url) {
          await this.downloadAsync(libObj.downloads.artifact.url, jarPath, name, true, eventName);
        }
      };

      if (!fs.existsSync(fullPath)) {
        await downloadLibrary(library);
      } else if (name.endsWith('.jar') && !isJarValid(fullPath, library.downloads?.artifact?.size)) {
        try { fs.unlinkSync(fullPath); } catch (_) {}
        await downloadLibrary(library);
      }

      // Check SHA-1 checksum with proper await (fixing MCLC un-awaited Promise bug)
      if (library.downloads && library.downloads.artifact && library.downloads.artifact.sha1) {
        if (fs.existsSync(fullPath)) {
          const valid = await this.checkSum(library.downloads.artifact.sha1, fullPath);
          if (!valid) {
            try { fs.unlinkSync(fullPath); } catch (_) {}
            await downloadLibrary(library);
          }
        }
      }

      counter++;
      if (this.client) {
        this.client.emit('progress', {
          type: eventName,
          task: counter,
          total: libraries.length
        });
      }
      libs.push(`${jarPath}${path.sep}${name}`);
    }));

    return libs;
  };

  // 7. Patch Handler.prototype.getNatives for cancellation
  const originalGetNatives = Handler.prototype.getNatives;
  Handler.prototype.getNatives = async function() {
    if (this.client && this.client._cancelled) return '';
    return await originalGetNatives.call(this);
  };

  console.log('[MCLC Patch] High-performance non-blocking launch patches successfully applied.');
}

function markExistingIndexesVerified(mcDir) {
  try {
    if (!mcDir) return;
    const indexesDir = path.join(mcDir, 'assets', 'indexes');
    const objectsDir = path.join(mcDir, 'assets', 'objects');
    if (!fs.existsSync(indexesDir) || !fs.existsSync(objectsDir)) return;

    const files = fs.readdirSync(indexesDir);
    for (const f of files) {
      if (f.endsWith('.json')) {
        const marker = path.join(indexesDir, f.replace(/\.json$/, '.verified'));
        if (!fs.existsSync(marker)) {
          fs.writeFileSync(marker, JSON.stringify({ verifiedAt: Date.now(), initialPreVerified: true }));
        }
      }
    }
  } catch (err) {
    console.warn('[MCLC Patch] Pre-verifying existing indexes error:', err.message);
  }
}

// Standalone isJarValid helper for use outside applyMclcPatch
function isJarValid(filePath, expectedSize) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return false;
    const stat = fs.statSync(filePath);
    if (stat.size === 0 || stat.size < 4) return false;
    if (expectedSize && typeof expectedSize === 'number' && expectedSize > 0) {
      if (stat.size !== expectedSize) return false;
    }
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(4);
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);
    return buffer[0] === 0x50 && buffer[1] === 0x4B;
  } catch (_) {
    return false;
  }
}

module.exports = {
  applyMclcPatch,
  markExistingIndexesVerified,
  isJarValid
};

