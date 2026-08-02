import React from 'react';
import { Bot, Sparkles, MessageSquare } from 'lucide-react';

interface AIAssistantProps {
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

export function AIAssistant({ suggestions, onSuggestionClick, sentiment }: AIAssistantProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Bot className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
        </div>
        {sentiment && (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            sentiment === 'positive' ? 'bg-green-100 text-green-700' :
            sentiment === 'negative' ? 'bg-red-100 text-red-700' :
            'bg-yellow-100 text-yellow-700'
          }`}>
            {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)} Sentiment
          </span>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Sparkles className="w-4 h-4" />
          <span>Suggested Responses:</span>
        </div>
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSuggestionClick(suggestion)}
            className="w-full p-3 text-left text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="flex items-start space-x-2">
              <MessageSquare className="w-4 h-4 mt-1 text-gray-400" />
              <span>{suggestion}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}