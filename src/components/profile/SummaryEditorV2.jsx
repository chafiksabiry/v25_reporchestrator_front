import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../../hooks/useProfile';
import { getTimezones, getSkillsGrouped, getIndustries, getActivities, generateSummary, translateText } from '../../lib/api/profiles';
import { localizeText, localizeList } from '../../utils/i18nText';
import { getAllLanguages, searchLanguages } from '../../lib/api/languages';
import Cookies from 'js-cookie';
import axios from 'axios';
import { Video } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ExperienceVideoModal } from '../dashboard/profile/ExperienceVideoModal';

// Bilingual (EN/FR) strings for the CV review page. The active language is read
// from i18next; we fall back to English when a key/locale is missing.
const PAGE_STRINGS = {
  stepBadge: { en: 'Step 3 · Verify & save', fr: 'Étape 3 · Vérifier et enregistrer' },
  pageTitle: { en: 'Your professional story', fr: 'Votre parcours professionnel' },
  pageSubtitle: {
    en: 'Review the information extracted from your CV. Edit anything that needs a correction, then continue.',
    fr: 'Vérifiez les informations extraites de votre CV. Corrigez ce qui doit l’être, puis continuez.',
  },
  confirmContinue: { en: 'Confirm to continue', fr: 'Confirmer pour continuer' },
  continueToProfile: { en: 'Continue to my profile', fr: 'Continuer vers mon profil' },
  everythingGood: {
    en: 'Everything looks good? Continue to your full REPS profile.',
    fr: 'Tout est bon ? Continuez vers votre profil REPS complet.',
  },
  edit: { en: 'Edit', fr: 'Modifier' },
  save: { en: 'Save', fr: 'Enregistrer' },
  saving: { en: 'Saving…', fr: 'Enregistrement…' },
  cancel: { en: 'Cancel', fr: 'Annuler' },
  personalInfo: { en: 'Personal information', fr: 'Informations personnelles' },
  name: { en: 'Name', fr: 'Nom' },
  country: { en: 'Country', fr: 'Pays' },
  email: { en: 'Email', fr: 'E-mail' },
  phone: { en: 'Phone', fr: 'Téléphone' },
  experienceLabel: { en: 'Experience', fr: 'Expérience' },
  languages: { en: 'Languages', fr: 'Langues' },
  professionalExperience: { en: 'Professional Experience', fr: 'Expérience professionnelle' },
  addExperience: { en: 'Add Experience', fr: 'Ajouter une expérience' },
  workingHours: { en: 'Working Hours & Availability', fr: 'Horaires de travail et disponibilité' },
  professionalSummary: { en: 'Professional summary', fr: 'Résumé professionnel' },
  summarySubtitle: {
    en: 'AI-generated from your CV — edit or regenerate anytime.',
    fr: 'Généré par IA à partir de votre CV — modifiable ou régénérable à tout moment.',
  },
  regenerate: { en: 'Regenerate', fr: 'Régénérer' },
  generating: { en: 'Generating…', fr: 'Génération…' },
  notableCompanies: { en: 'Notable Companies', fr: 'Entreprises notables' },
  noSummary: {
    en: 'No summary yet. Click Edit, then Regenerate to create one from your CV.',
    fr: 'Pas encore de résumé. Cliquez sur Modifier, puis Régénérer pour en créer un à partir de votre CV.',
  },
  summaryPlaceholder: { en: 'Edit your professional summary...', fr: 'Modifiez votre résumé professionnel...' },
  warnVideoTitle: {
    en: 'A video is required for each experience',
    fr: 'Une vidéo est requise pour chaque expérience',
  },
  warnAddExp: {
    en: 'Add at least one experience, then record a video for it.',
    fr: 'Ajoutez au moins une expérience, puis enregistrez une vidéo pour celle-ci.',
  },
  warnBottom: {
    en: 'Record a video for every experience above to unlock the “Continue” button.',
    fr: 'Enregistrez une vidéo pour chaque expérience ci-dessus pour débloquer le bouton « Continuer ».',
  },
  recordAnalyze: { en: 'Record & Analyze with AI', fr: 'Enregistrer et analyser avec l’IA' },
  viewAnalysis: { en: 'View AI Analysis', fr: 'Voir l’analyse IA' },
  expVideoMissing: {
    en: 'Video required — record a video for this experience to continue.',
    fr: 'Vidéo requise — enregistrez une vidéo pour cette expérience afin de continuer.',
  },
  expVideoDone: { en: 'Video recorded', fr: 'Vidéo enregistrée' },
  availMissing: {
    en: 'Availability not set — click Edit to add your working schedule and time zone.',
    fr: 'Disponibilité non renseignée — cliquez sur Modifier pour ajouter vos horaires et votre fuseau horaire.',
  },
  savedSuccess: { en: 'Saved successfully!', fr: 'Enregistré avec succès !' },
  saveError: { en: 'Error saving. Please try again.', fr: 'Erreur lors de l’enregistrement. Veuillez réessayer.' },
};

// Temporarily hide the detailed sections (skills, industries, activities,
// working hours/schedule) on the CV review page, and skip their requirements.
// Flip back to true to restore them.
const SHOW_PROFILE_DETAILS = false;

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

  .country-mismatch-notification {
    animation: slideIn 0.5s ease-out;
  }

  @keyframes slideIn {
    from {
      transform: translateY(-10px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }

  .profile-form-select {
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
    background-position: right 1rem center;
    background-size: 1.25em 1.25em;
    background-repeat: no-repeat;
  }
`;

// Add styles to document
if (!document.getElementById('summary-editor-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'summary-editor-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

// API function to get user's IP history
const getUserIPHistory = async (userId) => {
  try {
    const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL;
    const token = localStorage.getItem('token');

    const response = await axios.get(`${AUTH_API_URL}/users/${userId}/ip-history`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching IP history:', error);
    return null;
  }
};

// Function to find the first login location
const getFirstLoginLocation = (ipHistory) => {
  if (!ipHistory || !ipHistory.data || !Array.isArray(ipHistory.data)) {
    return null;
  }

  // Find the first login action in the history
  const firstLogin = ipHistory.data.find(entry => entry.action === 'login');

  if (firstLogin && firstLogin.locationInfo && firstLogin.locationInfo.location) {
    return {
      countryCode: firstLogin.locationInfo.location.countryCode,
      countryName: firstLogin.locationInfo.location.countryName,
      city: firstLogin.locationInfo.city,
      region: firstLogin.locationInfo.region
    };
  }

  return null;
};

// Function to get user ID from different sources
const getUserId = (profileData) => {
  // Try to get from cookies
  const cookieUserId = Cookies.get('userId');
  if (cookieUserId) {
    return cookieUserId;
  }

  // Try standalone mode
  if (import.meta.env.VITE_RUN_MODE === 'standalone') {
    return import.meta.env.VITE_STANDALONE_USER_ID;
  }

  return null;
};

// Move ExperienceForm outside the main component
const ExperienceForm = ({ experience, onSubmit, isNew = false }) => {
  console.log('ExperienceForm rendered with:', { experience, isNew });

  const [formData, setFormData] = useState({
    title: experience.title || '',
    company: experience.company || '',
    startDate: experience.startDate ? new Date(experience.startDate).toISOString().split('T')[0] : '',
    endDate: experience.endDate && experience.endDate !== 'present' ? new Date(experience.endDate).toISOString().split('T')[0] : '',
    responsibilities: experience.responsibilities || [''],
    isPresent: experience.endDate === 'present' || experience.isPresent || false
  });

  // Add useEffect to sync with props changes
  useEffect(() => {
    setFormData({
      title: experience.title || '',
      company: experience.company || '',
      startDate: experience.startDate ? new Date(experience.startDate).toISOString().split('T')[0] : '',
      endDate: experience.endDate && experience.endDate !== 'present' ? new Date(experience.endDate).toISOString().split('T')[0] : '',
      responsibilities: experience.responsibilities || [''],
      isPresent: experience.endDate === 'present' || experience.isPresent || false
    });
  }, [experience]);

  console.log('ExperienceForm formData:', formData);

  const handleInputChange = (field, value) => {
    console.log(`🔥 handleInputChange called: field=${field}, value=${value}`);
    setFormData(prev => {
      console.log(`🔥 Previous formData:`, prev);
      const newData = {
        ...prev,
        [field]: value
      };
      console.log(`🔥 New formData:`, newData);
      return newData;
    });
  };

  const handleResponsibilityChange = (index, value) => {
    console.log(`🔥 handleResponsibilityChange called: index=${index}, value=${value}`);
    const updatedResponsibilities = [...formData.responsibilities];
    updatedResponsibilities[index] = value;
    setFormData(prev => {
      console.log(`🔥 Previous formData:`, prev);
      const newData = {
        ...prev,
        responsibilities: updatedResponsibilities
      };
      console.log(`🔥 New formData:`, newData);
      return newData;
    });
  };

  const addResponsibilityField = () => {
    console.log('🔥 addResponsibilityField called');
    setFormData(prev => {
      console.log(`🔥 Previous formData:`, prev);
      const newData = {
        ...prev,
        responsibilities: [...prev.responsibilities, '']
      };
      console.log(`🔥 New formData:`, newData);
      return newData;
    });
  };

  const removeResponsibilityField = (index) => {
    console.log(`🔥 removeResponsibilityField called: index=${index}`);
    if (formData.responsibilities.length > 1) {
      setFormData(prev => {
        console.log(`🔥 Previous formData:`, prev);
        const newData = {
          ...prev,
          responsibilities: prev.responsibilities.filter((_, i) => i !== index)
        };
        console.log(`🔥 New formData:`, newData);
        return newData;
      });
    }
  };

  const handleSubmit = () => {
    console.log('Form data before submission:', formData);

    // Convert dates to proper format before submitting
    const experienceData = {
      ...formData,
      startDate: formData.startDate, // Keep as YYYY-MM-DD string
      endDate: formData.isPresent ? 'present' : formData.endDate // Keep as YYYY-MM-DD string or 'present'
    };

    console.log('Experience data being submitted:', experienceData);
    onSubmit(experienceData);
  };

  return (
    <div className="space-y-4 bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative z-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => {
              console.log('🔥 Title input onChange event:', e.target.value);
              handleInputChange('title', e.target.value);
            }}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-harx-500 focus:border-harx-500 bg-white"
            placeholder="e.g. Software Engineer"
            autoComplete="off"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
          <input
            type="text"
            value={formData.company}
            onChange={(e) => {
              console.log('🔥 Company input onChange event:', e.target.value);
              handleInputChange('company', e.target.value);
            }}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-harx-500 focus:border-harx-500 bg-white"
            placeholder="e.g. Tech Corp"
            autoComplete="off"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            value={formData.startDate}
            onChange={(e) => {
              console.log('🔥 Start Date input onChange event:', e.target.value);
              handleInputChange('startDate', e.target.value);
            }}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-harx-500 focus:border-harx-500 bg-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => {
                console.log('🔥 End Date input onChange event:', e.target.value);
                handleInputChange('endDate', e.target.value);
              }}
              disabled={formData.isPresent}
              className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-harx-500 focus:border-harx-500 disabled:bg-gray-100 disabled:cursor-not-allowed bg-white"
            />
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isPresent}
                onChange={(e) => {
                  console.log('🔥 Present checkbox onChange event:', e.target.checked);
                  handleInputChange('isPresent', e.target.checked);
                  if (e.target.checked) {
                    handleInputChange('endDate', '');
                  }
                }}
                className="rounded border-gray-300 cursor-pointer"
              />
              Present
            </label>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">Responsibilities</label>
        {formData.responsibilities.map((resp, index) => (
          <div key={index} className="flex gap-2 items-center">
            <input
              type="text"
              value={resp}
              onChange={(e) => {
                console.log(`🔥 Responsibility ${index} input onChange event:`, e.target.value);
                handleResponsibilityChange(index, e.target.value);
              }}
              className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-harx-500 focus:border-harx-500 bg-white"
              placeholder="Add a responsibility"
              autoComplete="off"
            />
            {formData.responsibilities.length > 1 && (
              <button
                onClick={() => {
                  console.log(`🔥 Remove responsibility ${index} button clicked`);
                  removeResponsibilityField(index);
                }}
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors duration-200"
                type="button"
                title="Remove responsibility"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => {
            console.log('🔥 Add responsibility button clicked');
            addResponsibilityField();
          }}
          className="text-harx-600 hover:text-harx-700 hover:bg-harx-50 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1 transition-colors duration-200"
          type="button"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Responsibility
        </button>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
        <button
          onClick={() => {
            console.log('🔥 Cancel button clicked');
            // Handle cancel logic here
          }}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
          type="button"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            console.log('🔥 Save button clicked');
            handleSubmit();
          }}
          className="px-4 py-2 text-sm font-medium text-white bg-harx-600 rounded-lg hover:bg-harx-700 transition-colors duration-200"
          type="button"
        >
          {isNew ? 'Add Experience' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

const PROFICIENCY_CHIP_STYLES = {
  A1: 'bg-gray-100 text-gray-700 ring-gray-200',
  A2: 'bg-slate-100 text-slate-700 ring-slate-200',
  B1: 'bg-sky-50 text-sky-800 ring-sky-200',
  B2: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
  C1: 'bg-harx-50 text-harx-800 ring-harx-200',
  C2: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
};

function ProfileReadField({ label, value, icon, className = '' }) {
  return (
    <div className={`rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-harx-100 transition-all duration-200 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-harx-50 text-harx-600">{icon}</span>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</h3>
      </div>
      <p className="text-lg font-semibold text-gray-900 break-words">{value || '—'}</p>
    </div>
  );
}

