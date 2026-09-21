import { localizeText, type Locale } from './i18nText';

export type TaxonomyEntity = {
  name?: string;
  name_i18n?: { en?: string; fr?: string } | null;
};

/** Sector EN→FR mirror of DB seed (for `gig.category` string labels). */
const SECTOR_I18N: Record<string, { en: string; fr: string }> = {
  'Inbound Sales': { en: 'Inbound Sales', fr: 'Vente entrante' },
  'Outbound Sales': { en: 'Outbound Sales', fr: 'Vente sortante' },
  'Customer Service': { en: 'Customer Service', fr: 'Service client' },
  'Technical Support': { en: 'Technical Support', fr: 'Support technique' },
  'Account Management': { en: 'Account Management', fr: 'Gestion de compte' },
  'Lead Generation': { en: 'Lead Generation', fr: 'Génération de leads' },
  'Market Research': { en: 'Market Research', fr: 'Études de marché' },
  'Appointment Setting': { en: 'Appointment Setting', fr: 'Prise de rendez-vous' },
  'Order Processing': { en: 'Order Processing', fr: 'Traitement des commandes' },
  'Customer Retention': { en: 'Customer Retention', fr: 'Fidélisation client' },
  'Billing Support': { en: 'Billing Support', fr: 'Support facturation' },
  'Product Support': { en: 'Product Support', fr: 'Support produit' },
  'Help Desk': { en: 'Help Desk', fr: 'Help desk' },
  'Chat Support': { en: 'Chat Support', fr: 'Support chat' },
  'Email Support': { en: 'Email Support', fr: 'Support e-mail' },
  'Social Media Support': { en: 'Social Media Support', fr: 'Support réseaux sociaux' },
  'Survey Calls': { en: 'Survey Calls', fr: 'Appels d’enquête' },
  'Welcome Calls': { en: 'Welcome Calls', fr: 'Appels de bienvenue' },
  'Follow-up Calls': { en: 'Follow-up Calls', fr: 'Appels de suivi' },
  'FOLLOW-UP CALLS': { en: 'Follow-up Calls', fr: 'Appels de suivi' },
  'Complaint Resolution': { en: 'Complaint Resolution', fr: 'Traitement des réclamations' },
  'Warranty Support': { en: 'Warranty Support', fr: 'Support garantie' },
  Collections: { en: 'Collections', fr: 'Recouvrement' },
  'Dispatch Services': { en: 'Dispatch Services', fr: 'Services de dispatch' },
  'Emergency Support': { en: 'Emergency Support', fr: 'Support d’urgence' },
  'Multilingual Support': { en: 'Multilingual Support', fr: 'Support multilingue' },
};

const toLocale = (lang: string | undefined): Locale =>
  (lang || 'en').slice(0, 2).toLowerCase() === 'fr' ? 'fr' : 'en';

/**
 * Resolve display language for taxonomy from the gig's skills.languages,
 * falling back to the UI language.
 */
export function gigTaxonomyLocale(gig: any, uiLang?: string): Locale {
  const entries = gig?.skills?.languages;
  if (Array.isArray(entries)) {
    for (const entry of entries) {
      const raw =
        entry?.iso639_1 ||
        entry?.language?.iso639_1 ||
        entry?.language?.code ||
        entry?.language?.name ||
        entry?.name ||
        '';
      const c = String(raw).toLowerCase();
      if (!c) continue;
      if (c === 'fr' || c.startsWith('fr') || c.includes('french') || c.includes('français')) {
        return 'fr';
      }
      if (c === 'en' || c.startsWith('en') || c.includes('english')) {
        return 'en';
      }
    }
  }
  return toLocale(uiLang);
}

/** Localized label for an Industry / Activity / Sector document. */
export function localizeTaxonomyEntity(entity: TaxonomyEntity | null | undefined, lang: string): string {
  if (!entity) return '';
  const fromI18n = localizeText(entity.name_i18n, lang);
  if (fromI18n) return fromI18n;
  return String(entity.name || '').trim();
}

/** Localized label for a plain category/sector string (gig.category). */
export function localizeTaxonomyName(raw: string | undefined | null, lang: string): string {
  const name = String(raw || '').trim();
  if (!name) return '';
  const mapped = SECTOR_I18N[name];
  if (mapped) return localizeText(mapped, lang) || name;
  return name;
}
