/**
 * Erreurs d'envoi / d'analyse des vidéos du REP (backend wizard : PUT /profiles/:id/video ;
 * backend dash : POST /profiles/:id/presentation/analyze-video et /language/analyze-video).
 *
 * Chaque code a un message clair et traduit (fr.json / en.json, clés `videoErrors.*`), jamais le
 * texte brut du serveur ni « Server error 400 ». L'enregistrement de l'utilisateur n'est jamais
 * perdu : il peut réessayer ou refaire. Une erreur 429 (UPLOAD_BUSY) est relancée une fois
 * automatiquement après `Retry-After`.
 */
import i18n from '../i18n';
import { VIDEO_MAX_BYTES, VIDEO_MAX_MB, VIDEO_MIN_SECONDS, VIDEO_SERVER_MAX_SECONDS } from './videoLimits';

export type VideoErrorCode =
  | 'VIDEO_TOO_LARGE'
  | 'NOT_A_VIDEO'
  | 'VIDEO_TOO_SHORT'
  | 'VIDEO_TOO_LONG'
  | 'NO_VIDEO'
  | 'UPLOAD_BUSY'
  | 'VIDEO_STORAGE_ERROR'
  | 'UPLOAD_FAILED'
  | 'ANALYSIS_FAILED'
  | 'INTERNAL_ERROR'
  | 'UNAUTHORIZED'
  | 'UNKNOWN';

export interface VideoApiError {
  code: VideoErrorCode;
  status: number;
  /** Message du serveur (jamais montré tel quel à l'utilisateur). */
  serverMessage?: string;
  /** Faux : réessayer sans refaire la vidéo ne servirait à rien. */
  retryable: boolean;
  /** Délai demandé par le serveur (en-tête Retry-After), en millisecondes. */
  retryAfterMs?: number;
}

const KNOWN: VideoErrorCode[] = [
  'VIDEO_TOO_LARGE', 'NOT_A_VIDEO', 'VIDEO_TOO_SHORT', 'VIDEO_TOO_LONG', 'NO_VIDEO', 'UPLOAD_BUSY',
  'VIDEO_STORAGE_ERROR', 'UPLOAD_FAILED', 'ANALYSIS_FAILED', 'INTERNAL_ERROR',
];

// Erreurs côté contenu de la vidéo : il faut la refaire, pas relancer.
const NON_RETRYABLE: VideoErrorCode[] = [
  'VIDEO_TOO_LARGE', 'NOT_A_VIDEO', 'VIDEO_TOO_SHORT', 'VIDEO_TOO_LONG', 'NO_VIDEO', 'UNAUTHORIZED',
];

const DEFAULT_RETRY_AFTER_MS = 5000;
const MAX_RETRY_AFTER_MS = 30000;

/** `Retry-After` en secondes (ou date HTTP) → millisecondes, borné ; défaut 5 s. */
export const parseRetryAfter = (header: string | null | undefined): number => {
  if (!header) return DEFAULT_RETRY_AFTER_MS;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(MAX_RETRY_AFTER_MS, Math.round(seconds * 1000));
  const date = Date.parse(header);
  if (Number.isFinite(date)) return Math.min(MAX_RETRY_AFTER_MS, Math.max(0, date - Date.now()));
  return DEFAULT_RETRY_AFTER_MS;
};

/** Construit l'erreur depuis le statut HTTP, le corps JSON { code, message } (éventuellement absent) et Retry-After. */
export const toVideoApiError = (status: number, body?: any, retryAfterHeader?: string | null): VideoApiError => {
  const raw = typeof body?.code === 'string' ? body.code.toUpperCase() : '';
  let code: VideoErrorCode = (KNOWN as string[]).includes(raw) ? (raw as VideoErrorCode) : 'UNKNOWN';
  if (code === 'UNKNOWN') {
    if (status === 413) code = 'VIDEO_TOO_LARGE';
    else if (status === 429) code = 'UPLOAD_BUSY';
    else if (status === 401 || status === 403) code = 'UNAUTHORIZED';
    else if (status >= 500) code = 'INTERNAL_ERROR';
  }
  return {
    code,
    status,
    serverMessage: typeof body?.message === 'string' ? body.message : undefined,
    retryable: !NON_RETRYABLE.includes(code),
    ...(code === 'UPLOAD_BUSY' ? { retryAfterMs: parseRetryAfter(retryAfterHeader) } : {}),
  };
};

export interface VideoMessageOptions {
  /** Durée maximale annoncée pour VIDEO_TOO_LONG (défaut : 3 min, vidéo de présentation). */
  maxMinutes?: number;
}

/** Message traduit pour un code ; `lang` = langue de l'interface (défaut : langue courante). */
export const videoErrorMessage = (code: VideoErrorCode, lang?: string, options: VideoMessageOptions = {}): string => {
  const lng = (lang || i18n.language || 'fr').slice(0, 2).toLowerCase() === 'en' ? 'en' : 'fr';
  return i18n.t(`videoErrors.${KNOWN.includes(code) || code === 'UNAUTHORIZED' ? code : 'UNKNOWN'}`, {
    lng,
    maxMb: VIDEO_MAX_MB,
    minSeconds: VIDEO_MIN_SECONDS,
    maxMinutes: options.maxMinutes ?? 3,
  }) as string;
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
  return toVideoApiError(response.status, body, response.headers?.get?.('Retry-After'));
};

/** Vérification avant envoi : trop volumineux → erreur VIDEO_TOO_LARGE, RIEN n'est envoyé. */
export const checkVideoBeforeUpload = (file: Blob): VideoApiError | null =>
  file.size > VIDEO_MAX_BYTES ? toVideoApiError(413, { code: 'VIDEO_TOO_LARGE' }) : null;

/** Vérification de durée (fichier choisi) : null si correcte ou illisible (le serveur tranchera). */
export const checkVideoDuration = (seconds: number | null): VideoApiError | null => {
  if (seconds == null) return null;
  if (seconds < VIDEO_MIN_SECONDS) return toVideoApiError(400, { code: 'VIDEO_TOO_SHORT' });
  if (seconds > VIDEO_SERVER_MAX_SECONDS) return toVideoApiError(400, { code: 'VIDEO_TOO_LONG' });
  return null;
};

/**
 * Exécute `request` ; si le serveur répond 429 (UPLOAD_BUSY), attend `Retry-After` (borné) et
 * relance UNE seule fois. Une deuxième réponse 429 est renvoyée telle quelle (« réessayez dans
 * un instant »).
 */
export const withRetryAfterOnce = async <T>(
  request: () => Promise<T>,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
): Promise<T> => {
  try {
    return await request();
  } catch (err) {
    if (isVideoApiError(err) && err.code === 'UPLOAD_BUSY') {
      await sleep(err.retryAfterMs ?? DEFAULT_RETRY_AFTER_MS);
      return request();
    }
    throw err;
  }
};
