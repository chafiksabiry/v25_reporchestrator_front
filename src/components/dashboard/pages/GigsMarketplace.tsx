import React, { useState, useEffect, useMemo } from 'react';
import { Skeleton } from '../ui/Skeleton';
import { useTranslation } from 'react-i18next';

import { useNavigate } from 'react-router-dom';
import { User, Users, Globe, Calendar, Heart, ChevronLeft, ChevronRight, Phone, Briefcase, Sparkles, BadgeEuro, Play, Check, X, AlertTriangle } from 'lucide-react';
import { getAgentId, getAuthToken } from '../../../utils/authUtils';
import { repApiUrl } from '../../../utils/repApiUrl';
import { fetchPendingRequests as fetchPendingRequestsUtil, fetchEnrolledGigsFromProfile } from '../../../utils/gigStatusUtils';
import { persistCompanyProfile, persistCompanyReturnGig, type CompanyProfileData } from '../../../utils/companyProfileStorage';
import { fetchProfileFromAPI } from '../../../utils/profileUtils';
import { OnboardingNextStepButton } from '../../onboarding/OnboardingNextStepButton';
import { hasRepGigEngagement } from '../../../utils/repOnboardingNextStep';
import type { GigCommissionExtended } from '../../../utils/gigCommissionDisplay';
import { getResolvedAgentFacing } from '../../../utils/gigCommissionDisplay';

const renderCommissionInfo = (gig: any) => {
  if (!gig || !gig.commission) return null;
  const comm = gig.commission as GigCommissionExtended;
  const currencySymbol = typeof comm.currency === 'object' ? comm.currency?.symbol || '€' : comm.currency || '€';

  const af = getResolvedAgentFacing(comm);

  const perCall = af?.commission_per_call;
  const hasCall = perCall !== undefined && perCall !== null && Number(perCall) > 0;

  const transEff = af?.transactionCommission;
  let hasTrans = false;
  let transDisplay: string | number = '';
  let transType = 'Transaction';
  if (transEff !== undefined && transEff !== null) {
    if (typeof transEff === 'number') {
      hasTrans = transEff > 0;
      transDisplay = transEff;
    } else if (typeof transEff === 'object') {
      const typ = String(transEff.type || '').toLowerCase();
      const amt = transEff.amount !== undefined && transEff.amount !== null ? Number(String(transEff.amount).replace(/,/g, '')) : NaN;
      hasTrans = !Number.isNaN(amt) && amt > 0;
      if (typ === 'percentage' || typ === 'percent' || typ === '%') {
        transDisplay = `${amt}%`;
        transType = '%';
      } else {
        transDisplay = amt;
        transType = (transEff as { type?: string }).type || 'Transaction';
      }
    }
  }

  const bonus = af?.bonusAmount ?? af?.bonus;
  const hasBonus = bonus !== undefined && bonus !== null && Number(bonus) !== 0;

  let bonusConditionStr = '';
  if (comm.minimumVolume?.amount) {
    const unit = String(comm.minimumVolume?.unit || '').toUpperCase();
    const translatedUnit = unit === 'CALLS' || unit === 'APPELS' ? 'APPELS' :
      unit === 'TRANSACTIONS' ? 'TRANSACTIONS' :
        unit === 'SALES' || unit === 'VENTES' ? 'VENTES' : unit;
    bonusConditionStr = `POUR ${comm.minimumVolume.amount} ${translatedUnit}`;
  }

  const bonusPeriodRaw = comm.bonusPeriod || comm.bonusType || comm.minimumVolume?.period || '';
  let bonusPeriodStr = 'BONUS';
  if (bonusPeriodRaw) {
    const p = String(bonusPeriodRaw).toLowerCase();
    if (p.includes('month') || p.includes('mois')) bonusPeriodStr = 'BONUS / MOIS';
    else if (p.includes('week') || p.includes('semaine')) bonusPeriodStr = 'BONUS / SEMAINE';
    else if (p.includes('day') || p.includes('jour')) bonusPeriodStr = 'BONUS / JOUR';
    else bonusPeriodStr = `BONUS / ${bonusPeriodRaw}`.toUpperCase();
  }

  if (bonusConditionStr) {
    bonusPeriodStr = bonusPeriodStr.replace('BONUS', `BONUS ${bonusConditionStr}`);
  }

  if (!hasCall && !hasTrans && !hasBonus) {
    const base = af?.baseAmount;
    if (base && base != 0 && base != '0') {
      return (
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50/80 text-blue-700 rounded-xl border border-blue-100 shadow-sm">
            <BadgeEuro className="w-4 h-4 opacity-70" />
            <span className="font-black text-sm">{base}{currencySymbol}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">/yr base</span>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {hasCall && (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg border border-cyan-400 shadow-[0_2px_12px_-2px_rgba(6,182,212,0.5)] animate-shine animate-pulse-ring animate-border-flash animate-tilt" title="Commission par appel">
          <Phone className="w-3.5 h-4 fill-white animate-float" />
          <div className="flex flex-col leading-none">
            <span className="font-black text-xs">{perCall}{currencySymbol}</span>
            <span className="text-[8px] font-bold uppercase tracking-wider opacity-90">/ appel</span>
          </div>
        </div>
      )}

      {hasTrans && (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg border border-violet-400 shadow-[0_2px_12px_-2px_rgba(139,92,246,0.5)] animate-shine animate-pulse-ring animate-border-flash animate-tilt" title="Commission par transaction">
          <Briefcase className="w-3.5 h-3.5 fill-white animate-float" />
          <div className="flex flex-col leading-none">
            <span className="font-black text-xs">{transType === '%' ? transDisplay : `${transDisplay}${currencySymbol}`}</span>
            <span className="text-[8px] font-bold uppercase tracking-wider opacity-90">/ {transType === '%' ? 'Transaction' : transType}</span>
          </div>
        </div>
      )}

      {hasBonus && (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-lg border border-pink-400 shadow-[0_2px_12px_-2px_rgba(244,63,94,0.5)] animate-shine animate-pulse-ring animate-border-flash animate-tilt" title="Bonus">
          <Sparkles className="w-3.5 h-3.5 fill-white animate-wiggle" />
          <div className="flex flex-col leading-none">
            <span className="font-black text-xs">+{bonus}{String(bonus).includes('€') ? '' : currencySymbol}</span>
            <span className="text-[8px] font-bold uppercase tracking-wider opacity-90">{bonusPeriodStr}</span>
          </div>
        </div>
      )}
    </div>
  );
};



