import React, { useState, useRef } from 'react';
import { Dialog } from '@headlessui/react';
import OpenAI from 'openai';
import { CVParser } from '../../lib/parsers/cvParser';
import { LinkedInClient } from '../../lib/linkedin/linkedinClient';
import { useProfile } from '../../hooks/useProfile';

import { chunkText, safeJSONParse, retryOperation } from '../../lib/utils/textProcessing';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

function ImportDialog({ isOpen, onClose, onImport }) {
  const { createProfile } = useProfile();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [importType, setImportType] = useState('cv');
  const fileInputRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [showGuidance, setShowGuidance] = useState(true);
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

  const handleLinkedInAuth = () => {
    try {
      setShowGuidance(false);
      const linkedinClient = new LinkedInClient();
      const authUrl = linkedinClient.getAuthUrl();
      window.location.href = authUrl;
    } catch (err) {
      setError(`LinkedIn authentication failed: ${err.message}`);
      console.error('LinkedIn auth error:', err);
    }
  };

  const generateSummary = async (data) => {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a professional CV writer. Create a compelling professional summary that follows the REPS framework:
          - Role: Current position and career focus
          - Experience: Years of experience and key industries
          - Projects: Notable achievements and contributions
          - Skills: Core technical and professional competencies
          
          Keep the summary concise, impactful, and achievement-oriented.`
        },
        {
          role: "user",
          content: `Create a professional REPS summary based on this profile data: ${JSON.stringify(data)}`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    return response.choices[0].message.content;
  };

  const parseProfile = async (contentToProcess = text) => {
    setLoading(true);
    setError('');
    setProgress(0);
    setCurrentStep(3);
    setAnalysisSteps([]);

    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key is required');
      }

      if (!contentToProcess.trim()) {
        throw new Error('Please provide some content to process');
      }

      addAnalysisStep("Starting CV analysis...");

      // Initial analysis to extract basic information
      const basicInfoResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are an expert CV analyzer. Extract the following basic information from the CV and return it in the exact JSON format shown below:
            {
              "name": "string",
              "location": "string",
              "email": "string",
              "phone": "string",
              "currentRole": "string",
              "yearsOfExperience": "string"
            }`
          },
          {
            role: "user",
            content: contentToProcess
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const basicInfo = JSON.parse(basicInfoResponse.choices[0].message.content);
      addAnalysisStep("Basic information extracted");
      setProgress(20);

      // Analyze work experience
      const experienceResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `Analyze the work experience section of this CV and return it in the exact JSON format shown below. Follow these rules strictly:

            Date Formatting Rules:
            1. All dates must be in ISO format (YYYY-MM-DD)
            2. For current/ongoing positions:
               - endDate MUST be exactly the string "present" (lowercase)
               - Do not use any other variations like "Present", "now", "current", etc.
            3. For completed positions:
               - endDate must be a valid date in YYYY-MM-DD format
               - If only month and year are provided, use the last day of that month
               - If only year is provided, use December 31st of that year
            4. For startDate:
               - Must always be a valid date in YYYY-MM-DD format
               - If only month and year are provided, use the first day of that month
               - If only year is provided, use January 1st of that year

            Return in this exact format:
            {
              "roles": [{
                "title": "string",
                "company": "string",
                "startDate": "YYYY-MM-DD",  // Must be a valid date
                "endDate": "YYYY-MM-DD" | "present",  // Must be either a valid date or exactly "present"
                "responsibilities": ["string"],
                "achievements": ["string"]
              }],
              "industries": ["string"],
              "keyAreas": ["string"],
              "notableCompanies": ["string"]
            }

            Example of valid dates:
            - startDate: "2024-01-01"  // January 2024
            - endDate: "2024-03-31"    // March 2024
            - endDate: "present"        // Current position`
          },
          {
            role: "user",
            content: contentToProcess
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const experience = JSON.parse(experienceResponse.choices[0].message.content);
      addAnalysisStep("Work experience analyzed");
      setProgress(40);

      // Extract and categorize skills
      const skillsResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `Analyze the CV for skills and competencies, with special attention to language proficiency evaluation. You MUST extract ALL languages mentioned in the CV, even if they are mentioned briefly or without explicit proficiency levels. For languages, you must intelligently map any proficiency description to the CEFR scale (A1-C2) based on the following comprehensive guidelines:

            CEFR Level Assessment Guidelines:

            A1 (Beginner/Basic)
            - Can understand and use basic phrases
            - Can introduce themselves and others
            - Expressions suggesting A1: basic, elementary, débutant, notions, beginner, basic words and phrases
            - Context clues: "took introductory courses", "basic communication", "learning basics"

            A2 (Elementary)
            - Can communicate in simple, routine situations
            - Can describe aspects of background, environment
            - Expressions suggesting A2: pre-intermediate, basic working knowledge, connaissance basique, can read simple texts
            - Context clues: "can handle simple work communications", "basic professional interactions"

            B1 (Intermediate)
            - Can deal with most situations while traveling
            - Can describe experiences, events, dreams, hopes
            - Expressions suggesting B1: intermediate, working knowledge, niveau moyen, bonne base, conversational
            - Context clues: "can participate in meetings", "handle routine work tasks"

            B2 (Upper Intermediate)
            - Can interact with degree of fluency with native speakers
            - Can produce clear, detailed text
            - Expressions suggesting B2: upper intermediate, professional working, bonne maitrise, fluent, professional proficiency
            - Context clues: "regular professional use", "conduct business meetings", "negotiate with clients"

            C1 (Advanced)
            - Can use language flexibly and effectively
            - Can produce clear, well-structured, detailed texts
            - Expressions suggesting C1: advanced, highly fluent, excellent, très bonne maitrise, native-like, full professional proficiency
            - Context clues: "worked in language", "lived in country for years", "conducted complex negotiations"

            C2 (Mastery)
            - Can understand virtually everything heard or read
            - Can express themselves spontaneously, precisely, and fluently
            - Expressions suggesting C2: native, mother tongue, bilingual, langue maternelle, perfect mastery
            - Context clues: "native speaker", "grew up speaking", "primary language of education"

            Analysis Instructions:
            1. CRITICAL: Extract ALL languages mentioned in the CV, regardless of how briefly they are mentioned
            2. Look for languages in ALL sections of the CV including:
               - Language sections
               - Education history (e.g. courses taken in different languages)
               - Work experience (e.g. working with international teams)
               - Skills sections
               - Personal projects or achievements
            3. For each language found, look for both explicit statements and contextual clues about language use
            4. Consider the professional context where the language is used
            5. Look for indicators of duration and depth of language exposure
            6. If the CV mentions work experience or education in a country, factor this into the assessment
            7. When in doubt between two levels, consider the overall context of language use
            8. Default to B1 only if there's significant uncertainty and no contextual clues
            9. If a language is mentioned but there are absolutely no clues about proficiency level, default to A1

            Return in this exact JSON format:
            {
              "technical": [{
                "name": "string",
                "confidence": number,
                "context": "string"
              }],
              "professional": [{
                "name": "string",
                "confidence": number,
                "context": "string"
              }],
              "soft": [{
                "name": "string",
                "confidence": number,
                "context": "string"
              }],
              "languages": [{
                "language": "string",
                "proficiency": "string (MUST be one of: A1, A2, B1, B2, C1, C2)"
              }]
            }`
          },
          {
            role: "user",
            content: contentToProcess
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const skills = JSON.parse(skillsResponse.choices[0].message.content);
      console.log("languages extracted :", skills.languages);
      if (skills.languages.length === 0) {
        throw new Error('Languages section is required to generate your profile. Please ensure your CV includes the languages you speak.');
      }
      addAnalysisStep("Skills categorized");
      setProgress(60);

      // Extract achievements and projects
      const achievementsResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `Analyze the CV for notable achievements and projects and return them in the exact JSON format shown below:
            {
              "items": [{
                "description": "string",
                "impact": "string",
                "context": "string",
                "skills": ["string"]
              }]
            }`
          },
          {
            role: "user",
            content: contentToProcess
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const achievements = JSON.parse(achievementsResponse.choices[0].message.content);
      addAnalysisStep("Achievements extracted");
      setProgress(80);

      // Ensure all arrays exist with default empty arrays
      const defaultArrays = {
        technical: [],
        professional: [],
        soft: [],
        languages: [],
        industries: [],
        keyAreas: [],
        notableCompanies: [],
        roles: [],
        items: []
      };

      // Combine all data with proper error handling and defaults
      const combinedData = {
        personalInfo: {
          name: basicInfo.name || '',
          location: basicInfo.location || '',
          email: basicInfo.email || '',
          phone: basicInfo.phone || '',
          languages: skills.languages || defaultArrays.languages
        },
        professionalSummary: {
          yearsOfExperience: basicInfo.yearsOfExperience || '',
          currentRole: basicInfo.currentRole || '',
          industries: experience.industries || defaultArrays.industries,
          keyExpertise: experience.keyAreas || defaultArrays.keyAreas,
          notableCompanies: experience.notableCompanies || defaultArrays.notableCompanies
        },
        skills: {
          technical: (skills.technical || defaultArrays.technical).map(s => ({
            skill: s.name,
            level: s.confidence,
            details: s.context
          })),
          professional: (skills.professional || defaultArrays.professional).map(s => ({
            skill: s.name,
            level: s.confidence,
            details: s.context
          })),
          soft: (skills.soft || defaultArrays.soft).map(s => ({
            skill: s.name,
            level: s.confidence,
            details: s.context
          }))
        },
        achievements: (achievements.items || defaultArrays.items).map(a => ({
          description: a.description || '',
          impact: a.impact || '',
          context: a.context || '',
          skills: a.skills || []
        })),
        experience: (experience.roles || defaultArrays.roles).map(role => {
          // For startDate, always convert to Date
          const startDate = new Date(role.startDate);
          
          // For endDate, handle 'present' case specially
          let endDate;
          if (role.endDate === 'present') {
            endDate = 'present';  // Keep as string for ongoing positions
          } else {
            // For past experiences, convert to Date
            endDate = new Date(role.endDate);
            
            // Validate the date
            if (isNaN(endDate.getTime())) {
              throw new Error(`Invalid end date: ${role.endDate}`);
            }
          }

          return {
            title: role.title,
            company: role.company,
            startDate,         // Will be automatically handled as ISODate by MongoDB
            endDate,          // Will be either Date object or 'present' string
            responsibilities: role.responsibilities || [],
            achievements: role.achievements || []
          };
        })
      };

      addAnalysisStep("Generating professional summary");
      setProgress(90);

      // Generate optimized summary
      const summary = await generateSummary(combinedData);
      addAnalysisStep("Analysis complete!");
      setProgress(100);

      // Create profile in database and get MongoDB document
      console.log('Data to store in DB : ', combinedData);
      const createdProfile = await createProfile(combinedData);
      onImport({ ...createdProfile, generatedSummary: summary });

      //onImport({ ...combinedData, generatedSummary: summary });

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
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] relative flex flex-col">
          {/* Fixed Header */}
          <div className="p-6 border-b border-gray-200 flex-shrink-0">
            <Dialog.Title className="text-2xl font-bold text-gray-900">Import Your Professional Profile</Dialog.Title>
          </div>

          {/* Scrollable Content */}
          <div className="p-6 overflow-y-auto flex-grow">
            {showGuidance && (
              <div className="mb-8">
                <div className="bg-blue-50 p-6 rounded-xl mb-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">Welcome to the Profile Import Wizard! 🚀</h3>
                  <p className="text-blue-800 mb-4">
                    We'll guide you through the process of creating your professional profile. Here's what to expect:
                  </p>
                  <div className="space-y-4">
                    {steps.map((step, index) => (
                      <div key={index} className="flex items-start">
                        <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-200 flex items-center justify-center text-blue-800 text-sm font-medium">
                          {index + 1}
                        </div>
                        <div className="ml-3">
                          <h4 className="text-blue-900 font-medium">{step.title}</h4>
                          <p className="text-blue-700 text-sm">{step.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-6">
              <div className="flex flex-col space-y-4">
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
                    uploadSuccess ? 'border-green-500 bg-green-50' : 'hover:border-blue-500 hover:bg-blue-50'
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
                      <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <p className="mt-2 text-lg font-medium">CV Successfully Uploaded!</p>
                      <p className="text-sm text-green-500">Click to upload a different file</p>
                    </div>
                  ) : (
                    <>
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="mt-4 text-lg font-medium text-gray-900">
                        Drop your CV here
                      </p>
                      <p className="mt-2 text-sm text-gray-500">
                        or click to browse your files
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Supports PDF, DOC, DOCX, TXT (max 5MB)
                      </p>
                    </>
                  )}
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Error</h3>
                      <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {loading && (
                <div className="space-y-3">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
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
                    <div className="mt-4 space-y-2">
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

          {/* Fixed Footer */}
          <div className="p-6 border-t border-gray-200 flex justify-end space-x-3 flex-shrink-0 bg-white">
            <button
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            {text && (
              <button
                className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-200 transform hover:scale-105"
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