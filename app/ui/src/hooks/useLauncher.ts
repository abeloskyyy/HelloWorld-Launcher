import { useEffect, useState } from 'react';
import type { HwlAPI } from '../types/launcher';

export function getLauncherAPI(): HwlAPI {
  if (typeof window !== 'undefined' && window.hwlAPI) {
    return window.hwlAPI;
  }
  // Fallback shim for testing in browser without Electron
  return {
    getUserJson: async () => ({ username: 'Player', account_type: 'offline' }),
    saveUserJson: async () => ({}),
    loginMicrosoft: async () => ({ success: false }),
    loginHelloWorld: async () => ({ success: false }),
    logout: async () => ({ username: '', account_type: 'offline' }),
    checkInternet: async () => true,
    closeApp: async () => {},
    getSavedAccounts: async () => [],
    switchAccount: async () => ({ success: false }),
    removeSavedAccount: async () => ({ success: false }),
    removeAllAccounts: async () => ({ success: false }),
    getProfiles: async () => [],
    addProfile: async () => ({}),
    editProfile: async () => ({}),
    deleteProfile: async () => ({}),
    getProfileIcon: async () => '',
    getWorlds: async () => [],
    getDocumentsPath: async () => '',
    createProfileShortcut: async () => ({}),
    getPendingLaunchProfile: async () => null,
    onAutoLaunchProfile: () => {},
    isMinecraftRunning: async () => false,
    getMinecraftInstances: async () => [],
    startGame: async () => ({}),
    cancelLaunch: async () => {},
    getAvailableVersions: async () => ({}),
    getVanillaVersions: async () => [],
    getForgeVersions: async () => [],
    getFabricVersions: async () => [],
    getNeoforgeVersions: async () => [],
    getLoaderVersions: async () => [],
    installVersion: async () => ({}),
    getLauncherVersion: async () => '2.3.0',
    saveVersionSettings: async () => ({}),
    saveAppSettings: async () => ({}),
    maximizeLauncher: async () => ({}),
    saveDevMode: async () => ({}),
    selectFolder: async () => null,
    selectFile: async () => null,
    setZoomFactor: () => {},
    getZoomFactor: () => 1.0,
    searchModrinth: async () => ({ hits: [] }),
    getModCategories: async () => [],
    getModVersions: async () => [],
    getModDetails: async () => ({}),
    installAddon: async () => ({}),
    getInstalledAddons: async () => [],
    getInstalledMods: async () => [],
    toggleAddon: async () => ({}),
    deleteAddon: async () => ({}),
    openAddonsFolder: async () => {},
    importAddonFile: async () => ({}),
    resolveModpackCompatibility: async () => ({}),
    resolveModDependencies: async () => ({}),
    checkAddonUpdates: async () => ({}),
    getSkinData: async () => ({}),
    getUserCapes: async () => [],
    getSkinPacks: async () => [],
    createSkinPack: async () => ({}),
    editSkinPack: async () => ({}),
    deleteSkinPack: async () => ({}),
    activateSkinPack: async () => ({}),
    onDownloadProgress: () => {},
    onInfoMessage: () => {},
    onLoginUpdate: () => {},
    onStatsUpdated: () => {},
    onServicesDown429: () => {},
    checkForUpdates: async () => ({}),
    startDownloadUpdate: async () => ({}),
    quitAndInstall: async () => {},
    onUpdaterStatus: () => {},
    checkLocalInstaller: async () => ({}),
    launchInstallerAndQuit: async () => {},
    downloadInstallerFile: async () => ({}),
    onInstallerDownloadProgress: () => {},
    getPlatformInfo: async () => ({ platform: 'win32' }),
    getOnboardingStatus: async () => ({ showOnboarding: false }),
    completeOnboarding: async () => {},
    openUrl: async () => {},
    openExternal: async () => {}
  } as unknown as HwlAPI;
}

export function useLauncher() {
  const [api, setApi] = useState<HwlAPI>(getLauncherAPI());

  useEffect(() => {
    if (typeof window !== 'undefined' && window.hwlAPI) {
      setApi(window.hwlAPI);
    }
  }, []);

  return api;
}
