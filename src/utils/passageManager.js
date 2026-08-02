import { getPassage as apiGetPassage, getNewPassage as apiGetNewPassage } from '../lib/api/languageAssessment';

/**
 * Get passage for specified language - always generates a new one
 */
export const getPassage = async (language) => {
  try {
    if (!language) {
      throw new Error('Language is required');
    }

    return await apiGetPassage(language);
  } catch (error) {
    console.error('Error getting passage:', error);
    throw new Error(`Unable to provide passage for ${language}: ${error.message}`);
  }
};

/**
 * Generate a new passage for the same language (same as getPassage now)
 */
export const getNewPassage = async (language) => {
  try {
    if (!language) {
      throw new Error('Language is required');
    }

    return await apiGetNewPassage(language);
  } catch (error) {
    console.error('Error getting new passage:', error);
    throw new Error(`Unable to provide new passage for ${language}: ${error.message}`);
  }
}; 

