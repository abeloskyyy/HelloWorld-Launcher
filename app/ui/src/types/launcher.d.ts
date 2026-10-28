export interface UserData {
  username: string;
  account_type: 'offline' | 'microsoft' | 'helloworld';
  uuid?: string;
  mcdir?: string;
  dev_mode?: boolean;
  show_snapshots?: boolean;
  show_old?: boolean;
  enable_transitions?: boolean;
  hw_accel?: boolean;
  privacy_mode?: boolean;
  reopen_on_game_close?: boolean;
  last_skin_url?: string;
  last_skin_variant?: string;
  last_cape_url?: string;
  ui_scale?: number;
  language?: string;
  onboarding_completed?: boolean;
  [key: string]: any;
}

export interface SavedAccount {
  id?: string;
  username: string;
  uuid?: string;
  type: 'offline' | 'microsoft' | 'helloworld';
  email?: string;
  msEmail?: string;
  avatarUrl?: string;
  addedAt?: string;
  lastUsed?: string;
}

export interface Profile {
  id: string;
  name: string;
  version: string;
  loader?: string;
  icon?: string;
  directory?: string;
  ram_min?: string;
  ram_max?: string;
  jvm_args?: string;
  width?: number;
  height?: number;
  java_path?: string;
  enable_custom_skins?: boolean;
  created?: string;
  last_played?: string;
  addons?: Record<string, any>;
}

export interface HwlAPI {
  // User & Auth
  getUserJson: () => Promise<UserData>;
  saveUserJson: (data: Partial<UserData>) => Promise<any>;
  loginMicrosoft: () => Promise<any>;
  loginHelloWorld: (email: string, password: string) => Promise<any>;
  logout: () => Promise<UserData>;
  checkInternet: () => Promise<boolean>;
  closeApp: () => Promise<void>;

  // Account Switcher
  getSavedAccounts: () => Promise<SavedAccount[]>;
  switchAccount: (accountId: string, targetType?: string) => Promise<any>;
  removeSavedAccount: (accountId: string) => Promise<any>;
  removeAllAccounts: () => Promise<any>;

  // Profiles
  getProfiles: () => Promise<Profile[]>;
  addProfile: (data: any) => Promise<any>;
  editProfile: (data: any) => Promise<any>;
  deleteProfile: (id: string) => Promise<any>;
  getProfileIcon: (filename: string) => Promise<string>;
  getWorlds: (profile_id: string) => Promise<any[]>;
  read_world_seed?: (profile_id: string, world_name: string) => Promise<any>;
  getDocumentsPath: () => Promise<string>;
  createProfileShortcut: (data: any) => Promise<any>;
  getPendingLaunchProfile: () => Promise<string | null>;
  onAutoLaunchProfile: (callback: (profileId: string) => void) => void;
  isMinecraftRunning: () => Promise<boolean>;
  getMinecraftInstances: () => Promise<any[]>;

  // Versions & Launch
  startGame: (profileId: string, nickname?: string, force?: boolean, serverIp?: string, saveServer?: boolean) => Promise<any>;
  cancelLaunch: () => Promise<void>;
  getAvailableVersions: () => Promise<any>;
  getVanillaVersions: () => Promise<any[]>;
  getForgeVersions: () => Promise<any[]>;
  getFabricVersions: () => Promise<any[]>;
  getNeoforgeVersions: () => Promise<any[]>;
  getLoaderVersions: (type: string, mc_version: string) => Promise<any[]>;
  installVersion: (version_id: string) => Promise<any>;
  getLauncherVersion: () => Promise<string>;

