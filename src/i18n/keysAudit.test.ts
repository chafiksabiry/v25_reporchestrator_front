/**
 * Audit des clés de traduction du parcours REP (import, éditeur, profil, onboarding, formule).
 * Échoue si un écran appelle t('clé') avec une clé absente de fr.json ou de en.json
 * (l'utilisateur verrait alors la clé brute, ex. « profileImportReview.availability.options.… »).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import fr from './locales/fr.json';
import en from './locales/en.json';

const ROOT = join(__dirname, '..');

const SCAN: string[] = [
  'components/profile',
  'components/onboarding',
  'components/dashboard/ProfileView.tsx',
  'components/dashboard/ProfileEditView.tsx',
  'components/dashboard/profile',
  'components/dashboard/pages/Profile.tsx',
];

const walk = (path: string): string[] => {
  const abs = join(ROOT, path);
  const st = statSync(abs);
  if (st.isFile()) return /\.(tsx?|jsx?)$/.test(abs) && !/\.test\./.test(abs) ? [abs] : [];
  return readdirSync(abs).flatMap((name) => walk(join(path, name)));
};

const PLURAL = ['', '_zero', '_one', '_two', '_few', '_many', '_other'];

const has = (dict: any, key: string): boolean => {
  const parts = key.split('.');
  // la clé peut contenir des espaces / points dans le dernier segment : on tente d'abord le chemin exact
  let node: any = dict;
  for (let i = 0; i < parts.length; i += 1) {
    if (node == null || typeof node !== 'object') return false;
    if (i === parts.length - 1) return PLURAL.some((suffix) => typeof node[parts[i] + suffix] === 'string');
    node = node[parts[i]];
  }
  return false;
};

interface Used {
  file: string;
  key: string;
  /** Clés complètes possibles (un fichier peut déclarer plusieurs préfixes selon le composant). */
  candidates: string[];
}

/** Préfixes déclarés dans un fichier pour ses appels `t('…')` (keyPrefix ou wrapper). */
const prefixesFor = (source: string): string[] => {
  const prefixes = new Set<string>();
  const keyPrefix = /useTranslation\(\s*['"][\w-]+['"]\s*,\s*\{\s*keyPrefix:\s*['"]([\w.]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = keyPrefix.exec(source))) prefixes.add(`${m[1]}.`);
  const wrapper = /(?:const|let)\s+t\s*=\s*\([^)]*\)\s*=>\s*\w+\(\s*`([\w.]+)\.\$\{key\}`/g;
  while ((m = wrapper.exec(source))) prefixes.add(`${m[1]}.`);
  return [...prefixes];
};

const collect = (): Used[] => {
  const used: Used[] = [];
  const files = SCAN.flatMap(walk);
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const prefixes = prefixesFor(source);
    const rel = relative(ROOT, file);
    // t('a.b') : clé relative à un préfixe déclaré (ou clé complète) ; i18nT('a.b') / i18n.t('a.b') : clés complètes
    const re = /(?<![\w.$])(t|i18nT|i18n\.t)\(\s*(['"`])([A-Za-z0-9_.-]+)\2/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(source))) {
      const [, fn, , key] = m;
      if (!key.includes('.') && fn !== 't') continue;
      if (fn === 't' && !prefixes.length && !key.includes('.')) continue;
      const candidates = fn === 't' ? [...prefixes.map((p) => `${p}${key}`), key] : [key];
      used.push({ file: rel, key, candidates });
    }
  }
  return used;
};

describe('audit des clés de traduction (parcours REP)', () => {
  const used = collect();

  it('le scan trouve bien des clés (garde-fou du test)', () => {
    expect(used.length).toBeGreaterThan(200);
  });

  it.each([
    ['fr', fr],
    ['en', en],
  ])('aucune clé utilisée n’est absente de %s.json', (_lang, dict) => {
    const missing = used
      .filter(({ candidates }) => !candidates.some((c) => has(dict, c)))
      .map(({ file, key, candidates }) => `${candidates[0]}  [${key}]  (${file})`);
    expect([...new Set(missing)].sort()).toEqual([]);
  });

  // Clés construites dynamiquement (non vues par le scan statique) : familles à vérifier explicitement.
  it.each([
    ['fr', fr],
    ['en', en],
  ])('familles de clés dynamiques présentes dans %s.json', (_lang, dict) => {
    const dynamic = ['photo', 'video', 'avail'].flatMap((k) => [
      `profileImportReview.coach_${k}_title`,
      `profileImportReview.coach_${k}_body`,
    ]);
    expect(dynamic.filter((key) => !has(dict, key))).toEqual([]);
  });
});
