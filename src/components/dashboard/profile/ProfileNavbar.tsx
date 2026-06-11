import React from 'react';
import { useTranslation } from 'react-i18next';
import { User, Zap, Briefcase, Globe, ClipboardCheck, Target, Clock, AlertTriangle } from 'lucide-react';

interface ProfileNavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  /** Tab ids that should display a warning badge (e.g. unverified languages). */
  warningTabs?: string[];
  /** Optional per-tab tooltip message shown on hover of the warning badge. */
  warningMessages?: Record<string, string>;
}

export const ProfileNavbar: React.FC<ProfileNavbarProps> = ({ activeTab, onTabChange, warningTabs = [], warningMessages = {} }) => {
  const { i18n } = useTranslation();
  const isFr = (i18n.language || 'en').slice(0, 2) === 'fr';
  const defaultWarning = isFr ? 'Action requise sur cet onglet' : 'Action required on this tab';
  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'experience', label: 'Experience', icon: Briefcase },
    { id: 'languages', label: 'Languages', icon: Globe },
    { id: 'skills', label: 'Skills', icon: Zap },
    { id: 'specialization', label: 'Specialization', icon: Target },
    { id: 'availability', label: 'Availability', icon: Clock },
  ];

  return (
    <div className="border-b border-gray-100 mb-8 overflow-x-auto scrollbar-hide md:overflow-visible">
      <nav className="flex items-center">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const hasWarning = warningTabs.includes(tab.id);
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                relative flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all whitespace-nowrap
                ${isActive 
                  ? 'text-harx-600' 
                  : 'text-gray-400 hover:text-gray-600'}
              `}
            >
              <tab.icon className={`w-4 h-4 ${isActive ? 'text-harx-600' : 'text-gray-400'}`} />
              <span className="tracking-tight">{tab.label}</span>

              {hasWarning && (
                <span className="group/warn relative ml-0.5 inline-flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 fill-yellow-100 animate-pulse" />
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden w-max max-w-[240px] -translate-x-1/2 whitespace-normal rounded-lg bg-yellow-900 px-3 py-2 text-left text-[11px] font-semibold leading-snug text-white shadow-xl group-hover/warn:block"
                  >
                    {warningMessages[tab.id] || defaultWarning}
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-b-yellow-900" />
                  </span>
                </span>
              )}
              
              {/* Active Underline - Twilio Style with HARX Gradient */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-harx animate-in fade-in slide-in-from-bottom-1" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
