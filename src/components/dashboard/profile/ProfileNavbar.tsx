import React from 'react';
import { User, Zap, Briefcase, Globe, ClipboardCheck, Target, Clock } from 'lucide-react';

interface ProfileNavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const ProfileNavbar: React.FC<ProfileNavbarProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'experience', label: 'Experience', icon: Briefcase },
    { id: 'languages', label: 'Languages', icon: Globe },
    { id: 'skills', label: 'Skills', icon: Zap },
    { id: 'specialization', label: 'Specialization', icon: Target },
    { id: 'availability', label: 'Availability', icon: Clock },
  ];

  return (
    <div className="border-b border-gray-100 mb-8 overflow-x-auto scrollbar-hide">
      <nav className="flex items-center">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
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