// Interface pour les gigs populés
interface PopulatedGig {
  _id: string;
  title: string;
  description: string;
  category: string;
  userId: {
    _id: string;
    email: string;
    fullName: string;
    phone?: string;
    linkedInId?: string;
    isVerified: boolean;
    verificationCode?: {
      code?: string;
      expiresAt?: Date;
      otp?: number;
      otpExpiresAt?: Date;
    };
    ipHistory: Array<{
      ip: string;
      timestamp: Date;
      action: 'register' | 'login';
      locationInfo: {
        location?: string;
        region?: string;
        city?: string;
        isp?: string;
        postal?: string;
        coordinates?: string;
      };
    }>;
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
      name: string;
      offset: string;
      abbreviation: string;
      zoneName?: string;
      countryName?: string;
      description?: string;
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

  // 💰 Commission
  commission: {
    commission_per_call: number;
    bonusAmount?: string | number;
    currency: {
      _id: string;
      code?: string;
      symbol?: string;
      name?: string;
    } | string;
    minimumVolume: {
      amount: string | number;
      period: string;
      unit: string;
    };
    transactionCommission?: number | {
      type: string;
      amount: string | number;
    };
    additionalDetails?: string;
    // Legacy fields for backward compatibility
    baseAmount?: string | number;
    bonus?: string | number;
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
    territories: string[];
  };

  // 📖 Documentation
  documentation: {
    product?: Array<{ name: string; url: string }>;
    process?: Array<{ name: string; url: string }>;
    training?: Array<{ name: string; url: string }>;
  };

  // 👥 Agents enrolled/invited/requested
  agents?: Array<{
    agentId: string;
    status: 'enrolled' | 'invited' | 'requested' | 'pending';
    enrollmentDate?: Date | string;
    invitationDate?: Date | string;
    updatedAt?: Date | string;
    _id?: string;
  }>;

  status: 'to_activate' | 'active' | 'inactive' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

// Interface pour les enrollments invités
interface InvitedEnrollment {
  id: string;
  gig: PopulatedGig;
  enrollmentStatus: string;
  invitationSentAt: string;
  invitationExpiresAt: string;
  isExpired: boolean;
  canEnroll: boolean;
  notes?: string;
  matchScore?: number | null;
  matchStatus?: string | null;
}

// Interface pour les gigs inscrits
interface EnrolledGig {
  id: string;
  gig: PopulatedGig;
  matchScore?: number;
  enrollmentDate: string;
  status: string;
}

export function GigsMarketplace() {
  const { t, i18n } = useTranslation();
  const isFrMarket = (i18n.language || 'en').slice(0, 2) === 'fr';
  const navigate = useNavigate();
  const agentId = getAgentId();

  const [activeTab, setActiveTab] = useState<'available' | 'enrolled' | 'favorite' | 'invited'>('available');
  const [gigs, setGigs] = useState<PopulatedGig[]>([]);
  const [invitedEnrollments, setInvitedEnrollments] = useState<InvitedEnrollment[]>([]);
  const [enrolledGigs, setEnrolledGigs] = useState<EnrolledGig[]>([]);
  const [pendingRequests, setPendingRequests] = useState<string[]>([]); // IDs des gigs avec demandes en attente
  const [enrolledGigIds, setEnrolledGigIds] = useState<string[]>([]); // IDs des gigs inscrits depuis le profil
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [gigsPerPage] = useState(9);
  const [sortBy] = useState<'latest' | 'salary' | 'experience'>('latest');
  const [favoriteGigs, setFavoriteGigs] = useState<string[]>([]);
  const [applyingGigId, setApplyingGigId] = useState<string | null>(null);
  const [respondingInvitation, setRespondingInvitation] = useState<{ gigId: string; action: 'accept' | 'reject' } | null>(null);
  const [applicationMessage, setApplicationMessage] = useState<{ gigId: string; message: string; type: 'success' | 'error' } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Affiche un message flottant (toast) qui disparaît automatiquement.
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  };
  const [expandedActivities, setExpandedActivities] = useState<Record<string, boolean>>({});
  const [expandedIndustries, setExpandedIndustries] = useState<Record<string, boolean>>({});

  // Whether the rep already published their profile (`status === 'completed'`).
  // Read from the cached profile so the onboarding banner doesn't keep showing
  // the "Publish my profile" button after the rep has already published.
  const [isProfilePublished, setIsProfilePublished] = useState<boolean>(() => {
    try {
      const cached = localStorage.getItem('profileData');
      return cached ? JSON.parse(cached)?.status === 'completed' : false;
    } catch {
      return false;
    }
  });
  const [profileGigEngaged, setProfileGigEngaged] = useState<boolean>(() => {
    try {
      const cached = localStorage.getItem('profileData');
      return cached ? hasRepGigEngagement(JSON.parse(cached)) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await fetchProfileFromAPI();
        if (!cancelled && profile) {
          setIsProfilePublished(profile.status === 'completed');
          setProfileGigEngaged(hasRepGigEngagement(profile));
        }
      } catch {
        // keep the cached value on failure
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSmartStart = (gigId: string) => {
    navigate(`/workspace?tab=copilot&gigId=${encodeURIComponent(gigId)}`, { state: { gigId } });
  };

  const goToCompanyProfile = (gig: PopulatedGig) => {
    const company = gig.companyId as unknown as CompanyProfileData | undefined;
    if (!company?._id) return;
    persistCompanyProfile(company._id, company);
    persistCompanyReturnGig(company._id, gig._id);
    navigate(`/company/${company._id}?gigId=${encodeURIComponent(gig._id)}`, {
      state: { company, fromGigId: gig._id },
    });
  };

  // Fonction pour obtenir le statut d'un gig pour l'agent connecté
  const getGigStatus = (gigId: string): 'enrolled' | 'invited' | 'pending' | 'none' => {
    const agentId = getAgentId();
    if (!agentId) return 'none';

    // Log pour déboguer
    console.log(`🔍 getGigStatus for gig ${gigId}:`, {
      enrolledGigIds: enrolledGigs.map(eg => eg.gig._id),
      enrolledGigIdsFromProfile: enrolledGigIds,
      invitedGigIds: invitedEnrollments.map(ie => ie.gig._id),
      pendingGigIds: pendingRequests,
      gigId
    });

    // 1. Vérifier d'abord les données du profil (plus fiables)
    if (enrolledGigIds.includes(gigId)) {
      console.log(`✅ Gig ${gigId} is ENROLLED (from profile)`);
      return 'enrolled';
    }

    if (pendingRequests.includes(gigId)) {
      console.log(`⏳ Gig ${gigId} is PENDING (from profile)`);
      return 'pending';
    }

    // 2. Vérifier les données du gig directement (si disponible)
    const currentGig = gigs.find(g => g._id === gigId);
    if (currentGig && currentGig.agents && Array.isArray(currentGig.agents)) {
      const agentInGig = currentGig.agents.find((agent: any) => agent.agentId === agentId);
      if (agentInGig) {
        if (agentInGig.status === 'enrolled') {
          console.log(`✅ Gig ${gigId} is ENROLLED (from gig.agents)`);
          return 'enrolled';
        }
        if (agentInGig.status === 'invited') {
          console.log(`📨 Gig ${gigId} is INVITED (from gig.agents)`);
          return 'invited';
        }
        if (agentInGig.status === 'requested' || agentInGig.status === 'pending') {
          console.log(`⏳ Gig ${gigId} is PENDING/REQUESTED (from gig.agents)`);
          return 'pending';
        }
      }
    }

    // 3. Vérifier les données des API (fallback)
    const enrolledGig = enrolledGigs.find(eg => eg.gig._id === gigId);
    if (enrolledGig) {
      console.log(`✅ Gig ${gigId} is ENROLLED (from API)`);
      return 'enrolled';
    }

    // Vérifier si le gig est dans les invitations
    const invitedGig = invitedEnrollments.find(ie => ie.gig._id === gigId);
    if (invitedGig) {
      console.log(`📨 Gig ${gigId} is INVITED`);
      return 'invited';
    }

    console.log(`❌ Gig ${gigId} has NO STATUS`);
    return 'none';
  };

  // Fonction pour rafraîchir tous les statuts (à exporter pour GigDetails)
  const refreshAllStatuses = async () => {
    const agentId = getAgentId();
    if (agentId) {
      await Promise.all([
        fetchFavorites(),
        fetchInvitedEnrollments(),
        fetchEnrolledGigs(),
        fetchPendingRequests()
      ]);
    }
  };

  // Fonction pour récupérer les favoris
  const fetchFavorites = async () => {
    const agentId = getAgentId();
    const token = getAuthToken();
    if (!agentId || !token) {
      console.error('Agent ID or token not found');
      return;
    }

    try {
      const response = await fetch(repApiUrl(`/profiles/${agentId}/favorites`), {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) throw new Error('Failed to fetch favorites');
      const data = await response.json();
      console.log('Favorites response:', data);

      // Assurons-nous que nous avons un tableau de favoris
      if (Array.isArray(data)) {
        // Si la réponse est un tableau direct
        const favoriteIds = data.map((fav: { _id: string }) => fav._id);
        console.log('Favorite IDs:', favoriteIds);
        setFavoriteGigs(favoriteIds);
      } else if (data.data && Array.isArray(data.data)) {
        // Si la réponse a une propriété data qui est un tableau
        const favoriteIds = data.data.map((fav: { _id: string }) => fav._id);
        console.log('Favorite IDs:', favoriteIds);
        setFavoriteGigs(favoriteIds);
      } else {
        console.error('Unexpected favorites data structure:', data);
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  // Fonction pour ajouter aux favoris
  const addToFavorites = async (gigId: string) => {
    const agentId = getAgentId();
    const token = getAuthToken();
    if (!agentId || !token) {
      console.error('Agent ID or token not found');
      return;
    }

    console.log('🔄 Adding to favorites:', gigId);
    console.log('📋 Current favoriteGigs:', favoriteGigs);
    console.log('🔗 API URL:', repApiUrl(`/profiles/${agentId}/favorites/${gigId}`));

    try {
      const response = await fetch(repApiUrl(`/profiles/${agentId}/favorites/${gigId}`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      console.log('📡 Add to favorites response:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to add to favorites:', errorText);
        throw new Error('Failed to add to favorites');
      }

      console.log('✅ Successfully added to favorites');
      setFavoriteGigs(prev => [...prev, gigId]);
      console.log('📋 Updated favoriteGigs:', [...favoriteGigs, gigId]);
    } catch (error) {
      console.error('Error adding to favorites:', error);
    }
  };

  // Fonction pour supprimer des favoris
  const removeFromFavorites = async (gigId: string) => {
    const agentId = getAgentId();
    const token = getAuthToken();
    if (!agentId || !token) {
      console.error('Agent ID or token not found');
      return;
    }

    console.log('🗑️ Removing from favorites:', gigId);
    console.log('📋 Current favoriteGigs:', favoriteGigs);
    console.log('🔗 API URL:', repApiUrl(`/profiles/${agentId}/favorites/${gigId}`));

    try {
      const response = await fetch(repApiUrl(`/profiles/${agentId}/favorites/${gigId}`), {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      console.log('📡 Remove from favorites response:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to remove from favorites:', errorText);
        throw new Error('Failed to remove from favorites');
      }

      console.log('✅ Successfully removed from favorites');
      setFavoriteGigs(prev => prev.filter(id => id !== gigId));
      console.log('📋 Updated favoriteGigs:', favoriteGigs.filter(id => id !== gigId));
    } catch (error) {
      console.error('Error removing from favorites:', error);
    }
  };

  // Fonction pour accepter une invitation
  const acceptInvitation = async (enrollmentId: string) => {
    const token = getAuthToken();
    if (!token) {
      console.error('❌ Token not found');
      showToast('Authentification requise. Veuillez vous reconnecter.', 'error');
      return;
    }

    // Récupérer l'ID du gig avant de retirer l'invitation, pour la MAJ optimiste.
    const acceptedGigId = invitedEnrollments.find(e => e.id === enrollmentId)?.gig?._id || null;

    console.log('🔄 Accepting invitation:', enrollmentId);
    console.log('🔗 API URL:', `${import.meta.env.VITE_MATCHING_API_URL}/gig-agents/invitations/${enrollmentId}/accept`);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_MATCHING_API_URL}/gig-agents/invitations/${enrollmentId}/accept`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('📡 Accept response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to accept invitation:', errorText);
        showToast('Échec de l\'acceptation de l\'invitation.', 'error');
        throw new Error(`Failed to accept invitation: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Invitation accepted successfully:', result);

      // MAJ optimiste : retirer de la liste des invitations et marquer comme enrolled.
      setInvitedEnrollments(prev => prev.filter(enrollment => enrollment.id !== enrollmentId));
      if (acceptedGigId) {
        setEnrolledGigIds(prev => (prev.includes(acceptedGigId) ? prev : [...prev, acceptedGigId]));
      }

      showToast('Invitation acceptée ! Vous êtes maintenant inscrit à ce gig.', 'success');

      // Rafraîchir tous les statuts pour mettre à jour l'UI
      console.log('🔄 Refreshing all statuses after acceptance...');
      await Promise.all([
        fetchEnrolledGigs(),           // Recharger les gigs enrolled
        fetchEnrolledGigIdsFromProfile(), // Mettre à jour les IDs du profil
        fetchInvitedEnrollments(),     // Recharger les invitations (au cas où)
        fetchPendingRequests()         // Mettre à jour les pending requests
      ]);
      console.log('✅ All statuses refreshed');
    } catch (error) {
      console.error('❌ Error accepting invitation:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
    }
  };

  // Fonction pour rejeter une invitation
  const rejectInvitation = async (enrollmentId: string) => {
    const token = getAuthToken();
    if (!token) {
      console.error('❌ Token not found');
      showToast('Authentification requise. Veuillez vous reconnecter.', 'error');
      return;
    }

    console.log('🔄 Rejecting invitation:', enrollmentId);
    console.log('🔗 API URL:', `${import.meta.env.VITE_MATCHING_API_URL}/gig-agents/invitations/${enrollmentId}/reject`);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_MATCHING_API_URL}/gig-agents/invitations/${enrollmentId}/reject`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('📡 Reject response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to reject invitation:', errorText);
        showToast('Échec du refus de l\'invitation.', 'error');
        throw new Error(`Failed to reject invitation: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Invitation rejected successfully:', result);
      showToast('Invitation refusée.', 'success');

      // Retirer immédiatement l'invitation de la liste (UI optimiste)
      setInvitedEnrollments((prev: any[]) => prev.filter(enrollment => enrollment.id !== enrollmentId));

      // Rafraîchir tous les statuts pour mettre à jour l'UI
      console.log('🔄 Refreshing all statuses after rejection...');
      await Promise.all([
        fetchInvitedEnrollments(),     // Recharger les invitations
        fetchEnrolledGigIdsFromProfile(), // Mettre à jour les IDs du profil
        fetchPendingRequests()         // Mettre à jour les pending requests
      ]);
      console.log('✅ All statuses refreshed');
    } catch (error) {
      console.error('❌ Error rejecting invitation:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
    }
  };

  // Retrouve l'ID de l'invitation (enrollment) à partir de l'ID du gig
  const getEnrollmentIdForGig = (gigId: string): string | null => {
    const match = invitedEnrollments.find(ie => ie.gig?._id === gigId);
    return match?.id || null;
  };

  // Accepter une invitation directement depuis une carte (onglet "available")
  const handleAcceptFromCard = async (gigId: string) => {
    const enrollmentId = getEnrollmentIdForGig(gigId);
    if (!enrollmentId) {
      console.error('❌ Enrollment introuvable pour le gig', gigId);
      return;
    }
    setRespondingInvitation({ gigId, action: 'accept' });
    try {
      await acceptInvitation(enrollmentId);
    } finally {
      setRespondingInvitation(null);
    }
  };

  // Refuser une invitation directement depuis une carte (onglet "available")
  const handleRejectFromCard = async (gigId: string) => {
    const enrollmentId = getEnrollmentIdForGig(gigId);
    if (!enrollmentId) {
      console.error('❌ Enrollment introuvable pour le gig', gigId);
      return;
    }
    setRespondingInvitation({ gigId, action: 'reject' });
    try {
      await rejectInvitation(enrollmentId);
    } finally {
      setRespondingInvitation(null);
    }
  };

  // Fonction pour postuler à un gig
  const handleApplyToGig = async (gigId: string) => {
    const agentId = getAgentId();
    const token = getAuthToken();

    if (!agentId || !token) {
      setApplicationMessage({ gigId, message: 'You must be logged in to apply', type: 'error' });
      return;
    }

    setApplyingGigId(gigId);
    setApplicationMessage(null);

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
            notes: "I am very interested in this project and have relevant experience."
          }),
        }
      );

      console.log('📡 Application response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Application failed:', errorText);

        // Si l'erreur indique que le gig est déjà en attente, rafraîchir le statut
        if (response.status === 400 && errorText.includes('Cannot request enrollment for this gig at this time')) {
          console.log('⏳ Gig is already pending, refreshing status...');
          setApplicationMessage({ gigId, message: 'This gig is already pending', type: 'success' });
          setProfileGigEngaged(true);

          // Rafraîchir tous les statuts
          await Promise.all([
            fetchPendingRequests(),
            fetchEnrolledGigIdsFromProfile()
          ]);

          showToast(
            isFrMarket
              ? 'Candidature en attente — publiez votre profil pour continuer.'
              : 'Application pending — publish your profile to continue.',
            'success'
          );

          return;
        }

        throw new Error(`Application failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Application successful:', data);

      setApplicationMessage({ gigId, message: 'Application sent successfully!', type: 'success' });
      setProfileGigEngaged(true);

      // Rafraîchir tous les statuts pour mettre à jour l'UI
      await Promise.all([
        fetchPendingRequests(),
        fetchEnrolledGigIdsFromProfile(),
        fetchInvitedEnrollments(),
        fetchEnrolledGigs()
      ]);

      showToast(
        isFrMarket
          ? 'Candidature envoyée ! Prochaine étape : publier votre profil.'
          : 'Application sent! Next step: publish your profile.',
        'success'
      );

      // Effacer le message après 3 secondes
      setTimeout(() => {
        setApplicationMessage(null);
      }, 3000);

    } catch (err) {
      console.error('❌ Error applying to gig:', err);
      setApplicationMessage({
        gigId,
        message: err instanceof Error ? err.message : 'Error during application',
        type: 'error'
      });

      // Effacer le message d'erreur après 3 secondes
      setTimeout(() => {
        setApplicationMessage(null);
      }, 3000);
    } finally {
      setApplyingGigId(null);
    }
  };

  // Fonction pour récupérer les demandes en attente (pending requests)
  const fetchPendingRequests = async () => {
    console.log('🔍 Starting fetchPendingRequests...');
    try {
      const pendingGigIds = await fetchPendingRequestsUtil();
      console.log('✅ fetchPendingRequests completed, setting pendingRequests:', pendingGigIds);

      // FIX FLICKERING: Merge optimistic state
      let finalPendingIds = pendingGigIds;
      if (applicationMessage?.type === 'success' && applicationMessage?.gigId && !pendingGigIds.includes(applicationMessage.gigId)) {
        console.log('🛡️ Merging optimistic pending gigId into fetched results to prevent flicker');
        finalPendingIds = [...pendingGigIds, applicationMessage.gigId];
      }

      setPendingRequests(finalPendingIds);
    } catch (error) {
      console.error('❌ Error in fetchPendingRequests:', error);
      setPendingRequests([]);
    }
  };

  // Fonction pour récupérer les gigs inscrits depuis le profil
  const fetchEnrolledGigIdsFromProfile = async () => {
    console.log('🔍 Starting fetchEnrolledGigIdsFromProfile...');
    try {
      const enrolledIds = await fetchEnrolledGigsFromProfile();
      console.log('✅ fetchEnrolledGigIdsFromProfile completed, setting enrolledGigIds:', enrolledIds);
      setEnrolledGigIds(enrolledIds);
    } catch (error) {
      console.error('❌ Error in fetchEnrolledGigIdsFromProfile:', error);
      setEnrolledGigIds([]);
    }
  };

  // Fonction pour récupérer les gigs inscrits avec données complètes
  const fetchEnrolledGigs = async () => {
    const agentId = getAgentId();
    const token = getAuthToken();
    if (!agentId || !token) {
      console.error('Agent ID or token not found');
      return;
    }

    try {
      console.log('🔍 Fetching enrolled gigs for agent:', agentId);
      // Utiliser le nouvel endpoint /gig-agents/agents/{agentId}/gigs?status=enrolled
      const enrollmentResponse = await fetch(
        `${import.meta.env.VITE_MATCHING_API_URL}/gig-agents/agents/${agentId}/gigs?status=enrolled`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!enrollmentResponse.ok) {
        throw new Error('Failed to fetch enrolled gigs');
      }

      const enrollmentData = await enrollmentResponse.json();
      console.log('📝 Enrolled gigs raw response:', enrollmentData);
      console.log('📊 Response count:', enrollmentData.count);

      // La réponse contient un objet avec la propriété 'gigs'
      if (enrollmentData.gigs && Array.isArray(enrollmentData.gigs)) {
        console.log('✅ Response has gigs array, processing enrollments...');
        console.log('🔍 First enrollment structure:', enrollmentData.gigs[0]);

        // Transformer les données pour correspondre à l'interface EnrolledGig
        const transformedEnrollments = enrollmentData.gigs
          .filter((gigEnrollment: any) => {
            console.log('🔍 Checking enrollment:', gigEnrollment.gig?._id);
            return gigEnrollment.gig; // Filtrer les enrollments sans gig
          })
          .map((gigEnrollment: any) => {
            console.log('🔄 Transforming enrollment:', gigEnrollment.gig._id);

            // ✅ Extraire le gigAgentId depuis gig.agents[]
            const agentId = getAgentId();
            const agentData = gigEnrollment.gig.agents?.find((agent: any) =>
              agent.agentId === agentId || agent.agentId?.$oid === agentId
            );
            const enrollmentId = agentData?.gigAgentId || agentData?.gigAgentId?.$oid;

            console.log('🆔 Agent data from gig.agents:', agentData);
            console.log('✅ Extracted gigAgentId:', enrollmentId);

            return {
              id: enrollmentId, // ✅ Utiliser l'ID du document GigAgent (enrollmentId)
              gig: {
                _id: gigEnrollment.gig._id,
                title: gigEnrollment.gig.title,
                description: gigEnrollment.gig.description,
                category: gigEnrollment.gig.category,
                destination_zone: gigEnrollment.gig.destination_zone,
                // Copier toutes les autres propriétés du gig (déjà populées)
                ...gigEnrollment.gig
              },
              enrollmentStatus: gigEnrollment.status, // 'enrolled'
              enrollmentDate: gigEnrollment.enrollmentDate,
              enrollmentNotes: gigEnrollment.enrollmentNotes,
              status: gigEnrollment.status,
              matchScore: 0, // Pas de match score dans cette réponse
              matchStatus: 'enrolled'
            };
          });

        console.log('✅ Transformed enrolled gigs:', transformedEnrollments);
        console.log('📊 Final count:', transformedEnrollments.length);
        setEnrolledGigs(transformedEnrollments);
      } else {
        console.error('❌ Invalid enrolled gigs data structure:', enrollmentData);
        setEnrolledGigs([]);
      }
    } catch (error) {
      console.error('❌ Error fetching enrolled gigs:', error);
      setEnrolledGigs([]);
    }
  };

  // Fonction pour récupérer les enrollments invités avec données complètes des gigs
  const fetchInvitedEnrollments = async () => {
    const agentId = getAgentId();
    const token = getAuthToken();
    if (!agentId || !token) {
      console.error('Agent ID or token not found');
      return;
    }

    try {
      // Utiliser le nouvel endpoint /gig-agents/agents/{agentId}/gigs?status=invited
      const enrollmentResponse = await fetch(
        `${import.meta.env.VITE_MATCHING_API_URL}/gig-agents/agents/${agentId}/gigs?status=invited`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!enrollmentResponse.ok) {
        throw new Error('Failed to fetch invited enrollments');
      }

      const enrollmentData = await enrollmentResponse.json();
      console.log('📋 Invited enrollments response:', enrollmentData);
      console.log('📊 Response count:', enrollmentData.count);
      console.log('🔍 RAW RESPONSE DATA:', JSON.stringify(enrollmentData, null, 2));

      // La réponse contient un objet avec la propriété 'gigs'
      if (enrollmentData.gigs && Array.isArray(enrollmentData.gigs)) {
        console.log('✅ Found invited enrollments:', enrollmentData.gigs.length);
        if (enrollmentData.gigs.length > 0) {
          console.log('🔍 First invited enrollment structure:', JSON.stringify(enrollmentData.gigs[0], null, 2));
          console.log('🔍 First gig structure:', enrollmentData.gigs[0].gig);
          console.log('🆔 Checking IDs in first enrollment:');
          console.log('   - _id:', enrollmentData.gigs[0]._id);
          console.log('   - id:', enrollmentData.gigs[0].id);
          console.log('   - gigAgentId:', enrollmentData.gigs[0].gigAgentId);
          console.log('🏢 CompanyId:', enrollmentData.gigs[0].gig?.companyId);
          console.log('🏭 Industries:', enrollmentData.gigs[0].gig?.industries);
          console.log('📊 Activities:', enrollmentData.gigs[0].gig?.activities);
        }

        // Transformer les données pour correspondre à l'interface InvitedEnrollment
        const transformedInvitations = enrollmentData.gigs
          .filter((gigInvitation: any) => {
            console.log('🔍 Checking invitation:', gigInvitation.gig?._id);
            return gigInvitation.gig; // Filtrer les invitations sans gig
          })
          .map((gigInvitation: any) => {
            console.log('🔄 Transforming invitation:', gigInvitation.gig._id);

            // ✅ Extraire le gigAgentId depuis gig.agents[]
            const agentId = getAgentId();
            const agentData = gigInvitation.gig.agents?.find((agent: any) =>
              agent.agentId === agentId || agent.agentId?.$oid === agentId
            );
            const enrollmentId = agentData?.gigAgentId || agentData?.gigAgentId?.$oid;

            console.log('🆔 Agent data from gig.agents:', agentData);
            console.log('✅ Extracted gigAgentId:', enrollmentId);

            // Calculer l'expiration basée sur invitationDate + 7 jours (par exemple)
            const invitationDate = new Date(gigInvitation.invitationDate || gigInvitation.updatedAt);
            const expirationDate = new Date(invitationDate);
            expirationDate.setDate(expirationDate.getDate() + 7); // 7 jours pour répondre

            return {
              id: enrollmentId, // ✅ Utiliser l'ID du document GigAgent (enrollmentId)
              gig: {
                _id: gigInvitation.gig._id,
                title: gigInvitation.gig.title,
                description: gigInvitation.gig.description,
                category: gigInvitation.gig.category,
                destination_zone: gigInvitation.gig.destination_zone,
                // Copier toutes les autres propriétés du gig (déjà populées)
                ...gigInvitation.gig
              },
              enrollmentStatus: gigInvitation.status, // 'invited'
              invitationSentAt: gigInvitation.invitationDate || gigInvitation.updatedAt,
              invitationExpiresAt: expirationDate.toISOString(),
              isExpired: new Date() > expirationDate,
              canEnroll: gigInvitation.status === 'invited',
              notes: gigInvitation.notes,
              matchScore: 0, // Pas de match score dans cette réponse
              matchStatus: 'invited'
            };
          });

        console.log('✅ Transformed invited enrollments:', transformedInvitations);
        setInvitedEnrollments(transformedInvitations);
      } else {
        console.error('Invalid invited enrollments data structure:', enrollmentData);
        setInvitedEnrollments([]);
      }
    } catch (error) {
      console.error('Error fetching invited enrollments:', error);
      setInvitedEnrollments([]);
    }
  };

  useEffect(() => {
    console.log('Component mounted, fetching data...');
    const fetchGigs = async () => {
      try {
        const url = `${import.meta.env.VITE_BACKEND_URL_GIGS}/gigs/active`;
        console.log('🌐 Fetching active gigs from:', url);
        console.log('🔧 Environment variables:', {
          VITE_BACKEND_URL_GIGS: import.meta.env.VITE_BACKEND_URL_GIGS,
          NODE_ENV: import.meta.env.NODE_ENV
        });

        const response = await fetch(url);

        console.log('📡 Response status:', response.status, response.statusText);
        console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ API Error Response:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
            url: url
          });

          // Si l'endpoint /gigs/active ne fonctionne pas, essayer l'ancien endpoint
          console.log('⚠️ Trying fallback to /gigs endpoint...');
          const fallbackResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL_GIGS}/gigs`);

          if (!fallbackResponse.ok) {
            const fallbackErrorText = await fallbackResponse.text();
            console.error('❌ Fallback API Error:', {
              status: fallbackResponse.status,
              statusText: fallbackResponse.statusText,
              body: fallbackErrorText
            });
            throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
          }

          console.log('✅ Fallback endpoint working, using /gigs');
          const fallbackData = await fallbackResponse.json();
          console.log('🔍 Received gigs data from fallback:', fallbackData);

          if (!fallbackData.data || !Array.isArray(fallbackData.data)) {
            console.error('❌ Invalid fallback data structure:', fallbackData);
            throw new Error('Invalid data structure received from fallback API');
          }

          // Filtrer pour ne garder que les gigs actifs
          const activeGigs = fallbackData.data.filter((gig: PopulatedGig) => gig.status === 'active');
          console.log('🎯 Filtered active gigs:', activeGigs.length, 'out of', fallbackData.data.length);

          // Log de la structure comme avant
          if (activeGigs.length > 0) {
            const firstGig = activeGigs[0];
            console.log('📊 STRUCTURE DU PREMIER GIG (FALLBACK):', {
              id: firstGig._id,
              title: firstGig.title,
              companyId: firstGig.companyId,
              industries: firstGig.industries,
              skills: firstGig.skills,
              availability: firstGig.availability,
              status: firstGig.status,
              fullGig: firstGig
            });
          }

          setGigs(activeGigs);
          return;
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('❌ Invalid content type:', contentType);
          console.error('Response body:', text);
          throw new Error('Invalid response format: Expected JSON but got ' + contentType);
        }

        const data = await response.json();
        console.log('🔍 Received active gigs data:', data);

        if (!data.data || !Array.isArray(data.data)) {
          console.error('❌ Invalid data structure:', data);
          throw new Error('Invalid data structure received from API');
        }

        // Log détaillé de la structure des gigs
        if (data.data.length > 0) {
          const firstGig = data.data[0];
          console.log('📊 STRUCTURE DU PREMIER GIG:', {
            id: firstGig._id,
            title: firstGig.title,
            companyId: firstGig.companyId,
            industries: firstGig.industries,
            skills: firstGig.skills,
            availability: firstGig.availability,
            fullGig: firstGig
          });

          // Log spécifique pour les skills
          if (firstGig.skills) {
            console.log('🛠️ SKILLS STRUCTURE:', {
              technical: firstGig.skills.technical,
              professional: firstGig.skills.professional,
              soft: firstGig.skills.soft,
              languages: firstGig.skills.languages
            });

            // Log d'un skill technique si disponible
            if (firstGig.skills.technical && firstGig.skills.technical.length > 0) {
              console.log('🔧 PREMIER SKILL TECHNIQUE:', firstGig.skills.technical[0]);
            }

            // Log d'une langue si disponible
            if (firstGig.skills.languages && firstGig.skills.languages.length > 0) {
              console.log('🗣️ PREMIÈRE LANGUE:', firstGig.skills.languages[0]);
            }
          }

          // Log spécifique pour les industries
          if (firstGig.industries) {
            console.log('🏭 INDUSTRIES STRUCTURE:', firstGig.industries);
            if (firstGig.industries.length > 0) {
              console.log('🏢 PREMIÈRE INDUSTRIE:', firstGig.industries[0]);
            }
          }

          // Log de la company
          if (firstGig.companyId) {
            console.log('🏬 COMPANY STRUCTURE:', firstGig.companyId);
          }
        }

        setGigs(data.data);
      } catch (error) {
        console.error('Error fetching gigs:', error);
        setError(error instanceof Error ? error.message : "Impossible de récupérer les gigs.");
      } finally {
        setLoading(false);
      }
    };

    fetchGigs();

    // Fetch favorites, invited enrollments and enrolled gigs when component mounts
    const agentId = getAgentId();
    if (agentId) {
      fetchFavorites();
      fetchInvitedEnrollments();
      fetchEnrolledGigs();
      fetchPendingRequests();
      fetchEnrolledGigIdsFromProfile(); // Nouveau : récupérer les statuts depuis le profil
    }

    // Écouter les événements de rafraîchissement des statuts
    const handleRefreshStatuses = () => {
      console.log('🔄 Refreshing gig statuses...');
      if (agentId) {
        fetchFavorites();
        fetchInvitedEnrollments();
        fetchEnrolledGigs();
        fetchPendingRequests();
        fetchEnrolledGigIdsFromProfile(); // Nouveau : rafraîchir aussi les statuts du profil
      }
    };

    window.addEventListener('refreshGigStatuses', handleRefreshStatuses);

    // Cleanup
    return () => {
      window.removeEventListener('refreshGigStatuses', handleRefreshStatuses);
    };
  }, [applicationMessage]);

