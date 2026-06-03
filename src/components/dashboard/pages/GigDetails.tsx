import { useState, useEffect } from 'react';
import { Skeleton } from '../ui/Skeleton';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign, Users, Globe, Calendar, Building, MapPin, Target, Phone, Mail, ChevronLeft, ChevronRight, Repeat, Star, FileText, Play, Sparkles } from 'lucide-react';
import Cookies from 'js-cookie';
import { getAgentId, getAuthToken } from '../../../utils/authUtils';
import { fetchEnrolledGigsFromProfile, fetchPendingRequests, refreshGigStatuses } from '../../../utils/gigStatusUtils';
import { resolveGigStartRoute } from '../../../utils/gigStartRouting';
import { getBonusPillDisplay, getTransactionPillDisplay, getResolvedAgentFacing, type GigCommissionExtended, type AgentFacingCommissionBlock } from '../../../utils/gigCommissionDisplay';
import { persistCompanyProfile, persistCompanyReturnGig, type CompanyProfileData } from '../../../utils/companyProfileStorage';

// Interface pour les gigs populés (même que dans GigsMarketplace)
interface PopulatedGig {
  _id: string;
  title: string;
  description: string;
  category: string;

  // 👤 User populé
  userId: {
    _id: string;
    email: string;
    fullName: string;
    phone?: string;
    linkedInId?: string;
    isVerified: boolean;
    createdAt: Date;
    typeUser?: string;
    firstTime: boolean;
  };

  // 🏢 Company populé
  companyId: {
    _id: string;
    userId?: string;
    name: string;
    logo?: string;
    industry?: string;
    founded?: string;
    headquarters?: string;
    overview: string;
    companyIntro?: string;
    mission?: string;
    subscription: 'free' | 'standard' | 'premium';
    culture: {
      values: string[];
      benefits: string[];
      workEnvironment?: string;
    };
    opportunities: {
      roles: string[];
      growthPotential?: string;
      training?: string;
    };
    technology: {
      stack: string[];
      innovation?: string;
    };
    contact: {
      email?: string;
      phone?: string;
      address?: string;
      website?: string;
      coordinates?: {
        lat: number;
        lng: number;
      };
    };
    socialMedia: {
      linkedin?: string;
      twitter?: string;
      facebook?: string;
      instagram?: string;
    };
    createdAt: Date;
    updatedAt: Date;
  };

  destination_zone: {
    name: {
      common: string;
      official: string;
      nativeName?: {
        [key: string]: {
          official: string;
          common: string;
          _id: string;
        };
      };
    };
    flags: {
      png: string;
      svg: string;
      alt: string;
    };
    _id: string;
    cca2: string;
    __v: number;
    createdAt: string;
    updatedAt: string;
  };

  // 🎯 Activities populées
  activities: Array<{
    _id: string;
    name: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
  }>;

  // 🏭 Industries populées
  industries: Array<{
    _id: string;
    name: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
  }>;

  seniority: {
    level: string;
    yearsExperience: string;
  };

  // 🎓 Skills populées
  skills: {
    professional: Array<{
      skill: {
        _id: string;
        name: string;
        category?: string;
        description?: string;
        createdAt: Date;
        updatedAt: Date;
      };
      level: number;
      details: string;
    }>;
    technical: Array<{
      skill: {
        _id: string;
        name: string;
        category?: string;
        description?: string;
        createdAt: Date;
        updatedAt: Date;
      };
      level: number;
      details: string;
    }>;
    soft: Array<{
      skill: {
        _id: string;
        name: string;
        category?: string;
        description?: string;
        createdAt: Date;
        updatedAt: Date;
      };
      level: number;
      details: string;
    }>;
    languages: Array<{
      language: {
        _id: string;
        name: string;
        iso639_1: string;
        description?: string;
        createdAt: Date;
        updatedAt: Date;
      };
      proficiency: string;
      iso639_1: string;
    }>;
  };

  // ⏰ Availability avec timezone populé
  availability: {
    schedule: Array<{
      day: string;
      hours: {
        start: string;
        end: string;
      };
    }>;
    time_zone: {
      _id: string;
      name?: string;
      offset?: string;
      abbreviation?: string;
      description?: string;
      countryCode?: string;
      countryName?: string;
      zoneName?: string;
      gmtOffset?: number;
      lastUpdated?: Date;
      createdAt: Date;
      updatedAt: Date;
    };
    flexibility: string[];
    minimumHours: {
      daily?: number;
      weekly?: number;
      monthly?: number;
    };
  };

  // 💰 Commission (agentFacing optional = server-enriched agent amounts)
  commission: {
    commission_per_call: number;
    bonusAmount?: string | number;
    currency: {
      _id: string;
      code?: string;
      symbol?: string;
      name?: string;
    } | string;
    minimumVolume?: {
      amount: string | number;
      period: string;
      unit: string;
    };
    bonus?: string | number;
    bonusPeriod?: string;
    bonusType?: string;
    transactionCommission?: number | {
      type: string;
      amount: string | number;
    };
    additionalDetails?: string;
    agentFacing?: AgentFacingCommissionBlock;
  };

  // 🎯 Leads
  leads: {
    types: Array<{
      type: 'hot' | 'warm' | 'cold';
      percentage: number;
      description: string;
      conversionRate?: number;
    }>;
    sources: string[];
  };

  // 👥 Team
  team: {
    size: string;
    structure: Array<{
      roleId: string;
      count: number;
      seniority: {
        level: string;
        yearsExperience: string;
      };
    }>;
    territories: (string | {
      _id: string;
      name: {
        common: string;
        official: string;
      };
      flags: {
        png: string;
        svg: string;
      };
      cca2: string;
    })[];
  };

  // 📖 Documentation
  documentation: {
    product?: Array<{ name: string; url: string }>;
    process?: Array<{ name: string; url: string }>;
    training?: Array<{ name: string; url: string }>;
  };

  status: 'to_activate' | 'active' | 'inactive' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  enrolledAgents?: string[]; // Added for enrollment status

