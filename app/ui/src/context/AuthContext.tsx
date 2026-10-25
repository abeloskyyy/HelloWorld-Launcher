import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { UserData, SavedAccount } from '../types/launcher';
import { getLauncherAPI } from '../hooks/useLauncher';

interface AuthContextType {
  user: UserData | null;
  savedAccounts: SavedAccount[];
  isLoading: boolean;
  isLoginModalOpen: boolean;
  isAccountSwitcherOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  openAccountSwitcher: () => void;
  closeAccountSwitcher: () => void;
  refreshUser: () => Promise<UserData | null>;
  refreshAccounts: () => Promise<SavedAccount[]>;
  switchAccount: (accountId: string, targetType?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loginOffline: (nickname: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isAccountSwitcherOpen, setIsAccountSwitcherOpen] = useState<boolean>(false);

  const api = getLauncherAPI();

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.getUserJson();
      setUser(data);
      return data;
    } catch (e) {
      console.error('[AuthContext] Failed to load user:', e);
      return null;
    }
  }, [api]);

  const refreshAccounts = useCallback(async () => {
    try {
      const accounts = await api.getSavedAccounts();
      setSavedAccounts(accounts || []);
      return accounts || [];
    } catch (e) {
      console.error('[AuthContext] Failed to load saved accounts:', e);
      return [];
    }
  }, [api]);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      setIsLoading(true);
      await Promise.all([refreshUser(), refreshAccounts()]);
      if (mounted) setIsLoading(false);
    };
    init();

    // Listen for login updates from Electron main process
    if (api.onLoginUpdate) {
      api.onLoginUpdate(async () => {
        await Promise.all([refreshUser(), refreshAccounts()]);
      });
    }

    return () => {
      mounted = false;
    };
  }, [api, refreshUser, refreshAccounts]);

  const openLoginModal = () => setIsLoginModalOpen(true);
  const closeLoginModal = () => setIsLoginModalOpen(false);
  const openAccountSwitcher = () => setIsAccountSwitcherOpen(true);
  const closeAccountSwitcher = () => setIsAccountSwitcherOpen(false);

  const switchAccount = async (accountId: string, targetType?: string): Promise<boolean> => {
    try {
      const res = await api.switchAccount(accountId, targetType);
      if (res && res.success) {
        await Promise.all([refreshUser(), refreshAccounts()]);
        closeAccountSwitcher();
        return true;
      }
      return false;
    } catch (e) {
      console.error('[AuthContext] Failed to switch account:', e);
      return false;
    }
  };

  const logout = async () => {
    try {
      await api.logout();
      await Promise.all([refreshUser(), refreshAccounts()]);
    } catch (e) {
      console.error('[AuthContext] Logout failed:', e);
    }
  };

  const loginOffline = async (nickname: string): Promise<boolean> => {
    if (!nickname || !nickname.trim()) return false;
    try {
      await api.saveUserJson({
        username: nickname.trim(),
        account_type: 'offline'
      });
      await Promise.all([refreshUser(), refreshAccounts()]);
      closeLoginModal();
      return true;
    } catch (e) {
      console.error('[AuthContext] Offline login failed:', e);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        savedAccounts,
        isLoading,
        isLoginModalOpen,
        isAccountSwitcherOpen,
        openLoginModal,
        closeLoginModal,
        openAccountSwitcher,
        closeAccountSwitcher,
        refreshUser,
        refreshAccounts,
        switchAccount,
        logout,
        loginOffline
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
