import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Skeleton } from '../ui/Skeleton';
import { ProfileView } from '../ProfileView';
import { ProfileEditView } from '../ProfileEditView';
import { getProfileData, updateProfileData, updateSkills, updateBasicInfo, updateExperience } from '../../../utils/profileUtils';
import { setProfileData } from '../../../utils/authUtils';

// Import Timezone type from repWizard service
import { Timezone } from '../../../services/api/repWizard';

// Define a type for your profile data - Updated to match new schema
interface ProfileData {
  _id: string;
  userId: string;
  status: string;
  // Updated to new onboarding progress structure
  onboardingProgress?: {
    currentPhase: number;
    overallCompletion: number;
    phases: {
      [key: string]: {
        status: 'pending' | 'in_progress' | 'completed' | 'blocked';
        completion: number;
        steps: {
          [key: string]: {
            completed: boolean;
            data?: any;
          };
        };
      };
    };
  };
  // Keep old structure for backward compatibility
  completionSteps?: {
    basicInfo: boolean;
    experience: boolean;
    skills: boolean;
    languages: boolean;
    assessment: boolean;
  };
  personalInfo: {
    name: string;
    // Updated: country instead of location, can be ObjectId or string
    country?: Timezone | string;
    location?: string; // Keep for backward compatibility
    email: string;
    phone?: string;
    languages: Array<{
      language: string;
      proficiency: string;
      iso639_1?: string;
      assessmentResults?: {
        completeness: {
          score: number;
          feedback: string;
        };
        fluency: {
          score: number;
          feedback: string;
        };
        proficiency: {
          score: number;
          feedback: string;
        };
        overall: {
          score: number;
          strengths: string;
          areasForImprovement: string;
        };
        completedAt: string;
      };
    }>;
  };
  professionalSummary: {
    yearsOfExperience: string;
    currentRole?: string;
    industries?: string[];
    keyExpertise?: string[];
    notableCompanies?: string[];
    profileDescription?: string;
  };
  skills: {
    technical: Array<{
      skill: string;
      level: number;
      details?: string;
    }>;
    professional: Array<{
      skill: string;
      level: number;
      details?: string;
    }>;
    soft: Array<{
      skill: string;
      level: number;
      details?: string;
    }>;
    contactCenter: Array<{
      skill: string;
      category: string;
      proficiency: string;
      assessmentResults: {
        score: number;
        strengths: string[];
        improvements: string[];
        feedback: string;
        tips: string[];
        keyMetrics: {
          professionalism: number;
          effectiveness: number;
          customerFocus: number;
        };
        completedAt: string;
      };
    }>;
  };
  experience: Array<{
    title: string;
    company: string;
    startDate: string;
    endDate?: string;
    responsibilities?: string[];
    achievements?: string[];
  }>;
  // Updated: availability with timezone as ObjectId or string
  availability?: {
    schedule?: Array<{
      day: string;
      hours: {
        start: string;
        end: string;
      };
    }>;
    timeZone?: Timezone | string;
    flexibility?: string[];
  };
  lastUpdated: string;
}

