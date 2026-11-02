/**
 * Workshop skeleton markup — SINGLE SOURCE OF TRUTH.
 *
 * Used by:
 *  - WorkshopSection.tsx (first paint, via dangerouslySetInnerHTML)
 *  - workshop.js (dynamic re-injection, via window.wkSkeleton)
 *
 * The skeletons deliberately reuse the exact same wrapper classes as the real cards
 * (.wk-card-header, .wk-card-desc, .wk-card-actions-row, .mod-card-stats …). All
 * geometry (52px header, 58px description, 38px buttons …) is fixed in CSS for those
 * classes, so a skeleton and its real card are the same box down to the pixel.
 */

export type WkSkeletonContext = 'public' | 'mine' | 'modrinth';

export interface WkSkeletonCounts {
  official: number;
  community: number;
  modrinth: number;
  mine: number;
}

const readCount = (key: string, fallback: number, max: number): number => {
  try {
    const v = parseInt(localStorage.getItem(key) || '', 10);
    if (isFinite(v) && v > 0) return Math.min(v, max);
  } catch (_) {
    /* storage unavailable */
  }
  return fallback;
};

/** Skeleton counts mirror what the last session actually rendered (capped to keep it cheap). */
export const getInitialSkeletonCounts = (): WkSkeletonCounts => ({
  official: readCount('wk_count_official', 2, 8),
  community: readCount('wk_count_community', 4, 12),
  modrinth: readCount('wk_count_modrinth', 8, 12),
  mine: readCount('wk_count_my', 0, 6),
});

const bar = (width: string, height: number, radius = 4, extra = ''): string =>
  `<div class="wk-sk-bar wk-skeleton-shimmer" style="width:${width};height:${height}px;border-radius:${radius}px;${extra}"></div>`;

const publicCard = (cls: string): string =>
  `<div class="wk-card wk-card-skeleton ${cls}" aria-hidden="true">` +
  `<div class="wk-card-header">` +
  `<div class="wk-card-icon wk-skeleton-shimmer"></div>` +
  `<div class="wk-card-title-wrap">${bar('68%', 16, 6, 'margin-bottom:6px;')}${bar('42%', 12)}</div>` +
  bar('52px', 22, 6, 'flex-shrink:0;') +
  `</div>` +
  `<div class="wk-card-desc wk-skeleton-lines">${bar('100%', 12)}${bar('85%', 12)}${bar('45%', 12)}</div>` +
  `<div class="wk-card-actions">` +
  `<div class="wk-card-actions-row"><div class="wk-sk-btn wk-skeleton-shimmer"></div></div>` +
  `<div class="wk-card-actions-row"><div class="wk-sk-btn wk-skeleton-shimmer"></div><div class="wk-sk-btn sq wk-skeleton-shimmer"></div></div>` +
  `</div>` +
  `</div>`;

const mineCard = (cls: string): string =>
  `<div class="wk-card wk-card-skeleton wk-card-mine ${cls}" aria-hidden="true">` +
  `<div class="wk-sk-pill wk-skeleton-shimmer"></div>` +
  `<div class="wk-card-header">` +
  `<div class="wk-card-icon wk-skeleton-shimmer"></div>` +
  `<div class="wk-card-title-wrap">${bar('68%', 16, 6, 'margin-bottom:6px;')}${bar('42%', 12)}</div>` +
  `</div>` +
  `<div class="wk-card-desc wk-skeleton-lines">${bar('100%', 12)}${bar('85%', 12)}${bar('45%', 12)}</div>` +
  `<div class="wk-card-stats-block">` +
  [60, 50, 40]
    .map((w) => `<div class="wk-card-stat-line">${bar('16px', 12)}${bar(w + '%', 12)}</div>`)
    .join('') +
  `</div>` +
  `<div class="wk-card-actions">` +
  `<div class="wk-card-actions-row"><div class="wk-sk-btn wk-skeleton-shimmer"></div></div>` +
  `<div class="wk-card-actions-admin-row"><div class="wk-sk-btn wk-skeleton-shimmer"></div></div>` +
  `</div>` +
  `</div>`;

const modrinthCard = (cls: string): string =>
  `<div class="mod-card mod-card-skeleton ${cls}" aria-hidden="true">` +
  `<div class="mod-card-header">` +
  `<div class="mod-card-icon wk-skeleton-shimmer"></div>` +
  `<div class="mod-card-info">${bar('75%', 16, 6, 'margin-bottom:6px;')}${bar('45%', 12)}</div>` +
  `</div>` +
  `<div class="mod-card-description wk-skeleton-lines">${bar('100%', 12)}${bar('75%', 12)}</div>` +
  `<div class="mod-card-stats"><div class="mod-card-stat">${bar('56px', 12)}</div></div>` +
  `<div class="mod-card-categories">${bar('56px', 22, 12)}${bar('64px', 22, 12)}${bar('50px', 22, 12)}</div>` +
  `<div class="mod-card-actions"><div class="wk-sk-btn wk-skeleton-shimmer"></div></div>` +
  `</div>`;

/**
 * @param animated  true => skeletons fade in (use only when injected while the section is visible;
 *                  the first-paint skeletons ride on the section's own entrance animation).
 */
export const buildSkeletonHTML = (
  count: number,
  context: WkSkeletonContext = 'public',
  animated = false,
): string => {
  const n = Math.max(0, Math.floor(count));
  const cls = animated ? 'wk-sk-appear' : '';
  const make = context === 'modrinth' ? modrinthCard : context === 'mine' ? mineCard : publicCard;
  let html = '';
  for (let i = 0; i < n; i++) html += make(cls);
  return html;
};

if (typeof window !== 'undefined') {
  (window as any).wkSkeleton = { buildSkeletonHTML, getInitialSkeletonCounts };
}
