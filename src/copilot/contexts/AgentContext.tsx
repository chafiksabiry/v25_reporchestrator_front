import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import {
  Participant,
  Lead,
  TranscriptEntry,
  PersonalityProfile,
  Recommendation,
  CallMetrics,
  CallState,
  CallStructureGuidance,
  TransactionIntelligence,
  SmartWarning,
  WarningSystemState
} from '../types';

// Add type for Twilio connection and device to avoid 'any' if possible, 
// though 'any' is used in existing hooks for simplicity
type TwilioConnection = any;
type TwilioDevice = any;

// Define the complete agent state interface matching what components expect
export interface AgentState {
  // Call state
  callState: CallState;

  // Audio and recording
  isAIListening: boolean;
  audioLevel: number;
  volume: number;
  isMicMuted: boolean;
  isSpeakerMuted: boolean;
  isSpeakerPhone: boolean;
  availableOutputDevices: MediaDeviceInfo[];
  selectedOutputDeviceId: string | null;
  mediaStream: MediaStream | null;
  twilioConnection: TwilioConnection | null;
  twilioDevice: TwilioDevice | null;

  // Transcript and conversation
  transcript: TranscriptEntry[];

  // Personality and insights
  personalityProfile?: PersonalityProfile;

  // Recommendations and guidance
  recommendations: Recommendation[];

  // Call metrics and performance
  callMetrics: CallMetrics;

  // Call structure and methodology guidance
  callStructureGuidance: CallStructureGuidance;

  // Transaction intelligence
  transactionIntelligence: TransactionIntelligence;

  // Smart warning system
  smartWarnings: SmartWarning[];
  warningSystem: WarningSystemState;

  // External workspace iframe state
  isIframeOpen: boolean;
}

// Define action types
export type AgentAction =
  | { type: 'START_CALL'; participants: Participant[]; contact?: Lead; sid?: string }
  | { type: 'END_CALL' }
  | { type: 'SET_RECORDING_URL'; url: string }
  | { type: 'TOGGLE_RECORDING'; payload?: boolean }
  | { type: 'UPDATE_CALL_STATE'; callState: Partial<CallState> }
  | { type: 'TOGGLE_AI_LISTENING' }
  | { type: 'UPDATE_AUDIO_LEVEL'; level: number }
  | { type: 'UPDATE_VOLUME'; volume: number }
  | { type: 'TOGGLE_MIC' }
  | { type: 'TOGGLE_SPEAKER' }
  | { type: 'TOGGLE_OUTPUT_MODE' }
  | { type: 'SET_OUTPUT_DEVICES'; devices: MediaDeviceInfo[] }
  | { type: 'SELECT_OUTPUT_DEVICE'; deviceId: string }
  | { type: 'SET_MEDIA_STREAM'; mediaStream: MediaStream | null }
  | { type: 'SET_TWILIO_CONNECTION'; connection: TwilioConnection; device: TwilioDevice }
  | { type: 'CLEAR_TWILIO_CONNECTION' }
  | { type: 'SET_MIC_MUTE'; muted: boolean }
  | { type: 'ADD_TRANSCRIPT_ENTRY'; entry: TranscriptEntry }
  | { type: 'UPDATE_PERSONALITY_PROFILE'; profile: PersonalityProfile }
  | { type: 'ADD_RECOMMENDATION'; recommendation: Recommendation }
  | { type: 'DISMISS_RECOMMENDATION'; id: string }
  | { type: 'UPDATE_CALL_METRICS'; metrics: Partial<CallMetrics> }
  | { type: 'UPDATE_CALL_STRUCTURE_GUIDANCE'; guidance: Partial<CallStructureGuidance> }
  | { type: 'UPDATE_TRANSACTION_INTELLIGENCE'; intelligence: Partial<TransactionIntelligence> }
  | { type: 'SET_TRANSACTION_GOAL'; goal: any }
  | { type: 'ADD_SMART_WARNING'; warning: SmartWarning }
  | { type: 'RESOLVE_WARNING'; warningId: string }
  | { type: 'UPDATE_WARNING_SYSTEM'; state: Partial<WarningSystemState> }
  | { type: 'TOGGLE_IFRAME'; payload?: boolean };

