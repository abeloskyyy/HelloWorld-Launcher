import React, { useState, useEffect, useRef, useMemo } from 'react';

interface TelemetryReportRow {
  id: string;
  created_at: string;
  username: string;
  account_type: string;
  account_id: string | null;
  trigger_reason: string;
  launcher_version: string;
  os_platform: string | null;
  os_release: string | null;
  os_distro: string | null;
  os_arch: string | null;
  cpu_model: string | null;
  cpu_cores: number | null;
  total_ram_gb: number | null;
  free_ram_gb: number | null;
  gpu_renderer: string | null;
  ip_address: string | null;
  ip_country: string | null;
  ip_city: string | null;
  profile_name: string | null;
  game_version: string | null;
  mod_loader: string | null;
  allocated_ram_mb: number | null;
  managed_mods_count: number;
  unmanaged_mods_json: string;
  is_crash: number;
  exit_code: number | null;
  recent_logs_text: string | null;
  r2_log_key: string | null;
}

interface StatsData {
  total_reports: number;
  total_crashes: number;
  top_version: string;
  top_loader: string;
}

interface AddonItem {
  type: string;
  filename: string;
  name?: string | null;
  project_id?: string | null;
  version_id?: string | null;
  version_number?: string | null;
  icon_url?: string | null;
  slug?: string | null;
  description?: string | null;
  sha1?: string | null;
  world_name?: string | null;
  size_bytes?: number;
  size_mb?: string | number;
  modified_at?: string | null;
  is_disabled?: boolean;
  is_managed?: boolean;
  missing?: boolean;
}

interface HydratedAddonMeta {
  project_id?: string;
  version_id?: string;
  title?: string;
  version_number?: string;
  icon_url?: string | null;
  slug?: string;
  description?: string;
}

interface FullLogBundle {
  timestamp: string;
  username: string;
  trigger_reason: string;
  launcher_version: string;
  account?: {
    username?: string;
    type?: string;
    id?: string;
  };
  system_specs?: {
    os?: {
      platform?: string;
      release?: string;
      arch?: string;
      distro?: string;
    };
    hardware?: {
      cpu_model?: string;
      cpu_cores?: number;
      total_ram_gb?: number;
      free_ram_gb?: number;
      gpu_renderer?: string;
    };
  };
  profile?: {
    name?: string | null;
    game_version?: string | null;
    mod_loader?: string | null;
    allocated_ram_mb?: number | null;
    instance_directory?: string | null;
    managed_mods_count?: number;
    addons?: any[];
  };
  extra?: {
    is_crash?: boolean;
    exit_code?: number | null;
    crash_report?: string | null;
  };
  terminal_logs?: string[];
  game_logs?: string[];
  renderer_logs?: string[];
  crash_report?: string | null;
  unmanaged_files?: AddonItem[];
}

// ============================================================================
// Module-level Modrinth Metadata Caches & Helpers
// ============================================================================
const modrinthProjectCache = new Map<string, any>();
const modrinthVersionCache = new Map<string, any>();
const modrinthHashCache = new Map<string, any | null>();
const modrinthFilenameSearchCache = new Map<string, HydratedAddonMeta | null>();

const stripAnsi = (str: string): string => str.replace(/\x1b\[[0-9;]*m/g, '');

const normalizeAlphaNum = (str: string): string =>
  str.toLowerCase().replace(/[^a-z0-9]/g, '');

const diceSimilarity = (a: string, b: string): number => {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const bigramsA = new Map<string, number>();
  for (let i = 0; i < a.length - 1; i++) {
    const bg = a.slice(i, i + 2);
    bigramsA.set(bg, (bigramsA.get(bg) || 0) + 1);
  }
  let matches = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const bg = b.slice(i, i + 2);
    const count = bigramsA.get(bg) || 0;
    if (count > 0) {
      bigramsA.set(bg, count - 1);
      matches++;
    }
  }
  return (2 * matches) / (a.length - 1 + (b.length - 1));
};

const parseAddonFilename = (filename: string): { displayName: string; searchQuery: string; parsedVersion: string | null } => {
  const clean = filename.replace(/\.disabled$/i, '').replace(/\.(jar|zip|mrpack)$/i, '');

  // Match version segment starting at a separator + optional v/r/mc + digit.digit
  const verRegex = /(?:[-_+.\s])((?:mc\d+(?:\.\d+)*[-_+]?)?(?:[vr])?\d+\.\d+(?:[.\-+_a-zA-Z0-9]*)?)$/i;
  // Also handle loader-version patterns like -fabric-0.9.3+mc26.3 or -fabric-26.3-26.6.2
  const loaderVerRegex = /(?:[-_.\s])(?:fabric|forge|neoforge|quilt|liteloader|mc\d+(?:\.\d+)*)(?:[-_.\s]+((?:[vr])?\d+\.\d+(?:[.\-+_a-zA-Z0-9]*)?))?$/i;

  let basePart = clean;
  let parsedVersion: string | null = null;

  const loaderMatch = clean.match(loaderVerRegex);
  if (loaderMatch && loaderMatch.index !== undefined && loaderMatch.index > 1) {
    basePart = clean.slice(0, loaderMatch.index);
    if (loaderMatch[1]) {
      parsedVersion = loaderMatch[1];
    }
  }

  if (!parsedVersion) {
    const verMatch = basePart.match(verRegex);
    if (verMatch && verMatch.index !== undefined && verMatch.index > 1) {
      parsedVersion = verMatch[1];
      basePart = basePart.slice(0, verMatch.index);
    }
  }

  // Strip trailing loader tags if version was stripped first
  basePart = basePart.replace(/[-_.\s]+(fabric|forge|neoforge|quilt|universal|client|server)$/i, '');

  const searchQuery = basePart.replace(/[-_+.]+/g, ' ').trim();
  const displayName =
    searchQuery
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
      .join(' ') || clean;

  return { displayName, searchQuery, parsedVersion };
};

/**
 * Recovers project_id & version_id mappings from launcher [install-addon] terminal logs
 * (especially helpful for historical reports created before managed addons metadata was bundled).
 */
const extractInstallMappingsFromLogs = (terminalLogs?: string[]): Map<string, { project_id: string; version_id?: string }> => {
  const map = new Map<string, { project_id: string; version_id?: string }>();
  if (!Array.isArray(terminalLogs) || terminalLogs.length === 0) return map;

  let pendingProjectId: string | null = null;
  let pendingVersionId: string | null = null;

  for (const rawLine of terminalLogs) {
    const line = stripAnsi(rawLine);
    const pidMatch = line.match(/project_id:\s*['"]([A-Za-z0-9_-]+)['"]/);
    if (pidMatch) {
      pendingProjectId = pidMatch[1];
      continue;
    }
    const vidMatch = line.match(/version_id:\s*['"]([A-Za-z0-9_-]+)['"]/);
    if (vidMatch) {
      pendingVersionId = vidMatch[1];
      continue;
    }
    const fnMatch = line.match(/filename:\s*['"]([^'"]+)['"]/);
    if (fnMatch && pendingProjectId) {
      const normKey = fnMatch[1].toLowerCase().replace(/\.disabled$/i, '');
      map.set(normKey, {
        project_id: pendingProjectId,
        version_id: pendingVersionId || undefined,
      });
      pendingProjectId = null;
      pendingVersionId = null;
    }
  }

  return map;
};

const fetchModrinthProjectsBatch = async (projectIds: string[]): Promise<void> => {
  const missing = Array.from(new Set(projectIds.filter((id) => id && !modrinthProjectCache.has(id))));
  if (missing.length === 0) return;

  try {
    const win = window as any;
    if (win.hwlAPI?.get_multiple_mod_details) {
      const res = await win.hwlAPI.get_multiple_mod_details(missing);
      if (res && res.success && Array.isArray(res.details)) {
        for (const p of res.details) {
          if (p?.id) modrinthProjectCache.set(p.id, p);
          if (p?.slug) modrinthProjectCache.set(p.slug, p);
        }
        return;
      }
    }
  } catch (_) {}

  // Fallback direct Modrinth API fetch
  for (let i = 0; i < missing.length; i += 50) {
    const chunk = missing.slice(i, i + 50);
    try {
      const resp = await fetch(`https://api.modrinth.com/v2/projects?ids=${encodeURIComponent(JSON.stringify(chunk))}`);
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data)) {
          for (const p of data) {
            if (p?.id) modrinthProjectCache.set(p.id, p);
            if (p?.slug) modrinthProjectCache.set(p.slug, p);
          }
        }
      }
    } catch (_) {}
  }
};

const fetchModrinthVersionsBatch = async (versionIds: string[]): Promise<void> => {
  const missing = Array.from(new Set(versionIds.filter((id) => id && !modrinthVersionCache.has(id))));
  if (missing.length === 0) return;

  for (let i = 0; i < missing.length; i += 50) {
    const chunk = missing.slice(i, i + 50);
    try {
      const resp = await fetch(`https://api.modrinth.com/v2/versions?ids=${encodeURIComponent(JSON.stringify(chunk))}`);
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data)) {
          for (const v of data) {
            if (v?.id) modrinthVersionCache.set(v.id, v);
          }
        }
      }
    } catch (_) {}
  }
};

