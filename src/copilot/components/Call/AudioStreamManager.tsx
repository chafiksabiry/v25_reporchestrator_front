import { useEffect, useRef } from 'react';
import { useAgent } from '../../contexts/AgentContext';

interface AudioStreamProps {
  callId: string | null;
}

export const AudioStreamManager: React.FC<AudioStreamProps> = ({ callId }) => {
  const { state } = useAgent();
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const streamWsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!callId) {
      console.log('No call ID provided, skipping audio stream setup');
      return;
    }

    console.log('🎵 Setting up audio stream for call:', callId);

    // Create AudioContext and GainNode
    try {
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      
      const gainNode = audioCtx.createGain();
      gainNode.connect(audioCtx.destination);
      gainNodeRef.current = gainNode;
      
      console.log('✅ AudioContext and GainNode created');
    } catch (error) {
      console.error('❌ Failed to create AudioContext:', error);
      return;
    }

    // Setup WebSocket for audio stream
    const wsUrl = `${import.meta.env.VITE_API_URL_CALL?.replace('http', 'ws')}/api/calls/media/${callId}`;
    console.log('🔌 Connecting to audio stream WebSocket:', wsUrl);

    const streamWs = new WebSocket(wsUrl);
    streamWsRef.current = streamWs;

    streamWs.onopen = () => {
      console.log('✅ Audio stream WebSocket connected');
    };

    streamWs.onmessage = async (event) => {
      try {
        if (!audioContextRef.current) {
          console.error('❌ AudioContext not available');
          return;
        }

        // Convert received data to audio
        const audioData = event.data;
        const arrayBuffer = await audioData.arrayBuffer();
        
        // Decode audio data
        console.log('🎵 Decoding audio data...');
        const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
        
        // Create and connect audio node
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        
        // Connect to gain node for volume/mute control
        if (gainNodeRef.current) {
          source.connect(gainNodeRef.current);
        } else {
          source.connect(audioContextRef.current.destination);
        }
        
        // Start playing
        console.log('🔊 Playing audio chunk');
        source.start();
      } catch (error) {
        console.error('❌ Error processing audio stream:', error);
      }
    };

    streamWs.onerror = (error) => {
      console.error('❌ Audio stream WebSocket error:', error);
    };

    streamWs.onclose = () => {
      console.log('🔌 Audio stream WebSocket closed');
    };

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up audio stream...');
      
      if (streamWsRef.current) {
        console.log('🔌 Closing audio stream WebSocket');
        streamWsRef.current.close();
        streamWsRef.current = null;
      }

      if (audioContextRef.current) {
        console.log('🎵 Closing AudioContext');
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [callId]);

  // Update output device when selected device changes
  useEffect(() => {
    const applyOutputDevice = async () => {
      if (audioContextRef.current && state.selectedOutputDeviceId && (audioContextRef.current as any).setSinkId) {
        try {
          await (audioContextRef.current as any).setSinkId(state.selectedOutputDeviceId);
          console.log('🔌 Monitoring audio output switched to:', state.selectedOutputDeviceId);
        } catch (err) {
          console.error('Failed to set monitoring audio output device:', err);
        }
      }
    };

    applyOutputDevice();
  }, [state.selectedOutputDeviceId]);

  // Handle mute/volume if still needed (kept for completeness but usually follows global state)
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(
        state.isSpeakerMuted ? 0 : 1, 
        audioContextRef.current?.currentTime || 0, 
        0.01
      );
    }
  }, [state.isSpeakerMuted]);

  return null; // This component doesn't render anything visually
};

