/**
 * installer/src/paths.js
 * Manages installation path detection, state persistence, and registry operations.
 */

const path = require('path')
const os = require('os')
const { exec } = require('child_process')
const fs = require('fs-extra')

const APP_NAME = 'HelloWorld-Launcher'
const DISPLAY_NAME = 'HelloWorld Launcher'
const STATE_FILE = 'installer-state.json'

// ── Helpers ──────────────────────────────────────────────────────────────────

function execPromise(cmd, opts = {}) {
  return new Promise((resolve, reject) => {
    exec(cmd, { windowsHide: true, ...opts }, (err, stdout, stderr) => {
      if (err) reject(err)
      else resolve({ stdout, stderr })
    })
  })
}

// ── State file (cross-platform) ───────────────────────────────────────────────

function getStateFilePath() {
  const configDir = process.platform === 'win32'
    ? path.join(process.env.APPDATA || os.homedir(), APP_NAME)
    : path.join(os.homedir(), '.config', APP_NAME)
  return path.join(configDir, STATE_FILE)
}

async function readState() {
  const statePath = getStateFilePath()
  try {
    if (await fs.pathExists(statePath)) {
      return await fs.readJson(statePath)
    }
  } catch { /* corrupt state — return null */ }
  return null
}

async function writeState(data) {
  const statePath = getStateFilePath()
  await fs.ensureDir(path.dirname(statePath))
  await fs.writeJson(statePath, { ...data, updatedAt: new Date().toISOString() }, { spaces: 2 })
}

async function removeState() {
  const statePath = getStateFilePath()
  await fs.remove(statePath).catch(() => {})
}

// ── Default paths ─────────────────────────────────────────────────────────────

function getDefaultInstallPath() {
  if (process.platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA || os.homedir(), APP_NAME)
  }
  return path.join(os.homedir(), '.local', 'share', APP_NAME)
}

function getUserDataPath() {
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || os.homedir(), APP_NAME)
  }
  return path.join(os.homedir(), '.config', APP_NAME)
}

// ── Install path detection (registry → state file → default) ─────────────────

async function detectInstallPath() {
  // 1. Windows registry
  if (process.platform === 'win32') {
    try {
      const { stdout } = await execPromise(
        `reg query "HKCU\\Software\\${APP_NAME}" /v InstallPath`
      )
      const match = stdout.match(/InstallPath\s+REG_SZ\s+(.+)/)
      if (match) {
        const regPath = match[1].trim()
        if (await fs.pathExists(regPath)) return regPath
      }
    } catch { /* registry key not found */ }
  }

  // 2. State file
  const state = await readState()
  if (state?.installPath && await fs.pathExists(state.installPath)) {
    return state.installPath
  }

  // 3. Default
  return getDefaultInstallPath()
}

async function getInstalledVersion() {
  const state = await readState()
  return state?.version || null
}

/**
 * Checks whether the launcher is actually installed by verifying:
 *  1. A launcher executable exists at the recorded install path
 *  2. OR the Windows registry entry points to a valid path with an executable
 *
 * Detection logic explained:
 *  - Windows: looks for any .exe in the install dir that isn't unins* or setup*
 *  - Linux:   looks for any .AppImage that isn't setup*
 *
 * @returns {{ installed: boolean, installPath: string }}
 */
async function checkIsInstalled() {
  const isLauncherExe = (f) => {
    const lower = f.toLowerCase()
    if (process.platform === 'win32') return lower.endsWith('.exe') && !lower.includes('unins') && !lower.includes('setup')
    return lower.endsWith('.appimage') && !lower.includes('setup')
  }

  const hasExecutable = async (dir) => {
    try {
      const files = await fs.readdir(dir)
      return files.some(isLauncherExe)
    } catch { return false }
  }

  // Check state file first
  const state = await readState()
  if (state?.installPath && await fs.pathExists(state.installPath)) {
    if (await hasExecutable(state.installPath)) {
      return { installed: true, installPath: state.installPath }
    }
  }

  // Check Windows registry
  if (process.platform === 'win32') {
    try {
      const { stdout } = await execPromise(`reg query "HKCU\\Software\\${APP_NAME}" /v InstallPath`)
      const match = stdout.match(/InstallPath\s+REG_SZ\s+(.+)/)
      if (match) {
        const regPath = match[1].trim()
        if (await fs.pathExists(regPath) && await hasExecutable(regPath)) {
          return { installed: true, installPath: regPath }
        }
      }
    } catch { }
  }

  // Check default path
  const defaultPath = getDefaultInstallPath()
  if (await fs.pathExists(defaultPath) && await hasExecutable(defaultPath)) {
    return { installed: true, installPath: defaultPath }
  }

  return { installed: false, installPath: defaultPath }
}

// ── Write access check ────────────────────────────────────────────────────────

async function checkWriteAccess(targetPath) {
  try {
    await fs.ensureDir(targetPath)
    const testFile = path.join(targetPath, '.write-test')
    await fs.writeFile(testFile, '')
    await fs.remove(testFile)
    return true
  } catch {
    return false
  }
}

// ── Windows registry ──────────────────────────────────────────────────────────

async function writeRegistry({ installPath, version, installerPath }) {
  if (process.platform !== 'win32') return

  const cmds = [
    // App registry
    `reg add "HKCU\\Software\\${APP_NAME}" /v InstallPath /t REG_SZ /d "${installPath}" /f`,
    `reg add "HKCU\\Software\\${APP_NAME}" /v Version /t REG_SZ /d "${version}" /f`,
    `reg add "HKCU\\Software\\${APP_NAME}" /v InstallerPath /t REG_SZ /d "${installerPath}" /f`,
    // Add/Remove Programs entry
    `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${APP_NAME}" /v DisplayName /t REG_SZ /d "${DISPLAY_NAME}" /f`,
    `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${APP_NAME}" /v UninstallString /t REG_SZ /d "\\"${installerPath}\\" uninstall" /f`,
    `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${APP_NAME}" /v InstallLocation /t REG_SZ /d "${installPath}" /f`,
    `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${APP_NAME}" /v DisplayVersion /t REG_SZ /d "${version}" /f`,
    `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${APP_NAME}" /v Publisher /t REG_SZ /d "Abelosky" /f`,
    `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${APP_NAME}" /v URLInfoAbout /t REG_SZ /d "https://github.com/Abeloskyyy/HelloWorld-Launcher" /f`,
    `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${APP_NAME}" /v NoModify /t REG_DWORD /d 1 /f`,
    `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${APP_NAME}" /v NoRepair /t REG_DWORD /d 1 /f`,
  ]

  for (const cmd of cmds) {
    await execPromise(cmd).catch(() => {})
  }
}

async function removeRegistry() {
  if (process.platform !== 'win32') return
  await execPromise(`reg delete "HKCU\\Software\\${APP_NAME}" /f`).catch(() => {})
  await execPromise(`reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${APP_NAME}" /f`).catch(() => {})
}

module.exports = {
  APP_NAME,
  DISPLAY_NAME,
  getDefaultInstallPath,
  getUserDataPath,
  detectInstallPath,
  getInstalledVersion,
  checkIsInstalled,
  checkWriteAccess,
  readState,
  writeState,
  removeState,
  writeRegistry,
  removeRegistry,
}
