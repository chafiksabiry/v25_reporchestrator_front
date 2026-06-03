import React from 'react';
import { BookOpen, Play, Brain, Star, Award, Bot } from 'lucide-react';

export function Learning() {
  const courses = [
    {
      title: 'AI-Powered Customer Service',
      description: 'Learn to leverage AI tools for better customer interactions',
      progress: 60,
      duration: '2 hours',
      level: 'Intermediate',
      icon: Bot,
    },
    {
      title: 'Advanced Problem Solving',
      description: 'Master complex customer issue resolution techniques',
      progress: 30,
      duration: '3 hours',
      level: 'Advanced',
      icon: Brain,
    },
    {
      title: 'Communication Excellence',
      description: 'Enhance your professional communication skills',
      progress: 85,
      duration: '1.5 hours',
      level: 'Beginner',
      icon: BookOpen,
    }
  ];

  const aiTools = [
    {
      name: 'HARX Assistant',
      description: 'AI-powered assistant for real-time support during customer interactions',
      features: ['Response suggestions', 'Sentiment analysis', 'Knowledge base integration'],
      status: 'Available',
    },
    {
      name: 'Smart Templates',
      description: 'Dynamic email and message templates that adapt to customer context',
      features: ['Customizable templates', 'Tone adjustment', 'Multi-language support'],
      status: 'New',
    },
    {
      name: 'Performance Coach',
      description: 'AI coach that provides personalized improvement suggestions',
      features: ['Performance analysis', 'Skill recommendations', 'Progress tracking'],
      status: 'Beta',
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Learning Hub</h1>
        <div className="flex items-center space-x-2 bg-green-50 px-4 py-2 rounded-lg">
          <Star className="w-5 h-5 text-green-600" />
          <span className="text-green-600 font-medium">Level 3 Certified</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Training Courses</h2>
          <div className="space-y-6">
            {courses.map((course, index) => (
              <div key={index} className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <course.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">{course.title}</h3>
                      <span className="text-sm text-gray-500">{course.duration}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{course.description}</p>
                    <div className="mt-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">Progress</span>
                        <span className="text-blue-600 font-medium">{course.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${course.progress}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                        {course.level}
                      </span>
                      <button className="flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium">
                        <Play className="w-4 h-4 mr-1" />
                        Continue Learning
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Tools & Resources</h2>
            <div className="space-y-4">
              {aiTools.map((tool, index) => (
                <div key={index} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900">{tool.name}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          tool.status === 'New' ? 'bg-green-100 text-green-700' :
                          tool.status === 'Beta' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {tool.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{tool.description}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex flex-wrap gap-2">
                      {tool.features.map((feature, i) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button className="mt-4 w-full bg-gray-50 text-gray-700 py-2 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium">
                    Learn More
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-2">Get Certified!</h2>
                <p className="text-blue-100 text-sm">Complete all courses to earn your Advanced HARX Representative certification.</p>
              </div>
              <Award className="w-12 h-12 text-blue-100 opacity-75" />
            </div>
            <button className="mt-4 w-full bg-white text-blue-600 py-2 rounded-lg hover:bg-blue-50 transition-colors font-medium">
              Start Certification
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}