import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  UserPlus,
  UserCircle,
  Award,
  CreditCard,
  ShoppingBag,
  PhoneCall,
  Headphones,
  Shield,
  TrendingUp,
  Wallet,
  CheckCircle,
  Clock,
  ArrowRight,
  ListChecks,
  MapPin,
  Lock,
  AlertCircle,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import config from '../../config';
import progressService, { UserProgress } from '../../services/progressService';
import { getAgentData, refreshOnboardingStatus } from '../../services/apiConfig';

// Define the phase interface
interface Phase {
  id: number;
  name: string;
  description: string;
  icon: React.ElementType;
  path: string;
  status: 'completed' | 'in-progress' | 'pending';
  requiredActions: string[];
  optionalActions: string[];
  completedActions?: number[];
}

// API Onboarding progress interface
interface ApiPhase1RequiredActions {
  accountCreated: boolean;
  emailVerified: boolean;
  [key: string]: boolean;
}

interface ApiPhase1OptionalActions {
  locationConfirmed: boolean;
  identityVerified: boolean;
  twoFactorEnabled: boolean;
  [key: string]: boolean;
}

interface ApiPhase2RequiredActions {
  experienceAdded: boolean;
  skillsAdded: boolean;
  industriesAdded: boolean;
  activitiesAdded: boolean;
  availabilitySet: boolean;
  videoUploaded: boolean;
  [key: string]: boolean;
}

interface ApiPhase2OptionalActions {
  photoUploaded: boolean;
  bioCompleted: boolean;
  [key: string]: boolean;
}

interface ApiPhase3RequiredActions {
  languageAssessmentDone: boolean;
  contactCenterAssessmentDone: boolean;
  [key: string]: boolean;
}

interface ApiPhase3OptionalActions {
  technicalEvaluationDone: boolean;
  bestPracticesReviewed: boolean;
  [key: string]: boolean;
}

interface ApiPhase4RequiredActions {
  subscriptionActivated: boolean;
  [key: string]: boolean;
}

interface ApiPhase4OptionalActions {
  [key: string]: boolean;
}

interface ApiPhaseData {
  requiredActions: Record<string, boolean>;
  optionalActions: Record<string, boolean>;
  status: 'completed' | 'in_progress' | 'pending';
  completedAt?: string;
}

interface ApiPhase1Data extends ApiPhaseData {
  requiredActions: ApiPhase1RequiredActions;
  optionalActions: ApiPhase1OptionalActions;
}

interface ApiPhase2Data extends ApiPhaseData {
  requiredActions: ApiPhase2RequiredActions;
  optionalActions: ApiPhase2OptionalActions;
}

interface ApiPhase3Data extends ApiPhaseData {
  requiredActions: ApiPhase3RequiredActions;
  optionalActions: ApiPhase3OptionalActions;
}

interface ApiPhase4Data extends ApiPhaseData {
  requiredActions: ApiPhase4RequiredActions;
  optionalActions: ApiPhase4OptionalActions;
}

interface ApiOnboardingProgress {
  phases: {
    phase1?: ApiPhase1Data;
    phase2?: ApiPhase2Data;
    phase3?: ApiPhase3Data;
    phase4?: ApiPhase4Data;
    [key: string]: ApiPhaseData | undefined;
  };
  currentPhase: number;
  lastUpdated: string;
}

// Agent data interface
interface AgentData {
  id: string;
  name?: string;
  email?: string;
  status?: string;
  onboardingProgress?: ApiOnboardingProgress;
  // Add other agent properties as needed
}

