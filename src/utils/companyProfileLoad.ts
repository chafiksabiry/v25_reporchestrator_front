import type { CompanyProfileData } from './companyProfileStorage';

/** Normalize Mongo-style ids (string, { $oid }, nested _id). */
export function normalizeEntityId(id: unknown): string | null {
  if (id == null) return null;
  if (typeof id === 'string') return id;
  if (typeof id === 'object' && id !== null && '$oid' in id) {
    return String((id as { $oid: string }).$oid);
  }
  if (typeof id === 'object' && id !== null && '_id' in id) {
    return normalizeEntityId((id as { _id: unknown })._id);
  }
  return String(id);
}

/** Same response parsing as GigDetails `fetchGigDetails`. */
export async function fetchGigDetailsPayload(gigId: string): Promise<Record<string, unknown>> {
  const response = await fetch(`${import.meta.env.VITE_BACKEND_URL_GIGS}/gigs/${gigId}/details`);
  if (!response.ok) {
    throw new Error(`Impossible de charger le gig (${response.status})`);
  }
  const data = await response.json();
  if (data.success && data.data) return data.data as Record<string, unknown>;
  if (data.data) return data.data as Record<string, unknown>;
  if (data._id) return data as Record<string, unknown>;
  throw new Error('Réponse gig invalide');
}

/** Find first populated company on public/active gig list (new tab, no gigId in URL). */
export async function fetchCompanyFromGigsListing(targetCompanyId: string): Promise<CompanyProfileData | null> {
  const base = import.meta.env.VITE_BACKEND_URL_GIGS;
  let response = await fetch(`${base}/gigs/active`);
  if (!response.ok) {
    response = await fetch(`${base}/gigs`);
  }
  if (!response.ok) return null;

  const json = await response.json();
  const rawList = json.data ?? json.gigs ?? (Array.isArray(json) ? json : null);
  if (!Array.isArray(rawList)) return null;

  for (const gig of rawList) {
    const c = gig?.companyId;
    if (!c || typeof c !== 'object') continue;
    const cid = normalizeEntityId((c as { _id?: unknown })._id);
    if (cid === targetCompanyId) {
      return c as CompanyProfileData;
    }
  }
  return null;
}
