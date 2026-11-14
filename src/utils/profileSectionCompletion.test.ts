import { describe, expect, it } from 'vitest';
import {
  adjacentTab,
  computeFrameHeight,
  getEditorTabs,
  getTabsOverall,
  editorSectionAnchor,
  getOverallCompletion,
  getSectionCompletions,
  getSummaryQuality,
  isScheduleComplete,
} from './profileSectionCompletion';

const full = {
  personalInfo: {
    name: 'Awa Diallo',
    country: { countryName: 'France', countryCode: 'FR' },
    phone: '+33612345678',
    photo: { url: 'https://x/y.jpg' },
    languages: [{ language: { name: 'Français' }, proficiency: 'C2' }],
  },
  experience: [{ title: 'Conseillère', company: 'ACME' }],
  professionalSummary: { profileDescription: 'a'.repeat(200) },
  availability: { schedule: [{ day: 'Monday', hours: { start: '09:00', end: '17:00' } }] },
};

const byId = (list: ReturnType<typeof getSectionCompletions>, id: string) => list.find((s) => s.id === id)!;

describe('getSectionCompletions', () => {
  it('profil complet : toutes les sections sont complètes', () => {
    const sections = getSectionCompletions(full);
    expect(sections.every((s) => s.complete)).toBe(true);
    expect(getOverallCompletion(sections)).toMatchObject({ done: 6, total: 6, percent: 100, firstIncomplete: null });
  });

  it('profil vide : rien de complet, premier manquant = identité', () => {
    const sections = getSectionCompletions({});
    expect(sections.some((s) => s.complete)).toBe(false);
    expect(getOverallCompletion(sections).firstIncomplete).toBe('identity');
  });

  it('identité partielle : détaille les éléments manquants', () => {
    const s = byId(getSectionCompletions({ personalInfo: { name: 'Awa', country: '', phone: ' ' } }), 'identity');
    expect(s).toMatchObject({ done: 1, total: 3, percent: 33, complete: false });
    expect(s.missing).toEqual(['country', 'phone']);
  });

  it('pays sous forme de chaîne ou d\'objet', () => {
    expect(byId(getSectionCompletions({ personalInfo: { country: 'France' } }), 'identity').missing).not.toContain('country');
    expect(byId(getSectionCompletions({ personalInfo: { country: {} } }), 'identity').missing).toContain('country');
  });

  it('expérience sans titre/entreprise : partielle', () => {
    const s = byId(getSectionCompletions({ experience: [{ title: 'Agent' }] }), 'experience');
    expect(s.done).toBe(1);
    expect(s.missing).toEqual(['experienceDetails']);
  });

  it('accepte la clé experiences', () => {
    expect(byId(getSectionCompletions({ experiences: [{ title: 'a', company: 'b' }] }), 'experience').complete).toBe(true);
  });

  it('le texte de résumé passé en paramètre prime sur celui du profil', () => {
    const p = { professionalSummary: { profileDescription: 'a'.repeat(300) } };
    expect(byId(getSectionCompletions(p, ''), 'summary').complete).toBe(false);
    expect(byId(getSectionCompletions(p), 'summary').complete).toBe(true);
  });

  it('un résumé trop court ne compte pas comme complet', () => {
    expect(byId(getSectionCompletions({}, 'Bonjour'), 'summary').complete).toBe(false);
  });
});

describe('getSummaryQuality', () => {
  it('classe vide / court / bon / long', () => {
    expect(getSummaryQuality(undefined).quality).toBe('empty');
    expect(getSummaryQuality('   ').quality).toBe('empty');
    expect(getSummaryQuality('a'.repeat(50)).quality).toBe('short');
    expect(getSummaryQuality('a'.repeat(120)).quality).toBe('good');
    expect(getSummaryQuality('a'.repeat(900)).quality).toBe('good');
    expect(getSummaryQuality('a'.repeat(901)).quality).toBe('long');
  });
});

describe('isScheduleComplete', () => {
  it('exige jour + début + fin sur chaque créneau', () => {
    expect(isScheduleComplete({ availability: { schedule: [] } })).toBe(false);
    expect(isScheduleComplete({ availability: { schedule: [{ day: 'Monday', hours: { start: '09:00' } }] } })).toBe(false);
    expect(isScheduleComplete(full)).toBe(true);
  });
});

describe('editorSectionAnchor', () => {
  it('construit un identifiant stable', () => {
    expect(editorSectionAnchor('photo')).toBe('editor-section-photo');
  });
});

describe('getEditorTabs', () => {
  const withVideo = { ...full, personalInfo: { ...full.personalInfo, presentationVideo: { url: 'https://x/v.mp4', uploaded: true } } };

  it('5 onglets dans l’ordre attendu ; identité = identité + photo + langues', () => {
    const tabs = getEditorTabs(full);
    expect(tabs.map((t) => t.id)).toEqual(['identity', 'experience', 'summary', 'availability', 'video']);
    const identity = tabs[0];
    expect(identity.total).toBe(5);
    expect(identity.complete).toBe(true);
  });

  it('identité incomplète : cumule les manques de photo et de langues', () => {
    const tabs = getEditorTabs({ personalInfo: { name: 'Awa' } });
    expect(tabs[0].missing).toEqual(['country', 'phone', 'photo', 'languages']);
    expect(tabs[0].complete).toBe(false);
  });

  it('onglet vidéo : suit la règle de la vidéo de présentation', () => {
    expect(getEditorTabs(full)[4].complete).toBe(false);
    expect(getEditorTabs(full)[4].missing).toEqual(['video']);
    expect(getEditorTabs(withVideo)[4].complete).toBe(true);
  });

  it('progression globale en nombre d’onglets complets', () => {
    expect(getTabsOverall(getEditorTabs({}))).toEqual({ done: 0, total: 5, percent: 0 });
    expect(getTabsOverall(getEditorTabs(withVideo))).toEqual({ done: 5, total: 5, percent: 100 });
  });
});

describe('adjacentTab', () => {
  it('avance et recule sans boucler', () => {
    expect(adjacentTab('identity', 1)).toBe('experience');
    expect(adjacentTab('identity', -1)).toBe('identity');
    expect(adjacentTab('video', 1)).toBe('video');
    expect(adjacentTab('availability', -1)).toBe('summary');
  });
});

describe('computeFrameHeight', () => {
  it('remplit l’espace restant sans dépasser la zone de page', () => {
    expect(computeFrameHeight({ frameTop: 200, scrollTop: 0, containerBottom: 800, bottomPadding: 32 })).toBe(568);
  });
  it('compense le défilement déjà effectué', () => {
    expect(computeFrameHeight({ frameTop: 150, scrollTop: 50, containerBottom: 800, bottomPadding: 32 })).toBe(568);
  });
  it('applique un plancher quand l’écran est trop petit', () => {
    expect(computeFrameHeight({ frameTop: 500, scrollTop: 0, containerBottom: 700, bottomPadding: 32 })).toBe(420);
  });
});
