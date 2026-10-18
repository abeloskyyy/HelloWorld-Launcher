/**
 * installer/src/github.js
 * Fetches release info from GitHub Releases API and handles file downloads with progress.
 */

const https = require('https')
const http = require('http')
const fs = require('fs-extra')
const path = require('path')
const os = require('os')
const axios = require('axios')

const REPO_OWNER = 'Abeloskyyy'
const REPO_NAME = 'HelloWorld-Launcher'
const API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`
const REMOTE_CONFIG_GIST_URL = 'https://gist.githubusercontent.com/abeloskyyy/b50089b634ed09f48c921f9c8126a49f/raw/hwlauncher-info.json'

// ── Platform / arch helpers (Windows only) ───────────────────────────────────

function getPlatformArch() {
  return { platform: 'win', arch: 'x64' }
}

/** Expected asset names for Windows Setup */
function getExpectedAssetNames() {
  return {
    launcher: 'helloworld-launcher-win.zip',
    setup: 'HelloWorld-Launcher-Setup.exe',
    manifest: 'manifest.json',
  }
}

// ── Google Drive & URL helpers ────────────────────────────────────────────────

function resolveDownloadUrl(url) {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) return url
  try {
    const urlObj = new URL(url)
    if (urlObj.hostname.includes('drive.google.com')) {
      let fileId = null
      const matchPath = urlObj.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
      if (matchPath) {
        fileId = matchPath[1]
      } else if (urlObj.searchParams.has('id')) {
        fileId = urlObj.searchParams.get('id')
      }
      if (fileId) {
        return `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`
      }
    }
  } catch (_) {}
  return url
}

function safeParseJson(raw) {
  try {
    return JSON.parse(raw)
  } catch (e1) {
    try {
      const fixed = raw.replace(/([0-9]|true|false|null|"|\]|\})\s*\r?\n(\s*")/g, '$1,\n$2')
      return JSON.parse(fixed)
    } catch (_) {
      throw e1
    }
  }
}

// ── HTTP utility ─────────────────────────────────────────────────────────────

function httpGet(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http
    const req = proto.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/vnd.github.v3+json, application/json, text/plain, */*',
      },
    }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const nextUrl = new URL(res.headers.location, url).toString()
        return resolve(httpGet(nextUrl, opts))
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

async function fetchGistReleaseInfo(version = null) {
  try {
    const raw = await httpGet(`${REMOTE_CONFIG_GIST_URL}?t=${Date.now()}`)
    const data = safeParseJson(raw)
    if (!data || !data.changelog) return null

    const changelog = data.changelog
    const latestVersion = changelog.latestVersion || '2.2.0'
    const versions = Array.isArray(changelog.versions) ? changelog.versions : []

    let targetVersionObj = null
    if (version) {
      targetVersionObj = versions.find(v => v.version === version)
    }
    if (!targetVersionObj) {
      targetVersionObj = versions.find(v => v.version === latestVersion) || versions[0]
    }
    if (!targetVersionObj || !targetVersionObj.downloads) return null

    const downloads = targetVersionObj.downloads || {}
    let launcherUrl = null
    let setupUrl = null

    // Windows setup targets
    if (downloads.windows && typeof downloads.windows === 'object') {
      launcherUrl = downloads.windows.zip || downloads.windows.setup
      setupUrl = downloads.windows.setup || downloads.windows.zip
    }
    if (!launcherUrl) {
      launcherUrl = downloads.windows_zip || downloads.windows_setup || downloads.setup
    }
    if (!setupUrl) {
      setupUrl = downloads.windows_setup || downloads.setup || downloads.windows_zip
    }

    if (!launcherUrl) return null

    const effectiveVersion = targetVersionObj.version || latestVersion
    const names = getExpectedAssetNames()

    return {
      version: effectiveVersion,
      tagName: 'v' + effectiveVersion,
      releaseNotes: targetVersionObj.markdown || targetVersionObj.title || '',
      publishedAt: targetVersionObj.releaseDate || new Date().toISOString(),
      launcher: {
        name: names.launcher,
        url: launcherUrl,
        size: 0,
      },
      setup: setupUrl ? {
        name: names.setup,
        url: setupUrl,
        size: 0,
      } : null,
      manifest: null,
    }
  } catch (err) {
    console.warn('[fetchGistReleaseInfo] Could not fetch/parse changelog from Gist:', err.message)
    return null
  }
}

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

  // ── 1. PRIMARY: FETCH FROM GIST CHANGELOG (Supports Google Drive & Custom Downloads) ──
  try {
    const gistRelease = await fetchGistReleaseInfo(version)
    if (gistRelease && gistRelease.launcher && gistRelease.launcher.url) {
      return gistRelease
    }
  } catch (gistErr) {
    console.warn('[getLatestReleaseInfo] Gist lookup failed, falling back to GitHub Releases:', gistErr.message)
  }

  // ── 2. FALLBACK: FETCH FROM GITHUB RELEASES ──
  try {
    const find = (name) => release.assets.find(a => a.name === name)

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
  return new Promise(async (resolve, reject) => {
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

    const resolvedUrl = resolveDownloadUrl(url)
    const writeStream = fs.createWriteStream(destPath)

    try {
      const res = await axios({
        method: 'get',
        url: resolvedUrl,
        responseType: 'stream',
        timeout: 60000,
        maxRedirects: 15,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
        },
      })

      const contentType = (res.headers['content-type'] || '').toLowerCase()
      if (contentType.includes('text/html')) {
        try { writeStream.close() } catch (_) {}
        try { fs.unlinkSync(destPath) } catch (_) {}
        return reject(new Error('El enlace de descarga devolvió una página HTML en lugar del archivo. Asegúrate de que el enlace de Google Drive tenga permisos públicos ("Cualquier persona con el enlace").'))
      }

      const total = parseInt(res.headers['content-length'] || '0', 10)
      let transferred = 0
      let lastTime = Date.now()
      let lastBytes = 0

      res.data.on('data', (chunk) => {
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

      res.data.pipe(writeStream)

      writeStream.on('finish', () => resolve())
      writeStream.on('error', (err) => {
        try { fs.unlinkSync(destPath) } catch (_) {}
        reject(err)
      })
      res.data.on('error', (err) => {
        try { writeStream.close() } catch (_) {}
        try { fs.unlinkSync(destPath) } catch (_) {}
        reject(err)
      })
    } catch (err) {
      try { writeStream.close() } catch (_) {}
      try { fs.unlinkSync(destPath) } catch (_) {}
      reject(err)
    }
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
