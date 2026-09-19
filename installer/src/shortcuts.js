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
  const ps = `
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut('${shortcutPath}')
$Shortcut.TargetPath = '${targetPath}'
$Shortcut.WorkingDirectory = '${workingDir}'
$Shortcut.Description = '${description}'
$Shortcut.IconLocation = '${iconPath}'
$Shortcut.Save()
`.trim()

  await execPromise(`powershell -NoProfile -NonInteractive -Command "${ps.replace(/\n/g, '; ')}"`)
}

async function removeWindowsShortcut(shortcutPath) {
  await fs.remove(shortcutPath).catch(() => {})
}

// ── Linux .desktop file ───────────────────────────────────────────────────────

async function createLinuxDesktopEntry({ execPath, name, comment, iconPath, categories }) {
  const desktopDir = path.join(os.homedir(), '.local', 'share', 'applications')
  await fs.ensureDir(desktopDir)

  const desktopFile = path.join(desktopDir, 'helloworld-launcher.desktop')
  const content = [
    '[Desktop Entry]',
    `Name=${name}`,
    `Comment=${comment}`,
    `Exec="${execPath}" --no-sandbox %U`,
    'Terminal=false',
    'Type=Application',
    `Categories=${categories}`,
    `Icon=${iconPath}`,
    'StartupWMClass=HelloWorld-Launcher',
    'StartupNotify=true',
  ].join('\n') + '\n'

  await fs.writeFile(desktopFile, content, 'utf8')
  await execPromise(`chmod +x "${desktopFile}"`).catch(() => {})

  // Refresh desktop database if available
  await execPromise('update-desktop-database ~/.local/share/applications').catch(() => {})
}

async function removeLinuxDesktopEntry() {
  const desktopFile = path.join(os.homedir(), '.local', 'share', 'applications', 'helloworld-launcher.desktop')
  await fs.remove(desktopFile).catch(() => {})
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
    // On Linux, createDesktop = create .desktop file (shows in app menu + desktop)
    if (createDesktop || createStartMenu) {
      const icon = iconPath || path.join(installPath, 'icon.png')
      await createLinuxDesktopEntry({
        execPath: executablePath,
        name: 'HelloWorld Launcher',
        comment: 'Play Minecraft for free',
        iconPath: icon,
        categories: 'Game;',
      }).catch(() => {})
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
