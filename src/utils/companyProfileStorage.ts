export const COMPANY_PROFILE_STORAGE_PREFIX = 'harx_company_profile_';
const COMPANY_RETURN_GIG_PREFIX = 'harx_company_return_gig_';

export type CompanyProfileData = {
  _id: string;
  name: string;
  logo?: string;
  industry?: string;
  founded?: string;
  headquarters?: string;
  overview?: string;
  companyIntro?: string;
  mission?: string;
  culture?: {
    values?: string[];
    benefits?: string[];
    workEnvironment?: string;
  };
  opportunities?: {
    roles?: string[];
    growthPotential?: string;
    training?: string;
  };
  technology?: {
    stack?: string[];
    innovation?: string;
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
