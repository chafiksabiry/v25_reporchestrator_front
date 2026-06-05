import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ImportDialogV2 from '../components/profile/ImportDialogV2';
import SummaryEditorV2 from '../components/profile/SummaryEditorV2';
import TopBar from '../components/profile/TopBar';
import ProtectedRoute from '../components/profile/ProtectedRoute';
import { AuthProvider } from '../contexts/AuthContext';

function ProfileImportPage() {
  const [isImportOpen, setIsImportOpen] = useState(false);
  const navigate = useNavigate();

  const handleProfileData = () => {
    navigate('/profile-editor');
  };

  return (
    <div className="h-screen bg-gradient-to-br from-harx-50 via-white to-harx-alt-50 flex flex-col overflow-hidden">
      <TopBar />
      <div className="flex-1 overflow-y-auto py-12 px-4 sm:px-6 lg:px-8">
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
      </div>
    </div>
  );
}

function ProfileEditorPage() {
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [generatedSummary, setGeneratedSummary] = useState('');

  return (
    <div className="h-screen bg-gradient-to-br from-harx-50 via-white to-harx-alt-50 flex flex-col overflow-hidden">
      <TopBar />
      <div className="flex-1 overflow-y-auto py-12 px-4 sm:px-6 lg:px-8">
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
      </div>
    </div>
  );
}

export default function ProfileRoutes() {
  // Mounted from App.tsx at both `/profile-import` and `/profile-editor`.
  // We avoid a nested <Routes> here: the parent route has no trailing `*`, so a
  // descendant <Routes> with absolute paths would never match (blank page).
  // Instead we pick the page from the current pathname.
  const location = useLocation();
  const isEditor = location.pathname.includes('/profile-editor');

  return (
    <AuthProvider>
      <ProtectedRoute>
        {isEditor ? <ProfileEditorPage /> : <ProfileImportPage />}
      </ProtectedRoute>
    </AuthProvider>
  );
}
