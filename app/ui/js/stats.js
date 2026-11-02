// --- STREAK & STATS SYSTEM ---
function applyCachedStreak(username) {
    try {
        const cachedUser = localStorage.getItem('hw_cached_streak_user');
        if (cachedUser && cachedUser === username) {
            const count = localStorage.getItem('hw_cached_streak_count') || '0';
            const completed = localStorage.getItem('hw_cached_streak_completed') === '1';
            const streakCount = document.getElementById('streakCount');
            const streakBadgeContainer = document.getElementById('streakBadgeContainer');
            const statsBtn = document.getElementById('statsBtn');
            if (streakCount) streakCount.innerText = count;
            if (streakBadgeContainer) {
                const fireContainer = streakBadgeContainer.querySelector('.css-fire-container');
                if (fireContainer) fireContainer.style.opacity = completed ? '0.65' : '0';
                streakBadgeContainer.style.display = 'flex';
            }
            if (statsBtn) statsBtn.style.display = 'inline-flex';
        }
    } catch (_) {}
}
window.applyCachedStreak = applyCachedStreak;

async function loadMyStats() {
    const streakBadgeContainer = document.getElementById('streakBadgeContainer');
    const streakCount = document.getElementById('streakCount');
    const statsBtn = document.getElementById('statsBtn');
    try {
        if (!window.hwlAPI || !window.hwlAPI.get_user_json) return null;
        const userJson = await window.hwlAPI.get_user_json();
        if (userJson) {
            if (userJson.account_type === 'offline' || !userJson.username) {
                if (streakBadgeContainer) streakBadgeContainer.style.display = 'none';
                return null;
            }

            // Immediately apply cached streak to ensure zero flicker behind loader
            applyCachedStreak(userJson.username);

            const res = await window.hwlAPI.stats_get_my_stats();
            if (res && res.success && res.stats) {
                const targetStreak = res.stats.streak || 0;
                const currentStreak = parseInt(streakCount ? streakCount.innerText : '0') || 0;

                try {
                    localStorage.setItem('hw_cached_streak_user', userJson.username);
                    localStorage.setItem('hw_cached_streak_count', targetStreak.toString());
                    localStorage.setItem('hw_cached_streak_completed', res.stats.streakCompletedToday ? '1' : '0');
                } catch (_) {}

                const loader = document.getElementById('initialLoader');
                const isLoaderVisible = loader && !loader.classList.contains('hidden') && loader.style.display !== 'none';

                if (streakCount) {
                    if (currentStreak !== targetStreak && !isLoaderVisible) {
                        animateValue(streakCount, currentStreak, targetStreak, 1000);
                    } else {
                        streakCount.innerText = targetStreak;
                    }
                }

                if (streakBadgeContainer) {
                    const fireContainer = streakBadgeContainer.querySelector('.css-fire-container');
                    if (fireContainer) {
                        fireContainer.style.opacity = res.stats.streakCompletedToday ? '0.65' : '0';
                    }
                    streakBadgeContainer.style.display = 'flex';
                }

                if (statsBtn) {
                    statsBtn.style.display = 'inline-flex';
                    statsBtn.onclick = () => {
                        showStatsModal(userJson.username, res.stats, null);
                    };
                }

                if (typeof window.updateProfileCompletion === 'function') {
                    window.updateProfileCompletion(userJson);
                }
                return res.stats;
            }
        }
    } catch (e) {
        console.error('[Stats] Error loading my stats:', e);
    }
    return null;
}
window.loadMyStats = loadMyStats;

function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const diff = end - start;
    const actualDuration = diff <= 2 ? 400 : duration;
    
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / actualDuration, 1);
        
        obj.innerText = Math.round(progress * (end - start) + start);
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), color 0.3s';
            obj.style.transform = 'scale(1.4)';
            obj.style.color = '#ffaa00';
            setTimeout(() => { 
                obj.style.transform = 'scale(1)'; 
                obj.style.color = '#fff';
            }, 400);
        }
    };
    window.requestAnimationFrame(step);
}
window.animateStreakValue = animateValue;

