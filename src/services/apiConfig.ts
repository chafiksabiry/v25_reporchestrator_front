/**
 * API Configuration
 * This file contains all API endpoints used in the application
 */
import config from '../config';

// Base API URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL;

// Token storage key
const TOKEN_KEY = 'token';

/**
 * Retrieve authentication token 
 */
export const getToken = (): string => {
  return config.getUserData().token || '';
};

/**
 * Save authentication token to localStorage
 */
export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

/**
 * Remove authentication token from localStorage
 */
export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

/**
 * Get current user ID
 */
export const getUserId = (): string => {
  return config.getUserData().userId || '';
};

/**
 * Get current agent ID
 */
export const getAgentId = (): string => {
  return config.getUserData().agentId || '';
};

// API Endpoints
export const API_ENDPOINTS = {
  // Agent endpoints
  agents: {
    getAgent: () => `${API_BASE_URL}/profiles/${getUserId()}`,
  },
  
  // User endpoints
  users: {
    getUser: () => `${API_BASE_URL}/users/${getUserId()}`,
  },
  
  // Authentication endpoints
  auth: {
    login: `${API_BASE_URL}/auth/login`,
    logout: `${API_BASE_URL}/auth/logout`,
    refresh: `${API_BASE_URL}/auth/refresh`,
  },
  
  // Add more endpoint categories as needed
};

// API request helper functions
export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  // Get token using the shared config approach
  const token = getToken();
  
  const authOptions = {
    ...options,
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    // Include credentials to send cookies automatically
    credentials: 'include' as RequestCredentials,
  };
  
  const response = await fetch(url, authOptions);
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  
  return response.json();
};

// Example usage functions
export const getAgentData = () => {
  return fetchWithAuth(API_ENDPOINTS.agents.getAgent());
};

export const getUserData = () => {
  return fetchWithAuth(API_ENDPOINTS.users.getUser());
}; 