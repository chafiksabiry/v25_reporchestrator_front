import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useAgent } from '../../contexts/AgentContext';
import { Device } from '@twilio/voice-sdk';
import axios from 'axios';
import { useCallStorage } from '../../hooks/useCallStorage';
import { useTranscription } from '../../contexts/TranscriptionContext';
import { useLead } from '../../hooks/useLead';
import { useAgentProfile } from '../../hooks/useAgentProfile';
import {
  Phone, Mail, Calendar, Briefcase, Mic, MicOff, Volume2, Headphones, StopCircle
} from 'lucide-react';

interface TokenResponse {
  token: string;
}

export function ContactInfo() {
  const { t } = useTranslation();
  const { storeCall } = useCallStorage();
  const { profile: agentProfile } = useAgentProfile();

  // Utiliser le contexte de transcription global
  const {
    startTranscription,
    stopTranscription
  } = useTranscription();

  const { dispatch, state } = useAgent();
  const [isRecording, setIsRecording] = useState(true);
  const isRecordingRef = useRef(true);
  const callSidRef = useRef<string | null>(null);
  // True once the call reaches conn.on('accept') — used to decide whether
  // to show the blocking "Saving…" overlay (only meaningful for real calls).
  const callReachedActiveRef = useRef(false);
  const [isCallLoading, setIsCallLoading] = useState(false);
  const [activeConnection, setActiveConnection] = useState<any>(null);
  const [, setActiveDevice] = useState<Device | null>(null);
  const [callStatus, setCallStatus] = useState<string>('idle');
  const [currentCallSid, setCurrentCallSid] = useState<string | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [transactionOccurred, setTransactionOccurred] = useState<boolean | null>(null);
  const transactionOccurredRef = useRef<boolean | null>(null);
  const [isVoicemail, setIsVoicemail] = useState<boolean>(false);
  const isVoicemailRef = useRef<boolean>(false);
  const [appointmentAt, setAppointmentAt] = useState<string | null>(null);
  const [callbackAt, setCallbackAt] = useState<string | null>(null);
  const [showSchedulerPopover, setShowSchedulerPopover] = useState<boolean>(false);
  const [schedulerType, setSchedulerType] = useState<'appointment' | 'callback' | null>(null);
  const appointmentAtRef = useRef<string | null>(null);
  const callbackAtRef = useRef<string | null>(null);

  useEffect(() => {
    transactionOccurredRef.current = transactionOccurred;
  }, [transactionOccurred]);

  useEffect(() => {
    isVoicemailRef.current = isVoicemail;
  }, [isVoicemail]);

  useEffect(() => {
    appointmentAtRef.current = appointmentAt;
  }, [appointmentAt]);

  useEffect(() => {
    callbackAtRef.current = callbackAt;
  }, [callbackAt]);

  // `showCallSummary` / `lastCallDetails` (the inline "Journal de l'appel"
  // banner) were removed — the rep is now auto-navigated to the Call
  // History tab and the call-details modal opens automatically.
  // Blocks the workspace UI while the call is being persisted to the DB so
  // the rep cannot navigate away mid-save (storing a recorded call takes
  // ~7s for Twilio to finalise the recording). Once the save resolves we
  // dispatch `harx:call-saved` and the parent workspace switches to the
  // Call History tab + auto-opens the just-saved call's modal.
  const [isSaving, setIsSaving] = useState(false);

  const handleToggleMic = () => {
    dispatch({ type: 'TOGGLE_MIC' });
  };

  const handleToggleSpeaker = () => {
    dispatch({ type: 'TOGGLE_OUTPUT_MODE' });
  };
  
  const handleToggleRecording = () => {
    const newVal = !isRecording;
    setIsRecording(newVal);
    isRecordingRef.current = newVal;
    dispatch({ type: 'TOGGLE_RECORDING', payload: newVal });
  };

  // Synchronize ref with global state
  useEffect(() => {
    isRecordingRef.current = state.callState.isRecording;
  }, [state.callState.isRecording]);

  // Get leadId from URL
  const searchParams = new URLSearchParams(window.location.search);
  const leadId = searchParams.get('leadId') || sessionStorage.getItem('activeLeadId');

  // Use the hook to fetch lead data
  const { lead: apiLead, loading: leadLoading, error: leadError } = useLead(leadId);

  // Populated gig data from lead
  const gig = apiLead?.gigId;


  // Map ApiLead to the contact format expected by the component
  const contact = apiLead ? {
    id: apiLead._id,
    name: apiLead.name || (apiLead.First_Name || apiLead.Last_Name ? `${apiLead.First_Name || ''} ${apiLead.Last_Name || ''}`.trim() : 'Unknown Lead'),
    email: apiLead.email || apiLead.Email_1 || 'No email',
    phone: apiLead.phone || apiLead.Phone || '',
    company: apiLead.company || apiLead.companyId || 'Unknown Company',
    title: apiLead.title || apiLead.Activity_Tag || 'Prospect',
    avatar: apiLead.avatar || '',
    status: (apiLead.status || 'qualified') as 'qualified',
    source: (apiLead.source || 'CRM') as 'website',
    priority: (apiLead.priority || 'high') as 'high',
    lastContact: apiLead.Last_Activity_Time ? new Date(apiLead.Last_Activity_Time) : new Date(),
    nextFollowUp: apiLead.nextFollowUp ? new Date(apiLead.nextFollowUp) : new Date(Date.now() + 86400000),
    notes: apiLead.notes || apiLead.Stage || 'No notes available',
    tags: [apiLead.Pipeline || 'Standard'],
    value: apiLead.value || 0,
    assignedAgent: apiLead.assignedTo?.personalInfo?.name || agentProfile?.personalInfo?.name || 'Agent',
    timezone: apiLead.timezone || 'UTC',
    preferredContactMethod: (apiLead.preferredContactMethod || 'phone') as 'phone',
    socialProfiles: apiLead.socialProfiles || { linkedin: '', twitter: '' },
    leadScore: apiLead.leadScore || 50,
    interests: apiLead.interests || [],
    painPoints: apiLead.painPoints || [],
    budget: apiLead.budget || { min: 0, max: 0, currency: 'USD' },
    timeline: apiLead.timeline || '',
    decisionMakers: apiLead.decisionMakers || [],
    competitors: apiLead.competitors || [],
    previousInteractions: apiLead.previousInteractions || []
  } : {
    id: '65d7f6a9e8f3e4a5c6d1e456',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@techcorp.com',
    phone: '',
    company: 'TechCorp Solutions',
    title: 'VP of Operations',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    status: 'qualified' as 'qualified',
    source: 'website' as 'website',
    priority: 'high' as 'high',
    lastContact: new Date(Date.now() - 86400000 * 3), // 3 days ago
    nextFollowUp: new Date(Date.now() + 86400000), // Tomorrow
    notes: 'Interested in enterprise solution. Budget approved. Decision maker identified.',
    tags: ['Enterprise', 'Hot Lead', 'Q4 Target'],
    value: 75000,
    assignedAgent: 'Agent Smith',
    timezone: 'EST',
    preferredContactMethod: 'phone' as 'phone',
    socialProfiles: {
      linkedin: 'https://linkedin.com/in/sarahjohnson',
      twitter: 'https://twitter.com/sarahj'
    },
    leadScore: 85,
    interests: ['Automation', 'Cost Reduction', 'Scalability'],
    painPoints: ['Manual processes', 'High operational costs', 'Limited scalability'],
    budget: {
      min: 50000,
      max: 100000,
      currency: 'USD'
    },
    timeline: 'Q4 2024',
    decisionMakers: ['Sarah Johnson (VP Operations)', 'Mike Chen (CTO)', 'Lisa Rodriguez (CFO)'],
    competitors: ['CompetitorA', 'CompetitorB'],
    previousInteractions: [
      {
        date: new Date(Date.now() - 86400000 * 7),
        type: 'email',
        outcome: 'Positive response',
        notes: 'Expressed interest in demo'
      },
      {
        date: new Date(Date.now() - 86400000 * 14),
        type: 'call',
        outcome: 'Qualified lead',
        notes: 'Budget confirmed, timeline established'
      }
    ] as { date: Date; type: 'call' | 'email' | 'meeting' | 'demo'; outcome: string; notes: string; }[]
  };

  const maskPhone = (phone: string) => {
    if (!phone) return '';
    const cleanPhone = phone.replace(/\s+/g, '');
    if (cleanPhone.startsWith('+')) {
      return `${cleanPhone.substring(0, 5)}...`;
    }
    return `+${cleanPhone.substring(0, 4)}...`;
  };


  // Debug: Log contact data whenever it changes
  /*  console.log("Contact data:", contact);
   console.log("Contact phone:", contact.phone);
   console.log("Call status:", callStatus); */

  const initiateTwilioCall = async () => {
    setTransactionOccurred(null);
    setIsVoicemail(false);
    setAppointmentAt(null);
    setCallbackAt(null);
    setShowSchedulerPopover(false);
    setSchedulerType(null);
    /*  console.log("Contact phone number:", contact.phone);
     console.log("Contact object:", contact);
     console.log("Call status at start:", callStatus); */

    // Ensure we have valid contact data
    const phoneNumber = contact.phone;

    if (!phoneNumber) {
      console.error('No phone number available');
      return;
    }

    setIsCallLoading(true);
    setCallStatus('initiating');
    callReachedActiveRef.current = false;  // reset for each new call attempt
    console.log("Starting Twilio call to:", phoneNumber);

    try {
      // Get Twilio token
      const apiUrl = import.meta.env.VITE_API_URL_CALL || 'http://localhost:3000';
      const tokenUrl = `${apiUrl}/api/calls/token`;
      console.log("Fetching token from:", tokenUrl);

      const response = await axios.get<TokenResponse>(tokenUrl);
      const token = response.data.token;
      console.log("Token received:", token ? "Token exists" : "No token");

      if (!token) {
        throw new Error("No token received from server");
      }

      // Create Twilio Device
      console.log("Creating Twilio Device...");
      const newDevice = new Device(token, {
        codecPreferences: ['pcmu', 'pcma'] as any,
        edge: ['ashburn', 'dublin', 'sydney']
      });

      // Register device
      console.log("Registering device...");
      await newDevice.register();
      console.log("Device registered successfully");

      // Connect call
      console.log("Connecting call...");
      const conn = await newDevice.connect({
        params: {
          To: phoneNumber,
          LeadId: contact.id, // Pass LeadId for dynamic Caller ID resolution
          AgentId: localStorage.getItem('agentId') || '',
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
      console.log("Connection established:", conn);

      // Store active connection and device locally and globally
      setActiveConnection(conn);
      setActiveDevice(newDevice);
      dispatch({ type: 'SET_TWILIO_CONNECTION', connection: conn, device: newDevice });

      // Set up event listeners
      conn.on('connect', () => {
        const callSid = conn.parameters?.CallSid;
        console.log("CallSid from connect:", callSid);
        // For failed calls the 'accept' event never fires (remote never answers),
        // so we must store the SID here as a fallback so disconnect can save.
        if (callSid && !callSidRef.current) {
          callSidRef.current = callSid;
          setCurrentCallSid(callSid);
        }
      });

      const cleanup = () => {
        // Cleanup local stream
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => track.stop());
          localStreamRef.current = null;
        }
        // Stop transcription
        stopTranscription();
        // Clear global state
        dispatch({ type: 'SET_MEDIA_STREAM', mediaStream: null });
        dispatch({ type: 'CLEAR_TWILIO_CONNECTION' });
        dispatch({ type: 'END_CALL' });
      };

      // Register disconnect listener once.
      // This is the SINGLE source of truth for post-hangup cleanup + save.
      // We used to register a second `conn.on('disconnect')` further down
      // which caused a double-save (and inconsistent UI updates). It has
      // been removed in favour of this consolidated handler.
      conn.on('disconnect', async () => {
        console.log('🔴 Call disconnected - Starting cleanup and save');

        const sidToSave = callSidRef.current;
        const recordingStatus = isRecordingRef.current;
        const reachedActive = callReachedActiveRef.current;

        // Only show the blocking overlay when the call actually connected
        // (reached ringing/accept). If it failed before ringing (bad number,
        // immediate reject) we save silently in background — no overlay needed.
        if (reachedActive) {
          setIsSaving(true);
        }

        try {
          if (sidToSave) {
            console.log(`💾 Triggering save for SID: ${sidToSave} (Recording: ${recordingStatus})`);

            // Extract IDs for root level storage
            const gigId = (apiLead as any)?.gigId?._id || (apiLead as any)?.gigId || null;
            const companyId = (apiLead as any)?.companyId || null;

            const savedCall = await storeCall(
              sidToSave,
              contact.id,
              recordingStatus,
              gigId,
              companyId,
              transactionOccurredRef.current,
              isVoicemailRef.current,
              appointmentAtRef.current || undefined,
              callbackAtRef.current || undefined
            );
            console.log('✅ Call details saved successfully via disconnect handler');

            // Notify the parent Workspace so it can switch to the Call
            // History tab and auto-open the modal for this specific call.
            // We send the Twilio SID (always known) and, when available,
            // the Mongo _id so the modal can deep-link without a fuzzy
            // match on the records list.
            const savedCallId = (savedCall && (savedCall._id || (savedCall as any).id)) || null;
            window.dispatchEvent(
              new CustomEvent('harx:call-saved', {
                detail: {
                  sid: sidToSave,
                  callId: savedCallId,
                  leadId: contact.id,
                },
              })
            );
          } else {
            console.warn('⚠️ No SID available in Ref during disconnect');
          }
        } catch (error) {
          console.error('❌ Error saving call in disconnect handler:', error);
        } finally {
          setIsSaving(false);
          cleanup();
          setCallStatus('idle');
          setActiveConnection(null);
          setCurrentCallSid(null);
          callSidRef.current = null;
        }
      });

      conn.on('accept', () => {
        console.log("✅ Call accepted");
        callReachedActiveRef.current = true;  // call reached ringing → show overlay on disconnect
        const Sid = conn.parameters?.CallSid;
        console.log("CallSid recupéré", Sid);
        setCurrentCallSid(Sid);
        callSidRef.current = Sid; // Update ref
        setCallStatus('active');

        // Ajout : dispatcher l'action START_CALL dans le contexte global
        dispatch({
          type: 'START_CALL',
          participants: [], // tu peux mettre la vraie liste si tu l'as
          contact: contact,
          sid: Sid
        });

        // Start transcription when call is accepted
        setTimeout(async () => {
          try {
            const stream = conn.getRemoteStream();
            if (stream) {
              dispatch({ type: 'SET_MEDIA_STREAM', mediaStream: stream });

              // Attach remote stream to global call-audio element for speaker control
              const remoteAudio = document.getElementById('call-audio') as HTMLAudioElement;
              if (remoteAudio) {
                remoteAudio.srcObject = stream;
                console.log('🔊 Remote audio attached to #call-audio');
              }

              // Log de debug pour la transcription
              console.log('🌍 Starting transcription with global context');

              // NEW: Capture local microphone stream for full bidirectional transcription
              try {
                const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                localStreamRef.current = localStream;
                console.log('🎤 Local microphone captured for bidirectional transcription');
                await startTranscription(stream, contact.phone, localStream);
              } catch (micError) {
                console.warn('⚠️ Could not capture local microphone, defaulting to remote only:', micError);
                await startTranscription(stream, contact.phone);
              }

              console.log('🎤 Transcription started for call phases');
            }
          } catch (error) {
            console.error('Failed to start transcription:', error);
          }
        }, 1000);

        // Set call details in global state
        console.log('Setting call details:', { callSid: Sid, agentId: contact.id });
      });

      // NOTE: a second `conn.on('disconnect')` listener used to live here
      // and called `storeCall` again, causing a duplicate save in the
      // backend and racy UI state. The consolidated handler above is now
      // the single source of truth for post-hangup behaviour.

      conn.on('error', (error: any) => {
        console.error("Call error:", error);
        setCallStatus('idle'); // Reset to idle to allow new calls
        setActiveConnection(null);
        setActiveDevice(null);
        dispatch({ type: 'CLEAR_TWILIO_CONNECTION' });

        // Ajout : dispatch END_CALL pour mettre à jour le context global
        dispatch({ type: 'END_CALL' });
      });

    } catch (err: any) {
      console.error("Failed to initiate Twilio call:", err);
      setCallStatus('idle'); // Reset to idle on error
    } finally {
      setIsCallLoading(false);
    }
  };

  const endCall = async () => {
    console.log("Ending call...");
    console.log("Contact before ending call:", contact);
    console.log("Contact phone before ending call:", contact.phone);

    if (activeConnection) {
      activeConnection.disconnect();
    }

    // Cleanup local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Reset call-related states only
    setActiveConnection(null);
    setActiveDevice(null);
    setCallStatus('idle'); // Reset to idle instead of 'ended'
    dispatch({ type: 'SET_MEDIA_STREAM', mediaStream: null });
    dispatch({ type: 'CLEAR_TWILIO_CONNECTION' });

    // Stop transcription
    await stopTranscription();

    // REMOVED: storeCall from here because it's now handled in conn.on('disconnect')
    // to ensure it triggers for both agent and lead hangups.

    // Ajout : dispatch END_CALL pour mettre à jour le context global
    dispatch({ type: 'END_CALL' });

    console.log("Call ended. Contact after ending call:", contact);
    console.log("Contact phone after ending call:", contact.phone);
  };

  // NOTE: Voicemail is now auto-detected by Twilio AMD — no manual handler needed.

  const handleStartCall = () => {
    initiateTwilioCall();
  };




  return (
    <>
      {/* Blocking "Saving call…" overlay shown right after the rep hangs up.
          Prevents premature navigation while the recording is being
          finalised and the call document is being persisted in Mongo.
          Rendered via `createPortal` on `document.body` so it floats
          above EVERYTHING (sidebar, header, qiankun container, …).
          A simple `fixed inset-0` was being trapped inside the
          microfrontend's transformed root, which is why the overlay
          appeared inside the workspace card instead of on the whole
          viewport. */}
      {isSaving && typeof document !== 'undefined' &&
        createPortal(
          <div
            role="alertdialog"
            aria-busy="true"
            aria-live="assertive"
            aria-label={t('workspace.savingCall.title')}
            className="fixed inset-0 z-[2147483000] flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
            style={{ position: 'fixed', inset: 0 }}
          >
            <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 px-10 py-9 flex flex-col items-center gap-5 max-w-md mx-4 animate-in zoom-in-95 duration-300">
              {/* Animated halo around the icon */}
              <div className="relative">
                <span className="absolute inset-0 -m-3 rounded-full bg-rose-500/20 animate-ping" />
                <span className="absolute inset-0 -m-1.5 rounded-full bg-rose-500/30 animate-pulse" />
                <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-harx-500 to-rose-500 flex items-center justify-center shadow-xl shadow-rose-500/40">
                  <Phone className="w-7 h-7 text-white" />
                </div>
                <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
              </div>

              <div className="text-center">
                <p className="text-base font-black uppercase tracking-widest text-slate-900">
                  {t('workspace.savingCall.title')}
                </p>
                <p className="text-[12px] font-bold text-slate-500 mt-2 leading-relaxed max-w-xs mx-auto">
                  {t('workspace.savingCall.subtitle')}
                </p>
                <p className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-[9px] font-black uppercase tracking-widest text-amber-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {t('workspace.savingCall.hint')}
                </p>
              </div>

              {/* Indeterminate progress bar */}
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-gradient-to-r from-harx-500 via-rose-500 to-harx-500 rounded-full animate-[savingBar_1.4s_ease-in-out_infinite]" />
              </div>
            </div>
            {/* Tailwind doesn't ship an indeterminate bar animation, so we
                inject the keyframes inline. Scoped to the overlay so it
                doesn't leak into other components. */}
            <style>{`
              @keyframes savingBar {
                0%   { transform: translateX(-110%); }
                50%  { transform: translateX(110%); }
                100% { transform: translateX(110%); }
              }
            `}</style>
          </div>,
          document.body
        )}
      <div className="bg-white/80 border border-gray-100 backdrop-blur-md rounded-2xl shadow-sm px-5 py-3 flex flex-col mt-2 mb-2">
        <div className="flex items-center justify-between w-full">
          {/* Avatar + Infos */}
          {/* Avatar + Infos */}
          <div className="flex items-center space-x-4">
          {leadLoading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="text-gray-500 text-sm">Loading lead...</span>
            </div>
          ) : leadError ? (
            <div className="text-red-500 text-sm font-medium">Error: {leadError}</div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-gradient-harx flex items-center justify-center text-white text-xl font-bold shadow-sm shadow-harx-500/20">
                {contact.avatar ? (
                  <img src={contact.avatar} alt={contact.name} className="w-14 h-14 rounded-full object-cover" />
                ) : (
                  contact.name.split(' ').map(n => n[0]).join('')
                )}
              </div>
              <div>
                <div className="flex flex-col space-y-0.5">
                  <span className="text-lg font-black text-gray-900 tracking-tight">{contact.name}</span>
                </div>
                
                <div className="flex flex-col space-y-2 mt-2 ml-1">
                  {/* Email Section */}
                  <div className="flex items-center space-x-2 text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                    <div className="p-1 bg-blue-50 rounded-lg">
                      <Mail className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <span className="text-gray-500">{contact.email}</span>
                  </div>

                  {/* Gig Section */}
                  <div className="flex items-center space-x-2 text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                    <div className="p-1 bg-indigo-50 rounded-lg">
                      <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                    </div>
                    <span className="text-gray-500 uppercase tracking-widest">GiG ; <span className="text-indigo-600 font-black">{(gig as any)?.title || 'Standard Project'}</span></span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        {/* Bouton Start Call + Tabs */}
          <div className="flex-1 flex flex-col items-center">
          {callStatus === 'active' ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={endCall}
                  className="w-48 flex items-center justify-center space-x-2 px-3 py-2 rounded-xl font-bold text-base transition-all duration-300 shadow-md bg-red-600 hover:bg-red-700 text-white hover:-translate-y-0.5"
                >
                  <Phone className="w-4.5 h-4.5 mr-2" />
                  End Call
                </button>
                
                {/* Messagerie button removed — voicemail is auto-detected by Twilio AMD */}
              </div>
              
              {/* Transaction Outcome Buttons — hidden for voicemail / RDV / Rappel states */}
              {!isVoicemail && !appointmentAt && !callbackAt && (
                <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
                  <span className="text-[8px] font-black uppercase text-gray-400 tracking-wider px-1.5">Transaction:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTransactionOccurred(true);
                    }}
                    className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${
                      transactionOccurred === true
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-white hover:bg-gray-100 text-emerald-600 border border-emerald-100'
                    }`}
                  >
                    OK
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTransactionOccurred(false);
                    }}
                    className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${
                      transactionOccurred === false
                        ? 'bg-rose-500 text-white shadow-sm'
                        : 'bg-white hover:bg-gray-100 text-rose-600 border border-rose-100'
                    }`}
                  >
                    Refus
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={handleStartCall}
              disabled={isCallLoading || callStatus === 'initiating'}
              className={`w-48 flex items-center justify-center space-x-2 px-3 py-2 rounded-xl font-bold text-base transition-all duration-300 shadow-md hover:-translate-y-0.5
                  ${isCallLoading || callStatus === 'initiating' ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' : 'bg-gradient-harx text-white shadow-harx-500/20 active:scale-95'}`}
            >
              <Phone className="w-4 h-4 mr-2" />
              {isCallLoading || callStatus === 'initiating' ? '...' : 'Call'}
            </button>
          )}

          <div className="flex items-center space-x-2 text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-3 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100" title="Secure Line">
            <div className="p-1 bg-cyan-100 rounded-lg">
              <Phone className="w-3 h-3 text-cyan-600" />
            </div>
            <span className="text-gray-600">{maskPhone(contact.phone)}</span>
          </div>

        </div >
        {/* Actions à droite */}
        {/* Calendar/Scheduler Action */}
        <div className="flex items-center space-x-3 bg-gray-50/50 p-2 rounded-2xl border border-gray-100">
          {/* Mute Toggle */}
          <button 
            onClick={handleToggleMic}
            className={`p-2.5 rounded-xl border transition-all shadow-sm ${state.isMicMuted ? 'bg-rose-500 text-white border-rose-600' : 'bg-white text-emerald-500 hover:bg-emerald-50 border-emerald-100'}`}
            title={state.isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {state.isMicMuted ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
          </button>

          {/* Speaker Toggle */}
          <button 
            onClick={handleToggleSpeaker}
            className={`p-2.5 rounded-xl border transition-all shadow-sm ${!state.isSpeakerPhone ? 'bg-cyan-500 text-white border-cyan-600' : 'bg-white text-indigo-500 hover:bg-indigo-50 border-indigo-100'}`}
            title={state.isSpeakerPhone ? 'Switch to headset' : 'Switch to speaker'}
          >
            {!state.isSpeakerPhone ? <Headphones className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
          </button>

          {/* Recording Toggle */}
          {callStatus === 'active' && (
            <button 
              onClick={handleToggleRecording}
              className={`p-2.5 rounded-xl border transition-all shadow-sm ${state.callState.isRecording ? 'bg-emerald-500 text-white border-emerald-600 animate-pulse' : 'bg-white text-gray-400 border-gray-100'}`}
              title={state.callState.isRecording ? 'Stop recording' : 'Start recording'}
            >
              <StopCircle className={`w-4.5 h-4.5 ${state.callState.isRecording ? 'text-white' : 'text-gray-300'}`} />
            </button>
          )}

          {/* Calendar/Scheduler Action */}
          <div className="relative">
            <button 
              type="button"
              onClick={() => {
                if (callStatus === 'active') {
                  setShowSchedulerPopover(!showSchedulerPopover);
                }
              }}
              disabled={callStatus !== 'active'}
              className={`p-2.5 rounded-xl border transition-all shadow-sm ${
                callStatus !== 'active'
                  ? 'bg-white border-gray-200 text-gray-300 cursor-not-allowed opacity-50'
                  : appointmentAt || callbackAt 
                    ? 'bg-gradient-harx text-white border-harx-600 animate-pulse' 
                    : 'bg-white text-indigo-500 hover:bg-indigo-50 border-indigo-100'
              }`}
              title={callStatus === 'active' ? "Planifier un RDV ou un Rappel" : "Disponible pendant un appel"}
            >
              <Calendar className="w-4.5 h-4.5" />
            </button>

            {showSchedulerPopover && (
              <div className="absolute bottom-14 right-0 w-80 bg-white border border-gray-150 rounded-2xl shadow-xl p-4 z-[9999] animate-in slide-in-from-bottom-2 duration-200 text-gray-800">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black uppercase text-gray-900 tracking-wider">Planification</span>
                  <button 
                    type="button"
                    onClick={() => {
                      setShowSchedulerPopover(false);
                      setSchedulerType(null);
                    }} 
                    className="text-gray-400 hover:text-gray-600 text-xs font-bold"
                  >
                    Fermer
                  </button>
                </div>

                {!schedulerType ? (
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setSchedulerType('appointment')}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-gray-700 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-100 transition-all flex items-center gap-2"
                    >
                      <span>📅</span> Fixer un Rendez-vous (RDV)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSchedulerType('callback')}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-gray-700 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-100 transition-all flex items-center gap-2"
                    >
                      <span>📞</span> Planifier un Rappel
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <span className="text-[10px] font-black uppercase text-indigo-600">
                      {schedulerType === 'appointment' ? 'Date & Heure du RDV' : 'Date & Heure du Rappel'}
                    </span>
                    <input
                      type="datetime-local"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-900"
                      onChange={(e) => {
                        if (schedulerType === 'appointment') {
                          setAppointmentAt(e.target.value);
                          setCallbackAt(null);
                        } else {
                          setCallbackAt(e.target.value);
                          setAppointmentAt(null);
                        }
                        setShowSchedulerPopover(false);
                        setSchedulerType(null);
                        setTransactionOccurred(null);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setSchedulerType(null)}
                      className="text-left text-[10px] text-gray-400 hover:text-gray-600 font-bold underline"
                    >
                      Retour
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

      {/* Scheduled Status Indicator */}

      {(appointmentAt || callbackAt) && (
        <div className="w-full flex items-center justify-center mt-3 pt-3 border-t border-gray-100 animate-in fade-in duration-200 bg-white/80 border border-gray-100 backdrop-blur-md rounded-2xl py-3 px-5 shadow-sm">
          <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm border ${
            appointmentAt 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
          }`}>
            <span>{appointmentAt ? '📅 RDV fixé :' : '📞 Rappel programmé :'}</span>
            <span className="font-extrabold">{new Date(appointmentAt || callbackAt!).toLocaleString('fr-FR', {
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit'
            })}</span>
            <button
              type="button"
              onClick={() => {
                setAppointmentAt(null);
                setCallbackAt(null);
              }}
              className="ml-2 font-bold text-red-500 hover:text-red-700 underline text-[9px] uppercase tracking-wider"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* The inline "Journal de l'appel / Call Session Log" banner used
          to be rendered here right after a hangup. It was removed — the
          rep is now auto-navigated to the Call History tab where the
          full call-details modal (with AI insights) opens automatically
          via the `harx:call-saved` event dispatched from the disconnect
          handler above. */}
    </>

  );
}
