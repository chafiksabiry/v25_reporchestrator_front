import { GA_MEASUREMENT_ID } from './constants';
import { buildTrackingPath, resolvePageMeta, type PageMeta } from './pageMeta';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    _mfq?: Array<string | string[]>;
    __harxMfPageTimer?: ReturnType<typeof setTimeout>;
    __harxMfLastPath?: string;
    __harxMfInitialLoadDone?: boolean;
  }
}

/**
 * Mouseflow already records the first full page load.
 * Extra newPageView on startup creates a ~1s phantom page and ends the replay early.
 */
function pushMouseflowPageView(pagePath: string, title: string) {
  window._mfq = window._mfq || [];

  if (!window.__harxMfInitialLoadDone) {
    window.__harxMfInitialLoadDone = true;
    window.__harxMfLastPath = pagePath;
    return;
  }

  if (window.__harxMfLastPath === pagePath) return;
  window.__harxMfLastPath = pagePath;

  if (window.__harxMfPageTimer) clearTimeout(window.__harxMfPageTimer);
  window.__harxMfPageTimer = setTimeout(() => {
    window._mfq?.push(['newPageView', pagePath, title]);
    window.__harxMfPageTimer = undefined;
  }, 400);
}

function upsertMeta(name: string, content: string, attribute: 'name' | 'property' = 'name') {
  let tag = document.querySelector(`meta[${attribute}="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = href;
}

export function trackPageView(path?: string): void {
  const pagePath = path ?? buildTrackingPath();

  if (typeof window.gtag === 'function') {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: pagePath,
      page_title: document.title,
    });
  }

  pushMouseflowPageView(pagePath, document.title);
}

export function updatePageHead(meta: PageMeta): void {
  document.title = meta.title;
  upsertMeta('description', meta.description);
  upsertMeta('og:title', meta.title, 'property');
  upsertMeta('og:description', meta.description, 'property');
  if (meta.canonical) {
    upsertMeta('og:url', meta.canonical, 'property');
    upsertCanonical(meta.canonical);
  }
}

export function syncVisitorTracking(path?: string): void {
  const pagePath = path ?? buildTrackingPath();
  const meta = resolvePageMeta(pagePath);
  updatePageHead(meta);
  trackPageView(pagePath);
}
