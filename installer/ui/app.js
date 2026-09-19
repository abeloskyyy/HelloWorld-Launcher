/* ══════════════════════════════════════════════════════════════════════════════
   installer/ui/app.js — Renderer process logic
══════════════════════════════════════════════════════════════════════════════ */

/* ── State ─────────────────────────────────────────────────────────────────── */
const State = {
  mode: null,
  installPath: '',
  defaultInstallPath: '',
  currentVersion: null,
  latestVersion: null,
  releaseNotes: '',
  sidebarImages: [],
  currentOp: null,    // 'install' | 'update' | 'repair' | 'uninstall'
  lastInstallPath: '',
  progressUnsubscribe: null,
}

/* ── Page router ───────────────────────────────────────────────────────────── */
let currentPageId = 'page-loading'

function showPage(id, direction = 'forward') {
  const current = document.getElementById(currentPageId)
  const next = document.getElementById(id)
  if (!next || current === next) return

  current.classList.add('exit')
  current.classList.remove('active')

  next.style.transform = direction === 'forward' ? 'translateX(18px)' : 'translateX(-18px)'
  next.style.opacity = '0'
  next.classList.add('active')

  // Force reflow
  next.offsetHeight // eslint-disable-line

  next.style.transform = ''
  next.style.opacity = ''

  setTimeout(() => {
    current.classList.remove('exit')
    current.style.transform = ''
    current.style.opacity = ''
  }, 250)

  currentPageId = id
}

/* ── Slideshow ─────────────────────────────────────────────────────────────── */
let slideIndex = 0
let slideInterval = null

function initSlideshow(images) {
  const container = document.getElementById('slideshow')
  const dotsContainer = document.getElementById('slide-dots')

  if (!images || images.length === 0) {
    container.innerHTML = '<div class="sidebar-no-image"></div>'
    return
  }

  images.forEach((src, i) => {
    const slide = document.createElement('div')
    // Alternate animation direction per slide
    const dirClass = i % 2 === 0 ? 'slide-a' : 'slide-b'
    slide.className = `slide ${dirClass}${i === 0 ? ' active' : ''}`
    slide.style.backgroundImage = `url('${src}')`
    container.appendChild(slide)

    const dot = document.createElement('div')
    dot.className = 'dot' + (i === 0 ? ' active' : '')
    dot.addEventListener('click', () => goToSlide(i))
    dotsContainer.appendChild(dot)
  })

  if (images.length > 1) {
    slideInterval = setInterval(nextSlide, 6000)
  }
}

function goToSlide(index) {
  const slides = document.querySelectorAll('.slide')
  const dots = document.querySelectorAll('.dot')
  if (!slides.length) return

  slides[slideIndex].classList.remove('active')
  dots[slideIndex]?.classList.remove('active')

  slideIndex = (index + slides.length) % slides.length

  const newSlide = slides[slideIndex]
  newSlide.classList.add('active')
  dots[slideIndex]?.classList.add('active')

  // Restart the Ken Burns animation so each new slide always starts from the beginning
  newSlide.style.animation = 'none'
  newSlide.offsetHeight // force reflow
  newSlide.style.animation = ''
}

function nextSlide() {
  goToSlide(slideIndex + 1)
}

/* ── Linux label adaptation ────────────────────────────────────────────────── */
function adaptForPlatform() {
  // On Linux, "Start Menu shortcut" becomes "Application menu entry"
  const labelStartMenu = document.getElementById('label-startmenu')
  if (labelStartMenu && navigator.platform.includes('Linux')) {
    labelStartMenu.textContent = window.I18n.t('install.opt_startmenu_linux')
  }
}

/* ── Path helpers ──────────────────────────────────────────────────────────── */
async function checkPath(inputEl, warningEl) {
  const p = inputEl.value.trim()
  if (!p) return
  const ok = await window.setup.checkWriteAccess(p)
  if (warningEl) {
    warningEl.classList.toggle('hidden', ok)
  }
  return ok
}

/* ── Log output ────────────────────────────────────────────────────────────── */
function appendLog(msg, type = 'info') {
  const out = document.getElementById('log-output')
  if (!out) return
  const line = document.createElement('div')
  line.className = 'log-line'

  const icon = document.createElement('span')
  icon.className = `log-icon-${type}`
  icon.textContent = type === 'ok' ? '✓' : type === 'err' ? '✗' : '→'

  const text = document.createElement('span')
  text.className = 'log-text'
  text.textContent = msg

  line.appendChild(icon)
  line.appendChild(text)
  out.appendChild(line)
  out.scrollTop = out.scrollHeight
}

/* ── Progress page ─────────────────────────────────────────────────────────── */
function showProgress(title) {
  document.getElementById('progress-title').textContent = title
  document.getElementById('progress-subtitle').textContent = ''
  document.getElementById('progress-fill').style.width = '0%'
  document.getElementById('progress-pct').textContent = '0%'
  document.getElementById('progress-msg').textContent = 'Initializing...'
  document.getElementById('log-output').innerHTML = ''
  showPage('page-progress')
}

