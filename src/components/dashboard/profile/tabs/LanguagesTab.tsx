import React, { useState } from 'react';
import { Star, Globe, Plus, X, Video, AlertTriangle, CheckCircle2, Trash2, PlayCircle, Briefcase } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { resolveLanguageMedia, type LanguageMediaContext } from '../languageVideoUtils';
import { LanguageAnalysisModal } from '../LanguageAnalysisModal';

interface LanguagesTabProps {
  profile: any;
  availableLanguages: Array<{ _id?: string; code?: string; name: string; nativeName?: string }>;
  getProficiencyStars: (proficiency: string) => number;
  onRecordLanguageVideo: (
    language: string,
    code?: string,
    proficiency?: string,
    languageId?: string
  ) => void;
  onAddItemClick: (item: { language: string; proficiency: string; languageId?: string; code?: string }) => void | Promise<void>;
  onUpdateProficiency: (index: number, proficiency: string) => void | Promise<void>;
  onDeleteItemClick: (index: number) => void;
}

const getVerifiedProficiency = (lang: any): string | null => {
  const ar = lang?.assessmentResults;
  if (!ar || ar.source === 'cv') return null;
  return String(ar.verifiedProficiency || lang.proficiency || '').toUpperCase() || null;
};

const needsReVerification = (lang: any): boolean => {
  const ar = lang?.assessmentResults;
  if (!ar || ar.source === 'cv') return true;
  const verified = getVerifiedProficiency(lang);
  if (!verified) return true;
  return String(lang.proficiency || '').toUpperCase() !== verified;
};

const isLanguageVerified = (lang: any): boolean => {
  const ar = lang?.assessmentResults;
  if (!ar || ar.source === 'cv') return false;
  return !needsReVerification(lang);
};

// CEFR level → badge color, so the proficiency pill reads at a glance.
const CEFR_STYLES: Record<string, string> = {
  A1: 'bg-rose-50 text-rose-600 border-rose-200',
  A2: 'bg-orange-50 text-orange-600 border-orange-200',
  B1: 'bg-amber-50 text-amber-700 border-amber-200',
  B2: 'bg-lime-50 text-lime-700 border-lime-200',
  C1: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  C2: 'bg-teal-50 text-teal-700 border-teal-200',
};

