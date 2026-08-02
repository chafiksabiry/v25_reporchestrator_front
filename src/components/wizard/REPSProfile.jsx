import React, { useState, useRef } from 'react';

function REPSProfile({ assessmentResults, profileData }) {
  console.log("assessmentResults in REPSProfile: ", assessmentResults);
  console.log("profileData : ", profileData);
  const [showFullProfile, setShowFullProfile] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [isPublic, setIsPublic] = useState(false);
  const [favorites, setFavorites] = useState(0);
  const fileInputRef = useRef(null);

  const handlePhotoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePublishProfile = () => {
    setIsPublic(true);
    // Here you would typically make an API call to publish the profile
    alert('Your profile is now visible to companies! 🚀');
    window.location.href = '/repdashboard';
  };

  const renderScoreCard = (title, score, color) => (
    <div className={`bg-${color}-50 p-4 rounded-xl`}>
      <div className="text-center">
        <div className={`text-3xl font-bold text-${color}-600 mb-1`}>{score}%</div>
        <div className={`text-sm text-${color}-800 font-medium`}>{title}</div>
      </div>
    </div>
  );

  const renderSkillBadge = (skill, level) => (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-3 py-1.5 rounded-full flex items-center gap-2">
      <span className="text-sm font-medium text-gray-700">{skill}</span>
      {level && (
        <span className="text-xs px-2 py-0.5 bg-white rounded-full text-blue-600 font-medium">
          {level}%
        </span>
      )}
    </div>
  );

  // Safely get scores with fallback values
  const getScore = (category) => {
    try {
      return Math.round((assessmentResults.contactCenter?.[category]?.score || 0));
    } catch (error) {
      return 0;
    }
  };

  const communicationScore = getScore("Communication");
  const problemSolvingScore = getScore("Problem Solving");
  const customerServiceScore = getScore("Customer Service");

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Profile Header */}
      <div className="h-48 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 relative">
        <div className="absolute inset-0 bg-black/20"></div>

        {/* Profile Photo */}
        <div className="absolute -bottom-12 left-6">
          <div className="relative">
            <div
              className="w-24 h-24 rounded-full border-4 border-white bg-gray-100 flex items-center justify-center overflow-hidden cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              {profilePhoto ? (
                <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handlePhotoUpload}
            />
            <div className="absolute -bottom-1 -right-1">
              <button
                className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 right-0 p-6 text-white text-right">
          <div className="flex items-center gap-4 justify-end mb-2">
            <button className="flex items-center gap-1 text-white/90 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>{favorites} Favorites</span>
            </button>
            <button className="flex items-center gap-1 text-white/90 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Contact</span>
            </button>
          </div>
          {!isPublic && (
            <button
              onClick={handlePublishProfile}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Publish Profile
            </button>
          )}
        </div>

        <div className="absolute bottom-0 left-36 p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">{profileData.personalInfo.name}</h1>
          <div className="flex items-center gap-4 text-white/90">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {profileData.personalInfo.location}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {profileData.professionalSummary.currentRole}
            </span>
          </div>
        </div>
      </div>

      {/* Profile Status Banner */}
      {isPublic && (
        <div className="bg-green-50 px-6 py-2 flex items-center justify-between">
          <span className="text-green-700 text-sm font-medium">
            ✨ Your profile is visible to companies
          </span>
          <button className="text-green-600 text-sm hover:text-green-700">
            Manage Visibility
          </button>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4 p-6 mt-8">
        {renderScoreCard("Overall", assessmentResults.overallScore || 0, "blue")}
        {renderScoreCard("Communication", communicationScore, "purple")}
        {renderScoreCard("Problem Solving", problemSolvingScore, "green")}
        {renderScoreCard("Customer Service", customerServiceScore, "pink")}
      </div>

      {/* Rest of the component remains unchanged */}
      {/* Languages */}
      <div className="px-6 pb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Language Proficiency</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {Object.entries(assessmentResults.languages || {}).map(([language, results]) => (
            <div key={language} className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-gray-800">{language}</span>
                <span className="text-sm font-semibold text-blue-600">{(results.overall === null) ? 0 : results.overall.score}%</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Fluency</span>
                  <span className="text-gray-800">{(results.fluency === null) ? 0 : results.fluency.score}/100</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Proficiency</span>
                  <span className="text-gray-800">{(results.proficiency === null) ? 0 : results.proficiency.score}/100</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key Skills */}
      <div className="px-6 pb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Key Skills</h2>
        <div className="flex flex-wrap gap-2">
          {(assessmentResults.keySkills || []).map((skill, index) => (
            <div key={`skill-${index}`}>
              {renderSkillBadge(skill.name, skill.proficiency)}
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Roles */}
      <div className="px-6 pb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Best Fit Roles</h2>
        <div className="space-y-3">
          {(assessmentResults.recommendedRoles || [])
            .slice(0, showFullProfile ? undefined : 3)
            .map((role, index) => (
              <div key={index} className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-gray-900">{role.role}</h3>
                  <span className="px-3 py-1 bg-white rounded-full text-sm font-medium text-blue-600">
                    {role.confidence}% Match
                  </span>
                </div>
                <p className="text-sm text-gray-700">{role.rationale}</p>
              </div>
            ))}
        </div>
      </div>

      {/* Expand/Collapse Button */}
      <div className="px-6 pb-6">
        <button
          onClick={() => setShowFullProfile(!showFullProfile)}
          className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2"
        >
          <span>{showFullProfile ? 'Show Less' : 'View Full Profile'}</span>
          <svg
            className={`w-4 h-4 transform transition-transform ${showFullProfile ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Extended Profile */}
      {showFullProfile && (
        <div className="border-t border-gray-100">
          {/* Career Path */}
          <div className="px-6 py-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Career Development Path</h2>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Immediate Opportunity</h3>
                <p className="text-blue-800">{assessmentResults.careerPath?.immediate}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-medium text-purple-900 mb-2">Short-term Growth (6-12 months)</h3>
                <p className="text-purple-800">{assessmentResults.careerPath?.shortTerm}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-medium text-green-900 mb-2">Long-term Potential (1-2 years)</h3>
                <p className="text-green-800">{assessmentResults.careerPath?.longTerm}</p>
              </div>
            </div>
          </div>

          {/* Detailed Assessment Results */}
          <div className="px-6 py-6 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Detailed Assessment Results</h2>
            <div className="space-y-6">
              {/* Strengths */}
              <div>
                <h3 className="font-medium text-gray-800 mb-3">Key Strengths</h3>
                <ul className="space-y-2">
                  {(assessmentResults.keyStrengths || []).map((strength, index) => (
                    <li key={index} className="flex items-start bg-white p-3 rounded-lg">
                      <span className="text-green-500 mr-2">✓</span>
                      <span className="text-gray-700">{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Development Areas */}
              <div>
                <h3 className="font-medium text-gray-800 mb-3">Development Areas</h3>
                <ul className="space-y-2">
                  {(assessmentResults.developmentAreas || []).map((area, index) => (
                    <li key={index} className="flex items-start bg-white p-3 rounded-lg">
                      <span className="text-blue-500 mr-2">•</span>
                      <span className="text-gray-700">{area}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Training Recommendations */}
              <div>
                <h3 className="font-medium text-gray-800 mb-3">Recommended Training</h3>
                <ul className="space-y-2">
                  {(assessmentResults.trainingRecommendations || []).map((training, index) => (
                    <li key={index} className="flex items-start bg-white p-3 rounded-lg">
                      <span className="text-purple-500 mr-2">📚</span>
                      <span className="text-gray-700">{training}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Experience & Background */}
          <div className="px-6 py-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Experience & Background</h2>
            <div className="space-y-6">
              {(profileData.experience || []).map((exp, index) => (
                <div key={index} className="border-l-2 border-blue-200 pl-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{exp.title}</h3>
                      <p className="text-gray-600">{exp.company}</p>
                    </div>
                    <span className="text-sm text-gray-500">
                      {exp.startDate} - {exp.endDate || 'Present'}
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {(exp.achievements || []).map((achievement, i) => (
                      <li key={i} className="text-sm text-gray-700">
                        • {achievement}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default REPSProfile;