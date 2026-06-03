/**
 * Service API pour l'évaluation du centre de contact
 */

import api from './client';

const ENDPOINT = '/contact-center';

/**
 * Génère un scénario pour l'évaluation
 * @param {string} skillName - Le nom de la compétence à tester
 * @param {string} category - La catégorie de la compétence
 */
export const generateScenario = async (skillName, category) => {
  try {
    const { data } = await api.post(`${ENDPOINT}/generate-scenario`, {
      skillName,
      category
    });
    return data;
  } catch (error) {
    console.error('Error generating scenario:', error);
    throw error;
  }
};

/**
 * Analyse une réponse d'agent
 * @param {string} response - La réponse de l'agent
 * @param {object} scenario - Les données du scénario
 * @param {string} skillName - Le nom de la compétence testée
 */
export const analyzeResponse = async (response, scenario, skillName) => {
  try {
    const { data } = await api.post(`${ENDPOINT}/analyze-response`, {
      response,
      scenario,
      skillName
    });
    return data;
  } catch (error) {
    console.error('Error analyzing response:', error);
    throw error;
  }
};