// Initial state
const initialState: AgentState = {
  callState: {
    isActive: false,
    isRecording: false,
    participants: [],
    currentPhase: 'greeting',
    recordingUrl: null
  },
  isAIListening: false,
  audioLevel: 0,
  volume: 1,
  isMicMuted: false,
  isSpeakerMuted: false,
  isSpeakerPhone: true,
  availableOutputDevices: [],
  selectedOutputDeviceId: 'default',
  mediaStream: null,
  twilioConnection: null,
  twilioDevice: null,
  transcript: [],
  recommendations: [],
  callMetrics: {
    duration: 0,
    clarity: 0,
    empathy: 0,
    assertiveness: 0,
    efficiency: 0,
    overallScore: 0
  },
  callStructureGuidance: {
    phaseProgress: 0,
    deviationAlerts: [],
    completedObjectives: [],
    missedOpportunities: []
  },
  transactionIntelligence: {
    currentScore: 0,
    readinessSignals: [],
    barriers: [],
    opportunities: [],
    nextBestActions: [],
    optimalTiming: {
      shouldProceed: false,
      reason: 'Insufficient data'
    },
    progressToGoal: 0,
    riskFactors: [],
    confidenceLevel: 0
  },
  smartWarnings: [],
  warningSystem: {
    activeWarnings: [],
    warningHistory: [],
    systemStatus: 'active',
    lastCheck: new Date(),
    sensitivity: 'medium',
    autoResolutionEnabled: false
  },
  isIframeOpen: false
};

