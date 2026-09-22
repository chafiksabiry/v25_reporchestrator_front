export const COMPANY_PROFILE_STORAGE_PREFIX = 'harx_company_profile_';
const COMPANY_RETURN_GIG_PREFIX = 'harx_company_return_gig_';

export type LocalizedString = { en?: string; fr?: string };
export type LocalizedStringList = { en?: string[]; fr?: string[] };

export type CompanyProfileData = {
  _id: string;
  name: string;
  logo?: string;
  industry?: string;
  industry_i18n?: LocalizedString;
  founded?: string;
  headquarters?: string;
  overview?: string;
  overview_i18n?: LocalizedString;
  companyIntro?: string;
  companyIntro_i18n?: LocalizedString;
  mission?: string;
  mission_i18n?: LocalizedString;
  culture?: {
    values?: string[];
    values_i18n?: LocalizedStringList;
    benefits?: string[];
    benefits_i18n?: LocalizedStringList;
    workEnvironment?: string;
    workEnvironment_i18n?: LocalizedString;
  };
  opportunities?: {
    roles?: string[];
    roles_i18n?: LocalizedStringList;
    growthPotential?: string;
    growthPotential_i18n?: LocalizedString;
    training?: string;
    training_i18n?: LocalizedString;
  };
  technology?: {
    stack?: string[];
    innovation?: string;
    innovation_i18n?: LocalizedString;
  };
  contact?: {
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
    coordinates?: { lat: number; lng: number };
  };
  socialMedia?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
};

export function loadCompanyProfileFromStorage(companyId: string): CompanyProfileData | null {
  try {
    const raw = sessionStorage.getItem(`${COMPANY_PROFILE_STORAGE_PREFIX}${companyId}`);
    if (!raw) return null;
    return JSON.parse(raw) as CompanyProfileData;
  } catch {
    return null;
  }
}

export function persistCompanyProfile(companyId: string, company: CompanyProfileData) {
  try {
    sessionStorage.setItem(`${COMPANY_PROFILE_STORAGE_PREFIX}${companyId}`, JSON.stringify(company));
  } catch {
    /* ignore */
  }
}

/** Remember which gig the user opened this company profile from (reliable “back” without history). */
export function persistCompanyReturnGig(companyId: string, gigId: string) {
  try {
    sessionStorage.setItem(`${COMPANY_RETURN_GIG_PREFIX}${companyId}`, gigId);
  } catch {
    /* ignore */
  }
}

export function getCompanyReturnGig(companyId: string): string | null {
  try {
    return sessionStorage.getItem(`${COMPANY_RETURN_GIG_PREFIX}${companyId}`);
  } catch {
    return null;
  }
}
