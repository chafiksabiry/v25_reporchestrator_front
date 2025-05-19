/**
 * Configuration file for the REPS platform
 * Handles environment variables and user authentication data
 */

// Environment variables
const RUN_MODE = import.meta.env.VITE_RUN_MODE || 'standalone';
const STANDALONE_USER_ID = import.meta.env.VITE_STANDALONE_USER_ID;
const STANDALONE_AGENT_ID = import.meta.env.VITE_STANDALONE_AGENT_ID;
const STANDALONE_TOKEN = import.meta.env.VITE_STANDALONE_TOKEN;

/**
 * Get user authentication data based on run mode
 */
export const getUserData = () => {
  // Running in standalone mode - use environment variables
  if (RUN_MODE === 'standalone') {
    return {
      userId: STANDALONE_USER_ID,
      agentId: STANDALONE_AGENT_ID,
      token: STANDALONE_TOKEN,
    };
  } 
  
  // Running in-app mode - get data from cookies and localStorage
  else {
    // Get userId and agentId from cookies
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    
    // Get token from localStorage
    const token = localStorage.getItem('token');

    return {
      userId: cookies['userId'],
      agentId: cookies['agentId'],
      token,
    };
  }
};

// Export configuration
export const config = {
  runMode: RUN_MODE,
  isStandalone: RUN_MODE === 'standalone',
  getUserData,
};

export default config; 