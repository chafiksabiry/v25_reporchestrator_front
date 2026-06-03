/**
 * Thème viewer REP (aperçu formation) — partagé logiquement avec le dash REP.
 * Les valeurs sont alignées sur ContentUploader (harx-night / sunset / ocean).
 */

export type TrainingViewerTheme = 'harx-night' | 'sunset' | 'ocean';

export function normalizeTrainingViewerTheme(raw: unknown): TrainingViewerTheme {
  const s = String(raw || '').trim();
  if (s === 'harx-night' || s === 'sunset' || s === 'ocean') return s;
  return 'harx-night';
}

export function readRepViewerThemeFromLocalStorage(journeyId: string): TrainingViewerTheme | null {
  const jid = String(journeyId || '').trim();
  if (!jid) return null;
  try {
    const stored = localStorage.getItem(`harx_rep_viewer_theme_${jid}`) as TrainingViewerTheme | null;
    if (stored === 'harx-night' || stored === 'sunset' || stored === 'ocean') return stored;
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * DB (`methodologyData.repViewerTheme`) si présent, sinon localStorage, sinon défaut.
 * Aligné sur l’hydratation du modal dans ContentUploader.
 */
export function resolveRepViewerTheme(journey: unknown, journeyId: string): TrainingViewerTheme {
  const j = journey as { methodologyData?: { repViewerTheme?: unknown } } | null | undefined;
  const rawMeta = j?.methodologyData?.repViewerTheme;
  if (rawMeta !== undefined && rawMeta !== null && String(rawMeta).trim() !== '') {
    return normalizeTrainingViewerTheme(rawMeta);
  }
  return readRepViewerThemeFromLocalStorage(journeyId) || 'harx-night';
}

export type ViewerThemeTokens = {
  shellBg: string;
  contentBg: string;
  panelBg: string;
  cardBg: string;
  accentBg: string;
  accentBorder: string;
  accentShadow: string;
};

export function getViewerThemeTokens(theme: TrainingViewerTheme): ViewerThemeTokens {
  const themes: Record<TrainingViewerTheme, ViewerThemeTokens> = {
    'harx-night': {
      shellBg: 'rgba(2,6,23,0.6)',
      contentBg: 'linear-gradient(180deg,#070a1a 0%,#0a1024 52%,#090d1f 100%)',
      panelBg: 'rgba(11,16,37,0.92)',
      cardBg: '#12172f',
      accentBg: 'linear-gradient(90deg,#e11d48 0%,#f43f5e 50%,#ec4899 100%)',
      accentBorder: 'rgba(244,63,94,0.35)',
      accentShadow: '0 20px 70px -25px rgba(236,72,153,0.45)',
    },
    sunset: {
      shellBg: 'rgba(55,24,24,0.58)',
      contentBg: 'linear-gradient(180deg,#140a12 0%,#211026 50%,#2a1222 100%)',
      panelBg: 'rgba(35,16,37,0.9)',
      cardBg: '#2a1732',
      accentBg: 'linear-gradient(90deg,#fb7185 0%,#f59e0b 52%,#f97316 100%)',
      accentBorder: 'rgba(251,113,133,0.42)',
      accentShadow: '0 20px 70px -25px rgba(251,113,133,0.42)',
    },
    ocean: {
      shellBg: 'rgba(8,24,38,0.58)',
      contentBg: 'linear-gradient(180deg,#061623 0%,#0a2233 50%,#0b2b3b 100%)',
      panelBg: 'rgba(10,28,44,0.9)',
      cardBg: '#12314a',
      accentBg: 'linear-gradient(90deg,#06b6d4 0%,#0ea5e9 50%,#6366f1 100%)',
      accentBorder: 'rgba(14,165,233,0.45)',
      accentShadow: '0 20px 70px -25px rgba(14,165,233,0.45)',
    },
  };
  return themes[theme];
}

export type ModuleColorStyle = {
  accentBg: string;
  border: string;
  glow: string;
  chipBg: string;
  chipBorder: string;
  softBg: string;
};

export function getModuleColorStyles(theme: TrainingViewerTheme): ModuleColorStyle[] {
  if (theme === 'ocean') {
    return [
      {
        accentBg: 'linear-gradient(90deg,#06b6d4 0%,#0ea5e9 55%,#38bdf8 100%)',
        border: 'rgba(14,165,233,0.45)',
        glow: '0 16px 38px -22px rgba(14,165,233,0.55)',
        chipBg: 'rgba(14,165,233,0.22)',
        chipBorder: 'rgba(14,165,233,0.48)',
        softBg: 'rgba(14,165,233,0.10)',
      },
      {
        accentBg: 'linear-gradient(90deg,#22d3ee 0%,#14b8a6 55%,#2dd4bf 100%)',
        border: 'rgba(45,212,191,0.42)',
        glow: '0 16px 38px -22px rgba(45,212,191,0.52)',
        chipBg: 'rgba(45,212,191,0.2)',
        chipBorder: 'rgba(45,212,191,0.45)',
        softBg: 'rgba(45,212,191,0.08)',
      },
      {
        accentBg: 'linear-gradient(90deg,#6366f1 0%,#3b82f6 55%,#0ea5e9 100%)',
        border: 'rgba(99,102,241,0.42)',
        glow: '0 16px 38px -22px rgba(99,102,241,0.5)',
        chipBg: 'rgba(99,102,241,0.2)',
        chipBorder: 'rgba(99,102,241,0.45)',
        softBg: 'rgba(99,102,241,0.08)',
      },
    ];
  }
  if (theme === 'sunset') {
    return [
      {
        accentBg: 'linear-gradient(90deg,#fb7185 0%,#f97316 55%,#f59e0b 100%)',
        border: 'rgba(251,113,133,0.45)',
        glow: '0 16px 38px -22px rgba(251,113,133,0.55)',
        chipBg: 'rgba(251,113,133,0.2)',
        chipBorder: 'rgba(251,113,133,0.5)',
        softBg: 'rgba(251,113,133,0.1)',
      },
      {
        accentBg: 'linear-gradient(90deg,#f59e0b 0%,#f97316 55%,#ef4444 100%)',
        border: 'rgba(245,158,11,0.45)',
        glow: '0 16px 38px -22px rgba(245,158,11,0.52)',
        chipBg: 'rgba(245,158,11,0.2)',
        chipBorder: 'rgba(245,158,11,0.48)',
        softBg: 'rgba(245,158,11,0.1)',
      },
      {
        accentBg: 'linear-gradient(90deg,#a855f7 0%,#ec4899 55%,#fb7185 100%)',
        border: 'rgba(236,72,153,0.45)',
        glow: '0 16px 38px -22px rgba(236,72,153,0.52)',
        chipBg: 'rgba(236,72,153,0.2)',
        chipBorder: 'rgba(236,72,153,0.48)',
        softBg: 'rgba(236,72,153,0.1)',
      },
    ];
  }
  return [
    {
      accentBg: 'linear-gradient(90deg,#f43f5e 0%,#e11d48 55%,#ec4899 100%)',
      border: 'rgba(244,63,94,0.42)',
      glow: '0 16px 38px -22px rgba(244,63,94,0.55)',
      chipBg: 'rgba(244,63,94,0.22)',
      chipBorder: 'rgba(244,63,94,0.45)',
      softBg: 'rgba(244,63,94,0.08)',
    },
    {
      accentBg: 'linear-gradient(90deg,#a855f7 0%,#7c3aed 55%,#ec4899 100%)',
      border: 'rgba(168,85,247,0.42)',
      glow: '0 16px 38px -22px rgba(168,85,247,0.55)',
      chipBg: 'rgba(168,85,247,0.22)',
      chipBorder: 'rgba(168,85,247,0.45)',
      softBg: 'rgba(168,85,247,0.08)',
    },
    {
      accentBg: 'linear-gradient(90deg,#22d3ee 0%,#0ea5e9 55%,#38bdf8 100%)',
      border: 'rgba(34,211,238,0.42)',
      glow: '0 16px 38px -22px rgba(34,211,238,0.55)',
      chipBg: 'rgba(34,211,238,0.2)',
      chipBorder: 'rgba(34,211,238,0.45)',
      softBg: 'rgba(34,211,238,0.08)',
    },
  ];
}
