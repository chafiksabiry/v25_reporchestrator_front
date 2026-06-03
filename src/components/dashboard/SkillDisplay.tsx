import React, { useState, useEffect } from 'react';
import { fetchSkillsByIds, Skill, SkillType } from '../../services/api/skills';

interface SkillRef {
  skill: string; // ObjectId reference
  level: number;
  details?: string;
}

interface SkillDisplayProps {
  skillType: SkillType;
  skills: SkillRef[];
  colorScheme?: 'blue' | 'green' | 'purple';
}

const SkillDisplay: React.FC<SkillDisplayProps> = ({ 
  skillType, 
  skills, 
  colorScheme = 'blue' 
}) => {
  const [skillsWithNames, setSkillsWithNames] = useState<Array<SkillRef & { name: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSkillNames = async () => {
      if (!skills || skills.length === 0) {
        setSkillsWithNames([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const skillIds = skills.map(s => s.skill);
        const fetchedSkills = await fetchSkillsByIds(skillIds, skillType);
        
        const skillsWithNames = skills.map(skillRef => {
          const skillData = fetchedSkills.find(s => s._id === skillRef.skill);
          return {
            ...skillRef,
            name: skillData?.name || 'Unknown Skill'
          };
        });

        setSkillsWithNames(skillsWithNames);
      } catch (error) {
        console.error('Error fetching skill names:', error);
        // Fallback to display skill IDs
        const fallbackSkills = skills.map(skillRef => ({
          ...skillRef,
          name: skillRef.skill
        }));
        setSkillsWithNames(fallbackSkills);
      } finally {
        setLoading(false);
      }
    };

    fetchSkillNames();
  }, [skills, skillType]);

  const getColorClasses = (colorScheme: string) => {
    switch (colorScheme) {
      case 'green':
        return 'bg-green-100 text-green-800';
      case 'purple':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getLevelText = (level: number) => {
    switch (level) {
      case 0: return 'No Experience';
      case 1: return 'Beginner';
      case 2: return 'Basic';
      case 3: return 'Intermediate';
      case 4: return 'Advanced';
      case 5: return 'Expert';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="flex flex-wrap gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-6 bg-gray-200 rounded-full w-24"></div>
          ))}
        </div>
      </div>
    );
  }

  if (skillsWithNames.length === 0) {
    return <p className="text-gray-500 italic">No skills listed</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {skillsWithNames.map((skillRef, idx) => (
        <div key={idx} className={`px-3 py-1 rounded-full text-sm ${getColorClasses(colorScheme)}`}>
          <div className="flex items-center gap-1">
            <span className="font-medium">{skillRef.name}</span>
            <span className="text-xs opacity-75">
              Lv.{skillRef.level} ({getLevelText(skillRef.level)})
            </span>
          </div>
          {skillRef.details && (
            <div className="text-xs mt-1 opacity-75">
              {skillRef.details}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default SkillDisplay; 