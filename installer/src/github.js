/**
 * installer/src/github.js
 * Fetches release info from GitHub Releases API and handles file downloads with progress.
 */

const https = require('https')
const http = require('http')
const fs = require('fs-extra')
const path = require('path')
const os = require('os')

const REPO_OWNER = 'Abeloskyyy'
const REPO_NAME = 'HelloWorld-Launcher'
const API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`

// ── Platform / arch helpers ───────────────────────────────────────────────────

function getPlatformArch() {
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64'
  const platform = process.platform === 'win32' ? 'win' : 'linux'
  return { platform, arch }
}

/** Expected asset names:
 *  Windows: helloworld-launcher-win.zip
 *  Linux:   helloworld-launcher-linux-x64.deb / helloworld-launcher-linux-arm64.deb
 *  Setup:   HelloWorld-Launcher-Setup.exe
 *  Manifest: manifest.json
 */
function getExpectedAssetNames() {
  const { platform, arch } = getPlatformArch()
  if (platform === 'win') {
    return {
      launcher: 'helloworld-launcher-win.zip',
      setup: 'HelloWorld-Launcher-Setup.exe',
      manifest: 'manifest.json',
    }
  }
  return {
    launcher: `helloworld-launcher-linux-${arch}.deb`,
    setup: null,
    manifest: 'manifest.json',
  }
}

// ── HTTP utility ─────────────────────────────────────────────────────────────

function httpGet(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http
    const req = proto.get(url, {
      headers: {
        'User-Agent': 'HelloWorld-Launcher-Setup/1.0',
        Accept: 'application/vnd.github.v3+json',
      },
    }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(httpGet(res.headers.location, opts))
      }
      if (res.statusCode !== 200) {
        res.resume()
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`))
      }
      let data = ''
      res.setEncoding('utf8')
      res.on('data', chunk => { data += chunk })
      res.on('end', () => resolve(data))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Request timeout')) })
  })
}

// ── Release info ─────────────────────────────────────────────────────────────

async function fetchRelease(version) {
  if (version) {
    try {
      const raw = await httpGet(`${API_BASE}/releases/tags/v${version}`)
      return JSON.parse(raw)
    } catch (e) {
      // fallback to latest if tag not found
    }
  }
  const raw = await httpGet(`${API_BASE}/releases/latest`)
  return JSON.parse(raw)
}

async function getLatestReleaseInfo(version = null) {
  const names = getExpectedAssetNames()
  const { app } = require('electron')

  // ── DEV TEST-ENV (Only in development if test-env folder exists) ──
  if (app && !app.isPackaged) {
    const testEnvPath = path.join(__dirname, '..', 'test-env')
    if (fs.existsSync(testEnvPath) && fs.existsSync(path.join(testEnvPath, names.launcher))) {
      const launcherPath = path.join(testEnvPath, names.launcher)
      const manifestPath = path.join(testEnvPath, names.manifest)

      return {
        version: version || '9.9.9-test',
        tagName: 'v' + (version || '9.9.9-test'),
        releaseNotes: '# Entorno de Pruebas (Local)\nEstás utilizando los archivos locales de la carpeta de instalación para probar el instalador de forma controlada sin conexión a GitHub.',
        publishedAt: new Date().toISOString(),
        launcher: { name: names.launcher, url: launcherPath, size: fs.statSync(launcherPath).size },
        setup: null,
        manifest: fs.existsSync(manifestPath) ? { url: manifestPath } : null,
      }
    }
  }

  // ── PRODUCTION: FETCH FROM GITHUB RELEASES ──
  try {
    const release = await fetchRelease(version)

    const find = (name) => release.assets.find(a => a.name === name || (name && name.includes('-x64.deb') && a.name === name.replace('-x64.deb', '-amd64.deb')))

    const launcherAsset = find(names.launcher)
    const setupAsset = find(names.setup)
    const manifestAsset = find(names.manifest)

    return {
      version: release.tag_name.replace(/^v/, ''),
      tagName: release.tag_name,
      releaseNotes: release.body || '',
      publishedAt: release.published_at,
      launcher: launcherAsset ? {
        name: launcherAsset.name,
        url: launcherAsset.browser_download_url,
        size: launcherAsset.size,
      } : null,
      setup: setupAsset ? {
        name: setupAsset.name,
        url: setupAsset.browser_download_url,
        size: setupAsset.size,
      } : null,
      manifest: manifestAsset ? {
        url: manifestAsset.browser_download_url,
      } : null,
    }
  } catch (err) {
    // Offline fallback if local launcher asset exists next to the portable exe
    const localDir = (app && app.isPackaged) ? (process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath)) : null
    if (localDir && fs.existsSync(path.join(localDir, names.launcher))) {
      const launcherPath = path.join(localDir, names.launcher)
      const manifestPath = path.join(localDir, names.manifest)
      return {
        version: version || '2.1.0-offline',
        tagName: 'v' + (version || '2.1.0-offline'),
        releaseNotes: '# Modo sin conexión\nNo se pudo conectar a GitHub Releases. Utilizando el archivo del launcher encontrado junto al instalador.',
        publishedAt: new Date().toISOString(),
        launcher: { name: names.launcher, url: launcherPath, size: fs.statSync(launcherPath).size },
        setup: null,
        manifest: fs.existsSync(manifestPath) ? { url: manifestPath } : null,
      }
    }
    throw err
  }
}

