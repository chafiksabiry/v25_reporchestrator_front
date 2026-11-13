/**
 * Palette commune du parcours REP (import → profil → formule → missions).
 * SOURCE UNIQUE : les mêmes valeurs existent en variables CSS `--rep-*` dans index.css
 * (pour les classes Tailwind `bg-[var(--rep-night)]`) ; ce fichier les expose en TypeScript
 * pour les styles inline et pour les tests de contraste WCAG AA.
 */
export const REP_PALETTE = {
  /** Charte HARX */
  night: '#0C1C2E',
  nightSoft: '#14304D',
  magenta: '#F90080',
  magentaDeep: '#C2186F',
  /** Accents maîtrisés */
  success: '#10B981', // vert-turquoise, sur fond sombre
  successInk: '#047857', // même teinte, texte sur fond clair
  attention: '#F59E0B', // ambre, sur fond sombre
  attentionInk: '#92400E', // ambre foncé, texte sur fond clair
  info: '#38BDF8', // bleu ciel, sur fond sombre
  infoInk: '#0369A1', // bleu foncé, texte sur fond clair
  ai: '#A78BFA', // violet IA, sur fond sombre
  aiInk: '#6D28D9', // violet foncé, texte sur fond clair
  /** Surfaces */
  warmPaper: '#FFF7F2',
  white: '#FFFFFF',
} as const;

export type RepStepId = 'import' | 'editor' | 'profile' | 'plan' | 'marketplace';

/** Un accent par étape : lisible sur le bandeau bleu nuit (pastille, barre). */
export const REP_STEP_ACCENT: Record<RepStepId, string> = {
  import: REP_PALETTE.ai,
  editor: REP_PALETTE.magenta,
  profile: REP_PALETTE.success,
  plan: REP_PALETTE.attention,
  marketplace: REP_PALETTE.success,
};

/** Teinte par rubrique « À faire / Pourquoi / Durée » (fond translucide + pictogramme). */
export const REP_SECTION_TINT = {
  what: { accent: REP_PALETTE.magenta, label: '#FF8AC4' },
  why: { accent: REP_PALETTE.ai, label: '#C4B5FD' },
  howLong: { accent: REP_PALETTE.success, label: '#6EE7B7' },
} as const;

/** Couples (texte, fond, usage) qui DOIVENT respecter WCAG AA — vérifiés par les tests. */
export const REP_CONTRAST_PAIRS: Array<{ fg: string; bg: string; label: string; large?: boolean }> = [
  { fg: '#FFFFFF', bg: REP_PALETTE.night, label: 'texte blanc sur bleu nuit' },
  { fg: '#FFFFFF', bg: REP_PALETTE.nightSoft, label: 'texte blanc sur bleu nuit clair' },
  { fg: REP_SECTION_TINT.what.label, bg: REP_PALETTE.night, label: 'libellé « À faire » sur bleu nuit' },
  { fg: REP_SECTION_TINT.why.label, bg: REP_PALETTE.night, label: 'libellé « Pourquoi » sur bleu nuit' },
  { fg: REP_SECTION_TINT.howLong.label, bg: REP_PALETTE.night, label: 'libellé « Durée » sur bleu nuit' },
  { fg: REP_PALETTE.magenta, bg: REP_PALETTE.night, label: 'magenta sur bleu nuit (graphique)', large: true },
  { fg: REP_PALETTE.success, bg: REP_PALETTE.night, label: 'vert sur bleu nuit (graphique)', large: true },
  { fg: REP_PALETTE.attention, bg: REP_PALETTE.night, label: 'ambre sur bleu nuit (graphique)', large: true },
  { fg: REP_PALETTE.ai, bg: REP_PALETTE.night, label: 'violet sur bleu nuit (graphique)', large: true },
  { fg: REP_PALETTE.magentaDeep, bg: REP_PALETTE.white, label: 'magenta foncé sur blanc' },
  { fg: REP_PALETTE.magentaDeep, bg: REP_PALETTE.warmPaper, label: 'magenta foncé sur fond chaud' },
  { fg: REP_PALETTE.successInk, bg: REP_PALETTE.white, label: 'vert foncé sur blanc' },
  { fg: REP_PALETTE.attentionInk, bg: REP_PALETTE.white, label: 'ambre foncé sur blanc' },
  { fg: REP_PALETTE.aiInk, bg: REP_PALETTE.white, label: 'violet foncé sur blanc' },
  { fg: REP_PALETTE.infoInk, bg: REP_PALETTE.white, label: 'bleu foncé sur blanc' },
  { fg: REP_PALETTE.info, bg: REP_PALETTE.night, label: 'bleu ciel sur bleu nuit (graphique)', large: true },
  { fg: REP_PALETTE.night, bg: REP_PALETTE.warmPaper, label: 'bleu nuit sur fond chaud' },
];
