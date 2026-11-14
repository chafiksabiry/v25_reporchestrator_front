/**
 * Options de « flexibilité des horaires ».
 *
 * Les valeurs stockées viennent de deux sources : les boutons de l'éditeur (libellés canoniques
 * en anglais, ex. « Remote Work Available ») et l'IA d'import du CV (texte libre, ex.
 * « remote work », « flexible hours »). On normalise donc toute valeur vers une option canonique
 * avant de chercher la traduction ; sinon on affiche la valeur « humanisée », JAMAIS la clé brute.
 */

export const FLEXIBILITY_OPTIONS = [
  'Remote Work Available',
  'Flexible Hours',
  'Weekend Rotation',
  'Night Shift Available',
  'Split Shifts',
  'Part-Time Options',
  'Compressed Work Week',
  'Shift Swapping Allowed',
] as const;

export type FlexibilityOption = (typeof FLEXIBILITY_OPTIONS)[number];

const squash = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

// Alias (déjà normalisés par `squash`) → option canonique.
const ALIASES: Record<string, FlexibilityOption> = {};
const addAliases = (option: FlexibilityOption, aliases: string[]) => {
  ALIASES[squash(option)] = option;
  aliases.forEach((a) => {
    ALIASES[squash(a)] = option;
  });
};
addAliases('Remote Work Available', [
  'remote work', 'remote', 'remote available', 'work from home', 'wfh', 'home office', 'telework',
  'teletravail', 'teletravail possible',
]);
addAliases('Flexible Hours', [
  'flexible', 'flexible schedule', 'flexible schedules', 'flexible working hours', 'flex hours',
  'horaires flexibles', 'horaires flexible',
]);
addAliases('Weekend Rotation', [
  'weekend', 'weekends', 'weekend work', 'weekend shifts', 'week end', 'rotation week end',
]);
addAliases('Night Shift Available', [
  'night shift', 'night shifts', 'night work', 'night', 'evening', 'evenings', 'evening shift',
  'travail de nuit', 'soiree', 'nuit',
]);
addAliases('Split Shifts', ['split shift', 'split', 'horaires fractionnes']);
addAliases('Part-Time Options', [
  'part time', 'part time available', 'part time option', 'part time work', 'temps partiel',
  'temps partiel possible',
]);
addAliases('Compressed Work Week', ['compressed week', 'compressed schedule', 'semaine comprimee']);
addAliases('Shift Swapping Allowed', [
  'shift swapping', 'shift swap', 'shift swaps', 'swap shifts', 'echange de creneaux',
]);

/** Option canonique correspondant à une valeur libre, ou null si inconnue. */
export const canonicalFlexibility = (value: unknown): FlexibilityOption | null => {
  if (typeof value !== 'string') return null;
  const key = squash(value);
  return key ? ALIASES[key] ?? null : null;
};

/** « remote_work » / « remote-work » / « REMOTE WORK » → « Remote work » (repli lisible). */
export const humanizeFlexibility = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  const text = value.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const lower = text.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

/**
 * Libellé à afficher. `translate` reçoit la clé relative « availability.options.<Option> » et doit
 * renvoyer le texte traduit (ou la clé / '' s'il manque : alors on humanise la valeur).
 */
export const flexibilityLabel = (
  value: unknown,
  translate: (key: string) => string
): string => {
  const canonical = canonicalFlexibility(value);
  if (canonical) {
    const key = `availability.options.${canonical}`;
    const text = translate(key);
    if (text && text !== key && !text.endsWith(key)) return text;
    return canonical;
  }
  return humanizeFlexibility(value);
};

/** Vrai si la liste contient l'option, en comparant les formes canoniques. */
export const hasFlexibility = (list: unknown, option: string): boolean => {
  if (!Array.isArray(list)) return false;
  const target = canonicalFlexibility(option) ?? option;
  return list.some((item) => (canonicalFlexibility(item) ?? item) === target);
};

/** Ajoute/retire une option ; les variantes libres déjà stockées sont ramenées à leur forme canonique. */
export const toggleFlexibility = (list: unknown, option: string): string[] => {
  const current = Array.isArray(list) ? (list as string[]) : [];
  const target = canonicalFlexibility(option) ?? option;
  const normalized = Array.from(new Set(current.map((item) => canonicalFlexibility(item) ?? item)));
  const present = normalized.includes(target);
  return present ? normalized.filter((item) => item !== target) : [...normalized, target];
};
