import React from 'react';
import { GraduationCap } from 'lucide-react';

const CoachingDetails: React.FC = () => (
  <div className="glass-card rounded-2xl p-8 w-full min-h-[300px] bg-white/80 backdrop-blur-xl border border-pink-100/30 shadow-lg relative overflow-hidden group">
    <div className="absolute top-0 right-0 w-64 h-64 bg-harx-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none group-hover:bg-harx-500/10 transition-all duration-1000"></div>
    <div className="text-2xl font-black text-slate-900 mb-6 tracking-tight uppercase">Real-Time Coaching</div>
    <div className="flex items-center text-harx-600 text-lg font-black uppercase tracking-widest mb-8">
      <GraduationCap className="w-6 h-6 mr-3" />
      DISC-Adaptive AI Coaching
    </div>
    <div className="flex flex-col items-center justify-center w-full mt-8 relative z-10">
      <div className="p-6 bg-slate-50 rounded-full border border-slate-100 shadow-inner mb-6 transform group-hover:scale-110 transition-transform duration-500">
        <GraduationCap className="w-16 h-16 text-slate-200" />
      </div>
      <span className="text-slate-900 text-lg font-black uppercase tracking-widest text-center">Personality Coaching Inactive</span>
      <span className="text-slate-400 text-sm font-black uppercase tracking-[0.2em] text-center mt-3 opacity-60 italic">Start a call to receive real-time, personality-based communication tactics</span>
    </div>
  </div>
);

export default CoachingDetails; 
