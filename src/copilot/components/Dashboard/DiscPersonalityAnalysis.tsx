import React, { useEffect } from 'react';
import { Brain, CheckCircle, Clock, AlertTriangle, Lightbulb } from 'lucide-react';
import { useAgent } from '../../contexts/AgentContext';
import { PersonalityProfile } from '../../types';

const discTypes = [
  {
    letter: 'D',
    title: 'Dominant',
    desc: 'Direct & Results-focused',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    activeBgColor: 'bg-rose-500 text-white',
    activeBorderColor: 'border-rose-600 shadow-lg shadow-rose-500/20'
  },
  {
    letter: 'I',
    title: 'Influential',
    desc: 'People & Persuasion',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    activeBgColor: 'bg-orange-500 text-white',
    activeBorderColor: 'border-orange-600 shadow-lg shadow-orange-500/20'
  },
  {
    letter: 'S',
    title: 'Steady',
    desc: 'Stability & Support',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    activeBgColor: 'bg-emerald-500 text-white',
    activeBorderColor: 'border-emerald-600 shadow-lg shadow-emerald-500/20'
  },
  {
    letter: 'C',
    title: 'Conscientious',
    desc: 'Quality & Analysis',
    color: 'text-harx-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    activeBgColor: 'bg-harx-500 text-white',
    activeBorderColor: 'border-harx-600 shadow-lg shadow-harx-500/20'
  },
];

interface DiscPersonalityAnalysisProps {
  transcription?: string;
  context?: any[];
  callDuration?: number;
  onPersonalityDetected?: (profile: PersonalityProfile) => void;
}

