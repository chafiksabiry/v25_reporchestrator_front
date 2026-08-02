/**
 * Billing rule: any started minute counts as a full minute.
 *   10s  → 1 min
 *   62s  → 2 min (1m02s)
 */
export function billedMinutesFromSeconds(seconds?: number | null): number {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  if (s === 0) return 0;
  return Math.ceil(s / 60);
}

/** Display call duration as billed minutes only (no seconds). */
export function formatBilledMinutesFromSeconds(seconds?: number | null): string {
  const m = billedMinutesFromSeconds(seconds);
  if (m === 0) return '0 min';
  return `${m} min`;
}

/** Wallet balance is stored as fractional minutes; show whole minutes only. */
export function formatWalletMinutesBalance(floatMinutes?: number | null): string {
  const n = Number(floatMinutes);
  if (!Number.isFinite(n)) return '0 min';
  const isNegative = n < 0;
  const whole = Math.floor(Math.abs(n));
  return `${isNegative ? '-' : ''}${whole.toLocaleString('en-US')} min`;
}
