import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Profile } from '../types/launcher';
import { getLauncherAPI } from '../hooks/useLauncher';
import { useAuth } from './AuthContext';

interface ProfilesContextType {
  profiles: Profile[];
  selectedProfile: Profile | null;
  isLoading: boolean;
  isLaunching: boolean;
  isPlaying: boolean;
  selectProfile: (profile: Profile) => void;
  refreshProfiles: () => Promise<Profile[]>;
  launchGame: (force?: boolean) => Promise<boolean>;
  cancelLaunch: () => Promise<void>;
}

const ProfilesContext = createContext<ProfilesContextType | undefined>(undefined);

export const ProfilesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLaunching, setIsLaunching] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const api = getLauncherAPI();
  const { user, openLoginModal } = useAuth();

  const refreshProfiles = useCallback(async () => {
    try {
      const data = await api.getProfiles();
      const list = Array.isArray(data) ? data : [];
      setProfiles(list);

      // Keep current selection or default to first
      setSelectedProfile(prev => {
        if (prev && list.some(p => p.id === prev.id)) {
          return list.find(p => p.id === prev.id) || null;
        }
        return list.length > 0 ? list[0] : null;
      });

      return list;
    } catch (e) {
      console.error('[ProfilesContext] Failed to load profiles:', e);
      return [];
    }
  }, [api]);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      setIsLoading(true);
      await refreshProfiles();
      try {
        const running = await api.isMinecraftRunning();
        if (mounted) setIsPlaying(running);
      } catch (_) {}
      if (mounted) setIsLoading(false);
    };
    init();

    // Check status periodically
    const interval = setInterval(async () => {
      try {
        const running = await api.isMinecraftRunning();
        setIsPlaying(running);
      } catch (_) {}
    }, 3000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [api, refreshProfiles]);

  const selectProfile = (profile: Profile) => {
    setSelectedProfile(profile);
  };

  const launchGame = async (force: boolean = false): Promise<boolean> => {
    if (!user || !user.username || !user.username.trim()) {
      openLoginModal();
      return false;
    }
    if (!selectedProfile) {
      return false;
    }

    try {
      setIsLaunching(true);
      const res = await api.startGame(selectedProfile.id, user.username, force);
      if (res && res.success) {
        setIsPlaying(true);
        return true;
      }
      return false;
    } catch (e) {
      console.error('[ProfilesContext] Launch error:', e);
      return false;
    } finally {
      setIsLaunching(false);
    }
  };

  const cancelLaunch = async () => {
    try {
      await api.cancelLaunch();
      setIsLaunching(false);
    } catch (e) {
      console.error('[ProfilesContext] Cancel launch error:', e);
    }
  };

  return (
    <ProfilesContext.Provider
      value={{
        profiles,
        selectedProfile,
        isLoading,
        isLaunching,
        isPlaying,
        selectProfile,
        refreshProfiles,
        launchGame,
        cancelLaunch
      }}
    >
      {children}
    </ProfilesContext.Provider>
  );
};

export const useProfiles = () => {
  const context = useContext(ProfilesContext);
  if (!context) {
    throw new Error('useProfiles must be used within a ProfilesProvider');
  }
  return context;
};
