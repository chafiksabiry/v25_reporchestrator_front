import React from 'react';
import { CreditCard } from 'lucide-react';

function Subscription() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-center mb-6">
          <CreditCard className="w-8 h-8 text-blue-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Choose Your Plan</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold">Starter</h3>
            <p className="text-gray-600 mt-2">Free</p>
            <button className="mt-4 w-full py-2 px-4 border border-blue-600 rounded-md text-blue-600 hover:bg-blue-50">
              Select
            </button>
          </div>
          <div className="border rounded-lg p-6 bg-blue-50">
            <h3 className="text-lg font-semibold">Growth</h3>
            <p className="text-gray-600 mt-2">$29/month</p>
            <button className="mt-4 w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Select
            </button>
          </div>
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold">Pro</h3>
            <p className="text-gray-600 mt-2">$79/month</p>
            <button className="mt-4 w-full py-2 px-4 border border-blue-600 rounded-md text-blue-600 hover:bg-blue-50">
              Select
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Subscription;