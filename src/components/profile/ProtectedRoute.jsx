import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-harx-50 via-white to-harx-alt-50">
    <div className="flex flex-col items-center">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-harx-500"></div>
      <p className="mt-4 text-gray-600">Vérification de l'authentification...</p>
    </div>
  </div>
);

const ProtectedRoute = ({ children, fallback }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Construire l'URL complète pour l'app principale
  const getMainAppUrl = () => {
    if (fallback) return fallback;
    return `${window.location.protocol}//${window.location.host}/auth/signin`;
  };

  // Plus besoin de vérifier à chaque changement de route
  // L'AuthContext gère déjà la vérification initiale.
  // NOTE: l'ancien micro-app réécrivait window.history avec le basename
  // `/repcreationprofile`. Dans l'app unifiée, le basename `/reporchestrator`
  // est déjà géré par <Router basename>, donc toute réécriture ici casse le
  // routeur (page blanche). On s'appuie donc uniquement sur React Router.

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