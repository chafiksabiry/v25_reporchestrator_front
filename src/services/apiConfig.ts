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

export const getAgentPlan = async (agentId: string) => {
  const userData = config.getUserData();
  console.log('🔍 Fetching agent plan...', {
    agentId,
    endpoint: `${API_BASE_URL}/profiles/${agentId}/plan`
  });

  try {
    const response = await fetch(`${API_BASE_URL}/profiles/${agentId}/plan`, {
      headers: {
        'Authorization': `Bearer ${userData.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('❌ Failed to fetch agent plan:', {
        status: response.status,
        statusText: response.statusText
      });
      throw new Error('Failed to fetch agent plan');
    }

    const data = await response.json();
    console.log('📄 Complete response data:', data);
    console.log('✅ Agent plan fetched successfully:', {
      planId: data.plan?._id || 'No plan',
      planName: data.plan?.name || 'No plan'
    });
    return data;
  } catch (error) {
    console.error('❌ Error in getAgentPlan:', error);
    throw error;
  }
};

export const updateAgentPlan = async (agentId: string, planId: string) => {
  const userData = config.getUserData();
  console.log('📝 Updating agent plan...', {
    agentId,
    planId,
    endpoint: `${API_BASE_URL}/profiles/${agentId}/plan`
  });

  try {
    const response = await fetch(`${API_BASE_URL}/profiles/${agentId}/plan`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${userData.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ planId })
    });

    if (!response.ok) {
      console.error('❌ Failed to update agent plan:', {
        status: response.status,
        statusText: response.statusText
      });
      throw new Error('Failed to update agent plan');
    }

    const data = await response.json();
    console.log('📄 Complete response data:', data);
    console.log('✅ Agent plan updated successfully:', {
      planId: data.plan?._id,
      planName: data.plan?.name
    });
    return data;
  } catch (error) {
    console.error('❌ Error in updateAgentPlan:', error);
    throw error;
  }
};

export const refreshOnboardingStatus = async (agentId: string) => {
  const userData = config.getUserData();
  console.log('🔄 Refreshing onboarding status...', {
    agentId,
    endpoint: `${API_BASE_URL}/profiles/${agentId}/refresh-onboarding-status`
  });

  try {
    const response = await fetch(`${API_BASE_URL}/profiles/${agentId}/refresh-onboarding-status`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userData.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('❌ Failed to refresh onboarding status:', {
        status: response.status,
        statusText: response.statusText
      });
      throw new Error('Failed to refresh onboarding status');
    }

    const data = await response.json();
    
    // Log detailed information about the refresh response
    console.log('📊 Onboarding refresh response:', {
      currentPhase: data.onboardingProgress.currentPhase,
      lastUpdated: data.onboardingProgress.lastUpdated
    });

    // Log each phase's status
    Object.entries(data.onboardingProgress.phases).forEach(([phaseKey, phaseData]: [string, any]) => {
      console.log(`📋 ${phaseKey.toUpperCase()} Status:`, {
        status: phaseData.status,
        requiredActions: phaseData.requiredActions,
        completedAt: phaseData.completedAt || 'Not completed'
      });
    });

    // Log specific Phase 4 information
    if (data.onboardingProgress.phases.phase4) {
      console.log('🎯 Phase 4 Detailed Status:', {
        status: data.onboardingProgress.phases.phase4.status,
        subscriptionActivated: data.onboardingProgress.phases.phase4.requiredActions.subscriptionActivated,
        completedAt: data.onboardingProgress.phases.phase4.completedAt || 'Not completed'
      });
    }

    console.log('✅ Onboarding status refresh completed');
    return data;
  } catch (error) {
    console.error('❌ Error in refreshOnboardingStatus:', error);
    throw error;
  }
}; 