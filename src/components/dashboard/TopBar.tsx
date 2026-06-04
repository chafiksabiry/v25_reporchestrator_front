import React, { useEffect, useState, useRef } from 'react';
import { Menu, Wallet, ChevronDown, UserCircle, LogOut, Calendar, ArrowRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getUserInfo } from '../../utils/authUtils';
import { useAuth } from '../../contexts/AuthContext';
import { LanguageSwitcher } from './ui/LanguageSwitcher';

const PHASE_NAMES: Record<number, string> = {
  1: 'Sign Up & Verification',
  2: 'Profile Creation',
  3: 'Skills Assessment',
  4: 'Subscription Plan',
};

interface NextPhaseInfo {
  number: number;
  name: string;
}

/** Read onboarding progress from cache and return the first incomplete phase. */
const computeNextPhase = (): NextPhaseInfo | null => {
  try {
    const raw = localStorage.getItem('profileData');
    if (!raw) return null;
    const profile = JSON.parse(raw);
    const phases = profile?.onboardingProgress?.phases;
    if (!phases) return null;

    for (let i = 1; i <= 4; i++) {
      const phase = phases[`phase${i}`];
      if (!phase || phase.status !== 'completed') {
        return { number: i, name: PHASE_NAMES[i] || `Phase ${i}` };
      }
    }
    return null; // all phases completed
  } catch {
    return null;
  }
};

interface TopBarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

interface ProfileData {
  personalInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    photo?: {
      url: string;
      publicId: string;
    };
  };
  professionalSummary?: {
    currentRole?: string;
    yearsOfExperience?: string;
    profileDescription?: string;
  };
}

// Add event listener for profile updates
const PROFILE_UPDATE_EVENT = 'PROFILE_UPDATED';

