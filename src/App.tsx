import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import config from './config';
import { getAgentData } from './services/apiConfig';
import { getRouterBasename } from './utils/routerBasename';
import VisitorTracker from './lib/VisitorTracker';

import OnboardingShell from './components/layout/OnboardingShell';
import OnboardingResumeRedirect from './components/onboarding/OnboardingResumeRedirect';
import Subscription from './components/onboarding/Subscription';

import AssessmentRoutes from './routes/AssessmentRoutes.tsx';
import ProfileRoutes from './routes/ProfileRoutes.tsx';
import WizardRoutes from './routes/WizardRoutes.tsx';

const DashboardRoutes = lazy(() => import('./routes/DashboardRoutes.tsx'));

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
      <VisitorTracker />
      <Routes>
        <Route element={<OnboardingShell />}>
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/orchestrator/subscription" element={<Navigate to="/subscription" replace />} />

          <Route path="/profile-import" element={<ProfileRoutes />} />
          <Route path="/profile-editor" element={<ProfileRoutes />} />

          {/* Any leftover orchestrator URL resumes the current step — never the hub. */}
          <Route path="/orchestrator" element={<OnboardingResumeRedirect />} />
          <Route path="/orchestrator/*" element={<OnboardingResumeRedirect />} />
          <Route path="/onboarding/continue" element={<OnboardingResumeRedirect />} />
        </Route>

        <Route path="/assessment/*" element={<AssessmentRoutes />} />
        <Route path="/profile-wizard/*" element={<WizardRoutes />} />
        <Route path="/linkedin-callback" element={<WizardRoutes />} />
        <Route path="/reps-profile/*" element={<WizardRoutes />} />

        <Route
          path="*"
          element={
            <Suspense fallback={null}>
              <DashboardRoutes />
            </Suspense>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
