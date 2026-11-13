import { describe, expect, it } from 'vitest';
import { editorUxBundles } from './editorUx';

const keys = (o: any, p = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' && v ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
const placeholders = (s: string) => (s.match(/{{\w+}}/g) || []).sort().join(',');
const get = (o: any, path: string) => path.split('.').reduce((a, k) => a[k], o);

describe('editorUx FR/EN', () => {
  it('mêmes clés et mêmes variables d’interpolation dans les deux langues', () => {
    expect(keys(editorUxBundles.en).sort()).toEqual(keys(editorUxBundles.fr).sort());
    for (const k of keys(editorUxBundles.fr)) {
      expect(placeholders(get(editorUxBundles.en, k)), k).toBe(placeholders(get(editorUxBundles.fr, k)));
    }
  });
  it('aucune valeur vide', () => {
    for (const lang of ['fr', 'en'] as const) {
      for (const k of keys(editorUxBundles[lang])) expect(get(editorUxBundles[lang], k).trim().length, `${lang}.${k}`).toBeGreaterThan(0);
    }
  });
});
