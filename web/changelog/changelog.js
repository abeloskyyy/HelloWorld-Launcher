// === Changelog Engine for HelloWorld Launcher ===

const REMOTE_CONFIG_GIST_URL = "https://gist.githubusercontent.com/abeloskyyy/b50089b634ed09f48c921f9c8126a49f/raw/hwlauncher-info.json";
const GITHUB_RELEASES_API = "https://api.github.com/repos/abeloskyyy/HelloWorld-Launcher/releases";

let allReleases = [];
let latestVersionStr = '';
let activeFilter = 'all';
let currentSearchTerm = '';
let tocLimit = 7;
const TOC_STEP = 7;

// Helper to translate or fallback
function t(key, fallback = '') {
    if (typeof window.t === 'function') {
        const val = window.t(key, fallback);
        if (val) return val;
    }
    return fallback || key;
}

// Current language code
function getLang() {
    if (typeof window.getCurrentLang === 'function') {
        return window.getCurrentLang() || 'en';
    }
    return localStorage.getItem('lang') || 'en';
}

// Escape HTML utility
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Format inline markdown (code, bold, italics, links)
function formatInlineMarkdown(text) {
    if (!text) return '';
    let escaped = escapeHtml(text);

    // Inline code `code`
    escaped = escaped.replace(/`([^`]+)`/g, '<code class="cl-code">$1</code>');

    // Bold **text** or __text__
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    escaped = escaped.replace(/__([^_]+)__/g, '<strong>$1</strong>');

    // Italics *text* or _text_
    escaped = escaped.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');

    // Links [text](url)
    escaped = escaped.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="cl-link">$1 <i class="bi bi-box-arrow-up-right" style="font-size: 0.72em;"></i></a>');

    return escaped;
}

// Parse markdown release notes into categorized sections
function parseReleaseSections(markdown) {
    if (!markdown || typeof markdown !== 'string') return [];
    const sections = [];
    let currentSection = { title: '', type: 'general', items: [], intro: '' };
    const lines = markdown.split(/\r?\n/);

    for (let line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (/^#\s+RELEASE/i.test(trimmed)) continue; // Skip title heading

        const hMatch = trimmed.match(/^#{2,3}\s+(.+)$/);
        if (hMatch) {
            if (currentSection.items.length > 0 || currentSection.intro) {
                sections.push(currentSection);
            }
            const rawTitle = hMatch[1].trim();
            let type = 'default';
            const lower = rawTitle.toLowerCase();
            if (lower.includes('add') || lower.includes('new') || lower.includes('añad') || lower.includes('ajout')) type = 'added';
            else if (lower.includes('change') || lower.includes('improv') || lower.includes('cambi') || lower.includes('modif')) type = 'changed';
            else if (lower.includes('fix') || lower.includes('bug') || lower.includes('correg') || lower.includes('résol')) type = 'fixed';
            else if (lower.includes('remove') || lower.includes('deprecat') || lower.includes('elimin')) type = 'removed';
            else if (lower.includes('security') || lower.includes('secur')) type = 'security';
            currentSection = { title: rawTitle, type, items: [], intro: '' };
            continue;
        }

        const itemMatch = trimmed.match(/^[-*+]\s+(.+)$/);
        if (itemMatch) {
            currentSection.items.push(itemMatch[1].trim());
        } else {
            if (currentSection.items.length === 0) {
                currentSection.intro = (currentSection.intro ? currentSection.intro + ' ' : '') + trimmed;
            } else {
                // Continuation of previous item
                const lastIdx = currentSection.items.length - 1;
                currentSection.items[lastIdx] += ' ' + trimmed;
            }
        }
    }

    if (currentSection.items.length > 0 || currentSection.intro) {
        sections.push(currentSection);
    }

    return sections;
}

// Format release date nicely
function formatReleaseDate(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00Z`);
        if (isNaN(d.getTime())) return dateStr;
        const lang = getLang();
        return d.toLocaleDateString(lang, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (_) {
        return dateStr;
    }
}

