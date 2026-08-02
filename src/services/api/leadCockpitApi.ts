function getDashboardApiBase(): string {
  const raw =
    import.meta.env.VITE_DASHBOARD_COMPANY_API_URL ||
    'https://v25dashboardbackend-production.up.railway.app/api';
  return raw.replace(/\/$/, '');
}

export type CockpitClaimResult = {
  ok: boolean;
  status: number;
  success?: boolean;
  locked?: boolean;
  lockedBy?: string;
  message?: string;
  error?: string;
};

export async function claimCockpit(
  leadId: string,
  agentId: string,
  gigId?: string
): Promise<CockpitClaimResult> {
  const base = getDashboardApiBase();
  const res = await fetch(`${base}/leads/${encodeURIComponent(leadId)}/cockpit-claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, gigId }),
  });
  const data = await res.json().catch(() => ({}));
  return {
    ok: res.ok,
    status: res.status,
    success: data.success,
    locked: data.locked,
    lockedBy: data.lockedBy,
    message: data.message || data.error,
    error: data.error,
  };
}

export async function releaseCockpit(leadId: string, agentId: string): Promise<void> {
  const base = getDashboardApiBase();
  try {
    await fetch(`${base}/leads/${encodeURIComponent(leadId)}/cockpit-release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId }),
    });
  } catch (err) {
    console.warn('[leadCockpitApi] release failed:', err);
  }
}

export function isLeadCockpitLockedByOther(
  lead: {
    cockpitLockedBy?: string | { $oid?: string } | null;
    cockpitLockExpiresAt?: string | Date | null;
  },
  myAgentId: string | null | undefined
): boolean {
  if (!lead.cockpitLockedBy || !myAgentId) return false;
  const lockedBy =
    typeof lead.cockpitLockedBy === 'object' && lead.cockpitLockedBy !== null
      ? String((lead.cockpitLockedBy as { $oid?: string }).$oid || '')
      : String(lead.cockpitLockedBy);
  if (!lockedBy || lockedBy === String(myAgentId)) return false;
  if (!lead.cockpitLockExpiresAt) return true;
  return new Date(lead.cockpitLockExpiresAt) > new Date();
}
