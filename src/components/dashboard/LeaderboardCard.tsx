import React from 'react';
import { Trophy, TrendingUp, Star, Award } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  user: {
    name: string;
    avatar: string;
    role: string;
  };
  score: number;
  change: number;
  achievements: string[];
}

interface LeaderboardCardProps {
  title: string;
  period: string;
  entries: LeaderboardEntry[];
}

export function LeaderboardCard({ title, period, entries }: LeaderboardCardProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>
        <span className="text-sm text-gray-500">{period}</span>
      </div>

      <div className="space-y-4">
        {entries.map((entry) => (
          <div
            key={entry.rank}
            className={`flex items-center space-x-4 p-3 rounded-lg ${
              entry.rank === 1
                ? 'bg-yellow-50'
                : entry.rank === 2
                ? 'bg-gray-50'
                : entry.rank === 3
                ? 'bg-orange-50'
                : ''
            }`}
          >
            <span
              className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${
                entry.rank === 1
                  ? 'bg-yellow-500 text-white'
                  : entry.rank === 2
                  ? 'bg-gray-500 text-white'
                  : entry.rank === 3
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {entry.rank}
            </span>

            <img
              src={entry.user.avatar}
              alt={entry.user.name}
              className="w-10 h-10 rounded-full"
            />

            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{entry.user.name}</h3>
                  <p className="text-sm text-gray-500">{entry.user.role}</p>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-900">{entry.score}</div>
                  <div
                    className={`flex items-center text-sm ${
                      entry.change > 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4 mr-1" />
                    <span>{entry.change > 0 ? '+' : ''}{entry.change}%</span>
                  </div>
                </div>
              </div>

              {entry.achievements.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {entry.achievements.map((achievement, index) => (
                    <span
                      key={index}
                      className="flex items-center space-x-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs"
                    >
                      <Award className="w-3 h-3" />
                      <span>{achievement}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}