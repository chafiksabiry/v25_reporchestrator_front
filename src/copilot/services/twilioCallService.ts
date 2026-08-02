import axios from 'axios';

export interface CallStorageData {
  callSid: string;
  agentId: string;
  leadId: string;
  userId: string;
  isRecording: boolean;
  transcript?: any[];
  gigId?: string;
  companyId?: string;
  transactionOccurred?: boolean | null;
  isVoicemail?: boolean;
  appointmentAt?: string;
  callbackAt?: string;
  errorCode?: number | null;
}

export class TwilioCallService {
  static async storeCallInDB(data: CallStorageData): Promise<any> {
    try {
      console.log('🔄 Starting call storage process...', { 
        sid: data.callSid, 
        gigId: data.gigId, 
        companyId: data.companyId 
      });

      // Step 1: Wait for Twilio to process the recording (7s) - ONLY if recording
      if (data.isRecording) {
        await new Promise(resolve => setTimeout(resolve, 7000));
      }

      // Step 2: Get call details from Twilio
      const result = await axios.post(`${import.meta.env.VITE_API_URL_CALL || import.meta.env.VITE_CALLS_API_URL}/api/calls/call-details`, {
        callSid: data.callSid,
        userId: data.userId
      });
      const call = (result.data as any).data;
      // Twilio error code for failed calls (21211 = invalid, 21214 = unreachable, 13224 = cannot dial)
      const resolvedErrorCode = call?.errorCode ?? data.errorCode ?? null;
      console.log("📞 Call details retrieved from Twilio", call?.status, resolvedErrorCode ? `ErrorCode: ${resolvedErrorCode}` : '');

      // Step 3: Fetch recording from Cloudinary if available (ONLY if isRecording is true)
      let cloudinaryRecord = { data: { url: null } };
      if (data.isRecording && call && call.recordingUrl) {
        cloudinaryRecord = await axios.post(`${import.meta.env.VITE_API_URL_CALL || import.meta.env.VITE_CALLS_API_URL}/api/calls/fetch-recording`, {
          recordingUrl: call.recordingUrl,
          userId: data.userId
        });
      }

      // Format transcript for backend (from TranscriptEntry to { speaker, text, timestamp })
      const formattedTranscript = data.transcript?.map(entry => ({
        speaker: entry.participantId === 'agent-1' ? 'Agent' : entry.participantId === 'customer-1' ? 'Customer' : 'Speaker',
        text: entry.text,
        timestamp: entry.timestamp.toISOString()
      }));

      // Step 4: Store call in database
      const callInDB = await axios.post(`${import.meta.env.VITE_API_URL_CALL || import.meta.env.VITE_CALLS_API_URL}/api/calls/store-call`, {
        CallSid: data.callSid,
        agentId: data.agentId,
        leadId: data.leadId,
        call,
        cloudinaryrecord: cloudinaryRecord.data.url,
        userId: data.userId,
        transcript: formattedTranscript,
        gigId: data.gigId,
        companyId: data.companyId,
        transactionOccurred: data.transactionOccurred,
        isVoicemail: data.isVoicemail,
        appointmentAt: data.appointmentAt,
        callbackAt: data.callbackAt,
        // Pass Twilio error code so backend can classify failed calls precisely
        ErrorCode: resolvedErrorCode ?? undefined,
      });

      console.log('📝 Call stored in DB:', (callInDB.data as any)._id);
      return callInDB.data;

    } catch (error) {
      console.error('❌ Error storing call in DB:', error);
      throw error;
    }
  }

  static async startRecording(callSid: string, userId: string): Promise<any> {
    try {
      const result = await axios.post(`${import.meta.env.VITE_API_URL_CALL}/api/calls/recording/start`, {
        callSid,
        userId
      });
      return result.data;
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      throw error;
    }
  }

  static async stopRecording(callSid: string, userId: string): Promise<any> {
    try {
      const result = await axios.post(`${import.meta.env.VITE_API_URL_CALL}/api/calls/recording/stop`, {
        callSid,
        userId
      });
      return result.data;
    } catch (error) {
      console.error('❌ Error stopping recording:', error);
      throw error;
    }
  }
}
