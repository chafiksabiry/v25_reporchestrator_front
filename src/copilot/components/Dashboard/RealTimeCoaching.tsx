import React from 'react';
import { useTranscription } from '../../contexts/TranscriptionContext';
import { Sparkles, Brain, Activity, ShieldCheck, Target, ChevronRight } from 'lucide-react';

export const RealTimeCoaching: React.FC = () => {
    const { currentPhase, nextStepSuggestion, analysisConfidence, isActive } = useTranscription();

    if (!isActive && !nextStepSuggestion) {
        return null;
    }

    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-blue-100 shadow-xl shadow-blue-500/5 overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-top-4 duration-700">
            {/* Header with Vertex Branding */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-blue-50/50 bg-gradient-to-r from-blue-50/50 to-transparent">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="absolute inset-0 bg-blue-500/20 blur-lg rounded-full animate-pulse"></div>
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 relative z-10">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Vertex AI Voice</h3>
                            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-600 text-[8px] font-black text-white rounded-full uppercase tracking-widest shadow-sm">
                                <Activity className="w-2.5 h-2.5 animate-pulse" />
                                Real-time
                            </span>
                        </div>
                        <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] mt-0.5">Live Coaching & Analysis</p>
                    </div>
                </div>
                
                {analysisConfidence > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-blue-100 shadow-sm">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Confidence</span>
                        <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-blue-500 transition-all duration-1000 ease-out" 
                                style={{ width: `${analysisConfidence * 100}%` }}
                            ></div>
                        </div>
                        <span className="text-[10px] font-black text-blue-600">{Math.round(analysisConfidence * 100)}%</span>
                    </div>
                )}
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Detected Phase Column */}
                <div className="md:col-span-4 space-y-4">
                    <div className="flex items-center gap-2 px-1">
                        <Target className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Active Phase</span>
                    </div>
                    <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-100 rounded-2xl p-4 shadow-sm relative group cursor-default">
                        <div className="flex flex-col gap-1">
                            <span className="text-xl font-black text-gray-900 tracking-tight leading-none mb-1">
                                {currentPhase || 'Discovery'}
                            </span>
                            <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div key={i} className={`h-1 w-3 rounded-full ${i <= 2 ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
                                    ))}
                                </div>
                                <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">On Track</span>
                            </div>
                        </div>
                        <div className="absolute top-4 right-4 p-2 bg-blue-50 rounded-lg text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ShieldCheck className="w-4 h-4" />
                        </div>
                    </div>
                </div>

                {/* Next Step Column */}
                <div className="md:col-span-8 space-y-4">
                    <div className="flex items-center gap-2 px-1">
                        <Brain className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Vertex Next-Best-Action</span>
                    </div>
                    
                    {nextStepSuggestion ? (
                        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100/50 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors"></div>
                            
                            <div className="relative z-10 space-y-4">
                                <p className="text-lg font-bold text-indigo-900 leading-relaxed italic">
                                    "{nextStepSuggestion}"
                                </p>
                                
                                <div className="flex items-center gap-3 pt-2">
                                    <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 active:scale-95">
                                        Use Strategy
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                    <div className="flex -space-x-2">
                                        <div className="w-6 h-6 rounded-full border-2 border-white bg-blue-100 flex items-center justify-center text-[8px] font-black text-blue-600 translate-x-1">AI</div>
                                        <div className="w-6 h-6 rounded-full border-2 border-white bg-emerald-100 flex items-center justify-center text-[8px] font-black text-emerald-600">LIVE</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gradient-to-br from-gray-50 to-white border border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                            <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-3"></div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Gathering Context...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* AI Call Signals Footer */}
            <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Optimal Sentiment</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Structure Compliance: 94%</span>
                </div>
                <div className="flex-1"></div>
                <div className="flex items-center gap-2 px-2 py-1 bg-white rounded-lg border border-gray-100 shadow-sm">
                    <Brain className="w-3 h-3 text-indigo-400" />
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Powered by Vertex AI Engine</span>
                </div>
            </div>
        </div>
    );
};

export default RealTimeCoaching;
