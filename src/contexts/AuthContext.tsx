import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';

interface User {
  userId: string;
  token: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  logout: () => void;
  checkAuthStatus: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  // Fonction utilitaire pour construire l'URL de l'app principale
  const getMainAppUrl = () => {
    return `${window.location.protocol}//${window.location.host}/auth`;
  };

  // Fonction pour vérifier si l'utilisateur est authentifié
  const checkAuthStatus = useCallback(() => {
    const userId = Cookies.get('userId');
    const token = localStorage.getItem('token');
    
    const isAuth = !!(userId && token);
    
    // Seulement mettre à jour si l'état a changé
    if (isAuthenticated !== isAuth) {
      console.log('Auth status changed:', { userId: !!userId, token: !!token });
      setIsAuthenticated(isAuth);
      
      if (isAuth) {
        setUser({ userId, token });
      } else {
        setUser(null);
      }
    }
    
    return isAuth;
  }, [isAuthenticated]);

  // Fonction de logout sécurisée
  const logout = () => {
    console.log('Performing secure logout...');
    
    // 1. Nettoyer le localStorage
    localStorage.clear();
    
    // 2. Nettoyer tous les cookies
    const cookies = Cookies.get();
    Object.keys(cookies).forEach(cookieName => {
      Cookies.remove(cookieName, { path: '/' });
      // Essayer aussi de supprimer avec différents domaines si nécessaire
      Cookies.remove(cookieName, { path: '/', domain: window.location.hostname });
    });
    
    // 3. Nettoyer l'état local
    setIsAuthenticated(false);
    setUser(null);
    
    // 4. Construire l'URL complète pour rediriger vers l'app principale
    const mainAppUrl = getMainAppUrl();
    
    // 5. Nettoyer l'historique du navigateur pour empêcher le retour
    window.history.replaceState(null, '', mainAppUrl);
    
    // 6. Rediriger vers l'application principale (pas la sous-app)
    window.location.replace(mainAppUrl);
  };

  // Vérification initiale au chargement
  useEffect(() => {
    setIsLoading(true);
    
    const userId = Cookies.get('userId');
    const token = localStorage.getItem('token');
    
    console.log('Initial auth check:', { userId: !!userId, token: !!token });
    
    const isAuth = !!(userId && token);
    setIsAuthenticated(isAuth);
    
    if (isAuth) {
      setUser({ userId, token });
    } else {
      setUser(null);
    }
    
    setIsLoading(false);
  }, []);

  // Écouter les changements dans localStorage/cookies depuis d'autres onglets
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' && !e.newValue && isAuthenticated) {
        // Token supprimé dans un autre onglet - logout direct
        console.log('Token removed in another tab, logging out...');
        setIsAuthenticated(false);
        setUser(null);
        window.location.replace(getMainAppUrl());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isAuthenticated]);

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    user,
    logout,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 