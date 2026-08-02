import api from './client';


export const transcribeLongAudio = async (analyzeData) => {
    try {
        const responseData = await api.post('/speechToText/transcribe', analyzeData);
        return responseData.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};
