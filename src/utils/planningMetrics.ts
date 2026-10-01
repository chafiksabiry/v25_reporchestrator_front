/** Engagement % color: red <50, orange 50–99, green ≥100. Daily 0 with activity → green. */
export function engagementTone(
  planned: number,
  required: number,
  opts?: { dailyZeroWithActivity?: boolean }
): 'red' | 'orange' | 'green' | 'neutral' {
  if (opts?.dailyZeroWithActivity && planned === 0 && required === 0) return 'green';
  if (!(required > 0)) {
    if (planned > 0) return 'green';
    return 'neutral';
  }
  const pct = (planned / required) * 100;
  if (pct < 50) return 'red';
  if (pct < 100) return 'orange';
  return 'green';
}

export const ENGAGEMENT_TONE_CLASS: Record<
  'red' | 'orange' | 'green' | 'neutral',
  { text: string; bg: string; ring: string }
> = {
  red: { text: 'text-rose-300', bg: 'bg-rose-500/20', ring: 'ring-rose-400/30' },
  orange: { text: 'text-amber-300', bg: 'bg-amber-500/20', ring: 'ring-amber-400/30' },
  green: { text: 'text-emerald-300', bg: 'bg-emerald-500/20', ring: 'ring-emerald-400/30' },
  neutral: { text: 'text-white', bg: 'bg-white/10', ring: 'ring-white/15' },
};

export function resolveIanaZone(tz: unknown): string | null {
  if (!tz) return null;
  if (typeof tz === 'string') {
    const s = tz.trim();
    if (s.includes('/')) return s;
    return null;
  }
  if (typeof tz === 'object') {
    const o = tz as Record<string, unknown>;
    const name = String(o.zoneName || o.name || o.iana || '').trim();
    if (name.includes('/')) return name;
  }
  return null;
}

/**
 * Morocco returned to permanent GMT (UTC+0) on 20 Sep 2026 at 02:00 GMT+1,
 * which is 01:00 UTC (décret n° 2.26.530). Windows and browser timezone data
 * still report Africa/Casablanca as UTC+1, so Paris looks only 1 hour ahead
 * during European summer time. The real gap until France leaves summer time
 * is 2 hours.
 */
const MOROCCO_IANA = new Set(['Africa/Casablanca', 'Africa/El_Aaiun']);
const MOROCCO_PERMANENT_GMT_UTC = Date.UTC(2026, 8, 20, 1, 0, 0);

function icuOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
  let hour = get('hour');
  if (hour === 24) hour = 0;
  const wall = Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'));
  return Math.round((wall - instant.getTime()) / 60000);
}

function zoneOffsetMinutes(instant: Date, timeZone: string): number {
  const icu = icuOffsetMinutes(instant, timeZone);
  if (
    MOROCCO_IANA.has(timeZone) &&
    instant.getTime() >= MOROCCO_PERMANENT_GMT_UTC &&
    icu === 60
  ) {
    return 0;
  }
  return icu;
}

/** Interpret wall-clock date+HH:mm in `sourceTz` as a UTC Date (DST-aware). */
export function zonedWallTimeToUtc(
  dateStr: string,
  hhmm: string,
  sourceTz: string
): Date | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  const tm = /^(\d{1,2}):(\d{2})/.exec(hhmm);
  if (!dm || !tm) return null;
  const y = Number(dm[1]);
  const mo = Number(dm[2]);
  const d = Number(dm[3]);
  const hh = Number(tm[1]);
  const mi = Number(tm[2]);
  let guess = Date.UTC(y, mo - 1, d, hh, mi, 0);
  const wanted = Date.UTC(y, mo - 1, d, hh, mi, 0);
  for (let i = 0; i < 4; i++) {
    const off = zoneOffsetMinutes(new Date(guess), sourceTz);
    const wallInstant = new Date(guess + off * 60000);
    const actual = Date.UTC(
      wallInstant.getUTCFullYear(),
      wallInstant.getUTCMonth(),
      wallInstant.getUTCDate(),
      wallInstant.getUTCHours(),
      wallInstant.getUTCMinutes(),
      wallInstant.getUTCSeconds()
    );
    const delta = wanted - actual;
    if (delta === 0) break;
    guess += delta;
  }
  return new Date(guess);
}

