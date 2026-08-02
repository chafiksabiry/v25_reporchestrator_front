import React, { useState, useEffect, useRef } from 'react';
import ReactCrop, { Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {
  X, Save, RefreshCw, Trash2, ChevronLeft
} from 'lucide-react';
import { updateProfileData, updateBasicInfo, updateExperience, updateSkills, checkCountryMismatch, updateUserFullName } from '../../utils/profileUtils';
import config from '../../config';
import { repApiUrl } from '../../utils/repApiUrl';
import { repWizardApi, Timezone } from '../../services/api/repWizard';
import { fetchAllSkills, SkillsByCategory, Skill } from '../../services/api/skills';
import { fetchAllLanguages, Language } from '../../services/api/languages';

// Import Modular Components
import { EditNavbar } from './profile/edit/EditNavbar';
import { EditProfileTab } from './profile/edit/tabs/EditProfileTab';
import { EditSpecializationTab } from './profile/edit/tabs/EditSpecializationTab';
import { EditSkillsTab } from './profile/edit/tabs/EditSkillsTab';
import { EditExperienceTab } from './profile/edit/tabs/EditExperienceTab';
import { EditLanguagesTab } from './profile/edit/tabs/EditLanguagesTab';
import { EditAvailabilityTab } from './profile/edit/tabs/EditAvailabilityTab';

// Add CSS styles for error highlighting
const styles = `
  @keyframes highlightError {
    0% { background-color: rgba(239, 68, 68, 0.2); }
    50% { background-color: rgba(239, 68, 68, 0.3); }
    100% { background-color: rgba(239, 68, 68, 0.2); }
  }

  .highlight-error {
    animation: highlightError 1s ease-in-out;
    border-radius: 0.375rem;
    padding: 0.5rem;
  }
`;

// Add styles to document
if (typeof document !== 'undefined' && !document.getElementById('profile-editor-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'profile-editor-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

// Helper function to format dates safely
const formatDate = (dateString: string | undefined) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString();
  } catch (e) {
    return dateString;
  }
};

// Language proficiency levels
const proficiencyLevels = [
  { value: 'A1', label: 'A1 - Beginner', description: 'Can understand and use basic phrases, introduce themselves' },
  { value: 'A2', label: 'A2 - Elementary', description: 'Can communicate in simple, routine situations' },
  { value: 'B1', label: 'B1 - Intermediate', description: 'Can deal with most situations while traveling, describe experiences' },
  { value: 'B2', label: 'B2 - Upper Intermediate', description: 'Can interact fluently with native speakers, produce clear text' },
  { value: 'C1', label: 'C1 - Advanced', description: 'Can use language flexibly, produce clear well-structured text' },
  { value: 'C2', label: 'C2 - Mastery', description: 'Can understand virtually everything, express spontaneously' }
];

type ProfileEditViewProps = {
  profile: any;
  onSave: (updatedProfile: any) => void;
  initialTab?: string;
};

// Define proper types
interface AvailabilityHours {
  start: string;
  end: string;
}

interface ScheduleDay {
  day: string;
  hours: AvailabilityHours;
}

interface Availability {
  schedule: ScheduleDay[];
  timeZone: string | Timezone;
  flexibility: string[];
}

interface Profile {
  _id: string;
  personalInfo: {
    profileImage?: string;
    photo?: {
      url: string;
      publicId: string;
    };
    name?: string;
    [key: string]: any;
  };
  availability: Availability;  // Make it required but initialize with defaults
  [key: string]: any;
}

interface PhotoUploadResponse {
  photoUrl: string;
  publicId: string;
  [key: string]: any;
}

// Define interfaces for Industry and Activity
export interface Industry {
  _id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  _id: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Modified uploadPhoto function with token
const uploadPhoto = async (agentId: string, photoFile: Blob): Promise<PhotoUploadResponse> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  const formData = new FormData();
  formData.append('photo', photoFile);

  try {
    const response = await fetch(repApiUrl(`/profiles/${agentId}/photo`), {
      method: 'PUT',
      body: formData,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const updatedProfile = await response.json();
    return updatedProfile;
  } catch (error) {
    console.error('Error uploading photo:', error);
    throw error;
  }
};

// Function to convert base64 to blob
const base64ToBlob = async (base64String: string): Promise<Blob> => {
  // Remove data URL prefix if present
  const base64WithoutPrefix = base64String.split(',')[1] || base64String;

  // Decode base64
  const byteString = atob(base64WithoutPrefix);

  // Create an array buffer from the decoded string
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);

  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  // Create blob from array buffer
  return new Blob([ab], { type: 'image/jpeg' });
};

// Function to upload presentation video with progress
const uploadPresentationVideo = async (
  agentId: string,
  videoBlob: Blob,
  onProgress?: (progress: number) => void
): Promise<any> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  const formData = new FormData();
  // Convert blob to file for proper upload
  const videoFile = new File([videoBlob], 'presentation-video.webm', {
    type: 'video/webm'
  });
  formData.append('video', videoFile);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        onProgress(percentComplete);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText);
          console.log('Video uploaded successfully:', result);
          resolve(result);
        } catch (error) {
          reject(new Error('Invalid JSON response'));
        }
      } else {
        reject(new Error(`HTTP error! status: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error occurred'));
    });

    xhr.open('PUT', repApiUrl(`/profiles/${agentId}/video`));
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
};

// Add this near the top of the file with other imports
const PROFILE_UPDATE_EVENT = 'PROFILE_UPDATED';

export const ProfileEditView: React.FC<ProfileEditViewProps> = ({ profile: initialProfile, onSave, initialTab = 'profile' }) => {
  // Add console.log statements
  console.log('Initial Profile Data:', initialProfile);
  console.log('Initial Availability Data:', initialProfile.availability);

  // Initialize profile state with proper default values for availability
  const [profile, setProfile] = useState<Profile>(() => {
    // Create default availability object
    const defaultAvailability: Availability = {
      schedule: [],
      timeZone: '',
      flexibility: []
    };

    // Merge with initial profile data if it exists
    const mergedAvailability: Availability = {
      ...defaultAvailability,
      ...(initialProfile.availability || {}),
      // Ensure required fields exist with proper types
      schedule: initialProfile.availability?.schedule || [],
      flexibility: initialProfile.availability?.flexibility || [],
      timeZone: initialProfile.availability?.timeZone || ''
    };

    // Ensure timeZone is never null
    if (mergedAvailability.timeZone === null || mergedAvailability.timeZone === undefined) {
      mergedAvailability.timeZone = '';
    }

    return {
      ...initialProfile,
      availability: mergedAvailability
    };
  });
  const [activeTab, setActiveTab] = useState(initialTab);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [tempProfileDescription, setTempProfileDescription] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track which sections have been modified
  const [modifiedSections, setModifiedSections] = useState({
    personalInfo: false,
    professionalSummary: false,
    skills: false,
    experience: false,
    languages: false,
    availability: false,
    profileImage: false
  });

  // Additional state for editing
  const [tempLanguage, setTempLanguage] = useState({ language: '', proficiency: 'B1' });

  // States for languages data
  const [availableLanguages, setAvailableLanguages] = useState<Language[]>([]);
  const [loadingLanguages, setLoadingLanguages] = useState(false);

  // States for language dropdown
  const [languageSearchTerm, setLanguageSearchTerm] = useState('');
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [filteredLanguages, setFilteredLanguages] = useState<Language[]>([]);
  const [selectedLanguageIndex, setSelectedLanguageIndex] = useState(-1);

  const [tempCompany, setTempCompany] = useState('');
  const [showNewExperienceForm, setShowNewExperienceForm] = useState(false);


  // Initialize form data state
  const [newExperience, setNewExperience] = useState({
    title: '',
    company: '',
    startDate: '',
    endDate: '',
    responsibilities: [''],
    isPresent: false
  });

  // Add state for editing experience
  const [editingExperienceId, setEditingExperienceId] = useState<number | null>(null);

  const [showCropModal, setShowCropModal] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 90,
    x: 5,
    y: 5,
    height: 90
  });
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageToShow, setImageToShow] = useState<string | null>(null);

  // Add new state for tracking photo deletion
  const [isPhotoMarkedForDeletion, setIsPhotoMarkedForDeletion] = useState(false);

  // States for timezone and country data
  const [countries, setCountries] = useState<Timezone[]>([]);
  const [timezones, setTimezones] = useState<Timezone[]>([]);
  const [allTimezones, setAllTimezones] = useState<Timezone[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [loadingTimezones, setLoadingTimezones] = useState(false);

  // States for searchable country dropdown
  const [countrySearchTerm, setCountrySearchTerm] = useState('');
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [filteredCountries, setFilteredCountries] = useState<Timezone[]>([]);
  const [selectedCountryIndex, setSelectedCountryIndex] = useState(-1);

  // States for searchable timezone dropdown
  const [timezoneSearchTerm, setTimezoneSearchTerm] = useState('');
  const [isTimezoneDropdownOpen, setIsTimezoneDropdownOpen] = useState(false);
  const [filteredTimezones, setFilteredTimezones] = useState<Timezone[]>([]);
  const [selectedTimezoneIndex, setSelectedTimezoneIndex] = useState(-1);

  // States for skills data
  const [skillsData, setSkillsData] = useState<{
    technical: SkillsByCategory;
    professional: SkillsByCategory;
    soft: SkillsByCategory;
  }>({
    technical: {},
    professional: {},
    soft: {}
  });
  const [loadingSkills, setLoadingSkills] = useState(false);

  // States for skill selection dropdown
  const [skillDropdownOpen, setSkillDropdownOpen] = useState<{ [key: string]: boolean }>({});
  const [skillSearchTerm, setSkillSearchTerm] = useState<{ [key: string]: string }>({});

  // States for industries data
  const [industriesData, setIndustriesData] = useState<Industry[]>([]);
  const [loadingIndustries, setLoadingIndustries] = useState(false);
  const [industryDropdownOpen, setIndustryDropdownOpen] = useState(false);
  const [industrySearchTerm, setIndustrySearchTerm] = useState('');

  // States for activities data
  const [activitiesData, setActivitiesData] = useState<Activity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [activityDropdownOpen, setActivityDropdownOpen] = useState(false);
  const [activitySearchTerm, setActivitySearchTerm] = useState('');

  // Add state for country mismatch checking
  const [countryMismatch, setCountryMismatch] = useState<{
    hasMismatch: boolean;
    firstLoginCountry?: string;
    selectedCountry?: string;
    firstLoginCountryCode?: string;
  } | null>(null);
  const [checkingCountryMismatch, setCheckingCountryMismatch] = useState(false);
  const [showLoadingSpinner, setShowLoadingSpinner] = useState(false);

  // Video recording states
  // New Flow: Has Video → Delete (show confirmation) → Either cancel or confirm deletion
  // After confirmation: Show "Record Video" → Record → Show "Retake" or "Use This Video"
  // No delete button on new recordings (original was already deleted)
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [hasShownCompletionToast, setHasShownCompletionToast] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [recordedVideoBlob, setRecordedVideoBlob] = useState<Blob | null>(null);
  const [videoUploaded, setVideoUploaded] = useState(false);
  const [isExistingVideoMarkedForDeletion, setIsExistingVideoMarkedForDeletion] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [existingVideoDeleted, setExistingVideoDeleted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (initialProfile) {
      setProfile(initialProfile);
      setTempProfileDescription(initialProfile.professionalSummary?.profileDescription || '');

      // Set initial country search term if country is already selected
      if (initialProfile.personalInfo?.country) {
        if (typeof initialProfile.personalInfo.country === 'object') {
          setCountrySearchTerm(initialProfile.personalInfo.country.countryName || '');
          setSelectedCountry(initialProfile.personalInfo.country.countryCode || '');
        }
      }

      // Set initial timezone search term if timezone is already selected
      if (initialProfile.availability?.timeZone) {
        if (typeof initialProfile.availability.timeZone === 'object' && initialProfile.availability.timeZone !== null) {
          setTimezoneSearchTerm(repWizardApi.formatTimezone(initialProfile.availability.timeZone) || '');
        }
      }
    }
  }, [initialProfile]);

  useEffect(() => {
    setActiveTab(initialTab || 'profile');
  }, [initialTab]);

  // Open add dropdowns immediately when landing on edit list tabs.
  useEffect(() => {
    if (activeTab === 'skills') {
      setSkillDropdownOpen({
        technical: true,
        professional: true,
        soft: true
      });
    }

    if (activeTab === 'specialization') {
      setIndustryDropdownOpen(true);
      setActivityDropdownOpen(true);
    }

    if (activeTab === 'languages') {
      setIsLanguageDropdownOpen(true);
    }
  }, [activeTab]);

  // Load countries and all timezones on component mount
  useEffect(() => {
    const loadCountries = async () => {
      try {
        console.log('🌍 Loading countries...');
        const countriesData = await repWizardApi.getCountries();
        setCountries(countriesData);
        console.log('✅ Countries loaded:', countriesData.length);
      } catch (error) {
        console.error('❌ Error loading countries:', error);
        showToast('Failed to load countries', 'error');
      }
    };

    const loadAllTimezones = async () => {
      try {
        console.log('🌐 Loading all timezones...');
        const allTimezonesData = await repWizardApi.getTimezones();
        setAllTimezones(allTimezonesData);
        console.log('✅ All timezones loaded:', allTimezonesData.length);
      } catch (error) {
        console.error('❌ Error loading all timezones:', error);
        showToast('Failed to load timezones', 'error');
      }
    };

    loadCountries();
    loadAllTimezones();
  }, []);

  // Load skills data on component mount
  useEffect(() => {
    const loadSkills = async () => {
      try {
        setLoadingSkills(true);
        console.log('🔧 Loading skills...');
        const skills = await fetchAllSkills();
        setSkillsData(skills);
        console.log('✅ Skills loaded:', skills);
      } catch (error) {
        console.error('❌ Error loading skills:', error);
        showToast('Failed to load skills', 'error');
      } finally {
        setLoadingSkills(false);
      }
    };

    loadSkills();
  }, []);

  // Load languages data on component mount
  useEffect(() => {
    const loadLanguages = async () => {
      try {
        setLoadingLanguages(true);
        console.log('🌐 Loading languages...');
        const languages = await fetchAllLanguages();
        setAvailableLanguages(languages);
        console.log('✅ Languages loaded:', languages.length);
      } catch (error) {
        console.error('❌ Error loading languages:', error);
        showToast('Failed to load languages', 'error');
      } finally {
        setLoadingLanguages(false);
      }
    };

    loadLanguages();
  }, []);

  // Load industries data on component mount
  useEffect(() => {
    const loadIndustries = async () => {
      try {
        setLoadingIndustries(true);
        console.log('🏭 Loading industries...');
        const response = await fetch(repApiUrl('/industries'));
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.success) {
          setIndustriesData(data.data);
          console.log('✅ Industries loaded:', data.data.length);
        } else {
          throw new Error(data.message || 'Failed to load industries');
        }
      } catch (error) {
        console.error('❌ Error loading industries:', error);
        showToast('Failed to load industries', 'error');
      } finally {
        setLoadingIndustries(false);
      }
    };

    loadIndustries();
  }, []);

  // Load activities data on component mount
  useEffect(() => {
    const loadActivities = async () => {
      try {
        setLoadingActivities(true);
        console.log('🎯 Loading activities...');
        const response = await fetch(repApiUrl('/activities'));
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.success) {
          setActivitiesData(data.data);
          console.log('✅ Activities loaded:', data.data.length);
        } else {
          throw new Error(data.message || 'Failed to load activities');
        }
      } catch (error) {
        console.error('❌ Error loading activities:', error);
        showToast('Failed to load activities', 'error');
      } finally {
        setLoadingActivities(false);
      }
    };

    loadActivities();
  }, []);

  // Filter languages based on search term
  useEffect(() => {
    if (!languageSearchTerm) {
      setFilteredLanguages(availableLanguages);
    } else {
      const filtered = availableLanguages.filter(language =>
        language.name.toLowerCase().includes(languageSearchTerm.toLowerCase()) ||
        language.code.toLowerCase().includes(languageSearchTerm.toLowerCase()) ||
        language.nativeName.toLowerCase().includes(languageSearchTerm.toLowerCase())
      );
      setFilteredLanguages(filtered);
    }
  }, [availableLanguages, languageSearchTerm]);

  // Load timezones when country is selected and auto-suggest main timezone
  useEffect(() => {
    const loadTimezones = async () => {
      if (!selectedCountry) {
        setTimezones([]);
        return;
      }

      try {
        setLoadingTimezones(true);
        console.log(`🌐 Loading timezones for country: ${selectedCountry}`);
        const timezonesData = await repWizardApi.getTimezonesByCountry(selectedCountry);
        setTimezones(timezonesData);
        console.log('✅ Timezones loaded:', timezonesData.length);

        // Auto-suggest main timezone only if no timezone is currently set
        const currentTimezone = profile.availability.timeZone;
        if ((!currentTimezone || currentTimezone === '' || currentTimezone === null) && timezonesData.length > 0) {
          // Find the main timezone (usually the first one or one with highest priority)
          const mainTimezone = timezonesData[0]; // Take the first timezone as main
          console.log('🎯 Auto-suggesting main timezone:', mainTimezone.zoneName);

          setProfile((prev: Profile) => ({
            ...prev,
            availability: {
              ...prev.availability,
              timeZone: mainTimezone._id
            }
          }));
          setModifiedSections(prev => ({
            ...prev,
            availability: true
          }));
        }
      } catch (error) {
        console.error('❌ Error loading timezones:', error);
        showToast('Failed to load timezones', 'error');
      } finally {
        setLoadingTimezones(false);
      }
    };

    loadTimezones();
  }, [selectedCountry]); // Only depend on selectedCountry to avoid infinite loops

  // Filter countries based on search term
  useEffect(() => {
    if (!countrySearchTerm) {
      setFilteredCountries(countries);
    } else {
      const filtered = countries.filter(country =>
        country.countryName.toLowerCase().includes(countrySearchTerm.toLowerCase()) ||
        country.countryCode.toLowerCase().includes(countrySearchTerm.toLowerCase())
      );
      setFilteredCountries(filtered);
    }
  }, [countries, countrySearchTerm]);

  // Filter timezones based on search term
  useEffect(() => {
    // Combine suggested timezones and all other timezones
    const allAvailableTimezones = [...timezones, ...allTimezones.filter(tz => !timezones.some(suggestedTz => suggestedTz._id === tz._id))];

    if (!timezoneSearchTerm) {
      setFilteredTimezones(allAvailableTimezones);
    } else {
      const filtered = allAvailableTimezones.filter(timezone =>
        timezone.countryName.toLowerCase().includes(timezoneSearchTerm.toLowerCase()) ||
        timezone.zoneName.toLowerCase().includes(timezoneSearchTerm.toLowerCase()) ||
        timezone.countryCode.toLowerCase().includes(timezoneSearchTerm.toLowerCase())
      );
      setFilteredTimezones(filtered);
    }
  }, [timezones, allTimezones, timezoneSearchTerm]);

  // Show toast message
  const showToast = (message: string, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Helper function to get language data by ID
  const getLanguageById = (languageId: string): Language | null => {
    return availableLanguages.find(lang => lang._id === languageId) || null;
  };

  // Helper function to get language display name
  const getLanguageDisplayName = (lang: any): string => {
    if (typeof lang.language === 'object' && lang.language) {
      return lang.language.name || 'Unknown Language';
    } else if (typeof lang.language === 'string') {
      const languageData = getLanguageById(lang.language);
      return languageData ? languageData.name : 'Unknown Language';
    }
    return 'Unknown Language';
  };

  // Helper function to get language code
  const getLanguageCode = (lang: any): string => {
    if (typeof lang.language === 'object' && lang.language) {
      return lang.language.code || '';
    } else if (typeof lang.language === 'string') {
      const languageData = getLanguageById(lang.language);
      return languageData ? languageData.code : '';
    }
    return '';
  };

  // Get timezone and country mismatch info
  const getTimezoneMismatchInfo = () => {
    // Check if timeZone exists and is not null
    if (!profile.availability.timeZone) {
      return null;
    }

    const currentTimezoneId = typeof profile.availability.timeZone === 'object'
      ? profile.availability.timeZone._id
      : profile.availability.timeZone;

    const selectedCountryData = countries.find(c => c.countryCode === selectedCountry);
    const selectedTimezoneData = allTimezones.find(tz => tz._id === currentTimezoneId);

    if (!selectedCountryData || !selectedTimezoneData || !currentTimezoneId) {
      return null;
    }

    // Check if timezone belongs to selected country
    const timezoneCountry = selectedTimezoneData.countryCode;
    const selectedCountryCode = selectedCountryData.countryCode;

    if (timezoneCountry !== selectedCountryCode) {
      const timezoneCountryData = countries.find(c => c.countryCode === timezoneCountry);
      return {
        timezoneCountry: timezoneCountryData?.countryName || timezoneCountry,
        selectedCountry: selectedCountryData.countryName,
        timezoneName: selectedTimezoneData.zoneName
      };
    }

    return null;
  };

  // Validate profile data
  const validateProfile = () => {
    const errors: Record<string, string> = {};

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Phone validation regex - accepts various formats with optional country code
    const phoneRegex = /^\+?[\d\s-]{10,}$/;

    // Validate languages (at least one required)
    if (!profile.personalInfo?.languages?.length) {
      errors.languages = 'At least one language is required';
    }

    // Validate name
    if (!profile.personalInfo?.name?.trim()) {
      errors.name = 'Name is required';
    }

    // Validate country
    if (!profile.personalInfo?.country) {
      errors.country = 'Country is required';
    }

    // Validate email
    if (!profile.personalInfo?.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(profile.personalInfo.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Validate phone
    if (!profile.personalInfo?.phone?.trim()) {
      errors.phone = 'Phone number is required';
    } else if (profile.personalInfo.phone.trim() && !phoneRegex.test(profile.personalInfo.phone.replace(/\s+/g, ''))) {
      errors.phone = 'Please enter a valid phone number';
    }

    return { isValid: Object.keys(errors).length === 0, errors };
  };

  // Render error messages
  const renderError = (error: string | undefined, id: string) => {
    if (!error) return null;
    return (
      <div id={`error-${id}`} className="text-red-600 text-sm mt-1 flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {error}
      </div>
    );
  };

  // Add function to fetch updated profile data
  const refreshProfileData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(repApiUrl(`/profiles/${profile._id}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedProfile = await response.json();
      setProfile(updatedProfile);
      return updatedProfile;
    } catch (error) {
      console.error('Error refreshing profile data:', error);
      throw error;
    }
  };

  // Modified handleSave to include photo deletion
  const handleSave = async () => {
    console.log('🔄 Starting save process...');
    console.log('Modified sections:', modifiedSections);
    console.log('Current profile state:', profile);

    const { isValid, errors } = validateProfile();
    setValidationErrors(errors);

    if (!isValid) {
      console.log('❌ Validation failed:', errors);
      showToast('Please fix validation errors before saving', 'error');
      return;
    }

    setLoading(true);
    try {
      // Handle photo deletion first if marked for deletion
      if (isPhotoMarkedForDeletion) {
        console.log('📝 Processing photo deletion...');
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        console.log('🔗 Deleting photo for profile:', profile._id);
        const deleteResponse = await fetch(repApiUrl(`/profiles/${profile._id}/photo`), {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!deleteResponse.ok) {
          console.error('❌ Failed to delete photo. Status:', deleteResponse.status);
          throw new Error(`Failed to delete photo: ${deleteResponse.status}`);
        }
        console.log('✅ Photo deleted successfully from server');
      }

      // Handle photo upload if modified
      if (modifiedSections.profileImage && imagePreview && !isPhotoMarkedForDeletion) {
        try {
          setUploadingPhoto(true);
          console.log('📸 Uploading new profile photo...');

          const photoBlob = await base64ToBlob(imagePreview);
          const photoResult = await uploadPhoto(profile._id, photoBlob);

          console.log('✅ Photo uploaded successfully');
        } catch (error) {
          console.error('❌ Error uploading photo:', error);
          if (error instanceof Error && error.message === 'No authentication token found') {
            showToast('Please log in again to upload photo', 'error');
          } else {
            showToast('Failed to upload profile photo', 'error');
          }
          return;
        } finally {
          setUploadingPhoto(false);
        }
      }

      // Handle video operations if modified
      if (modifiedSections.personalInfo || modifiedSections.professionalSummary) {
        // Case 1: Existing video marked for deletion + new video recorded → Just upload new video (replace)
        if (isExistingVideoMarkedForDeletion && recordedVideoBlob) {
          try {
            setUploadingVideo(true);
            setUploadProgress(0);
            console.log('🎥 Replacing video with new recording...');

            const videoResult = await uploadPresentationVideo(
              profile._id,
              recordedVideoBlob,
              (progress) => setUploadProgress(progress)
            );

            console.log('✅ Video replaced successfully', videoResult);
            setVideoUploaded(true);
            setIsExistingVideoMarkedForDeletion(false); // Reset deletion flag
            showToast('Video replaced successfully!', 'success');
          } catch (error) {
            console.error('❌ Error replacing video:', error);
            showToast('Failed to replace video', 'error');
            return;
          } finally {
            setUploadingVideo(false);
            setUploadProgress(0);
          }
        }
        // Case 2: Existing video marked for deletion + no new video → Delete existing video
        else if (isExistingVideoMarkedForDeletion && !recordedVideoBlob) {
          try {
            console.log('🗑️ Deleting existing video...');

            await deleteVideoFromServer();

            console.log('✅ Video deleted successfully');
            setIsExistingVideoMarkedForDeletion(false); // Reset deletion flag
            showToast('Video deleted successfully!', 'success');
          } catch (error) {
            console.error('❌ Error deleting video:', error);
            showToast('Failed to delete video', 'error');
            return;
          }
        }
        // Case 3: No existing video + new video recorded → Upload new video
        else if (!isExistingVideoMarkedForDeletion && recordedVideoBlob) {
          try {
            setUploadingVideo(true);
            setUploadProgress(0);
            console.log('🎥 Uploading new presentation video...');

            const videoResult = await uploadPresentationVideo(
              profile._id,
              recordedVideoBlob,
              (progress) => setUploadProgress(progress)
            );

            console.log('✅ Video uploaded successfully', videoResult);
            setVideoUploaded(true);
            showToast('Video uploaded successfully!', 'success');
          } catch (error) {
            console.error('❌ Error uploading video:', error);
            if (error instanceof Error && error.message === 'No authentication token found') {
              showToast('Please log in again to upload video', 'error');
            } else {
              showToast('Failed to upload presentation video', 'error');
            }
            return;
          } finally {
            setUploadingVideo(false);
            setUploadProgress(0);
          }
        }
      }

      // Continue with other profile updates.
      // Build update tasks first to avoid sequential waits when sections are independent.
      const updateTasks: Promise<any>[] = [];

      // Save basic info once (personal info + languages), instead of calling the same endpoint twice.
      if (modifiedSections.personalInfo || modifiedSections.languages) {
        const { presentationVideo, ...personalInfoWithoutVideo } = profile.personalInfo;
        const basicInfoPayload = modifiedSections.languages
          ? {
            ...personalInfoWithoutVideo,
            languages: profile.personalInfo?.languages || []
          }
          : personalInfoWithoutVideo;

        console.log('📝 Saving basic info...', {
          endpoint: `/api/profiles/${profile._id}/basic-info`,
          data: basicInfoPayload
        });
        updateTasks.push(updateBasicInfo(profile._id, basicInfoPayload));

        // Keep the auth-level identity (users.fullName) in sync with the
        // profile display name whenever the name was edited.
        if (modifiedSections.personalInfo && profile.personalInfo?.name?.trim()) {
          const authUserId =
            config.getUserData()?.userId ||
            localStorage.getItem('userId') ||
            sessionStorage.getItem('userId') ||
            '';
          if (authUserId) {
            updateTasks.push(
              updateUserFullName(authUserId, profile.personalInfo.name).catch((err) => {
                console.warn('⚠️ Could not sync users.fullName:', err);
              })
            );
          }
        }
      }

      // Save professional summary if modified
      if (modifiedSections.professionalSummary) {
        console.log('📝 Saving professional summary...', {
          endpoint: `/api/profiles/${profile._id}`,
          data: { professionalSummary: profile.professionalSummary }
        });
        updateTasks.push(updateProfileData(profile._id, { professionalSummary: profile.professionalSummary }));
      }

      // Save skills if modified
      if (modifiedSections.skills) {
        console.log('📝 Saving skills...');

        // Helper function to get full skill object by ID
        const getFullSkillObject = (skillId: string, skillType: 'technical' | 'professional' | 'soft') => {
          const skillsForType = skillsData[skillType];
          for (const category of Object.values(skillsForType)) {
            const foundSkill = category.find((s: Skill) => s._id === skillId);
            if (foundSkill) {
              return foundSkill;
            }
          }
          return null;
        };

        // Format skills as objects with proper structure
        const formattedSkills = {
          technical: (profile.skills?.technical || []).map((skillRef: any) => {
            const skillId = typeof skillRef === 'string' ? skillRef : skillRef.skill;
            const fullSkillObject = getFullSkillObject(skillId, 'technical');
            if (fullSkillObject) {
              return {
                _id: fullSkillObject._id,
                name: fullSkillObject.name,
                description: fullSkillObject.description
              };
            }
            return { _id: skillId, name: 'Unknown', description: '' };
          }),
          professional: (profile.skills?.professional || []).map((skillRef: any) => {
            const skillId = typeof skillRef === 'string' ? skillRef : skillRef.skill;
            const fullSkillObject = getFullSkillObject(skillId, 'professional');
            if (fullSkillObject) {
              return {
                _id: fullSkillObject._id,
                name: fullSkillObject.name,
                description: fullSkillObject.description
              };
            }
            return { _id: skillId, name: 'Unknown', description: '' };
          }),
          soft: (profile.skills?.soft || []).map((skillRef: any) => {
            const skillId = typeof skillRef === 'string' ? skillRef : skillRef.skill;
            const fullSkillObject = getFullSkillObject(skillId, 'soft');
            if (fullSkillObject) {
              return {
                _id: fullSkillObject._id,
                name: fullSkillObject.name,
                description: fullSkillObject.description
              };
            }
            return { _id: skillId, name: 'Unknown', description: '' };
          }),
          // Preserve existing contactCenter skills with their assessment results
          contactCenter: (profile.skills?.contactCenter || []).map((skill: any) => ({
            skill: skill.skill || '',
            category: skill.category || 'Customer Service',
            proficiency: skill.proficiency || 'Basic',
            assessmentResults: skill.assessmentResults || {
              score: 0,
              strengths: [],
              improvements: [],
              feedback: '',
              tips: [],
              keyMetrics: {
                professionalism: 0,
                effectiveness: 0,
                customerFocus: 0
              },
              completedAt: new Date().toISOString()
            }
          }))
        };

        console.log('Skills data to be sent:', {
          endpoint: `/api/profiles/${profile._id}/skills`,
          data: formattedSkills
        });
        updateTasks.push(updateSkills(profile._id, formattedSkills));
      }

      // Save experience if modified
      if (modifiedSections.experience) {
        console.log('📝 Saving experience...', {
          endpoint: `/api/profiles/${profile._id}/experience`,
          data: { experience: profile.experience }
        });
        updateTasks.push(updateExperience(profile._id, profile.experience));
      }

      // Save availability if modified
      if (modifiedSections.availability) {
        console.log('📝 Saving availability...', {
          endpoint: `/api/profiles/${profile._id}`,
          data: { availability: profile.availability }
        });
        updateTasks.push(updateProfileData(profile._id, { availability: profile.availability }));
      }

      if (updateTasks.length > 0) {
        await Promise.all(updateTasks);
      }

      // After all updates are done, refresh the profile data
      const updatedProfile = await refreshProfileData();

      // Reset modified sections
      setModifiedSections({
        personalInfo: false,
        professionalSummary: false,
        skills: false,
        experience: false,
        languages: false,
        availability: false,
        profileImage: false
      });

      // Reset photo deletion state after successful save
      setIsPhotoMarkedForDeletion(false);

      // Reset video states after successful save
      setUploadProgress(0);
      setUploadingVideo(false);
      setIsExistingVideoMarkedForDeletion(false);
      setExistingVideoDeleted(false);
      setShowDeleteConfirmation(false);

      console.log('✅ All changes saved successfully');
      showToast('Profile saved successfully', 'success');

      // Update localStorage and dispatch event for TopBar update
      localStorage.setItem('profileData', JSON.stringify(updatedProfile));
      window.dispatchEvent(new Event(PROFILE_UPDATE_EVENT));

      onSave(updatedProfile);
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        profileId: profile._id
      });
      showToast('Failed to save profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle profile changes for personal info
  const handleProfileChange = (field: string, value: any) => {
    // Update local state
    const updatedPersonalInfo = {
      ...profile.personalInfo,
      [field]: value
    };

    setProfile((prev: Profile) => ({
      ...prev,
      personalInfo: updatedPersonalInfo
    }));

    // Mark personal info section as modified
    setModifiedSections(prev => ({
      ...prev,
      personalInfo: true
    }));

    // Clear validation error for this field if value is valid
    if (value && value.trim()) {
      setValidationErrors((prev: Record<string, string>) => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Add language to profile
  const addLanguage = (selectedLanguage: Language) => {
    // Check if language is already added
    const isAlreadyAdded = profile.personalInfo?.languages?.some((lang: any) => {
      const langId = typeof lang.language === 'object' ? lang.language._id : lang.language;
      return langId === selectedLanguage._id;
    });

    if (isAlreadyAdded) {
      showToast('This language is already added', 'error');
      return;
    }

    const newLanguageEntry = {
      language: selectedLanguage._id,
      proficiency: tempLanguage.proficiency
    };

    const updatedLanguages = [
      ...(profile.personalInfo?.languages || []),
      newLanguageEntry
    ];

    // Update local state
    setProfile((prev: Profile) => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        languages: updatedLanguages
      }
    }));

    // Mark languages section as modified
    setModifiedSections(prev => ({
      ...prev,
      languages: true
    }));

    // Clear any language-related validation errors
    setValidationErrors((prev: Record<string, string>) => ({
      ...prev,
      languages: ''
    }));

    // Reset form
    setTempLanguage({ language: '', proficiency: 'B1' });
    setLanguageSearchTerm('');
    setIsLanguageDropdownOpen(false);

    showToast('Language added successfully', 'success');
  };

  // Remove language from profile
  const removeLanguage = (index: number) => {
    const updatedLanguages = profile.personalInfo.languages.filter((_: any, i: number) => i !== index);

    // Update local state
    setProfile((prev: Profile) => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        languages: updatedLanguages
      }
    }));

    // Mark languages section as modified
    setModifiedSections(prev => ({
      ...prev,
      languages: true
    }));

    // Set validation error if removing last language
    if (updatedLanguages.length === 0) {
      setValidationErrors((prev: Record<string, string>) => ({
        ...prev,
        languages: 'At least one language is required'
      }));
    }
  };

  // Update language proficiency
  const updateLanguageProficiency = (index: number, newProficiency: string) => {
    const updatedLanguages = profile.personalInfo.languages.map((lang: any, i: number) =>
      i === index ? { ...lang, proficiency: newProficiency } : lang
    );

    // Update local state
    setProfile((prev: Profile) => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        languages: updatedLanguages
      }
    }));

    // Mark languages section as modified
    setModifiedSections(prev => ({
      ...prev,
      languages: true
    }));
  };

  // New skill handlers for skill selector
  const handleSkillsChange = (type: 'technical' | 'professional' | 'soft', skills: Array<{ skill: string }>) => {
    setProfile((prev: Profile) => ({
      ...prev,
      skills: {
        ...prev.skills,
        [type]: skills
      }
    }));

    setModifiedSections(prev => ({
      ...prev,
      skills: true
    }));
  };

  // Get current skills for each type in the expected format
  const getCurrentSkills = (type: 'technical' | 'professional' | 'soft') => {
    const skills = profile.skills?.[type] || [];
    return skills.map((skill: any) => ({
      skill: skill.skill?._id || skill.skill || skill._id || skill
    }));
  };

  // Function to start editing an experience
  const startEditingExperience = (index: number) => {
    const experience = profile.experience[index];
    setNewExperience({
      title: experience.title || '',
      company: experience.company || '',
      startDate: experience.startDate ? new Date(experience.startDate).toISOString().split('T')[0] : '',
      endDate: experience.endDate === 'present' ? '' : experience.endDate ? new Date(experience.endDate).toISOString().split('T')[0] : '',
      responsibilities: experience.responsibilities || [''],
      isPresent: experience.endDate === 'present'
    });
    setEditingExperienceId(index);
    setShowNewExperienceForm(true);
  };

  // Function to save edited experience
  const saveEditedExperience = () => {
    if (editingExperienceId !== null) {
      const updatedExperiences = [...profile.experience];
      updatedExperiences[editingExperienceId] = {
        title: newExperience.title,
        company: newExperience.company,
        startDate: newExperience.startDate,
        endDate: newExperience.isPresent ? 'present' : newExperience.endDate,
        responsibilities: newExperience.responsibilities.filter(r => r.trim())
      };

      setProfile((prev: Profile) => ({
        ...prev,
        experience: updatedExperiences
      }));

      // Mark experience section as modified
      setModifiedSections(prev => ({
        ...prev,
        experience: true
      }));

      // Reset form and editing state
      setShowNewExperienceForm(false);
      setEditingExperienceId(null);
      setNewExperience({
        title: '',
        company: '',
        startDate: '',
        endDate: '',
        responsibilities: [''],
        isPresent: false
      });
    }
  };

  // Function to calculate scaled dimensions
  const calculateScaledDimensions = (originalWidth: number, originalHeight: number) => {
    const maxWidth = Math.min(window.innerWidth * 0.8, 800); // 80% of viewport width or 800px max
    const maxHeight = Math.min(window.innerHeight * 0.6, 600); // 60% of viewport height or 600px max

    let newWidth = originalWidth;
    let newHeight = originalHeight;

    // Scale down if width exceeds maxWidth
    if (newWidth > maxWidth) {
      newHeight = (maxWidth * newHeight) / newWidth;
      newWidth = maxWidth;
    }

    // Scale down further if height still exceeds maxHeight
    if (newHeight > maxHeight) {
      newWidth = (maxHeight * newWidth) / newHeight;
      newHeight = maxHeight;
    }

    return {
      width: Math.floor(newWidth),
      height: Math.floor(newHeight)
    };
  };

  // Modified handleImageChange
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        showToast('Image size should be less than 10MB', 'error');
        return;
      }

      // If photo was marked for deletion, unmark it since we're adding a new one
      if (isPhotoMarkedForDeletion) {
        setIsPhotoMarkedForDeletion(false);
        console.log('🔄 Unmarking photo deletion as new photo is being added');
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const scaledDimensions = calculateScaledDimensions(img.width, img.height);
          setImageDimensions(scaledDimensions);
          setTempImage(reader.result as string);
          setShowCropModal(true);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // Modified handleCropComplete
  const handleCropComplete = () => {
    if (imageRef.current && crop.width && crop.height) {
      const croppedImageUrl = getCroppedImg(imageRef.current, crop);
      setImagePreview(croppedImageUrl);
      setShowCropModal(false);
      setTempImage(null);

      // Ensure we mark the profile image as modified
      setModifiedSections(prev => ({
        ...prev,
        profileImage: true
      }));

      console.log('✨ New photo cropped and ready for upload');
    }
  };

  // Function to get cropped image
  const getCroppedImg = (image: HTMLImageElement, crop: Crop): string => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width!;
    canvas.height = crop.height!;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(
        image,
        crop.x! * scaleX,
        crop.y! * scaleY,
        crop.width! * scaleX,
        crop.height! * scaleY,
        0,
        0,
        crop.width!,
        crop.height!
      );
    }

    return canvas.toDataURL('image/jpeg');
  };

  // Modified handleRemoveImage to only mark for deletion
  const handleRemoveImage = () => {
    console.log('🔄 Marking photo for deletion...');
    setIsPhotoMarkedForDeletion(true);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    console.log('🧹 Cleared local image preview and file input');

    // Mark profile image as modified
    setModifiedSections(prev => ({
      ...prev,
      profileImage: true
    }));
    console.log('📝 Marked profile image as modified');

    showToast('Photo will be removed when you save changes', 'success');
    console.log('✨ Photo marked for deletion');
  };

  // Add helper function for updating schedule
  const updateSchedule = (newSchedule: ScheduleDay[]) => {
    setProfile((prev: Profile) => ({
      ...prev,
      availability: {
        ...prev.availability,
        schedule: newSchedule
      }
    }));
    setModifiedSections(prev => ({
      ...prev,
      availability: true
    }));
  };

  // Add helper function for updating flexibility
  const updateFlexibility = (newFlexibility: string[]) => {
    setProfile((prev: Profile) => ({
      ...prev,
      availability: {
        ...prev.availability,
        flexibility: newFlexibility
      }
    }));
    setModifiedSections(prev => ({
      ...prev,
      availability: true
    }));
  };

  // Video recording functions
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: true
      });

      setStream(mediaStream);
      setCameraPermission('granted');
      setShowVideoRecorder(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setCameraPermission('denied');
      showToast('Camera access denied. Please enable camera permissions.', 'error');
    }
  };


  const startRecording = () => {
    if (!stream) return;

    const recorder = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const videoUrl = URL.createObjectURL(blob);
      setRecordedVideo(videoUrl);
      setRecordedVideoBlob(blob); // Store the blob for upload

      // Mark video as modified
      setModifiedSections(prev => ({
        ...prev,
        personalInfo: true
      }));

      // Show success message
      showToast('Video recorded successfully!', 'success');
    };

    recorder.start();
    setMediaRecorder(recorder);
    setIsRecording(true);
    setRecordingTime(0);
    setShowTimeWarning(false); // Reset warning state
    setHasShownCompletionToast(false); // Reset completion toast state
    setVideoUploaded(false); // Reset upload status for new recording

    // Start timer (max 600 seconds)
    recordingTimerRef.current = setInterval(() => {
      setRecordingTime(prev => {
        const newTime = prev + 1;

        // Show warning at 540 seconds (1 minute left)
        if (newTime === 540) {
          setShowTimeWarning(true);
        }

        // Stop at exactly 600 seconds - 10 minute limit reached
        if (newTime === 600) {
          stopRecordingAndHideCamera();
          showToast('✅ Recording complete! 10-minute limit reached.', 'success');
          return 600;
        }

        // Prevent going over 600 seconds
        if (newTime > 600) {
          return 600;
        }

        return newTime;
      });
    }, 1000);
  };

  const stopRecordingAndHideCamera = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }

    // Reset warning state
    setShowTimeWarning(false);

    // Hide camera interface immediately to avoid visual flash
    setShowVideoRecorder(false);

    // Stop camera stream after a small delay to ensure recording is processed
    setTimeout(() => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      stopRecordingAndHideCamera();
    }
  };

  const deleteVideo = () => {
    if (recordedVideo) {
      URL.revokeObjectURL(recordedVideo);
    }
    setRecordedVideo(null);
    setRecordedVideoBlob(null); // Clear the blob too
    setRecordingTime(0);
    setHasShownCompletionToast(false); // Reset completion toast state when deleting video
    setUploadProgress(0); // Reset upload progress
    setVideoUploaded(false); // Reset upload status

    // Mark as modified to update backend
    setModifiedSections(prev => ({
      ...prev,
      personalInfo: true
    }));

    showToast('Video deleted successfully', 'success');
  };



  // Function to actually delete video from server (called during save)
  const deleteVideoFromServer = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(repApiUrl(`/profiles/${profile._id}/video`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete video');
      }

      console.log('✅ Video deleted from server successfully');
      return response.json();
    } catch (error) {
      console.error('❌ Error deleting video from server:', error);
      throw error;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Effect to handle video stream updates
  useEffect(() => {
    if (stream && videoRef.current && showVideoRecorder) {
      const videoElement = videoRef.current;
      videoElement.srcObject = stream;

      const handleLoadedMetadata = () => {
        videoElement.play().catch((error) => {
          console.error('Error playing video:', error);
        });
      };

      const handleError = (error: any) => {
        console.error('Video element error:', error);
      };

      videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.addEventListener('error', handleError);

      // Force load if metadata is already available
      if (videoElement.readyState >= 1) {
        handleLoadedMetadata();
      }

      return () => {
        videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        videoElement.removeEventListener('error', handleError);
      };
    }
  }, [stream, showVideoRecorder]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (recordedVideo) {
        URL.revokeObjectURL(recordedVideo);
      }
    };
  }, []);

  // Render skill dropdown for adding new skills
  const renderSkillDropdown = (skillType: 'technical' | 'professional' | 'soft', placeholder: string, colorScheme: string) => {
    const skillsForType = skillsData[skillType];
    const searchTerm = skillSearchTerm[skillType] || '';
    const isOpen = skillDropdownOpen[skillType] || false;

    // Filter skills based on search term and exclude already selected skills
    const currentSkills = getCurrentSkills(skillType);
    const selectedSkillIds = new Set(currentSkills.map((s: any) => s.skill));

    const filteredSkills: { [category: string]: Skill[] } = {};
    Object.entries(skillsForType).forEach(([category, skills]) => {
      const filtered = skills.filter(skill =>
        !selectedSkillIds.has(skill._id) &&
        (skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          skill.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      if (filtered.length > 0) {
        filteredSkills[category] = filtered;
      }
    });

    const addSkill = (skill: Skill) => {
      const newSkill = {
        skill: skill._id
      };

      const updatedSkills = [...currentSkills, newSkill];
      handleSkillsChange(skillType, updatedSkills);

      // Reset form
      setSkillSearchTerm(prev => ({ ...prev, [skillType]: '' }));
      setSkillDropdownOpen(prev => ({ ...prev, [skillType]: false }));
    };

    return (
      <div className="relative">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSkillSearchTerm(prev => ({ ...prev, [skillType]: e.target.value }));
                setSkillDropdownOpen(prev => ({ ...prev, [skillType]: true }));
              }}
              onFocus={() => setSkillDropdownOpen(prev => ({ ...prev, [skillType]: true }))}
              onBlur={() => {
                setTimeout(() => setSkillDropdownOpen(prev => ({ ...prev, [skillType]: false })), 200);
              }}
              placeholder={placeholder}
              className="w-full p-2 border rounded-md"
            />

            {/* Search Icon */}
            <div className="absolute right-2 top-2.5 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Dropdown List */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {Object.keys(filteredSkills).length > 0 ? (
              Object.entries(filteredSkills).map(([category, skills]) => (
                <div key={category}>
                  <div className={`px-3 py-2 text-sm font-medium bg-gray-100 text-gray-700 border-b`}>
                    {category}
                  </div>
                  {skills.map((skill) => (
                    <button
                      key={skill._id}
                      type="button"
                      onClick={() => addSkill(skill)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-800">{skill.name}</div>
                      <div className="text-sm text-gray-600 truncate">{skill.description}</div>
                    </button>
                  ))}
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-gray-500 text-center">
                {searchTerm ? `No skills found matching "${searchTerm}"` : 'No skills available'}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render industry dropdown for adding new industries
  const renderIndustryDropdown = () => {
    // Extract IDs from industries (handle both string IDs and object format)
    const selectedIndustryIds = new Set(
      (profile.professionalSummary?.industries || []).map((industry: any) =>
        typeof industry === 'string' ? industry : industry._id
      )
    );

    const filteredIndustries = industriesData.filter(industry =>
      industry.isActive &&
      !selectedIndustryIds.has(industry._id) &&
      industry.name.toLowerCase().includes(industrySearchTerm.toLowerCase())
    );

    const addIndustry = (industry: Industry) => {
      const updatedIndustries = [
        ...(profile.professionalSummary?.industries || []),
        industry._id
      ];
      setProfile((prev: Profile) => ({
        ...prev,
        professionalSummary: {
          ...prev.professionalSummary,
          industries: updatedIndustries
        }
      }));
      setModifiedSections(prev => ({
        ...prev,
        professionalSummary: true
      }));

      // Reset form
      setIndustrySearchTerm('');
      setIndustryDropdownOpen(false);
    };

    return (
      <div className="relative">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <input
              type="text"
              value={industrySearchTerm}
              onChange={(e) => {
                setIndustrySearchTerm(e.target.value);
                setIndustryDropdownOpen(true);
              }}
              onFocus={() => setIndustryDropdownOpen(true)}
              onBlur={() => {
                setTimeout(() => setIndustryDropdownOpen(false), 200);
              }}
              placeholder="Search and select industry"
              className="w-full p-2 border rounded-md"
            />

            {/* Search Icon */}
            <div className="absolute right-2 top-2.5 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Dropdown List */}
        {industryDropdownOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {filteredIndustries.length > 0 ? (
              filteredIndustries.map((industry) => (
                <button
                  key={industry._id}
                  type="button"
                  onClick={() => addIndustry(industry)}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium text-gray-800">{industry.name}</div>
                  <div className="text-sm text-gray-600 truncate">{industry.description}</div>
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-gray-500 text-center">
                {industrySearchTerm ? `No industries found matching "${industrySearchTerm}"` : 'No industries available'}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render activity dropdown for adding new activities
  const renderActivityDropdown = () => {
    // Extract IDs from activities (handle both string IDs and object format)
    const selectedActivityIds = new Set(
      (profile.professionalSummary?.activities || []).map((activity: any) =>
        typeof activity === 'string' ? activity : activity._id
      )
    );

    const filteredActivities = activitiesData.filter(activity =>
      activity.isActive &&
      !selectedActivityIds.has(activity._id) &&
      activity.name.toLowerCase().includes(activitySearchTerm.toLowerCase())
    );

    const addActivity = (activity: Activity) => {
      const updatedActivities = [
        ...(profile.professionalSummary?.activities || []),
        activity._id
      ];
      setProfile((prev: Profile) => ({
        ...prev,
        professionalSummary: {
          ...prev.professionalSummary,
          activities: updatedActivities
        }
      }));
      setModifiedSections(prev => ({
        ...prev,
        professionalSummary: true
      }));

      // Reset form
      setActivitySearchTerm('');
      setActivityDropdownOpen(false);
    };

    return (
      <div className="relative">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <input
              type="text"
              value={activitySearchTerm}
              onChange={(e) => {
                setActivitySearchTerm(e.target.value);
                setActivityDropdownOpen(true);
              }}
              onFocus={() => setActivityDropdownOpen(true)}
              onBlur={() => {
                setTimeout(() => setActivityDropdownOpen(false), 200);
              }}
              placeholder="Search and select activity"
              className="w-full p-2 border rounded-md"
            />

            {/* Search Icon */}
            <div className="absolute right-2 top-2.5 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Dropdown List */}
        {activityDropdownOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {filteredActivities.length > 0 ? (
              filteredActivities.map((activity) => (
                <button
                  key={activity._id}
                  type="button"
                  onClick={() => addActivity(activity)}
                  className="w-full text-left px-3 py-2 hover:bg-green-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium text-gray-800">{activity.name}</div>
                  <div className="text-sm text-gray-600 truncate">
                    <span className="font-medium">{activity.category}</span> - {activity.description}
                  </div>
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-gray-500 text-center">
                {activitySearchTerm ? `No activities found matching "${activitySearchTerm}"` : 'No activities available'}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Add useEffect to check country mismatch
  useEffect(() => {
    const checkMismatch = async () => {
      if (!selectedCountry || countries.length === 0) {
        return;
      }

      try {
        setCheckingCountryMismatch(true);

        // Only show spinner if check takes longer than 800ms
        const spinnerTimer = setTimeout(() => {
          setShowLoadingSpinner(true);
        }, 800);

        console.log('🔍 Checking country mismatch for selected country:', selectedCountry);

        const mismatchResult = await checkCountryMismatch(
          selectedCountry,
          countries
        );

        // Clear the spinner timer since we got a result
        clearTimeout(spinnerTimer);

        if (mismatchResult) {
          setCountryMismatch(mismatchResult);
          if (mismatchResult.hasMismatch) {
            console.log('⚠️ Country mismatch detected:', mismatchResult);
          } else {
            console.log('✅ No country mismatch found');
          }
        }
      } catch (error) {
        console.error('❌ Error checking country mismatch:', error);
      } finally {
        setCheckingCountryMismatch(false);
        setShowLoadingSpinner(false);
      }
    };

    checkMismatch();
  }, [selectedCountry, countries]);



  const headerContentMap: Record<string, { title: string; subtitle: string }> = {
    profile: {
      title: "Identity Configuration",
      subtitle: "Update your core identification and professional positioning."
    },
    skills: {
      title: "Competency Management",
      subtitle: "Adjust and verify your technical and professional skill assessments."
    },
    experience: {
      title: "Career Architecture",
      subtitle: "Refine your professional history and previous achievements."
    },
    languages: {
      title: "Global Communication",
      subtitle: "Update your linguistic proficiency and certification details."
    }
  };

  const currentHeader = headerContentMap[activeTab] || headerContentMap.profile;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Top Header Section */}
      <div className="bg-slate-100/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-40 transition-all">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onSave(initialProfile)}
              className="p-3 hover:bg-slate-200/50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Edit Representative Profile</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5 italic">Harx Talent Network v2.5</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onSave(initialProfile)}
              className="px-6 py-3 rounded-2xl bg-slate-200/50 text-slate-500 hover:bg-slate-200/80 font-black uppercase tracking-widest text-[11px] transition-all flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Discard Changes
            </button>
            <button
              onClick={handleSave}
              disabled={loading || uploadingPhoto || uploadingVideo}
              className="px-8 py-3 rounded-2xl bg-slate-900 text-white hover:shadow-2xl hover:shadow-slate-200 font-black uppercase tracking-widest text-[11px] transition-all flex items-center gap-2 disabled:opacity-50 group"
            >
              {loading || uploadingPhoto || uploadingVideo ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {uploadingVideo ? 'Syncing Video...' : uploadingPhoto ? 'Syncing Photo...' : 'Finalizing...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  Apply All Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-6 pb-4">
        {/* Page Title & Phrase - Dynamic */}
        <div className="mb-6">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2 animate-in fade-in slide-in-from-left-4 duration-500">
            {currentHeader.title}
          </h1>
          <p className="text-slate-500 font-medium tracking-tight animate-in fade-in slide-in-from-left-6 duration-700">
            {currentHeader.subtitle}
          </p>
        </div>

        <div className="w-full">
          {/* Right Column: Navbar & Tabs (Now Full Width) */}
          <div className="overflow-hidden">
            <EditNavbar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onSave={handleSave}
              loading={loading}
              uploadingPhoto={uploadingPhoto}
              uploadingVideo={uploadingVideo}
            />

            <main className="min-h-[600px] mt-8">
              {activeTab === 'profile' && (
                <EditProfileTab
                  profile={profile}
                  setProfile={setProfile}
                  setModifiedSections={setModifiedSections}
                  activitiesData={activitiesData}
                  showVideoRecorder={showVideoRecorder}
                  recordedVideo={recordedVideo}
                  existingVideoDeleted={existingVideoDeleted}
                  cameraPermission={cameraPermission}
                  videoRef={videoRef}
                  previewVideoRef={previewVideoRef}
                  isRecording={isRecording}
                  recordingTime={recordingTime}
                  formatTime={formatTime}
                  startCamera={startCamera}
                  startRecording={startRecording}
                  stopRecording={stopRecording}
                  deleteVideo={deleteVideo}
                  setShowDeleteConfirmation={setShowDeleteConfirmation}
                  showTimeWarning={showTimeWarning}
                  videoUploaded={videoUploaded}
                  uploadingVideo={uploadingVideo}
                  uploadProgress={uploadProgress}
                  stream={stream}
                  handleProfileChange={handleProfileChange}
                  validationErrors={validationErrors}
                  renderError={(field) => renderError(validationErrors[field], field)}
                  imagePreview={imagePreview}
                  isPhotoMarkedForDeletion={isPhotoMarkedForDeletion}
                  fileInputRef={fileInputRef}
                  handleImageChange={handleImageChange}
                  handleRemoveImage={handleRemoveImage}
                  setImageToShow={setImageToShow}
                  setShowImageModal={setShowImageModal}
                  countrySearchTerm={countrySearchTerm}
                  setCountrySearchTerm={setCountrySearchTerm}
                  isCountryDropdownOpen={isCountryDropdownOpen}
                  setIsCountryDropdownOpen={setIsCountryDropdownOpen}
                  filteredCountries={filteredCountries}
                  setSelectedCountry={setSelectedCountry}
                  selectedCountryIndex={selectedCountryIndex}
                  setSelectedCountryIndex={setSelectedCountryIndex}
                  checkingCountryMismatch={checkingCountryMismatch}
                  showLoadingSpinner={showLoadingSpinner}
                  countryMismatch={countryMismatch?.hasMismatch ?? false}
                />
              )}

              {activeTab === 'specialization' && (
                <EditSpecializationTab
                  profile={profile}
                  setProfile={setProfile}
                  setModifiedSections={setModifiedSections}
                  industriesData={industriesData}
                  activitiesData={activitiesData}
                  renderIndustryDropdown={renderIndustryDropdown}
                  renderActivityDropdown={renderActivityDropdown}
                  tempCompany={tempCompany}
                  setTempCompany={setTempCompany}
                />
              )}

              {activeTab === 'skills' && (
                <EditSkillsTab
                  skillsData={skillsData}
                  getCurrentSkills={getCurrentSkills}
                  handleSkillsChange={handleSkillsChange}
                  renderSkillDropdown={renderSkillDropdown}
                />
              )}

              {activeTab === 'experience' && (
                <EditExperienceTab
                  profile={profile}
                  setProfile={setProfile}
                  setModifiedSections={setModifiedSections}
                  formatDate={formatDate}
                  loading={loading}
                  showNewExperienceForm={showNewExperienceForm}
                  setShowNewExperienceForm={setShowNewExperienceForm}
                  newExperience={newExperience}
                  setNewExperience={setNewExperience}
                  editingExperienceId={editingExperienceId}
                  setEditingExperienceId={setEditingExperienceId}
                  startEditingExperience={startEditingExperience}
                  saveEditedExperience={saveEditedExperience}
                />
              )}

              {activeTab === 'languages' && (
                <EditLanguagesTab
                  profile={profile}
                  setProfile={setProfile}
                  setModifiedSections={setModifiedSections}
                  availableLanguages={availableLanguages}
                  loadingLanguages={loadingLanguages}
                  getLanguageDisplayName={getLanguageDisplayName}
                  getLanguageCode={getLanguageCode}
                  updateLanguageProficiency={updateLanguageProficiency}
                  removeLanguage={removeLanguage}
                  addLanguage={addLanguage}
                  languageSearchTerm={languageSearchTerm}
                  setLanguageSearchTerm={setLanguageSearchTerm}
                  isLanguageDropdownOpen={isLanguageDropdownOpen}
                  setIsLanguageDropdownOpen={setIsLanguageDropdownOpen}
                  filteredLanguages={filteredLanguages}
                  selectedLanguageIndex={selectedLanguageIndex}
                  setSelectedLanguageIndex={setSelectedLanguageIndex}
                  tempLanguage={tempLanguage}
                  setTempLanguage={setTempLanguage}
                  proficiencyLevels={proficiencyLevels}
                  renderError={renderError}
                  validationErrors={validationErrors}
                />
              )}

              {activeTab === 'availability' && (
                <EditAvailabilityTab
                  profile={profile}
                  setProfile={setProfile}
                  setModifiedSections={setModifiedSections}
                  updateSchedule={updateSchedule}
                  updateFlexibility={updateFlexibility}
                  timezoneSearchTerm={timezoneSearchTerm}
                  setTimezoneSearchTerm={setTimezoneSearchTerm}
                  isTimezoneDropdownOpen={isTimezoneDropdownOpen}
                  setIsTimezoneDropdownOpen={setIsTimezoneDropdownOpen}
                  filteredTimezones={filteredTimezones}
                  selectedTimezoneIndex={selectedTimezoneIndex}
                  setSelectedTimezoneIndex={setSelectedTimezoneIndex}
                  selectedCountry={selectedCountry}
                  timezones={timezones}
                  countries={countries}
                  loadingTimezones={loadingTimezones}
                  repWizardApi={repWizardApi}
                  getTimezoneMismatchInfo={getTimezoneMismatchInfo}
                />
              )}
            </main>
          </div>
        </div>
      </div>

      {/* Global Modals (Crop, Toast, Delete Conf) */}
      {showCropModal && tempImage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[40px] p-10 max-w-2xl w-full shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Focus & Frame</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 italic">Circle crop for professional identification</p>
              </div>
              <button onClick={() => { setShowCropModal(false); setTempImage(null); }} className="p-3 hover:bg-gray-100 rounded-2xl transition-colors">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="flex items-center justify-center bg-gray-50 rounded-[32px] p-8 border border-gray-100 overflow-hidden">
              <ReactCrop crop={crop} onChange={c => setCrop(c)} aspect={1} circularCrop>
                <img
                  ref={imageRef}
                  src={tempImage}
                  alt="Crop preview"
                  style={{ maxHeight: '50vh' }}
                  onLoad={(e) => {
                    const { width, height } = e.currentTarget;
                    setImageDimensions({ width, height });
                  }}
                />
              </ReactCrop>
            </div>

            <div className="flex justify-end gap-3 mt-10">
              <button onClick={() => { setShowCropModal(false); setTempImage(null); }} className="px-8 py-3 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600">Cancel</button>
              <button onClick={handleCropComplete} className="px-10 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Set Profile Photo</button>
            </div>
          </div>
        </div>
      )}

      {showImageModal && imageToShow && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[100] p-4" onClick={() => setShowImageModal(false)}>
          <div className="relative group max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <img src={imageToShow} alt="Identity Preview" className="w-full h-auto rounded-[40px] shadow-2xl border-4 border-white/10" />
            <button onClick={() => setShowImageModal(false)} className="absolute -top-12 right-0 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-xl transition-all">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[40px] p-10 max-w-md w-full shadow-2xl border border-gray-100">
            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mb-8 shadow-inner shadow-rose-100">
              <Trash2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Remove Introduction?</h3>
            <p className="text-sm font-bold text-gray-400 leading-relaxed italic mb-8">
              This will permanently delete your recorded session. You can record a new one at any time.
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setExistingVideoDeleted(true);
                  setIsExistingVideoMarkedForDeletion(true);
                  setShowDeleteConfirmation(false);
                  setModifiedSections(prev => ({ ...prev, personalInfo: true }));
                }}
                className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-rose-600 transition-all active:scale-95 shadow-xl shadow-rose-100"
              >
                Yes, Remove Video
              </button>
              <button onClick={() => setShowDeleteConfirmation(false)} className="w-full py-4 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600">Keep it</button>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div className={`fixed bottom-8 right-8 px-8 py-4 rounded-2xl shadow-2xl transition-all transform duration-500 z-[110] flex items-center gap-4 border animate-in slide-in-from-right-4 ${toast.type === 'success'
          ? 'bg-emerald-500 text-white border-emerald-400'
          : 'bg-rose-500 text-white border-rose-400'
          }`}>
          {toast.type === 'success' ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
};