function SummaryEditor({ profileData, generatedSummary, setGeneratedSummary, onProfileUpdate }) {
  const navigate = useNavigate();
  const { profile, loading: profileLoading, error: profileError, updateBasicInfo, updateExperience, updateSkills, updateProfileData } = useProfile();
  const [isEditing, setIsEditing] = useState(false);
  console.log("generatedSummary : ", generatedSummary);
  const [editedSummary, setEditedSummary] = useState(generatedSummary);
  const [loading, setLoading] = useState(false);
  const { i18n } = useTranslation();
  const uiLang = (i18n.language || 'en').slice(0, 2) === 'fr' ? 'fr' : 'en';
  const otherLang = uiLang === 'fr' ? 'en' : 'fr';
  const t = (key) => PAGE_STRINGS[key]?.[uiLang] || PAGE_STRINGS[key]?.en || key;

  // Build/refresh the { en, fr } mirror for a single free-text field on save:
  // the active locale takes the edited value, the other locale is re-translated.
  const buildTextI18n = async (activeValue, existing) => {
    const mirror = {
      en: '',
      fr: '',
      ...(existing && typeof existing === 'object' ? existing : {}),
    };
    mirror[uiLang] = activeValue || '';
    try {
      mirror[otherLang] = activeValue ? await translateText(activeValue, otherLang) : '';
    } catch {
      if (!mirror[otherLang]) mirror[otherLang] = activeValue || '';
    }
    return mirror;
  };

  // Same as buildTextI18n but for a string[] field (responsibilities, achievements).
  const buildListI18n = async (activeList, existing) => {
    const list = Array.isArray(activeList) ? activeList : [];
    const mirror = {
      en: [],
      fr: [],
      ...(existing && typeof existing === 'object' ? existing : {}),
    };
    mirror[uiLang] = list;
    try {
      mirror[otherLang] = list.length ? await translateText(list, otherLang) : [];
    } catch {
      if (!Array.isArray(mirror[otherLang]) || !mirror[otherLang].length) mirror[otherLang] = list;
    }
    return mirror;
  };

  const [editingProfile, setEditingProfile] = useState(false);
  // Per-section editing: each visible section can be edited/saved independently
  // (no global "Edit profile" mode). Keys: basic | experience | availability |
  // summary | companies.
  const [sectionEditing, setSectionEditing] = useState({});
  const [editedProfile, setEditedProfile] = useState(profileData);
  const [tempLanguage, setTempLanguage] = useState({ languageObj: null, proficiency: 'B1' });
  const [tempIndustry, setTempIndustry] = useState('');
  const [tempCompany, setTempCompany] = useState('');
  const [showAssessment, setShowAssessment] = useState(false);
  const [validationErrors, setValidationErrors] = useState({
    languages: '',
    industries: '',
    companies: '',
    name: '',
    country: '',
    email: '',
    phone: '',
    currentRole: '',
    yearsExperience: ''
  });
  const [editingExperience, setEditingExperience] = useState(null);
  // Index of the experience currently being edited (editingExperience may be a
  // localized copy, so we can't rely on reference equality).
  const [editingExperienceIndex, setEditingExperienceIndex] = useState(-1);
  const [newExperience, setNewExperience] = useState({
    title: '',
    company: '',
    startDate: '',
    endDate: '',
    responsibilities: [''],
    isPresent: false
  });
  const [showNewExperienceForm, setShowNewExperienceForm] = useState(false);
  const [tempSkill, setTempSkill] = useState({
    technical: '',
    professional: '',
    soft: ''
  });
  const [tempProfileDescription, setTempProfileDescription] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [countries, setCountries] = useState([]);
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [timezoneSearch, setTimezoneSearch] = useState('');
  const [showTimezoneDropdown, setShowTimezoneDropdown] = useState(false);
  const [isSearchingTimezone, setIsSearchingTimezone] = useState(false);
  const [availableSkills, setAvailableSkills] = useState({
    technical: {},
    professional: {},
    soft: {}
  });
  const [showSkillDropdown, setShowSkillDropdown] = useState({
    technical: false,
    professional: false,
    soft: false
  });
  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [languageSearch, setLanguageSearch] = useState('');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [availableIndustries, setAvailableIndustries] = useState([]);
  const [availableActivities, setAvailableActivities] = useState([]);
  const [showIndustryDropdown, setShowIndustryDropdown] = useState(false);
  const [showActivityDropdown, setShowActivityDropdown] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [modifiedSections, setModifiedSections] = useState({
    personalInfo: false,
    skills: false,
    professionalSummary: false,
    availability: false,
    experience: false
  });

  // New state for country mismatch detection
  const [firstLoginLocation, setFirstLoginLocation] = useState(null);
  const [videoModalExp, setVideoModalExp] = useState(null);

  const proficiencyLevels = [
    { value: 'A1', label: 'A1 - Beginner', description: 'Can understand and use basic phrases, introduce themselves' },
    { value: 'A2', label: 'A2 - Elementary', description: 'Can communicate in simple, routine situations' },
    { value: 'B1', label: 'B1 - Intermediate', description: 'Can deal with most situations while traveling, describe experiences' },
    { value: 'B2', label: 'B2 - Upper Intermediate', description: 'Can interact fluently with native speakers, produce clear text' },
    { value: 'C1', label: 'C1 - Advanced', description: 'Can use language flexibly, produce clear well-structured text' },
    { value: 'C2', label: 'C2 - Mastery', description: 'Can understand virtually everything, express spontaneously' }
  ];

  useEffect(() => {
    if (profileData) {
      console.log('🔍 Initializing editedProfile with profileData:', profileData);

      setEditedProfile({
        ...profileData,
        skills: {
          technical: profileData.skills?.technical || [],
          professional: profileData.skills?.professional || [],
          soft: profileData.skills?.soft || []
        },
        professionalSummary: {
          ...profileData.professionalSummary,
          industries: profileData.professionalSummary?.industries || [],
          activities: profileData.professionalSummary?.activities || [],
          notableCompanies: profileData.professionalSummary?.notableCompanies || []
        },
        personalInfo: {
          ...profileData.personalInfo,
          languages: profileData.personalInfo?.languages || []
        },
        experience: profileData.experience || [],
        availability: profileData.availability || {}
      });

      setTempProfileDescription(profileData.professionalSummary?.profileDescription || '');

      console.log('🔍 EditedProfile initialized');
    }
  }, [profileData]);

  // New useEffect to get first login location
  useEffect(() => {
    const getFirstLoginLocationInfo = async () => {
      if (!profileData) {
        return;
      }

      try {
        const userId = getUserId(profileData);
        if (!userId) {
          console.log('No user ID found, skipping first login location check');
          return;
        }

        const ipHistory = await getUserIPHistory(userId);
        const firstLogin = getFirstLoginLocation(ipHistory);

        if (firstLogin) {
          setFirstLoginLocation(firstLogin);
        }
      } catch (error) {
        console.error('Error getting first login location:', error);
      }
    };

    if (profileData) {
      getFirstLoginLocationInfo();
    }
  }, [profileData]);

  useEffect(() => {
    const initializeSummary = async () => {
      if (!profileData) return;

      // If we have a generated summary from props but no profile description in the database
      if (generatedSummary && (!profileData?.professionalSummary?.profileDescription || profileData.professionalSummary.profileDescription === '')) {
        try {
          // Update local state
          setEditedSummary(generatedSummary);
          setEditedProfile(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              professionalSummary: {
                ...prev.professionalSummary,
                profileDescription: generatedSummary
              }
            };
          });

          // Save to database
          await updateProfileData(profileData._id, {
            professionalSummary: {
              ...profileData.professionalSummary,
              profileDescription: generatedSummary
            }
          });

          console.log('Successfully saved initial generated summary to database');
        } catch (error) {
          console.error('Error saving initial generated summary:', error);
        }
      } else if (profileData?.professionalSummary?.profileDescription) {
        // If we already have a profile description in the database, use that
        setEditedSummary(profileData.professionalSummary.profileDescription);
      }
    };

    initializeSummary();
  }, [profileData, generatedSummary]);

  // Load countries from API
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const countriesData = await getTimezones();

        // Remove duplications based on countryCode
        const uniqueCountries = countriesData.filter((country, index, self) =>
          index === self.findIndex(c => c.countryCode === country.countryCode)
        );

        // Sort countries alphabetically by name for better UX
        const sortedCountries = uniqueCountries.sort((a, b) =>
          a.countryName.localeCompare(b.countryName)
        );

        setCountries(sortedCountries);
        console.log(`Loaded ${sortedCountries.length} unique countries (filtered from ${countriesData.length} total)`);
      } catch (error) {
        console.error('Error loading countries:', error);
      }
    };

    loadCountries();
  }, []);

  // Load skills from API
  useEffect(() => {
    const loadSkills = async () => {
      try {
        const skillTypes = ['technical', 'professional', 'soft'];
        const skillsData = {};

        for (const skillType of skillTypes) {
          const groupedSkills = await getSkillsGrouped(skillType);
          skillsData[skillType] = groupedSkills;
        }

        setAvailableSkills(skillsData);
        console.log('Loaded skills data:', skillsData);
      } catch (error) {
        console.error('Error loading skills:', error);
      }
    };

    loadSkills();
  }, []);

  // Load languages from API
  useEffect(() => {
    const loadLanguages = async () => {
      try {
        const languages = await getAllLanguages();
        setAvailableLanguages(languages);
        console.log('Loaded languages:', languages.length);
      } catch (error) {
        console.error('Error loading languages:', error);
      }
    };

    loadLanguages();
  }, []);

  // Load industries from API
  useEffect(() => {
    const loadIndustries = async () => {
      try {
        const industries = await getIndustries();
        setAvailableIndustries(industries);
        console.log('Loaded industries:', industries.length);
      } catch (error) {
        console.error('Error loading industries:', error);
      }
    };

    loadIndustries();
  }, []);

  // Load activities from API
  useEffect(() => {
    const loadActivities = async () => {
      try {
        const activities = await getActivities();
        setAvailableActivities(activities);
        console.log('Loaded activities:', activities.length);
      } catch (error) {
        console.error('Error loading activities:', error);
      }
    };

    loadActivities();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.country-selector')) {
        setShowCountryDropdown(false);
        setCountrySearch('');
        setIsSearching(false);
      }
      if (!event.target.closest('.timezone-selector')) {
        setShowTimezoneDropdown(false);
        setTimezoneSearch('');
        setIsSearchingTimezone(false);
      }
      if (!event.target.closest('.skill-selector')) {
        setShowSkillDropdown({
          technical: false,
          professional: false,
          soft: false
        });
      }
      if (!event.target.closest('.language-selector')) {
        setShowLanguageDropdown(false);
        setLanguageSearch('');
      }
      if (!event.target.closest('.industry-selector')) {
        setShowIndustryDropdown(false);
      }
      if (!event.target.closest('.activity-selector')) {
        setShowActivityDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter countries based on search
  const filteredCountries = countries.filter(country =>
    country.countryName.toLowerCase().includes(countrySearch.toLowerCase()) ||
    country.countryCode.toLowerCase().includes(countrySearch.toLowerCase())
  );

  // Handle country selection
  const handleCountrySelect = (country) => {
    setShowCountryDropdown(false);
    setCountrySearch('');
    setIsSearching(false);
    handleProfileChange('country', country);

    // Auto-suggest timezone based on country
    suggestTimezoneForCountry(country);
  };

  // Suggest primary timezone for selected country
  const suggestTimezoneForCountry = (selectedCountry, forceUpdate = false) => {
    if (!selectedCountry || !selectedCountry.countryCode) return;

    // Find primary timezone for this country (usually the capital or most common one)
    const countryTimezones = countries.filter(tz =>
      tz.countryCode === selectedCountry.countryCode
    );

    if (countryTimezones.length > 0) {
      // Sort by GMT offset to get a consistent primary timezone
      // You could also prioritize by population or capital city if that data is available
      const primaryTimezone = countryTimezones.sort((a, b) => a.gmtOffset - b.gmtOffset)[0];

      // Auto-suggest this timezone (only if no timezone is currently set or if forced)
      if (!editedProfile.availability?.timeZone || forceUpdate) {
        handleAvailabilityChangeLocal('timeZone', primaryTimezone);
        showToast(`Timezone ${forceUpdate ? 'updated' : 'automatically set'} to ${primaryTimezone.zoneName} based on your country. You can change it if needed.`, 'success');
      }
    }
  };

  // Manual timezone suggestion based on current country
  const suggestTimezoneForCurrentCountry = () => {
    const currentCountry = editedProfile.personalInfo?.country;
    if (currentCountry) {
      suggestTimezoneForCountry(currentCountry, true);
    } else {
      showToast('Please select a country first to get timezone suggestions.', 'error');
    }
  };

  // Handle country input change
  const handleCountryInputChange = (e) => {
    const value = e.target.value;
    setCountrySearch(value);
    setIsSearching(true);
    setShowCountryDropdown(true);
  };

  // Handle country input focus
  const handleCountryInputFocus = () => {
    setIsSearching(true);
    setShowCountryDropdown(true);
    // Clear the search to allow user to start fresh
    if (!countrySearch) {
      setCountrySearch('');
    }
  };

  // Clear country selection
  const clearCountrySelection = () => {
    setIsSearching(false);
    setCountrySearch('');
    setShowCountryDropdown(false);
    handleProfileChange('country', '');
  };

  // Filter timezones based on search
  const filteredTimezones = countries.filter(timezone =>
    timezone.countryName.toLowerCase().includes(timezoneSearch.toLowerCase()) ||
    timezone.zoneName.toLowerCase().includes(timezoneSearch.toLowerCase()) ||
    timezone.countryCode.toLowerCase().includes(timezoneSearch.toLowerCase())
  );

  // Handle timezone selection
  const handleTimezoneSelect = (timezone) => {
    setShowTimezoneDropdown(false);
    setTimezoneSearch('');
    setIsSearchingTimezone(false);
    handleAvailabilityChangeLocal('timeZone', timezone);
  };

  // Handle timezone input change
  const handleTimezoneInputChange = (e) => {
    const value = e.target.value;
    setTimezoneSearch(value);
    setIsSearchingTimezone(true);
    setShowTimezoneDropdown(true);
  };

  // Handle timezone input focus
  const handleTimezoneInputFocus = () => {
    setIsSearchingTimezone(true);
    setShowTimezoneDropdown(true);
    if (!timezoneSearch) {
      setTimezoneSearch('');
    }
  };

  // Clear timezone selection
  const clearTimezoneSelection = () => {
    setIsSearchingTimezone(false);
    setTimezoneSearch('');
    setShowTimezoneDropdown(false);
    handleAvailabilityChangeLocal('timeZone', null);
  };

  // Get current timezone object
  const getCurrentTimezone = () => {
    if (!editedProfile.availability?.timeZone) return null;

    // If timeZone is already an object (as it should be), return it directly
    if (typeof editedProfile.availability.timeZone === 'object') {
      return editedProfile.availability.timeZone;
    }

    // Fallback: if it's just an ID string, find it in countries list
    return countries.find(tz => tz._id === editedProfile.availability.timeZone);
  };

  // Check if timezone matches the selected country
  const checkTimezoneCountryMatch = () => {
    const currentTimezone = getCurrentTimezone();
    const selectedCountry = editedProfile.personalInfo?.country;

    if (!currentTimezone || !selectedCountry) return { matches: true, message: '' };

    const selectedCountryCode = typeof selectedCountry === 'object' ? selectedCountry.countryCode : selectedCountry;
    const timezoneCountryCode = currentTimezone.countryCode;

    if (selectedCountryCode !== timezoneCountryCode) {
      const timezoneCountryName = countries.find(c => c.countryCode === timezoneCountryCode)?.countryName || 'Unknown';
      const selectedCountryName = typeof selectedCountry === 'object' ? selectedCountry.countryName : selectedCountry;

      return {
        matches: false,
        message: `Your timezone is set to ${timezoneCountryName}, but your country is ${selectedCountryName}. This is fine if you work across time zones.`
      };
    }

    return { matches: true, message: '' };
  };

  // Function to check for country mismatch dynamically
  const checkCountryMismatch = (currentCountry) => {
    if (!firstLoginLocation || !currentCountry) {
      return null;
    }

    const currentCountryCode = typeof currentCountry === 'object'
      ? currentCountry.countryCode
      : currentCountry;

    const firstLoginCountryCode = firstLoginLocation.countryCode;

    if (currentCountryCode !== firstLoginCountryCode) {
      const currentCountryName = typeof currentCountry === 'object'
        ? currentCountry.countryName
        : countries.find(c => c.countryCode === currentCountryCode)?.countryName || currentCountryCode;

      return {
        profileCountry: {
          code: currentCountryCode,
          name: currentCountryName
        },
        firstLoginCountry: {
          code: firstLoginCountryCode,
          name: firstLoginLocation.countryName,
          city: firstLoginLocation.city,
          region: firstLoginLocation.region
        }
      };
    }

    return null;
  };

  // Component to render country mismatch warning under the country field
  const CountryMismatchWarning = ({ currentCountry }) => {
    const mismatch = checkCountryMismatch(currentCountry);

    if (!mismatch) return null;

    return (
      <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-amber-800 mb-1">Location Notice</h4>
            <div className="text-sm text-amber-700 space-y-1">
              <p>
                Your profile shows <strong>{mismatch.profileCountry.name}</strong>, but your first login was from <strong>{mismatch.firstLoginCountry.name}</strong>
                {mismatch.firstLoginCountry.city && (
                  <span className="text-amber-600">
                    {' '}({mismatch.firstLoginCountry.city}
                    {mismatch.firstLoginCountry.region && `, ${mismatch.firstLoginCountry.region}`})
                  </span>
                )}
              </p>
              <p className="text-xs text-amber-600 mt-2">
                💡 If this seems incorrect, you can update your country selection above.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const validateProfile = () => {
    const errors = {};

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Phone validation regex - accepts various formats with optional country code
    const phoneRegex = /^\+?[\d\s-]{10,}$/;

    // Validate languages (at least one required)
    if (!editedProfile.personalInfo.languages?.length) {
      errors.languages = 'At least one language is required';
      console.error('Languages validation failed:', errors.languages);
    }

    // Validate name
    if (!editedProfile.personalInfo.name?.trim()) {
      errors.name = 'Name is required';
      console.error('Name validation failed:', errors.name);
    }

    // Validate country
    const countryValue = typeof editedProfile.personalInfo.country === 'object'
      ? editedProfile.personalInfo.country?.countryCode
      : editedProfile.personalInfo.country;
    if (!countryValue?.trim()) {
      errors.country = 'Country is required';
      console.error('Country validation failed:', errors.country);
    }

    /*     // Validate email
        if (!editedProfile.professionalSummary.currentRole?.trim()) {
          errors.currentRole = 'Current role is required';
          console.error('Current role validation failed:', errors.currentRole);
        } */

    /*     // Validate years of experience
        if (!editedProfile.professionalSummary.yearsOfExperience?.trim()) {
          errors.yearsExperience = 'Years of experience is required';
          console.error('Years of experience validation failed:', errors.yearsExperience);
        } */

    // Validate industries (at least one required) — skipped while the section is hidden.
    if (SHOW_PROFILE_DETAILS && !editedProfile.professionalSummary.industries?.length) {
      errors.industries = 'At least one industry is required';
      console.error('Industries validation failed:', errors.industries);
    }

    // Validate notable companies (at least one required)
    if (!editedProfile.professionalSummary.notableCompanies?.length) {
      errors.companies = 'At least one notable company is required';
      console.error('Companies validation failed:', errors.companies);
    }

    if (!editedProfile.personalInfo.email?.trim()) {
      errors.email = 'Email is required';
      console.error('Email validation failed:', errors.email);
    } else if (!emailRegex.test(editedProfile.personalInfo.email)) {
      errors.email = 'Please enter a valid email address';
      console.error('Email validation failed:', errors.email);
    }

    // Validate phone
    if (!editedProfile.personalInfo.phone?.trim()) {
      errors.phone = 'Phone number is required';
      console.error('Phone validation failed:', errors.phone);
    } else if (!phoneRegex.test(editedProfile.personalInfo.phone.replace(/\s+/g, ''))) {
      errors.phone = 'Please enter a valid phone number';
      console.error('Phone validation failed:', errors.phone);
    }

    console.log('Validation errors before setting state:', errors);
    setValidationErrors(errors);
    return { isValid: Object.keys(errors).length === 0, errors };
  };

  // Handle profile updates from AssessmentDialog
  const handleAssessmentUpdate = (updatedProfile) => {
    setEditedProfile(updatedProfile);
    if (onProfileUpdate) {
      onProfileUpdate(updatedProfile);
    }
  };

  const handleProfileChange = (field, value) => {
    // Update the profile state immediately for UI responsiveness
    const updatedPersonalInfo = {
      ...editedProfile.personalInfo,
      [field]: value
    };

    const updatedProfile = {
      ...editedProfile,
      personalInfo: updatedPersonalInfo
    };

    setEditedProfile(updatedProfile);
    setHasUnsavedChanges(true);
    setModifiedSections(prev => ({ ...prev, personalInfo: true }));

    // Validation rules
    const validations = {
      name: (val) => val.trim() ? '' : 'Name is required',
      country: (val) => {
        const countryValue = typeof val === 'object' ? val?.countryCode : val;
        return countryValue?.trim() ? '' : 'Country is required';
      },
      email: (val) => {
        if (!val.trim()) return 'Email is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(val) ? '' : 'Please enter a valid email address';
      },
      phone: (val) => {
        if (!val.trim()) return 'Phone is required';
        const phoneRegex = /^\+?[\d\s-]{10,}$/;
        return phoneRegex.test(val) ? '' : 'Please enter a valid phone number';
      },
      languages: (val) => val.length === 0 ? 'At least one language is required' : ''
    };

    // Get the appropriate validation function
    const validateField = validations[field] || ((val) => val.trim() ? '' : `${field.charAt(0).toUpperCase() + field.slice(1)} is required`);

    // Run validation
    const validationError = validateField(value);

    // Update validation errors state
    setValidationErrors(prev => ({
      ...prev,
      [field]: validationError
    }));
  };

  const addIndustry = async (selectedIndustry) => {
    if (selectedIndustry) {
      try {
        // Check if industry is already selected
        const isAlreadySelected = editedProfile.professionalSummary.industries.some(industry =>
          (typeof industry === 'object' ? industry._id : industry) === selectedIndustry._id
        );

        if (isAlreadySelected) return;

        const updatedIndustries = [
          ...(editedProfile.professionalSummary.industries || []),
          selectedIndustry
        ];
        console.log("updated industries :", updatedIndustries);

        // Clear the industry validation error since we're adding one
        setValidationErrors(prev => ({
          ...prev,
          industries: ''
        }));

        // Local update only
        setEditedProfile(prev => ({
          ...prev,
          professionalSummary: {
            ...prev.professionalSummary,
            industries: updatedIndustries
          }
        }));

        setHasUnsavedChanges(true);
        setModifiedSections(prev => ({ ...prev, professionalSummary: true }));
        setShowIndustryDropdown(false);
      } catch (error) {
        console.error('Error adding industry:', error);
      }
    }
  };

  const removeIndustry = async (index) => {
    try {
      const updatedIndustries = (editedProfile.professionalSummary?.industries || []).filter((_, i) => i !== index);

      // Set validation error if removing the last industry
      if (updatedIndustries.length === 0) {
        setValidationErrors(prev => ({
          ...prev,
          industries: 'At least one industry is required'
        }));
      } else {
        // Clear validation error if there are still industries
        setValidationErrors(prev => ({
          ...prev,
          industries: ''
        }));
      }

      // Local update only
      setEditedProfile(prev => ({
        ...prev,
        professionalSummary: {
          ...prev.professionalSummary,
          industries: updatedIndustries
        }
      }));

      setHasUnsavedChanges(true);
      setModifiedSections(prev => ({ ...prev, professionalSummary: true }));
    } catch (error) {
      console.error('Error removing industry:', error);
    }
  };

  const addActivity = async (selectedActivity) => {
    if (selectedActivity) {
      try {
        // Check if activity is already selected
        const isAlreadySelected = (editedProfile.professionalSummary.activities || []).some(activity =>
          (typeof activity === 'object' ? activity._id : activity) === selectedActivity._id
        );

        if (isAlreadySelected) return;

        const updatedActivities = [
          ...(editedProfile.professionalSummary.activities || []),
          selectedActivity
        ];
        console.log("updated activities :", updatedActivities);

        // Local update only
        setEditedProfile(prev => ({
          ...prev,
          professionalSummary: {
            ...prev.professionalSummary,
            activities: updatedActivities
          }
        }));

        setHasUnsavedChanges(true);
        setModifiedSections(prev => ({ ...prev, professionalSummary: true }));
        setShowActivityDropdown(false);
      } catch (error) {
        console.error('Error adding activity:', error);
      }
    }
  };

  const removeActivity = async (index) => {
    try {
      const updatedActivities = (editedProfile.professionalSummary?.activities || []).filter((_, i) => i !== index);

      // Local update only
      setEditedProfile(prev => ({
        ...prev,
        professionalSummary: {
          ...prev.professionalSummary,
          activities: updatedActivities
        }
      }));

      setHasUnsavedChanges(true);
      setModifiedSections(prev => ({ ...prev, professionalSummary: true }));
    } catch (error) {
      console.error('Error removing activity:', error);
    }
  };

  const addCompany = async () => {
    if (tempCompany.trim()) {
      try {
        const updatedCompanies = [
          ...(editedProfile.professionalSummary.notableCompanies || []),
          tempCompany
        ];

        // Clear the companies validation error since we're adding one
        setValidationErrors(prev => ({
          ...prev,
          companies: ''
        }));

        // Local update only
        setEditedProfile(prev => ({
          ...prev,
          professionalSummary: {
            ...prev.professionalSummary,
            notableCompanies: updatedCompanies
          }
        }));

        setTempCompany('');
        setHasUnsavedChanges(true);
        setModifiedSections(prev => ({ ...prev, professionalSummary: true }));
      } catch (error) {
        console.error('Error adding company:', error);
      }
    }
  };

  const removeCompany = async (index) => {
    try {
      const updatedCompanies = (editedProfile.professionalSummary?.[type] || []).filter((_, i) => i !== index);

      // Set validation error if removing the last company
      if (updatedCompanies.length === 0) {
        setValidationErrors(prev => ({
          ...prev,
          companies: 'At least one notable company is required'
        }));
      } else {
        // Clear validation error if there are still companies
        setValidationErrors(prev => ({
          ...prev,
          companies: ''
        }));
      }

      // Local update only
      setEditedProfile(prev => ({
        ...prev,
        professionalSummary: {
          ...prev.professionalSummary,
          notableCompanies: updatedCompanies
        }
      }));

      setHasUnsavedChanges(true);
      setModifiedSections(prev => ({ ...prev, professionalSummary: true }));
    } catch (error) {
      console.error('Error removing company:', error);
    }
  };

  const addLanguage = async () => {
    console.log('editedProfile : ', editedProfile);
    if (!tempLanguage.languageObj) {
      setValidationErrors(prev => ({
        ...prev,
        languages: 'Please select a language'
      }));
      return;
    }
    try {
      // Check if language is already selected
      const isAlreadySelected = editedProfile.personalInfo.languages.some(lang =>
        lang.language._id === tempLanguage.languageObj._id ||
        lang.language === tempLanguage.languageObj._id
      );

      if (isAlreadySelected) {
        setValidationErrors(prev => ({
          ...prev,
          languages: 'This language is already selected'
        }));
        return;
      }

      // Add language with new structure
      const languageEntry = {
        language: tempLanguage.languageObj,
        proficiency: tempLanguage.proficiency
      };

      const updatedLanguages = [
        ...editedProfile.personalInfo.languages,
        languageEntry
      ];

      // Local update only
      setEditedProfile(prev => ({
        ...prev,
        personalInfo: {
          ...prev.personalInfo,
          languages: updatedLanguages
        }
      }));

      setTempLanguage({ languageObj: null, proficiency: 'B1' });
      setValidationErrors(prev => ({ ...prev, languages: '' }));
      setHasUnsavedChanges(true);
      setModifiedSections(prev => ({ ...prev, personalInfo: true }));
      setShowLanguageDropdown(false);
      setLanguageSearch('');
    } catch (error) {
      console.error('Error adding language:', error);
    }
  };

  const removeLanguage = async (index) => {
    console.log('editedProfile : ', editedProfile);
    try {
      const updatedLanguages = editedProfile.personalInfo.languages.filter((_, i) => i !== index);

      // Set validation error if removing the last language
      if (updatedLanguages.length === 0) {
        setValidationErrors(prev => ({
          ...prev,
          languages: 'At least one language is required'
        }));
      } else {
        // Clear validation error if there are still languages
        setValidationErrors(prev => ({
          ...prev,
          languages: ''
        }));
      }

      // Local update only
      setEditedProfile(prev => ({
        ...prev,
        personalInfo: {
          ...prev.personalInfo,
          languages: updatedLanguages
        }
      }));

      setHasUnsavedChanges(true);
      setModifiedSections(prev => ({ ...prev, personalInfo: true }));
    } catch (error) {
      console.error('Error removing language:', error);
    }
  };

  const updateLanguageProficiency = async (index, newProficiency) => {
    try {
      const updatedLanguages = editedProfile.personalInfo.languages.map((lang, i) =>
        i === index ? { ...lang, proficiency: newProficiency } : lang
      );

      // Local update only
      setEditedProfile(prev => ({
        ...prev,
        personalInfo: {
          ...prev.personalInfo,
          languages: updatedLanguages
        }
      }));

      setHasUnsavedChanges(true);
      setModifiedSections(prev => ({ ...prev, personalInfo: true }));
    } catch (error) {
      console.error('Error updating language proficiency:', error);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const regenerateSummary = async () => {
    try {
      setLoading(true);
      const newSummary = await generateSummary(editedProfile);
      console.log('Generated summary:', newSummary); // Temporaire pour debug

      // Update only local state, don't save to database yet
      setEditedSummary(newSummary);
      setEditedProfile(prev => ({
        ...prev,
        professionalSummary: {
          ...prev.professionalSummary,
          profileDescription: newSummary
        }
      }));

      // Mark as having unsaved changes
      setHasUnsavedChanges(true);
      setModifiedSections(prev => ({ ...prev, professionalSummary: true }));
      setIsEditing(false);
      showToast('Professional summary has been regenerated! Click Save to apply changes.');

    } catch (error) {
      console.error('Failed to regenerate summary:', error);
      showToast('Failed to regenerate summary. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSummaryChange = (newSummary) => {
    // Update only local state
    setEditedSummary(newSummary);
    setEditedProfile(prev => ({
      ...prev,
      professionalSummary: {
        ...prev.professionalSummary,
        profileDescription: newSummary
      }
    }));

    // Mark as having unsaved changes
    setHasUnsavedChanges(true);
    setModifiedSections(prev => ({ ...prev, professionalSummary: true }));
  };

  const pushToRepsProfile = () => {
    // Requirements are cancelled for now: confirm & continue without gating.
    updateProfileData(editedProfile._id, { isBasicProfileCompleted: true })
      .then(() => {
        // Always stay inside the unified app — internal SPA navigation only.
        navigate('/profile');
      })
      .catch(error => {
        console.error('Error updating isBasicProfileCompleted:', error);
        // Navigate anyway so the user is not stuck on the editor.
        navigate('/profile');
      });
  };

  // Render validation error message
  const renderError = (error, id) => {
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

  const renderSkillSection = (title, skills, type, editing = false) => {
    console.log(`🔍 renderSkillSection called:`, { title, skills, type, skillsType: typeof skills, isArray: Array.isArray(skills) });

    // Ensure skills is always an array
    const safeSkills = Array.isArray(skills) ? skills : [];

    console.log(`🔍 safeSkills:`, safeSkills);

    const handleAdd = async () => {
      try {
        if (type === 'industries') {
          if (!tempIndustry.trim()) return;
          const updatedIndustries = [...(editedProfile.professionalSummary.industries || []), tempIndustry];

          // Clear validation error when adding industry
          setValidationErrors(prev => ({
            ...prev,
            industries: ''
          }));

          // Local update only
          setEditedProfile(prev => ({
            ...prev,
            professionalSummary: {
              ...prev.professionalSummary,
              industries: updatedIndustries
            }
          }));

          setTempIndustry('');
          setHasUnsavedChanges(true);
          setModifiedSections(prev => ({ ...prev, professionalSummary: true }));

        } else if (type === 'notableCompanies') {
          if (!tempCompany.trim()) return;
          const updatedCompanies = [...(editedProfile.professionalSummary.notableCompanies || []), tempCompany];

          // Clear validation error when adding company
          setValidationErrors(prev => ({
            ...prev,
            companies: ''
          }));

          // Local update only
          setEditedProfile(prev => ({
            ...prev,
            professionalSummary: {
              ...prev.professionalSummary,
              notableCompanies: updatedCompanies
            }
          }));

          setTempCompany('');
          setHasUnsavedChanges(true);
          setModifiedSections(prev => ({ ...prev, professionalSummary: true }));

        } else {
          // Handle skills (technical, professional, soft)
          // This will be handled by the new skill selector dropdown
          // No need to modify as we're replacing the input with dropdown
        }
      } catch (error) {
        console.error(`Error adding ${type}:`, error);
        alert(`Failed to add ${type}: ${error.message}`);
      }
    };

    const handleRemove = async (index) => {
      try {
        if (type === 'industries' || type === 'notableCompanies' || type === 'activities') {
          const updatedData = (editedProfile.professionalSummary?.[type] || []).filter((_, i) => i !== index);

          // Set validation error if removing the last item (only for required fields)
          if (updatedData.length === 0 && type === 'industries') {
            setValidationErrors(prev => ({
              ...prev,
              industries: 'At least one industry is required'
            }));
          } else if (updatedData.length === 0 && type === 'notableCompanies') {
            setValidationErrors(prev => ({
              ...prev,
              companies: 'At least one notable company is required'
            }));
          } else {
            // Clear validation error if there are still items
            if (type === 'industries') {
              setValidationErrors(prev => ({
                ...prev,
                industries: ''
              }));
            } else if (type === 'notableCompanies') {
              setValidationErrors(prev => ({
                ...prev,
                companies: ''
              }));
            }
          }

          // Local update only
          setEditedProfile(prev => ({
            ...prev,
            professionalSummary: {
              ...prev.professionalSummary,
              [type]: updatedData
            }
          }));

          setHasUnsavedChanges(true);
          setModifiedSections(prev => ({ ...prev, professionalSummary: true }));
        } else {
          // Handle skills removal locally
          const currentSkills = editedProfile.skills?.[type] || [];
          const updatedSkills = currentSkills.filter((_, i) => i !== index);

          // Update local state only
          setEditedProfile(prev => ({
            ...prev,
            skills: {
              ...prev.skills,
              [type]: updatedSkills
            }
          }));

          setHasUnsavedChanges(true);
          setModifiedSections(prev => ({ ...prev, skills: true }));
        }
      } catch (error) {
        console.error(`Error removing ${type}:`, error);
        alert(`Failed to remove ${type}: ${error.message}`);
      }
    };

    const handleSkillSelect = (skill) => {
      if (type === 'technical' || type === 'professional' || type === 'soft') {
        const currentSkills = editedProfile.skills?.[type] || [];

        // Check if skill is already selected - handle both structures
        const isAlreadySelected = currentSkills.some(s => {
          // Handle complex structure: s.skill._id
          if (s.skill && typeof s.skill === 'object') {
            return s.skill._id === skill._id;
          }
          // Handle direct structure: s._id
          if (s._id) {
            return s._id === skill._id;
          }
          return false;
        });

        if (isAlreadySelected) return;

        // Create skill object with the expected structure
        const skillObject = {
          skill: skill,
          level: 0,
          details: ""
        };

        const updatedSkills = [...currentSkills, skillObject];

        // Update local state
        setEditedProfile(prev => ({
          ...prev,
          skills: {
            ...prev.skills,
            [type]: updatedSkills
          }
        }));

        setHasUnsavedChanges(true);
        setModifiedSections(prev => ({ ...prev, skills: true }));

        // Close the dropdown
        setShowSkillDropdown(prev => ({ ...prev, [type]: false }));
      }
    };

    const getTempValue = () => {
      if (type === 'industries') return tempIndustry;
      if (type === 'notableCompanies') return tempCompany;
      return tempSkill[type] || '';
    };

    const handleTempChange = (value) => {
      if (type === 'industries') setTempIndustry(value);
      else if (type === 'notableCompanies') setTempCompany(value);
      else setTempSkill(prev => ({ ...prev, [type]: value }));
    };

    const isSkillType = type === 'technical' || type === 'professional' || type === 'soft';
    const skillData = isSkillType ? availableSkills[type] : {};

    return (
      <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            {type === 'technical' && '🔧'}
            {type === 'professional' && '💼'}
            {type === 'soft' && '🤝'}
            {type === 'notableCompanies' && '🌟'}
            {type === 'industries' && '🏭'}
            {type === 'activities' && '🎯'}
            <span className="ml-2">{title}</span>
          </h3>
          {type === 'notableCompanies' && renderSectionControls('companies')}
        </div>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {safeSkills.map((skill, index) => {
              // Enhanced skill name extraction with better fallbacks for the real data structure
              const getSkillName = (skillData) => {
                console.log('🔍 getSkillName processing:', skillData);

                // Handle string skills (legacy or simple format)
                if (typeof skillData === 'string') return skillData;

                // Handle object skills
                if (typeof skillData === 'object' && skillData !== null) {
                  // New structure: skill.skill.name
                  if (skillData.skill && typeof skillData.skill === 'object') {
                    return skillData.skill.name || skillData.skill.skill || skillData.skill.title || `Skill ${index + 1}`;
                  }

                  // Direct structure: skill.name
                  if (skillData.name) {
                    return skillData.name;
                  }

                  // Other possible properties
                  if (skillData.skill && typeof skillData.skill === 'string') {
                    return skillData.skill;
                  }

                  if (skillData.title) {
                    return skillData.title;
                  }
                }

                // Fallback
                return `Skill ${index + 1}`;
              };

              const skillName = getSkillName(skill);
              console.log('🔍 Final skill name:', skillName);

              return (
                <div
                  key={skill?.skill?._id || skill?._id || index}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-harx-50 to-harx-alt-50 text-gray-700 rounded-full text-sm font-medium border border-gray-200 hover:shadow-md transition-shadow duration-200 group"
                >
                  <span>{skillName}</span>
                  {editing && (
                    <button
                      onClick={() => handleRemove(index)}
                      className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {type === 'industries' && renderError(validationErrors.industries, 'industries')}
          {type === 'notableCompanies' && renderError(validationErrors.companies, 'companies')}
          {editing && (
            <div className="flex gap-2">
              {isSkillType ? (
                <div className="relative flex-1 group">
                  <select
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      if (!selectedId) return;

                      // Find the selected skill object across all categories
                      let selectedSkill = null;
                      // Iterate through values of skillData (which are arrays of skills)
                      for (const categorySkills of Object.values(skillData)) {
                        const found = categorySkills.find(s => s._id === selectedId);
                        if (found) {
                          selectedSkill = found;
                          break;
                        }
                      }

                      if (selectedSkill) {
                        handleSkillSelect(selectedSkill);
                        // Reset selection so the placeholder is shown again
                        e.target.value = "";
                      }
                    }}
                    className="profile-form-select w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl bg-white text-gray-700 text-sm font-medium outline-none focus:ring-4 focus:ring-harx-500/10 focus:border-harx-500 cursor-pointer transition-all duration-200 hover:border-harx-300 hover:shadow-md shadow-sm"
                    defaultValue=""
                  >
                    <option value="" disabled className="text-gray-400 bg-white">Select {title.toLowerCase().replace(' skills', '')} skills...</option>
                    {Object.entries(skillData).map(([category, categorySkills]) => (
                      <optgroup label={category} key={category} className="font-bold text-harx-900 bg-harx-50/50">
                        {categorySkills.map(skill => {
                          // Check if skill is already selected
                          const isSelected = safeSkills.some(s => {
                            if (typeof s === 'string') return s === skill.name || s === skill.skill;
                            if (s.skill && typeof s.skill === 'object') {
                              return s.skill._id === skill._id || s.skill.name === skill.name;
                            }
                            if (s._id) {
                              return s._id === skill._id || s.name === skill.name;
                            }
                            return false;
                          });

                          return (
                            <option
                              key={skill._id}
                              value={skill._id}
                              disabled={isSelected}
                              className={`py-2 px-4 ${isSelected ? 'text-gray-400 bg-gray-50 italic' : 'text-gray-700 bg-white hover:bg-harx-50'}`}
                            >
                              {skill.name} {isSelected ? '(Selected)' : ''}
                            </option>
                          );
                        })}
                      </optgroup>
                    ))}
                  </select>
                </div>
              ) : type === 'industries' ? (
                <div className="relative industry-selector flex-1">
                  <select
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      if (!selectedId) return;
                      const industry = availableIndustries.find(i => i._id === selectedId);
                      if (industry) {
                        addIndustry(industry);
                        e.target.value = "";
                      }
                    }}
                    className="profile-form-select w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl bg-white text-gray-700 text-sm font-medium outline-none focus:ring-4 focus:ring-harx-500/10 focus:border-harx-500 cursor-pointer transition-all duration-200 hover:border-harx-300 hover:shadow-md shadow-sm"
                    defaultValue=""
                  >
                    <option value="" disabled className="text-gray-400 bg-white">Select industries...</option>
                    {availableIndustries.length > 0 ? (
                      availableIndustries.map((industry) => {
                        const isSelected = safeSkills.some(item =>
                          (typeof item === 'object' ? item._id : item) === industry._id
                        );

                        return (
                          <option
                            key={industry._id}
                            value={industry._id}
                            disabled={isSelected}
                            className={`py-2 px-4 ${isSelected ? 'text-gray-400 bg-gray-50 italic' : 'text-gray-700 bg-white hover:bg-harx-50'}`}
                          >
                            {industry.name} {isSelected ? '(Selected)' : ''}
                          </option>
                        );
                      })
                    ) : (
                      <option value="" disabled>No industries available</option>
                    )}
                  </select>
                </div>
              ) : type === 'activities' ? (
                <div className="relative activity-selector flex-1">
                  <select
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      if (!selectedId) return;
                      const activity = availableActivities.find(a => a._id === selectedId);
                      if (activity) {
                        addActivity(activity);
                        e.target.value = "";
                      }
                    }}
                    className="profile-form-select w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl bg-white text-gray-700 text-sm font-medium outline-none focus:ring-4 focus:ring-harx-500/10 focus:border-harx-500 cursor-pointer transition-all duration-200 hover:border-harx-300 hover:shadow-md shadow-sm"
                    defaultValue=""
                  >
                    <option value="" disabled className="text-gray-400 bg-white">Select activities...</option>
                    {availableActivities.length > 0 ? (
                      Object.entries(
                        availableActivities.reduce((groups, activity) => {
                          const category = activity.category || 'Other';
                          if (!groups[category]) groups[category] = [];
                          groups[category].push(activity);
                          return groups;
                        }, {})
                      ).map(([category, categoryActivities]) => (
                        <optgroup label={category} key={category} className="font-bold text-harx-900 bg-harx-50/50">
                          {categoryActivities.map((activity) => {
                            const isSelected = safeSkills.some(item =>
                              (typeof item === 'object' ? item._id : item) === activity._id
                            );

                            return (
                              <option
                                key={activity._id}
                                value={activity._id}
                                disabled={isSelected}
                                className={`py-2 px-4 ${isSelected ? 'text-gray-400 bg-gray-50 italic' : 'text-gray-700 bg-white hover:bg-harx-50'}`}
                              >
                                {activity.name} {isSelected ? '(Selected)' : ''}
                              </option>
                            );
                          })}
                        </optgroup>
                      ))
                    ) : (
                      <option value="" disabled>No activities available</option>
                    )}
                  </select>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={getTempValue()}
                    onChange={(e) => handleTempChange(e.target.value)}
                    className="flex-1 p-2 border rounded-md bg-white/50"
                    placeholder={`Add ${title.toLowerCase()}`}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAdd();
                      }
                    }}
                  />
                  <button
                    onClick={handleAdd}
                    className="px-4 py-2 text-sm font-medium text-white bg-harx-600 rounded-md hover:bg-harx-700 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderExperienceSection = () => {
    const formatDate = (date) => {
      if (date === 'present') return 'Present';
      if (!date) return '';
      try {
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return date;

        // Format as dd/mm/yyyy
        const day = dateObj.getDate().toString().padStart(2, '0');
        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0'); // +1 because months are 0-indexed
        const year = dateObj.getFullYear();

        return `${day}/${month}/${year}`;
      } catch (error) {
        console.error('Error formatting date:', error);
        return date;
      }
    };

    return (
      <div className="mb-8 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900">{t('professionalExperience')}</h3>
            <div className="flex items-center gap-2">
              {isSectionEditing('experience') && (
                <button
                  onClick={() => setShowNewExperienceForm(true)}
                  className="px-4 py-2 text-sm font-medium text-harx-600 bg-harx-50 rounded-lg hover:bg-harx-100 transition-colors duration-200 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  {t('addExperience')}
                </button>
              )}
              {renderSectionControls('experience')}
            </div>
          </div>

          {showNewExperienceForm && (
            <div className="mb-6">
              <ExperienceForm
                experience={newExperience}
                onSubmit={handleAddExperience}
                isNew={true}
              />
            </div>
          )}

          <div className="space-y-6">
            {editedProfile.experience?.map((role, index) => (
              <div key={index} className="relative">
                {editingExperienceIndex === index ? (
                  <ExperienceForm
                    experience={editingExperience}
                    onSubmit={handleExperienceUpdate}
                    isNew={false}
                  />
                ) : (
                  <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border border-gray-200 relative group">
                    {isSectionEditing('experience') && (
                      <div className="absolute top-4 right-4 opacity-60 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                        <button
                          onClick={() => {
                            // Open the form with the CURRENT language values so the
                            // rep edits in the locale shown by the language bar.
                            const localizedResp = localizeList(role.responsibilities_i18n, uiLang);
                            const localizedAch = localizeList(role.achievements_i18n, uiLang);
                            setEditingExperienceIndex(index);
                            setEditingExperience({
                              ...role,
                              title: localizeText(role.title_i18n, uiLang) || role.title,
                              responsibilities: localizedResp.length ? localizedResp : (role.responsibilities || []),
                              achievements: localizedAch.length ? localizedAch : (role.achievements || []),
                            });
                          }}
                          className="p-2 text-harx-600 hover:text-harx-700 bg-white rounded-full shadow-sm hover:shadow-md transition-all duration-200 border border-harx-200"
                          title="Edit experience"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleRemoveExperience(index)}
                          className="p-2 text-red-600 hover:text-red-700 bg-white rounded-full shadow-sm hover:shadow-md transition-all duration-200 border border-red-200"
                          title="Remove experience"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-800">
                          {localizeText(role.title_i18n, uiLang) || role.title}
                        </h4>
                        <p className="text-gray-600">{role.company}</p>
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(role.startDate)} - {formatDate(role.endDate)}
                      </div>
                    </div>
                    <ul className="mt-3 space-y-2">
                      {(localizeList(role.responsibilities_i18n, uiLang).length
                        ? localizeList(role.responsibilities_i18n, uiLang)
                        : role.responsibilities || []
                      ).map((resp, idx) => (
                        <li key={idx} className="text-gray-700 flex items-start">
                          <span className="text-harx-500 mr-2">•</span>
                          {resp}
                        </li>
                      ))}
                    </ul>

                    {role.videoUrl || role.videoAnalysis ? (
                      <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
                        <svg className="h-4 w-4 flex-shrink-0 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-bold text-emerald-700">{t('expVideoDone')}</span>
                      </div>
                    ) : (
                      <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border-2 border-red-200 animate-pulse">
                        <svg className="h-4 w-4 flex-shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-bold text-red-600">{t('expVideoMissing')}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setVideoModalExp({
                        title: String(role.title || role.role || ''),
                        company: String(role.company || ''),
                        index,
                      })}
                      className={`mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border-2 border-dashed transition-all text-xs font-black uppercase tracking-widest ${
                        role.videoUrl || role.videoAnalysis
                          ? 'border-emerald-300 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-50'
                          : 'border-harx-200 text-harx-600 hover:border-harx-400 hover:bg-harx-50/50'
                      }`}
                    >
                      <Video className="w-4 h-4" />
                      {role.videoUrl || role.videoAnalysis ? t('viewAnalysis') : t('recordAnalyze')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {videoModalExp && (
          <ExperienceVideoModal
            isOpen={!!videoModalExp}
            onClose={() => setVideoModalExp(null)}
            experience={{ title: videoModalExp.title, company: videoModalExp.company }}
            experienceIndex={videoModalExp.index}
            profileId={editedProfile._id || editedProfile.id || ''}
            referencePhotoUrl={editedProfile?.personalInfo?.photo?.url || null}
            savedData={editedProfile.experience?.[videoModalExp.index] ? {
              videoUrl: editedProfile.experience[videoModalExp.index].videoUrl,
              videoDuration: editedProfile.experience[videoModalExp.index].videoDuration,
              videoTranscription: editedProfile.experience[videoModalExp.index].videoTranscription,
              videoAnalysis: editedProfile.experience[videoModalExp.index].videoAnalysis,
              videoLanguageAssessment: editedProfile.experience[videoModalExp.index].videoLanguageAssessment,
              videoFraudCheck: editedProfile.experience[videoModalExp.index].videoFraudCheck,
              videoRelevance: editedProfile.experience[videoModalExp.index].videoRelevance,
              videoAnalyzedAt: editedProfile.experience[videoModalExp.index].videoAnalyzedAt,
            } : null}
            onAnalysisComplete={(data) => {
              if (!data) return;
              const idx = videoModalExp.index;
              setEditedProfile((prev) => {
                const experience = [...(prev.experience || [])];
                if (!experience[idx]) return prev;
                experience[idx] = {
                  ...experience[idx],
                  videoUrl: data.videoUrl,
                  videoDuration: data.duration,
                  videoTranscription: data.transcription,
                  videoAnalysis: data.analysis,
                  videoLanguageAssessment: data.languageAssessment,
                  videoFraudCheck: data.fraudCheck,
                  videoRelevance: data.relevance,
                  videoAnalyzedAt: new Date().toISOString(),
                };
                const updated = { ...prev, experience };
                if (onProfileUpdate) onProfileUpdate(updated);
                return updated;
              });
            }}
          />
        )}
      </div>
    );
  };

  const handleExperienceUpdate = async (updatedExperience) => {
    try {
      const updatedExperiences = [...editedProfile.experience];
      const index = editingExperienceIndex >= 0
        ? editingExperienceIndex
        : editedProfile.experience.findIndex(exp => exp === editingExperience);
      const prevExp = updatedExperiences[index] || {};
      // Refresh the active locale of the _i18n mirrors right away so the display
      // updates immediately; saveSection re-translates the other locale on save.
      const merged = { ...prevExp, ...updatedExperience };
      merged.title_i18n = {
        en: '', fr: '', ...(prevExp.title_i18n || {}), [uiLang]: merged.title || '',
      };
      merged.responsibilities_i18n = {
        en: [], fr: [], ...(prevExp.responsibilities_i18n || {}), [uiLang]: merged.responsibilities || [],
      };
      merged.achievements_i18n = {
        en: [], fr: [], ...(prevExp.achievements_i18n || {}), [uiLang]: merged.achievements || [],
      };
      updatedExperiences[index] = merged;

      // Local update only
      setEditedProfile(prev => ({
        ...prev,
        experience: updatedExperiences
      }));
      setHasUnsavedChanges(true);
      setModifiedSections(prev => ({ ...prev, experience: true }));
      setEditingExperience(null);
      setEditingExperienceIndex(-1);
    } catch (error) {
      console.error('Error updating experience:', error);
    }
  };

  const handleAddExperience = async (experienceData) => {
    try {
      console.log('Raw experience data received:', experienceData);
      console.log('Raw startDate:', experienceData.startDate);
      console.log('Raw endDate:', experienceData.endDate);
      console.log('isPresent:', experienceData.isPresent);

      // Process the dates before creating the experience
      const processedExperience = {
        ...experienceData,
        startDate: new Date(experienceData.startDate),
        // Handle endDate specially
        endDate: experienceData.isPresent ? 'present' : new Date(experienceData.endDate)
      };

      console.log('Processed experience before validation:', processedExperience);
      console.log('Processed startDate type:', typeof processedExperience.startDate);
      console.log('Processed startDate value:', processedExperience.startDate);
      console.log('Processed endDate type:', typeof processedExperience.endDate);
      console.log('Processed endDate value:', processedExperience.endDate);

      // Validate the dates
      if (isNaN(processedExperience.startDate.getTime())) {
        throw new Error('Invalid start date');
      }
      if (!experienceData.isPresent && isNaN(processedExperience.endDate.getTime())) {
        throw new Error('Invalid end date');
      }

      // Create a new array with the new experience at the beginning
      const updatedExperiences = [
        processedExperience,
        ...(editedProfile.experience || [])
      ];

      console.log('Final data being sent to backend:', updatedExperiences);

      // Local update only
      setEditedProfile(prev => ({
        ...prev,
        experience: updatedExperiences
      }));
      setHasUnsavedChanges(true);
      setModifiedSections(prev => ({ ...prev, experience: true }));
      setShowNewExperienceForm(false);
      setNewExperience({
        title: '',
        company: '',
        startDate: '',
        endDate: '',
        responsibilities: [''],
        isPresent: false
      });
    } catch (error) {
      console.error('Error adding experience:', error);
      alert('Error adding experience: ' + error.message);
    }
  };

  const handleRemoveExperience = async (index) => {
    try {
      const updatedExperiences = editedProfile.experience.filter((_, i) => i !== index);

      // Local update only
      setEditedProfile(prev => ({
        ...prev,
        experience: updatedExperiences
      }));
      setHasUnsavedChanges(true);
      setModifiedSections(prev => ({ ...prev, experience: true }));
    } catch (error) {
      console.error('Error removing experience:', error);
    }
  };

  const handleProfileDescriptionUpdate = async () => {
    try {
      await updateProfileData(editedProfile._id, {
        professionalSummary: {
          ...editedProfile.professionalSummary,
          profileDescription: tempProfileDescription
        }
      });

      setEditedProfile(prev => ({
        ...prev,
        professionalSummary: {
          ...prev.professionalSummary,
          profileDescription: tempProfileDescription
        }
      }));
    } catch (error) {
      console.error('Error updating profile description:', error);
    }
  };

  // NEW: Local availability change handler
  const handleAvailabilityChangeLocal = (field, value) => {
    let updatedAvailability;

    if (field === 'schedule') {
      // Handle schedule updates
      updatedAvailability = {
        ...editedProfile.availability,
        schedule: value
      };
    } else if (field === 'timeZone' || field === 'flexibility') {
      // Handle single field updates
      updatedAvailability = {
        ...editedProfile.availability,
        [field]: value
      };
    }

    setEditedProfile(prev => ({
      ...prev,
      availability: updatedAvailability
    }));

    setHasUnsavedChanges(true);
    setModifiedSections(prev => ({ ...prev, availability: true }));
  };

  // NEW: Save all profile changes at once
  const saveProfile = async () => {
    try {
      setIsSaving(true);

      // Validate before saving
      const { isValid, errors } = validateProfile();
      if (!isValid) {
        setValidationErrors(errors);
        showToast('Please fix validation errors before saving', 'error');
        return;
      }

      // Only save sections that have been modified
      if (modifiedSections.personalInfo) {
        await updateBasicInfo(editedProfile._id, editedProfile.personalInfo);
      }

      if (modifiedSections.skills) {
        await updateSkills(editedProfile._id, editedProfile.skills);
      }

      if (modifiedSections.professionalSummary) {
        // Extract only IDs for industries and activities before saving
        const professionalSummaryToSave = {
          ...editedProfile.professionalSummary,
          industries: editedProfile.professionalSummary.industries?.map(industry =>
            typeof industry === 'object' ? industry._id : industry
          ) || [],
          activities: editedProfile.professionalSummary.activities?.map(activity =>
            typeof activity === 'object' ? activity._id : activity
          ) || []
        };

        await updateProfileData(editedProfile._id, {
          professionalSummary: professionalSummaryToSave
        });
      }

      if (modifiedSections.availability && editedProfile.availability) {
        await updateProfileData(editedProfile._id, {
          availability: editedProfile.availability
        });
      }

      if (modifiedSections.experience && editedProfile.experience) {
        await updateExperience(editedProfile._id, editedProfile.experience);
      }

      // Reset all modification flags
      setModifiedSections({
        personalInfo: false,
        skills: false,
        professionalSummary: false,
        availability: false,
        experience: false
      });

      setHasUnsavedChanges(false);
      setEditingProfile(false);
      showToast('Profile saved successfully!', 'success');

    } catch (error) {
      console.error('Error saving profile:', error);
      showToast('Error saving profile. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // NEW: Reset modification flags when canceling edit
  const cancelEdit = () => {
    console.log('🔍 Canceling edit, resetting to original profileData:', profileData);

    setEditingProfile(false);
    setHasUnsavedChanges(false);
    setModifiedSections({
      personalInfo: false,
      skills: false,
      professionalSummary: false,
      availability: false,
      experience: false
    });

    // Reset to original profile data with safe defaults
    if (profileData) {
      setEditedProfile({
        ...profileData,
        skills: {
          technical: profileData.skills?.technical || [],
          professional: profileData.skills?.professional || [],
          soft: profileData.skills?.soft || []
        },
        professionalSummary: {
          ...profileData.professionalSummary,
          industries: profileData.professionalSummary?.industries || [],
          activities: profileData.professionalSummary?.activities || [],
          notableCompanies: profileData.professionalSummary?.notableCompanies || []
        },
        personalInfo: {
          ...profileData.personalInfo,
          languages: profileData.personalInfo?.languages || []
        },
        experience: profileData.experience || [],
        availability: profileData.availability || {}
      });

      // Reset the edited summary to the original
      setEditedSummary(profileData.professionalSummary?.profileDescription || '');
    }

    console.log('🔍 Edit canceled, profile reset');
  };

  // ── Per-section editing ──────────────────────────────────────────────────
  const isSectionEditing = (section) => !!sectionEditing[section];

  const startSectionEdit = (section) => {
    setSectionEditing((prev) => ({ ...prev, [section]: true }));
    if (section === 'summary') {
      // Seed the editor with the CURRENT language version of the summary.
      const localized = localizeText(
        editedProfile.professionalSummary?.profileDescription_i18n,
        uiLang
      ) || editedProfile.professionalSummary?.profileDescription || '';
      setEditedSummary(localized);
      setEditedProfile((prev) => ({
        ...prev,
        professionalSummary: { ...prev.professionalSummary, profileDescription: localized },
      }));
    }
  };

  // Revert a single section's data back to the original profileData.
  const revertSection = (section) => {
    if (!profileData) return;
    setEditedProfile((prev) => {
      const next = { ...prev };
      if (section === 'basic') {
        next.personalInfo = {
          ...profileData.personalInfo,
          languages: profileData.personalInfo?.languages || [],
        };
      } else if (section === 'experience') {
        next.experience = profileData.experience || [];
      } else if (section === 'availability') {
        next.availability = profileData.availability || {};
      } else if (section === 'summary' || section === 'companies') {
        next.professionalSummary = {
          ...profileData.professionalSummary,
          industries: profileData.professionalSummary?.industries || [],
          activities: profileData.professionalSummary?.activities || [],
          notableCompanies: profileData.professionalSummary?.notableCompanies || [],
        };
      }
      return next;
    });
    if (section === 'summary') {
      setEditedSummary(profileData.professionalSummary?.profileDescription || '');
      setIsEditing(false);
    }
  };

  const cancelSection = (section) => {
    revertSection(section);
    setSectionEditing((prev) => ({ ...prev, [section]: false }));
  };

  const saveSection = async (section) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      let savedProfile = editedProfile;
      if (section === 'basic') {
        await updateBasicInfo(editedProfile._id, editedProfile.personalInfo);
      } else if (section === 'experience') {
        // Keep the { en, fr } mirror in sync: the active locale holds the edited
        // value, the other locale is re-translated.
        const experienceToSave = await Promise.all(
          (editedProfile.experience || []).map(async (exp) => {
            const title_i18n = await buildTextI18n(exp.title, exp.title_i18n);
            const responsibilities_i18n = await buildListI18n(exp.responsibilities, exp.responsibilities_i18n);
            const achievements_i18n = await buildListI18n(exp.achievements, exp.achievements_i18n);
            return { ...exp, title_i18n, responsibilities_i18n, achievements_i18n };
          })
        );
        await updateExperience(editedProfile._id, experienceToSave);
        savedProfile = { ...editedProfile, experience: experienceToSave };
        setEditedProfile(savedProfile);
      } else if (section === 'availability') {
        await updateProfileData(editedProfile._id, { availability: editedProfile.availability });
      } else if (section === 'summary' || section === 'companies') {
        const profileDescription_i18n =
          section === 'summary'
            ? await buildTextI18n(
                editedProfile.professionalSummary?.profileDescription,
                editedProfile.professionalSummary?.profileDescription_i18n
              )
            : editedProfile.professionalSummary?.profileDescription_i18n;
        const professionalSummaryToSave = {
          ...editedProfile.professionalSummary,
          ...(profileDescription_i18n ? { profileDescription_i18n } : {}),
          industries: editedProfile.professionalSummary.industries?.map((industry) =>
            typeof industry === 'object' ? industry._id : industry
          ) || [],
          activities: editedProfile.professionalSummary.activities?.map((activity) =>
            typeof activity === 'object' ? activity._id : activity
          ) || [],
        };
        await updateProfileData(editedProfile._id, { professionalSummary: professionalSummaryToSave });
        savedProfile = {
          ...editedProfile,
          professionalSummary: {
            ...editedProfile.professionalSummary,
            ...(profileDescription_i18n ? { profileDescription_i18n } : {}),
          },
        };
        setEditedProfile(savedProfile);
      }
      if (onProfileUpdate) onProfileUpdate(savedProfile);
      setSectionEditing((prev) => ({ ...prev, [section]: false }));
      if (section === 'summary') setIsEditing(false);
      showToast(t('savedSuccess'), 'success');
    } catch (error) {
      console.error(`Error saving section "${section}":`, error);
      showToast(t('saveError'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Reusable Edit / Save / Cancel controls for a section header.
  const renderSectionControls = (section) =>
    isSectionEditing(section) ? (
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => cancelSection(section)}
          disabled={isSaving}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {t('cancel')}
        </button>
        <button
          onClick={() => saveSection(section)}
          disabled={isSaving}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
        >
          {isSaving && (
            <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {isSaving ? t('saving') : t('save')}
        </button>
      </div>
    ) : (
      <button
        onClick={() => startSectionEdit(section)}
        className="px-3 py-1.5 text-xs font-semibold rounded-lg text-harx-700 bg-harx-50 hover:bg-harx-100 border border-harx-100 transition-colors inline-flex items-center gap-1.5 flex-shrink-0"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        {t('edit')}
      </button>
    );

  if (!editedProfile?.personalInfo) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <span className="relative flex h-14 w-14">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-harx-400 opacity-30" />
          <span className="relative inline-flex rounded-full h-14 w-14 items-center justify-center bg-gradient-to-br from-harx-500 to-harx-alt-500">
            <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </span>
        </span>
        <p className="mt-5 text-gray-700 font-medium">Loading your profile…</p>
      </div>
    );
  }

  const countryDisplay =
    typeof editedProfile.personalInfo.country === 'object'
      ? `${editedProfile.personalInfo.country?.countryName || ''} (${editedProfile.personalInfo.country?.countryCode || ''})`
      : editedProfile.personalInfo.country || '—';

  // Continuing is only allowed once EVERY experience has a recorded/analyzed
  // video. Until then we hide the "Confirm to continue" buttons and show a loud
  // warning prompting the user to record the missing videos.
  const experienceList = Array.isArray(editedProfile.experience) ? editedProfile.experience : [];
  const experiencesWithVideo = experienceList.filter((exp) => exp && (exp.videoUrl || exp.videoAnalysis)).length;
  const allExperiencesHaveVideo =
    experienceList.length > 0 && experiencesWithVideo === experienceList.length;
  const missingVideosCount = experienceList.length - experiencesWithVideo;

  const hasAvailabilitySet = (() => {
    const avail = editedProfile.availability;
    const hasSchedule =
      Array.isArray(avail?.schedule) &&
      avail.schedule.length > 0 &&
      avail.schedule.every((s) => s?.day && s?.hours?.start && s?.hours?.end);
    const tz = avail?.timeZone;
    const hasTimeZone = Boolean(
      tz && (typeof tz === 'object' ? tz._id || tz.zoneName : String(tz).trim())
    );
    return hasSchedule && hasTimeZone;
  })();

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-harx-500 via-harx-alt-500 to-harx-600" />
      <div className="p-6 sm:p-8">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-8">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-3 rounded-full bg-harx-50 text-harx-700 text-xs font-semibold tracking-wide uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-harx-500" />
                {t('stepBadge')}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                {t('pageTitle')}
              </h2>
              <p className="mt-1 text-sm text-gray-500 max-w-lg">
                {t('pageSubtitle')}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {allExperiencesHaveVideo && (
                <button
                  onClick={pushToRepsProfile}
                  className="px-4 py-2 text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-harx-600 to-harx-alt-600 hover:from-harx-700 hover:to-harx-alt-700 transition-colors inline-flex items-center gap-2"
                >
                  {t('confirmContinue')}
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Loud warning: record a video for every experience before continuing */}
          {!allExperiencesHaveVideo && (
            <div className="mb-8 relative overflow-hidden rounded-2xl border-2 border-red-300 bg-gradient-to-r from-red-50 via-orange-50 to-red-50 p-5 shadow-lg shadow-red-200/50 animate-pulse">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 ring-4 ring-red-200">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-base font-black uppercase tracking-wide text-red-700 flex items-center gap-2">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {t('warnVideoTitle')}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-red-600">
                    {experienceList.length === 0
                      ? t('warnAddExp')
                      : uiLang === 'fr'
                      ? `${missingVideosCount} expérience${experienceList.length > 1 ? 's' : ''} sur ${experienceList.length} ${missingVideosCount > 1 ? 'n’ont' : 'n’a'} pas encore de vidéo. Utilisez le bouton « ${t('recordAnalyze')} » sur chaque expérience ci-dessous. Vous ne pouvez pas continuer tant que toutes les vidéos ne sont pas enregistrées.`
                      : `${missingVideosCount} of ${experienceList.length} experience${experienceList.length > 1 ? 's' : ''} still ${missingVideosCount > 1 ? 'need' : 'needs'} a video. Use the “Record & Analyze with AI” button on each experience below. You can’t continue until all videos are recorded.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Profile Overview */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">{t('personalInfo')}</h3>
            {renderSectionControls('basic')}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {isSectionEditing('basic') ? (
              <>
                <div className="p-4 bg-gradient-to-br from-harx-50 to-harx-alt-50 rounded-xl">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">👤 Name</h3>
                  <input
                    type="text"
                    value={editedProfile.personalInfo.name}
                    onChange={(e) => handleProfileChange('name', e.target.value)}
                    className="w-full p-2 border rounded-md bg-white/50"
                    placeholder="Enter your name"
                  />
                  {renderError(validationErrors.name, 'name')}
                </div>
                <div className="p-4 bg-gradient-to-br from-harx-50 to-harx-alt-50 rounded-xl">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">🌍 Country</h3>
                  <div className="relative country-selector">
                    <input
                      type="text"
                      value={isSearching ? countrySearch : (typeof editedProfile.personalInfo.country === 'object'
                        ? `${editedProfile.personalInfo.country?.countryName} (${editedProfile.personalInfo.country?.countryCode})`
                        : editedProfile.personalInfo.country || '')}
                      onChange={handleCountryInputChange}
                      onFocus={handleCountryInputFocus}
                      className="w-full p-2 pr-8 border rounded-md bg-white/50"
                      placeholder="Search for your country..."
                    />
                    {!isSearching && editedProfile.personalInfo.country && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsSearching(true);
                          setCountrySearch('');
                          setShowCountryDropdown(true);
                        }}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        title="Clear selection"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                    {showCountryDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto z-20">
                        {editedProfile.personalInfo.country && (
                          <button
                            onClick={clearCountrySelection}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 border-b border-gray-100 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Clear selection
                          </button>
                        )}
                        {filteredCountries.length > 0 ? (
                          filteredCountries.slice(0, 10).map((country) => (
                            <button
                              key={country._id}
                              onClick={() => handleCountrySelect(country)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-harx-50 flex items-center justify-between border-b border-gray-100 last:border-b-0"
                            >
                              <span className="font-medium">{country.countryName}</span>
                              <span className="text-gray-500 text-xs">{country.countryCode}</span>
                            </button>
                          ))
                        ) : countrySearch ? (
                          <div className="px-4 py-2 text-sm text-gray-500">No countries found matching "{countrySearch}"</div>
                        ) : (
                          <div className="px-4 py-2 text-sm text-gray-500">Start typing to search for countries</div>
                        )}
                      </div>
                    )}
                  </div>
                  {renderError(validationErrors.country, 'country')}
                  <CountryMismatchWarning currentCountry={editedProfile.personalInfo?.country} />
                </div>
                <div className="p-4 bg-gradient-to-br from-harx-50 to-harx-alt-50 rounded-xl">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">📧 Email</h3>
                  <input
                    type="email"
                    value={editedProfile.personalInfo.email}
                    onChange={(e) => handleProfileChange('email', e.target.value)}
                    className="w-full p-2 border rounded-md bg-white/50"
                    placeholder="Enter your email"
                  />
                  {renderError(validationErrors.email, 'email')}
                </div>
                <div className="p-4 bg-gradient-to-br from-harx-50 to-harx-alt-50 rounded-xl">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">📱 Phone</h3>
                  <input
                    type="tel"
                    value={editedProfile.personalInfo.phone}
                    onChange={(e) => handleProfileChange('phone', e.target.value)}
                    className="w-full p-2 border rounded-md bg-white/50"
                    placeholder="Enter your phone number"
                  />
                  {renderError(validationErrors.phone, 'phone')}
                </div>
                <div className="p-4 bg-gradient-to-br from-harx-50 to-harx-alt-50 rounded-xl col-span-2">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">🌍 Languages</h3>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {editedProfile.personalInfo.languages.map((lang, index) => {
                        // Handle both old and new data structures
                        const languageName = typeof lang.language === 'object' ? lang.language.name : lang.language;
                        const languageCode = typeof lang.language === 'object' ? lang.language.code : (lang.iso639_1 || '');

                        return (
                          <div key={index} className="flex items-center gap-3 bg-white/50 px-4 py-2 rounded-full group relative hover:bg-white transition-colors duration-200">
                            <span className="text-sm font-medium text-gray-700">
                              {languageName} {languageCode && <span className="text-xs text-gray-500">({languageCode})</span>}
                            </span>
                            <div className="h-4 w-px bg-gray-300"></div>
                            <div className="relative inline-block min-w-[80px]">
                              <button
                                onClick={(e) => {
                                  // Close all other dropdowns first
                                  const allDropdowns = document.querySelectorAll('.language-proficiency-dropdown');
                                  allDropdowns.forEach(d => d.classList.add('hidden'));
                                  // Toggle current dropdown
                                  const dropdown = e.currentTarget.nextElementSibling;
                                  dropdown.classList.toggle('hidden');
                                }}
                                className="flex items-center gap-1 text-sm font-medium text-harx-600 hover:text-harx-700"
                              >
                                {lang.proficiency}
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                              <div className="language-proficiency-dropdown hidden absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-48 z-20">
                                {proficiencyLevels.map(level => (
                                  <button
                                    key={level.value}
                                    className={`w-full px-4 py-2 text-left text-sm hover:bg-harx-50 flex items-center justify-between group/item ${lang.proficiency === level.value ? 'text-harx-600 bg-harx-50/50' : 'text-gray-700'
                                      }`}
                                    onClick={async () => {
                                      await updateLanguageProficiency(index, level.value);
                                      // Close the dropdown after selecting a value
                                      const dropdowns = document.querySelectorAll('.language-proficiency-dropdown');
                                      dropdowns.forEach(dropdown => dropdown.classList.add('hidden'));
                                    }}
                                  >
                                    <span>{level.label}</span>
                                    {lang.proficiency === level.value && (
                                      <svg className="w-4 h-4 text-harx-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                    <div className="absolute hidden group-hover/item:block bg-black text-white text-xs rounded p-2 z-30 left-full ml-2 -translate-y-1/2 w-48">
                                      {level.description}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="h-4 w-px bg-gray-300"></div>
                            <button
                              onClick={() => removeLanguage(index)}
                              className="text-gray-400 hover:text-red-500 transition-colors duration-200"
                              title="Remove language"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    {renderError(validationErrors.languages, 'languages')}
                    <div className="flex gap-2">
                      <div className="relative language-selector flex-1">
                        <input
                          type="text"
                          value={tempLanguage.languageObj ? `${tempLanguage.languageObj.name} (${tempLanguage.languageObj.code})` : languageSearch}
                          onChange={(e) => {
                            setLanguageSearch(e.target.value);
                            setShowLanguageDropdown(true);
                            if (tempLanguage.languageObj) {
                              setTempLanguage(prev => ({ ...prev, languageObj: null }));
                            }
                          }}
                          onFocus={() => setShowLanguageDropdown(true)}
                          className="w-full p-2 border rounded-md bg-white/50"
                          placeholder="Search for a language..."
                        />
                        {showLanguageDropdown && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto z-20">
                            {(() => {
                              const filteredLanguages = searchLanguages(availableLanguages, languageSearch);
                              const selectedLanguageIds = editedProfile.personalInfo.languages.map(lang =>
                                typeof lang.language === 'object' ? lang.language._id : lang.language
                              );
                              const availableFilteredLanguages = filteredLanguages.filter(lang =>
                                !selectedLanguageIds.includes(lang._id)
                              );

                              return availableFilteredLanguages.length > 0 ? (
                                availableFilteredLanguages.slice(0, 10).map((language) => (
                                  <button
                                    key={language._id}
                                    onClick={() => {
                                      setTempLanguage(prev => ({ ...prev, languageObj: language }));
                                      setShowLanguageDropdown(false);
                                      setLanguageSearch('');
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-harx-50 flex items-center justify-between border-b border-gray-100 last:border-b-0"
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium">{language.name}</span>
                                      <span className="text-xs text-gray-500">{language.nativeName}</span>
                                    </div>
                                    <span className="text-xs text-harx-600 font-mono">{language.code}</span>
                                  </button>
                                ))
                              ) : languageSearch ? (
                                <div className="px-4 py-2 text-sm text-gray-500">No languages found matching "{languageSearch}"</div>
                              ) : (
                                <div className="px-4 py-2 text-sm text-gray-500">Start typing to search for languages</div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                      <div className="relative inline-block min-w-[180px]">
                        <button
                          onClick={(e) => {
                            const dropdowns = document.querySelectorAll('.proficiency-dropdown');
                            dropdowns.forEach(dropdown => dropdown.classList.add('hidden'));
                            const dropdown = e.currentTarget.nextElementSibling;
                            dropdown.classList.toggle('hidden');
                          }}
                          className="w-full flex items-center justify-between p-2 border rounded-md bg-white/50 text-sm text-gray-700"
                        >
                          <span>{proficiencyLevels.find(l => l.value === tempLanguage.proficiency)?.label}</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <div className="proficiency-dropdown hidden absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-full z-20">
                          {proficiencyLevels.map(level => (
                            <button
                              key={level.value}
                              className={`w-full px-4 py-2 text-left text-sm hover:bg-harx-50 flex items-center justify-between ${tempLanguage.proficiency === level.value ? 'text-harx-600 bg-harx-50/50' : 'text-gray-700'
                                }`}
                              onClick={() => {
                                setTempLanguage(prev => ({ ...prev, proficiency: level.value }));
                                // Hide dropdown after selection
                                const dropdowns = document.querySelectorAll('.proficiency-dropdown');
                                dropdowns.forEach(dropdown => dropdown.classList.add('hidden'));
                              }}
                            >
                              <span>{level.label}</span>
                              {tempLanguage.proficiency === level.value && (
                                <svg className="w-4 h-4 text-harx-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={addLanguage}
                        className="px-4 py-2 text-sm font-medium text-white bg-harx-600 rounded-md hover:bg-harx-700 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add
                      </button>
                    </div>

                    {/* Proficiency Level Descriptions */}
                    <div className="mt-4 bg-white rounded-lg p-4 border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Language Proficiency Levels:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {proficiencyLevels.map(level => (
                          <div
                            key={level.value}
                            className={`p-3 rounded-lg border ${tempLanguage.proficiency === level.value
                              ? 'border-harx-200 bg-harx-50'
                              : 'border-gray-100 hover:bg-gray-50'
                              }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-800">{level.label}</span>
                              {tempLanguage.proficiency === level.value && (
                                <svg className="w-4 h-4 text-harx-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{level.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <ProfileReadField
                  label={t('name')}
                  value={editedProfile.personalInfo.name}
                  icon={
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  }
                />
                <div>
                  <ProfileReadField
                    label={t('country')}
                    value={countryDisplay}
                    icon={
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    }
                  />
                  {renderError(validationErrors.country, 'country')}
                  <CountryMismatchWarning currentCountry={editedProfile.personalInfo?.country} />
                </div>
                <ProfileReadField
                  label={t('email')}
                  value={editedProfile.personalInfo.email}
                  icon={
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  }
                />
                <ProfileReadField
                  label={t('phone')}
                  value={editedProfile.personalInfo.phone}
                  icon={
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  }
                />
                <ProfileReadField
                  label={t('experienceLabel')}
                  value={`${editedProfile.professionalSummary?.yearsOfExperience || 0} ${uiLang === 'fr' ? 'ans' : 'years'}`}
                  icon={
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  }
                />
                <div className="md:col-span-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-harx-50 text-harx-600">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                      </svg>
                    </span>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('languages')}</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editedProfile.personalInfo.languages.map((lang, index) => {
                      const languageName = typeof lang.language === 'object' ? lang.language.name : lang.language;
                      const languageCode = typeof lang.language === 'object' ? lang.language.code : (lang.iso639_1 || '');
                      const chipStyle = PROFICIENCY_CHIP_STYLES[lang.proficiency] || PROFICIENCY_CHIP_STYLES.B1;

                      return (
                        <span
                          key={index}
                          title={proficiencyLevels.find((level) => level.value === lang.proficiency)?.description}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ring-1 ${chipStyle}`}
                        >
                          <span className="text-gray-900">{languageName}</span>
                          {languageCode && <span className="text-xs text-gray-500">{languageCode}</span>}
                          <span className="text-xs font-bold opacity-80">{lang.proficiency}</span>
                        </span>
                      );
                    })}
                  </div>
                  {renderError(validationErrors.languages, 'languages')}
                </div>
              </>
            )}
          </div>

          {/* Experience Section */}
          {renderExperienceSection()}

          {/* Skills Sections */}
          <div className="space-y-6">
            {SHOW_PROFILE_DETAILS && (
              <>
                {renderSkillSection('Technical Skills', editedProfile.skills?.technical || [], 'technical')}
                {renderSkillSection('Professional Skills', editedProfile.skills?.professional || [], 'professional')}
                {renderSkillSection('Soft Skills', editedProfile.skills?.soft || [], 'soft')}
                {renderSkillSection('Industries', editedProfile.professionalSummary?.industries || [], 'industries')}
                {renderSkillSection('Activities', editedProfile.professionalSummary?.activities || [], 'activities')}
              </>
            )}
            {renderSkillSection(t('notableCompanies'), editedProfile.professionalSummary?.notableCompanies || [], 'notableCompanies', isSectionEditing('companies'))}
          </div>

          {/* Availability Section */}
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">{t('workingHours')}</h3>
              {renderSectionControls('availability')}
            </div>

            {isSectionEditing('availability') ? (
              <div className="space-y-6">
                {/* Simple Working Hours and Days Selector */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="mb-8">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Default Working Hours</label>
                    <div className="flex items-center gap-4 max-w-md">
                      <input
                        type="time"
                        value={editedProfile.availability?.tempHours?.start || '09:00'}
                        onChange={(e) => {
                          const newTime = e.target.value;
                          setEditedProfile(prev => ({
                            ...prev,
                            availability: {
                              ...prev.availability,
                              tempHours: {
                                ...prev.availability?.tempHours,
                                start: newTime
                              }
                            }
                          }));
                        }}
                        className="w-32 p-2 border rounded"
                      />
                      <span className="text-gray-500">to</span>
                      <input
                        type="time"
                        value={editedProfile.availability?.tempHours?.end || '17:00'}
                        onChange={(e) => {
                          const newTime = e.target.value;
                          setEditedProfile(prev => ({
                            ...prev,
                            availability: {
                              ...prev.availability,
                              tempHours: {
                                ...prev.availability?.tempHours,
                                end: newTime
                              }
                            }
                          }));
                        }}
                        className="w-32 p-2 border rounded"
                      />
                      <button
                        onClick={() => {
                          const defaultStart = editedProfile.availability?.tempHours?.start || '09:00';
                          const defaultEnd = editedProfile.availability?.tempHours?.end || '17:00';
                          const currentSchedule = editedProfile.availability?.schedule || [];
                          const newSchedule = currentSchedule.map(day => ({
                            ...day,
                            hours: { start: defaultStart, end: defaultEnd }
                          }));
                          handleAvailabilityChangeLocal('schedule', newSchedule);
                        }}
                        className="px-4 py-2 text-sm text-harx-600 bg-harx-50 rounded hover:bg-harx-100"
                      >
                        Apply to Selected Days
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-4">Working Days</label>
                    <div className="space-y-4">
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                        const daySchedule = editedProfile.availability?.schedule?.find(s => s.day === day);
                        return (
                          <div
                            key={day}
                            className={`p-4 rounded-lg border ${daySchedule
                              ? 'border-harx-200 bg-harx-50 shadow-sm'
                              : 'border-gray-200 bg-white hover:border-harx-200'
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-800">{day}</span>
                              <div className="flex items-center gap-8">
                                {daySchedule && (
                                  <div className="flex items-center gap-6">
                                    <div className="flex-1 min-w-[140px]">
                                      <label className="block text-xs text-gray-500 mb-1">Start</label>
                                      <input
                                        type="time"
                                        value={daySchedule.hours.start}
                                        onChange={(e) => {
                                          const currentSchedule = editedProfile.availability?.schedule || [];
                                          const newSchedule = currentSchedule.map(s =>
                                            s.day === day
                                              ? { ...s, hours: { ...s.hours, start: e.target.value } }
                                              : s
                                          );
                                          handleAvailabilityChangeLocal('schedule', newSchedule);
                                        }}
                                        className="w-full p-2 border rounded bg-white text-sm"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-[140px]">
                                      <label className="block text-xs text-gray-500 mb-1">End</label>
                                      <input
                                        type="time"
                                        value={daySchedule.hours.end}
                                        onChange={(e) => {
                                          const currentSchedule = editedProfile.availability?.schedule || [];
                                          const newSchedule = currentSchedule.map(s =>
                                            s.day === day
                                              ? { ...s, hours: { ...s.hours, end: e.target.value } }
                                              : s
                                          );
                                          handleAvailabilityChangeLocal('schedule', newSchedule);
                                        }}
                                        className="w-full p-2 border rounded bg-white text-sm"
                                      />
                                    </div>
                                  </div>
                                )}
                                <button
                                  onClick={() => {
                                    const currentSchedule = editedProfile.availability?.schedule || [];
                                    let newSchedule;

                                    if (daySchedule) {
                                      newSchedule = currentSchedule.filter(s => s.day !== day);
                                    } else {
                                      newSchedule = [
                                        ...currentSchedule,
                                        {
                                          day,
                                          hours: {
                                            start: editedProfile.availability?.tempHours?.start || '09:00',
                                            end: editedProfile.availability?.tempHours?.end || '17:00'
                                          }
                                        }
                                      ];
                                    }
                                    handleAvailabilityChangeLocal('schedule', newSchedule);
                                  }}
                                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${daySchedule
                                    ? 'bg-harx-600 text-white hover:bg-harx-700'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                  {daySchedule ? 'Remove' : 'Add'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Time Zone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time Zone</label>
                  <div className="flex gap-2 max-w-2xl">
                    <div className="relative timezone-selector flex-1">
                      <input
                        type="text"
                        value={isSearchingTimezone ? timezoneSearch : (() => {
                          const currentTz = getCurrentTimezone();
                          return currentTz ? `${currentTz.countryName} - ${currentTz.zoneName}` : '';
                        })()}
                        onChange={handleTimezoneInputChange}
                        onFocus={handleTimezoneInputFocus}
                        className="w-full p-2 pr-8 border rounded bg-white"
                        placeholder="Search for your timezone..."
                      />
                      {!isSearchingTimezone && getCurrentTimezone() && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsSearchingTimezone(true);
                            setTimezoneSearch('');
                            setShowTimezoneDropdown(true);
                          }}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          title="Clear selection"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                      {showTimezoneDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto z-20">
                          {getCurrentTimezone() && (
                            <button
                              onClick={clearTimezoneSelection}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 border-b border-gray-100 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Clear selection
                            </button>
                          )}
                          {filteredTimezones.length > 0 ? (
                            filteredTimezones.slice(0, 10).map((timezone) => (
                              <button
                                key={timezone._id}
                                onClick={() => handleTimezoneSelect(timezone)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-harx-50 border-b border-gray-100 last:border-b-0"
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium">{timezone.countryName}</span>
                                  <span className="text-xs text-gray-500">{timezone.zoneName}</span>
                                  <span className="text-xs text-harx-600">GMT{timezone.gmtOffset >= 0 ? '+' : ''}{Math.floor(timezone.gmtOffset / 3600)}:{Math.abs(timezone.gmtOffset % 3600 / 60).toString().padStart(2, '0')}</span>
                                </div>
                              </button>
                            ))
                          ) : timezoneSearch ? (
                            <div className="px-4 py-2 text-sm text-gray-500">No timezones found matching "{timezoneSearch}"</div>
                          ) : (
                            <div className="px-4 py-2 text-sm text-gray-500">Start typing to search for timezones</div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Suggest timezone button */}
                    <button
                      onClick={suggestTimezoneForCurrentCountry}
                      className="px-4 py-2 text-sm font-medium text-harx-600 bg-harx-50 rounded-lg hover:bg-harx-100 transition-colors duration-200 flex items-center gap-2 whitespace-nowrap"
                      title="Suggest timezone based on your selected country"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Suggest from Country
                    </button>
                  </div>

                  {/* Timezone-Country mismatch indicator */}
                  {(() => {
                    const matchCheck = checkTimezoneCountryMatch();
                    return !matchCheck.matches ? (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <p className="text-sm text-amber-800 font-medium">Timezone Notice</p>
                            <p className="text-xs text-amber-700 mt-1">{matchCheck.message}</p>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* Schedule Flexibility */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Schedule Flexibility</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Remote Work Available',
                      'Flexible Hours',
                      'Weekend Rotation',
                      'Night Shift Available',
                      'Split Shifts',
                      'Part-Time Options',
                      'Compressed Work Week',
                      'Shift Swapping Allowed'
                    ].map((option) => (
                      <button
                        key={option}
                        onClick={() => {
                          const currentFlexibility = editedProfile.availability?.flexibility || [];
                          const updatedFlexibility = currentFlexibility.includes(option)
                            ? currentFlexibility.filter(f => f !== option)
                            : [...currentFlexibility, option];
                          handleAvailabilityChangeLocal('flexibility', updatedFlexibility);
                        }}
                        className={`px-4 py-2 rounded text-sm ${editedProfile.availability?.flexibility?.includes(option)
                          ? 'bg-harx-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {!hasAvailabilitySet && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border-2 border-amber-200">
                    <svg className="h-4 w-4 flex-shrink-0 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-bold text-amber-800">{t('availMissing')}</span>
                  </div>
                )}

                {/* Schedule Display */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Working Schedule</h4>
                  <div className="space-y-2">
                    {editedProfile.availability?.schedule?.map((schedule) => (
                      <div key={schedule.day} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span className="font-medium">{schedule.day}</span>
                        <span className="text-gray-600">
                          {schedule.hours.start} - {schedule.hours.end}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Time Zone Display */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Time Zone</h4>
                  <p className="text-gray-800">
                    {(() => {
                      const currentTz = getCurrentTimezone();
                      return currentTz
                        ? `${currentTz.countryName} - ${currentTz.zoneName} (GMT${currentTz.gmtOffset >= 0 ? '+' : ''}${Math.floor(currentTz.gmtOffset / 3600)}:${Math.abs(currentTz.gmtOffset % 3600 / 60).toString().padStart(2, '0')})`
                        : 'Not specified';
                    })()}
                  </p>

                  {/* Timezone-Country mismatch indicator for read-only mode */}
                  {(() => {
                    const matchCheck = checkTimezoneCountryMatch();
                    return !matchCheck.matches ? (
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <p className="text-sm text-amber-800 font-medium">Timezone Notice</p>
                            <p className="text-xs text-amber-700 mt-1">{matchCheck.message}</p>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* Schedule Flexibility Display */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Schedule Flexibility</h4>
                  <div className="flex flex-wrap gap-2">
                    {editedProfile.availability?.flexibility?.map((option) => (
                      <span
                        key={option}
                        className="px-4 py-2 bg-gray-50 text-gray-700 rounded"
                      >
                        {option}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Summary Section */}
          <div className="mt-8 rounded-2xl border border-gray-100 bg-gradient-to-br from-harx-50/80 via-white to-harx-alt-50/50 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-5">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{t('professionalSummary')}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{t('summarySubtitle')}</p>
              </div>
              <div className="flex items-center gap-2 self-start">
                {isSectionEditing('summary') && (
                  <button
                    onClick={regenerateSummary}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-harx-700 bg-white border border-harx-100 rounded-xl hover:bg-harx-50 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
                  >
                    <svg className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {loading ? 'Generating…' : 'Regenerate'}
                  </button>
                )}
                {renderSectionControls('summary')}
              </div>
            </div>
            {isSectionEditing('summary') ? (
              <textarea
                value={editedSummary}
                onChange={(e) => handleSummaryChange(e.target.value)}
                className="w-full h-64 p-4 border rounded-xl focus:ring-2 focus:ring-harx-500 focus:border-harx-500"
                placeholder={t('summaryPlaceholder')}
              />
            ) : (
              <div className="bg-white/80 backdrop-blur-sm border border-white p-6 rounded-2xl shadow-inner">
                <p className="text-gray-800 whitespace-pre-line text-base sm:text-lg leading-relaxed">
                  {localizeText(editedProfile.professionalSummary?.profileDescription_i18n, uiLang) ||
                    editedProfile.professionalSummary?.profileDescription ||
                    t('noSummary')}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {allExperiencesHaveVideo ? (
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gray-50 border border-gray-100">
              <p className="text-sm text-gray-600">
                {t('everythingGood')}
              </p>
              <button
                onClick={pushToRepsProfile}
                className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-harx-600 to-harx-alt-600 rounded-xl shadow-lg shadow-harx-500/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 inline-flex items-center justify-center gap-2"
              >
                {t('continueToProfile')}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="mt-8 flex items-center gap-3 p-5 rounded-2xl bg-red-50 border-2 border-red-200">
              <svg className="h-5 w-5 flex-shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-bold text-red-700">
                {t('warnBottom')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Toast Component */}
      {toast.show && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg transition-all transform duration-500 ${toast.type === 'success'
          ? 'bg-green-500 text-white'
          : 'bg-red-500 text-white'
          }`}>
          <div className="flex items-center space-x-2">
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
        </div>
      )}
    </div>
  );
}

export default SummaryEditor;