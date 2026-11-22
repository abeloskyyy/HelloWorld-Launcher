/**
 * installer/src/installer.js
 * Core installation engine: install, update, repair, uninstall.
 * All operations emit progress events through a callback.
 */

const path = require('path')
const os = require('os')
const fs = require('fs-extra')
const crypto = require('crypto')
const { exec } = require('child_process')
const AdmZip = require('adm-zip')

const { getLatestReleaseInfo, downloadFile, fetchManifest, getPlatformArch } = require('./github')
const { writeState, removeState, writeRegistry, removeRegistry, getUserDataPath, checkWriteAccess, getInstalledVersion } = require('./paths')
const { createShortcuts, removeShortcuts } = require('./shortcuts')

// ── Helpers ───────────────────────────────────────────────────────────────────

function execPromise(cmd, opts = {}) {
  return new Promise((resolve, reject) => {
    exec(cmd, { windowsHide: true, ...opts }, (err, stdout, stderr) => {
      if (err) reject(err)
      else resolve({ stdout, stderr })
    })
  })
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const stream = fs.createReadStream(filePath)
    stream.on('data', chunk => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatSpeed(bps) {
  if (bps < 1024) return `${Math.round(bps)} B/s`
  if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(0)} KB/s`
  return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`
}

function getTempDir() {
  return path.join(os.tmpdir(), 'helloworld-setup-tmp')
}

/** Launch an application cleanly outside the AppImage environment */
function launchDetached(executablePath) {
  try {
    const { spawn } = require('child_process')
    const childEnv = { ...process.env }
    delete childEnv.APPDIR
    delete childEnv.APPIMAGE
    delete childEnv.OWD
    if (childEnv.LD_LIBRARY_PATH) {
      childEnv.LD_LIBRARY_PATH = childEnv.LD_LIBRARY_PATH
        .split(':')
        .filter(p => !p.includes('.mount_'))
        .join(':')
      if (!childEnv.LD_LIBRARY_PATH) delete childEnv.LD_LIBRARY_PATH
    }
    const child = spawn(executablePath, [], {
      detached: true,
      stdio: 'ignore',
      cwd: path.dirname(executablePath),
      env: childEnv,
    })
    child.unref()
  } catch (err) {
    console.error('Failed to launch application detached:', err)
  }
}

/** Read installed version from package.json or app.asar */
function readInstalledVersion(installPath) {
  try {
    const pkgJson = path.join(installPath, 'resources', 'app', 'package.json')
    if (fs.existsSync(pkgJson)) {
      return fs.readJsonSync(pkgJson).version
    }
    const asarPath = path.join(installPath, 'resources', 'app.asar')
    if (fs.existsSync(asarPath)) {
      const prevNoAsar = process.noAsar
      process.noAsar = false
      try {
        const pkg = fs.readJsonSync(path.join(asarPath, 'package.json'))
        process.noAsar = prevNoAsar
        if (pkg?.version) return pkg.version
      } catch (_) {
        process.noAsar = prevNoAsar
      }
    }
  } catch (_) {}
  return null
}

/** Find the main launcher executable in an install directory */
function findLauncherExecutable(installPath) {
  if (process.platform === 'win32') {
    // If files are nested inside win-unpacked, flatten to installPath
    const unpackedDir = path.join(installPath, 'win-unpacked')
    if (fs.existsSync(unpackedDir)) {
      try {
        const items = fs.readdirSync(unpackedDir)
        for (const item of items) {
          fs.moveSync(path.join(unpackedDir, item), path.join(installPath, item), { overwrite: true })
        }
        fs.removeSync(unpackedDir)
      } catch (err) {
        console.warn('Failed to flatten win-unpacked:', err.message)
      }
    }

    const files = fs.readdirSync(installPath).filter(f =>
      f.endsWith('.exe') && !f.toLowerCase().startsWith('unins') && !f.toLowerCase().includes('setup')
    )
    if (files.length > 0) {
      const preferred = files.find(f => f.toLowerCase().includes('helloworld')) || files[0]
      return path.join(installPath, preferred)
    }

    // Fallback: check 1-level deep subdirectories
    try {
      const subdirs = fs.readdirSync(installPath, { withFileTypes: true }).filter(d => d.isDirectory())
      for (const d of subdirs) {
        const subPath = path.join(installPath, d.name)
        const subFiles = fs.readdirSync(subPath).filter(f =>
          f.endsWith('.exe') && !f.toLowerCase().startsWith('unins') && !f.toLowerCase().includes('setup')
        )
        if (subFiles.length > 0) {
          const preferred = subFiles.find(f => f.toLowerCase().includes('helloworld')) || subFiles[0]
          return path.join(subPath, preferred)
        }
      }
    } catch (_) {}

    return null
  }
  // Linux
  try {
    const directExec = path.join(installPath, 'helloworld-launcher')
    if (fs.existsSync(directExec)) {
      try { fs.chmodSync(directExec, 0o755) } catch (_) {}
      return directExec
    }
    const unpackedExec = path.join(installPath, 'linux-unpacked', 'helloworld-launcher')
    if (fs.existsSync(unpackedExec)) {
      const items = fs.readdirSync(path.join(installPath, 'linux-unpacked'))
      for (const item of items) {
        fs.moveSync(path.join(installPath, 'linux-unpacked', item), path.join(installPath, item), { overwrite: true })
      }
      fs.removeSync(path.join(installPath, 'linux-unpacked'))
      try { fs.chmodSync(directExec, 0o755) } catch (_) {}
      return directExec
    }
    const files = fs.readdirSync(installPath).filter(f =>
      (f.toLowerCase().endsWith('.appimage') || f === 'helloworld-launcher') && !f.toLowerCase().includes('setup')
    )
    if (files.length > 0) {
      const p = path.join(installPath, files[0])
      try { fs.chmodSync(p, 0o755) } catch (_) {}
      return p
    }
  } catch (_) {}
  return null
}

/** Copy the running setup executable to the install directory */
async function copySetupToInstallDir(installPath) {
  try {
    if (process.defaultApp || process.execPath.toLowerCase().endsWith('electron.exe') || process.execPath.toLowerCase().endsWith('/electron')) {
      return null
    }

    const isWin = process.platform === 'win32'
    const setupSrc = isWin ? (process.env.PORTABLE_EXECUTABLE_FILE || process.execPath) : (process.env.APPIMAGE || process.execPath)
    const setupDest = path.join(installPath, isWin ? 'setup.exe' : 'setup.bin')

    const srcResolved = path.resolve(setupSrc).toLowerCase()
    const destResolved = path.resolve(setupDest).toLowerCase()
    const srcDir = path.dirname(srcResolved)
    const targetDir = path.resolve(installPath).toLowerCase()

    // Si el setup ya se encuentra dentro de la misma carpeta de instalación, NO volver a copiarse
    if (srcResolved === destResolved || srcDir === targetDir) {
      if (!isWin) {
        await fs.chmod(setupDest, 0o755).catch(() => {})
      }
      return setupDest
    }

    await fs.copy(setupSrc, setupDest, { overwrite: true })
    if (!isWin) {
      await fs.chmod(setupDest, 0o755).catch(() => {})
    }
    return setupDest
  } catch (err) {
    console.error('Failed to copy setup to install dir:', err)
    return null
  }
}

/** Kill the launcher if it's running */
async function killLauncher() {
  try {
    if (process.platform === 'win32') {
      await execPromise('taskkill /f /im "HelloWorld-Launcher.exe" 2>nul').catch(() => {})
      await execPromise('taskkill /f /im "helloworld-launcher.exe" 2>nul').catch(() => {})
    } else {
      // En Linux, NUNCA usar 'pkill -f helloworld-launcher' directamente porque el binario del setup
      // (helloworld-launcher-setup) o su daemon FUSE (setup.bin) contienen la misma subcadena.
      // Si se mataba el proceso FUSE padre, se desmontaba /tmp/.mount_setup.* mientras Electron
      // seguía ejecutando código mmap'd, provocando inmediatamente SIGBUS (BUS_ADRERR).
      const currentPid = process.pid
      const parentPid = process.ppid

      const { stdout } = await execPromise('ps -eo pid,ppid,args').catch(() => ({ stdout: '' }))
      const lines = stdout.split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        const parts = trimmed.split(/\s+/)
        if (parts.length < 3) continue
        const pid = parseInt(parts[0], 10)
        const ppid = parseInt(parts[1], 10)
        const cmd = parts.slice(2).join(' ')
        const lowerCmd = cmd.toLowerCase()

        if (!pid || pid === 1) continue
        if (pid === currentPid || pid === parentPid || ppid === currentPid) continue
        if (lowerCmd.includes('setup') || lowerCmd.includes('drkonqi') || lowerCmd.includes('installer')) continue

        // Identificar launcher de forma segura
        if (lowerCmd.includes('helloworld-launcher') || lowerCmd.includes('helloworld_launcher')) {
          try {
            process.kill(pid, 'SIGTERM')
            setTimeout(() => {
              try { process.kill(pid, 'SIGKILL') } catch (_) {}
            }, 1000)
          } catch (_) {}
        }
      }
    }
    await new Promise(r => setTimeout(r, 1500))
  } catch { }
}

