/**
 * scripts/generate-manifest.js
 *
 * Generates a manifest.json describing all files in the built launcher zip/AppImage.
 * This manifest is uploaded to GitHub Releases alongside the launcher assets
 * and used by the installer's Repair mode to detect corrupt/missing files.
 *
 * Usage (called automatically by build scripts):
 *   node scripts/generate-manifest.js [--platform=win|linux] [--arch=x64|arm64]
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const AdmZip = require('adm-zip')

const pkg = require('../package.json')
const version = pkg.version

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const platform = args.find(a => a.startsWith('--platform='))?.split('=')[1] || detectPlatform()
const arch     = args.find(a => a.startsWith('--arch='))?.split('=')[1]     || 'x64'

function detectPlatform() {
  if (process.platform === 'win32') return 'win'
  if (process.platform === 'darwin') return 'mac'
  return 'linux'
}

// ── Find the launcher zip/AppImage ────────────────────────────────────────────
const distDir = path.join(__dirname, '..', 'dist')

function findLauncherAsset() {
  if (!fs.existsSync(distDir)) {
    console.error('[manifest] dist/ directory not found. Build the launcher first.')
    process.exit(1)
  }

  const files = fs.readdirSync(distDir)
  const ext = platform === 'win' ? '.zip' : platform === 'mac' ? '.zip' : '.deb'
  const pattern = platform === 'win'
    ? `helloworld-launcher-win${ext}`
    : platform === 'mac'
      ? `helloworld-launcher-mac-${arch}${ext}`
      : `helloworld-launcher-linux-${arch}${ext}`

  // Try exact name first
  let asset = files.find(f => f === pattern)

  // Fallback: any zip/deb for this platform+arch
  if (!asset) {
    asset = files.find(f => f.endsWith(ext))
  }

  if (!asset) {
    console.error(`[manifest] Could not find ${pattern} in dist/`)
    process.exit(1)
  }

  return path.join(distDir, asset)
}

// ── SHA-256 of a buffer or file ───────────────────────────────────────────────
function sha256Buffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex')
}

function sha256File(filePath) {
  return sha256Buffer(fs.readFileSync(filePath))
}

// ── Build file list ───────────────────────────────────────────────────────────
function buildFileList(assetPath) {
  const ext = path.extname(assetPath).toLowerCase()

  if (ext === '.zip') {
    // Windows: enumerate zip entries
    const zip = new AdmZip(assetPath)
    return zip.getEntries()
      .filter(e => !e.isDirectory)
      .map(e => ({
        path: e.entryName,
        size: e.header.size,
        sha256: sha256Buffer(e.getData()),
      }))
  }

  if (ext === '.appimage' || ext === '.deb') {
    // Linux: the package is itself the single artifact
    return [{
      path: path.basename(assetPath),
      size: fs.statSync(assetPath).size,
      sha256: sha256File(assetPath),
    }]
  }

  throw new Error(`Unsupported asset format: ${ext}`)
}

// ── Main ──────────────────────────────────────────────────────────────────────
;(function main() {
  console.log(`[manifest] Generating manifest for ${platform}-${arch} v${version}...`)

  const assetPath = findLauncherAsset()
  console.log(`[manifest] Reading: ${path.basename(assetPath)}`)

  const files = buildFileList(assetPath)
  console.log(`[manifest] Found ${files.length} file(s)`)

  const assetSize = fs.statSync(assetPath).size
  const assetHash = sha256File(assetPath)

  const manifest = {
    version,
    platform,
    arch,
    generatedAt: new Date().toISOString(),
    assetName: path.basename(assetPath),
    assetSha256: assetHash,
    assetSize,
    files,
  }

  const outPath = path.join(distDir, 'manifest.json')
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2), 'utf8')
  console.log(`[manifest] Written to: ${outPath}`)
  console.log(`[manifest] Asset SHA-256: ${assetHash}`)
})()
