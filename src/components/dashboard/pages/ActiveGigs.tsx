import React from 'react';
import { Clock, MessageSquare, CheckCircle, XCircle } from 'lucide-react';

export function ActiveGigs() {
  const activeGigs = [
    {
      id: 1,
      company: 'TechCorp Inc.',
      task: 'Customer Support Call',
      timeLeft: '45 minutes',
      status: 'In Progress',
      customer: 'Sarah Wilson',
      type: 'Voice Call',
    },
    {
      id: 2,
      company: 'E-commerce Solutions',
      task: 'Email Support',
      timeLeft: '2 hours',
      status: 'Scheduled',
      customer: 'Mike Johnson',
      type: 'Email',
    },
    {
      id: 3,
      company: 'Fashion Brand Co.',
      task: 'Social Media Response',
      timeLeft: '30 minutes',
      status: 'In Progress',
      customer: 'Emily Brown',
      type: 'Social Media',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Active Gigs</h1>
        <div className="flex space-x-3">
          <select className="border border-gray-200 rounded-lg px-4 py-2 bg-white">
            <option>All Types</option>
            <option>Voice Calls</option>
            <option>Email Support</option>
            <option>Social Media</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeGigs.map((gig) => (
          <div key={gig.id} className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-gray-900">{gig.task}</h3>
                <p className="text-sm text-gray-500">{gig.company}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                gig.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {gig.status}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="w-4 h-4 mr-2 text-gray-400" />
                <span>Time Left: {gig.timeLeft}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <MessageSquare className="w-4 h-4 mr-2 text-gray-400" />
                <span>{gig.type}</span>
              </div>
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Customer: {gig.customer}</p>
            </div>

            <div className="mt-6 flex space-x-3">
              <button className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center">
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete Gig
              </button>
              <button className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center">
                <XCircle className="w-4 h-4 mr-2" />
                Report Issue
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}