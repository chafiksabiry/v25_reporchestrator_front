import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Phone, Mail, User,
  Paperclip, Image, MoreHorizontal, PhoneOutgoing, XCircle,
  ChevronLeft, ChevronRight, ChevronDown, Filter, Layout,
  BookOpen, Clock, AlertTriangle, CheckCircle2, ShieldAlert, Search, Calendar, Eye
} from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';
import { CallRecords } from '../CallRecords';
import CopilotApp from '../../../copilot/App';
import { AgentProvider, useAgent } from '../../../copilot/contexts/AgentContext';
import { IframeWorkspace } from '../../../copilot/components/Dashboard/IframeWorkspace';
import { getAgentId, getAuthToken } from '../../../utils/authUtils';
import { repApiUrl } from '../../../utils/repApiUrl';
import { slotApi } from '../../../services/api/slotApi';
import {
  claimCockpit,
  releaseCockpit,
  isLeadCockpitLockedByOther,
} from '../../../services/api/leadCockpitApi';

interface Lead {
  _id?: string;
  id: string;
  Deal_Name: string;
  Telephony: string;
  Email_1: string;
  Stage: string;
  Created_Time: string;
  Owner: {
    name: string;
    id: string;
    email: string;
  };
  cockpitLockedBy?: string | null;
  cockpitLockedAt?: string | null;
  cockpitLockExpiresAt?: string | null;
  signedByAgent?: string | null;
  signedAt?: string | null;
  isSignedByMe?: boolean;
  isCalledByMe?: boolean;
  isRdvByMe?: boolean;
  lastCallOutcome?: string | null;
}

interface EnrolledGig {
  _id: string;
  title: string;
}

interface APIResponse {
  success: boolean;
  count: number;
  total: number;
  totalPages: number;
  currentPage: number;
  data: Lead[];
}

type LeadStatusFilter = 'all' | 'called' | 'signed' | 'rdv';

function isLeadRdvByMe(lead: Lead): boolean {
  if (lead.isRdvByMe === true) return true;
  return lead.lastCallOutcome === 'appointment';
}

type CopilotGuardState = {
  loading: boolean;
  isEnrolledInGig: boolean;
  isTrainingComplete: boolean;
  hasActiveReservationNow: boolean;
  reservationWindowLabel: string | null;
  reason: string | null;
};

function weekdayEnglish(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}

