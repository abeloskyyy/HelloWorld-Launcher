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
                    
                    statsBtn.style.display = 'inline-flex';
                    streakBadgeContainer.style.display = 'flex';
                    
                    statsBtn.onclick = () => {
                        showStatsModal(userJson.username, res.stats, null); // For self, avatar will be loaded via logic
                    };
                }
            }
        } catch (e) {
            console.error('[Stats] Error loading my stats:', e);
        }
    }
    
    // Expose global function for showing stats of any user
    window.showUserStats = async function(uid, username, avatarUrl) {
        try {
            // Loading state
            showStatsModal(username, { streak: '...', totalHours: '...', totalDaysPlayed: '...', totalSessions: '...' }, avatarUrl);
            
            const res = await window.pywebview.api.stats_get_user(uid);
            if (res.success && res.stats) {
                showStatsModal(username, res.stats, avatarUrl);
            } else {
                showStatsModal(username, { streak: 0, totalHours: 0, totalDaysPlayed: 0, totalSessions: 0 }, avatarUrl);
            }
        } catch (e) {
            console.error('[Stats] Error loading user stats:', e);
        }
    };
    
    function showStatsModal(username, stats, avatarUrl) {
        const modal = document.getElementById('statsModal');
        document.getElementById('statsUsername').innerText = username;
        
        const streak = stats.streak !== undefined ? stats.streak : 0;
        const totalHours = typeof stats.totalHours === 'number' ? stats.totalHours.toFixed(1) : (stats.totalHours || 0);
        const days = stats.totalDaysPlayed || 0;
        const sessions = stats.totalSessions || 0;
        
        document.getElementById('statsModalStreak').innerHTML = `${streak} <span style="font-size: 14px; font-weight: normal; color: #888;">days</span>`;
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
