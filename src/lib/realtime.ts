import { io, type Socket } from 'socket.io-client';
import { getAgentId, getAuthToken } from '../utils/authUtils';

/**
 * Shared real-time client (Socket.IO) for the rep app.
 *
 * A single connection to the matching backend is reused across the whole app.
 * The server places this client in its `rep:<agentId>` room, so we only receive
 * events that target this rep (enrollment updates, new invitations, ...).
 *
 * Usage:
 *   const dispose = onRealtimeEvent((evt) => { ... }, ['enrollment_update']);
 *   // later: dispose();
 */

export type RealtimeEvent = {
  type: string;
  payload: Record<string, unknown>;
  ts: number;
};

let socket: Socket | null = null;

function getOrigin(): string | null {
  const base =
    import.meta.env.VITE_MATCHING_API_URL ||
    'https://v25matchingbackend-production.up.railway.app/api';
  try {
    return new URL(base).origin;
  } catch {
    return null;
  }
}

/** Lazily create (and reuse) the shared socket, authenticated as this rep. */
export function getRealtimeSocket(): Socket | null {
  if (socket) return socket;

  const origin = getOrigin();
  const agentId = getAgentId();
  if (!origin || !agentId) return null;

  socket = io(origin, {
    transports: ['websocket', 'polling'],
    auth: { role: 'rep', userId: agentId, token: getAuthToken() || undefined },
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000
  });

  return socket;
}

/**
 * Subscribe to real-time events. Optionally filter by event `types`.
 * Returns a disposer that removes the listener (it does NOT close the shared
 * socket, since other parts of the app may still use it).
 */
export function onRealtimeEvent(
  handler: (evt: RealtimeEvent) => void,
  types?: string[]
): () => void {
  const s = getRealtimeSocket();
  if (!s) return () => {};

  const typeSet = types && types.length ? new Set(types) : null;
  const listener = (evt: RealtimeEvent) => {
    if (!evt?.type) return;
    if (typeSet && !typeSet.has(evt.type)) return;
    handler(evt);
  };

  s.on('realtime', listener);
  return () => {
    s.off('realtime', listener);
  };
}

/** Run a callback every time the socket (re)connects (recovers missed events). */
export function onRealtimeConnect(handler: () => void): () => void {
  const s = getRealtimeSocket();
  if (!s) return () => {};
  s.on('connect', handler);
  return () => {
    s.off('connect', handler);
  };
}
