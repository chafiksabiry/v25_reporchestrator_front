import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Composant d'écran de chargement
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
    <div className="flex flex-col items-center">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      <p className="mt-4 text-gray-600">Vérification de l'authentification...</p>
    </div>
  </div>
);

// ProtectedRoute pour l'authentification
const ProtectedRoute = ({ children, fallback }: { children: React.ReactNode; fallback?: string }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Construire l'URL complète pour l'app principale
  const getMainAppUrl = () => {
    if (fallback) return fallback;
    return `${window.location.protocol}//${window.location.host}/auth/signin`;
  };

  useEffect(() => {
    // Nettoyer l'historique du navigateur pour les pages protégées
    if (isAuthenticated) {
      // Construire l'URL complète avec le basename pour préserver le contexte React Router
      const isStandalone = import.meta.env.VITE_RUN_MODE === 'standalone';
      const basename = isStandalone ? '' : '/repdashboard';
      const fullPath = basename + location.pathname + location.search;

      // Préserver history.state (React Router) tout en marquant l'entrée
      const prev = window.history.state;
      const baseState = prev && typeof prev === 'object' ? prev : {};
      window.history.replaceState(
        { ...baseState, protected: true, timestamp: Date.now() },
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

  // Si non authentifié, rediriger vers la page d'accueil ou afficher un message
  if (!isAuthenticated) {
    const redirectUrl = getMainAppUrl();
    console.log('Utilisateur non authentifié (redirection shell désactivée):', redirectUrl);

    // Au lieu de rediriger de force vers le shell, on peut soit ne rien rendre,
    // soit rediriger vers une route locale de login si elle existe.
    // Pour l'instant, on suit la logique "Company" qui est moins agressive.
    // window.location.replace(redirectUrl);

    return <div className="p-8 text-center">Veuillez vous connecter.</div>;
  }

  // Si authentifié, afficher le contenu protégé
  return children;
};

// Interface pour les phases d'onboarding (ancienne ProtectedRoute)
interface Phase {
  status: string;
  completedAt?: string;
  requiredActions?: any[];
  optionalActions?: any[];
}

interface Phases {
  phase1: Phase;
  phase2: Phase;
  phase3: Phase;
  phase4: Phase;
  phase5: Phase;
}

interface PhaseProtectedRouteProps {
  phases: Phases | undefined;
  children: React.ReactNode;
  requiredPhase?: number;
}

// PhaseProtectedRoute pour la logique des phases d'onboarding
export const PhaseProtectedRoute = ({
  phases,
  children,
  requiredPhase = 5
}: PhaseProtectedRouteProps) => {
  const isPhaseCompleted = (phaseNumber: number): boolean => {
    if (!phases) return false;
    return phases[`phase${phaseNumber}` as keyof Phases]?.status === 'completed';
  };

  console.log('🛡️ Phase Protected Route Check:', {
    phases,
    requiredPhase,
    isAllowed: isPhaseCompleted(requiredPhase),
    redirectingTo: !isPhaseCompleted(requiredPhase) ? '/profile' : null
  });

  if (!isPhaseCompleted(requiredPhase)) {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute; 