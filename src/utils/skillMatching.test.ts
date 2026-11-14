import { describe, expect, it } from 'vitest';
import { findCatalogSkill, normalizeSkillName, resolveSkillRefs, type CatalogByCategory } from './skillMatching';

const catalog: CatalogByCategory = {
  Tools: [
    { _id: 's-crm', name: 'CRM Software', name_i18n: { en: 'CRM Software', fr: 'Logiciel CRM' } },
    { _id: 's-js', name: 'JavaScript', name_i18n: { en: 'JavaScript', fr: 'JavaScript' } },
    { _id: 's-r', name: 'R', name_i18n: { en: 'R', fr: 'R' } },
    { _id: 's-java', name: 'Java', name_i18n: { en: 'Java', fr: 'Java' } },
  ],
  Comms: [
    { _id: 's-comm', name: 'Communication', name_i18n: { en: 'Communication', fr: 'Communication' } },
    { _id: 's-sell', name: 'Active Listening', name_i18n: { en: 'Active Listening', fr: 'Écoute active' } },
  ],
};

describe('rapprochement des compétences du CV', () => {
  it('normalise accents, casse, ponctuation', () => {
    expect(normalizeSkillName('  Écoute  Active! ')).toBe('ecoute active');
    expect(normalizeSkillName(undefined)).toBe('');
  });

  it('nom exact en anglais', () => {
    expect(resolveSkillRefs([{ name: 'communication', confidence: 4 }], catalog).resolved).toEqual([
      { skill: 's-comm', level: 4, details: '' },
    ]);
  });

  it('nom français (jusqu’ici ignoré) : « Écoute active », « Logiciel CRM »', () => {
    expect(findCatalogSkill({ name: 'Écoute active' }, catalog.Comms)?._id).toBe('s-sell');
    expect(findCatalogSkill({ name: 'logiciel crm' }, catalog.Tools)?._id).toBe('s-crm');
  });

  it('nom bilingue { en, fr } renvoyé par l’IA', () => {
    const r = resolveSkillRefs([{ name: { en: 'Active Listening', fr: 'Écoute active' }, confidence: 3 }], catalog);
    expect(r.resolved.map((x) => x.skill)).toEqual(['s-sell']);
  });

  it('pas de faux positif avec un nom court du catalogue (« R », « Java » dans « JavaScript »)', () => {
    expect(findCatalogSkill({ name: 'Reporting' }, catalog.Tools)).toBeNull(); // « R » ne doit pas correspondre
    expect(findCatalogSkill({ name: 'JavaScript' }, catalog.Tools)?._id).toBe('s-js'); // exact avant tout
    expect(findCatalogSkill({ name: 'Java' }, catalog.Tools)?._id).toBe('s-java');
  });

  it('repli sur mot entier pour les noms de 4 caractères et plus', () => {
    expect(findCatalogSkill({ name: 'Strong communication skills' }, catalog.Comms)?._id).toBe('s-comm');
  });

  it('inconnu : compté, jamais inventé ; doublons fusionnés ; niveau borné', () => {
    const r = resolveSkillRefs(
      [{ name: 'Communication', confidence: 9 }, { name: 'communication' }, { name: 'Quantum Basket Weaving' }, 'Communication', null],
      catalog
    );
    expect(r.resolved).toEqual([{ skill: 's-comm', level: 5, details: '' }]);
    expect(r.unmatched).toBe(2); // « Quantum… » et null
  });

  it('catalogue vide ou liste absente : aucune erreur', () => {
    expect(resolveSkillRefs(undefined, catalog)).toEqual({ resolved: [], unmatched: 0 });
    expect(resolveSkillRefs([{ name: 'x' }], undefined).resolved).toEqual([]);
  });
});
