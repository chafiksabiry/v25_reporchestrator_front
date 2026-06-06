import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { RepTrainingNavProvider } from '../contexts/RepTrainingNavContext';
import { Sidebar } from '../components/dashboard/Sidebar';
import { TopBar } from '../components/dashboard/TopBar';
import { Dashboard } from '../components/dashboard/pages/Dashboard';
import { GigsMarketplace } from '../components/dashboard/pages/GigsMarketplace';
import { GigDetails } from '../components/dashboard/pages/GigDetails';
import { CompanyProfile } from '../components/dashboard/pages/CompanyProfile';
import { Profile } from '../components/dashboard/pages/Profile';
import { Payouts } from '../components/dashboard/pages/Payouts';
import { Learning } from '../components/dashboard/pages/Learning';
import { Training } from '../components/dashboard/pages/Training';
import { Operations } from '../components/dashboard/pages/Operations';
import { Workspace } from '../components/dashboard/pages/Workspace';
import { Community } from '../components/dashboard/pages/Community';
import { WalletPage } from '../components/dashboard/pages/Wallet';
import { ImportLeads } from '../components/dashboard/pages/ImportLeads';
import { SessionPlanning } from '../components/dashboard/pages/SessionPlanning';
import { Calls } from '../components/dashboard/pages/Calls';
import CallReportCard from '../components/dashboard/CallReport';
import { fetchProfileFromAPI } from '../utils/profileUtils';
import { PhaseProtectedRoute } from '../components/dashboard/ProtectedRoute';
import { getAgentId } from '../utils/authUtils';
import api from '../utils/client';
import { HARX_NAVBAR_BG } from '../utils/harxBrand';

function DashboardAppContent() {
  useAuth();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const initializeProfileData = async () => {
      try {
        const profileData = await fetchProfileFromAPI();
        setUserProfile(profileData);
        setLoading(false);

        const agentId = profileData?._id || getAgentId();
        if (agentId) {
          try {
            const res = await api.get(`/escrow/agent/wallet/${agentId}`);
            if (res.data?.success) {
              const available = Number(res.data.data.availableBalance ?? 0);
              localStorage.setItem('rep_available_balance', String(available));
              localStorage.setItem('rep_pending_balance', String(Number(res.data.data.pendingCommissions ?? 0)));
              window.dispatchEvent(new Event('WALLET_BALANCE_UPDATED'));
            }
          } catch {
            // ignore
          }
        }
      } catch {
        setLoading(false);
      }
    };

    initializeProfileData();
  }, []);

  return (
    <RepTrainingNavProvider>
      <DashboardRoutingWrapper
        userProfile={userProfile}
        loading={loading}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />
    </RepTrainingNavProvider>
  );
}

function DashboardRoutingWrapper({ userProfile, loading, isSidebarOpen, setIsSidebarOpen }: any) {
  const location = useLocation();
  const isProfileEdit = location.pathname.includes('/profile') && location.search.includes('edit=true');

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundImage: HARX_NAVBAR_BG }}>
      {!isProfileEdit && (
        <Sidebar
          phases={userProfile?.onboardingProgress?.phases}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          isCollapsed={false}
          setIsCollapsed={() => {}}
        />
      )}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundImage: HARX_NAVBAR_BG }}>
        {!isProfileEdit && (
          <TopBar
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
          />
        )}
        <main className={`flex-1 overflow-y-auto bg-white ${location.pathname.includes('/profile') ? 'p-0' : 'px-4 py-3'}`}>
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-harx-500"></div>
            </div>
          ) : (
          <Routes>
            <Route path="/" element={<Dashboard profile={userProfile} />} />
            <Route path="/dashboard" element={<Dashboard profile={userProfile} />} />
            <Route path="/gigs-marketplace" element={
              <PhaseProtectedRoute phases={userProfile?.onboardingProgress?.phases} requiredPhase={4}>
                <GigsMarketplace />
              </PhaseProtectedRoute>
            } />
            <Route path="/gig/:gigId" element={
              <PhaseProtectedRoute phases={userProfile?.onboardingProgress?.phases} requiredPhase={4}>
                <GigDetails />
              </PhaseProtectedRoute>
            } />
            <Route path="/company/:companyId" element={
              <PhaseProtectedRoute phases={userProfile?.onboardingProgress?.phases} requiredPhase={4}>
                <CompanyProfile />
              </PhaseProtectedRoute>
            } />
            <Route path="/profile" element={<Profile />} />
            <Route path="/payouts" element={<Payouts />} />
            <Route path="/learning" element={<Learning />} />
            <Route path="/training" element={
              <PhaseProtectedRoute phases={userProfile?.onboardingProgress?.phases} requiredPhase={4}>
                <Training />
              </PhaseProtectedRoute>
            } />
            <Route path="/operations" element={<Operations />} />
            <Route path="/workspace" element={
              <PhaseProtectedRoute phases={userProfile?.onboardingProgress?.phases} requiredPhase={4}>
                <Workspace />
              </PhaseProtectedRoute>
            } />
            <Route path="/community" element={<Community />} />
            <Route path="/import-leads" element={
              <PhaseProtectedRoute phases={userProfile?.onboardingProgress?.phases} requiredPhase={5}>
                <ImportLeads />
              </PhaseProtectedRoute>
            } />
            <Route path="/session-planning" element={<SessionPlanning />} />
            <Route path="/calls" element={<Calls />} />
            <Route path="/call-report" element={
              <PhaseProtectedRoute phases={userProfile?.onboardingProgress?.phases} requiredPhase={5}>
                <CallReportCard />
              </PhaseProtectedRoute>
            } />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          )}
        </main>
      </div>
    </div>
  );
}

export default function DashboardRoutes() {
  return (
    <AuthProvider>
      <DashboardAppContent />
    </AuthProvider>
  );
}
