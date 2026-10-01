import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Settings, Monitor, Calendar, X, ChevronDown, Phone, User, PhoneOutgoing, GraduationCap, AlertTriangle, Info, Lock } from 'lucide-react';
import { useRepTrainingNav } from '../../contexts/RepTrainingNavContext';
import { useTranslation } from 'react-i18next';
import harxLogo from '../../assets/logo-harx.png';
import mascotte from '../../assets/mascotte2.png';
import { getRepShellChrome } from '../../utils/harxBrand';
import { isCallCenterStaff as readCallCenterStaff } from '../../utils/callCenterStaff';
import { getAgentId, getAuthToken } from '../../utils/authUtils';
import { fetchEnrolledGigsForAgent } from '../../utils/trainingScriptRequirement';
import { persistActiveGigId, withActiveGig } from '../../utils/activeGigNav';
import { getRepOnboardingStep } from '../../utils/repOnboardingNextStep';
import { PROFILE_UPDATE_EVENT } from '../../utils/profileUtils';

// Declare qiankun global variables
declare global {
  interface Window {
    __POWERED_BY_QIANKUN__?: boolean;
    __INJECTED_PUBLIC_PATH_BY_QIANKUN__?: string;
  }
}

interface Phase {
  status: string;
  completedAt?: string;
  requiredActions?: any[];
  optionalActions?: any[];
}

interface Phases {
  phase1: Phase;
  phase2: Phase;
  phase3: Phase;
  phase4: Phase;
  phase5: Phase;
}

interface SidebarProps {
  phases: Phases | undefined;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
}

type TrainingSidebarSlide = { title: string; globalIndex: number; slideId: string };

type TrainingSidebarModule = {
  title: string;
  sections: string[];
  slides: TrainingSidebarSlide[];
};

const PHASE_COMPLETION_CACHE_KEY = 'rep_phase_completion';

