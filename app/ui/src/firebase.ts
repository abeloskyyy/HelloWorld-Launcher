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

onAuthStateChanged(fbAuth, (user) => {
  if (!user) return;
  const win = window as any;
  if (typeof win.hideMsVerifyBanner === 'function') {
    win.hideMsVerifyBanner();
  } else {
    const banner = document.getElementById('msVerifyBanner');
    if (banner) banner.style.display = 'none';
  }
});

export { fbApp, fbAuth };
