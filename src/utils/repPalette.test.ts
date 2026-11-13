import { describe, expect, it } from 'vitest';
import { contrastRatio, hexToRgb, meetsAA } from './colorContrast';
import { REP_CONTRAST_PAIRS, REP_PALETTE, REP_STEP_ACCENT } from './repPalette';

describe('contraste WCAG', () => {
  it('valeurs de référence', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 1);
  });
  it('accepte #abc et refuse une couleur invalide', () => {
    expect(hexToRgb('#fff')).toEqual([255, 255, 255]);
    expect(() => hexToRgb('rouge')).toThrow();
  });
  it('seuils AA : 4,5 texte, 3 grand texte', () => {
    expect(meetsAA('#777777', '#FFFFFF')).toBe(false);
    expect(meetsAA('#777777', '#FFFFFF', true)).toBe(true);
  });
});

describe('palette du parcours REP : AA respecté', () => {
  it.each(REP_CONTRAST_PAIRS)('$label', ({ fg, bg, large }) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(large ? 3 : 4.5);
  });
  it('chaque étape a un accent lisible sur le bleu nuit', () => {
    for (const color of Object.values(REP_STEP_ACCENT)) {
      expect(meetsAA(color, REP_PALETTE.night, true)).toBe(true);
    }
  });
  it('la charte HARX est conservée', () => {
    expect(REP_PALETTE.night).toBe('#0C1C2E');
    expect(REP_PALETTE.magenta).toBe('#F90080');
  });
});
