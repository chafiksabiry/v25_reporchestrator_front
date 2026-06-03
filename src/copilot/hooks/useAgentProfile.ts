import { useState, useEffect } from 'react';
import axios from 'axios';

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
            // Helper to get cookie by name
            const getCookie = (name: string): string | null => {
                const value = `; ${document.cookie}`;
                const parts = value.split(`; ${name}=`);
                if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
                return null;
            };

            // Try to get userId from various sources
            let userId: string | null = getCookie('userId');

            if (!userId) {
                try {
                    const profileDataString = localStorage.getItem('profileData');
                    if (profileDataString) {
                        const profileData = JSON.parse(profileDataString);
                        userId = profileData.userId || profileData._id;
                    }
                    if (!userId) {
                        userId = localStorage.getItem('userId');
                    }
                } catch (e) {
                    console.error('Error parsing profileData:', e);
                }
            }

            if (!userId) {
                console.warn('[useAgentProfile] No userId found in cookies or localStorage');
                window.location.href = '/auth';
                return;
            }

            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const headers = token ? { Authorization: `Bearer ${token}` } : {};

                let apiUrl = import.meta.env.VITE_API_URL_CALL ||
                    import.meta.env.VITE_DASH_COMPANY_BACKEND ||
                    'https://v25dashcallsbackend.netlify.app/api';

                // Normalize all URLs to include /api if missing (all backend services use /api prefix)
                if (!apiUrl.includes('/api')) {
                    apiUrl = `${apiUrl.replace(/\/$/, '')}/api`;
                    console.log('[useAgentProfile] Normalized API URL:', apiUrl);
                }

                const response = await axios.get<AgentApiResponse>(`${apiUrl}/agents/${userId}`, { headers });

                if (response.data.success) {
                    setProfile(response.data.data);
                }
            } catch (err: any) {
                console.error('Error fetching agent profile:', err);
                if (err.response?.status === 401 || err.response?.status === 403) {
                    window.location.href = '/auth';
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

