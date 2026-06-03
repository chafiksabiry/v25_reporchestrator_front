import React from 'react';
import { Shield } from 'lucide-react';

function QualityControl() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-center mb-6">
          <Shield className="w-8 h-8 text-blue-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Quality Control</h2>
        </div>
        <div className="space-y-6">
          <p className="text-gray-600">Monitor and improve your performance.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold">Call Quality</h3>
              <p className="text-2xl font-bold text-blue-600">98%</p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold">Response Time</h3>
              <p className="text-2xl font-bold text-blue-600">1.2s</p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold">Client Satisfaction</h3>
              <p className="text-2xl font-bold text-blue-600">4.9/5</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QualityControl;