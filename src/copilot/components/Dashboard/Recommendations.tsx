import React from 'react';
import { useAgent } from '../../contexts/AgentContext';
import { useRealTimeFeatures } from '../../hooks/useRealTimeFeatures';
import { Lightbulb, AlertTriangle, Target, Zap, X, Copy } from 'lucide-react';

export function Recommendations() {
  const { state } = useAgent();
  const { dismissRecommendation } = useRealTimeFeatures();

  const getIcon = (type: string) => {
    switch (type) {
      case 'strategy': return <Target className="w-4 h-4" />;
      case 'language': return <Lightbulb className="w-4 h-4" />;
      case 'action': return <Zap className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-red-500 bg-red-500/10';
      case 'high': return 'border-orange-500 bg-orange-500/10';
      case 'medium': return 'border-yellow-500 bg-yellow-500/10';
      case 'low': return 'border-harx-500 bg-harx-500/10';
      default: return 'border-slate-500 bg-slate-500/10';
    }
  };

  const getIconColor = (type: string, priority: string) => {
    if (priority === 'critical') return 'text-red-400';
    if (priority === 'high') return 'text-orange-400';
    switch (type) {
      case 'strategy': return 'text-harx-alt-400';
      case 'language': return 'text-yellow-400';
      case 'action': return 'text-green-400';
      case 'warning': return 'text-red-400';
      default: return 'text-harx-400';
    }
  };

  const activeRecommendations = state.recommendations.filter(rec => !rec.dismissed);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Lightbulb className="w-5 h-5 text-yellow-400" />
          <h3 className="text-lg font-semibold text-white">AI Recommendations</h3>
        </div>
        {activeRecommendations.length > 0 && (
          <span className="bg-harx-600 text-white text-xs px-2 py-1 rounded-full">
            {activeRecommendations.length}
          </span>
        )}
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700">
        {activeRecommendations.length === 0 ? (
          <div className="text-center text-slate-400 py-6">
            <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No recommendations yet</p>
            <p className="text-xs mt-1">AI will provide suggestions during the call</p>
          </div>
        ) : (
          activeRecommendations.map((rec) => (
            <div
              key={rec.id}
              className={`border rounded-lg p-4 ${getPriorityColor(rec.priority)} transition-all duration-200 hover:shadow-lg`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className={getIconColor(rec.type, rec.priority)}>
                    {getIcon(rec.type)}
                  </div>
                  <h4 className="text-sm font-medium text-white">{rec.title}</h4>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    rec.priority === 'critical' ? 'bg-red-600/20 text-red-300' :
                    rec.priority === 'high' ? 'bg-orange-600/20 text-orange-300' :
                    rec.priority === 'medium' ? 'bg-yellow-600/20 text-yellow-300' :
                    'bg-harx-600/20 text-harx-300'
                  }`}>
                    {rec.priority}
                  </span>
                </div>
                <button
                  onClick={() => dismissRecommendation(rec.id)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-sm text-slate-200 mb-3 leading-relaxed">
                {rec.message}
              </p>

              {rec.suggestedResponse && (
                <div className="bg-slate-700/50 rounded-lg p-3 mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-green-400">Suggested Response:</span>
                    <button
                      onClick={() => copyToClipboard(rec.suggestedResponse!)}
                      className="text-slate-400 hover:text-white transition-colors"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-sm text-slate-200 italic">
                    "{rec.suggestedResponse}"
                  </p>
                </div>
              )}

              <div className="flex justify-between items-center mt-3 text-xs text-slate-400">
                <span>{rec.timestamp.toLocaleTimeString()}</span>
                <span className="capitalize">{rec.type}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
