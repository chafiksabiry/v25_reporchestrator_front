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

/** Next route in the rep onboarding funnel (profile → orchestrator → marketplace → publish). */
export function getRepOnboardingStep(profile: any): RepOnboardingStep {
  if (isRepProfilePublished(profile)) {
    return { kind: 'done', path: '/dashboard' };
  }

  const coreDone = isRepCoreOnboardingDone(profile);
  const gigEngaged = hasRepGigEngagement(profile);

  if (coreDone && gigEngaged) {
    return { kind: 'publish', path: '/profile' };
  }
  if (coreDone) {
    return { kind: 'apply-gig', path: '/marketplace' };
  }
  if (isPhaseCompleted(profile?.onboardingProgress?.phases, 2)) {
    return { kind: 'continue-orchestrator', path: '/orchestrator' };
  }
  return { kind: 'complete-profile', path: '/profile' };
}
