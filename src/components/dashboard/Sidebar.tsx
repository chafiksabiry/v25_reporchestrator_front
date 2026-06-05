import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Settings, Monitor, Calendar, X, ChevronDown, Phone, User, PhoneOutgoing, GraduationCap, AlertTriangle, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useRepTrainingNav } from '../../contexts/RepTrainingNavContext';
import { useTranslation } from 'react-i18next';
import harxLogo from '../../assets/logo-black.png';
import mascotte from '../../assets/mascotte2.png';

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

export function Sidebar({ phases, isSidebarOpen, setIsSidebarOpen, isCollapsed, setIsCollapsed }: SidebarProps) {

  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const isPhaseCompleted = (phaseNumber: number): boolean => {
    if (!phases) return false;
    return phases[`phase${phaseNumber}` as keyof Phases]?.status === 'completed';
  };

  // Onboarding is considered complete (agent profile created) only when the
  // required phases 1-4 are all completed. While incomplete, we hide Dashboard,
  // Planning and Wallet and show an onboarding guide instead.
  const isOnboardingComplete = (): boolean =>
    isPhaseCompleted(1) && isPhaseCompleted(2) && isPhaseCompleted(3) && isPhaseCompleted(4);
  const onboardingComplete = isOnboardingComplete();

  const isProfileCreationPage =
    location.pathname.includes('/profile-import') ||
    location.pathname.includes('/profile-editor');

  const [isWorkspaceOpen, setIsWorkspaceOpen] = React.useState(location.pathname.includes('/workspace'));
  const [isTrainingOpen, setIsTrainingOpen] = React.useState(location.pathname.includes('/training'));
  const [showWarningModal, setShowWarningModal] = React.useState(false);
  const [openTrainingModuleIndexes, setOpenTrainingModuleIndexes] = React.useState<number[]>([]);
  const {
    trainingModules,
    activeTrainingModuleIndex,
    activeTrainingSlideIndex
  } = useRepTrainingNav();

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
      label: t('sidebar.dashboard'),
      path: '/',
      isAccessible: () => onboardingComplete
    },
    {
      icon: Briefcase,
      label: t('sidebar.marketplace'),
      path: '/gigs-marketplace',
      isAccessible: () => isPhaseCompleted(4)
    },

    {
      icon: GraduationCap,
      label: t('sidebar.training'),
      path: '/training',
      isAccessible: () => isPhaseCompleted(4),
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
      isAccessible: () => isPhaseCompleted(4),
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
      isAccessible: () => isPhaseCompleted(5)
    },
    {
      icon: Calendar,
      label: t('sidebar.sessionPlanning'),
      path: '/session-planning',
      isAccessible: () => onboardingComplete
    },
  ];

  const filteredNavItems = navItems.filter(item => item.isAccessible());

  const group1 = filteredNavItems.filter(i => ['/', '/gigs-marketplace', '/workspace'].includes(i.path));
  const group2 = filteredNavItems.filter(i => ['/training'].includes(i.path));
  const group3 = filteredNavItems.filter(i => ['/session-planning'].includes(i.path));

  useEffect(() => {
    console.log('🔒 Access Control Status:', {
      phases,
      availableNavItems: filteredNavItems.map(item => item.label),
    });
  }, [phases]);

  return (
    <div
      className={`fixed inset-y-0 left-0 z-30 bg-black text-white transition-all duration-300 ease-in-out md:relative shadow-2xl flex flex-col overflow-hidden ${!isSidebarOpen
          ? '-translate-x-full md:translate-x-0'
          : 'translate-x-0'
        } w-72`}
    >

      <div className={`h-[90px] flex items-center justify-between bg-black transition-all duration-300 shrink-0 px-6`}>
        <div className="flex items-center space-x-3.5">
          <div className="relative shrink-0 w-full flex justify-center">
            <img
              src={harxLogo}
              alt="HARX Logo"
              className="w-full h-auto object-contain relative z-10 scale-110"
            />
          </div>
        </div>
        {!isCollapsed && (
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-2 hover:bg-white/10 rounded-xl transition-colors shrink-0"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        )}
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-5">
        {/* ── Mascotte (shown on the CV import / editor pages) ── */}
        {isProfileCreationPage && !isCollapsed && (
          <div className="relative flex min-h-full flex-col items-center justify-center py-4">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 m-auto h-28 w-28 rounded-full bg-harx-500/20 blur-2xl animate-pulse" />
              <img
                src={mascotte}
                alt="HARX assistant"
                className="relative w-28 h-auto drop-shadow-2xl animate-float"
              />
            </div>

            <p className="relative z-10 mt-2 px-1 text-center text-[11px] leading-snug text-gray-400">
              {t(
                'cvGuide.mascotte',
                "Salut ! Je suis votre assistant HARX. Importez votre CV et je crée un profil percutant en quelques secondes."
              )}
            </p>
          </div>
        )}

        {/* ── Guide (hidden on CV import/editor — content is on the page itself) ── */}
        {!onboardingComplete && !isCollapsed && !isProfileCreationPage && (
          <div className="group/guide relative rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-amber-500/15 text-amber-400 rounded-lg shrink-0">
                <Lock className="h-4 w-4" />
              </div>
              <p className="text-[11px] font-black text-amber-300 uppercase tracking-wide leading-tight">
                {t('onboardingGuide.title', 'Finalisez votre onboarding')}
              </p>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed mb-3">
              {t(
                'onboardingGuide.description',
                'Le Dashboard, le Portefeuille et le Planning se débloquent une fois votre profil créé et votre onboarding terminé.'
              )}
            </p>
            <button
              onClick={() => navigate('/')}
              className="w-full flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-black font-black text-[11px] uppercase tracking-wider py-2 rounded-xl transition-colors active:scale-[0.98]"
            >
              {t('onboardingGuide.cta', 'Continuer l\'onboarding')}
            </button>
            <div className="pointer-events-none absolute left-0 right-0 top-full z-50 mt-1.5 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-[11px] font-medium leading-relaxed text-gray-200 opacity-0 shadow-2xl transition-opacity duration-200 group-hover/guide:opacity-100">
              {t('onboardingGuide.tooltip', 'Terminez les 4 phases (inscription, profil, évaluations, abonnement) pour débloquer toutes les fonctionnalités.')}
            </div>
          </div>
        )}

        {/* ── Group 1: Main ── */}
        {group1.length > 0 && (
        <div className="space-y-1">
          {!isCollapsed && (
            <p className="px-2 pb-1 text-[9px] font-extrabold uppercase tracking-[0.18em] text-gray-600 select-none">Main</p>
          )}
          {group1.map((item) => (
            <div key={item.path} className="space-y-1">
              {item.label === 'Training' && Array.isArray(item.subItems) && item.subItems.length > 0 && !isCollapsed ? (
                <>
                  <button
                    onClick={() => {
                      setIsTrainingOpen(!isTrainingOpen);
                      if (!location.pathname.includes('/training')) navigate('/training');
                    }}
                    className={`flex w-full items-center rounded-2xl transition-all duration-300 group relative space-x-3 py-3 px-5 ${isTrainingOpen || window.location.pathname.includes(item.path)
                        ? 'bg-white/5 text-white'
                        : 'text-gray-500 hover:bg-white/5 hover:text-gray-200'
                      }`}
                  >
                    <div className={`p-2 rounded-xl transition-all shrink-0 ${isTrainingOpen || window.location.pathname.includes(item.path) ? 'bg-gradient-to-br from-orange-500 to-pink-600 text-white shadow-lg shadow-pink-500/30' : 'bg-gray-800/40 group-hover:bg-gray-800'}`}>
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
                                          if (!location.pathname.includes('/training')) navigate('/training');
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
                        : 'text-gray-500 hover:bg-white/5 hover:text-gray-200'
                      }`}
                  >
                    <div className={`p-2 rounded-xl transition-all shrink-0 ${isWorkspaceOpen || window.location.pathname.includes(item.path) ? 'bg-gradient-to-br from-orange-500 to-pink-600 text-white shadow-lg shadow-pink-500/30' : 'bg-gray-800/40 group-hover:bg-gray-800'}`}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <span className="font-black text-sm tracking-tight whitespace-nowrap overflow-hidden flex-1 text-left">{item.label}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isWorkspaceOpen ? 'rotate-180 text-harx-400' : 'text-gray-400'}`} />
                  </button>

                  {isWorkspaceOpen && (
                    <div className="ml-5 pl-2 border-l border-white/10 space-y-1 animate-in slide-in-from-top-1 duration-200">
                      {item.subItems.map((sub) => {
                        const isSubActive = location.search.includes(sub.path.split('?')[1]);
                        return (
                          <NavLink
                            key={sub.path}
                            to={sub.path}
                            onClick={(e) => {
                              e.preventDefault();
                              if (
                                sub.path.includes('tab=copilot') &&
                                location.pathname.includes('/training') &&
                                (sessionStorage.getItem('training_gig_filter') === '__all__' || !sessionStorage.getItem('training_gig_filter'))
                              ) {
                                setShowWarningModal(true);
                                return;
                              }
                              navigate(sub.path);
                            }}
                            className={`flex w-full items-center rounded-xl transition-all duration-300 group relative space-x-3 py-2.5 px-4 ${isSubActive
                                ? 'bg-gradient-to-r from-harx-500/20 to-transparent text-white border-l-2 border-harx-500'
                                : 'text-gray-500 hover:bg-white/5 hover:text-gray-200'
                              }`}
                          >
                            <sub.icon className={`h-3.5 w-3.5 transition-colors ${isSubActive ? 'text-harx-400' : 'text-current'}`} />
                            <span className={`font-black text-[11px] uppercase tracking-widest ${isSubActive ? 'text-harx-400' : 'text-current'}`}>
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
                  to={item.path}
                  className={({ isActive }) =>
                    `flex w-full items-center rounded-2xl transition-all duration-300 group relative ${isCollapsed ? 'justify-center p-3' : 'space-x-3 py-3 px-5'
                    } ${isActive
                      ? 'bg-gradient-to-br from-orange-500 to-pink-600 text-white shadow-xl shadow-pink-500/30 ring-1 ring-white/10'
                      : 'text-gray-500 hover:bg-white/5 hover:text-gray-200'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className={`p-2 rounded-xl transition-all shrink-0 ${isActive ? 'bg-white/20' : 'bg-gray-800/40 group-hover:bg-gray-800'}`}>
                        <item.icon className="h-5 w-5" />
                      </div>
                      {!isCollapsed && (
                        <span className="font-black text-sm tracking-tight whitespace-nowrap overflow-hidden">{item.label}</span>
                      )}
                      {isCollapsed && item.subItems && (
                        <div className="absolute top-0 right-0 w-2 h-2 bg-harx-500 rounded-full border-2 border-slate-950 translate-x-1/2 -translate-y-1/2"></div>
                      )}
                      {isCollapsed && (
                        <div className="absolute left-16 bg-slate-900 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl border border-white/10">
                          {item.label}
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
              <p className="px-2 pb-1 text-[9px] font-extrabold uppercase tracking-[0.18em] text-gray-600 select-none">Training</p>
            )}
            {group2.map((item) => (
              <div key={item.path} className="space-y-1">
                {item.label === t('sidebar.training') && Array.isArray(item.subItems) && item.subItems.length > 0 && !isCollapsed ? (
                  <>
                    <button
                      onClick={() => {
                        setIsTrainingOpen(!isTrainingOpen);
                        if (!location.pathname.includes('/training')) navigate('/training');
                      }}
                      className={`flex w-full items-center rounded-2xl transition-all duration-300 group relative space-x-3 py-3 px-5 ${isTrainingOpen || window.location.pathname.includes(item.path)
                          ? 'bg-white/5 text-white'
                          : 'text-gray-500 hover:bg-white/5 hover:text-gray-200'
                        }`}
                    >
                      <div className={`p-2 rounded-xl transition-all shrink-0 ${isTrainingOpen || window.location.pathname.includes(item.path) ? 'bg-gradient-to-br from-orange-500 to-pink-600 text-white shadow-lg shadow-pink-500/30' : 'bg-gray-800/40 group-hover:bg-gray-800'}`}>
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
                                            if (!location.pathname.includes('/training')) navigate('/training');
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
                    to={item.path}
                    className={({ isActive }) =>
                      `flex w-full items-center rounded-2xl transition-all duration-300 group relative ${isCollapsed ? 'justify-center p-3' : 'space-x-3 py-3 px-5'
                      } ${isActive
                        ? 'bg-gradient-to-br from-orange-500 to-pink-600 text-white shadow-xl shadow-pink-500/30 ring-1 ring-white/10'
                        : 'text-gray-500 hover:bg-white/5 hover:text-gray-200'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className={`p-2 rounded-xl transition-all shrink-0 ${isActive ? 'bg-white/20' : 'bg-gray-800/40 group-hover:bg-gray-800'}`}>
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
              <p className="px-2 pb-1 text-[9px] font-extrabold uppercase tracking-[0.18em] text-gray-600 select-none">Planning</p>
            )}
            {group3.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex w-full items-center rounded-2xl transition-all duration-300 group relative ${isCollapsed ? 'justify-center p-3' : 'space-x-3 py-3 px-5'
                  } ${isActive
                    ? 'bg-gradient-to-br from-orange-500 to-pink-600 text-white shadow-xl shadow-pink-500/30 ring-1 ring-white/10'
                    : 'text-gray-500 hover:bg-white/5 hover:text-gray-200'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={`p-2 rounded-xl transition-all shrink-0 ${isActive ? 'bg-white/20' : 'bg-gray-800/40 group-hover:bg-gray-800'}`}>
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



      {/* Warning Modal */}
      {showWarningModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-[2rem] p-8 shadow-2xl shadow-black/80 overflow-hidden animate-in zoom-in-95 duration-300 text-white">
            {/* Close Button */}
            <button
              onClick={() => setShowWarningModal(false)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200 z-50"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Glowing background light */}
            <div className="absolute -top-12 -left-12 w-40 h-40 bg-amber-500/10 blur-[60px] rounded-full pointer-events-none"></div>
            <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-orange-500/10 blur-[60px] rounded-full pointer-events-none"></div>

            {/* Header with Warning icon */}
            <div className="flex flex-col items-center text-center mb-6 relative">
              <div className="p-4 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-2xl mb-4 shadow-inner shadow-amber-500/5 animate-bounce">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black tracking-wide uppercase">
                {t('trainingAllGigsGuard.modalTitle')}
              </h3>
            </div>

            {/* Detailed Instructions */}
            <div className="space-y-4 text-center mb-8 relative px-4">
              <p className="text-sm text-slate-300 leading-relaxed font-medium">
                {t('trainingAllGigsGuard.modalSubtitle')}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5 relative">
              <button
                onClick={() => setShowWarningModal(false)}
                className="w-full py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold uppercase tracking-widest text-[11px] rounded-2xl shadow-lg shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
              >
                {t('trainingAllGigsGuard.understandButton')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}