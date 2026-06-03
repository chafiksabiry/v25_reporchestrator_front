import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { repApiClient } from '../../../../utils/client';

interface SpecializationTabProps {
  profile: any;
  onDeleteItemClick: (section: 'industries' | 'activities' | 'notableCompanies', index: number) => void;
  onAddItemClick: (section: 'industries' | 'activities' | 'notableCompanies', value: string) => void;
}

export const SpecializationTab: React.FC<SpecializationTabProps> = ({ profile, onDeleteItemClick, onAddItemClick }) => {
  const [allIndustries, setAllIndustries] = useState<Array<{ _id: string; name: string }>>([]);
  const [allActivities, setAllActivities] = useState<Array<{ _id: string; name: string }>>([]);
  const [industrySearch, setIndustrySearch] = useState('');
  const [activitySearch, setActivitySearch] = useState('');
  const [industryOpen, setIndustryOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [notableCompanyInput, setNotableCompanyInput] = useState('');
  const industryRef = useRef<HTMLDivElement | null>(null);
  const activityRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [industryRes, activityRes] = await Promise.all([
          repApiClient.get('/api/industries'),
          repApiClient.get('/api/activities')
        ]);
        setAllIndustries(industryRes?.data?.data || []);
        setAllActivities(activityRes?.data?.data || []);
      } catch (error) {
        console.error('Error loading industries/activities options:', error);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (industryRef.current && !industryRef.current.contains(target)) setIndustryOpen(false);
      if (activityRef.current && !activityRef.current.contains(target)) setActivityOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedIndustryIds = useMemo(() => new Set(
    (profile.professionalSummary?.industries || []).map((ind: any) => String(typeof ind === 'string' ? ind : ind?._id || ''))
  ), [profile.professionalSummary?.industries]);

  const selectedActivityIds = useMemo(() => new Set(
    (profile.professionalSummary?.activities || []).map((act: any) => String(typeof act === 'string' ? act : act?._id || ''))
  ), [profile.professionalSummary?.activities]);

  const filteredIndustries = useMemo(() => {
    const search = industrySearch.trim().toLowerCase();
    return allIndustries.filter((ind) => {
      if (selectedIndustryIds.has(String(ind._id))) return false;
      if (!search) return true;
      return (ind.name || '').toLowerCase().includes(search);
    });
  }, [allIndustries, selectedIndustryIds, industrySearch]);

  const filteredActivities = useMemo(() => {
    const search = activitySearch.trim().toLowerCase();
    return allActivities.filter((act) => {
      if (selectedActivityIds.has(String(act._id))) return false;
      if (!search) return true;
      return (act.name || '').toLowerCase().includes(search);
    });
  }, [allActivities, selectedActivityIds, activitySearch]);

  const renderEditableBadge = (
    label: string,
    className: string,
    key: string,
    section: 'industries' | 'activities' | 'notableCompanies',
    idx: number
  ) => (
    <div key={key} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border shadow-sm transition-all hover:scale-105 ${className}`}>
      <span>{label}</span>
      <button
        type="button"
        onClick={() => onDeleteItemClick(section, idx)}
        className="p-0.5 rounded-md hover:bg-white/50 transition-colors"
        title="Delete item"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Industries Section */}
      <div className="bg-harx-50/30 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-harx-100/70">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-harx-900 tracking-tight">Primary Industries</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {profile.professionalSummary?.industries?.length > 0 ? (
            profile.professionalSummary.industries.map((ind: any, idx: number) =>
              renderEditableBadge(
                typeof ind === 'string' ? ind : ind.name || ind._id,
                'bg-harx-50/80 text-harx-600 border-harx-100 shadow-harx-500/5',
                `industry-${idx}`,
                'industries',
                idx
              )
            )
          ) : (
            <p className="text-slate-500 italic">No industries specified</p>
          )}
        </div>
        <div ref={industryRef} className="mt-4">
          <input
            type="text"
            value={industrySearch}
            onChange={(e) => {
              setIndustrySearch(e.target.value);
              setIndustryOpen(true);
            }}
            onFocus={() => setIndustryOpen(true)}
            placeholder="Search and add industry..."
            className={`w-full px-3 py-2.5 text-sm font-semibold border border-harx-100/80 bg-harx-50/40 text-harx-900 shadow-sm outline-none focus:ring-2 focus:ring-harx-200 ${industryOpen ? 'rounded-t-xl rounded-b-none' : 'rounded-xl'}`}
          />
          {industryOpen && (
            <div className="border border-t-0 border-harx-100/80 rounded-b-xl bg-white overflow-hidden">
              <div className="max-h-[126px] overflow-y-auto">
                {filteredIndustries.length > 0 ? filteredIndustries.map((industry) => (
                  <button
                    key={industry._id}
                    type="button"
                    onClick={() => {
                      onAddItemClick('industries', industry._id);
                      setIndustrySearch('');
                      setIndustryOpen(false);
                    }}
                    className="w-full text-left px-3 py-2.5 border-b border-harx-50 last:border-b-0 hover:bg-harx-50/60 transition-colors"
                  >
                    <div className="text-sm font-bold text-harx-900">{industry.name}</div>
                  </button>
                )) : (
                  <div className="px-3 py-3 text-xs text-slate-500">No more industries available.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Activities Section */}
      <div className="bg-harx-alt-50/25 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-harx-alt-100/70">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-harx-alt-900 tracking-tight">Professional Activities</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {profile.professionalSummary?.activities?.length > 0 ? (
            profile.professionalSummary.activities.map((act: any, idx: number) =>
              renderEditableBadge(
                typeof act === 'string' ? act : act.name || act._id,
                'bg-harx-alt-50/80 text-harx-alt-600 border-harx-alt-100 shadow-harx-alt-500/5',
                `activity-${idx}`,
                'activities',
                idx
              )
            )
          ) : (
            <p className="text-slate-500 italic">No activities specified</p>
          )}
        </div>
        <div ref={activityRef} className="mt-4">
          <input
            type="text"
            value={activitySearch}
            onChange={(e) => {
              setActivitySearch(e.target.value);
              setActivityOpen(true);
            }}
            onFocus={() => setActivityOpen(true)}
            placeholder="Search and add activity..."
            className={`w-full px-3 py-2.5 text-sm font-semibold border border-harx-alt-100/80 bg-harx-alt-50/40 text-harx-alt-900 shadow-sm outline-none focus:ring-2 focus:ring-harx-alt-200 ${activityOpen ? 'rounded-t-xl rounded-b-none' : 'rounded-xl'}`}
          />
          {activityOpen && (
            <div className="border border-t-0 border-harx-alt-100/80 rounded-b-xl bg-white overflow-hidden">
              <div className="max-h-[126px] overflow-y-auto">
                {filteredActivities.length > 0 ? filteredActivities.map((activity) => (
                  <button
                    key={activity._id}
                    type="button"
                    onClick={() => {
                      onAddItemClick('activities', activity._id);
                      setActivitySearch('');
                      setActivityOpen(false);
                    }}
                    className="w-full text-left px-3 py-2.5 border-b border-harx-alt-50 last:border-b-0 hover:bg-harx-alt-50/60 transition-colors"
                  >
                    <div className="text-sm font-bold text-harx-alt-900">{activity.name}</div>
                  </button>
                )) : (
                  <div className="px-3 py-3 text-xs text-slate-500">No more activities available.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notable Companies */}
      <div className="bg-harx-50/30 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-harx-100/70">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-harx-900 tracking-tight">Notable Companies Worked For</h2>
          <button
            type="button"
            onClick={() => {
              const value = notableCompanyInput.trim();
              if (!value) return;
              onAddItemClick('notableCompanies', value);
              setNotableCompanyInput('');
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-harx-50 text-harx-700 border border-harx-100 text-xs font-black uppercase tracking-widest hover:bg-harx-100 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          {profile.professionalSummary?.notableCompanies?.length > 0 ? (
            profile.professionalSummary.notableCompanies.map((company: string, idx: number) => (
              renderEditableBadge(
                company,
                'bg-slate-50 text-slate-700 border-slate-100',
                `company-${idx}`,
                'notableCompanies',
                idx
              )
            ))
          ) : (
            <p className="text-slate-500 italic">No notable companies specified</p>
          )}
        </div>
        <div className="mt-4">
          <input
            type="text"
            value={notableCompanyInput}
            onChange={(e) => setNotableCompanyInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const value = notableCompanyInput.trim();
                if (!value) return;
                onAddItemClick('notableCompanies', value);
                setNotableCompanyInput('');
              }
            }}
            placeholder="Type company name and press Enter..."
            className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold border border-harx-100/80 bg-harx-50/40 text-harx-900 shadow-sm outline-none focus:ring-2 focus:ring-harx-200"
          />
        </div>
      </div>
    </div>
  );
};
