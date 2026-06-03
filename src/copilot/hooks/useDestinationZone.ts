import { useState, useEffect, useCallback } from 'react';

export interface DestinationZoneState {
  zone: string | null;
  loading: boolean;
  error: string | null;
}

// Fonction pour récupérer le gigId selon l'environnement
const getGigId = (): string | null => {
  if (process.env.NODE_ENV === 'development') {
    // En développement, utiliser un gigId fixe
    return '686e8ddcf74ddc5ba5d4b493';
  } else {
    // En production, récupérer depuis les cookies
    const cookies = document.cookie.split(';');
    const gigIdCookie = cookies.find(cookie => cookie.trim().startsWith('gigId='));
    if (gigIdCookie) {
      return gigIdCookie.split('=')[1];
    }
    return null;
  }
};

export const useDestinationZone = (gigId?: string) => {
  const [state, setState] = useState<DestinationZoneState>({
    zone: null,
    loading: false,
    error: null
  });

  // Déterminer le gigId à utiliser
  const effectiveGigId = gigId || getGigId();

  const fetchDestinationZone = useCallback(async () => {
    // DISABLED FOR TESTING: Skip API call to avoid 500 errors
    // The gigs endpoint is not needed for REPS Copilot testing
    console.log('⚠️ Destination zone API call disabled for testing');
    setState(prev => ({
      ...prev,
      zone: 'US', // Default zone for testing
      loading: false,
      error: null
    }));
    return;

    /* ORIGINAL CODE - COMMENTED OUT FOR TESTING
    if (!effectiveGigId) {
      console.error('Gig ID not found');
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await fetch(`${import.meta.env.VITE_GIGS_API}/gigs/${effectiveGigId}/destination-zone`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🌍 Destination zone data:', data);
      
      if (data.data && data.data.code) {
        setState(prev => ({ 
          ...prev, 
          zone: data.data.code, 
          loading: false 
        }));
        console.log('🌍 Destination zone set:', data.data.code);
      } else {
        throw new Error('Invalid response format: missing data.code');
      }
    } catch (error) {
      console.error('Error fetching destination zone:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to fetch destination zone',
        loading: false 
      }));
    }
    */
  }, [effectiveGigId]);

  // Récupérer automatiquement la zone de destination quand effectiveGigId change
  useEffect(() => {
    if (effectiveGigId) {
      fetchDestinationZone();
    }
  }, [effectiveGigId, fetchDestinationZone]);

  return {
    ...state,
    fetchDestinationZone,
    gigId: effectiveGigId // Exposer le gigId effectif utilisé
  };
}; 