let lastLogMsg = ''
function updateProgress({ msg, percent, done, result, error }) {
  if (msg) {
    document.getElementById('progress-msg').textContent = msg
    
    // Remove dynamic progress numbers (like percentages or MB) for the log
    const baseMsg = msg.replace(/\s[\d.%]+$/, '').replace(/\s[\d.]+\s[KMGT]?B\s\/\s.*/, '').trim()
    if (baseMsg && baseMsg !== lastLogMsg) {
      appendLog(baseMsg, error ? 'err' : 'info')
      lastLogMsg = baseMsg
    }
  }
  if (typeof percent === 'number') {
    document.getElementById('progress-fill').style.width = `${percent}%`
    document.getElementById('progress-pct').textContent = `${percent}%`
  }
  if (done) {
    if (State.progressUnsubscribe) {
      State.progressUnsubscribe()
      State.progressUnsubscribe = null
    }
    if (error) {
      showComplete(false, error, null)
    } else {
      showComplete(true, null, result)
    }
  }
}

/* ── Complete page ─────────────────────────────────────────────────────────── */
function showComplete(success, errorMsg, result) {
  const icon = document.getElementById('complete-icon')
  const title = document.getElementById('complete-title')
  const msg = document.getElementById('complete-msg')
  const ver = document.getElementById('complete-version')
  const openFolderBtn = document.getElementById('btn-open-folder')

  icon.className = `complete-icon ${success ? 'success' : 'error'}`
  icon.innerHTML = success
    ? '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
    : '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'

  const opLabels = {
    install: [window.I18n.t('complete.title.install'), window.I18n.t('complete.msg.install')],
    update:  [window.I18n.t('complete.title.update'), window.I18n.t('complete.msg.update')],
    reinstall: [window.I18n.t('complete.title.reinstall'), window.I18n.t('complete.msg.reinstall')],
    uninstall: [window.I18n.t('complete.title.uninstall'), window.I18n.t('complete.msg.uninstall')],
  }

  if (success) {
    const [t, m] = opLabels[State.currentOp] || ['Done!', 'Operation completed.']
    title.textContent = t
    msg.textContent = m
    ver.textContent = result?.version ? `Version ${result.version}` : ''
    if (State.currentOp !== 'uninstall' && State.lastInstallPath) {
      openFolderBtn.style.display = 'inline-flex'
    } else {
      openFolderBtn.style.display = 'none'
    }
  } else {
    title.textContent = 'Something went wrong'
    msg.textContent = errorMsg || 'An unexpected error occurred. Please try again.'
    ver.textContent = ''
    openFolderBtn.style.display = 'none'
  }

  showPage('page-complete')
}

