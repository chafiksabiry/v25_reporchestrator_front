export type RepOnboardingStepKind =
  | 'complete-profile'
  | 'continue-orchestrator'
  | 'apply-gig'
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

/** Core onboarding = phases 1–4 only. Phase 5 in the DB is marketplace tracking, not a UI step. */
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
  const firstName = profile.personalInfo?.firstName || profile.personalInfo?.first_name;
  if (typeof firstName === 'string' && firstName.trim()) return true;
  return false;
};

/**
 * Next route in the rep onboarding funnel.
 * Prefer live phase progress over the `isBasicProfileCompleted` flag alone
 * (that flag is only flipped at the end of the CV editor, so mid-funnel
 * users were incorrectly sent back to /profile-import after login).
 */
export function getRepOnboardingStep(profile: any): RepOnboardingStep {
  if (isRepProfilePublished(profile)) {
    return { kind: 'done', path: '/dashboard' };
  }

  const phases = profile?.onboardingProgress?.phases;
  const currentPhase = Number(profile?.onboardingProgress?.currentPhase) || 1;
  const coreDone = isRepCoreOnboardingDone(profile);
  const gigEngaged = hasRepGigEngagement(profile);

  if (coreDone && gigEngaged) {
    return { kind: 'publish', path: '/profile' };
  }
  if (coreDone || isPhaseCompleted(phases, 4)) {
    return { kind: 'apply-gig', path: '/marketplace' };
  }

  // Phase 4 = subscription
  if (
    isPhaseCompleted(phases, 3) ||
    currentPhase >= 4 ||
    phases?.phase4?.status === 'in_progress'
  ) {
    return { kind: 'continue-orchestrator', path: '/orchestrator/subscription' };
  }

  // Phase 3 = skills / assessments
  if (
    isPhaseCompleted(phases, 2) ||
    currentPhase >= 3 ||
    phases?.phase3?.status === 'in_progress'
  ) {
    return { kind: 'continue-orchestrator', path: '/orchestrator/skills' };
  }

  // Phase 2 = enrich profile (after CV import/editor)
  if (profile?.isBasicProfileCompleted === true) {
    return { kind: 'complete-profile', path: '/orchestrator/profile' };
  }

  if (hasRepProfileContent(profile)) {
    // CV imported / editor started but not marked complete yet
    return { kind: 'complete-profile', path: '/profile-editor' };
  }

  // Brand-new rep: start at Import CV
  if (currentPhase <= 1 && !isPhaseCompleted(phases, 1) && !isPhaseCompleted(phases, 2)) {
    return { kind: 'complete-profile', path: '/profile-import' };
  }

  // Account exists / phase1 done but no CV content yet
  return { kind: 'complete-profile', path: '/profile-import' };
}
