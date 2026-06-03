import React from 'react';
import { User, ShieldCheck, Briefcase, Globe, Clock, Save, RefreshCw, Target } from 'lucide-react';

interface EditNavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSave: () => void;
  loading: boolean;
  uploadingPhoto: boolean;
  uploadingVideo: boolean;
}

export const EditNavbar: React.FC<EditNavbarProps> = ({ 
  activeTab, 
  onTabChange, 
  onSave, 
  loading, 
  uploadingPhoto, 
  uploadingVideo 
}) => {
  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'specialization', label: 'Specialization', icon: Target },
    { id: 'skills', label: 'Skills', icon: ShieldCheck },
    { id: 'experience', label: 'Experience', icon: Briefcase },
    { id: 'languages', label: 'Languages', icon: Globe },
    { id: 'availability', label: 'Availability', icon: Clock },
  ];

  return (
    <div className="flex items-center border-b border-gray-100 mb-8 overflow-x-auto scrollbar-hide">
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
            <span className="tracking-tight">{tab.label}</span>
            
            {/* Active Underline - Twilio Style with HARX Gradient */}
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-harx animate-in fade-in slide-in-from-bottom-1" />
            )}
          </button>
        );
      })}
      <button
        onClick={onSave}
        disabled={loading || uploadingPhoto || uploadingVideo}
        className="ml-auto px-8 py-3 rounded-2xl bg-gradient-harx text-white hover:opacity-90 hover:shadow-2xl hover:shadow-harx-500/20 font-black uppercase tracking-widest text-[11px] transition-all flex items-center gap-2 disabled:opacity-50 group shadow-lg"
      >
        {loading || uploadingPhoto || uploadingVideo ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            {uploadingVideo ? 'Syncing Video...' : uploadingPhoto ? 'Syncing Photo...' : 'Finalizing...'}
          </>
        ) : (
          <>
            <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
            Apply All Changes
          </>
        )}
      </button>
    </div>
  );
};