  // 👥 Agents enrolled/invited to this gig
  agents?: Array<{
    agentId: string;
    status: 'invited' | 'enrolled' | 'rejected' | 'requested' | 'pending';
    enrollmentDate?: string;
    invitationDate?: string;
    updatedAt?: string;
    _id: string;
  }>;
}

// Interface pour les leads
interface Lead {
  _id: string;
  userId?: string;
  companyId?: string;
  assignedTo?: {
    _id: string;
    name: string;
    email: string;
  };
  gigId?: string;
  refreshToken?: string;
  id?: string;
  Last_Activity_Time?: Date;
  Activity_Tag?: string;
  Deal_Name?: string;
  Stage?: string;
  Email_1?: string;
  Phone?: string;
  Telephony?: string;
  Pipeline?: string;
  updatedAt: Date;
}

// Interface pour la réponse de l'API des leads
interface LeadsResponse {
  success: boolean;
  count: number;  // Number of leads in current page
  total: number;  // Total number of leads for this gig
  totalPages: number;
  currentPage: number;  // Current page number
  data: Lead[];
}

export function GigDetails() {
  const { gigId } = useParams<{ gigId: string }>();
  const navigate = useNavigate();
  const [gig, setGig] = useState<PopulatedGig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // États pour les leads
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsError, setLeadsError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalLeads, setTotalLeads] = useState(0);
  const limit = 50; // Nombre de leads par page (maximum supporté par le backend)


  // Placeholder states for compatibility
  const [trainingCompleted, setTrainingCompleted] = useState<boolean | null>(null);
  const [checkingTraining, setCheckingTraining] = useState(false);
  const [trainingStarted, setTrainingStarted] = useState<boolean | null>(null);
  const [hasTraining, setHasTraining] = useState<boolean>(false);

  // État pour le score d'engagement
  const [engagementScore, setEngagementScore] = useState<number | null>(null);

  // États pour les trainings disponibles
  const [availableTrainings, setAvailableTrainings] = useState<any[]>([]);
  const [loadingTrainings, setLoadingTrainings] = useState(false);

  // État pour la progression des trainings
  const [trainingsProgress, setTrainingsProgress] = useState<Record<string, any>>({});
  const [loadingProgress, setLoadingProgress] = useState(false);

  // Fonction pour vérifier si l'agent est enrolled dans ce gig
  const isAgentEnrolled = () => {
    const agentId = getAgentId();
    if (!agentId || !gig) return false;

    // Vérifier si le gig a un champ agents avec le statut de l'agent
    if (gig.agents && Array.isArray(gig.agents)) {
      const agentStatus = gig.agents.find((agent: any) => agent.agentId === agentId);
      return agentStatus?.status === 'enrolled';
    }

    return false;
  };

  // Fonction pour obtenir le statut de l'agent dans ce gig
  const getAgentStatus = (): 'enrolled' | 'invited' | 'pending' | 'none' => {
    const agentId = getAgentId();
    if (!agentId || !gig) return 'none';

    // 1. Vérifier d'abord les données du profil (plus fiables)
    if (enrolledGigIds.includes(gigId!)) {
      console.log(`✅ Agent is ENROLLED in gig ${gigId} (from profile)`);
      return 'enrolled';
    }

    if (pendingGigIds.includes(gigId!)) {
      console.log(`⏳ Agent has PENDING request for gig ${gigId} (from profile)`);
      return 'pending';
    }

    // 2. Vérifier les données du gig (fallback)
    if (gig.agents && Array.isArray(gig.agents)) {
      const agentStatus = gig.agents.find((agent: any) => agent.agentId === agentId);
      if (agentStatus?.status === 'enrolled') {
        console.log(`✅ Agent is ENROLLED in gig ${gigId} (from gig data)`);
        return 'enrolled';
      }
      if (agentStatus?.status === 'invited') {
        console.log(`📨 Agent is INVITED to gig ${gigId} (from gig data)`);
        return 'invited';
      }
      if (agentStatus?.status === 'requested' || agentStatus?.status === 'pending') {
        console.log(`⏳ Agent has PENDING request for gig ${gigId} (from gig data)`);
        return 'pending';
      }
    }

    console.log(`❌ Agent has NO STATUS for gig ${gigId}`);
    return 'none';
  };

  // États pour l'application
  const [applying, setApplying] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [applicationMessage, setApplicationMessage] = useState('');

  // États pour les statuts depuis le profil
  const [pendingGigIds, setPendingGigIds] = useState<string[]>([]);
  const [enrolledGigIds, setEnrolledGigIds] = useState<string[]>([]);

  const handleSmartStart = () => {
    if (!gigId) return;
    navigate(`/workspace?tab=copilot&gigId=${encodeURIComponent(gigId)}`, { state: { gigId } });
  };

  const handleOpenCompanyProfile = () => {
    if (!gig?.companyId?._id || !gigId) return;
    const company = gig.companyId as unknown as CompanyProfileData;
    persistCompanyProfile(company._id, company);
    persistCompanyReturnGig(company._id, gigId);
    navigate(`/company/${company._id}?gigId=${encodeURIComponent(gigId)}`, { state: { company, fromGigId: gigId } });
  };

  useEffect(() => {
    const fetchGigDetails = async () => {
      if (!gigId) {
        setError('Gig ID not provided');
        setLoading(false);
        return;
      }

      // Mettre à jour le cookie gigId dès qu'on charge les détails d'un gig
      console.log('🍪 Setting gigId cookie:', gigId);
      Cookies.set('currentGigId', gigId, { expires: 7 }); // Expire dans 7 jours

      try {
        console.log('🔍 Fetching gig details for ID:', gigId);
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL_GIGS}/gigs/${gigId}/details`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ API Error:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });
          throw new Error(`Failed to fetch gig details: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Received gig details:', data);

        if (data.success && data.data) {
          console.log('🔍 Gig data structure:', {
            skills: data.data.skills,
            activities: data.data.activities,
            industries: data.data.industries,
            companyId: data.data.companyId,
            fullData: data.data
          });
          setGig(data.data);
        } else if (data.data) {
          console.log('🔍 Gig data structure (no success flag):', {
            skills: data.data.skills,
            activities: data.data.activities,
            industries: data.data.industries,
            companyId: data.data.companyId,
            fullData: data.data
          });
          setGig(data.data);
        } else if (data._id) {
          // Sometimes the API returns the gig data directly without wrapping
          console.log('🔍 Direct gig data structure:', {
            skills: data.skills,
            activities: data.activities,
            industries: data.industries,
            companyId: data.companyId,
            fullData: data
          });
          setGig(data);
        } else {
          console.error('❌ Unexpected data structure:', data);
          throw new Error('Invalid response structure');
        }
      } catch (err) {
        console.error('❌ Error fetching gig details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load gig details');
      } finally {
        setLoading(false);
      }
    };

    fetchGigDetails();
  }, [gigId]);

  // Récupérer les statuts depuis le profil de l'agent
  useEffect(() => {
    const fetchStatusesFromProfile = async () => {
      try {
        console.log('🔍 Fetching statuses from agent profile...');
        const [pendingIds, enrolledIds] = await Promise.all([
          fetchPendingRequests(),
          fetchEnrolledGigsFromProfile()
        ]);

        console.log('📝 Profile statuses fetched:', { pendingIds, enrolledIds });

        // Fix: Si on vient de postuler avec succès, s'assurer que le gigId reste dans pendingIds
        // Même si le serveur a un léger délai de mise à jour
        let finalPendingIds = pendingIds;
        if (applicationStatus === 'success' && gigId && !pendingIds.includes(gigId)) {
          console.log('🛡️ Merging optimistic pending gigId into fetched results to prevent flicker');
          finalPendingIds = [...pendingIds, gigId];
        }

        setPendingGigIds(finalPendingIds);
        setEnrolledGigIds(enrolledIds);
      } catch (error) {
        console.error('❌ Error fetching statuses from profile:', error);
      }
    };

    fetchStatusesFromProfile();

    // Écouter les événements de rafraîchissement des statuts
    const handleRefresh = () => {
      console.log('🔄 Event received: refreshGigStatuses in GigDetails');
      fetchStatusesFromProfile();
    };

    window.addEventListener('refreshGigStatuses', handleRefresh);

    return () => {
      window.removeEventListener('refreshGigStatuses', handleRefresh);
    };
  }, [applicationStatus, gigId]);

  // Vérifier le statut d'enrollment de l'agent
  useEffect(() => {
    const checkEnrollmentStatus = async () => {
      const agentId = getAgentId();
      const token = getAuthToken();

      if (!agentId || !token || !gigId) {
        return;
      }

      try {
        console.log('🔍 Checking enrollment status for agent:', agentId, 'gig:', gigId);

        // Vérifier si l'agent est invité à ce gig
        try {
          const invitedResponse = await fetch(
            `${import.meta.env.VITE_MATCHING_API_URL}/gig-agents/invited/agent/${agentId}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            }
          );

          if (invitedResponse.ok) {
            const invitedData = await invitedResponse.json();
            const isInvited = invitedData.some((invitation: any) =>
              invitation.gigId === gigId || invitation.gigId?._id === gigId
            );

            if (isInvited) {
              console.log('📨 Agent is invited to this gig');
              // On pourrait ajouter un state invitedGigIds si besoin, 
              // mais pour l'instant on se base sur les props ou getAgentStatus
            }
          }
        } catch (invitedErr) {
          console.log('ℹ️ Could not check invitation status:', invitedErr);
        }

        // Si aucune des vérifications n'a trouvé de statut, l'agent n'a pas de relation avec ce gig
        console.log('ℹ️ Agent enrollment status check complete');

      } catch (err) {
        console.error('❌ Error checking enrollment status:', err);
      }
    };

    if (gig && !loading) {
      checkEnrollmentStatus();
    }
  }, [gig, gigId, loading]);

  // Fonction helper pour extraire l'ID d'un objet MongoDB (gère les formats $oid et string)
  const extractId = (id: any): string => {
    if (!id) return '';
    if (typeof id === 'string') return id;
    if (id.$oid) return id.$oid;
    if (id._id) {
      if (typeof id._id === 'string') return id._id;
      if (id._id.$oid) return id._id.$oid;
    }
    return String(id);
  };

  // Fonction pour récupérer la progression des trainings pour ce gig
  // Fonction pour récupérer la progression des trainings pour ce gig
  const fetchTrainingsProgress = async () => {
    const agentId = getAgentId();
    if (!agentId || !gigId) return;

    setLoadingProgress(true);
    try {
      const trainingBackendUrl = import.meta.env.VITE_TRAINING_BACKEND_URL || 'https://v25platformtrainingbackend-production.up.railway.app';
      const url = `${trainingBackendUrl}/training_journeys/rep/${agentId}/progress/gig/${gigId}`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Progress data received:', data);
        if (data.success && data.data && data.data.trainings) {
          // Créer un map de progression par journeyId
          const progressMap: Record<string, any> = {};
          data.data.trainings.forEach((training: any) => {
            const journeyId = extractId(training.journeyId);
            progressMap[journeyId] = training;
            console.log('📈 Mapped progress for journeyId:', journeyId, training);
          });
          console.log('📊 Progress map:', progressMap);
          setTrainingsProgress(progressMap);
        }
      } else {
        console.warn('⚠️ Could not fetch progress:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching trainings progress:', error);
    } finally {
      setLoadingProgress(false);
    }
  };

  // Fonction pour récupérer les trainings disponibles pour ce gig
  const fetchAvailableTrainings = async () => {
    if (!gigId) {
      console.log('⚠️ No gigId provided, skipping training fetch');
      return;
    }

    console.log('🔍 Fetching trainings for gigId:', gigId);
    setLoadingTrainings(true);
    try {
      const trainingBackendUrl = import.meta.env.VITE_TRAINING_BACKEND_URL || 'https://v25platformtrainingbackend-production.up.railway.app';
      console.log('🌐 Training backend URL:', trainingBackendUrl);

      const url = `${trainingBackendUrl}/training_journeys/gig/${gigId}`;
      console.log('📡 Fetching from URL:', url);

      const response = await fetch(url);
      console.log('📥 Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📦 Response data:', data);

        if (data.success && data.data) {
          console.log('✅ Found', data.data.length, 'trainings');
          setAvailableTrainings(data.data);
        } else {
          console.warn('⚠️ Response format issue:', { success: data.success, hasData: !!data.data });
          setAvailableTrainings([]);
        }
      } else {
        const errorText = await response.text();
        console.warn('⚠️ Could not fetch trainings:', response.status, errorText);
        setAvailableTrainings([]);
      }
    } catch (error) {
      console.error('❌ Error fetching trainings:', error);
      setAvailableTrainings([]);
    } finally {
      setLoadingTrainings(false);
    }
  };

  // Charger les trainings disponibles pour ce gig
  useEffect(() => {
    if (gigId) {
      fetchAvailableTrainings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gigId]);

  // Charger la progression des trainings quand les trainings sont chargés
  useEffect(() => {
    if (availableTrainings.length > 0 && gigId && isAgentEnrolled()) {
      fetchTrainingsProgress();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableTrainings, gigId]);

  // Fonction pour initialiser la progression avant de démarrer le training
  const initializeTrainingProgress = async (trainingId: string) => {
    const agentId = getAgentId();
    if (!agentId) {
      console.error('❌ No agentId found');
      return false;
    }

    try {
      const trainingBackendUrl = import.meta.env.VITE_TRAINING_BACKEND_URL || 'https://v25platformtrainingbackend-production.up.railway.app';
      const url = `${trainingBackendUrl}/training_journeys/rep-progress/start`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repId: agentId,
          journeyId: trainingId
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Training progress initialized:', data);
        return true;
      } else {
        const errorData = await response.json();
        console.warn('⚠️ Could not initialize progress:', response.status, errorData);
        return false;
      }
    } catch (error) {
      console.error('❌ Error initializing training progress:', error);
      return false;
    }
  };

  // Fonction pour rediriger vers le training
  const handleTrainingClick = async (trainingId: string) => {
    // Initialiser la progression avant de rediriger
    await initializeTrainingProgress(trainingId);

    // Rafraîchir la progression après initialisation
    setTimeout(() => {
      fetchTrainingsProgress();
    }, 500);
    const trainingUrl = `https://harx25pageslinks.netlify.app/training/repdashboard/${trainingId}`;
    window.open(trainingUrl, '_blank');
  };

  // Fonction pour récupérer le score d'engagement
  const getEngagementScore = async (): Promise<number | null> => {
    const agentId = getAgentId();
    if (!agentId || !gigId) return null;

    try {
      const trainingBackendUrl = import.meta.env.VITE_TRAINING_BACKEND_URL || 'https://v25platformtrainingbackend-production.up.railway.app';

      // Récupérer les journeys pour ce gig
      const journeysResponse = await fetch(
        `${trainingBackendUrl}/training_journeys/gig/${gigId}`
      );

      if (!journeysResponse.ok) {
        console.warn('⚠️ Could not fetch training journeys for score:', journeysResponse.status);
        return null;
      }

      const journeysData = await journeysResponse.json();
      const journeys = journeysData.success ? journeysData.data : [];
      if (!journeys || journeys.length === 0) {
        console.log('ℹ️ No training journeys found for this gig');
        return null;
      }

      // Récupérer le score d'engagement pour chaque journey du gig
      let maxScore = 0;
      let hasScore = false;

      for (const journey of journeys) {
        const journeyId = journey.id || journey._id;
        if (!journeyId) continue;

        // Vérifier si le rep est enrollé dans ce journey
        if (!journey.enrolledRepIds || !journey.enrolledRepIds.includes(agentId)) {
          continue;
        }

        // Récupérer le progrès avec le score d'engagement
        const progressResponse = await fetch(
          `${trainingBackendUrl}/training_journeys/rep-progress?repId=${agentId}&journeyId=${journeyId}`
        );

        if (progressResponse.ok) {
          const progressData = await progressResponse.json();
          const progress = progressData.success
            ? (Array.isArray(progressData.data) ? progressData.data[0] : progressData.data)
            : null;

          if (progress && progress.engagementScore !== undefined && progress.engagementScore !== null) {
            hasScore = true;
            if (progress.engagementScore > maxScore) {
              maxScore = progress.engagementScore;
            }
          }
        }
      }

      return hasScore ? maxScore : null;
    } catch (err) {
      console.error('❌ Error fetching engagement score:', err);
      return null;
    }
  };

  // Placeholders pour compatibilité
  const checkTrainingStarted = async () => ({ hasTraining: false, started: false });
  const checkTrainingCompletion = async () => true;

  // Fonction pour récupérer les leads
  const fetchLeads = async (page: number = 1) => {
    if (!gigId) return;

    setLeadsLoading(true);
    setLeadsError(null);

    try {
      console.log('🔍 Fetching leads for gig ID:', gigId, 'page:', page);
      const response = await fetch(
        `${import.meta.env.VITE_DASH_COMPANY_BACKEND}/leads/gig/${gigId}?page=${page}&limit=${limit}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Leads API Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Failed to fetch leads: ${response.status}`);
      }

      const data: LeadsResponse = await response.json();
      console.log('✅ Received leads data:', data);

      if (data.success) {
        setLeads(data.data);
        setCurrentPage(data.currentPage);
        setTotalPages(data.totalPages);
        setTotalLeads(data.total);
      } else {
        throw new Error('Failed to fetch leads');
      }
    } catch (err) {
      console.error('❌ Error fetching leads:', err);
      setLeadsError(err instanceof Error ? err.message : 'Failed to load leads');
    } finally {
      setLeadsLoading(false);
    }
  };

  // Vérifier la complétion de la formation quand l'agent est enrolled
  useEffect(() => {
    const verifyTrainingAndLoadLeads = async () => {
      if (gigId && isAgentEnrolled()) {
        const score = await getEngagementScore();
        setEngagementScore(score);
        console.log(`✅ Agent enrolled, chargement des leads pour gig ${gigId}`);
        fetchLeads(1);
      }
    };

    verifyTrainingAndLoadLeads();
  }, [gigId, gig]);

  // Fonction pour changer de page
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      fetchLeads(newPage);
    }
  };

  // Fonction pour postuler au gig
  const handleApply = async () => {
    const agentId = getAgentId();
    const token = getAuthToken();

    if (!agentId || !token) {
      setApplicationStatus('error');
      setApplicationMessage('You must be logged in to apply');
      return;
    }

    if (!gigId) {
      setApplicationStatus('error');
      setApplicationMessage('Gig ID not found');
      return;
    }

    setApplying(true);
    setApplicationStatus('idle');
    setApplicationMessage('');

    try {
      console.log('🚀 Applying to gig:', gigId);
      console.log('👤 Agent ID:', agentId);

      const response = await fetch(
        `${import.meta.env.VITE_MATCHING_API_URL}/gig-agents/enrollment-request/${agentId}/${gigId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            notes: "I am very interested in this project and have relevant experience in frontend development."
          }),
        }
      );

      console.log('📡 Application response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Application failed:', errorText);

        // Si l'erreur indique que le gig est déjà en attente, rafraîchir le statut
        if (response.status === 400 && errorText.includes('Cannot request enrollment for this gig at this time')) {
          console.log('⏳ Gig is already pending, refreshing enrollment status...');
          setApplicationStatus('idle');
          setApplicationMessage('This gig is already pending. Refreshing status...');

          // Rafraîchir le statut d'enrollment après un court délai
          setTimeout(() => {
            // Appeler la fonction de vérification du statut
            const checkStatus = async () => {
              const agentId = getAgentId();
              const token = getAuthToken();

              if (!agentId || !token || !gigId) return;

              try {
                console.log('🔄 Refreshing enrollment status...');
                const enrolledResponse = await fetch(
                  `${import.meta.env.VITE_MATCHING_API_URL}/gig-agents/enrolled/agent/${agentId}`,
                  {
                    headers: {
                      'Authorization': `Bearer ${token}`,
                    },
                  }
                );

                if (enrolledResponse.ok) {
                  const enrolledData = await enrolledResponse.json();
                  console.log('📝 Refreshed enrolled data:', enrolledData);

                  // Vérifier le statut de l'enrollment pour ce gig spécifique
                  const enrollmentForThisGig = enrolledData.find((enrollment: any) =>
                    enrollment.gigId === gigId || enrollment.gigId?._id === gigId
                  );

                  if (enrollmentForThisGig) {
                    if (enrollmentForThisGig.status === 'pending') {
                      console.log('⏳ Found pending enrollment, updating status');
                      setPendingGigIds(prev => [...prev, gigId!]);
                      setApplicationStatus('success');
                      setApplicationMessage('Status updated: This gig is already pending');
                    } else if (enrollmentForThisGig.status === 'accepted' || enrollmentForThisGig.status === 'enrolled') {
                      console.log('✅ Found accepted enrollment, updating status');
                      setEnrolledGigIds(prev => [...prev, gigId!]);
                      setApplicationStatus('success');
                      setApplicationMessage('Status updated: You are now enrolled in this gig');
                    }
                  } else {
                    console.log('ℹ️ No enrollment found for this gig');
                  }
                } else {
                  console.log('⚠️ Failed to refresh enrollment status:', enrolledResponse.status);
                }
              } catch (err) {
                console.error('❌ Error refreshing enrollment status:', err);
              }
            };

            checkStatus();
          }, 1000);

          return;
        }

        throw new Error(`Échec de la candidature: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Application successful:', data);

      setApplicationStatus('success');
      setApplicationMessage(data.message || 'Application sent successfully!');

      // Mise à jour optimiste pour affichage immédiat
      setPendingGigIds(prev => [...prev, gigId!]);

      // Déclencher le rafraîchissement des statuts dans toutes les pages
      await refreshGigStatuses();

    } catch (err) {
      console.error('❌ Error applying to gig:', err);
      setApplicationStatus('error');
      setApplicationMessage(err instanceof Error ? err.message : 'Error during application');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <Skeleton className="h-6 w-32" variant="rounded" />

          <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 border border-gray-100 space-y-6">
            <div className="flex justify-between items-start">
              <div className="space-y-4 flex-1">
                <Skeleton className="h-12 w-3/4" variant="rounded" />
                <Skeleton className="h-6 w-1/4" variant="rounded" />
              </div>
              <Skeleton className="h-10 w-32" variant="rounded" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 border border-gray-100 space-y-4">
                <Skeleton className="h-8 w-48" variant="rounded" />
                <Skeleton className="h-24 w-full" variant="rounded" />
              </div>
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 border border-gray-100 space-y-6">
                <Skeleton className="h-8 w-48" variant="rounded" />
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-8 w-24" variant="rounded" />)}
                </div>
              </div>
            </div>
            <div className="space-y-8">
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 border border-gray-100 space-y-6">
                <Skeleton className="h-8 w-full" variant="rounded" />
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-6 w-full" variant="rounded" />)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !gig) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-12 rounded-3xl shadow-xl border border-gray-100 text-center max-w-md">
          <div className="text-5xl mb-6">🔍</div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Gig Not Found</h2>
          <p className="text-gray-500 mb-8 font-medium">{error || 'The requested gig could not be found or has been archived.'}</p>
          <button
            onClick={() => navigate('/gigs-marketplace')}
            className="w-full bg-gradient-harx text-white py-3 px-6 rounded-xl hover:shadow-lg hover:shadow-harx-500/20 transition-all font-black text-sm uppercase tracking-wider hover:-translate-y-0.5"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  const commissionCurrencySymbol =
    typeof gig.commission?.currency === 'object'
      ? gig.commission?.currency?.symbol || gig.commission?.currency?.code || '€'
      : gig.commission?.currency || '€';
  const resolvedFacing = getResolvedAgentFacing(gig.commission as GigCommissionExtended);
  const commissionPerCall = resolvedFacing?.commission_per_call;
  const transactionPill = getTransactionPillDisplay(gig.commission, commissionCurrencySymbol);
  const bonusPill = getBonusPillDisplay(gig.commission, commissionCurrencySymbol);
  const hasCommissionPills = Boolean(
    (commissionPerCall && Number(commissionPerCall) > 0) ||
      transactionPill !== null ||
      bonusPill !== null
  );
  const hasAdditionalCommissionDetails = Boolean(gig.commission?.additionalDetails);
  const showCommissionDetailsColumn = hasCommissionPills || hasAdditionalCommissionDetails;

  return (
    <div className="min-h-screen bg-transparent py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header avec bouton retour */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/gigs-marketplace')}
            className="flex items-center text-gray-500 hover:text-harx-600 mb-6 transition-colors font-bold group"
          >
            <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Marketplace
          </button>

          <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                {/* Titre du gig, puis catégorie (toujours sous le titre) */}
                <div className="mb-5">
                  <div className="flex items-center flex-wrap gap-3">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">{gig.title}</h1>
                    {getAgentStatus() === 'invited' && (
                      <span className="inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-harx-50 text-harx-600 border border-harx-100 shadow-sm">
                        ✉ Invited
                      </span>
                    )}
                  </div>
                  {gig.category && (
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-500 mt-2">
                      {gig.category}
                    </p>
                  )}
                </div>

                {/* Company logo + name — lien vers profil entreprise */}
                <button
                  type="button"
                  onClick={handleOpenCompanyProfile}
                  disabled={!gig.companyId?._id}
                  className={`flex items-center gap-3 mb-4 w-full max-w-xl rounded-2xl border text-left transition-all ${
                    gig.companyId?._id
                      ? 'cursor-pointer border-transparent -m-2 p-2 hover:bg-slate-50/90 hover:border-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50'
                      : 'cursor-not-allowed border-slate-100 opacity-75'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl border border-slate-100 flex items-center justify-center bg-white shadow-sm overflow-hidden shrink-0">
                    {gig.companyId?.logo ? (
                      <img src={gig.companyId.logo} alt={gig.companyId.name} className="w-full h-full object-contain p-1.5" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400 font-black text-lg uppercase">
                        {(gig.companyId?.name || (gig as any).company || gig.userId?.fullName || '?')[0]}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-extrabold text-slate-900 leading-tight">
                      {gig.companyId?.name || (gig as any).company || gig.userId?.fullName || 'Unknown'}
                    </p>
                    {gig.companyId?._id && (
                      <p className="text-[10px] font-bold text-indigo-400/90 mt-1 uppercase tracking-wider">
                        View company profile →
                      </p>
                    )}
                  </div>
                </button>
              </div>
              <div className="ml-6">
                {/* Status message */}
                {applicationStatus === 'error' && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800 font-medium">
                      ❌ {applicationMessage}
                    </p>
                  </div>
                )}

                {/* Bouton selon le statut d'enrollment */}
                {getAgentStatus() === 'enrolled' ? (
                  <div className="flex gap-3">
                    <button
                      onClick={handleSmartStart}
                      className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500 bg-[length:200%_auto] hover:bg-right transition-all duration-500 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-[0_4px_15px_-3px_rgba(244,63,94,0.4)] hover:shadow-[0_8px_25px_-4px_rgba(244,63,94,0.5)] hover:-translate-y-0.5 active:translate-y-0 overflow-hidden relative group/btn"
                    >
                      <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-500 skew-x-[-30deg]" />
                      <Play className="w-4 h-4 fill-current" />
                      START
                    </button>
                  </div>
                ) : getAgentStatus() === 'pending' ? (
                  <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black text-xs uppercase tracking-widest border border-amber-400 shadow-[0_2px_10px_-2px_rgba(245,158,11,0.4)]">
                    ⌛ Pending Review
                  </span>
                ) : getAgentStatus() === 'invited' ? (
                  <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-black text-xs uppercase tracking-widest border border-indigo-400 shadow-[0_2px_10px_-2px_rgba(99,102,241,0.4)]">
                    ✉ Invited
                  </span>
                ) : (
                  <button
                    onClick={handleApply}
                    disabled={applying}
                    className={`relative overflow-hidden flex items-center gap-2 px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all duration-500 hover:-translate-y-0.5 active:translate-y-0 group/btn ${applying
                        ? 'bg-harx-100 text-harx-400 cursor-not-allowed shadow-none'
                        : 'bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500 bg-[length:200%_auto] hover:bg-right text-white shadow-[0_4px_15px_-3px_rgba(244,63,94,0.4)] hover:shadow-[0_8px_25px_-4px_rgba(244,63,94,0.5)]'
                      }`}
                  >
                    {!applying && <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-500 skew-x-[-30deg]" />}
                    {applying ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-harx-400" />
                        <span>Applying...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Apply Now</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div
              className={`mt-8 grid gap-8 animate-fade-in ${showCommissionDetailsColumn ? 'lg:grid-cols-2 lg:gap-10' : ''}`}
            >
              <div className="min-w-0">
                <h2 className="text-xl font-black text-gray-900 mb-4 tracking-tight">Job Description</h2>
                <p className="text-gray-600 font-medium leading-relaxed whitespace-pre-wrap">{gig.description}</p>
              </div>
              {showCommissionDetailsColumn && (
                <div className="min-w-0 lg:pl-8 lg:border-l lg:border-slate-100">
                  <h2 className="text-xl font-black text-gray-900 mb-4 tracking-tight">Commission & details</h2>
                  {hasCommissionPills && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {commissionPerCall && Number(commissionPerCall) > 0 && (
                        <div className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg border border-cyan-400 shadow-[0_2px_12px_-2px_rgba(6,182,212,0.5)] animate-shine animate-pulse-ring">
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          <span className="font-black text-sm">
                            {commissionPerCall}
                            {commissionCurrencySymbol}
                          </span>
                          <span className="text-[10px] font-semibold uppercase tracking-widest opacity-80">/ APPEL</span>
                        </div>
                      )}
                      {transactionPill && (
                        <div className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg border border-violet-400 shadow-[0_2px_12px_-2px_rgba(139,92,246,0.5)] animate-shine animate-pulse-ring">
                          <Repeat className="w-3.5 h-3.5 shrink-0" />
                          <span className="font-black text-sm">
                            {transactionPill.primary}
                            {!transactionPill.isPercent ? commissionCurrencySymbol : ''}
                          </span>
                          <span className="text-[10px] font-semibold uppercase tracking-widest opacity-80">/ TRANSACTION</span>
                        </div>
                      )}
                      {bonusPill && (
                        <div className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-lg border border-pink-400 shadow-[0_2px_12px_-2px_rgba(244,63,94,0.5)] animate-shine animate-pulse-ring">
                          <Star className="w-3.5 h-3.5 shrink-0" />
                          <div className="flex flex-col leading-tight min-w-0">
                            <span className="font-black text-sm inline-flex flex-wrap items-baseline gap-x-2 gap-y-0">
                              <span>{bonusPill.primary}</span>
                              <span className="text-[10px] font-black uppercase tracking-widest opacity-95">BONUS</span>
                            </span>
                            {bonusPill.secondary && (
                              <span className="text-[10px] font-semibold uppercase tracking-widest opacity-90 mt-0.5">
                                {bonusPill.secondary}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {hasAdditionalCommissionDetails && (
                    <div className="flex items-start gap-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/80">
                      <p className="text-sm text-slate-600 font-medium leading-relaxed italic pt-0.5">
                        {gig.commission!.additionalDetails}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
          {/* Colonne principale */}
          <div className="xl:col-span-3 space-y-8">
            {/* Skills */}
            {(gig.skills?.technical?.length > 0 || gig.skills?.professional?.length > 0 || gig.skills?.soft?.length > 0 || gig.skills?.languages?.length > 0) && (
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 shadow-sm border border-gray-100">
                <h2 className="text-xl font-black text-gray-900 mb-6 tracking-tight">Required Skills</h2>

                {gig.skills.technical?.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Technical Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {gig.skills.technical.map((skill, i) => {
                        console.log('Technical skill item:', skill);
                        const skillName = skill.skill?.name || skill.details || 'Skill';
                        const skillLevel = skill.level > 0 ? ` (Level ${skill.level})` : '';
                        return (
                          <span key={i} className="px-3 py-1.5 bg-harx-50 text-harx-600 rounded-xl text-xs font-black uppercase tracking-wider">
                            {skillName}{skillLevel}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {gig.skills.professional?.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Professional Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {gig.skills.professional.map((skill, i) => {
                        console.log('Professional skill item:', skill);
                        const skillName = skill.skill?.name || skill.details || 'Skill';
                        const skillLevel = skill.level > 0 ? ` (Level ${skill.level})` : '';
                        return (
                          <span key={i} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-black uppercase tracking-wider">
                            {skillName}{skillLevel}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {gig.skills.soft?.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Soft Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {gig.skills.soft.map((skill, i) => {
                        console.log('Soft skill item:', skill);
                        const skillName = skill.skill?.name || skill.details || 'Skill';
                        const skillLevel = skill.level > 0 ? ` (Level ${skill.level})` : '';
                        return (
                          <span key={i} className="px-3 py-1.5 bg-harx-alt-100/50 text-harx-alt-700 rounded-xl text-xs font-black uppercase tracking-wider">
                            {skillName}{skillLevel}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {gig.skills.languages?.length > 0 && (
                  <div className="mb-0">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Languages</h3>
                    <div className="flex flex-wrap gap-2">
                      {gig.skills.languages.map((lang, i) => {
                        console.log('Language item:', lang);
                        const langName = lang.language?.name || lang.iso639_1?.toUpperCase() || 'Language';
                        const proficiency = lang.proficiency || 'N/A';
                        return (
                          <span key={i} className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-xl text-xs font-black uppercase tracking-wider">
                            {langName} ({proficiency})
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Industries */}
            {gig.industries?.length > 0 && (
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 shadow-sm border border-gray-100">
                <h2 className="text-xl font-black text-gray-900 mb-6 tracking-tight">Industries</h2>
                <div className="flex flex-wrap gap-2">
                  {gig.industries.map((industry, index) => {
                    console.log('Industry item:', industry);
                    const industryName = industry.name || 'Industry';
                    const industryId = industry._id || index;
                    return (
                      <span key={industryId} className="px-3 py-1.5 bg-harx-alt-100/50 text-harx-alt-700 rounded-xl text-xs font-black uppercase tracking-wider">
                        {industryName}
                      </span>
                    );
                  })}
                </div>
                {gig.industries.length > 3 && (
                  <p className="text-sm text-gray-600 mt-2">
                    Working across {gig.industries.length} different industries
                  </p>
                )}
              </div>
            )}

            {/* Activities */}
            {gig.activities?.length > 0 && (
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 shadow-sm border border-gray-100">
                <h2 className="text-xl font-black text-gray-900 mb-6 tracking-tight">Key Activities</h2>
                <div className="flex flex-wrap gap-2">
                  {gig.activities.map((activity, index) => {
                    console.log('Activity item:', activity);
                    const activityName = activity.name || 'Activity';
                    const activityId = activity._id || index;
                    return (
                      <span key={activityId} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-xl text-xs font-black uppercase tracking-wider">
                        {activityName}
                      </span>
                    );
                  })}
                </div>
                {gig.activities.some(activity => activity.description) && (
                  <div className="mt-4 space-y-2">
                    {gig.activities.filter(activity => activity.description).map((activity, index) => {
                      const activityId = activity._id || index;
                      const activityName = activity.name || 'Activity';
                      return (
                        <div key={`desc-${activityId}`} className="text-sm">
                          <span className="font-medium text-gray-700">{activityName}:</span>
                          <span className="text-gray-600 ml-1">{activity.description}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {/* Leads Information - Only for enrolled agents */}
            {isAgentEnrolled() && gig.leads?.types?.length > 0 && (
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 shadow-sm border border-gray-100">
                <h2 className="text-xl font-black text-gray-900 mb-6 tracking-tight">Lead Types</h2>
                <div className="space-y-3">
                  {gig.leads.types.map((leadType, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${leadType.type === 'hot' ? 'bg-harx-50 text-harx-600' :
                          leadType.type === 'warm' ? 'bg-amber-50 text-amber-700' :
                            'bg-harx-alt-50 text-harx-alt-700'
                          }`}>
                          {leadType.type.charAt(0).toUpperCase() + leadType.type.slice(1)}
                        </span>
                        <p className="text-sm text-gray-600 mt-1">{leadType.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{leadType.percentage}%</p>
                        {leadType.conversionRate && (
                          <p className="text-xs text-gray-500">{leadType.conversionRate}% conversion</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {gig.leads.sources?.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-medium text-gray-800 mb-2">Lead Sources:</h3>
                    <div className="flex flex-wrap gap-2">
                      {gig.leads.sources.map((source, index) => (
                        <span key={index} className="px-2 py-1 bg-indigo-100 rounded-full text-xs text-indigo-700">
                          {source}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Team Structure */}
            {gig.team && (gig.team.size || gig.team.territories?.length > 0 || gig.team.structure?.length > 0) && (
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 shadow-sm border border-gray-100">
                <h2 className="text-xl font-black text-gray-900 mb-6 tracking-tight">Team Structure</h2>
                <div className="space-y-3">
                  {gig.team.size && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Team Size:</span>
                      <span className="font-medium">{gig.team.size}</span>
                    </div>
                  )}
                  {gig.team.territories?.length > 0 && (
                    <div>
                      <span className="text-gray-600">Territories:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {gig.team.territories.map((territory, index) => (
                          <span key={index} className="px-3 py-1 bg-harx-alt-50 rounded-xl text-[10px] font-black uppercase tracking-wider text-harx-alt-700">
                            {typeof territory === 'object' ? territory?.name?.common || territory?.cca2 || 'Unknown' : territory}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {gig.team.structure?.length > 0 && (
                    <div className="mt-4">
                      <h3 className="font-medium text-gray-800 mb-2">Team Composition:</h3>
                      <div className="space-y-2">
                        {gig.team.structure.map((role, index) => (
                          <div key={index} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                            <span>{role.count}x {role.seniority?.level || 'N/A'}</span>
                            <span className="text-gray-600">{role.seniority?.yearsExperience || 'N/A'} years exp.</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="xl:col-span-2 space-y-8">
            {/* Schedule & Availability */}
            <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 shadow-sm border border-gray-100">
              <h2 className="text-xl font-black text-gray-900 mb-6 tracking-tight">Availability</h2>

              {/* Timezone */}
              {gig.availability?.time_zone && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-blue-900">
                      {gig.availability.time_zone.zoneName || gig.availability.time_zone.name}
                    </span>
                    <span className="text-sm text-blue-700">
                      {gig.availability.time_zone.countryCode || gig.availability.time_zone.abbreviation}
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    GMT{gig.availability.time_zone.gmtOffset
                      ? (gig.availability.time_zone.gmtOffset >= 0 ? '+' : '') + (gig.availability.time_zone.gmtOffset / 3600)
                      : gig.availability.time_zone.offset}
                  </p>
                </div>
              )}

              {/* Minimum Hours */}
              {gig.availability?.minimumHours && (
                <div className="mb-4">
                  <h3 className="font-medium text-gray-800 mb-2">Minimum Hours:</h3>
                  <div className="space-y-1 text-sm">
                    {gig.availability.minimumHours.daily && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Daily:</span>
                        <span>{gig.availability.minimumHours.daily}h</span>
                      </div>
                    )}
                    {gig.availability.minimumHours.weekly && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Weekly:</span>
                        <span>{gig.availability.minimumHours.weekly}h</span>
                      </div>
                    )}
                    {gig.availability.minimumHours.monthly && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Monthly:</span>
                        <span>{gig.availability.minimumHours.monthly}h</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Schedule */}
              {gig.availability?.schedule?.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Schedule:</h3>
                  <div className="space-y-2">
                    {gig.availability.schedule.map((schedule, i) => (
                      <div key={i} className="flex justify-between text-sm bg-harx-50/50 p-3 rounded-xl border border-harx-100/50">
                        <span className="font-black text-gray-700">{schedule.day}</span>
                        <span className="text-harx-600 font-black">{schedule.hours.start} - {schedule.hours.end}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Flexibility */}
              {gig.availability?.flexibility?.length > 0 && (
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Flexibility:</h3>
                  <div className="flex flex-wrap gap-2">
                    {gig.availability.flexibility.map((flex, index) => (
                      <span key={index} className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-black uppercase tracking-wider">
                        {flex}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Documentation */}
            {((gig.documentation?.product?.length ?? 0) > 0 || (gig.documentation?.process?.length ?? 0) > 0 || (gig.documentation?.training?.length ?? 0) > 0) && (
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 shadow-sm border border-gray-100">
                <h2 className="text-xl font-black text-gray-900 mb-6 tracking-tight">Documentation & Resources</h2>

                {(gig.documentation?.product?.length ?? 0) > 0 && (
                  <div className="mb-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Product Documentation:</h3>
                    <div className="space-y-2">
                      {gig.documentation?.product?.map((doc, index) => (
                        <a key={index} href={doc.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center p-3 rounded-xl bg-gray-50 hover:bg-harx-50 text-harx-600 transition-colors group">
                          <span className="text-lg mr-3 group-hover:scale-110 transition-transform">📄</span>
                          <span className="text-sm font-black uppercase tracking-tight truncate">{doc.name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {(gig.documentation?.process?.length ?? 0) > 0 && (
                  <div className="mb-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Process Documentation:</h3>
                    <div className="space-y-2">
                      {gig.documentation?.process?.map((doc, index) => (
                        <a key={index} href={doc.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center p-3 rounded-xl bg-gray-50 hover:bg-emerald-50 text-emerald-700 transition-colors group">
                          <span className="text-lg mr-3 group-hover:scale-110 transition-transform">📋</span>
                          <span className="text-sm font-black uppercase tracking-tight truncate">{doc.name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {(gig.documentation?.training?.length ?? 0) > 0 && (
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Training Materials:</h3>
                    <div className="space-y-2">
                      {gig.documentation?.training?.map((doc, index) => (
                        <a key={index} href={doc.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center p-3 rounded-xl bg-gray-50 hover:bg-harx-alt-50 text-harx-alt-700 transition-colors group">
                          <span className="text-lg mr-3 group-hover:scale-110 transition-transform">🎓</span>
                          <span className="text-sm font-black uppercase tracking-tight truncate">{doc.name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}