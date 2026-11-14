/**
 * Règle « vidéo de présentation » de l'onboarding REP.
 *
 * Avant : une vidéo d'expérience au moins (commit 8236edc), puis une par expérience.
 * Maintenant : UNE SEULE vidéo de présentation (le/la REP se présente et présente son
 * parcours) est obligatoire. Les vidéos par expérience sont optionnelles.
 *
 * Compatibilité : un profil qui a déjà au moins une vidéo d'expérience n'est pas bloqué.
 */

/** Durée maximale de la vidéo de présentation, en secondes (affichée dans l'interface). */
export const INTRO_VIDEO_MAX_SECONDS = 180;
/** Durée minimale (secondes) pour que l'analyse IA ait de la matière. */
export const INTRO_VIDEO_MIN_SECONDS = 30;

const nonEmptyString = (v: unknown): boolean => typeof v === 'string' && v.trim().length > 0;

/** La vidéo de présentation est enregistrée (champ `personalInfo.presentationVideo`). */
export const hasPresentationVideo = (profile: any): boolean => {
  const v = profile?.personalInfo?.presentationVideo;
  if (!v) return false;
  if (nonEmptyString(v)) return true;
  if (typeof v === 'object') {
    return (
      nonEmptyString(v.url) ||
      nonEmptyString(v.videoUrl) ||
      nonEmptyString(v.secure_url) ||
      v.uploaded === true
    );
  }
  return false;
};

/** Une vidéo d'expérience existe (profils créés avec l'ancienne règle). */
export const hasAnyExperienceVideo = (profile: any): boolean => {
  const list = Array.isArray(profile?.experience)
    ? profile.experience
    : Array.isArray(profile?.experiences)
      ? profile.experiences
      : [];
  return list.some((exp: any) => exp && (exp.videoUrl || exp.videoAnalysis));
};

/**
 * Critère d'avancement : vidéo de présentation, OU (compatibilité) au moins une vidéo
 * d'expérience déjà enregistrée. Ne dépend plus du nombre d'expériences.
 */
export const isIntroVideoRequirementMet = (profile: any): boolean =>
  hasPresentationVideo(profile) || hasAnyExperienceVideo(profile);

/** Variante pour des données brutes de l'API (présentation + liste d'expériences). */
export const isIntroVideoRequirementMetFromParts = (
  personalInfo: any,
  experiences: any
): boolean => isIntroVideoRequirementMet({ personalInfo, experience: experiences });

/* ───────────── État local « vidéo enregistrée » partagé entre l'éditeur et le bandeau du parcours ───────────── */

/** Événement émis dès que la vidéo de présentation est enregistrée côté serveur (avant la fin de l'analyse IA). */
export const PRESENTATION_VIDEO_SAVED_EVENT = 'rep:presentation-video-saved';

/** Copie du profil avec la vidéo de présentation marquée enregistrée (ne modifie pas l'original). */
export const withPresentationVideo = (profile: any, url?: string): any => ({
  ...(profile || {}),
  personalInfo: {
    ...(profile?.personalInfo || {}),
    presentationVideo: { url: url || '', uploaded: true },
  },
});

/**
 * Recharge du profil depuis le serveur : si la vidéo vient d'être enregistrée localement mais que le
 * profil relu n'en porte pas encore la trace, on la conserve (sinon le bandeau repasserait « non fait »).
 */
export const keepSavedPresentationVideo = (serverProfile: any, savedLocally: { url?: string } | null): any => {
  if (!serverProfile || !savedLocally) return serverProfile;
  return hasPresentationVideo(serverProfile) ? serverProfile : withPresentationVideo(serverProfile, savedLocally.url);
};

/* ───────────── Analyse en arrière-plan : jamais d'écran sans issue ───────────── */

/** Au-delà de ce délai d'analyse, on prévient que c'est plus long que prévu (l'utilisateur peut déjà continuer). */
export const ANALYSIS_SLOW_AFTER_MS = 3 * 60 * 1000;

/**
 * Ce que la fenêtre d'enregistrement affiche pendant l'analyse : dès que la vidéo est « Enregistrée »,
 * un bouton « Continuer » toujours actif (l'analyse se poursuit en arrière-plan) ; après ANALYSIS_SLOW_AFTER_MS,
 * un message « plus long que prévu ».
 */
export const introAnalysisUi = (s: { videoSaved: boolean; analyzing: boolean; elapsedMs: number }) => ({
  showContinue: s.analyzing && s.videoSaved,
  showSlowNotice: s.analyzing && s.elapsedMs >= ANALYSIS_SLOW_AFTER_MS,
});
