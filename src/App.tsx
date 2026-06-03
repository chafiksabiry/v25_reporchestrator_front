import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import config from './config';
import { getAgentData } from './services/apiConfig';
import { getRouterBasename } from './utils/routerBasename';
import harxLogo from './assets/logo_harx.png';

import OnboardingDashboard from './components/onboarding/Dashboard';
import SignUp from './components/onboarding/SignUp';
import OnboardingProfile from './components/onboarding/Profile';
import SkillsAssessment from './components/onboarding/SkillsAssessment';
import Subscription from './components/onboarding/Subscription';
import Marketplace from './components/onboarding/Marketplace';
import OnboardingOperations from './components/onboarding/Operations';
import Support from './components/onboarding/Support';
import QualityControl from './components/onboarding/QualityControl';
import CareerTrack from './components/onboarding/CareerTrack';
import WalletDashboard from './components/onboarding/WalletDashboard';

import DashboardRoutes from './routes/DashboardRoutes';
import AssessmentRoutes from './routes/AssessmentRoutes';
import ProfileRoutes from './routes/ProfileRoutes';
import WizardRoutes from './routes/WizardRoutes';

function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-premium-gradient overflow-x-hidden">
      <nav className="bg-white/40 backdrop-blur-md border-b border-white/20 px-8 py-5 relative z-50 sticky top-0">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link to="/" className="flex items-center group">
            <span className="text-xl font-black text-gray-900 tracking-tight uppercase flex items-center">
              <img src={harxLogo} alt="HARX" className="w-8 h-8 mr-3 rounded-lg shadow-sm" />
              REPS Platform
            </span>
          </Link>
          <Link
            to="/dashboard"
            className="text-gray-600 hover:text-harx-600 font-black uppercase tracking-widest text-[10px] bg-white/50 px-6 py-2.5 rounded-xl border border-white/50 shadow-sm transition-all duration-300"
          >
            Dashboard
          </Link>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

function App() {
  useEffect(() => {
    console.log('REPS Unified App initializing...');
    console.log(`Run Mode: ${config.runMode}`);

    const userData = config.getUserData();
    if (userData.agentId) {
      getAgentData().catch((error) => {
        console.error('Error fetching initial agent data:', error);
      });
    }
  }, []);

  return (
    <Router basename={getRouterBasename()}>
      <Routes>
        {/* Onboarding orchestrator */}
        <Route path="/" element={<OnboardingLayout><OnboardingDashboard /></OnboardingLayout>} />
        <Route path="/onboarding/signup" element={<OnboardingLayout><SignUp /></OnboardingLayout>} />
        <Route path="/onboarding/profile" element={<OnboardingLayout><OnboardingProfile /></OnboardingLayout>} />
        <Route path="/onboarding/skills" element={<OnboardingLayout><SkillsAssessment /></OnboardingLayout>} />
        <Route path="/onboarding/subscription" element={<OnboardingLayout><Subscription /></OnboardingLayout>} />
        <Route path="/onboarding/marketplace" element={<OnboardingLayout><Marketplace /></OnboardingLayout>} />
        <Route path="/onboarding/operations" element={<OnboardingLayout><OnboardingOperations /></OnboardingLayout>} />
        <Route path="/onboarding/support" element={<OnboardingLayout><Support /></OnboardingLayout>} />
        <Route path="/onboarding/quality" element={<OnboardingLayout><QualityControl /></OnboardingLayout>} />
        <Route path="/onboarding/career" element={<OnboardingLayout><CareerTrack /></OnboardingLayout>} />
        <Route path="/onboarding/wallet" element={<OnboardingLayout><WalletDashboard /></OnboardingLayout>} />

        {/* Rep dashboard (merged from v25_dash_rep_front) */}
        <Route path="/dashboard/*" element={<DashboardRoutes />} />
        <Route path="/gigs-marketplace/*" element={<DashboardRoutes />} />
        <Route path="/gig/*" element={<DashboardRoutes />} />
        <Route path="/company/*" element={<DashboardRoutes />} />
        <Route path="/profile/*" element={<DashboardRoutes />} />
        <Route path="/payouts/*" element={<DashboardRoutes />} />
        <Route path="/learning/*" element={<DashboardRoutes />} />
        <Route path="/training/*" element={<DashboardRoutes />} />
        <Route path="/operations/*" element={<DashboardRoutes />} />
        <Route path="/workspace/*" element={<DashboardRoutes />} />
        <Route path="/community/*" element={<DashboardRoutes />} />
        <Route path="/import-leads/*" element={<DashboardRoutes />} />
        <Route path="/session-planning/*" element={<DashboardRoutes />} />
        <Route path="/calls/*" element={<DashboardRoutes />} />
        <Route path="/call-report/*" element={<DashboardRoutes />} />
        <Route path="/wallet/*" element={<DashboardRoutes />} />

        {/* Assessments */}
        <Route path="/assessment/*" element={<AssessmentRoutes />} />

        {/* Profile creation v2 */}
        <Route path="/profile-import" element={<ProfileRoutes />} />
        <Route path="/profile-editor" element={<ProfileRoutes />} />

        {/* Wizard v1 */}
        <Route path="/profile-wizard/*" element={<WizardRoutes />} />
        <Route path="/linkedin-callback" element={<WizardRoutes />} />
        <Route path="/reps-profile/*" element={<WizardRoutes />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
