import React, { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { fetchSkillsByType, Skill } from '../../../../services/api/skills';
import { repApiClient } from '../../../../utils/client';

interface SkillsTabProps {
  profile: any;
  formatSkillsForDisplay: (skillsData: any) => any[];
  findSkillData: (skillName: string) => any;
  takeContactCenterSkillAssessment: (skillName: string, categoryName?: string) => void;
  onEditItemClick: () => void;
  onDeleteSkill: (type: 'technical' | 'professional' | 'soft', index: number) => void;
  onAddSkill: (type: 'technical' | 'professional' | 'soft', skillId: string) => void;
  onAddSpecializationItem?: (section: 'industries' | 'activities', value: string) => void;
  onDeleteSpecializationItem?: (section: 'industries' | 'activities' | 'notableCompanies', index: number) => void;
}

const CONTACT_CENTER_SKILLS = [
  {
    name: "Communication",
    skills: ["Active Listening", "Clear Speech", "Empathy", "Tone Management"]
  },
  {
    name: "Problem Solving",
    skills: ["Issue Analysis", "Solution Finding", "Decision Making", "Resource Utilization"]
  },
  {
    name: "Customer Service",
    skills: ["Service Orientation", "Conflict Resolution", "Product Knowledge", "Quality Assurance"]
  }
];

export const SkillsTab: React.FC<SkillsTabProps> = ({ 
  profile, 
  formatSkillsForDisplay, 
  findSkillData,
  takeContactCenterSkillAssessment,
  onEditItemClick,
  onDeleteSkill,
  onAddSkill,
  onAddSpecializationItem,
  onDeleteSpecializationItem
}) => {
  const [availableSkills, setAvailableSkills] = useState<Record<'technical' | 'professional' | 'soft', Skill[]>>({
    technical: [],
    professional: [],
    soft: []
  });
  const [searchTermByType, setSearchTermByType] = useState<Record<'technical' | 'professional' | 'soft', string>>({
    technical: '',
    professional: '',
    soft: ''
  });
  const [dropdownOpenByType, setDropdownOpenByType] = useState<Record<'technical' | 'professional' | 'soft', boolean>>({
    technical: false,
    professional: false,
    soft: false
  });
  const [activityNameById, setActivityNameById] = useState<Record<string, string>>({});
  const [industryNameById, setIndustryNameById] = useState<Record<string, string>>({});
  const [allActivities, setAllActivities] = useState<Array<{ _id: string; name: string }>>([]);
  const [allIndustries, setAllIndustries] = useState<Array<{ _id: string; name: string }>>([]);
  const [ccAddOpenCategory, setCcAddOpenCategory] = useState<string | null>(null);
  const [ccSelectedOption, setCcSelectedOption] = useState<Record<string, string>>({});
  const technicalDropdownRef = useRef<HTMLDivElement | null>(null);
  const professionalDropdownRef = useRef<HTMLDivElement | null>(null);
  const softDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadSkills = async () => {
      try {
        const [technical, professional, soft] = await Promise.all([
          fetchSkillsByType('technical'),
          fetchSkillsByType('professional'),
          fetchSkillsByType('soft')
        ]);
        setAvailableSkills({
          technical: Object.values(technical || {}).flat(),
          professional: Object.values(professional || {}).flat(),
          soft: Object.values(soft || {}).flat()
        });
      } catch (error) {
        console.error('Error loading skills list in SkillsTab:', error);
      }
    };
    loadSkills();
  }, []);

  useEffect(() => {
    const loadSpecializationDictionaries = async () => {
      try {
        const [activitiesRes, industriesRes] = await Promise.all([
          repApiClient.get('/api/activities'),
          repApiClient.get('/api/industries')
        ]);
        const activities = activitiesRes?.data?.data || [];
        const industries = industriesRes?.data?.data || [];

        const activityMap = activities.reduce((acc: Record<string, string>, item: any) => {
          if (item?._id && item?.name) acc[String(item._id)] = String(item.name);
          return acc;
        }, {});
        const industryMap = industries.reduce((acc: Record<string, string>, item: any) => {
          if (item?._id && item?.name) acc[String(item._id)] = String(item.name);
          return acc;
        }, {});

        setActivityNameById(activityMap);
        setIndustryNameById(industryMap);
        setAllActivities(activities);
        setAllIndustries(industries);
      } catch (error) {
        console.error('Error loading activity/industry names in SkillsTab:', error);
      }
    };
    loadSpecializationDictionaries();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideAnyDropdown =
        technicalDropdownRef.current?.contains(target) ||
        professionalDropdownRef.current?.contains(target) ||
        softDropdownRef.current?.contains(target);

      if (!clickedInsideAnyDropdown) {
        setDropdownOpenByType({
          technical: false,
          professional: false,
          soft: false
        });
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const normalizeId = (raw: any): string | null => {
    if (!raw) return null;
    if (typeof raw === 'string') return raw;
    if (typeof raw === 'object' && typeof raw.$oid === 'string') return raw.$oid;
    if (typeof raw === 'object' && typeof raw._id === 'string') return raw._id;
    if (typeof raw === 'object' && typeof raw.id === 'string') return raw.id;
    return null;
  };

  const getCurrentSkillIds = (type: 'technical' | 'professional' | 'soft') =>
    new Set(
      (profile?.skills?.[type] || [])
        .map((item: any) => normalizeId(item?.skill) || normalizeId(item?._id))
        .filter((id: string | null): id is string => !!id)
    );

  const getFilteredSkills = (type: 'technical' | 'professional' | 'soft') => {
    const selectedIds = getCurrentSkillIds(type);
    const search = (searchTermByType[type] || '').trim().toLowerCase();
    return availableSkills[type].filter((skill) => {
      if (selectedIds.has(skill._id)) return false;
      if (!search) return true;
      return (
        skill.name.toLowerCase().includes(search) ||
        (skill.description || '').toLowerCase().includes(search)
      );
    });
  };

  const renderAddDropdown = (type: 'technical' | 'professional' | 'soft') => {
    const options = getFilteredSkills(type);
    return (
      <div className="mt-3 w-full">
        <input
          type="text"
          value={searchTermByType[type]}
          onChange={(e) => {
            setSearchTermByType((prev) => ({ ...prev, [type]: e.target.value }));
            setDropdownOpenByType((prev) => ({ ...prev, [type]: true }));
          }}
          onFocus={() => setDropdownOpenByType((prev) => ({ ...prev, [type]: true }))}
          onBlur={() => {
            setTimeout(() => {
              setDropdownOpenByType((prev) => ({ ...prev, [type]: false }));
            }, 180);
          }}
          placeholder={`Search and add ${type} skill...`}
          className={`w-full px-3 py-2.5 text-sm font-semibold border border-harx-100/80 bg-harx-50/40 text-harx-900 shadow-sm outline-none focus:ring-2 focus:ring-harx-200 ${
            dropdownOpenByType[type] ? 'rounded-t-xl rounded-b-none' : 'rounded-xl'
          }`}
        />
        {dropdownOpenByType[type] && (
          <div className="border border-t-0 border-harx-100/80 rounded-b-xl bg-white overflow-hidden">
          <div className="max-h-[126px] overflow-y-auto">
            {options.length > 0 ? (
              options.map((skill) => (
                <button
                  key={skill._id}
                  type="button"
                  onClick={() => {
                    onAddSkill(type, skill._id);
                    setDropdownOpenByType((prev) => ({ ...prev, [type]: false }));
                  }}
                  className="w-full text-left px-3 py-2.5 border-b border-harx-50 last:border-b-0 hover:bg-harx-50/60 transition-colors"
                >
                  <div className="text-sm font-bold text-harx-900">{skill.name}</div>
                  <div className="text-xs text-slate-500 truncate">{skill.description}</div>
                </button>
              ))
            ) : (
              <div className="px-3 py-3 text-xs text-slate-500">No more skills available for this section.</div>
            )}
          </div>
          </div>
        )}
      </div>
    );
  };

  const renderSkillChip = (
    type: 'technical' | 'professional' | 'soft',
    skill: any,
    idx: number,
    chipClassName: string
  ) => (
    <div
      key={`${skill?.name || 'skill'}-${idx}`}
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold border ${chipClassName}`}
    >
      <span>{skill.name}</span>
      <button
        type="button"
        onClick={() => onDeleteSkill(type, idx)}
        className="inline-flex items-center justify-center rounded-md p-0.5 hover:bg-slate-300/50 transition-colors"
        title="Delete this skill"
        aria-label={`Delete ${skill.name}`}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Skill Categories - Vertical Layout */}
      <div className="space-y-5">
        {/* Technical Skills */}
        <div className="bg-harx-50/30 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-harx-100/70">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-harx-900">Technical</h2>
          </div>
          <div className="flex flex-wrap gap-2 items-start content-start">
            {formatSkillsForDisplay(profile.skills?.technical).map((skill: any, idx: number) =>
              renderSkillChip('technical', skill, idx, 'bg-slate-200/50 text-slate-700 border-slate-200/30 italic')
            )}
          </div>
          <div ref={technicalDropdownRef}>
            {renderAddDropdown('technical')}
          </div>
        </div>

        {/* Professional Skills */}
        <div className="bg-harx-alt-50/30 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-harx-alt-100/70">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-harx-alt-900">Professional</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {formatSkillsForDisplay(profile.skills?.professional).map((skill: any, idx: number) =>
              renderSkillChip('professional', skill, idx, 'bg-slate-200/50 text-slate-700 border-slate-200/30')
            )}
          </div>
          <div ref={professionalDropdownRef}>
            {renderAddDropdown('professional')}
          </div>
        </div>

        {/* Soft Skills */}
        <div className="bg-harx-50/30 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-harx-100/70">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-harx-900">Soft Skills</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {formatSkillsForDisplay(profile.skills?.soft).map((skill: any, idx: number) =>
              renderSkillChip('soft', skill, idx, 'bg-slate-200/50 text-slate-700 border-slate-200/30')
            )}
          </div>
          <div ref={softDropdownRef}>
            {renderAddDropdown('soft')}
          </div>
        </div>
      </div>

      {/* Contact Center Skills Assessments */}
      <div className="bg-harx-alt-50/25 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-harx-alt-100/70">
        <h2 className="text-xl font-black text-harx-900 tracking-tight mb-6">Contact Center Assessments</h2>
        <div className="space-y-6">
          {[
            ...CONTACT_CENTER_SKILLS,
            {
              name: "Activities",
              skills: (profile.professionalSummary?.activities || [])
                .map((a: any) => {
                  if (typeof a === 'string') return activityNameById[a] || a;
                  if (a?.name) return a.name;
                  const activityId = normalizeId(a);
                  if (activityId) return activityNameById[String(activityId)] || '';
                  return '';
                })
                .filter((name: string) => !!name)
            },
            {
              name: "Industries",
              skills: (profile.professionalSummary?.industries || [])
                .map((i: any) => {
                  if (typeof i === 'string') return industryNameById[i] || i;
                  if (i?.name) return i.name;
                  const industryId = normalizeId(i);
                  if (industryId) return industryNameById[String(industryId)] || '';
                  return '';
                })
                .filter((name: string) => !!name)
            }
          ].filter(category => category.skills.length > 0).map((category) => (
            <div key={category.name} className="space-y-4">
              {(() => {
                const isBaseContactCategory =
                  category.name === 'Communication' ||
                  category.name === 'Problem Solving' ||
                  category.name === 'Customer Service';
                const isActivitiesCategory = category.name === 'Activities';
                const isIndustriesCategory = category.name === 'Industries';
                const isSpecializationCategory = isActivitiesCategory || isIndustriesCategory;

                const allContactCenterEntries = (profile.skills?.contactCenter || []) as any[];
                const categorySkillSet = new Set(category.skills.map((s: string) => s.toLowerCase()));
                const summaryActivities = (profile.professionalSummary?.activities || []).map((a: any) =>
                  String(typeof a === 'string' ? a : a?.name || a?._id || '').toLowerCase()
                );
                const summaryIndustries = (profile.professionalSummary?.industries || []).map((i: any) =>
                  String(typeof i === 'string' ? i : i?.name || i?._id || '').toLowerCase()
                );

                const selectedEntriesInCategory = allContactCenterEntries.filter((entry: any) => {
                  const entrySkill = String(entry?.skill || '');
                  const entryCategory = String(entry?.category || '');
                  const sameCategory = entryCategory.toLowerCase() === category.name.toLowerCase();
                  const belongsToPool = categorySkillSet.has(entrySkill.toLowerCase());
                  return sameCategory || belongsToPool;
                });

                const selectedInCategory = new Set(
                  selectedEntriesInCategory.map((entry: any) => String(entry?.skill || '').toLowerCase())
                );

                // Also consider already chosen values from specialization data.
                if (category.name === 'Activities') {
                  summaryActivities.forEach((name: string) => selectedInCategory.add(name));
                }
                if (category.name === 'Industries') {
                  summaryIndustries.forEach((name: string) => selectedInCategory.add(name));
                }

                let displayCategorySkills = selectedEntriesInCategory
                  .map((entry: any) => String(entry?.skill || '').trim())
                  .filter((name: string) => !!name);

                const specializationSource = isActivitiesCategory
                  ? (profile.professionalSummary?.activities || [])
                  : isIndustriesCategory
                    ? (profile.professionalSummary?.industries || [])
                    : [];

                const specializationItems = specializationSource.map((item: any, idx: number) => {
                  const itemId = normalizeId(item);
                  const itemName =
                    typeof item === 'string'
                      ? (isActivitiesCategory ? activityNameById[item] || item : industryNameById[item] || item)
                      : item?.name ||
                        (itemId
                          ? (isActivitiesCategory ? activityNameById[itemId] : industryNameById[itemId]) || ''
                          : '');
                  return {
                    idx,
                    name: String(itemName || '').trim()
                  };
                }).filter((entry: any) => !!entry.name);

                const addableSpecializationOptions = (isActivitiesCategory ? allActivities : allIndustries).filter((entry) => {
                  const selectedIds = new Set(
                    specializationSource
                      .map((item: any) => normalizeId(item))
                      .filter((id: string | null): id is string => !!id)
                  );
                  return !selectedIds.has(String(entry._id));
                });

                // If no assessment entries exist yet, show the category source list
                // (base catalog for contact-center categories, populated profile lists for activities/industries).
                if (displayCategorySkills.length === 0) {
                  displayCategorySkills = category.skills;
                  displayCategorySkills.forEach((name: string) => selectedInCategory.add(name.toLowerCase()));
                }

                return (
                  <>
              <div className="flex items-center justify-between border-b border-slate-200/30 pb-2">
                <h3 className="text-md font-bold text-slate-400 uppercase tracking-widest">{category.name}</h3>
                {isSpecializationCategory && (
                  <button
                    type="button"
                    onClick={() => setCcAddOpenCategory((prev) => (prev === category.name ? null : category.name))}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-harx-50 text-harx-700 border border-harx-100 text-xs font-black uppercase tracking-widest hover:bg-harx-100 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                )}
              </div>
              {isSpecializationCategory && ccAddOpenCategory === category.name && (
                <div className="mt-2">
                  <select
                    value={ccSelectedOption[category.name] || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCcSelectedOption((prev) => ({ ...prev, [category.name]: value }));
                      if (!value) return;
                      if (isActivitiesCategory) onAddSpecializationItem?.('activities', value);
                      if (isIndustriesCategory) onAddSpecializationItem?.('industries', value);
                      setCcSelectedOption((prev) => ({ ...prev, [category.name]: '' }));
                    }}
                    className="w-full px-3 py-2.5 text-sm font-semibold rounded-xl border border-harx-100/80 bg-white text-harx-900 shadow-sm outline-none focus:ring-2 focus:ring-harx-200"
                  >
                    <option value="">Select and add...</option>
                    {addableSpecializationOptions.map((option) => (
                      <option key={option._id} value={option._id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                {(isSpecializationCategory ? specializationItems.length > 0 : displayCategorySkills.length > 0) ? (isSpecializationCategory ? specializationItems : displayCategorySkills.map((name: string, idx: number) => ({ name, idx }))).map((entry: any, index: number) => {
                  const skillName = entry.name as string;
                  const skillData = findSkillData(skillName);
                  return (
                    <div key={`${skillName}-${index}`} className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-white/80 rounded-2xl border border-harx-100/60 hover:border-harx-300 transition-colors group">
                      <div className="space-y-1 mb-4 md:mb-0">
                        <h4 className="font-bold text-slate-900">{skillName}</h4>
                        {skillData?.assessmentResults ? (
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-black text-harx-500 uppercase">Score: {skillData.assessmentResults.score}/100</span>
                            <div className="flex gap-1">
                              {skillData.assessmentResults.keyMetrics && Object.entries(skillData.assessmentResults.keyMetrics).map(([key, val]: [string, any]) => (
                                <span key={key} title={key} className="w-2 h-2 rounded-full bg-harx-400 opacity-40"></span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-slate-400 italic">Not yet assessed</span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {isSpecializationCategory && (
                          <button
                            type="button"
                            onClick={() => {
                              if (isActivitiesCategory) onDeleteSpecializationItem?.('activities', entry.idx);
                              if (isIndustriesCategory) onDeleteSpecializationItem?.('industries', entry.idx);
                            }}
                            className="p-1.5 rounded-lg bg-harx-50 border border-harx-100 text-harx-700 hover:bg-harx-100 transition-colors"
                            title="Delete item"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => takeContactCenterSkillAssessment(skillName, category.name)}
                          className={`
                            px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all
                            ${skillData?.assessmentResults 
                              ? 'bg-harx-alt-50 text-harx-alt-700 border border-harx-alt-100 hover:bg-harx-alt-100' 
                              : 'bg-gradient-harx text-white hover:opacity-90 shadow-xl shadow-harx-500/20'}
                          `}
                        >
                          {skillData?.assessmentResults ? 'Retake' : 'Take Assessment'}
                        </button>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="px-4 py-3 rounded-xl bg-white/70 border border-harx-100/60 text-xs font-semibold text-slate-500">
                    No skills selected in this category yet.
                  </div>
                )}
              </div>
                  </>
                );
              })()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