// Convert GitHub release asset list to download map
function extractDownloadsFromAssets(assets = []) {
    const isArm = (n) => /arm/i.test(n) || /aarch64/i.test(n);
    const downloads = { windows: {}, linux: {}, macos: {} };

    assets.forEach(a => {
        const name = (a.name || '').toLowerCase();
        const url = a.browser_download_url;
        if (!url || name.endsWith('.blockmap') || name.endsWith('.yml') || name.endsWith('.sha256')) return;

        if (name.endsWith('.exe')) {
            downloads.windows.setup = url;
        } else if (name.endsWith('.zip') && (name.includes('win') || name.includes('portable')) && !name.includes('mac')) {
            downloads.windows.zip = url;
        } else if (name.endsWith('.deb')) {
            if (isArm(name)) {
                if (!downloads.linux.arm64) downloads.linux.arm64 = {};
                downloads.linux.arm64.deb = url;
            } else {
                if (!downloads.linux.amd64) downloads.linux.amd64 = {};
                downloads.linux.amd64.deb = url;
            }
        } else if (name.endsWith('.appimage')) {
            if (isArm(name)) {
                if (!downloads.linux.arm64) downloads.linux.arm64 = {};
                downloads.linux.arm64.appimage = url;
            } else {
                if (!downloads.linux.amd64) downloads.linux.amd64 = {};
                downloads.linux.amd64.appimage = url;
            }
        } else if (name.endsWith('.dmg')) {
            if (isArm(name)) {
                if (!downloads.macos.arm64) downloads.macos.arm64 = {};
                downloads.macos.arm64.dmg = url;
            } else {
                if (!downloads.macos.amd64) downloads.macos.amd64 = {};
                downloads.macos.amd64.dmg = url;
            }
        } else if (name.endsWith('.zip') && name.includes('mac')) {
            if (isArm(name)) {
                if (!downloads.macos.arm64) downloads.macos.arm64 = {};
                downloads.macos.arm64.zip = url;
            } else {
                if (!downloads.macos.amd64) downloads.macos.amd64 = {};
                downloads.macos.amd64.zip = url;
            }
        }
    });

    return downloads;
}

