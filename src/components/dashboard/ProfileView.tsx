import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, MapPin, Mail, Phone, Target, Briefcase, RefreshCw, Check, Pencil, Camera, ChevronDown, ClipboardCheck, ArrowRight, AlertTriangle, Sparkles } from 'lucide-react';
import { getProfilePlan, checkCountryMismatch, updateProfileData, fetchProfileFromAPI, getRepresentativePlans, updateProfilePlan } from '../../utils/profileUtils';
import { getRepOnboardingStep, hasRepGigEngagement, isRepCoreOnboardingDone } from '../../utils/repOnboardingNextStep';
import { repApiUrl } from '../../utils/repApiUrl';
import { repWizardApi, Timezone } from '../../services/api/repWizard';
import { fetchAllSkills, fetchSkillById, Skill, SkillsByCategory, SkillType } from '../../services/api/skills';
import { fetchAllLanguages, Language as LanguageOption } from '../../services/api/languages';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// Components
import { ProfileNavbar } from './profile/ProfileNavbar';
import ContactCenterAssessment from '../assessments/ContactCenterAssessment';
import LanguageAssessment from '../assessments/LanguageAssessment';
import { AssessmentProvider, useAssessment } from '../../contexts/AssessmentContext';
import { getLanguageIsoCode } from '../../utils/assessmentAuthUtils';

const mapScoreToCEFR = (score: number): string => {
  if (score >= 95) return 'C2';
  if (score >= 80) return 'C1';
  if (score >= 65) return 'B2';
  if (score >= 50) return 'B1';
  if (score >= 35) return 'A2';
  return 'A1';
};

// Wraps LanguageAssessment so it can persist results via the assessment context
// (mirrors LanguageAssessmentPage.handleComplete) when rendered inline.
const InlineLanguageAssessment: React.FC<{
  language: string;
  code: string;
  onDone: () => void;
  onExit: () => void;
}> = ({ language, code, onDone, onExit }) => {
  const { saveLanguageAssessment } = useAssessment() as any;

  const handleComplete = async (results: any) => {
    try {
      const isoCode = code || getLanguageIsoCode(language) || results?.language_code;
      const proficiency = mapScoreToCEFR(results?.overall?.score ?? 0);
      await saveLanguageAssessment(language, proficiency, results, isoCode);
    } catch (e) {
      console.error('Error saving language assessment:', e);
    } finally {
      onDone();
    }
  };

  return (
    <LanguageAssessment
      language={language}
      displayName={language}
      onComplete={handleComplete}
      onExit={onExit}
    />
  );
};

// Tabs
import { ProfileTab } from './profile/tabs/ProfileTab';
import { SkillsTab } from './profile/tabs/SkillsTab';
import { ExperienceTab } from './profile/tabs/ExperienceTab';
import { LanguagesTab } from './profile/tabs/LanguagesTab';
import { OnboardingTab } from './profile/tabs/OnboardingTab';
import { SpecializationTab } from './profile/tabs/SpecializationTab';
import { AvailabilityTab } from './profile/tabs/AvailabilityTab';

// Shared Interface Redefinitions (if needed by tabs)
export interface AssessmentResults {
  score?: number;
  fluency?: { score: number };
  proficiency?: { score: number };
  completeness?: { score: number };
  keyMetrics?: {
    professionalism: number;
    effectiveness: number;
    customerFocus: number;
  };
}

export interface Language {
  language: string;
  proficiency: string;
  iso639_1?: string;
  assessmentResults?: AssessmentResults;
}

export interface ContactCenterSkill {
  skill: string;
  proficiency?: string;
  assessmentResults?: AssessmentResults;
}

