/**
 * Erreurs de la vidéo de présentation (backend wizard : PUT /profiles/:id/video ; backend dash :
 * POST /profiles/:id/presentation/analyze-video). Chaque code a un message clair et traduit ;
 * l'enregistrement de l'utilisateur n'est jamais perdu (il peut réessayer ou refaire).
 */

export type VideoErrorCode =
  | 'VIDEO_TOO_LARGE'
  | 'NOT_A_VIDEO'
  | 'VIDEO_TOO_SHORT'
  | 'VIDEO_TOO_LONG'
  | 'NO_VIDEO'
  | 'UPLOAD_FAILED'
  | 'ANALYSIS_FAILED'
  | 'INTERNAL_ERROR'
  | 'UNAUTHORIZED'
  | 'UNKNOWN';

export interface VideoApiError {
  code: VideoErrorCode;
  status: number;
  /** Message du serveur (non montré tel quel à l'utilisateur). */
  serverMessage?: string;
  /** Faux : réessayer sans refaire la vidéo ne servirait à rien. */
  retryable: boolean;
}

const KNOWN: VideoErrorCode[] = [
  'VIDEO_TOO_LARGE', 'NOT_A_VIDEO', 'VIDEO_TOO_SHORT', 'VIDEO_TOO_LONG', 'NO_VIDEO',
  'UPLOAD_FAILED', 'ANALYSIS_FAILED', 'INTERNAL_ERROR',
];

// Erreurs côté contenu de la vidéo : il faut la refaire, pas relancer.
const NON_RETRYABLE: VideoErrorCode[] = [
  'VIDEO_TOO_LARGE', 'NOT_A_VIDEO', 'VIDEO_TOO_SHORT', 'VIDEO_TOO_LONG', 'NO_VIDEO', 'UNAUTHORIZED',
];

/** Construit l'erreur depuis le statut HTTP et le corps JSON { code, message } (éventuellement absent). */
export const toVideoApiError = (status: number, body?: any): VideoApiError => {
  const raw = typeof body?.code === 'string' ? body.code.toUpperCase() : '';
  let code: VideoErrorCode = (KNOWN as string[]).includes(raw) ? (raw as VideoErrorCode) : 'UNKNOWN';
  if (code === 'UNKNOWN') {
    if (status === 413) code = 'VIDEO_TOO_LARGE';
    else if (status === 401 || status === 403) code = 'UNAUTHORIZED';
    else if (status === 502) code = 'ANALYSIS_FAILED';
    else if (status >= 500) code = 'INTERNAL_ERROR';
  }
  return {
    code,
    status,
    serverMessage: typeof body?.message === 'string' ? body.message : undefined,
    retryable: !NON_RETRYABLE.includes(code),
  };
};

const MESSAGES: Record<VideoErrorCode, { fr: string; en: string }> = {
  VIDEO_TOO_LARGE: {
    fr: 'Votre vidéo est trop lourde (150 Mo maximum). Refaites-la un peu plus courte, ou dans un endroit bien éclairé pour alléger le fichier.',
    en: 'Your video is too large (150 MB maximum). Record it again a little shorter, or in good lighting to keep the file lighter.',
  },
  NOT_A_VIDEO: {
    fr: 'Ce fichier n’est pas une vidéo reconnue. Refaites l’enregistrement avec la caméra.',
    en: 'This file is not a recognised video. Please record again with the camera.',
  },
  VIDEO_TOO_SHORT: {
    fr: 'Votre vidéo est trop courte (30 secondes minimum). Refaites-la en vous présentant et en présentant votre parcours.',
    en: 'Your video is too short (30 seconds minimum). Record it again, introducing yourself and your career path.',
  },
  VIDEO_TOO_LONG: {
    fr: 'Votre vidéo est trop longue (3 minutes maximum). Refaites-la plus brièvement.',
    en: 'Your video is too long (3 minutes maximum). Please record a shorter one.',
  },
  NO_VIDEO: {
    fr: 'Aucune vidéo n’a été reçue. Refaites l’enregistrement.',
    en: 'No video was received. Please record again.',
  },
  UPLOAD_FAILED: {
    fr: 'L’envoi de votre vidéo a échoué (connexion ?). Vérifiez votre connexion et réessayez : votre enregistrement n’est pas perdu.',
    en: 'Sending your video failed (connection?). Check your connection and try again — your recording is not lost.',
  },
  ANALYSIS_FAILED: {
    fr: 'L’analyse IA de votre vidéo n’a pas abouti. Votre vidéo est bien enregistrée : réessayez dans un instant.',
    en: 'The AI analysis of your video did not complete. Your video is saved — please try again in a moment.',
  },
  INTERNAL_ERROR: {
    fr: 'Un incident technique est survenu. Votre enregistrement n’est pas perdu : réessayez dans un instant.',
    en: 'A technical issue occurred. Your recording is not lost — please try again in a moment.',
  },
  UNAUTHORIZED: {
    fr: 'Votre session a expiré. Reconnectez-vous puis réessayez.',
    en: 'Your session has expired. Please sign in again and retry.',
  },
  UNKNOWN: {
    fr: 'Une erreur est survenue. Votre enregistrement n’est pas perdu : réessayez dans un instant.',
    en: 'Something went wrong. Your recording is not lost — please try again in a moment.',
  },
};

export const videoErrorMessage = (code: VideoErrorCode, lang?: string): string => {
  const l = (lang || 'en').slice(0, 2).toLowerCase() === 'fr' ? 'fr' : 'en';
  return (MESSAGES[code] || MESSAGES.UNKNOWN)[l];
};

/** Garde de type : l'erreur lancée est une VideoApiError. */
export const isVideoApiError = (e: unknown): e is VideoApiError =>
  !!e && typeof e === 'object' && 'code' in (e as any) && 'status' in (e as any) && 'retryable' in (e as any);

/** Lit la réponse HTTP en erreur et construit la VideoApiError correspondante. */
export const videoErrorFromResponse = async (response: Response): Promise<VideoApiError> => {
  let body: any;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }
  return toVideoApiError(response.status, body);
};