/* ══════════════════════════════════════════════════════════════════════════════
   App — Public navigation & actions
══════════════════════════════════════════════════════════════════════════════ */
const App = {

  /* Navigation */
  toggleLangMenu(e) {
    if (e) e.stopPropagation();
    document.getElementById('lang-select-container').classList.toggle('open');
  },

  goWelcome() { showPage('page-welcome', 'back') },

  toggleAdvanced() {
    const modesDiv = document.getElementById('advanced-modes')
    const chevron = document.getElementById('advanced-chevron')
    const isOpen = modesDiv.style.display === 'flex'
    modesDiv.style.display = isOpen ? 'none' : 'flex'
    chevron.style.transform = isOpen ? '' : 'rotate(180deg)'
  },

  goInstall() {
    document.getElementById('install-path-input').value = State.installPath || State.defaultInstallPath
    document.getElementById('path-warning').classList.add('hidden')
    showPage('page-install')
  },

  goUpdate() {
    document.getElementById('update-path-input').value = State.installPath || State.defaultInstallPath
    if (State.currentVersion && State.latestVersion) {
      document.getElementById('update-subtitle').textContent =
        `v${State.currentVersion}  →  v${State.latestVersion}`
    }
    if (State.releaseNotes) {
      const el = document.getElementById('update-notes')
      el.innerHTML = State.releaseNotes
      el.classList.add('visible')
    }
    showPage('page-update')
  },

  goReinstall() {
    document.getElementById('repair-path-input').value = State.installPath || State.defaultInstallPath
    document.getElementById('repair-path-warning')?.classList.add('hidden')
    showPage('page-repair')
  },

  goUninstall() {
    document.getElementById('uninstall-path-input').value = State.installPath || State.defaultInstallPath
    showPage('page-uninstall')
  },

  /* Directory pickers */
  async browseInstallPath() {
    const p = await window.setup.selectDirectory()
    if (p) {
      document.getElementById('install-path-input').value = p
      checkPath(
        document.getElementById('install-path-input'),
        document.getElementById('path-warning')
      )
    }
  },

  async browseUpdatePath() {
    const p = await window.setup.selectDirectory()
    if (p) document.getElementById('update-path-input').value = p
  },

  async browseRepairPath() {
    const p = await window.setup.selectDirectory()
    if (p) document.getElementById('repair-path-input').value = p
  },

  async browseUninstallPath() {
    const p = await window.setup.selectDirectory()
    if (p) document.getElementById('uninstall-path-input').value = p
  },

  /* Operations */
  async startInstall() {
    const installPath = document.getElementById('install-path-input').value.trim()
    if (!installPath) return

    const hasAccess = await window.setup.checkWriteAccess(installPath)
    if (!hasAccess) {
      const elevated = await window.setup.relaunchElevated('install', installPath)
      if (elevated) return
    }

    State.currentOp = 'install'
    State.lastInstallPath = installPath
    showProgress(window.I18n.t('progress.installing'))

    State.progressUnsubscribe = window.setup.onProgress(updateProgress)

    try {
      await window.setup.runOperation('install', {
        installPath,
        createDesktop: document.getElementById('opt-desktop').checked,
        createStartMenu: document.getElementById('opt-startmenu').checked,
        launchAfter: document.getElementById('opt-launch').checked,
      })
    } catch (err) {
      updateProgress({ done: true, error: err.message, percent: 0 })
    }
  },

  async startUpdate() {
    const installPath = document.getElementById('update-path-input').value.trim()
    if (!installPath) return

    State.currentOp = 'update'
    State.lastInstallPath = installPath
    showProgress(window.I18n.t('progress.updating'))

    State.progressUnsubscribe = window.setup.onProgress(updateProgress)

    try {
      await window.setup.runOperation('update', {
        installPath,
        launchAfter: document.getElementById('opt-launch-update').checked,
      })
    } catch (err) {
      updateProgress({ done: true, error: err.message, percent: 0 })
    }
  },

  async startReinstall() {
    const installPath = document.getElementById('repair-path-input').value.trim()
    const hasAccess = await window.setup.checkWriteAccess(installPath)
    if (!hasAccess) {
      const elevated = await window.setup.relaunchElevated('reinstall', installPath)
      if (elevated) return
    }

    State.currentOp = 'reinstall'
    showProgress(window.I18n.t('progress.repairing'))
    State.progressUnsubscribe = window.setup.onProgress(updateProgress)

    try {
      await window.setup.runOperation('reinstall', { installPath })
    } catch (err) {
      updateProgress({ error: err.message, done: true })
    }
  },

  async startUninstall() {
    State.currentOp = 'uninstall'
    State.lastInstallPath = ''
    showProgress(window.I18n.t('progress.uninstalling'))

    State.progressUnsubscribe = window.setup.onProgress(updateProgress)

    try {
      await window.setup.runOperation('uninstall', {
        installPath: document.getElementById('uninstall-path-input').value.trim(),
        removeUserData: document.getElementById('opt-userdata').checked,
      })
    } catch (err) {
      updateProgress({ done: true, error: err.message, percent: 0 })
    }
  },

  openInstallFolder() {
    if (State.lastInstallPath) window.setup.openFolder(State.lastInstallPath)
  },
}

/* ══════════════════════════════════════════════════════════════════════════════
   Init
══════════════════════════════════════════════════════════════════════════════ */
document.addEventListener('click', () => {
  const container = document.getElementById('lang-select-container')
  if (container) container.classList.remove('open')
})

;(async function init() {
  // Show loading page while fetching startup info
  showPage('page-loading')

  try {
    const info = await window.setup.getStartupInfo()
    window.I18n.init(info.locale)

    State.mode = info.mode
    State.installPath = info.installPath || info.defaultInstallPath
    State.defaultInstallPath = info.defaultInstallPath
    State.currentVersion = info.currentVersion
    State.latestVersion = info.latestVersion
    State.releaseNotes = info.releaseNotes

    // Init slideshow with images from main process
    initSlideshow(info.sidebarImages)

    // Adapt labels for platform
    adaptForPlatform()

    // Version info on welcome screen
    const verEl = document.getElementById('version-info')
    if (info.latestVersion) {
      verEl.textContent = `v${info.latestVersion}`
    }

    // ── Smart mode visibility based on installation status ────────────────────
    const installedModes  = document.getElementById('installed-modes')
    const advancedToggle  = document.getElementById('advanced-toggle')

    if (info.isInstalled) {
      // Launcher is installed → show Update, Repair, Uninstall prominently
      installedModes.style.display  = 'flex'
      advancedToggle.style.display  = 'none'
    } else {
      // Not installed → only Install is prominent; rest behind Advanced
      installedModes.style.display  = 'none'
      advancedToggle.style.display  = 'block'
    }

    // Navigate based on CLI mode
    if (info.mode === 'install')   { App.goInstall();   if (info.isElevated) setTimeout(() => App.startInstall(), 100);   return }
    if (info.mode === 'update')    { App.goUpdate();    if (info.isElevated || info.isSilent) setTimeout(() => App.startUpdate(), 200); return }
    if (info.mode === 'repair')    { App.goReinstall(); if (info.isElevated) setTimeout(() => App.startReinstall(), 100); return }
    if (info.mode === 'uninstall') { App.goUninstall(); if (info.isElevated) setTimeout(() => App.startUninstall(), 100); return }

    // No mode — show welcome menu
    showPage('page-welcome')

  } catch (err) {
    // Even if startup info fails, show welcome page
    console.error('Startup error:', err)
    initSlideshow([])
    showPage('page-welcome')
  }
})()
