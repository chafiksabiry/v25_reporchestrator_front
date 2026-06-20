import { getAgentId } from '../utils/authUtils';

type EscrowMessage = {
  type?: string;
  repId?: string;
  companyId?: string;
  callId?: string;
  leadName?: string;
  ai_call_status?: string;
  validByAI?: boolean | null;
  completedAt?: string;
  [key: string]: unknown;
};

export type { EscrowMessage };

export type RepEscrowSocketOptions = {
  /** Called for every parsed WS message targeting this rep (after repId filter). */
  onEvent?: (data: EscrowMessage) => void;
};

function getWsUrl(): string | null {
  const base =
    import.meta.env.VITE_COMPORCHESTRATOR_BACK_URL ||
    'https://v25comporchestratorback-production.up.railway.app/api';

  try {
    const url = new URL(base);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    // The WS server is mounted at `/escrow-updates` on the server root, not under /api.
    url.pathname = '/escrow-updates';
    url.search = '';
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Connect to the escrow WebSocket and invoke `onWalletUpdate` whenever the
 * server books new commissions for the current rep. Returns a disposer that
 * closes the socket and stops reconnection.
 */
export function connectRepEscrowSocket(
  onWalletUpdate: () => void,
  options?: RepEscrowSocketOptions
): () => void {
  const wsUrl = getWsUrl();
  if (!wsUrl) return () => {};

  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  const WALLET_TYPES = new Set(['rep_wallet_update']);

  const connect = () => {
    if (disposed) return;
    try {
      socket = new WebSocket(wsUrl);
    } catch {
      scheduleReconnect();
      return;
    }

    socket.onmessage = (event) => {
      let data: EscrowMessage;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      if (!data?.type) return;

      // Only react to events targeting this rep.
      const myAgentId = getAgentId();
      if (data.repId && myAgentId && String(data.repId) !== String(myAgentId)) {
        return;
      }

      options?.onEvent?.(data);

      if (!WALLET_TYPES.has(data.type)) return;
      onWalletUpdate();
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
