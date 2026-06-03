import React, { useState } from 'react';
import { Star, Globe, Plus, X } from 'lucide-react';

interface LanguagesTabProps {
  profile: any;
  availableLanguages: Array<{ _id?: string; code?: string; name: string; nativeName?: string }>;
  getProficiencyStars: (proficiency: string) => number;
  takeLanguageAssessment: (language: string, iso639_1Code?: string) => void;
  onAddItemClick: (item: { language: string; proficiency: string; languageId?: string }) => void;
  onDeleteItemClick: (index: number) => void;
}

export const LanguagesTab: React.FC<LanguagesTabProps> = ({ 
  profile, 
  availableLanguages,
  getProficiencyStars, 
  takeLanguageAssessment,
  onAddItemClick,
  onDeleteItemClick
}) => {
  const proficiencyOptions = [
    { value: 'A1', label: 'A1 - Beginner' },
    { value: 'A2', label: 'A2 - Elementary' },
    { value: 'B1', label: 'B1 - Intermediate' },
    { value: 'B2', label: 'B2 - Upper Intermediate' },
    { value: 'C1', label: 'C1 - Advanced' },
    { value: 'C2', label: 'C2 - Proficient' },
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

  const handleAddLanguage = () => {
    const selected = selectableLanguages.find(
      (lang) => (lang._id || `${lang.name}-${lang.code}`) === draftLanguage
    );
    if (!selected) return;
    onAddItemClick({
      language: String(selected.name || '').trim(),
      languageId: selected._id,
      proficiency: draftProficiency
    });
    setDraftLanguage('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-harx-50/30 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-harx-100/70">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-harx-900 tracking-tight">Language Proficiency</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-harx-50 text-harx-700 border border-harx-100 text-xs font-black uppercase tracking-widest hover:bg-harx-100 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              {showAddForm ? 'Close' : 'Add'}
            </button>
          </div>
        </div>
        {showAddForm && (
          <div className="mb-6 grid grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-white/70 p-3 md:grid-cols-[minmax(0,1fr)_120px_auto]">
            <select
              value={draftLanguage}
              onChange={(e) => setDraftLanguage(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-harx-200"
            >
              <option value="">Select a language...</option>
              {selectableLanguages.map((lang) => (
                <option key={lang._id || `${lang.name}-${lang.code}`} value={lang._id || `${lang.name}-${lang.code}`}>
                  {lang.name}{lang.code ? ` (${lang.code})` : ''}
                </option>
              ))}
            </select>
            <select
              value={draftProficiency}
              onChange={(e) => setDraftProficiency(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-harx-200"
            >
              {proficiencyOptions.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddLanguage}
              disabled={!draftLanguage}
              className="rounded-lg border border-harx-200 bg-harx-50 px-3 py-2 text-xs font-black uppercase tracking-widest text-harx-700 hover:bg-harx-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Save
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {profile.personalInfo?.languages?.length > 0 ? (
            profile.personalInfo.languages.map((lang: any, index: number) => {
              const stars = getProficiencyStars(lang.proficiency);
              const languageName = typeof lang.language === 'object' && lang.language ? lang.language.name : 'Unknown Language';
              const languageCode = typeof lang.language === 'object' && lang.language ? lang.language.code : '';

              return (
                <div key={index} className="bg-white/80 p-6 rounded-3xl border border-harx-100/60 hover:border-harx-300 transition-all group">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 group-hover:text-harx-600 transition-colors">
                        {languageName}
                        {languageCode && <span className="text-slate-400 font-bold ml-2">({languageCode})</span>}
                      </h3>
                      <div className="flex items-center gap-1 mt-1">
                        {[...Array(6)].map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < stars ? 'text-amber-400 fill-current' : 'text-slate-200'}`} />
                        ))}
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-slate-50 rounded-lg text-xs font-black text-harx-500 shadow-sm border border-slate-200/30 uppercase italic">
                      {getProficiencyLabel(lang.proficiency)}
                    </div>
                  </div>

                  {lang.assessmentResults ? (
                    <div className="grid grid-cols-3 gap-2 mb-6">
                      <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/30 text-center">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fluency</div>
                        <div className="text-sm font-black text-slate-900">{lang.assessmentResults.fluency?.score || 0}%</div>
                      </div>
                      <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/30 text-center">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Proficiency</div>
                        <div className="text-sm font-black text-slate-900">{lang.assessmentResults.proficiency?.score || 0}%</div>
                      </div>
                      <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/30 text-center">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Comp.</div>
                        <div className="text-sm font-black text-slate-900">{lang.assessmentResults.completeness?.score || 0}%</div>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-6 p-4 bg-slate-200/30 rounded-2xl text-center">
                      <p className="text-xs font-medium text-slate-400 italic">No assessment completed</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onDeleteItemClick(index)}
                      className="py-3 px-4 bg-harx-50 text-harx-700 border border-harx-100/70 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm hover:bg-harx-100"
                      title="Delete language"
                    >
                      <span className="inline-flex items-center gap-1">
                        <X className="w-3.5 h-3.5" />
                        Delete
                      </span>
                    </button>
                    <button
                      onClick={() => takeLanguageAssessment(languageName, languageCode)}
                      className="flex-1 py-3 bg-gradient-harx text-white border border-harx-400/40 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 hover:opacity-90"
                    >
                      {lang.assessmentResults ? 'Retake Assessment' : 'Start Assessment'}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-2 text-center py-12 bg-slate-200/40 rounded-3xl border border-dashed border-slate-300">
              <Globe className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No languages added to profile yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
