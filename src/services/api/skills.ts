import { repApiClient } from '../../utils/client';

export interface Skill {
  _id: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SkillsByCategory {
  [category: string]: Skill[];
}

export interface SkillsResponse {
  success: boolean;
  data: SkillsByCategory;
  message: string;
}

export type SkillType = 'technical' | 'professional' | 'soft';

/**
 * Fetch skills grouped by category for a specific skill type
 */
export const fetchSkillsByType = async (skillType: SkillType): Promise<SkillsByCategory> => {
  try {
    const response = await repApiClient.get<SkillsResponse>(`/api/skills/${skillType}/grouped`);
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching ${skillType} skills:`, error);
    throw error;
  }
};

/**
 * Fetch all skill types (technical, professional, soft) in parallel
 */
export const fetchAllSkills = async (): Promise<{
  technical: SkillsByCategory;
  professional: SkillsByCategory;
  soft: SkillsByCategory;
}> => {
  try {
    const [technical, professional, soft] = await Promise.all([
      fetchSkillsByType('technical'),
      fetchSkillsByType('professional'),
      fetchSkillsByType('soft')
    ]);

    return {
      technical,
      professional,
      soft
    };
  } catch (error) {
    console.error('Error fetching all skills:', error);
    throw error;
  }
};

/**
 * Get a flat list of skills from grouped skills data
 */
export const flattenSkills = (skillsByCategory: SkillsByCategory): Skill[] => {
  return Object.values(skillsByCategory).flat();
};

/**
 * Find a skill by ID from grouped skills data
 */
export const findSkillById = (skillsByCategory: SkillsByCategory, skillId: string): Skill | undefined => {
  const allSkills = flattenSkills(skillsByCategory);
  return allSkills.find(skill => skill._id === skillId);
};

/**
 * Fetch skill details by ID
 */
export const fetchSkillById = async (skillId: string, skillType: SkillType): Promise<Skill | null> => {
  try {
    const response = await repApiClient.get<{success: boolean, data: Skill}>(`/api/skills/${skillType}/${skillId}`);
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching skill ${skillId}:`, error);
    return null;
  }
};

/**
 * Fetch multiple skills by their IDs
 */
export const fetchSkillsByIds = async (skillIds: string[], skillType: SkillType): Promise<Skill[]> => {
  try {
    const skillPromises = skillIds.map(id => fetchSkillById(id, skillType));
    const skills = await Promise.all(skillPromises);
    return skills.filter(skill => skill !== null) as Skill[];
  } catch (error) {
    console.error(`Error fetching skills for type ${skillType}:`, error);
    return [];
  }
}; 