import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ImportDialogV2 from '../components/profile/ImportDialogV2.jsx';
import SummaryEditorV2 from '../components/profile/SummaryEditorV2.jsx';
import ProtectedRoute from '../components/profile/ProtectedRoute.jsx';

function ProfileImportPage() {
  const [isImportOpen, setIsImportOpen] = useState(false);
  const navigate = useNavigate();

  const handleProfileData = () => {
    navigate('/profile-editor');
  };

  return (
    <div className="max-w-4xl mx-auto text-center py-12 bg-white rounded-2xl shadow-xl border border-gray-100">
      <h3 className="text-2xl font-bold text-gray-900 mb-4">Import your CV</h3>
      <button
        onClick={() => setIsImportOpen(true)}
        className="inline-flex items-center px-6 py-3 text-lg font-medium text-white bg-gradient-to-r from-harx-600 to-harx-alt-600 rounded-full"
      >
        Let's Get Started
      </button>
      <ImportDialogV2 isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} onImport={handleProfileData} />
    </div>
  );
}

function ProfileEditorPage() {
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [generatedSummary, setGeneratedSummary] = useState('');

  return (
    <div className="max-w-4xl mx-auto">
      <SummaryEditorV2
        profileData={profileData}
        generatedSummary={generatedSummary}
        setGeneratedSummary={setGeneratedSummary}
        onProfileUpdate={(data: Record<string, unknown> & { generatedSummary?: string }) => {
          const { generatedSummary: summary, ...profileInfo } = data;
          setProfileData(profileInfo);
          setGeneratedSummary(summary || '');
        }}
      />
    </div>
  );
}

export default function ProfileRoutes() {
  // Rendered through <OnboardingShell /> (App.tsx), which already provides the
  // global Sidebar + TopBar and an AuthProvider. We only render the inner page
  // content here. We pick the page from the pathname instead of a nested
  // <Routes> (the parent route has no trailing `*`).
  const location = useLocation();
  const isEditor = location.pathname.includes('/profile-editor');

  return (
    <ProtectedRoute>
      {isEditor ? <ProfileEditorPage /> : <ProfileImportPage />}
    </ProtectedRoute>
  );
}
