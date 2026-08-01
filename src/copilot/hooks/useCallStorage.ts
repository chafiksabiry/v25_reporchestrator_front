import { useCallback } from 'react';
import { useAgent } from '../contexts/AgentContext';
import { TwilioCallService } from '../services/twilioCallService';
import { TelnyxCallPersist } from '../services/telnyxCallPersist';

export type CallProvider = 'twilio' | 'telnyx';

export const useCallStorage = () => {
  const { state, dispatch } = useAgent();

  const storeCall = useCallback(
    async (
      callSid: string,
      leadId: string,
      isRecordingOverride?: boolean,
      gigId?: string,
      companyId?: string,
      transactionOccurred?: boolean | null,
      isVoicemail?: boolean,
      appointmentAt?: string,
      callbackAt?: string,
      errorCode?: number,
      options?: {
        provider?: CallProvider;
        from?: string;
        to?: string;
        duration?: number;
        startTime?: string | Date;
        endTime?: string | Date;
        status?: string;
      }
    ) => {
      const agentId = localStorage.getItem('agentId') || '';
      const userId = localStorage.getItem('userId') || agentId;
      const provider = options?.provider || 'twilio';

      try {
        if (provider === 'telnyx') {
          const callData = await TelnyxCallPersist.finalizeCall({
            externalId: callSid,
            agentId,
            leadId,
            userId,
            gigId,
            companyId,
            transcript: state.transcript,
            from: options?.from,
            to: options?.to,
            duration: options?.duration,
            startTime: options?.startTime,
            endTime: options?.endTime,
            status: options?.status,
            transactionOccurred,
            isVoicemail,
            appointmentAt,
            callbackAt,
            waitForRecordingMs:
              isRecordingOverride !== undefined
                ? isRecordingOverride
                  ? 8000
                  : 0
                : state.callState.isRecording
                  ? 8000
                  : 0,
          });

          if (callData?.recording_url_cloudinary) {
            dispatch({
              type: 'SET_RECORDING_URL',
              url: callData.recording_url_cloudinary,
            });
          }
          return callData;
        }

        const callData = await TwilioCallService.storeCallInDB({
          callSid,
          agentId,
          leadId,
          userId,
          isRecording:
            isRecordingOverride !== undefined
              ? isRecordingOverride
              : state.callState.isRecording,
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
          dispatch({
            type: 'SET_RECORDING_URL',
            url: callData.recording_url_cloudinary,
          });
        }
        return callData;
      } catch (error) {
        console.error('Failed to store call in database:', error);
        return null;
      }
    },
    [state.callState.isRecording, state.transcript, dispatch]
  );

  return { storeCall };
};
