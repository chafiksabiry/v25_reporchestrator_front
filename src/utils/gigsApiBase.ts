/**
 * Gigs manual-creation API base URL.
 *
 * The shell at harx.ai currently loads the *-dev microfrontend (qiankun),
 * which is built with VITE_BACKEND_URL_GIGS → Railway *development*.
 * When the host page is production (harx.ai), prefer the production gigs API
 * so edits in the `harx` Mongo DB appear in the UI.
 */
const PROD_GIGS_API =
  'https://v25gigsmanualcreationbackend-production.up.railway.app/api';

const PROD_HOSTS = new Set(['harx.ai', 'www.harx.ai']);

function trimApi(url: string): string {
  return url.replace(/\/+$/, '');
}

export function getGigsApiBase(): string {
  const baked = trimApi(
    import.meta.env.VITE_BACKEND_URL_GIGS ||
      import.meta.env.VITE_API_URL_GIGS ||
      import.meta.env.VITE_GIGS_API_URL ||
      ''
  );

  if (typeof window !== 'undefined' && PROD_HOSTS.has(window.location.hostname)) {
    return PROD_GIGS_API;
  }

  return baked || PROD_GIGS_API;
}
