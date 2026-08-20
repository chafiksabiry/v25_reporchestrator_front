interface Props {
  onClick: () => void;
  /** Title shown in the small success banner (e.g. the next phase name). */
  title?: string;
  /** Hint line shown under the banner title. */
  hint?: string;
  disabled?: boolean;
}

/**
 * Floating "Next step" guide button — disabled.
 * Phase cards / required actions already drive onboarding navigation;
 * this portal UI was redundant noise on orchestrator and marketplace.
 */
export function OnboardingNextStepButton(_props: Props) {
  return null;
}

export default OnboardingNextStepButton;
