/** User-facing messages for POST /api/calls/:id/analyze failures. */

export type CallAnalyzeFailure = {
  success: false;
  message: string;
  ai_call_status?: 'error';
  code?: string;
};

const MESSAGE_MAP: Record<string, string> = {
  'No transcript or recording available for analysis':
    "Aucun enregistrement ni transcription disponible. L'appel n'a peut-être pas été enregistré ou l'audio n'est pas encore prêt.",
  'Call not found': 'Appel introuvable.',
  'Analysis already in progress for this call.':
    "L'analyse est déjà en cours pour cet appel.",
};

export function localizeCallAnalyzeMessage(serverMessage?: string): string {
  if (!serverMessage) {
    return "L'analyse a échoué. Veuillez réessayer dans quelques instants.";
  }
  if (MESSAGE_MAP[serverMessage]) return MESSAGE_MAP[serverMessage];
  if (/no transcript|recording available/i.test(serverMessage)) {
    return MESSAGE_MAP['No transcript or recording available for analysis'];
  }
  if (/not found/i.test(serverMessage)) {
    return MESSAGE_MAP['Call not found'];
  }
  if (/already in progress/i.test(serverMessage)) {
    return MESSAGE_MAP['Analysis already in progress for this call.'];
  }
  if (/timeout|timed out/i.test(serverMessage)) {
    return "L'analyse a pris trop de temps. Réessayez dans quelques instants.";
  }
  return serverMessage;
}

export function getCallAnalyzeErrorMessage(
  source: unknown,
  fallback = "L'analyse a échoué. Veuillez réessayer."
): string {
  if (!source) return fallback;
  if (typeof source === 'string') return localizeCallAnalyzeMessage(source);

  const asObj = source as {
    message?: string;
    response?: { data?: { message?: string }; status?: number };
  };

  const serverMsg =
    asObj.message ||
    asObj.response?.data?.message ||
    (source instanceof Error ? source.message : undefined);

  return localizeCallAnalyzeMessage(serverMsg) || fallback;
}

export function isExpectedCallAnalyzeHttpError(error: {
  config?: { url?: string };
  response?: { status?: number; data?: { message?: string } };
}): boolean {
  const url = error.config?.url || '';
  if (!url.includes('/analyze')) return false;

  const status = error.response?.status;
  const msg = error.response?.data?.message || '';

  if (status === 409 || status === 202) return true;
  if (status === 400 && /no transcript|recording available/i.test(msg)) return true;
  if (status === 404 && /not found/i.test(msg)) return true;
  return false;
}

export function toCallAnalyzeFailure(error: {
  response?: { status?: number; data?: { message?: string; code?: string } };
}): CallAnalyzeFailure {
  const status = error.response?.status;
  const data = error.response?.data;
  return {
    success: false,
    message: getCallAnalyzeErrorMessage(data?.message),
    ai_call_status: status === 400 ? 'error' : undefined,
    code: data?.code,
  };
}
