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

/** Find the main launcher executable in an install directory */
function findLauncherExecutable(installPath) {
  if (process.platform === 'win32') {
    const files = fs.readdirSync(installPath).filter(f =>
      f.endsWith('.exe') && !f.toLowerCase().startsWith('unins') && !f.toLowerCase().includes('setup')
    )
    if (files.length > 0) return path.join(installPath, files[0])
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
    } else {
      await execPromise('pkill -f "helloworld-launcher" 2>/dev/null').catch(() => {})
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
    await fs.ensureDir(installPath)

    if (release.launcher.name.toLowerCase().endsWith('.appimage')) {
      emit('Installing AppImage...', 75)
      const targetAppImagePath = path.join(installPath, 'helloworld-launcher.AppImage')
      await fs.copy(assetPath, targetAppImagePath, { overwrite: true })
      await fs.chmod(targetAppImagePath, 0o755)
      emit('AppImage installed!', 85)
    } else {
      emit('Extracting files...', 75)
      await extractZip(assetPath, installPath, (pct) => {
        emit('Extracting files...', 75 + Math.round(pct * 0.12)) // 75-87%
      })
    }

    // Copiar icono de la aplicación para los accesos directos
    const localIconPng = path.join(__dirname, '..', 'build', 'icon.png')
    const targetIconPng = path.join(installPath, 'icon.png')
    if (await fs.pathExists(localIconPng)) {
      await fs.copy(localIconPng, targetIconPng, { overwrite: true }).catch(() => {})
    }

    emit('Copying setup to installation folder...', 88)
    const installerPath = await copySetupToInstallDir(installPath)

    emit('Creating shortcuts...', 90)
    const executablePath = findLauncherExecutable(installPath)
    if (executablePath) {
      const iconPath = process.platform === 'win32' ? executablePath : (await fs.pathExists(targetIconPng) ? targetIconPng : executablePath)
      await createShortcuts({
        installPath,
        executablePath,
        createDesktop,
        createStartMenu,
        iconPath,
      })
    }

    emit('Registering installation...', 93)
    await writeRegistry({ installPath, version: release.version, installerPath })
    await writeState({ installPath, version: release.version, installerPath })

    emit('Cleaning up...', 97)
    await fs.remove(tempDir).catch(() => {})

    emit('Installation complete!', 100)

    if (launchAfter && executablePath) {
      setTimeout(() => {
        const { spawn } = require('child_process')
        spawn(executablePath, [], { detached: true, stdio: 'ignore' }).unref()
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

    emit('Applying update...', 75)
    if (assetPath.toLowerCase().endsWith('.appimage')) {
      const targetAppImagePath = path.join(installPath, 'helloworld-launcher.AppImage')
      await fs.copy(assetPath, targetAppImagePath, { overwrite: true })
      await fs.chmod(targetAppImagePath, 0o755)
      emit('AppImage update applied!', 85)
    } else {
      await extractZip(assetPath, installPath, (pct) => {
        emit('Applying update...', 75 + Math.round(pct * 0.15))
      })
    }

    // Resolver versión actualizada
    if (!targetVersion) {
      try {
        const pkgJson = path.join(installPath, 'resources', 'app', 'package.json')
        if (await fs.pathExists(pkgJson)) {
          const pkg = await fs.readJson(pkgJson)
          targetVersion = pkg.version
        }
      } catch (_) {}
    }

    emit('Updating registration...', 92)
    const installerPath = await copySetupToInstallDir(installPath)
    if (targetVersion) {
      await writeRegistry({ installPath, version: targetVersion, installerPath })
      await writeState({ installPath, version: targetVersion, installerPath })
    }

    emit('Cleaning up...', 97)
    await fs.remove(tempDir).catch(() => {})

    emit('Update complete!', 100)

    const executablePath = findLauncherExecutable(installPath)
    if (launchAfter && executablePath) {
      setTimeout(() => {
        const { spawn } = require('child_process')
        spawn(executablePath, [], { detached: true, stdio: 'ignore' }).unref()
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

    emit('Restoring files...', 52)
    if (process.platform === 'win32') {
      await extractZip(assetPath, installPath, (pct) => {
        emit(`Extracting files... ${pct}%`, 52 + Math.round((pct / 100) * 45))
      })
    } else {
      // Linux: replace the AppImage
      if (fs.existsSync(installPath)) {
        const appImages = fs.readdirSync(installPath).filter(f => f.endsWith('.AppImage'))
        for (const img of appImages) await fs.remove(path.join(installPath, img)).catch(() => {})
      }
      await fs.ensureDir(installPath)
      const dest = path.join(installPath, release.launcher.name)
      await fs.copy(assetPath, dest, { overwrite: true })
      await execPromise(`chmod +x "${dest}"`).catch(() => {})
    }

    emit('Cleaning up...', 97)
    await fs.remove(tempDir).catch(() => {})

    // Update state version
    await writeState({ installPath, version: release.version, installerPath: process.env.PORTABLE_EXECUTABLE_FILE || process.execPath })

    emit('Repair complete!', 100)
    return { success: true, version: release.version }
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
