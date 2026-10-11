/** Employed call-center agent (not marketplace rep). Set at login via authRedirect. */
export function isCallCenterStaff(): boolean {
  try {
    return typeof window !== 'undefined' && localStorage.getItem('callCenterStaff') === '1';
  } catch {
    return false;
  }
}
