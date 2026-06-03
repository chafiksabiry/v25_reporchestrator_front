const API_BASE_URL = import.meta.env.VITE_API_URL_CALL + '/api';

export const getPersonalityAnalysis = async (transcription: string, context?: any[], callDuration?: number) => {
  try {
    const response = await fetch(`${API_BASE_URL}/calls/personality-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcription,
        context,
        callDuration
      }),
    });
    console.log("response from backend personality analysis",response);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting personality analysis:', error);
    throw error;
  }
}; 
