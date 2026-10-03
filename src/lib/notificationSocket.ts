import { getAgentId } from '../utils/authUtils';
import type { RepNotificationKind } from '../contexts/NotificationsContext';
import { getDashRepApiHost } from '../utils/repApiUrl';

export type NotificationSocketPayload = {
  type?: string;
  repId?: string;
  created?: boolean;
  notification?: {
    id?: string;
    notificationKey?: string;
    kind?: RepNotificationKind | string;
    status?: string;
    gigId?: string;
    journeyId?: string;
    title?: string;
    message?: string;
    actionPath?: string;
    read?: boolean;
    createdAt?: number;
  };
};

function getWsUrl(): string | null {
  const host = getDashRepApiHost();
  if (!host) return null;
  try {
    const url = new URL(host);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    // WS is mounted at server root, not under /api.
    url.pathname = '/notification-updates';
    url.search = '';
    return url.toString();
  } catch {
    return null;
  }
}

export type NotificationSocketOptions = {
  onConnect?: () => void;
};

/**
 * Connect to dash_rep_back `/notification-updates` and receive durable
 * notification upserts in realtime (matching, teammate, training, KB, …).
 */
export function connectRepNotificationSocket(
  onNotification: (data: NotificationSocketPayload) => void,
  options?: NotificationSocketOptions
): () => void {
  const wsUrl = getWsUrl();
  if (!wsUrl) return () => {};

  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  const subscribe = () => {
    const repId = getAgentId();
    if (!socket || socket.readyState !== WebSocket.OPEN || !repId) return;
    try {
      socket.send(JSON.stringify({ type: 'subscribe', repId }));
    } catch {
      /* ignore */
    }
  };

  const scheduleReconnect = () => {
    if (disposed || reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, 3000);
  };

  const connect = () => {
    if (disposed) return;
    try {
      socket = new WebSocket(wsUrl);
    } catch {
      scheduleReconnect();
      return;
    }

    socket.onopen = () => {
      subscribe();
      options?.onConnect?.();
    };

    socket.onmessage = (event) => {
      let data: NotificationSocketPayload;
      try {
        data = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (data?.type !== 'notification' || !data.notification) return;

      const myAgentId = getAgentId();
      if (data.repId && myAgentId && String(data.repId) !== String(myAgentId)) {
        return;
      }
      onNotification(data);
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

  connect();

  return () => {
    disposed = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    try {
      socket?.close();
    } catch {
      /* ignore */
    }
    socket = null;
  };
}