function setupStatsListener() {
    if (window.electronAPI && window.electronAPI.on) {
        window.electronAPI.on('stats-updated', () => {
            console.log('[Stats] Received stats-updated event');
            loadMyStats();
        });
    }
    let lastFocusCheck = 0;
    window.addEventListener('focus', () => {
        const now = Date.now();
        if (now - lastFocusCheck > 5000 && window.hwlAPI && window.hwlAPI.get_user_json) {
            lastFocusCheck = now;
            window.hwlAPI.get_user_json().then(u => {
                if (u && window.updateProfileCompletion) {
                    window.updateProfileCompletion(u);
                }
            }).catch(() => {});
        }
    });
}



async function updateProfileCompletion(userJson) {
        const bar = document.getElementById('profileCompletionBar');
        const fill = document.getElementById('pcbFill');
        const pct = document.getElementById('pcbPercent');
        const stepsEl = document.getElementById('pcbSteps');
        if (!bar || !fill || !pct || !stepsEl) return;

        const STEPS = [
            { key: 'avatar',      icon: 'fas fa-user-circle', label: (window.t ? window.t('stats.profile_step_avatar') : null) || 'Custom avatar' },
            { key: 'background',  icon: 'fas fa-image',       label: (window.t ? window.t('stats.profile_step_background') : null) || 'Profile background' },
            { key: 'country',     icon: 'fas fa-flag',        label: (window.t ? window.t('stats.profile_step_country') : null) || 'Country' },
            { key: 'biography',   icon: 'fas fa-quote-left',  label: (window.t ? window.t('stats.profile_step_bio') : null) || 'Bio' },
            { key: 'links',       icon: 'fas fa-link',        label: (window.t ? window.t('stats.profile_step_links') : null) || 'Social links' },
            { key: 'favoriteMob', icon: 'fas fa-paw',         label: (window.t ? window.t('stats.profile_step_mob') : null) || 'Favorite mob' },
            { key: 'playstyle',   icon: 'fas fa-tags',        label: (window.t ? window.t('stats.profile_step_playstyle') : null) || 'Playstyle tags' },
        ];

        try {
            // Get own firebase UID
            const uid = userJson.firebase_ms_uid || userJson.firebase_uid || null;
            if (!uid) return;

            const res = await window.hwlAPI.get_user_profile(uid);
            if (!res || !res.success || !res.data) return;
            const d = res.data;

            // Evaluate each step
            const done = {
                // Custom avatar / skin head: must have avatarBase64 or Minecraft account UUID/mcUuid (not letter fallback)
                avatar:      !!((d.avatarBase64 && d.avatarBase64.length > 0) || ((d.accountType === 'microsoft' || userJson.account_type === 'microsoft') && (d.mcUuid || d.uuid || userJson.uuid)) || (d.mcUuid && d.mcUuid !== '')),
                background:  !!(d.background && d.background !== ''),
                country:     !!(d.country && d.country !== ''),
                biography:   !!(d.biography && d.biography.trim().length > 3),
                links:       !!(d.links && Array.isArray(d.links) && d.links.filter(function(l){ return l && (l.url || l.title); }).length > 0),
                favoriteMob: !!(d.favoriteMob && d.favoriteMob !== ''),
                playstyle:   !!(d.playstyleTags && Array.isArray(d.playstyleTags) && d.playstyleTags.length > 0),
            };

            const completedCount = Object.values(done).filter(Boolean).length;
            const totalSteps = STEPS.length;
            const percentage = Math.round((completedCount / totalSteps) * 100);

            // Hide the completion bar completely if profile is 100% complete
            if (percentage === 100 || completedCount === totalSteps) {
                bar.style.display = 'none';
                return;
            } else {
                bar.style.display = 'block';
            }

            // Animate fill
            requestAnimationFrame(function() {
                fill.style.width = percentage + '%';
                fill.classList.remove('complete');
            });

            pct.textContent = percentage + '%';
            pct.style.color = '#4facfe';

            // Render step dots with small icons
            stepsEl.innerHTML = STEPS.map(function(step) {
                const isDone = done[step.key];
                const tipText = (isDone ? '✓ ' : '') + step.label;
                return '<div class="pcb-dot' + (isDone ? ' done' : '') + '" data-tip="' + tipText + '">' +
                       '<i class="' + step.icon + ' pcb-step-icon"></i>' +
                       '<div class="pcb-dot-bar"></div>' +
                       '</div>';
            }).join('');

            // Ensure the bar does not intercept clicks / blocks pointer events
            bar.style.pointerEvents = 'none';
            bar.style.cursor = 'default';
            bar.removeAttribute('title');
            bar.onclick = null;

        } catch (e) {
            console.error('[ProfileCompletion] Error:', e);
        }
    }

    // Expose globally so scripts.js can refresh after profile save
    window.updateProfileCompletion = updateProfileCompletion;

    // Expose global function to reload stats (used by scripts.js on login)
    window.loadMyStats = loadMyStats;
    
    // Expose global function for showing stats of any user
    window.showUserStats = async function(uid, username, avatarUrl) {
        try {
            // Loading state
            showStatsModal(username, { streak: '...', maxStreak: '...', totalHours: '...', totalDaysPlayed: '...', totalSessions: '...' }, avatarUrl);
            
            const res = await window.hwlAPI.stats_get_user(uid);
            if (res.success && res.stats) {
                showStatsModal(username, res.stats, avatarUrl);
            } else {
                showStatsModal(username, { streak: 0, maxStreak: 0, totalHours: 0, totalDaysPlayed: 0, totalSessions: 0 }, avatarUrl);
            }
        } catch (e) {
            console.error('[Stats] Error loading user stats:', e);
        }
    };
    
    function showStatsModal(username, stats, avatarUrl) {
        const modal = document.getElementById('statsModal');
        document.getElementById('statsUsername').innerText = username;
        
        const streak = stats.streak !== undefined ? stats.streak : 0;
        const maxStreak = stats.maxStreak !== undefined ? stats.maxStreak : (stats.streak || 0);
        const totalHours = typeof stats.totalHours === 'number' ? stats.totalHours.toFixed(1) : (stats.totalHours || 0);
        const days = stats.totalDaysPlayed || 0;
        const sessions = stats.totalSessions || 0;
        
        const streakEl = document.getElementById('statsModalStreak');
        if (streakEl) streakEl.innerHTML = `${streak} <span style="font-size: 14px; font-weight: normal; color: #888;">${window.t('stats.days_unit')}</span>`;
        const maxStreakEl = document.getElementById('statsModalMaxStreak');
        if (maxStreakEl) maxStreakEl.innerHTML = `${maxStreak} <span style="font-size: 14px; font-weight: normal; color: #888;">${window.t('stats.days_unit')}</span>`;
        const hoursEl = document.getElementById('statsModalHours');
        if (hoursEl) hoursEl.innerHTML = `${totalHours} <span style="font-size: 14px; font-weight: normal; color: #888;">${window.t('stats.hours_unit')}</span>`;
        const daysEl = document.getElementById('statsModalDays');
        if (daysEl) daysEl.innerHTML = `${days} <span style="font-size: 14px; font-weight: normal; color: #888;">${window.t('stats.days_unit')}</span>`;
        const sessionsEl = document.getElementById('statsModalSessions');
        if (sessionsEl) sessionsEl.innerHTML = `${sessions}`;
        
        const avatarImg = document.getElementById('statsUserAvatarImg');
        const fallback = document.getElementById('statsUserAvatarFallback');
        
        if (avatarImg && fallback) {
            if (avatarUrl) {
                avatarImg.src = avatarUrl;
                avatarImg.style.display = 'block';
                fallback.style.display = 'none';
            } else {
                // Self avatar logic (since we don't have avatarUrl passed for self)
                const selfHead = document.getElementById('userAvatarHead');
                const selfImg = selfHead ? selfHead.querySelector('img') : null;
                if (selfImg && selfImg.src) {
                    avatarImg.src = selfImg.src;
                    avatarImg.style.display = 'block';
                    fallback.style.display = 'none';
                } else {
                    avatarImg.style.display = 'none';
                    fallback.style.display = 'block';
                }
            }
        }
        
        if (modal) modal.classList.add('show');
    }
    
    function setupModalEvents() {
    const closeBtn = document.getElementById('closeStatsModalBtn');
    if (closeBtn) {
        closeBtn.onclick = () => {
            const modal = document.getElementById('statsModal');
            if (modal) modal.classList.remove('show');
        };
    }
}

function initStats() {
    loadMyStats();
    setupStatsListener();
    setupModalEvents();
}

if (!window.hwlAPI) {
    window.addEventListener('pywebviewready', () => {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initStats);
        } else {
            initStats();
        }
    });
} else {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStats);
    } else {
        initStats();
    }
}
