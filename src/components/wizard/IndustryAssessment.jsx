import React, { useState, useEffect } from 'react';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

const difficultyColors = {
  easy: 'bg-green-50 text-green-700',
  medium: 'bg-yellow-50 text-yellow-700',
  hard: 'bg-red-50 text-red-700'
};

function IndustryAssessment({ onComplete, industries = [] }) {
  const [currentIndustry, setCurrentIndustry] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [industryResults, setIndustryResults] = useState({});
  const [showingIndustrySummary, setShowingIndustrySummary] = useState(false);
  const [industryKnowledge, setIndustryKnowledge] = useState({});
  const [showingTips, setShowingTips] = useState(false);

  useEffect(() => {
    if (industries[currentIndustry]) {
      generateQuestionsForIndustry(industries[currentIndustry]);
      fetchIndustryKnowledge(industries[currentIndustry]);
    }
  }, [currentIndustry]);

  const fetchIndustryKnowledge = async (industry) => {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `Provide key knowledge points about the ${industry} industry in JSON format:
            {
              "overview": "string",
              "keyTrends": ["string"],
              "challenges": ["string"],
              "technologies": ["string"],
              "bestPractices": ["string"],
              "learningResources": ["string"]
            }`
          },
          {
            role: "user",
            content: `Provide industry knowledge for: ${industry}`
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const knowledge = JSON.parse(response.choices[0].message.content);
      setIndustryKnowledge(prev => ({
        ...prev,
        [industry]: knowledge
      }));
    } catch (error) {
      console.error('Error fetching industry knowledge:', error);
    }
  };

  const generateQuestionsForIndustry = async (industry) => {
    try {
      setLoading(true);
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `Generate a quiz to assess knowledge of the ${industry} industry. Create 5 multiple-choice questions that progressively increase in difficulty.
            Questions should cover:
            1. Industry trends and market dynamics
            2. Key technologies and innovations
            3. Major challenges and solutions
            4. Best practices and standards
            5. Industry-specific scenarios
            Format as JSON array with structure:
            {
              "questions": [{
                "category": "string",
                "question": "string",
                "options": ["string"],
                "correctAnswer": "string",
                "explanation": "string",
                "difficulty": "easy|medium|hard",
                "points": number,
                "tip": "string"
              }]
            }`
          },
          {
            role: "user",
            content: `Generate progressive assessment questions for the ${industry} industry`
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const data = JSON.parse(response.choices[0].message.content);
      setQuestions(data.questions);
      setLoading(false);
    } catch (error) {
      console.error('Error generating questions:', error);
      alert('Error generating questions. Please try again.');
    }
  };

  const handleAnswer = async (selectedAnswer) => {
    const currentQ = questions[currentQuestion];
    const isCorrect = selectedAnswer === currentQ.correctAnswer;
    const currentIndustryName = industries[currentIndustry];
    
    // Store answer with additional metadata
    setAnswers(prev => ({
      ...prev,
      [currentIndustryName]: {
        ...(prev[currentIndustryName] || {}),
        [currentQuestion]: {
          question: currentQ.question,
          category: currentQ.category,
          difficulty: currentQ.difficulty,
          selectedAnswer,
          correct: isCorrect,
          explanation: currentQ.explanation,
          points: isCorrect ? currentQ.points : 0,
          tip: currentQ.tip
        }
      }
    }));

    if (currentQuestion < questions.length - 1) {
      // Move to next question after delay
      setTimeout(() => {
        setCurrentQuestion(prev => prev + 1);
        setShowingTips(false);
      }, 2000);
    } else {
      // Analyze industry results
      await analyzeIndustryResults(currentIndustryName);
    }
  };

  const analyzeIndustryResults = async (industryName) => {
    const industryAnswers = answers[industryName] || {};
    const totalPoints = Object.values(industryAnswers).reduce((sum, a) => sum + a.points, 0);
    const maxPoints = questions.reduce((sum, q) => sum + q.points, 0);
    const score = (totalPoints / maxPoints) * 100;

    try {
      const analysisResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `Analyze the quiz results for the ${industryName} industry and provide detailed feedback.
            Format as JSON with structure:
            {
              "score": number,
              "level": "string",
              "strengths": ["string"],
              "weaknesses": ["string"],
              "recommendations": ["string"],
              "careerPaths": ["string"],
              "skillGaps": ["string"]
            }`
          },
          {
            role: "user",
            content: `Quiz results: ${JSON.stringify(industryAnswers)}\nScore: ${score}`
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const results = JSON.parse(analysisResponse.choices[0].message.content);
      setIndustryResults(prev => ({
        ...prev,
        [industryName]: {
          ...results,
          answers: industryAnswers,
          knowledge: industryKnowledge[industryName]
        }
      }));

      setShowingIndustrySummary(true);
    } catch (error) {
      console.error('Error analyzing results:', error);
    }
  };

  const moveToNextIndustry = () => {
    setShowingIndustrySummary(false);
    setCurrentQuestion(0);
    setShowingTips(false);
    setCurrentIndustry(prev => prev + 1);
  };

  const completeAssessment = () => {
    onComplete(industryResults);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">
          Preparing assessment for {industries[currentIndustry]}...
        </p>
      </div>
    );
  }

  if (showingIndustrySummary) {
    const currentIndustryName = industries[currentIndustry];
    const results = industryResults[currentIndustryName];
    const knowledge = industryKnowledge[currentIndustryName];

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900">
              {currentIndustryName} Assessment Results
            </h3>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">{results.score.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">{results.level}</div>
            </div>
          </div>

          <div className="grid gap-6">
            {/* Performance Analysis */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Performance Analysis</h4>
              
              <div className="grid gap-4">
                <div>
                  <h5 className="text-sm font-semibold text-green-700 mb-2">Strengths</h5>
                  <ul className="space-y-2">
                    {results.strengths.map((strength, index) => (
                      <li key={index} className="flex items-start bg-green-50 p-3 rounded-lg">
                        <span className="text-green-500 mr-2">✓</span>
                        <span className="text-gray-700">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h5 className="text-sm font-semibold text-red-700 mb-2">Areas for Improvement</h5>
                  <ul className="space-y-2">
                    {results.weaknesses.map((weakness, index) => (
                      <li key={index} className="flex items-start bg-red-50 p-3 rounded-lg">
                        <span className="text-red-500 mr-2">•</span>
                        <span className="text-gray-700">{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Industry Knowledge */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Industry Knowledge</h4>
              
              <div className="space-y-4">
                <div>
                  <h5 className="text-sm font-semibold text-blue-700 mb-2">Key Trends</h5>
                  <ul className="space-y-2">
                    {knowledge.keyTrends.map((trend, index) => (
                      <li key={index} className="flex items-start bg-blue-50 p-3 rounded-lg">
                        <span className="text-blue-500 mr-2">→</span>
                        <span className="text-gray-700">{trend}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h5 className="text-sm font-semibold text-purple-700 mb-2">Technologies</h5>
                  <ul className="space-y-2">
                    {knowledge.technologies.map((tech, index) => (
                      <li key={index} className="flex items-start bg-purple-50 p-3 rounded-lg">
                        <span className="text-purple-500 mr-2">⚡</span>
                        <span className="text-gray-700">{tech}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Career Development */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Career Development</h4>
              
              <div className="space-y-4">
                <div>
                  <h5 className="text-sm font-semibold text-gray-700 mb-2">Recommended Career Paths</h5>
                  <ul className="space-y-2">
                    {results.careerPaths.map((path, index) => (
                      <li key={index} className="flex items-start bg-gray-50 p-3 rounded-lg">
                        <span className="text-gray-500 mr-2">•</span>
                        <span className="text-gray-700">{path}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h5 className="text-sm font-semibold text-gray-700 mb-2">Learning Resources</h5>
                  <ul className="space-y-2">
                    {knowledge.learningResources.map((resource, index) => (
                      <li key={index} className="flex items-start bg-gray-50 p-3 rounded-lg">
                        <span className="text-gray-500 mr-2">📚</span>
                        <span className="text-gray-700">{resource}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {currentIndustry < industries.length - 1 ? (
            <button
              onClick={moveToNextIndustry}
              className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <span>Continue to Next Industry</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          ) : (
            <button
              onClick={completeAssessment}
              className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <span>Complete Industry Assessment</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const currentIndustryName = industries[currentIndustry];
  const answered = answers[currentIndustryName]?.[currentQuestion];

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {industries[currentIndustry]}
            </h3>
            <p className="text-sm text-gray-600">
              Industry {currentIndustry + 1} of {industries.length}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Question</div>
            <div className="text-2xl font-bold text-blue-600">
              {currentQuestion + 1}/5
            </div>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="grid gap-2">
          {/* Industry Progress */}
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-500 w-24">Industries</div>
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-500"
                style={{ width: `${((currentIndustry) / industries.length) * 100}%` }}
              />
            </div>
          </div>
          {/* Question Progress */}
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-500 w-24">Questions</div>
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-600 transition-all duration-500"
                style={{ width: `${((currentQuestion) / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              {currentQ.category}
            </span>
            <span className={`text-sm font-medium px-3 py-1 rounded-full ${difficultyColors[currentQ.difficulty]}`}>
              {currentQ.difficulty.charAt(0).toUpperCase() + currentQ.difficulty.slice(1)}
            </span>
            <span className="text-sm font-medium text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
              {currentQ.points} points
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            {currentQ.question}
          </h3>
        </div>

        {/* Answer Options */}
        <div className="space-y-3">
          {currentQ.options.map((option, index) => {
            const isSelected = answered?.selectedAnswer === option;
            const isCorrect = option === currentQ.correctAnswer;

            return (
              <button
                key={index}
                onClick={() => !answered && handleAnswer(option)}
                disabled={!!answered}
                className={`w-full p-4 text-left rounded-lg transition-all duration-200 ${
                  answered
                    ? isCorrect
                      ? 'bg-green-50 border-green-500 text-green-700'
                      : isSelected
                      ? 'bg-red-50 border-red-500 text-red-700'
                      : 'bg-gray-50 border-gray-200 text-gray-500'
                    : 'border border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                }`}
              >
                <div className="flex items-center">
                  <span className="text-lg mr-3">{String.fromCharCode(65 + index)}.</span>
                  <span>{option}</span>
                  {answered && (isCorrect || isSelected) && (
                    <span className="ml-auto">
                      {isCorrect ? '✓' : '×'}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Answer Feedback */}
        {answered && (
          <div className={`mt-6 space-y-4`}>
            <div className={`p-4 rounded-lg ${
              answered.correct
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}>
              <div className="font-medium mb-2">
                {answered.correct
                  ? `✓ Correct! +${currentQ.points} points`
                  : '× Incorrect'}
              </div>
              <p className="text-sm">
                {currentQ.explanation}
              </p>
            </div>

            {!answered.correct && (
              <button
                onClick={() => setShowingTips(true)}
                className="text-blue-600 text-sm hover:text-blue-700 focus:outline-none"
              >
                💡 Need help understanding this topic?
              </button>
            )}

            {showingTips && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Learning Tip</h4>
                <p className="text-sm text-blue-700">{currentQ.tip}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default IndustryAssessment;