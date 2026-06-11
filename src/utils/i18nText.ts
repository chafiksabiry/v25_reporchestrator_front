// Helpers for bilingual ({ en, fr }) free-text profile fields extracted from a
// CV. The backend returns free text as { en, fr }; we store both a plain
// "active language" value (for backward compat / matching) and an _i18n mirror.
// At display time we localize against the current UI language, gracefully
// falling back to legacy plain-string data.

export type Locale = 'en' | 'fr';

export type BilingualText = string | { en?: string; fr?: string } | null | undefined;
export type BilingualList =
  | string[]
  | { en?: string[]; fr?: string[] }
  | null
  | undefined;

const toCode = (lang: string | undefined): Locale =>
  (lang || 'en').slice(0, 2).toLowerCase() === 'fr' ? 'fr' : 'en';

/** Pick the right string from a bilingual value, with legacy + fallback support. */
export function localizeText(value: BilingualText, lang: string): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  const code = toCode(lang);
  return value[code] || value.en || value.fr || '';
}

/** Pick the right string[] from a bilingual list value, with fallbacks. */
export function localizeList(value: BilingualList, lang: string): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string');
  const code = toCode(lang);
  const picked = value[code] || value.en || value.fr || [];
  return Array.isArray(picked) ? picked.filter((v) => typeof v === 'string') : [];
}

/**
 * Normalize an AI-extracted free-text field that may come back as { en, fr }
 * (new bilingual prompt) or as a plain string (legacy). Returns both the active
 * string and the { en, fr } mirror.
 */
export function normalizeBilingualText(
  raw: BilingualText,
  activeLang: string
): { active: string; i18n: { en: string; fr: string } } {
  const code = toCode(activeLang);
  if (raw == null) return { active: '', i18n: { en: '', fr: '' } };
  if (typeof raw === 'string') {
    // Legacy single-language string: mirror it to both locales.
    return { active: raw, i18n: { en: raw, fr: raw } };
  }
  const en = raw.en || raw.fr || '';
  const fr = raw.fr || raw.en || '';
  const active = code === 'fr' ? fr : en;
  return { active, i18n: { en, fr } };
}

/**
 * Normalize an AI-extracted list that may come back as [{ en, fr }] (new),
 * { en: [], fr: [] }, or [string] (legacy). Returns the active string[] and
 * the { en: [], fr: [] } mirror.
 */
export function normalizeBilingualList(
  raw: unknown,
  activeLang: string
): { active: string[]; i18n: { en: string[]; fr: string[] } } {
  const code = toCode(activeLang);
  if (raw == null) return { active: [], i18n: { en: [], fr: [] } };

  // Already split as { en: [], fr: [] }
  if (!Array.isArray(raw) && typeof raw === 'object') {
    const obj = raw as { en?: string[]; fr?: string[] };
    const en = (obj.en || obj.fr || []).filter((v) => typeof v === 'string');
    const fr = (obj.fr || obj.en || []).filter((v) => typeof v === 'string');
    return { active: code === 'fr' ? fr : en, i18n: { en, fr } };
  }

  if (Array.isArray(raw)) {
    // Array of plain strings (legacy)
    if (raw.every((v) => typeof v === 'string')) {
      const list = raw as string[];
      return { active: list, i18n: { en: list, fr: list } };
    }
    // Array of { en, fr } objects (new bilingual prompt)
    const en = raw.map((v: any) => (typeof v === 'string' ? v : v?.en || v?.fr || ''));
    const fr = raw.map((v: any) => (typeof v === 'string' ? v : v?.fr || v?.en || ''));
    return { active: code === 'fr' ? fr : en, i18n: { en, fr } };
  }

  return { active: [], i18n: { en: [], fr: [] } };
}
