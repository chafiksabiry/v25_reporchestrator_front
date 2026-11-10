import { useState, useEffect, useCallback, lazy, Suspense, type Dispatch, type SetStateAction } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import ProtectedRoute from '../components/profile/ProtectedRoute.jsx';
import { fetchProfileFromAPI } from '../utils/profileUtils';
import harxLogo from '../assets/logo_harx.png';
import { buildRepPageTitle } from '../lib/repSections';
import { usePageTitle } from '../lib/tracking/usePageTitle';
import { useTranslation } from 'react-i18next';
import { getRepOnboardingStep } from '../utils/repOnboardingNextStep';

// Heavy: PDF.js / OpenAI parsing — only needed when the import dialog opens.
const ImportDialogV2 = lazy(() => import('../components/profile/ImportDialogV2.jsx'));
// Heavy: large editor tree — only needed on /profile-editor.
const SummaryEditorV2 = lazy(() => import('../components/profile/SummaryEditorV2.jsx'));

const POWERED_BY_CAPABILITIES = [
  {
    nameKey: 'profileImport.capabilities.ai',
    color: '#9333EA',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    ),
  },
  {
    nameKey: 'profileImport.capabilities.telephony',
    color: '#F22F46',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    ),
  },
  {
    nameKey: 'profileImport.capabilities.payments',
    color: '#00A35C',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    ),
  },
  {
    nameKey: 'profileImport.capabilities.transactions',
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

function ProfileLoading({ label }: { label?: string }) {
  const { t } = useTranslation();
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
        <p className="mt-5 text-gray-700 font-medium">{label || t('profileImport.loadingProfile')}</p>
        <p className="mt-1 text-sm text-gray-400">{t('profileImport.loadingHint')}</p>
      </div>
    </div>
  );
}

const IMPORT_STEPS = [
  { n: 1, labelKey: 'profileImport.step1Label' },
  { n: 2, labelKey: 'profileImport.step2Label' },
  { n: 3, labelKey: 'profileImport.step3Label' },
];

