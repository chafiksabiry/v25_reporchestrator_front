import React, { useState } from 'react';
import { Clock } from 'lucide-react';

interface IntelligenceInsight {
  id: string;
  type: 'sentiment' | 'keyword' | 'action' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  timestamp: string;
}

interface IntelligenceBarProps {
  insights?: IntelligenceInsight[];
  onInsightClick?: (insightId: string) => void;
  onDismiss?: (insightId: string) => void;
}

export const IntelligenceBar: React.FC<IntelligenceBarProps> = ({
  insights = [],
  onInsightClick,
  onDismiss
}) => {
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<'all' | 'sentiment' | 'keyword' | 'action' | 'recommendation'>('all');

  const filteredInsights = insights.filter(insight => 
    filter === 'all' ? true : insight.type === filter
  );

  const getTypeIcon = (type: IntelligenceInsight['type']) => {
    switch (type) {
      case 'sentiment': return '😊';
      case 'keyword': return '🔍';
      case 'action': return '⚡';
      case 'recommendation': return '💡';
      default: return '📊';
    }
  };

  const getTypeColor = (type: IntelligenceInsight['type']) => {
    switch (type) {
      case 'sentiment': return 'bg-harx-500/20 text-harx-100 border border-harx-500/20';
      case 'keyword': return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20';
      case 'action': return 'bg-amber-500/20 text-amber-400 border border-amber-500/20';
      case 'recommendation': return 'bg-harx-alt-500/20 text-harx-alt-400 border border-harx-alt-500/20';
      default: return 'bg-white/5 text-slate-400 border border-white/5';
    }
  };

  const getPriorityColor = (priority: IntelligenceInsight['priority']) => {
    switch (priority) {
      case 'high': return 'border-rose-500/50 shadow-rose-500/5';
      case 'medium': return 'border-amber-500/50 shadow-amber-500/5';
      case 'low': return 'border-emerald-500/50 shadow-emerald-500/5';
      default: return 'border-white/10';
    }
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden relative group">
      <div className="flex items-center justify-between p-3 border-b border-white/5 bg-white/2 relative z-10">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-harx flex items-center justify-center shadow-xl shadow-harx-500/20 border border-harx-500/30">
            <span className="text-white text-sm font-black tracking-tighter">AI</span>
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-widest uppercase">Intelligence</h2>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Real-time tactical feedback</p>
          </div>
          <span className="bg-white/5 text-harx-400 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border border-white/10 ml-2">
            {insights.length} Signals
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="text-[9px] font-black uppercase tracking-[0.2em] bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-slate-300 focus:ring-1 focus:ring-harx-500 outline-none transition-all cursor-pointer hover:bg-white/10"
          >
            <option value="all" className="bg-slate-900">All Signals</option>
            <option value="sentiment" className="bg-slate-900">Sentiment</option>
            <option value="keyword" className="bg-slate-900">Contextual</option>
            <option value="action" className="bg-slate-900">Execution</option>
            <option value="recommendation" className="bg-slate-900">Tactics</option>
          </select>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-300"
          >
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar relative z-10 bg-white/2">
          {filteredInsights.length === 0 ? (
            <div className="text-center text-slate-500 py-16 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/5 opacity-30">
                <span className="text-3xl">📡</span>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">No Intelligence Signals Identified</p>
            </div>
          ) : (
            filteredInsights.map((insight) => (
              <div
                key={insight.id}
                className={`p-5 rounded-2xl border bg-white/5 hover:bg-white/10 cursor-pointer transition-all duration-500 relative overflow-hidden group/item ${getPriorityColor(insight.priority)}`}
                onClick={() => onInsightClick?.(insight.id)}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${insight.priority === 'high' ? 'bg-rose-500' : insight.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl shadow-inner group-hover/item:scale-110 transition-transform duration-500">
                        {getTypeIcon(insight.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-black text-white text-sm tracking-tight capitalize">{insight.title}</h3>
                        <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full ${getTypeColor(insight.type)}`}>
                          {insight.type}
                        </span>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                          {Math.round(insight.confidence * 100)}% Match
                        </span>
                      </div>
                      <p className="text-[13px] text-slate-300 font-medium leading-relaxed tracking-tight mb-3 group-hover/item:text-white transition-colors">
                         {insight.description}
                      </p>
                      <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] flex items-center">
                        <Clock className="w-3 h-3 mr-1.5 opacity-50" />
                        {new Date(insight.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDismiss?.(insight.id);
                    }}
                    className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-500 hover:text-white hover:bg-rose-500/20 transition-all"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {!expanded && insights.length > 0 && (
        <div className="px-6 py-4 bg-white/2 relative z-10">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-white">
              <span className="text-lg">{getTypeIcon(insights[0].type)}</span>
              <span className="font-bold tracking-tight">{insights[0].title}</span>
            </div>
            <div className="h-1 w-1 rounded-full bg-slate-700"></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{insights.length - 1} pending signals in queue</span>
          </div>
        </div>
      )}
    </div>
  );
};