export function Profile() {
  console.log('🧩 Profile component initializing');
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(window.location.search.includes('edit=true'));
  const [editInitialTab, setEditInitialTab] = useState('profile');

  useEffect(() => {
    const qs = location.search.startsWith('?') ? location.search.slice(1) : location.search;
    const params = new URLSearchParams(qs);
    if (isEditing) {
      params.set('edit', 'true');
    } else {
      params.delete('edit');
    }
    const raw = params.toString();
    const nextSearch = raw ? `?${raw}` : '';
    if (nextSearch !== location.search) {
      navigate({ pathname: location.pathname, search: nextSearch }, { replace: true });
    }
    window.dispatchEvent(new Event('profile_edit_toggle'));
  }, [isEditing, location.pathname, location.search, navigate]);

  useEffect(() => {
    console.log('📋 Profile component mounted - loading profile data');

    const loadProfile = async () => {
      console.log('🔄 Starting profile data loading process');
      try {
        console.log('🔍 Requesting profile data through getProfileData utility');
        const profileData = await getProfileData();
        console.log('✅ Profile data received successfully');
        console.log('💽 Setting profile data in component state');
        setProfile(profileData);
        setLoading(false);
      } catch (err: any) {
        console.error('❌ Error loading profile:', err);
        setError(err.message || 'Failed to load profile');
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const updateProfileStateAndStorage = (data: ProfileData) => {
    setProfile(data);
    setProfileData(data);
    // Notify other components
    window.dispatchEvent(new CustomEvent('PROFILE_UPDATED'));
  };

  // Handle profile update
  const handleProfileUpdate = async (updatedProfile: ProfileData) => {
    try {
      console.log('📝 Updating local profile state and storage with saved changes');
      updateProfileStateAndStorage(updatedProfile);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile state:', error);
    }
  };

  const getSkillRefId = (entry: any): string | undefined => {
    if (!entry) return undefined;
    if (typeof entry.skill === 'string') return entry.skill;
    if (entry.skill?._id) return entry.skill._id;
    if (entry._id) return entry._id;
    return undefined;
  };

  const handleDeleteSkill = async (type: 'technical' | 'professional' | 'soft', index: number) => {
    if (!profile?._id || !profile?.skills?.[type]) return;
    const source = profile.skills[type] || [];
    if (index < 0 || index >= source.length) return;

    const nextSkills = {
      technical: [...(profile.skills.technical || [])],
      professional: [...(profile.skills.professional || [])],
      soft: [...(profile.skills.soft || [])]
    };
    nextSkills[type].splice(index, 1);

    const payload = {
      technical: nextSkills.technical.map((entry: any) => ({
        skill: getSkillRefId(entry),
        level: typeof entry.level === 'number' ? entry.level : 0,
        details: entry.details || ''
      })).filter((entry: any) => !!entry.skill),
      professional: nextSkills.professional.map((entry: any) => ({
        skill: getSkillRefId(entry),
        level: typeof entry.level === 'number' ? entry.level : 0,
        details: entry.details || ''
      })).filter((entry: any) => !!entry.skill),
      soft: nextSkills.soft.map((entry: any) => ({
        skill: getSkillRefId(entry),
        level: typeof entry.level === 'number' ? entry.level : 0,
        details: entry.details || ''
      })).filter((entry: any) => !!entry.skill),
    };

    try {
      await updateSkills(profile._id, payload);
      const refreshed = await getProfileData();
      updateProfileStateAndStorage(refreshed);
    } catch (error) {
      console.error('Error deleting skill:', error);
    }
  };

  const handleAddSkill = async (type: 'technical' | 'professional' | 'soft', skillId: string) => {
    if (!profile?._id || !skillId) return;

    const nextSkills = {
      technical: [...(profile.skills.technical || [])],
      professional: [...(profile.skills.professional || [])],
      soft: [...(profile.skills.soft || [])]
    };

    const alreadyExists = nextSkills[type].some((entry: any) => getSkillRefId(entry) === skillId);
    if (!alreadyExists) {
      nextSkills[type].unshift({
        skill: skillId,
        level: 0,
        details: ''
      });
    }

    const payload = {
      technical: nextSkills.technical.map((entry: any) => ({
        skill: getSkillRefId(entry),
        level: typeof entry.level === 'number' ? entry.level : 0,
        details: entry.details || ''
      })).filter((entry: any) => !!entry.skill),
      professional: nextSkills.professional.map((entry: any) => ({
        skill: getSkillRefId(entry),
        level: typeof entry.level === 'number' ? entry.level : 0,
        details: entry.details || ''
      })).filter((entry: any) => !!entry.skill),
      soft: nextSkills.soft.map((entry: any) => ({
        skill: getSkillRefId(entry),
        level: typeof entry.level === 'number' ? entry.level : 0,
        details: entry.details || ''
      })).filter((entry: any) => !!entry.skill),
    };

    // Optimistic UI update for instant feedback
    setProfile((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        skills: {
          ...(prev.skills || {}),
          technical: nextSkills.technical,
          professional: nextSkills.professional,
          soft: nextSkills.soft
        }
      };
    });

    try {
      console.log(`[handleAddSkill] type=${type} skillId=${skillId} payload=`, payload);
      await updateSkills(profile._id, payload);
      // Refresh with populated data so the new skill resolves its name immediately
      const refreshed = await getProfileData();
      updateProfileStateAndStorage(refreshed);
    } catch (error: any) {
      console.error('Error adding skill:', error);
      const serverMessage =
        error?.message ||
        error?.error ||
        (typeof error === 'string' ? error : JSON.stringify(error));
      alert(`Could not add ${type} skill: ${serverMessage}`);
      // Rollback if API fails
      try {
        const refreshed = await getProfileData();
        updateProfileStateAndStorage(refreshed);
      } catch (refreshError) {
        console.error('Error refreshing profile after failed skill add:', refreshError);
      }
    }
  };

  const handleDeleteLanguage = async (index: number) => {
    if (!profile?._id) return;
    const currentLanguages = profile.personalInfo?.languages || [];
    if (index < 0 || index >= currentLanguages.length) return;

    const normalizeLanguageEntry = (lang: any) => ({
      language: typeof lang.language === 'object' ? lang.language?._id : lang.language,
      proficiency: lang.proficiency,
      assessmentResults: lang.assessmentResults
    });

    const updatedLanguages = currentLanguages
      .filter((_: any, i: number) => i !== index)
      .map(normalizeLanguageEntry)
      .filter((entry: any) => !!entry.language);

    try {
      await updateBasicInfo(profile._id, { languages: updatedLanguages });
      const refreshed = await getProfileData();
      updateProfileStateAndStorage(refreshed);
    } catch (error) {
      console.error('Error deleting language:', error);
    }
  };

  const handleAddLanguage = async (item: { language: string; proficiency: string; languageId?: string }) => {
    if (!profile?._id) return;
    const language = String(item.language || '').trim();
    const languageId = String(item.languageId || '').trim();
    const proficiency = String(item.proficiency || 'B1').trim() || 'B1';
    if (!language && !languageId) return;

    const currentLanguages = Array.isArray(profile.personalInfo?.languages) ? profile.personalInfo.languages : [];
    const normalizeName = (entry: any) => {
      if (typeof entry?.language === 'object' && entry.language) {
        return String(entry.language.name || entry.language.code || '').trim().toLowerCase();
      }
      return String(entry?.language || '').trim().toLowerCase();
    };
    const exists = currentLanguages.some((l: any) => {
      const currentId = typeof l?.language === 'object' ? String(l.language?._id || '') : String(l?.language || '');
      if (languageId && currentId && currentId === languageId) return true;
      return normalizeName(l) === language.toLowerCase();
    });
    if (exists) return;

    const normalizeLanguageEntry = (lang: any) => ({
      language: typeof lang.language === 'object' ? lang.language?._id : lang.language,
      proficiency: lang.proficiency,
      assessmentResults: lang.assessmentResults
    });

    const updatedLanguages = [
      { language: languageId || language, proficiency },
      ...currentLanguages.map(normalizeLanguageEntry).filter((entry: any) => !!entry.language),
    ];

    try {
      await updateBasicInfo(profile._id, { languages: updatedLanguages });
      const refreshed = await getProfileData();
      updateProfileStateAndStorage(refreshed);
    } catch (error) {
      console.error('Error adding language:', error);
    }
  };

  const handleDeleteExperience = async (index: number) => {
    if (!profile?._id) return;
    const currentExperience = profile.experience || [];
    if (index < 0 || index >= currentExperience.length) return;

    const updatedExperience = currentExperience.filter((_: any, i: number) => i !== index);
    try {
      await updateExperience(profile._id, updatedExperience);
      const refreshed = await getProfileData();
      updateProfileStateAndStorage(refreshed);
    } catch (error) {
      console.error('Error deleting experience:', error);
    }
  };

  const handleAddExperience = async (item: {
    title: string;
    company: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }) => {
    if (!profile?._id) return;
    const title = String(item.title || '').trim();
    const company = String(item.company || '').trim();
    if (!title || !company) return;

    const currentExperience = Array.isArray(profile.experience) ? profile.experience : [];
    const nextEntry = {
      title,
      role: title,
      company,
      startDate: item.startDate || undefined,
      endDate: item.endDate || undefined,
      description: item.description ? String(item.description).trim() : undefined,
    };
    const updatedExperience = [nextEntry, ...currentExperience];

    try {
      await updateExperience(profile._id, updatedExperience);
      const refreshed = await getProfileData();
      updateProfileStateAndStorage(refreshed);
    } catch (error) {
      console.error('Error adding experience:', error);
    }
  };

  const handleUpdateExperience = async (index: number, item: {
    title: string;
    company: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }) => {
    if (!profile?._id) return;
    const currentExperience = Array.isArray(profile.experience) ? [...profile.experience] : [];
    if (index < 0 || index >= currentExperience.length) return;
    const title = String(item.title || '').trim();
    const company = String(item.company || '').trim();
    if (!title || !company) return;

    currentExperience[index] = {
      ...currentExperience[index],
      title,
      role: title,
      company,
      startDate: item.startDate || undefined,
      endDate: item.endDate || undefined,
      description: item.description ? String(item.description).trim() : undefined,
    };

    try {
      await updateExperience(profile._id, currentExperience);
      const refreshed = await getProfileData();
      updateProfileStateAndStorage(refreshed);
    } catch (error) {
      console.error('Error updating experience:', error);
    }
  };

  const handleDeleteSpecializationItem = async (
    section: 'industries' | 'activities' | 'notableCompanies',
    index: number
  ) => {
    if (!profile?._id) return;
    const currentSummary = profile.professionalSummary || {};
    const source = currentSummary[section] || [];
    if (index < 0 || index >= source.length) return;

    const normalizeValue = (value: any) => {
      if (section === 'notableCompanies') return value;
      return typeof value === 'object' ? value?._id : value;
    };

    const updatedSection = source
      .filter((_: any, i: number) => i !== index)
      .map(normalizeValue)
      .filter((value: any) => !!value);

    const payload = {
      professionalSummary: {
        ...currentSummary,
        [section]: updatedSection
      }
    };

    try {
      await updateProfileData(profile._id, payload);
      const refreshed = await getProfileData();
      updateProfileStateAndStorage(refreshed);
    } catch (error) {
      console.error('Error deleting specialization item:', error);
    }
  };

  const handleAddSpecializationItem = async (
    section: 'industries' | 'activities' | 'notableCompanies',
    value: string
  ) => {
    const trimmedValue = String(value || '').trim();
    if (!profile?._id || !trimmedValue) return;
    const currentSummary = profile.professionalSummary || {};
    const source = currentSummary[section] || [];

    const normalizeValue = (entry: any) => {
      if (section === 'notableCompanies') return String(entry || '').trim();
      return typeof entry === 'object' ? entry?._id : entry;
    };
    const sourceIds = source.map(normalizeValue).filter((v: any) => !!v);
    const alreadyExists =
      section === 'notableCompanies'
        ? sourceIds.some((v: any) => String(v).toLowerCase() === trimmedValue.toLowerCase())
        : sourceIds.includes(trimmedValue);
    if (alreadyExists) return;

    const payload = {
      professionalSummary: {
        ...currentSummary,
        [section]: [trimmedValue, ...sourceIds]
      }
    };

    // Optimistic UI update to avoid waiting for full profile refresh
    setProfile((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        professionalSummary: {
          ...(prev.professionalSummary || {}),
          [section]: [trimmedValue, ...source]
        }
      };
    });

    try {
      await updateProfileData(profile._id, payload);
    } catch (error) {
      console.error('Error adding specialization item:', error);
      // Rollback if API fails
      try {
        const refreshed = await getProfileData();
        updateProfileStateAndStorage(refreshed);
      } catch (refreshError) {
        console.error('Error refreshing profile after failed specialization add:', refreshError);
      }
    }
  };

  if (loading) {
    console.log('⏳ Profile is in loading state, showing loading screen');
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Profile Header Skeleton */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex items-center gap-6">
            <Skeleton className="w-24 h-24 rounded-2xl" variant="rounded" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-8 w-1/3" variant="rounded" />
              <Skeleton className="h-4 w-1/4" variant="rounded" />
            </div>
            <Skeleton className="w-32 h-10 rounded-xl" variant="rounded" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sidebar Skeleton */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
                <Skeleton className="h-6 w-1/2" variant="rounded" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" variant="rounded" />
                  <Skeleton className="h-4 w-full" variant="rounded" />
                  <Skeleton className="h-4 w-3/4" variant="rounded" />
                </div>
              </div>
            </div>

            {/* Main Content Skeleton */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-6">
                <Skeleton className="h-8 w-1/3" variant="rounded" />
                <div className="space-y-4">
                  <Skeleton className="h-20 w-full" variant="rounded" />
                  <Skeleton className="h-20 w-full" variant="rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    console.log('❌ Profile has error state, showing error message');
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-lg text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!profile) {
    console.log('⚠️ No profile data available');
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-lg text-gray-600">No profile data available</div>
      </div>
    );
  }

  console.log('🖥️ Rendering profile view with data');
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {isEditing ? (
          <ProfileEditView
            profile={profile}
            onSave={handleProfileUpdate}
            initialTab={editInitialTab}
          />
        ) : (
          <ProfileView
            profile={profile}
            onEditClick={(tab?: string) => {
              setEditInitialTab(tab || 'profile');
              setIsEditing(true);
            }}
            onDeleteSkill={handleDeleteSkill}
            onAddSkill={handleAddSkill}
            onDeleteLanguage={handleDeleteLanguage}
            onAddLanguage={handleAddLanguage}
            onDeleteExperience={handleDeleteExperience}
            onAddExperience={handleAddExperience}
            onUpdateExperience={handleUpdateExperience}
            onDeleteSpecializationItem={handleDeleteSpecializationItem}
            onAddSpecializationItem={handleAddSpecializationItem}
            onProfileUpdate={handleProfileUpdate}
          />
        )}
      </div>
    </div>
  );
}