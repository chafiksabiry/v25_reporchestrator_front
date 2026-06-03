import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-premium-gradient relative overflow-hidden">
    <div className="absolute inset-0 bg-mesh-gradient opacity-60 pointer-events-none"></div>
    <div className="flex flex-col items-center relative z-10">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-harx-500 shadow-lg shadow-harx-500/20"></div>
      <p className="mt-8 text-white font-black uppercase tracking-widest text-[10px] opacity-70">Authenticating...</p>
    </div>
  </div>
);

const ProtectedRoute = ({ children, fallback }) => {
  const { isAuthenticated, isLoading, checkAuthStatus } = useAuth();
  const location = useLocation();
  
  // Construire l'URL complète pour l'app principale
  const getMainAppUrl = () => {
    if (fallback) return fallback;
    return `${window.location.protocol}//${window.location.host}/app1`;
  };

  // Plus besoin de vérifier à chaque changement de route
  // L'AuthContext gère déjà la vérification initiale

  useEffect(() => {
    // Nettoyer l'historique du navigateur pour les pages protégées
    if (isAuthenticated) {
      // Construire l'URL complète avec le basename pour préserver le contexte React Router
      const isStandalone = import.meta.env.VITE_RUN_MODE === 'standalone';
      const basename = isStandalone ? '' : '/repassessments';
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

    const handlePopState = (event) => {
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
        document.head.removeChild(meta);
        document.head.removeChild(meta2);
        document.head.removeChild(meta3);
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
  return children;
};

export default ProtectedRoute; 

