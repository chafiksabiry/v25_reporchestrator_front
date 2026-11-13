import { describe, expect, it } from 'vitest';
import {
  canRevisitStep,
  classifyImportError,
  getEditorChecklist,
  getEditorCompletion,
  getJourneyProgress,
  REP_JOURNEY_STEPS,
  resolveJourneyStepIndex,
} from './repOnboardingProgress';
import { isRepPhase2Ready } from './repOnboardingNextStep';

describe('parcours REP : étapes', () => {
  it('reconnaît les 5 étapes, avec ou sans préfixe /reps et slash final', () => {
    expect(resolveJourneyStepIndex('/profile-import')).toBe(0);
    expect(resolveJourneyStepIndex('/profile-editor')).toBe(1);
    expect(resolveJourneyStepIndex('/profile')).toBe(2);
    expect(resolveJourneyStepIndex('/subscription')).toBe(3);
    expect(resolveJourneyStepIndex('/orchestrator/subscription')).toBe(3);
    expect(resolveJourneyStepIndex('/marketplace')).toBe(4);
    expect(resolveJourneyStepIndex('/reps/profile-editor/')).toBe(1);
  });

  it("ne confond pas /profile avec /profile-editor et ignore les pages hors parcours", () => {
    expect(resolveJourneyStepIndex('/profile-wizard')).toBe(-1);
    expect(resolveJourneyStepIndex('/dashboard')).toBe(-1);
    expect(getJourneyProgress('/dashboard')).toBeNull();
  });

  it('progression : pourcentage croissant et minutes restantes cohérentes', () => {
    const pcts = REP_JOURNEY_STEPS.map((s) => getJourneyProgress(s.path)!.percent);
    expect([...pcts].sort((a, b) => a - b)).toEqual(pcts);
    expect(pcts[0]).toBe(10);
    expect(pcts[4]).toBe(90);
    const total = REP_JOURNEY_STEPS.reduce((n, s) => n + s.minutes, 0);
    expect(getJourneyProgress('/profile-import')!.remainingMinutes).toBe(total);
    expect(getJourneyProgress('/marketplace')!.remainingMinutes).toBe(1);
  });
});

describe('retour en arrière sans perte', () => {
  it("autorise l'éditeur et le profil, jamais l'import (il écraserait le profil)", () => {
    expect(canRevisitStep('/subscription', '/profile')).toBe(true);
    expect(canRevisitStep('/subscription', '/profile-editor')).toBe(true);
    expect(canRevisitStep('/profile', '/profile-editor')).toBe(true);
    expect(canRevisitStep('/profile-editor', '/profile-import')).toBe(false);
    expect(canRevisitStep('/subscription', '/profile-import')).toBe(false);
  });
  it('refuse l’avance, le surplace et les pages hors parcours', () => {
    expect(canRevisitStep('/profile', '/subscription')).toBe(false);
    expect(canRevisitStep('/profile', '/profile')).toBe(false);
    expect(canRevisitStep('/dashboard', '/profile')).toBe(false);
  });
});

describe("checklist de l'éditeur", () => {
  const full = {
    personalInfo: { photo: { url: 'https://x/p.jpg' } },
    experience: [{ videoUrl: 'a' }, {}],
    availability: { schedule: [{ day: 'Monday', hours: { start: '09:00', end: '17:00' } }] },
  };

  it('profil vide : rien de fait', () => {
    const items = getEditorChecklist(null);
    expect(items.every((i) => !i.done)).toBe(true);
    expect(getEditorCompletion(items)).toEqual({ done: 0, total: 4, percent: 0 });
  });

  it("vidéo : la vidéo de présentation suffit, les vidéos d'expérience sont facultatives", () => {
    const base = { ...full, experience: [{}, {}, {}] };
    expect(getEditorChecklist(base).find((i) => i.id === 'video')!.done).toBe(false);
    const withIntro = { ...base, personalInfo: { ...base.personalInfo, presentationVideo: { url: 'https://x/v.mp4' } } };
    const items = getEditorChecklist(withIntro);
    expect(items.find((i) => i.id === 'video')!.done).toBe(true);
    expect(items.find((i) => i.id === 'experiences')!.done).toBe(true);
    expect(getEditorChecklist({ ...base, experience: [{ videoUrl: 'a' }, {}, {}] }).find((i) => i.id === 'video')!.done).toBe(true);
  });

  it('accepte la clé « experiences » et refuse un horaire incomplet', () => {
    const items = getEditorChecklist({
      ...full,
      experience: undefined,
      experiences: [{ videoUrl: 'a' }],
      availability: { schedule: [{ day: 'Monday', hours: { start: '09:00' } }] },
    });
    expect(items.find((i) => i.id === 'video')!.done).toBe(true);
    expect(items.find((i) => i.id === 'availability')!.done).toBe(false);
  });

  it('reste strictement aligné sur isRepPhase2Ready (même verdict)', () => {
    const cases = [
      null,
      {},
      full,
      { ...full, personalInfo: {} },
      { ...full, experience: [] },
      { ...full, experience: [{}, {}] },
      { ...full, experience: [{}, {}], personalInfo: { photo: { url: 'x' }, presentationVideo: 'https://v' } },
      { ...full, availability: { schedule: [] } },
    ];
    for (const c of cases) {
      const allDone = getEditorChecklist(c).every((i) => i.done);
      expect(allDone).toBe(isRepPhase2Ready(c));
    }
  });
});

describe("messages d'erreur d'import humains", () => {
  it('classe les erreurs courantes', () => {
    expect(classifyImportError({ status: 401, message: 'x' })).toBe('auth');
    expect(classifyImportError({ response: { status: 429 } })).toBe('rateLimit');
    expect(classifyImportError(new Error('Failed to fetch'))).toBe('network');
    expect(classifyImportError(new Error('Request timed out'))).toBe('timeout');
    expect(classifyImportError({ status: 503, message: '' })).toBe('serverBusy');
    expect(classifyImportError(new Error('Validation error: personalInfo.email'))).toBe('validation');
    expect(classifyImportError(new Error('No text could be extracted'))).toBe('unreadable');
    expect(classifyImportError(new Error('Languages section is required'))).toBe('languages');
    expect(classifyImportError(new Error('boom'))).toBe('generic');
    expect(classifyImportError(undefined)).toBe('generic');
  });
});
