import { getAgentId, getAuthToken } from './authUtils';
import { repApiUrl } from './repApiUrl';

// Types pour les statuts de gigs
export type GigStatus = 'enrolled' | 'invited' | 'pending' | 'none';

// Interface pour les données de statut
export interface GigStatusData {
  enrolledGigIds: string[];
  invitedGigIds: string[];
  pendingGigIds: string[];
}

const matchingApiBase = () =>
  import.meta.env.VITE_MATCHING_API_URL ||
  'https://v25matchingbackend-production.up.railway.app/api';

function extractGigIdsFromMatchingResponse(data: unknown): string[] {
  if (!data || typeof data !== 'object') return [];
  const payload = data as { gigs?: unknown[] };
  if (!Array.isArray(payload.gigs)) return [];

  return payload.gigs
    .map((entry: unknown) => {
      const row = entry as { gig?: { _id?: string; $oid?: string } };
      return row.gig?._id || row.gig?.$oid || null;
    })
    .filter((id): id is string => Boolean(id));
}

/** Matching backend is updated on approval; rep profile can lag behind. */
async function fetchMatchingAgentGigIds(status: string): Promise<string[]> {
  const agentId = getAgentId();
  const token = getAuthToken();
  if (!agentId || !token) return [];

  try {
    const response = await fetch(
      `${matchingApiBase()}/gig-agents/agents/${agentId}/gigs?status=${encodeURIComponent(status)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!response.ok) return [];
    const data = await response.json();
    return extractGigIdsFromMatchingResponse(data);
  } catch {
    return [];
  }
}

async function fetchPendingFromProfile(): Promise<string[]> {
  const agentId = getAgentId();
  const token = getAuthToken();
  if (!agentId || !token) return [];

  try {
    const profileResponse = await fetch(repApiUrl(`/profiles/${agentId}`), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!profileResponse.ok) return [];

    const profileData = await profileResponse.json();
    if (!profileData.gigs || !Array.isArray(profileData.gigs)) return [];

    return profileData.gigs
      .filter((gig: { status?: string }) => gig.status === 'requested')
      .map((gig: { gigId?: { $oid?: string } | string }) => {
        const id = gig.gigId;
        if (id && typeof id === 'object' && '$oid' in id) return id.$oid;
        return typeof id === 'string' ? id : null;
      })
      .filter((id: string | null): id is string => Boolean(id));
  } catch {
    return [];
  }
}

async function fetchEnrolledFromProfile(): Promise<string[]> {
  const agentId = getAgentId();
  const token = getAuthToken();
  if (!agentId || !token) return [];

  try {
    const profileResponse = await fetch(repApiUrl(`/profiles/${agentId}`), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!profileResponse.ok) return [];

    const profileData = await profileResponse.json();
    if (!profileData.gigs || !Array.isArray(profileData.gigs)) return [];

    return profileData.gigs
      .filter((gig: { status?: string }) => gig.status === 'enrolled')
      .map((gig: { gigId?: { $oid?: string } | string }) => {
        const id = gig.gigId;
        if (id && typeof id === 'object' && '$oid' in id) return id.$oid;
        return typeof id === 'string' ? id : null;
      })
      .filter((id: string | null): id is string => Boolean(id));
  } catch {
    return [];
  }
}

// Fonction pour récupérer les demandes en attente
export const fetchPendingRequests = async (): Promise<string[]> => {
  const agentId = getAgentId();
  const token = getAuthToken();
  if (!agentId || !token) return [];

  const enrolledSet = new Set(await fetchMatchingAgentGigIds('enrolled'));

  const requestedIds = await fetchMatchingAgentGigIds('requested');
  const pendingIds = await fetchMatchingAgentGigIds('pending');
  const fromMatching = [...new Set([...requestedIds, ...pendingIds])].filter(
    (id) => !enrolledSet.has(id)
  );

  if (fromMatching.length > 0 || enrolledSet.size > 0) {
    return fromMatching;
  }

  const fromProfile = await fetchPendingFromProfile();
  return fromProfile.filter((id) => !enrolledSet.has(id));
};

// Fonction pour récupérer les gigs inscrits (matching DB first)
export const fetchEnrolledGigsFromProfile = async (): Promise<string[]> => {
  const agentId = getAgentId();
  const token = getAuthToken();
  if (!agentId || !token) return [];

  const fromMatching = await fetchMatchingAgentGigIds('enrolled');
  if (fromMatching.length > 0) return fromMatching;

  return fetchEnrolledFromProfile();
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
  const event = new CustomEvent('refreshGigStatuses');
  window.dispatchEvent(event);
};
