import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api, getToken, setToken, removeToken } from '../api/client';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean | null;
  login: (username: string, password: string) => Promise<void>;
  setup: (username: string, password: string, display_name: string) => Promise<void>;
  logout: () => Promise<void>;
  checkStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);

  const checkStatus = async () => {
    try {
      const status = await api.auth.getStatus();
      setIsInitialized(status.is_initialized);

      if (status.is_initialized && getToken()) {
        try {
          const me = await api.auth.me();
          setUser(me);
        } catch {
          removeToken();
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('获取系统初始化状态失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();

    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('auth-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth-unauthorized', handleUnauthorized);
  }, []);

  const login = async (username: string, password: string) => {
    const res = await api.auth.login({ username, password });
    setToken(res.access_token);
    setUser(res.user);
  };

  const setup = async (username: string, password: string, display_name: string) => {
    const res = await api.auth.setup({ username, password, display_name });
    setToken(res.access_token);
    setUser(res.user);
    setIsInitialized(true);
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // ignore
    } finally {
      removeToken();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isInitialized,
        login,
        setup,
        logout,
        checkStatus,
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