/** Extract zip to destination, optionally only specific files */
async function extractZip(zipPath, destPath, onProgress) {
  await fs.ensureDir(destPath)

  // Fast path: use native tools (tar on Windows 10/11, unzip on Linux)
  // Non-blocking child process, extracts 250MB in ~2 seconds without UI freeze
  try {
    if (onProgress) onProgress(30)
    if (process.platform === 'win32') {
      await execPromise(`tar -xf "${zipPath}" -C "${destPath}"`)
    } else {
      if (zipPath.endsWith('.tar.gz') || zipPath.endsWith('.tgz')) {
        await execPromise(`tar -xzf "${zipPath}" -C "${destPath}"`)
      } else {
        await execPromise(`unzip -q -o "${zipPath}" -d "${destPath}"`)
      }
    }
    if (onProgress) onProgress(100)
    return
  } catch (extractErr) {
    console.warn('Native extraction unavailable, falling back to AdmZip:', extractErr.message)
  }

  // Fallback: AdmZip with regular yielding
  const originalFs = require('original-fs')
  try {
    const zip = new AdmZip(zipPath)
    const entries = zip.getEntries().filter(e => !e.isDirectory)
    const total = entries.length

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      const entryDest = path.join(destPath, entry.entryName)
      await fs.ensureDir(path.dirname(entryDest))
      
      await new Promise((resolve, reject) => {
        zip.readFileAsync(entry, (data, err) => {
          if (err) return reject(err)
          originalFs.writeFile(entryDest, data, (err) => {
            if (err) return reject(err)
            else resolve()
          })
        })
      })

      // Yield event loop so Windows message pump doesn't mark process as "(No responde)"
      await new Promise(r => setTimeout(r, 1))
      if (onProgress) onProgress(Math.round(((i + 1) / total) * 100))
    }
  } catch (err) {
    throw err
  }
}

