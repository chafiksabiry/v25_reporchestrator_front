export interface CallEvent {
  type: string;
  id: string;
  occurred_at: string;
  payload: {
    call_control_id: string;
    direction: string;
    from: string;
    to: string;
    state: string;
    // ... autres champs du payload
  }
}

export interface CallResponse {
  success: boolean;
  data?: {
    callId: string;
    [key: string]: any;
  };
  error?: string;
}

