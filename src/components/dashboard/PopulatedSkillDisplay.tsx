import React from 'react';

interface PopulatedSkill {
  _id?: string;
  name: string;
  description?: string;
  category?: string;
  level?: number;
  details?: string;
}

interface PopulatedSkillDisplayProps {
  skills: PopulatedSkill[];
  colorScheme?: 'blue' | 'green' | 'purple';
}

const PopulatedSkillDisplay: React.FC<PopulatedSkillDisplayProps> = ({ 
  skills, 
  colorScheme = 'blue' 
}) => {
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
      default: return 'Intermediate';
    }
  };

  if (!skills || skills.length === 0) {
    return <p className="text-gray-500 italic">No skills listed</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((skill, idx) => (
        <div 
          key={skill._id || idx} 
          className={`px-3 py-1 rounded-full text-sm ${getColorClasses(colorScheme)}`}
          title={skill.description || skill.name}
        >
          <div className="flex items-center gap-1">
            <span className="font-medium">{skill.name}</span>
            {skill.level !== undefined && (
              <span className="text-xs opacity-75">
                Lv.{skill.level} ({getLevelText(skill.level)})
              </span>
            )}
          </div>
          {skill.details && (
            <div className="text-xs mt-1 opacity-75">
              {skill.details}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default PopulatedSkillDisplay; 