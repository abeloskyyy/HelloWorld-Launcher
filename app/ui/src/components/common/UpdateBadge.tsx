import React, { useEffect, useState } from 'react';

interface UpdateEventData {
  version: string;
  isMandatory?: boolean;
  filePath?: string;
  progress?: number;
}

export const UpdateBadge: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<'downloading' | 'ready' | 'installing'>('downloading');
  const [progress, setProgress] = useState(0);
  const [version, setVersion] = useState('');
  const [filePath, setFilePath] = useState<string | null>(null);
  const [isMandatory, setIsMandatory] = useState(false);

  useEffect(() => {
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
      if (data.version && !version) {
        setVersion(data.version);
      }
    };

    const handleUpdateReady = (e: any) => {
      const data: UpdateEventData = e.detail || {};
      setVisible(true);
      setStatus('ready');
      setProgress(100);
      if (data.version) setVersion(data.version);
      if (data.filePath) setFilePath(data.filePath);

      // Si es obligatoria, aplicar de inmediato
      if (data.isMandatory || isMandatory) {
        setStatus('installing');
        setTimeout(() => {
          const win = window as any;
          if (typeof win.hwlApplyDownloadedUpdate === 'function') {
            win.hwlApplyDownloadedUpdate();
          }
        }, 1200);
      }
    };

    window.addEventListener('hwl:update-available', handleUpdateAvailable);
    window.addEventListener('hwl:update-progress', handleUpdateProgress);
    window.addEventListener('hwl:update-ready', handleUpdateReady);

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
      window.removeEventListener('hwl:update-available', handleUpdateAvailable);
      window.removeEventListener('hwl:update-progress', handleUpdateProgress);
      window.removeEventListener('hwl:update-ready', handleUpdateReady);
    };
  }, [version, isMandatory]);

  const handleClick = () => {
    if (status === 'installing') return;

    if (status === 'ready') {
      setStatus('installing');
      const win = window as any;
      if (typeof win.hwlApplyDownloadedUpdate === 'function') {
        win.hwlApplyDownloadedUpdate();
      }
    } else {
      // Si aún está descargando, abrir el modal de detalles o información
      const win = window as any;
      if (typeof win.openUpdateModalIfAvailable === 'function') {
        win.openUpdateModalIfAvailable();
      }
    }
  };

  if (!visible) return null;

  const radius = 15;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const t = (window as any).t || ((k: string) => k);

  const titleText =
    status === 'installing'
      ? t('updater.badge_installing') || 'Installing...'
      : status === 'ready'
      ? t('updater.badge_ready') || 'Update Ready!'
      : t('updater.badge_downloading') || 'Downloading update...';

  const subText =
    status === 'installing'
      ? t('updater.badge_restarting') || 'Restarting launcher...'
      : status === 'ready'
      ? t('updater.badge_click_restart') || 'Click to restart & apply'
      : `${progress}% · v${version || 'new'}`;

  return (
    <div
      id="updateDockBadge"
      className={`update-dock-badge status-${status} ${status === 'ready' ? 'pulse-attention' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      title={status === 'ready' ? t('updater.badge_click_restart') || 'Click to restart' : `${titleText} (${progress}%)`}
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
          {isMandatory && <span className="update-dock-mandatory-tag">{t('updater.mandatory') || 'Mandatory'}</span>}
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