const lookupModrinthHashesBatch = async (hashes: string[]): Promise<void> => {
  const missing = Array.from(new Set(hashes.filter((h) => h && !modrinthHashCache.has(h))));
  if (missing.length === 0) return;

  for (let i = 0; i < missing.length; i += 50) {
    const chunk = missing.slice(i, i + 50);
    try {
      const resp = await fetch('https://api.modrinth.com/v2/version_files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hashes: chunk, algorithm: 'sha1' }),
      });
      if (resp.ok) {
        const data = await resp.json();
        for (const h of chunk) {
          modrinthHashCache.set(h, data[h] || null);
        }
      }
    } catch (_) {}
  }
};

const searchModrinthByFilename = async (addon: AddonItem): Promise<HydratedAddonMeta | null> => {
  const cacheKey = `${addon.type}:${addon.filename.toLowerCase()}`;
  if (modrinthFilenameSearchCache.has(cacheKey)) {
    return modrinthFilenameSearchCache.get(cacheKey) || null;
  }

  const parsed = parseAddonFilename(addon.filename);
  const normBase = normalizeAlphaNum(parsed.searchQuery);
  if (normBase.length < 3) {
    modrinthFilenameSearchCache.set(cacheKey, null);
    return null;
  }

  const projectTypeMap: Record<string, string> = {
    mod: 'mod',
    resourcepack: 'resourcepack',
    shader: 'shader',
    datapack: 'datapack',
  };
  const pt = projectTypeMap[addon.type] || 'mod';

  try {
    const facets = JSON.stringify([[`project_type:${pt}`]]);
    const url = `https://api.modrinth.com/v2/search?query=${encodeURIComponent(parsed.searchQuery)}&limit=5&facets=${encodeURIComponent(facets)}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      modrinthFilenameSearchCache.set(cacheKey, null);
      return null;
    }
    const data = await resp.json();
    const hits = Array.isArray(data?.hits) ? data.hits : [];

    let bestHit: any = null;
    let bestScore = 0;

    for (const hit of hits) {
      const normSlug = normalizeAlphaNum(hit.slug || '');
      const normTitle = normalizeAlphaNum(hit.title || '');

      let score = 0;
      if (normSlug === normBase || normTitle === normBase) {
        score = 1.0;
      } else {
        score = Math.max(diceSimilarity(normBase, normSlug), diceSimilarity(normBase, normTitle));
        // Boost if one clearly starts with the other and lengths are close
        if (
          (normSlug.startsWith(normBase) || normBase.startsWith(normSlug)) &&
          Math.min(normSlug.length, normBase.length) >= 4
        ) {
          score = Math.max(score, 0.78);
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestHit = hit;
      }
    }

    if (bestHit && bestScore >= 0.72) {
      const resolved: HydratedAddonMeta = {
        project_id: bestHit.project_id,
        title: bestHit.title,
        icon_url: bestHit.icon_url || null,
        slug: bestHit.slug,
        description: bestHit.description,
        version_number: parsed.parsedVersion || undefined,
      };
      modrinthFilenameSearchCache.set(cacheKey, resolved);
      return resolved;
    }
  } catch (_) {}

  modrinthFilenameSearchCache.set(cacheKey, null);
  return null;
};

export const TelemetryView: React.FC = () => {
  const [reports, setReports] = useState<TelemetryReportRow[]>([]);
  const [selectedReport, setSelectedReport] = useState<TelemetryReportRow | null>(null);
  const [fullBundle, setFullBundle] = useState<FullLogBundle | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [stats, setStats] = useState<StatsData | null>(null);

  // Hydrated Modrinth metadata map keyed by normalized filename
  const [hydratedMetaMap, setHydratedMetaMap] = useState<Record<string, HydratedAddonMeta>>({});
  const [isHydratingAddons, setIsHydratingAddons] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [crashOnly, setCrashOnly] = useState(false);
  const [modLoaderFilter, setModLoaderFilter] = useState('all');
  const [osFilter, setOsFilter] = useState('all');
  const [activeLogTab, setActiveLogTab] = useState<'details' | 'crash' | 'minecraft' | 'terminal' | 'renderer'>('details');
  const [logFilterQuery, setLogFilterQuery] = useState('');

  // Addons filter in Details tab
  const [addonCategoryFilter, setAddonCategoryFilter] = useState<'all' | 'mod' | 'resourcepack' | 'shader' | 'datapack'>('all');
  const [addonSearchQuery, setAddonSearchQuery] = useState('');

  // UI & i18n reactivity state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [leftWidthPercent, setLeftWidthPercent] = useState<number>(35);
  const [, setLangTick] = useState(0);
  const [telemetryEnterTick, setTelemetryEnterTick] = useState(0);
  const isDraggingSplitter = useRef(false);

  // Isolate view: only hide streak, user badges, promos when telemetry is the active section
  useEffect(() => {
    const handleSectionChange = (e: any) => {
      if (e.detail?.section === 'telemetry') {
        document.body.classList.add('in-telemetry');
        setTelemetryEnterTick((n) => n + 1);
      } else {
        document.body.classList.remove('in-telemetry');
      }
    };

    const handleLanguageChange = () => setLangTick((n) => n + 1);
    const handleAuthChange = () => {
      setReports([]);
      setSelectedReport(null);
      setFullBundle(null);
      setStats(null);
      setHydratedMetaMap({});
    };

    const telemetryEl = document.getElementById('telemetry');
    if (telemetryEl && telemetryEl.classList.contains('active')) {
      document.body.classList.add('in-telemetry');
    } else {
      document.body.classList.remove('in-telemetry');
    }

    window.addEventListener('section-changed', handleSectionChange);
    window.addEventListener('language-changed', handleLanguageChange);
    window.addEventListener('auth-state-changed', handleAuthChange);
    return () => {
      window.removeEventListener('section-changed', handleSectionChange);
      window.removeEventListener('language-changed', handleLanguageChange);
      window.removeEventListener('auth-state-changed', handleAuthChange);
      document.body.classList.remove('in-telemetry');
    };
  }, []);

  const t = (key: string, fallback: string): string => {
    const win = window as any;
    if (typeof win.t === 'function') {
      const val = win.t(key);
      if (val && val !== key) return val;
    }
    return fallback;
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load stats & report list
  const fetchReports = async () => {
    setIsLoadingList(true);
    try {
      const win = window as any;
      if (!win.hwlAPI?.telemetryAdmin) return;

      const [statsRes, listRes] = await Promise.all([
        win.hwlAPI.telemetryAdmin.getStats(),
        win.hwlAPI.telemetryAdmin.listReports({
          username: searchQuery.trim() || undefined,
          crash_only: crashOnly,
          mod_loader: modLoaderFilter !== 'all' ? modLoaderFilter : undefined,
          os_platform: osFilter !== 'all' ? osFilter : undefined,
          limit: 100,
        }),
      ]);

      if (statsRes && statsRes.success) {
        setStats(statsRes.stats);
      }
      if (listRes && listRes.success) {
        setReports(listRes.reports || []);
        if (selectedReport) {
          const stillThere = (listRes.reports || []).find((r: TelemetryReportRow) => r.id === selectedReport.id);
          if (stillThere) setSelectedReport(stillThere);
        }
      }
    } catch (err: any) {
      showToast(`${t('telemetry.error_loading_reports', 'Error cargando reportes')}: ${err.message}`);
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    const telemetryEl = document.getElementById('telemetry');
    if (telemetryEnterTick > 0 || (telemetryEl && telemetryEl.classList.contains('active'))) {
      fetchReports();
    }
  }, [crashOnly, modLoaderFilter, osFilter, telemetryEnterTick]);

  // Load full logs when selecting report
  useEffect(() => {
    if (!selectedReport) {
      setFullBundle(null);
      setHydratedMetaMap({});
      return;
    }

    let isCancelled = false;
    setLogFilterQuery('');
    setAddonSearchQuery('');
    setAddonCategoryFilter('all');

    const loadLogs = async () => {
      setIsLoadingLogs(true);
      try {
        const win = window as any;
        if (selectedReport.r2_log_key && win.hwlAPI?.telemetryAdmin?.fetchFullLogs) {
          const res = await win.hwlAPI.telemetryAdmin.fetchFullLogs(selectedReport.id);
          if (!isCancelled && res && res.success && res.bundle) {
            setFullBundle(res.bundle);
            if (res.bundle.crash_report && Boolean(selectedReport.is_crash)) {
              setActiveLogTab('crash');
            } else {
              setActiveLogTab('details');
            }
            return;
          }
        }

        // Fallback if no R2 or parsing unmanaged_mods_json from D1
        let parsedUnmanaged: AddonItem[] = [];
        try {
          parsedUnmanaged = JSON.parse(selectedReport.unmanaged_mods_json || '[]');
        } catch (_) {}

        if (!isCancelled) {
          setFullBundle({
            timestamp: selectedReport.created_at,
            username: selectedReport.username,
            trigger_reason: selectedReport.trigger_reason,
            launcher_version: selectedReport.launcher_version,
            terminal_logs: (selectedReport.recent_logs_text || '').split('\n'),
            game_logs: [],
            renderer_logs: [],
            crash_report: null,
            unmanaged_files: parsedUnmanaged,
          });
          setActiveLogTab('details');
        }
      } catch (_) {
        if (!isCancelled) setFullBundle(null);
      } finally {
        if (!isCancelled) setIsLoadingLogs(false);
      }
    };

    loadLogs();
    return () => {
      isCancelled = true;
    };
  }, [selectedReport?.id]);

  // Compile full unified list of addons (both managed and unmanaged)
  const unifiedAddonsList = useMemo<AddonItem[]>(() => {
    const list: AddonItem[] = [];
    const seenKeys = new Set<string>();
    const logMappings = extractInstallMappingsFromLogs(fullBundle?.terminal_logs);

    const normKey = (type: string, fn: string) => `${type}:${fn.toLowerCase().replace(/\.disabled$/i, '')}`;

    // 1. Profile managed addons first (highest fidelity metadata)
    if (fullBundle?.profile?.addons && Array.isArray(fullBundle.profile.addons)) {
      fullBundle.profile.addons.forEach((a) => {
        const fn = a.filename || a.name || 'addon.jar';
        const type = a.type || 'mod';
        const key = normKey(type, fn);
        if (seenKeys.has(key)) return;
        seenKeys.add(key);

        const fromLog = logMappings.get(fn.toLowerCase().replace(/\.disabled$/i, ''));
        list.push({
          type,
          filename: fn,
          name: a.name || a.display_name || null,
          project_id: a.project_id || fromLog?.project_id || null,
          version_id: a.version_id || fromLog?.version_id || null,
          sha1: a.sha1 || null,
          world_name: a.world_name || null,
          size_bytes: a.size_bytes || (a.size_mb ? parseFloat(a.size_mb) * 1024 * 1024 : undefined),
          modified_at: a.modified_at || null,
          is_disabled: Boolean(a.is_disabled || a.state === 'disabled' || a.enabled === false),
          is_managed: true,
          missing: Boolean(a.missing),
        });
      });
    }

    // 2. Unmanaged / scanned files
    if (fullBundle?.unmanaged_files && fullBundle.unmanaged_files.length > 0) {
      fullBundle.unmanaged_files.forEach((f) => {
        const type = f.type || 'mod';
        const key = normKey(type, f.filename);
        if (seenKeys.has(key)) return;
        seenKeys.add(key);

        const fromLog = logMappings.get(f.filename.toLowerCase().replace(/\.disabled$/i, ''));
        list.push({
          type,
          filename: f.filename,
          name: f.name || null,
          project_id: f.project_id || fromLog?.project_id || null,
          version_id: f.version_id || fromLog?.version_id || null,
          sha1: f.sha1 || null,
          world_name: f.world_name || null,
          size_bytes: f.size_bytes,
          modified_at: f.modified_at || null,
          is_disabled: Boolean(f.is_disabled),
          is_managed: Boolean(f.is_managed || fromLog),
          missing: false,
        });
      });
    }

    return list;
  }, [fullBundle]);

  // Hydrate Modrinth metadata (title, icon_url, version_number, project_id) for all addons
  useEffect(() => {
    if (unifiedAddonsList.length === 0) {
      setHydratedMetaMap({});
      setIsHydratingAddons(false);
      return;
    }

    let isCancelled = false;

    const hydrateAll = async () => {
      setIsHydratingAddons(true);
      try {
        const workingMap: Record<string, HydratedAddonMeta> = {};

        // Step 1: SHA-1 batch lookup for items with sha1 and no project_id
        const hashesToLookup = unifiedAddonsList
          .filter((a) => a.sha1 && !a.project_id)
          .map((a) => a.sha1 as string);

        if (hashesToLookup.length > 0) {
          await lookupModrinthHashesBatch(hashesToLookup);
        }

        // Collect all known project_ids & version_ids after hash lookup
        const projectIds: string[] = [];
        const versionIds: string[] = [];

        for (const addon of unifiedAddonsList) {
          const hashHit = addon.sha1 ? modrinthHashCache.get(addon.sha1) : null;
          const pid = addon.project_id || hashHit?.project_id;
          const vid = addon.version_id || hashHit?.id;
          if (pid) projectIds.push(pid);
          if (vid) versionIds.push(vid);
        }

        // Step 2: Parallel batch fetch of Modrinth projects & versions
        await Promise.all([
          fetchModrinthProjectsBatch(projectIds),
          fetchModrinthVersionsBatch(versionIds),
        ]);

        // Populate resolved map for items with project_id / sha1
        const unresolvedForSearch: AddonItem[] = [];

        for (const addon of unifiedAddonsList) {
          const itemKey = `${addon.type}:${addon.filename.toLowerCase()}`;
          const hashHit = addon.sha1 ? modrinthHashCache.get(addon.sha1) : null;
          const pid = addon.project_id || hashHit?.project_id || null;
          const vid = addon.version_id || hashHit?.id || null;
          const proj = pid ? modrinthProjectCache.get(pid) : null;
          const ver = vid ? modrinthVersionCache.get(vid) || hashHit : hashHit;
          const parsed = parseAddonFilename(addon.filename);

          if (proj || pid) {
            workingMap[itemKey] = {
              project_id: proj?.id || pid || undefined,
              version_id: ver?.id || vid || undefined,
              title: proj?.title || addon.name || parsed.displayName,
              version_number: ver?.version_number || parsed.parsedVersion || undefined,
              icon_url: proj?.icon_url || null,
              slug: proj?.slug,
              description: proj?.description,
            };
          } else {
            // Immediate clean parsed fallback while search runs
            workingMap[itemKey] = {
              title: addon.name || parsed.displayName,
              version_number: parsed.parsedVersion || undefined,
            };
            unresolvedForSearch.push(addon);
          }
        }

        if (!isCancelled) {
          setHydratedMetaMap({ ...workingMap });
        }

        // Step 3: Smart Modrinth Search fallback for old reports lacking project_id & sha1 (cap at 30)
        const searchQueue = unresolvedForSearch.slice(0, 30);
        const concurrency = 4;
        for (let i = 0; i < searchQueue.length; i += concurrency) {
          if (isCancelled) return;
          const batch = searchQueue.slice(i, i + concurrency);
          const results = await Promise.all(
            batch.map(async (addon) => ({
              addon,
              hit: await searchModrinthByFilename(addon),
            }))
          );

          let changed = false;
          for (const { addon, hit } of results) {
            if (hit) {
              const itemKey = `${addon.type}:${addon.filename.toLowerCase()}`;
              workingMap[itemKey] = {
                ...workingMap[itemKey],
                ...hit,
                version_number: hit.version_number || workingMap[itemKey]?.version_number,
              };
              changed = true;
            }
          }

          if (changed && !isCancelled) {
            setHydratedMetaMap({ ...workingMap });
          }
        }
      } catch (_) {
      } finally {
        if (!isCancelled) setIsHydratingAddons(false);
      }
    };

    hydrateAll();
    return () => {
      isCancelled = true;
    };
  }, [unifiedAddonsList]);

  // Handle Splitter drag
  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingSplitter.current = true;

    const handleMouseMove = (moveEv: MouseEvent) => {
      if (!isDraggingSplitter.current) return;
      const container = document.getElementById('telemetrySplitContainer');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const currentX = moveEv.clientX - rect.left;
      const percent = (currentX / rect.width) * 100;
      if (percent >= 22 && percent <= 60) {
        setLeftWidthPercent(Math.round(percent * 10) / 10);
      }
    };

    const handleMouseUp = () => {
      isDraggingSplitter.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Actions
  const handleCopyMarkdown = () => {
    if (!selectedReport) return;
    const r = selectedReport;
    const accId = r.account_id || fullBundle?.account?.id || 'N/A';
    const lines = [
      `### Reporte de Telemetría: ${r.username}`,
      `- **Fecha**: ${new Date(r.created_at).toLocaleString()}`,
      `- **Motivo**: \`${r.trigger_reason}\` (Exit Code: ${r.exit_code ?? 'N/A'})`,
      `- **Cuenta ID**: \`${accId}\` (${r.account_type})`,
      `- **Perfil**: ${r.profile_name || 'Default'} (${r.game_version || 'N/A'} • ${r.mod_loader || 'Vanilla'})`,
      `- **RAM Asignada (JVM)**: ${r.allocated_ram_mb ? `${r.allocated_ram_mb} MB` : '4096 MB'}`,
      `- **Sistema Operativo**: ${r.os_distro || r.os_platform || 'Desconocido'} (${r.os_arch || ''})`,
      `- **Hardware**: ${r.cpu_model || 'CPU'} (${r.cpu_cores || '?'} núcleos) • ${r.total_ram_gb || '?'} GB RAM (${r.free_ram_gb || '?'} GB libre)`,
      `- **GPU**: ${r.gpu_renderer || 'Default'}`,
      `- **IP / Ubicación**: ${r.ip_address || 'N/A'} (${r.ip_country || '?'}${r.ip_city ? `, ${r.ip_city}` : ''})`,
      `- **Reporte ID**: \`${r.id}\``,
    ];

    if (fullBundle?.crash_report) {
      lines.push('', '#### Crash Report (Extracto)', '```txt', fullBundle.crash_report.slice(0, 1500), '```');
    }

    navigator.clipboard.writeText(lines.join('\n'));
    showToast(t('telemetry.copied_toast', 'Reporte técnico copiado al portapapeles'));
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} ${t('telemetry.copied_value_toast', 'copiado al portapapeles')}`);
  };

  const handleDownloadR2 = async () => {
    if (!selectedReport) return;
    try {
      const win = window as any;
      if (!win.hwlAPI?.telemetryAdmin?.fetchFullLogs) {
        throw new Error('Telemetry log download unavailable');
      }
      showToast(t('telemetry.downloading_toast', 'Descargando archivo de logs...'));
      const res = await win.hwlAPI.telemetryAdmin.fetchFullLogs(selectedReport.id);
      if (!res || !res.success || !res.bundle) {
        throw new Error(res?.error || 'Unauthorized');
      }
      const blob = new Blob([JSON.stringify(res.bundle, null, 2)], { type: 'application/json' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `logs_${selectedReport.username}_${selectedReport.id.slice(0, 8)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    } catch (err: any) {
      showToast('Error: ' + err.message);
    }
  };

  const handleDeleteReport = async () => {
    if (!selectedReport) return;
    const confirmMsg = t(
      'telemetry.confirm_delete',
      '¿Estás seguro de eliminar este reporte permanentemente de Cloudflare D1 y R2?'
    );
    const confirmDelete = window.confirm(`${confirmMsg} (${selectedReport.username})`);
    if (!confirmDelete) return;

    try {
      const win = window as any;
      if (win.hwlAPI?.telemetryAdmin?.deleteReport) {
        await win.hwlAPI.telemetryAdmin.deleteReport(selectedReport.id);
        setReports((prev) => prev.filter((r) => r.id !== selectedReport.id));
        setSelectedReport(null);
        showToast(t('telemetry.deleted_toast', 'Reporte eliminado con éxito'));
      }
    } catch (err: any) {
      showToast('Error: ' + err.message);
    }
  };

  const handleOpenModDetails = (projectId?: string) => {
    if (!projectId) return;
    const win = window as any;
    if (typeof win.openModDetails === 'function') {
      win.openModDetails(projectId);
    }
  };

  // Filtered addons based on category and search query (matches title, filename, project_id, version)
  const filteredAddons = useMemo(() => {
    let result = unifiedAddonsList;

    if (addonCategoryFilter !== 'all') {
      result = result.filter((item) => item.type === addonCategoryFilter);
    }

    if (addonSearchQuery.trim()) {
      const q = addonSearchQuery.toLowerCase();
      result = result.filter((item) => {
        const meta = hydratedMetaMap[`${item.type}:${item.filename.toLowerCase()}`];
        return (
          item.filename.toLowerCase().includes(q) ||
          (meta?.title && meta.title.toLowerCase().includes(q)) ||
          (meta?.project_id && meta.project_id.toLowerCase().includes(q)) ||
          (meta?.version_number && meta.version_number.toLowerCase().includes(q)) ||
          (item.name && item.name.toLowerCase().includes(q))
        );
      });
    }

    return result;
  }, [unifiedAddonsList, addonCategoryFilter, addonSearchQuery, hydratedMetaMap]);

  // All lines & filtered lines for active log tab
  const { totalLogLines, activeLogContent } = useMemo(() => {
    if (!fullBundle) return { totalLogLines: 0, activeLogContent: [] as string[] };
    let lines: string[] = [];

    if (activeLogTab === 'crash') {
      lines = fullBundle.crash_report
        ? fullBundle.crash_report.split(/\r?\n/)
        : [t('telemetry.empty_crash', 'No hay informe de crash disponible para este evento.')];
    } else if (activeLogTab === 'minecraft') {
      lines =
        fullBundle.game_logs && fullBundle.game_logs.length > 0
          ? fullBundle.game_logs.map(stripAnsi)
          : [t('telemetry.empty_minecraft', 'No hay logs del juego registrados para este evento.')];
    } else if (activeLogTab === 'terminal') {
      lines =
        fullBundle.terminal_logs && fullBundle.terminal_logs.length > 0
          ? fullBundle.terminal_logs.map(stripAnsi)
          : [t('telemetry.empty_terminal', 'No hay logs de terminal registrados.')];
    } else if (activeLogTab === 'renderer') {
      lines =
        fullBundle.renderer_logs && fullBundle.renderer_logs.length > 0
          ? fullBundle.renderer_logs.map(stripAnsi)
          : [t('telemetry.empty_renderer', 'No hay logs de la consola JS registrados.')];
    }

    const total = lines.length;
    if (!logFilterQuery.trim()) return { totalLogLines: total, activeLogContent: lines };
    const q = logFilterQuery.toLowerCase();
    return {
      totalLogLines: total,
      activeLogContent: lines.filter((l) => l.toLowerCase().includes(q)),
    };
  }, [fullBundle, activeLogTab, logFilterQuery]);

  const handleCopyVisibleLog = () => {
    if (activeLogContent.length === 0) return;
    navigator.clipboard.writeText(activeLogContent.join('\n'));
    showToast(t('telemetry.copied_log_toast', 'Log copiado al portapapeles'));
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month} ${hours}:${mins}`;
    } catch (_) {
      return isoStr;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '0 KB';
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${Math.round(bytes / 1024)} KB`;
  };

  const getOsIcon = (platform: string | null) => {
    const p = (platform || '').toLowerCase();
    if (p.includes('win')) return 'fab fa-windows';
    if (p.includes('lin')) return 'fab fa-linux';
    if (p.includes('dar') || p.includes('mac')) return 'fab fa-apple';
    return 'fas fa-desktop';
  };

  const getAddonIcon = (type: string) => {
    switch (type) {
      case 'resourcepack':
        return 'fas fa-palette';
      case 'shader':
        return 'fas fa-sun';
      case 'datapack':
        return 'fas fa-code';
      case 'modpack':
        return 'fas fa-boxes';
      default:
        return 'fas fa-cube';
    }
  };

  const getAddonTypeLabel = (type: string) => {
    switch (type) {
      case 'resourcepack':
        return t('telemetry.filter_resourcepacks', 'Resource Pack');
      case 'shader':
        return t('telemetry.filter_shaders', 'Shader');
      case 'datapack':
        return t('telemetry.filter_datapacks', 'Data Pack');
      case 'modpack':
        return 'Modpack';
      default:
        return 'Mod';
    }
  };

  // Resolved fields for selectedReport
  const resolvedAccountId = selectedReport?.account_id || fullBundle?.account?.id || null;
  const resolvedInstanceDir = fullBundle?.profile?.instance_directory || '~/.minecraft';
  const resolvedExitCode =
    selectedReport && selectedReport.exit_code !== null
      ? selectedReport.exit_code
      : selectedReport && Boolean(selectedReport.is_crash)
      ? 1
      : 0;
  const hasCrashTab = Boolean(fullBundle?.crash_report) || Boolean(selectedReport?.is_crash);

  return (
    <div id="telemetry" className="section">
      {/* Toast Notification */}
      {Boolean(toastMessage) && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            color: '#93c5fd',
            padding: '10px 18px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <i className="fas fa-info-circle"></i>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Stats Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
          flexWrap: 'wrap',
          gap: '12px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 700,
              color: '#f8fafc',
              letterSpacing: '0.4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <i className="fas fa-chart-line" style={{ color: '#38bdf8', marginRight: '10px', fontSize: '18px' }}></i>
            {t('telemetry.title', 'Telemetría y Diagnósticos')}
          </h1>
          <span
            style={{
              height: '24px',
              padding: '0 10px',
              borderRadius: '12px',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              fontSize: '11px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            {t('telemetry.badge_staff', 'Staff Moderador')}
          </span>
        </div>

        {/* Quick Stats Badges (Equal Heights: 32px) */}
        {Boolean(stats) && stats && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div
              style={{
                height: '32px',
                padding: '0 12px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                boxSizing: 'border-box',
              }}
            >
              <span style={{ color: '#94a3b8', marginRight: '5px' }}>{t('telemetry.stats_reports', 'Reportes:')}</span>
              <strong style={{ color: '#f8fafc' }}>{stats.total_reports}</strong>
            </div>
            <div
              style={{
                height: '32px',
                padding: '0 12px',
                borderRadius: '6px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                fontSize: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                boxSizing: 'border-box',
              }}
            >
              <span style={{ color: '#f87171', marginRight: '5px' }}>
                <i className="fas fa-bug" style={{ marginRight: '4px' }}></i>
                {t('telemetry.stats_crashes', 'Crashes:')}
              </span>
              <strong style={{ color: '#fca5a5' }}>{stats.total_crashes}</strong>
            </div>
            <div
              style={{
                height: '32px',
                padding: '0 12px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                boxSizing: 'border-box',
              }}
            >
              <span style={{ color: '#94a3b8', marginRight: '5px' }}>{t('telemetry.stats_top_mc', 'Top MC:')}</span>
              <strong style={{ color: '#38bdf8' }}>{stats.top_version}</strong>
            </div>
            <div
              style={{
                height: '32px',
                padding: '0 12px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                boxSizing: 'border-box',
              }}
            >
              <span style={{ color: '#94a3b8', marginRight: '5px' }}>{t('telemetry.stats_top_loader', 'Top Loader:')}</span>
              <strong style={{ color: '#c084fc' }}>{stats.top_loader}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Main Split Container */}
      <div
        id="telemetrySplitContainer"
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '10px',
          overflow: 'hidden',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Left Column: Filters & Report List */}
        <div
          style={{
            width: `${leftWidthPercent}%`,
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(10, 15, 29, 0.45)',
          }}
        >
          {/* Row 1: Search Bar & Refresh (Height: 34px) */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, height: '34px' }}>
              <i
                className="fas fa-search"
                style={{
                  position: 'absolute',
                  left: '11px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b',
                  fontSize: '12px',
                }}
              ></i>
              <input
                type="text"
                placeholder={t('telemetry.search_placeholder', 'Buscar usuario o ID...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchReports()}
                style={{
                  width: '100%',
                  height: '34px',
                  padding: '0 10px 0 32px',
                  background: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '6px',
                  color: '#f8fafc',
                  fontSize: '12.5px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>
            {/* Square Refresh Button */}
            <button
              type="button"
              className="btn-icon-sq btn-blue"
              title={t('telemetry.refresh_hint', 'Actualizar lista')}
              onClick={fetchReports}
              disabled={isLoadingList}
            >
              <i className={isLoadingList ? 'fas fa-spinner fa-spin' : 'fas fa-sync-alt'}></i>
            </button>
          </div>

          {/* Row 2: Filter Pills Row (Equal Heights: 32px) */}
          <div
            style={{
              padding: '8px 12px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            {/* Crash Only Toggle */}
            <button
              type="button"
              onClick={() => setCrashOnly(!crashOnly)}
              style={{
                height: '32px',
                padding: '0 12px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                background: crashOnly ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                border: crashOnly ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                color: crashOnly ? '#fca5a5' : '#94a3b8',
                boxSizing: 'border-box',
                transition: 'all 0.18s ease',
              }}
            >
              <i className="fas fa-bug"></i>
              <span>{t('telemetry.only_crashes', 'Solo Crashes')}</span>
            </button>

            {/* ModLoader Selector */}
            <select
              value={modLoaderFilter}
              onChange={(e) => setModLoaderFilter(e.target.value)}
              style={{
                height: '32px',
                padding: '0 8px',
                borderRadius: '6px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#cbd5e1',
                fontSize: '11.5px',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            >
              <option value="all">{t('telemetry.loader_all', 'Loader: Todos')}</option>
              <option value="fabric">Fabric</option>
              <option value="forge">Forge</option>
              <option value="neoforge">NeoForge</option>
              <option value="vanilla">Vanilla</option>
            </select>

            {/* OS Selector */}
            <select
              value={osFilter}
              onChange={(e) => setOsFilter(e.target.value)}
              style={{
                height: '32px',
                padding: '0 8px',
                borderRadius: '6px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#cbd5e1',
                fontSize: '11.5px',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            >
              <option value="all">{t('telemetry.os_all', 'SO: Todos')}</option>
              <option value="linux">Linux</option>
              <option value="win32">Windows</option>
              <option value="darwin">macOS</option>
            </select>
          </div>

          {/* List of Report Cards */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {reports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 12px', color: '#64748b', fontSize: '13px' }}>
                <i className="fas fa-inbox" style={{ fontSize: '28px', display: 'block', marginBottom: '10px', opacity: 0.6 }}></i>
                {t('telemetry.no_reports_found', 'No se encontraron reportes con los filtros actuales')}
              </div>
            ) : (
              reports.map((r) => {
                const isSelected = selectedReport?.id === r.id;
                const isCrash = Boolean(r.is_crash);
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedReport(r)}
                    style={{
                      padding: '10px 12px',
                      marginBottom: '6px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected
                        ? '1px solid rgba(56, 189, 248, 0.45)'
                        : isCrash
                        ? '1px solid rgba(239, 68, 68, 0.25)'
                        : '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {/* Top Row: User + Badge + Date */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i
                          className={isCrash ? 'fas fa-bug' : 'fas fa-file-alt'}
                          style={{ color: isCrash ? '#ef4444' : '#38bdf8', fontSize: '12px' }}
                        ></i>
                        <span style={{ fontWeight: 600, fontSize: '13px', color: '#f1f5f9' }}>{r.username}</span>
                        {r.account_type === 'microsoft' && (
                          <i className="fab fa-windows" style={{ color: '#0ea5e9', fontSize: '10px' }} title="Microsoft"></i>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>{formatDate(r.created_at)}</span>
                    </div>

                    {/* Bottom Row: MC version, Loader, OS */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: '#94a3b8' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ background: 'rgba(255, 255, 255, 0.06)', padding: '1px 6px', borderRadius: '4px' }}>
                          {r.game_version || 'MC ?'}
                        </span>
                        {Boolean(r.mod_loader) && r.mod_loader !== 'Vanilla' && (
                          <span style={{ color: '#c084fc', background: 'rgba(192, 132, 252, 0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                            {r.mod_loader}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className={getOsIcon(r.os_platform)} style={{ color: '#94a3b8', fontSize: '11px' }}></i>
                        {(r.allocated_ram_mb ?? 0) > 0 && (
                          <span style={{ color: '#64748b' }}>{Math.round((r.allocated_ram_mb || 0) / 1024)}G</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Resizable Splitter Thumb */}
        <div
          onMouseDown={handleSplitterMouseDown}
          style={{
            width: '6px',
            cursor: 'col-resize',
            background: 'rgba(255, 255, 255, 0.04)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.06)',
            borderRight: '1px solid rgba(255, 255, 255, 0.06)',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(56, 189, 248, 0.4)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)')}
        ></div>

        {/* Right Column: Inspector & Content */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: 'rgba(8, 12, 22, 0.6)' }}>
          {!selectedReport ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
              <i className="fas fa-chart-pie" style={{ fontSize: '44px', marginBottom: '14px', opacity: 0.35 }}></i>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#94a3b8' }}>
                {t('telemetry.select_prompt', 'Selecciona un reporte de la lista')}
              </div>
              <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>
                {t('telemetry.select_subtitle', 'Para ver detalles técnicos, complementos del perfil y volcado de logs')}
              </div>
            </div>
          ) : (
            <>
              {/* Report Header Bar */}
              <div
                style={{
                  padding: '12px 18px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
                  flexShrink: 0,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>{selectedReport.username}</span>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        background: Boolean(selectedReport.is_crash) ? 'rgba(239, 68, 68, 0.18)' : 'rgba(34, 197, 94, 0.15)',
                        color: Boolean(selectedReport.is_crash) ? '#f87171' : '#4ade80',
                        border: Boolean(selectedReport.is_crash) ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(34, 197, 94, 0.3)',
                      }}
                    >
                      {Boolean(selectedReport.is_crash)
                        ? `CRASH (Exit: ${selectedReport.exit_code ?? 1})`
                        : selectedReport.trigger_reason}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>v{selectedReport.launcher_version}</span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '3px' }}>
                    {t('telemetry.label_profile_name', 'Perfil:')}{' '}
                    <strong style={{ color: '#cbd5e1' }}>{selectedReport.profile_name || 'Default'}</strong> •{' '}
                    {selectedReport.game_version || 'N/A'}
                    {selectedReport.mod_loader ? ` (${selectedReport.mod_loader})` : ''} • {formatDate(selectedReport.created_at)}
                  </div>
                </div>

                {/* Square Action Buttons (34px x 34px) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn-icon-sq btn-blue"
                    title={t('telemetry.copy_hint', 'Copiar reporte técnico formateado')}
                    onClick={handleCopyMarkdown}
                  >
                    <i className="fas fa-copy"></i>
                  </button>

                  <button
                    type="button"
                    className="btn-icon-sq btn-success"
                    title={
                      selectedReport.r2_log_key
                        ? t('telemetry.download_hint', 'Descargar paquete R2 (.json.gz)')
                        : t('telemetry.no_r2_available', 'No hay archivo R2 disponible')
                    }
                    onClick={handleDownloadR2}
                    disabled={!selectedReport.r2_log_key}
                  >
                    <i className="fas fa-download"></i>
                  </button>

                  <button
                    type="button"
                    className="btn-icon-sq btn-danger"
                    title={t('telemetry.delete_hint', 'Eliminar reporte permanentemente')}
                    onClick={handleDeleteReport}
                  >
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </div>
              </div>

              {/* Navigation Tabs Row (Equal Heights: 32px) */}
              <div
                style={{
                  padding: '8px 18px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexWrap: 'wrap',
                  flexShrink: 0,
                }}
              >
                {/* Detalles Técnicos Tab */}
                <button
                  type="button"
                  onClick={() => setActiveLogTab('details')}
                  style={{
                    height: '32px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    boxSizing: 'border-box',
                    background: activeLogTab === 'details' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    border: activeLogTab === 'details' ? '1px solid rgba(56, 189, 248, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: activeLogTab === 'details' ? '#38bdf8' : '#cbd5e1',
                  }}
                >
                  <i className="fas fa-sliders-h" style={{ marginRight: '6px' }}></i>
                  {t('telemetry.tab_details', 'Detalles Técnicos')}
                </button>

                {/* Crash Report Tab (strict boolean guard — never renders 0!) */}
                {hasCrashTab && (
                  <button
                    type="button"
                    onClick={() => setActiveLogTab('crash')}
                    style={{
                      height: '32px',
                      padding: '0 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      boxSizing: 'border-box',
                      background: activeLogTab === 'crash' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.08)',
                      border: activeLogTab === 'crash' ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(239, 68, 68, 0.2)',
                      color: '#f87171',
                    }}
                  >
                    <i className="fas fa-exclamation-triangle" style={{ marginRight: '6px' }}></i>
                    {t('telemetry.tab_crash', 'Crash Report')}
                  </button>
                )}

                {/* Minecraft Logs */}
                <button
                  type="button"
                  onClick={() => setActiveLogTab('minecraft')}
                  style={{
                    height: '32px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    boxSizing: 'border-box',
                    background: activeLogTab === 'minecraft' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    border: activeLogTab === 'minecraft' ? '1px solid rgba(56, 189, 248, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: activeLogTab === 'minecraft' ? '#38bdf8' : '#cbd5e1',
                  }}
                >
                  <i className="fas fa-cube" style={{ marginRight: '6px' }}></i>
                  {t('telemetry.tab_minecraft', 'Minecraft Logs')}
                </button>

                {/* Terminal Launcher */}
                <button
                  type="button"
                  onClick={() => setActiveLogTab('terminal')}
                  style={{
                    height: '32px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    boxSizing: 'border-box',
                    background: activeLogTab === 'terminal' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    border: activeLogTab === 'terminal' ? '1px solid rgba(56, 189, 248, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: activeLogTab === 'terminal' ? '#38bdf8' : '#cbd5e1',
                  }}
                >
                  <i className="fas fa-terminal" style={{ marginRight: '6px' }}></i>
                  {t('telemetry.tab_terminal', 'Terminal Launcher')}
                </button>

                {/* Consola JS */}
                <button
                  type="button"
                  onClick={() => setActiveLogTab('renderer')}
                  style={{
                    height: '32px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    boxSizing: 'border-box',
                    background: activeLogTab === 'renderer' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    border: activeLogTab === 'renderer' ? '1px solid rgba(56, 189, 248, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: activeLogTab === 'renderer' ? '#38bdf8' : '#cbd5e1',
                  }}
                >
                  <i className="fas fa-code" style={{ marginRight: '6px' }}></i>
                  {t('telemetry.tab_renderer', 'Consola JS')}
                </button>
              </div>

              {/* Dedicated Log Filter Row (Positioned BELOW Navigation Tabs, Equal Heights: 32px) */}
              {activeLogTab !== 'details' && (
                <div
                  style={{
                    padding: '8px 18px',
                    background: 'rgba(0, 0, 0, 0.25)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexShrink: 0,
                  }}
                >
                  <div style={{ position: 'relative', flex: 1, height: '32px' }}>
                    <i
                      className="fas fa-filter"
                      style={{
                        position: 'absolute',
                        left: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '11px',
                        color: '#64748b',
                      }}
                    ></i>
                    <input
                      type="text"
                      placeholder={t('telemetry.filter_lines_placeholder', 'Filtrar líneas...')}
                      value={logFilterQuery}
                      onChange={(e) => setLogFilterQuery(e.target.value)}
                      style={{
                        width: '100%',
                        height: '32px',
                        padding: logFilterQuery ? '0 30px 0 28px' : '0 10px 0 28px',
                        background: 'rgba(0, 0, 0, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '6px',
                        color: '#f8fafc',
                        fontSize: '12px',
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                    {Boolean(logFilterQuery) && (
                      <button
                        type="button"
                        onClick={() => setLogFilterQuery('')}
                        title={t('telemetry.clear_filter', 'Limpiar filtro')}
                        style={{
                          position: 'absolute',
                          right: '6px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          padding: '4px',
                          fontSize: '11px',
                        }}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    )}
                  </div>

                  {/* Line count pill (Height: 32px) */}
                  <div
                    style={{
                      height: '32px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#94a3b8',
                      fontSize: '11.5px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      whiteSpace: 'nowrap',
                      boxSizing: 'border-box',
                    }}
                  >
                    {logFilterQuery.trim()
                      ? `${activeLogContent.length} / ${totalLogLines} ${t('telemetry.lines_count', 'líneas')}`
                      : `${totalLogLines} ${t('telemetry.lines_count', 'líneas')}`}
                  </div>

                  {/* Copy Visible Log button (32px x 32px square) */}
                  <button
                    type="button"
                    className="btn-icon-sq btn-blue"
                    style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px', maxWidth: '32px', maxHeight: '32px' }}
                    title={t('telemetry.copy_log_hint', 'Copiar log visible')}
                    onClick={handleCopyVisibleLog}
                  >
                    <i className="fas fa-copy"></i>
                  </button>
                </div>
              )}

              {/* Main Content Area */}
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 20px', background: '#0b0f19' }}>
                {isLoadingLogs ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#38bdf8', gap: '10px' }}>
                    <i className="fas fa-spinner fa-spin"></i>
                    <span>{t('telemetry.loading_logs', 'Cargando paquete completo de logs desde Cloudflare R2...')}</span>
                  </div>
                ) : activeLogTab === 'details' ? (
                  /* ========================================================
                     DETALLES TÉCNICOS TAB
                     ======================================================== */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* 1. Grid de Especificaciones Técnicas */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '14px',
                      }}
                    >
                      {/* Card: Usuario & Cuenta */}
                      <div
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '8px',
                          padding: '14px 16px',
                        }}
                      >
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <i className="fas fa-user-shield"></i>
                          <span>{t('telemetry.section_account', 'Usuario y Cuenta')}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', fontSize: '12px', color: '#cbd5e1' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#94a3b8' }}>{t('telemetry.label_username', 'Nombre de Usuario:')}</span>
                            <strong style={{ color: '#f8fafc' }}>{selectedReport.username}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#94a3b8' }}>{t('telemetry.label_account_id', 'ID de Cuenta:')}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <code
                                style={{ fontSize: '11px', background: 'rgba(0,0,0,0.35)', padding: '2px 6px', borderRadius: '4px', color: '#93c5fd' }}
                                title={resolvedAccountId || 'N/A'}
                              >
                                {resolvedAccountId
                                  ? resolvedAccountId.length > 18
                                    ? `${resolvedAccountId.slice(0, 18)}…`
                                    : resolvedAccountId
                                  : 'N/A'}
                              </code>
                              {Boolean(resolvedAccountId) && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(resolvedAccountId || '', 'ID')}
                                  title={t('telemetry.copy_id_hint', 'Copiar ID')}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#64748b',
                                    cursor: 'pointer',
                                    padding: '2px 4px',
                                  }}
                                >
                                  <i className="fas fa-copy"></i>
                                </button>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#94a3b8' }}>{t('telemetry.label_account_type', 'Tipo de Cuenta:')}</span>
                            <span
                              style={{
                                fontSize: '11px',
                                padding: '1px 7px',
                                borderRadius: '4px',
                                background: selectedReport.account_type === 'microsoft' ? 'rgba(14, 165, 233, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                color: selectedReport.account_type === 'microsoft' ? '#38bdf8' : '#94a3b8',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                              }}
                            >
                              {selectedReport.account_type === 'microsoft' ? 'Microsoft' : 'Offline'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#94a3b8' }}>{t('telemetry.label_launcher_version', 'Versión del Launcher:')}</span>
                            <span style={{ color: '#cbd5e1' }}>v{selectedReport.launcher_version}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card: Perfil e Instalación */}
                      <div
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '8px',
                          padding: '14px 16px',
                        }}
                      >
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#c084fc', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <i className="fas fa-gamepad"></i>
                          <span>{t('telemetry.section_profile', 'Perfil e Instalación')}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', fontSize: '12px', color: '#cbd5e1' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#94a3b8' }}>{t('telemetry.label_profile_name', 'Nombre de Perfil:')}</span>
                            <strong style={{ color: '#f8fafc' }}>{selectedReport.profile_name || 'Default'}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#94a3b8' }}>{t('telemetry.label_game_version', 'Versión de Minecraft:')}</span>
                            <span style={{ color: '#38bdf8', fontWeight: 600 }}>{selectedReport.game_version || 'N/A'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#94a3b8' }}>{t('telemetry.label_mod_loader', 'Mod Loader:')}</span>
                            <span style={{ color: '#c084fc', fontWeight: 600 }}>{selectedReport.mod_loader || 'Vanilla'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#94a3b8' }}>{t('telemetry.label_jvm_ram', 'RAM Asignada (JVM):')}</span>
                            <span style={{ color: '#fbbf24' }}>
                              {(selectedReport.allocated_ram_mb ?? 0) > 0
                                ? `${selectedReport.allocated_ram_mb} MB (${Math.round((selectedReport.allocated_ram_mb || 0) / 1024)} GB)`
                                : '4096 MB (4 GB)'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#94a3b8' }}>{t('telemetry.label_directory', 'Directorio:')}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                              <code
                                style={{
                                  fontSize: '11px',
                                  color: '#94a3b8',
                                  maxWidth: '165px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={resolvedInstanceDir}
                              >
                                {resolvedInstanceDir}
                              </code>
                              <button
                                type="button"
                                onClick={() => handleCopyText(resolvedInstanceDir, t('telemetry.label_directory', 'Directorio'))}
                                title={t('telemetry.copy_path_hint', 'Copiar ruta')}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#64748b',
                                  cursor: 'pointer',
                                  padding: '2px 4px',
                                }}
                              >
                                <i className="fas fa-copy"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card: Hardware y Sistema (PC) */}
                      <div
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '8px',
                          padding: '14px 16px',
                        }}
                      >
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#4ade80', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <i className="fas fa-microchip"></i>
                          <span>{t('telemetry.section_system', 'Hardware y Sistema (PC)')}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', fontSize: '12px', color: '#cbd5e1' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#94a3b8' }}>{t('telemetry.label_os', 'Sistema Operativo:')}</span>
                            <span style={{ color: '#f8fafc', textAlign: 'right' }}>
                              {selectedReport.os_distro || selectedReport.os_platform || 'SO'} ({selectedReport.os_arch || 'x64'})
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#94a3b8' }}>{t('telemetry.label_cpu', 'Procesador (CPU):')}</span>
                            <span style={{ color: '#cbd5e1', textAlign: 'right' }}>
                              {selectedReport.cpu_model || 'CPU'} ({selectedReport.cpu_cores || '?'}c)
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#94a3b8' }}>{t('telemetry.label_ram', 'Memoria RAM:')}</span>
                            <span style={{ color: '#cbd5e1' }}>
                              {selectedReport.total_ram_gb || '?'} GB ({selectedReport.free_ram_gb || '?'} GB libre)
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#94a3b8' }}>{t('telemetry.label_gpu', 'Tarjeta Gráfica (GPU):')}</span>
                            <span style={{ color: '#cbd5e1', textAlign: 'right' }}>{selectedReport.gpu_renderer || 'Default'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#94a3b8' }}>{t('telemetry.label_ip', 'IP / Ubicación:')}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ color: '#10b981', fontSize: '11.5px' }}>
                                {selectedReport.ip_address || 'N/A'} • {selectedReport.ip_country || '?'}
                                {selectedReport.ip_city ? `, ${selectedReport.ip_city}` : ''}
                              </span>
                              {Boolean(selectedReport.ip_address) && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(selectedReport.ip_address || '', 'IP')}
                                  title={t('telemetry.copy_id_hint', 'Copiar IP')}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#64748b',
                                    cursor: 'pointer',
                                    padding: '2px 4px',
                                  }}
                                >
                                  <i className="fas fa-copy"></i>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card: Estado del Evento */}
                      <div
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '8px',
                          padding: '14px 16px',
                        }}
                      >
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#fbbf24', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <i className="fas fa-tachometer-alt"></i>
                          <span>{t('telemetry.section_event', 'Estado del Evento')}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', fontSize: '12px', color: '#cbd5e1' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#94a3b8' }}>{t('telemetry.label_report_id', 'ID del Reporte:')}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <code style={{ fontSize: '11px', background: 'rgba(0,0,0,0.35)', padding: '2px 6px', borderRadius: '4px', color: '#94a3b8' }}>
                                {selectedReport.id.slice(0, 14)}…
                              </code>
                              <button
                                type="button"
                                onClick={() => handleCopyText(selectedReport.id, 'Report ID')}
                                title={t('telemetry.copy_id_hint', 'Copiar ID')}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#64748b',
                                  cursor: 'pointer',
                                  padding: '2px 4px',
                                }}
                              >
                                <i className="fas fa-copy"></i>
                              </button>
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#94a3b8' }}>{t('telemetry.label_trigger', 'Motivo del Reporte:')}</span>
                            <span
                              style={{
                                color: Boolean(selectedReport.is_crash) ? '#f87171' : '#4ade80',
                                fontWeight: 600,
                              }}
                            >
                              {selectedReport.trigger_reason}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#94a3b8' }}>{t('telemetry.label_exit_code', 'Código de Salida:')}</span>
                            <span
                              style={{
                                color: resolvedExitCode === 0 && !Boolean(selectedReport.is_crash) ? '#4ade80' : '#f87171',
                                fontWeight: 600,
                              }}
                            >
                              {resolvedExitCode}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#94a3b8' }}>{t('telemetry.label_timestamp', 'Fecha y Hora:')}</span>
                            <span style={{ color: '#94a3b8', fontSize: '11.5px' }}>{new Date(selectedReport.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 2. Sección de Complementos & Addons del Perfil (Estilo lista de perfil con Modrinth hydration) */}
                    <div style={{ marginTop: '4px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '12px',
                          flexWrap: 'wrap',
                          gap: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                            <i className="fas fa-boxes" style={{ color: '#38bdf8', marginRight: '8px' }}></i>
                            {t('telemetry.section_addons', 'Complementos y Add-ons del Perfil')}
                          </span>
                          <span
                            style={{
                              height: '22px',
                              fontSize: '11px',
                              padding: '0 8px',
                              borderRadius: '10px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              color: '#cbd5e1',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                          >
                            Total: {unifiedAddonsList.length}
                          </span>
                          {isHydratingAddons && (
                            <span style={{ fontSize: '11.5px', color: '#38bdf8', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <i className="fas fa-spinner fa-spin"></i>
                              {t('telemetry.hydrating_addons', 'Resolviendo metadatos...')}
                            </span>
                          )}
                        </div>

                        {/* Search in Addons (Height: 32px) */}
                        <div style={{ position: 'relative', width: '240px', height: '32px' }}>
                          <i
                            className="fas fa-search"
                            style={{
                              position: 'absolute',
                              left: '10px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: '11px',
                              color: '#64748b',
                            }}
                          ></i>
                          <input
                            type="text"
                            placeholder={t('telemetry.filter_addons_placeholder', 'Filtrar complementos...')}
                            value={addonSearchQuery}
                            onChange={(e) => setAddonSearchQuery(e.target.value)}
                            style={{
                              width: '100%',
                              height: '32px',
                              padding: '0 10px 0 28px',
                              background: 'rgba(0, 0, 0, 0.35)',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              borderRadius: '6px',
                              color: '#f8fafc',
                              fontSize: '11.5px',
                              boxSizing: 'border-box',
                              outline: 'none',
                            }}
                          />
                        </div>
                      </div>

                      {/* Addon Subfilter Pills (Equal Heights: 28px) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        {[
                          { key: 'all', label: t('telemetry.filter_all', 'Todos'), count: unifiedAddonsList.length },
                          { key: 'mod', label: t('telemetry.filter_mods', 'Mods'), count: unifiedAddonsList.filter((a) => a.type === 'mod').length },
                          {
                            key: 'resourcepack',
                            label: t('telemetry.filter_resourcepacks', 'Resource Packs'),
                            count: unifiedAddonsList.filter((a) => a.type === 'resourcepack').length,
                          },
                          {
                            key: 'shader',
                            label: t('telemetry.filter_shaders', 'Shaders'),
                            count: unifiedAddonsList.filter((a) => a.type === 'shader').length,
                          },
                          {
                            key: 'datapack',
                            label: t('telemetry.filter_datapacks', 'Data Packs'),
                            count: unifiedAddonsList.filter((a) => a.type === 'datapack').length,
                          },
                        ].map((btn) => (
                          <button
                            key={btn.key}
                            type="button"
                            onClick={() => setAddonCategoryFilter(btn.key as any)}
                            style={{
                              height: '28px',
                              padding: '0 10px',
                              borderRadius: '5px',
                              fontSize: '11.5px',
                              fontWeight: 500,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              background: addonCategoryFilter === btn.key ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                              border: addonCategoryFilter === btn.key ? '1px solid rgba(56, 189, 248, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
                              color: addonCategoryFilter === btn.key ? '#38bdf8' : '#94a3b8',
                              boxSizing: 'border-box',
                            }}
                          >
                            <span>{btn.label}</span>
                            <span style={{ fontSize: '10px', opacity: 0.7 }}>({btn.count})</span>
                          </button>
                        ))}
                      </div>

                      {/* Addons List rendered with launcher's exact .mod-list-item styling + Modrinth Rich Metadata */}
                      {filteredAddons.length === 0 ? (
                        <div
                          style={{
                            padding: '30px 10px',
                            textAlign: 'center',
                            color: '#64748b',
                            fontSize: '13px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                          }}
                        >
                          <i className="fas fa-box-open" style={{ fontSize: '26px', display: 'block', marginBottom: '8px', opacity: 0.5 }}></i>
                          {t('telemetry.no_addons_detected', 'No se detectaron complementos en este perfil.')}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {filteredAddons.map((addon, idx) => {
                            const itemKey = `${addon.type}:${addon.filename.toLowerCase()}`;
                            const meta = hydratedMetaMap[itemKey];
                            const parsed = parseAddonFilename(addon.filename);
                            const displayTitle = meta?.title || addon.name || parsed.displayName;
                            const displayVersion = meta?.version_number || addon.version_number || parsed.parsedVersion;
                            const projectId = meta?.project_id || addon.project_id || undefined;
                            const iconUrl = meta?.icon_url || addon.icon_url || null;
                            const isClickable = Boolean(projectId);

                            return (
                              <div
                                key={`${itemKey}-${idx}`}
                                className={`mod-list-item ${addon.is_disabled ? 'disabled' : ''} ${addon.missing ? 'missing-file' : ''}`}
                              >
                                <div
                                  className={`mod-list-icon ${isClickable ? 'clickable' : ''}`}
                                  onClick={() => isClickable && handleOpenModDetails(projectId)}
                                  title={isClickable ? t('mods_menu.view_details', 'Ver detalles') : undefined}
                                >
                                  {iconUrl ? (
                                    <img
                                      src={iconUrl}
                                      alt={displayTitle}
                                      style={{ width: '100%', height: '100%', borderRadius: '6px', objectFit: 'cover' }}
                                    />
                                  ) : (
                                    <i className={addon.missing ? 'fas fa-exclamation-triangle' : getAddonIcon(addon.type)}></i>
                                  )}
                                </div>

                                <div className="mod-list-info">
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '3px' }}>
                                    <div
                                      className={`mod-list-name ${isClickable ? 'clickable' : ''}`}
                                      style={{ marginBottom: 0 }}
                                      onClick={() => isClickable && handleOpenModDetails(projectId)}
                                      title={meta?.description || displayTitle}
                                    >
                                      {displayTitle}
                                    </div>
                                    {Boolean(displayVersion) && (
                                      <span
                                        style={{
                                          fontSize: '11px',
                                          fontFamily: "Consolas, 'Fira Code', monospace",
                                          padding: '1px 7px',
                                          borderRadius: '4px',
                                          background: 'rgba(56, 189, 248, 0.12)',
                                          border: '1px solid rgba(56, 189, 248, 0.25)',
                                          color: '#7dd3fc',
                                          fontWeight: 500,
                                        }}
                                      >
                                        v{displayVersion}
                                      </span>
                                    )}
                                  </div>
                                  <div className="mod-list-details" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <span style={{ color: '#94a3b8' }}>{addon.filename}</span>
                                    <span>•</span>
                                    <span>{formatFileSize(addon.size_bytes)}</span>
                                    <span>•</span>
                                    <span style={{ color: addon.is_disabled ? '#94a3b8' : '#4ade80' }}>
                                      {addon.is_disabled ? t('telemetry.addon_disabled', 'Desactivado') : t('telemetry.addon_active', 'Activo')}
                                    </span>
                                    <span>•</span>
                                    <span>{getAddonTypeLabel(addon.type)}</span>
                                    {Boolean(addon.world_name) && (
                                      <>
                                        <span>•</span>
                                        <span style={{ color: '#c084fc' }}>{addon.world_name}</span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <div className="mod-list-actions" style={{ gap: '6px', flexShrink: 0 }}>
                                  {Boolean(projectId) && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopyText(projectId || '', 'Mod ID');
                                      }}
                                      title={t('telemetry.copy_id_hint', 'Copiar ID')}
                                      style={{
                                        height: '24px',
                                        padding: '0 8px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontFamily: "Consolas, 'Fira Code', monospace",
                                        background: 'rgba(0, 0, 0, 0.35)',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        color: '#93c5fd',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                      }}
                                    >
                                      <span>ID: {projectId}</span>
                                      <i className="fas fa-copy" style={{ fontSize: '9px', opacity: 0.7 }}></i>
                                    </button>
                                  )}

                                  {Boolean(addon.missing) && (
                                    <span
                                      style={{
                                        height: '24px',
                                        fontSize: '11px',
                                        padding: '0 8px',
                                        borderRadius: '4px',
                                        background: 'rgba(239, 68, 68, 0.15)',
                                        color: '#f87171',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                      }}
                                    >
                                      {t('telemetry.addon_missing', 'Faltante')}
                                    </span>
                                  )}

                                  <span
                                    style={{
                                      height: '24px',
                                      fontSize: '11px',
                                      padding: '0 8px',
                                      borderRadius: '4px',
                                      background: addon.is_managed ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                      color: addon.is_managed ? '#38bdf8' : '#94a3b8',
                                      border: addon.is_managed
                                        ? '1px solid rgba(56, 189, 248, 0.25)'
                                        : '1px solid rgba(255, 255, 255, 0.08)',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                    }}
                                  >
                                    {addon.is_managed ? t('telemetry.addon_managed', 'Gestionado') : t('telemetry.addon_manual', 'Manual')}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* ========================================================
                     LOG VIEW (Crash / Minecraft / Terminal / Renderer)
                     ======================================================== */
                  <pre
                    style={{
                      margin: 0,
                      fontFamily: "Consolas, 'Fira Code', 'Courier New', monospace",
                      fontSize: '12px',
                      lineHeight: '1.6',
                      color: '#e2e8f0',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}
                  >
                    {activeLogContent.map((line, idx) => {
                      const isErr =
                        line.includes('[stderr]') || line.includes('Exception') || line.includes('Error') || line.includes('CRASH');
                      const isWarn = line.includes('[warn]') || line.includes('Warning') || line.includes('WARN');
                      const isInfo = line.includes('[stdout]') || line.includes('[info]') || line.includes('INFO');
                      const color = isErr ? '#f87171' : isWarn ? '#fbbf24' : isInfo ? '#cbd5e1' : '#94a3b8';

                      return (
                        <div key={idx} style={{ color }}>
                          <span style={{ color: '#475569', userSelect: 'none', marginRight: '10px', fontSize: '11px' }}>
                            {String(idx + 1).padStart(4, ' ')}
                          </span>
                          {line}
                        </div>
                      );
                    })}
                  </pre>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TelemetryView;
