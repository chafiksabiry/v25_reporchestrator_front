/**
 * Rapprochement des compétences extraites du CV par l'IA (texte libre : { name, confidence, context })
 * avec le catalogue de compétences de la base (le schéma Agent stocke des références, pas des noms).
 *
 * Avant : comparaison sur le seul nom anglais du catalogue + repli « contient » (un nom court du
 * catalogue, ex. « R » ou « Go », pouvait correspondre à n'importe quelle compétence), et les noms
 * français ou bilingues ne correspondaient à rien → onglets « Compétences » vides après l'import.
 */

export interface CatalogSkill {
  _id: string;
  name?: string;
  name_i18n?: { en?: string; fr?: string } | null;
}
export type CatalogByCategory = Record<string, CatalogSkill[]>;

/** Minuscules, sans accents ni ponctuation, espaces réduits. */
export const normalizeSkillName = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, ' ')
    .trim();
};

/** Noms possibles d'un élément renvoyé par l'IA (chaîne, { name }, ou nom bilingue { en, fr }). */
const aiNames = (item: any): string[] => {
  const raw = item && typeof item === 'object' ? (item.name ?? item.skill ?? item.label) : item;
  if (typeof raw === 'string') return [normalizeSkillName(raw)].filter(Boolean);
  if (raw && typeof raw === 'object') {
    return [raw.en, raw.fr, raw.name].map(normalizeSkillName).filter(Boolean);
  }
  return [];
};

const catalogNames = (skill: CatalogSkill): string[] =>
  [skill.name, skill.name_i18n?.en, skill.name_i18n?.fr].map(normalizeSkillName).filter(Boolean);

const hasWord = (haystack: string, needle: string): boolean =>
  new RegExp(`(^| )${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( |$)`).test(haystack);

/** Meilleure correspondance du catalogue pour une compétence IA, ou null. */
export const findCatalogSkill = (item: unknown, catalog: CatalogSkill[]): CatalogSkill | null => {
  const names = aiNames(item);
  if (!names.length) return null;
  // 1) égalité exacte (nom, nom EN, nom FR)
  for (const skill of catalog) {
    const cn = catalogNames(skill);
    if (names.some((n) => cn.includes(n))) return skill;
  }
  // 2) repli prudent : mot entier, seulement pour des noms de catalogue d'au moins 4 caractères
  //    (évite « R », « Go », « C »… qui correspondraient à n'importe quoi)
  for (const skill of catalog) {
    const cn = catalogNames(skill).filter((c) => c.length >= 4);
    if (names.some((n) => cn.some((c) => hasWord(n, c) || hasWord(c, n)))) return skill;
  }
  return null;
};

export interface ResolvedSkill {
  skill: string;
  level: number;
  details: string;
}

/** Transforme la liste IA en références de la base ; renvoie aussi le nombre d'éléments non reconnus. */
export const resolveSkillRefs = (
  rawList: unknown,
  grouped: CatalogByCategory | undefined
): { resolved: ResolvedSkill[]; unmatched: number } => {
  const flat = Object.values(grouped || {}).flat();
  const resolved: ResolvedSkill[] = [];
  const seen = new Set<string>();
  let unmatched = 0;
  for (const item of Array.isArray(rawList) ? rawList : []) {
    const found = findCatalogSkill(item, flat);
    if (!found) {
      unmatched += 1;
      continue;
    }
    if (seen.has(found._id)) continue;
    seen.add(found._id);
    const confidence = Number((item as any)?.confidence);
    const level = Number.isFinite(confidence) ? Math.min(5, Math.max(0, Math.round(confidence))) : 3;
    resolved.push({ skill: found._id, level, details: (item as any)?.context || '' });
  }
  return { resolved, unmatched };
};
