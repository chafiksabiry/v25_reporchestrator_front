import React from 'react';
import { createPortal } from 'react-dom';
import { X, Globe, Briefcase, CheckCircle, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { LanguageMediaContext } from './languageVideoUtils';

interface LanguageAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  languageName: string;
  proficiency: string;
  media: LanguageMediaContext;
}

const localizeText = (value: unknown, lang: string): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const obj = value as { en?: string; fr?: string };
    const code = lang.slice(0, 2) as 'en' | 'fr';
    return obj[code] || obj.en || obj.fr || '';
  }
  return '';
};

export const LanguageAnalysisModal: React.FC<LanguageAnalysisModalProps> = ({
  isOpen,
  onClose,
  languageName,
  proficiency,
  media,
}) => {
  const { i18n } = useTranslation();
  const isFr = (i18n.language || 'en').slice(0, 2) === 'fr';
  const uiLang = i18n.language || 'en';
  const ar = media.assessmentResults as any;
  const entry = media.languageAssessmentEntry as any;

  if (!isOpen) return null;

  const metrics = [
    { label: isFr ? 'Aisance' : 'Fluency', value: ar?.fluency?.score ?? entry?.fluency?.score ?? 0 },
    { label: isFr ? 'Grammaire / Niveau' : 'Grammar / Level', value: ar?.proficiency?.score ?? entry?.grammar?.score ?? 0 },
    { label: isFr ? 'Vocabulaire' : 'Vocabulary', value: ar?.completeness?.score ?? entry?.vocabulary?.score ?? 0 },
  ];

  const overallScore = ar?.overall?.score ?? entry?.overallScore ?? null;
  const summary =
    localizeText(entry?.summary, uiLang) ||
    localizeText(entry?.strengths, uiLang) ||
    ar?.overall?.strengths ||
    '';

  const sourceLabel =
    media.source === 'experience'
      ? isFr
        ? 'Vidéo d’expérience'
        : 'Experience video'
      : isFr
        ? 'Vidéo langue'
        : 'Language video';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center px-4 pt-16 pb-4 bg-black/70 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[calc(100vh-5rem)] bg-white rounded-[28px] shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-harx-500/20 rounded-xl">
              <Globe className="w-5 h-5 text-harx-300" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">
                {languageName} · {proficiency}
              </h2>
              <p className="text-xs text-slate-400 font-medium">{sourceLabel}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden min-h-0">
          <div className="lg:w-[420px] flex-shrink-0 bg-black">
            <video
              src={media.videoUrl}
              controls
              playsInline
              className="w-full h-full max-h-[320px] lg:max-h-none object-contain bg-black"
            />
            {media.experienceTitle && (
              <div className="px-4 py-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2 text-xs text-slate-300">
                <Briefcase className="w-3.5 h-3.5 text-harx-400 flex-shrink-0" />
                <span className="truncate font-semibold">
                  {media.experienceTitle}
                  {media.experienceCompany ? ` @ ${media.experienceCompany}` : ''}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/80">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              {isFr ? 'Analyse IA — niveau vérifié' : 'AI analysis — verified level'}
              {overallScore != null && (
                <span className="ml-auto px-2 py-0.5 rounded-full bg-white border border-emerald-200 text-emerald-800">
                  {overallScore}%
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {metrics.map((m) => (
                <div key={m.label} className="rounded-xl bg-white border border-slate-100 p-3 text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{m.label}</div>
                  <div className="text-lg font-black text-slate-900 mt-1">{m.value}%</div>
                  <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-harx rounded-full" style={{ width: `${Math.min(100, m.value)}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {(entry?.cefr || ar?.verifiedProficiency) && (
              <div className="rounded-xl bg-white border border-harx-100 px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-harx-600">
                  CEFR
                </span>
                <span className="text-sm font-black text-harx-800">
                  {entry?.cefr || ar?.verifiedProficiency || proficiency}
                </span>
              </div>
            )}

            {summary && (
              <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-harx-500" />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-600">
                    {isFr ? 'Résumé IA' : 'AI summary'}
                  </span>
                </div>
                <p className="p-4 text-sm text-slate-700 leading-relaxed">{summary}</p>
              </div>
            )}

            {media.transcription && (
              <details className="rounded-2xl border border-slate-100 bg-white overflow-hidden group">
                <summary className="px-4 py-3 cursor-pointer text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50">
                  {isFr ? 'Transcription' : 'Transcript'}
                </summary>
                <p className="px-4 pb-4 text-xs text-slate-600 leading-relaxed max-h-40 overflow-y-auto">
                  {media.transcription}
                </p>
              </details>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
