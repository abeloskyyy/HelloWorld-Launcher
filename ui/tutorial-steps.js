/**
 * TUTORIAL STEP 1: Download Version & Create Profile
 * 
 * Refactored for Broad Modal Spotlight & Dynamic Tooltips
 */

(function () {
    'use strict';

    // State tracking
    let downloadCompleted = false;
    let downloadCancelled = false;
    let tutorialPhase = 'idle'; // 'download', 'profile', 'complete'

    /**
     * Start the first tutorial (Download + Create Profile)
     */
    window.startTutorialStep1 = async function () {
        tutorialPhase = 'download';
        downloadCompleted = false;
        downloadCancelled = false;

        // Check if user is on Play section
        const playSection = document.getElementById('play');
        const isOnPlay = playSection && playSection.classList.contains('active');

        if (!isOnPlay) {
            // Guide user to Play section first
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
                // After clicking Play, start the actual tutorial
                setTimeout(() => startDownloadTutorial(), 600);
            });
        } else {
            // Already on Play, start directly
            startDownloadTutorial();
        }
    };

    /**
     * Download Version Tutorial Flow
     */
    async function startDownloadTutorial() {
        // Listen for download events
        setupDownloadListeners();

        // Step 1: Broad Modal for Version Selection
        const swSelectBtns = document.querySelectorAll('.loader-type-btn');
        const verSelect = document.getElementById('downloadMcVersion');
        const downBtn = document.getElementById('startDownloadBtn');

        // Helper to update tooltip based on selection
        const updateDownloadTooltip = (forceType) => {
            // Find active type if not forced
            let sw = forceType;
            if (!sw) {
                const activeBtn = document.querySelector('.loader-type-btn.active');
                sw = activeBtn ? activeBtn.dataset.type : 'vanilla';
            }

            let title = 'Select Version';
            let text = 'Choose your Minecraft version.';

            if (sw === 'vanilla') {
                title = 'Vanilla Minecraft';
                text = 'The original, unmodified game. Perfect for standard gameplay without mods. Select the release version you want to play.';
            } else if (sw === 'forge' || sw === 'fabric' || sw === 'quilt') {
                title = 'Mod Loader (' + sw.charAt(0).toUpperCase() + sw.slice(1) + ')';
                text = 'These versions allow you to install mods. Make sure to select the correct game version that matches your mods.';
            }

            if (window.updateSpotlightContent) {
                window.updateSpotlightContent(title, text, 'Configure and click Download');
            }
        };

        // Attach listeners
        swSelectBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Small delay to allow class update
                setTimeout(() => updateDownloadTooltip(btn.dataset.type), 50);
            });
        });

        if (verSelect) verSelect.addEventListener('change', () => updateDownloadTooltip());

        // Custom start logic
        await startSpotlightTutorial([
            // Step 1: Open Modal
            {
                target: '#openDownloadModalBtn',
                title: 'Download a Version',
                text: 'Click here to open the version downloader.',
                hint: 'Click "Download Versions"',
                position: 'bottom',
                onComplete: async () => {
                    await new Promise(r => setTimeout(r, 400));
                }
            },
            // Step 2: Broad Modal Interaction
            {
                target: '#downloadModal .modal-content',
                title: 'Select Software & Version',
                text: 'First, choose your software type (Vanilla, Forge, Fabric). Then select your game version.',
                hint: 'Configure and click Download',
                position: 'right', // Side of modal
                advanceOn: 'manual', // Manual advance when Download clicked
                beforeShow: async () => {
                    // Initial update
                    setTimeout(() => updateDownloadTooltip(), 100);

                    // Attach Download Click Listener to advance
                    if (downBtn) {
                        downBtn.addEventListener('click', onDownloadClick);
                    }
                }
            }
        ], () => {
            // Tutorial sequence ended
        });

        async function onDownloadClick() {
            if (downBtn) downBtn.removeEventListener('click', onDownloadClick);

            // Advance to monitor step
            if (window.advanceSpotlightTutorial) {
                await window.advanceSpotlightTutorial();

                // Manually start monitor
                setTimeout(monitorDownload, 500);
            }
        }
    }

    /**
     * Download Monitoring Step
     */
    async function monitorDownload() {
        const progressContainer = document.getElementById('downloadProgressContainer');
        // Wait for visibility
        let waited = 0;
        while ((!progressContainer || progressContainer.style.display === 'none') && waited < 5000) {
            await new Promise(r => setTimeout(r, 200));
            waited += 200;
        }

        if (progressContainer) {
            const modal = document.getElementById('downloadModal');
            if (modal) modal.classList.add('tutorial-elevated-modal');

            await startSpotlightTutorial([
                {
                    target: '#downloadProgressContainer',
                    title: 'Downloading...',
                    text: 'Please wait while we download the necessary files. This may take a few minutes depending on your connection.',
                    hint: 'Please wait...',
                    position: 'top',
                    advanceOn: 'manual' // Wait for completion
                }
            ]);
        }

        // Wait for result
        await waitForDownloadResult();
    }

    /**
     * Wait for download completion
     */
    function waitForDownloadResult() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                const modal = document.getElementById('downloadModal');

                if (downloadCompleted) {
                    clearInterval(checkInterval);
                    if (modal) modal.classList.remove('tutorial-elevated-modal');

                    if (window.endSpotlightTutorial) window.endSpotlightTutorial();

                    // Proceed to Profile Tutorial
                    setTimeout(() => {
                        startProfileTutorial();
                    }, 800);
                    resolve();
                } else if (downloadCancelled) {
                    clearInterval(checkInterval);
                    if (modal) modal.classList.remove('tutorial-elevated-modal');
                    if (window.endSpotlightTutorial) window.endSpotlightTutorial();
                    // Maybe show retry?
                    resolve();
                }
            }, 500);
        });
    }

    /**
     * Profile Creation Tutorial Flow
     */
    async function startProfileTutorial() {
        tutorialPhase = 'profile';

        const nameInput = document.getElementById('profileName');
        const verSelect = document.getElementById('profileVersionSelect');
        const dirInput = document.getElementById('profileDir');
        const dirBtn = document.getElementById('selectFolderBtn');
        const javaInput = document.getElementById('profileJavaPath');
        const jvmInput = document.getElementById('profileJVMArgs');
        const createBtn = document.getElementById('acceptProfileBtn');

        // Dynamic Tooltip Logic
        const updateProfileTooltip = (e) => {
            let title = 'Configure Profile';
            let text = 'Fill in the details for your new profile.';

            if (e && e.target) {
                if (e.target.id === 'profileName') {
                    title = 'Profile Name';
                    text = 'Give your profile a unique name (e.g., "Survival World"). Min 3 characters.';
                } else if (e.target.id === 'profileVersionSelect') {
                    title = 'Select Version';
                    text = 'Choose the version you just downloaded.';
                } else if (e.target.id === 'profileDir' || e.target.id === 'selectFolderBtn') {
                    title = 'Profile Directory';
                    text = 'Folder where this profile\'s data will be saved (worlds, mods, settings). Useful for keeping modpacks separate.';
                } else if (e.target.id === 'profileJavaPath') {
                    title = 'Java Path (Advanced)';
                    text = 'Optional: Specify a custom Java executable. Leave empty to use the bundled Java.';
                } else if (e.target.id === 'profileJVMArgs') {
                    title = 'JVM Arguments (Advanced)';
                    text = 'Optional: Customize RAM allocation (e.g., -Xmx4G). The default is usually fine.';
                }
            } else {
                // Default state
                title = 'Configure & Create';
                text = 'Customize your profile details. You can change the Icon, Name, and Version.';
            }

            if (window.updateSpotlightContent) {
                window.updateSpotlightContent(title, text, 'Click "Create" when done');
            }
        };

        // Icon modal integration removed - users can click the icon button freely during tutorial
        // The CSS rules ensure the button is clickable within the tutorial-target modal

        // Attach listeners
        [nameInput, verSelect, dirInput, dirBtn, javaInput, jvmInput].forEach(el => {
            if (el) el.addEventListener('focus', updateProfileTooltip);
            if (el && el.tagName !== 'INPUT' && el.tagName !== 'SELECT') {
                // For buttons like dirBtn
                el.addEventListener('click', (e) => {
                    updateProfileTooltip(e);
                });
            }
        });

        // Start Flow
        await startSpotlightTutorial([
            {
                target: '#profilesNavBtn',
                title: 'Go to Profiles',
                text: 'Navigate to the Profiles section.',
                hint: 'Click "Profiles"',
                position: 'right',
                onComplete: async () => { await new Promise(r => setTimeout(r, 400)); }
            },
            {
                target: '#createProfileBtn',
                title: 'Create New Profile',
                text: 'Click here to create a new profile.',
                hint: 'Click "Create Profile"',
                position: 'bottom',
                onComplete: async () => { await new Promise(r => setTimeout(r, 400)); }
            },
            // Main Config Step
            {
                target: '#modal .modal-content',
                title: 'Configure Profile',
                text: 'Customize your profile. Click on fields to see details, or click the Icon to change it.',
                hint: 'Click "Create" when done',
                position: 'right',
                advanceOn: 'manual',
                beforeShow: () => {
                    // Icon button is now freely clickable within the modal
                    if (createBtn) createBtn.addEventListener('click', onCreateClick);
                    updateProfileTooltip(); // Initial text
                }
            }
        ]);


        // --- Completion Logic ---
        async function onCreateClick() {
            // Basic validation check
            const nameInput = document.getElementById('profileName');
            if (nameInput && nameInput.value.length >= 3) {
                // Cleanup
                if (createBtn) createBtn.removeEventListener('click', onCreateClick);

                // Wait for the modal to close (profile creation successful)
                const profileModal = document.getElementById('modal');
                const checkModalClosed = setInterval(() => {
                    if (!profileModal || !profileModal.classList.contains('show')) {
                        clearInterval(checkModalClosed);

                        if (window.endSpotlightTutorial) window.endSpotlightTutorial();

                        // Return to wizard
                        setTimeout(showTutorialPart1Complete, 500);
                    }
                }, 200);

                // Timeout after 10 seconds if modal doesn't close
                setTimeout(() => {
                    clearInterval(checkModalClosed);
                }, 10000);
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
     * Setup download event listeners
     */
    function setupDownloadListeners() {
        const originalOnDownloadComplete = window.onDownloadComplete;
        window.onDownloadComplete = function (version) {
            downloadCompleted = true;
            if (originalOnDownloadComplete) {
                originalOnDownloadComplete(version);
            }
        };

        const cancelBtn = document.getElementById('cancelDownloadBtn2');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                downloadCancelled = true;
            }, { once: true });
        }
    }

    /**
     * TUTORIAL STEP 2: Identity & Access
     */
    window.startTutorialStep2 = async function () {
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

        // 1. Spotlight Login Button
        await startSpotlightTutorial([
            {
                target: '#loginButton',
                title: 'Log In',
                text: 'Click here to log in. You can use a Microsoft Account or play Offline.',
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
                text: 'Choose your preferred method. Microsoft accounts allow skins and online play.',
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
                    const msBtn = document.getElementById('selectMicrosoftBtn');
                    if (msBtn) {
                        msBtn.addEventListener('click', () => {
                            const spotlight = document.querySelector('.tutorial-spotlight');
                            const overlay = document.querySelector('.tutorial-overlay');
                            const tooltip = document.querySelector('.tutorial-tooltip');
                            if (spotlight) spotlight.style.opacity = '0';
                            if (tooltip) tooltip.style.opacity = '0';
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
    };

    /**
     * TUTORIAL STEP 3: Mods & Addons
     * A fast flow to show users how to install mods
     */
    window.startTutorialStep3 = async function () {
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
                // Let the checkmark show for a bit before advancing
                setTimeout(() => {
                    if (window.advanceSpotlightTutorial) window.advanceSpotlightTutorial();
                }, 1000);
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
                target: '#modsSubmenu .submenu-item', // The 'Mods' button
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
                target: '#modSearchInput',
                title: 'Search Mods',
                text: 'Type a mod name here (e.g. "Fabric API" or "Sodium"). Include spaces for better results.',
                hint: 'Type a name',
                position: 'bottom',
                advanceOn: 'manual', // Advance dynamically when results load
                beforeShow: () => {
                    const resultsContainer = document.getElementById('modSearchResults');

                    // We need to wait for cards to appear
                    const checkResults = setInterval(() => {
                        const cards = resultsContainer.querySelectorAll('.mod-card');
                        if (cards.length > 0) {
                            clearInterval(checkResults);
                            if (window.advanceSpotlightTutorial) window.advanceSpotlightTutorial();
                        }
                    }, 500);
                }
            },
            {
                target: '#modSearchResults', // Initially target the whole container
                title: 'Select a Mod',
                text: 'Hover over any mod card you like. Click the "Download" button to install it to your profile.',
                hint: 'Click "Download" on a mod',
                position: 'right',
                advanceOn: 'manual',
                beforeShow: () => {
                    document.body.classList.add('tutorial-step-search');
                    const container = document.getElementById('modSearchResults');

                    // 1. Hover logic with delegation
                    const onMouseMove = (e) => {
                        const card = e.target.closest('.mod-card');
                        if (card && window.setSpotlightTarget) {
                            const rect = card.getBoundingClientRect();
                            const isLeftHalf = rect.left + rect.width / 2 < window.innerWidth / 2;
                            window.setSpotlightTarget(card, isLeftHalf ? 'left' : 'right');
                        }
                    };
                    container.addEventListener('mousemove', onMouseMove);

                    // 2. Click blocker for details modal
                    const onCardClick = (e) => {
                        if (e.target.closest('.mod-card') && !e.target.closest('button')) {
                            e.stopPropagation();
                            e.preventDefault();
                        }
                    };
                    container.addEventListener('click', onCardClick, true);

                    // 3. Button hooks
                    const hookButtons = () => {
                        const dlButtons = container.querySelectorAll('.mod-card-actions button');
                        dlButtons.forEach(btn => {
                            if (btn.getAttribute('data-hooked')) return;
                            btn.setAttribute('data-hooked', 'true');
                            const originalOnclick = btn.onclick;
                            btn.onclick = (event) => {
                                document.body.classList.remove('tutorial-step-search');
                                container.removeEventListener('mousemove', onMouseMove);
                                container.removeEventListener('click', onCardClick, true);
                                downloadingProjectId = btn.id.replace('btn-mod-', '');
                                if (window.setSpotlightTarget) {
                                    const rect = btn.getBoundingClientRect();
                                    const pos = (rect.left + rect.width / 2 < window.innerWidth / 2) ? 'left' : 'right';
                                    window.setSpotlightTarget(btn, pos);
                                }
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
            {
                // This step is reached automatically via window.onModDownloadComplete hook
                target: '.mod-tab[data-tab="installed"]',
                title: 'Installation Complete!',
                text: 'Great! The mod has been installed. Now click on the "Installed" tab to manage it.',
                hint: 'Click "Installed"',
                position: 'bottom',
                advanceOn: 'click',
                onComplete: async () => {
                    await new Promise(r => setTimeout(r, 800)); // wait for list to render
                }
            },
            {
                target: () => {
                    // Target the first list item if available for better precision
                    const firstItem = document.querySelector('#installedModsList .mod-list-item');
                    return firstItem || document.getElementById('installedModsList');
                },
                title: 'Manage Your Add-ons',
                text: 'Here you can toggle mods on/off or delete them completely using the buttons on the right.<button id="tutorialFinishBtnStep3" class="btn-primary" style="margin-top:15px; width:100%;" onclick="if(window.onTutorialStep3Complete) window.onTutorialStep3Complete(); window.advanceSpotlightTutorial();">Finish</button>',
                hint: 'Click Finish above',
                position: 'bottom',
                advanceOn: 'manual',
                beforeShow: () => {
                    document.body.classList.add('tutorial-step-installed');
                    const container = document.getElementById('installedModsList');
                    const itemObserver = new MutationObserver(() => {
                        // Wait a tick for rendering to complete
                        setTimeout(() => {
                            const firstItem = document.querySelector('#installedModsList .mod-list-item');
                            const target = firstItem || container;
                            if (window.setSpotlightTarget) window.setSpotlightTarget(target);
                        }, 100);
                    });
                    itemObserver.observe(container, { childList: true, subtree: true });
                },
                onComplete: () => {
                    document.body.classList.remove('tutorial-step-installed');
                }
            }
        ]);
    };

    // Expose functions
    window.startProfileTutorial = startProfileTutorial;
    // window.startTutorialStep2 and window.startTutorialStep3 exposed above by assignment

})();
