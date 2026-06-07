import { useState, useEffect } from 'react';
import axios from 'axios';
import { getAgentId, getAuthToken } from '../../utils/authUtils';

export interface AgentProfile {
    _id: string;
    personalInfo: {
        name: string;
        email: string;
        phone?: string;
        location?: string;
    };
    professionalSummary?: {
        currentRole?: string;
        yearsOfExperience?: string;
    };
    status?: string;
}

export interface AgentApiResponse {
    success: boolean;
    data: AgentProfile;
}

export const useAgentProfile = () => {
    const [profile, setProfile] = useState<AgentProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            const agentId = getAgentId();

            if (!agentId) {
                console.warn('[useAgentProfile] No agentId found');
                setError('Agent not authenticated');
                return;
            }

            setLoading(true);
            try {
                const token = getAuthToken();
                const headers = token ? { Authorization: `Bearer ${token}` } : {};

                let apiUrl = import.meta.env.VITE_API_URL_CALL ||
                    import.meta.env.VITE_DASH_COMPANY_BACKEND ||
                    'https://v25dashcallsbackend.netlify.app/api';

                // Normalize all URLs to include /api if missing (all backend services use /api prefix)
                if (!apiUrl.includes('/api')) {
                    apiUrl = `${apiUrl.replace(/\/$/, '')}/api`;
                    console.log('[useAgentProfile] Normalized API URL:', apiUrl);
                }

                const response = await axios.get<AgentApiResponse>(`${apiUrl}/agents/${agentId}`, { headers });

                if (response.data.success) {
                    setProfile(response.data.data);
                }
            } catch (err: any) {
                console.error('Error fetching agent profile:', err);
                if (err.response?.status === 401 || err.response?.status === 403) {
                    setError('Session expired — please sign in again');
                    return;
                }
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    return { profile, loading, error };
};

