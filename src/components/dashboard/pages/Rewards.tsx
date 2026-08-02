import React from 'react';
import { Trophy, Star, Target, Award, Clock } from 'lucide-react';

export function Rewards() {
  const achievements = [
    {
      title: 'Speed Demon',
      description: 'Complete 10 gigs with response time under 5 minutes',
      progress: 7,
      total: 10,
      icon: Clock,
    },
    {
      title: 'Customer Favorite',
      description: 'Receive 50 five-star ratings',
      progress: 42,
      total: 50,
      icon: Star,
    },
    {
      title: 'Problem Solver',
      description: 'Successfully resolve 100 customer issues',
      progress: 85,
      total: 100,
      icon: Target,
    },
  ];

  const rewards = [
    {
      title: 'Premium Status',
      description: 'Get early access to high-paying gigs',
      points: 5000,
      claimed: false,
    },
    {
      title: 'Bonus Cash',
      description: '$100 bonus payout',
      points: 3000,
      claimed: true,
    },
    {
      title: 'Priority Support',
      description: 'Direct line to HARX support team',
      points: 2000,
      claimed: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Rewards & Achievements</h1>
        <div className="flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-lg">
          <Trophy className="w-5 h-5 text-blue-600" />
          <span className="text-blue-600 font-medium">4,250 Points</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Achievements</h2>
          <div className="space-y-6">
            {achievements.map((achievement, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <achievement.icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{achievement.title}</h3>
                      <p className="text-sm text-gray-500">{achievement.description}</p>
                    </div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(achievement.progress / achievement.total) * 100}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{achievement.progress} / {achievement.total}</span>
                  <span className="text-blue-600 font-medium">
                    {Math.round((achievement.progress / achievement.total) * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Rewards</h2>
          <div className="space-y-4">
            {rewards.map((reward, index) => (
              <div key={index} className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-yellow-50 rounded-lg">
                      <Award className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{reward.title}</h3>
                      <p className="text-sm text-gray-500">{reward.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{reward.points} points</p>
                    <button
                      className={`mt-2 px-4 py-1 rounded-lg text-sm font-medium ${
                        reward.claimed
                          ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                      disabled={reward.claimed}
                    >
                      {reward.claimed ? 'Claimed' : 'Claim'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}