import { getRouterBasename } from './routerBasename';

/** URL publique de partage d'un certificat (ex: https://…/reps/certification/CERT-1A2B3C4). */
export function buildCertificationShareUrl(certificateId: string): string {
  const id = String(certificateId || '').trim();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const base = getRouterBasename().replace(/\/$/, '');
  return `${origin}${base}/certification/${encodeURIComponent(id)}`;
}

/** URL pour ouvrir / émettre le certificat d'une formation (rep connecté). */
export function buildCertificationJourneyUrl(journeyId: string): string {
  const id = String(journeyId || '').trim();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const base = getRouterBasename().replace(/\/$/, '');
  return `${origin}${base}/certification/journey/${encodeURIComponent(id)}`;
}
