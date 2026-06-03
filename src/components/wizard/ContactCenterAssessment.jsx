import React, { useState, useRef, useEffect } from 'react';
import OpenAI from 'openai';
import { transcribeLongAudio } from '../../lib/api/speechToText';
import { uploadRecording } from '../../lib/api/vertex';
import { analyzeContentCenterSkill } from '../../lib/api/vertex';


const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

const skillCategories = [
  {
    name: "Communication",
    description: "Assess your ability to communicate clearly and effectively with customers",
    skills: [
      { name: "Active Listening", description: "Ability to fully concentrate, understand, and respond to customers" },
      { name: "Clear Speech", description: "Speaking clearly and professionally" },
      { name: "Empathy", description: "Understanding and sharing customer feelings" },
      { name: "Tone Management", description: "Maintaining appropriate tone in different situations" }
    ]
  },
  {
    name: "Problem Solving",
    description: "Evaluate your ability to handle customer issues and find solutions",
    skills: [
      { name: "Issue Analysis", description: "Identifying root causes of problems" },
      { name: "Solution Finding", description: "Developing effective solutions" },
      { name: "Decision Making", description: "Making appropriate choices under pressure" },
      { name: "Resource Utilization", description: "Using available tools and resources effectively" }
    ]
  },
  {
    name: "Customer Service",
    description: "Test your customer service skills and approach to customer satisfaction",
    skills: [
      { name: "Service Orientation", description: "Putting customer needs first" },
      { name: "Conflict Resolution", description: "Handling difficult situations professionally" },
      { name: "Product Knowledge", description: "Understanding and explaining products/services" },
      { name: "Quality Assurance", description: "Maintaining service standards" }
    ]
  }
];

