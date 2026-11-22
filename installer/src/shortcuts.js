/**
 * installer/src/shortcuts.js
 * Creates and removes desktop / Start Menu shortcuts on Windows and Linux.
 */

const path = require('path')
const os = require('os')
const fs = require('fs-extra')
const { exec } = require('child_process')

function execPromise(cmd, opts = {}) {
  return new Promise((resolve, reject) => {
    exec(cmd, { windowsHide: true, ...opts }, (err, stdout, stderr) => {
      if (err) reject(err)
      else resolve({ stdout, stderr })
    })
  })
}

// ── Windows shortcuts via PowerShell WScript.Shell ────────────────────────────

async function createWindowsShortcut({ targetPath, shortcutPath, workingDir, description, iconPath }) {
  // Escape single quotes for PowerShell single-quoted literals: ' -> ''
  const escapePs = (str) => (str || '').replace(/'/g, "''")
  const sPath = escapePs(shortcutPath)
  const tPath = escapePs(targetPath)
  const wDir = escapePs(workingDir)
  const desc = escapePs(description)
  const iPath = escapePs(iconPath)

  const ps = `
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut('${sPath}')
$Shortcut.TargetPath = '${tPath}'
$Shortcut.WorkingDirectory = '${wDir}'
$Shortcut.Description = '${desc}'
$Shortcut.IconLocation = '${iPath}'
$Shortcut.Save()
`.trim()

  await execPromise(`powershell -NoProfile -NonInteractive -Command "${ps.replace(/\r?\n/g, '; ')}"`)
}

async function removeWindowsShortcut(shortcutPath) {
  await fs.remove(shortcutPath).catch(() => {})
}

// ── Linux .desktop file ───────────────────────────────────────────────────────

async function installLinuxHicolorIcons(iconSourcePath) {
  if (!iconSourcePath || !(await fs.pathExists(iconSourcePath))) return
  try {
    const buf = fs.readFileSync(iconSourcePath)
    if (!buf || !buf.length) return
    for (const size of ['256x256', '512x512']) {
      const dir = path.join(os.homedir(), '.local', 'share', 'icons', 'hicolor', size, 'apps')
      await fs.ensureDir(dir)
      await fs.writeFile(path.join(dir, 'helloworld-launcher.png'), buf)
    }
    await execPromise(`gtk-update-icon-cache -f -t "${path.join(os.homedir(), '.local', 'share', 'icons', 'hicolor')}"`).catch(() => {})
  } catch (_) {}
}

async function createLinuxDesktopEntry({ execPath, name, comment, iconPath, categories }) {
  const desktopDir = path.join(os.homedir(), '.local', 'share', 'applications')
  await fs.ensureDir(desktopDir)

  // Ensure iconPath is never an ELF executable on Linux
  const isImageIcon = iconPath && /\.(png|svg|xpm|ico)$/i.test(iconPath) && (await fs.pathExists(iconPath))
  if (isImageIcon) {
    await installLinuxHicolorIcons(iconPath)
  }
  const finalIcon = isImageIcon ? iconPath : 'helloworld-launcher'

  const desktopFile = path.join(desktopDir, 'helloworld-launcher.desktop')
  const content = [
    '[Desktop Entry]',
    `Name=${name}`,
    `Comment=${comment}`,
    `Exec="${execPath}" --no-sandbox %U`,
    'Terminal=false',
    'Type=Application',
    `Categories=${categories}`,
    `Icon=${finalIcon}`,
    'StartupWMClass=HelloWorld-Launcher',
    'StartupNotify=true',
  ].join('\n') + '\n'

  await fs.writeFile(desktopFile, content, 'utf8')
  await execPromise(`chmod +x "${desktopFile}"`).catch(() => {})

  // Refresh desktop database if available
  await execPromise('update-desktop-database ~/.local/share/applications').catch(() => {})
}

function getLinuxDesktopDirs() {
  const dirs = new Set([
    path.join(os.homedir(), 'Desktop'),
    path.join(os.homedir(), 'Escritorio'),
  ])
  try {
    const { execFileSync } = require('child_process')
    const xdgDesktop = execFileSync('xdg-user-dir', ['DESKTOP'], { encoding: 'utf8' }).trim()
    if (xdgDesktop && xdgDesktop !== os.homedir()) {
      dirs.add(xdgDesktop)
    }
  } catch (_) {}
  return Array.from(dirs).filter(d => fs.existsSync(d))
}

async function removeLinuxDesktopEntry() {
  const desktopFile = path.join(os.homedir(), '.local', 'share', 'applications', 'helloworld-launcher.desktop')
  await fs.remove(desktopFile).catch(() => {})
  const possibleDirs = new Set([
    path.join(os.homedir(), 'Desktop'),
    path.join(os.homedir(), 'Escritorio'),
    ...getLinuxDesktopDirs(),
  ])
  for (const dir of possibleDirs) {
    await fs.remove(path.join(dir, 'helloworld-launcher.desktop')).catch(() => {})
  }
  await execPromise('update-desktop-database ~/.local/share/applications').catch(() => {})
}

// ── Public API ────────────────────────────────────────────────────────────────

async function createShortcuts({ installPath, executablePath, createDesktop, createStartMenu, iconPath }) {
  if (process.platform === 'win32') {
    const iconLoc = iconPath || executablePath

    if (createDesktop) {
      const desktopLink = path.join(os.homedir(), 'Desktop', 'HelloWorld Launcher.lnk')
      await createWindowsShortcut({
        targetPath: executablePath,
        shortcutPath: desktopLink,
        workingDir: installPath,
        description: 'HelloWorld Launcher — Play Minecraft for free',
        iconPath: iconLoc,
      }).catch(() => {})
    }

    if (createStartMenu) {
      const startMenuDir = path.join(
        process.env.APPDATA || os.homedir(),
        'Microsoft', 'Windows', 'Start Menu', 'Programs'
      )
      const startMenuLink = path.join(startMenuDir, 'HelloWorld Launcher.lnk')
      await fs.ensureDir(startMenuDir)
      await createWindowsShortcut({
        targetPath: executablePath,
        shortcutPath: startMenuLink,
        workingDir: installPath,
        description: 'HelloWorld Launcher — Play Minecraft for free',
        iconPath: iconLoc,
      }).catch(() => {})
    }
  } else if (process.platform === 'linux') {
    const icon = iconPath || path.join(installPath, 'icon.png')
    // App menu launcher (.desktop)
    await createLinuxDesktopEntry({
      execPath: executablePath,
      name: 'HelloWorld Launcher',
      comment: 'Play Minecraft for free',
      iconPath: icon,
      categories: 'Game;ActionGame;AdventureGame;',
    }).catch(() => {})

    // Optional desktop icon on ~/Desktop, ~/Escritorio or XDG desktop dir
    if (createDesktop) {
      const srcDesktopFile = path.join(os.homedir(), '.local', 'share', 'applications', 'helloworld-launcher.desktop')
      if (await fs.pathExists(srcDesktopFile)) {
        for (const desktopDir of getLinuxDesktopDirs()) {
          const destDesktopFile = path.join(desktopDir, 'helloworld-launcher.desktop')
          await fs.copy(srcDesktopFile, destDesktopFile, { overwrite: true }).catch(() => {})
          await execPromise(`chmod +x "${destDesktopFile}"`).catch(() => {})
          await execPromise(`gio set "${destDesktopFile}" metadata::trusted true 2>/dev/null`).catch(() => {})
        }
      }
    }
  }
}

async function removeShortcuts() {
  if (process.platform === 'win32') {
    const desktopLink = path.join(os.homedir(), 'Desktop', 'HelloWorld Launcher.lnk')
    const startMenuLink = path.join(
      process.env.APPDATA || os.homedir(),
      'Microsoft', 'Windows', 'Start Menu', 'Programs', 'HelloWorld Launcher.lnk'
    )
    await removeWindowsShortcut(desktopLink)
    await removeWindowsShortcut(startMenuLink)
  } else if (process.platform === 'linux') {
    await removeLinuxDesktopEntry()
  }
}

module.exports = { createShortcuts, removeShortcuts }
