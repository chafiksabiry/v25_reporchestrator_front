import { useEffect, useState, useRef } from 'react';
import { Menu, Wallet, ChevronDown, UserCircle, LogOut, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getUserInfo, getProfileData, getAgentId } from '../../utils/authUtils';
import api from '../../utils/client';
import { useAuth } from '../../contexts/AuthContext';
import { LanguageSwitcher } from './ui/LanguageSwitcher';
import { NotificationBell } from './NotificationBell';
import config from '../../config';
import { HARX_NAVBAR_BG, HARX_BAR_SHADOW, HARX_TEXT_SHADOW } from '../../utils/harxBrand';

/**
 * Onboarding is complete (agent profile created) only when phases 1-4 are all
 * completed. Returns false when there is no progress data yet, so Wallet and
 * Planning stay hidden by default until we know the rep is onboarded.
 */
const computeOnboardingComplete = (): boolean => {
  try {
    const raw = localStorage.getItem('profileData');
    if (!raw) return false;
    const profile = JSON.parse(raw);
    const phases = profile?.onboardingProgress?.phases;
    if (!phases) return false;

    for (let i = 1; i <= 4; i++) {
      const phase = phases[`phase${i}`];
      if (!phase || phase.status !== 'completed') return false;
    }
    return true;
  } catch {
    return false;
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
  const { logout } = useAuth();

  const readWalletTotal = () => {
    const available = parseFloat(localStorage.getItem('rep_available_balance') || '0');
    const pending = parseFloat(localStorage.getItem('rep_pending_balance') || '0');
    const safeAvailable = Number.isFinite(available) ? available : 0;
    const safePending = Number.isFinite(pending) ? pending : 0;
    return safeAvailable + safePending;
  };

  const [balance, setBalance] = useState(() => readWalletTotal());
  const [onboardingComplete, setOnboardingComplete] = useState<boolean>(() => computeOnboardingComplete());
  const [displayName, setDisplayName] = useState<string>('User');

  useEffect(() => {
    const handleBalanceUpdate = () => {
      setBalance(readWalletTotal());
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

  // Resolve the best display name: the agent profile name if it exists,
  // otherwise (profile not created yet) fall back to the registration user's
  // fullName fetched from the auth backend.
  const resolveDisplayName = async () => {
    const agentName = (getProfileData()?.personalInfo?.name || '').trim();
    if (agentName) {
      setDisplayName(agentName);
      return;
    }
    try {
      const { userId, token } = config.getUserData();
      const base = import.meta.env.VITE_AUTH_API_URL;
      if (userId && base) {
        const res = await fetch(`${base}/users/${userId}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (res.ok) {
          const json = await res.json();
          const fullName = (json?.data?.fullName || json?.fullName || '').trim();
          if (fullName) {
            setDisplayName(fullName);
            return;
          }
        }
      }
    } catch (error) {
      console.warn('TopBar: could not resolve user fullName from auth backend', error);
    }
    setDisplayName('User');
  };

  useEffect(() => {
    // Initial load
    loadProfileData();
    resolveDisplayName();

    // Listen for profile updates
    const handleProfileUpdate = () => {
      console.log('🔄 TopBar: Detected profile update, refreshing data');
      loadProfileData();
      resolveDisplayName();
      setOnboardingComplete(computeOnboardingComplete());
    };

    window.addEventListener(PROFILE_UPDATE_EVENT, handleProfileUpdate);

    return () => {
      window.removeEventListener(PROFILE_UPDATE_EVENT, handleProfileUpdate);
    };
  }, []);

  // Get user's name: agent profile name, else registration fullName, else "User"
  const userName = displayName;

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
    <header
      style={{ backgroundImage: HARX_NAVBAR_BG, boxShadow: HARX_BAR_SHADOW, textShadow: HARX_TEXT_SHADOW }}
      className="relative h-16 grid grid-cols-[auto_1fr_auto] items-center gap-2 px-4 sm:px-8 shrink-0 z-20"
    >

      {/* ── Col 1: Left — hamburger (mobile) ── */}
      <div className="flex items-center">
        <button
          className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all duration-300 shadow-sm md:hidden"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* ── Col 2: Center — Wallet + Planning (only once onboarding done) ──
          Lives in the flexible middle column so it never overflows onto the
          side columns. Hidden below sm where there isn't enough room. */}
      <div className="hidden sm:flex items-center justify-center gap-2 sm:gap-3 min-w-0">

        {onboardingComplete && (
          <>
            {/* Wallet */}
            <button
              onClick={() => navigate('/wallet')}
              className="flex items-center gap-2.5 bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 hover:border-white/40 px-4 py-2.5 rounded-2xl text-white transition-all duration-200 shadow-lg shadow-black/10 group active:scale-95"
              title="Mon Portefeuille"
            >
              <div className="p-1.5 bg-white/20 text-white rounded-xl group-hover:bg-white group-hover:text-[#E6188D] transition-all duration-200 shadow-sm">
                <Wallet className="w-4 h-4" />
              </div>
              <div className="text-left leading-none">
                <span className="text-[9px] text-white/70 font-black uppercase tracking-wider block">Mon Portefeuille</span>
                <span className="text-sm font-black text-white tracking-wide mt-0.5 block">
                  {balance.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                </span>
              </div>
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-white/20 shrink-0" />

            {/* Session Planning */}
            <button
              onClick={() => navigate('/session-planning')}
              className="flex items-center gap-2.5 bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 hover:border-white/40 px-4 py-2.5 rounded-2xl text-white transition-all duration-200 shadow-lg shadow-black/10 group active:scale-95"
              title="Session Planning"
            >
              <div className="p-1.5 bg-white/20 text-white rounded-xl group-hover:bg-white group-hover:text-[#E6188D] transition-all duration-200 shadow-sm">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="text-left leading-none">
                <span className="text-[9px] text-white/70 font-black uppercase tracking-wider block">Planning</span>
                <span className="text-sm font-black text-white tracking-wide mt-0.5 block">Sessions</span>
              </div>
            </button>
          </>
        )}

      </div>

      {/* ── Col 3: Right — Notifications + Language + Avatar ── */}
      <div className="flex items-center justify-end gap-2 sm:gap-4">
        <NotificationBell />
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
            <div
              style={{ backgroundImage: HARX_NAVBAR_BG }}
              className="absolute right-0 mt-2 w-64 border border-white/20 rounded-2xl shadow-2xl shadow-[#8A1250]/40 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
            >

              {/* ── Header: Photo + Name + Role ── */}
              <div className="relative px-4 py-4 flex items-center gap-3 border-b border-white/20 bg-white/10 backdrop-blur-sm">
                {profileData?.personalInfo?.photo?.url ? (
                  <img
                    src={profileData.personalInfo.photo.url}
                    alt={userName}
                    className="w-12 h-12 rounded-xl object-cover shadow-md ring-2 ring-white/40 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-black text-lg shadow-md shrink-0 ring-1 ring-white/30">
                    {initials}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-black text-white truncate">{userName}</p>
                  <p className="text-[10px] text-white/70 font-medium truncate mt-0.5">{userRole}</p>
                </div>
              </div>

              {/* ── Menu Items ── */}
              <div className="py-2 px-1.5">
                <button
                  onClick={() => { setIsDropdownOpen(false); navigate('/profile'); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-white hover:bg-white/15 transition-colors group"
                >
                  <div className="p-1.5 bg-white/20 text-white rounded-lg group-hover:bg-white group-hover:text-[#E6188D] transition-all duration-200">
                    <UserCircle className="h-4 w-4" />
                  </div>
                  <span>Mon Profil</span>
                </button>
              </div>

              {/* ── Logout ── */}
              <div className="border-t border-white/20 px-3 py-3">
                <button
                  onClick={() => { setIsDropdownOpen(false); logout(); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-white hover:bg-black/20 rounded-xl transition-colors group"
                >
                  <div className="p-1.5 bg-white/20 text-white rounded-lg group-hover:bg-white group-hover:text-[#ED1C24] transition-all duration-200">
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

