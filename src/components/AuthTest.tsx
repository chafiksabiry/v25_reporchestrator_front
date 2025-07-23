import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Cookies from 'js-cookie';

const AuthTest: React.FC = () => {
  const { isAuthenticated, user, logout, checkAuthStatus } = useAuth();

  // Simulation d'une connexion pour les tests
  const simulateLogin = () => {
    const testUserId = 'test-user-123';
    const testToken = 'test-token-' + Date.now();
    
    // Simuler la création de session
    Cookies.set('userId', testUserId, { path: '/' });
    localStorage.setItem('token', testToken);
    
    // Forcer la vérification du statut d'authentification
    checkAuthStatus();
    
    // Recharger la page pour déclencher la vérification complète
    window.location.reload();
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Test d'Authentification</h2>
      
      <div className="space-y-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-700">Statut d'authentification</h3>
          <p className="text-lg">
            {isAuthenticated ? (
              <span className="text-green-600 font-medium">✅ Authentifié</span>
            ) : (
              <span className="text-red-600 font-medium">❌ Non authentifié</span>
            )}
          </p>
        </div>

        {user && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-gray-700">Informations utilisateur</h3>
            <p><strong>User ID:</strong> {user.userId}</p>
            <p><strong>Token:</strong> {user.token.substring(0, 20)}...</p>
          </div>
        )}

        <div className="flex space-x-4">
          {!isAuthenticated ? (
            <button
              onClick={simulateLogin}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Simuler une connexion
            </button>
          ) : (
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Se déconnecter
            </button>
          )}
        </div>

        <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
          <h3 className="font-semibold text-gray-700 mb-2">Instructions de test</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
            <li>Cliquez sur "Simuler une connexion" pour créer une session</li>
            <li>Naviguez vers d'autres pages - elles devraient être accessibles</li>
            <li>Cliquez sur "Se déconnecter" - vous devriez être redirigé vers /auth</li>
            <li>Utilisez le bouton "Précédent" du navigateur - vous ne devriez pas pouvoir revenir</li>
            <li>Modifiez l'URL manuellement - vous devriez être redirigé automatiquement</li>
          </ol>
        </div>

        <div className="mt-4 p-4 bg-green-50 rounded-lg">
          <h3 className="font-semibold text-gray-700 mb-2">Fonctionnalités sécurisées</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
            <li>✅ Nettoyage complet localStorage + cookies</li>
            <li>✅ Protection contre navigation arrière</li>
            <li>✅ Redirection automatique si non authentifié</li>
            <li>✅ Synchronisation multi-onglets</li>
            <li>✅ Prévention de mise en cache</li>
            <li>✅ URLs absolues pour sortir du contexte</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AuthTest; 