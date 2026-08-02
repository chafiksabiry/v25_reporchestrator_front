import React from 'react';
import { useAgent } from '../../contexts/AgentContext';
import { useCallMethodologies } from '../../hooks/useCallMethodologies';
import { MapPin, CheckCircle, Clock, ArrowRight, AlertCircle, Target, MessageSquare, FileText, Shield, Users, Handshake, ClipboardCheck, Phone } from 'lucide-react';

export function CallStructureGuide() {
  const { state } = useAgent();
  const { getCurrentMethodology, getPhaseProgress } = useCallMethodologies();

  const methodology = getCurrentMethodology();
  const guidance = state.callStructureGuidance;

  if (!state.callState.isActive || !methodology) {
    return (
      <div className="bg-slate-800 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <MapPin className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-semibold text-white">REPS Call Flow Guide</h3>
        </div>
        <div className="text-center text-slate-400 py-6">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Start a call to activate REPS methodology guidance</p>
          <p className="text-xs mt-1">9-phase structured call flow with real-time guidance</p>
        </div>
      </div>
    );
  }

  const currentPhaseIndex = methodology.phases.findIndex(p => p.id === guidance.currentPhase?.id) || 0;
  const progress = getPhaseProgress();

  const getPhaseIcon = (phaseId: string) => {
    switch (phaseId) {
      case 'context-preparation': return <ClipboardCheck className="w-4 h-4" />;
      case 'sbam-opening': return <Users className="w-4 h-4" />;
      case 'legal-compliance': return <Shield className="w-4 h-4" />;
      case 'need-discovery': return <MessageSquare className="w-4 h-4" />;
      case 'value-proposition': return <Target className="w-4 h-4" />;
      case 'documents-quote': return <FileText className="w-4 h-4" />;
      case 'objection-handling': return <AlertCircle className="w-4 h-4" />;
      case 'confirmation-closing': return <Handshake className="w-4 h-4" />;
      case 'post-call-actions': return <CheckCircle className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  const getPhaseStatus = (phaseIndex: number) => {
    if (phaseIndex < currentPhaseIndex) return 'completed';
    if (phaseIndex === currentPhaseIndex) return 'current';
    return 'upcoming';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-400/20 border-green-400/30';
      case 'current': return 'text-cyan-400 bg-cyan-400/20 border-cyan-400/30';
      case 'upcoming': return 'text-slate-400 bg-slate-400/20 border-slate-400/30';
      default: return 'text-slate-400 bg-slate-400/20 border-slate-400/30';
    }
  };

  const getPhaseColor = (phaseId: string) => {
    switch (phaseId) {
      case 'context-preparation': return 'text-harx-alt-400';
      case 'sbam-opening': return 'text-harx-400';
      case 'legal-compliance': return 'text-red-400';
      case 'need-discovery': return 'text-green-400';
      case 'value-proposition': return 'text-yellow-400';
      case 'documents-quote': return 'text-harx-400';
      case 'objection-handling': return 'text-orange-400';
      case 'confirmation-closing': return 'text-emerald-400';
      case 'post-call-actions': return 'text-cyan-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <MapPin className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-semibold text-white">REPS Call Flow Guide</h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-lg">📞</span>
          <span className="text-sm text-cyan-400 font-medium">{methodology.name}</span>
        </div>
      </div>

      {/* Current Phase Overview */}
      {guidance.currentPhase && (
        <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${getStatusColor('current')} border`}>
                <div className={getPhaseColor(guidance.currentPhase.id)}>
                  {getPhaseIcon(guidance.currentPhase.id)}
                </div>
              </div>
              <div>
                <h4 className="text-white font-medium text-lg">{guidance.currentPhase.name}</h4>
                <p className="text-sm text-slate-300">{guidance.currentPhase.description}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-2 mb-1">
                <div className="w-16 bg-slate-600 rounded-full h-2">
                  <div
                    className="bg-cyan-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-sm text-slate-300 font-medium">{Math.round(progress)}%</span>
              </div>
              <div className="text-xs text-slate-400">
                Phase {currentPhaseIndex + 1} of {methodology.phases.length}
              </div>
            </div>
          </div>
          
          {/* Current Objectives */}
          <div className="space-y-2 mb-4">
            <h5 className="text-sm font-medium text-cyan-400 flex items-center">
              <Target className="w-4 h-4 mr-1" />
              Current Objectives
            </h5>
            <div className="grid grid-cols-1 gap-2">
              {guidance.currentPhase.objectives.map((objective, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${
                    guidance.completedObjectives.includes(objective) 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : 'border-slate-500 text-slate-400'
                  }`}>
                    {guidance.completedObjectives.includes(objective) ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : (
                      <span className="text-xs font-bold">{index + 1}</span>
                    )}
                  </div>
                  <span className={`text-sm ${
                    guidance.completedObjectives.includes(objective) 
                      ? 'text-green-300 line-through' 
                      : 'text-slate-300'
                  }`}>
                    {objective}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Key Questions for Current Phase */}
          {guidance.currentPhase.keyQuestions && guidance.currentPhase.keyQuestions.length > 0 && (
            <div className="bg-slate-600/30 rounded-lg p-3 mb-4">
              <h5 className="text-sm font-medium text-yellow-400 mb-2 flex items-center">
                <MessageSquare className="w-4 h-4 mr-1" />
                Key Questions to Ask
              </h5>
              <div className="space-y-1">
                {guidance.currentPhase.keyQuestions.slice(0, 3).map((question, index) => (
                  <div key={index} className="text-sm text-slate-300 flex items-start space-x-2">
                    <span className="text-yellow-400 mt-1">•</span>
                    <span className="italic">"{question}"</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Phrases */}
          {guidance.currentPhase.suggestedPhrases && guidance.currentPhase.suggestedPhrases.length > 0 && (
            <div className="bg-harx-500/10 border border-harx-500/30 rounded-lg p-3">
              <h5 className="text-sm font-medium text-harx-400 mb-2 flex items-center">
                <Phone className="w-4 h-4 mr-1" />
                Suggested Phrases
              </h5>
              <div className="space-y-1">
                {guidance.currentPhase.suggestedPhrases.slice(0, 2).map((phrase, index) => (
                  <div key={index} className="text-sm text-harx-300 flex items-start space-x-2">
                    <span className="text-harx-400 mt-1">→</span>
                    <span className="italic">"{phrase}"</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* REPS Phase Timeline */}
      <div className="space-y-3 mb-4">
        <h4 className="text-sm font-medium text-white flex items-center">
          <Clock className="w-4 h-4 mr-2" />
          REPS Methodology Progress
        </h4>
        <div className="space-y-2">
          {methodology.phases.map((phase, index) => {
            const status = getPhaseStatus(index);
            return (
              <div key={phase.id} className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${getStatusColor(status)}`}>
                  {status === 'completed' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : status === 'current' ? (
                    <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse" />
                  ) : (
                    <div className={getPhaseColor(phase.id)}>
                      {getPhaseIcon(phase.id)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${
                      status === 'current' ? 'text-cyan-300' : 
                      status === 'completed' ? 'text-green-300' : 'text-slate-400'
                    }`}>
                      {phase.name}
                    </span>
                    {phase.duration && (
                      <span className="text-xs text-slate-500">~{phase.duration}min</span>
                    )}
                  </div>
                  {status === 'current' && (
                    <p className="text-xs text-slate-400 mt-1">{phase.description}</p>
                  )}
                  {status === 'completed' && (
                    <div className="flex items-center space-x-2 mt-1">
                      <CheckCircle className="w-3 h-3 text-green-400" />
                      <span className="text-xs text-green-400">Completed</span>
                    </div>
                  )}
                </div>
                {index < methodology.phases.length - 1 && status !== 'upcoming' && (
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Deviation Alerts */}
      {guidance.deviationAlerts.length > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mb-4">
          <h5 className="text-sm font-medium text-orange-400 mb-2 flex items-center">
            <AlertCircle className="w-4 h-4 mr-1" />
            REPS Compliance Alerts
          </h5>
          <div className="space-y-1">
            {guidance.deviationAlerts.slice(-3).map((alert, index) => (
              <p key={index} className="text-sm text-orange-300">{alert}</p>
            ))}
          </div>
        </div>
      )}

      {/* Next Phase Preview */}
      {guidance.nextPhase && (
        <div className="bg-slate-700/30 rounded-lg p-3">
          <h5 className="text-sm font-medium text-slate-300 mb-2 flex items-center">
            <ArrowRight className="w-4 h-4 mr-1" />
            Next: {guidance.nextPhase.name}
          </h5>
          <p className="text-sm text-slate-400 mb-2">{guidance.nextPhase.description}</p>
          {guidance.nextPhase.transitionTriggers.length > 0 && (
            <div className="text-xs text-slate-500">
              <span className="font-medium">Transition when: </span>
              <span>{guidance.nextPhase.transitionTriggers[0]}</span>
            </div>
          )}
        </div>
      )}

      {/* REPS Methodology Info */}
      <div className="mt-4 pt-4 border-t border-slate-700">
        <div className="text-xs text-slate-400 text-center">
          <p>REPS Call Flow: Context & Preparation → SBAM & Opening → Legal & Compliance → Need Discovery → Value Proposition → Documents/Quote → Objection Handling → Confirmation & Closing → Post-Call Actions</p>
        </div>
      </div>
    </div>
  );
}
