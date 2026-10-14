import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { UserProfile, ServerStatusResponse } from '../types';
import { api, setStoredToken, clearStoredToken, getStoredToken } from '../services/api';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  systemStatus: ServerStatusResponse | null;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  refreshSystemStatus: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState<ServerStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const refreshSystemStatus = useCallback(async () => {
    try {
      const status = await api.getStatus();
      setSystemStatus(status);
    } catch (err) {
      console.warn('Could not fetch server status:', err);
    }
  }, []);

  const initAuth = useCallback(async () => {
    setLoading(true);
    await refreshSystemStatus();
    const token = getStoredToken();
    if (token) {
      try {
        const res = await api.getMe();
        setUser(res.user);
      } catch (err) {
        console.warn('Session verification failed, clearing token');
        clearStoredToken();
        setUser(null);
      }
    }
    setLoading(false);
  }, [refreshSystemStatus]);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const login = async (email: string, pass: string) => {
    setError(null);
    try {
      const res = await api.login({ email, password: pass });
      setStoredToken(res.token);
      setUser(res.user);
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  const register = async (email: string, pass: string, name: string) => {
    setError(null);
    try {
      const res = await api.register({ email, password: pass, name });
      setStoredToken(res.token);
      setUser(res.user);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      throw err;
    }
  };

  const demoLogin = async () => {
    setError(null);
    try {
      const res = await api.demoLogin();
      setStoredToken(res.token);
      setUser(res.user);
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      clearStoredToken();
      setUser(null);
    }
  };

  const updateProfile = async (profile: Partial<UserProfile>) => {
    setError(null);
    try {
      const res = await api.updateProfile(profile);
      setUser(res.user);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        systemStatus,
        login,
        register,
        demoLogin,
        logout,
        updateProfile,
        refreshSystemStatus,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
