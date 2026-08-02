import React, { useState } from 'react';
import { Globe, Trash2, X, RefreshCw, Info } from 'lucide-react';
import { Language } from '../../../../../services/api/languages';

interface EditLanguagesTabProps {
  profile: any;
  setProfile: (profile: any) => void;
  setModifiedSections: (modified: any) => void;
  availableLanguages: Language[];
  loadingLanguages: boolean;
  getLanguageDisplayName: (lang: any) => string;
  getLanguageCode: (lang: any) => string;
  updateLanguageProficiency: (idx: number, proficiency: string) => void;
  removeLanguage: (idx: number) => void;
  addLanguage: (lang: Language) => void;
  
  // Search state
  languageSearchTerm: string;
  setLanguageSearchTerm: (term: string) => void;
  isLanguageDropdownOpen: boolean;
  setIsLanguageDropdownOpen: (open: boolean) => void;
  filteredLanguages: Language[];
  selectedLanguageIndex: number;
  setSelectedLanguageIndex: (idx: number | ((p: number) => number)) => void;
  tempLanguage: any;
  setTempLanguage: (lang: any) => void;
  proficiencyLevels: any[];
  renderError: (err: string | undefined, id: string) => React.ReactNode;
  validationErrors: Record<string, string>;
}

export const EditLanguagesTab: React.FC<EditLanguagesTabProps> = ({
  profile,
  availableLanguages,
  loadingLanguages,
  getLanguageDisplayName,
  getLanguageCode,
  updateLanguageProficiency,
  removeLanguage,
  addLanguage,
  languageSearchTerm,
  setLanguageSearchTerm,
  isLanguageDropdownOpen,
  setIsLanguageDropdownOpen,
  filteredLanguages,
  selectedLanguageIndex,
  setSelectedLanguageIndex,
  tempLanguage,
  setTempLanguage,
  proficiencyLevels,
  renderError,
  validationErrors
}) => {
  const [showAddLanguageForm, setShowAddLanguageForm] = useState(false);

  const handleSelectLanguage = (language: Language) => {
    addLanguage(language);
    setShowAddLanguageForm(false);
    setIsLanguageDropdownOpen(false);
    setLanguageSearchTerm('');
    setSelectedLanguageIndex(-1);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Language Proficiency</h2>
          <button
            type="button"
            onClick={() => setShowAddLanguageForm((prev) => !prev)}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors"
          >
            {showAddLanguageForm ? 'Close' : '+ Add'}
          </button>
        </div>
        
        <div className="bg-harx-50 p-6 rounded-2xl border border-harx-100 flex items-start gap-4 mb-8">
           <div className="p-2.5 bg-white rounded-xl text-harx-600 shadow-sm">
             <Globe className="w-5 h-5" />
           </div>
           <div>
             <h4 className="text-sm font-black text-harx-800 uppercase tracking-wide">Communication Strategy</h4>
             <p className="text-xs font-bold text-harx-600/80 mt-1 leading-relaxed">
               Accurate proficiency levels ensure you are matched with the right opportunities. Be honest about your fluency to maintain trust.
             </p>
           </div>
        </div>

        {/* Current Languages List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {profile.personalInfo?.languages?.length > 0 ? (
            profile.personalInfo.languages.map((lang: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-5 bg-gray-50 border border-gray-100 rounded-2xl group hover:border-harx-200 transition-all">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-gray-900">
                      {getLanguageDisplayName(lang)}
                    </span>
                    {getLanguageCode(lang) && (
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 py-0.5 bg-white rounded-md border border-gray-100">
                        {getLanguageCode(lang)}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-harx-400 rounded-full"></div>
                    <span className="text-[11px] font-bold text-harx-600 uppercase italic">{lang.proficiency} Level</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={lang.proficiency}
                    onChange={(e) => updateLanguageProficiency(index, e.target.value)}
                    className="text-[11px] font-black uppercase tracking-tighter px-3 py-2 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-harx-500/10 outline-none"
                  >
                    {proficiencyLevels.map(level => (
                      <option key={level.value} value={level.value}>{level.label}</option>
                    ))}
                  </select>
                  
                  <button
                    onClick={() => removeLanguage(index)}
                    className="p-2.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="md:col-span-2 py-10 text-center border-2 border-dashed border-gray-100 rounded-3xl">
              <span className="text-xs font-bold text-gray-300 italic uppercase">No languages configured</span>
            </div>
          )}
        </div>

        {/* Add Language Tool */}
        {showAddLanguageForm && (
          <div className="bg-gray-50 rounded-[32px] p-8 border border-gray-100">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">Add New Language</h3>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={languageSearchTerm}
                  onChange={(e) => {
                    setLanguageSearchTerm(e.target.value);
                    setIsLanguageDropdownOpen(true);
                    setSelectedLanguageIndex(-1);
                  }}
                  onFocus={() => setIsLanguageDropdownOpen(true)}
                  placeholder="Ex: French, Spanish, Arabic..."
                  className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:ring-4 focus:ring-harx-500/5 transition-all"
                  disabled={loadingLanguages}
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2">
                  {loadingLanguages ? (
                    <RefreshCw className="w-4 h-4 text-harx-500 animate-spin" />
                  ) : (
                    <Globe className="w-4 h-4 text-gray-300" />
                  )}
                </div>

                {isLanguageDropdownOpen && !loadingLanguages && (
                  <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl max-h-60 overflow-auto scrollbar-hide py-2">
                    {filteredLanguages.length > 0 ? (
                      filteredLanguages.map((language, index) => (
                        <button
                          key={language._id}
                          type="button"
                          onClick={() => handleSelectLanguage(language)}
                          className={`w-full text-left px-5 py-3 transition-colors ${
                            index === selectedLanguageIndex ? 'bg-harx-50 text-harx-600' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-black">{language.name}</div>
                              <div className="text-[10px] font-bold text-gray-400 uppercase italic">{language.nativeName}</div>
                            </div>
                            <span className="text-[10px] font-black px-2 py-1 bg-gray-100 rounded-lg">{language.code}</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-5 py-4 text-xs font-bold text-gray-400 italic">No exact matches found</div>
                    )}
                  </div>
                )}
              </div>

              <div className="md:w-32">
                <select
                  value={tempLanguage.proficiency}
                  onChange={(e) => setTempLanguage((prev: any) => ({ ...prev, proficiency: e.target.value }))}
                  className="w-full px-4 py-4 bg-white border border-gray-100 rounded-2xl text-xs font-black uppercase tracking-widest outline-none transition-all"
                  disabled={loadingLanguages}
                >
                  {proficiencyLevels.map(level => (
                    <option key={level.value} value={level.value}>{level.value}</option>
                  ))}
                </select>
              </div>
            </div>
            {renderError(validationErrors.languages, 'languages')}
          </div>
        )}
      </div>
    </div>
  );
};
