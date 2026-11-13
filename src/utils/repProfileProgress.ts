import { getEditorChecklist, getEditorCompletion, REP_JOURNEY_STEPS } from './repOnboardingProgress';
import type { EditorChecklistId, EditorChecklistItem } from './repOnboardingProgress';
import { isRepCoreOnboardingDone, isRepPhase2Ready, isRepProfilePublished } from './repOnboardingNextStep';

/**
 * Logique pure de la carte « Votre avancement » de la page Profil.
 * S'appuie sur les mêmes critères que la porte de sortie de l'éditeur
 * (getEditorChecklist / isRepPhase2Ready) : aucune règle nouvelle.
 */

export type ProfileNextActionKind =
  /** Il manque des éléments obligatoires (photo, expérience, vidéo, disponibilités). */
  | 'complete-editor'
  /** Profil prêt : relire puis choisir la formule. */
  | 'choose-plan'
  /** Profil publié : rien à afficher. */
  | 'done';

export interface ProfileNextAction {
  kind: ProfileNextActionKind;
  path: string;
  /** Durée indicative (minutes) de l'étape à venir, issue du parcours existant. */
  minutes: number;
  items: EditorChecklistItem[];
  done: number;
  total: number;
  percent: number;
  /** Premier élément obligatoire manquant (pour l'afficher en « prochaine étape »). */
  nextItemId: EditorChecklistId | null;
}

const stepMinutes = (id: 'editor' | 'plan'): number =>
  REP_JOURNEY_STEPS.find((s) => s.id === id)?.minutes ?? 0;

export function getProfileNextAction(profile: any): ProfileNextAction {
  const items = getEditorChecklist(profile);
  const completion = getEditorCompletion(items);
  const firstMissing = items.find((i) => !i.done)?.id ?? null;
  const base = { items, ...completion, nextItemId: firstMissing };

  if (isRepProfilePublished(profile)) {
    return { ...base, kind: 'done', path: '/marketplace', minutes: 0 };
  }

  const ready =
    isRepPhase2Ready(profile) ||
    profile?.onboardingProgress?.phases?.phase2?.status === 'completed' ||
    isRepCoreOnboardingDone(profile);

  if (ready) {
    return { ...base, kind: 'choose-plan', path: '/subscription', minutes: stepMinutes('plan') };
  }
  return { ...base, kind: 'complete-editor', path: '/profile-editor', minutes: stepMinutes('editor') };
}
