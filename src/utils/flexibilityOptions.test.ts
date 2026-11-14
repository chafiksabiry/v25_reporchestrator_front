import { describe, expect, it } from 'vitest';
import {
  FLEXIBILITY_OPTIONS,
  canonicalFlexibility,
  flexibilityLabel,
  hasFlexibility,
  humanizeFlexibility,
  toggleFlexibility,
} from './flexibilityOptions';
import fr from '../i18n/locales/fr.json';
import en from '../i18n/locales/en.json';

const tr = (dict: any) => (key: string) => {
  const found = key.split('.').reduce((o: any, k) => (o ? o[k] : undefined), dict.profileImportReview);
  return typeof found === 'string' ? found : `profileImportReview.${key}`; // comme i18next : clé brute si absente
};

describe('flexibilité des horaires', () => {
  it('valeurs de l’IA d’import → option canonique', () => {
    expect(canonicalFlexibility('remote work')).toBe('Remote Work Available');
    expect(canonicalFlexibility('flexible hours')).toBe('Flexible Hours');
    expect(canonicalFlexibility('Part-Time')).toBe('Part-Time Options');
    expect(canonicalFlexibility('weekends')).toBe('Weekend Rotation');
    expect(canonicalFlexibility('Soirée')).toBe('Night Shift Available');
    expect(canonicalFlexibility('Télétravail')).toBe('Remote Work Available');
    expect(canonicalFlexibility('Remote Work Available')).toBe('Remote Work Available');
  });

  it('libellés FR/EN pour « remote work » et « flexible hours » (jamais la clé brute)', () => {
    expect(flexibilityLabel('remote work', tr(fr))).toBe('Télétravail possible');
    expect(flexibilityLabel('flexible hours', tr(fr))).toBe('Horaires flexibles');
    expect(flexibilityLabel('remote work', tr(en))).toBe('Remote work available');
    expect(flexibilityLabel('flexible hours', tr(en))).toBe('Flexible hours');
  });

  it('toutes les options canoniques ont une traduction FR et EN', () => {
    for (const option of FLEXIBILITY_OPTIONS) {
      expect(flexibilityLabel(option, tr(fr))).not.toContain('profileImportReview.');
      expect(tr(fr)(`availability.options.${option}`)).not.toContain('profileImportReview.');
      expect(tr(en)(`availability.options.${option}`)).not.toContain('profileImportReview.');
    }
  });

  it('valeur inconnue : humanisée, jamais une clé brute', () => {
    expect(flexibilityLabel('four day week', tr(fr))).toBe('Four day week');
    expect(flexibilityLabel('SPLIT_SHIFT_PLUS', tr(fr))).toBe('Split shift plus');
    expect(humanizeFlexibility('  remote_work ')).toBe('Remote work');
    expect(flexibilityLabel('', tr(fr))).toBe('');
    expect(flexibilityLabel(undefined, tr(fr))).toBe('');
  });

  it('sélection : « remote work » compte comme sélectionné ; bascule sans doublon', () => {
    expect(hasFlexibility(['remote work'], 'Remote Work Available')).toBe(true);
    expect(toggleFlexibility(['remote work'], 'Remote Work Available')).toEqual([]);
    expect(toggleFlexibility(['flexible hours'], 'Remote Work Available')).toEqual([
      'Flexible Hours',
      'Remote Work Available',
    ]);
  });
});
