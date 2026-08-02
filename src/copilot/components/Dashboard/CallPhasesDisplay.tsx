import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TranscriptionMessage } from '../../services/transcriptionService';
import { useAgent } from '../../contexts/AgentContext';
import { useTranscription } from '../../contexts/TranscriptionContext';
import { Phone } from 'lucide-react';

interface CallPhase {
  id: string;
  name: string;
  status: 'completed' | 'in-progress' | 'pending';
  startTime?: string;
  endTime?: string;
  transcript?: string;
  icon: string;
  color: string;
}

interface CallPhasesDisplayProps {
  phases?: CallPhase[];
  onPhaseClick?: (phaseId: string) => void;
  isCallActive?: boolean;
  phoneNumber?: string;
  mediaStream?: MediaStream | null;
  disableAutoScroll?: boolean;
}

export const CallPhasesDisplay: React.FC<CallPhasesDisplayProps> = ({
  phases = [],
  onPhaseClick,
  isCallActive = false,
  phoneNumber,
  mediaStream,
  disableAutoScroll = false
}) => {
  // Utiliser le contexte de transcription global
  const {
    isActive: isTranscriptionActive,
    startTranscription,
    stopTranscription,
    addTranscriptionCallback,
    removeTranscriptionCallback,
    currentPhase: aiCurrentPhase,
    nextStepSuggestion,
    analysisConfidence
  } = useTranscription();

  const [transcripts, setTranscripts] = useState<TranscriptionMessage[]>([]);
  const [currentInterimText, setCurrentInterimText] = useState('');
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(!disableAutoScroll);
  const transcriptsEndRef = useRef<HTMLDivElement>(null);
  const lastTranscriptTextRef = useRef('');
  const { dispatch } = useAgent();

  // Callback pour gérer les messages de transcription
  const handleTranscriptionMessage = useCallback((message: TranscriptionMessage) => {
    if (message.type === 'interim') {
      setCurrentInterimText(message.text);
    } else if (message.type === 'final' || message.type === 'transcript') {
      setTranscripts(prev => [...prev, message]);
      setCurrentInterimText('');
      if (message.text && message.text !== lastTranscriptTextRef.current) {
        dispatch({
          type: 'ADD_TRANSCRIPT_ENTRY', entry: {
            id: message.timestamp ? String(message.timestamp) : String(Date.now()),
            participantId: 'agent',
            text: message.text,
            timestamp: typeof message.timestamp === 'number' ? new Date(message.timestamp) : (message.timestamp || new Date()),
            confidence: message.confidence || 0,
            sentiment: 'neutral'
          }
        });
        lastTranscriptTextRef.current = message.text;
      }
    }
  }, [dispatch]);

  // Ajouter le callback quand le composant monte
  useEffect(() => {
    addTranscriptionCallback(handleTranscriptionMessage);

    // Retirer le callback quand le composant se démonte
    return () => {
      removeTranscriptionCallback(handleTranscriptionMessage);
    };
  }, [addTranscriptionCallback, removeTranscriptionCallback, handleTranscriptionMessage]);

  // Auto-scroll to bottom of transcripts (can be disabled)
  useEffect(() => {
    if (autoScrollEnabled && !disableAutoScroll) {
      transcriptsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcripts, currentInterimText, autoScrollEnabled, disableAutoScroll]);

  // Initialize transcription when call becomes active
  useEffect(() => {
    if (isCallActive && mediaStream && phoneNumber && !isTranscriptionActive) {
      console.log('🎤 Starting transcription for call phases:', phoneNumber);
      startTranscription(mediaStream, phoneNumber);
    } else if (!isCallActive && isTranscriptionActive) {
      console.log('🛑 Stopping transcription...');
      stopTranscription();
      setCurrentInterimText('');
    }
  }, [isCallActive, mediaStream, phoneNumber, isTranscriptionActive, startTranscription, stopTranscription]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isTranscriptionActive) {
        stopTranscription();
      }
    };
  }, [isTranscriptionActive, stopTranscription]);

  return (
    <div className="flex flex-col space-y-2 p-2 relative">
      <div className="flex items-center mb-6">
        <div className="p-2 bg-blue-500/10 rounded-xl mr-3">
          <span className="text-xl">🧠</span>
        </div>
        <h2 className="text-xl font-black text-white tracking-widest uppercase">REPS Call Phases</h2>
        {analysisConfidence > 0 && (
          <div className="ml-auto flex items-center bg-white/5 border border-white/10 rounded-full px-3 py-1">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              AI Confidence: <span className="text-white">{Math.round(analysisConfidence * 100)}%</span>
            </span>
          </div>
        )}
      </div>

      {/* Call Phases Section */}
      <div className="space-y-1 mb-4">
        {(() => {
          // Trouver l'index de la phase actuelle suggérée par l'IA
          const currentPhaseIndex = phases.findIndex(p =>
            p.name.toLowerCase().includes(aiCurrentPhase.toLowerCase()) ||
            aiCurrentPhase.toLowerCase().includes(p.name.toLowerCase())
          );

          // console.log(`🧭 [CallPhases] Current active phase: "${aiCurrentPhase}" | Found at index: ${currentPhaseIndex}`);

          return phases.map((phase, index) => {
            const isActive = index === currentPhaseIndex;
            const isCompleted = currentPhaseIndex > index;
            const status = isActive ? 'in-progress' : (isCompleted ? 'completed' : 'pending');

            return (
              <div key={phase.id} className="relative mb-3 group">
                <div
                  className={`p-4 rounded-2xl text-sm flex items-center justify-between cursor-pointer transition-all duration-500 shadow-sm
                  ${isActive ? 'bg-blue-500/20 border-blue-500/50 border-2 scale-[1.02] shadow-xl' : 'bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10'}
                  ${isCompleted ? 'bg-emerald-500/5' : ''}
                  relative backdrop-blur-md
                `}
                  onClick={() => onPhaseClick?.(phase.id)}
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <span className={`flex items-center justify-center w-10 h-10 mr-4 rounded-xl text-lg font-bold ${phase.color.replace(/bg-[^ ]+ /, 'bg-white/5')} border border-white/5 shadow-inner transition-transform group-hover:scale-110 duration-500`}>
                      {isCompleted ? <span className="text-emerald-400">✓</span> : phase.icon}
                    </span>
                    <span className={`font-black uppercase tracking-widest transition-colors truncate ${isActive ? 'text-white' : isCompleted ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {phase.name}
                    </span>
                  </div>
                  <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] ml-2 ${isActive ? 'bg-blue-500 text-white animate-pulse' :
                    isCompleted ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      'bg-white/5 text-slate-600 border border-white/5'
                    }`}>
                    {isActive ? 'Current Phase' : status === 'completed' ? 'Verified' : 'Pending'}
                  </span>
                </div>
              </div>
            );
          });
        })()}
      </div>

      {/* AI Suggestion Section */}
      {isCallActive && nextStepSuggestion && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6 mb-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-blue-500/20 transition-all duration-1000"></div>
          <div className="flex items-center mb-4 relative z-10">
            <div className="p-1.5 bg-blue-500/20 rounded-lg mr-3">
              <span className="text-xl">💡</span>
            </div>
            <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">AI Next Step Strategy</h3>
          </div>
          <p className="text-white text-base leading-relaxed font-bold tracking-tight relative z-10 italic">
            "{nextStepSuggestion}"
          </p>
        </div>
      )}

      {/* Live Transcription Section */}
      {isCallActive && (
        <div className="glass-card rounded-2xl p-6 transition-all border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/5 rounded-xl border border-white/10">
                <span className="text-lg">🎤</span>
              </div>
              <h3 className="text-lg font-black text-white tracking-widest uppercase">Live Insights</h3>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>
                <span className="text-[9px] text-emerald-400 font-black uppercase tracking-[0.2em]">Live Stream</span>
              </div>
              <button
                onClick={() => setAutoScrollEnabled(!autoScrollEnabled)}
                className={`ml-4 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 border ${autoScrollEnabled
                  ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20'
                  : 'bg-white/5 text-slate-500 border-white/10 hover:bg-white/10'
                  }`}
              >
                {autoScrollEnabled ? 'Scroll: Auto' : 'Scroll: Manual'}
              </button>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-5 h-72 overflow-y-auto custom-scrollbar border border-white/5 relative z-10">
            {transcripts.length === 0 && !currentInterimText ? (
              <div className="text-slate-500 text-center py-16 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 animate-pulse border border-white/5">
                  <span className="text-3xl opacity-30">🎤</span>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">Decrypting Audio Stream...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {transcripts.map((transcript, index) => (
                  <div key={index} className="flex flex-col space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="text-[9px] font-black uppercase tracking-[0.2em] flex justify-between px-2">
                       <span className="text-blue-400">Agent Intelligence</span>
                       <span className="text-slate-500">{new Date(transcript.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
                    </div>
                    <div className="text-slate-100 bg-white/5 rounded-2xl rounded-tl-none px-5 py-4 text-sm font-medium tracking-tight shadow-lg border border-white/10 backdrop-blur-xl">
                      {transcript.text}
                    </div>
                  </div>
                ))}

                {currentInterimText && (
                  <div className="flex flex-col space-y-2 animate-in fade-in duration-300">
                    <div className="text-[9px] text-indigo-400 font-black uppercase tracking-[0.2em] animate-pulse px-2 flex items-center">
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full mr-2 animate-bounce"></div>
                      Processing...
                    </div>
                    <div className="text-slate-400 bg-white/5 rounded-2xl rounded-tl-none px-5 py-4 text-sm italic font-medium tracking-tight border border-white/5 backdrop-blur-md opacity-60">
                      {currentInterimText}
                    </div>
                  </div>
                )}
                <div ref={transcriptsEndRef} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Call Not Active Message */}
      {!isCallActive && (
        <div className="glass-card rounded-3xl p-16 text-center border border-white/5 flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden group">
          <div className="absolute inset-0 bg-mesh-gradient opacity-10 group-hover:opacity-20 transition-opacity duration-1000"></div>
          <div className="w-24 h-24 rounded-2xl bg-white/5 flex items-center justify-center mb-8 shadow-2xl border border-white/10 group-hover:bg-blue-500/10 group-hover:border-blue-500/20 transition-all duration-500 relative z-10">
            <Phone className="w-12 h-12 text-slate-500 opacity-20 group-hover:text-blue-400 group-hover:opacity-100 transition-all duration-500" />
          </div>
          <h3 className="text-2xl font-black text-white mb-4 tracking-tight uppercase relative z-10">System Ready</h3>
          <p className="text-slate-500 text-sm max-w-xs leading-relaxed font-bold uppercase tracking-widest opacity-60 relative z-10">
            Awaiting active connection signal for live intelligence analysis.
          </p>
        </div>
      )}
    </div>
  );
};

