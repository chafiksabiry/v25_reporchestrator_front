import React, { useState, useRef } from 'react';
import { Dialog } from '@headlessui/react';
import { CVParser } from '../../lib/parsers/cvParser';
import { useProfile } from '../../hooks/useProfile';
import { getLanguageByCode } from '../../lib/api/languages';
import {
  extractBasicInfo,
  analyzeExperience,
  analyzeSkills,
  analyzeAchievements,
  analyzeAvailability,
  generateSummary
} from '../../lib/api/profiles';

import Cookies from 'js-cookie';

import { chunkText, safeJSONParse, retryOperation } from '../../lib/utils/textProcessing';

function ImportDialog({ isOpen, onClose, onImport }) {
  const { createProfile } = useProfile();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [importType, setImportType] = useState('cv');
  const fileInputRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [showGuidance, setShowGuidance] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [analysisSteps, setAnalysisSteps] = useState([]);

  const addAnalysisStep = (text, error = false) => {
    setAnalysisSteps(prev => [...prev, { text, error, timestamp: new Date().toISOString() }]);
  };

  const steps = [
    {
      title: "Choose Your CV Format",
      description: "We support PDF, DOC, DOCX, and TXT files. Make sure your CV is up-to-date and includes your key achievements."
    },
    {
      title: "Review Content",
      description: "We'll extract the important information from your CV. You can review and edit before proceeding."
    },
    {
      title: "AI Enhancement",
      description: "Our AI will analyze your CV to create a compelling professional summary and highlight your key skills."
    }
  ];

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    try {
      setLoading(true);
      setProgress(25);
      setShowGuidance(false);
      const cvParser = new CVParser();
      const extractedText = await cvParser.parse(file);

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text could be extracted from the file');
      }

      setText(extractedText);
      setError('');
      setProgress(100);
      setUploadSuccess(true);
      setCurrentStep(2);
    } catch (err) {
      setError(`Failed to read file: ${err.message}`);
      console.error('File upload error:', err);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };


  const generateProfileSummary = async (data) => {
    return await generateSummary(data);
  };

  const parseProfile = async (contentToProcess = text) => {
    setLoading(true);
    setError('');
    setProgress(0);
    setCurrentStep(3);
    setAnalysisSteps([]);

    try {
      console.log("contentToProcess :", contentToProcess);
      if (!contentToProcess.trim()) {
        throw new Error('Please provide some content to process');
      }

      addAnalysisStep("Starting CV analysis...");

      // Initial analysis to extract basic information
      const basicInfo = await extractBasicInfo(contentToProcess);
      addAnalysisStep("Basic information extracted");
      setProgress(20);

      // Analyze work experience
      const experience = await analyzeExperience(contentToProcess);
      addAnalysisStep("Work experience analyzed");
      setProgress(40);

      // Extract and categorize skills
      const skills = await analyzeSkills(contentToProcess);
      console.log("languages extracted :", skills.languages);
      console.log("🔍 analyzeSkills result:", skills);
      console.log("🔍 analyzeExperience result:", experience);
      if (skills.languages.length === 0) {
        throw new Error('Languages section is required to generate your profile. Please ensure your CV includes the languages you speak.');
      }

      // Match extracted languages with database languages
      addAnalysisStep("Matching languages with database...");
      const matchedLanguages = [];

      for (const extractedLang of skills.languages) {
        try {
          const dbLanguage = await getLanguageByCode(extractedLang.iso639_1);
          matchedLanguages.push({
            language: dbLanguage,
            proficiency: extractedLang.proficiency
          });
          console.log(`Matched language: ${extractedLang.language} (${extractedLang.iso639_1}) -> ${dbLanguage.name}`);
        } catch (error) {
          console.warn(`Could not match language code ${extractedLang.iso639_1} for ${extractedLang.language}:`, error);
          // Skip languages that cannot be matched with the database
        }
      }

      if (matchedLanguages.length === 0) {
        throw new Error('No languages could be matched with our database. Please ensure your CV includes common languages.');
      }

      addAnalysisStep("Skills categorized and languages matched");
      setProgress(60);

      // Extract achievements and projects
      const achievements = await analyzeAchievements(contentToProcess);
      addAnalysisStep("Achievements extracted");
      setProgress(80);

      // Extract availability information
      const availability = await analyzeAvailability(contentToProcess);
      addAnalysisStep("Availability preferences analyzed");
      setProgress(85);

      // Ensure all arrays exist with default empty arrays
      const defaultArrays = {
        technical: [],
        professional: [],
        soft: [],
        languages: [],
        keyAreas: [],
        notableCompanies: [],
        roles: [],
        items: []
      };

      // Default availability if none found in CV
      const defaultAvailability = {
        schedule: [],
        timeZone: null,
        flexibility: []
      };

      // Resolve a categorized skill list from whichever source/naming the AI
      // returned. Prefer the dedicated skills analyzer over experience.
      const pickSkillList = (key) => {
        const candidates = [
          skills?.[key],
          skills?.[`${key}Skills`],
          experience?.[`${key}Skills`],
          experience?.[key],
        ];
        const found = candidates.find((c) => Array.isArray(c) && c.length > 0);
        return found || [];
      };

      // Combine all data with proper error handling and defaults
      const combinedData = {
        personalInfo: {
          name: basicInfo.name || '',
          country: basicInfo.country || '',
          email: basicInfo.email || '',
          phone: basicInfo.phone || '',
          languages: matchedLanguages || defaultArrays.languages
        },
        professionalSummary: {
          yearsOfExperience: Number(basicInfo.yearsOfExperience) || 0,
          currentRole: basicInfo.currentRole || '',
          industries: [],
          activities: [],
          keyExpertise: experience.keyAreas || defaultArrays.keyAreas,
          notableCompanies: experience.notableCompanies || defaultArrays.notableCompanies
        },
        availability: defaultAvailability,
        // Categorized skills come from analyzeSkills (the dedicated skills
        // analyzer); fall back to analyzeExperience for backwards-compat. Both
        // naming conventions (`technical` / `technicalSkills`) are supported.
        skills: {
          technical: pickSkillList('technical'),
          professional: pickSkillList('professional'),
          soft: pickSkillList('soft')
        },
        experience: (experience.roles || defaultArrays.roles).map(role => {
          const startDate = new Date(role.startDate);
          let endDate = role.endDate === 'present' ? 'present' : new Date(role.endDate);

          if (endDate !== 'present' && isNaN(endDate.getTime())) {
            throw new Error(`Invalid end date: ${role.endDate}`);
          }

          return {
            title: role.title,
            company: role.company,
            startDate,
            endDate,
            responsibilities: role.responsibilities || [],
            achievements: role.achievements || []
          };
        })
      };

      addAnalysisStep("Generating professional summary");
      setProgress(90);

      // Generate optimized summary
      const summary = await generateProfileSummary(combinedData);
      console.log("Generated summary:", summary);

      // Ensure we have a valid summary
      if (!summary) {
        throw new Error('Failed to generate summary');
      }

      // Update combinedData with the generated summary
      combinedData.professionalSummary.profileDescription = summary;

      addAnalysisStep("Analysis complete!");
      setProgress(100);

      // Create profile in database and get MongoDB document
      console.log('Data to store in DB : ', combinedData);
      const createdProfile = await createProfile(combinedData);
      Cookies.set('agentId', createdProfile._id);
      onImport({ ...createdProfile, generatedSummary: summary });

      console.log("createdProfile : ", createdProfile);
      console.log("summary : ", summary);

      onClose();
    } catch (err) {
      console.error('Profile parsing error:', err);
      setError(err.message || 'Failed to parse profile. Please try again or use a different file.');
      addAnalysisStep(`Error: ${err.message}`, true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] relative flex flex-col shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="relative px-7 pt-7 pb-5 flex-shrink-0">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-harx-500 via-harx-alt-500 to-harx-600" />
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-harx-500 to-harx-alt-500 text-white shadow-lg shadow-harx-500/25">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </span>
                <div>
                  <Dialog.Title className="text-xl font-extrabold text-gray-900 leading-tight">
                    Import your professional profile
                  </Dialog.Title>
                  <p className="text-sm text-gray-400 mt-0.5">PDF, DOC, DOCX or TXT — up to 5MB</p>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={loading}
                className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors disabled:opacity-40"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* How it works toggle */}
            <button
              onClick={() => setShowGuidance((v) => !v)}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-harx-600 hover:text-harx-700 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {showGuidance ? 'Hide how it works' : 'How it works'}
              <svg
                className={`h-3.5 w-3.5 transition-transform duration-200 ${showGuidance ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="px-7 pb-2 overflow-y-auto flex-grow">
            {showGuidance && (
              <div className="mb-6 rounded-2xl bg-harx-50/70 p-5">
                <p className="text-sm text-gray-600 mb-4">
                  We'll guide you through creating your professional profile. Here's what to expect:
                </p>
                <div className="space-y-3.5">
                  {steps.map((step, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-harx-600 flex items-center justify-center text-white text-xs font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="text-gray-900 font-semibold text-sm">{step.title}</h4>
                        <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-5">
              <div
                className={`rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${uploadSuccess
                    ? 'bg-green-50'
                    : 'bg-gray-50 hover:bg-harx-50'
                  }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".txt,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                />
                {uploadSuccess ? (
                  <div className="text-green-600">
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                      <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <p className="mt-3 text-lg font-semibold">CV successfully uploaded!</p>
                    <p className="text-sm text-green-500 mt-0.5">Click to upload a different file</p>
                  </div>
                ) : (
                  <>
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-harx-500 shadow-sm">
                      <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </span>
                    <p className="mt-4 text-lg font-semibold text-gray-900">Drop your CV here</p>
                    <p className="mt-1 text-sm text-gray-500">or click to browse your files</p>
                    <p className="text-xs text-gray-400 mt-2">Supports PDF, DOC, DOCX, TXT (max 5MB)</p>
                  </>
                )}
              </div>

              {error && (
                <div className="p-4 bg-red-50 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <svg className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-semibold text-red-800">Error</h3>
                      <p className="text-sm text-red-700 mt-0.5">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {loading && (
                <div className="space-y-3">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-harx-500 to-harx-alt-500 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Step {currentStep} of 3</span>
                    <span>
                      {progress < 25 && "Preparing..."}
                      {progress >= 25 && progress < 50 && "Analyzing CV..."}
                      {progress >= 50 && progress < 75 && "Extracting information..."}
                      {progress >= 75 && "Generating summary..."}
                    </span>
                  </div>
                  {analysisSteps.length > 0 && (
                    <div className="mt-3 space-y-1.5 rounded-2xl bg-gray-50 p-4">
                      {analysisSteps.map((step, index) => (
                        <div
                          key={index}
                          className={`text-sm ${step.error ? 'text-red-600' : 'text-gray-600'}`}
                        >
                          {step.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-7 py-5 flex justify-end gap-3 flex-shrink-0 bg-white">
            <button
              className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            {text && (
              <button
                className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-harx-600 to-harx-alt-600 rounded-full shadow-lg shadow-harx-500/25 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 transition-all duration-200"
                onClick={() => parseProfile()}
                disabled={loading || !text}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Generate Summary'
                )}
              </button>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

export default ImportDialog;