import React from 'react';
import { PhoneCall } from 'lucide-react';

function Operations() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-center mb-6">
          <PhoneCall className="w-8 h-8 text-blue-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Operations Launch</h2>
        </div>
        <div className="space-y-6">
          <p className="text-gray-600">Start your first gig and begin earning.</p>
          <button className="w-full sm:w-auto flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            Launch First Campaign
          </button>
        </div>
      </div>
    </div>
  );
}

export default Operations;