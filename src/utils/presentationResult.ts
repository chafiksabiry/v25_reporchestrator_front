/**
 * Réponse de POST /api/profiles/:id/presentation/analyze-video (format FINAL confirmé par le backend) :
 *   200 { data: { saved, insightsApplied,
 *                 detected: { technicalSkills[], professionalSkills[], softSkills[], industries[], activities[] : {id,name,score},
 *                             languages[] : {id,name,level,score}, isEmpty },
 *                 summary:{en,fr}, relevance:{onTopic,score,reason:{en,fr}} } }
 * Champs SUPPRIMÉS côté serveur et jamais lus : transcription, analysis, languageAssessment, fraudCheck,
 * videoUrl, duration. `stale:true` (avec saved:false et insightsApplied:false) = la vidéo du wizard a
 * changé pendant l'analyse : `detected` est renvoyé mais RIEN n'est appliqué au profil → le front demande
 * de réessayer, sans afficher de résultat ni recharger. L'ancien format (sans `stale`) reste valide.
 * Les compétences détectées vont dans `proposedSkills` (suggestions) ; secteurs,
 * activités et langues sont écrits directement dans le profil ; `saved:false` = non bloquant.
 */

export type Localized = string | { en?: string; fr?: string } | null | undefined;

export interface DetectedItem { id?: string; name?: Localized; score?: number }
export interface DetectedLanguage extends DetectedItem { level?: string }

export interface PresentationResult {
  saved: boolean;
  insightsApplied: boolean;
  /** La vidéo du wizard a changé pendant l'analyse : rien n'a été appliqué, il faut réessayer. */
  stale: boolean;
  summary?: Localized;
  relevance?: { onTopic?: boolean; score?: number; reason?: Localized };
  detected: {
    technicalSkills: DetectedItem[];
    professionalSkills: DetectedItem[];
    softSkills: DetectedItem[];
    industries: DetectedItem[];
    activities: DetectedItem[];
    languages: DetectedLanguage[];
    isEmpty: boolean;
  };
}

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/** Prend `json.data` (ou `json`) et ne retient QUE les champs du format final, avec des valeurs sûres. */
export const normalizePresentationResult = (json: any): PresentationResult => {
  const d = json && typeof json === 'object' ? (json.data ?? json) : {};
  const det = d?.detected ?? {};
  const detected = {
    technicalSkills: arr<DetectedItem>(det.technicalSkills),
    professionalSkills: arr<DetectedItem>(det.professionalSkills),
    softSkills: arr<DetectedItem>(det.softSkills),
    industries: arr<DetectedItem>(det.industries),
    activities: arr<DetectedItem>(det.activities),
    languages: arr<DetectedLanguage>(det.languages),
    isEmpty: false,
  };
  const total =
    detected.technicalSkills.length + detected.professionalSkills.length + detected.softSkills.length +
    detected.industries.length + detected.activities.length + detected.languages.length;
  // isEmpty explicite du serveur, sinon déduit : rien de détecté = aucune parole exploitable.
  detected.isEmpty = typeof det.isEmpty === 'boolean' ? det.isEmpty : total === 0;
  return {
    saved: d?.saved === true,
    insightsApplied: d?.insightsApplied === true,
    stale: d?.stale === true,
    summary: d?.summary,
    relevance: d?.relevance && typeof d.relevance === 'object' ? d.relevance : undefined,
    detected,
  };
};

export const localizedText = (value: Localized, lang?: string): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  const code = (lang || 'en').slice(0, 2).toLowerCase() === 'fr' ? 'fr' : 'en';
  return value[code] || value.en || value.fr || '';
};

export type DetectedGroupKey = 'skills' | 'industries' | 'activities' | 'languages';

/** Groupes à afficher (noms dans la langue de l'interface), sans groupe vide. */
export const buildDetectedGroups = (
  result: PresentationResult,
  lang?: string
): Array<{ key: DetectedGroupKey; labels: string[] }> => {
  const names = (items: DetectedItem[]) => items.map((i) => localizedText(i.name, lang)).filter(Boolean);
  const d = result.detected;
  const groups: Array<{ key: DetectedGroupKey; labels: string[] }> = [
    { key: 'skills', labels: names([...d.technicalSkills, ...d.professionalSkills, ...d.softSkills]) },
    { key: 'industries', labels: names(d.industries) },
    { key: 'activities', labels: names(d.activities) },
    {
      key: 'languages',
      labels: d.languages
        .map((l) => {
          const n = localizedText(l.name, lang);
          return n ? (l.level ? `${n} (${l.level})` : n) : '';
        })
        .filter(Boolean),
    },
  ];
  return groups.filter((g) => g.labels.length > 0);
};

/** Nombre de compétences détectées (suggestions à confirmer dans l'onglet Compétences). */
export const detectedSkillCount = (result: PresentationResult): number =>
  result.detected.technicalSkills.length + result.detected.professionalSkills.length + result.detected.softSkills.length;