export function TopBar({ isSidebarOpen, setIsSidebarOpen }: TopBarProps) {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const isOnOnboardingPage =
    location.pathname === '/' ||
    location.pathname === '' ||
    location.pathname.startsWith('/onboarding');
  const [balance, setBalance] = useState(() => {
    const saved = localStorage.getItem('rep_available_balance');
    return saved ? parseFloat(saved) : 0.00;
  });
  const [nextPhase, setNextPhase] = useState<NextPhaseInfo | null>(() => computeNextPhase());

  useEffect(() => {
    const handleBalanceUpdate = () => {
      const saved = localStorage.getItem('rep_available_balance');
      if (saved) {
        setBalance(parseFloat(saved));
      }
    };
    window.addEventListener('WALLET_BALANCE_UPDATED', handleBalanceUpdate);

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('WALLET_BALANCE_UPDATED', handleBalanceUpdate);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadProfileData = () => {
    console.log('🔄 TopBar component: Loading profile data');
    try {
      const userInfo = getUserInfo();
      if (userInfo) {
        // Convertir les données utilisateur au format attendu par le TopBar
        const adaptedProfileData: ProfileData = {
          personalInfo: {
            name: userInfo.name,
            email: userInfo.email,
            photo: userInfo.photo ? { url: userInfo.photo, publicId: '' } : undefined
          },
          professionalSummary: {
            currentRole: userInfo.currentRole
          }
        };

        setProfileData(adaptedProfileData);
      } else {
        console.log('⚠️ TopBar component: No profile data available');
      }
    } catch (error) {
      console.error('❌ TopBar component: Error loading profile data:', error);
    }
  };

  useEffect(() => {
    // Initial load
    loadProfileData();

    // Listen for profile updates
    const handleProfileUpdate = () => {
      console.log('🔄 TopBar: Detected profile update, refreshing data');
      loadProfileData();
      setNextPhase(computeNextPhase());
    };

    window.addEventListener(PROFILE_UPDATE_EVENT, handleProfileUpdate);

    return () => {
      window.removeEventListener(PROFILE_UPDATE_EVENT, handleProfileUpdate);
    };
  }, []);

  // Get user's name or default to "User"
  const userName = profileData?.personalInfo?.name || 'User';

  // Get user's role or default to "HARX Rep"
  const userRole = profileData?.professionalSummary?.currentRole || 'HARX Rep';

  // Generate user's initials for avatar placeholder
  const getInitials = (name: string) => {
    if (!name || name === 'User') return 'U';

    const names = name.split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }

    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  const initials = getInitials(userName);

  return (
    <header className="h-20 bg-black grid grid-cols-3 items-center px-8 shrink-0 z-20">

      {/* ── Col 1: Left — hamburger (mobile) ── */}
      <div className="flex items-center">
        <button
          className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all duration-300 shadow-sm md:hidden"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* ── Col 2: Center — Wallet + Planning ── */}
      <div className="flex items-center justify-center gap-3">

        {/* Wallet */}
        <button
          onClick={() => navigate('/wallet')}
          className="flex items-center gap-2.5 bg-white/5 border border-white/10 hover:border-blue-500/40 hover:bg-blue-500/10 px-4 py-2.5 rounded-2xl text-white transition-all duration-200 shadow-md group active:scale-95"
          title="Mon Portefeuille"
        >
          <div className="p-1.5 bg-blue-500/15 text-blue-400 rounded-xl group-hover:bg-blue-500 group-hover:text-white transition-all duration-200">
            <Wallet className="w-4 h-4" />
          </div>
          <div className="text-left leading-none">
            <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Mon Portefeuille</span>
            <span className="text-sm font-black text-white tracking-wide mt-0.5 block">
              {balance.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
            </span>
          </div>
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-white/10 shrink-0" />

        {/* Session Planning */}
        <button
          onClick={() => navigate('/session-planning')}
          className="flex items-center gap-2.5 bg-white/5 border border-white/10 hover:border-violet-500/40 hover:bg-violet-500/10 px-4 py-2.5 rounded-2xl text-white transition-all duration-200 shadow-md group active:scale-95"
          title="Session Planning"
        >
          <div className="p-1.5 bg-violet-500/15 text-violet-400 rounded-xl group-hover:bg-violet-500 group-hover:text-white transition-all duration-200">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="text-left leading-none">
            <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Planning</span>
            <span className="text-sm font-black text-white tracking-wide mt-0.5 block">Sessions</span>
          </div>
        </button>

      </div>

      {/* ── Col 3: Right — Continue Onboarding + Language + Avatar ── */}
      <div className="flex items-center justify-end gap-4">
        {nextPhase && !isOnOnboardingPage && (
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 rounded-2xl text-white transition-all duration-200 shadow-md group active:scale-95"
            title={`Continue onboarding: ${nextPhase.name}`}
          >
            <div className="text-left leading-none">
              <span className="text-[9px] text-emerald-100 font-black uppercase tracking-wider block">
                Continue Onboarding
              </span>
              <span className="text-sm font-black text-white tracking-wide mt-0.5 block">
                Phase {nextPhase.number} · {nextPhase.name}
              </span>
            </div>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
        <LanguageSwitcher />
        <div className="relative" ref={dropdownRef}>
          <div
            className="flex items-center space-x-3 p-2 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/10"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            {profileData?.personalInfo?.photo?.url ? (
              <img
                src={profileData.personalInfo.photo.url}
                alt={userName}
                className="w-10 h-10 rounded-xl object-cover shadow-sm"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-black shadow-sm border border-white/20">
                {initials}
              </div>
            )}
            <div className="text-right">
              <p className="text-sm font-black tracking-tight text-white">{userName}</p>
            </div>
            <ChevronDown className={`h-4 w-4 text-white/50 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </div>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">

              {/* ── Header: Photo + Name + Role ── */}
              <div className="px-4 py-4 flex items-center gap-3 border-b border-white/10 bg-white/[0.03]">
                {profileData?.personalInfo?.photo?.url ? (
                  <img
                    src={profileData.personalInfo.photo.url}
                    alt={userName}
                    className="w-12 h-12 rounded-xl object-cover shadow-md ring-2 ring-white/10 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center text-white font-black text-lg shadow-md shrink-0">
                    {initials}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-black text-white truncate">{userName}</p>
                  <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{userRole}</p>
                </div>
              </div>

              {/* ── Menu Items ── */}
              <div className="py-2">
                <button
                  onClick={() => { setIsDropdownOpen(false); navigate('/profile'); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/5 transition-colors"
                >
                  <div className="p-1.5 bg-harx-500/15 text-harx-400 rounded-lg">
                    <UserCircle className="h-4 w-4" />
                  </div>
                  <span>Mon Profil</span>
                </button>
              </div>

              {/* ── Logout ── */}
              <div className="border-t border-white/10 px-3 py-3">
                <button
                  onClick={() => { setIsDropdownOpen(false); logout(); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-red-400 hover:bg-red-500/10 rounded-xl transition-colors group"
                >
                  <div className="p-1.5 bg-red-500/10 text-red-400 rounded-lg group-hover:bg-red-500/20 transition-colors">
                    <LogOut className="h-4 w-4" />
                  </div>
                  <span>Déconnexion</span>
                </button>
              </div>

            </div>
          )}

        </div>
      </div>

    </header>
  );
}

