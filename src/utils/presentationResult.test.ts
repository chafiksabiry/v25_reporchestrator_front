import { describe, expect, it } from 'vitest';
import { buildDetectedGroups, detectedSkillCount, normalizePresentationResult } from './presentationResult';

// Réponse au format FINAL du backend (PR #3), avec les champs supprimés encore présents « par erreur ».
const FINAL = {
  data: {
    saved: true,
    insightsApplied: true,
    summary: { en: 'Experienced agent.', fr: 'Agent expérimenté.' },
    relevance: { onTopic: true, score: 92, reason: { en: 'On topic', fr: 'Dans le sujet' } },
    detected: {
      technicalSkills: [{ id: 't1', name: 'CRM', score: 80 }],
      professionalSkills: [{ id: 'p1', name: { en: 'Negotiation', fr: 'Négociation' }, score: 70 }],
      softSkills: [{ id: 's1', name: 'Empathy', score: 90 }],
      industries: [{ id: 'i1', name: 'Telecom', score: 60 }],
      activities: [{ id: 'a1', name: 'Customer support', score: 75 }],
      languages: [{ id: 'l1', name: 'French', level: 'C2', score: 95 }, { id: 'l2', name: 'English', score: 80 }],
      isEmpty: false,
    },
    // supprimés côté serveur : ne doivent jamais être lus
    transcription: 'texte', analysis: { x: 1 }, languageAssessment: {}, fraudCheck: {}, videoUrl: 'https://v', duration: 99,
  },
};

describe('réponse de l’analyse de présentation (format final)', () => {
  it('ne retient que les champs du format final', () => {
    const r = normalizePresentationResult(FINAL);
    expect(Object.keys(r).sort()).toEqual(['detected', 'insightsApplied', 'relevance', 'saved', 'stale', 'summary']);
    expect(r).not.toHaveProperty('videoUrl');
    expect(r).not.toHaveProperty('duration');
    expect(r).not.toHaveProperty('transcription');
    expect(r.saved).toBe(true);
    expect(r.insightsApplied).toBe(true);
    expect(r.relevance?.score).toBe(92);
  });

  it('groupes affichés : compétences fusionnées, secteurs, activités, langues avec niveau (FR)', () => {
    const groups = buildDetectedGroups(normalizePresentationResult(FINAL), 'fr');
    expect(groups.map((g) => g.key)).toEqual(['skills', 'industries', 'activities', 'languages']);
    expect(groups[0].labels).toEqual(['CRM', 'Négociation', 'Empathy']);
    expect(groups[3].labels).toEqual(['French (C2)', 'English']);
    expect(detectedSkillCount(normalizePresentationResult(FINAL))).toBe(3);
  });

  it('nom bilingue : langue de l’interface, repli sur l’autre langue', () => {
    const r = normalizePresentationResult(FINAL);
    expect(buildDetectedGroups(r, 'en')[0].labels[1]).toBe('Negotiation');
    const onlyFr = normalizePresentationResult({ data: { detected: { industries: [{ name: { fr: 'Banque' } }] } } });
    expect(buildDetectedGroups(onlyFr, 'en')[0].labels).toEqual(['Banque']);
  });

  it('isEmpty:true du serveur : aucune parole exploitable, aucun groupe', () => {
    const r = normalizePresentationResult({ data: { saved: true, insightsApplied: false, detected: { isEmpty: true } } });
    expect(r.detected.isEmpty).toBe(true);
    expect(buildDetectedGroups(r, 'fr')).toEqual([]);
  });

  it('isEmpty absent : déduit (rien détecté = vide)', () => {
    expect(normalizePresentationResult({ data: { detected: {} } }).detected.isEmpty).toBe(true);
    expect(normalizePresentationResult({ data: { detected: { industries: [{ name: 'x' }] } } }).detected.isEmpty).toBe(false);
  });

  it('saved:false : non bloquant, résultat quand même exploitable', () => {
    const r = normalizePresentationResult({ data: { ...FINAL.data, saved: false, insightsApplied: false } });
    expect(r.saved).toBe(false);
    expect(buildDetectedGroups(r, 'fr').length).toBe(4);
  });

  it('réponse inattendue : aucune exception', () => {
    expect(normalizePresentationResult(null).detected.isEmpty).toBe(true);
    expect(normalizePresentationResult(undefined).saved).toBe(false);
    expect(normalizePresentationResult({ data: { detected: { technicalSkills: 'oops' } } }).detected.technicalSkills).toEqual([]);
  });
});

describe('analyse devenue obsolète (stale)', () => {
  const STALE = {
    data: {
      saved: false,
      insightsApplied: false,
      stale: true,
      summary: { en: 'x', fr: 'x' },
      detected: { technicalSkills: [{ id: 't1', name: 'CRM' }], industries: [], activities: [], languages: [], professionalSkills: [], softSkills: [], isEmpty: false },
    },
  };

  it('stale:true est reconnu ; detected reste présent mais rien n’est appliqué', () => {
    const r = normalizePresentationResult(STALE);
    expect(r.stale).toBe(true);
    expect(r.saved).toBe(false);
    expect(r.insightsApplied).toBe(false);
    expect(detectedSkillCount(r)).toBe(1);
  });

  it('ancien format sans `stale` : stale = false, comportement inchangé', () => {
    const r = normalizePresentationResult(FINAL);
    expect(r.stale).toBe(false);
    expect(r.saved).toBe(true);
    expect(buildDetectedGroups(r, 'fr').length).toBe(4);
  });

  it('stale n’est vrai que pour la valeur booléenne true', () => {
    expect(normalizePresentationResult({ data: { stale: 'true' } }).stale).toBe(false);
    expect(normalizePresentationResult({ data: { stale: 1 } }).stale).toBe(false);
    expect(normalizePresentationResult({ data: { stale: false } }).stale).toBe(false);
  });
});
