import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ImportDialog from '../components/wizard/ImportDialog';
import SummaryEditor from '../components/wizard/SummaryEditor';
import LinkedInCallback from '../components/wizard/LinkedInCallback';
import RepsProfile from '../components/wizard/REPSProfile';
import api from '../lib/api/client';
import Cookies from 'js-cookie';

function WizardHomePage() {
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [profileData, setProfileData] = useState({
    personalInfo: { name: '', location: '', languages: [], email: '', phone: '', linkedin: '', website: '' },
    professionalSummary: { yearsOfExperience: '', currentRole: '', industries: [], keyExpertise: [], notableCompanies: [] },
    skills: { technical: [], professional: [], soft: [] },
    experience: [],
    achievements: [],
  });
  const [generatedSummary, setGeneratedSummary] = useState('');

  useEffect(() => {
    const initializeToken = async () => {
      try {
        const runMode = import.meta.env.VITE_RUN_MODE || 'in-app';
        const userId = runMode === 'standalone'
          ? import.meta.env.VITE_STANDALONE_USER_ID
          : Cookies.get('userId');
        const token = localStorage.getItem('token');
        if (!token && userId) {
          const { data } = await api.post('/auth/generate-token', { userId });
          if (data?.token) localStorage.setItem('token', data.token);
        }
      } catch (error) {
        console.error('Failed to initialize token:', error);
      }
    };
    initializeToken();
  }, []);

  const handleProfileData = (data) => {
    const { generatedSummary: summary, ...profileInfo } = data;
    setProfileData(profileInfo);
    setGeneratedSummary(summary || '');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            HARX REPS Profile Wizard
          </h1>
        </div>
        {!profileData.personalInfo.name ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-xl border border-gray-100">
            <button
              onClick={() => setIsImportOpen(true)}
              className="inline-flex items-center px-6 py-3 text-lg font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"
            >
              Let's Get Started
            </button>
          </div>
        ) : (
          <SummaryEditor
            profileData={profileData}
            generatedSummary={generatedSummary}
            setGeneratedSummary={setGeneratedSummary}
            onProfileUpdate={handleProfileData}
          />
        )}
        <ImportDialog isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} onImport={handleProfileData} />
      </div>
    </div>
  );
}

export default function WizardRoutes() {
  return (
    <Routes>
      <Route path="/" element={<WizardHomePage />} />
      <Route path="/linkedin-callback" element={<LinkedInCallback />} />
      <Route path="/reps-profile" element={<RepsProfile />} />
      <Route path="*" element={<Navigate to="/profile-wizard" replace />} />
    </Routes>
  );
}
