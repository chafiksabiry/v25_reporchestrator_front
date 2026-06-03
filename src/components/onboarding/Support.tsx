import React from 'react';
import { Headphones } from 'lucide-react';

function Support() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-center mb-6">
          <Headphones className="w-8 h-8 text-blue-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Support & Training</h2>
        </div>
        <div className="space-y-6">
          <p className="text-gray-600">Access resources and community support.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold">Training Resources</h3>
              <p className="text-sm text-gray-600 mt-1">Access learning materials</p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold">Community Chat</h3>
              <p className="text-sm text-gray-600 mt-1">Connect with other REPS</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Support;