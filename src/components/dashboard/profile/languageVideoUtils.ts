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
    completeness: {
      score: typeof assessed?.coherence?.score === 'number'
        ? assessed.coherence.score
        : typeof assessed?.vocabulary?.score === 'number'
          ? assessed.vocabulary.score
          : score,
      feedback,
    },
    fluency: {
      score: typeof assessed?.fluency?.score === 'number' ? assessed.fluency.score : score,
      feedback,
    },
    proficiency: {
      score: typeof assessed?.grammar?.score === 'number'
        ? assessed.grammar.score
        : typeof assessed?.vocabulary?.score === 'number'
          ? assessed.vocabulary.score
          : score,
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
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const asText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const localized = value as { en?: string; fr?: string };
    return localized.fr || localized.en || '';
  }
  return '';
};

const asScore = (value: unknown): number => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
};

/** Shape accepted by the agent language schema. `experience` is stored as `video`. */
export const toPersistedProfileLanguage = (lang: any) => {
  const rawLevel = String(lang?.proficiency || lang?.assessmentResults?.verifiedProficiency || 'B1').toUpperCase();
  const proficiency = CEFR_LEVELS.includes(rawLevel) ? rawLevel : 'B1';
  const ar = lang?.assessmentResults || {};
  const rawSource = String(ar.source || '');
  const source = rawSource === 'cv' || rawSource === 'assessment' ? rawSource : 'video';
  const language =
    typeof lang?.language === 'object' && lang.language?._id ? lang.language._id : lang?.language;

  return {
    language,
    proficiency,
    assessmentResults: {
      completeness: { score: asScore(ar.completeness?.score), feedback: asText(ar.completeness?.feedback) },
      fluency: { score: asScore(ar.fluency?.score), feedback: asText(ar.fluency?.feedback) },
      proficiency: { score: asScore(ar.proficiency?.score), feedback: asText(ar.proficiency?.feedback) },
      overall: {
        score: asScore(ar.overall?.score),
        strengths: asText(ar.overall?.strengths),
        areasForImprovement: asText(ar.overall?.areasForImprovement),
      },
      source,
      completedAt: ar.completedAt || new Date().toISOString(),
    },
  };
};

export const enrichLanguageFromExperience = (lang: any, profile: any): any => {
  if (!lang) return lang;
  const ar = lang.assessmentResults;
  if (ar?.source && ar.source !== 'cv') return lang;

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

const normalizeCefr = (value: unknown): string => {
  const match = String(value || '')
    .toUpperCase()
    .match(/[ABC][12]/);
  return match ? match[0] : 'B1';
};

const labelFromRef = (ref: unknown): { label: string; code: string; id: string } => {
  if (!ref) return { label: '', code: '', id: '' };
  if (typeof ref === 'object' && ref !== null) {
    const obj = ref as { _id?: string; name?: string; code?: string; iso639_1?: string };
    return {
      label: String(obj.name || ''),
      code: String(obj.code || obj.iso639_1 || ''),
      id: obj._id ? String(obj._id) : '',
    };
  }
  const str = String(ref);
  if (/^[a-f0-9]{24}$/i.test(str)) return { label: '', code: '', id: str };
  if (/^[a-z]{2}(-[a-z]{2})?$/i.test(str)) return { label: '', code: str, id: '' };
  return { label: str, code: '', id: '' };
};

const findCatalogLanguage = (catalog: any[], hint: { label: string; code: string; id: string }) => {
  if (!Array.isArray(catalog) || catalog.length === 0) return null;
  if (hint.id) {
    const byId = catalog.find((l) => String(l?._id) === hint.id);
    if (byId) return byId;
  }
  const code = String(hint.code || '').toLowerCase().trim();
  if (code) {
    const byCode = catalog.find(
      (l) =>
        String(l?.code || '').toLowerCase() === code ||
        String(l?.iso639_1 || '').toLowerCase() === code
    );
    if (byCode) return byCode;
  }
  const label = String(hint.label || '').trim();
  if (!label) return null;
  return (
    catalog.find(
      (l) =>
        labelsMatch(String(l?.name || ''), label) ||
        labelsMatch(String(l?.nativeName || ''), label)
    ) || null
  );
};

const profileHasLanguage = (languages: any[], catalogLang: any): boolean => {
  const id = catalogLang?._id ? String(catalogLang._id) : '';
  const name = String(catalogLang?.name || '');
  return (languages || []).some((entry) => {
    const entryId = getLangId(entry);
    const entryName = getLangName(entry);
    if (id && entryId && entryId === id) return true;
    if (name && entryName && labelsMatch(entryName, name)) return true;
    return false;
  });
};

/**
 * From a video analysis payload, build language entries that are missing from
 * personalInfo.languages (matched against the languages catalog).
 */
export const buildMissingLanguagesFromVideoAnalysis = (
  analysisPayload: any,
  existingLanguages: any[],
  catalog: any[]
): any[] => {
  if (!analysisPayload || !Array.isArray(catalog) || catalog.length === 0) return [];

  const candidates: Array<{ label: string; code: string; id: string; proficiency: string }> = [];

  const spoken = analysisPayload?.analysis?.spokenLanguages;
  if (Array.isArray(spoken)) {
    for (const entry of spoken) {
      if (!entry) continue;
      if (typeof entry.score === 'number' && entry.score <= 0) continue;
      const fromLang = labelFromRef(entry.language);
      candidates.push({
        label: entry.languageName || entry.name || fromLang.label,
        code: fromLang.code,
        id: fromLang.id,
        proficiency: normalizeCefr(entry.level),
      });
    }
  }

  const assessed = analysisPayload?.languageAssessment?.languages;
  if (Array.isArray(assessed)) {
    for (const entry of assessed) {
      if (!entry) continue;
      const fromLang = labelFromRef(entry.language);
      candidates.push({
        label: entry.languageName || fromLang.label,
        code: fromLang.code,
        id: fromLang.id,
        proficiency: normalizeCefr(entry.cefr),
      });
    }
  }

  const detectedSpeech = analysisPayload?.analysis?.detectedLanguageOfSpeech;
  if (detectedSpeech) {
    candidates.push({
      label: String(detectedSpeech),
      code: '',
      id: '',
      proficiency: 'B1',
    });
  }

  const toAdd: any[] = [];
  const seenIds = new Set<string>();

  for (const candidate of candidates) {
    const catalogLang = findCatalogLanguage(catalog, candidate);
    if (!catalogLang?._id) continue;
    const id = String(catalogLang._id);
    if (seenIds.has(id)) continue;
    seenIds.add(id);
    if (profileHasLanguage(existingLanguages, catalogLang)) continue;
    if (profileHasLanguage(toAdd, catalogLang)) continue;
    toAdd.push({
      language: catalogLang,
      proficiency: candidate.proficiency,
      source: 'experience_video',
    });
  }

  return toAdd;
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
