/**
 * Display helpers so language stars (CEFR) and metric % tell the same story.
 * Inflated / flat stored scores (e.g. C1 @ 100% on every bar) are aligned to
 * the verified CEFR band before rendering.
 */

export const CEFR_SCORE_BAND: Record<string, [number, number]> = {
  A1: [18, 38],
  A2: [39, 52],
  B1: [53, 67],
  B2: [68, 81],
  C1: [82, 92],
  C2: [93, 100],
};

export const CEFR_STAR_MAP: Record<string, number> = {
  A1: 1,
  Basic: 1,
  A2: 2,
  B1: 3,
  Intermediate: 3,
  B2: 4,
  C1: 5,
  Advanced: 5,
  C2: 6,
  Native: 6,
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(n)));

export const normalizeCefr = (value: unknown): string => {
  const raw = String(value || '').trim().toUpperCase();
  if (/NATIVE|BILINGUAL/.test(raw)) return 'C2';
  if (CEFR_SCORE_BAND[raw]) return raw;
  return 'B1';
};

export const alignScoreToCefr = (score: number, cefr: string): number => {
  const band = CEFR_SCORE_BAND[normalizeCefr(cefr)] || [0, 100];
  const n = Number.isFinite(score) ? Number(score) : 0;
  return clamp(n, band[0], band[1]);
};

export const getProficiencyStars = (proficiency: string): number =>
  CEFR_STAR_MAP[String(proficiency || '').trim()] ||
  CEFR_STAR_MAP[normalizeCefr(proficiency)] ||
  1;

export type LanguageMetricScores = {
  fluency: number;
  level: number;
  completeness: number;
  overall: number;
  cefr: string;
};

/**
 * Resolve the three Languages-tab metrics with CEFR-consistent calibration.
 * Prefer real sub-scores when they differ; otherwise keep a subtle spread
 * inside the CEFR band so the UI does not look artificially flat at 100%.
 */
export const getLanguageMetricScores = (lang: any): LanguageMetricScores => {
  const ar = lang?.assessmentResults || {};
  const cefr = normalizeCefr(ar.verifiedProficiency || lang?.proficiency || 'B1');
  const band = CEFR_SCORE_BAND[cefr] || [0, 100];

  let fluency = Number(ar.fluency?.score);
  let level = Number(ar.proficiency?.score);
  let completeness = Number(ar.completeness?.score);
  let overall = Number(ar.overall?.score);

  if (!Number.isFinite(fluency)) fluency = 0;
  if (!Number.isFinite(level)) level = 0;
  if (!Number.isFinite(completeness)) completeness = 0;
  if (!Number.isFinite(overall) || overall <= 0) {
    const parts = [fluency, level, completeness].filter((n) => n > 0);
    overall = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : band[0];
  }

  fluency = alignScoreToCefr(fluency || overall, cefr);
  level = alignScoreToCefr(level || overall, cefr);
  completeness = alignScoreToCefr(completeness || overall, cefr);
  overall = alignScoreToCefr(overall, cefr);

  const flat =
    Math.abs(fluency - level) <= 1 &&
    Math.abs(level - completeness) <= 1 &&
    Math.abs(fluency - completeness) <= 1;

  if (flat) {
    const base = overall || level || fluency;
    fluency = clamp(base + (cefr === 'C2' ? 0 : 1), band[0], band[1]);
    level = clamp(base, band[0], band[1]);
    completeness = clamp(base - 2, band[0], band[1]);
  }

  return { fluency, level, completeness, overall, cefr };
};

export const scoreBarClass = (score: number): string => {
  if (score >= 90) return 'bg-teal-500';
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 68) return 'bg-lime-500';
  if (score >= 53) return 'bg-amber-400';
  if (score >= 39) return 'bg-orange-400';
  return 'bg-rose-400';
};

export const scoreTextClass = (score: number): string => {
  if (score >= 90) return 'text-teal-700';
  if (score >= 80) return 'text-emerald-700';
  if (score >= 68) return 'text-lime-700';
  if (score >= 53) return 'text-amber-700';
  if (score >= 39) return 'text-orange-700';
  return 'text-rose-700';
};
