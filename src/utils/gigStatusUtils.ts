import { getAgentId, getAuthToken } from './authUtils';

// Types pour les statuts de gigs
export type GigStatus = 'enrolled' | 'invited' | 'pending' | 'none';

// Interface pour les données de statut
export interface GigStatusData {
  enrolledGigIds: string[];
  invitedGigIds: string[];
  pendingGigIds: string[];
}

// Fonction pour récupérer les demandes en attente
export const fetchPendingRequests = async (): Promise<string[]> => {
  const agentId = getAgentId();
  const token = getAuthToken();
  if (!agentId || !token) {
    console.error('Agent ID or token not found');
    return [];
  }

  try {
    console.log('🔍 Fetching pending requests for agent:', agentId);
    
    // 1. Essayer de récupérer les données depuis le profil de l'agent
    try {
      console.log('🔄 Trying to fetch agent profile...');
      const profileResponse = await fetch(
        `${import.meta.env.VITE_REP_API_URL}/api/profiles/${agentId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        console.log('👤 Agent profile response:', profileData);
        
        // Extraire les gigs avec statut "requested" depuis le profil
        if (profileData.gigs && Array.isArray(profileData.gigs)) {
          const pendingGigIds = profileData.gigs
            .filter((gig: any) => gig.status === 'requested')
            .map((gig: any) => gig.gigId?.$oid || gig.gigId)
            .filter((id: string) => id);
          
          if (pendingGigIds.length > 0) {
            console.log(`⏳ Found ${pendingGigIds.length} pending gig IDs from agent profile:`, pendingGigIds);
            return pendingGigIds;
          }
        }
      }
    } catch (profileError) {
      console.log('⚠️ Agent profile endpoint failed:', profileError);
    }
    
    // 2. Essayer les autres endpoints comme avant
    const endpoints = [
      `${import.meta.env.VITE_MATCHING_API_URL}/gig-agents/agents/${agentId}/gigs?status=pending`,
      `${import.meta.env.VITE_MATCHING_API_URL}/gig-agents/agent/${agentId}/requests`,
      `${import.meta.env.VITE_MATCHING_API_URL}/gig-agents/pending/agent/${agentId}`
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`📝 Pending requests response from ${endpoint}:`, data);
          
          let pendingGigIds: string[] = [];
          
          // Traiter différents formats de réponse
          if (data.gigs && Array.isArray(data.gigs)) {
            pendingGigIds = data.gigs
              .filter((gigRequest: any) => {
                const isPending = gigRequest.status === 'pending' || 
                                gigRequest.status === 'requested' ||
                                gigRequest.enrollmentStatus === 'requested' ||
                                gigRequest.agentResponse === 'pending';
                return isPending;
              })
              .map((gigRequest: any) => {
                return gigRequest.gig?._id || 
                       gigRequest.gig?.$oid || 
                       gigRequest.gigId?.$oid || 
                       gigRequest.gigId;
              })
              .filter(id => id);
          } else if (Array.isArray(data)) {
            pendingGigIds = data
              .filter((request: any) => {
                const isPending = request.status === 'pending' || 
                                request.status === 'requested' ||
                                request.enrollmentStatus === 'requested' ||
                                request.agentResponse === 'pending';
                return isPending;
              })
              .map((request: any) => request.gigId?.$oid || request.gigId)
              .filter(id => id);
          }
          
          if (pendingGigIds.length > 0) {
            console.log(`⏳ Found ${pendingGigIds.length} pending gig IDs from ${endpoint}:`, pendingGigIds);
            return pendingGigIds;
          }
        }
      } catch (endpointError) {
        console.log(`⚠️ Endpoint ${endpoint} failed:`, endpointError);
        continue;
      }
    }
    
    console.log('ℹ️ No pending requests found from any endpoint');
    return [];
  } catch (error) {
    console.error('❌ Error fetching pending requests:', error);
    return [];
  }
};

// Fonction pour récupérer les gigs inscrits depuis le profil de l'agent
export const fetchEnrolledGigsFromProfile = async (): Promise<string[]> => {
  const agentId = getAgentId();
  const token = getAuthToken();
  if (!agentId || !token) {
    console.error('Agent ID or token not found');
    return [];
  }

  try {
    console.log('🔍 Fetching enrolled gigs from agent profile:', agentId);
    
    const profileResponse = await fetch(
      `${import.meta.env.VITE_REP_API_URL}/api/profiles/${agentId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );
    
    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      console.log('👤 Agent profile response for enrolled gigs:', profileData);
      
      // Extraire les gigs avec statut "enrolled" depuis le profil
      if (profileData.gigs && Array.isArray(profileData.gigs)) {
        const enrolledGigIds = profileData.gigs
          .filter((gig: any) => gig.status === 'enrolled')
          .map((gig: any) => gig.gigId?.$oid || gig.gigId)
          .filter((id: string) => id);
        
        console.log(`✅ Found ${enrolledGigIds.length} enrolled gig IDs from agent profile:`, enrolledGigIds);
        return enrolledGigIds;
      }
    }
    
    console.log('ℹ️ No enrolled gigs found in agent profile');
    return [];
  } catch (error) {
    console.error('❌ Error fetching enrolled gigs from profile:', error);
    return [];
  }
};

// Fonction pour obtenir le statut d'un gig
export const getGigStatus = (
  gigId: string, 
  statusData: GigStatusData
): GigStatus => {
  if (statusData.enrolledGigIds.includes(gigId)) {
    return 'enrolled';
  }
  
  if (statusData.invitedGigIds.includes(gigId)) {
    return 'invited';
  }
  
  if (statusData.pendingGigIds.includes(gigId)) {
    return 'pending';
  }
  
  return 'none';
};

// Fonction pour rafraîchir les statuts après une action
export const refreshGigStatuses = async (): Promise<void> => {
  // Cette fonction peut être appelée depuis n'importe quelle page
  // pour déclencher un rafraîchissement des statuts
  
  // Émettre un événement personnalisé pour notifier les composants
  const event = new CustomEvent('refreshGigStatuses');
  window.dispatchEvent(event);
};