const DiscPersonalityAnalysis: React.FC<DiscPersonalityAnalysisProps> = ({
  onPersonalityDetected
}) => {
  const { state } = useAgent();

  // Use transcription from state if available
  const transcription = state.transcript.map(t => t.text).join(' ');
  const personalityProfile = state.personalityProfile;
  const loading = false; // Loading state could be added to global state if needed, but for now we follow global updates
  const error = null;

  // No longer need internal triggers, handled by TranscriptionBridge
  useEffect(() => {
    if (personalityProfile) {
      onPersonalityDetected?.(personalityProfile);
    }
  }, [personalityProfile, onPersonalityDetected]);

  const getTypeStatus = (typeLetter: string) => {
    if (!personalityProfile) return 'not-identified';

    if (personalityProfile.primaryType === typeLetter) return 'primary';
    if (personalityProfile.secondaryType === typeLetter) return 'secondary';
    return 'not-identified';
  };

  const getTypeStyles = (typeLetter: string) => {
    const type = discTypes.find(t => t.letter === typeLetter);
    if (!type) return {};

    const status = getTypeStatus(typeLetter);

    switch (status) {
      case 'primary':
        return {
          bgColor: type.activeBgColor,
          borderColor: type.activeBorderColor,
          textColor: 'text-white',
          showCheck: true
        };
      case 'secondary':
        return {
          bgColor: type.bgColor,
          borderColor: type.borderColor,
          textColor: type.color,
          showCheck: true,
          opacity: 'opacity-70'
        };
      default:
        return {
          bgColor: 'bg-slate-50',
          borderColor: 'border-slate-100',
          textColor: 'text-slate-400',
          showCheck: false
        };
    }
  };

  // Indicateur de progression de l'analyse
  const getAnalysisProgress = () => {
    if (!transcription) return 0;
    const length = transcription.length;
    if (length < 30) return 0;
    if (length < 100) return 25;
    if (length < 200) return 50;
    if (length < 300) return 75;
    return 100;
  };

  return (
    <div className="glass-card rounded-2xl p-8 w-full relative overflow-hidden group bg-white/80 backdrop-blur-xl border border-pink-100/30 shadow-lg">
      <div className="absolute top-0 right-0 w-64 h-64 bg-harx-alt-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none group-hover:bg-harx-alt-500/20 transition-all duration-1000"></div>
      
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-harx-alt-50 rounded-2xl border border-harx-alt-100 shadow-sm transition-all duration-500 group-hover:shadow-md">
            <Brain className="w-6 h-6 text-harx-alt-500" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-widest uppercase">DISC Personality Analysis</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">Real-time pattern recognition engine</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-8 w-full mb-6 border border-slate-100 relative z-10 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100 shadow-sm">
               <Brain className="w-5 h-5 text-harx-alt-500" />
            </div>
            <h4 className="text-sm font-black text-slate-900 tracking-widest uppercase">DISC Profile Matrix</h4>
          </div>
          {loading && (
            <div className="flex items-center text-harx-500 text-sm font-black uppercase tracking-widest">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-harx-500 mr-2"></div>
              Analyzing...
            </div>
          )}
        </div>

        {/* Barre de progression de l'analyse */}
        <div className="mb-8">
          <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
            <span>Pattern Confidence</span>
            <span className="text-slate-900">{getAnalysisProgress()}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200 shadow-inner">
            <div
              className="bg-gradient-to-r from-harx-alt-600 to-harx-alt-400 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(var(--color-harx-alt-400),0.3)]"
              style={{ width: `${getAnalysisProgress()}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6 mb-6">
          {discTypes.map((type) => {
            const styles = getTypeStyles(type.letter);
            return (
              <div
                key={type.letter}
                className={`rounded-2xl flex flex-col items-center justify-center p-6 border transition-all duration-500 group/type ${styles.bgColor} ${styles.borderColor} ${styles.opacity || ''} ${getTypeStatus(type.letter) === 'primary' ? 'scale-105 shadow-2xl z-10' : 'hover:bg-white/5'}`}
              >
                {styles.showCheck && (
                  <div className={`absolute top-2 right-2 ${styles.textColor}`}>
                    <CheckCircle className="w-5 h-5" />
                  </div>
                )}
                <div className={`text-4xl font-black mb-3 transition-all group-hover/type:scale-110 duration-500 ${styles.textColor}`}>
                  {type.letter}
                </div>
                <div className={`text-xs font-black uppercase tracking-widest mb-2 ${styles.textColor}`}>
                  {type.title}
                </div>
                <div className="text-[10px] font-bold text-slate-500 text-center leading-tight uppercase tracking-wider">
                  {type.desc}
                </div>
                {personalityProfile && getTypeStatus(type.letter) === 'primary' && (
                  <div className="mt-2 text-xs text-slate-400">
                    {personalityProfile.confidence}% confidence
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-8 justify-center text-[9px] font-black uppercase tracking-widest mb-6">
          <span className="flex items-center gap-2 text-slate-400">
            <div className="w-2 h-2 rounded-full bg-slate-100 border border-slate-300" />
            Awaiting Signal
          </span>
          <span className="flex items-center gap-2 text-emerald-600">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
            Identified
          </span>
          <span className="flex items-center gap-2 text-slate-900">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-900 animate-pulse shadow-[0_0_8px_rgba(15,23,42,0.2)]" />
            Live Analysis
          </span>
        </div>

        {/* Analysis Status */}
        {!transcription || transcription.length < 30 ? (
          <div className="text-center text-slate-400 text-sm italic font-black uppercase tracking-widest">
            <Clock className="w-5 h-5 mx-auto mb-2 opacity-30 text-slate-300" />
            Waiting for conversation to analyze personality...
            <br />
            <span className="text-[10px] opacity-60">Minimum 30 characters required</span>
          </div>
        ) : error ? (
          <div className="text-center text-rose-600 text-sm font-black uppercase tracking-widest">
            <AlertTriangle className="w-5 h-5 mx-auto mb-2" />
            Analysis error: {error}
          </div>
        ) : personalityProfile ? (
          <div className="text-center text-emerald-600 text-sm font-black uppercase tracking-widest">
            <CheckCircle className="w-5 h-5 mx-auto mb-2" />
            Primary: {personalityProfile.primaryType} ({personalityProfile.confidence}% confidence)
            {personalityProfile.secondaryType && (
              <span className="block text-slate-400 mt-1">
                Secondary: {personalityProfile.secondaryType}
              </span>
            )}
          </div>
        ) : (
          <div className="text-center text-harx-500 text-sm font-black uppercase tracking-widest">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-harx-500 mx-auto mb-2"></div>
            Analyzing personality patterns...
            <br />
            <span className="text-[10px] text-slate-400 opacity-60 font-black">Building confidence with more conversation</span>
          </div>
        )}
      </div>

      {/* Quick Recommendations */}
      {personalityProfile && (
        <div className="bg-pink-50 rounded-2xl p-6 border border-pink-100 relative group/rec transition-all duration-500 hover:bg-pink-100/50 shadow-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-harx-alt-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          <div className="text-[10px] font-black text-harx-alt-600 uppercase tracking-[0.3em] mb-4 flex items-center">
            <Lightbulb className="w-3 h-3 mr-2" />
            Expert Communication Strategy
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-1">
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Approach</div>
              <div className="text-slate-900 text-sm font-black tracking-tight italic">"{personalityProfile.approachStrategy}"</div>
            </div>
            <div className="space-y-1">
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Style</div>
              <div className="text-slate-900 text-sm font-black tracking-tight italic">"{personalityProfile.communicationStyle}"</div>
            </div>
            {personalityProfile.recommendations.length > 0 && (
              <div className="space-y-1">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Key Tactic</div>
                <div className="text-slate-900 text-sm font-black tracking-tight italic">"{personalityProfile.recommendations[0]}"</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscPersonalityAnalysis; 