function parseTimeToMinutes(time: string): number | null {
  const m = String(time || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function isTodayReservation(rawDate: unknown, now: Date): boolean {
  const v = String(rawDate || '').trim();
  if (!v) return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const todayIso = now.toISOString().slice(0, 10);
    const localIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return v === todayIso || v === localIso;
  }
  return v.toLowerCase() === weekdayEnglish(now).toLowerCase();
}

export function WorkspaceContent() {
  useAgent();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const urlTab = searchParams.get('tab');
  const urlLeadId = searchParams.get('leadId') || sessionStorage.getItem('activeLeadId') || '';
  const urlGigId = searchParams.get('gigId') || sessionStorage.getItem('activeGigId') || '';
  const gigId = location.state?.gigId || urlGigId;

  const [activeTab, setActiveTab] = useState(urlTab && ['voice', 'calls', 'copilot'].includes(urlTab) ? urlTab : 'voice');
  const [message, setMessage] = useState('');
  // Twilio CallSid of the call that was just hung-up and persisted. When
  // set, the Call History tab is auto-opened and `CallRecords` deep-links
  // the matching call into its details modal.
  const [pendingOpenCallSid, setPendingOpenCallSid] = useState<string | null>(null);
  const [signedLeadOverlayId, setSignedLeadOverlayId] = useState<string | null>(null);

  // Sync activeTab with URL
  useEffect(() => {
    if (urlTab && ['voice', 'calls', 'copilot'].includes(urlTab)) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  // ── Auto-open the Call History modal after a hangup ──────────────
  //  `ContactInfo` dispatches `harx:call-saved` once the just-finished
  //  call is persisted to Mongo. We catch it here, switch to the
  //  Call History tab, and pass the Twilio SID down to `CallRecords`
  //  which deep-links the matching record into its details modal
  //  (the "Lancer l'analyse IA" view from Image 2).
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const sid: string | undefined = detail.sid;
      if (!sid) return;
      setPendingOpenCallSid(sid);
      setActiveTab('calls');
      const agentId = getAgentId();
      const claimedLeadId = sessionStorage.getItem('activeLeadId');
      if (agentId && claimedLeadId) {
        void releaseCockpit(claimedLeadId, agentId);
        setCockpitClaimedLeadId(null);
      }
      const params = new URLSearchParams(location.search);
      params.set('tab', 'calls');
      navigate(
        { pathname: location.pathname, search: `?${params.toString()}` },
        { replace: true }
      );
    };
    window.addEventListener('harx:call-saved', handler as EventListener);
    return () =>
      window.removeEventListener('harx:call-saved', handler as EventListener);
    // We intentionally read `location.pathname` / `.search` inside the
    // handler so we don't need them as deps (they'd cause re-registration
    // on every URL change, which is undesirable for a one-shot listener).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [leadStatusFilter, setLeadStatusFilter] = useState<LeadStatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [enrolledGigs, setEnrolledGigs] = useState<EnrolledGig[]>([]);
  const [enrolledGigsLoaded, setEnrolledGigsLoaded] = useState(false);
  // Do not hydrate from sessionStorage on first paint — a stale activeGigId from
  // marketplace browsing would load demo leads for a gig the rep isn't enrolled in.
  const [selectedGigId, setSelectedGigId] = useState<string>('');
  const [isGigDropdownOpen, setIsGigDropdownOpen] = useState(false);
  const [cockpitClaimedLeadId, setCockpitClaimedLeadId] = useState<string | null>(null);
  const [cockpitAccessDenied, setCockpitAccessDenied] = useState<string | null>(null);
  const [claimingCockpit, setClaimingCockpit] = useState(false);
  const prevTabRef = useRef(activeTab);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const myAgentId = getAgentId();

  const activeEnrolledGigId = useMemo(
    () => (selectedGigId && enrolledGigs.some((g) => g._id === selectedGigId) ? selectedGigId : ''),
    [selectedGigId, enrolledGigs]
  );

  // Only persist enrolled gigs to sessionStorage (never a stale marketplace id).
  useEffect(() => {
    if (activeEnrolledGigId) {
      sessionStorage.setItem('activeGigId', activeEnrolledGigId);
    } else {
      sessionStorage.removeItem('activeGigId');
    }
  }, [activeEnrolledGigId]);

  // Sync and Clean URL parameters to protect sensitive IDs from leaking
  useEffect(() => {
    let changed = false;
    const params = new URLSearchParams(location.search);

    if (params.has('gigId')) {
      const gId = params.get('gigId') || '';
      if (gId) {
        sessionStorage.setItem('activeGigId', gId);
        setSelectedGigId(gId);
      }
      params.delete('gigId');
      changed = true;
    }

    if (params.has('leadId')) {
      const lId = params.get('leadId') || '';
      if (lId) {
        sessionStorage.setItem('activeLeadId', lId);
      }
      params.delete('leadId');
      changed = true;
    }

    if (changed) {
      navigate({
        pathname: location.pathname,
        search: `?${params.toString()}`
      }, { replace: true });
    }
  }, [location.search, location.pathname, navigate]);

  // Auto-reconstitute selectedLead from the loaded leads list using the active sessionStorage leadId
  useEffect(() => {
    if (!selectedLead && urlLeadId && leads.length > 0) {
      const found = leads.find(l => (l._id || l.id) === urlLeadId);
      if (found) {
        setSelectedLead(found);
      }
    }
  }, [leads, urlLeadId, selectedLead]);

  const [copilotGuard, setCopilotGuard] = useState<CopilotGuardState>({
    loading: true,
    isEnrolledInGig: false,
    isTrainingComplete: false,
    hasActiveReservationNow: false,
    reservationWindowLabel: null,
    reason: 'Select an enrolled gig.'
  });

  useEffect(() => {
    fetchEnrolledGigs();
  }, []);

  useEffect(() => {
    if (!enrolledGigsLoaded) return;
    if (gigId && enrolledGigs.some((g) => g._id === gigId) && gigId !== selectedGigId) {
      setSelectedGigId(gigId);
    }
  }, [gigId, selectedGigId, enrolledGigs, enrolledGigsLoaded]);

  useEffect(() => {
    if (activeTab === 'voice' && enrolledGigsLoaded) {
      fetchLeads(currentPage, searchQuery);
    }
  }, [activeTab, activeEnrolledGigId, currentPage, enrolledGigsLoaded, leadStatusFilter]);

  useEffect(() => {
    setLeadStatusFilter('all');
    setCurrentPage(1);
    setSearchQuery('');
  }, [activeEnrolledGigId]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const goToPage = (raw: string) => {
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed)) {
      setPageInput(String(currentPage));
      return;
    }
    const next = Math.min(Math.max(parsed, 1), totalPages);
    setCurrentPage(next);
    setPageInput(String(next));
  };

  // Release cockpit lock when leaving the COCKPIT tab
  useEffect(() => {
    if (prevTabRef.current === 'copilot' && activeTab !== 'copilot') {
      const leadId = cockpitClaimedLeadId;
      const agentId = getAgentId();
      if (leadId && agentId) {
        void releaseCockpit(leadId, agentId);
        setCockpitClaimedLeadId(null);
      }
      setCockpitAccessDenied(null);
    }
    prevTabRef.current = activeTab;
  }, [activeTab, cockpitClaimedLeadId]);

  const canUseCopilot = useMemo(
    () =>
      copilotGuard.isEnrolledInGig &&
      copilotGuard.isTrainingComplete &&
      copilotGuard.hasActiveReservationNow,
    [copilotGuard]
  );

  // Claim cockpit when opening COCKPIT tab with an active lead
  useEffect(() => {
    if (activeTab !== 'copilot' || !canUseCopilot || copilotGuard.loading) return;
    const leadId = selectedLead?._id || selectedLead?.id || urlLeadId;
    if (!leadId || !myAgentId) return;
    if (cockpitClaimedLeadId === leadId) return;

    let cancelled = false;
    (async () => {
      const result = await claimCockpit(leadId, myAgentId, activeEnrolledGigId);
      if (cancelled) return;
      if (result.ok && result.success) {
        setCockpitClaimedLeadId(leadId);
        setCockpitAccessDenied(null);
      } else {
        setCockpitAccessDenied(
          result.message || 'Ce prospect est déjà ouvert dans le cockpit d’un autre agent.'
        );
        setCockpitClaimedLeadId(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    canUseCopilot,
    copilotGuard.loading,
    urlLeadId,
    selectedLead?._id,
    selectedLead?.id,
    activeEnrolledGigId,
    myAgentId,
    cockpitClaimedLeadId,
  ]);

  // Block access to copilot tab/url if any requirement is not met
  useEffect(() => {
    if (!copilotGuard.loading) {
      if (activeTab === 'copilot' && !canUseCopilot) {
        setActiveTab('voice');
        const params = new URLSearchParams(location.search);
        params.set('tab', 'voice');
        navigate({
          pathname: location.pathname,
          search: `?${params.toString()}`
        }, { replace: true });
        setShowWarningModal(true);
      } else if (canUseCopilot) {
        setShowWarningModal(false);
      }
    }
  }, [copilotGuard.loading, activeTab, canUseCopilot, navigate, location.pathname, location.search]);

  useEffect(() => {
    const evaluateCopilotGuard = async () => {
      if (!activeEnrolledGigId) {
        setCopilotGuard({
          loading: false,
          isEnrolledInGig: false,
          isTrainingComplete: false,
          hasActiveReservationNow: false,
          reservationWindowLabel: null,
          reason: 'Select an enrolled gig.'
        });
        return;
      }

      const token = getAuthToken();
      const repId = getAgentId() || localStorage.getItem('agentId') || '';
      if (!repId) {
        setCopilotGuard({
          loading: false,
          isEnrolledInGig: false,
          isTrainingComplete: false,
          hasActiveReservationNow: false,
          reservationWindowLabel: null,
          reason: 'Rep not authenticated.'
        });
        return;
      }

      setCopilotGuard((prev) => ({ ...prev, loading: true, reason: null, isEnrolledInGig: true }));

      try {
        const now = new Date();
        const trainingBase = String(import.meta.env.VITE_TRAINING_API_URL || '').replace(/\/$/, '');
        let isTrainingComplete = false;

        // Fetch both training progress summary and reservations in parallel to optimize speed
        const [summaryRes, reservations] = await Promise.all([
          trainingBase
            ? fetch(
              `${trainingBase}/training_journeys/rep/${encodeURIComponent(repId)}/slide-progress-summary?gigId=${encodeURIComponent(activeEnrolledGigId)}`,
              {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined
              }
            ).catch((err) => {
              console.error('Failed to fetch slide progress:', err);
              return null;
            })
            : Promise.resolve(null),
          slotApi.getReservations(repId, activeEnrolledGigId).catch((err) => {
            console.error('Failed to fetch reservations:', err);
            return [];
          })
        ]);

        if (summaryRes && summaryRes.ok) {
          const summaryPayload = await summaryRes.json();
          const summary = summaryPayload?.data && typeof summaryPayload.data === 'object'
            ? summaryPayload.data
            : summaryPayload;
          const overall = Number(summary?.overallPercent ?? 0);
          const trainingCount = Number(summary?.trainingCount ?? 0);
          isTrainingComplete = trainingCount > 0 && overall >= 100;
        }

        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const activeReservation = (Array.isArray(reservations) ? reservations : []).find((r: any) => {
          if (String(r?.status || '').toLowerCase() !== 'reserved') return false;
          const reservationDay = r?.reservationDate || r?.date;
          if (!isTodayReservation(reservationDay, now)) return false;
          const start = parseTimeToMinutes(r?.startTime);
          const end = parseTimeToMinutes(r?.endTime);
          if (start == null || end == null || end <= start) return false;
          // Check if current time matches the active slot strictly
          return nowMinutes >= start && nowMinutes < end;
        });

        const hasActiveReservationNow = !!activeReservation;
        const reservationWindowLabel = hasActiveReservationNow
          ? `${activeReservation.startTime} - ${activeReservation.endTime}`
          : null;

        const reason = !isTrainingComplete
          ? 'Complete all trainings for this gig before calling.'
          : !hasActiveReservationNow
            ? 'Calls are allowed only during your reserved slot for this gig.'
            : null;

        setCopilotGuard({
          loading: false,
          isEnrolledInGig: true,
          isTrainingComplete,
          hasActiveReservationNow,
          reservationWindowLabel,
          reason
        });
      } catch (error) {
        console.error('Error evaluating copilot guard:', error);
        setCopilotGuard({
          loading: false,
          isEnrolledInGig: true,
          isTrainingComplete: false,
          hasActiveReservationNow: false,
          reservationWindowLabel: null,
          reason: 'Unable to validate call conditions. Please try again.'
        });
      }
    };

    if (enrolledGigsLoaded) {
      evaluateCopilotGuard();
    }
  }, [activeEnrolledGigId, enrolledGigsLoaded]);

  const fetchEnrolledGigs = async () => {
    const agentId = localStorage.getItem('agentId');
    const token = localStorage.getItem('token');
    if (!agentId || !token) return;

    try {
      const response = await fetch(repApiUrl(`/profiles/${agentId}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const profileData = await response.json();
        const enrolled = (Array.isArray(profileData.gigs) ? profileData.gigs : [])
          .filter((g: any) => g.status === 'enrolled')
          .map((g: any) => {
            const gigInfo = g.gigId;
            const id = typeof gigInfo === 'object' ? (gigInfo._id || gigInfo.$oid) : gigInfo;
            const title = typeof gigInfo === 'object' && gigInfo.title ? gigInfo.title : (g.gigTitle || `Gig ${id}`);
            return { _id: String(id), title };
          });

        setEnrolledGigs(enrolled);

        const enrolledIds = new Set(enrolled.map((g) => g._id));
        const persistedGigId = sessionStorage.getItem('activeGigId') || gigId || '';

        if (enrolled.length === 0) {
          setSelectedGigId('');
          sessionStorage.removeItem('activeGigId');
        } else if (persistedGigId && enrolledIds.has(persistedGigId)) {
          setSelectedGigId(persistedGigId);
        } else {
          setSelectedGigId(enrolled[0]._id);
        }
      }
    } catch (error) {
      console.error('Error fetching enrolled gigs:', error);
    } finally {
      setEnrolledGigsLoaded(true);
    }
  };

  const applyLeadStatusFilter = (leadList: Lead[]) => {
    if (leadStatusFilter === 'called') {
      return leadList.filter((lead) => lead.isCalledByMe);
    }
    if (leadStatusFilter === 'signed') {
      return leadList.filter((lead) => lead.isSignedByMe);
    }
    if (leadStatusFilter === 'rdv') {
      return leadList.filter((lead) => isLeadRdvByMe(lead));
    }
    return leadList;
  };

  const fetchLeads = async (page: number = 1, query: string = searchQuery) => {
    const activeGigId = activeEnrolledGigId;

    // Leads are scoped to an enrolled gig only. Never call /leads/user/:id (demo data).
    if (!activeGigId) {
      setLeads([]);
      setTotalPages(1);
      setIsLoadingLeads(false);
      return;
    }

    console.log("🔍 Workspace: fetching leads", { activeGigId, page, query });
    const baseUrl = (import.meta.env.VITE_DASHBOARD_COMPANY_API_URL || 'https://v25dashboardbackend-production.up.railway.app/api').replace(/\/$/, '');
    const limit = 50;
    const agentId = getAgentId();
    const shuffleParams = agentId ? `&shuffle=1&agentId=${encodeURIComponent(agentId)}` : '';
    const statusParam = leadStatusFilter !== 'all' ? `&leadStatus=${leadStatusFilter}` : '';
    const trimmedQuery = query.trim();
    const url = trimmedQuery
      ? `${baseUrl}/leads/gig/${activeGigId}/search?search=${encodeURIComponent(trimmedQuery)}${statusParam}`
      : `${baseUrl}/leads/gig/${activeGigId}?page=${page}&limit=${limit}${shuffleParams}${statusParam}`;

    try {
      setIsLoadingLeads(true);
      console.log(`📡 Attempting fetch to: ${url}`);

      // Simplified fetch without complex headers to test CORS
      const response = await fetch(url);
      console.log("📡 Fetch response status:", response.status, response.statusText);

      const responseData: APIResponse = await response.json();
      console.log("✅ Leads data received:", responseData);

      if (responseData.success && Array.isArray(responseData.data)) {
        const leadResults = applyLeadStatusFilter(responseData.data);
        setLeads(leadResults);
        setLeadsTotal(trimmedQuery ? leadResults.length : (responseData.total ?? leadResults.length));
        if (trimmedQuery) {
          setTotalPages(1);
          setCurrentPage(1);
        } else if (responseData.totalPages) {
          setTotalPages(responseData.totalPages);
        } else {
          setTotalPages(1);
        }
      } else {
        setLeads([]);
        setLeadsTotal(0);
      }
    } catch (error: any) {
      console.error('❌ Error fetching leads (detailed):', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        url
      });
      setLeads([]);
    } finally {
      setIsLoadingLeads(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setCurrentPage(1);
      fetchLeads(1, query);
    }, 500);
  };

  const leadStatusFilters: { id: LeadStatusFilter; label: string }[] = [
    { id: 'all', label: 'Tous' },
    { id: 'called', label: 'Appelé' },
    { id: 'rdv', label: 'RDV' },
    { id: 'signed', label: 'Signé' },
  ];

  const workspaceTools = [
    { id: 'voice', label: 'Leads', icon: User },
    { id: 'calls', label: 'Call History', icon: PhoneOutgoing },
    { id: 'copilot', label: 'COCKPIT', icon: Phone },
  ];

  const renderWorkspace = () => {
    switch (activeTab) {
      case 'voice':
        return (
          <div className="h-[600px] bg-white/80 backdrop-blur-md rounded-2xl p-5 flex flex-col shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
              <div className="flex flex-col">
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Leads</h2>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {/* Warnings, Exceptions and Info Banners */}
              <div className="space-y-4 mb-6">
                {/* No enrolled gigs at all */}
                {enrolledGigsLoaded && enrolledGigs.length === 0 && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-4 shadow-sm animate-in fade-in duration-300">
                    <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl shrink-0">
                      <Layout className="w-5 h-5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <h4 className="text-xs font-black text-blue-900 tracking-tight uppercase">
                        {t('workspaceGuard.noEnrolledGigTitle', 'Aucun gig inscrit')}
                      </h4>
                      <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
                        {t(
                          'workspaceGuard.noEnrolledGigDesc',
                          'Les prospects n’apparaissent qu’une fois inscrit à une mission. Postulez sur la place de marché puis attendez l’acceptation.'
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/marketplace')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md shrink-0 flex items-center gap-1.5"
                    >
                      {t('workspaceGuard.marketplaceButton', 'Missions')}
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Enrolled gigs exist but none selected in the dropdown */}
                {enrolledGigsLoaded && enrolledGigs.length > 0 && !activeEnrolledGigId && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-4 shadow-sm animate-in fade-in duration-300">
                    <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl shrink-0">
                      <Layout className="w-5 h-5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <h4 className="text-xs font-black text-blue-900 tracking-tight uppercase">{t('workspaceGuard.selectGigTitle', 'Sélectionnez un gig')}</h4>
                      <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
                        {t('workspaceGuard.selectGigDesc', 'Choisissez un gig inscrit dans le menu ci-dessus pour afficher vos prospects.')}
                      </p>
                    </div>
                  </div>
                )}

                {activeEnrolledGigId && !copilotGuard.loading && (
                  <>
                    {/* Warning A: Training Incomplete */}
                    {!copilotGuard.isTrainingComplete && (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-4 shadow-sm animate-in fade-in duration-300">
                        <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl shrink-0">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <h4 className="text-xs font-black text-amber-900 tracking-tight uppercase">{t('workspaceGuard.trainingRequiredTitle')}</h4>
                          <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                            {t('workspaceGuard.trainingRequiredDesc')}
                          </p>
                        </div>
                        <button
                          onClick={() => navigate(`/training?gigId=${activeEnrolledGigId}`)}
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-amber-600/10 shrink-0 flex items-center gap-1.5"
                        >
                          {t('workspaceGuard.trainingButton')} <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Warning B: No Active Reservation Slot (Availability) */}
                    {!copilotGuard.hasActiveReservationNow && (
                      <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-4 shadow-sm animate-in fade-in duration-300">
                        <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl shrink-0">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <h4 className="text-xs font-black text-rose-900 tracking-tight uppercase">{t('workspaceGuard.sessionRequiredTitle')}</h4>
                          <p className="text-[11px] text-rose-700 font-medium leading-relaxed">
                            {t('workspaceGuard.sessionRequiredDesc')}
                          </p>
                        </div>
                        <button
                          onClick={() => navigate('/session-planning')}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-rose-600/10 shrink-0 flex items-center gap-1.5"
                        >
                          {t('workspaceGuard.sessionButton')} <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Exception Handling: API down or check failure */}
                    {copilotGuard.reason === 'Unable to validate call conditions. Please try again.' && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-4 shadow-sm animate-in fade-in duration-300">
                        <div className="p-2.5 bg-red-100 text-red-600 rounded-xl shrink-0">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <h4 className="text-xs font-black text-red-900 tracking-tight uppercase">{t('workspaceGuard.connectionErrorTitle')}</h4>
                          <p className="text-[11px] text-red-700 font-medium leading-relaxed">
                            {t('workspaceGuard.connectionErrorDesc')}
                          </p>
                        </div>
                        <button
                          onClick={() => window.location.reload()}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-red-600/10 shrink-0"
                        >
                          {t('workspaceGuard.refreshButton')}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <div className="flex flex-col gap-3 mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex justify-between items-center flex-1">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('workspaceGuard.recentLeads')}</h3>
                      <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                        {leadsTotal} {t('sidebar.leads')}
                        {searchQuery.trim() ? (
                          <span className="text-emerald-500/80 font-medium normal-case tracking-normal"> · "{searchQuery.trim()}"</span>
                        ) : null}
                      </span>
                    </div>
                    {activeEnrolledGigId && (
                      <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-gray-200/80 px-4 py-2 flex items-center gap-3 shadow-sm focus-within:ring-2 focus-within:ring-harx-500/20 transition-all min-w-[220px] sm:max-w-[280px]">
                        <Search className="h-4 w-4 text-gray-400 shrink-0" />
                        <input
                          type="text"
                          className="bg-transparent border-none outline-none text-sm font-medium text-gray-700 w-full placeholder:text-gray-400"
                          placeholder={t('workspaceGuard.searchLeads')}
                          value={searchQuery}
                          onChange={(e) => handleSearch(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                  {activeEnrolledGigId && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 mr-1">Filtrer</span>
                      {leadStatusFilters.map((filter) => (
                        <button
                          key={filter.id}
                          type="button"
                          onClick={() => {
                            setLeadStatusFilter(filter.id);
                            setCurrentPage(1);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                            leadStatusFilter === filter.id
                              ? filter.id === 'signed'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
                                : filter.id === 'called'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm'
                                  : filter.id === 'rdv'
                                    ? 'bg-violet-50 text-violet-700 border-violet-200 shadow-sm'
                                    : 'bg-gradient-harx text-white border-transparent shadow-md shadow-harx-500/20'
                              : 'bg-white text-gray-500 border-gray-100 hover:border-harx-200 hover:text-harx-600'
                          }`}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {isLoadingLeads ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="border border-gray-100 rounded-2xl p-5 flex justify-between items-center bg-white/50 animate-pulse">
                        <div className="space-y-3 flex-1">
                          <Skeleton className="h-5 w-1/3" variant="rounded" />
                          <div className="flex gap-4">
                            <Skeleton className="h-3 w-24" variant="rounded" />
                            <Skeleton className="h-3 w-32" variant="rounded" />
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <Skeleton className="h-6 w-16" variant="rounded" />
                          <Skeleton className="h-10 w-24" variant="rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : leads.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                    <p className="text-gray-400 font-medium">
                      {searchQuery.trim()
                        ? t('workspaceGuard.noSearchResults', 'No leads match your search.')
                        : leadStatusFilter !== 'all'
                        ? t('workspaceGuard.noLeadsForFilter', 'Aucun prospect pour ce filtre.')
                        : enrolledGigs.length === 0
                        ? t(
                            'workspaceGuard.noEnrolledLeads',
                            'Aucun prospect — inscrivez-vous à une mission sur la place de marché pour débloquer vos leads.'
                          )
                        : !activeEnrolledGigId
                          ? t('workspaceGuard.noGigLeads', 'Sélectionnez un gig inscrit pour afficher vos prospects.')
                          : t('workspaceGuard.noLeadsForGig', 'Aucun prospect pour ce gig pour le moment.')}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {leads.map((lead) => {
                        const leadLockedByOther = isLeadCockpitLockedByOther(lead, myAgentId);
                        const isSignedByMe = Boolean(lead.isSignedByMe);
                        const isRdvByMe = isLeadRdvByMe(lead) && !isSignedByMe;
                        const isCalledByMe = Boolean(lead.isCalledByMe) && !isSignedByMe && !isRdvByMe;
                        return (
                        <div
                          key={`${lead._id || lead.id}-${lead.Email_1}-${lead.Created_Time}`}
                          className={`border border-gray-100 rounded-2xl p-5 hover:bg-harx-50/30 hover:border-harx-100 transition-all group hover:shadow-lg hover:shadow-harx-500/5 ${isSignedByMe ? 'cursor-pointer' : ''}`}
                          onClick={isSignedByMe ? () => handleViewSignedLeadDetails(lead) : undefined}
                          onKeyDown={isSignedByMe ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleViewSignedLeadDetails(lead);
                            }
                          } : undefined}
                          role={isSignedByMe ? 'button' : undefined}
                          tabIndex={isSignedByMe ? 0 : undefined}
                        >
                          <div className="flex justify-between items-center">
                            <div className="space-y-1">
                              <h4 className="font-black text-gray-900 uppercase text-sm tracking-tight group-hover:text-harx-600 transition-colors">{lead.Deal_Name}</h4>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5 text-gray-400">
                                  <Phone className="w-3 h-3" />
                                  <p className="text-[10px] font-black uppercase tracking-widest">{lead.Telephony || (lead as any).Phone || 'No phone'}</p>
                                </div>
                                <div className="flex items-center gap-1.5 text-gray-400">
                                  <Mail className="w-3 h-3" />
                                  <p className="text-[10px] font-black uppercase tracking-widest leading-none mt-0.5">{lead.Email_1 || 'No email'}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              {isSignedByMe && (
                                <span className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Déjà signé
                                </span>
                              )}
                              {isRdvByMe && (
                                <span className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest bg-violet-50 text-violet-700 border border-violet-100 flex items-center gap-1.5">
                                  <Calendar className="w-3 h-3" />
                                  RDV
                                </span>
                              )}
                              {isCalledByMe && (
                                <span className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1.5">
                                  <PhoneOutgoing className="w-3 h-3" />
                                  Appelé
                                </span>
                              )}
                              {leadLockedByOther && (
                                <span className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-100 flex items-center gap-1.5">
                                  <Clock className="w-3 h-3" />
                                  Occupé
                                </span>
                              )}
                              {lead.Stage && lead.Stage !== 'New' && (
                                <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${lead.Stage === 'Respecte le planning' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                  lead.Stage === 'En retard' ? 'bg-harx-50 text-harx-600 border border-harx-100' :
                                    'bg-gray-50 text-gray-400 border border-gray-100'
                                  }`}>
                                  {lead.Stage}
                                </span>
                              )}
                              <button
                                type="button"
                                className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${
                                  isSignedByMe
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:shadow-md'
                                    : canUseCopilot && !leadLockedByOther
                                      ? 'bg-gradient-harx text-white hover:shadow-lg hover:shadow-harx-500/20 hover:-translate-y-0.5'
                                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                }`}
                                disabled={!isSignedByMe && (!canUseCopilot || copilotGuard.loading || leadLockedByOther || claimingCockpit)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isSignedByMe) {
                                    handleViewSignedLeadDetails(lead);
                                    return;
                                  }
                                  void handleCallClick(lead);
                                }}
                                title={
                                  isSignedByMe
                                    ? 'Voir les détails de la vente signée'
                                    : leadLockedByOther
                                      ? 'Ce prospect est ouvert dans le cockpit d’un autre agent'
                                      : !canUseCopilot && copilotGuard.reason
                                        ? copilotGuard.reason
                                        : ''
                                }
                              >
                                {isSignedByMe ? (
                                  <Eye className="w-3.5 h-3.5" />
                                ) : (
                                  <Phone className="w-3.5 h-3.5" />
                                )}
                                <span>
                                  {claimingCockpit ? '...' : isSignedByMe ? 'Détails' : 'Call'}
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                    {totalPages > 1 && !searchQuery.trim() && (
                      <div className="mt-8 flex justify-center items-center gap-6">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className={`flex items-center px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentPage === 1
                            ? 'bg-gray-50 text-gray-300 cursor-not-allowed border border-gray-100'
                            : 'bg-white text-gray-700 hover:bg-harx-50 hover:text-harx-600 border border-gray-100 shadow-sm'
                            }`}
                        >
                          <ChevronLeft className="w-4 h-4 mr-2" />
                          Previous
                        </button>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                          <span>Page</span>
                          <input
                            type="number"
                            min={1}
                            max={totalPages}
                            value={pageInput}
                            onChange={(e) => setPageInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                goToPage(pageInput);
                              }
                            }}
                            onBlur={() => goToPage(pageInput)}
                            className="w-14 px-2 py-1.5 text-center text-gray-900 font-black border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-harx-500 focus:border-harx-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            aria-label="Page number"
                          />
                          <span>
                            of <span className="text-gray-900">{totalPages}</span>
                          </span>
                        </div>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className={`flex items-center px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentPage === totalPages
                            ? 'bg-gray-50 text-gray-300 cursor-not-allowed border border-gray-100'
                            : 'bg-white text-gray-700 hover:bg-harx-50 hover:text-harx-600 border border-gray-100 shadow-sm'
                            }`}
                        >
                          Next
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );

      case 'video':
        return (
          <div className="h-[600px] bg-gray-900 rounded-3xl p-8 text-white flex flex-col shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-harx-500/10 blur-[100px] -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 blur-[100px] -ml-32 -mb-32"></div>

            <div className="relative z-10 flex justify-between items-center mb-12">
              <div className="flex items-center space-x-5">
                <div className="w-14 h-14 bg-gradient-harx rounded-2xl flex items-center justify-center shadow-lg shadow-harx-500/20">
                  <User className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight">{selectedLead?.Deal_Name || 'No Customer Selected'}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">In call: <span className="text-emerald-400">00:12:34</span></p>
                  </div>
                </div>
              </div>
              <button className="p-4 bg-red-500/20 backdrop-blur-md rounded-2xl hover:bg-red-500/40 text-red-500 transition-all border border-red-500/20">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center relative z-10">
              <div className="text-center group">
                <div className="w-40 h-40 bg-white/5 rounded-full mx-auto mb-6 flex items-center justify-center border border-white/10 shadow-inner group-hover:scale-105 transition-transform duration-500">
                  <User className="w-20 h-20 text-gray-600" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Video disabled</p>
              </div>
            </div>
          </div>
        );

      case 'email':
        return (
          <div className="h-[600px] bg-white/80 backdrop-blur-md rounded-3xl border border-gray-100 flex flex-col shadow-sm">
            <div className="p-6 border-b border-gray-100">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2 px-1">Subject</label>
              <input
                type="text"
                placeholder="Enter email subject..."
                className="w-full px-5 py-3 border border-gray-50 rounded-2xl bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-harx-500 focus:bg-white transition-all text-sm font-medium"
              />
            </div>
            <div className="flex-1 p-6">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2 px-1">Message Body</label>
              <textarea
                className="w-full h-[calc(100%-28px)] p-6 border border-gray-50 rounded-3xl bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-harx-500 focus:bg-white transition-all text-sm font-medium resize-none leading-relaxed"
                placeholder="Compose your response..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50/30 flex justify-between items-center rounded-b-3xl">
              <div className="flex space-x-3">
                <button className="p-3 text-gray-400 hover:text-harx-600 hover:bg-harx-50 rounded-xl transition-all border border-transparent hover:border-harx-100">
                  <Paperclip className="w-5 h-5" />
                </button>
                <button className="p-3 text-gray-400 hover:text-harx-600 hover:bg-harx-50 rounded-xl transition-all border border-transparent hover:border-harx-100">
                  <Image className="w-5 h-5" />
                </button>
              </div>
              <button className="px-8 py-3 bg-gradient-harx text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:shadow-lg hover:shadow-harx-500/20 transition-all hover:-translate-y-0.5">
                Send Email
              </button>
            </div>
          </div>
        );

      case 'calls':
        return (
          <div className="h-[600px] bg-white/80 backdrop-blur-md rounded-2xl p-5 overflow-y-auto shadow-sm border border-gray-100">
            <CallRecords
              leadId={searchParams.get('leadId') || undefined}
              autoOpenSid={pendingOpenCallSid || undefined}
              onAutoOpenHandled={() => setPendingOpenCallSid(null)}
            />
          </div>
        );

      case 'social':
        return (
          <div className="h-[600px] bg-white/80 backdrop-blur-md rounded-3xl border border-gray-100 flex flex-col shadow-sm">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/10 rounded-t-3xl text-[10px] font-black uppercase tracking-widest">
              <div className="flex space-x-4">
                <select className="bg-white border border-gray-100 rounded-xl px-4 py-2 text-gray-500 focus:outline-none focus:ring-2 focus:ring-harx-500 transition-all shadow-sm">
                  <option>Twitter</option>
                  <option>Facebook</option>
                  <option>Instagram</option>
                </select>
                <select className="bg-white border border-gray-100 rounded-xl px-4 py-2 text-gray-500 focus:outline-none focus:ring-2 focus:ring-harx-500 transition-all shadow-sm">
                  <option>Public Posts</option>
                  <option>Direct Messages</option>
                  <option>Comments</option>
                </select>
              </div>
              <button className="p-3 bg-white text-gray-400 rounded-xl border border-gray-100 hover:text-harx-600 hover:bg-harx-50 transition-all shadow-sm">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-8 overflow-y-auto">
              <div className="space-y-6">
                <div className="border border-gray-100 rounded-3xl p-6 bg-white hover:bg-harx-50/20 transition-all group hover:shadow-lg hover:shadow-harx-500/5">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-harx rounded-2xl flex items-center justify-center shadow-lg shadow-harx-500/10">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-black text-gray-900 group-hover:text-harx-600 transition-colors uppercase text-sm tracking-tight">@customer123</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">2 minutes ago</p>
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed font-medium">Having issues with my recent purchase. Can someone help?</p>
                  <div className="mt-6 flex space-x-6">
                    <button className="text-[10px] font-black uppercase tracking-widest text-harx-600 hover:text-harx-700 underline decoration-2 underline-offset-4">Reply</button>
                    <button className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600">DM</button>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50/30 rounded-b-3xl">
              <textarea
                className="w-full p-5 border border-gray-50 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-harx-500 transition-all text-sm font-medium shadow-sm resize-none leading-relaxed"
                placeholder="Compose your response..."
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <div className="mt-4 flex justify-between items-center px-1">
                <div className="flex space-x-3">
                  <button className="p-3 text-gray-400 hover:text-harx-600 hover:bg-harx-50 rounded-xl transition-all border border-transparent hover:border-harx-100">
                    <Image className="w-5 h-5" />
                  </button>
                </div>
                <button className="px-8 py-3 bg-gradient-harx text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:shadow-lg hover:shadow-harx-500/20 transition-all hover:-translate-y-0.5">
                  Post Reply
                </button>
              </div>
            </div>
          </div>
        );
      case 'copilot':
        return (
          <div className="w-full relative bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-300" style={{ minHeight: '600px' }}>
            {copilotGuard.loading ? (
              <div className="flex flex-col items-center justify-center h-full pt-32 text-gray-400">
                <p className="text-sm font-bold uppercase tracking-widest">Checking call permissions...</p>
              </div>
            ) : !canUseCopilot ? (
              <div className="flex flex-col items-center justify-center h-full pt-24 text-center px-8">
                <Phone className="w-12 h-12 mb-4 text-gray-300" />
                <p className="text-sm font-black uppercase tracking-widest text-gray-700">COCKPIT Locked</p>
                <p className="text-xs mt-2 text-gray-500 max-w-xl">
                  {copilotGuard.reason || 'You cannot place calls right now.'}
                </p>
                {copilotGuard.reservationWindowLabel && (
                  <p className="text-xs mt-2 text-emerald-600 font-bold">
                    Active reserved window: {copilotGuard.reservationWindowLabel}
                  </p>
                )}
              </div>
            ) : cockpitAccessDenied ? (
              <div className="flex flex-col items-center justify-center h-full pt-24 text-center px-8">
                <AlertTriangle className="w-12 h-12 mb-4 text-amber-500" />
                <p className="text-sm font-black uppercase tracking-widest text-gray-700">Prospect occupé</p>
                <p className="text-xs mt-2 text-gray-500 max-w-xl">{cockpitAccessDenied}</p>
                <button
                  type="button"
                  onClick={() => {
                    setCockpitAccessDenied(null);
                    setActiveTab('voice');
                    const params = new URLSearchParams(location.search);
                    params.set('tab', 'voice');
                    navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true });
                  }}
                  className="mt-6 px-6 py-2 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl"
                >
                  Retour aux leads
                </button>
              </div>
            ) : (selectedLead || urlLeadId) ? (
              <CopilotApp />
            ) : (
              <div className="flex flex-col items-center justify-center h-full pt-32 text-gray-400 animate-in fade-in">
                <Phone className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-sm font-bold uppercase tracking-widest">No lead selected</p>
                <p className="text-xs mt-2">Please select a lead from the Leads tab to start a call.</p>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const handleViewSignedLeadDetails = (lead: Lead) => {
    const leadIdString = String(lead._id || lead.id || '');
    if (!leadIdString) return;
    setSignedLeadOverlayId(leadIdString);
  };

  const handleCallClick = async (lead: Lead) => {
    if (!canUseCopilot) {
      setShowWarningModal(true);
      return;
    }
    if (lead.isSignedByMe) {
      handleViewSignedLeadDetails(lead);
      return;
    }
    if (isLeadCockpitLockedByOther(lead, myAgentId)) {
      setCockpitAccessDenied('Ce prospect est déjà ouvert dans le cockpit d’un autre agent.');
      return;
    }

    const leadIdString = lead._id || lead.id;
    if (!myAgentId) return;

    setClaimingCockpit(true);
    const result = await claimCockpit(leadIdString, myAgentId, activeEnrolledGigId);
    setClaimingCockpit(false);

    if (!result.ok || !result.success) {
      setCockpitAccessDenied(
        result.message || 'Impossible d’ouvrir le cockpit pour ce prospect.'
      );
      fetchLeads(currentPage, searchQuery);
      return;
    }

    setCockpitAccessDenied(null);
    setCockpitClaimedLeadId(leadIdString);
    sessionStorage.setItem('activeLeadId', leadIdString);
    if (activeEnrolledGigId) {
      sessionStorage.setItem('activeGigId', activeEnrolledGigId);
    }

    const params = new URLSearchParams(location.search);
    params.delete('leadId');
    params.delete('gigId');
    params.set('tab', 'copilot');

    navigate({
      pathname: location.pathname,
      search: `?${params.toString()}`
    }, { replace: true });
    setSelectedLead(lead);
    setActiveTab('copilot');
  };

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-3">{t('workspace.title')}</h1>

        {enrolledGigs.length > 0 && (
          <div className="flex flex-col items-start space-y-1 relative">
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1 flex items-center gap-1.5">
              <Filter className="w-2.5 h-2.5" />
              Active Gig
            </span>

            <div className="relative w-full md:w-[480px]">
              <button
                onClick={() => setIsGigDropdownOpen(!isGigDropdownOpen)}
                className="w-full bg-white border border-gray-100 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs font-bold text-gray-800 hover:border-harx-200 hover:shadow-md transition-all duration-300 group"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300 shrink-0">
                    <Layout className="w-3.5 h-3.5 text-rose-500" />
                  </div>
                  <span className="truncate text-left font-bold text-slate-700 text-xs">
                    {selectedGigId
                      ? enrolledGigs.find(g => g._id === selectedGigId)?.title
                      : 'All My Gigs'}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-500 ${isGigDropdownOpen ? 'rotate-180 text-rose-500' : ''}`} />
              </button>

              {isGigDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsGigDropdownOpen(false)}
                  ></div>
                  <div className="absolute top-full left-0 mt-2 w-full bg-white border border-gray-100/90 rounded-xl shadow-2xl shadow-slate-200/80 py-1.5 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                    <button
                      onClick={() => {
                        setSelectedGigId('');
                        setCurrentPage(1);
                        setIsGigDropdownOpen(false);
                        const params = new URLSearchParams(location.search);
                        params.delete('gigId');
                        navigate({
                          pathname: location.pathname,
                          search: `?${params.toString()}`
                        }, { replace: true });
                      }}
                      className={`w-full px-5 py-3 text-left text-xs font-black uppercase tracking-wider transition-all flex items-center gap-3 hover:bg-slate-50/80 ${!selectedGigId ? 'text-rose-600 bg-rose-50/30' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <div className={`w-2 h-2 rounded-full ${!selectedGigId ? 'bg-rose-500 ring-4 ring-rose-500/20' : 'bg-slate-300'}`}></div>
                      All My Gigs
                    </button>
                    <div className="h-px bg-slate-100 mx-4 my-1 opacity-60"></div>
                    {enrolledGigs.map((g) => (
                      <button
                        key={g._id}
                        onClick={() => {
                          setSelectedGigId(g._id);
                          setCurrentPage(1);
                          setIsGigDropdownOpen(false);
                          const params = new URLSearchParams(location.search);
                          params.set('gigId', g._id);
                          navigate({
                            pathname: location.pathname,
                            search: `?${params.toString()}`
                          }, { replace: true });
                        }}
                        className={`w-full px-5 py-3 text-left text-xs font-bold transition-all flex items-start gap-3 hover:bg-slate-50/80 ${selectedGigId === g._id ? 'text-rose-600 bg-rose-50/30 font-extrabold' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${selectedGigId === g._id ? 'bg-rose-500 ring-4 ring-rose-500/20' : 'bg-slate-300'}`}></div>
                        <span className="leading-tight">{g.title}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-5 gap-3 mb-4">
        {workspaceTools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => {
              if (tool.id === 'copilot' && !canUseCopilot) {
                setShowWarningModal(true);
                return;
              }
              setActiveTab(tool.id);
              const params = new URLSearchParams(location.search);
              params.set('tab', tool.id);
              navigate({
                pathname: location.pathname,
                search: `?${params.toString()}`
              }, { replace: true });
            }}
            className={`flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl transition-all duration-300 border ${activeTab === tool.id
              ? 'bg-gradient-harx text-white border-transparent shadow-xl shadow-harx-500/25 -translate-y-0.5'
              : 'bg-white/50 backdrop-blur-sm text-gray-400 border-gray-100 hover:border-harx-200 hover:bg-white hover:text-harx-600 hover:shadow-lg hover:shadow-harx-500/5'
              }`}
          >
            <tool.icon className={`w-4 h-4 transition-transform duration-500 ${activeTab === tool.id ? 'text-white scale-110' : 'text-current group-hover:scale-110'}`} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{tool.label}</span>
          </button>
        ))}
      </div>

      <div className="w-full">
        {renderWorkspace()}
      </div>

      {/* Renders the beautiful fullscreen portal split modal inside body */}
      <IframeWorkspace />

      {/* Premium Cockpit Lock Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-[2rem] p-8 shadow-2xl shadow-black/80 overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Glowing background light */}
            <div className="absolute -top-12 -left-12 w-40 h-40 bg-rose-500/10 blur-[60px] rounded-full pointer-events-none"></div>
            <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-purple-500/10 blur-[60px] rounded-full pointer-events-none"></div>

            {/* Header section with Shield Alert icon */}
            <div className="flex flex-col items-center text-center mb-6 relative">
              <div className="p-4 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-2xl mb-4 shadow-inner shadow-rose-500/5 animate-pulse">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-white tracking-wide uppercase">
                {t('workspaceGuard.modalTitle')}
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1">
                {t('workspaceGuard.modalSubtitle')}
              </p>
            </div>

            {/* Requirements Checklist */}
            <div className="space-y-3 mb-8 relative">
              {/* Check 1: Enrolled in Gig */}
              <div className={`p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-4 ${copilotGuard.isEnrolledInGig
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-rose-500/5 border-rose-500/10 opacity-75'
                }`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl shrink-0 ${copilotGuard.isEnrolledInGig ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                    <Layout className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-200">
                      {t('workspaceGuard.checkGigTitle')}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      {t('workspaceGuard.checkGigDesc')}
                    </p>
                  </div>
                </div>
                <div className="shrink-0">
                  {copilotGuard.isEnrolledInGig ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400" />
                  )}
                </div>
              </div>

              {/* Check 2: Training Complete */}
              <div className={`p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-4 ${copilotGuard.isTrainingComplete
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-rose-500/5 border-rose-500/10 opacity-75'
                }`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl shrink-0 ${copilotGuard.isTrainingComplete ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-200">
                      {t('workspaceGuard.checkTrainingTitle')}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      {t('workspaceGuard.checkTrainingDesc')}
                    </p>
                  </div>
                </div>
                <div className="shrink-0">
                  {copilotGuard.isTrainingComplete ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400" />
                  )}
                </div>
              </div>

              {/* Check 3: Reservation Slot */}
              <div className={`p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-4 ${copilotGuard.hasActiveReservationNow
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-rose-500/5 border-rose-500/10 opacity-75'
                }`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl shrink-0 ${copilotGuard.hasActiveReservationNow ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-200">
                      {t('workspaceGuard.checkSessionTitle')}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      {t('workspaceGuard.checkSessionDesc')}
                    </p>
                  </div>
                </div>
                <div className="shrink-0">
                  {copilotGuard.hasActiveReservationNow ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400" />
                  )}
                </div>
              </div>
            </div>

            {/* Footer with actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5 relative">
              <button
                onClick={() => {
                  setShowWarningModal(false);
                  if (!activeEnrolledGigId || !copilotGuard.isEnrolledInGig) {
                    navigate('/marketplace');
                  } else if (!copilotGuard.isTrainingComplete) {
                    navigate(`/training?gigId=${activeEnrolledGigId}`);
                  } else if (!copilotGuard.hasActiveReservationNow) {
                    navigate(`/session-planning?gigId=${activeEnrolledGigId}`);
                  }
                }}
                className="w-full py-3 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-700 text-white font-extrabold uppercase tracking-widest text-[10px] rounded-2xl shadow-lg shadow-rose-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
              >
                {t('workspaceGuard.understandButton')}
              </button>
            </div>
          </div>
        </div>
      )}
      {signedLeadOverlayId && (
        <CallRecords
          overlayOpenLeadId={signedLeadOverlayId}
          onOverlayClose={() => setSignedLeadOverlayId(null)}
        />
      )}
    </div>
  );
}

export function Workspace() {
  return (
    <AgentProvider>
      <WorkspaceContent />
    </AgentProvider>
  );
}