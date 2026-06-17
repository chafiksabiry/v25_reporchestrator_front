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
                  onMouseDown={(e) => {
                    // Fire before the input's onBlur closes the dropdown, and
                    // keep focus so the whole row is reliably clickable.
                    e.preventDefault();
                    onAddSkill(type, skill._id);
                    setSearchTermByType((prev) => ({ ...prev, [type]: '' }));
                    setDropdownOpenByType((prev) => ({ ...prev, [type]: false }));
                  }}
                  className="block w-full text-left px-3 py-2.5 border-b border-harx-50 last:border-b-0 hover:bg-harx-50/60 transition-colors cursor-pointer"
                >
                  <div className="text-sm font-bold text-harx-900 pointer-events-none">{skill.name}</div>
                  <div className="text-xs text-slate-500 truncate pointer-events-none">{skill.description}</div>
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
    </div>
  );
};
