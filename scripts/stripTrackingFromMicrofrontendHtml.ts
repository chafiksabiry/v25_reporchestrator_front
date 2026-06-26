/** Remove third-party tracking scripts from MFE HTML served to qiankun (host loads them once). */
export function stripHostManagedTrackingScripts($: {
  (selector: string): { remove(): void; each(fn: (i: number, el: unknown) => void): void };
  (el: unknown): { html(): string | null };
}): void {
  $('script[src*="googletagmanager.com/gtag"]').remove();
  $('script#harx-gtag-init').remove();
  $('script[src*="cdn.mouseflow.com"]').remove();
  $('script').each((_, el) => {
    const text = $(el).html() || '';
    if (text.includes('window._mfq') || text.includes('function gtag')) {
      $(el).remove();
    }
  });
  $('#zsiqscript').remove();
  $('script[src*="salesiq.zohopublic.com"]').remove();
  $('script').each((_, el) => {
    const text = $(el).html() || '';
    if (text.includes('$zoho.salesiq')) {
      $(el).remove();
    }
  });
}
