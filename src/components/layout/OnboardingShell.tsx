import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { RepTrainingNavProvider } from '../../contexts/RepTrainingNavContext';
import { NotificationsProvider } from '../../contexts/NotificationsContext';
import { Sidebar } from '../dashboard/Sidebar';
import { TopBar } from '../dashboard/TopBar';
import { fetchProfileFromAPI } from '../../utils/profileUtils';
import { getAgentId } from '../../utils/authUtils';
import api from '../../utils/client';
import { HARX_NAVBAR_BG } from '../../utils/harxBrand';
import { isCallCenterStaff } from '../../utils/callCenterStaff';
import {
  getRepOnboardingStep,
  isRepProfilePublished,
} from '../../utils/repOnboardingNextStep';
import { buildRepPageTitle, resolveRepTabTitle } from '../../lib/repSections';
import { usePageTitle } from '../../lib/tracking/usePageTitle';

/**
 * Shared shell for onboarding pages. On reconnect, always resume the current
 * step (CV import → profile editor → profile confirm → subscription) — never the orchestrator hub.
 */
function OnboardingShellContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  usePageTitle(
    buildRepPageTitle(resolveRepTabTitle(location.pathname, location.search)),
    'Parcours rep HARX.',
  );

  useEffect(() => {
    const init = async () => {
      try {
        const profileData = await fetchProfileFromAPI();
        setUserProfile(profileData);

        const agentId = profileData?._id || getAgentId();
        if (agentId) {
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
        }
      } catch {
        // ignore profile errors; shell still renders
      }
    };
    void init();
  }, []);

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

    const next = getRepOnboardingStep(userProfile);
    const target = next.path || '/profile-import';

    if (path === target) return;
    if (target === '/subscription' && path.includes('subscription')) return;
    // User left /profile via Continuer Onboarding — don't bounce them back.
    if (
      path.includes('subscription') &&
      (target === '/profile' || target === '/profile-editor') &&
      !isRepProfilePublished(userProfile)
    ) {
      return;
    }

    if (
      (target === '/dashboard' || target === '/marketplace') &&
      isRepProfilePublished(userProfile)
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
