import {
  GA_MEASUREMENT_ID,
  MOUSEFLOW_PROJECT_SRC,
  ZOHO_SALESIQ_WIDGET_SRC,
} from './constants';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    _mfq?: Array<string | string[]>;
    $zoho?: { salesiq?: { ready?: () => void } };
    __POWERED_BY_QIANKUN__?: boolean;
  }
}

function isQiankunChild(): boolean {
  return typeof window !== 'undefined' && Boolean(window.__POWERED_BY_QIANKUN__);
}

function appendScript(id: string | null, src: string | null, inline?: string) {
  if (id && document.getElementById(id)) return;
  if (src && document.querySelector(`script[src="${src}"]`)) return;

  const script = document.createElement('script');
  if (id) script.id = id;
  if (src) {
    script.src = src;
    script.defer = true;
  }
  if (inline) script.text = inline;
  document.head.appendChild(script);
}

export function initVisitorTrackingScripts(): void {
  if (typeof document === 'undefined') return;
  if (isQiankunChild()) return;

  appendScript(null, `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`);
  appendScript(
    'harx-gtag-init',
    null,
    `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}',{send_page_view:true});`
  );

  if (!document.querySelector('script[src*="cdn.mouseflow.com/projects/da6228dd"]')) {
    appendScript(null, MOUSEFLOW_PROJECT_SRC);
  }

  window.$zoho = window.$zoho || {};
  window.$zoho.salesiq = window.$zoho.salesiq || { ready() {} };
  appendScript('zsiqscript', ZOHO_SALESIQ_WIDGET_SRC);
}
