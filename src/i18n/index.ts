import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslation from './locales/en.json';
import frTranslation from './locales/fr.json';

/** Shared with registration / company MFs — keep language across microfrontends. */
export const HARX_LANG_KEY = 'i18nextLng';
/** Set when the user picks a language in the switcher (vs accidental EN default). */
export const HARX_LANG_EXPLICIT_KEY = 'harxLangExplicit';

export function readHarxLanguage(): 'fr' | 'en' {
  try {
    const raw = (localStorage.getItem(HARX_LANG_KEY) || '').toLowerCase();
    const explicit = localStorage.getItem(HARX_LANG_EXPLICIT_KEY) === '1';
    if (raw.startsWith('fr')) return 'fr';
    // Keep English only if the user explicitly chose it in the language switcher.
    if (raw.startsWith('en') && explicit) return 'en';
  } catch {
    /* ignore */
  }
  return 'fr';
}

export function persistHarxLanguage(lang: string, opts?: { explicit?: boolean }): void {
  const normalized = lang.toLowerCase().startsWith('en') ? 'en' : 'fr';
  try {
    localStorage.setItem(HARX_LANG_KEY, normalized);
    if (opts?.explicit) {
      localStorage.setItem(HARX_LANG_EXPLICIT_KEY, '1');
    }
  } catch {
    /* ignore */
  }
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: enTranslation },
    fr: { translation: frTranslation },
  },
  lng: readHarxLanguage(),
  fallbackLng: 'fr',
  supportedLngs: ['en', 'fr'],
  load: 'languageOnly',
  nonExplicitSupportedLngs: true,
  interpolation: {
    escapeValue: false,
  },
});

// Ensure storage matches the active language (migrates old accidental "en" → "fr").
persistHarxLanguage(i18n.language || 'fr');

i18n.on('languageChanged', (lng) => {
  persistHarxLanguage(lng);
});

export default i18n;
