import { dashRepApiUrl } from '../../utils/repApiUrl';
import { getAgentId, getAuthToken } from '../../utils/authUtils';
import type { RepNotificationKind } from '../../contexts/NotificationsContext';

export type ApiNotification = {
  id: string;
  notificationKey?: string;
  kind: RepNotificationKind;
  status?: string;
  gigId?: string;
  journeyId?: string;
  title: string;
  message: string;
  actionPath?: string;
  read: boolean;
  createdAt: number;
  updatedAt?: number;
};

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  const agentId = getAgentId();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (agentId) headers['x-agent-id'] = agentId;
  return headers;
}

async function parseJson<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof (json as { message?: unknown }).message === 'string'
        ? (json as { message: string }).message
        : `HTTP ${res.status}`;
    throw new Error(message);
  }
  return json as T;
}

export async function fetchNotifications(unreadOnly = false): Promise<ApiNotification[]> {
  const qs = unreadOnly ? '?unreadOnly=true' : '';
  const json = await parseJson<{ success?: boolean; data?: ApiNotification[] }>(
    await fetch(dashRepApiUrl(`/notifications${qs}`), { headers: authHeaders() })
  );
  return Array.isArray(json.data) ? json.data : [];
}

export async function upsertNotificationApi(input: {
  notificationKey: string;
  kind: RepNotificationKind;
  title: string;
  message: string;
  gigId?: string;
  journeyId?: string;
  actionPath?: string;
  read?: boolean;
  status?: string;
}): Promise<ApiNotification | null> {
  const json = await parseJson<{ success?: boolean; data?: ApiNotification }>(
    await fetch(dashRepApiUrl('/notifications/upsert'), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(input),
    })
  );
  return json.data ?? null;
}

export async function markNotificationRead(id: string, read: boolean): Promise<void> {
  await parseJson(
    await fetch(dashRepApiUrl(`/notifications/${encodeURIComponent(id)}/read`), {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ read }),
    })
  );
}

export async function markAllNotificationsRead(): Promise<void> {
  await parseJson(
    await fetch(dashRepApiUrl('/notifications/mark-all-read'), {
      method: 'PATCH',
      headers: authHeaders(),
    })
  );
}

export async function deleteNotification(id: string): Promise<void> {
  await parseJson(
    await fetch(dashRepApiUrl(`/notifications/${encodeURIComponent(id)}`), {
      method: 'DELETE',
      headers: authHeaders(),
    })
  );
}

export async function deleteNotificationByKey(notificationKey: string): Promise<void> {
  await parseJson(
    await fetch(dashRepApiUrl(`/notifications/key/${encodeURIComponent(notificationKey)}`), {
      method: 'DELETE',
      headers: authHeaders(),
    })
  );
}

export async function clearAllNotifications(): Promise<void> {
  await parseJson(
    await fetch(dashRepApiUrl('/notifications'), {
      method: 'DELETE',
      headers: authHeaders(),
    })
  );
}
