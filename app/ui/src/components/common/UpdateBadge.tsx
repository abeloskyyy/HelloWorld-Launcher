import React, { useEffect, useState } from 'react';

interface UpdateEventData {
  version: string;
  isMandatory?: boolean;
  filePath?: string;
  progress?: number;
}

function compareSemver(v1: string, v2: string): number {
  const parse = (s: string) =>
    String(s || '0.0.0')
      .replace(/^v/i, '')
      .split('-')[0]
      .split('.')
      .map((n) => parseInt(n, 10) || 0);
  const p1 = parse(v1);
  const p2 = parse(v2);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const a = p1[i] || 0;
    const b = p2[i] || 0;
    if (a !== b) return a > b ? 1 : -1;
  }
  return 0;
}

function tr(key: string, fallback: string): string {
  const fn = (window as any).t;
  if (typeof fn !== 'function') return fallback;
  const val = fn(key);
  return val && val !== key ? val : fallback;
}

export const UpdateBadge: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<'downloading' | 'ready' | 'installing'>('downloading');
  const [progress, setProgress] = useState(0);
  const [version, setVersion] = useState('');
  const [filePath, setFilePath] = useState<string | null>(null);
  const [isMandatory, setIsMandatory] = useState(false);
  const [, setLangTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const restorePersistedState = async () => {
      const win = window as any;
      let preVersion = '';
      let prePath = win._currentUpdateDownloadedPath || null;
      let preMandatory = false;

      if (!prePath) {
        try {
          prePath = localStorage.getItem('hw_downloaded_update_path');
          preVersion = localStorage.getItem('hw_downloaded_update_version') || '';
        } catch (_) {}
      }

      if (win._currentUpdateState) {
        preVersion = win._currentUpdateState.latestVersion || preVersion;
        preMandatory = Boolean(win._currentUpdateState.isMandatory);
      }

      if (!prePath) return;

      // Verify current launcher version before restoring a persisted ready badge (prevents stale badge after Setup updates)
      let currentVersion: string = win.APP_VERSION || '';
      try {
        const api = win.hwlAPI || win.api;
        if (api && typeof api.get_launcher_version === 'function') {
          const v = await api.get_launcher_version();
          if (v) currentVersion = v;
        }
      } catch (_) {}

      if (cancelled) return;

      if (currentVersion && (!preVersion || compareSemver(currentVersion, preVersion) >= 0)) {
        try {
          localStorage.removeItem('hw_downloaded_update_version');
          localStorage.removeItem('hw_downloaded_update_path');
          localStorage.removeItem('hw_update_auto_attempt');
        } catch (_) {}
        win._currentUpdateDownloadedPath = null;
        return;
      }

      setVisible(true);
      setStatus('ready');
      setProgress(100);
      if (preVersion) setVersion(preVersion);
      setFilePath(prePath);
      setIsMandatory(preMandatory);
    };

    restorePersistedState();

    // Listen for custom events dispatched by the update engine
    const handleUpdateAvailable = (e: any) => {
      const data: UpdateEventData = e.detail || {};
      setVisible(true);
      setStatus('downloading');
      setProgress(0);
      setVersion(data.version || '');
      setIsMandatory(Boolean(data.isMandatory));
    };

    const handleUpdateProgress = (e: any) => {
      const data = e.detail || {};
      setVisible(true);
      if (typeof data.percent === 'number') {
        setProgress(Math.min(100, Math.max(0, data.percent)));
      }
      if (data.version) {
        setVersion((prev) => prev || data.version);
      }
    };

    const handleUpdateReady = (e: any) => {
      const data: UpdateEventData = e.detail || {};
      setVisible(true);
      setProgress(100);
      if (data.version) setVersion(data.version);
      if (data.filePath) setFilePath(data.filePath);
      if (data.isMandatory !== undefined) setIsMandatory(Boolean(data.isMandatory));
      setStatus('ready');
    };

    const handleUpdateInstalling = () => {
      setVisible(true);
      setProgress(100);
      setStatus('installing');
    };

    const handleUpdateFailed = () => {
      setStatus('ready');
    };

    const handleUpdateCleared = () => {
      setVisible(false);
    };

    const handleLanguageChanged = () => {
      setLangTick((t) => t + 1);
    };

    window.addEventListener('hwl:update-available', handleUpdateAvailable);
    window.addEventListener('hwl:update-progress', handleUpdateProgress);
    window.addEventListener('hwl:update-ready', handleUpdateReady);
    window.addEventListener('hwl:update-installing', handleUpdateInstalling);
    window.addEventListener('hwl:update-failed', handleUpdateFailed);
    window.addEventListener('hwl:update-cleared', handleUpdateCleared);
    window.addEventListener('language-changed', handleLanguageChanged);

    // Exponer API global para scripts legacy
    (window as any).hwlUpdateBadge = {
      show: (data: UpdateEventData) => {
        setVisible(true);
        setStatus('downloading');
        if (data.version) setVersion(data.version);
        if (data.isMandatory !== undefined) setIsMandatory(Boolean(data.isMandatory));
      },
      setProgress: (pct: number) => {
        setProgress(Math.min(100, Math.max(0, pct)));
      },
      setReady: (data: UpdateEventData) => {
        setVisible(true);
        setStatus('ready');
        setProgress(100);
        if (data.version) setVersion(data.version);
        if (data.filePath) setFilePath(data.filePath);
      },
      hide: () => setVisible(false),
    };

    return () => {
      cancelled = true;
      window.removeEventListener('hwl:update-available', handleUpdateAvailable);
      window.removeEventListener('hwl:update-progress', handleUpdateProgress);
      window.removeEventListener('hwl:update-ready', handleUpdateReady);
      window.removeEventListener('hwl:update-installing', handleUpdateInstalling);
      window.removeEventListener('hwl:update-failed', handleUpdateFailed);
      window.removeEventListener('hwl:update-cleared', handleUpdateCleared);
      window.removeEventListener('language-changed', handleLanguageChanged);
    };
  }, []);

  const handleClick = () => {
    if (status === 'installing') return;

    if (status === 'ready') {
      setStatus('installing');
      const win = window as any;
      if (typeof win.hwlApplyDownloadedUpdate === 'function') {
        win.hwlApplyDownloadedUpdate(filePath);
      }
    }
    // No modal al hacer clic durante la descarga
  };

  if (!visible) return null;

  const radius = 15;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const titleText =
    status === 'installing'
      ? tr('updater.badge_installing', 'Installing...')
      : status === 'ready'
      ? tr('updater.badge_ready', 'Update Ready!')
      : tr('updater.badge_downloading', 'Downloading update...');

  const subText =
    status === 'installing'
      ? tr('updater.badge_restarting', 'Restarting launcher...')
      : status === 'ready'
      ? tr('updater.badge_click_restart', 'Click to restart & apply')
      : `${progress}% · v${version || 'new'}`;

  return (
    <div
      id="updateDockBadge"
      className={`update-dock-badge status-${status} ${status === 'ready' ? 'pulse-attention' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      title={status === 'ready' ? tr('updater.badge_click_restart', 'Click to restart') : `${titleText} (${progress}%)`}
    >
      <div className="update-dock-progress-ring">
        <svg className="progress-ring-svg" width="38" height="38" viewBox="0 0 38 38">
          <circle
            className="progress-ring-circle-bg"
            cx="19"
            cy="19"
            r={radius}
            fill="transparent"
            strokeWidth="3"
          />
          <circle
            className="progress-ring-circle"
            cx="19"
            cy="19"
            r={radius}
            fill="transparent"
            strokeWidth="3"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: strokeDashoffset,
            }}
          />
        </svg>

        <div className="update-dock-icon">
          {status === 'ready' ? (
            <i className="fas fa-check check-anim"></i>
          ) : status === 'installing' ? (
            <i className="fas fa-spinner fa-spin"></i>
          ) : (
            <i className="fas fa-arrow-down dl-anim"></i>
          )}
        </div>
      </div>

      <div className="update-dock-content">
        <div className="update-dock-title">
          <span>{titleText}</span>
          {isMandatory && <span className="update-dock-mandatory-tag">{tr('updater.mandatory', 'Mandatory')}</span>}
        </div>
        <div className="update-dock-subtitle">{subText}</div>
      </div>

      {status === 'ready' && (
        <div className="update-dock-action">
          <i className="fas fa-redo-alt ready-restart-icon"></i>
        </div>
      )}
    </div>
  );
};
