import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';
import { repApiClient } from '../utils/client';
import { getAgentId, getAuthToken } from '../utils/authUtils';
import { broadcastAuthChanged, subscribeAuthChanged } from '../utils/authSync';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any;
  logout: () => void;
  checkAuthStatus: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const syncFromStorage = useCallback(() => {
    const agentId = getAgentId();
    const token = getAuthToken();
    const isAuth = !!agentId && !!token;
    setIsAuthenticated(isAuth);
    setUser(isAuth ? { agentId, token } : null);
    return isAuth;
  }, []);

  const checkAuthStatus = useCallback(() => {
    return syncFromStorage();
  }, [syncFromStorage]);

  const logout = () => {
    localStorage.clear();
    const cookies = Cookies.get();
    Object.keys(cookies).forEach((cookieName) => {
      Cookies.remove(cookieName, { path: '/' });
      Cookies.remove(cookieName, { path: '/', domain: window.location.hostname });
    });

    setIsAuthenticated(false);
    setUser(null);
    broadcastAuthChanged({ token: null, userId: null, source: 'reps' });

    // Soft SPA return to landing — auth MF remounts and picks up cleared session
    window.location.replace(`${window.location.protocol}//${window.location.host}/`);
  };

  useEffect(() => {
    setIsLoading(true);
    syncFromStorage();
    setIsLoading(false);
  }, [syncFromStorage]);

  useEffect(() => {
    return subscribeAuthChanged(() => {
      syncFromStorage();
    });
  }, [syncFromStorage]);

  useEffect(() => {
    if (!repApiClient?.interceptors?.response) {
      return;
    }

    const interceptorId = repApiClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 && isAuthenticated) {
          localStorage.removeItem('token');
          localStorage.removeItem('userId');
          Cookies.remove('userId', { path: '/' });
          setIsAuthenticated(false);
          setUser(null);
          broadcastAuthChanged({ token: null, userId: null, source: 'reps' });
        }
        return Promise.reject(error);
      }
    );

    return () => {
      if (repApiClient?.interceptors?.response?.eject) {
        repApiClient.interceptors.response.eject(interceptorId);
      }
    };
  }, [isAuthenticated]);

  const value = {
    isAuthenticated,
    isLoading,
    user,
    logout,
    checkAuthStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
