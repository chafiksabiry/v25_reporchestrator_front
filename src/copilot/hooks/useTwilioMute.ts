import { useCallback } from 'react';
import { useAgent } from '../contexts/AgentContext';

/**
 * Hook pour gérer le mute/unmute des appels Twilio
 * Utilise la méthode call.mute() du SDK Twilio pour vraiment affecter l'enregistrement
 */
export function useTwilioMute() {
  const { state, dispatch } = useAgent();

  /**
   * Toggle mute du microphone via Twilio SDK
   * Cette méthode affecte vraiment l'enregistrement côté serveur
   */
  const toggleMicMute = useCallback(() => {
    if (!state.twilioConnection) {
      console.warn('⚠️ No active Twilio connection for muting');
      return false;
    }

    try {
      const connection = state.twilioConnection;
      const currentlyMuted = state.isMicMuted;

      if (currentlyMuted) {
        // Unmute the call
        connection.mute(false);
        dispatch({ type: 'SET_MIC_MUTE', muted: false });
        console.log('🎤 Twilio call unmuted - Recording resumed');
        return false;
      } else {
        // Mute the call
        connection.mute(true);
        dispatch({ type: 'SET_MIC_MUTE', muted: true });
        console.log('🔇 Twilio call muted - Recording paused');
        return true;
      }
    } catch (error) {
      console.error('❌ Error toggling Twilio mute:', error);
      return state.isMicMuted;
    }
  }, [state.twilioConnection, state.isMicMuted, dispatch]);

  /**
   * Set mute state explicitly
   */
  const setMicMute = useCallback((muted: boolean) => {
    if (!state.twilioConnection) {
      console.warn('⚠️ No active Twilio connection for muting');
      return;
    }

    try {
      const connection = state.twilioConnection;
      
      // Use Twilio SDK mute method
      connection.mute(muted);
      dispatch({ type: 'SET_MIC_MUTE', muted });
      
      console.log(muted 
        ? '🔇 Twilio call muted - Recording paused'
        : '🎤 Twilio call unmuted - Recording resumed'
      );
    } catch (error) {
      console.error('❌ Error setting Twilio mute:', error);
    }
  }, [state.twilioConnection, dispatch]);

  /**
   * Check if call is currently muted via Twilio SDK
   */
  const isMuted = useCallback(() => {
    if (!state.twilioConnection) {
      return false;
    }

    try {
      // Use Twilio SDK method to check mute status
      return state.twilioConnection.isMuted?.() || state.isMicMuted;
    } catch (error) {
      console.error('❌ Error checking Twilio mute status:', error);
      return state.isMicMuted;
    }
  }, [state.twilioConnection, state.isMicMuted]);

  /**
   * Store Twilio connection in global state
   */
  const setTwilioConnection = useCallback((connection: any, device: any) => {
    dispatch({ 
      type: 'SET_TWILIO_CONNECTION', 
      connection, 
      device 
    });
    console.log('🔗 Twilio connection stored in global state');
    
    // Configurer les événements audio pour garantir le bon fonctionnement
    if (connection) {
      // Écouter les événements audio importants
      connection.on('volume', (inputVolume: number, outputVolume: number) => {
        console.log('🎵 Audio levels - Input:', inputVolume, 'Output:', outputVolume);
      });
      
      // S'assurer que l'audio distant est correctement routé
      connection.on('accept', () => {
        setTimeout(() => {
          try {
            const remoteAudio = document.getElementById('call-audio') as HTMLAudioElement;
            if (remoteAudio && connection.getRemoteStream) {
              const remoteStream = connection.getRemoteStream();
              if (remoteStream && !remoteAudio.srcObject) {
                remoteAudio.srcObject = remoteStream;
                console.log('🔊 Remote audio stream attached to audio element');
              }
            }
          } catch (error) {
            console.log('Audio setup note:', error);
          }
        }, 500);
      });
    }
  }, [dispatch]);

  /**
   * Clear Twilio connection from global state
   */
  const clearTwilioConnection = useCallback(() => {
    dispatch({ type: 'CLEAR_TWILIO_CONNECTION' });
    console.log('🧹 Twilio connection cleared from global state');
  }, [dispatch]);

  return {
    // Actions
    toggleMicMute,
    setMicMute,
    setTwilioConnection,
    clearTwilioConnection,
    
    // State
    isMicMuted: state.isMicMuted,
    isConnected: !!state.twilioConnection,
    connection: state.twilioConnection,
    device: state.twilioDevice,
    
    // Helpers
    isMuted,
    canMute: !!state.twilioConnection
  };
}
