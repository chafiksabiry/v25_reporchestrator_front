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

export const HARX_REMEMBER_KEY = 'harx_remember';
export const HARX_REMEMBER_EMAIL_KEY = 'harx_remember_email';
const HARX_SESSION_COOKIE = 'harx_session';

function hasSessionCookie(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split(';').some((part) => part.trim().startsWith(`${HARX_SESSION_COOKIE}=`));
}

function writeSessionCookie(active: boolean): void {
  if (typeof document === 'undefined') return;
  document.cookie = active
    ? `${HARX_SESSION_COOKIE}=1; path=/; SameSite=Lax`
    : `${HARX_SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

function clearUserIdCookies(): void {
  if (typeof document === 'undefined') return;
  document.cookie = 'userId=; path=/; max-age=0; SameSite=Lax';
  document.cookie = 'userId=; path=/; max-age=0';
}

/** Drop a session-only login once the browser has been closed. */
export function reconcileAuthPersistence(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (localStorage.getItem(HARX_REMEMBER_KEY) !== '0' || hasSessionCookie()) return;
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    clearUserIdCookies();
  } catch {
    /* ignore */
  }
}

export function persistAuthToken(token: string | null, remember = true): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (!token) {
      localStorage.removeItem('token');
      localStorage.removeItem(HARX_REMEMBER_KEY);
      writeSessionCookie(false);
      return;
    }
    localStorage.setItem('token', token);
    if (remember) {
      localStorage.setItem(HARX_REMEMBER_KEY, '1');
      writeSessionCookie(false);
    } else {
      localStorage.setItem(HARX_REMEMBER_KEY, '0');
      writeSessionCookie(true);
    }
  } catch {
    /* ignore */
  }
}

export function rememberLoginEmail(email: string | null): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const value = email?.trim();
    if (value) localStorage.setItem(HARX_REMEMBER_EMAIL_KEY, value);
    else localStorage.removeItem(HARX_REMEMBER_EMAIL_KEY);
  } catch {
    /* ignore */
  }
}

export function readRememberedEmail(): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(HARX_REMEMBER_EMAIL_KEY);
  } catch {
    return null;
  }
}

export function readStoredAuthToken(): string | null {
  reconcileAuthPersistence();
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

reconcileAuthPersistence();
