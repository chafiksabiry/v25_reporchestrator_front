import { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AuthProvider } from '../../contexts/AuthContext';
import { RepTrainingNavProvider } from '../../contexts/RepTrainingNavContext';
import { NotificationsProvider } from '../../contexts/NotificationsContext';
import { Sidebar } from '../dashboard/Sidebar';
import { TopBar } from '../dashboard/TopBar';
import { fetchProfileFromAPI, PROFILE_UPDATE_EVENT } from '../../utils/profileUtils';
import { getAgentId } from '../../utils/authUtils';
import api from '../../utils/client';
import { HARX_NAVBAR_BG } from '../../utils/harxBrand';
import { isCallCenterStaff } from '../../utils/callCenterStaff';
import {
  getRepOnboardingStep,
  hasRepProfileContent,
  isRepProfilePublished,
} from '../../utils/repOnboardingNextStep';
import { buildRepPageTitle, resolveRepTabTitle } from '../../lib/repSections';
import { usePageTitle } from '../../lib/tracking/usePageTitle';
import { RepOnboardingHelpModal, type RepOnboardingGuideKey } from '../onboarding/RepOnboardingHelpModal';

/** Maps the current onboarding route to the matching on-demand help content. */
function guideKeyForPath(pathname: string): RepOnboardingGuideKey | null {
  if (pathname.includes('profile-import')) return 'profile-import';
  if (pathname.includes('profile-editor')) return 'profile-editor';
  if (pathname.includes('subscription')) return 'subscription';
  if (pathname === '/profile' || pathname.startsWith('/profile/')) return 'profile';
  return null;
}

/**
 * Shared shell for onboarding pages. On reconnect, always resume the current
 * step (CV import → profile editor → profile confirm → subscription) — never the orchestrator hub.
 */
function OnboardingShellContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const { t } = useTranslation();
  const guideKey = useMemo(() => guideKeyForPath(location.pathname), [location.pathname]);

  usePageTitle(
    buildRepPageTitle(resolveRepTabTitle(location.pathname, location.search)),
    'Parcours rep HARX.',
  );

  // Keep profile fresh after CV import / editor saves — a stale empty profile
  // used to bounce editor ↔ import in a loop.
  //
  // fetchProfileFromAPI() dispatches PROFILE_UPDATE_EVENT on every successful
  // read. Reloading on that event would retrigger itself and flood GET /users/:id.
  const isSelfTriggeredUpdate = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      isSelfTriggeredUpdate.current = true;
      try {
        const profileData = await fetchProfileFromAPI();
        if (cancelled) return;
        setUserProfile(profileData);

        const agentId = profileData?._id || getAgentId();
        if (!agentId) return;
        try {
          const res = await api.get(`/escrow/agent/wallet/${agentId}`);
          if (res.data?.success) {
            localStorage.setItem(
              'rep_available_balance',
              String(Number(res.data.data.availableBalance ?? 0))
            );
            localStorage.setItem(
              'rep_pending_balance',
              String(Number(res.data.data.pendingCommissions ?? 0))
            );
            window.dispatchEvent(new Event('WALLET_BALANCE_UPDATED'));
          }
        } catch {
          // ignore wallet errors
        }
      } catch {
        // ignore profile errors; shell still renders
      } finally {
        setTimeout(() => {
          isSelfTriggeredUpdate.current = false;
        }, 0);
      }
    };

    void load();

    const onProfileUpdated = () => {
      if (isSelfTriggeredUpdate.current) return;
      void load();
    };
    window.addEventListener(PROFILE_UPDATE_EVENT, onProfileUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener(PROFILE_UPDATE_EVENT, onProfileUpdated);
    };
  }, [location.pathname]);

  useEffect(() => {
    if (!userProfile || isCallCenterStaff()) return;

    const path = location.pathname;
    if (
      path === '/onboarding/continue' ||
      path === '/orchestrator' ||
      (path.startsWith('/orchestrator/') && path !== '/orchestrator/subscription')
    ) {
      return;
    }

    // Prefer fresh localStorage if shell state is still empty after CV import.
    let profileForStep = userProfile;
    try {
      const cached = localStorage.getItem('profileData');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (hasRepProfileContent(parsed) && !hasRepProfileContent(userProfile)) {
          profileForStep = parsed;
        }
      }
    } catch {
      /* ignore */
    }

    const next = getRepOnboardingStep(profileForStep);
    const target = next.path || '/profile-import';

    if (path === target) return;
    if (target === '/subscription' && path.includes('subscription')) return;
    // Never bounce backwards to CV import once the editor (or later) is open.
    if (
      target === '/profile-import' &&
      (path.includes('profile-editor') ||
        path === '/profile' ||
        path.startsWith('/profile/') ||
        path.includes('subscription'))
    ) {
      return;
    }
    // User left /profile via Continuer Onboarding — don't bounce them back.
    if (
      path.includes('subscription') &&
      (target === '/profile' || target === '/profile-editor') &&
      !isRepProfilePublished(profileForStep)
    ) {
      return;
    }

    if (
      (target === '/dashboard' || target === '/marketplace') &&
      isRepProfilePublished(profileForStep)
    ) {
      navigate(target, { replace: true });
      return;
    }

    navigate(target, { replace: true });
  }, [userProfile, location.pathname, navigate]);

  return (
    <div className="flex h-screen bg-[#E6188D] overflow-hidden">
      <Sidebar
        phases={userProfile?.onboardingProgress?.phases}
        userProfile={userProfile}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isCollapsed={false}
        setIsCollapsed={() => {}}
      />
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-slate-950/40 backdrop-blur-sm lg:hidden transition-opacity duration-300 cursor-pointer"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <div
        className="flex flex-1 flex-col overflow-hidden"
        style={{ backgroundImage: HARX_NAVBAR_BG }}
      >
        <TopBar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Persistent, discoverable help — always available on demand, mirrors
          the company onboarding's "?" button rather than a one-shot popup. */}
      {guideKey && (
        <button
          type="button"
          onClick={() => setIsHelpOpen(true)}
          aria-label={t('repOnboardingGuide.open', 'Aide')}
          title={t('repOnboardingGuide.open', 'Aide')}
          className="fixed bottom-5 left-5 z-[60] flex h-11 w-11 items-center justify-center rounded-full bg-gradient-harx text-white shadow-lg shadow-black/20 transition-all hover:scale-105 hover:shadow-xl active:scale-95"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
      )}
      <RepOnboardingHelpModal
        open={isHelpOpen}
        guideKey={guideKey}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  );
}

export default function OnboardingShell() {
  return (
    <AuthProvider>
      <RepTrainingNavProvider>
        <NotificationsProvider>
          <OnboardingShellContent />
        </NotificationsProvider>
      </RepTrainingNavProvider>
    </AuthProvider>
  );
}
