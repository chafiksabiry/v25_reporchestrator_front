import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { getAgentId, initializeAuth, returnToParentApp } from '../utils/assessmentAuthUtils';
import { repApiUrl } from '../utils/repApiUrl';

const resolveAgentProfileId = () => {
  const fromStorage = getAgentId();
  if (fromStorage) return fromStorage;
  try {
    const raw = localStorage.getItem('profileData');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?._id || null;
    }
  } catch {
    // ignore parse errors
  }
  return null;
};

const postToRepProfilesApi = async (path, body) => {
  const token = localStorage.getItem('token');
  return axios.post(repApiUrl(path), body, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
};

const AssessmentContext = createContext();

export const useAssessment = () => useContext(AssessmentContext);

export const AssessmentProvider = ({ children }) => {
  const [assessmentResults, setAssessmentResults] = useState({
    languages: {},
    contactCenter: {}
  });

  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);
  const [returnUrl, setReturnUrl] = useState('/');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentAssessmentType, setCurrentAssessmentType] = useState(null);

  // Initialize auth data on mount
  useEffect(() => {
    const { userId: authUserId, token: authToken, returnUrl: authReturnUrl } = initializeAuth();

    if (authUserId) setUserId(authUserId);
    if (authToken) setToken(authToken);
    if (authReturnUrl) setReturnUrl(authReturnUrl);
  }, []);

  // Configure axios with the authentication token
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Sample language options
  const languageOptions = [
    { id: 'en', language: 'English' },
    { id: 'fr', language: 'French' },
    { id: 'es', language: 'Spanish' },
    { id: 'de', language: 'German' },
    { id: 'ar', language: 'Arabic' }
  ];

  // Sample contact center skills
  const contactCenterSkills = [
    {
      category: 'Communication',
      skills: [
        { id: 'active-listening', name: 'Active Listening' },
        { id: 'clear-speech', name: 'Clear Speech' },
        { id: 'empathy', name: 'Empathy' },
        { id: 'tone-management', name: 'Tone Management' }
      ]
    },
    {
      category: 'Problem Solving',
      skills: [
        { id: 'issue-analysis', name: 'Issue Analysis' },
        { id: 'solution-finding', name: 'Solution Finding' },
        { id: 'decision-making', name: 'Decision Making' },
        { id: 'resource-utilization', name: 'Resource Utilization' }
      ]
    },
    {
      category: 'Customer Service',
      skills: [
        { id: 'service-orientation', name: 'Service Orientation' },
        { id: 'conflict-resolution', name: 'Conflict Resolution' },
        { id: 'product-knowledge', name: 'Product Knowledge' },
        { id: 'quality-assurance', name: 'Quality Assurance' }
      ]
    },
    {
      category: 'Activities',
      skills: []
    },
    {
      category: 'Industries',
      skills: []
    }
  ];

  // Save a language assessment result
  const saveLanguageAssessment = async (language, proficiency, results, iso639_1) => {
    const agentId = resolveAgentProfileId();

    if (!agentId) {
      console.error('Cannot save assessment: No agent ID provided');
      setError('Missing agent ID - cannot save assessment');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Update local state first (this will work even if API call fails)
      setAssessmentResults(prev => ({
        ...prev,
        languages: {
          ...prev.languages,
          [language]: {
            ...results,
          }
        }
      }));

      if (import.meta.env.VITE_REP_API_URL) {
        try {
          // Check if we're in demo/development mode
          const isDemoMode = import.meta.env.VITE_RUN_MODE === 'standalone' ||
            !import.meta.env.PROD;

          // Create a new result object without languageOrTextMismatch
          const { languageOrTextMismatch, ...resultsToSend } = results;

          // If in demo mode and the endpoint might not exist, log instead of throwing error
          if (isDemoMode) {
            console.log('Demo mode: Would save assessment data to backend:', {
              agentId,
              languageCode: iso639_1,
              proficiency,
              results: resultsToSend
            });

            // Try the API call anyway, but don't fail if it's not available
            try {
              const response = await postToRepProfilesApi(
                `/profiles/${agentId}/language-assessment`,
                { languageCode: iso639_1, proficiency, results: resultsToSend }
              );
              console.log('Assessment saved to backend:', response.data);
            } catch (apiError) {
              console.warn('API endpoint not available (expected in demo mode):', apiError.message);
            }
          } else {
            const response = await postToRepProfilesApi(
              `/profiles/${agentId}/language-assessment`,
              { languageCode: iso639_1, proficiency, results: resultsToSend }
            );
            console.log('Assessment saved to backend:', response.data);
          }
        } catch (apiError) {
          console.error('Error communicating with backend API:', apiError);
          if (apiError.response?.data?.message?.includes('not found in user\'s profile')) {
            setError(`The language with code ${iso639_1} needs to be added to your profile first.`);
          } else {
            setError('Could not save assessment to server');
          }
          return false;
        }
      } else {
        console.warn('No REP API URL configured. Assessment results saved only locally.');
      }

      return true;
    } catch (err) {
      console.error('Error saving language assessment:', err);
      setError('Failed to save assessment results');
      return false; // Indicate failure
    } finally {
      setLoading(false);
    }
  };

  // Save a contact center skill assessment result
  const saveContactCenterAssessment = async (skillId, category, assessmentData) => {
    const agentId = resolveAgentProfileId();

    if (!agentId) {
      console.error('Cannot save assessment: No agent profile ID');
      setError('Missing agent ID - cannot save assessment');
      return false;
    }

    if (!import.meta.env.VITE_REP_API_URL) {
      console.error('Cannot save assessment: VITE_REP_API_URL is not configured');
      setError('Server URL not configured - cannot save assessment');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await postToRepProfilesApi(
        `/profiles/${agentId}/contact-center-assessment`,
        { assessment: assessmentData }
      );

      console.log('Contact center assessment saved to backend:', response.data);

      setAssessmentResults((prev) => {
        const newContactCenterState = { ...prev.contactCenter };
        newContactCenterState[skillId] = { category, ...assessmentData };
        return { ...prev, contactCenter: newContactCenterState };
      });

      return true;
    } catch (apiError) {
      console.error('Error saving contact center assessment:', apiError);
      const serverMsg =
        apiError.response?.data?.message ||
        apiError.response?.data?.error ||
        apiError.message;
      setError(`Failed to save assessment: ${serverMsg}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Reset the current assessment state when closing dialog
  const resetAssessment = () => {
    setCurrentAssessmentType(null);
    setError(null);
    setLoading(false);
  };

  // Check if all assessments for a category are completed
  const isAssessmentCategoryComplete = (category) => {
    if (category === 'language') {
      // Determine if all required language assessments are completed
      // For now, we'll just check if at least one language is assessed
      return Object.keys(assessmentResults.languages).length > 0;
    } else if (category === 'contact-center') {
      // Determine if all required contact center assessments are completed
      // For now, we'll just check if at least one skill is assessed
      return Object.keys(assessmentResults.contactCenter).length > 0;
    }
    return false;
  };

  // Handle exit/return to parent application
  const exitToParentApp = () => {
    returnToParentApp();
  };

  return (
    <AssessmentContext.Provider value={{
      assessmentResults,
      languageOptions,
      contactCenterSkills,
      currentAssessmentType,
      setCurrentAssessmentType,
      saveLanguageAssessment,
      saveContactCenterAssessment,
      isAssessmentCategoryComplete,
      loading,
      setLoading,
      error,
      setError,
      userId,
      setUserId,
      token,
      setToken,
      returnUrl,
      setReturnUrl,
      resetAssessment,
      exitToParentApp
    }}>
      {children}
    </AssessmentContext.Provider>
  );
}; 

