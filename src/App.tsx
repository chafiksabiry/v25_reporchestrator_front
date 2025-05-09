import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Wallet } from 'lucide-react';
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

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Top Navigation */}
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link to="/" className="flex items-center">
                  <Wallet className="w-8 h-8 text-blue-600" />
                  <span className="ml-2 text-xl font-semibold text-gray-900">REPS Platform</span>
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <Link to="/wallet" className="text-gray-600 hover:text-gray-900">Wallet</Link>
                <Link to="/marketplace" className="text-gray-600 hover:text-gray-900">Marketplace</Link>
                <Link to="/profile" className="text-gray-600 hover:text-gray-900">Profile</Link>
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