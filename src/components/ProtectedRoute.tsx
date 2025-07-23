import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
    <div className="flex flex-col items-center">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      <p className="mt-4 text-gray-600">Vérification de l'authentification...</p>
    </div>
  </div>
);

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, fallback }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  
  // Construire l'URL complète pour l'app principale
  const getMainAppUrl = () => {
    if (fallback) return fallback;
    return `${window.location.protocol}//${window.location.host}/auth`;
  };

  useEffect(() => {
    // Nettoyer l'historique du navigateur pour les pages protégées
    if (isAuthenticated) {
      // Construire l'URL complète avec le basename pour préserver le contexte React Router
      const isStandalone = import.meta.env.VITE_RUN_MODE === 'standalone';
      const basename = isStandalone ? '' : '/reporchestrator';
      const fullPath = basename + location.pathname + location.search;
      
      // Remplacer l'entrée actuelle de l'historique pour empêcher le retour
      window.history.replaceState(
        { protected: true, timestamp: Date.now() },
        '',
        fullPath
      );
    }
  }, [isAuthenticated, location.pathname, location.search]);

  // Écouter les événements de navigation (bouton retour)
  useEffect(() => {
    if (!isAuthenticated) return;

    const handlePopState = (event: PopStateEvent) => {
      // Si l'utilisateur essaie de revenir en arrière depuis une page protégée
      if (event.state?.protected) {
        console.log('Tentative de navigation arrière détectée sur page protégée');
        
        // Si l'utilisateur n'est plus authentifié (état déjà géré par AuthContext)
        if (!isAuthenticated) {
          window.location.replace(getMainAppUrl());
          return;
        }
        
        // Si l'utilisateur est toujours authentifié, permettre la navigation
        console.log('Navigation autorisée pour utilisateur authentifié');
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isAuthenticated]);

  // Empêcher la mise en cache des pages protégées
  useEffect(() => {
    if (isAuthenticated) {
      // Ajouter des headers pour empêcher la mise en cache
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Cache-Control';
      meta.content = 'no-cache, no-store, must-revalidate';
      document.head.appendChild(meta);

      const meta2 = document.createElement('meta');
      meta2.httpEquiv = 'Pragma';
      meta2.content = 'no-cache';
      document.head.appendChild(meta2);

      const meta3 = document.createElement('meta');
      meta3.httpEquiv = 'Expires';
      meta3.content = '0';
      document.head.appendChild(meta3);

      return () => {
        try {
          document.head.removeChild(meta);
          document.head.removeChild(meta2);
          document.head.removeChild(meta3);
        } catch (error) {
          // Ignore errors if elements were already removed
          console.log('Meta tags already removed');
        }
      };
    }
  }, [isAuthenticated]);

  // Afficher l'écran de chargement pendant la vérification
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Si non authentifié, rediriger immédiatement vers l'app d'authentification
  if (!isAuthenticated) {
    const redirectUrl = getMainAppUrl();
    console.log('Utilisateur non authentifié, redirection automatique vers:', redirectUrl);
    
    // Redirection immédiate vers l'app principale
    window.location.replace(redirectUrl);
    
    // Retourner un écran de chargement pendant la redirection
    return <LoadingScreen />;
  }

  // Si authentifié, afficher le contenu protégé
  return <>{children}</>;
};

export default ProtectedRoute; 