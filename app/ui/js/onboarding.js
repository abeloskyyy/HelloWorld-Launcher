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
    const totalSteps = 5;
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
        if (step === 0 || step === 1) {
            backBtn.style.display = 'none';
        } else {
            backBtn.style.display = 'flex';
        }

        // Handle Next Button Visibility
        // Step 0 checks linked account status; Steps 2, 3, 4 have their own buttons
        if (step === 0) {
            updateOnboardingAccountState();
        } else if (step === 2 || step === 3 || step === 4) {
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
    const backBtn = document.getElementById('wizBackBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            // If we are on Step 4 (Addons) and skipped the tutorial, go back to Step 2
            if (currentStep === 4 && !tutorialCompleted) {
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
            // Skip tutorial and go to Addons (Step 4)
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
            showStep(4); // Show Addons
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

    // --- Step 4 (Addons) Actions ---
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
                    openWizard(5); // Skip if missing
                }
            }, 500);

            window.onTutorialStep3Complete = async () => {
                openWizard(5); // Go to Finish step
            };
        });
    }

    if (skipTutorialStep3Btn) {
        skipTutorialStep3Btn.addEventListener('click', () => {
            showStep(5);
        });
    }

    // --- Step 0 (Account Selection / Login) Handlers ---
    const wizBtnLoginMs = document.getElementById('wizBtnLoginMs');
    if (wizBtnLoginMs) {
        wizBtnLoginMs.addEventListener('click', async () => {
            wizBtnLoginMs.disabled = true;
            wizBtnLoginMs.innerHTML = '<span class="spinner-small"></span> <span>' + ((window.t ? window.t('login.waiting') : '') || 'Waiting...') + '</span>';
            try {
                if (window.hwlAPI && window.hwlAPI.login_microsoft) {
                    const res = await window.hwlAPI.login_microsoft();
                    if (res && res.success) {
                        wizBtnLoginMs.innerHTML = '<i class="fas fa-check"></i> <span>' + ((window.t ? window.t('auth.success') : '') || 'Success!') + '</span>';
                        setTimeout(() => {
                            showStep(1);
                        }, 400);
                    }
                }
            } catch (err) {
                console.error('[Onboarding] Microsoft login error:', err);
            } finally {
                setTimeout(() => {
                    if (wizBtnLoginMs) {
                        wizBtnLoginMs.disabled = false;
                        wizBtnLoginMs.innerHTML = '<i class="fab fa-microsoft"></i> <span>' + ((window.t ? window.t('login.login_microsoft') : '') || 'Login with Microsoft') + '</span>';
                    }
                }, 3000);
            }
        });
    }

    // Advance if login-success event fires while on Step 0
    window.addEventListener('login-success', () => {
        if (currentStep === 0) {
            showStep(1);
        }
    });

    // HelloWorld Inline Form Handlers
    const wizShowHwFormBtn = document.getElementById('wizShowHwFormBtn');
    const wizHwForm = document.getElementById('wizHwForm');
    const wizHwFeatures = document.getElementById('wizHwFeatures');
    const wizHwCancelBtn = document.getElementById('wizHwCancelBtn');
    const wizHwSubmitBtn = document.getElementById('wizHwSubmitBtn');
    const wizHwError = document.getElementById('wizHwError');
    const wizHwIdentifier = document.getElementById('wizHwIdentifier');
    const wizHwPassword = document.getElementById('wizHwPassword');

    if (wizShowHwFormBtn && wizHwForm) {
        wizShowHwFormBtn.addEventListener('click', () => {
            wizShowHwFormBtn.style.display = 'none';
            if (wizHwFeatures) wizHwFeatures.style.display = 'none';
            wizHwForm.style.display = 'flex';
            if (wizHwIdentifier) wizHwIdentifier.focus();
        });
    }

    if (wizHwCancelBtn) {
        wizHwCancelBtn.addEventListener('click', () => {
            wizHwForm.style.display = 'none';
            if (wizHwFeatures) wizHwFeatures.style.display = 'flex';
            if (wizShowHwFormBtn) wizShowHwFormBtn.style.display = 'flex';
            if (wizHwError) wizHwError.style.display = 'none';
        });
    }

    if (wizHwSubmitBtn) {
        const handleHwSubmit = async () => {
            const idVal = wizHwIdentifier ? wizHwIdentifier.value.trim() : '';
            const passVal = wizHwPassword ? wizHwPassword.value : '';
            if (!idVal || !passVal) {
                if (wizHwError) {
                    wizHwError.textContent = (window.t ? window.t('auth.fields_required') : '') || 'Please fill in all fields';
                    wizHwError.style.display = 'block';
                }
                return;
            }
            wizHwSubmitBtn.disabled = true;
            wizHwSubmitBtn.innerHTML = '<span class="spinner-small"></span>';
            if (wizHwError) wizHwError.style.display = 'none';

            try {
                if (window.hwlAPI && window.hwlAPI.login_helloworld) {
                    const res = await window.hwlAPI.login_helloworld(idVal, passVal);
                    if (res && res.success) {
                        if (typeof window.onLoginSuccess === 'function') {
                            await window.onLoginSuccess();
                        }
                        showStep(1);
                    } else {
                        if (wizHwError) {
                            wizHwError.textContent = (res && res.error) || 'Login failed';
                            wizHwError.style.display = 'block';
                        }
                    }
                }
            } catch (e) {
                if (wizHwError) {
                    wizHwError.textContent = e.message || 'Login failed';
                    wizHwError.style.display = 'block';
                }
            } finally {
                wizHwSubmitBtn.disabled = false;
                wizHwSubmitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> <span>' + ((window.t ? window.t('auth.sign_in') : '') || 'Log In') + '</span>';
            }
        };

        wizHwSubmitBtn.addEventListener('click', handleHwSubmit);
        if (wizHwPassword) {
            wizHwPassword.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') handleHwSubmit();
            });
        }
        if (wizHwIdentifier) {
            wizHwIdentifier.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && wizHwPassword) wizHwPassword.focus();
            });
        }
    }

    // Offline Inline Form Handlers
    const wizShowOfflineFormBtn = document.getElementById('wizShowOfflineFormBtn');
    const wizOfflineForm = document.getElementById('wizOfflineForm');
    const wizOfflineFeatures = document.getElementById('wizOfflineFeatures');
    const wizOfflineCancelBtn = document.getElementById('wizOfflineCancelBtn');
    const wizOfflineSubmitBtn = document.getElementById('wizOfflineSubmitBtn');
    const wizOfflineNick = document.getElementById('wizOfflineNick');
    const wizOfflineError = document.getElementById('wizOfflineError');

    if (wizShowOfflineFormBtn && wizOfflineForm) {
        wizShowOfflineFormBtn.addEventListener('click', () => {
            wizShowOfflineFormBtn.style.display = 'none';
            if (wizOfflineFeatures) wizOfflineFeatures.style.display = 'none';
            wizOfflineForm.style.display = 'flex';
            if (wizOfflineNick) wizOfflineNick.focus();
        });
    }

    if (wizOfflineCancelBtn) {
        wizOfflineCancelBtn.addEventListener('click', () => {
            wizOfflineForm.style.display = 'none';
            if (wizOfflineFeatures) wizOfflineFeatures.style.display = 'flex';
            if (wizShowOfflineFormBtn) wizShowOfflineFormBtn.style.display = 'flex';
            if (wizOfflineError) wizOfflineError.style.display = 'none';
        });
    }

    if (wizOfflineSubmitBtn) {
        const handleOfflineSubmit = async () => {
            const nick = wizOfflineNick ? wizOfflineNick.value.trim() : '';
            if (!nick) {
                if (wizOfflineError) {
                    wizOfflineError.textContent = (window.t ? window.t('tutorial.offline_nick_required') : '') || 'Please enter a nickname.';
                    wizOfflineError.style.display = 'block';
                }
                return;
            }
            if (!/^[a-zA-Z0-9_]{3,16}$/.test(nick)) {
                if (wizOfflineError) {
                    wizOfflineError.textContent = (window.t ? window.t('tutorial.offline_nick_invalid') : '') || 'Nickname must be 3-16 characters (letters, numbers and _).';
                    wizOfflineError.style.display = 'block';
                }
                return;
            }
            wizOfflineSubmitBtn.disabled = true;
            wizOfflineSubmitBtn.innerHTML = '<span class="spinner-small"></span>';
            if (wizOfflineError) wizOfflineError.style.display = 'none';

            try {
                if (window.hwlAPI && window.hwlAPI.save_user_json) {
                    const saved = await window.hwlAPI.save_user_json({ username: nick, account_type: 'offline' });
                    if (typeof updateUserInterface === 'function') {
                        await updateUserInterface(saved || { username: nick, account_type: 'offline' });
                    }
                    if (typeof loadProfiles === 'function') await loadProfiles();
                    if (typeof loadVersions === 'function') await loadVersions();
                    showStep(1);
                }
            } catch (e) {
                if (wizOfflineError) {
                    wizOfflineError.textContent = e.message || 'Failed to save';
                    wizOfflineError.style.display = 'block';
                }
            } finally {
                wizOfflineSubmitBtn.disabled = false;
                wizOfflineSubmitBtn.innerHTML = '<i class="fas fa-play"></i> <span>' + ((window.t ? window.t('offline_login.enter_btn') : '') || 'Enter') + '</span>';
            }
        };

        wizOfflineSubmitBtn.addEventListener('click', handleOfflineSubmit);
        if (wizOfflineNick) {
            wizOfflineNick.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') handleOfflineSubmit();
            });
        }
    }

    // --- Step 0 Linked Account State Controller ---
    async function updateOnboardingAccountState() {
        const selectionView = document.getElementById('wizAccountSelectionView');
        const linkedView = document.getElementById('wizAccountLinkedView');
        if (!selectionView || !linkedView) return;

        let user = null;
        try {
            if (window.hwlAPI && window.hwlAPI.get_user_json) {
                user = await window.hwlAPI.get_user_json();
            } else if (api && api.getUserJson) {
                user = await api.getUserJson();
            }
        } catch (_) {}

        const hasAccount = user && user.username && user.username !== 'Player' && (user.account_type === 'microsoft' || user.account_type === 'helloworld' || (user.account_type === 'offline' && user.username.trim()));

        if (hasAccount) {
            selectionView.style.display = 'none';
            linkedView.style.display = 'flex';

            const usernameEl = document.getElementById('wizLinkedUsername');
            if (usernameEl) usernameEl.textContent = user.username;

            const badgeEl = document.getElementById('wizLinkedBadge');
            if (badgeEl) {
                const type = user.account_type || 'offline';
                badgeEl.className = 'wiz-card-badge ' + (type === 'microsoft' ? 'ms' : (type === 'helloworld' ? 'hw' : 'offline'));
                badgeEl.textContent = type === 'microsoft' ? 'Microsoft' : (type === 'helloworld' ? 'HelloWorld' : 'Offline');
            }

            const avatarEl = document.getElementById('wizLinkedAvatar');
            if (avatarEl) {
                let avUrl = '';
                if (user.account_type === 'microsoft') {
                    const id = user.uuid || encodeURIComponent(user.username);
                    avUrl = `https://crafthead.net/helm/${id}/96`;
                } else if (user.account_type === 'helloworld') {
                    let raw = user.last_avatar_url;
                    if (raw && typeof raw === 'string') {
                        if (!raw.startsWith('data:') && !raw.startsWith('http')) {
                            raw = 'data:image/png;base64,' + raw;
                        }
                        avUrl = raw;
                    } else {
                        const firstLetter = (user.username || 'P')[0].toUpperCase();
                        avUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(firstLetter)}&background=1a1a24&color=4facfe&bold=true&length=1&size=96`;
                    }
                } else {
                    // Offline accounts strictly display user person icon, never a Minecraft head
                    avUrl = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="%23ffffff" opacity="0.6"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
                }
                avatarEl.src = avUrl;
                avatarEl.onerror = () => {
                    const firstLetter = (user.username || 'P')[0].toUpperCase();
                    avatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(firstLetter)}&background=1a1a24&color=4facfe&bold=true&length=1&size=96`;
                };
            }

            if (nextBtn && currentStep === 0) {
                nextBtn.style.display = 'flex';
            }
        } else {
            selectionView.style.display = 'block';
            linkedView.style.display = 'none';
            if (nextBtn && currentStep === 0) {
                nextBtn.style.display = 'none';
            }
        }
    }

    const wizLinkedContinueBtn = document.getElementById('wizLinkedContinueBtn');
    if (wizLinkedContinueBtn) {
        wizLinkedContinueBtn.addEventListener('click', () => {
            showStep(1);
        });
    }

    const wizLinkedSwitchBtn = document.getElementById('wizLinkedSwitchBtn');
    if (wizLinkedSwitchBtn) {
        wizLinkedSwitchBtn.addEventListener('click', () => {
            const selectionView = document.getElementById('wizAccountSelectionView');
            const linkedView = document.getElementById('wizAccountLinkedView');
            if (selectionView) selectionView.style.display = 'block';
            if (linkedView) linkedView.style.display = 'none';
            if (nextBtn && currentStep === 0) {
                nextBtn.style.display = 'none';
            }
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
                let startStep = 0;
                try {
                    const u = await api.getUserJson();
                    if (u && u.username && u.username !== 'Player' && (u.account_type === 'microsoft' || u.account_type === 'helloworld')) {
                        startStep = 1;
                    }
                } catch (_) {}
                openWizard(startStep);
            }
        } catch (e) {
            console.error("Failed to check onboarding status:", e);
        }
    }

    function openWizard(startStep = 0) {
        overlay.classList.add('active');
        if (startStep <= 1) tutorialCompleted = false;
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
            openWizard(0); // Re-open from Step 0 (shows linked account or login options)
        });
    }

    // Start
    if (window.hwlAPI) {
        initWizard();
    } else {
        window.addEventListener('pywebviewready', initWizard);
    }
});
