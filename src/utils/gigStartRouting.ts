import { getAgentId, getAuthToken } from './authUtils';
import { getGigsApiBase } from './gigsApiBase';
import { isReservationActiveNow, resolveIanaZone } from './planningMetrics';

type StartTarget = 'training' | 'session-planning' | 'workspace';

export interface StartRouteDecision {
  target: StartTarget;
  reason: string;
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
  let gigTz: string | null = 'Europe/Paris';
  try {
    const gigRes = await fetch(`${getGigsApiBase()}/gigs/${encodeURIComponent(gigId)}`, {
      headers,
    });
    if (gigRes.ok) {
      const gigPayload = await gigRes.json();
      const gigDoc = gigPayload?.data || gigPayload?.gig || gigPayload;
      gigTz =
        resolveIanaZone(gigDoc?.availability?.time_zone) ||
        resolveIanaZone(gigDoc?.availability?.timeZone) ||
        'Europe/Paris';
    }
  } catch {
    /* default Europe/Paris */
  }

  const hasActiveReservation = (Array.isArray(reservations) ? reservations : []).some((r: any) =>
    isReservationActiveNow(r, { gigTz })
  );

  if (!hasActiveReservation) {
    return { target: 'session-planning', reason: 'No active reserved slot right now' };
  }
  return { target: 'workspace', reason: 'All conditions satisfied' };
}

