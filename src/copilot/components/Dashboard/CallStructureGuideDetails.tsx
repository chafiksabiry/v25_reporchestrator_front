import React from 'react';
import { MapPin, FileText } from 'lucide-react';

const CallStructureGuideDetails: React.FC = () => (
  <div className="glass-card rounded-2xl p-8 w-full min-h-[300px] bg-white/80 backdrop-blur-xl border border-pink-100/30 shadow-lg relative overflow-hidden group">
    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none group-hover:bg-cyan-500/10 transition-all duration-1000"></div>
    <div className="text-2xl font-black text-slate-900 mb-6 tracking-tight uppercase">Call Structure Guide</div>
    <div className="flex items-center text-cyan-600 text-lg font-black uppercase tracking-widest mb-8">
      <MapPin className="w-6 h-6 mr-3" />
      REPS Call Flow Analysis
    </div>
    <div className="flex flex-col items-center justify-center w-full mt-8 relative z-10">
      <div className="p-6 bg-slate-50 rounded-full border border-slate-100 shadow-inner mb-6 transform group-hover:scale-110 transition-transform duration-500">
        <FileText className="w-16 h-16 text-slate-200" />
      </div>
      <span className="text-slate-900 text-lg font-black uppercase tracking-widest text-center">Activate REPS Methodology Guidance</span>
      <span className="text-slate-400 text-sm font-black uppercase tracking-[0.2em] text-center mt-3 opacity-60 italic">9-phase structured call flow with real-time AI guidance engine</span>
    </div>
  </div>
);

export default CallStructureGuideDetails; 
