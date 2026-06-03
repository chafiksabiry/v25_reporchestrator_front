export const getAgentIdFromStorage = (): string => {
  const runMode = import.meta.env.VITE_RUN_MODE;
  
  if (runMode === 'in-app') {
    try {
      const profileData = localStorage.getItem('profileData');
      if (profileData) {
        const parsed = JSON.parse(profileData);
        return parsed?._id || 'unknown-agent';
      }
    } catch (error) {
      console.error('Error getting agent ID from localStorage:', error);
    }
  }
  return 'unknown-agent'; // Fallback pour sandbox
};

