import React from 'react';
import { Target, Zap, UserCheck, HeartHandshake, TrendingUp, Brain } from 'lucide-react';

interface REPSScoreProps {
  scores: {
    reliability: number;
    efficiency: number;
    professionalism: number;
    service: number;
  };
  improvements: {
    category: string;
    suggestion: string;
    impact: string;
  }[];
}

export function REPSScore({ scores, improvements }: REPSScoreProps) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 90) return 'bg-green-50';
    if (score >= 75) return 'bg-blue-50';
    if (score >= 60) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  const categories = [
    { key: 'reliability', label: 'Reliability', icon: Target },
    { key: 'efficiency', label: 'Efficiency', icon: Zap },
    { key: 'professionalism', label: 'Professionalism', icon: UserCheck },
    { key: 'service', label: 'Service', icon: HeartHandshake },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {categories.map(({ key, label, icon: Icon }) => (
          <div key={key} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 ${getScoreBackground(scores[key])} rounded-lg`}>
                <Icon className={`w-5 h-5 ${getScoreColor(scores[key])}`} />
              </div>
              <span className={`text-2xl font-bold ${getScoreColor(scores[key])}`}>
                {scores[key]}
              </span>
            </div>
            <p className="text-sm text-gray-600">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">AI-Driven Improvement Plan</h2>
          <div className="p-2 bg-purple-50 rounded-lg">
            <Brain className="w-5 h-5 text-purple-600" />
          </div>
        </div>
        <div className="space-y-4">
          {improvements.map((improvement, index) => (
            <div key={index} className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{improvement.category}</span>
                <div className="flex items-center text-blue-600">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  <span className="text-sm">Impact Score</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-2">{improvement.suggestion}</p>
              <p className="text-xs text-gray-500">Expected Impact: {improvement.impact}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}