/**
 * Audit des clés de traduction du parcours REP (import, éditeur, profil, onboarding, formule).
 * Échoue si un écran appelle t('clé') avec une clé absente du dictionnaire de son espace de noms
 * (fr/en pour « translation », repsx.fr/repsx.en pour « repsx », editorUx.ts pour « editorUx ») : l'utilisateur verrait alors la
 * clé brute à l'écran.
 *
 * Espaces de noms reconnus : useTranslation('repsx'), useTranslation('translation', { keyPrefix }),
 * t('clé', { ns: 'repsx' }), t('repsx:clé'), et le wrapper de SummaryEditorV2
 * (const t = (key) => i18nT(`profileImportReview.${key}`)).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import fr from './locales/fr.json';
import en from './locales/en.json';
import repsxFr from './locales/repsx.fr.json';
import repsxEn from './locales/repsx.en.json';
import { editorUxBundles } from './editorUx';

const ROOT = join(__dirname, '..');

const SCAN: string[] = [
  'components/profile',
  'components/onboarding',
  'components/dashboard/ProfileView.tsx',
  'components/dashboard/ProfileEditView.tsx',
  'components/dashboard/EmbeddedRepSubscriptionFlow.tsx',
  'components/dashboard/profile',
  'components/dashboard/pages/Profile.tsx',
];

type Ns = 'translation' | 'repsx' | 'editorUx';
const DICTS: Record<'fr' | 'en', Record<Ns, any>> = {
  fr: { translation: fr, repsx: repsxFr, editorUx: editorUxBundles.fr },
  en: { translation: en, repsx: repsxEn, editorUx: editorUxBundles.en },
};

const walk = (path: string): string[] => {
  const abs = join(ROOT, path);
  const st = statSync(abs);
  if (st.isFile()) return /\.(tsx?|jsx?)$/.test(abs) && !/\.test\./.test(abs) ? [abs] : [];
  return readdirSync(abs).flatMap((name) => walk(join(path, name)));
};

const PLURAL = ['', '_zero', '_one', '_two', '_few', '_many', '_other'];

const has = (dict: any, key: string): boolean => {
  const parts = key.split('.');
  let node: any = dict;
  for (let i = 0; i < parts.length; i += 1) {
    if (node == null || typeof node !== 'object') return false;
    if (i === parts.length - 1) return PLURAL.some((suffix) => typeof node[parts[i] + suffix] === 'string');
    node = node[parts[i]];
  }
  return false;
};

interface Binding {
  ns: Ns;
  prefix: string;
}
interface Used {
  file: string;
  key: string;
  /** Clés candidates par espace de noms (un fichier peut lier le même alias à plusieurs composants). */
  candidates: Array<{ ns: Ns; key: string }>;
}

