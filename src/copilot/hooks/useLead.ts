import { useState, useEffect } from 'react';
import axios from 'axios';
import { getAuthToken } from '../../utils/authUtils';

// Local interfaces for the API response
export interface ApiLead {
  _id: string;
  name?: string;
  email?: string; // Add lowercase variant
  Email_1?: string;
  phone?: string; // Add lowercase variant
  Phone?: string;
  Deal_Name?: string;
  Activity_Tag?: string;
  companyId?: string;
  Last_Activity_Time?: string;
  Pipeline?: string;
  Stage?: string;
  gigId?: {
    _id: string;
    title: string;
    description?: string;
    category?: string;
    status?: string;
  };
  updatedAt?: string;
  [key: string]: any;
}

export interface LeadApiResponse {
  success: boolean;
  data: ApiLead;
  error?: string;
}

interface UseLeadResult {
  lead: ApiLead | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useLead = (leadId: string | null): UseLeadResult => {
  const [lead, setLead] = useState<ApiLead | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLead = async (id: string) => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const token = getAuthToken();
      if (!token) {
        setError('Not authenticated — please sign in again');
        return;
      }
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      // Copilot leads/calls → dash_calls. Prefer env; default matches
      // Netlify build.environment in netlify.toml (recette → production APIs).
      let apiUrl =
        import.meta.env.VITE_API_URL_CALL ||
        import.meta.env.VITE_CALLS_API_URL ||
        'https://v25dashcallsbackend-production.up.railway.app';

      // Normalize all URLs to include /api if missing (all backend services use /api prefix)
      if (!apiUrl.includes('/api')) {
        apiUrl = `${apiUrl.replace(/\/$/, '')}/api`;
      }

      console.log(`[useLead] Fetching lead ${id} from ${apiUrl}`);

      const response = await axios.get<LeadApiResponse>(`${apiUrl}/leads/${id}`, { headers });

      if (response.data.success) {
        setLead(response.data.data);
      } else {
        setError('Lead not found');
      }
    } catch (err: any) {
      console.error('Error fetching lead:', err);
      if (err.response?.status === 401 || err.response?.status === 403 || err.response?.data?.error === 'Not authorized to access this route') {
        setError('Not authorized to access this lead');
        setLead(null);
        return;
      }
      setError(err.response?.data?.error || err.message || 'Failed to fetch lead');
      setLead(null);
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    if (leadId) {
      fetchLead(leadId);
    }
  };

  useEffect(() => {
    if (leadId) {
      fetchLead(leadId);
    }
  }, [leadId]);

  return {
    lead,
    loading,
    error,
    refetch
  };
};