/** Ensure icon.png exists in installPath on Linux/Windows by reading from ASAR or resources */
async function ensureInstallIcon(installPath) {
  const targetIconPng = path.join(installPath, 'icon.png')
  const candidates = [
    path.join(__dirname, '..', 'build', 'icon.png'),
    path.join(process.resourcesPath || '', 'icon.png'),
    path.join(installPath, 'resources', 'app.asar', 'ui', 'icon.png'),
    path.join(installPath, 'resources', 'app.asar', 'build', 'icon.png'),
    path.join(installPath, 'resources', 'app', 'ui', 'icon.png'),
    path.join(installPath, 'resources', 'app', 'build', 'icon.png'),
  ]
  for (const cand of candidates) {
    if (!cand) continue
    try {
      if (fs.existsSync(cand)) {
        const buf = fs.readFileSync(cand)
        if (buf && buf.length > 0) {
          await fs.ensureDir(installPath)
          await fs.writeFile(targetIconPng, buf)
          return targetIconPng
        }
      }
    } catch (_) {}
  }
  return (await fs.pathExists(targetIconPng)) ? targetIconPng : null
}

/** Remove obsolete .AppImage or leftover archive files inside installPath when switching to unpacked zip */
async function cleanupObsoleteLinuxPackageFiles(installPath) {
  if (process.platform === 'win32' || !(await fs.pathExists(installPath))) return
  try {
    const entries = await fs.readdir(installPath)
    for (const name of entries) {
      const lower = name.toLowerCase()
      if (lower.endsWith('.appimage') || (/^helloworld-launcher.*\.zip$/i.test(name))) {
        await fs.remove(path.join(installPath, name)).catch(() => {})
      }
    }
  } catch (_) {}
}

