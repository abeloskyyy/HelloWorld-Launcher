/**
 * TUTORIAL STEP 1: Create Installation
 *
 * Refactored for Broad Modal Spotlight & Dynamic Tooltips
 */

(function () {
    'use strict';

    let tutorialPhase = 'idle';

    // Shorthand helper — called at runtime so language is always current
    const t = (key, vars) => window.t ? window.t(key, vars) : key;

    /**
     * Start the first tutorial (Create Installation)
     */
    window.startTutorialStep1 = async function () {
        window.currentActiveTutorialStep = 1;
        tutorialPhase = 'profile';
        startProfileTutorial();
    };

    /**
     * Profile Creation Tutorial Flow
     */
    async function startProfileTutorial() {
        tutorialPhase = 'profile';

        const nameInput = document.getElementById('profileName');
        const swSelect = document.getElementById('profileSoftwareSelect');
        const mcSelect = document.getElementById('profileMcVersionSelect');
        const loaderSelect = document.getElementById('profileLoaderVersionSelect');
        const dirInput = document.getElementById('profileDir');
        const dirBtn = document.getElementById('selectFolderBtn');
        const javaInput = document.getElementById('profileJavaPath');
        const jvmInput = document.getElementById('profileJVMArgs');
        const createBtn = document.getElementById('acceptProfileBtn');

        const updateProfileTooltip = (e) => {
            let title = t('tutorial_spotlight.step1.tooltip_default_title');
            let text  = t('tutorial_spotlight.step1.tooltip_default_text');

            if (e && e.target) {
                if (e.target.id === 'profileName') {
                    title = t('tutorial_spotlight.step1.tooltip_name_title');
                    text  = t('tutorial_spotlight.step1.tooltip_name_text');
                } else if (e.target.id === 'profileSoftwareSelect') {
                    title = t('tutorial_spotlight.step1.tooltip_software_title');
                    text  = t('tutorial_spotlight.step1.tooltip_software_text');
                } else if (e.target.id === 'profileMcVersionSelect') {
                    title = t('tutorial_spotlight.step1.tooltip_mc_title');
                    text  = t('tutorial_spotlight.step1.tooltip_mc_text');
                } else if (e.target.id === 'profileLoaderVersionSelect') {
                    title = t('tutorial_spotlight.step1.tooltip_loader_title');
                    text  = t('tutorial_spotlight.step1.tooltip_loader_text');
                } else if (e.target.id === 'profileDir' || e.target.id === 'selectFolderBtn') {
                    title = t('tutorial_spotlight.step1.tooltip_dir_title');
                    text  = t('tutorial_spotlight.step1.tooltip_dir_text');
                } else if (e.target.id === 'profileJavaPath') {
                    title = t('tutorial_spotlight.step1.tooltip_java_title');
                    text  = t('tutorial_spotlight.step1.tooltip_java_text');
                } else if (e.target.id === 'profileJVMArgs') {
                    title = t('tutorial_spotlight.step1.tooltip_jvm_title');
                    text  = t('tutorial_spotlight.step1.tooltip_jvm_text');
                }
            }

            if (window.updateSpotlightContent) {
                window.updateSpotlightContent(title, text, t('tutorial_spotlight.step1.configure_click_create'));
            }
        };

        // Attach listeners
        [nameInput, swSelect, mcSelect, loaderSelect, dirInput, dirBtn, javaInput, jvmInput].forEach(el => {
            if (el) el.addEventListener('focus', updateProfileTooltip);
            if (el && el.tagName !== 'INPUT' && el.tagName !== 'SELECT') {
                el.addEventListener('click', (e) => updateProfileTooltip(e));
            }
        });

        // Start Flow
        await startSpotlightTutorial([
            {
                target: '#profilesNavBtn',
                title: t('tutorial_spotlight.step1.go_installations_title'),
                text: t('tutorial_spotlight.step1.go_installations_text'),
                hint: t('tutorial_spotlight.step1.go_installations_hint'),
                position: 'right',
                onComplete: async () => { await new Promise(r => setTimeout(r, 400)); }
            },
            {
                target: '#createProfileBtn',
                title: t('tutorial_spotlight.step1.create_title'),
                text: t('tutorial_spotlight.step1.create_text'),
                hint: t('tutorial_spotlight.step1.create_hint'),
                position: 'bottom',
                onComplete: async () => { await new Promise(r => setTimeout(r, 400)); }
            },
            // Main Config Step
            {
                target: '#modal .modal-content',
                title: t('tutorial_spotlight.step1.configure_title'),
                text: t('tutorial_spotlight.step1.configure_text'),
                hint: t('tutorial_spotlight.step1.configure_hint'),
                position: 'right',
                advanceOn: 'manual',
                beforeShow: () => {
                    if (createBtn) createBtn.addEventListener('click', onCreateClick);
                    updateProfileTooltip();
                }
            }
        ]);

        async function onCreateClick() {
            const nameInput = document.getElementById('profileName');
            const mcSelect = document.getElementById('profileMcVersionSelect');
            if (nameInput && nameInput.value.length >= 2 && mcSelect && mcSelect.value) {
                if (createBtn) createBtn.removeEventListener('click', onCreateClick);

                const profileModal = document.getElementById('modal');
                const checkModalClosed = setInterval(() => {
                    if (!profileModal || !profileModal.classList.contains('show')) {
                        clearInterval(checkModalClosed);
                        if (window.endSpotlightTutorial) window.endSpotlightTutorial();
                        setTimeout(showTutorialPart1Complete, 500);
                    }
                }, 200);

                setTimeout(() => clearInterval(checkModalClosed), 10000);
            }
        }
    }

    /**
     * End Part 1 and return to onboarding wizard
     */
    function showTutorialPart1Complete() {
        endSpotlightTutorial();
        endTutorialStep1();
    }

    /**
     * End Tutorial Step 1 and transition to next
     */
    function endTutorialStep1() {
        tutorialPhase = 'complete';
        if (window.onTutorialStep1Complete) {
            window.onTutorialStep1Complete();
        }
    }

    /**
     * TUTORIAL STEP 2: Identity & Access
     */
    window.startTutorialStep2 = async function () {
        window.currentActiveTutorialStep = 2;
        // --- Auto-logout if already authenticated ---
        try {
            const userData = await window.pywebview.api.get_user_json();
            if (userData && userData.username && userData.username.trim()) {
                await window.pywebview.api.logout_user();
                // Reset UI to logged-out state
                const loginBtn = document.getElementById('loginButton');
                const badge = document.getElementById('userBadge');
                const skinsBtn = document.getElementById('skinsSidebarBtn');
                const statsBtn = document.getElementById('statsBtn');
                const socialBtn = document.getElementById('socialBtn');
                const streakContainer = document.getElementById('streakBadgeContainer');
                const pcBar = document.getElementById('profileCompletionBar');
                const badgeWrapper = document.getElementById('userBadgeWrapper');

                if (loginBtn) loginBtn.style.display = 'flex';
                if (badge) { badge.style.display = 'none'; badge.classList.remove('active'); }
                if (skinsBtn) { skinsBtn.style.display = 'none'; skinsBtn.classList.add('locked-feature'); }
                if (statsBtn) statsBtn.style.display = 'none';
                if (socialBtn) socialBtn.style.display = 'none';
                if (streakContainer) streakContainer.style.display = 'none';
                if (pcBar) pcBar.style.display = 'none';
                if (badgeWrapper) badgeWrapper.style.display = 'none';

                await new Promise(r => setTimeout(r, 300));
            }
        } catch (e) {
            console.warn('Could not check/logout user for tutorial:', e);
        }

        // --- Prevent modal from closing on outside click during tutorial ---
        const loginModal = document.getElementById('loginModal');
        const closeLoginModalBtn = document.getElementById('closeLoginModal');

        // Block backdrop click during tutorial
        function blockBackdropClose(e) {
            if (e.target === loginModal) {
                e.stopImmediatePropagation();
                e.preventDefault();
            }
        }
        if (loginModal) {
            loginModal.addEventListener('click', blockBackdropClose, true);
        }
        // Block close button during tutorial
        function blockCloseBtn(e) {
            e.stopImmediatePropagation();
            e.preventDefault();
        }
        if (closeLoginModalBtn) {
            closeLoginModalBtn.addEventListener('click', blockCloseBtn, true);
        }

        // Cleanup function to restore normal modal behavior
        function restoreModalBehavior() {
            if (loginModal) loginModal.removeEventListener('click', blockBackdropClose, true);
            if (closeLoginModalBtn) closeLoginModalBtn.removeEventListener('click', blockCloseBtn, true);
        }

        // Ensure we restore behavior if skipped
        const originalOnTutorialStep2Complete = window.onTutorialStep2Complete;
        window.onTutorialStep2Complete = async () => {
            restoreModalBehavior();
            if (originalOnTutorialStep2Complete) await originalOnTutorialStep2Complete();
        };

        // 1. Spotlight Login Button
        await startSpotlightTutorial([
            {
                target: '#loginButton',
                title: t('tutorial_spotlight.step2.login_title'),
                text: t('tutorial_spotlight.step2.login_text'),
                hint: t('tutorial_spotlight.step2.login_hint'),
                position: 'bottom',
                advanceOn: 'click',
                onComplete: async () => {
                    // Ensure login modal is open
                    if (loginModal && !loginModal.classList.contains('show')) {
                        loginModal.classList.add('show');
                    }
                    // Wait for modal animation
                    await new Promise(r => setTimeout(r, 600));
                }
            },
            {
                target: '#loginModal .modal-content',
                title: t('tutorial_spotlight.step2.method_title'),
                text: t('tutorial_spotlight.step2.method_text'),
                hint: t('tutorial_spotlight.step2.method_hint'),
                position: 'right',
                advanceOn: 'manual',
                beforeShow: async () => {
                    // Elevate the login modal above overlay
                    if (loginModal) {
                        loginModal.classList.add('tutorial-elevated-modal');
                    }
                    await new Promise(r => setTimeout(r, 300));

                    // Hide spotlight when clicking login to avoid it jumping to top-left
                    const hideSpotlight = () => {
                        const spotlight = document.querySelector('.tutorial-spotlight');
                        const tooltip = document.querySelector('.tutorial-tooltip');
                        if (spotlight) spotlight.style.opacity = '0';
                        if (tooltip) tooltip.style.opacity = '0';
                    };
                    ['selectMicrosoftBtn', 'selectOfflineBtn'].forEach(id => {
                        const btn = document.getElementById(id);
                        if (btn) btn.addEventListener('click', hideSpotlight);
                    });

                    const hwBtn = document.getElementById('selectHelloWorldBtn');
                    if (hwBtn) {
                        hwBtn.addEventListener('click', () => {
                            if (window.updateSpotlightContent) {
                                window.updateSpotlightContent(
                                    t('tutorial_spotlight.step2.hw_account_title'),
                                    t('tutorial_spotlight.step2.hw_account_text'),
                                    t('tutorial_spotlight.step2.hw_account_hint')
                                );
                            }
                        });
                    }

                    const hwBackBtn = document.getElementById('hwBackBtn');
                    if (hwBackBtn) {
                        hwBackBtn.addEventListener('click', () => {
                            if (window.updateSpotlightContent) {
                                window.updateSpotlightContent(
                                    t('tutorial_spotlight.step2.method_title'),
                                    t('tutorial_spotlight.step2.method_text'),
                                    t('tutorial_spotlight.step2.method_hint')
                                );
                            }
                        });
                    }

                    // Hook into login success — preserve original behavior
                    const originalOnLoginSuccess = window.onLoginSuccess;
                    window.onLoginSuccess = async function () {
                        // IMMEDIATELY restore to prevent re-triggering (e.g., from Firestore/skin updates)
                        window.onLoginSuccess = originalOnLoginSuccess;

                        if (originalOnLoginSuccess) {
                            await originalOnLoginSuccess();
                        }

                        // Restore userBadgeWrapper — it was hidden during tutorial logout
                        // but originalOnLoginSuccess only shows userBadge, not its wrapper
                        const badgeWrapper = document.getElementById('userBadgeWrapper');
                        if (badgeWrapper) badgeWrapper.style.display = '';

                        // Restore modal behavior
                        restoreModalBehavior();

                        // Close the login modal
                        if (loginModal) {
                            loginModal.classList.remove('show');
                            loginModal.classList.remove('tutorial-elevated-modal');
                        }

                        // Small delay for UI update
                        await new Promise(r => setTimeout(r, 800));

                        // End current spotlight
                        if (window.endSpotlightTutorial) window.endSpotlightTutorial();

                        // Wait for user badge to appear
                        await waitForElement('#userBadge', 5000);
                        await new Promise(r => setTimeout(r, 500));

                        // Check account type and branch
                        try {
                            const data = await window.pywebview.api.get_user_json();
                            if (data && data.account_type === 'microsoft') {
                                startMicrosoftFlow();
                            } else if (data && data.account_type === 'helloworld') {
                                startHelloWorldFlow();
                            } else {
                                startOfflineFlow();
                            }
                        } catch (e) {
                            console.error('Error getting user data:', e);
                            startOfflineFlow();
                        }
                    };
                    // beforeShow returns here — spotlight renders
                }
            }
        ]);

        /**
         * Helper: wait for an element to be visible in DOM
         */
        function waitForElement(selector, timeout = 5000) {
            return new Promise((resolve) => {
                const el = document.querySelector(selector);
                if (el && el.offsetParent !== null && el.style.display !== 'none') {
                    return resolve(el);
                }
                const interval = setInterval(() => {
                    const el = document.querySelector(selector);
                    if (el && el.offsetParent !== null && el.style.display !== 'none') {
                        clearInterval(interval);
                        resolve(el);
                    }
                }, 200);
                // Timeout
                setTimeout(() => { clearInterval(interval); resolve(null); }, timeout);
            });
        }

        async function startMicrosoftFlow() {
            // Wait for skins button to be visible
            await waitForElement('#skinsSidebarBtn', 5000);
            await new Promise(r => setTimeout(r, 300));

            await startSpotlightTutorial([
                {
                    target: '#skinsSidebarBtn',
                    title: t('tutorial_spotlight.step2.skins_capes_title'),
                    text: t('tutorial_spotlight.step2.skins_capes_text'),
                    hint: t('tutorial_spotlight.step2.skins_capes_hint'),
                    position: 'right',
                    onComplete: async () => { await new Promise(r => setTimeout(r, 500)); }
                },
                {
                    target: '#createSkinPackBtn',
                    title: t('tutorial_spotlight.step2.create_skin_pack_title'),
                    text: t('tutorial_spotlight.step2.create_skin_pack_text'),
                    hint: t('tutorial_spotlight.step2.create_skin_pack_hint'),
                    position: 'bottom',
                    onComplete: async () => { await new Promise(r => setTimeout(r, 400)); }
                },
                {
                    target: '#skinPackModal .modal-content',
                    title: t('tutorial_spotlight.step2.new_skin_pack_title'),
                    text: t('tutorial_spotlight.step2.new_skin_pack_text'),
                    hint: t('tutorial_spotlight.step2.new_skin_pack_hint'),
                    position: 'right',
                    advanceOn: 'manual',
                    beforeShow: () => {
                        // Create logic handled by scripts-skinpacks.js
                        // We wait for modal to close
                        const skinPackModal = document.getElementById('skinPackModal');
                        const checkClosed = setInterval(() => {
                            if (!skinPackModal || !skinPackModal.classList.contains('show')) {
                                clearInterval(checkClosed);
                                const spotlight = document.querySelector('.tutorial-spotlight');
                                const tooltip = document.querySelector('.tutorial-tooltip');
                                if (spotlight) spotlight.style.opacity = '0';
                                if (tooltip) tooltip.style.opacity = '0';
                                if (window.advanceSpotlightTutorial) window.advanceSpotlightTutorial();
                            }
                        }, 200);
                    }
                },
                {
                    // Spotlight the "Use" button of any available skin card
                    target: () => {
                        return document.querySelector('.skin-pack-card .btn-skin-use, .skin-pack-card .btn-blue');
                    },
                    title: t('tutorial_spotlight.step2.select_skin_title'),
                    text: t('tutorial_spotlight.step2.select_skin_text'),
                    hint: t('tutorial_spotlight.step2.select_skin_hint'),
                    position: 'bottom',
                    // Wait a bit for list to render if needed
                    beforeShow: async () => {
                        await new Promise(r => setTimeout(r, 500));
                        // Determine if we have a target
                        if (!document.querySelector('.skin-pack-card .btn-skin-use, .skin-pack-card .btn-blue')) {
                            console.warn("No skin card found, skipping step");
                            window.advanceSpotlightTutorial();
                        }
                    },
                    onComplete: async () => { await new Promise(r => setTimeout(r, 500)); }
                },
                {
                    target: '.large-skin-preview-sticky',
                    title: t('tutorial_spotlight.step2.skin_applied_title'),
                    text: `${t('tutorial_spotlight.step2.skin_applied_text')}<button id="tutorialFinishBtn" class="btn-primary" style="margin-top:15px; width:100%;" onclick="window.advanceSpotlightTutorial(); setTimeout(function(){ if(window.onTutorialStep2Complete) window.onTutorialStep2Complete(); }, 350);">${t('tutorial_spotlight.step2.finish')}</button>`,
                    hint: t('tutorial_spotlight.step2.skin_applied_hint'),
                    position: 'left',
                    advanceOn: 'manual'
                }
            ]);
        }

        async function startOfflineFlow() {
            // Wait for user badge to be visible
            await waitForElement('#userBadge', 5000);
            await new Promise(r => setTimeout(r, 300));

            await startSpotlightTutorial([
                {
                    target: '#userBadge',
                    title: t('tutorial_spotlight.step2.offline_success_title'),
                    text: `${t('tutorial_spotlight.step2.offline_success_text')}<button id="tutorialFinishBtnOffline" class="btn-primary" style="margin-top:15px; width:100%;" onclick="window.advanceSpotlightTutorial(); setTimeout(function(){ if(window.onTutorialStep2Complete) window.onTutorialStep2Complete(); }, 350);">${t('tutorial_spotlight.step2.finish')}</button>`,
                    hint: t('tutorial_spotlight.step2.offline_success_hint'),
                    position: 'bottom',
                    advanceOn: 'manual'
                }
            ]);
        }

        async function startHelloWorldFlow() {
            // Wait for user badge to be visible
            await waitForElement('#userBadge', 5000);
            await new Promise(r => setTimeout(r, 300));

            await startSpotlightTutorial([
                {
                    target: '#userBadge',
                    title: t('tutorial_spotlight.step2.hw_success_title'),
                    text: `${t('tutorial_spotlight.step2.hw_success_text')}<button id="tutorialFinishBtnHW" class="btn-primary" style="margin-top:15px; width:100%;" onclick="window.advanceSpotlightTutorial(); setTimeout(function(){ if(window.onTutorialStep2Complete) window.onTutorialStep2Complete(); }, 350);">${t('tutorial_spotlight.step2.finish')}</button>`,
                    hint: t('tutorial_spotlight.step2.hw_success_hint'),
                    position: 'bottom',
                    advanceOn: 'manual'
                }
            ]);
        }
    };

    /**
     * TUTORIAL STEP 3: Mods & Addons
     * A fast flow to show users how to install mods
     */
    window.startTutorialStep3 = async function () {
        window.currentActiveTutorialStep = 3;
        let downloadingProjectId = null;
        let cardHoverListener = null;

        // Hook download events
        const originalOnModDownloadProgress = window.onModDownloadProgress;
        window.onModDownloadProgress = function (projectId, percentage, status) {
            if (originalOnModDownloadProgress) originalOnModDownloadProgress(projectId, percentage, status);
            if (downloadingProjectId === projectId) {
                if (window.updateSpotlightContent) {
                    window.updateSpotlightContent(
                        t('tutorial_spotlight.step3.downloading_title'),
                        t('tutorial_spotlight.step3.downloading_text', { percentage }),
                        t('tutorial_spotlight.step3.downloading_hint')
                    );
                }
            }
        };

        const originalOnModDownloadComplete = window.onModDownloadComplete;
        window.onModDownloadComplete = function (projectId, filename) {
            if (originalOnModDownloadComplete) originalOnModDownloadComplete(projectId, filename);
            if (downloadingProjectId === projectId) {
                if (window.updateSpotlightContent) {
                    window.updateSpotlightContent(
                        t('tutorial_spotlight.step3.complete_title'),
                        `${t('tutorial_spotlight.step3.complete_text')}<button id="tutorialFinishBtnStep3" class="btn-primary" style="margin-top:15px; width:100%;" onclick="if(window.advanceSpotlightTutorial) window.advanceSpotlightTutorial(); setTimeout(function(){ if(window.onTutorialStep3Complete) window.onTutorialStep3Complete(); }, 350);">${t('tutorial_spotlight.step3.finish')}</button>`,
                        t('tutorial_spotlight.step3.complete_hint')
                    );
                }
            }
        };

        const originalOnModDownloadError = window.onModDownloadError;
        window.onModDownloadError = function (projectId, errorMsg) {
            if (originalOnModDownloadError) originalOnModDownloadError(projectId, errorMsg);
            if (downloadingProjectId === projectId) {
                if (window.updateSpotlightContent) {
                    window.updateSpotlightContent(
                        t('tutorial_spotlight.step3.error_title'),
                        t('tutorial_spotlight.step3.error_text', { errorMsg }),
                        t('tutorial_spotlight.step3.error_hint')
                    );
                }
                setTimeout(() => {
                    if (window.endSpotlightTutorial) window.endSpotlightTutorial();
                }, 3000);
            }
        };

        // Check if user has any moddable profiles first
        let hasModdableProfiles = false;
        try {
            if (window.pywebview && window.pywebview.api && window.pywebview.api.get_profiles_for_addon) {
                const data = await window.pywebview.api.get_profiles_for_addon('mod');
                const profiles = data && data.profiles ? data.profiles : {};
                hasModdableProfiles = Object.keys(profiles).length > 0;
            }
        } catch (e) {
            console.warn('Could not check moddable profiles for tutorial:', e);
        }

        if (!hasModdableProfiles) {
            // No moddable profiles: guide user to create one
            await startSpotlightTutorial([
                {
                    target: '#modsMenuBtn',
                    title: t('tutorial_spotlight.step3.addons_menu_title'),
                    text: t('tutorial_spotlight.step3.addons_menu_text'),
                    hint: t('tutorial_spotlight.step3.addons_menu_hint'),
                    position: 'right',
                    advanceOn: 'click',
                    onComplete: async () => {
                        await new Promise(r => setTimeout(r, 400));
                    }
                },
                {
                    target: '#modsSubmenu .submenu-item',
                    title: t('tutorial_spotlight.step3.no_loader_title'),
                    text: t('tutorial_spotlight.step3.no_loader_text'),
                    hint: t('tutorial_spotlight.step3.no_loader_hint'),
                    position: 'right',
                    advanceOn: 'click',
                    onComplete: async () => {
                        await new Promise(r => setTimeout(r, 500));
                    }
                }
            ], async () => {
                // After explaining, redirect to profile creation tutorial
                // Save original callback so we can chain back to mod tutorial
                const originalOnTutorialStep1Complete = window.onTutorialStep1Complete;
                window.onTutorialStep1Complete = async () => {
                    // Restore original
                    window.onTutorialStep1Complete = originalOnTutorialStep1Complete;
                    // Now retry the mod tutorial
                    setTimeout(() => window.startTutorialStep3(), 500);
                };
                // Start profile creation flow
                setTimeout(() => {
                    if (typeof window.startTutorialStep1 === 'function') {
                        window.startTutorialStep1();
                    } else if (typeof startProfileTutorial === 'function') {
                        startProfileTutorial();
                    }
                }, 400);
            });
            return;
        }

        // Main mod tutorial flow
        await startSpotlightTutorial([
            {
                target: '#modsMenuBtn',
                title: t('tutorial_spotlight.step3.addons_menu_title'),
                text: t('tutorial_spotlight.step3.addons_menu_text'),
                hint: t('tutorial_spotlight.step3.addons_menu_hint'),
                position: 'right',
                advanceOn: 'click',
                onComplete: async () => {
                    await new Promise(r => setTimeout(r, 400));
                }
            },
            {
                target: '#modsSubmenu .submenu-item',
                title: t('tutorial_spotlight.step3.manage_mods_title'),
                text: t('tutorial_spotlight.step3.manage_mods_text'),
                hint: t('tutorial_spotlight.step3.manage_mods_hint'),
                position: 'right',
                advanceOn: 'click',
                onComplete: async () => {
                    await new Promise(r => setTimeout(r, 500));
                }
            },
            {
                target: '#modsCustomSelect',
                title: t('tutorial_spotlight.step3.select_install_title'),
                text: t('tutorial_spotlight.step3.select_install_text'),
                hint: t('tutorial_spotlight.step3.select_install_hint'),
                position: 'bottom',
                advanceOn: 'manual',
                beforeShow: () => {
                    // Instead of hiding UI, we wait for a real selection via the change event.
                    // The custom select dispatches a 'change' on the native select underneath.
                    const profileSelect = document.getElementById('modsProfileSelect');
                    if (profileSelect) {
                        const handler = () => {
                            profileSelect.removeEventListener('change', handler);
                            if (window.advanceSpotlightTutorial) window.advanceSpotlightTutorial();
                        };
                        profileSelect.addEventListener('change', handler);
                    }
                }
            },
            {
                target: '.mods-download-flex',
                title: t('tutorial_spotlight.step3.search_title'),
                text: t('tutorial_spotlight.step3.search_text'),
                hint: t('tutorial_spotlight.step3.search_hint'),
                position: 'left',
                advanceOn: 'manual',
                beforeShow: async () => {
                    // Small delay to let the mods list render after installation selection
                    await new Promise(r => setTimeout(r, 800));
                    document.body.classList.add('tutorial-step-search');
                    const container = document.getElementById('modSearchResults');

                    // Prevent opening mod details during tutorial
                    const onCardClick = (e) => {
                        if (e.target.closest('.mod-card') && !e.target.closest('button')) {
                            e.stopPropagation();
                            e.preventDefault();
                        }
                    };
                    container.addEventListener('click', onCardClick, true);

                    // Hook download buttons
                    const hookButtons = () => {
                        const dlButtons = container.querySelectorAll('.mod-card-actions button');
                        dlButtons.forEach(btn => {
                            if (btn.getAttribute('data-hooked')) return;
                            btn.setAttribute('data-hooked', 'true');
                            const originalOnclick = btn.onclick;
                            btn.onclick = (event) => {
                                document.body.classList.remove('tutorial-step-search');
                                container.removeEventListener('click', onCardClick, true);
                                downloadingProjectId = btn.id.replace('btn-mod-', '');
                                if (window.updateSpotlightContent) {
                                    window.updateSpotlightContent(
                                        t('tutorial_spotlight.step3.downloading_title'),
                                        t('tutorial_spotlight.step3.downloading_start_text'),
                                        t('tutorial_spotlight.step3.downloading_hint')
                                    );
                                }
                                if (originalOnclick) originalOnclick(event);
                            };
                        });
                    };
                    const observer = new MutationObserver(hookButtons);
                    observer.observe(container, { childList: true, subtree: true });
                    hookButtons();
                }
            },
        ]);
    };

    // Expose functions
    window.startProfileTutorial = startProfileTutorial;
    // window.startTutorialStep2 and window.startTutorialStep3 exposed above by assignment

})();
