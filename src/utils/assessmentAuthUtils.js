/**
 * Authentication utilities for the micro-frontend
 */

/**
 * Get a cookie value by name
 */
const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

/**
 * Set a cookie with a name and value
 */
const setCookie = (name, value, days = 7) => {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = `; expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value}${expires}; path=/`;
};

/**
 * Initialize authentication from the appropriate source based on RUN_MODE
 * - In standalone mode: get values from .env
 * - In in-app mode: get values only from cookies
 */
export const initializeAuth = () => {
  const isStandaloneMode = import.meta.env.VITE_RUN_MODE === 'standalone';
  
  if (isStandaloneMode) {
    // In standalone mode, get values from .env
    const userId = import.meta.env.VITE_STANDALONE_USER_ID;
    const token = import.meta.env.VITE_STANDALONE_TOKEN;
    const agentId = import.meta.env.VITE_STANDALONE_AGENT_ID;
    const returnUrl = import.meta.env.VITE_STANDALONE_RETURN_URL;
    
    // Store in cookies for consistency
    if (userId) setCookie('userId', userId);
    if (token) setCookie('token', token);
    if (agentId) setCookie('agentId', agentId);
    if (returnUrl) setCookie('returnUrl', returnUrl);
    
    return { userId, token, returnUrl, agentId };
  } else {
    // In in-app mode, get values only from cookies and localStorage
    const userId = getCookie('userId');
    const token = localStorage.getItem('token');
    const returnUrl = getCookie('returnUrl') || import.meta.env.VITE_RETURN_URL;
    const agentId = localStorage.getItem('agentId');
    
    return { userId, token, returnUrl, agentId };
  }
};

/**
 * Get the agent ID from cookies or env variables based on mode
 */
export const getAgentId = () => {
  const isStandaloneMode = import.meta.env.VITE_RUN_MODE === 'standalone';
  
  if (isStandaloneMode) {
    return import.meta.env.VITE_STANDALONE_AGENT_ID;
  } else {
    return localStorage.getItem('agentId');
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  const isStandaloneMode = import.meta.env.VITE_RUN_MODE === 'standalone';
  
  if (isStandaloneMode) {
    // In standalone mode, consider authenticated if env vars are set
    return Boolean(
      import.meta.env.VITE_STANDALONE_USER_ID || import.meta.env.VITE_STANDALONE_TOKEN
    );
  } else {
    // In in-app mode, require both userId and token from cookies
    return Boolean(getCookie('userId') && getCookie('token'));
  }
};

/**
 * Return to parent application
 */
export const returnToParentApp = () => {
  const isStandaloneMode = import.meta.env.VITE_RUN_MODE === 'standalone';
  
  if (isStandaloneMode) {
    window.location.href = import.meta.env.VITE_STANDALONE_RETURN_URL || '/';
  } else {
    const returnUrl = import.meta.env.VITE_RETURN_URL || '/';
    window.location.href = returnUrl;
  }
};

/**
 * Get the language ISO code from a language name
 * This is a helper utility that can be used when we know the language name
 * but need the ISO code for API calls
 */
export const getLanguageIsoCode = (languageName) => {
  // Common language mappings
  const languageMappings = {
    'english': 'en',
    'french': 'fr',
    'spanish': 'es',
    'german': 'de',
    'italian': 'it',
    'portuguese': 'pt',
    'russian': 'ru',
    'japanese': 'ja',
    'chinese': 'zh',
    'arabic': 'ar',
    'hindi': 'hi',
    'bengali': 'bn',
    'turkish': 'tr',
    // Add more as needed
  };
  
  // Try to find a direct match
  const normalizedName = languageName.toLowerCase().trim();
  if (languageMappings[normalizedName]) {
    return languageMappings[normalizedName];
  }
  
  // If it's already a 2-letter code, return it
  if (/^[a-z]{2}$/.test(normalizedName)) {
    return normalizedName;
  }
  
  // For unknown languages, return null (the API will need to determine it)
  return null;
}; 