/** Exemples affichés dans l'aperçu : illustrent ce que l'IA construit à partir d'un CV (aucune donnée réelle). */
const PREVIEW_SKILLS = ['profileImport.preview.skill1', 'profileImport.preview.skill2', 'profileImport.preview.skill3', 'profileImport.preview.skill4'];
const PREVIEW_MISSIONS = [
  { titleKey: 'profileImport.preview.mission1', metaKey: 'profileImport.preview.mission1Meta', match: 94 },
  { titleKey: 'profileImport.preview.mission2', metaKey: 'profileImport.preview.mission2Meta', match: 88 },
];
const BENEFITS = [
  { titleKey: 'profileImport.benefit1Title', descKey: 'profileImport.benefit1Desc', color: '#9333EA', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /> },
  { titleKey: 'profileImport.benefit2Title', descKey: 'profileImport.benefit2Desc', color: '#F22F46', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /> },
  { titleKey: 'profileImport.benefit3Title', descKey: 'profileImport.benefit3Desc', color: '#00A35C', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
];

export function ProfileImportPage({
  onImport,
}: {
  onImport: (data: ProfileRecord) => void;
}) {
  const [isImportOpen, setIsImportOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="relative flex min-h-[calc(100vh-9.5rem)] flex-col justify-center overflow-hidden rounded-[2rem] bg-gradient-to-br from-white via-harx-50/50 to-harx-alt-50/50 shadow-sm">
      {/* ── Fond aux couleurs HARX ── */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-harx-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-24 h-96 w-96 rounded-full bg-harx-alt-300/25 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #111 1px, transparent 0)', backgroundSize: '26px 26px' }}
      />
      <img src={harxLogo} alt="" aria-hidden="true" className="pointer-events-none absolute -bottom-10 -right-6 w-72 rotate-[-8deg] select-none opacity-[0.05]" />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:py-9">
        {/* ── Pitch ── */}
        <div className="flex flex-col items-start text-left">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-harx-200 bg-white/80 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-harx-600 shadow-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-harx-500" />
            {t('profileImport.step1')}
            <span className="rounded-full bg-harx-50 px-2 py-0.5 text-[10px] tracking-wider text-harx-700">{t('profileImport.duration')}</span>
          </span>

          <h2 className="mb-3 text-3xl font-extrabold leading-tight text-gray-900 sm:text-4xl lg:text-[2.6rem]">
            {t('profileImport.title1')}{' '}
            <span className="bg-gradient-to-r from-harx-600 to-harx-alt-600 bg-clip-text text-transparent">{t('profileImport.title2')}</span>
          </h2>
          <p className="mb-5 max-w-xl text-base text-gray-600">{t('profileImport.subtitle')}</p>

          <ul className="mb-6 w-full max-w-xl space-y-2.5">
            {BENEFITS.map((b) => (
              <li key={b.titleKey} className="flex items-start gap-3.5 rounded-2xl border border-white bg-white/70 p-3 shadow-sm backdrop-blur">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${b.color}1A`, color: b.color }}>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{b.icon}</svg>
                </span>
                <span>
                  <span className="block text-sm font-bold text-gray-900">{t(b.titleKey)}</span>
                  <span className="block text-sm text-gray-500">{t(b.descKey)}</span>
                </span>
              </li>
            ))}
          </ul>

          <button
            onClick={() => setIsImportOpen(true)}
            className="group inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-harx-600 to-harx-alt-600 px-9 py-4 text-base font-bold text-white shadow-lg shadow-harx-500/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-harx-500/40 focus:outline-none focus-visible:ring-4 focus-visible:ring-harx-300"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {t('profileImport.importBtn')}
            <svg className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
          <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            {t('profileImport.trust')}
          </p>

          {/* Étapes : cette page est toujours l'étape 1 ; les suivantes sont à venir. */}
          <ol className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2" aria-label={t('profileImport.stepsLabel')}>
            {IMPORT_STEPS.map((s, i) => {
              const isCurrent = s.n === 1;
              return (
                <li key={s.n} className="flex items-center gap-1.5" aria-current={isCurrent ? 'step' : undefined}>
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${isCurrent ? 'bg-harx-600 text-white' : 'border border-gray-200 bg-gray-100 text-gray-400'}`}>{s.n}</span>
                  <span className={`whitespace-nowrap text-xs font-medium ${isCurrent ? 'text-gray-900' : 'text-gray-400'}`}>{t(s.labelKey)}</span>
                  {i < IMPORT_STEPS.length - 1 && <svg className="hidden h-3.5 w-3.5 text-gray-300 sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>}
                </li>
              );
            })}
          </ol>
        </div>

        {/* ── Aperçu : ce que l'IA construit à partir du CV (exemple) ── */}
        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-harx-200/50 to-harx-alt-200/50 blur-xl" aria-hidden="true" />
          <div className="relative overflow-hidden rounded-3xl border border-white bg-white shadow-2xl shadow-harx-500/10">
            <div className="flex items-center justify-between bg-gradient-to-r from-harx-600 to-harx-alt-600 px-5 py-3 text-white">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em]">{t('profileImport.preview.title')}</span>
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">{t('profileImport.preview.example')}</span>
            </div>
            <div className="space-y-5 p-5">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-harx-100 to-harx-alt-100 text-harx-600">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </span>
                <div>
                  <p className="text-base font-extrabold text-gray-900">{t('profileImport.preview.name')}</p>
                  <p className="text-sm text-gray-500">{t('profileImport.preview.role')}</p>
                </div>
              </div>

              <p className="rounded-2xl bg-gray-50 p-3.5 text-sm italic leading-relaxed text-gray-600">« {t('profileImport.preview.summary')} »</p>

              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">{t('profileImport.preview.skills')}</p>
                <div className="flex flex-wrap gap-2">
                  {PREVIEW_SKILLS.map((k) => <span key={k} className="rounded-full bg-harx-50 px-3 py-1 text-xs font-semibold text-harx-700">{t(k)}</span>)}
                </div>
              </div>

              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">{t('profileImport.preview.missions')}</p>
                <ul className="space-y-2">
                  {PREVIEW_MISSIONS.map((m) => (
                    <li key={m.titleKey} className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 p-3">
                      <span>
                        <span className="block text-sm font-bold text-gray-900">{t(m.titleKey)}</span>
                        <span className="block text-xs text-gray-500">{t(m.metaKey)}</span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-sm font-extrabold text-emerald-600">{m.match} %</span>
                        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-emerald-100"><span className="block h-full rounded-full bg-emerald-500" style={{ width: `${m.match}%` }} /></span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Propulsé par : capacités de la plateforme */}
      <div className="relative mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t border-gray-100/80 px-6 pb-6 pt-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">{t('profileImport.poweredBy')}</p>
        {POWERED_BY_CAPABILITIES.map((cap) => (
          <span key={cap.nameKey} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${cap.color}1A`, color: cap.color }}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{cap.icon}</svg>
            </span>
            {t(cap.nameKey)}
          </span>
        ))}
      </div>

      {isImportOpen && (
        <Suspense fallback={null}>
          <ImportDialogV2 isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} onImport={onImport} />
        </Suspense>
      )}
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
      <Suspense fallback={<ProfileLoading />}>
        <SummaryEditorV2
          profileData={profileData}
          generatedSummary={generatedSummary}
          setGeneratedSummary={setGeneratedSummary}
          onProfileUpdate={onProfileUpdate}
        />
      </Suspense>
    </div>
  );
}

export default function ProfileRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const isEditor = location.pathname.includes('/profile-editor');
  const { t } = useTranslation();

  usePageTitle(
    buildRepPageTitle(t(isEditor ? 'profileImport.meta.editorTitle' : 'profileImport.meta.importTitle')),
    t(isEditor ? 'profileImport.meta.editorDescription' : 'profileImport.meta.importDescription'),
  );

  const [profileData, setProfileData] = useState<ProfileRecord | null>(null);
  const [generatedSummary, setGeneratedSummary] = useState('');
  // Only block the editor on profile fetch. Import CV paints immediately so the
  // page is not blank while Qiankun + Profile API + heavy chunks finish.
  const [loadingProfile, setLoadingProfile] = useState(isEditor);

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

  // Editor: load profile before render.
  // Import: show UI immediately; resume-redirect runs in the background.
  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      if (isEditor && profileData) {
        setLoadingProfile(false);
        return;
      }

      if (isEditor) {
        setLoadingProfile(true);
      }

      try {
        if (isEditor) {
          const cached = localStorage.getItem('profileData');
          if (cached) {
            const parsed = JSON.parse(cached) as ProfileRecord;
            if (parsed?.personalInfo) {
              if (!cancelled) {
                applyProfileData(parsed);
                const next = getRepOnboardingStep(parsed);
                // Stay on the editor to finish phase 2 — never bounce back to import.
                if (
                  next.path !== '/profile-editor' &&
                  next.path !== '/profile-import'
                ) {
                  navigate(next.path, { replace: true });
                }
              }
              return;
            }
          }
        }

        const fromApi = await fetchProfileFromAPI();
        if (cancelled || !fromApi) return;

        if (isEditor) {
          applyProfileData(fromApi as ProfileRecord);
          const next = getRepOnboardingStep(fromApi);
          if (
            next.path !== '/profile-editor' &&
            next.path !== '/profile-import'
          ) {
            navigate(next.path, { replace: true });
          }
          return;
        }

        const next = getRepOnboardingStep(fromApi);
        if (next.path !== '/profile-import') {
          navigate(next.path, { replace: true });
        }
      } catch (err) {
        console.error('Failed to load profile for editor:', err);
      } finally {
        if (!cancelled && isEditor) setLoadingProfile(false);
      }
    };

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [isEditor, profileData, applyProfileData, navigate]);

  return (
    <ProtectedRoute>
      {isEditor ? (
        loadingProfile || !profileData ? (
          <ProfileLoading label={t('profileImport.preparingStory')} />
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