/** Liaisons de fonctions de traduction d'un fichier : alias → [{ ns, prefix }]. */
const bindingsFor = (source: string): Record<string, Binding[]> => {
  const out: Record<string, Binding[]> = {};
  const add = (alias: string, b: Binding) => {
    (out[alias] ||= []).push(b);
  };
  // const { t, i18n } = useTranslation(...)  /  const { t: tx } = useTranslation('repsx')
  const hook = /\{([^{}]*)\}\s*=\s*useTranslation\(([^)]*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = hook.exec(source))) {
    const destructured = m[1];
    const args = m[2];
    const alias = destructured.match(/(?:^|,)\s*t(?:\s*:\s*(\w+))?\s*(?:,|$)/);
    if (!alias) continue;
    const name = alias[1] || 't';
    const nsMatch = args.match(/^\s*['"](\w+)['"]/);
    const ns: Ns =
      /^\s*EDITOR_UX_NS\b/.test(args) || nsMatch?.[1] === 'editorUx'
        ? 'editorUx'
        : nsMatch?.[1] === 'repsx'
          ? 'repsx'
          : 'translation';
    const kp = args.match(/keyPrefix:\s*['"]([\w.]+)['"]/);
    add(name, { ns, prefix: kp ? `${kp[1]}.` : '' });
  }
  // const t = (key, options) => i18nT(`profileImportReview.${key}`, options)
  const wrapper = /(?:const|let)\s+(\w+)\s*=\s*\([^)]*\)\s*=>\s*\w+\(\s*`([\w.]+)\.\$\{key\}`/g;
  while ((m = wrapper.exec(source))) add(m[1], { ns: 'translation', prefix: `${m[2]}.` });
  // appels directs i18nT / i18n.t : clés complètes dans « translation »
  add('i18nT', { ns: 'translation', prefix: '' });
  add('i18n.t', { ns: 'translation', prefix: '' });
  return out;
};

const collect = (): Used[] => {
  const used: Used[] = [];
  for (const file of SCAN.flatMap(walk)) {
    const source = readFileSync(file, 'utf8');
    const bindings = bindingsFor(source);
    const names = Object.keys(bindings).map((n) => n.replace('.', '\\.'));
    if (!names.length) continue;
    const re = new RegExp(`(?<![\\w.$])(${names.join('|')})\\(\\s*(['"\`])([A-Za-z0-9_.:-]+)\\2([^)]{0,160})`, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(source))) {
      const [, fn, , rawKey, rest] = m;
      let key = rawKey;
      let explicitNs: Ns | null = null;
      for (const known of ['repsx', 'editorUx'] as const) {
        if (key.startsWith(`${known}:`)) {
          explicitNs = known;
          key = key.slice(known.length + 1);
        }
        if (new RegExp(`\\bns:\\s*['"]${known}['"]`).test(rest)) explicitNs = known;
      }
      const isWrapperLike = bindings[fn.replace('\\', '')]?.some((b) => b.prefix);
      // sans préfixe déclaré, on ne juge que les clés pointées complètes
      if (!key.includes('.') && !isWrapperLike && fn !== 't' && !(bindings[fn] || []).some((b) => b.ns !== 'translation')) continue;
      const candidates: Used['candidates'] = [];
      for (const b of bindings[fn] || []) {
        const ns = explicitNs ?? b.ns;
        candidates.push({ ns, key: `${b.prefix}${key}` });
        if (b.prefix) candidates.push({ ns, key });
      }
      if (!candidates.length) continue;
      used.push({ file: relative(ROOT, file), key: rawKey, candidates });
    }
  }
  return used;
};

describe('audit des clés de traduction (parcours REP)', () => {
  const used = collect();

  it('le scan trouve bien des clés, y compris dans les espaces de noms repsx et editorUx (garde-fou du test)', () => {
    expect(used.length).toBeGreaterThan(200);
    expect(used.some((u) => u.candidates.some((c) => c.ns === 'repsx'))).toBe(true);
    expect(used.some((u) => u.candidates.some((c) => c.ns === 'editorUx'))).toBe(true);
  });

  it.each(['fr', 'en'] as const)('aucune clé utilisée n’est absente de %s (translation, repsx, editorUx)', (lang) => {
    const dicts = DICTS[lang];
    const missing = used
      .filter(({ candidates }) => !candidates.some((c) => has(dicts[c.ns], c.key)))
      .map(({ file, key, candidates }) => `${candidates[0].ns}:${candidates[0].key}  [${key}]  (${file})`);
    expect([...new Set(missing)].sort()).toEqual([]);
  });

  // Clés construites dynamiquement (non vues par le scan statique) : familles à vérifier explicitement.
  it.each(['fr', 'en'] as const)('familles de clés dynamiques présentes dans %s', (lang) => {
    const dict = DICTS[lang].translation;
    const dynamic = ['photo', 'video', 'avail'].flatMap((k) => [
      `profileImportReview.coach_${k}_title`,
      `profileImportReview.coach_${k}_body`,
    ]);
    expect(dynamic.filter((key) => !has(dict, key))).toEqual([]);
  });
});
