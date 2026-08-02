import api, { apiMultipart } from './client';


export const analyzeRecordingVertex = async (analyzeData) => {
    try {
        const responseData = await api.post('/vertex/language/evaluate', analyzeData);
        return responseData.data.candidates[0].content.parts[0].text;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const uploadRecording = async (analyzeData) => {
    try {
        const responseData = await apiMultipart.post('/vertex/audio/upload', analyzeData);
        return responseData;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const analyzeContentCenterSkill = async (analyzeData) => {
    try {
        const responseData = await api.post('/vertex/contactCenter/evaluate', analyzeData);
        return responseData;
    } catch (error) {
        throw error.response?.data || error;
    }
};