export function formatTimeInZone(date: Date, timeZone: string): string {
  const real = zoneOffsetMinutes(date, timeZone);
  const icu = icuOffsetMinutes(date, timeZone);
  if (real !== icu) {
    const shifted = new Date(date.getTime() + real * 60000);
    const hh = String(shifted.getUTCHours()).padStart(2, '0');
    const mm = String(shifted.getUTCMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

/** Extract a short city/region label from an IANA timezone string.
 *  "Europe/Paris" → "Paris", "Africa/Casablanca" → "Casablanca", "America/New_York" → "New York" */
export function ianaToCity(tz: string): string {
  const parts = tz.split('/');
  return (parts[parts.length - 1] || tz).replace(/_/g, ' ');
}

/**
 * Display slot range in DUAL timezone mode.
 *
 * Returns:
 *  - `repLabel`  : slot time converted to the REP's browser timezone  (where they are)
 *  - `gigLabel`  : slot time in the GIG destination timezone (where prospects are)
 *  - `repCity`   : short city name for REP tz  (e.g. "Casablanca")
 *  - `gigCity`   : short city name for GIG tz  (e.g. "Paris")
 *  - `label`     : fallback — repLabel when different TZs, raw otherwise
 *  - `hint`      : tooltip-friendly full info string
 *  - `dualZone`  : true when the two timezones differ (show both rows in UI)
 */
export function formatSlotTimeRange(
  dateStr: string,
  startTime: string,
  endTime: string,
  gigTimeZone?: unknown
): { label: string; hint?: string; repLabel?: string; gigLabel?: string; repCity?: string; gigCity?: string; dualZone?: boolean } {
  const raw = `${String(startTime || '').slice(0, 5)} – ${String(endTime || '').slice(0, 5)}`;
  const sourceTz = resolveIanaZone(gigTimeZone);
  const displayTz =
    typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : null;
  if (!sourceTz || !displayTz || !dateStr) {
    return { label: raw };
  }
  const gigCity = ianaToCity(sourceTz);
  const repCity = ianaToCity(displayTz);
  if (sourceTz === displayTz) {
    // Same timezone — no dual display needed
    return { label: raw, hint: sourceTz, repLabel: raw, gigLabel: raw, repCity, gigCity, dualZone: false };
  }
  const startUtc = zonedWallTimeToUtc(dateStr, startTime, sourceTz);
  const endUtc = zonedWallTimeToUtc(dateStr, endTime, sourceTz);
  if (!startUtc || !endUtc) return { label: raw, hint: sourceTz };
  const repLabel = `${formatTimeInZone(startUtc, displayTz)} – ${formatTimeInZone(endUtc, displayTz)}`;
  const gigLabel = raw; // GIG wall-clock time (as stored)
  return {
    label: repLabel,
    hint: `${repLabel} (${repCity}) · ${gigLabel} (${gigCity})`,
    repLabel,
    gigLabel,
    repCity,
    gigCity,
    dualZone: true,
  };
}

export type StatsPeriod = 'week' | 'month' | 'quarter' | 'year';

/** Local calendar yyyy-MM-dd (avoids UTC shift from toISOString). */
export function toLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Start of period (local midnight): week = Monday, month = 1st, etc. */
export function periodStart(period: StatsPeriod, now = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (period === 'week') {
    const day = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
    d.setDate(d.getDate() - day);
    return d;
  }
  if (period === 'month') {
    d.setDate(1);
    return d;
  }
  if (period === 'quarter') {
    const q = Math.floor(d.getMonth() / 3) * 3;
    d.setMonth(q, 1);
    return d;
  }
  d.setMonth(0, 1);
  return d;
}

/**
 * Inclusive end of period (local end-of-day wall date):
 * week = Sunday of the current Mon–Sun week,
 * month = last calendar day of the current month.
 */
export function periodEnd(period: StatsPeriod, now = new Date()): Date {
  const start = periodStart(period, now);
  const d = new Date(start);
  if (period === 'week') {
    d.setDate(d.getDate() + 6);
  } else if (period === 'month') {
    d.setMonth(d.getMonth() + 1, 0);
  } else if (period === 'quarter') {
    d.setMonth(d.getMonth() + 3, 0);
  } else {
    d.setMonth(12, 0);
  }
  d.setHours(23, 59, 59, 999);
  return d;
}

export function isDateInPeriod(dateStr: string, period: StatsPeriod, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return false;
  const ymd = dateStr.slice(0, 10);
  return ymd >= toLocalYmd(periodStart(period, now)) && ymd <= toLocalYmd(periodEnd(period, now));
}
