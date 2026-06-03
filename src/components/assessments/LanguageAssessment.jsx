import React, { useState, useRef, useEffect } from 'react';
import { getPassage, getNewPassage } from '../../utils/passageManager';
import { analyzeRecordingVertex, uploadRecording } from '../../lib/api/vertex';
import { analyzeLanguageAssessment } from '../../lib/api/languageAssessment';
import { useAssessment } from '../../contexts/AssessmentContext';

function LanguageAssessment({ language, displayName, onComplete, onExit }) {
  const { loading: assessmentLoading, error: assessmentError } = useAssessment();
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [passage, setPassage] = useState(null);
  const [passageError, setPassageError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [previousScores, setPreviousScores] = useState([]);
  const [languageCode, setLanguageCode] = useState(null);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  // Protection against race conditions
  const currentRequestId = useRef(0);
  const currentLanguageRef = useRef(null);

  // Get clean language name for display (displayName should always be clean now)
  const getCleanLanguageName = () => {
    // Priority: displayName (should be clean) > language > fallback
    return displayName || language || 'English';
  };

  // Simple function to load a passage
  const loadPassage = async (forceNew = false) => {
    // Generate unique request ID
    const requestId = ++currentRequestId.current;

    try {
      setIsGenerating(true);
      setPassageError(null);

      // Use the clean language name for API calls
      const cleanLanguageName = getCleanLanguageName();
      console.log(`[Request ${requestId}] ${forceNew ? 'Force generating' : 'Loading'} passage for language: ${cleanLanguageName}`);

      const passageData = forceNew
        ? await getNewPassage(cleanLanguageName)
        : await getPassage(cleanLanguageName);

      // Check if this is still the latest request
      if (requestId !== currentRequestId.current) {
        console.log(`[Request ${requestId}] Ignoring outdated response for ${cleanLanguageName}`);
        return;
      }

      setPassage(passageData);
      setLanguageCode(passageData.code);
      currentLanguageRef.current = cleanLanguageName;

      console.log(`[Request ${requestId}] Passage loaded successfully for ${cleanLanguageName}:`, passageData.title);
    } catch (error) {
      // Only show error if this is still the latest request
      if (requestId === currentRequestId.current) {
        console.error(`[Request ${requestId}] Error loading passage:`, error);
        setPassageError(error.message);
        setPassage(null);
      } else {
        console.log(`[Request ${requestId}] Ignoring error from outdated request`);
      }
    } finally {
      // Only update loading state if this is still the latest request
      if (requestId === currentRequestId.current) {
        setIsGenerating(false);
      }
    }
  };

  // Load passage when component mounts or language changes
  useEffect(() => {
    // Small delay to prevent rapid consecutive calls
    const timer = setTimeout(() => {
      const cleanLanguageName = getCleanLanguageName();
      // Only load if language has actually changed or no passage exists
      if (currentLanguageRef.current !== cleanLanguageName || !passage) {
        console.log(`Loading passage for language change: ${currentLanguageRef.current} → ${cleanLanguageName}`);
        loadPassage();
      } else {
        console.log(`Language ${cleanLanguageName} already loaded, skipping`);
      }
    }, 10); // Very short delay to debounce

    return () => clearTimeout(timer);
  }, [language, displayName]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
      };

      mediaRecorder.current.start();
      setRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please ensure you have granted permission.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop();
      setRecording(false);
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const analyzeRecording = async () => {
    setAnalyzing(true);
    try {
      const cleanLanguageName = getCleanLanguageName();
      const assessmentResults = await analyzeLanguageAssessment(passage.text, cleanLanguageName);

      // Add language code to results
      assessmentResults.language_code = languageCode;
      console.log('assessmentResults :', assessmentResults);
      setResults(assessmentResults);
      console.log('previousScores', previousScores);
      setPreviousScores(prev => [...prev, assessmentResults.overall.score]);

      // Increment attempts
      setAttempts(prev => prev + 1);
    } catch (error) {
      console.error('Error analyzing recording:', error);
      alert('Error analyzing recording. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Analyze recording using vertex : API Google
  const analyzeAudio = async () => {
    setAnalyzing(true);
    try {
      const cleanLanguageName = getCleanLanguageName();
      const formData = new FormData();
      // Append the audio blob to FormData
      const file = new File([audioBlob], `audio-${Date.now()}.opus`, { type: "audio/opus" });
      console.log('file :', file);
      formData.append('file', file);
      formData.append('destinationName', `audio-${Date.now()}.opus`);

      // Use the updated uploadRecording function
      const uploadResponse = await uploadRecording(formData);
      console.log('Upload response:', uploadResponse);

      // Get the file URI from the response
      const fileUri = uploadResponse.data.fileUri;

      // Prepare data for vertex analysis
      const analysisData = {
        "fileUri": fileUri,
        "textToCompare": passage?.text,
        "language": cleanLanguageName
      };

      // Use the updated analyzeRecordingVertex function
      const vertexResponse = await analyzeRecordingVertex(analysisData);
      console.log("Vertex response:", vertexResponse);

      // Keep the original Vertex response format
      // Only add language_code if it doesn't exist
      if (!vertexResponse.language_code) {
        vertexResponse.language_code = languageCode;
      }

      // Set results to the original Vertex response
      setResults(vertexResponse);

      // Store the overall score for comparison if it exists
      if (vertexResponse.overall && vertexResponse.overall.score !== undefined) {
        setPreviousScores(prev => [...prev, vertexResponse.overall.score]);
      }

      // Increment attempts
      setAttempts(prev => prev + 1);
    } catch (error) {
      console.error('Error analyzing recording with Vertex API:', error);

      const errorMessage = error.name === 'AxiosError' && error.message.includes('timeout')
        ? 'The analysis is taking longer than expected. Please try again with a shorter recording.'
        : 'Error analyzing recording. Please try again.';

      alert(errorMessage);
    } finally {
      setAnalyzing(false);
    }
  };

  const mapScoreToCEFR = (score) => {
    if (score >= 95) return 'C2';
    if (score >= 80) return 'C1';
    if (score >= 65) return 'B2';
    if (score >= 50) return 'B1';
    if (score >= 35) return 'A2';
    return 'A1';
  };

  const showScoreComparison = () => {
    if (previousScores.length <= 1) return null;

    const lastScore = previousScores[previousScores.length - 1];
    const previousScore = previousScores[previousScores.length - 2];
    const difference = lastScore - previousScore;
    const isImprovement = difference > 0;

    return (
      <div className={`mt-4 p-3 rounded-lg ${isImprovement ? 'bg-green-50 text-green-700' : 'bg-harx-50 text-harx-700'}`}>
        <p className="font-medium">
          {isImprovement
            ? `Improvement: +${difference.toFixed(1)} points from your previous attempt!`
            : `This attempt: ${difference.toFixed(1)} points difference from previous.`}
        </p>
      </div>
    );
  };

  const retakeAssessment = async () => {
    setAudioBlob(null);
    setResults(null);
    // Don't reset previousScores or attempts - we want to track these

    // Generate a new passage for variety
    await loadPassage(true);
  };

  const completeAssessment = () => {
    if (results && onComplete) {
      onComplete(results);
    }
  };

  const handleExit = () => {
    if (onExit) {
      onExit();
    }
  };

  // If still loading passage generation
  if (isGenerating) {
    return (
      <div className="text-center py-12">
        <div className="animate-pulse mb-4">
          <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
        </div>
        <p className="text-gray-600">Generating {getCleanLanguageName()} assessment content...</p>
      </div>
    );
  }

  // If there was an error loading the passage
  if (passageError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <h3 className="text-red-600 text-lg font-semibold mb-2">Error Loading Assessment</h3>
        <p className="text-gray-700 mb-4">{passageError}</p>
        <button
          onClick={handleExit}
          className="px-4 py-2 bg-harx-600 text-white rounded-lg hover:bg-harx-700 transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div>
      {!results ? (
        // Assessment taking UI
        <>
          <div className="glass-card rounded-2xl shadow-xl border-harx-500/10 p-8 mb-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-harx-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <h2 className="text-xl font-black text-white mb-4 uppercase tracking-wider">
              {passage?.title}
            </h2>
            <div className="flex items-center gap-2 mb-6 opacity-60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Read aloud in {getCleanLanguageName()}
              </span>
              {passage?.estimatedDuration && (
                <span className="text-[10px] font-bold text-harx-500 uppercase tracking-widest border-l border-white/20 pl-2">
                  ~{passage.estimatedDuration}s
                </span>
              )}
            </div>
            <div className="bg-gradient-to-br from-harx-500/10 to-transparent p-6 rounded-2xl border border-harx-500/20 backdrop-blur-sm shadow-inner">
              <p className="text-xl text-harx-100 leading-relaxed font-medium">{passage?.text}</p>
            </div>
          </div>

          <div className="flex flex-col items-center mb-6">
            {!audioBlob ? (
              <button
                onClick={recording ? stopRecording : startRecording}
                className={`px-10 py-5 rounded-2xl text-white font-black uppercase tracking-widest text-[10px] flex items-center shadow-2xl transition-all duration-300 hover:-translate-y-1 active:scale-95 ${recording 
                    ? 'bg-red-600 shadow-red-500/20 border border-red-500/30' 
                    : 'bg-gradient-harx shadow-harx-500/30'
                  }`}
                disabled={isGenerating}
              >
                {recording ? (
                  <>
                    <span className="h-3 w-3 rounded-full bg-white animate-pulse mr-3"></span>
                    Stop Recording
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2a2 2 0 00-2 2v6a2 2 0 104 0V4a2 2 0 00-2-2z" />
                      <path d="M14 8a1 1 0 00-2 0v2a2 2 0 01-2 2 2 2 0 01-2-2V8a1 1 0 10-2 0v2a4 4 0 004 4h.5a.5.5 0 01.5.5v.5h-2a1 1 0 100 2h6a1 1 0 100-2h-2v-.5a.5.5 0 01.5-.5h.5a4 4 0 004-4V8a1 1 0 00-2 0z" />
                    </svg>
                    Start Recording
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-4 w-full">
                <div className="flex justify-center">
                  <audio controls src={URL.createObjectURL(audioBlob)} className="w-full max-w-md"></audio>
                </div>
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={() => setAudioBlob(null)}
                    className="px-6 py-3 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-all font-bold uppercase tracking-widest text-[10px] border border-slate-700 active:scale-95"
                  >
                    Record Again
                  </button>
                  <button
                    onClick={analyzeAudio}
                    className="px-8 py-3 bg-gradient-harx text-white rounded-xl shadow-2xl shadow-harx-500/20 transition-all hover:-translate-y-0.5 font-black uppercase tracking-widest text-[10px] active:scale-95"
                    disabled={analyzing}
                  >
                    {analyzing ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Analyzing...
                      </span>
                    ) : (
                      'Submit Assessment'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="text-center mt-8">
            <button
              onClick={handleExit}
              className="text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-all"
            >
              Exit Assessment
            </button>
          </div>
        </>
      ) : (
        // Results display UI
        <div className="glass-card rounded-3xl shadow-2xl border-harx-500/10 p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-harx-500/5 rounded-full blur-[100px] -mr-32 -mt-32"></div>
          
          <div className="text-center mb-10 relative z-10">
            <div className="inline-flex items-center justify-center h-28 w-28 rounded-3xl bg-gradient-harx text-white mb-6 shadow-2xl shadow-harx-500/30">
              <span className="text-4xl font-black">{results.overall?.score || 0}</span>
            </div>
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">
              {results.overall?.score >= 70 ? 'Expert Performance' : 'Good Progress'}
            </h2>
            <div className="flex justify-center items-center gap-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Global Ranking:</span>
              <span className="text-[10px] font-black px-4 py-1.5 bg-harx-500 text-white rounded-full uppercase tracking-widest">
                CEFR {mapScoreToCEFR(results.overall?.score || 0)}
              </span>
            </div>
            {showScoreComparison()}
          </div>

          <div className="grid gap-6 md:grid-cols-2 mb-10 relative z-10">
            <div className="bg-white/5 border border-white/5 p-6 rounded-2xl backdrop-blur-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">Completeness</h3>
                <span className="font-black text-harx-500 text-sm">{results.completeness?.score || 0}%</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed italic opacity-80 mb-4 h-12 overflow-y-auto">{results.completeness?.feedback || "No completeness assessment available"}</p>
              <div className="w-full bg-slate-800/80 rounded-full h-1.5">
                <div className="bg-harx-500 h-full rounded-full" style={{ width: `${results.completeness?.score || 0}%` }}></div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/5 p-6 rounded-2xl backdrop-blur-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">Fluency</h3>
                <span className="font-black text-harx-alt-400 text-sm">{results.fluency?.score || 0}%</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed italic opacity-80 mb-4 h-12 overflow-y-auto">{results.fluency?.feedback || "No fluency assessment available"}</p>
              <div className="w-full bg-slate-800/80 rounded-full h-1.5">
                <div className="bg-harx-alt-400 h-full rounded-full" style={{ width: `${results.fluency?.score || 0}%` }}></div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/5 p-6 rounded-2xl backdrop-blur-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">Proficiency</h3>
                <span className="font-black text-harx-500 text-sm">{results.proficiency?.score || 0}%</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed italic opacity-80 mb-4 h-12 overflow-y-auto">{results.proficiency?.feedback || "No proficiency assessment available"}</p>
              <div className="w-full bg-slate-800/80 rounded-full h-1.5">
                <div className="bg-harx-500 h-full rounded-full" style={{ width: `${results.proficiency?.score || 0}%` }}></div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/5 p-6 rounded-2xl backdrop-blur-sm flex flex-col justify-center">
              <h3 className="font-bold text-slate-400 text-[10px] uppercase tracking-widest mb-3">Language Match</h3>
              <p className="text-xs text-slate-200 font-medium">
                {results.languageOrTextMismatch
                  ? "⚠ Mismatch detected. Accuracy may be affected."
                  : "✓ Language profile verified successfully."}
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-harx-500/10 to-transparent border-l-4 border-harx-500 p-6 rounded-r-2xl mb-10 relative z-10">
            <h3 className="font-black text-harx-500 mb-4 uppercase tracking-widest text-[10px]">Strategic Recommendations</h3>
            <div className="space-y-4">
              {results.overall?.areasForImprovement && (
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Growth Areas:</h4>
                  <p className="text-sm text-slate-200 leading-relaxed font-medium">{results.overall.areasForImprovement}</p>
                </div>
              )}
              {results.overall?.strengths && (
                <div>
                  <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Top Strengths:</h4>
                  <p className="text-sm text-emerald-100/80 leading-relaxed font-medium">{results.overall.strengths}</p>
                </div>
              )}
              {!results.overall?.areasForImprovement && !results.overall?.strengths && (
                <p className="text-slate-400 italic text-sm">Detailed feedback is being generated...</p>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 relative z-10">
            <button
              onClick={retakeAssessment}
              className="px-6 py-4 bg-slate-800 border border-slate-700 text-slate-300 font-bold rounded-2xl hover:bg-slate-700 transition-all shadow-xl active:scale-95 uppercase tracking-widest text-[10px] disabled:opacity-50"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-harx-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </span>
              ) : (
                'Retake Assessment'
              )}
            </button>

            <div className="flex gap-4">
              <button
                onClick={handleExit}
                className="px-8 py-4 bg-white/5 border border-white/10 text-slate-300 font-bold rounded-2xl hover:bg-white/10 transition-all uppercase tracking-widest text-[10px]"
              >
                Exit
              </button>

              <button
                onClick={completeAssessment}
                className="px-10 py-4 bg-gradient-harx text-white font-black rounded-2xl shadow-2xl shadow-harx-500/20 hover:-translate-y-0.5 transition-all uppercase tracking-widest text-[10px] active:scale-95"
              >
                Save Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LanguageAssessment;

