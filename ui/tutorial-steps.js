/**
 * TUTORIAL STEP 1: Create Installation
 *
 * Refactored for Broad Modal Spotlight & Dynamic Tooltips
 */

(function () {
    'use strict';

    let tutorialPhase = 'idle';

    /**
     * Start the first tutorial (Create Installation)
     */
    window.startTutorialStep1 = async function () {
        window.currentActiveTutorialStep = 1;
        tutorialPhase = 'profile';

        // Check if user is on Play section
        const playSection = document.getElementById('play');
        const isOnPlay = playSection && playSection.classList.contains('active');

        if (!isOnPlay) {
            await startSpotlightTutorial([
                {
                    target: '#playNavBtn',
                    title: 'Go to Play',
                    text: 'First, go to the Play section to start.',
                    hint: 'Click here',
                    position: 'right',
                    onComplete: async () => {
                        await new Promise(r => setTimeout(r, 500));
                    }
                }
            ], () => {
                setTimeout(() => startProfileTutorial(), 600);
            });
        } else {
            startProfileTutorial();
        }
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
            let title = 'Configure Installation';
            let text = 'Fill in the details for your new installation.';

            if (e && e.target) {
                if (e.target.id === 'profileName') {
                    title = 'Installation Name';
                    text = 'Give your installation a unique name (e.g., "Survival World"). Min 3 characters.';
                } else if (e.target.id === 'profileSoftwareSelect') {
                    title = 'Software Type';
                    text = 'Choose Vanilla for standard gameplay, or Forge/Fabric if you want to use mods.';
                } else if (e.target.id === 'profileMcVersionSelect') {
                    title = 'Minecraft Version';
                    text = 'Select the Minecraft version this installation will use.';
                } else if (e.target.id === 'profileLoaderVersionSelect') {
                    title = 'Loader Version';
                    text = 'Select the version of the mod loader. Only shown for Forge/Fabric.';
                } else if (e.target.id === 'profileDir' || e.target.id === 'selectFolderBtn') {
                    title = 'Installation Directory';
                    text = 'Folder where this installation\'s data will be saved (worlds, mods, settings). Useful for keeping modpacks separate.';
                } else if (e.target.id === 'profileJavaPath') {
                    title = 'Java Path (Advanced)';
                    text = 'Optional: Specify a custom Java executable. Leave empty to use the bundled Java.';
                } else if (e.target.id === 'profileJVMArgs') {
                    title = 'JVM Arguments (Advanced)';
                    text = 'Optional: Customize RAM allocation (e.g., -Xmx4G). The default is usually fine.';
                }
            } else {
                title = 'Configure & Create';
                text = 'Customize your installation details: choose Software, Minecraft Version, and optionally a Loader Version.';
            }

            if (window.updateSpotlightContent) {
                window.updateSpotlightContent(title, text, 'Click "Create" when done');
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
                title: 'Go to Installations',
                text: 'Navigate to the Installations section.',
                hint: 'Click "Installations"',
                position: 'right',
                onComplete: async () => { await new Promise(r => setTimeout(r, 400)); }
            },
            {
                target: '#createProfileBtn',
                title: 'Create New Installation',
                text: 'Click here to create a new installation.',
                hint: 'Click "Create new installation"',
                position: 'bottom',
                onComplete: async () => { await new Promise(r => setTimeout(r, 400)); }
            },
            // Main Config Step
            {
                target: '#modal .modal-content',
                title: 'Configure Installation',
                text: 'Customize your installation. Choose Software, Minecraft Version, and optionally a Loader.',
                hint: 'Click "Create" when done',
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
                if (loginBtn) loginBtn.style.display = 'flex';
                if (badge) {
                    badge.style.display = 'none';
                    badge.classList.remove('active');
                }
                if (skinsBtn) skinsBtn.style.display = 'none';
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
                title: 'Log In',
                text: 'Click here to log in. You can use a Microsoft, HelloWorld, or Offline account.',
                hint: 'Click "Login"',
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
                title: 'Select Login Method',
                text: 'Choose your preferred method. Microsoft and HelloWorld accounts allow skins and online play.',
                hint: 'Select an option',
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
                                    'HelloWorld Account',
                                    'If you don\'t have a HelloWorld account, you must create one on the website first, then log in here.',
                                    'Log in to continue'
                                );
                            }
                        });
                    }

                    const hwBackBtn = document.getElementById('hwBackBtn');
                    if (hwBackBtn) {
                        hwBackBtn.addEventListener('click', () => {
                            if (window.updateSpotlightContent) {
                                window.updateSpotlightContent(
                                    'Select Login Method',
                                    'Choose your preferred method. Microsoft and HelloWorld accounts allow skins and online play.',
                                    'Select an option'
                                );
                            }
                        });
                    }

                    // Hook into login success — preserve original behavior
                    const originalOnLoginSuccess = window.onLoginSuccess;
                    window.onLoginSuccess = async function () {
                        if (originalOnLoginSuccess) {
                            await originalOnLoginSuccess();
                        }

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
                    title: 'Skins & Capes',
                    text: 'Microsoft accounts can manage Skins and Capes here.',
                    hint: 'Click "Skins & Capes"',
                    position: 'right',
                    onComplete: async () => { await new Promise(r => setTimeout(r, 500)); }
                },
                {
                    target: '#createSkinPackBtn',
                    title: 'Create Skin Pack',
                    text: 'Organize your skins into packs.',
                    hint: 'Click "Create New Skin Pack"',
                    position: 'bottom',
                    onComplete: async () => { await new Promise(r => setTimeout(r, 400)); }
                },
                {
                    target: '#skinPackModal .modal-content',
                    title: 'New Skin Pack',
                    text: 'Fill in the details and create your pack.',
                    hint: 'Click "Create"',
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
                        return document.querySelector('.skin-pack-card .btn-blue');
                    },
                    title: 'Select Skin',
                    text: 'Click "Use" to apply this skin.',
                    hint: 'Click "Use"',
                    position: 'bottom',
                    // Wait a bit for list to render if needed
                    beforeShow: async () => {
                        await new Promise(r => setTimeout(r, 500));
                        // Determine if we have a target
                        if (!document.querySelector('.skin-pack-card .btn-blue')) {
                            console.warn("No skin card found, skipping step");
                            window.advanceSpotlightTutorial();
                        }
                    },
                    onComplete: async () => { await new Promise(r => setTimeout(r, 500)); }
                },
                {
                    target: '.large-skin-preview-sticky',
                    title: 'Skin Applied!',
                    text: 'Your character now uses the selected skin. You are ready to play!<button id="tutorialFinishBtn" class="btn-primary" style="margin-top:15px; width:100%;" onclick="if(window.onTutorialStep2Complete) window.onTutorialStep2Complete(); window.advanceSpotlightTutorial();">Finish</button>',
                    hint: 'Click Finish above',
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
                    title: 'Login Successful',
                    text: 'You are now logged in. Remember that in Offline mode, you cannot change skins or play on online-mode servers.<button id="tutorialFinishBtnOffline" class="btn-primary" style="margin-top:15px; width:100%;" onclick="if(window.onTutorialStep2Complete) window.onTutorialStep2Complete(); window.advanceSpotlightTutorial();">Finish</button>',
                    hint: 'Click Finish above',
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
                    title: 'Login Successful',
                    text: 'You are now logged in with HelloWorld. You can manage your skins and capes directly from the website dashboard.<button id="tutorialFinishBtnHW" class="btn-primary" style="margin-top:15px; width:100%;" onclick="if(window.onTutorialStep2Complete) window.onTutorialStep2Complete(); window.advanceSpotlightTutorial();">Finish</button>',
                    hint: 'Click Finish above',
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
                    window.updateSpotlightContent('Downloading...', `Please wait while the mod downloads. Progress: ${percentage}%...`, 'Installing...');
                }
            }
        };

        const originalOnModDownloadComplete = window.onModDownloadComplete;
        window.onModDownloadComplete = function (projectId, filename) {
            if (originalOnModDownloadComplete) originalOnModDownloadComplete(projectId, filename);
            if (downloadingProjectId === projectId) {
                if (window.updateSpotlightContent) {
                    window.updateSpotlightContent(
                        'Installation Complete!',
                        'Your mod has been installed successfully! You can manage it anytime in the "Installed" tab.<button id="tutorialFinishBtnStep3" class="btn-primary" style="margin-top:15px; width:100%;" onclick="if(window.onTutorialStep3Complete) window.onTutorialStep3Complete(); if(window.advanceSpotlightTutorial) window.advanceSpotlightTutorial();">Finish</button>',
                        'Click Finish above'
                    );
                }
            }
        };

        const originalOnModDownloadError = window.onModDownloadError;
        window.onModDownloadError = function (projectId, errorMsg) {
            if (originalOnModDownloadError) originalOnModDownloadError(projectId, errorMsg);
            if (downloadingProjectId === projectId) {
                if (window.updateSpotlightContent) {
                    window.updateSpotlightContent('Error', `Installation failed: ${errorMsg}`, 'Please try again later.');
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
                    title: 'Add-ons Menu',
                    text: 'Expand the Add-ons menu to access Mods, Resource Packs, Data Packs, and Shaders.',
                    hint: 'Click "Add-ons"',
                    position: 'right',
                    advanceOn: 'click',
                    onComplete: async () => {
                        await new Promise(r => setTimeout(r, 400));
                    }
                },
                {
                    target: '#modsSubmenu .submenu-item',
                    title: 'Manage Mods',
                    text: 'Click here to explore and install mods.',
                    hint: 'Click "Mods"',
                    position: 'right',
                    advanceOn: 'click',
                    onComplete: async () => {
                        await new Promise(r => setTimeout(r, 500));
                    }
                },
                {
                    target: '#noModdableProfiles',
                    title: 'Mod Loader Required',
                    text: 'You need an installation with Forge or Fabric to use mods. Let\'s create one now.',
                    hint: 'Click to continue',
                    position: 'bottom',
                    advanceOn: 'manual',
                    beforeShow: async () => {
                        // Wait a moment for the section to render
                        await new Promise(r => setTimeout(r, 300));
                        if (window.advanceSpotlightTutorial) window.advanceSpotlightTutorial();
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
                title: 'Add-ons Menu',
                text: 'Expand the Add-ons menu to access Mods, Resource Packs, Data Packs, and Shaders.',
                hint: 'Click "Add-ons"',
                position: 'right',
                advanceOn: 'click',
                onComplete: async () => {
                    await new Promise(r => setTimeout(r, 400));
                }
            },
            {
                target: '#modsSubmenu .submenu-item',
                title: 'Manage Mods',
                text: 'Click here to explore and install mods.',
                hint: 'Click "Mods"',
                position: 'right',
                advanceOn: 'click',
                onComplete: async () => {
                    await new Promise(r => setTimeout(r, 500));
                }
            },
            {
                target: '#modsProfileSelect',
                title: 'Select Installation',
                text: 'Choose an installation with Forge or Fabric. This determines which mods are compatible.',
                hint: 'Click the dropdown',
                position: 'bottom',
                advanceOn: 'click',
                onComplete: async () => {
                    await new Promise(r => setTimeout(r, 600));
                }
            },
            {
                target: '.mods-download-flex',
                title: 'Search, Filter & Install Mods',
                text: 'Search mods above, use the filters on the right to sort and pick categories, and navigate pages with the arrows. When you find a mod you like, click its "Download" button to install it.',
                hint: 'Click "Download" on a mod',
                position: 'left',
                advanceOn: 'manual',
                beforeShow: () => {
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
                                    window.updateSpotlightContent('Downloading...', 'Please wait while the mod downloads. Progress: 0%', 'Installing...');
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
