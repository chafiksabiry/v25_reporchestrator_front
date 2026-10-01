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

/**
 * Next route in the rep onboarding funnel:
 * 1) Import CV → 2) Profile editor (phase 2) → 3) Subscription → auto-publish → marketplace.
 * No separate Publish button; no skills hub step.
 */
export function getRepOnboardingStep(profile: any): RepOnboardingStep {
  if (isRepProfilePublished(profile)) {
    return { kind: 'done', path: '/dashboard' };
  }

  const phases = profile?.onboardingProgress?.phases;
  const currentPhase = Number(profile?.onboardingProgress?.currentPhase) || 1;
  const hasCvOrProfile = hasRepProfileContent(profile);

  // Plan chosen / phase 4 done → marketplace (backend should already have auto-published)
  if (isPhaseCompleted(phases, 4) || profile?.plan) {
    return { kind: 'done', path: '/marketplace' };
  }

  if (!hasCvOrProfile) {
    return { kind: 'complete-profile', path: '/profile-import' };
  }

  // After profile-editor (phase 2) → subscription. Phase 3 is auto-completed on the backend.
  if (
    isPhaseCompleted(phases, 2) ||
    isPhaseCompleted(phases, 3) ||
    currentPhase >= 4 ||
    phases?.phase4?.status === 'in_progress'
  ) {
    return { kind: 'continue-orchestrator', path: '/subscription' };
  }

  // Phase 2 in progress / CV imported
  if (profile?.isBasicProfileCompleted === true || hasCvOrProfile) {
    return { kind: 'complete-profile', path: '/profile-editor' };
  }

  return { kind: 'complete-profile', path: '/profile-import' };
}
