import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { RepTrainingNavProvider } from '../../contexts/RepTrainingNavContext';
import { Sidebar } from '../dashboard/Sidebar';
import { TopBar } from '../dashboard/TopBar';
import { fetchProfileFromAPI } from '../../utils/profileUtils';
import { getAgentId } from '../../utils/authUtils';
import api from '../../utils/client';

/**
 * Shared shell (Sidebar + TopBar) for the onboarding orchestrator pages.
 * Mirrors the dashboard shell so the whole rep app has one consistent layout.
 * Used as a layout route: child pages render through <Outlet />.
 */
function OnboardingShellContent() {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
              localStorage.setItem('rep_available_balance', String(Number(res.data.data.availableBalance ?? 0)));
              localStorage.setItem('rep_pending_balance', String(Number(res.data.data.pendingCommissions ?? 0)));
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
    init();
  }, []);

  return (
    <div className="flex h-screen bg-[#E84393] overflow-hidden">
      <Sidebar
        phases={userProfile?.onboardingProgress?.phases}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isCollapsed={false}
        setIsCollapsed={() => {}}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
        <main className="flex-1 overflow-y-auto bg-premium-gradient rounded-tl-[24px]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        <OnboardingShellContent />
      </RepTrainingNavProvider>
    </AuthProvider>
  );
}
