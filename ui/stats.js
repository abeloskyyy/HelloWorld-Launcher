document.addEventListener('DOMContentLoaded', async () => {
    const statsBtn = document.getElementById('statsBtn');
    const streakBadgeContainer = document.getElementById('streakBadgeContainer');
    const streakCount = document.getElementById('streakCount');
    
    // Check auth and load stats
    try {
        if (!window.pywebview || !window.pywebview.api) {
            window.addEventListener('pywebviewready', () => {
                loadMyStats();
                setupStatsListener();
            });
        } else {
            loadMyStats();
            setupStatsListener();
        }
    } catch (e) {
        console.error(e);
    }
    
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
            if (now - lastFocusCheck > 5000 && window.pywebview && window.pywebview.api && window.pywebview.api.get_user_json) {
                lastFocusCheck = now;
                window.pywebview.api.get_user_json().then(u => {
                    if (u && window.updateProfileCompletion) {
                        window.updateProfileCompletion(u);
                    }
                }).catch(() => {});
            }
        });
    }
    
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
    
    async function loadMyStats() {
        try {
            const userJson = await window.pywebview.api.get_user_json();
            if (userJson) {
                const res = await window.pywebview.api.stats_get_my_stats();
                if (res.success && res.stats) {
                    const targetStreak = res.stats.streak || 0;
                    const currentStreak = parseInt(streakCount.innerText) || 0;
                    
                    if (currentStreak !== targetStreak) {
                        animateValue(streakCount, currentStreak, targetStreak, 1000);
                    } else {
                        streakCount.innerText = targetStreak;
                    }
                    
                    const fireContainer = streakBadgeContainer.querySelector('.css-fire-container');
                    if (fireContainer) {
                        if (res.stats.streakCompletedToday) {
                            fireContainer.style.opacity = '0.65';
                        } else {
                            fireContainer.style.opacity = '0';
                        }
                    }
                    
                    statsBtn.style.display = 'inline-flex';
                    streakBadgeContainer.style.display = 'flex';
                    
                    statsBtn.onclick = () => {
                        showStatsModal(userJson.username, res.stats, null);
                    };

                    // Update profile completion bar (non-blocking)
                    updateProfileCompletion(userJson);
                }
            }
        } catch (e) {
            console.error('[Stats] Error loading my stats:', e);
        }
    }

    async function updateProfileCompletion(userJson) {
        const bar = document.getElementById('profileCompletionBar');
        const fill = document.getElementById('pcbFill');
        const pct = document.getElementById('pcbPercent');
        const stepsEl = document.getElementById('pcbSteps');
        if (!bar || !fill || !pct || !stepsEl) return;

        const STEPS = [
            { key: 'avatar',      icon: 'fas fa-user-circle', label: 'Custom avatar' },
            { key: 'background',  icon: 'fas fa-image',       label: 'Profile background' },
            { key: 'country',     icon: 'fas fa-flag',        label: 'Country' },
            { key: 'biography',   icon: 'fas fa-quote-left',  label: 'Bio' },
            { key: 'links',       icon: 'fas fa-link',        label: 'Social links' },
            { key: 'favoriteMob', icon: 'fas fa-paw',         label: 'Favorite mob' },
            { key: 'playstyle',   icon: 'fas fa-tags',        label: 'Playstyle tags' },
        ];

        try {
            // Get own firebase UID
            const uid = userJson.firebase_ms_uid || userJson.firebase_uid || null;
            if (!uid) return;

            const res = await window.pywebview.api.get_user_profile(uid);
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

            // Make the bar clickable to open Edit Profile
            bar.style.cursor = 'pointer';
            bar.title = 'Click to complete your profile';
            bar.onclick = function() {
                const btn = document.getElementById('editProfileBtn');
                if (btn) btn.click();
            };

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
            
            const res = await window.pywebview.api.stats_get_user(uid);
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
        
        document.getElementById('statsModalStreak').innerHTML = `${streak} <span style="font-size: 14px; font-weight: normal; color: #888;">days</span>`;
        const maxStreakEl = document.getElementById('statsModalMaxStreak');
        if (maxStreakEl) maxStreakEl.innerHTML = `${maxStreak} <span style="font-size: 14px; font-weight: normal; color: #888;">days</span>`;
        document.getElementById('statsModalHours').innerHTML = `${totalHours} <span style="font-size: 14px; font-weight: normal; color: #888;">h</span>`;
        document.getElementById('statsModalDays').innerHTML = `${days} <span style="font-size: 14px; font-weight: normal; color: #888;">days</span>`;
        document.getElementById('statsModalSessions').innerHTML = `${sessions}`;
        
        const avatarImg = document.getElementById('statsUserAvatarImg');
        const fallback = document.getElementById('statsUserAvatarFallback');
        
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
        
        modal.classList.add('show');
    }
    
    document.getElementById('closeStatsModalBtn').onclick = () => {
        document.getElementById('statsModal').classList.remove('show');
    };
});
