import { useState, useEffect, useCallback, type Dispatch, type SetStateAction } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import ImportDialogV2 from '../components/profile/ImportDialogV2.jsx';
import SummaryEditorV2 from '../components/profile/SummaryEditorV2.jsx';
import ProtectedRoute from '../components/profile/ProtectedRoute.jsx';
import { fetchProfileFromAPI } from '../utils/profileUtils';

type ProfileRecord = Record<string, unknown> & {
  _id?: string;
  generatedSummary?: string;
  professionalSummary?: { profileDescription?: string };
};

function ProfileLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-harx-500" />
      <p className="mt-4 text-gray-600">Loading your profile...</p>
    </div>
  );
}

function ProfileImportPage({
  onImport,
}: {
  onImport: (data: ProfileRecord) => void;
}) {
  const [isImportOpen, setIsImportOpen] = useState(false);

  return (
    <div className="max-w-4xl mx-auto text-center py-12 bg-white rounded-2xl shadow-xl border border-gray-100">
      <h3 className="text-2xl font-bold text-gray-900 mb-4">Import your CV</h3>
      <button
        onClick={() => setIsImportOpen(true)}
        className="inline-flex items-center px-6 py-3 text-lg font-medium text-white bg-gradient-to-r from-harx-600 to-harx-alt-600 rounded-full"
      >
        Let's Get Started
      </button>
      <ImportDialogV2
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={onImport}
      />
    </div>
  );
}

function ProfileEditorPage({
  profileData,
  generatedSummary,
  setGeneratedSummary,
  onProfileUpdate,
}: {
  profileData: ProfileRecord;
  generatedSummary: string;
  setGeneratedSummary: Dispatch<SetStateAction<string>>;
  onProfileUpdate: (data: ProfileRecord) => void;
}) {
  return (
    <div className="max-w-4xl mx-auto">
      <SummaryEditorV2
        profileData={profileData}
        generatedSummary={generatedSummary}
        setGeneratedSummary={setGeneratedSummary}
        onProfileUpdate={onProfileUpdate}
      />
    </div>
  );
}

export default function ProfileRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const isEditor = location.pathname.includes('/profile-editor');

  const [profileData, setProfileData] = useState<ProfileRecord | null>(null);
  const [generatedSummary, setGeneratedSummary] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(false);

  const applyProfileData = useCallback((data: ProfileRecord) => {
    const { generatedSummary: summary, ...profileInfo } = data;
    setProfileData(profileInfo);
    setGeneratedSummary(
      summary ||
        (profileInfo.professionalSummary?.profileDescription as string) ||
        ''
    );
    localStorage.setItem('profileData', JSON.stringify(profileInfo));
    if (profileInfo._id) {
      localStorage.setItem('agentId', String(profileInfo._id));
      Cookies.set('agentId', String(profileInfo._id));
    }
  }, []);

  const handleProfileData = useCallback(
    (data: ProfileRecord) => {
      applyProfileData(data);
      navigate('/profile-editor');
    },
    [applyProfileData, navigate]
  );

  // When landing on /profile-editor directly (refresh, link), load profile if missing.
  useEffect(() => {
    if (!isEditor || profileData) return;

    let cancelled = false;

    const loadProfile = async () => {
      setLoadingProfile(true);
      try {
        const cached = localStorage.getItem('profileData');
        if (cached) {
          const parsed = JSON.parse(cached) as ProfileRecord;
          if (parsed?.personalInfo) {
            if (!cancelled) {
              applyProfileData(parsed);
            }
            return;
          }
        }

        const fromApi = await fetchProfileFromAPI();
        if (!cancelled && fromApi) {
          applyProfileData(fromApi as ProfileRecord);
        }
      } catch (err) {
        console.error('Failed to load profile for editor:', err);
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    };

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [isEditor, profileData, applyProfileData]);

  return (
    <ProtectedRoute>
      {isEditor ? (
        loadingProfile || !profileData ? (
          <ProfileLoading />
        ) : (
          <ProfileEditorPage
            profileData={profileData}
            generatedSummary={generatedSummary}
            setGeneratedSummary={setGeneratedSummary}
            onProfileUpdate={handleProfileData}
          />
        )
      ) : (
        <ProfileImportPage onImport={handleProfileData} />
      )}
    </ProtectedRoute>
  );
}