export const LanguagesTab: React.FC<LanguagesTabProps> = ({
  profile,
  availableLanguages,
  getProficiencyStars,
  onRecordLanguageVideo,
  onAddItemClick,
  onUpdateProficiency,
  onDeleteItemClick,
}) => {
  const { t } = useTranslation();

  const proficiencyOptions = [
    { value: 'A1', label: t('profile.languages.levels.A1') },
    { value: 'A2', label: t('profile.languages.levels.A2') },
    { value: 'B1', label: t('profile.languages.levels.B1') },
    { value: 'B2', label: t('profile.languages.levels.B2') },
    { value: 'C1', label: t('profile.languages.levels.C1') },
    { value: 'C2', label: t('profile.languages.levels.C2') },
  ];
  const [draftLanguage, setDraftLanguage] = useState('');
  const [draftProficiency, setDraftProficiency] = useState('B1');
  const [showAddForm, setShowAddForm] = useState(false);
  const [analysisView, setAnalysisView] = useState<{
    languageName: string;
    proficiency: string;
    media: LanguageMediaContext;
  } | null>(null);

  const existingNames = new Set(
    (profile.personalInfo?.languages || [])
      .map((lang: any) => {
        if (typeof lang?.language === 'object' && lang.language) return String(lang.language.name || '').toLowerCase();
        return String(lang?.language || '').toLowerCase();
      })
      .filter(Boolean)
  );
  const selectableLanguages = (availableLanguages || []).filter(
    (lang) => !existingNames.has(String(lang.name || '').toLowerCase())
  );

  // Verified = assessment exists, not CV-only, and current level matches verified level.
  const isVideoVerified = (lang: any) => isLanguageVerified(lang);

  const languagesList = profile.personalInfo?.languages || [];
  const totalCount = languagesList.length;
  const verifiedCount = languagesList.filter(isVideoVerified).length;
  const unverifiedCount = totalCount - verifiedCount;
  const hasUnverified = unverifiedCount > 0;

  const handleAddLanguage = async () => {
    const selected = selectableLanguages.find(
      (lang) => (lang._id || `${lang.name}-${lang.code}`) === draftLanguage
    );
    if (!selected) return;
    await onAddItemClick({
      language: String(selected.name || '').trim(),
      languageId: selected._id,
      code: selected.code,
      proficiency: draftProficiency,
    });
    setDraftLanguage('');
    setShowAddForm(false);
  };

  const firstUnverified = languagesList.find((lang: any) => !isVideoVerified(lang));
  const openAssessmentForLang = (lang: any) => {
    const languageName =
      typeof lang.language === 'object' && lang.language ? lang.language.name : String(lang.language || '');
    const languageCode =
      (typeof lang.language === 'object' && lang.language ? lang.language.code : '') ||
      lang.iso639_1 ||
      '';
    const languageId =
      (typeof lang.language === 'object' && lang.language ? lang.language._id : '') ||
      (typeof lang.language === 'string' && /^[a-f0-9]{24}$/i.test(lang.language) ? lang.language : '') ||
      '';
    if (languageName) {
      onRecordLanguageVideo(languageName, languageCode, String(lang.proficiency || 'B1'), languageId || undefined);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gradient-to-b from-harx-50/40 to-white/40 backdrop-blur-md rounded-3xl p-6 sm:p-7 shadow-sm border border-harx-100/70">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-harx text-white shadow-lg shadow-harx-500/30">
              <Globe className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-black text-harx-900 tracking-tight">
                {t('profile.languages.title')}
              </h2>
              {totalCount > 0 && (
                <p className="text-xs font-semibold text-slate-400 mt-0.5">
                  {t(totalCount === 1 ? 'profile.languages.count' : 'profile.languages.count_plural', { total: totalCount, verified: verifiedCount })}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 ${
              showAddForm
                ? 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                : 'bg-gradient-harx text-white shadow-lg shadow-harx-500/25 hover:opacity-90'
            }`}
          >
            {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showAddForm ? t('profile.common.close') : t('profile.common.add')}
          </button>
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="mb-6 rounded-2xl border border-harx-100 bg-white/80 p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  {t('profile.languages.language')}
                </label>
                <select
                  value={draftLanguage}
                  onChange={(e) => setDraftLanguage(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition-all focus:border-harx-300 focus:ring-2 focus:ring-harx-200"
                >
                  <option value="">{t('profile.languages.select')}</option>
                  {selectableLanguages.map((lang) => (
                    <option key={lang._id || `${lang.name}-${lang.code}`} value={lang._id || `${lang.name}-${lang.code}`}>
                      {lang.name}{lang.code ? ` (${lang.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  {t('profile.languages.level')}
                </label>
                <select
                  value={draftProficiency}
                  onChange={(e) => setDraftProficiency(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition-all focus:border-harx-300 focus:ring-2 focus:ring-harx-200"
                >
                  {proficiencyOptions.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleAddLanguage}
                  disabled={!draftLanguage}
                  className="w-full md:w-auto rounded-xl bg-gradient-harx px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-harx-500/25 transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {t('profile.common.save')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global status banner — mirrors the Profile tab's two-state design:
            yellow warning while some languages are unverified, green success
            once every language is verified. */}
        {hasUnverified ? (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-300/80 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-yellow-100">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </span>
              <div>
                <p className="text-sm font-black text-yellow-800">
                  {t(unverifiedCount === 1 ? 'profile.languages.unverifiedCount' : 'profile.languages.unverifiedCount_plural', { count: unverifiedCount })}
                </p>
                <p className="text-xs font-medium text-yellow-700/90 mt-0.5">
                  {t('profile.languages.recordNotice')}
                </p>
              </div>
            </div>
            {firstUnverified && (
            <button
              type="button"
              onClick={() => openAssessmentForLang(firstUnverified)}
              className="px-5 py-2.5 rounded-xl bg-gradient-harx text-white hover:opacity-90 inline-flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-harx-500/25 active:scale-95 whitespace-nowrap"
            >
              <Video className="w-4 h-4" />
              {t('profile.languages.record')}
            </button>
            )}
          </div>
        ) : totalCount > 0 ? (
          <div className="mb-6 flex items-start gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-sm">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </span>
            <div>
              <p className="text-sm font-black text-emerald-800">
                {t('profile.languages.allVerified', { verified: verifiedCount, total: totalCount })}
              </p>
              <p className="text-xs font-medium text-emerald-700/90 mt-0.5">
                {t('profile.languages.allVerifiedHelp')}
              </p>
            </div>
          </div>
        ) : null}

        {/* Cards grid */}

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {totalCount > 0 ? (
            languagesList.map((lang: any, index: number) => {
              const stars = getProficiencyStars(lang.proficiency);
              const languageName = typeof lang.language === 'object' && lang.language ? lang.language.name : t('profile.languages.unknown');
              const languageCode = typeof lang.language === 'object' && lang.language ? lang.language.code : '';
              const ar = lang.assessmentResults;
              const isVerified = isLanguageVerified(lang);
              const isCvEstimate = !!ar && ar.source === 'cv';
              const languageMedia = isVerified ? resolveLanguageMedia(lang, profile) : null;
              const isExperienceSource = isVerified && languageMedia?.source === 'experience';
              const mustReVerify = needsReVerification(lang);
              const hasScores = !!ar && ar.source !== 'cv';
              const cefrStyle = CEFR_STYLES[String(lang.proficiency || '').toUpperCase()] || 'bg-slate-50 text-slate-600 border-slate-200';

              const badge = (languageCode || languageName || '?').slice(0, 2).toUpperCase();

              return (
                <div
                  key={index}
                  className={`relative overflow-hidden rounded-2xl border bg-white transition-all duration-300 group hover:-translate-y-1 hover:shadow-xl ${
                    isVerified
                      ? 'border-slate-200/80 hover:border-harx-200 hover:shadow-harx-500/10'
                      : 'border-yellow-200/80 hover:border-yellow-300 hover:shadow-yellow-500/10'
                  }`}
                >
                  {/* Top accent bar */}
                  <div className={`h-1 w-full ${isVerified ? 'bg-gradient-harx' : 'bg-gradient-to-r from-yellow-300 to-amber-400'}`} />

                  <div className="p-5">
                    {/* Header row: language badge + name + status */}
                    <div className="flex items-center gap-3.5">
                      <span
                        className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-sm font-black tracking-wider text-white shadow-md ${
                          isVerified ? 'bg-gradient-harx shadow-harx-500/30' : 'bg-gradient-to-br from-slate-400 to-slate-500 shadow-slate-400/30'
                        }`}
                      >
                        {badge}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-black text-slate-900 group-hover:text-harx-600 transition-colors">
                          {languageName}
                        </h3>
                        <div className="mt-1 flex items-center gap-1.5">
                          {languageCode && (
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{languageCode}</span>
                          )}
                          <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${cefrStyle}`}>
                            {String(lang.proficiency || '').toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider ${
                          isVerified
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                            : isCvEstimate
                              ? 'bg-sky-50 text-sky-600 border border-sky-200'
                              : 'bg-yellow-50 text-yellow-600 border border-yellow-200'
                        }`}
                      >
                        {isVerified ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                        {isVerified
                          ? t('profile.languages.verified')
                          : isCvEstimate
                            ? t('profile.languages.cvEstimate')
                            : mustReVerify && hasScores
                              ? t('profile.languages.reverify')
                              : t('profile.languages.toVerify')}
                      </span>
                    </div>

                    {/* Level selector — changing level requires a new verification video */}
                    <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50/70 px-3 py-2 gap-2">
                      <select
                        value={String(lang.proficiency || 'B1').toUpperCase()}
                        onChange={(e) => onUpdateProficiency(index, e.target.value)}
                        className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-bold text-slate-700 outline-none focus:border-harx-300"
                      >
                        {proficiencyOptions.map((level) => (
                          <option key={level.value} value={level.value}>
                            {level.label}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-0.5">
                        {[...Array(6)].map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < stars ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`} />
                        ))}
                      </div>
                    </div>

                    {hasScores ? (
                      <>
                        <div className="mt-4 grid grid-cols-3 gap-2.5">
                          {[
                            { label: t('profile.languages.fluency'), value: ar.fluency?.score || 0 },
                            { label: t('profile.languages.proficiency'), value: ar.proficiency?.score || 0 },
                            { label: t('profile.languages.completeness'), value: ar.completeness?.score || 0 },
                          ].map((metric) => (
                            <div key={metric.label} className="text-center">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{metric.label}</div>
                              <div className="text-base font-black text-slate-900 mt-0.5">{metric.value}%</div>
                              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className={`h-full rounded-full ${isVerified ? 'bg-gradient-harx' : 'bg-sky-300'}`}
                                  style={{ width: `${Math.min(100, Math.max(0, metric.value))}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        {isCvEstimate && (
                          <p className="mt-2.5 text-[11px] font-medium text-sky-600 leading-snug">
                            {t('profile.languages.cvHelp')}
                          </p>
                        )}
                        {isExperienceSource && (
                          <p className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-indigo-600 leading-snug">
                            <Briefcase className="w-3.5 h-3.5 flex-shrink-0" />
                            {t('profile.languages.experienceSource')}
                          </p>
                        )}
                        {mustReVerify && hasScores && (
                          <p className="mt-2.5 text-[11px] font-medium text-amber-700 leading-snug">
                            {t('profile.languages.levelChanged', { verified: getVerifiedProficiency(lang), current: String(lang.proficiency || '').toUpperCase() })}
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="mt-4 flex items-center gap-2 rounded-xl bg-yellow-50/70 border border-yellow-200 px-3 py-2.5">
                        <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                        <p className="text-xs font-semibold text-yellow-700 leading-snug">
                          {t('profile.languages.levelUnverified')}
                        </p>
                      </div>
                    )}

                    <div className="mt-4 flex flex-col gap-2">
                      {languageMedia && isVerified && (
                        <button
                          type="button"
                          onClick={() =>
                            setAnalysisView({
                              languageName,
                              proficiency: String(lang.proficiency || '').toUpperCase(),
                              media: languageMedia,
                            })
                          }
                          className="w-full py-2.5 rounded-xl border border-harx-200 bg-harx-50 text-xs font-black uppercase tracking-widest text-harx-700 hover:bg-harx-100 inline-flex items-center justify-center gap-1.5 transition-all"
                        >
                          {languageMedia.source === 'experience' ? (
                            <>
                              <Briefcase className="w-3.5 h-3.5" />
                              {t('profile.languages.viewExperienceAnalysis')}
                            </>
                          ) : (
                            <>
                              <PlayCircle className="w-3.5 h-3.5" />
                              {t('profile.languages.viewAnalysis')}
                            </>
                          )}
                        </button>
                      )}
                      <div className="flex items-center gap-2.5">
                      {!isVerified && (
                        <button
                          type="button"
                          onClick={() => openAssessmentForLang(lang)}
                          title={t('profile.languages.recordTooltip')}
                          className="flex-1 py-2.5 bg-gradient-harx text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-harx-500/25 active:scale-95 hover:opacity-90 inline-flex items-center justify-center gap-1.5"
                        >
                          <Video className="w-3.5 h-3.5" />
                          {t('profile.languages.recordVideo')}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteItemClick(index)}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-black uppercase tracking-widest text-slate-500 transition-all hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 active:scale-95 ${
                          isVerified ? 'flex-1' : 'px-3.5'
                        }`}
                        title={t('profile.languages.deleteLanguage')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className={isVerified ? 'inline' : 'hidden sm:inline'}>{t('profile.common.delete')}</span>
                      </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-1 md:col-span-2 text-center py-14 bg-slate-50/60 rounded-3xl border-2 border-dashed border-slate-200">
              <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
                <Globe className="w-8 h-8 text-slate-300" />
              </span>
              <p className="text-slate-600 font-bold">
                {t('profile.languages.empty')}
              </p>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                {t('profile.languages.emptyHelp')}
              </p>
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="mt-5 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-harx text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-harx-500/25 transition-all hover:opacity-90 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('profile.languages.addLanguage')}
              </button>
            </div>
          )}
        </div>
      </div>

      {analysisView && (
        <LanguageAnalysisModal
          isOpen
          onClose={() => setAnalysisView(null)}
          languageName={analysisView.languageName}
          proficiency={analysisView.proficiency}
          media={analysisView.media}
        />
      )}
    </div>
  );
};
