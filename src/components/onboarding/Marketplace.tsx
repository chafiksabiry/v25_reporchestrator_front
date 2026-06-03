import React from 'react';
import { ShoppingBag } from 'lucide-react';

function Marketplace() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-center mb-6">
          <ShoppingBag className="w-8 h-8 text-blue-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Marketplace</h2>
        </div>
        <div className="space-y-6">
          <p className="text-gray-600">Browse available gigs and opportunities.</p>
          <div className="grid grid-cols-1 gap-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold">Sales Calls Campaign</h3>
              <p className="text-sm text-gray-600 mt-1">20 calls needed</p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold">Email Outreach</h3>
              <p className="text-sm text-gray-600 mt-1">100 emails campaign</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Marketplace;