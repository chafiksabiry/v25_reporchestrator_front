import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL_CALL;

export const callsApi = {
  storeCallInDBAtStartCall: async (callData: any) => {
    try {
      const response = await axios.post(`${API_URL}/api/calls/store-call-start`, callData);
      return response.data;
    } catch (error) {
      console.error('Error storing call at start:', error);
      throw error;
    }
  },

  storeCallInDBAtEndCall: async (phoneNumber: string, callSid: string) => {
    try {
      const response = await axios.post(`${API_URL}/api/calls/store-call-end`, {
        phoneNumber,
        callSid
      });
      return response.data;
    } catch (error) {
      console.error('Error storing call at end:', error);
      throw error;
    }
  }
}; 