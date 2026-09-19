/**
 * installer/main.js
 * Main process for HelloWorld Launcher Setup.
 * Reads CLI arguments to determine mode, then renders the appropriate UI.
 */

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs-extra')
const os = require('os')
const { marked } = require('marked')

// ── CLI argument parsing ──────────────────────────────────────────────────────

const rawArgs = process.argv.slice(app.isPackaged ? 1 : 2)
const VALID_MODES = ['install', 'update', 'repair', 'uninstall']
let cliMode = VALID_MODES.find(m => rawArgs.includes(m)) || null

// Detect silent/update flags from electron-updater (/S) or CLI aliases
const isSilent = rawArgs.some(a => a === '/S' || a === '/s' || a.toLowerCase() === '--silent')
const isAutoUpdate = isSilent || rawArgs.some(a => a === '--updated' || a === '--update' || a === '-update')
if (!cliMode && isAutoUpdate) {
  cliMode = 'update'
}

const cliInstallPath = (() => {
  const a64 = rawArgs.find(a => a.startsWith('--install-path-b64='))
  if (a64) return Buffer.from(a64.slice('--install-path-b64='.length), 'base64').toString('utf-8')
  
  const a = rawArgs.find(a => a.startsWith('--install-path='))
  return a ? a.slice('--install-path='.length) : null
})()

// ── Modules ───────────────────────────────────────────────────────────────────

const { detectInstallPath, getDefaultInstallPath, checkWriteAccess, readState, checkIsInstalled } = require('./src/paths')
const { install, update, reinstall, uninstall } = require('./src/installer')
const { getLatestReleaseInfo } = require('./src/github')

// Disable ASAR globally so installer can read/write the launcher's app.asar as a raw binary file
process.noAsar = true

// ── Window ────────────────────────────────────────────────────────────────────

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 640,
    minWidth: 960,
    minHeight: 640,
    maxWidth: 960,
    maxHeight: 640,
    frame: false,
    resizable: false,
    transparent: false,
    backgroundColor: '#0d1117',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
    icon: path.join(__dirname, 'build', 'icon.png'),
  })

  mainWindow.loadFile(path.join(__dirname, 'ui', 'index.html'))

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainWindow.focus()
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

// ── Sidebar images ────────────────────────────────────────────────────────────

function getSidebarImages() {
  // In production, extraResources copies sidebar/ to process.resourcesPath/sidebar
  const prodDir = path.join(process.resourcesPath || '', 'sidebar')
  // In development, read from source
  const devDir = path.join(__dirname, 'ui', 'assets', 'sidebar')

  const dir = fs.pathExistsSync(prodDir) ? prodDir : devDir

  const supported = ['.jpg', '.jpeg', '.png', '.webp']
  try {
    const files = fs.readdirSync(dir).filter(f =>
      supported.includes(path.extname(f).toLowerCase())
    )
    return files.map(f => {
      const data = fs.readFileSync(path.join(dir, f))
      const ext = path.extname(f).toLowerCase().slice(1).replace('jpg', 'jpeg')
      return `data:image/${ext};base64,${data.toString('base64')}`
    })
  } catch {
    return []
  }
}

// ── IPC handlers ──────────────────────────────────────────────────────────────

// Window controls
ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:close', () => mainWindow?.close())

// Startup info
ipcMain.handle('get-startup-info', async () => {
  const state = await readState()
  const { installed, installPath } = await checkIsInstalled()
  const detectedPath = cliInstallPath || installPath || await detectInstallPath()
  
  let releaseInfo = null
  try { releaseInfo = await getLatestReleaseInfo() } catch { }

  return {
    mode: cliMode,               // null = show menu
    isInstalled: installed,
    installPath: detectedPath,
    defaultInstallPath: getDefaultInstallPath(),
    currentVersion: state?.version || null,
    latestVersion: releaseInfo?.version || null,
    releaseNotes: releaseInfo?.releaseNotes ? marked.parse(releaseInfo.releaseNotes) : '',
    sidebarImages: getSidebarImages(),
    isElevated: rawArgs.includes('--elevated'),
    isSilent: isSilent,
    locale: app.getLocale(),
  }
})

// Directory picker
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Choose installation folder',
  })
  if (result.canceled || !result.filePaths[0]) return null
  return result.filePaths[0]
})

// Write access check
ipcMain.handle('check-write-access', async (_, targetPath) => {
  return checkWriteAccess(targetPath)
})

// Main operation: install / update / repair / uninstall
ipcMain.handle('run-operation', async (event, { operation, options }) => {
  const send = (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('operation-progress', data)
    }
  }

  try {
    let result
    const onProgress = ({ msg, percent }) => send({ msg, percent })

    switch (operation) {
      case 'install':
        result = await install(options, onProgress)
        break
      case 'update':
        result = await update(options, onProgress)
        break
      case 'reinstall':
        result = await reinstall(options, onProgress)
        break
      case 'uninstall':
        result = await uninstall(options, onProgress)
        break
      default:
        throw new Error(`Unknown operation: ${operation}`)
    }

    send({ msg: null, percent: 100, done: true, result })
    return result
  } catch (err) {
    send({ msg: null, percent: 0, done: true, error: err.message })
    throw err
  }
})

// Open folder in explorer/finder
ipcMain.handle('open-folder', async (_, folderPath) => {
  if (folderPath && await fs.pathExists(folderPath)) {
    shell.openPath(folderPath)
  }
})

// Request admin elevation on Windows (re-launch with runas)
ipcMain.handle('relaunch-elevated', async (_, { mode, installPath }) => {
  if (process.platform !== 'win32') return false
  const { exec } = require('child_process')
  const b64Path = Buffer.from(installPath).toString('base64')
  const argsArray = [mode, `--install-path-b64=${b64Path}`, '--elevated']
  if (!app.isPackaged) {
    argsArray.unshift(`"${app.getAppPath()}"`)
  }
  
  const exeToRun = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath
  const args = argsArray.join(' ')
  const cmd = `powershell -Command "Start-Process '${exeToRun}' -ArgumentList '${args}' -Verb RunAs"`
  exec(cmd, { windowsHide: true }, () => {})
  setTimeout(() => app.quit(), 500)
  return true
})

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => { if (!mainWindow) createWindow() })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}