// Show temporary toast message
function showToast(message) {
    let toast = document.getElementById('clToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'clToast';
        toast.className = 'cl-toast';
        document.body.appendChild(toast);
    }
    toast.innerHTML = `<i class="bi bi-check2-circle" style="font-size: 1.2rem;"></i> <span>${escapeHtml(message)}</span>`;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// Copy anchor link to clipboard
function copyAnchor(version) {
    const url = `${window.location.origin}${window.location.pathname}#v${version}`;
    navigator.clipboard.writeText(url).then(() => {
        showToast(t('changelog.link_copied', 'Link copied to clipboard!'));
    }).catch(() => {
        showToast(url);
    });
}

// Build download dropdown HTML for a release
function buildDownloadDropdown(downloads, version) {
    if (!downloads || Object.keys(downloads).length === 0) return '';
    const d = downloads;

    let hasAnyLink = false;
    let winHtml = '';
    let linuxHtml = '';
    let macHtml = '';

    // Windows
    if (d.windows) {
        let items = '';
        if (d.windows.setup) {
            items += `<a href="${d.windows.setup}" class="cl-dl-item" download><span class="cl-dl-badge">EXE</span> <span>Installer (.exe)</span> <i class="bi bi-download"></i></a>`;
            hasAnyLink = true;
        }
        if (d.windows.zip) {
            items += `<a href="${d.windows.zip}" class="cl-dl-item" download><span class="cl-dl-badge">ZIP</span> <span>Portable (.zip)</span> <i class="bi bi-download"></i></a>`;
            hasAnyLink = true;
        }
        if (items) {
            winHtml = `<div class="cl-dl-section"><div class="cl-dl-header"><i class="bi bi-windows"></i> Windows</div>${items}</div>`;
        }
    }

    // Linux
    if (d.linux) {
        let items = '';
        const amd = d.linux.amd64 || {};
        const arm = d.linux.arm64 || {};
        if (amd.deb) {
            items += `<a href="${amd.deb}" class="cl-dl-item" download><span class="cl-dl-badge">DEB</span> <span>Ubuntu/Debian (x64)</span> <i class="bi bi-download"></i></a>`;
            hasAnyLink = true;
        }
        if (amd.appimage) {
            items += `<a href="${amd.appimage}" class="cl-dl-item" download><span class="cl-dl-badge">AppImage</span> <span>Universal (x64)</span> <i class="bi bi-download"></i></a>`;
            hasAnyLink = true;
        }
        if (arm.deb) {
            items += `<a href="${arm.deb}" class="cl-dl-item" download><span class="cl-dl-badge">DEB</span> <span>Ubuntu/Debian (ARM64)</span> <i class="bi bi-download"></i></a>`;
            hasAnyLink = true;
        }
        if (arm.appimage) {
            items += `<a href="${arm.appimage}" class="cl-dl-item" download><span class="cl-dl-badge">AppImage</span> <span>Universal (ARM64)</span> <i class="bi bi-download"></i></a>`;
            hasAnyLink = true;
        }
        if (items) {
            linuxHtml = `<div class="cl-dl-section"><div class="cl-dl-header"><i class="fa-brands fa-linux"></i> Linux</div>${items}</div>`;
        }
    }

    // macOS
    const mac = d.macos || d.mac;
    if (mac) {
        let items = '';
        const arm = mac.arm64 || {};
        const amd = mac.amd64 || mac.x64 || {};
        if (arm.dmg) {
            items += `<a href="${arm.dmg}" class="cl-dl-item" download><span class="cl-dl-badge">DMG</span> <span>Apple Silicon (M1/M2/M3)</span> <i class="bi bi-download"></i></a>`;
            hasAnyLink = true;
        }
        if (amd.dmg) {
            items += `<a href="${amd.dmg}" class="cl-dl-item" download><span class="cl-dl-badge">DMG</span> <span>Intel Mac (.dmg)</span> <i class="bi bi-download"></i></a>`;
            hasAnyLink = true;
        }
        if (arm.zip) {
            items += `<a href="${arm.zip}" class="cl-dl-item" download><span class="cl-dl-badge">ZIP</span> <span>Apple Silicon (.zip)</span> <i class="bi bi-download"></i></a>`;
            hasAnyLink = true;
        }
        if (amd.zip) {
            items += `<a href="${amd.zip}" class="cl-dl-item" download><span class="cl-dl-badge">ZIP</span> <span>Intel Mac (.zip)</span> <i class="bi bi-download"></i></a>`;
            hasAnyLink = true;
        }
        if (items) {
            macHtml = `<div class="cl-dl-section"><div class="cl-dl-header"><i class="bi bi-apple"></i> macOS</div>${items}</div>`;
        }
    }

    if (!hasAnyLink) return '';

    return `
        <div class="cl-dropdown-wrapper">
            <button class="cl-btn-download" data-dropdown-id="cl-dl-${escapeHtml(version)}" title="${t('changelog.download_options', 'Download Options')}">
                <i class="bi bi-download"></i>
                <span>${t('changelog.downloads', 'Download')}</span>
                <i class="bi bi-chevron-down cl-btn-chevron"></i>
            </button>
            <div class="cl-dropdown-menu" id="cl-dl-${escapeHtml(version)}">
                ${winHtml}
                ${linuxHtml}
                ${macHtml}
            </div>
        </div>
    `;
}

// Render release card HTML
function renderReleaseCard(rel, index) {
    const isLatest = rel.version === latestVersionStr || index === 0;
    const isMandatory = Boolean(rel.forceUpdate);
    const dateFormatted = formatReleaseDate(rel.releaseDate);
    const sections = parseReleaseSections(rel.markdown);
    const downloadDropdownHtml = buildDownloadDropdown(rel.downloads, rel.version);

    // Section badges configuration
    const badgeConfigs = {
        added: { label: t('changelog.filter_added', 'Added'), icon: 'bi bi-plus-circle-fill', badgeClass: 'cl-badge-added', bulletClass: 'cl-bullet-added' },
        changed: { label: t('changelog.filter_changed', 'Changed'), icon: 'bi bi-arrow-repeat', badgeClass: 'cl-badge-changed', bulletClass: 'cl-bullet-changed' },
        fixed: { label: t('changelog.filter_fixed', 'Fixed'), icon: 'bi bi-tools', badgeClass: 'cl-badge-fixed', bulletClass: 'cl-bullet-fixed' },
        removed: { label: t('changelog.filter_removed', 'Removed'), icon: 'bi bi-dash-circle-fill', badgeClass: 'cl-badge-removed', bulletClass: 'cl-bullet-removed' },
        security: { label: t('changelog.filter_security', 'Security'), icon: 'bi bi-shield-lock-fill', badgeClass: 'cl-badge-changed', bulletClass: 'cl-bullet-changed' },
        default: { label: t('changelog.filter_general', 'General'), icon: 'bi bi-tag-fill', badgeClass: 'cl-badge-default', bulletClass: 'cl-bullet-default' }
    };

    let contentHtml = '';
    for (const sec of sections) {
        if (sec.intro) {
            contentHtml += `<p class="cl-intro-text">${formatInlineMarkdown(sec.intro)}</p>`;
        }
        if (sec.items.length > 0) {
            const cfg = badgeConfigs[sec.type] || badgeConfigs.default;
            const titleLabel = sec.title ? escapeHtml(sec.title) : cfg.label;
            const itemsHtml = sec.items.map(item => `
                <li class="cl-item">
                    <span class="cl-item-bullet ${cfg.bulletClass}"></span>
                    <div class="cl-item-text">${formatInlineMarkdown(item)}</div>
                </li>
            `).join('');

            contentHtml += `
                <div class="cl-section" data-section-type="${sec.type}">
                    <div class="cl-section-badge ${cfg.badgeClass}">
                        <i class="${cfg.icon}"></i>
                        <span>${titleLabel}</span>
                    </div>
                    <ul class="cl-list">
                        ${itemsHtml}
                    </ul>
                </div>
            `;
        }
    }

    if (!contentHtml) {
        contentHtml = `<p class="cl-intro-text" style="color: var(--text-muted); font-style: italic;">${t('changelog.no_notes', 'No specific release notes available.')}</p>`;
    }

    const releaseUrl = rel.releaseUrl || `https://github.com/abeloskyyy/HelloWorld-Launcher/releases/tag/v${rel.version}`;

    return `
        <article class="cl-card" id="v${escapeHtml(rel.version)}" data-version="${escapeHtml(rel.version)}" data-release-date="${escapeHtml(rel.releaseDate || '')}">
            <div class="cl-card-header">
                <div class="cl-card-header-left">
                    <div class="cl-card-version-row">
                        <h2 class="cl-version-title">v${escapeHtml(rel.version)}</h2>
                        ${isLatest ? `<span class="cl-badge-latest"><span class="cl-pulse-dot"></span> <span>${t('changelog.latest_badge', 'Latest Release')}</span></span>` : ''}
                        ${isMandatory ? `<span class="cl-badge-mandatory"><i class="fas fa-shield-alt"></i> <span>${t('changelog.mandatory_badge', 'Mandatory')}</span></span>` : ''}
                    </div>
                    ${dateFormatted ? `<time class="cl-card-date" datetime="${escapeHtml(rel.releaseDate)}"><i class="bi bi-calendar3"></i> ${escapeHtml(dateFormatted)}</time>` : ''}
                </div>
                <div class="cl-card-actions">
                    ${downloadDropdownHtml}
                    <a href="${escapeHtml(releaseUrl)}" target="_blank" rel="noopener noreferrer" class="cl-btn-secondary" title="${t('changelog.github_release', 'GitHub Release')}">
                        <i class="bi bi-github"></i>
                        <span class="btn-text">GitHub</span>
                        <i class="bi bi-box-arrow-up-right cl-ext-icon"></i>
                    </a>
                    <button type="button" class="cl-btn-icon cl-copy-btn" data-anchor="${escapeHtml(rel.version)}" title="${t('changelog.copy_link', 'Copy Link')}">
                        <i class="bi bi-link-45deg"></i>
                    </button>
                </div>
            </div>
            <div class="cl-card-body">
                ${contentHtml}
            </div>
        </article>
    `;
}

// Render table of contents in sidebar with progressive pagination
function renderToc(releases) {
    const tocNav = document.getElementById('clTocNav');
    if (!tocNav) return;

    if (!releases || releases.length === 0) {
        tocNav.innerHTML = `<span style="font-size: 0.85rem; color: var(--text-muted); padding: 8px;">${t('changelog.no_versions', 'No versions')}</span>`;
        return;
    }

    const visibleReleases = releases.slice(0, tocLimit);
    const hasMore = releases.length > tocLimit;

    let itemsHtml = visibleReleases.map((r, i) => {
        const isLatest = r.version === latestVersionStr || i === 0;
        const date = formatReleaseDate(r.releaseDate);
        return `
            <a href="#v${escapeHtml(r.version)}" class="cl-toc-item ${i === 0 ? 'active' : ''}" data-toc-version="${escapeHtml(r.version)}">
                <span class="cl-toc-ver">v${escapeHtml(r.version)}</span>
                ${isLatest ? `<span class="cl-toc-badge">${t('changelog.latest_badge', 'Latest')}</span>` : `<span style="font-size: 0.75rem; opacity: 0.6;">${escapeHtml(date)}</span>`}
            </a>
        `;
    }).join('');

    if (hasMore) {
        itemsHtml += `
            <button type="button" class="cl-toc-more-btn" id="clTocMoreBtn" title="${t('changelog.show_more', 'Show More')}">
                <i class="bi bi-chevron-down"></i>
                <span>${t('changelog.show_more', 'Show More')}</span>
                <span class="cl-toc-count">(${Math.min(tocLimit, releases.length)}/${releases.length})</span>
            </button>
        `;
    }

    tocNav.innerHTML = itemsHtml;

    // Attach click handler for "Show more" button
    const moreBtn = document.getElementById('clTocMoreBtn');
    if (moreBtn) {
        moreBtn.addEventListener('click', (e) => {
            e.preventDefault();
            tocLimit += TOC_STEP;
            renderToc(releases);
        });
    }

    // Smooth scroll for TOC links
    tocNav.querySelectorAll('.cl-toc-item').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                history.replaceState(null, '', `#${targetId}`);
            }
        });
    });
}

