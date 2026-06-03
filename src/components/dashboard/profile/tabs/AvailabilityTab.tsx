import React, { useMemo, useState } from 'react';
import { Clock, CheckCircle, AlertTriangle, RefreshCw, ChevronRight, Pencil } from 'lucide-react';

interface AvailabilityTabProps {
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

export const AvailabilityTab: React.FC<AvailabilityTabProps> = ({
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

      {/* Verification & Alerts Section */}
      <div className="bg-harx-50/30 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-harx-100/70">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-gradient-harx rounded-xl text-white">
            <Clock className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-black text-harx-900 tracking-tight">Availability & Schedule</h2>
          <button
            type="button"
            onClick={() => {
              if (!isEditingAvailability) resetAvailabilityDraft();
              setIsEditingAvailability((p) => !p);
            }}
            className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-harx-50 text-harx-700 border border-harx-100 text-xs font-black uppercase tracking-widest hover:bg-harx-100 transition-all"
          >
            <Pencil className="w-3.5 h-3.5" />
            {isEditingAvailability ? 'Close' : 'Edit'}
          </button>
          {isEditingAvailability && (
            <button
              type="button"
              onClick={() => void saveAvailability()}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-harx text-white text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all"
            >
              Save
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Selected Timezone</h3>
            <div className="p-5 bg-slate-200/40 rounded-2xl border border-slate-200/30">
              {isEditingAvailability ? (
                <select
                  value={editingTimezoneId}
                  onChange={(e) => setEditingTimezoneId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-harx-200"
                >
                  <option value="">Select timezone...</option>
                  {(allTimezones || []).map((tz: any) => (
                    <option key={tz._id} value={tz._id}>
                      {repWizardApi.formatTimezone(tz)}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-sm font-bold text-slate-700">
                  {timezoneData
                    ? repWizardApi.formatTimezone(timezoneData)
                    : typeof profile.availability?.timeZone === 'string'
                      ? profile.availability.timeZone
                      : 'Not configured'}
                </span>
              )}
            </div>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Weekly Schedule</h3>
            <div className="space-y-2">
              {days.map((day) => {
                const daySchedule = profile.availability?.schedule?.find((s: any) => s.day === day);
                const row = editingSchedule.find((r) => r.day === day);
                return (
                  <div key={day} className="flex items-center justify-between px-4 py-2 bg-slate-200/40 rounded-xl border border-slate-200/30">
                    <span className="text-xs font-bold text-slate-600">{day}</span>
                    {isEditingAvailability && row ? (
                      <div className="flex items-center gap-2">
                        <label className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                          <input
                            type="checkbox"
                            checked={row.enabled}
                            onChange={(e) =>
                              setEditingSchedule((prev) =>
                                prev.map((r) => (r.day === day ? { ...r, enabled: e.target.checked } : r))
                              )
                            }
                          />
                          On
                        </label>
                        <input
                          type="time"
                          value={row.start}
                          disabled={!row.enabled}
                          onChange={(e) =>
                            setEditingSchedule((prev) =>
                              prev.map((r) => (r.day === day ? { ...r, start: e.target.value } : r))
                            )
                          }
                          className="rounded border border-slate-200 bg-white px-1.5 py-1 text-[10px] font-semibold text-slate-700"
                        />
                        <span className="text-[10px] font-bold text-slate-400">-</span>
                        <input
                          type="time"
                          value={row.end}
                          disabled={!row.enabled}
                          onChange={(e) =>
                            setEditingSchedule((prev) =>
                              prev.map((r) => (r.day === day ? { ...r, end: e.target.value } : r))
                            )
                          }
                          className="rounded border border-slate-200 bg-white px-1.5 py-1 text-[10px] font-semibold text-slate-700"
                        />
                      </div>
                    ) : (
                      <span className={`text-[10px] font-black uppercase ${daySchedule ? 'text-indigo-600' : 'text-slate-300 italic'}`}>
                        {daySchedule ? `${daySchedule.hours.start} - ${daySchedule.hours.end}` : 'Off'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
