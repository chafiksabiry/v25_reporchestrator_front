import React, { useState } from 'react';
import { Briefcase, Calendar, Plus, X, Pencil } from 'lucide-react';

interface ExperienceTabProps {
  profile: any;
  onAddItemClick: (item: {
    title: string;
    company: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }) => void;
  onUpdateItemClick: (index: number, item: {
    title: string;
    company: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }) => void;
  onDeleteItemClick: (index: number) => void;
}

export const ExperienceTab: React.FC<ExperienceTabProps> = ({ profile, onAddItemClick, onUpdateItemClick, onDeleteItemClick }) => {
  const [draft, setDraft] = useState({
    title: '',
    company: '',
    startDate: '',
    endDate: '',
    description: '',
  });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);

  const resetDraft = () => {
    setDraft({ title: '', company: '', startDate: '', endDate: '', description: '' });
  };

  const submitForm = () => {
    const title = draft.title.trim();
    const company = draft.company.trim();
    if (!title || !company) return;
    const payload = {
      title,
      company,
      startDate: draft.startDate || undefined,
      endDate: draft.endDate || undefined,
      description: draft.description.trim() || undefined,
    };
    if (editingIndex != null) {
      onUpdateItemClick(editingIndex, payload);
      setEditingIndex(null);
    } else {
      onAddItemClick(payload);
      setIsAddFormOpen(false);
    }
    resetDraft();
  };

  const dateForInput = (value: string | undefined) => {
    if (!value || value === 'present') return '';
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return '';
  };

  const formatDateToDD_MM_YYYY = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
    } catch (e) { return dateString; }
  };

  const renderExperienceForm = (mode: 'add' | 'edit') => (
    <div className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-white/70 p-3 md:grid-cols-2">
      <input
        value={draft.title}
        onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
        placeholder="Role / title"
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-harx-200"
      />
      <input
        value={draft.company}
        onChange={(e) => setDraft((p) => ({ ...p, company: e.target.value }))}
        placeholder="Company"
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-harx-200"
      />
      <input
        type="date"
        value={draft.startDate}
        onChange={(e) => setDraft((p) => ({ ...p, startDate: e.target.value }))}
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-harx-200"
      />
      <input
        type="date"
        value={draft.endDate}
        onChange={(e) => setDraft((p) => ({ ...p, endDate: e.target.value }))}
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-harx-200"
      />
      <input
        value={draft.description}
        onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submitForm();
          }
        }}
        placeholder={`Short description (optional) and press Enter to ${mode === 'edit' ? 'save' : 'save'}`}
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-harx-200 md:col-span-2"
      />
      <div className="md:col-span-2 flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={() => {
            if (mode === 'edit') setEditingIndex(null);
            if (mode === 'add') setIsAddFormOpen(false);
            resetDraft();
          }}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submitForm}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-harx text-white text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all"
        >
          Save
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Experience Summary */}
      <div className="bg-harx-alt-50/25 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-harx-alt-100/70">
        <h2 className="text-xl font-black text-harx-900 tracking-tight mb-5">Summary</h2>
        <div className="flex items-center gap-4 bg-slate-200/40 p-6 rounded-2xl border border-slate-200/30">
          <div className="p-3 bg-harx-100/80 rounded-xl text-harx-600">
            <Briefcase className="w-8 h-8" />
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900">
              {profile.professionalSummary?.yearsOfExperience || 0}+ Years
            </div>
            <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">
              Professional Experience
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Experience */}
      <div className="bg-harx-50/30 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-harx-100/70">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-harx-900 tracking-tight">Work History</h2>
          <button
            type="button"
            onClick={() => {
              setEditingIndex(null);
              resetDraft();
              setIsAddFormOpen((prev) => !prev);
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-harx-50 text-harx-700 border border-harx-100 text-xs font-black uppercase tracking-widest hover:bg-harx-100 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
        {isAddFormOpen && <div className="mb-6">{renderExperienceForm('add')}</div>}
        {profile.experience?.length > 0 ? (
          <div className="space-y-12 relative before:absolute before:inset-0 before:ml-4 before:-z-10 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-harx-200 before:to-transparent">
            {profile.experience.map((exp: any, index: number) => {
              const startDate = formatDateToDD_MM_YYYY(exp.startDate);
              const endDate = exp.endDate === 'present' ? 'Present' : exp.endDate ? formatDateToDD_MM_YYYY(exp.endDate) : 'Present';
              
              return (
                <div key={index} className="relative pl-12 group">
                  <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-slate-50 border-4 border-harx-300 group-hover:scale-110 transition-transform flex items-center justify-center shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-harx-500"></div>
                  </div>
                  
                  {editingIndex === index ? (
                    <div className="mb-2">
                      {renderExperienceForm('edit')}
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-black text-slate-900">{exp.title || exp.role}</h3>
                          <p className="text-harx-600 font-bold">{exp.company}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1 md:mt-0">
                          <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
                            <Calendar className="w-4 h-4" />
                            <span>{startDate} — {endDate}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddFormOpen(false);
                              setEditingIndex(index);
                              setDraft({
                                title: String(exp.title || exp.role || ''),
                                company: String(exp.company || ''),
                                startDate: dateForInput(exp.startDate),
                                endDate: dateForInput(exp.endDate),
                                description: String(exp.description || ''),
                              });
                            }}
                            className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                            title="Edit experience"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteItemClick(index)}
                            className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                            title="Delete experience"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {exp.description && (
                        <p className="text-slate-600 mt-4 leading-relaxed bg-slate-200/30 p-4 rounded-2xl border border-slate-200/30 italic">
                          "{exp.description}"
                        </p>
                      )}

                      {exp.responsibilities?.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Key Responsibilities</h4>
                          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {exp.responsibilities.map((r: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-slate-600 bg-slate-50/50 p-2 rounded-lg border border-slate-100/50">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-harx-300 flex-shrink-0"></span>
                                {r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-200/40 rounded-3xl border border-dashed border-slate-300">
            <p className="text-slate-500 font-medium">No experience history listed yet</p>
          </div>
        )}
      </div>
    </div>
  );
};
