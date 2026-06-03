import React, { useMemo, useState } from 'react';
import { Clock, CheckCircle, AlertTriangle, RefreshCw, ChevronRight, Pencil } from 'lucide-react';

interface OnboardingTabProps {
  profile: any;
  countryMismatch: any;
  checkingCountryMismatch: boolean;
  showLoadingSpinner: boolean;
  timezoneData: any;
  allTimezones: any[];
  getTimezoneMismatchInfo: () => any;
  repWizardApi: any;
  onSaveAvailability: (payload: { timeZone?: string; schedule: Array<{ day: string; hours: { start: string; end: string } }> }) => Promise<void> | void;
}

export const OnboardingTab: React.FC<OnboardingTabProps> = ({
  profile,
  countryMismatch,
  checkingCountryMismatch,
  showLoadingSpinner,
  timezoneData,
  allTimezones,
  getTimezoneMismatchInfo,
  repWizardApi,
  onSaveAvailability
}) => {
  const onboardingPhases = [1, 2, 3, 4];
  const timezoneMismatch = getTimezoneMismatchInfo();
  const [isEditingAvailability, setIsEditingAvailability] = useState(false);
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const existingSchedule = Array.isArray(profile.availability?.schedule) ? profile.availability.schedule : [];
  const defaultSchedule = useMemo(
    () =>
      days.map((day) => {
        const row = existingSchedule.find((s: any) => s.day === day);
        return {
          day,
          enabled: !!row,
          start: row?.hours?.start || '09:00',
          end: row?.hours?.end || '17:00',
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile.availability?.schedule]
  );
  const [editingSchedule, setEditingSchedule] = useState(defaultSchedule);
  const [editingTimezoneId, setEditingTimezoneId] = useState(
    typeof profile.availability?.timeZone === 'object'
      ? String(profile.availability?.timeZone?._id || '')
      : String(profile.availability?.timeZone || '')
  );

  const resetAvailabilityDraft = () => {
    setEditingSchedule(defaultSchedule);
    setEditingTimezoneId(
      typeof profile.availability?.timeZone === 'object'
        ? String(profile.availability?.timeZone?._id || '')
        : String(profile.availability?.timeZone || '')
    );
  };

  const saveAvailability = async () => {
    const schedule = editingSchedule
      .filter((r) => r.enabled)
      .map((r) => ({ day: r.day, hours: { start: r.start, end: r.end } }));
    await onSaveAvailability({
      timeZone: editingTimezoneId || undefined,
      schedule,
    });
    setIsEditingAvailability(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Verification & Alerts Section */}
      {(countryMismatch?.hasMismatch || checkingCountryMismatch || timezoneMismatch) && (
        <div className="bg-harx-50/30 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-harx-100/70">
          <h2 className="text-xl font-black text-harx-900 tracking-tight mb-5">Verification Notices</h2>
          
          <div className="space-y-4">
            {/* Country Mismatch */}
            {countryMismatch?.hasMismatch && (
              <div className="p-5 bg-rose-50/50 border border-rose-100/50 rounded-2xl flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-rose-500 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-black text-rose-800 text-sm uppercase tracking-wide">Location Mismatch</h4>
                  <p className="text-sm text-rose-700 mt-1 leading-relaxed">
                    Account registered from <span className="font-bold underline">{countryMismatch.firstLoginCountry}</span>, but your profile specifies <span className="font-bold underline">{countryMismatch.selectedCountry}</span>.
                  </p>
                </div>
              </div>
            )}

            {/* Timezone Mismatch */}
            {timezoneMismatch && (
              <div className="p-5 bg-amber-50/50 border border-amber-100/50 rounded-2xl flex items-start gap-4">
                <Clock className="w-6 h-6 text-amber-500 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-black text-amber-800 text-sm uppercase tracking-wide">Timezone Synchronization</h4>
                  <p className="text-sm text-amber-700 mt-1 leading-relaxed">
                    Your working timezone (<span className="font-bold">{timezoneMismatch.timezoneName}</span>) belongs to <span className="font-bold">{timezoneMismatch.timezoneCountry}</span>, while your profile country is <span className="font-bold">{timezoneMismatch.selectedCountry}</span>.
                  </p>
                </div>
              </div>
            )}

            {/* Validation Loading */}
            {checkingCountryMismatch && showLoadingSpinner && (
              <div className="flex items-center gap-3 p-5 bg-indigo-50/50 border border-indigo-100/50 rounded-2xl">
                <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
                <span className="text-sm font-bold text-indigo-700">Verifying location data...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detailed Onboarding Progress */}
      <div className="bg-harx-alt-50/25 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-harx-alt-100/70">
        <h2 className="text-xl font-black text-harx-alt-900 tracking-tight mb-6">Onboarding Progress</h2>
        <div className="space-y-4">
          {onboardingPhases.map((phaseNum) => {
            const phaseKey = `phase${phaseNum}`;
            const status = profile.onboardingProgress?.phases?.[phaseKey]?.status || 'pending';
            const isCompleted = status === 'completed';
            const isCurrent = status === 'in_progress';

            return (
              <div key={phaseNum} className={`
                flex items-center gap-5 p-5 rounded-3xl border transition-all
                ${isCompleted ? 'bg-emerald-50/20 border-emerald-100/50' : 
                  isCurrent ? 'bg-indigo-50/40 border-indigo-200/50 shadow-sm scale-[1.02]' : 
                  'bg-slate-200/40 border-slate-200/30 opacity-60'}
              `}>
                <div className={`
                  w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shadow-inner
                  ${isCompleted ? 'bg-emerald-500 text-white' : 
                    isCurrent ? 'bg-indigo-600 text-white animate-pulse' : 
                    'bg-slate-50 text-slate-400 border border-slate-200'}
                `}>
                  {isCompleted ? <CheckCircle className="w-6 h-6" /> : phaseNum}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900 uppercase">Phase {phaseNum}</span>
                    <span className={`
                      text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter
                      ${isCompleted ? 'bg-emerald-100/80 text-emerald-700' : 'bg-slate-200 text-slate-600'}
                    `}>
                      {status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-slate-500 mt-1">
                    {isCompleted ? 'Steps successfully verified' : 'Requires additional information'}
                  </div>
                </div>
                
                {isCurrent && (
                  <button 
                    onClick={() => window.location.href = '/reporchestrator'}
                    className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}

              </div>
            );
          })}
        </div>
      </div>

      {/* Working Hours & Availability */}
    </div>
  );
};
