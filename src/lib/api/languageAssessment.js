/**
 * Service API pour l'évaluation linguistique
 */

import api from './client';

const ENDPOINT = '/language-assessment';

/**
 * Analyse une évaluation linguistique
 */
export const analyzeLanguageAssessment = async (passage, language) => {
  try {
    const { data } = await api.post(`${ENDPOINT}/analyze`, { passage, language });
    return data;
  } catch (error) {
    console.error('Error analyzing language assessment:', error);
    throw error;
  }
};

/**
 * Obtient le code de langue standardisé
 */
export const getLanguageCode = async (language) => {
  try {
    const { data } = await api.post(`${ENDPOINT}/get-language-code`, { language });
    return data.languageCode;
  } catch (error) {
    console.error('Error getting language code:', error);
    throw error;
  }
};

/**
 * Génère un passage dans une langue spécifique
 */
export const generatePassage = async (language, targetLanguageCode) => {
  try {
    const { data } = await api.post(`${ENDPOINT}/generate-passage`, { language, targetLanguageCode });
    return data;
  } catch (error) {
    console.error('Error generating passage:', error);
    throw error;
  }
};

/**
 * Obtient un passage pour une langue spécifique
 */
export const getPassage = async (language) => {
  try {
    const { data } = await api.post(`${ENDPOINT}/get-passage`, { language });
    return data;
  } catch (error) {
    console.error('Error getting passage:', error);
    throw error;
  }
};

/**
 * Obtient un nouveau passage pour une langue (alias de getPassage)
 */
export const getNewPassage = async (language) => {
  try {
    const { data } = await api.post(`${ENDPOINT}/get-new-passage`, { language });
    return data;
  } catch (error) {
    console.error('Error getting new passage:', error);
    throw error;
  }
};