const readPhaseCompletionCache = (): Record<number, boolean> => {
  try {
    const raw = localStorage.getItem(PHASE_COMPLETION_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

/** Fallback when the `phases` prop is still loading after login (logout clears cache). */
const readPhasesFromProfileStorage = (): Phases | undefined => {
  try {
    const raw = localStorage.getItem('profileData');
    if (!raw) return undefined;
    const profile = JSON.parse(raw);
    return profile?.onboardingProgress?.phases;
  } catch {
    return undefined;
  }
};

const isProfilePublishedInStorage = (): boolean => {
  try {
    const raw = localStorage.getItem('profileData');
    if (!raw) return false;
    return JSON.parse(raw)?.status === 'completed';
  } catch {
    return false;
  }
};

export function Sidebar({ phases, isSidebarOpen, setIsSidebarOpen, isCollapsed, setIsCollapsed }: SidebarProps) {

  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // While the profile is still loading, `phases` is undefined. Rather than
  // momentarily assuming onboarding is incomplete (which flashes the warning
  // card + an empty menu before the real data arrives), fall back to the last
  // known completion snapshot persisted in localStorage.
  const effectivePhases = phases ?? readPhasesFromProfileStorage();

  const isPhaseCompleted = (phaseNumber: number): boolean => {
    if (effectivePhases) {
      return effectivePhases[`phase${phaseNumber}` as keyof Phases]?.status === 'completed';
    }
    return readPhaseCompletionCache()[phaseNumber] === true;
  };

  // Persist the completion snapshot whenever real phases are available.
  useEffect(() => {
    if (!phases) return;
    const snapshot: Record<number, boolean> = {};
    for (let n = 1; n <= 5; n++) {
      snapshot[n] = phases[`phase${n}` as keyof Phases]?.status === 'completed';
    }
    try {
      localStorage.setItem(PHASE_COMPLETION_CACHE_KEY, JSON.stringify(snapshot));
    } catch {
      /* ignore storage errors */
    }
  }, [phases]);

  // Close sidebar on navigation (responsive screen widths)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname, setIsSidebarOpen]);

  // Onboarding is considered complete (agent profile created) only when the
  // required phases 1-4 are all completed. While incomplete, we hide Dashboard,
  // Planning and Wallet and show an onboarding guide instead.
  const isCallCenterStaff = readCallCenterStaff();
  const chrome = getRepShellChrome(isCallCenterStaff);
  const activeIconClass = isCallCenterStaff
    ? 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg shadow-emerald-500/30'
    : 'bg-gradient-to-br from-orange-500 to-pink-600 text-white shadow-lg shadow-pink-500/30';
  const sectionLabelClass = isCallCenterStaff
    ? 'px-2 pb-1 text-[9px] font-extrabold uppercase tracking-[0.18em] bg-gradient-to-r from-emerald-200 to-teal-100 bg-clip-text text-transparent select-none'
    : 'px-2 pb-1 text-[9px] font-extrabold uppercase tracking-[0.18em] bg-gradient-to-r from-white to-pink-200 bg-clip-text text-transparent select-none';  // Full nav unlocks only after publish - phases 1-4 alone must not open marketplace.
  // Re-read on PROFILE_UPDATED so sidebar unlocks immediately after publish+avis
  // without requiring a full page refresh.
  const [profilePublished, setProfilePublished] = React.useState(() =>
    isProfilePublishedInStorage()
  );
  useEffect(() => {
    const sync = () => setProfilePublished(isProfilePublishedInStorage());
    sync();
    window.addEventListener(PROFILE_UPDATE_EVENT, sync);
    return () => window.removeEventListener(PROFILE_UPDATE_EVENT, sync);
  }, []);

  const onboardingComplete = isCallCenterStaff || profilePublished;

  const isProfileCreationPage =
    location.pathname.includes('/profile-import') ||
    location.pathname.includes('/profile-editor');

  const [isWorkspaceOpen, setIsWorkspaceOpen] = React.useState(location.pathname.includes('/workspace'));
  const [isTrainingOpen, setIsTrainingOpen] = React.useState(location.pathname.includes('/training'));
  const [showCockpitGigModal, setShowCockpitGigModal] = React.useState(false);
  const [cockpitGigOptions, setCockpitGigOptions] = React.useState<{ gigId: string; title: string }[]>([]);
  const [cockpitGigLoading, setCockpitGigLoading] = React.useState(false);
  const [selectedCockpitGigId, setSelectedCockpitGigId] = React.useState('');
  const [isCockpitGigDropdownOpen, setIsCockpitGigDropdownOpen] = React.useState(false);
  const [openTrainingModuleIndexes, setOpenTrainingModuleIndexes] = React.useState<number[]>([]);
  const {
    trainingModules,
    activeTrainingModuleIndex,
    activeTrainingSlideIndex
  } = useRepTrainingNav();

  const resolveSpecificGigId = React.useCallback((): string | null => {
    const trainingFilter = String(sessionStorage.getItem('training_gig_filter') || '').trim();
    if (trainingFilter && trainingFilter !== '__all__') return trainingFilter;
    return null;
  }, []);

  const toWithGig = React.useCallback((path: string) => {
    const base = path.split('?')[0];
    if (base === '/workspace' || base === '/training' || base === '/session-planning') {
      return withActiveGig(path);
    }
    return path;
  }, []);

  const openCockpitWithGig = React.useCallback(
    (gigId?: string | null) => {
      const id = String(gigId || '').trim();
      // Opening COCKPIT from the sidebar is not a lead selection — clear any
      // stale prospect so the phone number is only shown after picking from Prospects.
      sessionStorage.removeItem('activeLeadId');
      if (id) {
        persistActiveGigId(id);
        navigate(`/workspace?tab=copilot&gigId=${encodeURIComponent(id)}`, {
          state: { gigId: id, clearLead: true },
        });
      } else {
        navigate('/workspace?tab=copilot', { state: { clearLead: true } });
      }
      setShowCockpitGigModal(false);
      setIsSidebarOpen(false);
    },
    [navigate, setIsSidebarOpen]
  );

  const openCockpitGigPicker = React.useCallback(async () => {
    setShowCockpitGigModal(true);
    setCockpitGigLoading(true);
    setSelectedCockpitGigId('');
    setCockpitGigOptions([]);
    setIsCockpitGigDropdownOpen(false);
    try {
      const agentId = getAgentId();
      const token = getAuthToken();
      if (!agentId || !token) return;
      const gigs = await fetchEnrolledGigsForAgent(agentId, token);
      setCockpitGigOptions(gigs);
      if (gigs.length === 1) {
        setSelectedCockpitGigId(gigs[0].gigId);
      }
    } catch {
      setCockpitGigOptions([]);
    } finally {
      setCockpitGigLoading(false);
    }
  }, []);

  // Ensure workspace is open if we navigate there externally
  useEffect(() => {
    if (location.pathname.includes('/workspace')) {
      setIsWorkspaceOpen(true);
    }
    if (location.pathname.includes('/training')) {
      setIsTrainingOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    const idx = activeTrainingModuleIndex;
    if (!Number.isFinite(idx)) return;
    setOpenTrainingModuleIndexes((prev) => (prev.includes(idx) ? prev : [...prev, idx]));
  }, [activeTrainingModuleIndex]);

  const navItems = [
    {
      icon: LayoutDashboard,
      label: isCallCenterStaff
        ? t('sidebar.ccHome', 'Home')
        : t('sidebar.dashboard'),
      // Must be `/dashboard`: the exact `/` route renders the onboarding
      // orchestrator (OnboardingDashboard), the real dashboard lives under
      // the DashboardRoutes catch-all at `/dashboard`.
      path: '/dashboard',
      isAccessible: () => onboardingComplete
    },
    {
      icon: Briefcase,
      label: t('sidebar.marketplace'),
      path: '/marketplace',
      isAccessible: () => onboardingComplete && !isCallCenterStaff
    },

    {
      icon: GraduationCap,
      label: t('sidebar.training'),
      path: '/training',
      isAccessible: () => onboardingComplete && !isCallCenterStaff,
      subItems: trainingModules.map((module, idx) => ({
        label: module.title,
        sections: module.sections,
        slides: module.slides,
        path: `/training#module-${idx + 1}`
      }))
    },
    {
      icon: Monitor,
      label: t('sidebar.workspace'),
      path: '/workspace',
      isAccessible: () => onboardingComplete,
      subItems: [
        { label: t('sidebar.leads'), path: '/workspace?tab=voice', icon: User },
        { label: t('sidebar.callHistory'), path: '/workspace?tab=calls', icon: PhoneOutgoing },
        { label: t('sidebar.copilot'), path: '/workspace?tab=copilot', icon: Phone }
      ]
    },
    {
      icon: Settings,
      label: t('sidebar.operations'),
      path: '/operations',
      isAccessible: () => onboardingComplete && !isCallCenterStaff && isPhaseCompleted(5)
    },
    {
      icon: Calendar,
      label: t('sidebar.sessionPlanning'),
      path: '/session-planning',
      isAccessible: () => onboardingComplete && !isCallCenterStaff
    },
  ];

  const filteredNavItems = navItems.filter(item => item.isAccessible());

  // Until onboarding is fully done, keep the sidebar as orchestrator guidance only
  // (no Dashboard / Marketplace / Workspace / Training / Planning links).
  const showOrchestratorOnly = !isCallCenterStaff && (!onboardingComplete || isProfileCreationPage);
  const group1 = showOrchestratorOnly
    ? []
    : filteredNavItems.filter(i =>
        isCallCenterStaff
          ? ['/dashboard', '/workspace'].includes(i.path)
          : ['/dashboard', '/marketplace', '/workspace'].includes(i.path)
      );
  const group2 = showOrchestratorOnly || isCallCenterStaff
    ? []
    : filteredNavItems.filter(i => ['/training'].includes(i.path));
  const group3 = showOrchestratorOnly || isCallCenterStaff
    ? []
    : filteredNavItems.filter(i => ['/session-planning'].includes(i.path));

  useEffect(() => {
    console.log('🔒 Access Control Status:', {
      phases,
      availableNavItems: filteredNavItems.map(item => item.label),
    });
  }, [phases]);

  return (
    <div
      style={{ backgroundImage: chrome.sidebarBg, boxShadow: chrome.barShadow }}
      className={`fixed inset-y-0 left-0 z-30 text-white transition-all duration-300 ease-in-out lg:relative flex flex-col overflow-hidden ${!isSidebarOpen
          ? '-translate-x-full lg:translate-x-0'
          : 'translate-x-0'
        } w-64`}
    >
      {/* Logo strip — same height as navbar (h-16) for a seamless top row */}
      <div className="relative h-16 shrink-0 flex items-center justify-center w-full overflow-hidden px-4 z-10">
        <img
          src={harxLogo}
          alt="HARX"
          className="w-full scale-110 object-contain"
        />
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="lg:hidden absolute top-2 right-2 p-1.5 rounded-lg bg-black/20 hover:bg-black/30 transition-colors"
          aria-label="Close menu"
        >
          <X className="h-4 w-4 text-white" />
        </button>
      </div>
      {isCallCenterStaff && !isCollapsed ? (
        <div className="px-4 pb-2">
          <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-200">
            {t('sidebar.ccAgentBadge', 'Call center agent')}
          </span>
        </div>
      ) : null}

      {/* Sidebar body */}
      <div className="relative flex flex-1 min-h-0 flex-col overflow-hidden">
      <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-5">
        {/* ── Mascotte + onboarding CTA while incomplete ── */}
        {showOrchestratorOnly && !isCollapsed && (
          <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-b from-white/15 via-rose-500/15 to-fuchsia-600/10 p-4 shadow-[0_12px_40px_-18px_rgba(255,77,77,0.55)]">
            <div className="pointer-events-none absolute -top-8 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full bg-rose-400/40 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-10 -right-6 h-20 w-20 rounded-full bg-fuchsia-500/30 blur-2xl" />
            <div className="relative flex flex-col items-center text-center">
              <div className="relative mb-3">
                <div className="absolute inset-0 scale-110 rounded-full bg-gradient-to-br from-rose-400/50 to-fuchsia-500/40 blur-md" />
                <img
                  src={mascotte}
                  alt=""
                  aria-hidden="true"
                  className="relative w-[5.5rem] h-auto drop-shadow-[0_10px_24px_rgba(0,0,0,0.35)]"
                />
              </div>
              <div className="w-full rounded-2xl bg-[#E11D48] p-3.5 text-left shadow-inner">
                <div className="mb-2 flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-300/50 bg-amber-400/15">
                    <Lock className="h-3.5 w-3.5 text-amber-300" strokeWidth={2.5} />
                  </span>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.12em] text-amber-300 leading-tight">
                    {t('onboardingGuide.title')}
                  </h3>
                </div>
                <p className="text-[11px] font-medium leading-snug text-white/95">
                  {t('onboardingGuide.description')}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    let profile: any = null;
                    try {
                      const raw = localStorage.getItem('profileData');
                      if (raw) profile = JSON.parse(raw);
                    } catch {
                      /* ignore */
                    }
                    let path = getRepOnboardingStep(profile).path || '/profile-import';
                    // Already reviewing the profile → next step is subscription.
                    if (
                      (location.pathname === '/profile' || location.pathname.startsWith('/profile/')) &&
                      path === '/profile'
                    ) {
                      path = '/subscription';
                    }
                    navigate(path);
                    setIsSidebarOpen(false);
                  }}
                  className="mt-3 w-full rounded-xl bg-amber-400 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-md transition hover:bg-amber-300 active:scale-[0.98]"
                >
                  {t('onboardingGuide.cta')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Group 1: Main (hidden until onboarding is complete) ── */}
        {!showOrchestratorOnly && group1.length > 0 && (
        <div className="space-y-1">
          {!isCollapsed && (
            <p className={sectionLabelClass}>{t('sidebar.sectionMain')}</p>
          )}
          {group1.map((item) => (
            <div key={item.path} className="space-y-1">
              {item.label === t('sidebar.training') && Array.isArray(item.subItems) && item.subItems.length > 0 && !isCollapsed ? (
                <>
                  <button
                    onClick={() => {
                      setIsTrainingOpen(!isTrainingOpen);
                      if (!location.pathname.includes('/training')) navigate(withActiveGig('/training'));
                    }}
                    className={`flex w-full items-center rounded-2xl transition-all duration-300 group relative space-x-3 py-3 px-5 ${isTrainingOpen || window.location.pathname.includes(item.path)
                        ? 'bg-white/5 text-white'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                  >
                    <div className={`p-2 rounded-xl transition-all shrink-0 ${isTrainingOpen || window.location.pathname.includes(item.path) ? activeIconClass : 'bg-white/10 group-hover:bg-white/20'}`}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <span className="font-black text-sm tracking-tight whitespace-nowrap overflow-hidden flex-1 text-left">{item.label}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isTrainingOpen ? 'rotate-180 text-harx-400' : 'text-gray-400'}`} />
                  </button>
                  {isTrainingOpen && (
                    <div className="ml-4 pl-3 border-l border-white/[0.08] space-y-0.5 animate-in slide-in-from-top-1 duration-200">
                      {item.subItems.map((sub: any, idx) => {
                        const isActiveSub = activeTrainingModuleIndex === idx && location.pathname.includes('/training');
                        const moduleOpen = openTrainingModuleIndexes.includes(idx);
                        const slideList: TrainingSidebarSlide[] = Array.isArray(sub.slides) ? sub.slides : [];
                        const moduleRow = (active: boolean) =>
                          `group/mod flex w-full items-center justify-between gap-2 rounded-lg transition-all duration-200 py-2 px-2.5 ${active
                            ? 'bg-white/[0.06] text-white shadow-[inset_3px_0_0_0] shadow-harx-500'
                            : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
                          }`;
                        const moduleTitle = (active: boolean) =>
                          `min-w-0 flex-1 truncate text-left text-[10px] font-bold uppercase tracking-wider leading-tight ${active ? 'text-harx-200' : 'text-gray-400 group-hover/mod:text-gray-300'
                          }`;
                        const slideRow = (active: boolean) =>
                          `group/sl flex w-full items-start gap-2 rounded-md py-1.5 pl-2.5 pr-2 text-left transition-all duration-200 ${active
                            ? 'bg-harx-500/[0.12] text-harx-100 ring-1 ring-harx-500/20'
                            : 'text-gray-500 hover:bg-white/[0.03] hover:text-gray-300'
                          }`;
                        const slideTitle = (active: boolean) =>
                          `min-w-0 flex-1 text-left text-[9.5px] font-medium leading-snug tracking-wide ${active ? 'text-harx-50' : 'text-gray-500 group-hover/sl:text-gray-400'
                          }`;
                        return (
                          <div key={sub.path} className="space-y-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenTrainingModuleIndexes((prev) =>
                                  prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx]
                                )
                              }
                              className={moduleRow(isActiveSub)}
                            >
                              <p className={moduleTitle(isActiveSub)}>
                                <span className="mr-1 font-extrabold tabular-nums text-harx-500/90">{idx + 1}.</span>
                                {sub.label}
                              </p>
                              <ChevronDown
                                className={`h-3 w-3 shrink-0 opacity-70 transition-transform duration-200 ${moduleOpen ? 'rotate-180 text-harx-400' : 'text-gray-500 group-hover/mod:text-gray-400'
                                  }`}
                              />
                            </button>
                            {moduleOpen && (
                              <div className="relative ml-1.5 pl-2.5 pt-0.5 pb-0.5">
                                <div
                                  className="pointer-events-none absolute left-0 top-1 bottom-1 w-px bg-gradient-to-b from-harx-500/35 via-white/12 to-transparent"
                                  aria-hidden
                                />
                                {slideList.length === 0 ? (
                                  <div className={`${slideRow(false)} opacity-70`}>
                                    <p className={slideTitle(false)}>No slides</p>
                                  </div>
                                ) : (
                                  slideList.map((slide, slideIdx) => {
                                    const isSlideActive =
                                      slide.globalIndex >= 0 &&
                                      slide.globalIndex === activeTrainingSlideIndex &&
                                      location.pathname.includes('/training');
                                    return (
                                      <button
                                        key={`${sub.path}-slide-${slideIdx}`}
                                        type="button"
                                        onClick={() => {
                                          if (!location.pathname.includes('/training')) navigate(withActiveGig('/training'));
                                          if (slide.globalIndex >= 0) {
                                            window.dispatchEvent(
                                              new CustomEvent('rep-training-goto-slide', {
                                                detail: {
                                                  index: slide.globalIndex,
                                                  ...(slide.slideId ? { slideId: slide.slideId } : {})
                                                }
                                              })
                                            );
                                          }
                                        }}
                                        className={slideRow(isSlideActive)}
                                      >
                                        <span
                                          className={`mt-0.5 shrink-0 tabular-nums text-[9px] font-bold ${isSlideActive ? 'text-harx-400' : 'text-gray-600'
                                            }`}
                                        >
                                          {slideIdx + 1}.
                                        </span>
                                        <p className={slideTitle(isSlideActive)}>{slide.title}</p>
                                      </button>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : item.subItems && item.subItems.length > 0 && !isCollapsed ? (
                <>
                  <button
                    onClick={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
                    className={`flex w-full items-center rounded-2xl transition-all duration-300 group relative space-x-3 py-3 px-5 ${isWorkspaceOpen || window.location.pathname.includes(item.path)
                        ? 'bg-white/5 text-white'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                  >
                    <div className={`p-2 rounded-xl transition-all shrink-0 ${isWorkspaceOpen || window.location.pathname.includes(item.path) ? activeIconClass : 'bg-white/10 group-hover:bg-white/20'}`}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <span className="font-black text-sm tracking-tight whitespace-nowrap overflow-hidden flex-1 text-left">{item.label}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isWorkspaceOpen ? 'rotate-180 text-harx-400' : 'text-gray-400'}`} />
                  </button>

                  {isWorkspaceOpen && (
                    <div className="ml-5 pl-2 border-l border-white/15 space-y-1 animate-in slide-in-from-top-1 duration-200">
                      {item.subItems.map((sub) => {
                        const isSubActive = location.search.includes(sub.path.split('?')[1]);
                        return (
                          <NavLink
                            key={sub.path}
                            to={withActiveGig(sub.path)}
                            onClick={(e) => {
                              e.preventDefault();
                              if (sub.path.includes('tab=copilot')) {
                                const specificGigId = resolveSpecificGigId();
                                if (specificGigId) {
                                  openCockpitWithGig(specificGigId);
                                  return;
                                }
                                const trainingFilter = sessionStorage.getItem('training_gig_filter');
                                const onTrainingWithoutGig =
                                  location.pathname.includes('/training') &&
                                  (trainingFilter === '__all__' || !trainingFilter);
                                if (onTrainingWithoutGig) {
                                  void openCockpitGigPicker();
                                  return;
                                }
                                openCockpitWithGig(null);
                                return;
                              }
                              navigate(withActiveGig(sub.path));
                              setIsSidebarOpen(false);
                            }}
                            className={`flex w-full items-center rounded-xl transition-all duration-300 group relative space-x-3 py-2.5 px-4 ${isSubActive
                                ? 'bg-white/20 text-white border-l-2 border-white shadow-sm shadow-black/10'
                                : 'text-white/70 hover:bg-white/10 hover:text-white'
                              }`}
                          >
                            <sub.icon className={`h-3.5 w-3.5 transition-colors ${isSubActive ? 'text-white' : 'text-current'}`} />
                            <span className={`font-black text-[11px] uppercase tracking-widest ${isSubActive ? 'text-white' : 'text-current'}`}>
                              {sub.label}
                            </span>
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <NavLink
                  to={toWithGig(item.path)}
                  className={({ isActive }) =>
                    `flex w-full items-center rounded-2xl transition-all duration-300 group relative ${isCollapsed ? 'justify-center p-3' : 'space-x-3 py-3 px-5'
                    } ${isActive
                      ? 'bg-gradient-to-r from-[#FB5B56] to-[#EC268A] text-white shadow-lg shadow-[#EC268A]/50'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className={`p-2 rounded-xl transition-all shrink-0 ${isActive ? 'bg-white/25' : 'bg-white/10 group-hover:bg-white/20'}`}>
                        <item.icon className="h-5 w-5" />
                      </div>
                      {!isCollapsed && (
                        <span className="font-black text-sm tracking-tight whitespace-nowrap overflow-hidden flex items-center gap-1.5 min-w-0">
                          <span className="truncate">{item.label}</span>
                          {item.path === '/marketplace' ? (
                            <span
                              className="relative shrink-0 group/gigsinfo"
                              title={t('sidebar.gigsInfo')}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              role="img"
                              aria-label={t('sidebar.gigsInfo')}
                            >
                              <Info className="h-3.5 w-3.5 text-white/50 transition-colors group-hover/gigsinfo:text-white" />
                              <span className="pointer-events-none absolute left-1/2 top-full z-[60] mt-2 hidden w-52 -translate-x-1/2 rounded-lg border border-white/10 bg-slate-900 px-2.5 py-2 text-[10px] font-medium normal-case tracking-normal text-white shadow-xl group-hover/gigsinfo:block whitespace-normal leading-snug">
                                {t('sidebar.gigsInfo')}
                              </span>
                            </span>
                          ) : null}
                        </span>
                      )}
                      {isCollapsed && item.subItems && (
                        <div className="absolute top-0 right-0 w-2 h-2 bg-harx-500 rounded-full border-2 border-slate-950 translate-x-1/2 -translate-y-1/2"></div>
                      )}
                      {isCollapsed && (
                        <div className="absolute left-16 bg-slate-900 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl border border-white/10 max-w-[14rem] whitespace-normal">
                          {item.label}
                          {item.path === '/marketplace' ? (
                            <span className="mt-1 block text-[10px] text-slate-300 font-medium">
                              {t('sidebar.gigsInfo')}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </>
                  )}
                </NavLink>
              )}
            </div>
          ))}
        </div>
        )}

        {/* ── Divider ── */}
        {group2.length > 0 && (
          <div className="mx-2 border-t border-white/[0.07]" />
        )}

        {/* ── Group 2: Training & Planning ── */}
        {group2.length > 0 && (
          <div className="space-y-1">
            {!isCollapsed && (
              <p className={sectionLabelClass}>{t('sidebar.sectionTraining')}</p>
            )}
            {group2.map((item) => (
              <div key={item.path} className="space-y-1">
                {item.label === t('sidebar.training') && Array.isArray(item.subItems) && item.subItems.length > 0 && !isCollapsed ? (
                  <>
                    <button
                      onClick={() => {
                        setIsTrainingOpen(!isTrainingOpen);
                        if (!location.pathname.includes('/training')) navigate(withActiveGig('/training'));
                      }}
                      className={`flex w-full items-center rounded-2xl transition-all duration-300 group relative space-x-3 py-3 px-5 ${isTrainingOpen || window.location.pathname.includes(item.path)
                          ? 'bg-white/5 text-white'
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                    >
                      <div className={`p-2 rounded-xl transition-all shrink-0 ${isTrainingOpen || window.location.pathname.includes(item.path) ? activeIconClass : 'bg-white/10 group-hover:bg-white/20'}`}>
                        <item.icon className="h-5 w-5" />
                      </div>
                      <span className="font-black text-sm tracking-tight whitespace-nowrap overflow-hidden flex-1 text-left">{item.label}</span>
                      <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isTrainingOpen ? 'rotate-180 text-harx-400' : 'text-gray-400'}`} />
                    </button>
                    {isTrainingOpen && (
                      <div className="ml-4 pl-3 border-l border-white/[0.08] space-y-0.5 animate-in slide-in-from-top-1 duration-200">
                        {item.subItems.map((sub: any, idx: number) => {
                          const isActiveSub = activeTrainingModuleIndex === idx && location.pathname.includes('/training');
                          const moduleOpen = openTrainingModuleIndexes.includes(idx);
                          const slideList: TrainingSidebarSlide[] = Array.isArray(sub.slides) ? sub.slides : [];
                          return (
                            <div key={sub.path} className="space-y-0.5">
                              <button
                                type="button"
                                onClick={() => setOpenTrainingModuleIndexes((prev) => prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx])}
                                className={`group/mod flex w-full items-center justify-between gap-2 rounded-lg transition-all duration-200 py-2 px-2.5 ${isActiveSub ? 'bg-white/[0.06] text-white shadow-[inset_3px_0_0_0] shadow-harx-500' : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'}`}
                              >
                                <p className={`min-w-0 flex-1 truncate text-left text-[10px] font-bold uppercase tracking-wider leading-tight ${isActiveSub ? 'text-harx-200' : 'text-gray-400'}`}>
                                  <span className="mr-1 font-extrabold tabular-nums text-harx-500/90">{idx + 1}.</span>
                                  {sub.label}
                                </p>
                                <ChevronDown className={`h-3 w-3 shrink-0 opacity-70 transition-transform duration-200 ${moduleOpen ? 'rotate-180 text-harx-400' : 'text-gray-500'}`} />
                              </button>
                              {moduleOpen && (
                                <div className="relative ml-1.5 pl-2.5 pt-0.5 pb-0.5">
                                  <div className="pointer-events-none absolute left-0 top-1 bottom-1 w-px bg-gradient-to-b from-harx-500/35 via-white/12 to-transparent" aria-hidden />
                                  {slideList.length === 0 ? (
                                    <div className="flex w-full items-start gap-2 rounded-md py-1.5 pl-2.5 pr-2 opacity-70">
                                      <p className="text-[9.5px] text-gray-500">No slides</p>
                                    </div>
                                  ) : (
                                    slideList.map((slide, slideIdx) => {
                                      const isSlideActive = slide.globalIndex >= 0 && slide.globalIndex === activeTrainingSlideIndex && location.pathname.includes('/training');
                                      return (
                                        <button
                                          key={`${sub.path}-slide-${slideIdx}`}
                                          type="button"
                                          onClick={() => {
                                            if (!location.pathname.includes('/training')) navigate(withActiveGig('/training'));
                                            if (slide.globalIndex >= 0) {
                                              window.dispatchEvent(new CustomEvent('rep-training-goto-slide', { detail: { index: slide.globalIndex, ...(slide.slideId ? { slideId: slide.slideId } : {}) } }));
                                            }
                                          }}
                                          className={`group/sl flex w-full items-start gap-2 rounded-md py-1.5 pl-2.5 pr-2 text-left transition-all duration-200 ${isSlideActive ? 'bg-harx-500/[0.12] text-harx-100 ring-1 ring-harx-500/20' : 'text-gray-500 hover:bg-white/[0.03] hover:text-gray-300'}`}
                                        >
                                          <span className={`mt-0.5 shrink-0 tabular-nums text-[9px] font-bold ${isSlideActive ? 'text-harx-400' : 'text-gray-600'}`}>{slideIdx + 1}.</span>
                                          <p className={`min-w-0 flex-1 text-left text-[9.5px] font-medium leading-snug tracking-wide ${isSlideActive ? 'text-harx-50' : 'text-gray-500'}`}>{slide.title}</p>
                                        </button>
                                      );
                                    })
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <NavLink
                    to={toWithGig(item.path)}
                    className={({ isActive }) =>
                      `flex w-full items-center rounded-2xl transition-all duration-300 group relative ${isCollapsed ? 'justify-center p-3' : 'space-x-3 py-3 px-5'
                      } ${isActive
                        ? 'bg-gradient-to-r from-[#FB5B56] to-[#EC268A] text-white shadow-lg shadow-[#EC268A]/50'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className={`p-2 rounded-xl transition-all shrink-0 ${isActive ? 'bg-white/25' : 'bg-white/10 group-hover:bg-white/20'}`}>
                          <item.icon className="h-5 w-5" />
                        </div>
                        {!isCollapsed && <span className="font-black text-sm tracking-tight whitespace-nowrap overflow-hidden">{item.label}</span>}
                      </>
                    )}
                  </NavLink>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Divider ── */}
        {group3.length > 0 && (
          <div className="mx-2 border-t border-white/[0.07]" />
        )}

        {/* ── Group 3: Planning ── */}
        {group3.length > 0 && (
          <div className="space-y-1">
            {!isCollapsed && (
              <p className={sectionLabelClass}>{t('sidebar.sectionPlanning')}</p>
            )}
            {group3.map((item) => (
              <NavLink
                key={item.path}
                to={withActiveGig(item.path)}
                className={({ isActive }) =>
                  `flex w-full items-center rounded-2xl transition-all duration-300 group relative ${isCollapsed ? 'justify-center p-3' : 'space-x-3 py-3 px-5'
                  } ${isActive
                    ? 'bg-gradient-to-r from-[#FB5B56] to-[#EC268A] text-white shadow-lg shadow-[#EC268A]/50'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={`p-2 rounded-xl transition-all shrink-0 ${isActive ? 'bg-white/25' : 'bg-white/10 group-hover:bg-white/20'}`}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    {!isCollapsed && <span className="font-black text-sm tracking-tight whitespace-nowrap overflow-hidden">{item.label}</span>}
                    {isCollapsed && (
                      <div className="absolute left-16 bg-slate-900 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl border border-white/10">
                        {item.label}
                      </div>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        )}
      </nav>
      </div>

      {/* Cockpit project picker */}
      {showCockpitGigModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-[2rem] p-8 shadow-2xl shadow-black/80 animate-in zoom-in-95 duration-300 text-white">
            <button
              onClick={() => {
                setIsCockpitGigDropdownOpen(false);
                setShowCockpitGigModal(false);
              }}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200 z-50"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="absolute -top-12 -left-12 w-40 h-40 bg-amber-500/10 blur-[60px] rounded-full pointer-events-none"></div>
            <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-orange-500/10 blur-[60px] rounded-full pointer-events-none"></div>

            <div className="flex flex-col items-center text-center mb-6 relative">
              <div className="p-4 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-2xl mb-4 shadow-inner shadow-amber-500/5">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black tracking-wide uppercase">
                {t('trainingAllGigsGuard.modalTitle')}
              </h3>
            </div>

            <div className="space-y-4 mb-6 relative px-1">
              <p className="text-sm text-slate-300 leading-relaxed font-medium text-center">
                {t('trainingAllGigsGuard.modalSubtitle')}
              </p>

              {cockpitGigLoading ? (
                <p className="text-center text-xs text-slate-400 font-medium py-3">
                  {t('trainingAllGigsGuard.loadingGigs')}
                </p>
              ) : cockpitGigOptions.length === 0 ? (
                <p className="text-center text-xs text-amber-300/90 font-medium py-3">
                  {t('trainingAllGigsGuard.noGigs')}
                </p>
              ) : (
                <div className="block space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400/80 ml-1">
                    {t('trainingAllGigsGuard.selectLabel')}
                  </span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsCockpitGigDropdownOpen((open) => !open)}
                      className={`w-full rounded-2xl border bg-slate-950/80 px-4 py-3.5 flex items-center justify-between gap-3 text-left outline-none transition-all duration-200 ${
                        isCockpitGigDropdownOpen
                          ? 'border-amber-400/60 ring-2 ring-amber-500/20 shadow-lg shadow-amber-500/10'
                          : 'border-amber-500/30 hover:border-amber-400/50'
                      }`}
                      aria-haspopup="listbox"
                      aria-expanded={isCockpitGigDropdownOpen}
                    >
                      <span
                        className={`truncate text-sm font-semibold ${
                          selectedCockpitGigId ? 'text-white' : 'text-slate-400'
                        }`}
                      >
                        {selectedCockpitGigId
                          ? cockpitGigOptions.find((g) => g.gigId === selectedCockpitGigId)?.title
                          : t('trainingAllGigsGuard.selectPlaceholder')}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 shrink-0 transition-transform duration-300 ${
                          isCockpitGigDropdownOpen ? 'rotate-180 text-amber-400' : 'text-amber-400/70'
                        }`}
                      />
                    </button>

                    {isCockpitGigDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-[60]"
                          onClick={() => setIsCockpitGigDropdownOpen(false)}
                        />
                        <div
                          role="listbox"
                          className="absolute left-0 right-0 top-full mt-2 z-[70] max-h-56 overflow-y-auto rounded-2xl border border-amber-500/25 bg-slate-950/95 backdrop-blur-xl py-1.5 shadow-2xl shadow-black/60 animate-in fade-in slide-in-from-top-2 duration-200"
                        >
                          {cockpitGigOptions.map((g) => {
                            const isSelected = selectedCockpitGigId === g.gigId;
                            return (
                              <button
                                key={g.gigId}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => {
                                  setSelectedCockpitGigId(g.gigId);
                                  setIsCockpitGigDropdownOpen(false);
                                }}
                                className={`w-full px-4 py-3 text-left text-sm font-semibold transition-all flex items-start gap-3 ${
                                  isSelected
                                    ? 'bg-amber-500/15 text-amber-200'
                                    : 'text-slate-200 hover:bg-white/5 hover:text-white'
                                }`}
                              >
                                <span
                                  className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                                    isSelected
                                      ? 'bg-amber-400 ring-4 ring-amber-400/20'
                                      : 'bg-slate-600'
                                  }`}
                                />
                                <span className="leading-snug">{g.title}</span>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 pt-4 border-t border-white/5 relative">
              <button
                type="button"
                disabled={!selectedCockpitGigId || cockpitGigLoading}
                onClick={() => openCockpitWithGig(selectedCockpitGigId)}
                className="w-full py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-amber-500 disabled:hover:to-amber-600 text-white font-extrabold uppercase tracking-widest text-[11px] rounded-2xl shadow-lg shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
              >
                {t('trainingAllGigsGuard.openCockpitButton')}
              </button>
              <button
                type="button"
                onClick={() => openCockpitWithGig(null)}
                className="w-full py-2.5 text-slate-300 hover:text-white text-[11px] font-bold uppercase tracking-widest rounded-2xl hover:bg-white/5 transition-all"
              >
                {t('trainingAllGigsGuard.chooseInWorkspace')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}