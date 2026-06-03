const API_BASE_URL = import.meta.env.VITE_API_URL_CALL + '/api';

export interface CallPhaseResponse {
    current_phase: string;
    confidence: number;
    next_step_suggestion: string;
    strengths?: string[];
    improvements?: string[];
}

/**
 * Analyzes the call transcript to determine the current phase (SBAM, Discovery, etc.)
 */
export const analyzeCallPhase = async (textToCompare: string): Promise<CallPhaseResponse> => {
    if (!textToCompare || textToCompare.trim().length < 10) {
        return {
            current_phase: 'Unknown',
            confidence: 0,
            next_step_suggestion: 'Keep the conversation going'
        };
    }

    try {
        const response = await fetch(`${API_BASE_URL.replace('/api', '')}/api/vertex/evaluate-language`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fileUri: 'live_stream', // Placeholder for backward compatibility on backend
                textToCompare
            }),
        });

        if (!response.ok) {
            // Logically fallback or throw
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error analyzing call phase:', error);
        return {
            current_phase: 'Unknown',
            confidence: 0,
            next_step_suggestion: 'Continue speaking'
        };
    }
};

