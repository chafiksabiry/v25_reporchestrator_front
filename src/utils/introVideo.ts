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
