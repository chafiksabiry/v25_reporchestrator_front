import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Skill, SkillsByCategory, SkillType } from '../../services/api/skills';

interface SkillRef {
  skill: string; // ObjectId reference
  level: number;
  details?: string;
}

interface SkillSelectorProps {
  skillType: SkillType;
  title: string;
  skillsByCategory: SkillsByCategory;
  selectedSkills: SkillRef[];
  onSkillsChange: (skills: SkillRef[]) => void;
  loading?: boolean;
}

const SkillSelector: React.FC<SkillSelectorProps> = ({
  skillType,
  title,
  skillsByCategory,
  selectedSkills,
  onSkillsChange,
  loading = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Get all skills as a flat array for easier lookup
  const allSkills = Object.values(skillsByCategory).flat();

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const addSkill = (skill: Skill) => {
    // Check if skill is already selected
    const isAlreadySelected = selectedSkills.some(s => s.skill === skill._id);
    if (!isAlreadySelected) {
      const newSkill: SkillRef = {
        skill: skill._id,
        level: 3, // Default level
        details: ''
      };
      onSkillsChange([...selectedSkills, newSkill]);
    }
  };

  const removeSkill = (skillId: string) => {
    onSkillsChange(selectedSkills.filter(s => s.skill !== skillId));
  };

  const updateSkillLevel = (skillId: string, level: number) => {
    onSkillsChange(
      selectedSkills.map(s => 
        s.skill === skillId ? { ...s, level } : s
      )
    );
  };

  const updateSkillDetails = (skillId: string, details: string) => {
    onSkillsChange(
      selectedSkills.map(s => 
        s.skill === skillId ? { ...s, details } : s
      )
    );
  };

  const getSkillName = (skillId: string): string => {
    const skill = allSkills.find(s => s._id === skillId);
    return skill?.name || 'Unknown Skill';
  };

  const isSkillSelected = (skillId: string): boolean => {
    return selectedSkills.some(s => s.skill === skillId);
  };

  if (loading) {
    return (
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {title}
        </label>
        <div className="animate-pulse bg-gray-200 h-10 rounded-md"></div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {title}
      </label>
      
      {/* Selected Skills Display */}
      {selectedSkills.length > 0 && (
        <div className="mb-4 space-y-3">
          {selectedSkills.map((skillRef) => (
            <div key={skillRef.skill} className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-blue-900">
                  {getSkillName(skillRef.skill)}
                </span>
                <button
                  onClick={() => removeSkill(skillRef.skill)}
                  className="text-red-500 hover:text-red-700"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 mb-1">
                    Level (0-5)
                  </label>
                  <select
                    value={skillRef.level}
                    onChange={(e) => updateSkillLevel(skillRef.skill, parseInt(e.target.value))}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>0 - No Experience</option>
                    <option value={1}>1 - Beginner</option>
                    <option value={2}>2 - Basic</option>
                    <option value={3}>3 - Intermediate</option>
                    <option value={4}>4 - Advanced</option>
                    <option value={5}>5 - Expert</option>
                  </select>
                </div>
                
                <div className="flex-2">
                  <label className="block text-xs text-gray-600 mb-1">
                    Details (optional)
                  </label>
                  <input
                    type="text"
                    value={skillRef.details || ''}
                    onChange={(e) => updateSkillDetails(skillRef.skill, e.target.value)}
                    placeholder="Additional details..."
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Skills Dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <span className="flex items-center">
            <PlusIcon className="h-4 w-4 mr-2" />
            Add {title}
          </span>
          {isOpen ? (
            <ChevronUpIcon className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 text-gray-400" />
          )}
        </button>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {Object.entries(skillsByCategory).map(([category, skills]) => (
              <div key={category} className="border-b border-gray-100 last:border-b-0">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between font-medium text-gray-700"
                >
                  <span>{category}</span>
                  {expandedCategories.has(category) ? (
                    <ChevronUpIcon className="h-4 w-4" />
                  ) : (
                    <ChevronDownIcon className="h-4 w-4" />
                  )}
                </button>
                
                {expandedCategories.has(category) && (
                  <div className="pl-4 pb-2">
                    {skills.map((skill) => (
                      <button
                        key={skill._id}
                        onClick={() => addSkill(skill)}
                        disabled={isSkillSelected(skill._id)}
                        className={`w-full text-left px-2 py-1 rounded text-sm ${
                          isSkillSelected(skill._id)
                            ? 'bg-green-100 text-green-800 cursor-not-allowed'
                            : 'hover:bg-blue-50 text-gray-700'
                        }`}
                      >
                        <div className="font-medium">{skill.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{skill.description}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillSelector; 