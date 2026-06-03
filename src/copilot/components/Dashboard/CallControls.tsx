import React, { useState } from 'react';
import { Device } from '@twilio/voice-sdk';
import axios from 'axios';
import { useCallStorage } from '../../hooks/useCallStorage';
import { Phone, X } from 'lucide-react';

interface CallControlsProps {
  phoneNumber?: string;
  agentId?: string;
  onCallStatusChange?: (status: string) => void;
  onCallSidChange?: (callSid: string) => void;
}

interface AIAssistantAPI {
  setCallDetails: (callSid: string, agentId: string) => void;
}

interface TokenResponse {
  token: string;
}

// Mock AIAssistantAPI - replace with actual implementation
const AIAssistantAPI: AIAssistantAPI = {
  setCallDetails: (callSid: string, agentId: string) => {
    console.log('Setting call details:', { callSid, agentId });
    // TODO: Implement actual API call
  }
};

export const CallControls: React.FC<CallControlsProps> = ({
  phoneNumber,
  agentId,
  onCallStatusChange,
  onCallSidChange
}) => {
  const { storeCall } = useCallStorage();
  const [connection, setConnection] = useState<any>(null);
  const [callStatus, setCallStatus] = useState<string>('idle');
  const [callSid, setCallSid] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  // Twilio SDK error code captured from conn.on('error') — passed to storeCall
  // so the backend can persist it alongside the call and classify it precisely.
  const [twilioErrorCode, setTwilioErrorCode] = useState<number | null>(null);

  const initiateCall = async () => {
    if (!phoneNumber || !agentId) {
      setError('Phone number and agent ID are required');
      return;
    }

    console.log("Starting call initiation...", { phoneNumber, agentId });
    
    setIsLoading(true);
    setError('');

    try {
      const apiUrl = import.meta.env.VITE_API_URL_CALL || 'http://localhost:3000';
      const tokenUrl = `${apiUrl}/api/calls/token`;
      
      const response = await axios.get<TokenResponse>(tokenUrl);
      const token = (response.data as TokenResponse).token;
      
      if (!token) {
        throw new Error("No token received from server");
      }
      
      const newDevice = new Device(token, {
        codecPreferences: ['pcmu', 'pcma'] as any,
        edge: ['ashburn', 'dublin', 'sydney']
      });
      
      await newDevice.register();
      
      const conn = await newDevice.connect({
        params: { 
          To: phoneNumber,
          MediaStream: true,
        },
        rtcConfiguration: { 
          sdpSemantics: "unified-plan",
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }
          ]
        },
        audio: {
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: true
        }
      } as any);

      setConnection(conn);
      setCallStatus("initiating");
      onCallStatusChange?.("initiating");

      newDevice.on('error', (error: any) => {
        console.error("Device error:", error);
        setError(`Device error: ${error.message}`);
        setCallStatus("error");
        onCallStatusChange?.("error");
      });

      conn.on('accept', () => {
        console.log("✅ Call accepted");
        const Sid = conn.parameters?.CallSid;
        setCallSid(Sid);
        onCallSidChange?.(Sid);
        AIAssistantAPI.setCallDetails(Sid, agentId);
        setCallStatus("active");
        onCallStatusChange?.("active");
      });

      conn.on('disconnect', async () => {
        setCallStatus("ended");
        onCallStatusChange?.("ended");
        setConnection(null);
        
        if (callSid && agentId) {
          await storeCall(callSid, agentId, undefined, undefined, undefined,
            undefined, undefined, undefined, undefined, twilioErrorCode ?? undefined);
        }
      });

      conn.on('error', (err: any) => {
        console.error("Call error:", err);
        setError(`Call error: ${err.message}`);
        setCallStatus("error");
        onCallStatusChange?.("error");
        // Capture browser-side Twilio error code (e.g. 31480 = not found / bad number)
        // as fallback if the REST API doesn't provide a server-side code.
        if (err?.code) {
          setTwilioErrorCode(Number(err.code));
        }
      });

    } catch (err: any) {
      setError(`Failed to initiate call: ${err.message}`);
      setCallStatus("error");
      onCallStatusChange?.("error");
    } finally {
      setIsLoading(false);
    }
  };

  const endCall = async () => {
    if (connection) {
      connection.disconnect();
      setConnection(null);
      setCallStatus("ended");
      onCallStatusChange?.("ended");
      
      if (callSid && agentId) {
        await storeCall(callSid, agentId, undefined, undefined, undefined,
          undefined, undefined, undefined, undefined, twilioErrorCode ?? undefined);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-emerald-400';
      case 'initiating': return 'text-amber-400';
      case 'error': return 'text-rose-400';
      case 'ended': return 'text-slate-500';
      default: return 'text-slate-500';
    }
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden shadow-2xl border border-white/5 relative group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-harx-500/5 rounded-full blur-3xl -mr-8 -mt-8 pointer-events-none group-hover:bg-harx-500/10 transition-all duration-1000"></div>
      
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-white/2 relative z-10">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-harx-500/10 rounded-xl">
             <Phone className="w-5 h-5 text-harx-500" />
          </div>
          <h2 className="text-white font-black tracking-widest uppercase">Call Controls</h2>
        </div>
        <div className="flex items-center space-x-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 shadow-inner">
            <div className={`w-2 h-2 rounded-full animate-pulse ${callStatus === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-600'}`}></div>
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${getStatusColor(callStatus)}`}>
                {callStatus}
            </span>
        </div>
      </div>

      {error && (
        <div className="m-3 p-2 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-[10px] font-black uppercase tracking-widest relative z-10 animate-in fade-in slide-in-from-top-2 duration-500">
           <span className="opacity-60 mr-2">Signal Error:</span> {error}
        </div>
      )}

      <div className="p-6 space-y-6 relative z-10 bg-white/2">
        <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-inner group/item hover:bg-white/10 transition-all">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Target Identity</label>
                <span className="text-white font-bold tracking-tight block truncate">{phoneNumber || 'Awaiting connection...'}</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-2 shadow-inner group/item hover:bg-white/10 transition-all">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Assigned Agent</label>
                <span className="text-white font-bold tracking-tight block truncate">{agentId || 'Awaiting authentication...'}</span>
            </div>
        </div>
 
        {callSid && (
          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-2 shadow-inner animate-in zoom-in-95 duration-700">
            <label className="text-[9px] font-black text-emerald-500 uppercase tracking-widest block mb-1">Twilio Session SID</label>
            <span className="text-emerald-400 font-mono text-[11px] truncate block opacity-80">{callSid}</span>
          </div>
        )}

        <div className="flex space-x-2 pt-2">
          <button
            onClick={initiateCall}
            disabled={isLoading || callStatus === 'active' || callStatus === 'initiating'}
            className={`flex-1 flex items-center justify-center space-x-2 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 shadow-xl active:scale-95 border ${
              isLoading || callStatus === 'active' || callStatus === 'initiating'
                ? 'bg-slate-800 text-slate-600 border-white/5 cursor-not-allowed shadow-none'
                : 'bg-gradient-harx text-white border-white/20 shadow-harx-500/20 hover:shadow-harx-500/40 hover:-translate-y-1'
            }`}
          >
            {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2"></div>
            ) : <Phone className="w-4 h-4 mr-2" />}
            <span>{isLoading ? 'Connecting...' : 'Start Session'}</span>
          </button>
 
          <button
            onClick={endCall}
            disabled={!connection || callStatus === 'ended'}
            className={`flex-1 flex items-center justify-center space-x-2 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 shadow-xl active:scale-95 border ${
              !connection || callStatus === 'ended'
                ? 'bg-slate-800 text-slate-600 border-white/5 cursor-not-allowed shadow-none'
                : 'bg-rose-600 text-white border-rose-500 shadow-rose-600/20 hover:bg-rose-700 hover:-translate-y-1'
            }`}
          >
            <X className="w-4 h-4 mr-2" />
            <span>End Session</span>
          </button>
        </div>
      </div>
    </div>
  );
};
