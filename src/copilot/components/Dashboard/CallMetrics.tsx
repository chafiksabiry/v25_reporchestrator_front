import React from 'react';
import { useAgent } from '../../contexts/AgentContext';
import { BarChart3, TrendingUp, Clock, Award } from 'lucide-react';

export function CallMetrics() {
  const { state } = useAgent();

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 75) return 'text-yellow-400';
    if (score >= 60) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 75) return 'bg-yellow-500';
    if (score >= 60) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const metrics = [
    { label: 'Clarity', value: state.callMetrics.clarity, icon: '🎯' },
    { label: 'Empathy', value: state.callMetrics.empathy, icon: '❤️' },
    { label: 'Assertiveness', value: state.callMetrics.assertiveness, icon: '💪' },
    { label: 'Efficiency', value: state.callMetrics.efficiency, icon: '⚡' }
  ];

  return (
    <div className="glass-card rounded-2xl p-3 relative group overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-harx-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-emerald-500/10 rounded-xl">
          <BarChart3 className="w-5 h-5 text-emerald-400" />
        </div>
        <h3 className="text-lg font-black text-white tracking-tight uppercase">Call Metrics</h3>
        {state.callState.isActive && (
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        )}
      </div>

      <div className="space-y-2">
        {/* Overall Score */}
        <div className="bg-white/5 rounded-2xl p-2 border border-white/5 group-hover:bg-white/10 transition-colors duration-500">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-1.5 bg-yellow-400/10 rounded-lg">
                <Award className="w-4 h-4 text-yellow-400" />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score Global</span>
            </div>
            <span className={`text-3xl font-black ${getScoreColor(state.callMetrics.overallScore)}`}>
              {Math.round(state.callMetrics.overallScore)}
            </span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2 shadow-inner">
            <div
              className={`${getScoreBgColor(state.callMetrics.overallScore)} h-2 rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(0,0,0,0.2)]`}
              style={{ width: `${state.callMetrics.overallScore}%` }}
            />
          </div>
        </div>

        {/* Call Duration */}
        {state.callState.isActive && (
          <div className="flex items-center justify-between bg-white/5 rounded-2xl p-4 border border-white/5 group-hover:bg-white/10 transition-colors duration-500">
            <div className="flex items-center space-x-3">
              <div className="p-1.5 bg-harx-500/10 rounded-lg">
                <Clock className="w-4 h-4 text-harx-400" />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration</span>
            </div>
            <span className="text-white font-mono font-bold tracking-wider">
              {formatDuration(state.callMetrics.duration)}
            </span>
          </div>
        )}

        {/* Individual Metrics */}
        <div className="space-y-4 pt-2">
          {metrics.map((metric) => (
            <div key={metric.label} className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{metric.icon}</span>
                  <span className="text-slate-400">{metric.label}</span>
                </div>
                <span className="text-white">{Math.round(metric.value)}%</span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`${getScoreBgColor(metric.value)} h-1.5 rounded-full transition-all duration-1000 ease-out`}
                  style={{ width: `${metric.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Performance Trend */}
        {state.callState.isActive && (
          <div className="bg-gradient-harx/10 rounded-2xl p-4 border border-harx-500/10">
            <div className="flex items-center space-x-2 mb-3">
              <TrendingUp className="w-4 h-4 text-harx-400" />
              <span className="text-[10px] font-black text-harx-400 uppercase tracking-widest">Performance Trend</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-harx-500 via-yellow-500 to-green-500 rounded-full animate-pulse"></div>
              </div>
              <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">↗ Improving</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