// Setup scrollspy observer for TOC active link
let tocObserver = null;
function setupScrollspy() {
    if (tocObserver) tocObserver.disconnect();
    const cards = document.querySelectorAll('.cl-card');
    if (!cards.length) return;

    tocObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id.replace(/^v/, '');
                // Auto-expand TOC if user scrolled to a release beyond current tocLimit
                const foundIndex = allReleases.findIndex(r => r.version === id);
                if (foundIndex >= tocLimit) {
                    tocLimit = Math.ceil((foundIndex + 1) / TOC_STEP) * TOC_STEP;
                    renderToc(allReleases);
                }
                document.querySelectorAll('.cl-toc-item').forEach(item => {
                    item.classList.toggle('active', item.dataset.tocVersion === id);
                });
            }
        });
    }, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });

    cards.forEach(card => tocObserver.observe(card));
}

// Filter and search releases feed
function filterReleases() {
    const feedContainer = document.getElementById('clFeedContainer');
    const emptyState = document.getElementById('clEmptyState');
    if (!feedContainer) return;

    const term = currentSearchTerm.toLowerCase().trim();
    let visibleCount = 0;

    const cards = feedContainer.querySelectorAll('.cl-card');
    cards.forEach(card => {
        let matchesSearch = true;
        let matchesFilter = true;

        if (term) {
            const cardText = card.textContent.toLowerCase();
            matchesSearch = cardText.includes(term);
        }

        if (activeFilter !== 'all') {
            const matchingSections = card.querySelectorAll(`.cl-section[data-section-type="${activeFilter}"]`);
            matchesFilter = matchingSections.length > 0;
        }

        if (matchesSearch && matchesFilter) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    if (emptyState) {
        emptyState.style.display = (visibleCount === 0) ? 'block' : 'none';
    }
}

// Fetch and load changelog data
async function loadChangelog() {
    const loadingState = document.getElementById('clLoadingState');
    const errorState = document.getElementById('clErrorState');
    const feedContainer = document.getElementById('clFeedContainer');

    if (loadingState) loadingState.style.display = 'block';
    if (errorState) errorState.style.display = 'none';
    if (feedContainer) feedContainer.innerHTML = '';

    try {
        let loadedVersions = [];

        // 1. Fetch from Gist with cache busting
        try {
            const gistRes = await fetch(`${REMOTE_CONFIG_GIST_URL}?t=${Date.now()}`, { cache: 'no-cache' });
            if (gistRes.ok) {
                const data = await gistRes.json();
                if (data && data.changelog) {
                    latestVersionStr = data.changelog.latestVersion || '';
                    if (Array.isArray(data.changelog.versions)) {
                        loadedVersions = data.changelog.versions;
                    }
                }
            }
        } catch (gistErr) {
            console.warn('[Changelog] Gist fetch failed, attempting GitHub fallback:', gistErr);
        }

        // 2. Fallback to GitHub Releases API if Gist had no versions
        if (loadedVersions.length === 0) {
            const ghRes = await fetch(GITHUB_RELEASES_API, { cache: 'no-cache' });
            if (!ghRes.ok) throw new Error(`GitHub API error: ${ghRes.status}`);
            const ghData = await ghRes.json();
            if (Array.isArray(ghData)) {
                loadedVersions = ghData.map(r => ({
                    version: (r.tag_name || '').replace(/^v/, ''),
                    tag: r.tag_name,
                    releaseDate: (r.published_at || '').split('T')[0],
                    releaseUrl: r.html_url,
                    markdown: r.body || '',
                    downloads: extractDownloadsFromAssets(r.assets || [])
                }));
                if (loadedVersions[0]) {
                    latestVersionStr = loadedVersions[0].version;
                }
            }
        }

        if (loadedVersions.length === 0) {
            throw new Error('No release records available.');
        }

        allReleases = loadedVersions;
        if (!latestVersionStr && allReleases[0]) {
            latestVersionStr = allReleases[0].version;
        }

        // Render feed
        if (feedContainer) {
            feedContainer.innerHTML = allReleases.map((r, i) => renderReleaseCard(r, i)).join('');
        }

        // Render TOC
        renderToc(allReleases);

        // Setup Scrollspy
        setupScrollspy();

        // Wire up interactive card buttons
        attachCardEventListeners();

        if (loadingState) loadingState.style.display = 'none';

        // Check if there's a hash in URL to jump to
        if (window.location.hash) {
            const rawHash = window.location.hash.substring(1);
            const versionId = rawHash.replace(/^v/, '');
            const foundIdx = allReleases.findIndex(r => r.version === versionId);
            if (foundIdx >= tocLimit) {
                tocLimit = Math.ceil((foundIdx + 1) / TOC_STEP) * TOC_STEP;
                renderToc(allReleases);
            }
            const targetEl = document.getElementById(rawHash) || document.getElementById(`v${versionId}`);
            if (targetEl) {
                setTimeout(() => {
                    targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 300);
            }
        }

    } catch (err) {
        console.error('[Changelog] Fatal error loading releases:', err);
        if (loadingState) loadingState.style.display = 'none';
        if (errorState) errorState.style.display = 'block';
    }
}

// Wire up dropdown and copy buttons on rendered cards
function attachCardEventListeners() {
    document.querySelectorAll('.cl-btn-download').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const targetId = btn.dataset.dropdownId;
            const menu = document.getElementById(targetId);
            const isOpen = menu && menu.classList.contains('open');

            document.querySelectorAll('.cl-dropdown-menu.open').forEach(m => m.classList.remove('open'));
            document.querySelectorAll('.cl-btn-download.open').forEach(b => b.classList.remove('open'));

            if (!isOpen && menu) {
                menu.classList.add('open');
                btn.classList.add('open');
            }
        };
    });

    document.querySelectorAll('.cl-copy-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            copyAnchor(btn.dataset.anchor);
        };
    });
}

