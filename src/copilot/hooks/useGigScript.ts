import { useState, useEffect } from 'react';
import axios from 'axios';

interface ScriptReplica {
  phase: string;
  actor: 'agent' | 'lead';
  replica: string;
}

interface GigScript {
  playbook: any;
  _id: string | { $oid: string };
  gigId: string | { $oid: string };
  targetClient: string;
  language: string;
  details?: string;
  script: ScriptReplica[];
  isActive: boolean;
  createdAt: string | { $date: string };
}

export function useGigScript(gigId?: string) {
  const [scripts, setScripts] = useState<GigScript[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gigId) return;

    const fetchScripts = async () => {
      // Normalize gigId to string if it's an object ($oid)
      const normalizedGigId = typeof gigId === 'object' && (gigId as any).$oid
        ? (gigId as any).$oid
        : gigId;

      if (!normalizedGigId) return;

      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        };

        // Use the official Knowledge Base API variable found in the project
        let baseUrl = import.meta.env.VITE_BACKEND_KNOWLEDGEBASE_API ||
          import.meta.env.VITE_DASHBOARD_KNOWLEDGEBASE_API_URL;

        let apiUrl = '';

        if (baseUrl) {
          apiUrl = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
        } else {
          // Robust fallbacks based on project patterns
          apiUrl = import.meta.env.DEV
            ? 'http://localhost:3001/api'
            : 'https://v25knowledgebasebackend-production.up.railway.app/api';
        }

        console.log(`[useGigScript] Fetching collection scripts for gig ${normalizedGigId} from ${apiUrl}/scripts/gig/${normalizedGigId}`);

        const response = await axios.get<{ success: boolean; data: GigScript[] }>(
          `${apiUrl}/scripts/gig/${normalizedGigId}`,
          { headers }
        );

        if (response.data.success) {
          console.log(`[useGigScript] Successfully found ${response.data.data.length} scripts in collection.`);
          setScripts(response.data.data);
        } else {
          setError('Failed to fetch scripts');
        }
      } catch (err: any) {
        console.error('[useGigScript] API Error:', err.response?.data || err.message);
        setError(err.message || 'Error fetching scripts');
      } finally {
        setLoading(false);
      }
    };

    fetchScripts();
  }, [gigId]);

  const activeScript = scripts.find(s => s.isActive) || scripts[0];

  return { scripts, activeScript, loading, error };
}
