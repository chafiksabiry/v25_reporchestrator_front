import axios from 'axios';

const callsBase = () =>
  import.meta.env.VITE_API_URL_CALL || import.meta.env.VITE_CALLS_API_URL || '';

export interface GigPhoneLine {
  provider: 'twilio' | 'telnyx';
  phoneNumber: string;
  phoneNumberId: string;
  gigId: string;
  companyId: string | null;
  status?: string;
  features?: Record<string, unknown>;
}

export interface TelnyxStorePayload {
  externalId: string;
  agentId: string;
  leadId: string;
  userId: string;
  gigId?: string;
  companyId?: string;
  transcript?: any[];
  from?: string;
  to?: string;
  duration?: number;
  startTime?: string | Date;
  endTime?: string | Date;
  status?: string;
  transactionOccurred?: boolean | null;
  isVoicemail?: boolean;
  appointmentAt?: string;
  callbackAt?: string;
  waitForRecordingMs?: number;
}

export class TelnyxCallPersist {
  static async fetchLineForLead(leadId: string): Promise<GigPhoneLine> {
    const { data } = await axios.get<GigPhoneLine>(
      `${callsBase()}/api/calls/line-for-lead/${leadId}`
    );
    return data;
  }

  static async getLoginToken(): Promise<string> {
    const { data } = await axios.post<{ login_token: string }>(
      `${callsBase()}/api/calls/get-login-token`
    );
    if (!data?.login_token) {
      throw new Error('No Telnyx login_token received');
    }
    return data.login_token;
  }

  static async finalizeCall(payload: TelnyxStorePayload): Promise<any> {
    const formattedTranscript = payload.transcript?.map((entry) => ({
      speaker:
        entry.participantId === 'agent-1'
          ? 'Agent'
          : entry.participantId === 'customer-1'
            ? 'Customer'
            : entry.speaker || 'Speaker',
      text: entry.text,
      timestamp:
        entry.timestamp instanceof Date
          ? entry.timestamp.toISOString()
          : entry.timestamp,
    }));

    const { data } = await axios.post(`${callsBase()}/api/calls/telnyx/finalize`, {
      ...payload,
      transcript: formattedTranscript,
      waitForRecordingMs: payload.waitForRecordingMs ?? 8000,
    });
    return data;
  }
}