  // Live status sync: a rep's gig can flip from `requested` → `enrolled` the
  // moment the company approves. The matching backend has no socket channel,
  // so we keep statuses fresh by (1) polling on an interval and (2) refetching
  // whenever the rep returns to the tab/window. This makes the "PENDING" badge
  // update to "Enrolled" without a manual page reload.
  useEffect(() => {
    const agentId = getAgentId();
    if (!agentId) return;

    const refreshStatuses = () => {
      fetchInvitedEnrollments();
      fetchEnrolledGigs();
      fetchPendingRequests();
      fetchEnrolledGigIdsFromProfile();
      // Re-derive publish / onboarding state from the freshest profile.
      fetchProfileFromAPI()
        .then((profile) => {
          if (profile) {
            setIsProfilePublished(profile.status === 'completed');
            setProfileGigEngaged(hasRepGigEngagement(profile));
          }
        })
        .catch(() => {});
    };

    const POLL_MS = 25000;
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') refreshStatuses();
    }, POLL_MS);

    const onFocus = () => refreshStatuses();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refreshStatuses();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter and sort gigs based on active tab
  const getFilteredAndSortedGigs = () => {
    switch (activeTab) {
      case 'available':
        return gigs
          .sort((a, b) => {
            switch (sortBy) {
              case 'salary': {
                const aVal = a.commission?.commission_per_call !== undefined ? a.commission.commission_per_call * 1000 : parseInt((a.commission?.baseAmount as any) || '0');
                const bVal = b.commission?.commission_per_call !== undefined ? b.commission.commission_per_call * 1000 : parseInt((b.commission?.baseAmount as any) || '0');
                return bVal - aVal;
              }
              case 'experience':
                return (parseInt(b.seniority?.yearsExperience || '0')) - (parseInt(a.seniority?.yearsExperience || '0'));
              case 'latest':
              default:
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
          });

      case 'enrolled':
        return enrolledGigs
          .sort((a, b) => {
            switch (sortBy) {
              case 'salary':
                // Pour les gigs inscrits, utiliser les données de base
                return 0; // Pas de tri par salaire pour les gigs inscrits
              case 'experience':
                return 0; // Pas de tri par expérience pour les gigs inscrits
              case 'latest':
              default:
                return new Date(a.enrollmentDate).getTime() - new Date(b.enrollmentDate).getTime();
            }
          });

      case 'favorite':
        return gigs
          .filter(gig => favoriteGigs.includes(gig._id))
          .sort((a, b) => {
            switch (sortBy) {
              case 'salary': {
                const aVal = a.commission?.commission_per_call !== undefined ? a.commission.commission_per_call * 1000 : parseInt((a.commission?.baseAmount as any) || '0');
                const bVal = b.commission?.commission_per_call !== undefined ? b.commission.commission_per_call * 1000 : parseInt((b.commission?.baseAmount as any) || '0');
                return bVal - aVal;
              }
              case 'experience':
                return (parseInt(b.seniority?.yearsExperience || '0')) - (parseInt(a.seniority?.yearsExperience || '0'));
              case 'latest':
              default:
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
          });

      case 'invited':
        return invitedEnrollments
          .sort((a, b) => {
            switch (sortBy) {
              case 'salary':
                return 0; // Pas de tri par salaire pour les gigs invités
              case 'experience':
                return 0; // Pas de tri par expérience pour les gigs invités
              case 'latest':
              default:
                return new Date(a.invitationSentAt).getTime() - new Date(b.invitationSentAt).getTime();
            }
          });

      default:
        return [];
    }
  };

  const filteredAndSortedGigs = getFilteredAndSortedGigs();

  // Pagination logic
  const indexOfLastGig = currentPage * gigsPerPage;
  const indexOfFirstGig = indexOfLastGig - gigsPerPage;
  const currentGigs = filteredAndSortedGigs.slice(indexOfFirstGig, indexOfLastGig);
  const totalPages = Math.ceil(filteredAndSortedGigs.length / gigsPerPage);

  // Log les gigs actuellement affichés pour debug
  console.log('🎯 GIGS ACTUELLEMENT AFFICHÉS:', {
    activeTab,
    totalGigs: gigs.length,
    totalEnrolledGigs: enrolledGigs.length,
    totalInvitedEnrollments: invitedEnrollments.length,
    filteredGigs: filteredAndSortedGigs.length,
    currentGigs: currentGigs.length,
    currentPage,
    totalPages,
    enrolledGigsData: enrolledGigs
  });



  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" variant="rounded" />
          <Skeleton className="h-20 w-full" variant="rounded" />
        </div>

        <div className="flex space-x-8 border-b border-gray-100 pb-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-6 w-24" variant="rounded" />)}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
              <div className="flex gap-4">
                <Skeleton className="w-12 h-12 rounded-xl shrink-0" variant="rounded" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-6 w-3/4" variant="rounded" />
                  <Skeleton className="h-3 w-1/4" variant="rounded" />
                </div>
              </div>
              <Skeleton className="h-12 w-full" variant="rounded" />
              <div className="space-y-2 pt-2">
                <Skeleton className="h-4 w-1/2" variant="text" />
                <Skeleton className="h-4 w-2/3" variant="text" />
                <Skeleton className="h-4 w-1/3" variant="text" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600 text-center p-4">{error}</div>;
  }

  const getCardStyleForStatus = (status: string) => {
    const baseClass = "group rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border hover:-translate-y-1 transition-all duration-300 flex flex-col h-full min-w-0";
    switch (status) {
      case 'enrolled':
        return {
          container: `${baseClass} bg-gradient-to-br from-white to-emerald-50/60 border-emerald-100 hover:border-emerald-300 hover:shadow-[0_8px_30px_-4px_rgba(16,185,129,0.15)]`,
          category: 'text-emerald-600/90 group-hover:text-emerald-600'
        };
      case 'invited':
        return {
          container: `${baseClass} bg-gradient-to-br from-white to-indigo-50/60 border-indigo-100 hover:border-indigo-300 hover:shadow-[0_8px_30px_-4px_rgba(99,102,241,0.15)]`,
          category: 'text-indigo-600/90 group-hover:text-indigo-600'
        };
      case 'pending':
        return {
          container: `${baseClass} bg-gradient-to-br from-white to-amber-50/60 border-amber-100 hover:border-amber-300 hover:shadow-[0_8px_30px_-4px_rgba(245,158,11,0.15)]`,
          category: 'text-amber-600/90 group-hover:text-amber-600'
        };
      default:
        return {
          container: `${baseClass} bg-gradient-to-br from-white to-slate-50/80 border-slate-200/60 hover:border-slate-300 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)]`,
          category: 'text-indigo-600/90 group-hover:text-indigo-600'
        };
    }
  };

  // Must match getGigStatus() — a card can show PENDING via gig.agents even when
  // pendingRequests / profile.gigs haven't synced yet.
  const hasMarketplaceGigEngagement = useMemo(() => {
    if (
      profileGigEngaged ||
      enrolledGigIds.length > 0 ||
      enrolledGigs.length > 0 ||
      pendingRequests.length > 0
    ) {
      return true;
    }

    const agentId = getAgentId();
    if (!agentId) return false;

    return gigs.some((gig) => {
      if (!gig.agents || !Array.isArray(gig.agents)) return false;
      return gig.agents.some((agent: any) => {
        const id = agent.agentId?.$oid || agent.agentId;
        if (String(id) !== String(agentId)) return false;
        return ['requested', 'enrolled', 'pending'].includes(String(agent.status || '').toLowerCase());
      });
    });
  }, [profileGigEngaged, enrolledGigIds, enrolledGigs, pendingRequests, gigs]);

  const scrollToGigGrid = () => {
    document.getElementById('rep-gig-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-6">
      {/* Toast de notification (accept / reject invitation) */}
      {toast && (
        <div className="fixed top-6 right-6 z-[200] animate-fade-in">
          <div
            className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border font-semibold text-sm max-w-sm ${toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
          >
            {toast.type === 'success' ? (
              <Check className="w-5 h-5 text-emerald-600 shrink-0" strokeWidth={3} />
            ) : (
              <X className="w-5 h-5 text-rose-600 shrink-0" strokeWidth={3} />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">{t('gigsMarketplace.title')}</h1>
          <p className="mt-2 text-gray-500 max-w-2xl text-sm leading-relaxed font-medium">
            Discover premium projects worldwide that match your unique skills and professional aspirations.<br />
            Take control of your journey, find your next exclusive mission, and start earning today.
          </p>
        </div>
      </div>

      {/* Onboarding status banner. Reaching this page means phases 1-4 are done,
          so the final phase completes once the rep applies to / enrolls in a gig. */}
      {!loading && (() => {
        if (!hasMarketplaceGigEngagement) {
          return (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl bg-yellow-50 border-2 border-yellow-300">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-yellow-600">
                    {isFrMarket ? 'Étape 5 · Place de marché' : 'Step 5 · Marketplace'}
                  </p>
                  <p className="text-sm font-black text-yellow-800 mt-0.5">
                    {isFrMarket ? 'Postulez à votre première mission' : 'Apply to your first gig'}
                  </p>
                  <p className="text-xs font-medium text-yellow-700 mt-0.5">
                    {isFrMarket
                      ? 'Choisissez un gig ci-dessous et cliquez sur « Apply Now ». Postuler suffit — l’enrôlement complet viendra après validation.'
                      : 'Pick a gig below and click « Apply Now ». Applying is enough — full enrollment comes after approval.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={scrollToGigGrid}
                className="px-5 py-2.5 rounded-2xl bg-gradient-harx text-white hover:opacity-90 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-harx-500/20 active:scale-95 whitespace-nowrap shrink-0"
              >
                {isFrMarket ? 'Voir les missions' : 'Browse gigs'}
              </button>
            </div>
          );
        }

        // Profile already published → no onboarding banner at all.
        if (isProfilePublished) {
          return null;
        }

        return (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" strokeWidth={3} />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                  {isFrMarket ? 'Prochaine étape · Profil' : 'Next step · Profile'}
                </p>
                <p className="text-sm font-black text-emerald-800 mt-0.5">
                  {isFrMarket ? 'Candidature envoyée — publiez votre profil' : 'Application sent — publish your profile'}
                </p>
                <p className="text-xs font-medium text-emerald-700 mt-0.5">
                  {isFrMarket
                    ? 'Vous avez postulé (statut Pending). Publiez votre profil pour devenir visible aux entreprises — l’onglet Inscrites restera vide tant que votre candidature n’est pas acceptée.'
                    : 'You applied (Pending status). Publish your profile to become visible — the Enrolled tab stays empty until your application is accepted.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="px-5 py-2.5 rounded-2xl bg-gradient-harx text-white hover:opacity-90 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-harx-500/20 active:scale-95 whitespace-nowrap"
            >
              {isFrMarket ? 'Publier mon profil' : 'Publish my profile'}
            </button>
          </div>
        );
      })()}

      <div className="flex space-x-8 border-b border-gray-100 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setActiveTab('available')}
          className={`px-1 py-4 text-sm font-bold transition-all relative ${activeTab === 'available'
            ? 'text-harx-600'
            : 'text-gray-400 hover:text-gray-600'
            }`}
        >
          {t('gigsMarketplace.tabs.available')}
          {activeTab === 'available' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-harx-500 rounded-full"></div>}
        </button>
        <button
          onClick={() => setActiveTab('enrolled')}
          className={`px-1 py-4 text-sm font-bold transition-all relative ${activeTab === 'enrolled'
            ? 'text-harx-600'
            : 'text-gray-400 hover:text-gray-600'
            }`}
        >
          {t('gigsMarketplace.tabs.enrolled')}
          {activeTab === 'enrolled' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-harx-500 rounded-full"></div>}
        </button>
        <button
          onClick={() => setActiveTab('favorite')}
          className={`px-1 py-4 text-sm font-bold transition-all relative ${activeTab === 'favorite'
            ? 'text-harx-600'
            : 'text-gray-400 hover:text-gray-600'
            }`}
        >
          {t('gigsMarketplace.tabs.favorite')}
          {activeTab === 'favorite' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-harx-500 rounded-full"></div>}
        </button>
        <button
          onClick={() => setActiveTab('invited')}
          className={`px-1 py-4 text-sm font-bold transition-all relative ${activeTab === 'invited'
            ? 'text-harx-600'
            : 'text-gray-400 hover:text-gray-600'
            }`}
        >
          {t('gigsMarketplace.tabs.invited')}
          {activeTab === 'invited' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-harx-500 rounded-full"></div>}
        </button>
      </div>

      {/* Message de notification pour les applications */}
      {applicationMessage && (
        <div className={`mb-4 p-4 rounded-lg ${applicationMessage.type === 'success'
          ? 'bg-green-50 text-green-800 border border-green-200'
          : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
          <p className="text-sm font-medium">
            {applicationMessage.type === 'success' ? '✅ ' : '❌ '}
            {applicationMessage.message}
          </p>
        </div>
      )}

      {activeTab === 'available' ? (
        currentGigs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="bg-harx-50/50 rounded-3xl p-12 max-w-sm w-full border border-harx-100/50 backdrop-blur-sm">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-xl font-black text-gray-900 mb-2">
                No Gigs Available
              </h3>
              <p className="text-sm text-gray-500 font-medium">
                We couldn't find any opportunities right now. Check back later!
              </p>
            </div>
          </div>
        ) : (
          <div id="rep-gig-grid" className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {(currentGigs as PopulatedGig[]).map((gig) => {
              const gigStatus = getGigStatus(gig._id);
              const gigStyle = getCardStyleForStatus(gigStatus);
              return (
                <div key={gig._id} className={gigStyle.container}>
                  {/* Header: Logo & Actions/Status */}
                  <div className="flex justify-between items-center mb-3">
                    <button
                      type="button"
                      onClick={() => goToCompanyProfile(gig)}
                      disabled={!gig.companyId?._id}
                      className="group/company flex items-center gap-3 min-w-0 text-left rounded-xl -m-1 p-1 pr-2 border border-transparent cursor-pointer hover:bg-indigo-50/95 hover:border-indigo-200/70 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50 disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-transparent disabled:hover:shadow-none transition-all duration-200"
                    >
                      <div className="w-10 h-10 rounded-xl border border-slate-100 flex items-center justify-center bg-white shadow-sm overflow-hidden shrink-0 transition-all duration-200 group-hover/company:border-indigo-200 group-hover/company:shadow-md group-hover/company:ring-2 group-hover/company:ring-indigo-100/80">
                        {gig.companyId?.logo ? (
                          <img src={gig.companyId.logo} alt={gig.companyId.name} className="w-full h-full object-contain p-1.5" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400 font-bold text-base uppercase">
                            {gig.companyId?.name?.[0] || '?'}
                          </div>
                        )}
                      </div>
                      {gig.companyId?.name && (
                        <span className="text-[13px] font-extrabold text-slate-950 line-clamp-2 leading-tight flex-1 transition-colors group-hover/company:text-indigo-800 group-hover/company:underline group-hover/company:decoration-indigo-400/80 group-hover/company:underline-offset-2" title={gig.companyId.name}>
                          {gig.companyId.name}
                        </span>
                      )}
                    </button>
                    <div className="flex items-center space-x-2">
                      {gigStatus === 'none' ? (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleApplyToGig(gig._id);
                          }}
                          disabled={applyingGigId === gig._id}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all shadow-sm ${applyingGigId === gig._id
                            ? 'bg-harx-100 text-harx-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-pink-500 to-rose-600 text-white border border-pink-400 shadow-[0_2px_10px_-2px_rgba(244,63,94,0.4)] animate-pulse-ring cursor-pointer'
                            }`}
                        >
                          {applyingGigId === gig._id ? '⏳ Applying...' : '🚀 Apply Now'}
                        </button>
                      ) : (
                        <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm ${gigStatus === 'enrolled' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-400' :
                          gigStatus === 'invited' ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-indigo-400' :
                            'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-amber-400'
                          }`}>
                          {gigStatus === 'enrolled' ? '✓ Enrolled' : gigStatus === 'invited' ? '✉ Invited' : '⌛ Pending'}
                        </span>
                      )}

                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          favoriteGigs.includes(gig._id)
                            ? removeFromFavorites(gig._id)
                            : addToFavorites(gig._id);
                        }}
                        className="p-1.5 hover:bg-red-50 rounded-full transition-colors group/heart"
                      >
                        <Heart
                          className={`w-4.5 h-4.5 transition-all ${favoriteGigs.includes(gig._id)
                            ? 'fill-red-500 text-red-500 scale-110'
                            : 'text-slate-300 group-hover/heart:text-red-400'
                            }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Content: Title, Brand & Commission */}
                  <div className="mb-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/gig/${gig._id}`)}
                      className="text-left w-full text-lg font-bold text-indigo-950 mb-0.5 tracking-tight leading-tight line-clamp-2 hover:text-indigo-600 transition-colors bg-transparent border-0 p-0 cursor-pointer"
                      title={gig.title}
                    >
                      {gig.title}
                    </button>
                    <p className={`text-[10px] font-semibold uppercase tracking-wider transition-colors text-indigo-500 mb-3`}>
                      {gig.category}
                    </p>
                    {/* Commission pills — hero visuel */}
                    {renderCommissionInfo(gig)}
                  </div>

                  <div className="mt-1 space-y-2">
                    {/* Compact Metadata Row */}
                    <div className="flex items-center gap-3 text-[11px] font-medium text-slate-400 pt-1">
                      <div className="flex items-center gap-1 shrink-0">
                        <Globe className="w-3 h-3 opacity-70" />
                        <span className="truncate max-w-[120px]">{typeof gig.destination_zone === 'object' ? gig.destination_zone?.name?.common || gig.destination_zone?.cca2 || 'Remote' : gig.destination_zone || 'Remote'}</span>
                      </div>
                      <div className="w-1 h-1 rounded-full bg-slate-200 shrink-0" />
                      <div className="flex items-center gap-1 shrink-0">
                        <Calendar className="w-3 h-3 opacity-70" />
                        <span>{gig.availability?.minimumHours?.weekly || 'N/A'}h/wk</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex-grow">
                    {/* Industries */}
                    {gig.industries && gig.industries.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Industries:</p>
                        <div className="flex flex-wrap gap-1">
                          {(expandedIndustries[gig._id] ? gig.industries : gig.industries.slice(0, 3)).map((industry) => (
                            <span key={industry._id} className="px-2 py-1 bg-harx-alt-100/50 rounded-lg text-[10px] font-bold text-harx-alt-700">
                              {industry.name}
                            </span>
                          ))}
                          {gig.industries.length > 3 && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setExpandedIndustries(prev => ({ ...prev, [gig._id]: !prev[gig._id] }));
                              }}
                              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-600 transition-colors cursor-pointer"
                            >
                              {expandedIndustries[gig._id] ? 'Show less' : `+${gig.industries.length - 3} more`}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Activities */}
                    {gig.activities && gig.activities.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Activities:</p>
                        <div className="flex flex-wrap gap-1">
                          {(expandedActivities[gig._id] ? gig.activities : gig.activities.slice(0, 3)).map((activity) => (
                            <span key={activity._id} className="px-2 py-1 bg-emerald-50 rounded-lg text-[10px] font-bold text-emerald-700">
                              {activity.name}
                            </span>
                          ))}
                          {gig.activities.length > 3 && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setExpandedActivities(prev => ({ ...prev, [gig._id]: !prev[gig._id] }));
                              }}
                              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-600 transition-colors cursor-pointer"
                            >
                              {expandedActivities[gig._id] ? 'Show less' : `+${gig.activities.length - 3} more`}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Buttons section - conditional based on status */}
                  <div className="mt-6">
                    {gigStatus === 'enrolled' ? (
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleSmartStart(gig._id)}
                          className="flex-[2] bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500 bg-[length:200%_auto] hover:bg-right transition-all duration-500 text-white py-2.5 px-4 rounded-xl hover:shadow-[0_8px_20px_-4px_rgba(244,63,94,0.4)] font-black text-sm uppercase tracking-widest hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 group/btn overflow-hidden relative"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          <span>START</span>
                        </button>
                        <button
                          onClick={() => navigate(`/gig/${gig._id}`)}
                          className="flex-1 bg-slate-100 text-slate-600 py-2.5 px-4 rounded-xl hover:bg-slate-200 transition-all font-black text-[11px] uppercase tracking-wider flex items-center justify-center"
                        >
                          DETAILS
                        </button>
                      </div>
                    ) : gigStatus === 'invited' ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleAcceptFromCard(gig._id);
                            }}
                            disabled={respondingInvitation?.gigId === gig._id}
                            className={`flex-1 py-2.5 px-3 rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all hover:-translate-y-0.5 active:translate-y-0 ${respondingInvitation?.gigId === gig._id
                              ? 'bg-emerald-100 text-emerald-400 cursor-not-allowed'
                              : 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-[0_4px_15px_-3px_rgba(16,185,129,0.45)] hover:shadow-[0_8px_20px_-4px_rgba(16,185,129,0.55)]'
                              }`}
                          >
                            {respondingInvitation?.gigId === gig._id && respondingInvitation.action === 'accept' ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500" />
                            ) : (
                              <>
                                <Check className="w-4 h-4" strokeWidth={3} />
                                <span>Accept</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleRejectFromCard(gig._id);
                            }}
                            disabled={respondingInvitation?.gigId === gig._id}
                            className={`flex-1 py-2.5 px-3 rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 border transition-all hover:-translate-y-0.5 active:translate-y-0 ${respondingInvitation?.gigId === gig._id
                              ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                              : 'bg-white text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300'
                              }`}
                          >
                            {respondingInvitation?.gigId === gig._id && respondingInvitation.action === 'reject' ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-rose-400" />
                            ) : (
                              <>
                                <X className="w-4 h-4" strokeWidth={3} />
                                <span>Decline</span>
                              </>
                            )}
                          </button>
                        </div>
                        <button
                          onClick={() => navigate(`/gig/${gig._id}`)}
                          className="w-full bg-slate-100 text-slate-600 py-2 px-4 rounded-xl hover:bg-slate-200 transition-all font-black text-[11px] uppercase tracking-wider flex items-center justify-center"
                        >
                          View Details
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => navigate(`/gig/${gig._id}`)}
                        className="w-full bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500 bg-[length:200%_auto] hover:bg-right transition-all duration-500 text-white py-2.5 px-4 rounded-xl hover:shadow-[0_8px_20px_-4px_rgba(244,63,94,0.4)] font-black text-sm uppercase tracking-widest hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 group/btn overflow-hidden relative"
                      >
                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-500 skew-x-[-30deg]" />
                        <Sparkles className="w-4 h-4" />
                        <span>VIEW DETAILS</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : activeTab === 'favorite' ? (
        <div>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredAndSortedGigs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="bg-harx-50/50 rounded-3xl p-12 max-w-sm w-full border border-harx-100/50 backdrop-blur-sm">
                <div className="text-4xl mb-4">❤️</div>
                <h3 className="text-xl font-black text-gray-900 mb-2">
                  No Favorites Yet
                </h3>
                <p className="text-sm text-gray-500 font-medium">
                  Love a gig? Click the heart icon to save it here for later.
                </p>
                <button
                  onClick={() => setActiveTab('available')}
                  className="mt-6 bg-slate-900 text-white py-2.5 px-6 rounded-xl hover:bg-slate-800 transition-all font-semibold text-sm shadow-sm hover:shadow-md hover:-translate-y-0.5"
                >
                  Browse Available Gigs
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {(currentGigs as PopulatedGig[]).map((gig) => {
                  const gigStatus = getGigStatus(gig._id);
                  const gigStyle = getCardStyleForStatus(gigStatus);
                  return (
                    <div key={gig._id} className={`${gigStyle.container} min-w-0`}>
                      {/* Header: Logo & Status/Actions */}
                      <div className="flex justify-between items-center mb-3">
                        <button
                          type="button"
                          onClick={() => goToCompanyProfile(gig)}
                          disabled={!gig.companyId?._id}
                          className="group/company flex items-center gap-3 min-w-0 text-left rounded-xl -m-1 p-1 pr-2 border border-transparent cursor-pointer hover:bg-indigo-50/95 hover:border-indigo-200/70 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50 disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-transparent disabled:hover:shadow-none transition-all duration-200"
                        >
                          <div className="w-10 h-10 rounded-xl border border-slate-100 flex items-center justify-center bg-white shadow-sm overflow-hidden shrink-0 transition-all duration-200 group-hover/company:border-indigo-200 group-hover/company:shadow-md group-hover/company:ring-2 group-hover/company:ring-indigo-100/80">
                            {gig.companyId?.logo ? (
                              <img src={gig.companyId.logo} alt={gig.companyId.name} className="w-full h-full object-contain p-1.5" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400 font-bold text-base uppercase">
                                {gig.companyId?.name?.[0] || '?'}
                              </div>
                            )}
                          </div>
                          {gig.companyId?.name && (
                            <span className="text-sm font-bold text-slate-700 truncate transition-colors group-hover/company:text-indigo-800 group-hover/company:underline group-hover/company:decoration-indigo-400/80 group-hover/company:underline-offset-2" title={gig.companyId.name}>
                              {gig.companyId.name}
                            </span>
                          )}
                        </button>
                        <div className="flex items-center space-x-2">
                          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-pink-500 to-rose-600 text-white border border-pink-400 shadow-[0_2px_10px_-2px_rgba(244,63,94,0.4)]">
                            🚀 Apply Now
                          </span>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              removeFromFavorites(gig._id);
                            }}
                            className="p-1 bg-red-50 text-red-500 rounded-full transition-colors group/heart"
                            title="Remove from favorites"
                          >
                            <Heart className="w-3.5 h-3.5 fill-current scale-110" />
                          </button>
                        </div>
                      </div>

                      {/* Content: Title, Brand & Commission */}
                      <div className="mb-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/gig/${gig._id}`)}
                          className="text-left w-full text-lg font-bold text-indigo-950 mb-0.5 tracking-tight leading-tight line-clamp-2 hover:text-indigo-600 transition-colors bg-transparent border-0 p-0 cursor-pointer"
                          title={gig.title}
                        >
                          {gig.title}
                        </button>
                        <p className={`text-[10px] font-semibold uppercase tracking-wider transition-colors text-indigo-500 mb-3`}>
                          {gig.category}
                        </p>
                        {/* Commission pills — hero visuel */}
                        {renderCommissionInfo(gig)}
                      </div>

                      <div className="mt-1 space-y-2">
                        {/* Compact Metadata Row */}
                        <div className="flex items-center gap-3 text-[11px] font-medium text-slate-400 pt-1">
                          <div className="flex items-center gap-1 shrink-0">
                            <Globe className="w-3 h-3 opacity-70" />
                            <span className="truncate max-w-[120px]">{typeof gig.destination_zone === 'object' ? gig.destination_zone?.name?.common || gig.destination_zone?.cca2 || 'Remote' : gig.destination_zone || 'Remote'}</span>
                          </div>
                          <div className="w-1 h-1 rounded-full bg-slate-200 shrink-0" />
                          <div className="flex items-center gap-1 shrink-0">
                            <Calendar className="w-3 h-3 opacity-70" />
                            <span>{gig.availability?.minimumHours?.weekly || 'N/A'}h/wk</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex-grow">
                        {/* Industries */}
                        {gig.industries && gig.industries.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs font-medium text-gray-700 mb-1">Industries:</p>
                            <div className="flex flex-wrap gap-1">
                              {(expandedIndustries[gig._id] ? gig.industries : gig.industries.slice(0, 3)).map((industry) => (
                                <span key={industry._id} className="px-2 py-0.5 bg-pink-50 border border-pink-100 rounded-lg text-[10px] font-medium text-pink-600">
                                  {industry.name}
                                </span>
                              ))}
                              {gig.industries.length > 3 && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setExpandedIndustries(prev => ({ ...prev, [gig._id]: !prev[gig._id] }));
                                  }}
                                  className="px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 rounded-full text-[10px] text-gray-600 transition-colors cursor-pointer"
                                >
                                  {expandedIndustries[gig._id] ? 'Less' : `+${gig.industries.length - 3}`}
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Activities */}
                        {gig.activities && gig.activities.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-700 mb-1">Activities:</p>
                            <div className="flex flex-wrap gap-1">
                              {(expandedActivities[gig._id] ? gig.activities : gig.activities.slice(0, 3)).map((activity) => (
                                <span key={activity._id} className="px-2 py-0.5 bg-cyan-50 border border-cyan-100 rounded-lg text-[10px] font-medium text-cyan-700">
                                  {activity.name}
                                </span>
                              ))}
                              {gig.activities.length > 3 && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setExpandedActivities(prev => ({ ...prev, [gig._id]: !prev[gig._id] }));
                                  }}
                                  className="px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 rounded-full text-[10px] text-gray-600 transition-colors cursor-pointer"
                                >
                                  {expandedActivities[gig._id] ? 'Less' : `+${gig.activities.length - 3}`}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => navigate(`/gig/${gig._id}`)}
                        className="mt-4 w-full bg-gradient-to-r from-indigo-600 to-violet-700 text-white py-2.5 px-4 rounded-xl hover:shadow-[0_8px_20px_-4px_rgba(79,70,229,0.4)] transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 group/btn overflow-hidden relative"
                      >
                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-500 skew-x-[-30deg]" />
                        <Sparkles className="w-4 h-4" />
                        <span>View Details</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'invited' ? (
        <div>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : invitedEnrollments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="bg-harx-50/50 rounded-3xl p-12 max-w-sm w-full border border-harx-100/50 backdrop-blur-sm">
                <div className="text-4xl mb-4">✉️</div>
                <h3 className="text-xl font-black text-gray-900 mb-2">
                  No Invitations Yet
                </h3>
                <p className="text-sm text-gray-500 font-medium">
                  Keep your profile updated! When companies love your skills, invitations will appear here.
                </p>
                <button
                  onClick={() => setActiveTab('available')}
                  className="mt-6 bg-slate-900 text-white py-2.5 px-6 rounded-xl hover:bg-slate-800 transition-all font-semibold text-sm shadow-sm hover:shadow-md hover:-translate-y-0.5"
                >
                  Browse Available Gigs
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {(currentGigs as InvitedEnrollment[]).map((enrollment) => {
                  const gigStyle = getCardStyleForStatus('invited');
                  return (
                    <div key={enrollment.id} className={`${gigStyle.container} min-w-0`}>
                      {/* Header: Logo & Status/Actions */}
                      <div className="flex justify-between items-center mb-2">
                        <button
                          type="button"
                          onClick={() => goToCompanyProfile(enrollment.gig)}
                          disabled={!enrollment.gig.companyId?._id}
                          className="group/company flex items-center gap-2 min-w-0 text-left rounded-lg -m-0.5 p-0.5 pr-1 border border-transparent cursor-pointer hover:bg-indigo-50/95 hover:border-indigo-200/70 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50 disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-transparent disabled:hover:shadow-none transition-all duration-200"
                        >
                          <div className="w-8 h-8 rounded-lg border border-slate-100 flex items-center justify-center bg-white shadow-sm overflow-hidden shrink-0 transition-all duration-200 group-hover/company:border-indigo-200 group-hover/company:shadow-md group-hover/company:ring-2 group-hover/company:ring-indigo-100/80">
                            {enrollment.gig.companyId?.logo ? (
                              <img src={enrollment.gig.companyId.logo} alt={enrollment.gig.companyId.name} className="w-full h-full object-contain p-1" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400 font-bold text-xs uppercase">
                                {enrollment.gig.companyId?.name?.[0] || '?'}
                              </div>
                            )}
                          </div>
                          {enrollment.gig.companyId?.name && (
                            <span className="text-xs font-bold text-slate-700 truncate transition-colors group-hover/company:text-indigo-800 group-hover/company:underline group-hover/company:decoration-indigo-400/80 group-hover/company:underline-offset-2" title={enrollment.gig.companyId.name}>
                              {enrollment.gig.companyId.name}
                            </span>
                          )}
                        </button>
                        <div className="flex items-center space-x-1">
                          <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-indigo-500 to-purple-600 text-white border border-indigo-400 shadow-[0_2px_10px_-2px_rgba(99,102,241,0.4)]">
                            ✉ Invited
                          </span>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              favoriteGigs.includes(enrollment.gig._id)
                                ? removeFromFavorites(enrollment.gig._id)
                                : addToFavorites(enrollment.gig._id);
                            }}
                            className="p-1 hover:bg-red-50 rounded-full transition-colors group/heart"
                          >
                            <Heart
                              className={`w-3.5 h-3.5 transition-all ${favoriteGigs.includes(enrollment.gig._id)
                                ? 'fill-red-500 text-red-500 scale-110'
                                : 'text-slate-300 group-hover/heart:text-red-400'
                                }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Content: Title, Brand & Commission */}
                      <div className="mb-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/gig/${enrollment.gig._id}`)}
                          className="text-left w-full text-lg font-bold text-indigo-950 mb-0.5 tracking-tight leading-tight line-clamp-2 hover:text-indigo-600 transition-colors bg-transparent border-0 p-0 cursor-pointer"
                          title={enrollment.gig.title}
                        >
                          {enrollment.gig.title}
                        </button>
                        <p className={`text-[10px] font-semibold uppercase tracking-wider transition-colors text-indigo-500 mb-3`}>
                          {enrollment.gig.category}
                        </p>
                        {/* Commission pills — hero visuel */}
                        {renderCommissionInfo(enrollment.gig)}
                      </div>

                      <div className="mt-1 space-y-2">
                        {/* Compact Metadata Row */}
                        <div className="flex items-center gap-3 text-[11px] font-medium text-slate-400 pt-1">
                          <div className="flex items-center gap-1 shrink-0">
                            <Globe className="w-3 h-3 opacity-70" />
                            <span className="truncate max-w-[120px]">{typeof enrollment.gig.destination_zone === 'object' ? enrollment.gig.destination_zone?.name?.common || enrollment.gig.destination_zone?.cca2 || 'Remote' : enrollment.gig.destination_zone || 'Remote'}</span>
                          </div>
                          <div className="w-1 h-1 rounded-full bg-slate-200 shrink-0" />
                          <div className="flex items-center gap-1 shrink-0">
                            <Calendar className="w-3 h-3 opacity-70" />
                            <span>{('availability' in enrollment.gig && enrollment.gig.availability?.minimumHours?.weekly) ? `${enrollment.gig.availability.minimumHours.weekly}h/wk` : 'N/A h/wk'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex-grow">
                        {/* Industries */}
                        {('industries' in enrollment.gig && enrollment.gig.industries && enrollment.gig.industries.length > 0) ? (
                          <div className="mb-2">
                            <p className="text-xs font-medium text-gray-700 mb-1">Industries:</p>
                            <div className="flex flex-wrap gap-1">
                              {(expandedIndustries[enrollment.gig._id] ? enrollment.gig.industries : enrollment.gig.industries.slice(0, 3)).map((industry) => (
                                <span key={industry._id} className="px-2 py-0.5 bg-pink-50 border border-pink-100 rounded-lg text-[10px] font-medium text-pink-600">
                                  {industry.name}
                                </span>
                              ))}
                              {enrollment.gig.industries.length > 3 && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setExpandedIndustries(prev => ({ ...prev, [enrollment.gig._id]: !prev[enrollment.gig._id] }));
                                  }}
                                  className="px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 rounded-full text-[10px] text-gray-600 transition-colors cursor-pointer"
                                >
                                  {expandedIndustries[enrollment.gig._id] ? 'Less' : `+${enrollment.gig.industries.length - 3}`}
                                </button>
                              )}
                            </div>
                          </div>
                        ) : null}

                        {/* Activities */}
                        {('activities' in enrollment.gig && enrollment.gig.activities && enrollment.gig.activities.length > 0) ? (
                          <div>
                            <p className="text-xs font-medium text-gray-700 mb-1">Activities:</p>
                            <div className="flex flex-wrap gap-1">
                              {(expandedActivities[enrollment.gig._id] ? enrollment.gig.activities : enrollment.gig.activities.slice(0, 3)).map((activity) => (
                                <span key={activity._id} className="px-2 py-0.5 bg-cyan-50 border border-cyan-100 rounded-lg text-[10px] font-medium text-cyan-700">
                                  {activity.name}
                                </span>
                              ))}
                              {enrollment.gig.activities.length > 3 && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setExpandedActivities(prev => ({ ...prev, [enrollment.gig._id]: !prev[enrollment.gig._id] }));
                                  }}
                                  className="px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 rounded-full text-[10px] text-gray-600 transition-colors cursor-pointer"
                                >
                                  {expandedActivities[enrollment.gig._id] ? 'Less' : `+${enrollment.gig.activities.length - 3}`}
                                </button>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-4 space-y-2">
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleAcceptFromCard(enrollment.gig._id);
                            }}
                            disabled={respondingInvitation?.gigId === enrollment.gig._id}
                            className={`flex-1 py-2.5 px-3 rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all hover:-translate-y-0.5 active:translate-y-0 ${respondingInvitation?.gigId === enrollment.gig._id
                              ? 'bg-emerald-100 text-emerald-400 cursor-not-allowed'
                              : 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-[0_4px_15px_-3px_rgba(16,185,129,0.45)] hover:shadow-[0_8px_20px_-4px_rgba(16,185,129,0.55)]'
                              }`}
                          >
                            {respondingInvitation?.gigId === enrollment.gig._id && respondingInvitation.action === 'accept' ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500" />
                            ) : (
                              <>
                                <Check className="w-4 h-4" strokeWidth={3} />
                                <span>Accept</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleRejectFromCard(enrollment.gig._id);
                            }}
                            disabled={respondingInvitation?.gigId === enrollment.gig._id}
                            className={`flex-1 py-2.5 px-3 rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 border transition-all hover:-translate-y-0.5 active:translate-y-0 ${respondingInvitation?.gigId === enrollment.gig._id
                              ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                              : 'bg-white text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300'
                              }`}
                          >
                            {respondingInvitation?.gigId === enrollment.gig._id && respondingInvitation.action === 'reject' ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-rose-400" />
                            ) : (
                              <>
                                <X className="w-4 h-4" strokeWidth={3} />
                                <span>Decline</span>
                              </>
                            )}
                          </button>
                        </div>
                        <button
                          onClick={() => navigate(`/gig/${enrollment.gig._id}`)}
                          className="w-full bg-slate-100 text-slate-600 py-2 px-4 rounded-xl hover:bg-slate-200 transition-all font-black text-[11px] uppercase tracking-wider flex items-center justify-center"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'enrolled' ? (
        <div>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : enrolledGigs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="bg-emerald-50/50 rounded-3xl p-12 max-w-sm w-full border border-emerald-100/50 backdrop-blur-sm">
                <div className="text-4xl mb-4">🚀</div>
                <h3 className="text-xl font-black text-gray-900 mb-2">
                  Ready to Start?
                </h3>
                <p className="text-sm text-gray-500 font-medium">
                  Accept an invitation or apply to a gig to see your active projects here.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {(currentGigs as EnrolledGig[]).map((enrolledGig) => {
                  const gigStyle = getCardStyleForStatus('enrolled');
                  return (
                    <div key={enrolledGig.id} className={`${gigStyle.container} min-w-0`}>
                      {/* Header: Logo & Status/Actions */}
                      <div className="flex justify-between items-start mb-3">
                        <button
                          type="button"
                          onClick={() => goToCompanyProfile(enrolledGig.gig)}
                          disabled={!enrolledGig.gig.companyId?._id}
                          className="group/company flex items-center gap-2 flex-1 min-w-0 text-left rounded-xl -m-1 p-1 pr-2 border border-transparent cursor-pointer hover:bg-indigo-50/95 hover:border-indigo-200/70 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50 disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-transparent disabled:hover:shadow-none transition-all duration-200"
                        >
                          <div className="w-10 h-10 rounded-xl border border-slate-100 flex items-center justify-center bg-white shadow-sm overflow-hidden shrink-0 transition-all duration-200 group-hover/company:border-indigo-200 group-hover/company:shadow-md group-hover/company:ring-2 group-hover/company:ring-indigo-100/80">
                            {enrolledGig.gig.companyId?.logo ? (
                              <img src={enrolledGig.gig.companyId.logo} alt={enrolledGig.gig.companyId.name} className="w-full h-full object-contain p-1.5" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400 font-bold text-base uppercase">
                                {enrolledGig.gig.companyId?.name?.[0] || '?'}
                              </div>
                            )}
                          </div>
                          {enrolledGig.gig.companyId?.name && (
                            <span className="text-[13px] font-extrabold text-slate-950 line-clamp-2 leading-tight flex-1 transition-colors group-hover/company:text-indigo-800 group-hover/company:underline group-hover/company:decoration-indigo-400/80 group-hover/company:underline-offset-2" title={enrolledGig.gig.companyId.name}>
                              {enrolledGig.gig.companyId.name}
                            </span>
                          )}
                        </button>
                        <div className="flex flex-col items-end gap-2 ml-3 shrink-0">
                          <div className="flex items-center space-x-1">
                            <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-emerald-500 to-teal-600 text-white border border-emerald-400 shadow-[0_2px_10px_-2px_rgba(16,185,129,0.4)]">
                              ✓ Enrolled
                            </span>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                favoriteGigs.includes(enrolledGig.gig._id)
                                  ? removeFromFavorites(enrolledGig.gig._id)
                                  : addToFavorites(enrolledGig.gig._id);
                              }}
                              className="p-1 hover:bg-red-50 rounded-full transition-colors group/heart"
                            >
                              <Heart
                                className={`w-3.5 h-3.5 transition-all ${favoriteGigs.includes(enrolledGig.gig._id)
                                  ? 'fill-red-500 text-red-500 scale-110'
                                  : 'text-slate-300 group-hover/heart:text-red-400'
                                  }`}
                              />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Content: Title, Brand & Commission */}
                      <div className="mb-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/gig/${enrolledGig.gig._id}`)}
                          className="text-left w-full text-lg font-bold text-indigo-950 mb-0.5 tracking-tight leading-tight line-clamp-2 hover:text-indigo-600 transition-colors bg-transparent border-0 p-0 cursor-pointer"
                          title={enrolledGig.gig.title}
                        >
                          {enrolledGig.gig.title}
                        </button>
                        <p className={`text-[10px] font-semibold uppercase tracking-wider transition-colors text-indigo-500 mb-3`}>
                          {enrolledGig.gig.category}
                        </p>
                        {/* Commission pills — hero visuel */}
                        {renderCommissionInfo(enrolledGig.gig)}
                      </div>

                      <div className="mt-1 space-y-2">
                        {/* Compact Metadata Row */}
                        <div className="flex items-center gap-3 text-[11px] font-medium text-slate-400 pt-1">
                          <div className="flex items-center gap-1 shrink-0">
                            <Globe className="w-3 h-3 opacity-70" />
                            <span className="truncate max-w-[120px]">{typeof enrolledGig.gig.destination_zone === 'object' ? enrolledGig.gig.destination_zone?.name?.common || enrolledGig.gig.destination_zone?.cca2 || 'Remote' : enrolledGig.gig.destination_zone || 'Remote'}</span>
                          </div>
                          <div className="w-1 h-1 rounded-full bg-slate-200 shrink-0" />
                          <div className="flex items-center gap-1 shrink-0">
                            <Calendar className="w-3 h-3 opacity-70" />
                            <span>{('availability' in enrolledGig.gig && enrolledGig.gig.availability?.minimumHours?.weekly) ? `${enrolledGig.gig.availability.minimumHours.weekly}h/wk` : 'N/A h/wk'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex-grow">
                        {/* Industries */}
                        {('industries' in enrolledGig.gig && enrolledGig.gig.industries && enrolledGig.gig.industries.length > 0) ? (
                          <div className="mb-2">
                            <p className="text-xs font-medium text-gray-700 mb-1">Industries:</p>
                            <div className="flex flex-wrap gap-1">
                              {(expandedIndustries[enrolledGig.gig._id] ? enrolledGig.gig.industries : enrolledGig.gig.industries.slice(0, 3)).map((industry) => (
                                <span key={industry._id} className="px-2 py-0.5 bg-pink-50 border border-pink-100 rounded-lg text-[10px] font-medium text-pink-600">
                                  {industry.name}
                                </span>
                              ))}
                              {enrolledGig.gig.industries.length > 3 && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setExpandedIndustries(prev => ({ ...prev, [enrolledGig.gig._id]: !prev[enrolledGig.gig._id] }));
                                  }}
                                  className="px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 rounded-full text-[10px] text-gray-600 transition-colors cursor-pointer"
                                >
                                  {expandedIndustries[enrolledGig.gig._id] ? 'Less' : `+${enrolledGig.gig.industries.length - 3}`}
                                </button>
                              )}
                            </div>
                          </div>
                        ) : null}

                        {/* Activities */}
                        {('activities' in enrolledGig.gig && enrolledGig.gig.activities && enrolledGig.gig.activities.length > 0) ? (
                          <div>
                            <p className="text-xs font-medium text-gray-700 mb-1">Activities:</p>
                            <div className="flex flex-wrap gap-1">
                              {(expandedActivities[enrolledGig.gig._id] ? enrolledGig.gig.activities : enrolledGig.gig.activities.slice(0, 3)).map((activity) => (
                                <span key={activity._id} className="px-2 py-0.5 bg-cyan-50 border border-cyan-100 rounded-lg text-[10px] font-medium text-cyan-700">
                                  {activity.name}
                                </span>
                              ))}
                              {enrolledGig.gig.activities.length > 3 && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setExpandedActivities(prev => ({ ...prev, [enrolledGig.gig._id]: !prev[enrolledGig.gig._id] }));
                                  }}
                                  className="px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 rounded-full text-[10px] text-gray-600 transition-colors cursor-pointer"
                                >
                                  {expandedActivities[enrolledGig.gig._id] ? 'Less' : `+${enrolledGig.gig.activities.length - 3}`}
                                </button>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </div>


                      {/* Leads */}
                      {('leads' in enrolledGig.gig && enrolledGig.gig.leads?.types && enrolledGig.gig.leads.types.length > 0) && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">🎯 Leads:</p>
                          <div className="flex flex-col gap-2">
                            {enrolledGig.gig.leads.types.map((lead, idx) => {
                              const colorMap: Record<string, string> = {
                                hot: 'bg-red-100 text-red-700 border-red-200',
                                warm: 'bg-orange-100 text-orange-700 border-orange-200',
                                cold: 'bg-blue-100 text-blue-700 border-blue-200',
                              };
                              const emojiMap: Record<string, string> = {
                                hot: '🔥',
                                warm: '☀️',
                                cold: '❄️',
                              };
                              const color = colorMap[lead.type] || 'bg-gray-100 text-gray-700 border-gray-200';
                              const emoji = emojiMap[lead.type] || '🎯';
                              return (
                                <div key={idx} className={`flex items-start gap-2 px-3 py-2 rounded-lg border ${color}`}>
                                  <span className="text-sm font-semibold capitalize shrink-0">{emoji} {lead.type}</span>
                                  <span className="text-xs font-bold shrink-0">{lead.percentage}%</span>
                                  {lead.description && (
                                    <span className="text-xs opacity-80 line-clamp-1">{lead.description}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => handleSmartStart(enrolledGig.gig._id)}
                          className="flex-[2] bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500 bg-[length:200%_auto] hover:bg-right transition-all duration-500 text-white py-2.5 px-4 rounded-xl hover:shadow-[0_8px_20px_-4px_rgba(244,63,94,0.4)] font-black text-sm uppercase tracking-widest hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 group/btn overflow-hidden relative"
                        >
                          <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                            <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[7px] border-l-white border-b-[4px] border-b-transparent ml-0.5" />
                          </div>
                          <span>START SESSION</span>
                        </button>
                        <button
                          onClick={() => navigate(`/gig/${enrolledGig.gig._id}`)}
                          className="flex-1 bg-slate-100 text-slate-600 py-2.5 px-4 rounded-xl hover:bg-slate-200 transition-all font-black text-[11px] uppercase tracking-wider flex items-center justify-center"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="bg-harx-50/50 rounded-3xl p-12 max-w-sm w-full border border-harx-100/50 backdrop-blur-sm">
            <div className="text-4xl mb-4">🚀</div>
            <h3 className="text-xl font-black text-gray-900 mb-2">
              No Enrolled Gigs Yet
            </h3>
            <p className="text-sm text-gray-500 font-medium">
              Accept an invitation or apply to a gig to see your active projects here.
            </p>
            <button
              onClick={() => setActiveTab('available')}
              className="mt-6 bg-slate-900 text-white py-2.5 px-6 rounded-xl hover:bg-slate-800 transition-all font-semibold text-sm shadow-sm hover:shadow-md hover:-translate-y-0.5"
            >
              Browse Available Gigs
            </button>
          </div>
        </div>
      )}

      {/* Pagination Controls - Only show for Available Gigs */}
      {activeTab === 'available' && totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-12 bg-white/50 backdrop-blur-sm p-2 rounded-2xl border border-gray-100 w-fit mx-auto">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={`p-2 rounded-xl transition-all ${currentPage === 1
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:bg-harx-50 hover:text-harx-600'
              }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-10 h-10 rounded-xl text-sm font-black transition-all ${currentPage === page
                  ? 'bg-gradient-harx text-white shadow-lg shadow-harx-500/20'
                  : 'text-gray-500 hover:bg-gray-100'
                  }`}
              >
                {page}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`p-2 rounded-xl transition-all ${currentPage === totalPages
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:bg-harx-50 hover:text-harx-600'
              }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {!loading && !isProfilePublished && (
        <OnboardingNextStepButton
          title={
            hasMarketplaceGigEngagement
              ? (isFrMarket ? 'Publier mon profil' : 'Publish my profile')
              : (isFrMarket ? 'Place de marché' : 'Marketplace')
          }
          hint={
            hasMarketplaceGigEngagement
              ? (isFrMarket ? 'Dernière étape pour devenir visible' : 'Final step to become visible')
              : (isFrMarket ? 'Postulez à au moins un gig ci-dessous' : 'Apply to at least one gig below')
          }
          onClick={
            hasMarketplaceGigEngagement
              ? () => navigate('/profile')
              : scrollToGigGrid
          }
        />
      )}
    </div>
  );
}