import { useState, useEffect, useCallback, type Dispatch, type SetStateAction } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import ImportDialogV2 from '../components/profile/ImportDialogV2.jsx';
import SummaryEditorV2 from '../components/profile/SummaryEditorV2.jsx';
import ProtectedRoute from '../components/profile/ProtectedRoute.jsx';
import { fetchProfileFromAPI } from '../utils/profileUtils';
import harxLogo from '../assets/logo_harx.png';
import harxLogoDark from '../assets/logo-black.png';
import mascotte from '../assets/mascotte2.png';
import { buildRepPageTitle } from '../lib/repSections';
import { usePageTitle } from '../lib/tracking/usePageTitle';

const POWERED_BY_CAPABILITIES = [
  {
    name: 'AI',
    color: '#9333EA',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    ),
  },
  {
    name: 'Telephony',
    color: '#F22F46',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    ),
  },
  {
    name: 'Payments',
    color: '#00A35C',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    ),
  },
  {
    name: 'Transactions',
    color: '#635BFF',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    ),
  },
];

type ProfileRecord = Record<string, unknown> & {
  _id?: string;
  generatedSummary?: string;
  professionalSummary?: { profileDescription?: string };
};

function ProfileLoading({ label = 'Loading your profile…' }: { label?: string }) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl shadow-sm border border-gray-100">
        <span className="relative flex h-14 w-14">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-harx-400 opacity-30" />
          <span className="relative inline-flex rounded-full h-14 w-14 items-center justify-center bg-gradient-to-br from-harx-500 to-harx-alt-500">
            <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </span>
        </span>
        <p className="mt-5 text-gray-700 font-medium">{label}</p>
        <p className="mt-1 text-sm text-gray-400">This only takes a moment.</p>
      </div>
    </div>
  );
}

const IMPORT_FEATURES = [
  {
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    ),
    title: 'Instant analysis',
    desc: 'Your CV is parsed in seconds.',
  },
  {
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    ),
    title: 'AI-powered',
    desc: 'Smart summary & skill matching.',
  },
  {
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    ),
    title: 'Private & secure',
    desc: 'Your data stays protected.',
  },
];

const IMPORT_STEPS = [
  { n: 1, label: 'Upload your CV (PDF)' },
  { n: 2, label: 'AI extracts your profile' },
  { n: 3, label: 'Review & save' },
];

function ProfileImportPage({
  onImport,
}: {
  onImport: (data: ProfileRecord) => void;
}) {
  const [isImportOpen, setIsImportOpen] = useState(false);

  return (
    <div className="relative flex min-h-[calc(100vh-9.5rem)] flex-col justify-center overflow-hidden rounded-[2rem] bg-gradient-to-br from-white via-harx-50/40 to-harx-alt-50/40 shadow-sm">
      {/* ── HARX branded background ── */}
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-harx-300/30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-28 -left-24 w-96 h-96 rounded-full bg-harx-alt-300/25 blur-3xl pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, #111 1px, transparent 0)',
          backgroundSize: '26px 26px',
        }}
      />
      <img
        src={harxLogo}
        alt=""
        aria-hidden="true"
        className="absolute -bottom-10 -right-6 w-72 opacity-[0.05] rotate-[-8deg] pointer-events-none select-none"
      />
      <img
        src={harxLogoDark}
        alt=""
        aria-hidden="true"
        className="absolute top-8 left-6 w-40 opacity-[0.04] pointer-events-none select-none"
      />
      <img
        src={mascotte}
        alt=""
        aria-hidden="true"
        className="absolute top-16 -left-8 w-44 opacity-[0.04] rotate-12 pointer-events-none select-none"
      />
      <p
        aria-hidden="true"
        className="absolute bottom-24 left-8 text-[10px] font-black uppercase tracking-[0.35em] text-harx-600/10 pointer-events-none select-none -rotate-90 origin-left"
      >
        We inspire growth
      </p>

      <div className="relative w-full max-w-3xl mx-auto px-4">
        <div className="flex flex-col items-center text-center py-10">
          <span className="inline-flex items-center gap-2 mb-3 text-[11px] font-bold tracking-[0.2em] uppercase text-harx-600">
          <span className="h-1.5 w-1.5 rounded-full bg-harx-500 animate-pulse" />
          Step 1 · Create your profile
        </span>

        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2 leading-tight">
          Turn your CV into a{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-harx-600 to-harx-alt-600">
            standout profile
          </span>
        </h2>
        <p className="text-gray-500 max-w-lg mb-6">
          Upload your CV and let our AI build your professional story, extract
          your skills and languages — all in a few seconds.
        </p>

        <button
          onClick={() => setIsImportOpen(true)}
          className="group inline-flex items-center gap-2 px-8 py-3 text-base font-semibold text-white bg-gradient-to-r from-harx-600 to-harx-alt-600 rounded-full shadow-lg shadow-harx-500/25 hover:shadow-xl hover:shadow-harx-500/30 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-harx-500 transition-all duration-200"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Import my CV
          <svg className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>

        {/* Feature highlights — borderless */}
        <div className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-3 w-full">
          {IMPORT_FEATURES.map((f) => (
            <div key={f.title} className="flex flex-col items-center text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-harx-50 text-harx-600 mb-2">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {f.icon}
                </svg>
              </span>
              <p className="text-sm font-semibold text-gray-900">{f.title}</p>
              <p className="text-xs text-gray-500 mt-0.5 max-w-[14rem]">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Steps */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
          {IMPORT_STEPS.map((s, i) => (
            <div key={s.n} className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-harx-600 text-white text-xs font-bold">
                {s.n}
              </span>
              <span className="text-sm font-medium text-gray-600">{s.label}</span>
              {i < IMPORT_STEPS.length - 1 && (
                <svg className="hidden sm:block h-4 w-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          ))}
        </div>

        {/* Powered by — platform capabilities */}
        <div className="mt-10 w-full">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-4">
            Powered by
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
            {POWERED_BY_CAPABILITIES.map((cap) => (
              <span
                key={cap.name}
                className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500"
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${cap.color}1A`, color: cap.color }}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {cap.icon}
                  </svg>
                </span>
                {cap.name}
              </span>
            ))}
          </div>
        </div>
        </div>

        <ImportDialogV2
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          onImport={onImport}
        />
      </div>
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

  usePageTitle(
    buildRepPageTitle(isEditor ? 'Éditeur de profil' : 'Import CV'),
    isEditor
      ? 'Affinez votre profil rep HARX.'
      : 'Importez votre CV pour créer votre profil rep HARX.',
  );

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
          <ProfileLoading label="Preparing your professional story…" />
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
