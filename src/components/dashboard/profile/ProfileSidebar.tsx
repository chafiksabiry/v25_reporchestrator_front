import React from 'react';
import {
  MapPin, Mail, Phone, CreditCard, Clock, Target, CheckCircle, RefreshCw, Edit
} from 'lucide-react';
import { Timezone } from '../../services/api/repWizard';

interface ProfileSidebarProps {
  profile: any;
  countryData: Timezone | null;
  countryMismatch: any;
  checkingCountryMismatch: boolean;
  showLoadingSpinner: boolean;
  planData: any;
  planError: string | null;
  overallScore: string | number;
  lastUpdated: string;
  handlePublish: () => Promise<void>;
  isPublishing: boolean;
  onEditClick: () => void;
  setShowImageModal: (show: boolean) => void;
}

export const ProfileSidebar: React.FC<ProfileSidebarProps> = ({
  profile,
  countryData,
  countryMismatch,
  checkingCountryMismatch,
  showLoadingSpinner,
  planData,
  planError,
  overallScore,
  lastUpdated,
  handlePublish,
  isPublishing,
  onEditClick,
  setShowImageModal
}) => {
  return (
    <div className="space-y-6">
      {/* Action Buttons (Moved here for better accessibility) */}
      <div className="flex flex-col gap-3">
        {profile.status !== 'completed' && (
          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="w-full px-5 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 flex items-center justify-center gap-2 text-sm font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50"
          >
            {isPublishing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            {isPublishing ? 'Publishing...' : 'Publish Profile'}
          </button>
        )}
        <button
          onClick={onEditClick}
          className="w-full px-5 py-3 rounded-xl bg-gradient-harx text-white hover:opacity-90 flex items-center justify-center gap-2 text-sm font-bold transition-all shadow-md shadow-harx-500/20 hover:shadow-lg hover:shadow-harx-500/30 hover:-translate-y-0.5"
        >
          <Edit className="w-4 h-4" />
          Edit Profile
        </button>
      </div>

      {/* Profile Header */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-harx-100/40 to-transparent opacity-60"></div>
        <div className="text-center relative z-10">
          <div className="mb-6 mt-4">
            <div
              className="w-32 h-32 rounded-full mx-auto shadow-xl border-4 border-white bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden relative group cursor-pointer ring-4 ring-harx-50"
              title="Click to view photo"
              onClick={() => profile.personalInfo?.photo?.url && setShowImageModal(true)}
            >
              {profile.personalInfo?.photo?.url ? (
                <>
                  <img
                    src={profile.personalInfo.photo.url}
                    alt={profile.personalInfo?.name || 'Profile'}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="text-white text-xs font-bold bg-white/20 px-3 py-1.5 rounded-full">View</div>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-black text-harx-300 bg-gradient-to-br from-harx-50 to-white">
                  {profile.personalInfo?.name?.charAt(0) || '?'}
                </div>
              )}
            </div>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-1 tracking-tight">{profile.personalInfo?.name}</h1>
          <p className="text-xs font-bold text-harx-500 uppercase tracking-wider mb-5">{profile.professionalSummary?.currentRole || 'Representative'}</p>
          <div className="flex items-center justify-center gap-2 text-gray-500 mb-5 font-medium bg-gray-50/80 inline-flex flex-row py-2 px-4 rounded-full border border-gray-100 mx-auto text-sm">
            <MapPin className="w-4 h-4 text-harx-400" />
            <span>{countryData?.countryName || 'Country not specified'}</span>
          </div>

          <div className="flex items-center justify-center gap-3">
            {profile.personalInfo?.email && (
              <a href={`mailto:${profile.personalInfo.email}`} className="p-2.5 rounded-xl bg-gray-50 text-gray-500 hover:text-harx-500 hover:bg-harx-50 transition-all shadow-sm border border-gray-100 hover:border-harx-100">
                <Mail className="w-5 h-5" />
              </a>
            )}
            {profile.personalInfo?.phone && (
              <a href={`tel:${profile.personalInfo.phone}`} className="p-2.5 rounded-xl bg-gray-50 text-gray-500 hover:text-harx-500 hover:bg-harx-50 transition-all shadow-sm border border-gray-100 hover:border-harx-100">
                <Phone className="w-5 h-5" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Subscription Plan Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-500">
            <CreditCard className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Plan</h2>
        </div>
        {planError ? (
          <div className="text-red-600 text-xs mb-2">{planError}</div>
        ) : planData && Object.keys(planData.plan).length > 0 ? (
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50/50 rounded-2xl p-4 border border-indigo-100/50 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-black text-indigo-900 tracking-tight">
                  {planData.plan.name}
                </h3>
              </div>
              <div className="text-2xl font-black text-indigo-600 mb-2">
                ${planData.plan.price}<span className="text-xs font-bold text-indigo-400 uppercase">/mo</span>
              </div>
              <div className="text-xs font-medium text-indigo-800/70">
                Type: <span className="text-indigo-900 font-bold">{planData.plan.targetUserType}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 px-4 bg-gray-50 rounded-2xl border border-gray-200 border-dashed">
            <p className="text-xs text-gray-500 font-medium">No active plan</p>
          </div>
        )}
      </div>

      {/* Overall Score Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-blue-50 rounded-xl text-blue-500">
            <Target className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">REPS Score</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-6 bg-gradient-to-b from-gray-50 to-white rounded-2xl border border-gray-100/50 mb-4">
          <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500 tracking-tighter shadow-sm">
            {overallScore}
          </div>
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">out of 100</div>
        </div>
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center pt-4 border-t border-gray-100">
          Last updated: {lastUpdated}
        </div>
      </div>
    </div>
  );
};
