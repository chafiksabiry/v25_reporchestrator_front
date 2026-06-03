/**
 * Utility functions
 */

/**
 * Get agent name from localStorage profileData
 * @returns Agent name or fallback to 'Agent'
 */
export const getAgentName = (): string => {
  try {
    const profileData = localStorage.getItem('profileData');
    if (profileData) {
      const parsed = JSON.parse(profileData);
      return parsed?.personalInfo?.name || 'Agent';
    }
    return 'Agent';
  } catch (error) {
    console.error('Error getting agent name from localStorage:', error);
    return 'Agent';
  }
};
