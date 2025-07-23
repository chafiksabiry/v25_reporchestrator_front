import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper';
import { LogOut } from 'lucide-react';
import Dashboard from './components/Dashboard';
import SignUp from './components/SignUp';
import Profile from './components/Profile';
import SkillsAssessment from './components/SkillsAssessment';
import Subscription from './components/Subscription';
import Marketplace from './components/Marketplace';
import Operations from './components/Operations';
import Support from './components/Support';
import QualityControl from './components/QualityControl';
import CareerTrack from './components/CareerTrack.tsx';
import WalletDashboard from './components/WalletDashboard';
import config from './config';
import { getAgentData } from './services/apiConfig';

function App() {
  // Add basename for qiankun routing
  const basename = config.isStandalone ? '/' : '/reporchestrator';
  
  // Get REP dashboard URL for profile redirect
  const repDashboardUrl = import.meta.env.VITE_RUN_MODE === 'standalone' 
    ? import.meta.env.VITE_REP_DASHBOARD_URL_STANDALONE || ''
    : import.meta.env.VITE_REP_DASHBOARD_URL || '';

  const handleLogout = () => {
    localStorage.clear();
    // Clear all cookies using native JavaScript
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    window.location.replace('/auth');
  };

  useEffect(() => {
    // Log config information on app startup
    console.log('window.__POWERED_BY_QIANKUN__', window.__POWERED_BY_QIANKUN__);
    console.log('🚀 REPS Platform initializing...');
    console.log(`📋 Run Mode: ${config.runMode} (${config.isStandalone ? 'Standalone' : 'In-App'})`);

    // Get and log user data
    const userData = config.getUserData();
    console.log('👤 User Data:', {
      userId: userData.userId,
      agentId: userData.agentId,
      tokenExists: !!userData.token
    });

    // Fetch agent data from API
    const fetchInitialAgentData = async () => {
      try {
        console.log('🔍 Fetching initial agent data from API...');
        const agentData = await getAgentData();
        console.log('👤 Agent data retrieved from API:', {
          id: agentData.id,
          hasProfile: !!agentData.name,
          status: agentData.status,
          hasOnboardingProgress: !!agentData.onboardingProgress
        });

        if (agentData.onboardingProgress) {
          let actionsCompletedCount = 0;

          if (agentData.onboardingProgress.completedActions) {
            Object.values(agentData.onboardingProgress.completedActions).forEach(actions => {
              if (Array.isArray(actions)) {
                actionsCompletedCount += actions.length;
              }
            });
          }

          console.log('📋 Agent onboarding progress:', {
            currentPhase: agentData.onboardingProgress.currentPhase,
            completedPhases: agentData.onboardingProgress.completedPhases?.length || 0,
            actionsCompletedCount
          });
        }
      } catch (error) {
        console.error('❌ Error fetching initial agent data:', error);
        console.log('⚠️ Will fall back to local progress tracking');
      }
    };

    if (userData.agentId) {
      fetchInitialAgentData();
    } else {
      console.warn('⚠️ No agent ID available, skipping agent data fetch');
    }
  }, []);

  return (
    <Router basename={basename}>
      <div className="min-h-screen bg-gray-50">
        {/* Top Navigation */}
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link to="/" className="flex items-center">
                  <img 
                    src={`${import.meta.env.VITE_FRONT_URL}logo_harx.jpg`}
                    alt="HARX" 
                    className="h-8 w-auto"
                  />
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                {repDashboardUrl ? (
                  <a 
                    href={repDashboardUrl} 
                    className="text-gray-600 hover:text-gray-900"
                  >
                    Profile
                  </a>
                ) : (
                  <Link to="/profile" className="text-gray-600 hover:text-gray-900">Profile</Link>
                )}
                <button 
                  onClick={handleLogout} 
                  className="text-gray-600 hover:text-gray-900"
                >
                  <LogOut className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>
        </nav>
        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/skills" element={<SkillsAssessment />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/operations" element={<Operations />} />
            <Route path="/support" element={<Support />} />
            <Route path="/quality" element={<QualityControl />} />
            <Route path="/career" element={<CareerTrack />} />
            <Route path="/wallet" element={<WalletDashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;