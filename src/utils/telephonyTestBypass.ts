/**
 * Test bypass for Workspace telephony guards (training 100% + active reservation).
 *
 * Enable with any of:
 * - VITE_TELEPHONY_TEST_BYPASS=true (build-time)
 * - URL ?telephonyTest=1
 * - localStorage harx_telephony_test=1
 *
 * Enrollment in the gig is still required.
 * For Twilio dials, also set TELEPHONY_TEST_BYPASS=true on dash_calls_backend.
 */
const STORAGE_KEY = 'harx_telephony_test';

export function syncTelephonyTestBypassFromUrl(): void {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    const flag = params.get('telephonyTest');
    if (flag === '1' || flag === 'true') {
      localStorage.setItem(STORAGE_KEY, '1');
    } else if (flag === '0' || flag === 'false') {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function isTelephonyTestBypassEnabled(): boolean {
  if (import.meta.env.VITE_TELEPHONY_TEST_BYPASS === 'true') return true;
  if (typeof window === 'undefined') return false;
  try {
    syncTelephonyTestBypassFromUrl();
    const params = new URLSearchParams(window.location.search);
    if (params.get('telephonyTest') === '1' || params.get('telephonyTest') === 'true') {
      return true;
    }
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}