// Reducer function
function agentReducer(state: AgentState, action: AgentAction): AgentState {
  switch (action.type) {
    case 'TOGGLE_IFRAME':
      return {
        ...state,
        isIframeOpen: action.payload !== undefined ? action.payload : !state.isIframeOpen
      };

    case 'START_CALL':
      return {
        ...state,
        callState: {
          ...state.callState,
          isActive: true,
          isRecording: true,
          startTime: new Date(),
          participants: action.participants,
          contact: action.contact,
          sid: action.sid
        },
        transcript: [],
        recommendations: []
      };

    case 'END_CALL':
      return {
        ...state,
        callState: {
          ...state.callState,
          isActive: false,
          isRecording: false,
          startTime: undefined,
          participants: [],
          contact: undefined
        },
        isAIListening: false,
        audioLevel: 0
      };

    case 'TOGGLE_RECORDING':
      return {
        ...state,
        callState: {
          ...state.callState,
          isRecording: action.payload !== undefined ? action.payload : !state.callState.isRecording
        }
      };

    case 'SET_RECORDING_URL':
      return {
        ...state,
        callState: {
          ...state.callState,
          recordingUrl: action.url
        }
      };

    case 'UPDATE_CALL_STATE':
      return {
        ...state,
        callState: {
          ...state.callState,
          ...action.callState
        }
      };

    case 'TOGGLE_AI_LISTENING':
      return {
        ...state,
        isAIListening: !state.isAIListening
      };

    case 'UPDATE_AUDIO_LEVEL':
      return {
        ...state,
        audioLevel: action.level
      };

    case 'UPDATE_VOLUME':
      return {
        ...state,
        volume: action.volume
      };

    case 'TOGGLE_MIC':
      return {
        ...state,
        isMicMuted: !state.isMicMuted
      };

    case 'TOGGLE_SPEAKER':
      return {
        ...state,
        isSpeakerMuted: !state.isSpeakerMuted
      };

    case 'TOGGLE_OUTPUT_MODE':
      const newIsSpeaker = !state.isSpeakerPhone;
      let newDeviceId = 'default';
      
      const speakerKeywords = ['speaker', 'haut-parleur', 'internal', 'built-in', 'interne', 'realtek', 'haut parleur'];
      const headsetKeywords = ['headset', 'casque', 'ear', 'headphones', 'écouteurs', 'hands-free', 'bluetooth', 'airpods'];

      if (newIsSpeaker) {
        // Switch to speaker: find device with speaker keywords AND NO headset keywords, ignore 'default' and 'communications'
        let speaker = state.availableOutputDevices.find(d => 
          d.deviceId !== 'default' && d.deviceId !== 'communications' &&
          speakerKeywords.some(k => d.label.toLowerCase().includes(k)) &&
          !headsetKeywords.some(k => d.label.toLowerCase().includes(k))
        );
        
        // Fallback 1: any device that is not 'default', 'communications', and doesn't have headset keywords
        if (!speaker) {
          speaker = state.availableOutputDevices.find(d => 
            d.deviceId !== 'default' && d.deviceId !== 'communications' &&
            !headsetKeywords.some(k => d.label.toLowerCase().includes(k))
          );
        }

        // Fallback 2: just the first device that isn't default/communications
        if (!speaker) {
          speaker = state.availableOutputDevices.find(d => 
            d.deviceId !== 'default' && d.deviceId !== 'communications'
          );
        }
        
        newDeviceId = speaker?.deviceId || 'default';
      } else {
        // Switch to headset/earpiece
        let headset = state.availableOutputDevices.find(d => 
          d.deviceId !== 'default' && d.deviceId !== 'communications' &&
          headsetKeywords.some(k => d.label.toLowerCase().includes(k))
        );

        // Fallback 1: use 'default' or 'communications' if they indicate headset
        if (!headset) {
          headset = state.availableOutputDevices.find(d => 
            headsetKeywords.some(k => d.label.toLowerCase().includes(k))
          );
        }

        // Fallback 2: first available that isn't speaker
        if (!headset) {
          headset = state.availableOutputDevices.find(d => 
            d.deviceId !== 'default' && d.deviceId !== 'communications' &&
            !speakerKeywords.some(k => d.label.toLowerCase().includes(k))
          );
        }
        
        newDeviceId = headset?.deviceId || 'default';
      }

      console.log(`🔌 Switching output mode: ${newIsSpeaker ? 'Speaker' : 'Headset'} (Device ID: ${newDeviceId})`);

      return {
        ...state,
        isSpeakerPhone: newIsSpeaker,
        selectedOutputDeviceId: newDeviceId
      };

    case 'SET_OUTPUT_DEVICES':
      return {
        ...state,
        availableOutputDevices: action.devices
      };

    case 'SELECT_OUTPUT_DEVICE':
      return {
        ...state,
        selectedOutputDeviceId: action.deviceId
      };

    case 'SET_MEDIA_STREAM':
      return {
        ...state,
        mediaStream: action.mediaStream
      };

    case 'SET_TWILIO_CONNECTION':
      return {
        ...state,
        twilioConnection: action.connection,
        twilioDevice: action.device
      };

    case 'CLEAR_TWILIO_CONNECTION':
      return {
        ...state,
        twilioConnection: null,
        twilioDevice: null
      };

    case 'SET_MIC_MUTE':
      return {
        ...state,
        isMicMuted: action.muted
      };

    case 'ADD_TRANSCRIPT_ENTRY':
      return {
        ...state,
        transcript: [...state.transcript, action.entry],
        callMetrics: {
          ...state.callMetrics,
          duration: state.callState.startTime ?
            Date.now() - state.callState.startTime.getTime() : 0
        }
      };

    case 'UPDATE_PERSONALITY_PROFILE':
      return {
        ...state,
        personalityProfile: action.profile
      };

    case 'ADD_RECOMMENDATION':
      return {
        ...state,
        recommendations: [...state.recommendations, action.recommendation]
      };

    case 'DISMISS_RECOMMENDATION':
      return {
        ...state,
        recommendations: state.recommendations.map(rec =>
          rec.id === action.id ? { ...rec, dismissed: true } : rec
        )
      };

    case 'UPDATE_CALL_METRICS':
      return {
        ...state,
        callMetrics: {
          ...state.callMetrics,
          ...action.metrics
        }
      };

    case 'UPDATE_CALL_STRUCTURE_GUIDANCE':
      return {
        ...state,
        callStructureGuidance: {
          ...state.callStructureGuidance,
          ...action.guidance
        }
      };

    case 'UPDATE_TRANSACTION_INTELLIGENCE':
      return {
        ...state,
        transactionIntelligence: {
          ...state.transactionIntelligence,
          ...action.intelligence
        }
      };

    case 'SET_TRANSACTION_GOAL':
      return {
        ...state,
        transactionIntelligence: {
          ...state.transactionIntelligence,
          goal: action.goal
        }
      };

    case 'ADD_SMART_WARNING':
      return {
        ...state,
        smartWarnings: [...state.smartWarnings, action.warning],
        warningSystem: {
          ...state.warningSystem,
          activeWarnings: [...state.warningSystem.activeWarnings, action.warning]
        }
      };

    case 'RESOLVE_WARNING':
      return {
        ...state,
        smartWarnings: state.smartWarnings.map(warning =>
          warning.id === action.warningId
            ? { ...warning, resolved: true, resolvedAt: new Date() }
            : warning
        ),
        warningSystem: {
          ...state.warningSystem,
          activeWarnings: state.warningSystem.activeWarnings.filter(w => w.id !== action.warningId)
        }
      };

    case 'UPDATE_WARNING_SYSTEM':
      return {
        ...state,
        warningSystem: {
          ...state.warningSystem,
          ...action.state
        }
      };

    default:
      return state;
  }
}

