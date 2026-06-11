import { getAgentId } from '../utils/authUtils';
import { onRealtimeEvent, onRealtimeConnect, type RealtimeEvent } from './realtime';

type EnrollmentMessage = {
  type?: string;
  repId?: string;
  gigId?: string;
  status?: string;
  [key: string]: unknown;
};

export type EnrollmentSocketOptions = {
  /** Called on every successful connect/reconnect (catches missed events while offline). */
  onConnect?: () => void;
};

/** Event types the rep marketplace reacts to. */
const RELEVANT_TYPES = ['enrollment_update', 'invitation_new'];

/**
 * Listen to live rep events (enrollment approvals + new invitations) over the
 * shared Socket.IO hub. The server only sends events targeting this rep's room,
 * but we still defensively filter by repId. Returns a disposer.
 *
 * The signature is kept stable for existing callers; under the hood it now uses
 * the unified Socket.IO client instead of a dedicated raw WebSocket.
 */
export function connectRepEnrollmentSocket(
  onEnrollmentUpdate: (data: EnrollmentMessage) => void,
  options?: EnrollmentSocketOptions
): () => void {
  const disposeEvent = onRealtimeEvent((evt: RealtimeEvent) => {
    const data: EnrollmentMessage = { type: evt.type, ...(evt.payload || {}) };

    const myAgentId = getAgentId();
    if (data.repId && myAgentId && String(data.repId) !== String(myAgentId)) {
      return;
    }
    onEnrollmentUpdate(data);
  }, RELEVANT_TYPES);

  const disposeConnect = options?.onConnect
    ? onRealtimeConnect(options.onConnect)
    : () => {};

  return () => {
    disposeEvent();
    disposeConnect();
  };
}
