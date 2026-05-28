// === Main Script ===

// === Firebase Configuration ===
const firebaseConfig = {
    apiKey: atob("QUl6YVN5QUNYRURPNVI0OEhybHhWQ3l6OGZCR2ltRUlWa1kyUVNN"),
    authDomain: "helloworld-launcher.firebaseapp.com",
    databaseURL: "https://helloworld-launcher-default-rtdb.firebaseio.com",
    projectId: "helloworld-launcher",
    storageBucket: "helloworld-launcher.firebasestorage.app",
    messagingSenderId: "1088760222656",
    appId: "1:1088760222656:web:13aefa81bdecdfdf832e25"
};

// Global Firebase DB Reference
// Global Firebase DB Reference
let db;

async function init() {
    // === Initialize Firebase ===
    if (window.firebaseModules) {
        try {
            const app = window.firebaseModules.initializeApp(firebaseConfig);
            db = window.firebaseModules.getDatabase(app);
        } catch (e) {
            console.error('Firebase Init Error:', e);
        }
    } else {
        console.warn("Firebase modules not loaded yet.");
    }

    // ... (Use the rest of the existing logic from lines 30-444)
    // I will use replace_file_content to wrap the existing logic
    // Actually, I can just replace the listener start and end.

    // === Check for Launcher Verification flow ===
    const urlParams = new URLSearchParams(window.location.search);
    const launcherVerifyToken = urlParams.get('verify-token');

    // === Authentication Logic ===
    let auth, firestore, currentUser;
    if (window.firebaseModules) {
        auth = window.firebaseModules.getAuth();
        firestore = window.firebaseModules.getFirestore();

        // Auto-trigger Microsoft verification if launched from the desktop app
        if (launcherVerifyToken) {
            setTimeout(() => autoVerifyFromLauncher(auth, firestore, launcherVerifyToken), 800);
        }
        
        // Listen for auth state
        window.firebaseModules.onAuthStateChanged(auth, async (user) => {
            currentUser = user;
            const navLoginBtn = document.getElementById('navLoginBtn');
            const navUserBadge = document.getElementById('navUserBadge');
            const navUsername = document.getElementById('navUsername');
            const authLoader = document.getElementById('authLoaderOverlay');
            
            // Function to fade out loader when everything is done
            const removeLoader = () => {
                if (authLoader) {
                    setTimeout(() => {
                        authLoader.style.transition = 'opacity 0.6s ease';
                        authLoader.style.opacity = '0';
                        setTimeout(() => authLoader.style.display = 'none', 600);
                    }, 300); // Give stars time to render
                }
            };

            if (user && navLoginBtn && navUserBadge) {
                navLoginBtn.style.display = 'none';
                navUserBadge.style.display = 'flex';
                
                try {
                    const userDoc = await window.firebaseModules.getDoc(window.firebaseModules.doc(firestore, "users", user.uid));
                    const navPremiumBadge = document.getElementById('navPremiumBadge');
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        const username = data.username || (user.email ? user.email.split('@')[0] : 'Player');
                        navUsername.textContent = username;
                        const isMs = data.accountType === 'microsoft';
                        if (navPremiumBadge) navPremiumBadge.style.display = isMs ? 'inline-flex' : 'none';
                        const avatarSrc = data.avatarBase64 || (isMs && data.uuid ? `https://mc-heads.net/avatar/${data.uuid}` : null);
                        await setNavAvatarFromSource(avatarSrc, username);
                    } else {
                        const fallbackName = user.email ? user.email.split('@')[0] : 'Player';
                        navUsername.textContent = fallbackName;
                        if (navPremiumBadge) navPremiumBadge.style.display = 'none';
                        await setNavAvatarFromSource(null, fallbackName);
                    }
                } catch(e) {
                    const fallbackName = user && user.email ? user.email.split('@')[0] : 'Player';
                    navUsername.textContent = fallbackName;
                    await setNavAvatarFromSource(null, fallbackName);
                }
            } else if (navLoginBtn && navUserBadge) {
                navLoginBtn.style.display = 'flex';
                navUserBadge.style.display = 'none';
                await setNavAvatarFromSource(null, 'Steve');

                // Handle Registration URL Parameter ONLY when NOT logged in
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('register') === 'true') {
                    openAuthModal(true);
                    // Optional: Clean URL so it doesn't reopen on refresh if user then closes modal
                    window.history.replaceState({}, document.title, window.location.pathname);
                } else if (urlParams.get('edit_profile') === 'true') {
                    // User wants to edit profile but is NOT logged in.
                    // Open Login modal first.
                    openAuthModal(false);
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            }
            
            // Remove loader after everything finishes rendering
            removeLoader();
        });
    }

    // Modal UI Elements
    const authModal = document.getElementById('authModal');
    const closeAuthModal = document.getElementById('closeAuthModal');
    const navLoginBtn = document.getElementById('navLoginBtn');
    const navUserBadge = document.getElementById('navUserBadge');
    
    // Auth Tabs & Forms
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginError = document.getElementById('loginError');
    const registerError = document.getElementById('registerError');
    const linkToRegister = document.getElementById('linkToRegister');
    const linkToLogin = document.getElementById('linkToLogin');
    const navUserAvatarImg = document.getElementById('navUserAvatarImg');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const linkToForgotPassword = document.getElementById('linkToForgotPassword');
    const linkToLoginFromForgot = document.getElementById('linkToLoginFromForgot');
    const forgotPasswordError = document.getElementById('forgotPasswordError');
    const forgotPasswordSuccess = document.getElementById('forgotPasswordSuccess');

    const DEFAULT_NAV_HEAD = 'https://mc-heads.net/avatar/Steve';
    if (navUserAvatarImg) navUserAvatarImg.src = DEFAULT_NAV_HEAD;

    function clearAuthForms() {
        if (loginForm) loginForm.reset();
        if (registerForm) registerForm.reset();
        if (loginError) loginError.style.display = 'none';
        if (registerError) registerError.style.display = 'none';
        if (forgotPasswordForm) forgotPasswordForm.reset();
        if (forgotPasswordError) forgotPasswordError.style.display = 'none';
        if (forgotPasswordSuccess) forgotPasswordSuccess.style.display = 'none';
    }

    function openAuthModal(isRegister = false) {
        if (!authModal) return;
        clearAuthForms();
        authModal.classList.add('active');
        if (isRegister) {
            switchToRegister();
        } else {
            switchToLogin();
        }
    }

    function closeAuthModalFunc() {
        if (authModal) {
            authModal.classList.remove('active');
            clearAuthForms();
        }
    }

    if (navLoginBtn) navLoginBtn.addEventListener('click', (e) => { e.preventDefault(); openAuthModal(false); });
    if (closeAuthModal) closeAuthModal.addEventListener('click', closeAuthModalFunc);
    if (authModal) authModal.addEventListener('click', (e) => { if (e.target === authModal) closeAuthModalFunc(); });
    // Password Toggles
    const togglePasswords = document.querySelectorAll('.toggle-password');
    togglePasswords.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = document.getElementById(this.getAttribute('data-target'));
            if (input.type === 'password') {
                input.type = 'text';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            }
        });
    });

    function switchToRegister() {
        if (tabRegister) {
            tabRegister.style.borderBottomColor = 'var(--primary-color)';
            tabRegister.style.color = 'white';
        }
        if (tabLogin) {
            tabLogin.style.borderBottomColor = 'transparent';
            tabLogin.style.color = 'rgba(255,255,255,0.6)';
            tabLogin.style.display = 'block';
        }
        if (loginForm) loginForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'block';
        if (forgotPasswordForm) forgotPasswordForm.style.display = 'none';
        clearAuthForms();
    }

    function switchToLogin() {
        if (tabLogin) {
            tabLogin.style.borderBottomColor = 'var(--primary-color)';
            tabLogin.style.color = 'white';
            tabLogin.style.display = 'block';
        }
        if (tabRegister) {
            tabRegister.style.borderBottomColor = 'transparent';
            tabRegister.style.color = 'rgba(255,255,255,0.6)';
            tabRegister.style.display = 'block';
        }
        if (registerForm) registerForm.style.display = 'none';
        if (loginForm) loginForm.style.display = 'block';
        if (forgotPasswordForm) forgotPasswordForm.style.display = 'none';
        clearAuthForms();
    }

    function switchToForgotPassword() {
        if (tabLogin) tabLogin.style.display = 'none';
        if (tabRegister) tabRegister.style.display = 'none';
        if (loginForm) loginForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'none';
        if (forgotPasswordForm) forgotPasswordForm.style.display = 'block';
        clearAuthForms();
    }

    if (tabLogin) tabLogin.addEventListener('click', switchToLogin);
    if (tabRegister) tabRegister.addEventListener('click', switchToRegister);
    if (linkToRegister) linkToRegister.addEventListener('click', (e) => { e.preventDefault(); switchToRegister(); });
    if (linkToLogin) linkToLogin.addEventListener('click', (e) => { e.preventDefault(); switchToLogin(); });
    if (linkToForgotPassword) linkToForgotPassword.addEventListener('click', (e) => { e.preventDefault(); switchToForgotPassword(); });
    if (linkToLoginFromForgot) linkToLoginFromForgot.addEventListener('click', (e) => { e.preventDefault(); switchToLogin(); });

    // Microsoft Login
    const microsoftLoginBtn = document.getElementById('microsoftLoginBtn');
    if (microsoftLoginBtn && window.firebaseModules) {
        microsoftLoginBtn.addEventListener('click', async () => {
            const btn = microsoftLoginBtn;
            loginError.style.display = 'none';
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in with Microsoft...';

            try {
                const { OAuthProvider, signInWithPopup } = window.firebaseModules;
                const provider = new OAuthProvider('microsoft.com');

                // Sign in with Microsoft
                const result = await signInWithPopup(auth, provider);
                const msUser = result.user;
                console.log('[Microsoft Login] Firebase UID:', msUser.uid);

                // Check if already linked (returning user)
                const existingDoc = await window.firebaseModules.getDoc(
                    window.firebaseModules.doc(firestore, "users", msUser.uid)
                );
                if (existingDoc.exists() && existingDoc.data().accountType === 'microsoft' && existingDoc.data().uuid) {
                    // Already verified and linked — just close and proceed
                    closeAuthModalFunc();
                    return;
                }

                // New user: check microsoftVerified using their MS email (written by launcher)
                const msEmail = (msUser.email || msUser.providerData?.[0]?.email || '').toLowerCase();
                console.log('[Microsoft Login] email:', msEmail);

                if (!msEmail) {
                    await window.firebaseModules.signOut(auth);
                    throw new Error("Could not read your Microsoft account email. Please try again.");
                }

                const emailKey = msEmail.replace(/\./g, '_DOT_').replace(/@/g, '_AT_');
                const verifiedDoc = await window.firebaseModules.getDoc(
                    window.firebaseModules.doc(firestore, "microsoftVerified", emailKey)
                );

                if (!verifiedDoc.exists() || !verifiedDoc.data().verified) {
                    await window.firebaseModules.signOut(auth);
                    throw new Error(
                        "Your Microsoft account hasn't been verified yet. " +
                        "Please open the HelloWorld Launcher, sign in with your Microsoft account, and then try again here."
                    );
                }

                const verifiedData = verifiedDoc.data();
                await window.firebaseModules.setDoc(
                    window.firebaseModules.doc(firestore, "users", msUser.uid),
                    {
                        username: verifiedData.username,
                        uuid: verifiedData.uuid,
                        accountType: 'microsoft',
                        minecraftUuid: verifiedData.uuid,
                        email: msEmail,
                        createdAt: window.firebaseModules.firestoreTimestamp()
                    }
                );

                closeAuthModalFunc();

            } catch (error) {
                console.error('Microsoft login error:', error);
                loginError.textContent = parseAuthError(error);
                loginError.style.display = 'block';
            } finally {
                btn.disabled = false;
                btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 23 23" fill="none">
                    <path d="M11.5 11.5H0V0H11.5V11.5Z" fill="#F25022"/>
                    <path d="M23 11.5H11.5V0H23V11.5Z" fill="#7FBA00"/>
                    <path d="M11.5 23H0V11.5H11.5V23Z" fill="#00A4EF"/>
                    <path d="M23 23H11.5V11.5H23V23Z" fill="#FFB900"/>
                </svg> Sign in with Microsoft`;
            }
        });
    }

    // Auto-verify Microsoft account when opened from the launcher (one-time token)
    async function autoVerifyFromLauncher(auth, firestore, token) {
        const overlay = document.createElement('div');
        overlay.id = 'launcherVerifyOverlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(10,14,23,0.97);z-index:99999;display:flex;align-items:center;justify-content:center;';
        overlay.innerHTML = `
            <div style="text-align:center;max-width:460px;padding:40px;background:rgba(255,255,255,0.04);border-radius:20px;border:1px solid rgba(255,255,255,0.08);">
                <div style="font-size:48px;margin-bottom:16px;">🔗</div>
                <h2 style="color:#fff;margin-bottom:10px;">Verifying your Microsoft account</h2>
                <p style="color:#a3a3a3;margin-bottom:30px;">Sign in with Microsoft to link your launcher account to the web.</p>
                <div id="launcherVerifyStatus" style="color:#a3a3a3;font-size:0.9em;min-height:20px;"></div>
            </div>
        `;
        document.body.appendChild(overlay);

        const setStatus = (msg, color = '#a3a3a3') => {
            const el = document.getElementById('launcherVerifyStatus');
            if (el) { el.textContent = msg; el.style.color = color; }
        };

        try {
            // 1. Validate the one-time token from Firestore
            setStatus('Validating launcher token...');
            const tokenDoc = await window.firebaseModules.getDoc(
                window.firebaseModules.doc(firestore, 'pendingMsVerify', token)
            );

            if (!tokenDoc.exists()) throw new Error('This verification link is invalid or has already been used.');

            const tokenData = tokenDoc.data();
            if (tokenData.used) throw new Error('This verification link has already been used.');
            if (new Date(tokenData.expiresAt) < new Date()) throw new Error('This verification link has expired. Please log in again from the launcher.');

            // 2. Sign in with Microsoft to get the email
            setStatus('Opening Microsoft sign-in...');
            const { OAuthProvider, signInWithPopup } = window.firebaseModules;
            const provider = new OAuthProvider('microsoft.com');
            const result = await signInWithPopup(auth, provider);
            const msUser = result.user;
            const msEmail = (msUser.email || msUser.providerData?.[0]?.email || '').toLowerCase();

            if (!msEmail) throw new Error('Could not read your Microsoft account email.');

            // 3. Mark token as used (one-time use)
            setStatus('Writing verification...');
            await window.firebaseModules.setDoc(
                window.firebaseModules.doc(firestore, 'pendingMsVerify', token),
                { used: true }, { merge: true }
            );

            // 4. Write microsoftVerified keyed by email
            const emailKey = msEmail.replace(/\./g, '_DOT_').replace(/@/g, '_AT_');
            await window.firebaseModules.setDoc(
                window.firebaseModules.doc(firestore, 'microsoftVerified', emailKey),
                {
                    email: msEmail,
                    username: tokenData.username,
                    uuid: tokenData.uuid,
                    verified: true,
                    verifiedAt: new Date().toISOString()
                }
            );

            overlay.innerHTML = `
                <div style="text-align:center;max-width:460px;padding:40px;background:rgba(255,255,255,0.04);border-radius:20px;border:1px solid rgba(79,175,74,0.3);">
                    <div style="font-size:56px;margin-bottom:16px;">✅</div>
                    <h2 style="color:#4caf50;margin-bottom:10px;">Account Verified!</h2>
                    <p style="color:#a3a3a3;margin-bottom:8px;">Your Microsoft account has been linked to <strong style="color:#fff">${tokenData.username}</strong>.</p>
                    <p style="color:#a3a3a3;margin-bottom:24px;">You can now close this tab and sign in on the web.</p>
                    <button onclick="window.close()" style="background:#4facfe;color:#fff;border:none;padding:12px 28px;border-radius:8px;cursor:pointer;font-size:1em;">Close tab</button>
                </div>
            `;
        } catch (err) {
            overlay.querySelector('div').innerHTML = `
                <div style="font-size:48px;margin-bottom:16px;">❌</div>
                <h2 style="color:#ff8c82;margin-bottom:10px;">Verification Failed</h2>
                <p style="color:#a3a3a3;margin-bottom:24px;">${err.message}</p>
                <button onclick="window.close()" style="background:rgba(255,255,255,0.1);color:#fff;border:none;padding:12px 28px;border-radius:8px;cursor:pointer;font-size:1em;">Close tab</button>
            `;
        }
    }

    // Minecraft Username Modal for Microsoft accounts
    function showMinecraftUsernameModal(user) {
        const modalHtml = `
            <div id="mcUsernameModal" class="review-modal" style="z-index: 10000;">
                <div class="review-modal-content" style="max-width: 400px; text-align: center;">
                    <button class="close-modal" id="closeMcUsernameModal">&times;</button>
                    <h3 style="margin-bottom: 15px;">Verify Minecraft Account</h3>
                    <p style="font-size: 0.9em; color: #a3a3a3; margin-bottom: 20px;">Enter your Minecraft username to verify your account from the launcher.</p>
                    <div class="form-group">
                        <input type="text" id="mcUsernameInput" placeholder="e.g. Notch" class="form-control" style="color: white; text-align: center; font-size: 1.1em;" required minlength="3" maxlength="16">
                    </div>
                    <div id="mcUsernameError" style="color: #ff8c82; font-size: 0.9em; margin-bottom: 15px; text-align: center; display: none;"></div>
                    <button type="button" class="btn btn-primary" id="mcUsernameSubmitBtn" style="width: 100%;">Verify and Link</button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById('mcUsernameModal');
        const closeBtn = document.getElementById('closeMcUsernameModal');
        const input = document.getElementById('mcUsernameInput');
        const submitBtn = document.getElementById('mcUsernameSubmitBtn');
        const errorDiv = document.getElementById('mcUsernameError');

        modal.classList.add('active');

        const closeModal = () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        };

        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        submitBtn.addEventListener('click', async () => {
            const username = input.value.trim();
            errorDiv.style.display = 'none';
            submitBtn.disabled = true;
            submitBtn.textContent = 'Verifying...';

            try {
                if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) {
                    throw new Error("Invalid Minecraft username format.");
                }

                const mojangResponse = await fetch(`https://api.mojang.com/users/profiles/minecraft/${username}`);
                if (!mojangResponse.ok) {
                    throw new Error("Minecraft username not found.");
                }

                const mojangData = await mojangResponse.json();
                const uuid = mojangData.id.toLowerCase();

                console.log('[Microsoft Link] Username:', username, 'UUID:', uuid);

                const verifiedDoc = await window.firebaseModules.getDoc(
                    window.firebaseModules.doc(firestore, "microsoftVerified", uuid)
                );

                if (!verifiedDoc.exists()) {
                    await window.firebaseModules.signOut(auth);
                    throw new Error(
                        "This Minecraft account hasn't been verified in the launcher yet. " +
                        "Please open the HelloWorld Launcher, add your Microsoft account, and then try again."
                    );
                }

                const verifiedData = verifiedDoc.data();
                console.log('[Microsoft Link] Verified data:', verifiedData);

                await window.firebaseModules.setDoc(
                    window.firebaseModules.doc(firestore, "users", user.uid),
                    {
                        username: verifiedData.username,
                        uuid: verifiedData.uuid,
                        accountType: 'microsoft',
                        minecraftUuid: verifiedData.uuid,
                        email: user.email || '',
                        createdAt: window.firebaseModules.firestoreTimestamp()
                    }
                );

                closeModal();
                window.location.reload();

            } catch (error) {
                errorDiv.textContent = error.message;
                errorDiv.style.display = 'block';
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Verify and Link';
            }
        });

        setTimeout(() => input.focus(), 100);
    }

    // Error Parser Helper
    function parseAuthError(error) {
        let msg = error.message;
        if (error.code) {
            switch(error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    msg = "Incorrect email or password.";
                    break;
                case 'auth/invalid-credential':
                    if (msg && msg.includes('microsoft')) {
                        msg = "Microsoft sign-in failed. Check your Azure App Registration settings (Supported account types must be 'All').";
                    } else {
                        msg = "Incorrect email or password.";
                    }
                    break;
                case 'auth/account-exists-with-different-credential':
                    msg = "This email is already registered with a different sign-in method. Go to Firebase Console → Authentication → Settings and enable 'Multiple accounts per email address'.";
                    break;
                case 'auth/email-already-in-use':
                    msg = "This email is already registered.";
                    break;
                case 'auth/weak-password':
                    msg = "Password should be at least 6 characters.";
                    break;
                case 'auth/popup-closed-by-user':
                    msg = "Sign-in popup was closed. Please try again.";
                    break;
                case 'auth/cancelled-popup-request':
                    msg = "";
                    break;
            }
        }
        return msg;
    }

    function getHeadImageFromSource(src) {
        if (!src) return Promise.resolve(null);
        return new Promise((resolve) => {
            const img = new Image();
            if (!src.startsWith('data:')) {
                img.crossOrigin = 'anonymous';
            }
            img.onload = () => {
                const isAvatarProvider = src.includes('mc-heads.net') || src.includes('minotar.net');
                const isFullSkin = !isAvatarProvider &&
                    ((img.width === img.height || img.width === img.height * 2) &&
                    (img.width % 64 === 0 || img.width === 32));

                if (isFullSkin) {
                    const canvas = document.createElement('canvas');
                    canvas.width = 64;
                    canvas.height = 64;
                    const ctx = canvas.getContext('2d');
                    ctx.imageSmoothingEnabled = false;
                    const s = img.width / 8;
                    ctx.drawImage(img, s, s, s, s, 0, 0, 64, 64);
                    ctx.drawImage(img, s * 5, s, s, s, 0, 0, 64, 64);
                    resolve(canvas.toDataURL());
                } else {
                    resolve(src);
                }
            };
            img.onerror = () => resolve(null);
            img.src = src;
        });
    }

    async function setNavAvatarFromSource(avatarSrc, usernameFallback) {
        if (!navUserAvatarImg) return;
        const fallbackSrc = usernameFallback
            ? `https://ui-avatars.com/api/?name=${encodeURIComponent(usernameFallback)}&background=random&color=fff&rounded=true&bold=true&format=svg`
            : DEFAULT_NAV_HEAD;
        
        // If an avatarSrc is provided (e.g. base64 image), use it directly. Otherwise use fallback.
        navUserAvatarImg.src = avatarSrc || fallbackSrc;
        // Make sure it looks nice
        navUserAvatarImg.style.objectFit = 'cover';
        navUserAvatarImg.style.borderRadius = '50%';
    }

    // Handle Forms
    if (loginForm && window.firebaseModules) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const identifier = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            const btn = document.getElementById('loginSubmitBtn');
            loginError.style.display = 'none';
            btn.disabled = true;
            btn.textContent = 'Logging in...';
            
            try {
                let email = identifier;
                // If it doesn't look like an email, resolve username → email via the public 'usernames' index
                if (!identifier.includes('@')) {
                    const usernameDoc = await window.firebaseModules.getDoc(
                        window.firebaseModules.doc(firestore, 'usernames', identifier.toLowerCase())
                    );
                    if (!usernameDoc.exists()) {
                        throw { code: 'auth/user-not-found' };
                    }
                    email = usernameDoc.data().email;
                }

                await window.firebaseModules.signInWithEmailAndPassword(auth, email, password);
                closeAuthModalFunc();
            } catch (error) {
                loginError.textContent = parseAuthError(error);
                loginError.style.display = 'block';
            } finally {
                btn.disabled = false;
                btn.textContent = 'Log In';
            }
        });
    }

    if (forgotPasswordForm && window.firebaseModules) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('forgotPasswordEmail');
            const submitBtn = document.getElementById('forgotPasswordSubmitBtn');
            const errorDiv = forgotPasswordError;
            const successDiv = forgotPasswordSuccess;

            if (errorDiv) errorDiv.style.display = 'none';
            if (successDiv) successDiv.style.display = 'none';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Sending...';
            }

            try {
                await window.firebaseModules.sendPasswordResetEmail(auth, emailInput ? emailInput.value.trim() : '');
                if (successDiv) {
                    successDiv.textContent = "A password reset link has been sent to your email. Check your inbox (and spam folder).";
                    successDiv.style.display = 'block';
                }
                if (emailInput) emailInput.value = '';
            } catch (error) {
                if (errorDiv) {
                    errorDiv.textContent = parseAuthError(error);
                    errorDiv.style.display = 'block';
                }
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Send Reset Link';
                }
            }
        });
    }

    if (registerForm && window.firebaseModules) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('registerUsername').value.trim();
            const email = document.getElementById('registerEmail').value.trim();
            const password = document.getElementById('registerPassword').value;
            const confirm = document.getElementById('registerConfirmPassword').value;
            const btn = document.getElementById('registerSubmitBtn');
            
            registerError.style.display = 'none';

            if (password !== confirm) {
                registerError.textContent = "Passwords do not match.";
                registerError.style.display = 'block';
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Creating account...';
            
            try {
                // Validation matching offline launcher accounts
                if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) {
                    throw new Error("Username must be 3-16 characters and contain only letters, numbers, and underscores.");
                }

                // Check if username is already taken
                const { getDocs, collection, query, where } = window.firebaseModules;
                const q = query(collection(firestore, "users"), where("username", "==", username));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    throw new Error("This username is already taken.");
                }

                const userCredential = await window.firebaseModules.createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                const generateUuid = (name) => {
                    return CryptoJS.MD5("HelloWorldPlayer:" + name).toString(CryptoJS.enc.Hex);
                };
                
                const uuid = generateUuid(username);
                await window.firebaseModules.setDoc(window.firebaseModules.doc(firestore, "users", user.uid), {
                    username: username,
                    email: email,
                    uuid: uuid,
                    createdAt: window.firebaseModules.firestoreTimestamp()
                });
                // Write public username index so login-by-username works without auth
                await window.firebaseModules.setDoc(
                    window.firebaseModules.doc(firestore, 'usernames', username.toLowerCase()),
                    { uid: user.uid, email: email }
                );
                
                closeAuthModalFunc();
            } catch (error) {
                registerError.textContent = parseAuthError(error);
                registerError.style.display = 'block';
            } finally {
                btn.disabled = false;
                btn.textContent = 'Register';
            }
        });
    }

    // === Account Dashboard Logic ===
    const accountModal = document.getElementById('accountModal');
    const closeAccountModal = document.getElementById('closeAccountModal');
    const accountLogoutBtn = document.getElementById('accountLogoutBtn');

    if (navUserBadge && accountModal) {
        navUserBadge.addEventListener('click', async () => {
            if (!currentUser) return;
            const errorDiv = document.getElementById('accountError');
            const successDiv = document.getElementById('accountSuccess');
            const userInp = document.getElementById('dashboardUsername');
            const editUsernameBtn = document.getElementById('editUsernameBtn');
            errorDiv.style.display = 'none';
            successDiv.style.display = 'none';
            userInp.readOnly = true;
            userInp.disabled = true;

            try {
                let docSnap = await window.firebaseModules.getDoc(window.firebaseModules.doc(firestore, "users", currentUser.uid));

                // If it was deleted somehow, recreate it silently
                if (!docSnap.exists()) {
                    const defaultName = (currentUser.email || "Player").split('@')[0];
                    const safeName = defaultName.substring(0,16);
                    const generateUuid = (name) => CryptoJS.MD5("HelloWorldPlayer:" + name).toString(CryptoJS.enc.Hex);
                    await window.firebaseModules.setDoc(window.firebaseModules.doc(firestore, "users", currentUser.uid), {
                        username: safeName,
                        email: currentUser.email || "",
                        uuid: generateUuid(safeName),
                        createdAt: window.firebaseModules.firestoreTimestamp()
                    });
                    docSnap = await window.firebaseModules.getDoc(window.firebaseModules.doc(firestore, "users", currentUser.uid));
                }

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const isMicrosoftAccount = data.accountType === 'microsoft';
                    userInp.value = data.username || "Player";

                    const fallbackName = data.username || (currentUser && currentUser.email ? currentUser.email.split('@')[0] : 'Player');

                    // Render avatar preview (stored or generated)
                    const avatarPreview = document.getElementById('dashboardAvatarPreview');
                    if (avatarPreview) {
                        if (data.avatarBase64) {
                            avatarPreview.src = data.avatarBase64;
                        } else if (isMicrosoftAccount && data.uuid) {
                            // For Microsoft accounts, default to mc-heads.net using their real Minecraft UUID
                            avatarPreview.src = `https://mc-heads.net/avatar/${data.uuid}`;
                        } else {
                            avatarPreview.src = `https://ui-avatars.com/api/?name=${fallbackName}&background=random&color=fff&rounded=true&bold=true&format=svg`;
                        }
                    }
                    stagedAvatarBase64 = null;
                    stagedClearAvatar = false; // reset staged clear

                    const navAvatarSrc = data.avatarBase64 || (isMicrosoftAccount && data.uuid ? `https://mc-heads.net/avatar/${data.uuid}` : null);
                    await setNavAvatarFromSource(navAvatarSrc, fallbackName);

                    // Show/hide elements based on account type
                    const usernameFormGroup = document.getElementById('usernameFormGroup');
                    const premiumBadge = document.getElementById('dashboardPremiumBadge');
                    const useDefaultAvatarBtn = document.getElementById('useDefaultAvatarBtn');
                    if (isMicrosoftAccount) {
                        if (editUsernameBtn) editUsernameBtn.style.display = 'none';
                        if (usernameFormGroup) usernameFormGroup.style.display = 'none';
                        if (premiumBadge) premiumBadge.style.display = 'inline-flex';
                        if (useDefaultAvatarBtn) useDefaultAvatarBtn.style.display = 'inline-flex';
                        userInp.disabled = true;
                        userInp.readOnly = true;
                    } else {
                        if (editUsernameBtn) editUsernameBtn.style.display = 'block';
                        if (usernameFormGroup) usernameFormGroup.style.display = 'block';
                        if (premiumBadge) premiumBadge.style.display = 'none';
                        if (useDefaultAvatarBtn) useDefaultAvatarBtn.style.display = 'none';
                    }

                    // Load new profile fields
                    const biographyInput = document.getElementById('dashboardBiography');
                    const biographyCharCount = document.getElementById('biographyCharCount');
                    if (biographyInput) {
                        biographyInput.value = data.biography || '';
                        if (biographyCharCount) {
                            biographyCharCount.textContent = (data.biography || '').length;
                        }
                    }

                    const favoriteMobInput = document.getElementById('dashboardFavoriteMob');
                    if (favoriteMobInput) {
                        favoriteMobInput.value = data.favoriteMob || '';
                    }

                    const countrySelect = document.getElementById('dashboardCountry');
                    if (countrySelect) {
                        countrySelect.value = data.country || '';
                        updateCountryBadge(data.country || '');
                    }

                    const backgroundSelect = document.getElementById('dashboardBackground');
                    if (backgroundSelect) {
                        backgroundSelect.value = data.background || 'default';
                        applyBackgroundPreview(data.background || 'default');
                    }

                    // Update display name
                    const displayName = document.getElementById('dashboardDisplayName');
                    if (displayName) {
                        displayName.textContent = data.username || 'Player';
                    }

                    // Load links
                    const linksContainer = document.getElementById('linksContainer');
                    if (linksContainer) {
                        linksContainer.innerHTML = '';
                        const links = data.links || [];
                        links.forEach((link, index) => {
                            addLinkField(link.title, link.url, index);
                        });
                    }

                    // Load playstyle tags
                    initPlaystyleTagsGrid(data.playstyleTags || []);
                }
                accountModal.classList.add('active');
            } catch (e) {
               console.error("Failed to load account details", e);
            }
        });
    }

    if (closeAccountModal) closeAccountModal.addEventListener('click', () => accountModal.classList.remove('active'));
    if (accountModal) accountModal.addEventListener('click', (e) => { if (e.target === accountModal) accountModal.classList.remove('active'); });

    // Biography character counter
    const biographyInput = document.getElementById('dashboardBiography');
    const biographyCharCount = document.getElementById('biographyCharCount');
    if (biographyInput && biographyCharCount) {
        biographyInput.addEventListener('input', () => {
            biographyCharCount.textContent = biographyInput.value.length;
        });
    }

    // --- Playstyle Tags ---
    const PLAYSTYLE_TAGS = [
        { id: 'pvp',         label: 'PvP',           icon: 'fas fa-fire' },
        { id: 'pvp_pro',     label: 'PvP Pro',        icon: 'fas fa-fire' },
        { id: 'builder',     label: 'Builder',        icon: 'fas fa-hammer' },
        { id: 'architect',   label: 'Architect',      icon: 'fas fa-drafting-compass' },
        { id: 'survival',    label: 'Survival',       icon: 'fas fa-tree' },
        { id: 'hardcore',    label: 'Hardcore',       icon: 'fas fa-skull' },
        { id: 'redstone',    label: 'Redstone',       icon: 'fas fa-bolt' },
        { id: 'technical',   label: 'Technical',      icon: 'fas fa-cog' },
        { id: 'farms',       label: 'Farm Builder',   icon: 'fas fa-tractor' },
        { id: 'explorer',    label: 'Explorer',       icon: 'fas fa-compass' },
        { id: 'speedrunner', label: 'Speedrunner',    icon: 'fas fa-running' },
        { id: 'socialite',   label: 'Socialite',      icon: 'fas fa-users' },
        { id: 'roleplayer',  label: 'Roleplayer',     icon: 'fas fa-theater-masks' },
        { id: 'modded',      label: 'Modded',         icon: 'fas fa-puzzle-piece' },
        { id: 'modpack',     label: 'Modpack Player', icon: 'fas fa-layer-group' },
        { id: 'creative',    label: 'Creative',       icon: 'fas fa-paint-brush' },
        { id: 'artist',      label: 'Pixel Artist',   icon: 'fas fa-palette' },
        { id: 'streamer',    label: 'Streamer',       icon: 'fas fa-video' },
        { id: 'casual',      label: 'Casual',         icon: 'fas fa-couch' },
        { id: 'minigames',   label: 'Minigames',      icon: 'fas fa-gamepad' },
        { id: 'skyblock',    label: 'Skyblock',       icon: 'fas fa-cloud' },
    ];

    let selectedPlaystyleTags = [];

    function initPlaystyleTagsGrid(currentTags) {
        selectedPlaystyleTags = Array.isArray(currentTags) ? [...currentTags] : [];
        const grid = document.getElementById('playstyleTagsGrid');
        if (!grid) return;
        grid.innerHTML = PLAYSTYLE_TAGS.map(tag => {
            const sel = selectedPlaystyleTags.includes(tag.id);
            return `<button type="button" class="playstyle-tag-btn${sel ? ' selected' : ''}" data-tag-id="${tag.id}" style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:20px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid rgba(255,255,255,0.2);background:${sel ? 'rgba(79,172,254,0.25)' : 'rgba(255,255,255,0.06)'};color:${sel ? '#60a5fa' : '#9ca3af'};transition:all 0.15s;">
                <i class="${tag.icon}" style="font-size:11px;"></i> ${tag.label}
            </button>`;
        }).join('');
        grid.querySelectorAll('.playstyle-tag-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.tagId;
                if (selectedPlaystyleTags.includes(id)) {
                    selectedPlaystyleTags = selectedPlaystyleTags.filter(t => t !== id);
                    btn.classList.remove('selected');
                    btn.style.background = 'rgba(255,255,255,0.06)';
                    btn.style.color = '#9ca3af';
                    btn.style.borderColor = 'rgba(255,255,255,0.2)';
                } else if (selectedPlaystyleTags.length < 5) {
                    selectedPlaystyleTags.push(id);
                    btn.classList.add('selected');
                    btn.style.background = 'rgba(79,172,254,0.25)';
                    btn.style.color = '#60a5fa';
                    btn.style.borderColor = 'rgba(79,172,254,0.4)';
                } else {
                    // Flash red to indicate limit reached
                    btn.style.background = 'rgba(239,68,68,0.2)';
                    btn.style.color = '#f87171';
                    setTimeout(() => {
                        btn.style.background = 'rgba(255,255,255,0.06)';
                        btn.style.color = '#9ca3af';
                    }, 600);
                }
            });
        });
    }

    // Link field management
    const linksContainer = document.getElementById('linksContainer');
    const addLinkBtn = document.getElementById('addLinkBtn');

    function addLinkField(title = '', url = '', index = null) {
        const linkDiv = document.createElement('div');
        linkDiv.className = 'link-field';
        linkDiv.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
        
        linkDiv.innerHTML = `
            <input type="text" class="form-control link-title" placeholder="Title (e.g. YouTube)" value="${title}" style="flex: 1; color: white;">
            <input type="url" class="form-control link-url" placeholder="URL (https://...)" value="${url}" style="flex: 2; color: white;">
            <button type="button" class="btn btn-secondary remove-link-btn" style="width: 40px; height: 40px; padding: 0; color: #ff8c82; border-color: #ff8c82; display: flex; align-items: center; justify-content: center;"><i class="fas fa-trash"></i></button>
        `;
        
        if (linksContainer) {
            if (index !== null && index < linksContainer.children.length) {
                linksContainer.insertBefore(linkDiv, linksContainer.children[index]);
            } else {
                linksContainer.appendChild(linkDiv);
            }
        }

        // Add remove functionality
        const removeBtn = linkDiv.querySelector('.remove-link-btn');
        removeBtn.addEventListener('click', () => {
            linkDiv.remove();
        });
    }

    if (addLinkBtn) {
        addLinkBtn.addEventListener('click', () => {
            addLinkField();
        });
    }

    // Country badge functionality
    function updateCountryBadge(countryCode) {
        const countryBadge = document.getElementById('countryBadge');
        const countryFlagSvg = document.getElementById('countryFlagSvg');
        
        if (!countryBadge || !countryFlagSvg) return;
        
        if (!countryCode || countryCode === '' || countryCode === 'OTHER') {
            countryBadge.style.display = 'none';
            return;
        }
        
        // Use flagcdn.com for SVG flags
        countryFlagSvg.src = `https://flagcdn.com/w80/${countryCode.toLowerCase()}.png`;
        countryBadge.style.display = 'flex';
    }

    // Add event listener to country select
    const countrySelect = document.getElementById('dashboardCountry');
    if (countrySelect) {
        countrySelect.addEventListener('change', (e) => {
            updateCountryBadge(e.target.value);
        });
    }

    // Background preview functionality
    const backgroundSelect = document.getElementById('dashboardBackground');
    const avatarBackgroundPreview = document.getElementById('avatarBackgroundPreview');

    function applyBackgroundPreview(backgroundValue) {
        if (!avatarBackgroundPreview) return;
        
        // Reset to default background and restore border
        avatarBackgroundPreview.style.background = 'rgba(255,255,255,0.05)';
        avatarBackgroundPreview.style.backgroundImage = '';
        avatarBackgroundPreview.style.backgroundSize = '';
        avatarBackgroundPreview.style.backgroundPosition = '';
        avatarBackgroundPreview.style.backgroundRepeat = '';
        avatarBackgroundPreview.style.border = '2px solid rgba(255,255,255,0.1)';
        
        // Remove pseudo-element if exists
        const existingPseudo = avatarBackgroundPreview.querySelector('.background-overlay');
        if (existingPseudo) existingPseudo.remove();

        if (!backgroundValue || backgroundValue === 'default') {
            return;
        }

        const gradients = {
            'gradient1': 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)', // Purple
            'gradient2': 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)', // Blue
            'gradient3': 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)', // Green
            'gradient4': 'linear-gradient(135deg, #e67e22 0%, #d35400 100%)', // Orange
            'gradient5': 'linear-gradient(135deg, #e91eb6 0%, #f363e7 100%)' // Pink
        };

        const imageBackgrounds = {
            'minecraft1': 'url(backgrounds/minecraft1.png)',
            'minecraft2': 'url(backgrounds/minecraft2.png)',
            'minecraft3': 'url(backgrounds/minecraft3.png)',
            'minecraft4': 'url(backgrounds/minecraft4.png)',
            'minecraft5': 'url(backgrounds/minecraft5.png)',
            'minecraft6': 'url(backgrounds/minecraft6.png)',
            'minecraft7': 'url(backgrounds/minecraft7.png)',
            'minecraft8': 'url(backgrounds/minecraft8.png)',
            'minecraft9': 'url(backgrounds/minecraft9.png)'
        };

        // Create overlay div for background with brightness filter
        const overlay = document.createElement('div');
        overlay.className = 'background-overlay';
        overlay.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; border-radius: 16px; z-index: -1; filter: brightness(0.7);';
        
        if (gradients[backgroundValue]) {
            overlay.style.background = gradients[backgroundValue];
            avatarBackgroundPreview.style.border = 'none';
        } else if (imageBackgrounds[backgroundValue]) {
            overlay.style.backgroundImage = imageBackgrounds[backgroundValue];
            overlay.style.backgroundSize = 'cover';
            overlay.style.backgroundPosition = 'center';
            overlay.style.backgroundRepeat = 'no-repeat';
            avatarBackgroundPreview.style.border = 'none';
        }
        
        avatarBackgroundPreview.appendChild(overlay);
    }

    if (backgroundSelect) {
        backgroundSelect.addEventListener('change', (e) => {
            applyBackgroundPreview(e.target.value);
        });
    }

    if (accountLogoutBtn && window.firebaseModules) {
        accountLogoutBtn.addEventListener('click', () => {
            window.firebaseModules.signOut(auth).then(() => {
                accountModal.classList.remove('active');
                if (window.location.search.includes('register')) {
                    window.location.search = '';
                }
            });
        });
    }

    // Username Editing
    const editUsernameBtn = document.getElementById('editUsernameBtn');
    if (editUsernameBtn) {
        editUsernameBtn.addEventListener('click', () => {
            const warning1 = confirm("WARNING: Changing your username might cause you to lose progress, ranks, and inventory on third-party servers. Are you sure?");
            if (warning1) {
                const warning2 = confirm("Final Warning! Press OK to confirm you accept the risks of changing your in-game identity.");
                if (warning2) {
                    const userInp = document.getElementById('dashboardUsername');
                    userInp.readOnly = false;
                    userInp.disabled = false;
                    userInp.focus();
                }
            }
        });
    }

    // Avatar Upload and Cropping
    const avatarUploadInput = document.getElementById('avatarUploadInput');
    const cropperModal = document.getElementById('cropperModal');
    const closeCropperModal = document.getElementById('closeCropperModal');
    const cancelCropBtn = document.getElementById('cancelCropBtn');
    const applyCropBtn = document.getElementById('applyCropBtn');
    const cropperImage = document.getElementById('cropperImage');
    
    let cropper = null;
    let stagedAvatarBase64 = null;
    let stagedClearAvatar = false;

    function hideCropperModal() {
        if (cropperModal) cropperModal.classList.remove('active');
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        if (avatarUploadInput) avatarUploadInput.value = '';
    }

    if (closeCropperModal) closeCropperModal.addEventListener('click', hideCropperModal);
    if (cancelCropBtn) cancelCropBtn.addEventListener('click', hideCropperModal);

    if (avatarUploadInput) {
        avatarUploadInput.addEventListener('change', (e) => {
            if (!e.target.files || !e.target.files.length) return;
            const file = e.target.files[0];
            
            const reader = new FileReader();
            reader.onload = (event) => {
                cropperImage.src = event.target.result;
                cropperModal.classList.add('active');
                
                if (cropper) cropper.destroy();
                cropper = new Cropper(cropperImage, {
                    aspectRatio: 1, // 1:1 square
                    viewMode: 1,
                    dragMode: 'move',
                    autoCropArea: 1,
                    restore: false,
                    guides: true,
                    center: true,
                    highlight: false,
                    cropBoxMovable: true,
                    cropBoxResizable: true,
                    toggleDragModeOnDblclick: false,
                });
            };
            reader.readAsDataURL(file);
        });
    }

    const useDefaultAvatarBtn = document.getElementById('useDefaultAvatarBtn');
    if (useDefaultAvatarBtn) {
        useDefaultAvatarBtn.addEventListener('click', async () => {
            if (!currentUser) return;
            const docSnap = await window.firebaseModules.getDoc(window.firebaseModules.doc(firestore, "users", currentUser.uid));
            const uuid = docSnap.exists() ? docSnap.data().uuid : null;
            stagedAvatarBase64 = null;
            stagedClearAvatar = true;
            const avatarPreview = document.getElementById('dashboardAvatarPreview');
            if (avatarPreview && uuid) avatarPreview.src = `https://mc-heads.net/avatar/${uuid}`;
        });
    }

    if (applyCropBtn) {
        applyCropBtn.addEventListener('click', () => {
            if (!cropper) return;
            
            // Get cropped image, scaled to 128x128
            const canvas = cropper.getCroppedCanvas({
                width: 128,
                height: 128,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high',
            });
            
            stagedAvatarBase64 = canvas.toDataURL('image/png');
            
            // Update preview immediately
            const avatarPreview = document.getElementById('dashboardAvatarPreview');
            if (avatarPreview) {
                avatarPreview.src = stagedAvatarBase64;
            }
            
            hideCropperModal();
            
            // Auto-trigger save so they don't have to press "Save Changes" manually if they just changed the avatar
            const successDiv = document.getElementById('accountSuccess');
            if (successDiv) {
                successDiv.style.display = 'none';
            }
        });
    }

    // Save Account settings
    const saveAccountBtn = document.getElementById('saveAccountBtn');
    if (saveAccountBtn) {
        saveAccountBtn.addEventListener('click', async () => {
            if (!currentUser) return;
            const errorDiv = document.getElementById('accountError');
            const successDiv = document.getElementById('accountSuccess');
            const btn = saveAccountBtn;

            errorDiv.style.display = 'none';
            successDiv.style.display = 'none';
            btn.disabled = true;
            btn.textContent = "Saving...";

            try {
                const docSnap = await window.firebaseModules.getDoc(window.firebaseModules.doc(firestore, "users", currentUser.uid));
                const currentData = docSnap.data();
                const isMicrosoftAccount = currentData.accountType === 'microsoft';

                const updates = {};

                // For Microsoft accounts, don't allow username/uuid changes
                if (!isMicrosoftAccount) {
                    const newUsername = document.getElementById('dashboardUsername').value.trim();
                    if (!/^[a-zA-Z0-9_]{3,16}$/.test(newUsername)) {
                        throw new Error("Username must be 3-16 characters and contain only letters, numbers, and underscores.");
                    }

                    // Check if username changed and available (using public usernames index)
                    if (newUsername !== currentData.username) {
                        const takenDoc = await window.firebaseModules.getDoc(
                            window.firebaseModules.doc(firestore, 'usernames', newUsername.toLowerCase())
                        );
                        if (takenDoc.exists()) {
                            throw new Error("This username is already taken.");
                        }
                    }

                    updates.username = newUsername;
                    updates.uuid = CryptoJS.MD5("HelloWorldPlayer:" + newUsername).toString(CryptoJS.enc.Hex);
                }

                if (stagedClearAvatar) {
                    updates.avatarBase64 = window.firebaseModules.deleteField();
                } else if (stagedAvatarBase64) {
                    updates.avatarBase64 = stagedAvatarBase64;
                }

                // Save biography
                const biographyValue = document.getElementById('dashboardBiography').value.trim();
                if (biographyValue) {
                    updates.biography = biographyValue;
                } else {
                    updates.biography = window.firebaseModules.deleteField();
                }

                // Save favorite mob
                const favoriteMobValue = document.getElementById('dashboardFavoriteMob').value.trim();
                if (favoriteMobValue) {
                    updates.favoriteMob = favoriteMobValue;
                } else {
                    updates.favoriteMob = window.firebaseModules.deleteField();
                }

                // Save country
                const countryValue = document.getElementById('dashboardCountry').value;
                if (countryValue) {
                    updates.country = countryValue;
                } else {
                    updates.country = window.firebaseModules.deleteField();
                }

                // Save background
                const backgroundValue = document.getElementById('dashboardBackground').value;
                if (backgroundValue) {
                    updates.background = backgroundValue;
                } else {
                    updates.background = window.firebaseModules.deleteField();
                }

                // Save links
                const linkFields = document.querySelectorAll('.link-field');
                const linksArray = [];
                linkFields.forEach(field => {
                    const title = field.querySelector('.link-title').value.trim();
                    const url = field.querySelector('.link-url').value.trim();
                    if (title && url) {
                        linksArray.push({ title, url });
                    }
                });
                if (linksArray.length > 0) {
                    updates.links = linksArray;
                } else {
                    updates.links = window.firebaseModules.deleteField();
                }

                // Save playstyle tags
                if (selectedPlaystyleTags && selectedPlaystyleTags.length > 0) {
                    updates.playstyleTags = selectedPlaystyleTags;
                } else {
                    updates.playstyleTags = window.firebaseModules.deleteField();
                }

                await window.firebaseModules.updateDoc(window.firebaseModules.doc(firestore, "users", currentUser.uid), updates);

                // Keep usernames index in sync when username changes
                if (updates.username && updates.username !== currentData.username) {
                    // Write new entry
                    await window.firebaseModules.setDoc(
                        window.firebaseModules.doc(firestore, 'usernames', updates.username.toLowerCase()),
                        { uid: currentUser.uid, email: currentData.email || '' }
                    );
                    // Delete old entry
                    if (currentData.username) {
                        await window.firebaseModules.updateDoc(
                            window.firebaseModules.doc(firestore, 'usernames', currentData.username.toLowerCase()),
                            { uid: window.firebaseModules.deleteField(), email: window.firebaseModules.deleteField() }
                        ).catch(() => {}); // ignore if it doesn't exist
                    }
                }

                // Update header username (only if it changed)
                if (updates.username) {
                    document.getElementById('navUsername').textContent = updates.username;
                }

                // Update display name in modal
                const displayName = document.getElementById('dashboardDisplayName');
                if (displayName) {
                    displayName.textContent = currentData.username || 'Player';
                }

                // Update nav avatar correctly after save
                let appliedAvatarSrc = stagedAvatarBase64;
                if (!appliedAvatarSrc) {
                    // Re-read the updated doc to get the latest state
                    const userDoc = await window.firebaseModules.getDoc(window.firebaseModules.doc(firestore, "users", currentUser.uid));
                    if (userDoc.exists()) {
                        const freshData = userDoc.data();
                        if (freshData.avatarBase64) {
                            appliedAvatarSrc = freshData.avatarBase64;
                        } else if (freshData.accountType === 'microsoft' && freshData.uuid) {
                            // Microsoft account: use MC head
                            appliedAvatarSrc = `https://mc-heads.net/avatar/${freshData.uuid}`;
                        } else if (stagedClearAvatar && currentData.uuid) {
                            // Explicitly cleared: use MC head if we have UUID
                            appliedAvatarSrc = `https://mc-heads.net/avatar/${currentData.uuid}`;
                        }
                    }
                }
                stagedAvatarBase64 = null;
                stagedClearAvatar = false;

                await setNavAvatarFromSource(appliedAvatarSrc, currentData.username || 'Player');

                successDiv.textContent = "Changes saved! Restart your game to see them.";
                successDiv.style.display = 'block';
            } catch (error) {
                errorDiv.textContent = "Failed to update profile: " + error.message;
                errorDiv.style.display = 'block';
            } finally {
                btn.disabled = false;
                btn.textContent = "Save Changes";
            }
        });
    }


    // === GitHub API Integration ===
    const repoOwner = 'abeloskyyy';
    // ...

    const repoName = 'HelloWorld-Launcher';
    const heroBtn = document.getElementById('heroDownloadBtn');
    const heroLinuxBtn = document.getElementById('heroDownloadLinuxBtn');
    const navBtn = document.getElementById('navDownloadBtn');
    const heroButtonsContainer = document.querySelector('.hero-buttons');
    const osWarningContainer = document.getElementById('osWarningContainer');
    const detectedOSName = document.getElementById('detectedOSName');
    const windowsDropdown = document.getElementById('windowsDropdown');
    const linuxDropdown = document.getElementById('linuxDropdown');

    const iconLinux = `<i class="fa-brands fa-linux" style="font-size: 1.1rem; margin-right: 5px;"></i>`;

    function detectOS() {
        const ua = window.navigator.userAgent.toLowerCase();
        if (ua.includes("win")) return "Windows";
        if ((ua.includes("linux") || ua.includes("x11") || ua.includes("ubuntu") || ua.includes("cros")) && !ua.includes("android")) return "Linux";
        if (ua.includes("mac")) return "MacOS";
        if (ua.includes("android") || ua.includes("iphone") || ua.includes("ipad")) return "Mobile";
        return "Unknown";
    }

    const userOS = detectOS();

    // Dropdown functionality
    function toggleDropdown(dropdown) {
        if (!dropdown) return;
        const isActive = dropdown.classList.contains('active');
        // Close all dropdowns first
        if (windowsDropdown) windowsDropdown.classList.remove('active');
        if (linuxDropdown) linuxDropdown.classList.remove('active');
        if (heroBtn) heroBtn.classList.remove('active');
        if (heroLinuxBtn) heroLinuxBtn.classList.remove('active');
        
        // Toggle the clicked dropdown
        if (!isActive) {
            dropdown.classList.add('active');
            if (dropdown === windowsDropdown && heroBtn) heroBtn.classList.add('active');
            if (dropdown === linuxDropdown && heroLinuxBtn) heroLinuxBtn.classList.add('active');
        }
    }

    // Event listeners for dropdowns
    if (heroBtn && windowsDropdown) {
        heroBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleDropdown(windowsDropdown);
        });
    }

    if (heroLinuxBtn && linuxDropdown) {
        heroLinuxBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleDropdown(linuxDropdown);
        });
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (windowsDropdown && !windowsDropdown.contains(e.target) && e.target !== heroBtn) {
            windowsDropdown.classList.remove('active');
            if (heroBtn) heroBtn.classList.remove('active');
        }
        if (linuxDropdown && !linuxDropdown.contains(e.target) && e.target !== heroLinuxBtn) {
            linuxDropdown.classList.remove('active');
            if (heroLinuxBtn) heroLinuxBtn.classList.remove('active');
        }
    });

    async function getLatestRelease() {
        try {
            const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();

            const tagName = data.tag_name; // e.g., "v1.0.4"
            const baseUrl = `https://github.com/${repoOwner}/${repoName}/releases/download/${tagName}`;

            // Build download URLs for all architectures
            const downloadUrls = {
                windows: {
                    setupX64: `${baseUrl}/HelloWorld-Launcher-Installer-x64.exe`,
                    setupArm64: `${baseUrl}/HelloWorld-Launcher-Installer-arm64.exe`,
                    portableX64: `${baseUrl}/HelloWorld-Launcher-portable-x64.zip`,
                    portableArm64: `${baseUrl}/HelloWorld-Launcher-portable-arm64.zip`
                },
                linux: {
                    debX64: `${baseUrl}/HelloWorld-Launcher-x64.deb`,
                    debArm64: `${baseUrl}/HelloWorld-Launcher-arm64.deb`,
                    appImageX64: `${baseUrl}/HelloWorld-Launcher-x64.AppImage`,
                    appImageArm64: `${baseUrl}/HelloWorld-Launcher-arm64.AppImage`
                }
            };

            // Update dropdown links
            if (windowsDropdown) {
                const items = windowsDropdown.querySelectorAll('.dropdown-item');
                if (items.length >= 4) {
                    items[0].href = downloadUrls.windows.setupX64; // Setup x64 (recommended)
                    items[1].href = downloadUrls.windows.setupArm64; // Setup ARM64
                    items[2].href = downloadUrls.windows.portableX64; // Portable x64
                    items[3].href = downloadUrls.windows.portableArm64; // Portable ARM64
                }
            }

            if (linuxDropdown) {
                const items = linuxDropdown.querySelectorAll('.dropdown-item');
                if (items.length >= 4) {
                    items[0].href = downloadUrls.linux.debX64; // DEB x64 (recommended)
                    items[1].href = downloadUrls.linux.debArm64; // DEB ARM64
                    items[2].href = downloadUrls.linux.appImageX64; // AppImage x64
                    items[3].href = downloadUrls.linux.appImageArm64; // AppImage ARM64
                }
            }

            if (heroBtn && heroLinuxBtn) {
                // Apply OS specific ordering and styles
                if (userOS === "Windows") {
                    heroBtn.className = "btn btn-primary btn-lg dropdown-btn";
                    heroBtn.innerHTML = `<i class="bi bi-windows"></i> Download for Windows ${tagName}<i class="bi bi-chevron-down dropdown-arrow"></i><div class="btn-shine"></div>`;
                    heroLinuxBtn.className = "btn btn-secondary btn-lg dropdown-btn";
                    heroLinuxBtn.innerHTML = `${iconLinux} Download for Linux ${tagName}<i class="bi bi-chevron-down dropdown-arrow"></i>`;
                    heroButtonsContainer.insertBefore(heroBtn, heroLinuxBtn);
                } else if (userOS === "Linux") {
                    heroLinuxBtn.className = "btn btn-primary btn-lg dropdown-btn";
                    heroLinuxBtn.innerHTML = `${iconLinux} Download for Linux ${tagName}<i class="bi bi-chevron-down dropdown-arrow"></i><div class="btn-shine"></div>`;
                    heroBtn.className = "btn btn-secondary btn-lg dropdown-btn";
                    heroBtn.innerHTML = `<i class="bi bi-windows"></i> Download for Windows ${tagName}<i class="bi bi-chevron-down dropdown-arrow"></i>`;
                    heroButtonsContainer.insertBefore(heroLinuxBtn, heroBtn);
                } else {
                    // Mobile / MacOS or unknown
                    heroBtn.className = "btn btn-secondary btn-lg dropdown-btn";
                    heroBtn.innerHTML = `<i class="bi bi-windows"></i> Download for Windows ${tagName}<i class="bi bi-chevron-down dropdown-arrow"></i>`;
                    heroLinuxBtn.className = "btn btn-secondary btn-lg dropdown-btn";
                    heroLinuxBtn.innerHTML = `${iconLinux} Download for Linux ${tagName}<i class="bi bi-chevron-down dropdown-arrow"></i>`;
                    
                    if (osWarningContainer && detectedOSName) {
                        detectedOSName.textContent = userOS === "Unknown" ? "no reconocido" : userOS;
                        osWarningContainer.style.display = "block";
                        heroButtonsContainer.style.flexWrap = "wrap";
                    }
                }

                // Set default button href to recommended option
                heroBtn.href = userOS === "Windows" ? downloadUrls.windows.setupX64 : downloadUrls.linux.debX64;
                heroBtn.target = '_blank';
                heroLinuxBtn.href = userOS === "Linux" ? downloadUrls.linux.debX64 : downloadUrls.windows.setupX64;
                heroLinuxBtn.target = '_blank';
            }

            if (navBtn) {
                if (userOS === "Windows") {
                    navBtn.href = downloadUrls.windows.setupX64;
                    navBtn.style.display = 'inline-flex';
                    navBtn.innerHTML = '<i class="bi bi-windows"></i> Download Now';
                } else if (userOS === "Linux") {
                    navBtn.href = downloadUrls.linux.debX64;
                    navBtn.style.display = 'inline-flex';
                    navBtn.innerHTML = '<i class="fa-brands fa-linux" style="font-size: 1.1rem; margin-right: 5px;"></i> Download Now';
                } else {
                    // Hide download button for Android, MacOS, Mobile, and other unsupported devices
                    navBtn.style.display = 'none';
                }
            }

            // Update the badge text as well if it exists
            const badge = document.querySelector('.badge');
            if (badge) badge.textContent = `${tagName} Now Available`;

        } catch (error) {
            console.error('Error fetching release:', error);
            // Fallback
            const fallbackUrl = `https://github.com/${repoOwner}/${repoName}/releases/latest`;
            if (heroBtn) heroBtn.href = fallbackUrl;
            if (heroLinuxBtn) heroLinuxBtn.href = fallbackUrl;
            if (navBtn) navBtn.href = fallbackUrl;
        }
    }

    getLatestRelease();


    // === Fetch Statistics (Downloads & Stars) ===
    async function getRepoStats() {
        try {
            // 1. Get Stars & Reviews from Firebase (Realtime)
            if (db && window.firebaseModules) {
                const { ref, onValue } = window.firebaseModules;
                const reviewsRef = ref(db, 'reviews');

                onValue(reviewsRef, (snapshot) => {
                    const data = snapshot.val();
                    if (data) {
                        const reviews = Object.values(data);
                        const count = reviews.length;
                        const totalStars = reviews.reduce((acc, curr) => acc + parseInt(curr.rating), 0);
                        const average = (totalStars / count).toFixed(1);

                        // Update UI
                        const starCountEl = document.getElementById('starCount');
                        const reviewCountEl = document.getElementById('reviewCount');

                        if (starCountEl) starCountEl.textContent = average;
                        if (reviewCountEl) reviewCountEl.textContent = `(${count})`;
                    }
                });
            } else {
                // Fallback to GitHub Stars if Firebase not configured
                const repoResponse = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}`);
                if (repoResponse.ok) {
                    const repoData = await repoResponse.json();
                    const starCount = repoData.stargazers_count;
                    if (starCount > 0) {
                        const reviewCountEl = document.getElementById('reviewCount');
                        if (reviewCountEl) reviewCountEl.textContent = `(${starCount})`;
                    }
                }
            }

            // 2. Get Total Downloads (GitHub Releases)
            const releasesResponse = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/releases`);
            if (releasesResponse.ok) {
                const releases = await releasesResponse.json();
                let totalDownloads = 0;
                releases.forEach(release => {
                    if (release.assets) {
                        release.assets.forEach(asset => {
                            totalDownloads += asset.download_count;
                        });
                    }
                });

                const downloadCountEl = document.getElementById('downloadCount');
                // Format number (e.g. 1.2k)
                if (downloadCountEl) {
                    if (totalDownloads > 1000) {
                        downloadCountEl.textContent = (totalDownloads / 1000).toFixed(1) + 'k+';
                    } else {
                        downloadCountEl.textContent = totalDownloads;
                    }
                }
            }

        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    }

    getRepoStats();


    // === Carousel Logic ===
    const track = document.getElementById('carouselTrack');
    const slides = Array.from(track.children);
    const nextButton = document.getElementById('nextBtn');
    const prevButton = document.getElementById('prevBtn');
    const nav = document.getElementById('carouselNav');

    // Create indicators
    slides.forEach((_, index) => {
        const indicator = document.createElement('button');
        indicator.classList.add('carousel-indicator');
        if (index === 0) indicator.classList.add('current-slide');
        nav.appendChild(indicator);
        indicator.addEventListener('click', () => {
            moveToSlide(index);
        });
    });

    const indicators = Array.from(nav.children);
    let currentSlideIndex = 0;

    function moveToSlide(targetIndex) {
        // Loop around
        if (targetIndex < 0) targetIndex = slides.length - 1;
        if (targetIndex >= slides.length) targetIndex = 0;

        // Update visuals
        slides[currentSlideIndex].classList.remove('current-slide');
        indicators[currentSlideIndex].classList.remove('current-slide');

        slides[targetIndex].classList.add('current-slide');
        indicators[targetIndex].classList.add('current-slide');

        currentSlideIndex = targetIndex;
    }

    nextButton.addEventListener('click', () => {
        moveToSlide(currentSlideIndex + 1);
    });

    prevButton.addEventListener('click', () => {
        moveToSlide(currentSlideIndex - 1);
    });

    // Auto-advance
    let autoPlay = setInterval(() => moveToSlide(currentSlideIndex + 1), 5000);

    // Pause on hover
    const carouselContainer = document.querySelector('.carousel-container');
    carouselContainer.addEventListener('mouseenter', () => clearInterval(autoPlay));
    carouselContainer.addEventListener('mouseleave', () => {
        autoPlay = setInterval(() => moveToSlide(currentSlideIndex + 1), 5000);
    });


    // === Scroll Effect for Navbar ===
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(5, 5, 16, 0.9)';
            navbar.style.padding = '1rem 0';
        } else {
            navbar.style.background = 'rgba(5, 5, 16, 0.7)';
            navbar.style.padding = '1.5rem 0';
        }
    });

    // === 3D Cube Rotation with Inertia ===
    const cube = document.getElementById('blockCube');
    const heroVisual = document.querySelector('.hero-visual');
    if (cube && heroVisual) {
        // --- Configuration ---
        const friction = 0.95;       // Friction amount (0 to 1). Lower = more friction.
        const sensitivity = 0.5;    // Drag sensitivity.
        const autoSpinSpeed = 0.2;  // Speed of auto-rotation.
        const minRotationX = -90;   // Minimum vertical rotation (degrees)
        const maxRotationX = 90;    // Maximum vertical rotation (degrees)
        // ---------------------

        let isDragging = false;
        let startX, startY;
        let rotationX = -20;
        let rotationY = 30;
        let velocityX = 0;
        let velocityY = 0;

        heroVisual.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            cube.style.transition = 'none';
        });

        heroVisual.addEventListener('touchstart', (e) => {
            isDragging = true;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            cube.style.transition = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            handleMove(e.clientX, e.clientY);
        });

        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            handleMove(e.touches[0].clientX, e.touches[0].clientY);
        });

        function handleMove(clientX, clientY) {
            const deltaX = clientX - startX;
            const deltaY = clientY - startY;

            // Update velocities based on movement
            velocityY = deltaX * sensitivity;
            velocityX = -deltaY * sensitivity;

            rotationY += velocityY;
            rotationX += velocityX;

            // Clamp vertical rotation
            rotationX = Math.max(minRotationX, Math.min(maxRotationX, rotationX));

            cube.style.transform = `rotateX(${rotationX}deg) rotateY(${rotationY}deg)`;

            startX = clientX;
            startY = clientY;
        }

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        document.addEventListener('touchend', () => {
            isDragging = false;
        });

        function update() {
            if (!isDragging) {
                // Apply friction
                velocityY *= friction;
                velocityX *= friction;

                // Add a bit of constant auto-rotation
                rotationY += velocityY + autoSpinSpeed;
                rotationX += velocityX;

                // Clamp vertical rotation during inertia
                rotationX = Math.max(minRotationX, Math.min(maxRotationX, rotationX));

                if (rotationX === minRotationX || rotationX === maxRotationX) velocityX = 0;

                cube.style.transform = `rotateX(${rotationX}deg) rotateY(${rotationY}deg)`;
            }
            requestAnimationFrame(update);
        }

        requestAnimationFrame(update);
    }

    // === Review System Logic ===
    const reviewBtn = document.getElementById('reviewBtn');
    const reviewModal = document.getElementById('reviewModal');
    const closeModal = document.querySelector('.close-modal');
    const reviewForm = document.getElementById('reviewForm');
    const stars = document.querySelectorAll('.star-rating i');
    const ratingInput = document.getElementById('ratingValue');

    if (!reviewBtn || !reviewModal) return;

    // Open Modal
    function openModal() {
        reviewModal.classList.add('active');
        // Stop the floating animation when open
        reviewBtn.style.animation = 'none';

        // Check if there's a URL parameter indicating we should open the review
        // (Just to clean the URL if we want, but keeping it simple)
    }

    // Close Modal
    function closeModalFunc() {
        reviewModal.classList.remove('active');
        reviewBtn.style.animation = 'float 3s ease-in-out infinite';
    }

    reviewBtn.addEventListener('click', openModal);

    closeModal.addEventListener('click', closeModalFunc);

    // Close on outside click
    reviewModal.addEventListener('click', (e) => {
        if (e.target === reviewModal) {
            closeModalFunc();
        }
    });

    // Check URL Parameters for ?review=true
    if (urlParams.get('review') === 'true') {
        openModal();
    }

    // Star Rating Interaction
    let currentRating = 0;

    stars.forEach(star => {
        // Hover
        star.addEventListener('mouseover', function () {
            const rating = this.getAttribute('data-rating');
            highlightStars(rating);
        });

        // Mouse out
        star.addEventListener('mouseout', function () {
            highlightStars(currentRating);
        });

        // Click
        star.addEventListener('click', function () {
            currentRating = this.getAttribute('data-rating');
            ratingInput.value = currentRating;
            highlightStars(currentRating);
        });
    });

    function highlightStars(rating) {
        stars.forEach(star => {
            const starRating = star.getAttribute('data-rating');
            if (starRating <= rating) {
                star.classList.add('active');
                star.classList.remove('bi-star');
                star.classList.add('bi-star-fill');
            } else {
                star.classList.remove('active');
                star.classList.remove('bi-star-fill');
                star.classList.add('bi-star'); // Optional: outline star for empty
            }
        });
    }

    // Handle Form Submission
    reviewForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const rating = ratingInput.value;
        const name = document.getElementById('reviewerName').value || 'Anonymous';
        const comment = document.getElementById('reviewComment').value;

        if (!rating) {
            alert('Please select a star rating!');
            return;
        }

        const reviewData = {
            rating,
            name,
            comment,
            timestamp: new Date().toISOString()
        };

        console.log('Review Submitted:', reviewData);

        // --- SAVE TO FIREBASE ---
        if (db && window.firebaseModules) {
            const { ref, push, serverTimestamp } = window.firebaseModules;
            const reviewsRef = ref(db, 'reviews');

            // Push new review
            push(reviewsRef, {
                ...reviewData,
                timestamp: serverTimestamp() // Use server timestamp
            }).then(() => {
                alert('Thanks for your review!');
            }).catch(error => {
                console.error('Firebase Error:', error);
                alert('Error saving review to database. Check console.');
            });
        }

        // --- SEND TO DISCORD (Keep as backup/notification) ---
        const discordWebhookUrl = atob('aHR0cHM6Ly9kaXNjb3JkLmNvbS9hcGkvd2ViaG9va3MvMTQ1MjY1MDE3MjYwODgwNzA2NS81Nm13SzFiVnVCQWloOUN5a3ZZQ3F5NHRNdTdLWE8wQzE4OUhuVDVoNmJkQVQ0SlU4bGQ4VG1YUHRYUGtWYkw5Y2xnVQ==');

        if (discordWebhookUrl) {
            fetch(discordWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    embeds: [
                        {
                            title: "**New Review!**",
                            color: 0x00aa00,
                            fields: [
                                {
                                    name: "**Rating**",
                                    value: `${rating}/5 stars`,
                                    inline: false
                                },
                                {
                                    name: "**Name**",
                                    value: name,
                                    inline: false
                                },
                                {
                                    name: "**Comment**",
                                    value: comment,
                                    inline: false
                                }
                            ]
                        }
                    ]
                })
            }).catch(err => console.error('Error sending webhook:', err));
        }

        // Reset and close
        reviewForm.reset();
        currentRating = 0;
        highlightStars(0);
        closeModalFunc();
    });
    // Handle direct redirect to edit profile if already logged in (e.g. from launcher)
    const urlParamsRedirect = new URLSearchParams(window.location.search);
    if (urlParamsRedirect.get('edit_profile') === 'true') {
        const checkAuthAndClick = setInterval(() => {
            if (auth.currentUser && navUserBadge) {
                clearInterval(checkAuthAndClick);
                navUserBadge.click();
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }, 500);
        // Safety timeout to clear interval after 10 seconds
        setTimeout(() => clearInterval(checkAuthAndClick), 10000);
    }

    // === PowerShell Install Detection and Copy Functionality ===
    // Get DOM elements
    const powershellInstall = document.getElementById('powershellInstall');
    const copyPowershellBtn = document.getElementById('copyPowershellBtn');
    const powershellCommand = document.getElementById('powershellCommand');

    // Copy to clipboard functionality
    if (copyPowershellBtn && powershellCommand) {
        copyPowershellBtn.addEventListener('click', async () => {
            try {
                const command = powershellCommand.textContent;
                await navigator.clipboard.writeText(command);
                
                // Change button to indicate copied
                copyPowershellBtn.classList.add('copied');
                copyPowershellBtn.innerHTML = '<i class="bi bi-check"></i>';
                
                // Revert after 2 seconds
                setTimeout(() => {
                    copyPowershellBtn.classList.remove('copied');
                    copyPowershellBtn.innerHTML = '<i class="bi bi-clipboard"></i>';
                }, 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = powershellCommand.textContent;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                
                copyPowershellBtn.classList.add('copied');
                copyPowershellBtn.innerHTML = '<i class="bi bi-check"></i>';
                setTimeout(() => {
                    copyPowershellBtn.classList.remove('copied');
                    copyPowershellBtn.innerHTML = '<i class="bi bi-clipboard"></i>';
                }, 2000);
            }
        });
    }

    // Detect Windows and show PowerShell install option
    if (powershellInstall) {
        const userAgent = navigator.userAgent;
        const isWindows = userAgent.indexOf('Win') > -1;
        
        if (isWindows) {
            powershellInstall.style.display = 'block';
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
