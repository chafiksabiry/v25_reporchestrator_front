/**
 * Limites communes des vidéos envoyées par le REP (présentation, profil, langues).
 * Alignées sur le backend : 100 Mo (limite pratique du stockage vidéo), 30 s minimum,
 * 605 s maximum côté serveur.
 */

/** Taille maximale d'un envoi : 100 Mo. */
export const VIDEO_MAX_BYTES = 100 * 1024 * 1024;
export const VIDEO_MAX_MB = 100;
/** Durée minimale acceptée par le serveur. */
export const VIDEO_MIN_SECONDS = 30;
/** Durée maximale acceptée par le serveur (10 min + 5 s de marge). */
export const VIDEO_SERVER_MAX_SECONDS = 605;
/** Plafond des enregistreurs du profil : 300 s ≈ 56 Mo au débit ci-dessous (< 100 Mo). */
export const PROFILE_RECORDING_MAX_SECONDS = 300;

/** Débits fixés pour rester sous 100 Mo : ≈ 35 Mo pour 3 min, ≈ 56 Mo pour 5 min. */
export const RECORDER_BITRATES = {
  videoBitsPerSecond: 1_500_000,
  audioBitsPerSecond: 96_000,
} as const;

/** Options MediaRecorder avec les débits plafonnés (et le type MIME éventuel). */
export const recorderOptions = (mimeType?: string): MediaRecorderOptions => ({
  ...(mimeType ? { mimeType } : {}),
  ...RECORDER_BITRATES,
});

/** Taille approximative (Mo) d'un enregistrement de `seconds` secondes aux débits fixés. */
export const estimatedMegabytes = (seconds: number): number =>
  ((RECORDER_BITRATES.videoBitsPerSecond + RECORDER_BITRATES.audioBitsPerSecond) * seconds) / 8 / (1024 * 1024);

/** Durée d'un fichier vidéo via ses métadonnées ; null si illisible (le serveur tranchera). */
export const readVideoDuration = (file: Blob): Promise<number | null> =>
  new Promise((resolve) => {
    if (typeof document === 'undefined' || typeof URL === 'undefined') return resolve(null);
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    let done = false;
    const finish = (value: number | null) => {
      if (done) return;
      done = true;
      URL.revokeObjectURL(url);
      resolve(value);
    };
    video.preload = 'metadata';
    video.onloadedmetadata = () => finish(Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null);
    video.onerror = () => finish(null);
    window.setTimeout(() => finish(null), 5000);
    video.src = url;
  });
