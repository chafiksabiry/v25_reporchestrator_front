/** Strip trailing slashes and a trailing `/api` from env base URLs. */
export const stripApiSuffix = (url?: string) =>
  (url || '').replace(/\/+$/, '').replace(/\/api$/, '');

const REP_API_HOST = stripApiSuffix(import.meta.env.VITE_REP_API_URL);
const REP_DASH_API_HOST = stripApiSuffix(
  import.meta.env.VITE_REP_DASH_API_URL ||
    'https://v25dashrepback-production.up.railway.app/api'
);

function buildApiUrl(host: string, path: string): string {
  let normalized = path.startsWith('/') ? path : `/${path}`;
  if (!normalized.startsWith('/api')) {
    normalized = `/api${normalized}`;
  }
  return `${host}${normalized}`;
}

/**
 * Build a full URL to the reps wizard backend.
 * Accepts `/profiles/...` or `/api/profiles/...` — never produces `/api/api/...`.
 */
export function repApiUrl(path: string): string {
  return buildApiUrl(REP_API_HOST, path);
}

/** Rep dashboard backend (v25_dash_rep_back) — video analysis, profile APIs. */
export function dashRepApiUrl(path: string): string {
  return buildApiUrl(REP_DASH_API_HOST, path);
}

export function getRepApiHost(): string {
  return REP_API_HOST;
}

export function getDashRepApiHost(): string {
  return REP_DASH_API_HOST;
}
