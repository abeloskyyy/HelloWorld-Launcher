document.addEventListener('DOMContentLoaded', async () => {
    // API Access
    // We try hwlAPI (modern) first, then fallback to legacy pywebview if needed (but we exposed methods in hwlAPI in preload)
    const api = window.hwlAPI; // Exposed in preload

    // Legacy API access for some settings if needed, or we just rely on hwlAPI being fully populated
    // We added getOnboardingStatus and completeOnboarding to hwlAPI.
    // However, saving settings (dev_mode etc) is currently in pywebviewAPI (legacy) in preload.js?
    // Let's check preload... yes, save_version_settings is in pywebviewAPI.
    // We should probably access window.hwlAPI for those or expose them in hwlAPI too.
    // For now, let's access window.hwlAPI for settings since that's where they are.
    const legacyApi = window.hwlAPI ? window.hwlAPI : null;

    // Elements
    const overlay = document.getElementById('onboardingOverlay');
    const steps = document.querySelectorAll('.onboarding-step');
    const dots = document.querySelectorAll('.progress-dot');
    const nextBtn = document.getElementById('wizNextBtn');

    // Config Elements
    const wizMcDir = document.getElementById('wizMcDir');
    const wizBtnSelectFolder = document.getElementById('wizBtnSelectFolder');
    const wizDevMode = document.getElementById('wizDevMode');
    const wizShowSnapshots = document.getElementById('wizShowSnapshots');
    const wizShowOld = document.getElementById('wizShowOld');

    const wizLanguageSelect = document.getElementById('wizLanguageSelect');
    const wizLangDropdownBtn = document.getElementById('wizLangDropdownBtn');
    const wizLangDropdownMenu = document.getElementById('wizLangDropdownMenu');

    if (wizLangDropdownBtn && wizLangDropdownMenu) {
        wizLangDropdownBtn.addEventListener('click', () => {
            wizLangDropdownMenu.classList.toggle('show');
        });
        
        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#wizLangDropdownContainer')) {
                wizLangDropdownMenu.classList.remove('show');
            }
        });
    }

    window.selectWizLanguage = function(langCode, langText, flagCode) {
        if (wizLanguageSelect) wizLanguageSelect.value = langCode;
        const textSpan = document.getElementById('wizCurrentLangText');
        if (textSpan) textSpan.textContent = langText;
        const iconImg = document.getElementById('wizCurrentLangIcon');
        if (iconImg) iconImg.src = `https://purecatamphetamine.github.io/country-flag-icons/3x2/${flagCode}.svg`;
        if (wizLangDropdownMenu) wizLangDropdownMenu.classList.remove('show');
    };

    // Replay Button
    const replayBtn = document.getElementById('replayTutorialBtn');

    let currentStep = 1;
    const totalSteps = 6;
    let tutorialCompleted = false;


    // --- Wizard Navigation ---
    function showStep(step) {
        // Validate Config on Step 1 Leave
        if (currentStep === 1 && step > 1) {
            saveConfig();
        }

        const direction = step > currentStep ? 'forward' : 'backward';
        const currentEl = document.getElementById(`step${currentStep}`);
        const nextEl = document.getElementById(`step${step}`);

        // 1. Animate OUT Current
        if (currentEl) {
            currentEl.classList.remove('active', 'prepare-left'); // clear styles

            if (direction === 'forward') {
                currentEl.classList.add('exit-left');
            } else {
                currentEl.classList.add('exit-right');
            }
        }

        // 2. Prepare NEXT (Remove old animations, set start pos)
        if (nextEl) {
            // Clean slate
            nextEl.classList.remove('active', 'exit-left', 'exit-right', 'prepare-left');

            // If backward, we need it to start from Left (-50px)
            // If forward, default CSS is Right (50px)
            if (direction === 'backward') {
                nextEl.classList.add('prepare-left');
            }

            // Force reflow to ensure start position is registered
            void nextEl.offsetWidth;

            // 3. Animate IN Next
            // Small timeout to allow the browser to process the 'prepare' state before transitioning to 'active'
            setTimeout(() => {
                nextEl.classList.add('active');
                // Remove prepare class after animation starts so it travels to 0
                if (direction === 'backward') {
                    nextEl.classList.remove('prepare-left');
                    // Actually, removing prepare-left might reset it to +50px if we aren't careful?
                    // 'active' sets transform: translateX(0) !important or high specificity?
                    // CSS: .active { transform: translateX(0); } overrides .prepare-left if specifically active?
                    // Let's rely on .active being defined AFTER.
                    // But .prepare-left sets -50px. default is +50px.
                    // We need to ensure we transition TO 0.
                    // If we remove prepare-left immediately, it might jump to +50px then animate to 0?
                    // No, .active overrides transform.
                }
            }, 50);
        }

        // Cleanup others (safety)
        steps.forEach(s => {
            if (s !== currentEl && s !== nextEl) {
                s.classList.remove('active', 'exit-left', 'exit-right', 'prepare-left');
            }
        });

        // Update Dots (Only current is active)
        dots.forEach(d => {
            const dStep = parseInt(d.dataset.step);
            if (dStep === step) d.classList.add('active');
            else d.classList.remove('active');
        });

        // Update Buttons
        const backBtn = document.getElementById('wizBackBtn');
        if (step === 1) {
            backBtn.style.display = 'none';
        } else {
            backBtn.style.display = 'flex';
        }

        // Handle Next Button Visibility
        // Steps 2 and 3 have their own action buttons, so hide the footer Next button
        // Step 4 also has its own action buttons now
        if (step === 2 || step === 3 || step === 4 || step === 5) {
            nextBtn.style.display = 'none';
        } else {
            nextBtn.style.display = 'flex';
        }

        if (step === totalSteps) {
            nextBtn.innerHTML = (window.t ? window.t('tutorial.finish') : 'Finish') + ' <i class="fas fa-check"></i>';
            nextBtn.classList.add('btn-finish');

            // Play video if on final step
            playTrailerVideo();
        } else {
            nextBtn.innerHTML = (window.t ? window.t('tutorial.next') : 'Next') + ' <i class="fas fa-arrow-right"></i>';
            nextBtn.classList.remove('btn-finish');

            // Pause video outside of final step
            pauseTrailerVideo();
        }

        currentStep = step;
    }

    // Back Button Listener
    // Back Button Listener
    const backBtn = document.getElementById('wizBackBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            // If we are on Step 4 (Accounts), always go back to Step 2 (Tutorial Intro)
            if (currentStep === 4) {
                showStep(2);
            } else if (currentStep > 1) {
                showStep(currentStep - 1);
            }
        });
    }

    // New Step 2 & 3 Button Listeners
    const startTutorialBtn = document.getElementById('startTutorialBtn');
    if (startTutorialBtn) {
        startTutorialBtn.addEventListener('click', () => {
            closeWizard();
            setTimeout(() => {
                if (typeof window.startTutorialStep1 === 'function') {
                    window.startTutorialStep1();
                }
            }, 500);

            // Callback returns to Step 3
            window.onTutorialStep1Complete = async () => {
                tutorialCompleted = true; // Mark as completed
                openWizard(3); // Directly open at step 3 'Completed'
            };
        });
    }

    const skipTutorialBtn = document.getElementById('skipTutorialBtn');
    if (skipTutorialBtn) {
        skipTutorialBtn.addEventListener('click', () => {
            // Skip tutorial and go to Accounts (Step 4)
            showStep(4);
        });
    }

    const repeatTutorialBtn = document.getElementById('repeatTutorialBtn');
    if (repeatTutorialBtn) {
        repeatTutorialBtn.addEventListener('click', () => {
            closeWizard();
            setTimeout(() => {
                if (typeof window.startTutorialStep1 === 'function') {
                    window.startTutorialStep1();
                }
            }, 500);
            // Callback remains set to Step 3
            window.onTutorialStep1Complete = async () => {
                openWizard(3);
            };
        });
    }

    const nextStepBtn = document.getElementById('nextStepBtn');
    if (nextStepBtn) {
        nextStepBtn.addEventListener('click', () => {
            showStep(4); // Show Identity Intro
        });
    }

    nextBtn.addEventListener('click', async () => {
        if (currentStep === 1) {
            // Save config and go to step 2 (Tutorial Intro)
            await saveConfig();

            const selectedLang = document.getElementById('wizLanguageSelect');
            if (selectedLang && typeof window.setLanguage === 'function') {
                await window.setLanguage(selectedLang.value);
            }
            showStep(2);
        } else if (currentStep < totalSteps) {
            showStep(currentStep + 1);
        } else {
            // Finish
            await api.completeOnboarding();
            closeWizard();
        }
    });

    // --- Step 4 (Identity) Actions ---
    const startTutorialStep2Btn = document.getElementById('startTutorialStep2Btn');
    const skipTutorialStep2Btn = document.getElementById('skipTutorialStep2Btn');

    if (startTutorialStep2Btn) {
        startTutorialStep2Btn.addEventListener('click', () => {
            closeWizard();
            setTimeout(() => {
                if (typeof window.startTutorialStep2 === 'function') {
                    window.startTutorialStep2();
                } else {
                    console.error("startTutorialStep2 not found");
                    openWizard(5); // Skip if missing
                }
            }, 500);

            window.onTutorialStep2Complete = async () => {
                openWizard(5); // Go to Addons step
            };
        });
    }

    if (skipTutorialStep2Btn) {
        skipTutorialStep2Btn.addEventListener('click', () => {
            showStep(5);
        });
    }

    // --- Step 5 (Addons) Actions ---
    const startTutorialStep3Btn = document.getElementById('startTutorialStep3Btn');
    const skipTutorialStep3Btn = document.getElementById('skipTutorialStep3Btn');

    if (startTutorialStep3Btn) {
        startTutorialStep3Btn.addEventListener('click', () => {
            closeWizard();
            setTimeout(() => {
                if (typeof window.startTutorialStep3 === 'function') {
                    window.startTutorialStep3();
                } else {
                    console.error("startTutorialStep3 not found");
                    openWizard(6); // Skip if missing
                }
            }, 500);

            window.onTutorialStep3Complete = async () => {
                openWizard(6); // Go to Addons step
            };
        });
    }

    if (skipTutorialStep3Btn) {
        skipTutorialStep3Btn.addEventListener('click', () => {
            showStep(6);
        });
    }

    // --- Configuration Logic ---
    async function loadConfig() {
        // Load settings from backend
        // We assume legacyApi.get_user_json() works or similar
        try {
            const data = await api.getUserJson(); // Assuming exposed in hwlAPI
            if (data) {
                wizMcDir.value = data.mcdir || "";
                wizDevMode.checked = !!data.dev_mode;
                wizShowSnapshots.checked = !!data.show_snapshots;
                wizShowOld.checked = !!data.show_old;
            }
            const langKey = window.currentLanguage || 'en';
            const langData = (window.AVAILABLE_LANGS && window.AVAILABLE_LANGS[langKey]) ? window.AVAILABLE_LANGS[langKey] : { name: 'English', flag: 'GB' };
            window.selectWizLanguage(langKey, langData.name, langData.flag);
        } catch (e) {
            console.error("Error loading config for wizard:", e);
        }
    }

    async function saveConfig() {
        try {
            // Save Settings
            // We need to call legacy APIs because main.js specific save handlers are mapped there?
            // Or we can use saveUserJson exposed in hwlAPI (which merges).

            // 1. Dev Mode
            // legacy: save_dev_mode
            if (legacyApi && legacyApi.save_dev_mode) {
                await legacyApi.save_dev_mode(wizDevMode.checked);
            }

            // 2. Version Settings
            // legacy: save_version_settings
            if (legacyApi && legacyApi.save_version_settings) {
                await legacyApi.save_version_settings(wizShowSnapshots.checked, wizShowOld.checked);
            }

            // 3. User JSON General (mcdir)
            // legacy: save_user_json(username, mcdir, account_type)
            const data = await api.getUserJson();
            if (data) {
                // We only want to update mcdir without overwriting others if possible,
                // but saveUserJson in hwlAPI merges.
                await api.saveUserJson({ mcdir: wizMcDir.value });
            }

            // Update Real UI
            // Trigger a refresh of the settings UI if it exists
            if (window.loadSettings) window.loadSettings();

            console.log("Wizard Config Saved");
        } catch (e) {
            console.error("Error saving wizard config:", e);
        }
    }

    wizBtnSelectFolder.addEventListener('click', async () => {
        if (legacyApi && legacyApi.select_folder) {
            const path = await legacyApi.select_folder(wizMcDir.value);
            if (path) wizMcDir.value = path;
        }
    });

    // --- Init ---
    let isInitializing = false;
    async function initWizard() {
        if (isInitializing) return;
        isInitializing = true;
        try {
            const status = await api.getOnboardingStatus();
            if (status.showOnboarding) {
                openWizard(1);
            }
        } catch (e) {
            console.error("Failed to check onboarding status:", e);
        }
    }

    function openWizard(startStep = 1) {
        overlay.classList.add('active');
        if (startStep === 1) tutorialCompleted = false;
        loadConfig();
        // Preload trailer video immediately so it is 100% buffered by Step 6
        preloadTrailerVideo();
        showStep(startStep);
    }

    function closeWizard() {
        overlay.classList.remove('active');
        pauseTrailerVideo();
    }

    // --- Trailer Video Controller (Gist "trailerVideo": { url, start, finish }) ---
    let trailerConfig = { url: '', start: 0, finish: 0 };
    let ytPollInterval = null;
    let lastSeekTime = 0;
    let hasAddedYtMessageListener = false;

    function preloadTrailerVideo() {
        if (!trailerConfig || !trailerConfig.url) return;
        const ytId = getYouTubeId(trailerConfig.url);
        const ytIframe = document.getElementById('tutorialYoutubeIframe');
        const placeholder = document.getElementById('tutorialVideoPlaceholder');
        if (ytId && ytIframe) {
            const embedUrl = getTrailerEmbedUrl(ytId);
            if (!ytIframe.src || ytIframe.src === 'about:blank' || !ytIframe.src.includes(ytId)) {
                ytIframe.onload = () => {
                    if (placeholder) placeholder.style.display = 'none';
                    ytIframe.style.opacity = '1';
                    try {
                        ytIframe.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*');
                    } catch (_) {}
                };
                ytIframe.src = embedUrl;
            }
        }
    }

    function getYouTubeId(url) {
        if (!url || typeof url !== 'string') return null;
        const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i);
        return match ? match[1] : null;
    }

    function seekTrailerToStart() {
        const now = Date.now();
        // Cooldown: at least 2.5s between seeks to prevent any rapid repeat loops
        if (now - lastSeekTime < 2500) return;
        lastSeekTime = now;

        const ytIframe = document.getElementById('tutorialYoutubeIframe');
        if (ytIframe && ytIframe.contentWindow) {
            try {
                // Only send seekTo - do not send playVideo/pauseVideo which displays the center bezel button
                ytIframe.contentWindow.postMessage(JSON.stringify({
                    event: 'command',
                    func: 'seekTo',
                    args: [trailerConfig.start, true]
                }), '*');
            } catch (_) {}
        }
    }

    function startYtPolling() {
        if (ytPollInterval) clearInterval(ytPollInterval);
        ytPollInterval = setInterval(() => {
            if (currentStep === totalSteps && trailerConfig.finish > trailerConfig.start) {
                const ytIframe = document.getElementById('tutorialYoutubeIframe');
                if (ytIframe && ytIframe.contentWindow) {
                    try {
                        ytIframe.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*');
                    } catch (_) {}
                }
            }
        }, 400);
    }

    function stopYtPolling() {
        if (ytPollInterval) {
            clearInterval(ytPollInterval);
            ytPollInterval = null;
        }
    }

    function ensureYtMessageListener() {
        if (hasAddedYtMessageListener) return;
        hasAddedYtMessageListener = true;
        window.addEventListener('message', (event) => {
            try {
                let msg = event.data;
                if (typeof msg === 'string') msg = JSON.parse(msg);
                if (!msg) return;

                // When YouTube reports playback time
                if (msg.event === 'infoDelivery' && msg.info && typeof msg.info.currentTime === 'number') {
                    const cur = msg.info.currentTime;
                    // ONLY seek when we have actually reached or exceeded the finish mark
                    if (trailerConfig.finish > trailerConfig.start && cur >= trailerConfig.finish) {
                        seekTrailerToStart();
                    }
                }
            } catch (_) {}
        });
    }

    function getTrailerEmbedUrl(ytId) {
        const start = trailerConfig.start;
        return `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&mute=1&controls=0&disablekb=1&fs=0&modestbranding=1&rel=0&iv_load_policy=3&start=${start}&playsinline=1&enablejsapi=1`;
    }

    async function applyVideoGpuSettings(videoEl) {
        if (!videoEl) return;
        try {
            let hwAccel = true;
            if (api && api.getUserJson) {
                const ud = await api.getUserJson();
                if (ud && ud.hw_accel === false) hwAccel = false;
            } else if (legacyApi && legacyApi.get_user_json) {
                const ud = await legacyApi.get_user_json();
                if (ud && ud.hw_accel === false) hwAccel = false;
            }
            if (hwAccel) {
                videoEl.classList.add('hw-accel-enabled');
                videoEl.classList.remove('hw-accel-disabled');
            } else {
                videoEl.classList.add('hw-accel-disabled');
                videoEl.classList.remove('hw-accel-enabled');
            }
        } catch (_) {}
    }

    function setupTrailerVideo(config) {
        const ytIframe = document.getElementById('tutorialYoutubeIframe');
        const html5Video = document.getElementById('tutorialFinalVideo');
        const placeholder = document.getElementById('tutorialVideoPlaceholder');

        if (!config || !config.url) {
            trailerConfig = { url: 'videos/tutorial-final.mp4', start: 0, finish: 0 };
        } else {
            trailerConfig = {
                url: config.url,
                start: Number(config.start) || 0,
                finish: Number(config.finish) || 0
            };
        }

        // Hide YouTube iframe since we are using native local video
        stopYtPolling();
        if (ytIframe) {
            ytIframe.style.display = 'none';
            ytIframe.src = '';
        }
        if (placeholder) placeholder.style.display = 'none';

        if (html5Video) {
            html5Video.style.display = 'block';
            applyVideoGpuSettings(html5Video);
            const ytId = getYouTubeId(trailerConfig.url);
            // If URL is YouTube, fall back to the bundled local video
            const targetSrc = (ytId || !trailerConfig.url) ? 'videos/tutorial-final.mp4' : trailerConfig.url;
            if (!html5Video.src || !html5Video.src.includes('videos/tutorial-final.mp4')) {
                html5Video.src = targetSrc;
            }
            html5Video.muted = true;
            html5Video.loop = true;

            if (trailerConfig.finish > trailerConfig.start) {
                html5Video.ontimeupdate = () => {
                    if (html5Video.currentTime >= trailerConfig.finish) {
                        html5Video.currentTime = trailerConfig.start;
                    }
                };
            } else {
                html5Video.ontimeupdate = null;
            }

            if (currentStep === totalSteps) {
                if (trailerConfig.start > 0) {
                    html5Video.currentTime = trailerConfig.start;
                }
                html5Video.play().catch(() => {});
            }
        }
    }

    function playTrailerVideo() {
        const html5Video = document.getElementById('tutorialFinalVideo');
        const ytIframe = document.getElementById('tutorialYoutubeIframe');
        const placeholder = document.getElementById('tutorialVideoPlaceholder');
        if (ytIframe) ytIframe.style.display = 'none';
        if (placeholder) placeholder.style.display = 'none';

        if (html5Video) {
            html5Video.style.display = 'block';
            applyVideoGpuSettings(html5Video);
            if (!html5Video.src || html5Video.src === '' || html5Video.src.endsWith('/')) {
                html5Video.src = 'videos/tutorial-final.mp4';
            }
            if (trailerConfig.start > 0 && (html5Video.currentTime < trailerConfig.start || (trailerConfig.finish > 0 && html5Video.currentTime >= trailerConfig.finish))) {
                html5Video.currentTime = trailerConfig.start;
            }
            html5Video.play().catch(() => {});
        }
    }

    function pauseTrailerVideo() {
        const html5Video = document.getElementById('tutorialFinalVideo');
        if (html5Video) {
            html5Video.pause();
        }
    }

    window.setupTrailerVideo = setupTrailerVideo;

    // Check if remote config was already fetched
    if (window.HW_TRAILER_VIDEO) {
        setupTrailerVideo(window.HW_TRAILER_VIDEO);
    } else if (window.HW_REMOTE_CONFIG && window.HW_REMOTE_CONFIG.trailerVideo) {
        setupTrailerVideo(window.HW_REMOTE_CONFIG.trailerVideo);
    }

    // --- Replay Button ---
    if (replayBtn) {
        replayBtn.addEventListener('click', () => {
            openWizard(1); // Re-open from start
        });
    }

    // Start
    if (window.hwlAPI) {
        initWizard();
    } else {
        window.addEventListener('pywebviewready', initWizard);
    }
});
