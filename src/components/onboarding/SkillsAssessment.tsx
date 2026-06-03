import React from 'react';
import { Award } from 'lucide-react';

function SkillsAssessment() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-center mb-6">
          <Award className="w-8 h-8 text-blue-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Skills Assessment</h2>
        </div>
        <div className="space-y-6">
          <p className="text-gray-600">Complete your skills assessment to determine your Bolt Score.</p>
          <button className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            Start Assessment
          </button>
        </div>
      </div>
    </div>
  );
}

export default SkillsAssessment;