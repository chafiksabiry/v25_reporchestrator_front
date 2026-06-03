import React from 'react';
import { X, Video, Play, Square, RotateCcw, Trash2, Calendar, Plus } from 'lucide-react';
import { Industry, Activity } from '../../../../ProfileEditView';

interface EditSpecializationTabProps {
  profile: any;
  setProfile: (profile: any) => void;
  setModifiedSections: (modified: any) => void;
  industriesData: Industry[];
  activitiesData: Activity[];
  renderIndustryDropdown: () => React.ReactNode;
  renderActivityDropdown: () => React.ReactNode;
  tempCompany: string;
  setTempCompany: (c: string) => void;
}

export const EditSpecializationTab: React.FC<EditSpecializationTabProps> = ({
  profile,
  setProfile,
  setModifiedSections,
  industriesData,
  activitiesData,
  renderIndustryDropdown,
  renderActivityDropdown,
  tempCompany,
  setTempCompany,
}) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Industries & Activities Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Industries */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-black text-gray-900 tracking-tight mb-5">Primary Industries</h2>
          <div className="flex flex-wrap gap-2 mb-6 min-h-[40px]">
            {profile.professionalSummary?.industries?.map((industryItem: any, index: number) => {
              const industryId = typeof industryItem === 'string' ? industryItem : industryItem._id;
              const industryName = typeof industryItem === 'string' 
                ? (industriesData.find(ind => ind._id === industryItem)?.name || industryItem)
                : (industryItem.name || industryId);
              
              return (
                <div key={index} className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-xl text-indigo-700 border border-indigo-100 group transition-all hover:bg-indigo-600 hover:text-white">
                  <span className="text-xs font-black uppercase tracking-tighter italic">{industryName}</span>
                  <button onClick={() => {
                    const updated = [...(profile.professionalSummary?.industries || [])];
                    updated.splice(index, 1);
                    setProfile((prev: any) => ({ ...prev, professionalSummary: { ...prev.professionalSummary, industries: updated } }));
                    setModifiedSections((prev: any) => ({ ...prev, professionalSummary: true }));
                  }} className="transition-transform group-hover:scale-110">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
          {renderIndustryDropdown()}
        </div>

        {/* Activities */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-black text-gray-900 tracking-tight mb-5">Professional Activities</h2>
          <div className="flex flex-wrap gap-2 mb-6 min-h-[40px]">
            {profile.professionalSummary?.activities?.map((activityItem: any, index: number) => {
              const activityId = typeof activityItem === 'string' ? activityItem : activityItem._id;
              const activityName = typeof activityItem === 'string' 
                ? (activitiesData.find(act => act._id === activityItem)?.name || activityItem)
                : (activityItem.name || activityId);
              
              return (
                <div key={index} className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-xl text-emerald-700 border border-emerald-100 group transition-all hover:bg-emerald-600 hover:text-white">
                  <span className="text-xs font-black uppercase tracking-tighter italic">{activityName}</span>
                  <button onClick={() => {
                    const updated = [...(profile.professionalSummary?.activities || [])];
                    updated.splice(index, 1);
                    setProfile((prev: any) => ({ ...prev, professionalSummary: { ...prev.professionalSummary, activities: updated } }));
                    setModifiedSections((prev: any) => ({ ...prev, professionalSummary: true }));
                  }} className="transition-transform group-hover:scale-110">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
          {renderActivityDropdown()}
        </div>
      </div>

      {/* Notable Companies */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-black text-gray-900 tracking-tight mb-5">Notable Companies Worked For</h2>
        <div className="flex flex-wrap gap-3 mb-6">
          {profile.professionalSummary?.notableCompanies?.map((company: string, index: number) => (
            <div key={index} className="flex items-center gap-2 px-5 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-gray-900 font-bold group hover:border-harx-400 transition-colors">
              <span className="text-sm">{company}</span>
              <button onClick={() => {
                const updated = [...(profile.professionalSummary?.notableCompanies || [])];
                updated.splice(index, 1);
                setProfile((prev: any) => ({ ...prev, professionalSummary: { ...prev.professionalSummary, notableCompanies: updated } }));
                setModifiedSections((prev: any) => ({ ...prev, professionalSummary: true }));
              }} className="text-gray-300 hover:text-rose-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        
        <div className="flex gap-2 max-w-md">
          <input
            type="text"
            value={tempCompany}
            onChange={(e) => setTempCompany(e.target.value)}
            className="flex-1 px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:border-harx-500 transition-all"
            placeholder="Add company name..."
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                const btn = e.currentTarget.nextSibling as HTMLButtonElement;
                btn?.click();
              }
            }}
          />
          <button
            onClick={() => {
              if (tempCompany.trim()) {
                const updated = [...(profile.professionalSummary?.notableCompanies || []), tempCompany.trim()];
                setProfile((prev: any) => ({ ...prev, professionalSummary: { ...prev.professionalSummary, notableCompanies: updated } }));
                setModifiedSections((prev: any) => ({ ...prev, professionalSummary: true }));
                setTempCompany('');
              }
            }}
            className="px-6 py-3 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:shadow-xl transition-all active:scale-95"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
};