export interface Plan {
  _id: string;
  name: string;
  price: number;
  targetUserType: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlanResponse {
  _id: string;
  userId: string;
  plan: Partial<Plan>;
}

export const ProfileView: React.FC<{
  profile: any,
  onEditClick: (tab?: string) => void,
  onDeleteSkill?: (type: 'technical' | 'professional' | 'soft', index: number) => void,
  onAddSkill?: (type: 'technical' | 'professional' | 'soft', skillId: string) => void,
  onDeleteLanguage?: (index: number) => void,
  onAddLanguage?: (item: { language: string; proficiency: string; languageId?: string }) => void,
  onDeleteExperience?: (index: number) => void,
  onAddExperience?: (item: {
    title: string;
    company: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }) => void,
  onUpdateExperience?: (index: number, item: {
    title: string;
    company: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }) => void,
  onDeleteSpecializationItem?: (section: 'industries' | 'activities' | 'notableCompanies', index: number) => void,
  onAddSpecializationItem?: (section: 'industries' | 'activities' | 'notableCompanies', value: string) => void,
  onProfileUpdate?: (updatedProfile: any) => void,
  onVideoAnalysisComplete?: () => void
}> = ({ profile, onEditClick, onDeleteSkill, onAddSkill, onDeleteLanguage, onAddLanguage, onDeleteExperience, onAddExperience, onUpdateExperience, onDeleteSpecializationItem, onAddSpecializationItem, onProfileUpdate, onVideoAnalysisComplete }) => {
  const { t, i18n } = useTranslation();
  const isFr = (i18n.language || 'en').slice(0, 2) === 'fr';
  const navigate = useNavigate();
  const getInitialTab = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      const allowed = ['profile', 'experience', 'languages', 'skills', 'specialization', 'availability', 'onboarding'];
      if (tab && allowed.includes(tab)) return tab;
    } catch {
      // ignore
    }
    return 'profile';
  };
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [inlineAssessment, setInlineAssessment] = useState<
    | { type: 'contact-center'; skillId: string; category: string; skillName: string }
    | { type: 'language'; language: string; code: string }
    | null
  >(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [planData, setPlanData] = useState<PlanResponse | null>(null);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [planError, setPlanError] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [countryData, setCountryData] = useState<Timezone | null>(null);
  const [timezoneData, setTimezoneData] = useState<Timezone | null>(null);
  const [allTimezones, setAllTimezones] = useState<Timezone[]>([]);
  const [countries, setCountries] = useState<Timezone[]>([]);
  const [availableLanguages, setAvailableLanguages] = useState<LanguageOption[]>([]);
  const [skillNameById, setSkillNameById] = useState<Record<string, string>>({});

  const [countryMismatch, setCountryMismatch] = useState<{
    hasMismatch: boolean;
    firstLoginCountry?: string;
    selectedCountry?: string;
    firstLoginCountryCode?: string;
  } | null>(null);
  const [checkingCountryMismatch, setCheckingCountryMismatch] = useState(false);
  const [showLoadingSpinner, setShowLoadingSpinner] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isEditingPublicInfo, setIsEditingPublicInfo] = useState(false);
  const [isSavingPublicInfo, setIsSavingPublicInfo] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [tempSelectedPlanId, setTempSelectedPlanId] = useState('');
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [publicInfoDraft, setPublicInfoDraft] = useState({
    country: '',
    countryId: '',
    phone: '',
    growthPlanId: ''
  });
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Load countries and all timezones on component mount
  useEffect(() => {
    const loadLocationData = async () => {
      try {
        const [countriesData, timezonesData] = await Promise.all([
          repWizardApi.getCountries(),
          repWizardApi.getTimezones()
        ]);
        setCountries(countriesData);
        setAllTimezones(timezonesData);
      } catch (error) {
        console.error('Error loading location data:', error);
      }
    };
    loadLocationData();
  }, []);

  // Fetch plan data
  useEffect(() => {
    const fetchPlanData = async () => {
      try {
        if (!profile?._id) return;
        const data = await getProfilePlan(profile._id);
        const planResponse: PlanResponse = {
          _id: String(data._id),
          userId: String(data.userId),
          plan: data.plan
        };
        setPlanData(planResponse);
      } catch (error) {
        console.error('Error fetching plan data:', error);
        setPlanError(error instanceof Error ? error.message : 'Failed to fetch plan data');
      }
    };
    fetchPlanData();
  }, [profile?._id]);

  useEffect(() => {
    const fetchAvailablePlans = async () => {
      try {
        const plans = await getRepresentativePlans();
        setAvailablePlans(plans);
      } catch (error) {
        console.error('Error fetching representative plans:', error);
      }
    };
    fetchAvailablePlans();
  }, []);

  useEffect(() => {
    const loadLanguages = async () => {
      try {
        const languages = await fetchAllLanguages();
        setAvailableLanguages(languages);
      } catch (error) {
        console.error('Error loading languages list:', error);
      }
    };
    loadLanguages();
  }, []);

  useEffect(() => {
    const loadSkillDictionary = async () => {
      try {
        const skills = await fetchAllSkills();
        const mapFromCategory = (category: SkillsByCategory) =>
          Object.values(category || {}).flat().reduce((acc, skill: Skill) => {
            acc[skill._id] = skill.name;
            return acc;
          }, {} as Record<string, string>);

        setSkillNameById({
          ...mapFromCategory(skills.technical),
          ...mapFromCategory(skills.professional),
          ...mapFromCategory(skills.soft),
        });
      } catch (error) {
        console.error('Error loading skills dictionary for profile view:', error);
      }
    };

    loadSkillDictionary();
  }, []);

  useEffect(() => {
    const hydrateAgentSkillNamesById = async () => {
      if (!profile?.skills) return;

      const normalizeId = (raw: any): string | null => {
        if (!raw) return null;
        if (typeof raw === 'string') return raw;
        if (typeof raw === 'object' && typeof raw.$oid === 'string') return raw.$oid;
        if (typeof raw === 'object' && typeof raw._id === 'string') return raw._id;
        if (typeof raw === 'object' && typeof raw.id === 'string') return raw.id;
        return null;
      };

      const collectIds = (arr: any[]): string[] =>
        (arr || [])
          .map((item: any) => normalizeId(item?.skill) || normalizeId(item?._id) || normalizeId(item?.id))
          .filter((id: string | null): id is string => !!id);

      const byType: Record<SkillType, string[]> = {
        technical: collectIds(profile.skills.technical || []),
        professional: collectIds(profile.skills.professional || []),
        soft: collectIds(profile.skills.soft || []),
      };

      const toFetch: Array<{ id: string; type: SkillType }> = [];
      (Object.keys(byType) as SkillType[]).forEach((type) => {
        byType[type].forEach((id) => {
          if (!skillNameById[id]) toFetch.push({ id, type });
        });
      });

      if (toFetch.length === 0) return;

      try {
        const tryResolveSkillAcrossTypes = async (id: string, preferredType: SkillType): Promise<string | null> => {
          const orderedTypes: SkillType[] = [
            preferredType,
            ...(['technical', 'professional', 'soft'] as SkillType[]).filter(t => t !== preferredType)
          ];

          for (const type of orderedTypes) {
            try {
              const skill = await fetchSkillById(id, type);
              if (skill?.name) return skill.name;
            } catch {
              // continue trying other types
            }
          }
          return null;
        };

        const fetched = await Promise.all(
          toFetch.map(async ({ id, type }) => {
            const resolvedName = await tryResolveSkillAcrossTypes(id, type);
            return { id, name: resolvedName };
          })
        );

        const additions = fetched.reduce((acc, curr) => {
          if (curr.name) acc[curr.id] = curr.name;
          return acc;
        }, {} as Record<string, string>);

        const unresolved = fetched.filter((f) => !f.name).map((f) => f.id);
        if (unresolved.length > 0) {
          console.warn('[ProfileView] Unresolved skill IDs after cross-type lookup:', unresolved);
        }

        if (Object.keys(additions).length > 0) {
          setSkillNameById((prev) => ({ ...prev, ...additions }));
        }
      } catch (error) {
        console.error('Error hydrating agent skills by id:', error);
      }
    };

    hydrateAgentSkillNamesById();
  }, [profile?.skills, skillNameById]);

  // Load specific country and timezone data based on profile
  useEffect(() => {
    const loadSpecificLocationDetails = async () => {
      try {
        if (profile?.personalInfo?.country) {
          if (typeof profile.personalInfo.country === 'string') {
            const country = await repWizardApi.getTimezoneById(profile.personalInfo.country);
            setCountryData(country);
          } else {
            setCountryData(profile.personalInfo.country);
          }
        }
        if (profile?.availability?.timeZone) {
          if (typeof profile.availability.timeZone === 'string') {
            const timezone = await repWizardApi.getTimezoneById(profile.availability.timeZone);
            setTimezoneData(timezone);
          } else {
            setTimezoneData(profile.availability.timeZone);
          }
        }
      } catch (error) {
        console.error('Error loading profile location details:', error);
      }
    };
    loadSpecificLocationDetails();
  }, [profile?.personalInfo?.country, profile?.availability?.timeZone]);

  // Check country mismatch
  useEffect(() => {
    const checkMismatch = async () => {
      if (!countryData || countries.length === 0) return;
      try {
        setCheckingCountryMismatch(true);
        const spinnerTimer = setTimeout(() => setShowLoadingSpinner(true), 800);
        const mismatchResult = await checkCountryMismatch(countryData.countryCode, countries);
        clearTimeout(spinnerTimer);
        if (mismatchResult) setCountryMismatch(mismatchResult);
      } catch (error) {
        console.error('Error checking country mismatch:', error);
      } finally {
        setCheckingCountryMismatch(false);
        setShowLoadingSpinner(false);
      }
    };
    checkMismatch();
  }, [countryData, countries]);

  if (!profile) return null;

  // Helper functions used by tabs
  const getProficiencyStars = (proficiency: string): number => {
    const map: Record<string, number> = { 'A1': 1, 'Basic': 1, 'A2': 2, 'B1': 3, 'Intermediate': 3, 'B2': 4, 'C1': 5, 'Advanced': 5, 'C2': 6, 'Native': 6 };
    return map[proficiency] || 0;
  };

  const getTimezoneMismatchInfo = () => {
    const tz = profile.availability?.timeZone;
    // NB: typeof null === 'object', so guard against null before reading _id.
    const currentTimezoneId = tz && typeof tz === 'object' ? tz._id : tz;
    const selectedTimezoneData = allTimezones.find(t => t && t._id === currentTimezoneId);
    if (!countryData || !selectedTimezoneData || !currentTimezoneId) return null;
    if (selectedTimezoneData.countryCode !== countryData.countryCode) {
      const timezoneCountryData = countries.find(c => c.countryCode === selectedTimezoneData.countryCode);
      return {
        timezoneCountry: timezoneCountryData?.countryName || selectedTimezoneData.countryCode,
        selectedCountry: countryData.countryName,
        timezoneName: selectedTimezoneData.zoneName
      };
    }
    return null;
  };

  const calculateOverallScore = () => {
    const scores: number[] = [];

    // 1. Formal Contact Center assessments (canonical REPS key metrics).
    (profile.skills?.contactCenter || []).forEach((skill: any) => {
      const m = skill?.assessmentResults?.keyMetrics;
      if (!m) return;
      scores.push(Math.round(((m.professionalism || 0) + (m.effectiveness || 0) + (m.customerFocus || 0)) / 3));
    });

    // 2. Video-verified language scores already merged into the profile.
    (profile.personalInfo?.languages || []).forEach((lang: any) => {
      const ar = lang?.assessmentResults;
      if (!ar || ar.source !== 'video') return;
      if (typeof ar.overall?.score === 'number') {
        scores.push(Math.round(ar.overall.score));
        return;
      }
      const fluency = ar.fluency?.score ?? 0;
      const proficiency = ar.proficiency?.score ?? 0;
      const completeness = ar.completeness?.score ?? 0;
      if (fluency || proficiency || completeness) {
        scores.push(Math.round((fluency + proficiency + completeness) / 3));
      }
    });

    // 3. Experience video analyses (when not yet reflected on profile languages).
    if (scores.length === 0) {
      (profile.experience || []).forEach((exp: any) => {
        (exp?.videoLanguageAssessment?.languages || []).forEach((l: any) => {
          if (typeof l.overallScore === 'number' && l.overallScore > 0) {
            scores.push(Math.round(l.overallScore));
          }
        });
        const analysis = exp?.videoAnalysis;
        if (!analysis) return;
        if (typeof analysis.overallConfidence === 'number' && analysis.overallConfidence > 0) {
          scores.push(Math.round(analysis.overallConfidence));
        }
        const cc = analysis.contactCenterSkills;
        if (cc && typeof cc === 'object') {
          const ccScores = Object.values(cc)
            .map((v: any) => v?.score)
            .filter((s: unknown): s is number => typeof s === 'number' && s > 0);
          if (ccScores.length > 0) {
            scores.push(Math.round(ccScores.reduce((a, b) => a + b, 0) / ccScores.length));
          }
        }
      });
    }

    if (scores.length === 0) return 'N/A';
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  const findSkillData = (skillName: string) => {
    return profile.skills?.contactCenter?.find((s: any) => s.skill === skillName) || null;
  };

  const formatSkillsForDisplay = (skillsData: any) => {
    if (!Array.isArray(skillsData)) return [];
    const readNameFromObject = (obj: any): string | null =>
      obj?.name || obj?.label || obj?.title || null;

    const normalizeId = (raw: any): string | null => {
      if (!raw) return null;
      if (typeof raw === 'string') return raw;
      if (typeof raw === 'object' && typeof raw.$oid === 'string') return raw.$oid;
      if (typeof raw === 'object' && typeof raw._id === 'string') return raw._id;
      if (typeof raw === 'object' && typeof raw.id === 'string') return raw.id;
      return null;
    };

    return skillsData.map(item => {
      if (typeof item === 'string') {
        const resolvedFromMap = skillNameById[item];
        return { name: resolvedFromMap || item };
      }
      if (item?.skill && typeof item.skill === 'object') {
        const embeddedName = readNameFromObject(item.skill);
        if (embeddedName) return { name: embeddedName };
      }

      const directName = readNameFromObject(item);
      if (directName) return { name: directName };

      const skillId = normalizeId(item?._id) || normalizeId(item?.id) || normalizeId(item?.skill);
      const resolvedById = skillId ? skillNameById[skillId] : null;
      const detailsFallback = typeof item?.details === 'string' && item.details.trim() ? item.details.trim() : null;
      return { name: resolvedById || detailsFallback || (typeof item?.skill === 'string' ? item.skill : null) || 'Unknown' };
    });
  };

  useEffect(() => {
    if (!profile?.skills) return;

    const normalizeId = (raw: any): string | null => {
      if (!raw) return null;
      if (typeof raw === 'string') return raw;
      if (typeof raw === 'object' && typeof raw.$oid === 'string') return raw.$oid;
      if (typeof raw === 'object' && typeof raw._id === 'string') return raw._id;
      if (typeof raw === 'object' && typeof raw.id === 'string') return raw.id;
      return null;
    };

  }, [profile?.skills, skillNameById]);

  const takeLanguageAssessment = (language: string, iso639_1Code?: string) => {
    setInlineAssessment({
      type: 'language',
      language,
      code: iso639_1Code || '',
    });
  };

  const takeContactCenterSkillAssessment = (skillName: string, categoryName?: string) => {
    const formattedSkill = skillName.toLowerCase().replace(/\s+/g, '-');
    setInlineAssessment({
      type: 'contact-center',
      skillId: formattedSkill,
      category: categoryName || 'Unknown',
      skillName,
    });
  };

  const closeInlineAssessment = () => setInlineAssessment(null);

  const handleInlineAssessmentComplete = async () => {
    try {
      const updated = await fetchProfileFromAPI();
      if (onProfileUpdate && updated) onProfileUpdate(updated);
    } catch (e) {
      console.error('Error refreshing profile after assessment:', e);
    } finally {
      setInlineAssessment(null);
    }
  };

  const handlePublish = async () => {
    if (!profile?._id) return;
    try {
      setIsPublishing(true);
      const updatedData = await updateProfileData(profile._id, { status: 'completed' });
      if (onProfileUpdate) onProfileUpdate(updatedData);
    } catch (error) {
      console.error('Error publishing profile:', error);
      alert('Failed to publish profile.');
    } finally {
      setIsPublishing(false);
    }
  };


  const getCountryDisplayName = () => {
    if (countryData?.countryName) return countryData.countryName;
    const country = (profile as any)?.personalInfo?.country;
    if (!country) return 'Not specified';
    if (typeof country === 'string') return country;
    if (typeof country === 'object') return country.countryName || country.zoneName || 'Not specified';
    return 'Not specified';
  };

  const handleInlineUpdate = async (payload: any, buildNextProfile: (prev: any) => any) => {
    if (!profile?._id) return;
    try {
      await updateProfileData(profile._id, payload);
      onProfileUpdate?.(buildNextProfile(profile));
    } catch (error) {
      console.error('Inline update failed:', error);
      window.alert('Update failed. Please try again.');
    }
  };

  const handleSaveAvailability = async (payload: { timeZone?: string; schedule: Array<{ day: string; hours: { start: string; end: string } }> }) => {
    await handleInlineUpdate(
      {
        availability: {
          ...(profile.availability || {}),
          timeZone: payload.timeZone || profile.availability?.timeZone,
          schedule: payload.schedule || [],
        },
      },
      (prev) => ({
        ...prev,
        availability: {
          ...(prev.availability || {}),
          timeZone:
            allTimezones.find((tz) => tz._id === (payload.timeZone || ''))
            || payload.timeZone
            || prev.availability?.timeZone,
          schedule: payload.schedule || [],
        },
      })
    );
  };

  const openPublicInfoEditor = () => {
    const currentPlanId = String(planData?.plan?._id || '');
    const currentCountryId =
      typeof profile.personalInfo?.country === 'object'
        ? String(profile.personalInfo?.country?._id || '')
        : (typeof profile.personalInfo?.country === 'string' && profile.personalInfo.country.length === 24
          ? profile.personalInfo.country
          : '');

    setPublicInfoDraft({
      country: getCountryDisplayName(),
      countryId: currentCountryId,
      email: String(profile.personalInfo?.email || ''),
      phone: String(profile.personalInfo?.phone || ''),
      growthPlanId: currentPlanId
    });
    setTempSelectedPlanId(currentPlanId);
    setIsEditingPublicInfo(true);
  };

  const savePublicInfoInline = async () => {
    if (!profile?._id) return;
    setIsSavingPublicInfo(true);

    const selectedCountry =
      countries.find((country) => country._id === publicInfoDraft.countryId)
      || countries.find((country) => String(country.countryName || '').toLowerCase() === String(publicInfoDraft.country || '').toLowerCase());

    const countryIdToPersist =
      selectedCountry?._id
      || (typeof profile.personalInfo?.country === 'object'
        ? profile.personalInfo?.country?._id
        : (typeof profile.personalInfo?.country === 'string' && profile.personalInfo.country.length === 24
          ? profile.personalInfo.country
          : ''));

    const payload = {
      personalInfo: {
        ...profile.personalInfo,
        country: countryIdToPersist,
        email: publicInfoDraft.email,
        phone: publicInfoDraft.phone,
      }
    };
    try {
      await handleInlineUpdate(payload, (prev) => ({
        ...prev,
        personalInfo: {
          ...(prev.personalInfo || {}),
          country: selectedCountry || prev.personalInfo?.country,
          email: publicInfoDraft.email,
          phone: publicInfoDraft.phone,
        }
      }));

      if (publicInfoDraft.growthPlanId && publicInfoDraft.growthPlanId !== String(planData?.plan?._id || '')) {
        await updateProfilePlan(profile._id, publicInfoDraft.growthPlanId);
        const updatedPlan = await getProfilePlan(profile._id);
        setPlanData({
          _id: String(updatedPlan._id),
          userId: String(updatedPlan.userId),
          plan: updatedPlan.plan
        });
      }

      const refreshed = await fetchProfileFromAPI();
      onProfileUpdate?.(refreshed);
      setIsEditingPublicInfo(false);
    } finally {
      setIsSavingPublicInfo(false);
    }
  };

  const handleSaveAbout = async (value: string) => {
    await handleInlineUpdate(
      {
        professionalSummary: {
          ...profile.professionalSummary,
          profileDescription: value,
        }
      },
      (prev) => ({
        ...prev,
        professionalSummary: {
          ...(prev.professionalSummary || {}),
          profileDescription: value,
        }
      })
    );
  };

  const handleReplaceVideo = async (file: File) => {
    if (!file || !profile?._id) return;
    const token = localStorage.getItem('token');
    if (!token) {
      window.alert('Authentication token missing.');
      return;
    }

    try {
      setIsUploadingVideo(true);
      const formData = new FormData();
      formData.append('video', file);

      const response = await fetch(repApiUrl(`/profiles/${profile._id}/video`), {
        method: 'PUT',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Video upload failed with status ${response.status}`);
      }

      const refreshed = await fetchProfileFromAPI();
      onProfileUpdate?.(refreshed);
      window.dispatchEvent(new CustomEvent('PROFILE_UPDATED'));
    } catch (error) {
      console.error('Error uploading presentation video:', error);
      window.alert('Failed to upload video.');
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImgSrc(reader.result?.toString() || '');
        setIsCropModalOpen(true);
      });
      reader.readAsDataURL(file);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const crop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        1,
        width,
        height
      ),
      width,
      height
    );
    setCrop(crop);
  };

  const getCroppedImg = async (image: HTMLImageElement, pixelCrop: PixelCrop): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Set canvas size to the actual cropped pixels in the original image for high quality
    canvas.width = pixelCrop.width * scaleX;
    canvas.height = pixelCrop.height * scaleY;

    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    ctx.drawImage(
      image,
      pixelCrop.x * scaleX,
      pixelCrop.y * scaleY,
      pixelCrop.width * scaleX,
      pixelCrop.height * scaleY,
      0,
      0,
      pixelCrop.width * scaleX,
      pixelCrop.height * scaleY
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        resolve(blob);
      }, 'image/jpeg', 0.95);
    });
  };

  const handleCropComplete = async () => {
    if (!imgRef.current || !completedCrop || !profile?._id) return;

    const token = localStorage.getItem('token');
    if (!token) {
      window.alert('Authentication token missing.');
      return;
    }

    try {
      setIsUploadingPhoto(true);
      setIsCropModalOpen(false);

      const croppedBlob = await getCroppedImg(imgRef.current, completedCrop);
      const formData = new FormData();
      formData.append('photo', croppedBlob, 'profile.jpg');

      const response = await fetch(repApiUrl(`/profiles/${profile._id}/photo`), {
        method: 'PUT',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Photo upload failed with status ${response.status}`);
      }

      const refreshed = await fetchProfileFromAPI();
      onProfileUpdate?.(refreshed);
      window.dispatchEvent(new CustomEvent('PROFILE_UPDATED'));
    } catch (error) {
      console.error('Error uploading cropped photo:', error);
      window.alert('Failed to upload cropped photo.');
    } finally {
      setIsUploadingPhoto(false);
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
    }
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'profile': return <ProfileTab profile={profile} onSaveAbout={handleSaveAbout} onReplaceVideo={handleReplaceVideo} isUploadingVideo={isUploadingVideo} onAddNotableCompany={(value) => onAddSpecializationItem?.('notableCompanies', value)} onDeleteNotableCompany={(index) => onDeleteSpecializationItem?.('notableCompanies', index)} />;
      case 'skills': return (
        <SkillsTab
          profile={profile}
          formatSkillsForDisplay={formatSkillsForDisplay}
          findSkillData={findSkillData}
          takeContactCenterSkillAssessment={takeContactCenterSkillAssessment}
          onEditItemClick={() => onEditClick('skills')}
          onDeleteSkill={(type, index) => onDeleteSkill?.(type, index)}
          onAddSkill={(type, skillId) => onAddSkill?.(type, skillId)}
          onAddSpecializationItem={(section, value) => onAddSpecializationItem?.(section, value)}
          onDeleteSpecializationItem={(section, index) => onDeleteSpecializationItem?.(section, index)}
        />
      );
      case 'experience': return (
        <ExperienceTab
          profile={profile}
          onVideoAnalysisComplete={onVideoAnalysisComplete}
          onAddItemClick={(item) => onAddExperience?.(item)}
          onUpdateItemClick={(index, item) => onUpdateExperience?.(index, item)}
          onDeleteItemClick={(index) => onDeleteExperience?.(index)}
        />
      );
      case 'languages': return (
        <LanguagesTab
          profile={profile}
          availableLanguages={availableLanguages}
          getProficiencyStars={getProficiencyStars}
          onGoToExperience={() => setActiveTab('experience')}
          onAddItemClick={(item) => onAddLanguage?.(item)}
          onDeleteItemClick={(index) => onDeleteLanguage?.(index)}
        />
      );
      case 'onboarding': return (
        <OnboardingTab
          profile={profile}
          countryMismatch={countryMismatch}
          checkingCountryMismatch={checkingCountryMismatch}
          showLoadingSpinner={showLoadingSpinner}
          timezoneData={timezoneData}
          allTimezones={allTimezones}
          getTimezoneMismatchInfo={getTimezoneMismatchInfo}
          repWizardApi={repWizardApi}
          onSaveAvailability={handleSaveAvailability}
        />
      );
      case 'specialization': return (
        <SpecializationTab
          profile={profile}
          onDeleteItemClick={(section, index) => onDeleteSpecializationItem?.(section, index)}
          onAddItemClick={(section, value) => onAddSpecializationItem?.(section, value)}
          onGoToExperience={() => setActiveTab('experience')}
        />
      );
      case 'availability': return (
        <AvailabilityTab
          profile={profile}
          countryMismatch={countryMismatch}
          checkingCountryMismatch={checkingCountryMismatch}
          showLoadingSpinner={showLoadingSpinner}
          timezoneData={timezoneData}
          allTimezones={allTimezones}
          getTimezoneMismatchInfo={getTimezoneMismatchInfo}
          repWizardApi={repWizardApi}
          onSaveAvailability={handleSaveAvailability}
        />
      );

      default: return <ProfileTab profile={profile} onSaveAbout={handleSaveAbout} onReplaceVideo={handleReplaceVideo} isUploadingVideo={isUploadingVideo} onAddNotableCompany={(value) => onAddSpecializationItem?.('notableCompanies', value)} onDeleteNotableCompany={(index) => onDeleteSpecializationItem?.('notableCompanies', index)} />;
    }
  };

  const headerContentMap: Record<string, { title: string; subtitle: string }> = {
    profile: {
      title: t('profile.tabs.profile.title'),
      subtitle: t('profile.tabs.profile.subtitle')
    },
    skills: {
      title: t('profile.tabs.skills.title'),
      subtitle: t('profile.tabs.skills.subtitle')
    },
    experience: {
      title: t('profile.tabs.experience.title'),
      subtitle: t('profile.tabs.experience.subtitle')
    },
    languages: {
      title: t('profile.tabs.languages.title'),
      subtitle: t('profile.tabs.languages.subtitle')
    },
    specialization: {
      title: t('profile.tabs.specialization.title'),
      subtitle: t('profile.tabs.specialization.subtitle')
    },
    onboarding: {
      title: t('profile.tabs.onboarding.title', { defaultValue: 'Onboarding Progress' }),
      subtitle: t('profile.tabs.onboarding.subtitle', { defaultValue: 'Track your verification and setup steps' })
    },
    availability: {
      title: t('profile.tabs.availability.title', { defaultValue: 'Availability & Schedule' }),
      subtitle: t('profile.tabs.availability.subtitle', { defaultValue: 'Manage your working hours and timezone' })
    }
  };

  const currentHeader = headerContentMap[activeTab] || headerContentMap.profile;
  const filteredCountries = countries
    .filter((country) =>
      String(country.countryName || '')
        .toLowerCase()
        .includes(String(publicInfoDraft.country || '').toLowerCase())
    )
    .sort((a, b) => String(a.countryName || '').localeCompare(String(b.countryName || '')))
    .slice(0, 120);

  if (inlineAssessment) {
    return (
      <div className="min-h-full bg-[#f8fafc]">
        <div className="max-w-5xl mx-auto px-6 py-4 lg:px-10 lg:py-6 space-y-6">
          <button
            type="button"
            onClick={closeInlineAssessment}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 text-xs font-black uppercase tracking-widest transition-all shadow-sm active:scale-95"
          >
            <ArrowRight size={16} className="rotate-180" />
            Back to Profile
          </button>
          <div className="glass-card rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="bg-gradient-harx px-10 py-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-widest uppercase relative z-10">
                {inlineAssessment.type === 'language'
                  ? `${inlineAssessment.language} Assessment`
                  : `${inlineAssessment.category}: ${inlineAssessment.skillName} Assessment`}
              </h1>
            </div>
            <div className="p-6">
              <AssessmentProvider>
                {inlineAssessment.type === 'language' ? (
                  <InlineLanguageAssessment
                    language={inlineAssessment.language}
                    code={inlineAssessment.code}
                    onDone={handleInlineAssessmentComplete}
                    onExit={closeInlineAssessment}
                  />
                ) : (
                  <ContactCenterAssessment
                    skillId={inlineAssessment.skillId}
                    category={inlineAssessment.category}
                    skillName={inlineAssessment.skillName}
                    onComplete={handleInlineAssessmentComplete}
                    onExit={closeInlineAssessment}
                  />
                )}
              </AssessmentProvider>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#f8fafc]">
      <div className="max-w-5xl mx-auto px-6 py-4 lg:px-10 lg:py-6 space-y-6">
        {/* Page Title & Phrase - Dynamic */}
        <div className="mb-2">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2 animate-in fade-in slide-in-from-left-4 duration-500">
            {currentHeader.title}
          </h1>
          <p className="text-slate-500 font-medium tracking-tight animate-in fade-in slide-in-from-left-6 duration-700">
            {currentHeader.subtitle}
          </p>
        </div>

        {/* Navigation Tabs at the Top */}
        <div className="w-full">
          <ProfileNavbar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            warningTabs={[
              ...((profile?.personalInfo?.languages || []).some(
                (l: any) => !l?.assessmentResults || l.assessmentResults.source === 'cv'
              )
                ? ['languages']
                : []),
              ...(((profile?.professionalSummary?.industries?.length || 0) === 0 ||
                (profile?.professionalSummary?.activities?.length || 0) === 0)
                ? ['specialization']
                : []),
            ]}
            warningMessages={{
              languages: isFr
                ? 'Niveaux de langue non vérifiés. Enregistrez une vidéo dans l’onglet Expérience pour les détecter.'
                : 'Language levels not verified. Record a video in the Experience tab to detect them.',
              specialization: isFr
                ? 'Industries/activités manquantes. Enregistrez une vidéo dans l’onglet Expérience pour les détecter.'
                : 'Missing industries/activities. Record a video in the Experience tab to detect them.',
            }}
          />
        </div>

        {/* Header / Identity Section (Twilio Style) - Only visible on 'Profile' tab */}
        {activeTab === 'profile' && (
          <div className="bg-harx-50/30 backdrop-blur-md rounded-3xl p-8 lg:p-10 shadow-sm border border-harx-100/70 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex flex-col md:flex-row gap-10 items-start">
              {/* Photo management */}
              <div className="relative group shrink-0">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <div
                  className="w-40 h-40 rounded-[32px] shadow-xl border-4 border-white bg-slate-200/50 overflow-hidden relative cursor-pointer ring-4 ring-harx-50 transition-transform group-hover:scale-[1.02]"
                  onClick={() => profile.personalInfo?.photo?.url && setShowImageModal(true)}
                >
                  {profile.personalInfo?.photo?.url ? (
                    <img
                      src={profile.personalInfo.photo.url}
                      alt="Profile"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl font-black text-gray-200 bg-gray-50 uppercase tracking-tighter">
                      {profile.personalInfo?.name?.charAt(0) || '?'}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-[2px]">
                    <div className="text-white text-xs font-black uppercase tracking-widest bg-white/20 px-4 py-2 rounded-full border border-white/30 truncate">View Photo</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !isUploadingPhoto && photoInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="absolute -top-2 -right-2 p-2 rounded-xl bg-gradient-harx text-white shadow-lg hover:opacity-90 disabled:opacity-60"
                  title="Change photo"
                >
                  {isUploadingPhoto ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                </button>
              </div>

              {/* Properties Grid */}
              <div className="flex-1 w-full relative">
                {/* Phase 2 onboarding: yellow warning while incomplete, continue CTA once done.
                    Publishing requires the core onboarding (phases 1-4) to be done AND
                    the rep to have APPLIED to at least one gig. Applying (status
                    'requested') is enough — a full enrollment ('enrolled') is NOT
                    required. We read profile.gigs directly so this holds even if the
                    derived phase5 status isn't echoed back on the profile. */}
                {isRepCoreOnboardingDone(profile) && hasRepGigEngagement(profile) ? (
                  profile.status !== 'completed' ? (
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-gradient-harx text-white shadow-xl shadow-harx-500/30 ring-1 ring-white/20 animate-pulse-subtle">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
                          <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-base font-black tracking-tight">
                            {isFr ? 'Votre profil est prêt à être publié !' : 'Your profile is ready to publish!'}
                          </p>
                          <p className="text-xs font-medium text-white/85 mt-0.5">
                            {isFr ? 'Toutes les phases sont complétées. Publiez pour devenir visible aux entreprises.' : 'All phases are complete. Publish to become visible to companies.'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handlePublish}
                        disabled={isPublishing}
                        className="px-7 py-3 rounded-2xl bg-white text-harx-600 hover:bg-white/90 flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-60 whitespace-nowrap"
                      >
                        {isPublishing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Check size={18} strokeWidth={3} />}
                        {isPublishing ? (isFr ? 'Publication...' : 'Publishing...') : (isFr ? 'Publier mon profil' : 'Publish my profile')}
                      </button>
                    </div>
                  ) : null
                ) : isRepCoreOnboardingDone(profile) ? (
                  <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl bg-amber-50 border-2 border-amber-300">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-black text-amber-900">
                          {isFr ? 'Dernière étape : postuler à un gig' : 'Final step: apply to a gig'}
                        </p>
                        <p className="text-xs font-medium text-amber-800 mt-0.5">
                          {isFr
                            ? 'Parcourez la place de marché et postulez à au moins une mission pour finaliser votre onboarding.'
                            : 'Browse the marketplace and apply to at least one gig to finish your onboarding.'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/marketplace')}
                      className="px-5 py-2.5 rounded-2xl bg-gradient-harx text-white hover:opacity-90 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-harx-500/20 active:scale-95 whitespace-nowrap"
                    >
                      {isFr ? 'Voir les missions' : 'Browse missions'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : (profile.onboardingProgress?.phases?.phase2?.status === 'completed') ? (
                  <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                    <div className="flex items-start gap-3">
                      <ClipboardCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-black text-emerald-800">
                          {isFr ? 'Phase 2 complétée' : 'Phase 2 completed'}
                        </p>
                        <p className="text-xs font-medium text-emerald-700 mt-0.5">
                          {isFr ? 'Votre profil est complet. Continuez votre onboarding pour débloquer la suite.' : 'Your profile is complete. Continue your onboarding to unlock the rest.'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(getRepOnboardingStep(profile).path)}
                      className="px-5 py-2.5 rounded-2xl bg-gradient-harx text-white hover:opacity-90 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-harx-500/20 active:scale-95 whitespace-nowrap"
                    >
                      {isFr ? 'Continuer l’onboarding' : 'Continue onboarding'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="mb-6 flex items-start gap-3 p-4 rounded-2xl bg-yellow-50 border-2 border-yellow-300 animate-pulse">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-black text-yellow-800">
                        {isFr ? 'Complétez la Phase 2 pour continuer' : 'Complete Phase 2 to continue'}
                      </p>
                      <p className="text-xs font-medium text-yellow-700 mt-0.5">
                        {isFr
                          ? 'Ajoutez votre photo de profil pour compléter la Phase 2.'
                          : 'Upload your profile photo to complete Phase 2.'}
                      </p>
                    </div>
                  </div>
                )}
                {/* Action Buttons Top Right */}
                <div className="flex flex-wrap gap-3 mb-8 pb-6 border-b border-slate-200/50 justify-between items-center">
                  <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-1">{profile.personalInfo?.name}</h2>
                    <p className="text-sm font-bold text-transparent bg-clip-text bg-gradient-harx uppercase tracking-widest italic">{profile.professionalSummary?.currentRole || 'Representative'}</p>
                  </div>
                  {profile.status === 'completed' && (
                    <div className="flex items-center gap-3">
                      <div className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl flex items-center gap-2">
                        <Check className="w-4 h-4" strokeWidth={3} />
                        <span className="text-xs font-black uppercase tracking-wider">
                          {isFr ? 'Publié' : 'Published'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end mb-3">
                  {!isEditingPublicInfo ? (
                    <button
                      type="button"
                      onClick={openPublicInfoEditor}
                      className="inline-flex items-center justify-center p-2 rounded-lg bg-gradient-harx text-white hover:opacity-90 transition-all"
                      title="Edit Public Properties"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingPublicInfo(false)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={savePublicInfoInline}
                        disabled={isSavingPublicInfo}
                        className="px-3 py-1.5 rounded-lg bg-gradient-harx text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-60"
                      >
                        {isSavingPublicInfo ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                  {/* Location */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Country</label>
                    <div className="flex items-center gap-2 py-2 px-3 bg-slate-200/50 rounded-xl border border-slate-200/30 group hover:border-harx-200 transition-colors">
                      <MapPin className="w-3.5 h-3.5 text-harx-400" />
                      {isEditingPublicInfo ? (
                        <div className="relative w-full">
                          <input
                            type="text"
                            value={publicInfoDraft.country}
                            onChange={(e) => {
                              setPublicInfoDraft((prev) => ({ ...prev, country: e.target.value, countryId: '' }));
                              setIsCountryDropdownOpen(true);
                            }}
                            onFocus={() => setIsCountryDropdownOpen(true)}
                            onBlur={() => {
                              setTimeout(() => setIsCountryDropdownOpen(false), 160);
                            }}
                            placeholder="Search country..."
                            className="w-full text-sm font-bold text-slate-900 bg-transparent outline-none"
                          />
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                          {isCountryDropdownOpen && (
                            <div className="absolute z-50 mt-2 w-full bg-white border border-harx-100 rounded-xl shadow-xl overflow-hidden">
                              <div className="max-h-56 overflow-y-auto">
                                {filteredCountries.length > 0 ? (
                                  filteredCountries.map((country) => (
                                    <button
                                      key={country._id || country.countryCode || country.zoneName}
                                      type="button"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        setPublicInfoDraft((prev) => ({
                                          ...prev,
                                          country: String(country.countryName || ''),
                                          countryId: String(country._id || '')
                                        }));
                                        setIsCountryDropdownOpen(false);
                                      }}
                                      className="w-full text-left px-3 py-2.5 hover:bg-harx-50 border-b border-harx-50 last:border-b-0 transition-colors"
                                    >
                                      <div className="text-xs font-bold text-slate-800">{country.countryName}</div>
                                      <div className="text-[10px] text-slate-500">{country.countryCode || ''}</div>
                                    </button>
                                  ))
                                ) : (
                                  <div className="px-3 py-2.5 text-xs text-slate-500">No countries found.</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm font-bold text-slate-900">{getCountryDisplayName()}</span>
                      )}
                      {countryMismatch?.hasMismatch && (
                        <div className="ml-auto w-2 h-2 bg-amber-500 rounded-full animate-pulse" title="Location mismatch" />
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Direct Contact</label>
                    <div className="flex items-center gap-2 py-2 px-3 bg-slate-200/50 rounded-xl border border-slate-200/30 group hover:border-harx-500 hover:text-harx-600 transition-all">
                      <Mail className="w-3.5 h-3.5 text-slate-400 group-hover:text-harx-500" />
                      {isEditingPublicInfo ? (
                        <input
                          type="email"
                          value={publicInfoDraft.email}
                          onChange={(e) => setPublicInfoDraft((prev) => ({ ...prev, email: e.target.value }))}
                          className="w-full text-sm font-bold text-slate-900 bg-transparent outline-none"
                        />
                      ) : (
                        <span className="text-sm font-bold text-slate-900 truncate max-w-[120px]">{profile.personalInfo?.email || 'N/A'}</span>
                      )}
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Line</label>
                    <div className="flex items-center gap-2 py-2 px-3 bg-slate-200/50 rounded-xl border border-slate-200/30 group hover:border-harx-500 hover:text-harx-600 transition-all">
                      <Phone className="w-3.5 h-3.5 text-slate-400 group-hover:text-harx-500" />
                      {isEditingPublicInfo ? (
                        <input
                          type="text"
                          value={publicInfoDraft.phone}
                          onChange={(e) => setPublicInfoDraft((prev) => ({ ...prev, phone: e.target.value }))}
                          className="w-full text-sm font-bold text-slate-900 bg-transparent outline-none"
                        />
                      ) : (
                        <span className="text-sm font-bold text-slate-900">{profile.personalInfo?.phone || 'N/A'}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Stats Grid (Score & Plan) */}
                <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-200/50 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-harx-100/20 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-harx-100/40 transition-colors"></div>
                    <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-harx-500 relative z-10">
                      <Target size={24} className="animate-pulse" />
                    </div>
                    <div className="relative z-10">
                      <div className="text-[10px] font-black text-harx-400 uppercase tracking-widest">REPS Score (Overall)</div>
                      <div className="text-2xl font-black text-harx-900 tracking-tighter leading-none mt-0.5">{calculateOverallScore()} / 100</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-200/50 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-harx-alt-100/20 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-harx-alt-100/40 transition-colors"></div>
                    <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-harx-alt-500 relative z-10">
                      <Briefcase size={24} />
                    </div>
                    <div className="relative z-10">
                      <div className="text-[10px] font-black text-harx-alt-400 uppercase tracking-widest">Growth Plan</div>
                      {isEditingPublicInfo ? (
                        <button
                          type="button"
                          onClick={() => setIsPlanModalOpen(true)}
                          className="w-full text-left text-sm font-black text-harx-alt-900 tracking-tight leading-none mt-1 bg-transparent outline-none hover:text-harx-alt-700 transition-colors"
                        >
                          {(availablePlans.find((plan) => plan._id === publicInfoDraft.growthPlanId)?.name) || 'Select a plan'}
                        </button>
                      ) : (
                        <div className="text-lg font-black text-harx-alt-900 tracking-tight leading-none mt-0.5">
                          {planData?.plan?.name || "Standard Representative"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="w-full">
          <div className="flex-1 min-h-[600px]">
            {renderActiveTab()}
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && profile.personalInfo?.photo?.url && (
        <div className="fixed inset-0 bg-slate-900/90 flex items-center justify-center z-[100] p-4 backdrop-blur-md" onClick={() => setShowImageModal(false)}>
          <div className="relative max-w-2xl w-full bg-slate-100 rounded-3xl overflow-hidden shadow-2xl border border-slate-200/50" onClick={e => e.stopPropagation()}>
            <button className="absolute top-4 right-4 p-2 bg-slate-900/20 hover:bg-slate-900/40 text-white rounded-full transition-colors z-10" onClick={() => setShowImageModal(false)}>
              <X size={24} />
            </button>
            <img src={profile.personalInfo.photo.url} alt="Profile" className="w-full h-auto object-contain" style={{ maxHeight: '80vh' }} />
          </div>
        </div>
      )}

      {/* Plan Selection Modal */}
      {isPlanModalOpen && (
        <div
          className="fixed inset-0 z-[120] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsPlanModalOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-3xl border border-harx-100 bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-harx-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-harx-900">Select Representative Plan</h3>
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                className="p-1.5 rounded-lg bg-harx-50 text-harx-700 hover:bg-harx-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 max-h-[55vh] overflow-y-auto space-y-2">
              {availablePlans.map((plan) => {
                const isSelected = tempSelectedPlanId === plan._id;
                return (
                  <button
                    key={plan._id}
                    type="button"
                    onClick={() => setTempSelectedPlanId(plan._id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${isSelected
                        ? 'border-harx-400 bg-harx-50 shadow-sm'
                        : 'border-slate-200 hover:border-harx-200 hover:bg-harx-50/40'
                      }`}
                  >
                    <div className="text-sm font-black text-harx-900">{plan.name}</div>
                    <div className="text-xs text-slate-600">${plan.price} / month</div>
                  </button>
                );
              })}
            </div>
            <div className="px-5 py-4 border-t border-harx-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setPublicInfoDraft((prev) => ({ ...prev, growthPlanId: tempSelectedPlanId }));
                  setIsPlanModalOpen(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-gradient-harx text-white text-xs font-bold uppercase tracking-wider hover:opacity-90"
              >
                Choose Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Crop Modal */}
      {isCropModalOpen && imgSrc && (
        <div className="fixed inset-0 z-[130] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900">Crop Profile Photo</h3>
              <button
                onClick={() => setIsCropModalOpen(false)}
                className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 bg-slate-50/50 flex justify-center items-center">
              <ReactCrop
                crop={crop}
                onChange={c => setCrop(c)}
                onComplete={c => setCompletedCrop(c)}
                aspect={1}
                circularCrop
              >
                <img
                  ref={imgRef}
                  src={imgSrc}
                  alt="Crop"
                  onLoad={onImageLoad}
                  className="max-w-full max-h-[50vh] object-contain"
                />
              </ReactCrop>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-end gap-3">
              <button
                onClick={() => setIsCropModalOpen(false)}
                className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCropComplete}
                className="px-8 py-2.5 rounded-xl bg-gradient-harx text-white text-sm font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-harx-500/20 active:scale-95"
              >
                Save Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};