// Phase template data
const phaseTemplates = [
  {
    id: 1,
    name: 'Sign Up & Verification',
    description: 'Complete your account setup and verify your identity',
    icon: UserPlus,
    path: '/orchestrator/signup',
    requiredActions: [
      'Create your REPS account with email',
      'Verify your email address'
    ],
    optionalActions: [
      'Confirm location based on IP Address',
      'Complete identity verification',
      'Set up two-factor authentication'
    ]
  },
  {
    id: 2,
    name: 'Profile Creation',
    description: 'Build your professional profile',
    icon: UserCircle,
    path: '/orchestrator/profile',
    requiredActions: [
      'Add your work experience',
      'Record a video for each experience',
      'Set your availability hours'
    ],
    optionalActions: [
      'Upload a professional photo',
      'Complete your bio'
    ]
  },
  {
    id: 3,
    name: 'Skills Assessment',
    description: 'Complete tests and get your Bolt Score',
    icon: Award,
    path: '/orchestrator/skills',
    requiredActions: [
      'Complete language assessment',
      'Complete contact center assessment'
    ],
    optionalActions: [
      'Complete technical evaluation',
      'Review REPS best practices'
    ]
  },
  {
    id: 4,
    name: 'Subscription Plan',
    description: 'Choose your membership level',
    icon: CreditCard,
    path: '/orchestrator/subscription',
    requiredActions: [
      'Activate subscription'
    ],
    optionalActions: []
  },
  {
    id: 5,
    name: 'Marketplace Access',
    description: 'Browse and apply for gigs',
    icon: ShoppingBag,
    path: '/orchestrator/marketplace',
    requiredActions: [
      'Complete marketplace orientation',
      'Set up gig preferences'
    ],
    optionalActions: [
      'Review available opportunities',
      'Submit first application',
      'Complete profile visibility settings'
    ]
  },
  {
    id: 6,
    name: 'Operations Launch',
    description: 'Start your first gig',
    icon: PhoneCall,
    path: '/orchestrator/operations',
    requiredActions: [
      'Review assigned tasks',
      'Set up communication tools'
    ],
    optionalActions: [
      'Complete first client briefing',
      'Schedule your first session',
      'Review performance metrics'
    ]
  },
  {
    id: 7,
    name: 'Support & Training',
    description: 'Access resources and community',
    icon: Headphones,
    path: '/orchestrator/support',
    requiredActions: [
      'Join REPS community',
      'Complete onboarding training'
    ],
    optionalActions: [
      'Access support resources',
      'Connect with mentor',
      'Schedule first check-in'
    ]
  },
  {
    id: 8,
    name: 'Quality Control',
    description: 'Monitor your performance',
    icon: Shield,
    path: '/orchestrator/quality',
    requiredActions: [
      'Review quality guidelines',
      'Set up performance tracking'
    ],
    optionalActions: [
      'Complete quality checklist',
      'Schedule quality review',
      'Set performance goals'
    ]
  },
  {
    id: 9,
    name: 'Career Growth',
    description: 'Advance your REPS career',
    icon: TrendingUp,
    path: '/orchestrator/career',
    requiredActions: [
      'Review career paths',
      'Set career goals'
    ],
    optionalActions: [
      'Join specialization track',
      'Complete advanced training',
      'Plan certification path'
    ]
  },
  {
    id: 10,
    name: 'Wallet & Payments',
    description: 'Manage your earnings',
    icon: Wallet,
    path: '/orchestrator/wallet',
    requiredActions: [
      'Set up payment account',
      'Configure payout preferences'
    ],
    optionalActions: [
      'Review payment schedule',
      'Set earnings goals',
      'Enable payment notifications'
    ]
  }
];

