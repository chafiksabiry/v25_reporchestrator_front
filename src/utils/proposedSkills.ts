/**
 * Compétences suggérées (`profile.proposedSkills.{technical,professional,soft}`), issues de
 * l'analyse de la vidéo de présentation ou de l'import du CV. Elles ne sont ajoutées à
 * `skills.*` qu'après confirmation du REP : l'onglet « Compétences » les affiche donc comme
 * suggestions (jamais « vide » quand il y en a).
 */

export type SkillType = 'technical' | 'professional' | 'soft';
export const SKILL_TYPES: SkillType[] = ['technical', 'professional', 'soft'];

export const normalizeSkillId = (raw: any): string | null => {
  if (!raw) return null;
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && typeof raw.$oid === 'string') return raw.$oid;
  if (typeof raw === 'object' && typeof raw._id === 'string') return raw._id;
  if (typeof raw === 'object' && typeof raw.id === 'string') return raw.id;
  return null;
};

export const entrySkillId = (entry: any): string | null =>
  normalizeSkillId(entry?.skill) || normalizeSkillId(entry?._id);

export interface ProposedEntry {
  id: string;
  name: string;
  level?: number;
}

/** Suggestions restantes d'un type : celles qui ne sont pas déjà dans les compétences confirmées. */
export const buildProposedEntries = (
  proposedSkills: any,
  type: SkillType,
  confirmedIds: Set<string>,
  resolveName: (entry: any) => string
): ProposedEntry[] => {
  const seen = new Set<string>();
  const out: ProposedEntry[] = [];
  for (const entry of proposedSkills?.[type] || []) {
    const id = entrySkillId(entry);
    if (!id || confirmedIds.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, name: resolveName(entry), level: entry?.level });
  }
  return out;
};

export const countProposed = (
  proposedSkills: any,
  skills: any,
  resolveName: (entry: any) => string = () => ''
): number =>
  SKILL_TYPES.reduce((total, type) => {
    const confirmed = new Set<string>(
      (skills?.[type] || []).map(entrySkillId).filter((id: string | null): id is string => !!id)
    );
    return total + buildProposedEntries(proposedSkills, type, confirmed, resolveName).length;
  }, 0);

/**
 * Confirme une ou plusieurs suggestions d'un type : les ajoute à `skills[type]` (sans doublon,
 * en tête de liste) et les retire de `proposedSkills[type]`. Fonction pure.
 */
export const confirmProposedSkills = (
  skills: any,
  proposedSkills: any,
  type: SkillType,
  skillIds: string[]
) => {
  const ids = new Set(skillIds.filter(Boolean));
  const nextSkills = {
    technical: [...(skills?.technical || [])],
    professional: [...(skills?.professional || [])],
    soft: [...(skills?.soft || [])],
  };
  const nextProposed = {
    technical: [...(proposedSkills?.technical || [])],
    professional: [...(proposedSkills?.professional || [])],
    soft: [...(proposedSkills?.soft || [])],
  };
  const present = new Set(nextSkills[type].map(entrySkillId).filter(Boolean) as string[]);
  const toAdd: any[] = [];
  for (const entry of nextProposed[type]) {
    const id = entrySkillId(entry);
    if (!id || !ids.has(id) || present.has(id)) continue;
    present.add(id);
    toAdd.push({
      skill: id,
      level: typeof entry?.level === 'number' ? entry.level : 0,
      details: '',
    });
  }
  nextSkills[type] = [...toAdd, ...nextSkills[type]];
  nextProposed[type] = nextProposed[type].filter((entry) => {
    const id = entrySkillId(entry);
    return !id || !ids.has(id);
  });
  return { nextSkills, nextProposed, added: toAdd.length };
};
