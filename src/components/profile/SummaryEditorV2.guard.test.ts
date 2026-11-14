import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Garde-fou de non-régression de l'éditeur de profil (SummaryEditorV2.jsx).
 * Décision propriétaire : l'éditeur reste « en page » (sections empilées, sans volets/onglets ni
 * cadre à hauteur d'écran), et les corrections fonctionnelles livrées par ailleurs ne doivent pas
 * disparaître lors d'une fusion. Analyse statique du code source : elle ne remplace pas un test
 * de rendu, mais échoue si un de ces éléments est retiré par erreur.
 */
const src = readFileSync(new URL('./SummaryEditorV2.jsx', import.meta.url), 'utf8');
const videoModalSrc = readFileSync(new URL('../dashboard/profile/ExperienceVideoModal.tsx', import.meta.url), 'utf8');

describe('SummaryEditorV2 : expérience « en page » rétablie', () => {
  it('n’utilise ni onglets, ni volets, ni cadre à hauteur d’écran', () => {
    for (const forbidden of ['role="tablist"', 'role="tab"', 'role="tabpanel"', 'EditorStepper', 'useViewportFit', 'profile-editor-frame']) {
      expect(src.includes(forbidden), forbidden).toBe(false);
    }
  });

  it('garde la liste de contrôle, le bouton vidéo et les sections en page', () => {
    expect(src).toContain('data-testid="record-video-now"');
    expect(src).toContain('id="onboarding-availability"');
    expect(src).toContain('renderExperienceSection()');
  });
});

describe('SummaryEditorV2 : corrections fonctionnelles conservées', () => {
  it('pays lisible (jamais d’identifiant brut) — #53', () => {
    expect(src).toContain('formatCountryLabel(');
  });
  it('libellés de flexibilité des horaires — #53', () => {
    expect(src).toContain('flexibilityLabel');
  });
  it('compétences suggérées issues de la vidéo (proposedSkills) et rechargement du profil — #54', () => {
    expect(src).toContain('proposedSkills');
    expect(src).toContain('fetchProfileFromAPI');
    expect(src).toContain('presentationVideo');
  });
  it('gestion « stale » de l’analyse de présentation (rien appliqué), dans la modale vidéo utilisée par l’éditeur — #61', () => {
    expect(videoModalSrc).toMatch(/presentation\.stale/);
    expect(src).toContain('ExperienceVideoModal');
  });
  it('modale vidéo de présentation (mode intro)', () => {
    expect(src).toContain('mode="intro"');
  });
  it('boutons annuler la dernière modification / enregistrer / annuler par section', () => {
    expect(src).toContain('undoSection(section)');
    expect(src).toContain('cancelSection(section)');
    expect(src).toContain('persistSectionRef.current(section, { keepEditing: false, silent: false })');
  });
  it('règle canContinue inchangée (vidéo + photo + disponibilités)', () => {
    expect(src).toContain('const canContinue = hasExperienceVideo && hasProfilePhoto && hasAvailabilitySet;');
  });
});
