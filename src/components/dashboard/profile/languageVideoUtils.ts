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

const normalizeLabel = (value: string): string =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');

const LANGUAGE_ALIASES: Record<string, string> = {
  anglais: 'english',
  english: 'english',
  francais: 'french',
  french: 'french',
  espanol: 'spanish',
  spanish: 'spanish',
  arabe: 'arabic',
  arabic: 'arabic',
  allemand: 'german',
  german: 'german',
  portugais: 'portuguese',
  portuguese: 'portuguese',
  italien: 'italian',
  italian: 'italian',
};

const labelsMatch = (a: string, b: string): boolean => {
  if (!a || !b) return false;
  const na = normalizeLabel(a);
  const nb = normalizeLabel(b);
  if (na === nb) return true;
  return (LANGUAGE_ALIASES[na] || na) === (LANGUAGE_ALIASES[nb] || nb);
};

const refMatchesLanguage = (ref: unknown, langId: string, langName: string): boolean => {
  if (!ref) return false;
  if (typeof ref === 'object' && ref !== null) {
    const obj = ref as { _id?: string; name?: string };
    if (langId && obj._id && String(obj._id) === langId) return true;
    if (langName && obj.name && labelsMatch(String(obj.name), langName)) return true;
    return false;
  }
  const str = String(ref);
  if (langId && str === langId) return true;
  if (langName && !/^[a-f0-9]{24}$/i.test(str) && labelsMatch(str, langName)) return true;
  return false;
};

const findLanguageAssessmentInExperience = (exp: any, langId: string, langName: string) => {
  const entries = exp?.videoLanguageAssessment?.languages;
  if (!Array.isArray(entries)) return null;
  return (
    entries.find((entry: any) => {
      const ref = entry?.language || entry?.languageName;
      if (typeof ref === 'string' && langName && labelsMatch(ref, langName)) return true;
      return refMatchesLanguage(ref, langId, langName);
    }) || null
  );
};

const findSpokenInExperience = (exp: any, langId: string, langName: string) => {
  const spoken = exp?.videoAnalysis?.spokenLanguages;
  if (!Array.isArray(spoken)) return null;
  return spoken.find((s: any) => refMatchesLanguage(s?.language, langId, langName)) || null;
};

const experienceMatchesLanguage = (exp: any, langId: string, langName: string): boolean => {
  if (!exp?.videoUrl) return false;
  if (findSpokenInExperience(exp, langId, langName)) return true;
  if (findLanguageAssessmentInExperience(exp, langId, langName)) return true;
  return false;
};

const buildAssessmentFromExperience = (
  exp: any,
  expIndex: number,
  assessed: any | null,
  spoken: any | null
) => {
  const score =
    typeof assessed?.overallScore === 'number'
      ? assessed.overallScore
      : typeof spoken?.score === 'number'
        ? spoken.score
        : 70;
  const cefr = String(assessed?.cefr || spoken?.level || 'B2').toUpperCase();
  const feedback =
    (typeof assessed?.strengths === 'string' && assessed.strengths) ||
    (typeof assessed?.strengths?.en === 'string' && assessed.strengths.en) ||
    (typeof spoken?.evidence === 'string' && spoken.evidence) ||
    'Detected from experience video analysis';

  return {
    completeness: { score, feedback },
    fluency: {
      score: typeof assessed?.fluency?.score === 'number' ? assessed.fluency.score : score,
      feedback,
    },
    proficiency: {
      score: typeof assessed?.vocabulary?.score === 'number' ? assessed.vocabulary.score : score,
      feedback,
    },
    overall: {
      score,
      strengths: feedback,
      areasForImprovement: '',
    },
    verifiedProficiency: cefr,
    source: 'experience' as const,
    experienceVideoUrl: exp.videoUrl,
    experienceIndex: expIndex,
    completedAt: exp.videoAnalyzedAt || new Date().toISOString(),
  };
};

/**
 * If a language is still CV-estimated but an experience video already assessed it,
 * attach experience verification so the Languages tab can show it as verified.
 */
export const enrichLanguageFromExperience = (lang: any, profile: any): any => {
  if (!lang) return lang;
  const ar = lang.assessmentResults;
  if (ar?.source === 'language') return lang;
  if (ar && ar.source !== 'cv' && (ar.verifiedProficiency || ar.experienceVideoUrl || ar.videoUrl)) {
    return lang;
  }

  const langId = getLangId(lang);
  const langName = getLangName(lang);
  const experiences = Array.isArray(profile?.experience) ? profile.experience : [];

  for (let i = 0; i < experiences.length; i += 1) {
    const exp = experiences[i];
    if (!exp?.videoUrl) continue;
    const assessed = findLanguageAssessmentInExperience(exp, langId, langName);
    const spoken = findSpokenInExperience(exp, langId, langName);
    if (!assessed && !spoken) continue;

    const assessmentResults = buildAssessmentFromExperience(exp, i, assessed, spoken);
    return {
      ...lang,
      proficiency: assessmentResults.verifiedProficiency || lang.proficiency,
      assessmentResults,
    };
  }

  return lang;
};

/** Returns a new languages array if any CV entries can be upgraded from experience videos. */
export const buildSyncedLanguagesFromExperience = (profile: any): any[] | null => {
  const languages = profile?.personalInfo?.languages;
  if (!Array.isArray(languages) || languages.length === 0) return null;

  let changed = false;
  const next = languages.map((lang: any) => {
    const enriched = enrichLanguageFromExperience(lang, profile);
    if (enriched !== lang && enriched?.assessmentResults?.source === 'experience') {
      const wasCv = !lang?.assessmentResults || lang.assessmentResults.source === 'cv';
      if (wasCv) changed = true;
    }
    return enriched;
  });

  return changed ? next : null;
};

/** Resolve playable video + analysis payload for a profile language entry. */
export const resolveLanguageMedia = (lang: any, profile: any): LanguageMediaContext | null => {
  const enriched = enrichLanguageFromExperience(lang, profile);
  const ar = enriched?.assessmentResults;
  if (!ar || ar.source === 'cv') return null;

  const langId = getLangId(enriched);
  const langName = getLangName(enriched);
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
      videoUrl: ar.videoUrl as string,
      source: ar.source === 'language' ? 'language' : 'video',
      transcription: typeof ar.transcription === 'string' ? ar.transcription : '',
      assessmentResults: ar,
      analyzedAt: (ar.verifiedAt || ar.completedAt) as string | undefined,
    };
  }

  if (ar.experienceVideoUrl) {
    const idx = typeof ar.experienceIndex === 'number' ? ar.experienceIndex : -1;
    const linkedExp = idx >= 0 ? experiences[idx] : null;
    return {
      videoUrl: ar.experienceVideoUrl as string,
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
  return (ar.videoUrl || ar.experienceVideoUrl || null) as string | null;
};
