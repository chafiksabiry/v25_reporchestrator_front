# Guide de Sécurité d'Authentification

## 🔐 Vue d'ensemble

Ce système d'authentification sécurisé empêche complètement l'accès aux routes protégées après déconnexion, même en utilisant le bouton "Précédent" du navigateur ou en modifiant l'URL manuellement.

## ✅ Fonctionnalités de Sécurité Implémentées

### 🔧 Logout Sécurisé
- **Nettoyage complet** : localStorage + tous les cookies + état React
- **Protection navigation** : historique modifié + protection popstate
- **Redirection absolue** : vers `/auth` (sortie complète du contexte app)
- **Synchronisation multi-onglets** : déconnexion simultanée sur tous les onglets
- **URLs absolues** : empêche de rester dans le contexte de l'application

### 🛡️ Protection des Routes
- **Vérification automatique** : contrôle d'authentification avant chaque route
- **Redirection immédiate** : si non connecté, redirection automatique vers `/auth`
- **Protection URL directe** : empêche l'accès via modification manuelle d'URL
- **Préservation basename** : maintient la navigation normale React Router

### 🚀 Gestion d'État Avancée
- **AuthContext centralisé** : gestion globale de l'état d'authentification
- **ProtectedRoute modulaire** : protection réutilisable pour toutes les routes
- **Prévention mise en cache** : empêche la mise en cache des pages protégées
- **Gestion erreurs 401** : logout automatique en cas d'erreur d'autorisation

## 📁 Structure des Fichiers

```
src/
├── contexts/
│   └── AuthContext.tsx          # Gestion centralisée de l'authentification
├── components/
│   ├── ProtectedRoute.tsx       # Protection modulaire des routes
│   └── AuthTest.tsx             # Page de test du système
└── App.tsx                      # Integration des providers et routes
```

## 🔧 Utilisation

### 1. AuthContext - Gestion de l'authentification

```typescript
import { useAuth } from './contexts/AuthContext';

const MyComponent = () => {
  const { isAuthenticated, user, logout, checkAuthStatus } = useAuth();
  
  return (
    <div>
      {isAuthenticated ? (
        <button onClick={logout}>Se déconnecter</button>
      ) : (
        <p>Non connecté</p>
      )}
    </div>
  );
};
```

### 2. ProtectedRoute - Protection des routes

```typescript
import ProtectedRoute from './components/ProtectedRoute';

// Dans App.tsx
<ProtectedRoute>
  <Routes>
    <Route path="/" element={<Dashboard />} />
    <Route path="/profile" element={<Profile />} />
  </Routes>
</ProtectedRoute>
```

### 3. Intégration complète

```typescript
// App.tsx
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
```

## 🧪 Test du Système

Accédez à `/auth-test` pour tester toutes les fonctionnalités :

1. **Simulation de connexion** : créée une session temporaire
2. **Test de navigation** : vérifiez l'accès aux pages protégées
3. **Test de déconnexion** : vérifiez la redirection et nettoyage
4. **Test bouton précédent** : impossible de revenir après logout
5. **Test URL manuelle** : redirection automatique si non authentifié

## 🔑 Variables d'Environnement

```env
# URL de redirection après logout
VITE_FRONT_URL=http://localhost:3000/
```

## 📋 Configuration

### 1. Dépendances requises

```json
{
  "dependencies": {
    "js-cookie": "^3.0.5",
    "@types/js-cookie": "^3.0.6",
    "react-router-dom": "^6.22.3"
  }
}
```

### 2. URLs de redirection

Modifiez dans `AuthContext.tsx` et `ProtectedRoute.tsx` :

```typescript
const getMainAppUrl = () => {
  return `${window.location.protocol}//${window.location.host}/auth`;
};
```

## ⚙️ Fonctionnement Interne

### 1. Vérification d'authentification

```typescript
const checkAuthStatus = () => {
  const userId = Cookies.get('userId');
  const token = localStorage.getItem('token');
  return !!(userId && token);
};
```

### 2. Logout sécurisé

```typescript
const logout = () => {
  // 1. Nettoyage localStorage
  localStorage.clear();
  
  // 2. Nettoyage cookies
  Object.keys(Cookies.get()).forEach(cookieName => {
    Cookies.remove(cookieName, { path: '/' });
  });
  
  // 3. Nettoyage état React
  setIsAuthenticated(false);
  setUser(null);
  
  // 4. Modification historique
  window.history.replaceState(null, null, '/auth');
  
  // 5. Redirection forcée
  window.location.replace('/auth');
};
```

### 3. Protection navigation arrière

```typescript
useEffect(() => {
  const handlePopState = (event) => {
    if (event.state?.protected && !isAuthenticated) {
      window.location.replace('/auth');
    }
  };
  
  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}, [isAuthenticated]);
```

## 🚨 Points d'Attention

### ✅ Bonnes Pratiques
- **Toujours wrapper** l'app avec `<AuthProvider>`
- **Protéger toutes les routes** sensibles avec `<ProtectedRoute>`
- **Utiliser `logout()`** du contexte plutôt que des solutions manuelles
- **Tester régulièrement** avec `/auth-test`

### ⚠️ Limitations
- **Côté client uniquement** : protection navigateur, pas serveur
- **JavaScript activé** : nécessite JS pour fonctionner
- **URLs absolues** : redirection vers domaine principal

## 🔧 Maintenance

### Debugging
Activez les logs de debug dans la console :
```typescript
console.log('Auth status changed:', { userId: !!userId, token: !!token });
```

### Mise à jour
Pour modifier l'URL de redirection, éditez :
- `AuthContext.tsx` : fonction `getMainAppUrl()`
- `ProtectedRoute.tsx` : fonction `getMainAppUrl()`

## 🏆 Résultat Final

✅ **Navigation sécurisée** : impossible de revenir après logout  
✅ **Nettoyage complet** : aucune donnée résiduelle  
✅ **Multi-onglets** : synchronisation automatique  
✅ **UX fluide** : redirections transparentes  
✅ **Architecture propre** : code modulaire et maintenable  

Le système garantit qu'après un logout, **aucun retour en arrière n'est possible**, que ce soit via le navigateur ou manipulation d'URL. 