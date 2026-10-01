export type RepOnboardingStepKind =
  | 'complete-profile'
  | 'continue-orchestrator'
  | 'publish'
  | 'done';

export interface RepOnboardingStep {
  kind: RepOnboardingStepKind;
  path: string;
}

const isPhaseCompleted = (phases: any, n: number): boolean =>
  phases?.[`phase${n}`]?.status === 'completed';

export const hasRepGigEngagement = (profile: any): boolean =>
  Array.isArray(profile?.gigs) &&
  profile.gigs.some(
    (g: any) => g && ['requested', 'enrolled'].includes(g.status)
  );

/** Core onboarding = phases 1–4. Phase 3 is auto-skipped backend-side; phase 5 is marketplace. */
export const isRepCoreOnboardingDone = (profile: any): boolean => {
  if (isRepProfilePublished(profile)) return true;
  return [1, 2, 3, 4].every((n) =>
    isPhaseCompleted(profile?.onboardingProgress?.phases, n)
  );
};

export const isRepProfilePublished = (profile: any): boolean =>
  profile?.status === 'completed';

/** True once the user has started CV/profile creation (not a blank account). */
export const hasRepProfileContent = (profile: any): boolean => {
  if (!profile || typeof profile !== 'object') return false;
  if (profile.isBasicProfileCompleted === true) return true;
  if (typeof profile.generatedSummary === 'string' && profile.generatedSummary.trim()) {
    return true;
  }
  const desc = profile.professionalSummary?.profileDescription;
  if (typeof desc === 'string' && desc.trim()) return true;
  if (Array.isArray(profile.experience) && profile.experience.length > 0) return true;
  if (Array.isArray(profile.experiences) && profile.experiences.length > 0) return true;
  return false;
};

/** Phase 2 gate (mirrors SummaryEditorV2 canContinue): photo + videos + schedule. */
export const isRepPhase2Ready = (profile: any): boolean => {
  if (!profile || typeof profile !== 'object') return false;

  const hasPhoto = Boolean(profile?.personalInfo?.photo?.url);
  if (!hasPhoto) return false;

  const experiences = Array.isArray(profile.experience)
    ? profile.experience
    : Array.isArray(profile.experiences)
      ? profile.experiences
      : [];
  if (experiences.length === 0) return false;
  const allVideos = experiences.every(
    (exp: any) => exp && (exp.videoUrl || exp.videoAnalysis)
  );
  if (!allVideos) return false;

  const schedule = profile?.availability?.schedule;
  const hasSchedule =
    Array.isArray(schedule) &&
    schedule.length > 0 &&
    schedule.every((s: any) => s?.day && s?.hours?.start && s?.hours?.end);
  return hasSchedule;
};

/**
 * Next route in the rep onboarding funnel (also used on reconnect):
 * - no CV → /profile-import
 * - CV imported, phase 2 incomplete (photo/videos/availability) → /profile-editor
 * - phase 2 ready (or plan chosen but not published) → /subscription
 * - published → /dashboard
 */
export function getRepOnboardingStep(profile: any): RepOnboardingStep {
  if (isRepProfilePublished(profile)) {
    return { kind: 'done', path: '/dashboard' };
  }

  const phases = profile?.onboardingProgress?.phases;
  const hasCvOrProfile = hasRepProfileContent(profile);

  if (!hasCvOrProfile) {
    return { kind: 'complete-profile', path: '/profile-import' };
  }

  // Never open subscription until photo + experience videos + availability are done.
  if (!isRepPhase2Ready(profile)) {
    return { kind: 'complete-profile', path: '/profile-editor' };
  }

  // Plan chosen / phase 4 done but not yet published → stay on subscription to finalize.
  if (isPhaseCompleted(phases, 4) || profile?.plan) {
    return { kind: 'continue-orchestrator', path: '/subscription' };
  }

  // Phase 2 ready → subscription (phase 3 is auto-completed on the backend).
  return { kind: 'continue-orchestrator', path: '/subscription' };
}
