import React from 'react';
import { Plus, Trash2, Edit, Calendar, Briefcase, RefreshCw, X } from 'lucide-react';

interface EditExperienceTabProps {
  profile: any;
  setProfile: (profile: any) => void;
  setModifiedSections: (modified: any) => void;
  formatDate: (date: string | undefined) => string;
  loading: boolean;
  
  // Experience Form State
  showNewExperienceForm: boolean;
  setShowNewExperienceForm: (show: boolean) => void;
  newExperience: any;
  setNewExperience: (exp: any) => void;
  editingExperienceId: number | null;
  setEditingExperienceId: (id: number | null) => void;
  startEditingExperience: (index: number) => void;
  saveEditedExperience: () => void;
}

export const EditExperienceTab: React.FC<EditExperienceTabProps> = ({
  profile,
  setProfile,
  setModifiedSections,
  formatDate,
  loading,
  showNewExperienceForm,
  setShowNewExperienceForm,
  newExperience,
  setNewExperience,
  editingExperienceId,
  setEditingExperienceId,
  startEditingExperience,
  saveEditedExperience
}) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Experience Summary */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-black text-gray-900 tracking-tight mb-5">Professional Summary</h2>
        <div className="max-w-xs">
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">Total Years of Experience</label>
          <div className="relative">
            <input
              type="text"
              value={profile.professionalSummary?.yearsOfExperience || ''}
              onChange={(e) => {
                setProfile((prev: any) => ({
                  ...prev,
                  professionalSummary: {
                    ...prev.professionalSummary,
                    yearsOfExperience: e.target.value
                  }
                }));
                setModifiedSections((prev: any) => ({ ...prev, professionalSummary: true }));
              }}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-harx-500/20 focus:border-harx-500 transition-all outline-none"
              placeholder="e.g. 5"
            />
            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Work History Section */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Work History</h2>
          <button
            onClick={() => setShowNewExperienceForm(!showNewExperienceForm)}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:shadow-xl transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Add Position
          </button>
        </div>

        {/* Form Overlay/Modal-style inside the card */}
        {showNewExperienceForm && (
          <div className="mb-10 p-8 bg-gray-50 border border-gray-100 rounded-[32px] shadow-inner animate-in zoom-in-95 duration-300">
            <h3 className="text-lg font-black text-gray-900 mb-6">
              {editingExperienceId !== null ? 'Edit Professional Experience' : 'New Experience Entry'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">Job Title</label>
                <input
                  type="text"
                  value={newExperience.title}
                  onChange={(e) => setNewExperience((prev: any) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-harx-500/20"
                  placeholder="e.g. Customer Support Specialist"
                />
              </div>
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">Company Name</label>
                <input
                  type="text"
                  value={newExperience.company}
                  onChange={(e) => setNewExperience((prev: any) => ({ ...prev, company: e.target.value }))}
                  className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-harx-500/20"
                  placeholder="e.g. Harx Technologies"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">Start Date</label>
                <input
                  type="date"
                  value={newExperience.startDate}
                  onChange={(e) => setNewExperience((prev: any) => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 outline-none"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 block">End Date</label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={newExperience.isPresent}
                      onChange={(e) => setNewExperience((prev: any) => ({ 
                        ...prev, 
                        isPresent: e.target.checked,
                        endDate: e.target.checked ? '' : prev.endDate 
                      }))}
                      className="w-4 h-4 rounded border-gray-300 text-harx-600 focus:ring-harx-500"
                    />
                    <span className="text-[10px] font-black text-gray-400 uppercase group-hover:text-gray-600">Currently Work Here</span>
                  </label>
                </div>
                <input
                  type="date"
                  value={newExperience.endDate}
                  onChange={(e) => setNewExperience((prev: any) => ({ ...prev, endDate: e.target.value }))}
                  disabled={newExperience.isPresent}
                  className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 outline-none disabled:opacity-40"
                />
              </div>
            </div>
            
            <div className="mb-8">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">Key Responsibilities</label>
              <div className="space-y-3">
                {newExperience.responsibilities.map((responsibility: string, index: number) => (
                  <div key={index} className="flex gap-3">
                    <input
                      type="text"
                      value={responsibility}
                      onChange={(e) => {
                        const updated = [...newExperience.responsibilities];
                        updated[index] = e.target.value;
                        setNewExperience((prev: any) => ({ ...prev, responsibilities: updated }));
                      }}
                      className="flex-1 px-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 outline-none"
                      placeholder={`Detail ${index + 1}...`}
                    />
                    <button
                      onClick={() => {
                        if (newExperience.responsibilities.length > 1) {
                          const updated = [...newExperience.responsibilities];
                          updated.splice(index, 1);
                          setNewExperience((prev: any) => ({ ...prev, responsibilities: updated }));
                        }
                      }}
                      className="p-3 text-rose-300 hover:text-rose-500 transition-colors"
                      disabled={newExperience.responsibilities.length <= 1}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setNewExperience((prev: any) => ({
                  ...prev,
                  responsibilities: [...prev.responsibilities, '']
                }))}
                className="mt-3 flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1 hover:text-indigo-800"
              >
                <Plus className="w-3 h-3" />
                Add Achievement or Detail
              </button>
            </div>
            
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowNewExperienceForm(false);
                  setEditingExperienceId(null);
                  setNewExperience({ title: '', company: '', startDate: '', endDate: '', responsibilities: [''], isPresent: false });
                }}
                className="px-6 py-3 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (editingExperienceId !== null) {
                    saveEditedExperience();
                  } else {
                    const newExp = {
                      title: newExperience.title,
                      company: newExperience.company,
                      startDate: newExperience.startDate,
                      endDate: newExperience.isPresent ? 'present' : newExperience.endDate,
                      responsibilities: newExperience.responsibilities.filter((r: string) => r.trim())
                    };
                    const updated = [...(profile.experience || []), newExp];
                    setProfile((prev: any) => ({ ...prev, experience: updated }));
                    setModifiedSections((prev: any) => ({ ...prev, experience: true }));
                    setShowNewExperienceForm(false);
                    setNewExperience({ title: '', company: '', startDate: '', endDate: '', responsibilities: [''], isPresent: false });
                  }
                }}
                className="px-8 py-3 bg-harx-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:shadow-xl hover:bg-harx-700 transition-all disabled:opacity-50"
                disabled={!newExperience.title || !newExperience.company || !newExperience.startDate || loading}
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : editingExperienceId !== null ? 'Update Position' : 'Save Position'}
              </button>
            </div>
          </div>
        )}

        {/* Existing Positions List */}
        <div className="space-y-6">
          {profile.experience?.length > 0 ? (
            profile.experience.map((exp: any, index: number) => (
              <div key={index} className="group relative pl-8 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-indigo-50 hover:before:bg-harx-500 transition-all p-5 rounded-3xl hover:bg-gray-50/50">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-black text-gray-900">{exp.title}</h3>
                    <p className="text-harx-600 font-bold">{exp.company}</p>
                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-tighter mt-1 italic">
                      <Calendar className="w-3 h-3" />
                      {exp.startDate ? formatDate(exp.startDate) : '---'} — {exp.endDate === 'present' ? 'Present' : exp.endDate ? formatDate(exp.endDate) : 'Present'}
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEditingExperience(index)} className="p-2 bg-white text-harx-600 rounded-xl shadow-sm border border-gray-100 hover:bg-harx-50">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => {
                      const updated = [...profile.experience];
                      updated.splice(index, 1);
                      setProfile((prev: any) => ({ ...prev, experience: updated }));
                      setModifiedSections((prev: any) => ({ ...prev, experience: true }));
                    }} className="p-2 bg-white text-rose-500 rounded-xl shadow-sm border border-gray-100 hover:bg-rose-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {exp.responsibilities?.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {exp.responsibilities.map((r: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-gray-50 text-[11px] font-bold text-gray-600 italic">
                        <div className="w-1.5 h-1.5 bg-gray-200 rounded-full mt-1.5 flex-shrink-0"></div>
                        {r}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="py-20 text-center border-4 border-dashed border-gray-50 rounded-[40px]">
              <Briefcase className="w-16 h-16 text-gray-100 mx-auto mb-4" />
              <p className="text-sm font-bold text-gray-400 italic">No professional history documented yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
