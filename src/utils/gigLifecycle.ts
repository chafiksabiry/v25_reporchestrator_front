/**
 * Company gig lifecycle (to_activate | active | inactive | archived).
 * Distinct from enrollment status (enrolled | invited | …).
 * REP dropdowns / lists / leads must only use lifecycle-active gigs.
 */

export function isGigLifecycleActive(gigOrStatus: unknown): boolean {
  if (gigOrStatus == null) return false;
  if (typeof gigOrStatus === 'string') {
    return gigOrStatus.trim().toLowerCase() === 'active';
  }
  if (typeof gigOrStatus === 'object') {
    const status = (gigOrStatus as { status?: unknown }).status;
    return String(status || '')
      .trim()
      .toLowerCase() === 'active';
  }
  return false;
}