// Create context
const AgentContext = createContext<{
  state: AgentState;
  dispatch: React.Dispatch<AgentAction>;
} | undefined>(undefined);

// Provider component
export function AgentProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(agentReducer, initialState);

  // Synchronize Microphone Mute with Twilio Connection
  useEffect(() => {
    if (state.twilioConnection) {
      const applyMute = () => {
        if (typeof state.twilioConnection.mute === 'function') {
          state.twilioConnection.mute(state.isMicMuted);
          console.log(`🎤 Twilio Microphone synchronized: ${state.isMicMuted ? 'Muted' : 'Unmuted'}`);
        }
      };

      // Apply immediately and also on 'accept' just in case of race conditions
      applyMute();
      state.twilioConnection.on('accept', applyMute);
      
      return () => {
        if (state.twilioConnection) {
          state.twilioConnection.off('accept', applyMute);
        }
      };
    }
  }, [state.isMicMuted, state.twilioConnection]);

  // Synchronize Speaker Mute with Audio Element
  useEffect(() => {
    const remoteAudio = document.getElementById('call-audio') as HTMLAudioElement;
    if (remoteAudio) {
      remoteAudio.muted = state.isSpeakerMuted;
      console.log(`🔊 Speaker synchronized: ${state.isSpeakerMuted ? 'Muted' : 'Unmuted'}`);
    }
  }, [state.isSpeakerMuted]);

  // Synchronize Volume with Audio Element
  useEffect(() => {
    const applyVolume = () => {
      // Find all audio and video elements (Twilio sometimes uses video tags for WebRTC audio, or handles them dynamically)
      const mediaElements = document.querySelectorAll('audio, video');
      mediaElements.forEach((el) => {
        if (el instanceof HTMLMediaElement) {
          el.volume = state.volume;
        }
      });
    };

    // Apply immediately when volume changes
    applyVolume();

    // Since Twilio Voice SDK creates its media elements dynamically when a call is accepted
    // and might recreate them, we use an interval to ensure the volume is strictly enforced.
    // This is performant because there are usually < 5 media elements on a page.
    const interval = setInterval(applyVolume, 300);

    return () => clearInterval(interval);
  }, [state.volume]);

  // Enumerate output devices on mount
  useEffect(() => {
    const getDevices = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
          dispatch({ type: 'SET_OUTPUT_DEVICES', devices: audioOutputs });
          console.log('🔈 Available output devices:', audioOutputs.length);
        }
      } catch (err) {
        console.error('Error enumerating devices:', err);
      }
    };

    getDevices();
    
    // Listen for device changes
    navigator.mediaDevices?.addEventListener?.('devicechange', getDevices);
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', getDevices);
  }, []);

  // Apply selected output device to audio element
  useEffect(() => {
    const applyOutputDevice = async () => {
      const remoteAudio = document.getElementById('call-audio') as any;
      if (remoteAudio && state.selectedOutputDeviceId && remoteAudio.setSinkId) {
        try {
          await remoteAudio.setSinkId(state.selectedOutputDeviceId);
          console.log('🔌 Audio output switched to:', state.selectedOutputDeviceId);
        } catch (err) {
          console.error('Failed to set audio output device:', err);
        }
      }
      
      // Also update Twilio Device if available
      if (state.twilioDevice && state.twilioDevice.audio && state.selectedOutputDeviceId) {
        try {
          state.twilioDevice.audio.speakerDevices.set([state.selectedOutputDeviceId]);
        } catch (err) {
          console.warn('Twilio speaker set warning:', err);
        }
      }
    };

    applyOutputDevice();
  }, [state.selectedOutputDeviceId, state.twilioDevice]);

  return (
    <AgentContext.Provider value={{ state, dispatch }}>
      {children}
    </AgentContext.Provider>
  );
}

// Custom hook to use the agent context
export function useAgent() {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error('useAgent must be used within an AgentProvider');
  }
  return context;
}
