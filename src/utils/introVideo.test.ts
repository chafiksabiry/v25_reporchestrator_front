import { describe, expect, it } from 'vitest';
import {
  INTRO_VIDEO_MAX_SECONDS,
  hasAnyExperienceVideo,
  hasPresentationVideo,
  isIntroVideoRequirementMet,
  isIntroVideoRequirementMetFromParts,
} from './introVideo';
import { isRepPhase2Ready } from './repOnboardingNextStep';

const photo = { url: 'https://img/p.jpg' };
const schedule = [{ day: 'Monday', hours: { start: '09:00', end: '17:00' } }];

describe('règle vidéo de présentation', () => {
  it('durée max affichée : 3 minutes', () => {
    expect(INTRO_VIDEO_MAX_SECONDS).toBe(180);
  });

  it('sans aucune vidéo : exigence non remplie', () => {
    expect(isIntroVideoRequirementMet({ personalInfo: {}, experience: [{ title: 'A' }, { title: 'B' }] })).toBe(false);
    expect(isIntroVideoRequirementMet(null)).toBe(false);
  });

  it('vidéo de présentation seule (aucune vidéo d’expérience) : exigence remplie', () => {
    const p = { personalInfo: { presentationVideo: { url: 'https://v/intro.webm' } }, experience: [{ title: 'A' }, { title: 'B' }] };
    expect(hasPresentationVideo(p)).toBe(true);
    expect(isIntroVideoRequirementMet(p)).toBe(true);
  });

  it('présentation fournie sous forme de chaîne ou marquée envoyée', () => {
    expect(hasPresentationVideo({ personalInfo: { presentationVideo: 'https://v/x.webm' } })).toBe(true);
    expect(hasPresentationVideo({ personalInfo: { presentationVideo: { url: '', uploaded: true } } })).toBe(true);
    expect(hasPresentationVideo({ personalInfo: { presentationVideo: { url: '  ' } } })).toBe(false);
    expect(hasPresentationVideo({ personalInfo: { presentationVideo: '' } })).toBe(false);
  });

  it('compatibilité : une seule vidéo d’expérience sur plusieurs suffit (profils existants)', () => {
    const p = { personalInfo: {}, experience: [{ title: 'A', videoUrl: 'https://v/a.webm' }, { title: 'B' }] };
    expect(hasAnyExperienceVideo(p)).toBe(true);
    expect(isIntroVideoRequirementMet(p)).toBe(true);
  });

  it('compatibilité : analyse seule sans URL compte aussi', () => {
    expect(isIntroVideoRequirementMet({ experience: [{ videoAnalysis: { summary: 'ok' } }] })).toBe(true);
  });

  it('variante données brutes de l’API', () => {
    expect(isIntroVideoRequirementMetFromParts({ presentationVideo: { url: 'u' } }, [])).toBe(true);
    expect(isIntroVideoRequirementMetFromParts(undefined, undefined)).toBe(false);
  });
});

describe('critère d’avancement de l’onboarding (isRepPhase2Ready)', () => {
  const base = { personalInfo: { photo }, availability: { schedule } };

  it('bloque tant qu’aucune vidéo n’existe', () => {
    expect(isRepPhase2Ready({ ...base, experience: [{ title: 'A' }] })).toBe(false);
  });

  it('passe avec la seule vidéo de présentation, même si les expériences n’ont pas de vidéo', () => {
    expect(
      isRepPhase2Ready({
        ...base,
        personalInfo: { photo, presentationVideo: { url: 'https://v/i.webm' } },
        experience: [{ title: 'A' }, { title: 'B' }, { title: 'C' }],
      })
    ).toBe(true);
  });

  it('profil existant : une vidéo sur trois expériences ne bloque plus', () => {
    expect(
      isRepPhase2Ready({ ...base, experience: [{ videoUrl: 'u' }, { title: 'B' }, { title: 'C' }] })
    ).toBe(true);
  });

  it('les autres exigences restent : photo et horaires', () => {
    const withVideo = { experience: [{ videoUrl: 'u' }] };
    expect(isRepPhase2Ready({ ...withVideo, personalInfo: {}, availability: { schedule } })).toBe(false);
    expect(isRepPhase2Ready({ ...withVideo, personalInfo: { photo }, availability: { schedule: [] } })).toBe(false);
  });
});

import {
  ANALYSIS_SLOW_AFTER_MS,
  introAnalysisUi,
  keepSavedPresentationVideo,
  withPresentationVideo,
} from './introVideo';

describe('état local « vidéo enregistrée » (bandeau du parcours et liste de l’éditeur)', () => {
  it('withPresentationVideo marque la vidéo enregistrée sans modifier l’original', () => {
    const base = { _id: 'p1', personalInfo: { name: 'A' } };
    const next = withPresentationVideo(base, 'https://v/1.webm');
    expect(isIntroVideoRequirementMet(next)).toBe(true);
    expect(next.personalInfo.name).toBe('A');
    expect(isIntroVideoRequirementMet(base)).toBe(false);
    expect(base.personalInfo).toEqual({ name: 'A' });
  });

  it('withPresentationVideo : profil vide ou url absente → toujours « enregistrée » (uploaded)', () => {
    expect(isIntroVideoRequirementMet(withPresentationVideo(null))).toBe(true);
    expect(isIntroVideoRequirementMet(withPresentationVideo({}, ''))).toBe(true);
  });

  it('keepSavedPresentationVideo : un profil relu sans trace de la vidéo la garde ; avec trace, il est inchangé', () => {
    const server = { personalInfo: { name: 'A' } };
    expect(isIntroVideoRequirementMet(keepSavedPresentationVideo(server, { url: 'u' }))).toBe(true);
    expect(isIntroVideoRequirementMet(keepSavedPresentationVideo(server, null))).toBe(false);
    const withVideo = { personalInfo: { presentationVideo: { url: 'srv' } } };
    expect(keepSavedPresentationVideo(withVideo, { url: 'local' })).toBe(withVideo);
    expect(keepSavedPresentationVideo(null, { url: 'u' })).toBeNull();
  });

  it('bouton « Continuer » dès que la vidéo est enregistrée pendant l’analyse (jamais avant, jamais hors analyse)', () => {
    expect(introAnalysisUi({ videoSaved: true, analyzing: true, elapsedMs: 0 }).showContinue).toBe(true);
    expect(introAnalysisUi({ videoSaved: false, analyzing: true, elapsedMs: 0 }).showContinue).toBe(false);
    expect(introAnalysisUi({ videoSaved: true, analyzing: false, elapsedMs: 0 }).showContinue).toBe(false);
  });

  it('message « plus long que prévu » après 3 minutes d’analyse seulement', () => {
    expect(ANALYSIS_SLOW_AFTER_MS).toBe(180000);
    expect(introAnalysisUi({ videoSaved: true, analyzing: true, elapsedMs: ANALYSIS_SLOW_AFTER_MS - 1 }).showSlowNotice).toBe(false);
    expect(introAnalysisUi({ videoSaved: true, analyzing: true, elapsedMs: ANALYSIS_SLOW_AFTER_MS }).showSlowNotice).toBe(true);
    expect(introAnalysisUi({ videoSaved: true, analyzing: false, elapsedMs: ANALYSIS_SLOW_AFTER_MS }).showSlowNotice).toBe(false);
  });
});
