const API_BASE_URL = import.meta.env.VITE_API_URL_CALL + '/api';

export interface AIRecommendationResponse {
    success: boolean;
    suggestion: string;
}

export const getAIAssistance = async (transcription: string, context?: any[]) => {
    try {
        const response = await fetch(`${API_BASE_URL}/calls/ai-assist`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                transcription,
                context
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: AIRecommendationResponse = await response.json();
        return data;
    } catch (error) {
        console.error('Error getting AI assistance:', error);
        throw error;
    }
};