// ── Download with progress ────────────────────────────────────────────────────

/**
 * Download a URL to a local file, calling onProgress(percent, transferredBytes, totalBytes, speedBps)
 */
function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    if (!url.startsWith('http')) {
      try {
        const stat = fs.statSync(url)
        const total = stat.size
        let transferred = 0
        let lastTime = Date.now()
        let lastBytes = 0

        const readStream = fs.createReadStream(url)
        const writeStream = fs.createWriteStream(destPath)

        readStream.on('data', (chunk) => {
          transferred += chunk.length
          const now = Date.now()
          if (now - lastTime >= 500 || transferred === total) {
            const speed = ((transferred - lastBytes) / Math.max(1, now - lastTime)) * 1000
            onProgress(transferred / total * 100, transferred, total, speed)
            lastTime = now
            lastBytes = transferred
          }
        })
        readStream.on('end', resolve)
        readStream.on('error', reject)
        writeStream.on('error', reject)
        readStream.pipe(writeStream)
        return
      } catch (err) {
        return reject(err)
      }
    }

    const proto = url.startsWith('https') ? https : http

    const makeRequest = (targetUrl) => {
      const req = proto.get(targetUrl, {
        headers: { 'User-Agent': 'HelloWorld-Launcher-Setup/1.0' },
      }, (res) => {
        // Follow redirect
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume()
          return makeRequest(res.headers.location)
        }
        if (res.statusCode !== 200) {
          res.resume()
          return reject(new Error(`Download failed: HTTP ${res.statusCode}`))
        }

        const total = parseInt(res.headers['content-length'] || '0', 10)
        let transferred = 0
        let lastTime = Date.now()
        let lastBytes = 0

        const fileStream = fs.createWriteStream(destPath)
        res.pipe(fileStream)

        res.on('data', (chunk) => {
          transferred += chunk.length
          const now = Date.now()
          const elapsed = (now - lastTime) / 1000
          let speed = 0
          if (elapsed >= 0.5) {
            speed = (transferred - lastBytes) / elapsed
            lastTime = now
            lastBytes = transferred
          }
          const percent = total > 0 ? Math.round((transferred / total) * 100) : 0
          if (onProgress) onProgress(percent, transferred, total, speed)
        })

        fileStream.on('finish', resolve)
        fileStream.on('error', reject)
        res.on('error', reject)
      })

      req.on('error', reject)
      req.setTimeout(30000, () => { req.destroy(); reject(new Error('Download timeout')) })
    }

    makeRequest(url)
  })
}

// ── Manifest (repair) ─────────────────────────────────────────────────────────

async function fetchManifest(manifestUrl) {
  if (!manifestUrl.startsWith('http')) {
    return fs.readJson(manifestUrl)
  }
  const raw = await httpGet(manifestUrl)
  return JSON.parse(raw)
}

module.exports = {
  getLatestReleaseInfo,
  downloadFile,
  fetchManifest,
  getPlatformArch,
  getExpectedAssetNames,
  REPO_OWNER,
  REPO_NAME,
}
