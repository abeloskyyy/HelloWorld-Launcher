import React, { useEffect } from 'react';
import { TopBanners } from './components/banners/TopBanners';
import { InitialLoader } from './components/loader/InitialLoader';
import { BackgroundStarfield } from './components/background/BackgroundStarfield';
import { UserAreaControls } from './components/user/UserAreaControls';
import { Sidebar } from './components/layout/Sidebar';
import { PlaySection } from './components/sections/PlaySection';
import { ProfilesSection } from './components/sections/ProfilesSection';
import { WorkshopSection } from './components/sections/WorkshopSection';
import { ModsSection } from './components/sections/ModsSection';
import { SkinsSection } from './components/sections/SkinsSection';
import { SettingsSection } from './components/sections/SettingsSection';
import { ProfileModal } from './components/modals/ProfileModal';
import { LoginModal } from './components/modals/LoginModal';
import { SystemModals } from './components/modals/SystemModals';
import { WorkshopModals } from './components/modals/WorkshopModals';
import { AddonsModals } from './components/modals/AddonsModals';
import { SkinsModals } from './components/modals/SkinsModals';
import { SocialModals } from './components/modals/SocialModals';
import { MiscModals } from './components/modals/MiscModals';

export const App: React.FC = () => {
  useEffect(() => {
    // List of client scripts to execute after authentic DOM is mounted
    const scripts = [
      'js/i18n.js',
      'js/scripts.js',
      'js/stats.js',
      'js/download-listeners.js',
      'js/skinviewer3d.js',
      'js/skinpacks.js',
      'js/tutorial-spotlight.js',
      'js/tutorial-steps.js',
      'js/onboarding.js',
      'js/social.js',
      'js/workshop.js',
    ];

    let isCancelled = false;

    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve) => {
        if (document.querySelector(`script[data-hwl-src="${src}"]`)) {
          resolve();
          return;
        }
        const s = document.createElement('script');
        s.src = src;
        s.setAttribute('data-hwl-src', src);
        s.onload = () => resolve();
        s.onerror = (err) => {
          console.error(`[Loader] Error loading ${src}:`, err);
          resolve();
        };
        document.body.appendChild(s);
      });
    };

    const loadAllScripts = async () => {
      for (const src of scripts) {
        if (isCancelled) return;
        await loadScript(src);
      }

      if (isCancelled) return;

      // Trigger initialization events now that the full DOM and all scripts are ready
      document.dispatchEvent(new Event('DOMContentLoaded'));
      window.dispatchEvent(new Event('pywebviewready'));
      window.dispatchEvent(new Event('hwlready'));

      // If translations are loaded, apply them to all data-i18n elements
      const win = window as any;
      if (typeof win.applyTranslations === 'function') {
        win.applyTranslations();
      }
    };

    loadAllScripts();

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <>
      {/* Top Notification / Verification / Maintenance / Announcement Banners */}
      <TopBanners />

      {/* 3D Cube Initial Loader with Tips Cycler */}
      <InitialLoader />

      {/* Canvas Starfield Particle Background */}
      <BackgroundStarfield />

      {/* Main Launcher App Container */}
      <div className="launcher">
        {/* User Controls: Login Button, Streak Fire Counter, Badges, Profile Completion Bar */}
        <UserAreaControls />

        {/* Sidebar Navigation & Promos */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="main-content">
          <PlaySection />
          <ProfilesSection />
          <WorkshopSection />
          <ModsSection />
          <SkinsSection />
          <SettingsSection />
        </div>
      </div>

      {/* Modals & Dialogs */}
      <ProfileModal />
      <LoginModal />
      <SystemModals />
      <WorkshopModals />
      <AddonsModals />
      <SkinsModals />
      <SocialModals />
      <MiscModals />
    </>
  );
};

export default App;
