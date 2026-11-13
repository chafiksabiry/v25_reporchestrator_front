import { stripRepsPrefix } from '../lib/repSections';

/**
 * Logique pure du parcours d'accueil REP (barre de progression, consignes,
 * checklist de l'éditeur, messages d'erreur humains). Aucune dépendance React :
 * tout est testable unitairement.
 */

export type RepJourneyStepId = 'import' | 'editor' | 'profile' | 'plan' | 'marketplace';

export interface RepJourneyStep {
  id: RepJourneyStepId;
  path: string;
  /** Durée indicative affichée au rep (minutes). */
  minutes: number;
  /** Retour possible sans perte depuis une étape suivante (l'import écraserait le profil existant). */
  revisitable: boolean;
}

export const REP_JOURNEY_STEPS: readonly RepJourneyStep[] = [
  { id: 'import', path: '/profile-import', minutes: 2, revisitable: false },
  { id: 'editor', path: '/profile-editor', minutes: 8, revisitable: true },
  { id: 'profile', path: '/profile', minutes: 2, revisitable: true },
  { id: 'plan', path: '/subscription', minutes: 2, revisitable: false },
  { id: 'marketplace', path: '/marketplace', minutes: 1, revisitable: false },
];

const normalize = (pathname: string): string => {
  const p = stripRepsPrefix((pathname || '/').replace(/\/+$/, '') || '/');
  return p === '/orchestrator/subscription' ? '/subscription' : p;
};

/** Index de l'étape correspondant à l'URL, -1 si la page n'appartient pas au parcours. */
export function resolveJourneyStepIndex(pathname: string): number {
  const p = normalize(pathname);
  return REP_JOURNEY_STEPS.findIndex(
    (s) => p === s.path || (s.path !== '/' && p.startsWith(`${s.path}/`)),
  );
}

export interface RepJourneyProgress {
  index: number;
  total: number;
  /** 0–100 : part du parcours terminée AVANT l'étape courante (l'étape en cours compte pour moitié). */
  percent: number;
  /** Minutes restantes, étape courante incluse. */
  remainingMinutes: number;
  currentMinutes: number;
}

export function getJourneyProgress(pathname: string): RepJourneyProgress | null {
  const index = resolveJourneyStepIndex(pathname);
  if (index < 0) return null;
  const total = REP_JOURNEY_STEPS.length;
  const percent = Math.round(((index + 0.5) / total) * 100);
  const remainingMinutes = REP_JOURNEY_STEPS.slice(index).reduce((sum, s) => sum + s.minutes, 0);
  return { index, total, percent, remainingMinutes, currentMinutes: REP_JOURNEY_STEPS[index].minutes };
}

/**
 * Retour en arrière autorisé vers `targetPath` depuis `fromPath` ? Seules les
 * étapes "revisitables" précédentes le sont (jamais l'import : il remplacerait le profil).
 */
export function canRevisitStep(fromPath: string, targetPath: string): boolean {
  const from = resolveJourneyStepIndex(fromPath);
  const to = resolveJourneyStepIndex(targetPath);
  if (from < 0 || to < 0 || to >= from) return false;
  return REP_JOURNEY_STEPS[to].revisitable;
}

/* ───────────── Checklist de l'éditeur (lecture seule, mêmes critères que la porte de sortie) ───────────── */

export type EditorChecklistId = 'photo' | 'experiences' | 'videos' | 'availability';

export interface EditorChecklistItem {
  id: EditorChecklistId;
  done: boolean;
  /** Ex. « 2 sur 3 » pour les vidéos. */
  current?: number;
  total?: number;
}

const experiencesOf = (profile: any): any[] =>
  Array.isArray(profile?.experience)
    ? profile.experience
    : Array.isArray(profile?.experiences)
      ? profile.experiences
      : [];

/**
 * Reflète exactement les conditions de `isRepPhase2Ready` (photo + vidéo par expérience
 * + disponibilités) en les détaillant, sans les modifier. Ne touche pas à la logique vidéo.
 */
export function getEditorChecklist(profile: any): EditorChecklistItem[] {
  const exps = experiencesOf(profile);
  const withVideo = exps.filter((e) => e && (e.videoUrl || e.videoAnalysis)).length;
  const schedule = profile?.availability?.schedule;
  const hasSchedule =
    Array.isArray(schedule) &&
    schedule.length > 0 &&
    schedule.every((s: any) => s?.day && s?.hours?.start && s?.hours?.end);

  return [
    { id: 'photo', done: Boolean(profile?.personalInfo?.photo?.url) },
    { id: 'experiences', done: exps.length > 0, current: exps.length, total: exps.length },
    {
      id: 'videos',
      done: exps.length > 0 && withVideo === exps.length,
      current: withVideo,
      total: exps.length,
    },
    { id: 'availability', done: hasSchedule },
  ];
}

export function getEditorCompletion(items: EditorChecklistItem[]): { done: number; total: number; percent: number } {
  const done = items.filter((i) => i.done).length;
  return { done, total: items.length, percent: items.length ? Math.round((done / items.length) * 100) : 0 };
}

/* ───────────── Messages d'erreur humains ───────────── */

export type HumanErrorKind =
  | 'network'
  | 'timeout'
  | 'rateLimit'
  | 'auth'
  | 'serverBusy'
  | 'validation'
  | 'languages'
  | 'unreadable'
  | 'generic';

/**
 * Classe une erreur technique (message brut, code HTTP) pour afficher un message
 * rassurant au rep, jamais une trace ou « Validation error: … ».
 */
export function classifyImportError(err: unknown): HumanErrorKind {
  const anyErr = err as { message?: string; status?: number; response?: { status?: number } } | null;
  const status = anyErr?.status ?? anyErr?.response?.status;
  const msg = String(anyErr?.message ?? err ?? '').toLowerCase();

  if (status === 401 || status === 403 || /unauthori[sz]ed|forbidden|token expired|jwt/.test(msg)) return 'auth';
  if (status === 429 || /rate limit|too many requests/.test(msg)) return 'rateLimit';
  if (/timeout|timed out|etimedout|aborted/.test(msg)) return 'timeout';
  if (/network|failed to fetch|load failed|econn|enotfound|offline/.test(msg)) return 'network';
  if (/languages? (section|rubrique|are required|required)|langues?\b.*(requis|nécessaire|required)|languagesrequired|languagesunmatched/.test(msg)) {
    return 'languages';
  }
  if (/no text|aucun texte|corrupt|password|encrypted|invalid pdf|unsupported/.test(msg)) return 'unreadable';
  if (typeof status === 'number' && status >= 500) return 'serverBusy';
  if (/validation error|schema|cast to|e11000|duplicate key/.test(msg)) return 'validation';
  if (/internal server error|bad gateway|service unavailable/.test(msg)) return 'serverBusy';
  return 'generic';
}
