import React from 'react';
import { useAgent } from '../../contexts/AgentContext';
import { useRealTimeFeatures } from '../../hooks/useRealTimeFeatures';
import { Zap, Send, Calendar, FileText, Phone, MessageSquare, Copy, ExternalLink } from 'lucide-react';

export function QuickActions() {
  const { state } = useAgent();
  const { updateCallPhase } = useRealTimeFeatures();

  const quickActions = [
    {
      id: 'send-materials',
      label: 'Send Materials',
      icon: <Send className="w-4 h-4" />,
      color: 'bg-harx-600 hover:bg-harx-700',
      action: () => console.log('Send materials'),
      enabled: state.callState.isActive
    },
    {
      id: 'schedule-followup',
      label: 'Schedule Follow-up',
      icon: <Calendar className="w-4 h-4" />,
      color: 'bg-green-600 hover:bg-green-700',
      action: () => console.log('Schedule follow-up'),
      enabled: state.callState.isActive
    },
    {
      id: 'create-summary',
      label: 'Create Summary',
      icon: <FileText className="w-4 h-4" />,
      color: 'bg-harx-alt-600 hover:bg-harx-alt-700',
      action: () => console.log('Create summary'),
      enabled: state.callState.isActive
    },
    {
      id: 'escalate-call',
      label: 'Escalate',
      icon: <Phone className="w-4 h-4" />,
      color: 'bg-orange-600 hover:bg-orange-700',
      action: () => console.log('Escalate call'),
      enabled: state.callState.isActive
    },
    {
      id: 'send-chat',
      label: 'Send Chat',
      icon: <MessageSquare className="w-4 h-4" />,
      color: 'bg-cyan-600 hover:bg-cyan-700',
      action: () => console.log('Send chat message'),
      enabled: state.callState.isActive
    },
    {
      id: 'copy-transcript',
      label: 'Copy Transcript',
      icon: <Copy className="w-4 h-4" />,
      color: 'bg-slate-600 hover:bg-slate-700',
      action: () => {
        const transcript = state.transcript.map(entry => 
          `${entry.participantId.includes('agent') ? 'Agent' : 'Customer'}: ${entry.text}`
        ).join('\n');
        navigator.clipboard.writeText(transcript);
      },
      enabled: state.transcript.length > 0
    }
  ];

  const getTransactionAction = () => {
    const goal = state.transactionIntelligence.goal;
    const score = state.transactionIntelligence.currentScore;
    
    if (!goal || !state.callState.isActive) return null;

    if (score >= 75 && state.transactionIntelligence.optimalTiming.shouldProceed) {
      return {
        id: 'proceed-transaction',
        label: `Proceed with ${goal.type}`,
        icon: <Zap className="w-4 h-4" />,
        color: 'bg-emerald-600 hover:bg-emerald-700 animate-pulse',
        action: () => console.log(`Proceed with ${goal.type}`),
        enabled: true,
        priority: true
      };
    }

    return null;
  };

  const transactionAction = getTransactionAction();

  return (
    <div className="glass-card rounded-2xl overflow-hidden shadow-2xl border border-white/5 relative group h-full flex flex-col">
      <div className="absolute top-0 right-0 w-32 h-32 bg-harx-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-harx-500/10 transition-all duration-1000"></div>
      
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-white/2 relative z-10">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-harx-500/10 rounded-xl">
             <Zap className="w-5 h-5 text-harx-500" />
          </div>
          <h3 className="text-white font-black tracking-widest uppercase">Quick Actions</h3>
        </div>
        {state.callState.isActive && (
          <div className="flex items-center space-x-2 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            <span className="text-[9px] text-emerald-400 font-black uppercase tracking-widest">Active Session</span>
          </div>
        )}
      </div>
 
      <div className="flex-1 p-3 space-y-2 relative z-10 overflow-y-auto custom-scrollbar bg-white/2">
        {/* Priority Transaction Action */}
        {transactionAction && (
          <div className="p-5 border border-emerald-500/20 bg-emerald-500/5 rounded-2xl shadow-inner animate-in zoom-in-95 duration-700 relative overflow-hidden group/priority">
            <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover/priority:opacity-100 transition-opacity"></div>
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Priority Execution</span>
              <span className="text-[10px] text-emerald-300 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/10">
                {Math.round(state.transactionIntelligence.currentScore)}% Match
              </span>
            </div>
            <button
              onClick={transactionAction.action}
              disabled={!transactionAction.enabled}
              className={`w-full flex items-center justify-center space-x-3 px-6 py-4 rounded-xl text-white font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-500 border border-emerald-400/30 shadow-xl relative z-10 ${transactionAction.color} ${
                !transactionAction.enabled ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:scale-[1.02] hover:shadow-emerald-500/30'
              }`}
            >
              <div className="p-2 bg-white/20 rounded-lg">
                {transactionAction.icon}
              </div>
              <span>{transactionAction.label}</span>
            </button>
          </div>
        )}

        {/* Standard Quick Actions Grid */}
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={action.action}
              disabled={!action.enabled}
              className={`flex flex-col items-center justify-center space-y-1 p-2 rounded-xl font-black text-[8px] uppercase tracking-widest transition-all duration-500 border relative overflow-hidden group/action ${
                !action.enabled 
                  ? 'bg-slate-800/40 text-slate-600 border-white/5 cursor-not-allowed shadow-none grayscale' 
                  : `hover:scale-[1.05] hover:-translate-y-1 shadow-xl border-white/10 ${action.color.replace('bg-harx-600', 'bg-white/5 hover:bg-white/10 text-white').replace('bg-green-600', 'bg-white/5 hover:bg-white/10 text-white').replace('bg-harx-alt-600', 'bg-white/5 hover:bg-white/10 text-white').replace('bg-orange-600', 'bg-white/5 hover:bg-white/10 text-white').replace('bg-cyan-600', 'bg-white/5 hover:bg-white/10 text-white').replace('bg-slate-600', 'bg-white/5 hover:bg-white/10 text-white')}`
              }`}
            >
              <div className={`p-3 rounded-xl transition-all duration-500 shadow-inner ${!action.enabled ? 'bg-slate-700/50' : 'bg-white/5 group-hover/action:bg-harx-500/20 group-hover/action:text-harx-400 border border-white/5'}`}>
                {action.icon}
              </div>
              <span className="relative z-10">{action.label}</span>
              {action.enabled && <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/action:opacity-100 transition-opacity"></div>}
            </button>
          ))}
        </div>

        {/* Methodology Phase Actions */}
        {state.callStructureGuidance.currentPhase && state.callState.isActive && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="flex items-center space-x-3 mb-4">
                <div className="w-1.5 h-6 bg-harx-500 rounded-full shadow-[0_0_10px_rgba(255,77,77,0.4)]"></div>
                <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Contextual Tactics</h4>
            </div>
            <div className="space-y-3">
              {state.callStructureGuidance.currentPhase.suggestedPhrases.slice(0, 2).map((phrase, index) => (
                <button
                  key={index}
                  onClick={() => navigator.clipboard.writeText(phrase)}
                  className="w-full text-left p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 hover:border-white/10 transition-all duration-300 group/phrase relative overflow-hidden"
                >
                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-xs text-slate-300 font-medium tracking-tight truncate flex-1 group-hover/phrase:text-white transition-colors italic">"{phrase}"</span>
                    <div className="p-2 bg-white/5 rounded-lg ml-3 group-hover/phrase:bg-harx-500/20 group-hover/phrase:text-harx-400 transition-all">
                        <Copy className="w-3 h-3" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* External Tools */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <div className="flex items-center space-x-3 mb-4">
              <div className="w-1.5 h-6 bg-slate-700 rounded-full"></div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ecosystem Tools</h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center space-x-3 p-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-2xl text-[10px] font-black text-slate-300 uppercase tracking-widest transition-all duration-300 shadow-inner group/tool">
              <ExternalLink className="w-4 h-4 text-slate-500 group-hover/tool:text-harx-500" />
              <span>CRM Hub</span>
            </button>
            <button className="flex items-center justify-center space-x-3 p-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-2xl text-[10px] font-black text-slate-300 uppercase tracking-widest transition-all duration-300 shadow-inner group/tool">
              <Calendar className="w-4 h-4 text-slate-500 group-hover/tool:text-harx-500" />
              <span>Planner</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
