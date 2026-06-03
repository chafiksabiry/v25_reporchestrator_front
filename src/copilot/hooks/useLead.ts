import { useState, useEffect } from 'react';
import axios from 'axios';

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
      // Try to get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/auth';
        return;
      }
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      // Prioritize VITE_API_URL_CALL as it's the standard backend for Copilot
      let apiUrl = import.meta.env.VITE_API_URL_CALL ||
        import.meta.env.VITE_DASH_COMPANY_BACKEND ||
        import.meta.env.VITE_DASH_COMPANY_API_URL;

      // Fallback to production URL if none provided
      if (!apiUrl) {
        apiUrl = 'https://harxv25dashboardfrontend.netlify.app/api';
        console.warn('API URL environment variable is not defined, using production fallback');
      }

      // Normalize all URLs to include /api if missing (all backend services use /api prefix)
      if (!apiUrl.includes('/api')) {
        apiUrl = `${apiUrl.replace(/\/$/, '')}/api`;
        console.log('[useLead] Normalized API URL:', apiUrl);
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
        window.location.href = '/auth';
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
