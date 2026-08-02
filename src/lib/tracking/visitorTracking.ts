import { GA_MEASUREMENT_ID } from './constants';
import { buildTrackingPath, resolvePageMeta, type PageMeta } from './pageMeta';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Mouseflow records the full session automatically on SPAs (History API).
 * Manual newPageView() fragments replays into short clips — do not call it.
 */

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

/** Update document title + meta tags only (safe in qiankun child MFEs). */
export function syncPageHead(path?: string): void {
  const pagePath = path ?? buildTrackingPath();
  updatePageHead(resolvePageMeta(pagePath));
}

export function trackPageView(path?: string): void {
  const pagePath = path ?? buildTrackingPath();

  if (typeof window.gtag === 'function') {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: pagePath,
      page_title: document.title,
    });
  }
}

export function syncVisitorTracking(path?: string): void {
  syncPageHead(path);
  trackPageView(path);
}
