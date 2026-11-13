import { describe, expect, it } from 'vitest';
import { getProfileNextAction } from './repProfileProgress';

const schedule = [{ day: 'Monday', hours: { start: '09:00', end: '17:00' } }];

describe('getProfileNextAction', () => {
  it('profil vide : à compléter dans l’éditeur, premier manque = photo', () => {
    const a = getProfileNextAction({});
    expect(a.kind).toBe('complete-editor');
    expect(a.path).toBe('/profile-editor');
    expect(a.done).toBe(0);
    expect(a.total).toBe(4);
    expect(a.percent).toBe(0);
    expect(a.nextItemId).toBe('photo');
    expect(a.minutes).toBe(8);
  });

  it('avancement partiel : photo + expérience + disponibilités, reste la vidéo', () => {
    const a = getProfileNextAction({
      personalInfo: { photo: { url: 'x' } },
      experience: [{}],
      availability: { schedule },
    });
    expect(a.kind).toBe('complete-editor');
    expect(a.done).toBe(3);
    expect(a.percent).toBe(75);
    expect(a.nextItemId).toBe('video');
  });

  it('phase 2 terminée côté serveur : prochaine étape = formule', () => {
    const a = getProfileNextAction({ onboardingProgress: { phases: { phase2: { status: 'completed' } } } });
    expect(a.kind).toBe('choose-plan');
    expect(a.path).toBe('/subscription');
    expect(a.minutes).toBe(2);
  });

  it('profil publié : rien à faire', () => {
    const a = getProfileNextAction({ status: 'completed' });
    expect(a.kind).toBe('done');
  });
});