/** Apply either an AppImage or a zip/tarball asset uniformly across install, update, and reinstall */
async function applyLauncherAsset(assetPath, installPath, emit, msg, progressStart, progressSpan) {
  await fs.ensureDir(installPath)
  if (assetPath.toLowerCase().endsWith('.appimage')) {
    emit(msg, progressStart)
    const targetAppImagePath = path.join(installPath, 'helloworld-launcher.AppImage')
    await fs.copy(assetPath, targetAppImagePath, { overwrite: true })
    await fs.chmod(targetAppImagePath, 0o755)
    emit(msg, progressStart + progressSpan)
    return targetAppImagePath
  }

  emit(msg, progressStart)
  await cleanupObsoleteLinuxPackageFiles(installPath)
  await extractZip(assetPath, installPath, (pct) => {
    emit(msg, progressStart + Math.round((pct / 100) * progressSpan))
  })

  // On Windows, automatically unblock extracted files (strip Zone.Identifier / SmartScreen mark-of-the-web)
  if (process.platform === 'win32') {
    try {
      const escapePs = (str) => (str || '').replace(/'/g, "''")
      await execPromise(`powershell -NoProfile -NonInteractive -Command "Get-ChildItem -LiteralPath '${escapePs(installPath)}' -Recurse | Unblock-File"`).catch(() => {})
    } catch (_) {}
  }

  return findLauncherExecutable(installPath)
}

/** Detect whether a desktop shortcut already exists so update/reinstall can preserve it */
function hasExistingDesktopShortcut() {
  if (process.platform === 'win32') {
    return fs.existsSync(path.join(os.homedir(), 'Desktop', 'HelloWorld Launcher.lnk'))
  }
  return ['Desktop', 'Escritorio'].some(d =>
    fs.existsSync(path.join(os.homedir(), d, 'helloworld-launcher.desktop'))
  )
}

/** Sync icon, local setup binary, shortcuts, and OS/state registration */
async function syncShortcutsAndState({ installPath, version, executablePath, createDesktop, createStartMenu, resetShortcuts = false }) {
  const preserveDesktop = createDesktop !== undefined ? Boolean(createDesktop) : hasExistingDesktopShortcut()
  const preserveStartMenu = createStartMenu !== undefined ? Boolean(createStartMenu) : true

  const targetIconPng = await ensureInstallIcon(installPath)
  const installerPath = (await copySetupToInstallDir(installPath)) || process.env.PORTABLE_EXECUTABLE_FILE || process.execPath

  if (resetShortcuts) {
    await removeShortcuts().catch(() => {})
  }
  if (executablePath) {
    const iconPath = process.platform === 'win32' ? executablePath : (targetIconPng || 'helloworld-launcher')
    await createShortcuts({
      installPath,
      executablePath,
      createDesktop: preserveDesktop,
      createStartMenu: preserveStartMenu,
      iconPath,
    })
  }

  if (version) {
    await writeRegistry({ installPath, version, installerPath })
    await writeState({ installPath, version, installerPath })
  }
  return { targetIconPng, installerPath }
}

// ── INSTALL ───────────────────────────────────────────────────────────────────

async function install({ installPath, createDesktop, createStartMenu, launchAfter }, onProgress) {
  const emit = (msg, percent) => onProgress && onProgress({ msg, percent })
  const tempDir = getTempDir()

  try {
    emit('Checking latest version...', 2)
    const release = await getLatestReleaseInfo()

    if (!release.launcher) {
      throw new Error(`No launcher asset found for your platform in release ${release.version}`)
    }

    emit(`Found version ${release.version} — downloading launcher...`, 5)

    await fs.ensureDir(tempDir)
    const assetPath = path.join(tempDir, release.launcher.name)

    await downloadFile(release.launcher.url, assetPath, (pct, transferred, total, speed) => {
      const msg = `Downloading... ${formatBytes(transferred)} / ${formatBytes(total)}${speed ? ' · ' + formatSpeed(speed) : ''}`
      emit(msg, 5 + Math.round(pct * 0.65)) // 5-70%
    })

    emit('Preparing installation directory...', 72)
    const executablePath = await applyLauncherAsset(assetPath, installPath, emit, 'Installing files...', 75, 13)

    emit('Creating shortcuts...', 90)
    await syncShortcutsAndState({
      installPath,
      version: release.version,
      executablePath,
      createDesktop,
      createStartMenu,
      resetShortcuts: true,
    })

    emit('Cleaning up...', 97)
    await fs.remove(tempDir).catch(() => {})

    emit('Installation complete!', 100)

    if (launchAfter && executablePath) {
      setTimeout(() => {
        launchDetached(executablePath)
      }, 500)
    }

    return { success: true, version: release.version, executablePath }
  } catch (err) {
    await fs.remove(tempDir).catch(() => {})
    throw err
  }
}

// ── UPDATE ────────────────────────────────────────────────────────────────────

async function update({ installPath, updateFile, launchAfter }, onProgress) {
  const emit = (msg, percent) => onProgress && onProgress({ msg, percent })
  const tempDir = getTempDir()

  try {
    let assetPath = updateFile
    let targetVersion = null

    // Si ya se proporcionó un paquete local pre-descargado (.zip) y existe, usarlo directamente sin volver a descargar
    if (assetPath && (await fs.pathExists(assetPath))) {
      emit('Usando paquete pre-descargado...', 10)
    } else {
      emit('Checking latest version...', 2)
      const release = await getLatestReleaseInfo()

      if (!release.launcher) {
        throw new Error(`No launcher asset found for your platform in release ${release.version}`)
      }
      targetVersion = release.version

      emit(`Downloading version ${release.version}...`, 5)
      await fs.ensureDir(tempDir)
      assetPath = path.join(tempDir, release.launcher.name)

      await downloadFile(release.launcher.url, assetPath, (pct, transferred, total, speed) => {
        const msg = `Downloading... ${formatBytes(transferred)} / ${formatBytes(total)}${speed ? ' · ' + formatSpeed(speed) : ''}`
        emit(msg, 5 + Math.round(pct * 0.65))
      })
    }

    emit('Stopping launcher...', 72)
    await killLauncher()

    const executablePath = await applyLauncherAsset(assetPath, installPath, emit, 'Applying update...', 75, 15)

    // Resolver versión actualizada
    if (!targetVersion) {
      targetVersion = readInstalledVersion(installPath)
    }

    emit('Updating registration...', 92)
    await syncShortcutsAndState({
      installPath,
      version: targetVersion,
      executablePath,
      resetShortcuts: true,
    })

    emit('Cleaning up...', 97)
    await fs.remove(tempDir).catch(() => {})

    emit('Update complete!', 100)

    if (launchAfter && executablePath) {
      setTimeout(() => {
        launchDetached(executablePath)
      }, 800)
    }

    return { success: true, version: targetVersion, executablePath }
  } catch (err) {
    await fs.remove(tempDir).catch(() => {})
    throw err
  }
}

// ── REINSTALL ────────────────────────────────────────────────────────────────────

async function reinstall({ installPath }, onProgress) {
  const emit = (msg, percent) => onProgress && onProgress({ msg, percent })
  const tempDir = getTempDir()

  try {
    emit('Checking version...', 2)
    const currentVersion = await getInstalledVersion()
    const release = await getLatestReleaseInfo(currentVersion)

    if (!release.launcher) {
      throw new Error(`No launcher asset found for your platform in release ${release.version}`)
    }

    emit('Downloading fresh copy...', 5)
    await fs.ensureDir(tempDir)
    const assetPath = path.join(tempDir, release.launcher.name)

    await downloadFile(release.launcher.url, assetPath, (pct, transferred, total, speed) => {
      const msg = `Downloading... ${formatBytes(transferred)} / ${formatBytes(total)}${speed ? ' · ' + formatSpeed(speed) : ''}`
      emit(msg, 5 + Math.round(pct * 0.45))
    })

    emit('Stopping launcher...', 50)
    await killLauncher()

    const executablePath = await applyLauncherAsset(assetPath, installPath, emit, 'Restoring files...', 52, 38)

    emit('Refreshing shortcuts...', 92)
    await syncShortcutsAndState({
      installPath,
      version: release.version,
      executablePath,
      resetShortcuts: true,
    })

    emit('Cleaning up...', 97)
    await fs.remove(tempDir).catch(() => {})

    emit('Repair complete!', 100)
    return { success: true, version: release.version, executablePath }
  } catch (err) {
    await fs.remove(tempDir).catch(() => {})
    throw err
  }
}

// ── UNINSTALL ─────────────────────────────────────────────────────────────────

async function uninstall({ installPath, removeUserData }, onProgress) {
  const emit = (msg, percent) => onProgress && onProgress({ msg, percent })

  try {
    emit('Stopping launcher...', 5)
    await killLauncher()

    emit('Removing shortcuts...', 15)
    await removeShortcuts()

    emit('Removing application files...', 30)
    if (await fs.pathExists(installPath)) {
      await fs.remove(installPath)
    }

    if (removeUserData) {
      emit('Removing user data...', 70)
      const userDataPath = getUserDataPath()
      if (await fs.pathExists(userDataPath)) {
        await fs.remove(userDataPath)
      }
      const hwlauncherPath = process.platform === 'win32'
        ? path.join(process.env.APPDATA || os.homedir(), '.hwlauncher')
        : path.join(os.homedir(), '.hwlauncher')
      if (await fs.pathExists(hwlauncherPath)) {
        await fs.remove(hwlauncherPath)
      }
    }

    emit('Cleaning registry...', 85)
    await removeRegistry()

    emit('Removing installer state...', 92)
    await removeState()

    emit('Uninstallation complete!', 100)
    return { success: true }
  } catch (err) {
    throw err
  }
}

module.exports = { install, update, reinstall, uninstall }
