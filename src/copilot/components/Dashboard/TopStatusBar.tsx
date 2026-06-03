import React, { useState } from 'react';
import { PhoneOff, Brain, Volume2, MicOff, Mic, Headphones, Shield } from 'lucide-react';
import StatusCard from './StatusCard';
import { useAgent } from '../../contexts/AgentContext';

import { useAgentProfile } from '../../hooks/useAgentProfile';
import { TwilioCallService } from '../../services/twilioCallService';
import { useAudioVisualizer } from '../../hooks/useAudioVisualizer';

const TopStatusBar: React.FC = () => {
  const { state, dispatch } = useAgent();

  // Use real-time audio visualizer if stream is available
  useAudioVisualizer(state.mediaStream);
  const { profile: agentProfile } = useAgentProfile();


  const [callExpanded, setCallExpanded] = useState(false);
  const [profileExpanded, setProfileExpanded] = useState(false);

  // Mute/unmute microphone
  const handleToggleMic = () => {
    dispatch({ type: 'TOGGLE_MIC' });
  };

  // Toggle audio output mode (Speaker vs Headset)
  const handleToggleSpeaker = () => {
    dispatch({ type: 'TOGGLE_OUTPUT_MODE' });
  };

  const handleToggleRecording = async () => {
    const { sid, isRecording } = state.callState;
    const userId = localStorage.getItem('agentId') || ""; // Fetch active agent ID with fallback

    if (!sid) {
      console.error('No active call SID found for recording toggle');
      return;
    }

    try {
      if (isRecording) {
        await TwilioCallService.stopRecording(sid, userId);
        dispatch({ type: 'UPDATE_CALL_STATE', callState: { isRecording: false } });
      } else {
        await TwilioCallService.startRecording(sid, userId);
        dispatch({ type: 'UPDATE_CALL_STATE', callState: { isRecording: true } });
      }
    } catch (error) {
      console.error('Failed to toggle recording:', error);
    }
  };

  return (
    <div className="w-full max-w-[1800px] mx-auto px-2 py-2">
      <div className="grid grid-cols-4 gap-3 min-h-[110px]">
        {/* CALL CARD */}
        <StatusCard
          icon={<PhoneOff size={20} className={state.callState.isActive ? "text-white" : "text-emerald-500"} />}
          title="Call Status"
          value={state.callState.isActive
            ? <span className="text-white font-black animate-pulse">ACTIVE CALL</span>
            : <span className="text-white/60 font-bold uppercase tracking-widest text-xs">Waiting...</span>
          }
          status="info"
          className={state.callState.isActive 
            ? "bg-gradient-to-br from-emerald-500 to-teal-600 border-none shadow-lg shadow-emerald-500/20" 
            : "bg-white border-gray-100"}
          iconClassName={state.callState.isActive ? "bg-white/20 border-white/30" : "bg-emerald-50 border-emerald-100"}
          expandable
          expanded={callExpanded}
          onToggle={() => setCallExpanded(e => !e)}
        />

        {/* RECORDING CARD */}
        <div className="relative group">
          <StatusCard
            icon={<Mic size={20} className={state.callState.isRecording ? "text-white" : "text-rose-500"} />}
            title="Recording"
            value={state.callState.isRecording ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-white font-black animate-pulse">LIVE REC</span>
                  {state.callState.isActive && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleRecording();
                      }}
                      className="px-2 py-0.5 bg-white/20 text-white rounded-lg text-[8px] font-black uppercase tracking-widest border border-white/30 hover:bg-white/40 transition-all"
                    >
                      Stop
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-1 h-3 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                    ))}
                  </div>
                  <span className="text-[8px] font-bold text-white/60 uppercase tracking-widest">Capturing...</span>
                </div>
              </div>
            ) : state.callState.recordingUrl ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(state.callState.recordingUrl!, '_blank');
                }}
                className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20 transition-all flex items-center gap-1.5"
              >
                <Headphones size={12} />
                <span>Play</span>
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Stopped</span>
                  {state.callState.isActive && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleRecording();
                      }}
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-lg text-[8px] font-black uppercase tracking-widest border border-gray-200 hover:bg-gray-200 transition-all"
                    >
                      Start
                    </button>
                  )}
                </div>
              </div>
            )}
            className={state.callState.isRecording 
              ? "bg-gradient-to-br from-red-600 to-rose-700 border-none shadow-lg shadow-red-500/30" 
              : "bg-white border-gray-100"}
            iconClassName={state.callState.isRecording ? "bg-white/20 border-white/30" : "bg-rose-50 border-rose-100"}
          />
        </div>

        {/* REP PROFILE CARD - GRAYED OUT */}
        <StatusCard
          icon={<Brain size={20} className="text-gray-400" />}
          title="Rep Profile"
          value={agentProfile ? (
            <div className="flex flex-col opacity-50">
              <span className="text-gray-900 font-bold text-sm uppercase truncate">
                {agentProfile.personalInfo.name}
              </span>
              <span className="text-gray-400 text-[9px] font-bold uppercase tracking-widest truncate line-clamp-1">
                {agentProfile.professionalSummary?.currentRole || 'Sales Representative'}
              </span>
            </div>
          ) : (
            <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Loading...</span>
          )}
          className="bg-gray-50 border-gray-100 cursor-not-allowed opacity-60 grayscale"
          iconClassName="bg-gray-100 border-gray-200"
        />

        {/* AUDIO OUTPUT CARD */}
        <StatusCard
          icon={state.isSpeakerPhone ? <Volume2 size={20} className="text-cyan-500" /> : <Headphones size={20} className="text-cyan-500" />}
          title="Audio Output"
          value={
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-900 font-black text-xs uppercase">
                  {state.isSpeakerPhone ? 'Speaker' : 'Headset'}
                </span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleSpeaker();
                  }}
                  className="px-2 py-0.5 bg-cyan-50 text-cyan-600 rounded-lg text-[8px] font-black uppercase tracking-widest border border-cyan-100 hover:bg-cyan-100 transition-all"
                >
                  Switch
                </button>
              </div>
              <div 
                className="w-full flex items-center"
                onClick={(e) => e.stopPropagation()}
              >
                <Volume2 size={12} className={state.volume === 0 ? "text-gray-400 mr-2" : "text-cyan-400 mr-2"} />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={state.volume}
                  onChange={(e) => dispatch({ type: 'UPDATE_VOLUME', volume: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>
            </div>
          }
          className="bg-white border-gray-100 hover:border-cyan-200"
          iconClassName="bg-cyan-50 border-cyan-100"
        />
      </div>
      {callExpanded && (
        <div className="bg-white/80 backdrop-blur-xl border border-gray-100 rounded-3xl mt-4 p-8 w-full max-w-[1800px] mx-auto shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-xl">
                <PhoneOff size={24} className="text-emerald-500" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Call Controls & Recording</h2>
            </div>
            <button
              className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-400 hover:text-gray-900"
              onClick={() => setCallExpanded(false)}
            >
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 12H6" /></svg>
            </button>
          </div>
          <div className="grid grid-cols-3 gap-12">
            {/* Audio Controls */}
            <div className="space-y-6">
              <div className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Audio Hardware</div>
              <div className="flex space-x-3">
                <button
                  className={`flex-1 p-4 rounded-3xl transition-all flex flex-col items-center gap-3 border-2 ${state.isMicMuted ? 'bg-rose-50 border-rose-100/50 text-rose-500' : 'bg-emerald-50 border-emerald-100/50 text-emerald-600 hover:border-emerald-200 hover:bg-emerald-100/50'}`}
                  onClick={handleToggleMic}
                >
                  <div className={`p-3 rounded-2xl ${state.isMicMuted ? 'bg-rose-100' : 'bg-emerald-100 shadow-sm'}`}>
                    {state.isMicMuted ? <MicOff size={24} /> : <Mic size={24} />}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">{state.isMicMuted ? 'Muted' : 'Mic Active'}</span>
                </button>
                <button
                  className={`flex-1 p-4 rounded-3xl transition-all flex flex-col items-center gap-3 border-2 ${state.isSpeakerPhone ? 'bg-cyan-50 border-cyan-100/50 text-cyan-600' : 'bg-indigo-50 border-indigo-100/50 text-indigo-600 hover:border-indigo-200 hover:bg-indigo-100/50'}`}
                  onClick={handleToggleSpeaker}
                >
                  <div className={`p-3 rounded-2xl ${state.isSpeakerPhone ? 'bg-cyan-100' : 'bg-indigo-100 shadow-sm'}`}>
                    {state.isSpeakerPhone ? <Volume2 size={24} /> : <Headphones size={24} />}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">{state.isSpeakerPhone ? 'Speaker' : 'Headset'}</span>
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Master Volume</span>
                  <span className="text-xs font-black text-cyan-500">{Math.round(state.volume * 100)}%</span>
                </div>
                <div className="flex items-center gap-3 px-1">
                  <Volume2 size={16} className="text-cyan-400" />
                  <input
                    type="range" min="0" max="1" step="0.01" value={state.volume}
                    onChange={(e) => dispatch({ type: 'UPDATE_VOLUME', volume: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-gray-100 rounded-full appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
              </div>
            </div>
            {/* Call Status */}
            <div className="space-y-6">
              <div className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Live Connection</div>
              <div className={`h-[180px] rounded-[32px] flex flex-col items-center justify-center gap-5 border-2 border-dashed transition-all ${state.callState.isActive ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100'}`}>
                <div className={`p-5 rounded-3xl ${state.callState.isActive ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'bg-gray-200 text-gray-400'}`}>
                  <PhoneOff size={32} />
                </div>
                <span className={`text-xs font-black uppercase tracking-[0.3em] ${state.callState.isActive ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {state.callState.isActive ? 'Active Stream' : 'Offline'}
                </span>
              </div>
            </div>
            {/* Recording */}
            <div className="space-y-6">
              <div className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Data Capture</div>
              <div className="bg-gray-900 rounded-[32px] p-7 flex flex-col h-[180px] justify-between shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${state.callState.isRecording ? 'bg-rose-500 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.6)]' : 'bg-white/20'}`} />
                    <span className="text-[11px] font-black text-white/70 uppercase tracking-widest">
                      {state.callState.isRecording ? 'Capturing Audio' : 'Secure Vault'}
                    </span>
                  </div>
                  {state.callState.isActive && (
                    <button
                      onClick={handleToggleRecording}
                      className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all ${state.callState.isRecording
                        ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                        : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'}`}
                    >
                      {state.callState.isRecording ? 'Stop' : 'Start'}
                    </button>
                  )}
                </div>
                {state.callState.recordingUrl && (
                  <button
                    onClick={() => window.open(state.callState.recordingUrl!, '_blank')}
                    className="w-full bg-white text-gray-900 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-gray-50 transition-all shadow-xl active:scale-95"
                  >
                    <div className="p-1.5 bg-rose-50 rounded-lg">
                      <Headphones size={14} className="text-rose-500" />
                    </div>
                    <span>Access Recording</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {profileExpanded && agentProfile && (
        <div className="bg-white/80 backdrop-blur-xl border border-gray-100 rounded-3xl mt-4 p-8 w-full max-w-[1800px] mx-auto shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center space-x-7">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center text-4xl font-black text-white shadow-2xl shadow-indigo-500/30 transform -rotate-2 relative">
                <div className="absolute inset-0 bg-white/20 rounded-3xl mix-blend-overlay" />
                {agentProfile.personalInfo.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-4xl font-black text-gray-900 leading-tight tracking-tighter">{agentProfile.personalInfo.name}</h2>
                <div className="flex items-center gap-4 mt-3">
                  {agentProfile.professionalSummary?.currentRole && (
                    <span className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest border border-indigo-100 shadow-sm">
                      {agentProfile.professionalSummary.currentRole}
                    </span>
                  )}
                  <span className="text-gray-400 text-xs font-black uppercase tracking-wider">{agentProfile.personalInfo.email}</span>
                </div>
              </div>
            </div>
            <button
               className="p-3 hover:bg-gray-100 rounded-2xl transition-all text-gray-400 hover:text-gray-900 shadow-sm border border-gray-100"
              onClick={() => setProfileExpanded(false)}
            >
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M18 12H6" /></svg>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-10 text-gray-700">
            <div className="bg-gray-50/50 border border-gray-100 rounded-3xl p-8 transition-all hover:shadow-xl hover:bg-white group">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-50 rounded-xl group-hover:bg-indigo-100 transition-colors">
                  <Brain size={18} className="text-indigo-500" />
                </div>
                <h3 className="text-indigo-500 font-black uppercase text-[11px] tracking-[0.25em]">Expertise Summary</h3>
              </div>
              <p className="text-sm leading-relaxed text-gray-600 font-bold">
                {agentProfile.professionalSummary?.yearsOfExperience ? (
                  <>Experience: <span className="text-indigo-600 font-black">{agentProfile.professionalSummary.yearsOfExperience}</span> in high-stakes sales and strategic fulfillment architecture.</>
                ) : "Senior voice representative leveraging intelligent adaptive coaching for maximized conversion."}
              </p>
            </div>

            <div className="bg-gray-50/50 border border-gray-100 rounded-3xl p-8 transition-all hover:shadow-xl hover:bg-white group">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-50 rounded-xl group-hover:bg-emerald-100 transition-colors">
                  <Shield size={18} className="text-emerald-500" />
                </div>
                <h3 className="text-emerald-600 font-black uppercase text-[11px] tracking-[0.25em]">Identity & Network</h3>
              </div>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center group-hover:px-1 transition-all">
                  <span className="text-gray-400 font-black text-[10px] uppercase tracking-widest">Phone</span>
                  <span className="text-gray-900 font-black tracking-tight">{agentProfile.personalInfo.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center group-hover:px-1 transition-all">
                  <span className="text-gray-400 font-black text-[10px] uppercase tracking-widest">Location</span>
                  <span className="text-gray-900 font-black tracking-tight">{agentProfile.personalInfo.location || 'Remote'}</span>
                </div>
                <div className="flex justify-between items-center bg-emerald-50/50 p-2 rounded-xl border border-emerald-100/50">
                  <span className="text-emerald-700/60 font-black text-[10px] uppercase tracking-widest">Secure Uplink</span>
                  <span className="text-emerald-600 flex items-center font-black">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></span>
                    VERIFIED
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 rounded-[40px] p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] group-hover:rotate-12 group-hover:scale-110 transition-all duration-1000">
                <Brain size={160} className="text-white" />
              </div>
              <h3 className="text-indigo-400/80 font-black uppercase text-[11px] mb-8 tracking-[0.3em] relative z-10">Neural Architecture</h3>
              <div className="flex flex-col gap-6 relative z-10">
                <div className="flex items-center gap-5">
                  <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-xl border border-white/10 shadow-xl group-hover:scale-110 transition-transform">
                    <Brain size={32} className="text-indigo-300" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-white font-black text-xl uppercase tracking-tighter">REPS ACTIVE</span>
                    <span className="text-indigo-400/80 text-[10px] font-black uppercase tracking-widest">Adaptive Core V25</span>
                  </div>
                </div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 w-[85%] rounded-full animate-pulse shadow-[0_0_12px_rgba(99,102,241,0.5)]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopStatusBar; 
