import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './locales/en.json';
import frTranslation from './locales/fr.json';

/** Shared with registration / company MFs — keep language across microfrontends. */
export const HARX_LANG_KEY = 'i18nextLng';

export function readHarxLanguage(): 'fr' | 'en' {
  try {
    const raw = localStorage.getItem(HARX_LANG_KEY) || '';
    if (raw.toLowerCase().startsWith('en')) return 'en';
    if (raw.toLowerCase().startsWith('fr')) return 'fr';
  } catch {
    /* ignore */
  }
  return 'fr';
}

export function persistHarxLanguage(lang: string): void {
  const normalized = lang.toLowerCase().startsWith('en') ? 'en' : 'fr';
  try {
    localStorage.setItem(HARX_LANG_KEY, normalized);
  } catch {
    /* ignore */
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslation,
      },
      fr: {
        translation: frTranslation,
      },
    },
    lng: readHarxLanguage(),
    fallbackLng: 'fr',
    supportedLngs: ['en', 'fr'],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    detection: {
      order: ['localStorage'],
      lookupLocalStorage: HARX_LANG_KEY,
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false, // React already safe from XSS
    },
  });

i18n.on('languageChanged', (lng) => {
  persistHarxLanguage(lng);
});

export default i18n;
