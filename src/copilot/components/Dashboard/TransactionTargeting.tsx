import React from 'react';
import { useAgent } from '../../contexts/AgentContext';
import { Target, TrendingUp, AlertTriangle, CheckCircle, Clock, Zap, Eye, ArrowUp, ArrowDown, Minus } from 'lucide-react';

export function TransactionTargeting() {
  const { state } = useAgent();
  const { transactionIntelligence } = state;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getGoalIcon = (type: string) => {
    switch (type) {
      case 'sale': return '💰';
      case 'appointment': return '📅';
      case 'feedback': return '📝';
      case 'confirmation': return '✅';
      case 'renewal': return '🔄';
      case 'upsell': return '📈';
      case 'referral': return '👥';
      case 'demo': return '🎯';
      default: return '🎯';
    }
  };

  const getTimingColor = (shouldProceed: boolean) => {
    return shouldProceed ? 'text-green-400' : 'text-orange-400';
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Target className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-semibold text-white">Transaction Intelligence</h3>
        </div>
        {state.callState.isActive && (
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
        )}
      </div>

      {!state.callState.isActive ? (
        <div className="text-center text-slate-400 py-4">
          <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Transaction targeting inactive</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Transaction Goal */}
          {transactionIntelligence.goal && (
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getGoalIcon(transactionIntelligence.goal.type)}</span>
                  <h4 className="text-white font-medium text-sm">{transactionIntelligence.goal.title}</h4>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  transactionIntelligence.goal.priority === 'critical' ? 'bg-red-600/20 text-red-300' :
                  transactionIntelligence.goal.priority === 'high' ? 'bg-orange-600/20 text-orange-300' :
                  transactionIntelligence.goal.priority === 'medium' ? 'bg-yellow-600/20 text-yellow-300' :
                  'bg-harx-600/20 text-harx-300'
                }`}>
                  {transactionIntelligence.goal.priority}
                </span>
              </div>
            </div>
          )}

          {/* Success Likelihood - Prominent Display */}
          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-white">Success Likelihood</span>
              <span className={`text-3xl font-bold ${getScoreColor(transactionIntelligence.currentScore)}`}>
                {Math.round(transactionIntelligence.currentScore)}%
              </span>
            </div>
            <div className="w-full bg-slate-600 rounded-full h-3 mb-2">
              <div
                className={`${getScoreBgColor(transactionIntelligence.currentScore)} h-3 rounded-full transition-all duration-500`}
                style={{ width: `${transactionIntelligence.currentScore}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Low</span>
              <span>{Math.round(transactionIntelligence.confidenceLevel)}% confidence</span>
              <span>High</span>
            </div>
          </div>

          {/* Optimal Timing Alert */}
          <div className={`border rounded-lg p-3 ${
            transactionIntelligence.optimalTiming.shouldProceed 
              ? 'border-green-500/50 bg-green-500/10' 
              : 'border-orange-500/50 bg-orange-500/10'
          }`}>
            <div className="flex items-center space-x-2 mb-2">
              <Clock className={`w-4 h-4 ${getTimingColor(transactionIntelligence.optimalTiming.shouldProceed)}`} />
              <span className={`text-sm font-medium ${getTimingColor(transactionIntelligence.optimalTiming.shouldProceed)}`}>
                {transactionIntelligence.optimalTiming.shouldProceed ? '🟢 PROCEED NOW' : '🟡 WAIT'}
              </span>
            </div>
            <p className="text-xs text-slate-300">{transactionIntelligence.optimalTiming.reason}</p>
          </div>

          {/* Progress to Goal */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-300">Progress to Goal</span>
              <span className="text-white font-medium">{Math.round(transactionIntelligence.progressToGoal)}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-cyan-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${transactionIntelligence.progressToGoal}%` }}
              />
            </div>
          </div>

          {/* Next Best Actions - Compact */}
          {transactionIntelligence.nextBestActions.length > 0 && (
            <div className="bg-slate-700/30 rounded-lg p-3">
              <h5 className="text-sm font-medium text-cyan-400 mb-2 flex items-center">
                <Zap className="w-4 h-4 mr-1" />
                Next Actions
              </h5>
              <div className="space-y-1">
                {transactionIntelligence.nextBestActions.slice(0, 2).map((action, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <span className="text-cyan-400 mt-0.5 text-xs">{index + 1}.</span>
                    <span className="text-xs text-slate-200">{action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Barriers & Opportunities - Side by Side */}
          <div className="grid grid-cols-2 gap-2">
            {/* Barriers */}
            {transactionIntelligence.barriers.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2">
                <h6 className="text-xs font-medium text-red-400 mb-1 flex items-center">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Barriers
                </h6>
                <div className="space-y-1">
                  {transactionIntelligence.barriers.slice(0, 1).map((barrier, index) => (
                    <p key={index} className="text-xs text-red-300">{barrier}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Opportunities */}
            {transactionIntelligence.opportunities.length > 0 && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2">
                <h6 className="text-xs font-medium text-green-400 mb-1 flex items-center">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Opportunities
                </h6>
                <div className="space-y-1">
                  {transactionIntelligence.opportunities.slice(0, 1).map((opportunity, index) => (
                    <p key={index} className="text-xs text-green-300">{opportunity}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
