import { initializeApp } from 'firebase/app';
import { getAuth, OAuthProvider, signInWithPopup, signOut, onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';

const firebaseConfig = {
  apiKey: atob('QUl6YVN5QUNYRURPNVI0OEhybHhWQ3l6OGZCR2ltRUlWa1kyUVNN'),
  authDomain: 'helloworld-launcher.firebaseapp.com',
  projectId: 'helloworld-launcher',
  appId: '1:1088760222656:web:13aefa81bdecdfdf832e25'
};

const fbApp = initializeApp(firebaseConfig, 'launcher');
const fbAuth = getAuth(fbApp);

(window as any)._launcherFirebase = {
  fbAuth,
  OAuthProvider,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail
};

onAuthStateChanged(fbAuth, async (user) => {
  if (!user) return;
  const win = window as any;
  if (typeof win.hideMsVerifyBanner === 'function') {
    win.hideMsVerifyBanner();
  } else {
    const banner = document.getElementById('msVerifyBanner');
    if (banner) banner.style.display = 'none';
  }
  // Automatically restore MS verification tokens into user.json & saved_accounts.json if missing
  try {
    if (win.hwlAPI && typeof win.hwlAPI.get_user_json === 'function' && typeof win.hwlAPI.ms_write_verified === 'function') {
      const uData = await win.hwlAPI.get_user_json();
      if (uData && uData.account_type === 'microsoft' && (!uData.firebase_ms_uid || !uData.firebase_ms_refresh_token)) {
        const email = (user.email || user.providerData?.[0]?.email || '').toLowerCase();
        const emailKey = email ? email.replace(/\./g, '_DOT_').replace(/@/g, '_AT_') : `ms_${user.uid}`;
        const refreshToken = (user as any).stsTokenManager?.refreshToken || (user as any).refreshToken || '';
        if (refreshToken) {
          console.log('[Firebase Auth] Auto-restoring MS verification session for:', email || uData.username);
          await win.hwlAPI.ms_write_verified(
            emailKey,
            email || `${(uData.username || 'player').toLowerCase()}@microsoft.verified`,
            uData.username || '',
            uData.uuid || '',
            user.uid,
            refreshToken
          );
          const freshData = await win.hwlAPI.get_user_json();
          if (typeof win.updateUserInterface === 'function') {
            await win.updateUserInterface(freshData);
          }
          if (typeof win.initSocial === 'function') {
            win.initSocial(true).catch(() => {});
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Firebase Auth] Auto-restore MS verification skipped:', err);
  }
});

export { fbApp, fbAuth };
