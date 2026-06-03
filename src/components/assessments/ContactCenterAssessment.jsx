import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAssessment } from '../../contexts/AssessmentContext';
import { transcribeLongAudio } from '../../lib/api/speechToText';
import { uploadRecording, analyzeContentCenterSkill } from '../../lib/api/vertex';
import { generateScenario, analyzeResponse } from '../../lib/api/contactCenterAssessment';

// Add style for notifications
const notificationStyles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes fadeOut {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(-10px); }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out forwards;
  }
  
  .animate-fadeOut {
    animation: fadeOut 0.3s ease-in forwards;
  }
`;

// Helper function to convert kebab-case to Title Case
const formatSkillName = (skillId) => {
  if (!skillId) return '';
  return skillId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

function ContactCenterAssessment({ skillId: propSkillId, category: propCategory, skillName: propSkillName, onComplete, onExit }) {
  const params = useParams();
  const navigate = useNavigate();
  const { 
    contactCenterSkills, 
    saveContactCenterAssessment,
    setLoading,
    setError
  } = useAssessment();
  
  // Add style element to document head when component mounts
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = notificationStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      // Clean up when component unmounts
      if (document.head.contains(styleElement)) {
        document.head.removeChild(styleElement);
      }
    };
  }, []);
  
  // Use props if provided, otherwise use from params
  const skillId = propSkillId || params.skillId;
  
  // Find the current skill and category
  const flatSkills = contactCenterSkills.flatMap(cat => 
    cat.skills.map(skill => ({ ...skill, category: cat.category }))
  );
  const currentSkill = propSkillId ? 
    { id: propSkillId, name: propSkillName || formatSkillName(propSkillId), category: propCategory } : 
    flatSkills.find(skill => skill.id === skillId);
  
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [scenario, setScenario] = useState(null);
  const [response, setResponse] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLocalLoading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  
  useEffect(() => {
    if (!scenario) {
      generateNewScenario();
    }
  }, []);
  
  // Generate a scenario for the skill
  const generateNewScenario = async () => {
    setLocalLoading(true);
    try {
      const scenarioData = await generateScenario(
        currentSkill?.name || 'customer service',
        currentSkill?.category || 'Customer Service'
      );
      setScenario(scenarioData);
    } catch (error) {
      console.error('Error generating scenario:', error);
      setError('Error generating scenario. Please try again.');
    } finally {
      setLocalLoading(false);
    }
  };
  
  // Start recording audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
        setAudioBlob(audioBlob);
        // Release microphone access
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.current.start();
      setRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Could not access microphone. Please ensure you have granted permission.');
    }
  };
  
  // Stop recording
  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop();
      setRecording(false);
    }
  };
  
  // Handle text response change
  const handleResponseChange = (e) => {
    setResponse(e.target.value);
  };
  
  // Transcribe audio recording
  const transcribeAudio = async () => {
    if (!audioBlob) {
      setError('No audio recording found to transcribe.');
      return;
    }
    
    setTranscribing(true);
    try {
      // Upload the audio file to Google Cloud Storage
      const formData = new FormData();
      const file = new File([audioBlob], `audio-${Date.now()}.webm`, { type: "audio/webm" });
      formData.append('file', file);
      formData.append('destinationName', `audio-${currentSkill?.name || 'skill'}-${Date.now()}.webm`);
      
      const uploadResponse = await uploadRecording(formData);
      console.log('Audio upload response:', uploadResponse);
      
      // Use the dedicated transcription API endpoint
      const fileUri = uploadResponse.data.fileUri;
      if (!fileUri) {
        throw new Error('No fileUri received from upload');
      }
      
      // Create the request payload for transcription
      const transcriptionData = {
        fileUri: fileUri,
        languageCode: "en-US"
      };
      
      console.log('Sending transcription request with data:', transcriptionData);
      const transcriptionResponse = await transcribeLongAudio(transcriptionData);
      console.log('Transcription response:', transcriptionResponse);
      
      // Set the transcribed text in the response field
      if (transcriptionResponse && transcriptionResponse.transcription) {
        setResponse(transcriptionResponse.transcription);
      } else {
        // Fallback if transcription isn't available
        setResponse("Audio transcription not available. Please type your response or try recording again.");
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);
      setError(`Failed to transcribe audio: ${error.message || 'Unknown error'}`);
    } finally {
      setTranscribing(false);
    }
  };
  
  // Format assessment results for saving
  const formatAssessmentForSaving = (feedback) => {
    return {
      skillId: currentSkill.id,
      category: currentSkill.category,
      skill: currentSkill.name || formatSkillName(currentSkill.id),
      proficiency: mapScoreToProficiency(feedback.score),
      assessmentResults: {
        score: feedback.score,
        strengths: feedback.strengths || [],
        improvements: feedback.improvements || [],
        feedback: feedback.feedback || '',
        tips: feedback.tips || [],
        keyMetrics: {
          professionalism: feedback.keyMetrics?.professionalism || 0,
          effectiveness: feedback.keyMetrics?.effectiveness || 0,
          customerFocus: feedback.keyMetrics?.customerFocus || 0
        },
        completedAt: new Date().toISOString()
      }
    };
  };
  
  // Analyze the response using the Vertex API
  const analyzeWithVertex = async () => {
    if (!audioBlob) {
      setError('Please record an audio response before analyzing.');
      return;
    }
    
    setAnalyzing(true);
    try {
      // First transcribe the audio automatically
      setTranscribing(true);
      
      // Upload the audio file to Google Cloud Storage
      const formData = new FormData();
      const file = new File([audioBlob], `audio-${Date.now()}.webm`, { type: "audio/webm" });
      formData.append('file', file);
      formData.append('destinationName', `audio-${currentSkill?.name || 'skill'}-${Date.now()}.webm`);
      
      const uploadResponse = await uploadRecording(formData);
      console.log('Audio upload response:', uploadResponse);
      
      // Get the file URI
      const fileUri = uploadResponse.data.fileUri;
      if (!fileUri) {
        throw new Error('No fileUri received from upload');
      }
      
      // Transcribe the audio
      const transcriptionData = {
        fileUri: fileUri,
        languageCode: "en-US"
      };
      
      console.log('Sending transcription request with data:', transcriptionData);
      const transcriptionResponse = await transcribeLongAudio(transcriptionData);
      console.log('Transcription response:', transcriptionResponse);
      
      // Set the transcribed text in the response field
      if (transcriptionResponse && transcriptionResponse.transcription) {
        setResponse(transcriptionResponse.transcription);
      } else {
        setResponse("Audio transcription not available.");
      }
      
      setTranscribing(false);
      
      // Now analyze using Vertex API
      const data = {
        fileUri: fileUri,
        scenarioData: scenario,
        // Include the transcription if it's available
        textResponse: transcriptionResponse?.transcription || ""
      };
      
      const analysisResponse = await analyzeContentCenterSkill(data);
      
      const feedback = analysisResponse.data;
      console.log('Vertex analysis response:', feedback);
      
      // Process the response and set results
      setResults({
        score: feedback.score,
        strengths: feedback.strengths || [],
        improvements: feedback.improvements || [],
        feedback: feedback.feedback || "Assessment completed successfully.",
        tips: feedback.tips || [],
        keyMetrics: feedback.keyMetrics || {
          professionalism: 0,
          effectiveness: 0,
          customerFocus: 0
        }
      });
      
    } catch (error) {
      console.error('Error analyzing with Vertex API:', error);
      setError('Error analyzing your response. Please try again.');
      
      // Fallback to API analysis
      analyzeResponseWithAPI();
    } finally {
      setAnalyzing(false);
      setTranscribing(false);
    }
  };
  
  // Analyze response using the API
  const analyzeResponseWithAPI = async () => {
    if (!response.trim() && !audioBlob) {
      setError('Please provide a response or recording before analyzing.');
      return;
    }
    
    setAnalyzing(true);
    try {
      const feedback = await analyzeResponse(response, scenario, currentSkill?.name || 'customer service');
      setResults(feedback);
      
      // Note: We're not saving results automatically anymore
      // The user will click "Save Results" button instead
    } catch (error) {
      console.error('Error analyzing response:', error);
      setError('Error analyzing your response. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };
  
  // Add function to save assessment results
  const saveResults = async () => {
    if (!results || !currentSkill) {
      setError('No results to save');
      return;
    }
    
    setLoading(true);
    try {
      // Format assessment data for saving
      const assessmentData = formatAssessmentForSaving(results);
      
      const success = await saveContactCenterAssessment(
        currentSkill.id, 
        currentSkill.category, 
        assessmentData
      );
      
      if (success) {
        // Clear any existing errors
        setError(null);
        
        // Show success message as a toast/notification
        const notificationDiv = document.createElement('div');
        notificationDiv.className = 'fixed top-4 right-4 bg-emerald-500 text-white px-4 py-2 rounded-md shadow-lg z-50 animate-fadeIn';
        notificationDiv.textContent = 'Assessment results saved successfully!';
        document.body.appendChild(notificationDiv);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
          if (document.body.contains(notificationDiv)) {
            notificationDiv.classList.add('animate-fadeOut');
            setTimeout(() => {
              if (document.body.contains(notificationDiv)) {
                document.body.removeChild(notificationDiv);
              }
            }, 500);
          }
        }, 100000);
        
        // Call onComplete with the assessment data
        if (onComplete) {
          onComplete(assessmentData);
        }
      }
    } catch (error) {
      console.error('Error saving results:', error);
      setError('Failed to save assessment results');
    } finally {
      setLoading(false);
    }
  };
  
  // Map score to proficiency level
  const mapScoreToProficiency = (score) => {
    if (score >= 90) return 'Expert';
    if (score >= 75) return 'Advanced';
    if (score >= 60) return 'Intermediate';
    if (score >= 40) return 'Basic';
    return 'Novice';
  };
  
  // Navigate back to the home page
  const handleBack = () => {
    navigate('/');
  };
  
  // Reset the assessment
  const handleReset = () => {
    setAudioBlob(null);
    setResponse('');
    setResults(null);
    generateNewScenario();
  };
  
  if (!currentSkill) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Skill Not Found</h2>
        <p className="text-gray-600 mb-6">
          Sorry, the requested skill assessment is not available.
        </p>
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-harx-alt-600 text-white rounded-md"
        >
          Go Back
        </button>
      </div>
    );
  }
  
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        {currentSkill.name} Assessment
      </h2>
      <p className="text-gray-600 mb-6">
        Category: {currentSkill.category}
      </p>
      
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-12 h-12 border-4 border-harx-alt-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Generating scenario...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {scenario && !results && (
            <div className="glass-card rounded-2xl shadow-xl border-harx-500/10 p-8 mb-10 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-harx-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
              <h3 className="text-xl font-black text-white mb-6 uppercase tracking-wider">Assessment Scenario</h3>
              <div className="bg-gradient-to-br from-harx-500/10 to-transparent p-6 rounded-2xl mb-8 border border-harx-500/20 backdrop-blur-sm shadow-inner">
                <p className="text-xl text-harx-100 leading-relaxed font-medium">{scenario.scenario}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
                  <h4 className="font-bold text-harx-500 uppercase tracking-widest text-[10px] mb-2">Customer Profile</h4>
                  <p className="text-slate-200 text-sm leading-relaxed">{scenario.customerProfile}</p>
                </div>
                <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
                  <h4 className="font-bold text-harx-alt-400 uppercase tracking-widest text-[10px] mb-2">Key Challenge</h4>
                  <p className="text-slate-200 text-sm leading-relaxed">{scenario.challenge}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4 mb-8">
                <div className="bg-slate-900/60 p-5 rounded-2xl border border-harx-500/10 shadow-inner">
                  <h4 className="font-bold text-white uppercase tracking-widest text-[10px] mb-4 opacity-50">Expected Response Elements</h4>
                  <ul className="space-y-3">
                    {scenario.expectedElements.map((item, index) => (
                      <li key={index} className="text-slate-300 text-sm flex items-start">
                        <span className="text-harx-500 mr-2 mt-1">✦</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div className="border-t border-white/5 pt-8 mt-4">
                <h3 className="text-lg font-black text-white mb-6 uppercase tracking-widest opacity-80">Your Response</h3>
                
                <div className="space-y-6">
                  {/* Conditionally render textarea as read-only if response exists */}
                  {response ? (
                    <div className="w-full p-5 bg-slate-900/60 border border-harx-500/20 rounded-2xl min-h-[8rem] shadow-inner backdrop-blur-xl">
                      <p className="text-harx-100 leading-relaxed">{response}</p>
                    </div>
                  ) : null}
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      {audioBlob ? 'Audio recording ready' : 'Record your response'}
                    </div>
                    
                    <div className="space-x-4">
                      {!recording && !audioBlob && (
                        <button
                          onClick={startRecording}
                          className="py-3 px-8 bg-slate-800 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] border border-slate-700 hover:bg-slate-700 transition-all shadow-lg active:scale-95"
                        >
                          Record Audio Response
                        </button>
                      )}
                      
                      {recording && (
                        <button
                          onClick={stopRecording}
                          className="py-3 px-8 bg-red-600 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-red-700 transition-all flex items-center shadow-xl shadow-red-500/20 active:scale-95"
                        >
                          <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse mr-3"></span>
                          Stop Recording
                        </button>
                      )}
                      
                      {audioBlob && (
                        <div className="flex items-center gap-2">
                          <audio src={URL.createObjectURL(audioBlob)} controls className="h-10" />
                          <button
                            onClick={() => {
                              setAudioBlob(null);
                              setResponse('');
                            }}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            Reset
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {audioBlob && (
                    <div className="flex justify-end">
                      <button
                        onClick={analyzeWithVertex}
                        disabled={analyzing || transcribing}
                        className={`py-3 px-10 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl transition-all hover:-translate-y-0.5 active:scale-95 ${
                          analyzing || transcribing
                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed border border-slate-600' 
                            : 'bg-gradient-harx text-white shadow-harx-500/20'
                        }`}
                      >
                        {analyzing ? 'Analyzing...' : transcribing ? 'Transcribing...' : 'Analyze Response'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {(analyzing || transcribing) && (
            <div className="text-center py-20 glass-card rounded-3xl border-dashed border-harx-500/20 max-w-lg mx-auto">
              <div className="inline-block w-16 h-16 border-4 border-harx-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-harx-500/20 mb-6"></div>
              <p className="text-xl font-bold text-white tracking-tight">
                {transcribing ? 'Transcribing your audio...' : 'Analyzing your response...'}
              </p>
              <p className="text-slate-400 text-xs mt-2 uppercase tracking-widest font-bold opacity-60">AI is processing your performance</p>
            </div>
          )}
          
          {results && (
            <div className="glass-card rounded-3xl shadow-2xl border-harx-500/10 p-10 mb-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-harx-500/5 rounded-full blur-[100px] -mr-32 -mt-32"></div>
              <div className="flex justify-between items-center mb-10 relative z-10">
                <h3 className="text-2xl font-black text-white tracking-tighter uppercase">Assessment Results</h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Proficiency:</span>
                  <span className="text-[10px] font-black px-4 py-1.5 bg-harx-500 text-white rounded-full uppercase tracking-widest shadow-lg shadow-harx-500/20">
                    {mapScoreToProficiency(results.score)}
                  </span>
                </div>
              </div>
              
              <div className="mb-12 relative z-10">
                <div className="flex justify-between items-end mb-4">
                  <span className="text-lg font-bold text-white opacity-80 uppercase tracking-widest text-xs">Overall Performance</span>
                  <span className="text-5xl font-black text-harx-500 tracking-tighter">{results.score}<span className="text-xl opacity-50 ml-1">%</span></span>
                </div>
                <div className="w-full bg-slate-800/80 rounded-full h-4 p-0.5 border border-white/5">
                  <div 
                    className="bg-gradient-harx h-full rounded-full transition-all duration-1000 shadow-lg shadow-harx-500/30" 
                    style={{ width: `${results.score}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 relative z-10">
                <div className="bg-white/5 border border-white/5 p-5 rounded-2xl backdrop-blur-sm">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">Professionalism</h4>
                    <span className="font-black text-harx-100 text-sm">{results.keyMetrics.professionalism}%</span>
                  </div>
                  <div className="w-full bg-slate-800/80 rounded-full h-1.5">
                    <div 
                      className="bg-harx-500 h-full rounded-full" 
                      style={{ width: `${results.keyMetrics.professionalism}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="bg-white/5 border border-white/5 p-5 rounded-2xl backdrop-blur-sm">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">Effectiveness</h4>
                    <span className="font-black text-harx-100 text-sm">{results.keyMetrics.effectiveness}%</span>
                  </div>
                  <div className="w-full bg-slate-800/80 rounded-full h-1.5">
                    <div 
                      className="bg-harx-alt-400 h-full rounded-full" 
                      style={{ width: `${results.keyMetrics.effectiveness}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="bg-white/5 border border-white/5 p-5 rounded-2xl backdrop-blur-sm">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">Customer Focus</h4>
                    <span className="font-black text-harx-100 text-sm">{results.keyMetrics.customerFocus}%</span>
                  </div>
                  <div className="w-full bg-slate-800/80 rounded-full h-1.5">
                    <div 
                      className="bg-harx-500 h-full rounded-full" 
                      style={{ width: `${results.keyMetrics.customerFocus}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6 mb-10 relative z-10">
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl backdrop-blur-sm">
                  <h4 className="font-bold text-emerald-400 mb-4 uppercase tracking-widest text-[10px]">Key Strengths</h4>
                  <ul className="space-y-2">
                    {results.strengths.map((strength, index) => (
                      <li key={index} className="text-emerald-100 text-sm flex items-start">
                        <span className="mr-2 mt-1">✓</span>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="bg-harx-500/10 border border-harx-500/20 p-6 rounded-2xl backdrop-blur-sm">
                  <h4 className="font-bold text-harx-500 mb-4 uppercase tracking-widest text-[10px]">Areas for Improvement</h4>
                  <ul className="space-y-2">
                    {results.improvements.map((improvement, index) => (
                      <li key={index} className="text-harx-100 text-sm flex items-start">
                        <span className="mr-2 mt-1">○</span>
                        {improvement}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div className="bg-white/5 border border-white/5 p-6 rounded-2xl mb-10 relative z-10">
                <h4 className="font-black text-white mb-3 uppercase tracking-widest text-[10px] opacity-40">Expert Feedback</h4>
                <p className="text-slate-200 leading-relaxed italic text-sm font-medium">"{results.feedback}"</p>
              </div>
              
              <div className="bg-gradient-to-r from-harx-500/10 to-transparent border-l-4 border-harx-500 p-6 rounded-r-2xl mb-12 relative z-10">
                <h4 className="font-black text-harx-500 mb-4 uppercase tracking-widest text-[10px]">Strategic Tips</h4>
                <ul className="space-y-3">
                  {results.tips.map((tip, index) => (
                    <li key={index} className="text-slate-200 text-sm flex items-start">
                      <span className="text-harx-500 mr-2">✦</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="flex gap-6 relative z-10">
                <button
                  onClick={handleReset}
                  className="flex-1 py-4 px-6 bg-slate-800 border border-slate-700 text-slate-300 font-bold rounded-2xl hover:bg-slate-700 transition-all shadow-xl active:scale-95 uppercase tracking-widest text-[10px]"
                >
                  Try Another Scenario
                </button>
                <button
                  onClick={saveResults}
                  className="flex-1 py-4 px-6 bg-gradient-harx text-white font-black rounded-2xl hover:-translate-y-0.5 transition-all shadow-2xl shadow-harx-500/20 active:scale-95 uppercase tracking-widest text-[10px]"
                >
                  Save Assessment Results
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ContactCenterAssessment;

