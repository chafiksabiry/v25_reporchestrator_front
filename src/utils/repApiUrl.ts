/** Strip trailing slashes and a trailing `/api` from env base URLs. */
export const stripApiSuffix = (url?: string) =>
  (url || '').replace(/\/+$/, '').replace(/\/api$/, '');

const REP_API_HOST = stripApiSuffix(import.meta.env.VITE_REP_API_URL);

/**
 * Build a full URL to the reps wizard backend.
 * Accepts `/profiles/...` or `/api/profiles/...` — never produces `/api/api/...`.
 */
export function repApiUrl(path: string): string {
  let normalized = path.startsWith('/') ? path : `/${path}`;
  if (!normalized.startsWith('/api')) {
    normalized = `/api${normalized}`;
  }
  return `${REP_API_HOST}${normalized}`;
}

export function getRepApiHost(): string {
  return REP_API_HOST;
}
