import { useCallback } from 'react';
import { useAgent } from '../contexts/AgentContext';
import { TwilioCallService } from '../services/twilioCallService';

export const useCallStorage = () => {
  const { state, dispatch } = useAgent();
  const storeCall = useCallback(async (
    callSid: string, 
    leadId: string, 
    isRecordingOverride?: boolean,
    gigId?: string,
    companyId?: string,
    transactionOccurred?: boolean | null,
    isVoicemail?: boolean,
    appointmentAt?: string,
    callbackAt?: string,
    errorCode?: number
  ) => {
    const agentId = localStorage.getItem('agentId') || ""; 
    const userId = localStorage.getItem('userId') || agentId; // Actual user ID if available

    try {
      const callData = await TwilioCallService.storeCallInDB({
        callSid,
        agentId,
        leadId,
        userId,
        isRecording: isRecordingOverride !== undefined ? isRecordingOverride : state.callState.isRecording,
        transcript: state.transcript,
        gigId,
        companyId,
        transactionOccurred,
        isVoicemail,
        appointmentAt,
        callbackAt,
        errorCode,
      });

      if (callData && callData.recording_url_cloudinary) {
        dispatch({ type: 'SET_RECORDING_URL', url: callData.recording_url_cloudinary });
      }
      // Return the freshly stored record so callers (e.g. ContactInfo's
      // disconnect handler) can deep-link the just-saved call into the
      // Call History modal without re-fetching the whole list.
      return callData;
    } catch (error) {
      console.error('Failed to store call in database:', error);
      return null;
    }
  }, [state.callState.isRecording, state.transcript]);

  return { storeCall };
}; 
