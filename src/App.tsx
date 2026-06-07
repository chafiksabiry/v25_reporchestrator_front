import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import config from './config';
import { getAgentData } from './services/apiConfig';
import { getRouterBasename } from './utils/routerBasename';

import OnboardingShell from './components/layout/OnboardingShell';
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

import DashboardRoutes from './routes/DashboardRoutes.tsx';
import AssessmentRoutes from './routes/AssessmentRoutes.tsx';
import ProfileRoutes from './routes/ProfileRoutes.tsx';
import WizardRoutes from './routes/WizardRoutes.tsx';

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
        {/* Onboarding orchestrator (shared Sidebar + TopBar shell).
            The orchestrator home now lives at `/onboarding` so the root `/`
            falls through to the dashboard catch-all below. */}
        <Route element={<OnboardingShell />}>
          <Route path="/onboarding" element={<OnboardingDashboard />} />
          <Route path="/onboarding/signup" element={<SignUp />} />
          <Route path="/onboarding/profile" element={<OnboardingProfile />} />
          <Route path="/onboarding/skills" element={<SkillsAssessment />} />
          <Route path="/onboarding/subscription" element={<Subscription />} />
          <Route path="/onboarding/marketplace" element={<Marketplace />} />
          <Route path="/onboarding/operations" element={<OnboardingOperations />} />
          <Route path="/onboarding/support" element={<Support />} />
          <Route path="/onboarding/quality" element={<QualityControl />} />
          <Route path="/onboarding/career" element={<CareerTrack />} />
          <Route path="/onboarding/wallet" element={<WalletDashboard />} />

          {/* Profile creation v2 — inside the shared shell so it keeps the
              global Sidebar + TopBar. */}
          <Route path="/profile-import" element={<ProfileRoutes />} />
          <Route path="/profile-editor" element={<ProfileRoutes />} />
        </Route>

        {/* Assessments */}
        <Route path="/assessment/*" element={<AssessmentRoutes />} />

        {/* Wizard v1 */}
        <Route path="/profile-wizard/*" element={<WizardRoutes />} />
        <Route path="/linkedin-callback" element={<WizardRoutes />} />
        <Route path="/reps-profile/*" element={<WizardRoutes />} />

        {/* Rep dashboard (merged from v25_dash_rep_front).
            Mounted once via a root splat so its internal <Routes> (absolute
            paths like /profile, /wallet, /gigs-marketplace) match the full
            path. Explicit routes above keep priority over this catch-all. */}
        <Route path="*" element={<DashboardRoutes />} />
      </Routes>
    </Router>
  );
}

export default App;
