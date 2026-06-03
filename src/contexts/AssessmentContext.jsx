import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { getAgentId, initializeAuth, returnToParentApp } from '../utils/assessmentAuthUtils';

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
    // Get the agent ID from localStorage/auth utils - this is critical for saving
    const agentId = getAgentId();

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

      // Attempt to save to backend API if URL is configured
      if (import.meta.env.VITE_API_URL) {
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
              // Use the correct endpoint: /:id/language-assessment
              const response = await axios.post(`${import.meta.env.VITE_API_URL}/profiles/${agentId}/language-assessment`, {
                languageCode: iso639_1,
                proficiency,
                results: resultsToSend
              });
              console.log('Assessment saved to backend:', response.data);
            } catch (apiError) {
              console.warn('API endpoint not available (expected in demo mode):', apiError.message);
              // Continue execution - we've already updated local state
            }
          } else {
            // In production mode, make the API call and handle errors normally
            // Use the correct endpoint: /:id/language-assessment
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/profiles/${agentId}/language-assessment`, {
              languageCode: iso639_1,
              proficiency,
              results: resultsToSend
            });
            console.log('Assessment saved to backend:', response.data);
          }
        } catch (apiError) {
          console.error('Error communicating with backend API:', apiError);
          // Check if this is the specific error about language not found by ISO code
          if (apiError.response && apiError.response.data &&
            apiError.response.data.message &&
            apiError.response.data.message.includes('not found in user\'s profile')) {
            setError(`The language with code ${iso639_1} needs to be added to your profile first.`);
          } else {
            // Generic error
            setError('Warning: Results saved locally but could not be sent to server');
          }
        }
      } else {
        console.warn('No API URL configured. Assessment results saved only locally.');
      }

      // Show success message or notification here if needed
      return true; // Indicate success
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
    // Get the agent ID from localStorage/auth utils
    const agentId = getAgentId();

    if (!agentId) {
      console.error('Cannot save assessment: No agent ID provided');
      setError('Missing agent ID - cannot save assessment');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // For local state, we'll check if this skill already exists
      setAssessmentResults(prev => {
        // Create a new copy of the contactCenter state
        const newContactCenterState = { ...prev.contactCenter };

        // Update or add the assessment for this skill
        newContactCenterState[skillId] = {
          category,
          ...assessmentData
        };

        // Return the updated state
        return {
          ...prev,
          contactCenter: newContactCenterState
        };
      });

      // Call API to save results to backend using the new format
      if (import.meta.env.VITE_API_URL) {
        try {
          // Use the profiles endpoint with the format expected by the backend
          const response = await axios.post(`${import.meta.env.VITE_API_URL}/profiles/${agentId}/contact-center-assessment`, {
            assessment: assessmentData
          });

          console.log('Contact center assessment saved to backend:', response.data);
          return true;
        } catch (apiError) {
          console.error('Error communicating with backend API:', apiError);
          setError('Warning: Results saved locally but could not be sent to server');
          // Continue since we've already updated local state
          return true;
        }
      } else {
        console.warn('No API URL configured. Assessment results saved only locally.');
        return true;
      }
    } catch (err) {
      console.error('Error saving contact center assessment:', err);
      setError('Failed to save assessment results');
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