function ContactCenterAssessment({ saveResults, onComplete, profileData }) {
  const [started, setStarted] = useState(false);
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [currentSkill, setCurrentSkill] = useState(0);
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(false);
  const [showingSummary, setShowingSummary] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [scenario, setScenario] = useState(null);
  const [response, setResponse] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [micPermission, setMicPermission] = useState(false);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const [savingError, setSavingError] = useState(null);

  useEffect(() => {
    if (started && !scenario) {
      generateScenario();
    }
  }, [started, currentSkill, categoryIndex]);

  useEffect(() => {
    // Check for microphone permission when component mounts
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => {
        setMicPermission(true);
      })
      .catch((err) => {
        console.error('Microphone permission error:', err);
        setMicPermission(false);
      });
  }, []);

  const generateScenario = async () => {
    setLoading(true);
    try {
      const currentCategory = skillCategories[categoryIndex];
      const skill = currentCategory.skills[currentSkill];

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `Create a realistic contact center scenario to test ${skill.name} skills. Include:
            1. Customer situation/problem
            2. Key challenges
            3. Expected response elements
            4. Evaluation criteria
            
            Format as JSON:
            {
              "scenario": "string",
              "customerProfile": "string",
              "challenge": "string",
              "expectedElements": ["string"],
              "evaluationCriteria": ["string"],
              "difficulty": "string"
            }`
          },
          {
            role: "user",
            content: `Generate a scenario for testing ${skill.name} in ${currentCategory.name}`
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const scenarioData = JSON.parse(response.choices[0].message.content);
      console.log("scenarioData : ", scenarioData);
      setScenario(scenarioData);
    } catch (error) {
      console.error('Error generating scenario:', error);
    } finally {
      setLoading(false);
    }
  };

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
        console.log("audioBlob in stop :", audioBlob)
        setAudioBlob(audioBlob);
        // Release microphone access
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.current.start();
      setRecording(true);
      setMicPermission(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      setMicPermission(false);
      alert('Could not access microphone. Please ensure you have granted permission.');
    }
  };


  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop();
      setRecording(false);

    }
  };

  const analyzeResponse = async () => {
    setAnalyzing(true);
    try {
      const currentCategory = skillCategories[categoryIndex];
      const skill = currentCategory.skills[currentSkill];

      const analysisResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are an expert contact center trainer. Analyze the agent's response based on ${skill.name} criteria.
            Provide detailed feedback in JSON format:
            {
              "score": number (1-100),
              "strengths": ["string"],
              "improvements": ["string"],
              "feedback": "string",
              "tips": ["string"],
              "keyMetrics": {
                "professionalism": number (1-100),
                "effectiveness": number (1-100),
                "customerFocus": number (1-100)
              }
            }`
          },
          {
            role: "user",
            content: `Scenario: ${scenario.scenario}\nAgent's Response: ${response}\nEvaluation Criteria: ${JSON.stringify(scenario.evaluationCriteria)}`
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const feedback = JSON.parse(analysisResponse.choices[0].message.content);
      setFeedback(feedback);
      setScores(prev => ({
        ...prev,
        [`${currentCategory.name}-${skill.name}`]: feedback
      }));
    } catch (error) {
      console.error('Error analyzing response:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const mapScoreToProficiency = (score) => {
    if (score >= 95) return 'Expert';
    if (score >= 80) return 'Advanced';
    if (score >= 65) return 'Intermediate';
    if (score >= 50) return 'Upper Beginner';
    if (score >= 35) return 'Beginner';
    return 'Novice';
  };

  const analyzeRecord = async () => {
    setAnalyzing(true);
    try {
      const currentCategory = skillCategories[categoryIndex];
      const skill = currentCategory.skills[currentSkill];
      //upload first the audio
      const formData = new FormData();
      const file = new File([audioBlob], `audio-${Date.now()}.opus`, { type: "audio/opus" });
      formData.append('file', file);
      formData.append('destinationName', `audio-${Date.now()}.opus`);
      const res = await uploadRecording(formData);
      //Analyse the response
      let data = {
        "fileUri": res.data.fileUri,
        "scenarioData": scenario
      }
      const transcriptionResult = await generateAudioTranscription(res.data.fileUri);
      setResponse(transcriptionResult.transcription);
      const response = await analyzeContentCenterSkill(data);

      // Add category, skill, and proficiency information
      const feedback = {
        category: currentCategory.name,
        skill: skill.name,
        score: response.data.score,
        proficiency: mapScoreToProficiency(response.data.score),
        strengths: response.data.strengths,
        improvements: response.data.improvements,
        feedback: response.data.feedback,
        tips: response.data.tips,
        keyMetrics: response.data.keyMetrics
      };
      
      setFeedback(feedback);
      setScores(prev => ({
        ...prev,
        [`${currentCategory.name}-${skill.name}`]: feedback
      }));
    } catch (error) {
      console.error('Error analyzing response:', error);
    } finally {
      setAnalyzing(false);
    }
  };


  const generateAudioTranscription = async (fileUri) => {
    try {
      const data = {
        "fileUri": fileUri,
        "languageCode": "en-US",
      }
      const response = await transcribeLongAudio(data);
      return response;
    } catch (error) {
      console.error('Error transcribing recording:', error);
      alert('Error transcribing recording. Please try again.');
      return null
    }
  }

  const transcribeAudio = async () => {
    setAnalyzing(true);
    try {
      const currentCategory = skillCategories[categoryIndex];
      const skill = currentCategory.skills[currentSkill].name;
      const formData = new FormData();
      // Append the audio blob to FormData
      const file = new File([audioBlob], `audio-${Date.now()}.opus`, { type: "audio/opus" });
      console.log('file :', file);
      formData.append('file', file);
      formData.append('destinationName', `audio-${skill}.opus`);
      // upload the audio in google cloud storage
      const res = await uploadRecording(formData);
      console.log('fileUri blob : ', res);
      console.log('fileUri blob : ', res.data.fileUri);
      //transcribe the audio 
      const data = {
        "fileUri": res.data.fileUri,
        "languageCode": "en-US",
      }
      const response = await transcribeLongAudio(data);
      console.log("Deno :", response);
      setResponse(response.transcription);
    } catch (error) {
      console.error('Error analyzing recording:', error);
      alert('Error analyzing recording. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleNext = async () => {
    const currentCategory = skillCategories[categoryIndex];
    // Save the current skill assessment before moving to next
    if (feedback) {
      try {
        // Format the assessment data according to the backend schema
        const assessmentData = {
          category: currentCategory.name,
          skill: currentCategory.skills[currentSkill].name,
          proficiency: mapScoreToProficiency(feedback.score),
          assessmentResults: {
            score: feedback.score,
            strengths: feedback.strengths,
            improvements: feedback.improvements,
            feedback: feedback.feedback,
            tips: feedback.tips,
            keyMetrics: {
              professionalism: feedback.keyMetrics.professionalism,
              effectiveness: feedback.keyMetrics.effectiveness,
              customerFocus: feedback.keyMetrics.customerFocus
            },
            completedAt: new Date().toISOString()
          }
        };
        await saveResults(assessmentData);
      } catch (error) {
        console.error('Error saving assessment:', error);
        setSavingError('Failed to save assessment results. Please try again.');
        return; // Don't proceed if save fails
      }
    }
    setFeedback(null);
    setScenario(null);
    setResponse('');
    setAudioBlob(null);

    if (currentSkill < currentCategory.skills.length - 1) {
      setCurrentSkill(prev => prev + 1);
    } else if (categoryIndex < skillCategories.length - 1) {
      setCategoryIndex(prev => prev + 1);
      setCurrentSkill(0);
    } else {
      setShowingSummary(true);
    }
  };

  const handlePrevious = () => {
    setFeedback(null);
    setScenario(null);
    setResponse('');
    setAudioBlob(null);

    if (currentSkill > 0) {
      setCurrentSkill(prev => prev - 1);
    } else if (categoryIndex > 0) {
      setCategoryIndex(prev => prev - 1);
      setCurrentSkill(skillCategories[categoryIndex - 1].skills.length - 1);
    }
  };

  const getTotalProgress = () => {
    let totalSkills = skillCategories.reduce((sum, cat) => sum + cat.skills.length, 0);
    let completedSkills = 0;
    for (let i = 0; i < categoryIndex; i++) {
      completedSkills += skillCategories[i].skills.length;
    }
    completedSkills += currentSkill;
    return (completedSkills / totalSkills) * 100;
  };

  const calculateScoresPerCategory = (scores) => {
    const categoryScores = {};

    skillCategories.forEach((category) => {
      let totalScore = 0;
      let skillCount = 0;
      const skillResults = [];

      category.skills.forEach((skill) => {
        const skillKey = `${category.name}-${skill.name}`;
        if (scores[skillKey]) {
          const skillData = scores[skillKey];
          totalScore += skillData.score;
          skillCount += 1;
          skillResults.push({
            skill: skill.name,
            score: skillData.score,
            proficiency: skillData.proficiency,
            feedback: skillData.feedback,
            keyMetrics: skillData.keyMetrics
          });
        }
      });

      // Calculate the average and include detailed results
      if (skillCount > 0) {
        const averageScore = totalScore / skillCount;
        categoryScores[category.name] = {
          score: averageScore,
          proficiency: mapScoreToProficiency(averageScore),
          skillResults: skillResults
        };
      } else {
        categoryScores[category.name] = {
          score: 0,
          proficiency: 'Not Assessed',
          skillResults: []
        };
      }
    });

    return categoryScores;
  };

  // Add function to get current proficiency level
  const getCurrentProficiency = (category, skillName) => {
    if (!profileData?.skills?.contactCenter) return null;
    
    const skill = profileData.skills.contactCenter.find(
      s => s.category === category && s.skill === skillName
    );
    
    return skill ? {
      proficiency: skill.proficiency,
      score: skill.assessmentResults.score,
      lastAssessed: skill.assessmentResults.completedAt
    } : null;
  };

  if (!started) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-8 text-center">
        <div className="max-w-2xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            Contact Center Skills Assessment
          </h3>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">What to Expect</h4>
            <div className="space-y-4">
              {skillCategories.map((category, index) => (
                <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                    {index + 1}
                  </div>
                  <div className="flex-1 text-left">
                    <h5 className="font-medium text-gray-900">{category.name}</h5>
                    <p className="text-sm text-gray-600">{category.description}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {category.skills.map((skill, skillIndex) => (
                        <span key={skillIndex} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
                          {skill.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-gray-600">
              This assessment will evaluate your contact center skills through interactive scenarios
              and AI-powered analysis of your responses.
            </p>

            <button
              onClick={() => setStarted(true)}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2 mx-auto"
            >
              <span>Begin Assessment</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentCategory = skillCategories[categoryIndex];
  const skill = currentCategory?.skills[currentSkill];
  const progress = getTotalProgress();

  if (showingSummary) {
    // Calculate if all skills have been assessed
    const allSkillsAssessed = skillCategories.every(category =>
      category.skills.every(skill =>
        scores[`${category.name}-${skill.name}`] !== undefined
      )
    );

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Assessment Summary</h3>

          {skillCategories.map((category, catIndex) => (
            <div key={catIndex} className="mb-8 last:mb-0">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">{category.name}</h4>
              <div className="grid gap-4">
                {category.skills.map((skill, skillIndex) => {
                  const skillScore = scores[`${category.name}-${skill.name}`];
                  return (
                    <div key={skillIndex} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-700">{skill.name}</span>
                        <span className="text-lg font-semibold text-blue-600">
                          {skillScore?.score || 0}/100
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                          style={{ width: `${skillScore?.score || 0}%` }}
                        />
                      </div>
                      {skillScore && (
                        <div className="text-sm text-gray-600">
                          <p className="mb-2">{skillScore.feedback}</p>
                          <div className="flex gap-4">
                            {Object.entries(skillScore.keyMetrics).map(([metric, score]) => (
                              <div key={metric} className="flex-1">
                                <div className="text-xs text-gray-500 capitalize">{metric}</div>
                                <div className="font-medium text-blue-600">{score}/100</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {!allSkillsAssessed && (
            <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4 mb-6">
              <p className="text-yellow-700">
                Please complete all skill assessments before proceeding.
              </p>
            </div>
          )}

          <button
            onClick={() => onComplete(calculateScoresPerCategory(scores))}
            disabled={!allSkillsAssessed}
            className={`w-full mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2 ${!allSkillsAssessed ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span>Complete Assessment</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Overall Progress</span>
          <span className="text-sm font-medium text-blue-600">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Category {categoryIndex + 1}/{skillCategories.length} •
          Skill {currentSkill + 1}/{currentCategory.skills.length}
        </div>
      </div>

      {/* Assessment Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          {currentCategory?.name}: {skill?.name}
        </h3>

        {/* Add current proficiency display */}
        {getCurrentProficiency(currentCategory?.name, skill?.name) && (
          <div className="mb-4 bg-blue-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm text-blue-600">Current Proficiency:</span>
                <span className="ml-2 font-medium text-blue-900">
                  {getCurrentProficiency(currentCategory?.name, skill?.name).proficiency}
                </span>
              </div>
              <div className="text-sm text-blue-600">
                Score: {getCurrentProficiency(currentCategory?.name, skill?.name).score}/100
              </div>
            </div>
            <div className="text-xs text-blue-500 mt-1">
              Last assessed: {new Date(getCurrentProficiency(currentCategory?.name, skill?.name).lastAssessed).toLocaleDateString()}
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Generating scenario...</p>
          </div>
        ) : scenario ? (
          <div className="space-y-6">
            {/* Scenario Description */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                  {scenario.difficulty} Scenario
                </span>
              </div>
              <p className="text-blue-900 mb-4">{scenario.scenario}</p>
              <div className="text-sm text-blue-700">
                <p><strong>Customer Profile:</strong> {scenario.customerProfile}</p>
                <p><strong>Challenge:</strong> {scenario.challenge}</p>
              </div>
            </div>

            {/* Response Section */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-700">Your Response</h4>
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Type your response to the customer..."
                className="w-full h-32 p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={!!feedback}
              />

              {/* Voice Recording */}
              <div className="flex justify-center">
                <button
                  onClick={recording ? stopRecording : startRecording}
                  disabled={!!feedback || !micPermission}
                  className={`px-6 py-3 rounded-full font-medium flex items-center gap-2 ${recording
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : micPermission
                      ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                >
                  {recording ? (
                    <>
                      <span className="animate-pulse">⚫</span>
                      Stop Recording
                    </>
                  ) : (
                    <>
                      🎤 {micPermission ? 'Record Response' : 'Microphone Access Required'}
                    </>
                  )}
                </button>
              </div>

              {!micPermission && (
                <p className="text-sm text-red-600 text-center">
                  Please allow microphone access to use voice recording
                </p>
              )}

              {audioBlob && !feedback && (
                <div className="flex justify-center">
                  <audio controls src={URL.createObjectURL(audioBlob)} className="w-full max-w-md" />
                </div>
              )}

              {!feedback && (response || audioBlob) && !analyzing && (
                <button
                  onClick={analyzeRecord}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700"
                >
                  Submit Response for Analysis
                </button>
              )}

              {analyzing && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Analyzing your response...</p>
                </div>
              )}
            </div>

            {/* Feedback Section */}
            {feedback && (
              <div className="space-y-6 bg-gray-50 rounded-lg p-6">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-gray-900">Response Analysis</h4>
                  <div className="text-2xl font-bold text-blue-600">{feedback.score}/100</div>
                </div>

                <div className="grid gap-4">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(feedback.keyMetrics).map(([metric, score]) => (
                      <div key={metric} className="bg-white p-3 rounded-lg">
                        <div className="text-sm text-gray-500 capitalize mb-1">{metric}</div>
                        <div className="text-lg font-semibold text-blue-600">{score}/100</div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Strengths */}
                  <div>
                    <h5 className="font-medium text-green-700 mb-2">Strengths</h5>
                    <ul className="space-y-2">
                      {feedback.strengths.map((strength, index) => (
                        <li key={index} className="flex items-start bg-green-50 p-3 rounded-lg">
                          <span className="text-green-500 mr-2">✓</span>
                          <span className="text-gray-700">{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Areas for Improvement */}
                  <div>
                    <h5 className="font-medium text-blue-700 mb-2">Areas for Improvement</h5>
                    <ul className="space-y-2">
                      {feedback.improvements.map((improvement, index) => (
                        <li key={index} className="flex items-start bg-blue-50 p-3 rounded-lg">
                          <span className="text-blue-500 mr-2">•</span>
                          <span className="text-gray-700">{improvement}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Tips */}
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h5 className="font-medium text-purple-700 mb-2">Pro Tips</h5>
                    <ul className="space-y-2">
                      {feedback.tips.map((tip, index) => (
                        <li key={index} className="flex items-start text-gray-700">
                          <span className="text-purple-500 mr-2">💡</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Retake Assessment Button */}
                  <div className="mt-6 flex justify-center">
                    <button
                      onClick={() => {
                        // Just reset the state without saving
                        setFeedback(null);
                        setResponse('');
                        setAudioBlob(null);
                        setAnalyzing(false);
                        setSavingError(null); // Clear any previous saving errors
                      }}
                      className="px-6 py-3 bg-white border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-all duration-200 flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Retake Assessment</span>
                    </button>
                  </div>

                  {/* Show error if saving fails */}
                  {savingError && (
                    <div className="mt-2 text-sm text-red-600 text-center">
                      {savingError}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center">
        <button
          onClick={handlePrevious}
          disabled={categoryIndex === 0 && currentSkill === 0}
          className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Previous</span>
        </button>

        <div className="flex gap-4">
          <button
            onClick={() => setStarted(false)}
            className="px-6 py-3 text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
          >
            Exit Assessment
          </button>

          {feedback && (
            <button
              onClick={handleNext}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors duration-200 flex items-center gap-2"
            >
              <span>Next</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ContactCenterAssessment;