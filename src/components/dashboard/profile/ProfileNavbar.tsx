import React from 'react';
import { useTranslation } from 'react-i18next';
import { User, Zap, Briefcase, Globe, Target, Clock, AlertTriangle } from 'lucide-react';

interface ProfileNavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  /** Tab ids that should display a warning badge (e.g. unverified languages). */
  warningTabs?: string[];
  /** Optional per-tab tooltip message shown on hover of the warning badge. */
  warningMessages?: Record<string, string>;
}

export const ProfileNavbar: React.FC<ProfileNavbarProps> = ({ activeTab, onTabChange, warningTabs = [], warningMessages = {} }) => {
  const { t } = useTranslation();
  const defaultWarning = t('profile.nav.actionRequired');
  const tabs = [
    { id: 'profile', label: t('profile.nav.profile'), icon: User },
    { id: 'experience', label: t('profile.nav.experience'), icon: Briefcase },
    { id: 'specialization', label: t('profile.nav.specialization'), icon: Target },
    { id: 'languages', label: t('profile.nav.languages'), icon: Globe },
    { id: 'skills', label: t('profile.nav.skills'), icon: Zap },
    { id: 'availability', label: t('profile.nav.availability'), icon: Clock },
  ];

  return (
    <div className="mb-8 overflow-x-auto scrollbar-hide md:overflow-visible py-2">
      <nav className="inline-flex items-center gap-1 rounded-2xl bg-white p-1.5 shadow-md shadow-slate-200/70 ring-1 ring-slate-100">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const hasWarning = warningTabs.includes(tab.id);
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all whitespace-nowrap
                ${isActive 
                  ? 'bg-gradient-harx text-white shadow-md shadow-harx-500/30' 
                  : 'text-gray-500 hover:bg-slate-50 hover:text-gray-800'}
              `}
            >
              <tab.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
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
            </button>
          );
        })}
      </nav>
    </div>
  );
};
