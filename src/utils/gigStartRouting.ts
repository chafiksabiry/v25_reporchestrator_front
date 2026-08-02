import { getAgentId, getAuthToken } from './authUtils';

type StartTarget = 'training' | 'session-planning' | 'workspace';

export interface StartRouteDecision {
  target: StartTarget;
  reason: string;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseHHMMToMinutes(raw: unknown): number | null {
  const m = String(raw || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return h * 60 + mm;
}

function isReservationForToday(rawDate: unknown, now: Date): boolean {
  const v = String(rawDate || '').trim();
  if (!v) return false;
  if (ISO_DATE_RE.test(v)) {
    const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
    const todayIso = now.toISOString().slice(0, 10);
    return v === iso || v === todayIso;
  }
  const todayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  return v.toLowerCase() === todayName;
}

function normalizeTrainingBase(): string {
  const raw =
    import.meta.env.VITE_TRAINING_API_URL ||
    import.meta.env.VITE_TRAINING_BACKEND_URL ||
    'https://v25platformtrainingbackend-production.up.railway.app';
  return String(raw).replace(/\/$/, '');
}

function normalizeMatchingBase(): string {
  return String(
    import.meta.env.VITE_MATCHING_API_URL || 'https://v25matchingbackend-production.up.railway.app/api'
  ).replace(/\/$/, '');
}

async function hasGigTrainings(gigId: string, headers?: Record<string, string>): Promise<boolean> {
  const trainingBase = normalizeTrainingBase();
  const res = await fetch(
    `${trainingBase}/training_journeys/gig/${encodeURIComponent(gigId)}`,
    headers ? { headers } : undefined
  );
  if (!res.ok) return false;
  const payload = await res.json();
  const rows = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
  return rows.length > 0;
}

export async function resolveGigStartRoute(gigId: string): Promise<StartRouteDecision> {
  const repId = getAgentId();
  const token = getAuthToken();
  if (!repId || !gigId) {
    return { target: 'training', reason: 'Rep or gig missing' };
  }

  const headers = token ? ({ Authorization: `Bearer ${token}` } as Record<string, string>) : undefined;
  const matchingBase = normalizeMatchingBase();
  const trainingBase = normalizeTrainingBase();

  // Condition 1: enrolled in gig
  const enrolledRes = await fetch(
    `${matchingBase}/gig-agents/agents/${encodeURIComponent(repId)}/gigs?status=enrolled`,
    { headers }
  );
  if (!enrolledRes.ok) {
    return { target: 'training', reason: `Enrollment check failed (${enrolledRes.status})` };
  }
  const enrolledData = await enrolledRes.json();
  const enrolledRows = Array.isArray(enrolledData?.gigs) ? enrolledData.gigs : [];
  const isEnrolled = enrolledRows.some((row: any) => {
    const id = row?.gig?._id || row?.gig?.$oid || row?.gigId || '';
    return String(id) === String(gigId);
  });
  if (!isEnrolled) {
    return { target: 'training', reason: 'Rep not enrolled in this gig' };
  }

  // Condition 2: training completion on this gig
  const trainingRes = await fetch(
    `${trainingBase}/training_journeys/rep/${encodeURIComponent(
      repId
    )}/slide-progress-summary?gigId=${encodeURIComponent(gigId)}`,
    { headers }
  );
  if (!trainingRes.ok) {
    return { target: 'training', reason: `Training check failed (${trainingRes.status})` };
  }
  const summary = await trainingRes.json();
  const journeys = Array.isArray(summary?.data?.journeys) ? summary.data.journeys : [];
  const gigHasTrainings = await hasGigTrainings(gigId, headers);

  // Strict check: every journey for this gig must be 'completed' and reach 100%
  const isTrainingComplete = gigHasTrainings 
    ? journeys.length > 0 && journeys.every((j: any) => j.status === 'completed' && j.slidesSeen >= j.slidesTotal)
    : true;

  if (!isTrainingComplete) {
    return { target: 'training', reason: 'Training incomplete or quiz scores below 70 for this gig' };
  }

  // Condition 3: active reserved slot now
  const reservationsRes = await fetch(
    `${matchingBase}/slots/reservations?repId=${encodeURIComponent(repId)}&gigId=${encodeURIComponent(gigId)}`,
    { headers }
  );
  if (!reservationsRes.ok) {
    return { target: 'session-planning', reason: `Reservation check failed (${reservationsRes.status})` };
  }
  const reservations = await reservationsRes.json();
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const hasActiveReservation = (Array.isArray(reservations) ? reservations : []).some((r: any) => {
    if (String(r?.status || '').toLowerCase() !== 'reserved') return false;
    if (!isReservationForToday(r?.reservationDate || r?.date, now)) return false;
    const start = parseHHMMToMinutes(r?.startTime);
    const end = parseHHMMToMinutes(r?.endTime);
    if (start == null || end == null || end <= start) return false;
    // Check if current time matches the active slot strictly
    return nowMinutes >= start && nowMinutes < end;
  });

  if (!hasActiveReservation) {
    return { target: 'session-planning', reason: 'No active reserved slot right now' };
  }
  return { target: 'workspace', reason: 'All conditions satisfied' };
}

