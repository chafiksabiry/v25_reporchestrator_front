import React, { useState } from 'react';
import { Star, Globe, Plus, X, Video, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LanguagesTabProps {
  profile: any;
  availableLanguages: Array<{ _id?: string; code?: string; name: string; nativeName?: string }>;
  getProficiencyStars: (proficiency: string) => number;
  /** Navigate to the Experience tab so the rep can record a video (languages
   *  are detected from the experience video instead of a dedicated assessment). */
  onGoToExperience: () => void;
  onAddItemClick: (item: { language: string; proficiency: string; languageId?: string }) => void;
  onDeleteItemClick: (index: number) => void;
}

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
  onGoToExperience,
  onAddItemClick,
  onDeleteItemClick,
}) => {
  const { i18n } = useTranslation();
  const isFr = (i18n.language || 'en').slice(0, 2) === 'fr';

  const proficiencyOptions = [
    { value: 'A1', label: isFr ? 'A1 - Débutant' : 'A1 - Beginner' },
    { value: 'A2', label: isFr ? 'A2 - Élémentaire' : 'A2 - Elementary' },
    { value: 'B1', label: isFr ? 'B1 - Intermédiaire' : 'B1 - Intermediate' },
    { value: 'B2', label: isFr ? 'B2 - Intermédiaire avancé' : 'B2 - Upper Intermediate' },
    { value: 'C1', label: isFr ? 'C1 - Avancé' : 'C1 - Advanced' },
    { value: 'C2', label: isFr ? 'C2 - Maîtrise' : 'C2 - Proficient' },
  ];
  const getProficiencyLabel = (value: string) =>
    proficiencyOptions.find((option) => option.value === value)?.label || value;

  const [draftLanguage, setDraftLanguage] = useState('');
  const [draftProficiency, setDraftProficiency] = useState('B1');
  const [showAddForm, setShowAddForm] = useState(false);

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

  const languagesList = profile.personalInfo?.languages || [];
  const totalCount = languagesList.length;
  const unverifiedCount = languagesList.filter((lang: any) => !lang?.assessmentResults).length;
  const verifiedCount = totalCount - unverifiedCount;
  const hasUnverified = unverifiedCount > 0;

  const handleAddLanguage = () => {
    const selected = selectableLanguages.find(
      (lang) => (lang._id || `${lang.name}-${lang.code}`) === draftLanguage
    );
    if (!selected) return;
    onAddItemClick({
      language: String(selected.name || '').trim(),
      languageId: selected._id,
      proficiency: draftProficiency,
    });
    setDraftLanguage('');
    setShowAddForm(false);
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
                {isFr ? 'Maîtrise des langues' : 'Language Proficiency'}
              </h2>
              {totalCount > 0 && (
                <p className="text-xs font-semibold text-slate-400 mt-0.5">
                  {isFr
                    ? `${totalCount} langue${totalCount > 1 ? 's' : ''} · ${verifiedCount} vérifiée${verifiedCount > 1 ? 's' : ''}`
                    : `${totalCount} language${totalCount > 1 ? 's' : ''} · ${verifiedCount} verified`}
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
            {showAddForm ? (isFr ? 'Fermer' : 'Close') : (isFr ? 'Ajouter' : 'Add')}
          </button>
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="mb-6 rounded-2xl border border-harx-100 bg-white/80 p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  {isFr ? 'Langue' : 'Language'}
                </label>
                <select
                  value={draftLanguage}
                  onChange={(e) => setDraftLanguage(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition-all focus:border-harx-300 focus:ring-2 focus:ring-harx-200"
                >
                  <option value="">{isFr ? 'Sélectionnez une langue…' : 'Select a language…'}</option>
                  {selectableLanguages.map((lang) => (
                    <option key={lang._id || `${lang.name}-${lang.code}`} value={lang._id || `${lang.name}-${lang.code}`}>
                      {lang.name}{lang.code ? ` (${lang.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  {isFr ? 'Niveau' : 'Level'}
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
                  {isFr ? 'Enregistrer' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global warning banner */}
        {hasUnverified && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-300/80 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-yellow-100">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </span>
              <div>
                <p className="text-sm font-black text-yellow-800">
                  {isFr
                    ? `${unverifiedCount} langue${unverifiedCount > 1 ? 's' : ''} non vérifiée${unverifiedCount > 1 ? 's' : ''}`
                    : `${unverifiedCount} language${unverifiedCount > 1 ? 's' : ''} not verified`}
                </p>
                <p className="text-xs font-medium text-yellow-700/90 mt-0.5">
                  {isFr
                    ? 'Enregistrez une vidéo dans l’onglet Expérience pour détecter et valider vos niveaux.'
                    : 'Record a video in the Experience tab to detect and validate your levels.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onGoToExperience}
              className="px-5 py-2.5 rounded-xl bg-gradient-harx text-white hover:opacity-90 inline-flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-harx-500/25 active:scale-95 whitespace-nowrap"
            >
              <Video className="w-4 h-4" />
              {isFr ? 'Enregistrer' : 'Record'}
            </button>
          </div>
        )}

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {totalCount > 0 ? (
            languagesList.map((lang: any, index: number) => {
              const stars = getProficiencyStars(lang.proficiency);
              const languageName = typeof lang.language === 'object' && lang.language ? lang.language.name : 'Unknown Language';
              const languageCode = typeof lang.language === 'object' && lang.language ? lang.language.code : '';
              const isVerified = !!lang.assessmentResults;
              const cefrStyle = CEFR_STYLES[String(lang.proficiency || '').toUpperCase()] || 'bg-slate-50 text-slate-600 border-slate-200';

              return (
                <div
                  key={index}
                  className={`relative p-6 rounded-3xl border transition-all duration-300 group hover:-translate-y-0.5 hover:shadow-xl ${
                    isVerified
                      ? 'bg-white border-harx-100/60 hover:border-harx-300 hover:shadow-harx-500/10'
                      : 'bg-white border-yellow-200 hover:border-yellow-300 hover:shadow-yellow-500/10'
                  }`}
                >
                  {/* Verified / unverified status pill */}
                  <span
                    className={`absolute top-4 right-4 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                      isVerified
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        : 'bg-yellow-50 text-yellow-600 border border-yellow-200'
                    }`}
                  >
                    {isVerified ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                    {isVerified ? (isFr ? 'Vérifié' : 'Verified') : (isFr ? 'Non vérifié' : 'Unverified')}
                  </span>

                  <div className="mb-5 pr-24">
                    <h3 className="text-lg font-black text-slate-900 group-hover:text-harx-600 transition-colors">
                      {languageName}
                      {languageCode && <span className="text-slate-300 font-bold ml-2">({languageCode})</span>}
                    </h3>
                    <div className="mt-2 flex items-center gap-2.5">
                      <div className="flex items-center gap-0.5">
                        {[...Array(6)].map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < stars ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`} />
                        ))}
                      </div>
                      <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${cefrStyle}`}>
                        {getProficiencyLabel(lang.proficiency)}
                      </span>
                    </div>
                  </div>

                  {isVerified ? (
                    <div className="grid grid-cols-3 gap-2.5 mb-5">
                      {[
                        { label: isFr ? 'Aisance' : 'Fluency', value: lang.assessmentResults.fluency?.score || 0 },
                        { label: isFr ? 'Niveau' : 'Proficiency', value: lang.assessmentResults.proficiency?.score || 0 },
                        { label: isFr ? 'Complét.' : 'Comp.', value: lang.assessmentResults.completeness?.score || 0 },
                      ].map((metric) => (
                        <div key={metric.label} className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/40 text-center">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{metric.label}</div>
                          <div className="text-base font-black text-slate-900 mt-0.5">{metric.value}%</div>
                          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-200">
                            <div className="h-full rounded-full bg-gradient-harx" style={{ width: `${Math.min(100, Math.max(0, metric.value))}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mb-5 p-3.5 bg-yellow-50/70 border border-yellow-200 rounded-2xl flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                      <p className="text-xs font-semibold text-yellow-700 leading-snug">
                        {isFr
                          ? 'Niveau non vérifié — enregistrez une vidéo dans Expérience.'
                          : 'Level not verified — record a video in Experience.'}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => onDeleteItemClick(index)}
                      className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 bg-white text-slate-500 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 active:scale-95"
                      title={isFr ? 'Supprimer la langue' : 'Delete language'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{isFr ? 'Supprimer' : 'Delete'}</span>
                    </button>
                    {!isVerified && (
                      <button
                        type="button"
                        onClick={onGoToExperience}
                        title={isFr
                          ? 'Enregistrez une vidéo dans Expérience pour détecter vos langues'
                          : 'Record a video in Experience to detect your languages'}
                        className="flex-1 py-2.5 bg-gradient-harx text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-harx-500/25 active:scale-95 hover:opacity-90 inline-flex items-center justify-center gap-1.5"
                      >
                        <Video className="w-3.5 h-3.5" />
                        {isFr ? 'Enregistrer dans Expérience' : 'Record in Experience'}
                      </button>
                    )}
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
                {isFr ? 'Aucune langue ajoutée pour le moment' : 'No languages added yet'}
              </p>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                {isFr ? 'Ajoutez une langue ou importez votre CV pour commencer.' : 'Add a language or import your CV to get started.'}
              </p>
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="mt-5 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-harx text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-harx-500/25 transition-all hover:opacity-90 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                {isFr ? 'Ajouter une langue' : 'Add a language'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
