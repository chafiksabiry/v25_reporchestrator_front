import React from 'react';
import { useAgent } from '../../contexts/AgentContext';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';

export const SmartWarningSystem: React.FC = () => {
    const { state, dispatch } = useAgent();

    const resolveWarning = (id: string) => {
        dispatch({ type: 'RESOLVE_WARNING', warningId: id });
    };

    const activeWarnings = state.smartWarnings.filter(w => !w.resolved);

    if (activeWarnings.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md w-full">
            {activeWarnings.map(warning => (
                <div
                    key={warning.id}
                    className={`p-5 rounded-2xl border-2 shadow-2xl animate-in slide-in-from-right-10 duration-500 glass-morphism backdrop-blur-xl ${warning.severity === 'critical' ? 'border-red-500/50 shadow-red-500/10' :
                        warning.severity === 'high' ? 'border-orange-500/50 shadow-orange-500/10' : 'border-yellow-500/50 shadow-yellow-500/10'
                        }`}
                >
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl backdrop-blur-md shadow-sm border ${warning.severity === 'critical' ? 'bg-red-500/10 border-red-500/20' : 'bg-orange-500/10 border-orange-500/20'}`}>
                                {warning.severity === 'critical' ? (
                                    <ShieldAlert className="w-5 h-5 text-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]" />
                                ) : (
                                    <AlertTriangle className="w-5 h-5 text-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.4)]" />
                                )}
                            </div>
                            <span className="font-black text-white uppercase tracking-[0.1em] text-[13px]">
                                {warning.title}
                            </span>
                        </div>
                        <button
                            onClick={() => resolveWarning(warning.id)}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <p className="text-slate-200 text-sm mb-4 leading-relaxed font-medium px-1">
                        {warning.message}
                    </p>

                    <div className="flex gap-2">
                        {warning.suggestedActions.map((action, idx) => (
                            <button
                                key={idx}
                                onClick={() => resolveWarning(warning.id)}
                                className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest rounded-full transition-all border border-white/10 active:scale-95 shadow-sm"
                            >
                                {action}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SmartWarningSystem;

