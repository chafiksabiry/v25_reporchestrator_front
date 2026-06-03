import React, { useState } from 'react';
import { BarChart, Users, CheckCircle } from 'lucide-react';

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface PollProps {
  question: string;
  options: PollOption[];
  totalVotes: number;
  onVote: (optionId: string) => void;
  hasVoted: boolean;
}

export function Poll({ question, options, totalVotes, onVote, hasVoted }: PollProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const handleVote = () => {
    if (selectedOption && !hasVoted) {
      onVote(selectedOption);
    }
  };

  const getPercentage = (votes: number) => {
    return totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100);
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-900">{question}</h3>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Users className="w-4 h-4" />
          <span>{totalVotes} votes</span>
        </div>
      </div>

      <div className="space-y-3">
        {options.map((option) => (
          <div key={option.id} className="space-y-2">
            <div
              className={`flex items-center p-3 rounded-lg cursor-pointer border ${
                selectedOption === option.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => !hasVoted && setSelectedOption(option.id)}
            >
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {option.text}
                  </span>
                  {hasVoted && (
                    <span className="text-sm font-medium text-gray-900">
                      {getPercentage(option.votes)}%
                    </span>
                  )}
                </div>
                {hasVoted && (
                  <div className="mt-2 relative">
                    <div className="h-2 bg-gray-200 rounded-full">
                      <div
                        className="h-2 bg-blue-600 rounded-full"
                        style={{ width: `${getPercentage(option.votes)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!hasVoted && (
        <button
          onClick={handleVote}
          disabled={!selectedOption}
          className={`mt-4 w-full py-2 px-4 rounded-lg ${
            selectedOption
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          Vote
        </button>
      )}

      {hasVoted && (
        <div className="mt-4 flex items-center justify-center text-sm text-green-600">
          <CheckCircle className="w-4 h-4 mr-2" />
          <span>You've voted</span>
        </div>
      )}
    </div>
  );
}