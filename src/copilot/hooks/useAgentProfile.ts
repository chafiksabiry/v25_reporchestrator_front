import { useState, useEffect } from 'react';
import axios from 'axios';
import { getAgentId, getAuthToken, getProfileData } from '../../utils/authUtils';

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

            // Seed from the locally cached rep profile first so the cockpit
            // always has the agent's identity even if the remote /agents
            // endpoint is unavailable or rejects the token (401/403).
            const local = getProfileData();
            if (local && (local.personalInfo?.name || local._id)) {
                setProfile({
                    _id: local._id || agentId || '',
                    personalInfo: {
                        name: local.personalInfo?.name || 'Agent',
                        email: local.personalInfo?.email || '',
                        phone: local.personalInfo?.phone,
                        location: local.personalInfo?.location,
                    },
                    professionalSummary: local.professionalSummary,
                    status: local.status,
                });
            }

            if (!agentId) {
                console.warn('[useAgentProfile] No agentId found — using local profile only');
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
                // The /agents endpoint can reject the rep token (401/403) — this is
                // non-fatal because we already seeded the profile from local data.
                if (err.response?.status === 401 || err.response?.status === 403) {
                    console.warn('[useAgentProfile] Remote profile unauthorized — keeping local profile');
                    return;
                }
                console.warn('[useAgentProfile] Could not refresh remote profile:', err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    return { profile, loading, error };
};