function Dashboard() {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<{ userId: string; agentId: string; token: string | null } | null>(null);
  const [completedPhases, setCompletedPhases] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const syncIntervalRef = useRef<number | null>(null);
  const [agentData, setAgentData] = useState<AgentData | null>(null);
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const repDashboardUrl = import.meta.env.VITE_RUN_MODE === 'standalone'
    ? import.meta.env.VITE_REP_DASHBOARD_URL_STANDALONE || ''
    : import.meta.env.VITE_REP_DASHBOARD_URL || '';
  const navigate = useNavigate();

  // Fetch agent data from the API
  const fetchAgentData = async () => {
    try {
      const userData = config.getUserData();

      // Skip fetch if agentId is not available
      if (!userData.agentId || userData.agentId === 'null') {
        console.log(' ⚠️ No agent ID available, skipping agent data fetch');
        return null;
      }

      console.log('🔍 Fetching agent data from API...');
      const data = await getAgentData();
      console.log('📊 Agent data received:', data);
      setAgentData(data);

      // If the agent data includes onboarding progress, use it
      if (data.onboardingProgress) {
        console.log('📋 Onboarding progress found in API response:', data.onboardingProgress);

        // Debugging - log Phase 1 data specifically
        if (data.onboardingProgress.phases.phase1) {
          console.log('🔍 Phase 1 data from API:', {
            required: data.onboardingProgress.phases.phase1.requiredActions,
            optional: data.onboardingProgress.phases.phase1.optionalActions,
            status: data.onboardingProgress.phases.phase1.status
          });
        }

        // Debugging - log Phase 2 data specifically
        if (data.onboardingProgress.phases.phase2) {
          console.log('🔍 Phase 2 data from API:', {
            required: data.onboardingProgress.phases.phase2.requiredActions,
            optional: data.onboardingProgress.phases.phase2.optionalActions,
            status: data.onboardingProgress.phases.phase2.status
          });
        }

        // Debugging - log Phase 3 data specifically
        if (data.onboardingProgress.phases.phase3) {
          console.log('🔍 Phase 3 data from API:', {
            required: data.onboardingProgress.phases.phase3.requiredActions,
            optional: data.onboardingProgress.phases.phase3.optionalActions,
            status: data.onboardingProgress.phases.phase3.status
          });
        }

        // Debugging - log Phase 4 data specifically
        if (data.onboardingProgress.phases.phase4) {
          console.log('🔍 Phase 4 data from API:', {
            required: data.onboardingProgress.phases.phase4.requiredActions,
            optional: data.onboardingProgress.phases.phase4.optionalActions,
            status: data.onboardingProgress.phases.phase4.status
          });
        }

        return data;
      }

      return data;
    } catch (err) {
      console.error('❌ Error fetching agent data:', err);
      return null;
    }
  };

  // Map API phase data to UI phase format
  const mapApiPhasesToUiPhases = (apiData: AgentData): Phase[] => {
    if (!apiData.onboardingProgress) {
      return phaseTemplates.map(phase => ({
        ...phase,
        status: 'pending',
        completedActions: []
      }));
    }

    const apiOnboarding = apiData.onboardingProgress;

    // Debugging - log Phase 1 data specifically
    if (apiOnboarding.phases.phase1) {
      console.log('🔍 Phase 1 data from API:', {
        required: apiOnboarding.phases.phase1.requiredActions,
        optional: apiOnboarding.phases.phase1.optionalActions,
        status: apiOnboarding.phases.phase1.status
      });
    }

    // Debugging - log Phase 3 data specifically
    if (apiOnboarding.phases.phase3) {
      console.log('🔍 Phase 3 data from API in mapping function:', {
        required: apiOnboarding.phases.phase3.requiredActions,
        optional: apiOnboarding.phases.phase3.optionalActions,
        status: apiOnboarding.phases.phase3.status
      });
    }

    // Debugging - log Phase 4 data specifically
    if (apiOnboarding.phases.phase4) {
      console.log('🔍 Phase 4 data from API in mapping function:', {
        required: apiOnboarding.phases.phase4.requiredActions,
        optional: apiOnboarding.phases.phase4.optionalActions,
        status: apiOnboarding.phases.phase4.status
      });
    }

    return phaseTemplates.map(phase => {
      const phaseKey = `phase${phase.id}`;
      const apiPhase = apiOnboarding.phases[phaseKey as keyof typeof apiOnboarding.phases];

      // Default to pending if this phase doesn't exist in API data
      let status: 'completed' | 'in-progress' | 'pending' = 'pending';
      let completedActions: number[] = [];

      if (apiPhase) {
        // Map API status to UI status
        if (apiPhase.status === 'completed') {
          status = 'completed';
        } else if (apiPhase.status === 'in_progress') {
          status = 'in-progress';
        }

        // Map completed actions from API to UI format based on the specific field names
        if (apiPhase.requiredActions) {
          // For phase 1
          if (phase.id === 1 && phaseKey === 'phase1') {
            const phase1Actions = apiPhase.requiredActions as ApiPhase1RequiredActions;
            if (phase1Actions.accountCreated) completedActions.push(0);
            if (phase1Actions.emailVerified) completedActions.push(1);

            // Log the completed required actions for phase 1
            console.log('🔍 Phase 1 - Mapped required actions:', completedActions);
          }
          // For phase 2
          else if (phase.id === 2 && phaseKey === 'phase2') {
            const phase2Actions = apiPhase.requiredActions as ApiPhase2RequiredActions;
            // 0: work experience added, 1: a video recorded for every experience,
            // 2: availability set. Skills/industries/activities and the standalone
            // 1-minute intro video are no longer shown as required actions.
            if (phase2Actions.experienceAdded) completedActions.push(0);

            const experiences = (apiData as any).experience;
            const allExperiencesHaveVideo =
              Array.isArray(experiences) &&
              experiences.length > 0 &&
              experiences.every((exp: any) => exp && (exp.videoUrl || exp.videoAnalysis));
            if (allExperiencesHaveVideo) completedActions.push(1);

            if (phase2Actions.availabilitySet) completedActions.push(2);

            // Log the completed required actions for phase 2
            console.log('🔍 Phase 2 - Mapped required actions:', completedActions);
          }
          // For phase 3
          else if (phase.id === 3 && phaseKey === 'phase3') {
            const phase3Actions = apiPhase.requiredActions as ApiPhase3RequiredActions;
            if (phase3Actions.languageAssessmentDone) completedActions.push(0);
            if (phase3Actions.contactCenterAssessmentDone) completedActions.push(1);

            // Log the completed required actions for phase 3
            console.log('🔍 Phase 3 - Mapped required actions:', completedActions);
          }
          // For phase 4
          else if (phase.id === 4 && phaseKey === 'phase4') {
            const phase4Actions = apiPhase.requiredActions as ApiPhase4RequiredActions;
            if (phase4Actions.subscriptionActivated) completedActions.push(0);

            // Log the completed required actions for phase 4
            console.log('🔍 Phase 4 - Mapped required actions:', completedActions);
          }
          // Generic fallback for other phases - use index-based mapping
          else {
            Object.values(apiPhase.requiredActions).forEach((isCompleted, index) => {
              if (isCompleted) {
                completedActions.push(index);
              }
            });
          }
        }

        if (apiPhase.optionalActions) {
          const requiredActionsLength = phase.requiredActions.length;
          let optionalCompletedActions: number[] = [];

          // For phase 1
          if (phase.id === 1 && phaseKey === 'phase1') {
            const phase1OptActions = apiPhase.optionalActions as ApiPhase1OptionalActions;
            if (phase1OptActions.locationConfirmed) optionalCompletedActions.push(requiredActionsLength + 0);
            if (phase1OptActions.identityVerified) optionalCompletedActions.push(requiredActionsLength + 1);
            if (phase1OptActions.twoFactorEnabled) optionalCompletedActions.push(requiredActionsLength + 2);

            // Log the completed optional actions for phase 1
            console.log('🔍 Phase 1 - Mapped optional actions:', optionalCompletedActions);
          }
          // For phase 2
          else if (phase.id === 2 && phaseKey === 'phase2') {
            const phase2OptActions = apiPhase.optionalActions as ApiPhase2OptionalActions;
            if (phase2OptActions.photoUploaded) optionalCompletedActions.push(requiredActionsLength + 0);
            if (phase2OptActions.bioCompleted) optionalCompletedActions.push(requiredActionsLength + 1);

            // Log the completed optional actions for phase 2
            console.log('🔍 Phase 2 - Mapped optional actions:', optionalCompletedActions);
          }
          // For phase 3
          else if (phase.id === 3 && phaseKey === 'phase3') {
            const phase3OptActions = apiPhase.optionalActions as ApiPhase3OptionalActions;
            if (phase3OptActions.technicalEvaluationDone) optionalCompletedActions.push(requiredActionsLength + 0);
            if (phase3OptActions.bestPracticesReviewed) optionalCompletedActions.push(requiredActionsLength + 1);

            // Log the completed optional actions for phase 3
            console.log('🔍 Phase 3 - Mapped optional actions:', optionalCompletedActions);
          }
          // For phase 4
          else if (phase.id === 4 && phaseKey === 'phase4') {
            const phase4OptActions = apiPhase.optionalActions as ApiPhase4OptionalActions;
            // No additional optional actions for phase 4

            // Log the completed optional actions for phase 4
            console.log('🔍 Phase 4 - Mapped optional actions:', optionalCompletedActions);
          }
          // Generic fallback for other phases
          else {
            Object.values(apiPhase.optionalActions).forEach((isCompleted, index) => {
              if (isCompleted) {
                optionalCompletedActions.push(requiredActionsLength + index);
              }
            });
          }

          // Add optional completed actions to the completedActions array
          completedActions = [...completedActions, ...optionalCompletedActions];
        }

      } else if (phase.id < apiOnboarding.currentPhase) {
        // If this phase is before the current phase but not in API data,
        // assume it's completed (for backward compatibility)
        status = 'completed';
      } else if (phase.id === apiOnboarding.currentPhase) {
        // If this is the current phase but not in API data,
        // assume it's in progress (for backward compatibility)
        status = 'in-progress';
      }

      return {
        ...phase,
        status,
        completedActions
      };
    });
  };

  // Fetch user progress from API
  const fetchUserProgress = async () => {
    try {
      setLoading(true);

      // First try to get agent data from API which may include progress
      const agent = await fetchAgentData();

      if (agent && agent.onboardingProgress) {
        console.log('📊 Using onboarding progress from API');

        // Map API data to our UI format
        const mappedPhases = mapApiPhasesToUiPhases(agent);
        setPhases(mappedPhases);

        // Calculate completed phases count
        const completedCount = mappedPhases.filter(p => p.status === 'completed').length;
        setCompletedPhases(completedCount);

        setLoading(false);
        return;
      }

      // Fallback to progress service if no API data
      console.log('📊 Fallback to progress service');
      const userProgress = await progressService.getUserProgress();

      // Map the phase templates to include the user's progress
      const userPhases = phaseTemplates.map(phase => {
        let status: 'completed' | 'in-progress' | 'pending' = 'pending';

        if (userProgress.completedPhaseIds.includes(phase.id)) {
          status = 'completed';
        } else if (phase.id === userProgress.inProgressPhaseId) {
          status = 'in-progress';
        }

        // Get completed actions for this phase
        const completedActions = userProgress.completedActions[phase.id] || [];

        return {
          ...phase,
          status,
          completedActions
        };
      });

      setPhases(userPhases);
      setCompletedPhases(userProgress.completedPhaseIds.length);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching user progress:', err);
      setError('Failed to load your progress. Please try again later.');
      setLoading(false);
    }
  };

  // Check if all required actions for a phase are completed
  const areRequiredActionsCompleted = (phase: Phase) => {
    if (!phase.completedActions) return false;

    // Check if all required action indexes are in the completed actions array
    for (let i = 0; i < phase.requiredActions.length; i++) {
      if (!phase.completedActions.includes(i)) {
        return false;
      }
    }
    return true;
  };

  // Handle phase start or continue
  const handlePhaseAction = async (phase: Phase) => {
    try {
      // Phase 2 (Profile Creation): show the profile page (keeps sidebar + header)
      if (phase.id === 2) {
        if (phase.status === 'pending') {
          await progressService.updatePhaseStatus(phase.id, 'in-progress');
        }
        navigate('/profile');
        return;
      }

      // Phase 3 (Skills Assessment): open the profile on the Skills tab
      if (phase.id === 3) {
        if (phase.status === 'pending') {
          await progressService.updatePhaseStatus(phase.id, 'in-progress');
        }
        navigate('/profile?tab=skills');
        return;
      }

      // For phase 5 (marketplace), show coming soon popup
      if (phase.id === 5) {
        setShowComingSoonModal(true);
        return;
      }

      if (phase.status === 'pending') {
        // Start a new phase
        await progressService.updatePhaseStatus(phase.id, 'in-progress');
      }

      // Navigate to the phase page (internal route, keeps sidebar + header)
      navigate(phase.path);
    } catch (err) {
      console.error(`Error handling phase action for phase ${phase.id}:`, err);
      setError('Failed to update phase status. Please try again later.');
    }
  };

  useEffect(() => {
    // Get user data from config
    const data = config.getUserData();
    setUserData(data);

    console.log('🚀 Dashboard initializing for agent ID:', data.agentId);

    // Initial fetch
    fetchUserProgress();

    // Only set up periodic sync if agentId is available
    if (data.agentId && data.agentId !== 'null') {
      syncIntervalRef.current = window.setInterval(syncProgressWithBackend, 30000); // Check every 30 seconds
    } else {
      console.log(' ⚠️ No agent ID available, skipping periodic sync setup');
    }

    return () => {
      // Clean up interval on component unmount
      if (syncIntervalRef.current) {
        window.clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  // Sync progress with backend to automatically detect completed actions
  const syncProgressWithBackend = async () => {
    try {
      if (syncing) return; // Prevent multiple syncs at once
      setSyncing(true);

      console.log('🔄 Syncing progress with backend...');

      const userData = config.getUserData();

      // Skip sync if agentId is not available
      if (!userData.agentId || userData.agentId === 'null') {
        console.log(' ⚠️ No agent ID available, skipping backend sync');
        setSyncing(false);
        return;
      }

      const refreshedData = await refreshOnboardingStatus(userData.agentId);
      console.log('📊 Refreshed onboarding data:', refreshedData);

      if (refreshedData && refreshedData.onboardingProgress) {
        // Map API data to our UI format
        const mappedPhases = mapApiPhasesToUiPhases({
          ...refreshedData,
          id: userData.agentId
        });

        // Update phases state
        setPhases(mappedPhases);

        // Calculate completed phases count
        const completedCount = mappedPhases.filter(p => p.status === 'completed').length;
        setCompletedPhases(completedCount);

        console.log('✅ Progress sync completed:', {
          completedPhases: completedCount,
          currentPhase: refreshedData.onboardingProgress.currentPhase,
          lastUpdated: refreshedData.onboardingProgress.lastUpdated
        });
      }

      setSyncing(false);
    } catch (err) {
      console.error('❌ Error syncing progress with backend:', err);
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        <p>{error}</p>
        <button
          className="mt-2 bg-red-100 text-red-800 px-4 py-2 rounded"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  // Only show phases 1-5, hide phases 6-10
  const visiblePhases = phases.filter(phase => phase.id <= 5);
  const visiblePhaseTemplates = phaseTemplates.filter(phase => phase.id <= 5);
  const visibleCompletedPhases = visiblePhases.filter(p => p.status === 'completed').length;
  const progressPercentage = (visibleCompletedPhases / visiblePhaseTemplates.length) * 100;

  return (
    <div className="space-y-6">
      {/* Coming Soon Modal */}
      {showComingSoonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 shadow-xl">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-harx-50 mb-4">
                <ShoppingBag className="h-6 w-6 text-harx-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Marketplace Coming Soon!
              </h3>
              <p className="text-sm text-gray-800 mb-6 leading-relaxed">
                We're working hard to bring you an amazing marketplace experience. This feature will be available soon with exciting opportunities to browse and apply for gigs.
              </p>
              <div className="flex items-center justify-center space-x-2 text-harx-700 mb-6 bg-harx-50/50 py-2 rounded-xl border border-harx-100">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-bold">Stay tuned for updates!</span>
              </div>
              <button
                onClick={() => {
                  setShowComingSoonModal(false);
                  navigate('/marketplace');
                }}
                className="w-full bg-gradient-harx text-white py-2 px-4 rounded-md hover:shadow-lg hover:shadow-harx-500/30 transition-all font-black uppercase tracking-widest text-xs"
              >
                Got it, thanks!
              </button>
            </div>
          </div>
        </div>
      )}

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight uppercase">REPS Onboarding</h2>
            <p className="mt-2 text-sm text-gray-700 font-medium">
              Complete required actions to unlock next phases
            </p>
          </div>
          <button
            className={`flex items-center px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl bg-white/50 text-gray-800 border border-white/50 shadow-sm backdrop-blur-sm hover:bg-white/80 transition-all duration-300 ${syncing ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={syncProgressWithBackend}
            disabled={syncing}
          >
            <RefreshCw className={`w-3 h-3 mr-2 ${syncing ? 'animate-spin' : ''} text-harx-600`} />
            {syncing ? 'Syncing...' : 'Refresh Progress'}
          </button>
        </div>
      <div className="bg-white/40 backdrop-blur-md rounded-[2.5rem] p-8 border border-white/40 shadow-xl shadow-harx-500/5 transition-all duration-500 hover:shadow-harx-500/10">
        <h3 className="text-xs font-black text-harx-700 uppercase tracking-[0.2em] mb-6">Your Progress</h3>

        <div className="space-y-6">
          {/* Phases progress */}
          <div>
            <div className="flex justify-between mb-3 text-xs font-black text-gray-600 uppercase tracking-widest">
              <span>Phases Completed</span>
              <span className="text-emerald-700 font-black">{visibleCompletedPhases} / {visiblePhaseTemplates.length}</span>
            </div>
            <div className="w-full bg-white/50 rounded-full h-3 p-0.5 border border-white overflow-hidden shadow-inner">
              <div className="bg-gradient-harx h-full rounded-full transition-all duration-1000 ease-out shadow-sm" style={{ width: `${progressPercentage}%` }}></div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/30 pt-6">
          <p className="flex items-center text-xs font-bold text-gray-700 bg-white/30 px-4 py-2 rounded-xl border border-white/20">
            <CheckCircle className="w-4 h-4 mr-3 text-emerald-600" />
            REQUIRED ACTIONS UNLOCK PHASES
          </p>
          <p className="flex items-center text-xs font-bold text-gray-700 bg-white/30 px-4 py-2 rounded-xl border border-white/20">
            <AlertCircle className="w-4 h-4 mr-3 text-harx-alt-600" />
            OPTIONAL ACTIONS IMPROVE PROFILE
          </p>
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
        <div className="space-y-8">
          {visiblePhases.map((phase, index) => {
            const Icon = phase.icon;
            const isComingSoon = false; // No more coming soon phases since we only show phases 1-5
            const isAvailable = phase.status === 'completed' || phase.status === 'in-progress' ||
              (index > 0 && (visiblePhases[index - 1]?.status === 'completed' || areRequiredActionsCompleted(visiblePhases[index - 1])));

            // All phases now navigate internally
            const isExternalLink = false;

            return (
              <div key={phase.id} className="relative group/phase">
                <div className={`absolute left-8 top-10 w-5 h-5 -ml-2.5 rounded-full border-4 z-10 transition-all duration-500 ring-8 ${
                  phase.status === 'completed' ? 'bg-emerald-500 border-emerald-100 ring-emerald-500/5' :
                    phase.status === 'in-progress' ? 'bg-harx-alt-500 border-harx-alt-50 ring-harx-alt-500/10 animate-pulse-subtle' :
                      'bg-white border-gray-100 ring-transparent'
                  }`}></div>
                <div className="ml-16 relative">
                  <div className={`bg-white/80 backdrop-blur-md rounded-[2rem] shadow-xl p-8 transition-all duration-500 group-hover/phase:-translate-y-1 ${
                    phase.status === 'completed' ? 'border-emerald-100 shadow-emerald-500/5' :
                      phase.status === 'in-progress' ? 'border-harx-alt-100 shadow-harx-alt-500/10' :
                        'border-gray-50 opacity-80'
                    } border`}>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center">
                        <div className={`p-4 rounded-2xl shadow-sm transition-transform duration-500 group-hover/phase:scale-110 ${
                          phase.status === 'completed' ? 'bg-emerald-50 text-emerald-500' :
                            phase.status === 'in-progress' ? 'bg-harx-alt-50 text-harx-alt-500' :
                              'bg-gray-50 text-gray-400'
                          }`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="ml-5">
                          <h3 className="text-xl font-black text-gray-900 flex items-center tracking-tight uppercase">
                            {phase.name}
                            {!isAvailable && !isComingSoon && (
                              <div className="ml-3 p-1.5 bg-amber-50 rounded-lg border border-amber-100">
                                <Lock className="w-3 h-3 text-amber-600" />
                              </div>
                            )}
                          </h3>
                          <p className="mt-1 text-xs font-bold text-gray-600 uppercase tracking-widest">Phase {phase.id} • {phase.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        {isComingSoon ? (
                          <div className="flex items-center text-purple-600 bg-purple-50 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest">
                            <Clock className="w-4 h-4 mr-2" />
                            Coming Soon
                          </div>
                        ) : phase.status === 'completed' ? (
                          <div className="flex items-center text-emerald-700 bg-emerald-50 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border border-emerald-100 shadow-sm shadow-emerald-500/5">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Completed
                          </div>
                        ) : phase.status === 'in-progress' ? (
                          <button
                            onClick={() => handlePhaseAction(phase)}
                            className="inline-flex items-center px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-gradient-harx text-white hover:shadow-lg hover:shadow-harx-500/30 transition-all hover:-translate-y-0.5"
                          >
                            Continue
                            {isExternalLink ? (
                              <ExternalLink className="ml-2 w-4 h-4" />
                            ) : (
                              <ArrowRight className="ml-2 w-4 h-4" />
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => isAvailable && handlePhaseAction(phase)}
                            className={`inline-flex items-center px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isAvailable
                              ? 'bg-gradient-harx text-white hover:shadow-lg hover:shadow-harx-500/30 hover:-translate-y-0.5'
                              : 'bg-gray-50 text-gray-400 border border-gray-100 cursor-not-allowed'
                              }`}
                            disabled={!isAvailable}
                            title={!isAvailable ? "Complete required actions in the previous phase first" : ""}
                          >
                            {isAvailable ? (
                              <>
                                Start Step
                                {isExternalLink ? (
                                  <ExternalLink className="ml-2 w-4 h-4" />
                                ) : (
                                  <ArrowRight className="ml-2 w-4 h-4" />
                                )}
                              </>
                            ) : (
                              <>
                                Locked
                                <Lock className="ml-2 w-3.5 h-3.5" />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {!isAvailable && index > 0 && (
                      <div className="mb-4 p-3 bg-amber-50 text-amber-800 rounded-md text-sm flex items-start">
                        <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                        <p>
                          Complete the required actions in Phase {visiblePhases[index - 1]?.id} to unlock this phase.
                        </p>
                      </div>
                    )}

                    <div className="mt-6 border-t border-white pt-6">
                      {/* Required Actions */}
                      <h4 className="text-xs font-black text-gray-600 uppercase tracking-[0.2em] mb-4 flex items-center">
                        <ListChecks className="w-3.5 h-3.5 mr-2 text-gray-500" />
                        Required Actions
                        <span className="ml-3 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 text-[8px] font-black">MUST COMPLETE</span>
                      </h4>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                        {phase.requiredActions.map((action, actionIndex) => {
                          const isCompleted = phase.completedActions?.includes(actionIndex);

                          return (
                            <li key={actionIndex} className={`flex items-center p-3 rounded-2xl border transition-all duration-300 ${
                              isCompleted ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' : 
                               phase.status === 'in-progress' ? 'bg-white/50 border-white text-gray-800' : 'bg-gray-50/50 border-gray-100 text-gray-600'
                            }`}>
                              <div className={`w-6 h-6 rounded-lg mr-4 flex items-center justify-center transition-all duration-500 ${isCompleted ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 rotate-0' :
                                phase.status === 'in-progress' ? 'bg-white border-2 border-harx-alt-600 rotate-0' : 'bg-gray-100 border-2 border-gray-400 rotate-0'
                                }`}>
                                {isCompleted && (
                                  <CheckCircle className="w-3.5 h-3.5" />
                                )}
                              </div>
                              <span className="text-xs font-black">{action}</span>
                            </li>
                          );
                        })}
                      </ul>

                      {/* Optional Actions */}
                      {phase.optionalActions.length > 0 && (
                        <>
                          <h4 className="text-xs font-black text-gray-600 uppercase tracking-[0.2em] mb-4 flex items-center">
                            <Clock className="w-3.5 h-3.5 mr-2 text-gray-500" />
                            Optional Actions
                          </h4>
                          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {phase.optionalActions.map((action, actionIndex) => {
                              // Calculate the actual index in the completedActions array
                              const actualIndex = phase.requiredActions.length + actionIndex;
                              const isCompleted = phase.completedActions?.includes(actualIndex);

                              return (
                                <li key={actionIndex} className={`flex items-center p-3 rounded-2xl border transition-all duration-300 ${
                                  isCompleted ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' : 'bg-white/30 border-white/40 text-gray-700'
                                }`}>
                                  <div className={`w-6 h-6 rounded-lg mr-4 flex items-center justify-center transition-all duration-500 ${isCompleted ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-white border-2 border-gray-400'
                                    }`}>
                                    {isCompleted && (
                                      <CheckCircle className="w-3.5 h-3.5" />
                                    )}
                                  </div>
                                  <span className="text-xs font-black">{action}</span>
                                </li>
                              );
                            })}
                          </ul>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;