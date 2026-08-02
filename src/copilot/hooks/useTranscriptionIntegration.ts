import { useState, useEffect, useCallback, useRef } from 'react';
import { TranscriptionService, TranscriptionMessage } from '../services/transcriptionService';

export interface TranscriptionState {
  isActive: boolean;
  transcripts: TranscriptionMessage[];
  currentInterimText: string;
  error: string | null;
  // AI Analysis fields
  currentPhase: string;
  analysisConfidence: number;
  nextStepSuggestion: string;
}

export const useTranscriptionIntegration = (destinationZone?: string) => {
  const [transcriptionService] = useState(() => new TranscriptionService());
  const [state, setState] = useState<TranscriptionState>({
    isActive: false,
    transcripts: [],
    currentInterimText: '',
    error: null,
    currentPhase: 'Intro / Hook',
    analysisConfidence: 0,
    nextStepSuggestion: ''
  });

  // Référence pour stocker les callbacks externes
  const externalCallbacks = useRef<((message: TranscriptionMessage) => void)[]>([]);

  // Mettre à jour la zone de destination quand elle change
  useEffect(() => {
    if (destinationZone) {
      transcriptionService.setDestinationZone(destinationZone);
      console.log('🌍 Destination zone updated in transcription service:', destinationZone);
    }
  }, [destinationZone, transcriptionService]);

  // Fonction pour ajouter un callback externe
  const addTranscriptionCallback = useCallback((callback: (message: TranscriptionMessage) => void) => {
    externalCallbacks.current.push(callback);
  }, []);

  // Fonction pour retirer un callback externe
  const removeTranscriptionCallback = useCallback((callback: (message: TranscriptionMessage) => void) => {
    const index = externalCallbacks.current.indexOf(callback);
    if (index > -1) {
      externalCallbacks.current.splice(index, 1);
    }
  }, []);

  const startTranscription = useCallback(async (stream: MediaStream, phoneNumber: string) => {
    try {
      setState(prev => ({ ...prev, error: null, isActive: true }));

      // S'assurer que la zone de destination est définie avant de démarrer
      if (destinationZone) {
        transcriptionService.setDestinationZone(destinationZone);
        console.log('🌍 Setting destination zone before transcription start:', destinationZone);
      }

      transcriptionService.setTranscriptionCallback((message: TranscriptionMessage) => {
        // Mettre à jour l'état interne
        setState(prev => {
          if (message.type === 'analysis') {
            return {
              ...prev,
              currentPhase: message.current_phase || prev.currentPhase,
              analysisConfidence: message.confidence || prev.analysisConfidence,
              nextStepSuggestion: message.next_step_suggestion || prev.nextStepSuggestion
            };
          } else if (message.type === 'interim') {
            return { ...prev, currentInterimText: message.text };
          } else if (message.type === 'final' || message.type === 'transcript') {
            return {
              ...prev,
              transcripts: [...prev.transcripts, message],
              currentInterimText: ''
            };
          }
          return prev;
        });

        // Appeler tous les callbacks externes
        externalCallbacks.current.forEach(callback => {
          try {
            callback(message);
          } catch (error) {
            console.error('Error in external transcription callback:', error);
          }
        });
      });

      await transcriptionService.initializeTranscription(stream, phoneNumber);
    } catch (error) {
      console.error('Failed to start transcription:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start transcription',
        isActive: false
      }));
    }
  }, [transcriptionService, destinationZone]);

  const stopTranscription = useCallback(async () => {
    try {
      await transcriptionService.cleanup();
      setState(prev => ({
        ...prev,
        isActive: false,
        currentInterimText: '',
        error: null
      }));
    } catch (error) {
      console.error('Failed to stop transcription:', error);
    }
  }, [transcriptionService]);

  const clearTranscripts = useCallback(() => {
    setState(prev => ({
      ...prev,
      transcripts: [],
      currentInterimText: '',
      currentPhase: 'Intro / Hook',
      analysisConfidence: 0,
      nextStepSuggestion: ''
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.isActive) {
        transcriptionService.cleanup();
      }
    };
  }, [state.isActive, transcriptionService]);

  return {
    ...state,
    startTranscription,
    stopTranscription,
    clearTranscripts,
    addTranscriptionCallback,
    removeTranscriptionCallback
  };
}; 
