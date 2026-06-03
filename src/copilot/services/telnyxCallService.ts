import axios from 'axios';

export interface TelnyxCallEvent {
  type: string;
  payload: {
    call_control_id?: string;
    [key: string]: any;
  };
}

export interface TelnyxCallResponse {
  success: boolean;
  data?: {
    callId: string;
    [key: string]: any;
  };
  error?: string;
}

export class TelnyxCallService {
  private static baseUrl = import.meta.env.VITE_API_URL_CALL;
  private static ws: WebSocket | null = null;
  private static callStatusCallback: ((status: string, event: TelnyxCallEvent) => void) | null = null;
  private static currentCallId: string | null = null;

  static async initializeWebSocket() {
    if (this.ws) {
      this.ws.close();
    }

    const wsUrl = `${this.baseUrl.replace('http', 'ws')}/ws/call-events`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onmessage = (event) => {
      const callEvent: TelnyxCallEvent = JSON.parse(event.data);
      this.handleWebSocketMessage(callEvent);
    };

    this.ws.onclose = () => {
      console.log('🔄 WebSocket connection closed. Attempting to reconnect...');
      setTimeout(() => this.initializeWebSocket(), 3000);
    };

    this.ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };
  }

  private static handleWebSocketMessage(callEvent: TelnyxCallEvent) {
    console.log('📞 Received call event:', callEvent);

    switch(callEvent.type) {
      case 'call.initiated':
        this.currentCallId = callEvent.payload.call_control_id;
        this.callStatusCallback?.('initiating', callEvent);
        break;
      
      case 'call.answered':
        this.callStatusCallback?.('in-progress', callEvent);
        break;
      
      case 'call.hangup':
        this.currentCallId = null;
        this.callStatusCallback?.('completed', callEvent);
        break;

      case 'call.failed':
        this.currentCallId = null;
        this.callStatusCallback?.('failed', callEvent);
        break;
    }
  }

  static async initiateCall(toNumber: string, fromNumber: string, agentId: string): Promise<TelnyxCallResponse> {
    try {
      console.log('📞 Initiating Telnyx call:', { toNumber, fromNumber, agentId });

      const response = await axios.post<TelnyxCallResponse>(
        `${this.baseUrl}/api/calls/telnyx/initiate`,
        {
          to: toNumber,
          from: fromNumber,
          agentId
        }
      );

      console.log('✅ Call initiation response:', response.data);
      
      if (response.data.success && response.data.data?.callId) {
        this.currentCallId = response.data.data.callId;
      }

      return response.data;
    } catch (error) {
      console.error('❌ Error initiating call:', error);
      throw this.handleError(error);
    }
  }

  static async endCall(): Promise<TelnyxCallResponse> {
    if (!this.currentCallId) {
      throw new Error('No active call to end');
    }

    try {
      console.log('📞 Ending call:', this.currentCallId);

      const response = await axios.post<TelnyxCallResponse>(
        `${this.baseUrl}/api/calls/telnyx/${this.currentCallId}/end`
      );

      console.log('✅ Call end response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error ending call:', error);
      throw this.handleError(error);
    }
  }

  static setCallStatusCallback(callback: (status: string, event: TelnyxCallEvent) => void) {
    this.callStatusCallback = callback;
  }

  static getCurrentCallId(): string | null {
    return this.currentCallId;
  }

  private static handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.error || error.message;
      if (message.includes('Invalid phone number')) {
        return new Error('Please enter a valid phone number');
      }
      if (message.includes('unauthorized')) {
        return new Error('Session expired. Please log in again.');
      }
      return new Error(message);
    }
    return error;
  }

  static formatPhoneNumber(number: string): string {
    // Remove all non-digit characters
    const cleaned = number.replace(/\D/g, '');
    
    // Add + prefix if not present
    if (!number.startsWith('+')) {
      // If number starts with country code (e.g., 33 for France)
      if (cleaned.startsWith('33')) {
        return '+' + cleaned;
      }
      // If number starts with 0, assume French number
      if (cleaned.startsWith('0')) {
        return '+33' + cleaned.substring(1);
      }
    }
    
    return number;
  }
}

