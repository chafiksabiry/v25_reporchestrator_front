import { describe, expect, it } from 'vitest';
import {
  buildProposedEntries,
  confirmProposedSkills,
  countProposed,
  entrySkillId,
  normalizeSkillId,
} from './proposedSkills';

const proposed = {
  technical: [
    { skill: 'a1', level: 70, details: 'Detected from experience video' },
    { skill: { _id: 'a2', name: 'CRM' }, level: 55 },
    { skill: 'a1', level: 40 }, // doublon
  ],
  professional: [{ skill: { $oid: 'p1' }, level: 60 }],
  soft: [],
};
const name = (e: any) => (typeof e?.skill === 'object' && e.skill.name) || String(entrySkillId(e));

describe('suggestions de compétences', () => {
  it('normalise les identifiants (chaîne, $oid, _id, id)', () => {
    expect(normalizeSkillId('x')).toBe('x');
    expect(normalizeSkillId({ $oid: 'y' })).toBe('y');
    expect(normalizeSkillId({ _id: 'z' })).toBe('z');
    expect(normalizeSkillId(null)).toBeNull();
  });

  it('affiche les suggestions non encore confirmées, sans doublon', () => {
    const list = buildProposedEntries(proposed, 'technical', new Set(), name);
    expect(list.map((e) => e.id)).toEqual(['a1', 'a2']);
    expect(list[1].name).toBe('CRM');
  });

  it('masque celles déjà confirmées', () => {
    const list = buildProposedEntries(proposed, 'technical', new Set(['a1']), name);
    expect(list.map((e) => e.id)).toEqual(['a2']);
  });

  it('compte le total (l’onglet n’est pas « vide » s’il y a des suggestions)', () => {
    expect(countProposed(proposed, { technical: [], professional: [], soft: [] })).toBe(3);
    expect(countProposed(proposed, { technical: [{ skill: 'a1' }] })).toBe(2);
    expect(countProposed({}, {})).toBe(0);
  });

  it('« Tout ajouter » : ajoute les suggestions du type, retire les propositions, sans doublon', () => {
    const skills = { technical: [{ skill: 'a2', level: 30, details: '' }], professional: [], soft: [] };
    const { nextSkills, nextProposed, added } = confirmProposedSkills(skills, proposed, 'technical', ['a1', 'a2']);
    expect(added).toBe(1); // a2 déjà présent
    expect(nextSkills.technical.map((e: any) => e.skill)).toEqual(['a1', 'a2']);
    expect(nextSkills.technical[0].level).toBe(70);
    expect(nextProposed.technical).toEqual([]);
    expect(nextProposed.professional).toHaveLength(1); // autres types intacts
  });

  it('ajout individuel', () => {
    const { nextSkills, nextProposed } = confirmProposedSkills({}, proposed, 'professional', ['p1']);
    expect(nextSkills.professional).toEqual([{ skill: 'p1', level: 60, details: '' }]);
    expect(nextProposed.professional).toEqual([]);
  });
});