// Global click & key listener to close download dropdowns
document.addEventListener('click', () => {
    document.querySelectorAll('.cl-dropdown-menu.open').forEach(m => m.classList.remove('open'));
    document.querySelectorAll('.cl-btn-download.open').forEach(b => b.classList.remove('open'));
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.cl-dropdown-menu.open').forEach(m => m.classList.remove('open'));
        document.querySelectorAll('.cl-btn-download.open').forEach(b => b.classList.remove('open'));
    }
});

// Setup Toolbar (Search & Filter interactions)
document.addEventListener('DOMContentLoaded', () => {
    // Search input
    const searchInput = document.getElementById('clSearchInput');
    const clearBtn = document.getElementById('clSearchClearBtn');

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            currentSearchTerm = searchInput.value;
            if (clearBtn) clearBtn.style.display = currentSearchTerm ? 'flex' : 'none';
            filterReleases();
        });
    }

    if (clearBtn && searchInput) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            currentSearchTerm = '';
            clearBtn.style.display = 'none';
            searchInput.focus();
            filterReleases();
        });
    }

    // Filter buttons
    document.querySelectorAll('.cl-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.cl-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeFilter = btn.dataset.filter || 'all';
            filterReleases();
        });
    });

    // Clear search button in empty state
    const emptyClearBtn = document.getElementById('clEmptyClearBtn');
    if (emptyClearBtn && searchInput) {
        emptyClearBtn.addEventListener('click', () => {
            searchInput.value = '';
            currentSearchTerm = '';
            if (clearBtn) clearBtn.style.display = 'none';
            document.querySelectorAll('.cl-filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));
            activeFilter = 'all';
            filterReleases();
        });
    }

    // Retry button in error state
    const retryBtn = document.getElementById('clRetryBtn');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            loadChangelog();
        });
    }

    // Initial load
    loadChangelog();
});

// Re-render when language changes
window.addEventListener('hw-lang-change', () => {
    if (allReleases.length > 0) {
        const feedContainer = document.getElementById('clFeedContainer');
        if (feedContainer) {
            feedContainer.innerHTML = allReleases.map((r, i) => renderReleaseCard(r, i)).join('');
            attachCardEventListeners();
        }
        renderToc(allReleases);
        filterReleases();
    }
});

