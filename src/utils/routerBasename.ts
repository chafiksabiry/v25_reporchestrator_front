import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper';

/**
 * React Router basename for the unified rep app.
 *
 * The whole unified app (onboarding orchestrator + dashboard + profile
 * creation + wizard + assessments) is mounted by the qiankun host under the
 * single `/reps` prefix. The basename must match how the app is
 * mounted (host `activeRule`), otherwise no routes match and the catch-all
 * redirect fires.
 */
const MOUNT_PREFIX = '/reps';

export function getRouterBasename(): string {
  if (typeof window === 'undefined') {
    return import.meta.env.VITE_RUN_MODE === 'standalone' ? '/' : MOUNT_PREFIX;
  }
  if (qiankunWindow.__POWERED_BY_QIANKUN__) {
    return MOUNT_PREFIX;
  }
  const p = window.location.pathname;
  if (p === MOUNT_PREFIX || p.startsWith(`${MOUNT_PREFIX}/`)) {
    return MOUNT_PREFIX;
  }
  return '/';
}