  // Settings
  saveVersionSettings: (showSnapshots: boolean, showOld: boolean) => Promise<any>;
  saveAppSettings: (enableTransitions: boolean, hwAccel: boolean, privacyMode: boolean, reopenOnGameClose?: boolean) => Promise<any>;
  maximizeLauncher?: () => Promise<any>;
  saveDevMode: (enabled: boolean) => Promise<any>;
  selectFolder: (current_path?: string) => Promise<string | null>;
  selectFile: (current_path?: string, filters?: any[]) => Promise<string | null>;
  setZoomFactor: (factor: number) => void;
  getZoomFactor: () => number;
  getPlatformInfo?: () => Promise<{ platform: string; arch: string }>;
  getSystemMemory?: () => Promise<{ success: boolean; totalBytes?: number; totalMb: number; totalGb?: number }>;
  get_system_memory?: () => Promise<{ success: boolean; totalBytes?: number; totalMb: number; totalGb?: number }>;

  // Addons & Workshop
  searchModrinth: (query: string, options?: any) => Promise<any>;
  getModCategories: () => Promise<any[]>;
  getModVersions: (project_id: string, game_version?: string, loader?: string) => Promise<any[]>;
  getModDetails: (project_id: string) => Promise<any>;
  installAddon: (data: any) => Promise<any>;
  getInstalledAddons: (profile_id: string, type: string, world_name?: string) => Promise<any[]>;
  getInstalledMods: (profile_id: string) => Promise<any[]>;
  toggleAddon: (filename: string, profile_id: string, type: string, world_name?: string) => Promise<any>;
  deleteAddon: (filename: string, profile_id: string, type: string, world_name?: string) => Promise<any>;
  openAddonsFolder: (profile_id: string, type: string, world_name?: string) => Promise<void>;
  importAddonFile: (profile_id: string, type: string, world_name?: string) => Promise<any>;
  resolveModpackCompatibility: (opts: any) => Promise<any>;
  resolveModDependencies: (opts: any) => Promise<any>;
  checkAddonUpdates: (opts: any) => Promise<any>;
  checkLoaderUpdate?: (profile_id: string) => Promise<any>;
  check_loader_update?: (profile_id: string) => Promise<any>;

  // Skins & Capes
  getSkinData: () => Promise<any>;
  getUserCapes: () => Promise<any[]>;
  getSkinPacks: () => Promise<any[]>;
  createSkinPack: (data: any) => Promise<any>;
  editSkinPack: (data: any) => Promise<any>;
  deleteSkinPack: (id: string) => Promise<any>;
  activateSkinPack: (id: string) => Promise<any>;

  // Events
  onDownloadProgress: (callback: (data: any) => void) => void;
  onInfoMessage: (callback: (data: any) => void) => void;
  onLoginUpdate: (callback: (data: any) => void) => void;
  onStatsUpdated: (callback: () => void) => void;
  onServicesDown429: (callback: () => void) => void;

  // Auto-Updater
  checkForUpdates: () => Promise<any>;
  startDownloadUpdate: () => Promise<any>;
  quitAndInstall: () => Promise<void>;
  onUpdaterStatus: (callback: (data: any) => void) => void;
  checkLocalInstaller: () => Promise<any>;
  launchInstallerAndQuit: (path: string) => Promise<void>;
  downloadInstallerFile: (url: string) => Promise<any>;
  onInstallerDownloadProgress: (callback: (data: any) => void) => void;
  getPlatformInfo: () => Promise<any>;

  // Onboarding
  getOnboardingStatus: () => Promise<{ showOnboarding: boolean }>;
  completeOnboarding: () => Promise<void>;

  // Workshop & Social
  workshop_get_items?: (type?: string, xst?: any) => Promise<any>;
  workshop_get_item?: (id: string) => Promise<any>;
  social_get_auth?: () => Promise<any>;
  get_my_presence_server?: () => Promise<any>;
  get_server_history?: () => Promise<string[]>;

  openUrl: (url: string) => Promise<void>;
  openExternal: (url: string) => Promise<void>;
  [key: string]: any;
}

declare global {
  interface Window {
    hwlAPI: HwlAPI;
    pywebview?: { api: HwlAPI };
    electronAPI?: any;
    t?: (key: string, params?: Record<string, any>) => string;
  }
}
