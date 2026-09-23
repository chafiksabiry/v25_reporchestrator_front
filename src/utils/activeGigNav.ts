const ACTIVE_GIG_KEY = 'activeGigId';

export function getActiveGigId(): string {
  try {
    return String(sessionStorage.getItem(ACTIVE_GIG_KEY) || '').trim();
  } catch {
    return '';
  }
}

export function persistActiveGigId(gigId?: string | null): void {
  try {
    const id = String(gigId || '').trim();
    if (id) {
      sessionStorage.setItem(ACTIVE_GIG_KEY, id);
      sessionStorage.setItem('training_gig_filter', id);
    } else {
      sessionStorage.removeItem(ACTIVE_GIG_KEY);
    }
  } catch {
    /* ignore quota / private mode */
  }
}

/** Append the current gig to a path unless one is already present. */
export function withActiveGig(path: string, gigId?: string | null): string {
  const id = String(gigId || getActiveGigId() || '').trim();
  if (!id || !path) return path;
  const qIndex = path.indexOf('?');
  const base = qIndex >= 0 ? path.slice(0, qIndex) : path;
  const params = new URLSearchParams(qIndex >= 0 ? path.slice(qIndex + 1) : '');
  if (!params.get('gigId')) params.set('gigId', id);
  return `${base}?${params.toString()}`;
}
