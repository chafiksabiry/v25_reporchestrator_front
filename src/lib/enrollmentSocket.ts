import { getAgentId } from '../utils/authUtils';

type EnrollmentMessage = {
  type?: string;
  repId?: string;
  gigId?: string;
  status?: string;
  [key: string]: unknown;
};

function getWsUrl(): string | null {
  const base =
    import.meta.env.VITE_MATCHING_API_URL ||
    'https://v25matchingbackend-production.up.railway.app/api';

  try {
    const url = new URL(base);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    // The WS server is mounted at `/enrollment-updates` on the server root, not under /api.
    url.pathname = '/enrollment-updates';
    url.search = '';
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Connect to the matching backend enrollment WebSocket and invoke
 * `onEnrollmentUpdate` whenever a company approves/changes the current rep's
 * enrollment (marketplace: PENDING → Enrolled, without a page reload).
 * Returns a disposer that closes the socket and stops reconnection.
 */
export function connectRepEnrollmentSocket(
  onEnrollmentUpdate: (data: EnrollmentMessage) => void
): () => void {
  const wsUrl = getWsUrl();
  if (!wsUrl) return () => {};

  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  const RELEVANT_TYPES = new Set(['enrollment_update']);

  const connect = () => {
    if (disposed) return;
    try {
      socket = new WebSocket(wsUrl);
    } catch {
      scheduleReconnect();
      return;
    }

    socket.onmessage = (event) => {
      let data: EnrollmentMessage;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      if (!data?.type || !RELEVANT_TYPES.has(data.type)) return;

      // Only react to events targeting this rep.
      const myAgentId = getAgentId();
      if (data.repId && myAgentId && String(data.repId) !== String(myAgentId)) {
        return;
      }
      onEnrollmentUpdate(data);
    };

    socket.onclose = () => {
      socket = null;
      scheduleReconnect();
    };

    socket.onerror = () => {
      try {
        socket?.close();
      } catch {
        /* ignore */
      }
    };
  };

  const scheduleReconnect = () => {
    if (disposed || reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, 5000);
  };

  connect();

  return () => {
    disposed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    try {
      socket?.close();
    } catch {
      /* ignore */
    }
  };
}
