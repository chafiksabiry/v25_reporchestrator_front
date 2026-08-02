export type LanguageVideoSource = 'experience' | 'language' | 'video';

export interface LanguageMediaContext {
  videoUrl: string;
  source: LanguageVideoSource;
  experienceTitle?: string;
  experienceCompany?: string;
  transcription?: string;
  assessmentResults: Record<string, unknown>;
  languageAssessmentEntry?: Record<string, unknown> | null;
  analyzedAt?: string;
}

const getLangId = (lang: any): string => {
  if (typeof lang?.language === 'object' && lang.language?._id) return String(lang.language._id);
  if (typeof lang?.language === 'string' && /^[a-f0-9]{24}$/i.test(lang.language)) return lang.language;
  return '';
};

const getLangName = (lang: any): string => {
  if (typeof lang?.language === 'object' && lang.language?.name) return String(lang.language.name);
  if (typeof lang?.language === 'string' && !/^[a-f0-9]{24}$/i.test(lang.language)) return lang.language;
  return '';
};

const refMatchesLanguage = (ref: unknown, langId: string, langName: string): boolean => {
  if (!ref) return false;
  if (typeof ref === 'object' && ref !== null) {
    const obj = ref as { _id?: string; name?: string };
    if (langId && obj._id && String(obj._id) === langId) return true;
    if (langName && obj.name && String(obj.name).toLowerCase() === langName.toLowerCase()) return true;
    return false;
  }
  const str = String(ref);
  if (langId && str === langId) return true;
  if (langName && !/^[a-f0-9]{24}$/i.test(str) && str.toLowerCase() === langName.toLowerCase()) return true;
  return false;
};

const findLanguageAssessmentInExperience = (exp: any, langId: string, langName: string) => {
  const entries = exp?.videoLanguageAssessment?.languages;
  if (!Array.isArray(entries)) return null;
  return (
    entries.find((entry: any) => {
      const ref = entry?.language || entry?.languageName;
      if (typeof ref === 'string' && langName && ref.toLowerCase() === langName.toLowerCase()) return true;
      return refMatchesLanguage(ref, langId, langName);
    }) || null
  );
};

const experienceMatchesLanguage = (exp: any, langId: string, langName: string): boolean => {
  if (!exp?.videoUrl) return false;
  const spoken = exp?.videoAnalysis?.spokenLanguages;
  if (Array.isArray(spoken)) {
    if (spoken.some((s: any) => refMatchesLanguage(s?.language, langId, langName))) return true;
  }
  if (findLanguageAssessmentInExperience(exp, langId, langName)) return true;
  return false;
};

/** Resolve playable video + analysis payload for a profile language entry. */
export const resolveLanguageMedia = (lang: any, profile: any): LanguageMediaContext | null => {
  const ar = lang?.assessmentResults;
  if (!ar || ar.source === 'cv') return null;

  const langId = getLangId(lang);
  const langName = getLangName(lang);
  const experiences = Array.isArray(profile?.experience) ? profile.experience : [];

  const buildFromExperience = (exp: any, source: LanguageVideoSource = 'experience'): LanguageMediaContext | null => {
    if (!exp?.videoUrl) return null;
    return {
      videoUrl: exp.videoUrl,
      source,
      experienceTitle: exp.title || exp.role,
      experienceCompany: exp.company,
      transcription: exp.videoTranscription || '',
      assessmentResults: ar,
      languageAssessmentEntry: findLanguageAssessmentInExperience(exp, langId, langName),
      analyzedAt: exp.videoAnalyzedAt,
    };
  };

  if (ar.videoUrl && (ar.source === 'language' || ar.source === 'video')) {
    return {
      videoUrl: ar.videoUrl,
      source: ar.source === 'language' ? 'language' : 'video',
      transcription: typeof ar.transcription === 'string' ? ar.transcription : '',
      assessmentResults: ar,
      analyzedAt: ar.verifiedAt || ar.completedAt,
    };
  }

  if (ar.experienceVideoUrl) {
    const idx = typeof ar.experienceIndex === 'number' ? ar.experienceIndex : -1;
    const linkedExp = idx >= 0 ? experiences[idx] : null;
    return {
      videoUrl: ar.experienceVideoUrl,
      source: 'experience',
      experienceTitle: linkedExp?.title || linkedExp?.role,
      experienceCompany: linkedExp?.company,
      transcription: linkedExp?.videoTranscription || '',
      assessmentResults: ar,
      languageAssessmentEntry: linkedExp
        ? findLanguageAssessmentInExperience(linkedExp, langId, langName)
        : null,
      analyzedAt: linkedExp?.videoAnalyzedAt,
    };
  }

  if (typeof ar.experienceIndex === 'number' && experiences[ar.experienceIndex]) {
    const ctx = buildFromExperience(experiences[ar.experienceIndex]);
    if (ctx) return ctx;
  }

  for (const exp of experiences) {
    if (experienceMatchesLanguage(exp, langId, langName)) {
      const ctx = buildFromExperience(exp);
      if (ctx) return ctx;
    }
  }

  return null;
};

export const getLanguageVideoUrl = (lang: any, profile?: any): string | null => {
  if (profile) {
    const media = resolveLanguageMedia(lang, profile);
    if (media?.videoUrl) return media.videoUrl;
  }
  const ar = lang?.assessmentResults;
  if (!ar) return null;
  return ar.videoUrl || ar.experienceVideoUrl || null;
};
