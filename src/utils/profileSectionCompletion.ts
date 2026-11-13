/**
 * Complétion par section de l'éditeur de profil REP (logique pure, sans React).
 * Sert uniquement à l'affichage (pastilles, barre globale, états vides) : les règles
 * bloquantes de sortie restent celles de l'éditeur (isRepPhase2Ready / validations).
 */

export type EditorSectionId = 'identity' | 'photo' | 'languages' | 'experience' | 'summary' | 'availability';

export interface SectionCompletion {
  id: EditorSectionId;
  done: number;
  total: number;
  percent: number;
  complete: boolean;
  /** Identifiants des éléments manquants (clés i18n `editorUx.missing.<id>`). */
  missing: string[];
}

export const SUMMARY_MIN_CHARS = 120;
export const SUMMARY_MAX_CHARS = 900;

export type SummaryQuality = 'empty' | 'short' | 'good' | 'long';

export function getSummaryQuality(text: unknown): { quality: SummaryQuality; chars: number } {
  const chars = String(text ?? '').trim().length;
  if (chars === 0) return { quality: 'empty', chars };
  if (chars < SUMMARY_MIN_CHARS) return { quality: 'short', chars };
  if (chars > SUMMARY_MAX_CHARS) return { quality: 'long', chars };
  return { quality: 'good', chars };
}

const filled = (v: unknown): boolean => typeof v === 'string' ? v.trim().length > 0 : v != null && v !== '';

const countryFilled = (country: any): boolean =>
  typeof country === 'object' && country !== null
    ? filled(country.countryName) || filled(country.countryCode)
    : filled(country);

const experiencesOf = (profile: any): any[] =>
  Array.isArray(profile?.experience)
    ? profile.experience
    : Array.isArray(profile?.experiences)
      ? profile.experiences
      : [];

const make = (id: EditorSectionId, checks: Array<[string, boolean]>): SectionCompletion => {
  const total = checks.length;
  const done = checks.filter(([, ok]) => ok).length;
  return {
    id,
    done,
    total,
    percent: total ? Math.round((done / total) * 100) : 0,
    complete: done === total,
    missing: checks.filter(([, ok]) => !ok).map(([key]) => key),
  };
};

/** Même critère que la checklist de sortie : chaque créneau a jour + début + fin. */
export function isScheduleComplete(profile: any): boolean {
  const schedule = profile?.availability?.schedule;
  return (
    Array.isArray(schedule) &&
    schedule.length > 0 &&
    schedule.every((s: any) => s?.day && s?.hours?.start && s?.hours?.end)
  );
}

export function getSectionCompletions(profile: any, summaryText?: unknown): SectionCompletion[] {
  const info = profile?.personalInfo ?? {};
  const exps = experiencesOf(profile);
  const summary =
    summaryText !== undefined ? summaryText : profile?.professionalSummary?.profileDescription;
  const langs = Array.isArray(info.languages) ? info.languages : [];
  const summaryOk = getSummaryQuality(summary).quality !== 'empty' && getSummaryQuality(summary).quality !== 'short';

  return [
    make('identity', [
      ['name', filled(info.name)],
      ['country', countryFilled(info.country)],
      ['phone', filled(info.phone)],
    ]),
    make('photo', [['photo', filled(info.photo?.url)]]),
    make('languages', [['languages', langs.length > 0]]),
    make('experience', [
      ['experience', exps.length > 0],
      ['experienceDetails', exps.length > 0 && exps.every((e) => filled(e?.title) && filled(e?.company))],
    ]),
    make('summary', [['summary', summaryOk]]),
    make('availability', [['schedule', isScheduleComplete(profile)]]),
  ];
}

export function getOverallCompletion(sections: SectionCompletion[]): {
  done: number;
  total: number;
  percent: number;
  firstIncomplete: EditorSectionId | null;
} {
  const done = sections.filter((s) => s.complete).length;
  const total = sections.length;
  const first = sections.find((s) => !s.complete);
  return {
    done,
    total,
    percent: total ? Math.round((done / total) * 100) : 0,
    firstIncomplete: first ? first.id : null,
  };
}

/** Anchor DOM utilisée par la barre de progression pour faire défiler vers la section. */
export const editorSectionAnchor = (id: EditorSectionId): string => `editor-section-${id}`;
