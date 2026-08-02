import React from 'react';
import { TrendingUp } from 'lucide-react';

function CareerTrack() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-center mb-6">
          <TrendingUp className="w-8 h-8 text-blue-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Career Growth</h2>
        </div>
        <div className="space-y-6">
          <p className="text-gray-600">Track your progress and advance your REPS career.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold">Current Level</h3>
              <p className="text-2xl font-bold text-blue-600">Trained</p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold">Next Level</h3>
              <p className="text-2xl font-bold text-gray-600">Certified</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CareerTrack;