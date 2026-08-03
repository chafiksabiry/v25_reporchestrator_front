/**
 * Cross-microfrontend auth sync (same browser tab + other tabs).
 * Keep this file identical across registration / reps / company / shell.
 */

export const HARX_AUTH_EVENT = 'harx:auth-changed';

export type HarxAuthDetail = {
  token: string | null;
  userId: string | null;
  source?: string;
};

export function readStoredAuthToken(): string | null {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
}

export function readStoredUserId(): string | null {
  try {
    return localStorage.getItem('userId');
  } catch {
    return null;
  }
}

export function broadcastAuthChanged(
  detail: Partial<HarxAuthDetail> & { source?: string } = {}
): void {
  if (typeof window === 'undefined') return;
  const payload: HarxAuthDetail = {
    token: detail.token !== undefined ? detail.token : readStoredAuthToken(),
    userId: detail.userId !== undefined ? detail.userId : readStoredUserId(),
    source: detail.source,
  };
  try {
    window.dispatchEvent(new CustomEvent(HARX_AUTH_EVENT, { detail: payload }));
  } catch {
    /* ignore */
  }
}

export function subscribeAuthChanged(
  handler: (detail: HarxAuthDetail) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const emitFromStorage = (source: string) => {
    handler({
      token: readStoredAuthToken(),
      userId: readStoredUserId(),
      source,
    });
  };

  const onCustom = (e: Event) => {
    const ce = e as CustomEvent<HarxAuthDetail>;
    handler(
      ce.detail ?? {
        token: readStoredAuthToken(),
        userId: readStoredUserId(),
        source: 'event',
      }
    );
  };

  const onStorage = (e: StorageEvent) => {
    if (e.key === 'token' || e.key === 'userId' || e.key === null) {
      emitFromStorage('storage');
    }
  };

  const onVisibility = () => {
    if (document.visibilityState === 'visible') emitFromStorage('visibility');
  };

  const onFocus = () => emitFromStorage('focus');
  const onPageShow = () => emitFromStorage('pageshow');

  window.addEventListener(HARX_AUTH_EVENT, onCustom as EventListener);
  window.addEventListener('storage', onStorage);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('focus', onFocus);
  window.addEventListener('pageshow', onPageShow);

  return () => {
    window.removeEventListener(HARX_AUTH_EVENT, onCustom as EventListener);
    window.removeEventListener('storage', onStorage);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('focus', onFocus);
    window.removeEventListener('pageshow', onPageShow);
  };
}
