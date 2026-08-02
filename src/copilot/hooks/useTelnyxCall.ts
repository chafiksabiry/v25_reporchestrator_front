import { useState, useEffect, useCallback } from 'react';
import { TelnyxCallService, TelnyxCallEvent } from '../services/telnyxCallService';

export type CallStatus = 'idle' | 'initiating' | 'in-progress' | 'completed' | 'failed';

interface UseTelnyxCallResult {
  callStatus: CallStatus;
  isLoading: boolean;
  error: string | null;
  currentCallId: string | null;
  initiateCall: (toNumber: string, fromNumber: string, agentId: string) => Promise<void>;
  endCall: () => Promise<void>;
}

export const useTelnyxCall = (): UseTelnyxCallResult => {
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);

  useEffect(() => {
    // Initialize WebSocket connection
    TelnyxCallService.initializeWebSocket();

    // Set up call status callback
    TelnyxCallService.setCallStatusCallback((status, event) => {
      console.log('📞 Call status update:', status, event);
      setCallStatus(status as CallStatus);
      
      if (event.payload.call_control_id) {
        setCurrentCallId(event.payload.call_control_id);
      }

      if (status === 'completed' || status === 'failed') {
        setCurrentCallId(null);
      }
    });
  }, []);

  const initiateCall = useCallback(async (toNumber: string, fromNumber: string, agentId: string) => {
    setError(null);
    setIsLoading(true);

    try {
      // Format phone numbers
      const formattedToNumber = TelnyxCallService.formatPhoneNumber(toNumber);
      const formattedFromNumber = TelnyxCallService.formatPhoneNumber(fromNumber);

      console.log('📞 Initiating call:', {
        to: formattedToNumber,
        from: formattedFromNumber,
        agentId
      });

      const response = await TelnyxCallService.initiateCall(
        formattedToNumber,
        formattedFromNumber,
        agentId
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to initiate call');
      }

      setCallStatus('initiating');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initiate call';
      setError(message);
      setCallStatus('failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const endCall = useCallback(async () => {
    if (!currentCallId) {
      console.warn('No active call to end');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await TelnyxCallService.endCall();
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to end call');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to end call';
      setError(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [currentCallId]);

  return {
    callStatus,
    isLoading,
    error,
    currentCallId,
    initiateCall,
    endCall
  };
};

