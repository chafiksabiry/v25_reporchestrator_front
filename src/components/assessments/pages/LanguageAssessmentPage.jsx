import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import LanguageAssessment from '../LanguageAssessment';
import { useAssessment } from '../../../contexts/AssessmentContext';
import { isAuthenticated, returnToParentApp, getLanguageIsoCode } from '../../../utils/assessmentAuthUtils';
import Notification from '../Notification';

function LanguageAssessmentPage() {
  const [searchParams] = useSearchParams();
  const { setCurrentAssessmentType, saveLanguageAssessment, setUserId } = useAssessment();
  const [notification, setNotification] = useState(null);
  
  // Get language and code from URL query parameters
  // Priority: 'lang' parameter (preferred) > 'language' parameter (legacy)
  const langFromQuery = searchParams.get('lang');
  const languageFromQuery = searchParams.get('language');
  const codeFromQuery = searchParams.get('code');
  
  // Determine the effective language and code
  const effectiveLanguage = langFromQuery || languageFromQuery || 'English';
  const effectiveCode = codeFromQuery;
  
  // Check if we have all required parameters
  const hasRequiredParams = (langFromQuery || languageFromQuery) && codeFromQuery;
  
  // Set assessment type and check authentication on mount
  useEffect(() => {
    setCurrentAssessmentType('language');
    
    // Check if the user is authenticated
    if (!isAuthenticated() && import.meta.env.VITE_RUN_MODE !== 'standalone') {
      console.warn('No authentication data found. Using demo mode.');
    }
    
    // Log the method being used
    if (hasRequiredParams) {
      console.log(`✅ Using query parameters - Language: ${effectiveLanguage}, Code: ${effectiveCode}`);
    } else {
      console.warn('⚠️ No language parameters specified, using default: English');
    }
  }, [setCurrentAssessmentType, effectiveLanguage, effectiveCode, hasRequiredParams]);
  
  // Helper function to convert score to CEFR level - copied from LanguageAssessment component
  const mapScoreToCEFR = (score) => {
    if (score >= 95) return 'C2';
    if (score >= 80) return 'C1';
    if (score >= 65) return 'B2';
    if (score >= 50) return 'B1';
    if (score >= 35) return 'A2';
    return 'A1';
  };
  
  const handleComplete = async (results) => {
    console.log('Assessment completed:', results);
    
    // Use query parameters if provided, otherwise use existing logic
    const languageParam = effectiveLanguage;
    const isoCode = effectiveCode || getLanguageIsoCode(languageParam) || results.language_code;
    
    // Get the CEFR level from the results for proficiency
    const proficiency = mapScoreToCEFR(results.overall.score);
    
    // Save results to the assessment context with the required parameters
    const success = await saveLanguageAssessment(languageParam, proficiency, results, isoCode);
    
    if (success) {
      setNotification({
        message: 'Assessment results saved successfully!',
        type: 'success'
      });
      
      // Set a brief timeout to allow the user to see the success notification before redirecting
      setTimeout(() => {
        returnToParentApp();
      }, 2000);
    } else {
      setNotification({
        message: 'Results saved locally but could not be sent to server',
        type: 'warning'
      });
    }
  };
  
  // Get the proper language name for display
  const [displayLanguageName, setDisplayLanguageName] = useState(effectiveLanguage);
  
  // Update display name from query parameters
  useEffect(() => {
    setDisplayLanguageName(effectiveLanguage);
    console.log('Using language parameter:', effectiveLanguage);
  }, [effectiveLanguage]);
  
  // Error state when required parameters are missing
  if (!hasRequiredParams) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl w-full">
          <div className="glass-card rounded-[2rem] p-10 text-center border-red-500/20">
            <h3 className="text-red-600 text-lg font-semibold mb-2">Missing Required Parameters</h3>
            <p className="text-gray-700 mb-4">
              You must provide both <code>lang</code> (or <code>language</code>) and <code>code</code> parameters.
            </p>
            <p className="text-sm text-gray-600 mb-4">
              <strong>Example:</strong> <code>/assessment/language?lang=English&code=en</code>
            </p>
            <button
              onClick={() => window.location.href = '/assessment/language?lang=English&code=en'}
              className="px-8 py-4 bg-gradient-harx text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-harx-500/30 hover:-translate-y-1 transition-all"
            >
              Go to English Assessment
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="glass-card rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:shadow-harx-500/20 shadow-2xl">
          <div className="bg-gradient-harx px-10 py-8 flex justify-between items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
            <h1 className="text-3xl font-black text-white tracking-widest uppercase relative z-10">
              {displayLanguageName} Assessment
            </h1>
              <button 
                onClick={returnToParentApp}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl backdrop-blur-md transition-all border border-white/20 font-black uppercase tracking-widest text-[10px] relative z-10 active:scale-95"
              >
                Exit
              </button>
          </div>
          
          <div className="p-6">
            <LanguageAssessment 
              language={effectiveLanguage} 
              displayName={displayLanguageName}
              onComplete={handleComplete}
              onExit={returnToParentApp}
            />
          </div>
        </div>
      </div>
      
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          duration={5000}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
}

export default LanguageAssessmentPage; 

