import React from 'react';
import { Clock, Globe, RefreshCw, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { Timezone } from '../../../../../services/api/repWizard';

interface EditAvailabilityTabProps {
  profile: any;
  setProfile: (profile: any) => void;
  setModifiedSections: (modified: any) => void;
  updateSchedule: (newSchedule: any[]) => void;
  updateFlexibility: (newFlexibility: string[]) => void;
  
  // Timezone state
  timezoneSearchTerm: string;
  setTimezoneSearchTerm: (term: string) => void;
  isTimezoneDropdownOpen: boolean;
  setIsTimezoneDropdownOpen: (open: boolean) => void;
  filteredTimezones: Timezone[];
  selectedTimezoneIndex: number;
  setSelectedTimezoneIndex: (idx: number | ((p: number) => number)) => void;
  selectedCountry: string;
  timezones: Timezone[];
  countries: Timezone[];
  loadingTimezones: boolean;
  repWizardApi: any;
  getTimezoneMismatchInfo: () => any;
}

export const EditAvailabilityTab: React.FC<EditAvailabilityTabProps> = ({
  profile,
  setProfile,
  setModifiedSections,
  updateSchedule,
  updateFlexibility,
  timezoneSearchTerm,
  setTimezoneSearchTerm,
  isTimezoneDropdownOpen,
  setIsTimezoneDropdownOpen,
  filteredTimezones,
  selectedTimezoneIndex,
  setSelectedTimezoneIndex,
  selectedCountry,
  timezones,
  countries,
  loadingTimezones,
  repWizardApi,
  getTimezoneMismatchInfo
}) => {
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const mismatchInfo = getTimezoneMismatchInfo();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Timezone Selection Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Active Timezone</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5 italic">Synchronize your schedule globaly</p>
          </div>
        </div>

        <div className="relative max-w-2xl">
          <input
            type="text"
            value={timezoneSearchTerm}
            onChange={(e) => {
              setTimezoneSearchTerm(e.target.value);
              setIsTimezoneDropdownOpen(true);
              setSelectedTimezoneIndex(-1);
              if (e.target.value === '') {
                setProfile((prev: any) => ({ ...prev, availability: { ...prev.availability, timeZone: '' } }));
                setModifiedSections((prev: any) => ({ ...prev, availability: true }));
              }
            }}
            onFocus={() => setIsTimezoneDropdownOpen(true)}
            placeholder="Search for cities or offsets (e.g. Casablanca, UTC+1)..."
            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all"
          />
          <div className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300">
            {loadingTimezones ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Clock className="w-5 h-5" />}
          </div>

          {isTimezoneDropdownOpen && (
            <div className="absolute z-[60] w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl max-h-72 overflow-auto scrollbar-hide py-2">
              {/* Suggeted */}
              {selectedCountry && timezones.length > 0 && (
                <div className="px-5 py-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50/50 mb-2">
                  Recommended for {countries.find(c => c.countryCode === selectedCountry)?.countryName || selectedCountry}
                </div>
              )}
              
              {filteredTimezones.length > 0 ? (
                filteredTimezones.map((tz, index) => (
                  <button
                    key={tz._id}
                    type="button"
                    onClick={() => {
                      setProfile((prev: any) => ({ ...prev, availability: { ...prev.availability, timeZone: tz._id } }));
                      setModifiedSections((prev: any) => ({ ...prev, availability: true }));
                      setTimezoneSearchTerm(repWizardApi.formatTimezone(tz));
                      setIsTimezoneDropdownOpen(false);
                    }}
                    className={`w-full text-left px-5 py-3 transition-colors ${
                      index === selectedTimezoneIndex ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="text-sm font-black text-gray-900">{repWizardApi.formatTimezone(tz)}</div>
                    <div className="text-[10px] font-bold text-gray-400 mt-0.5">{tz.countryName}</div>
                  </button>
                ))
              ) : (
                <div className="px-5 py-4 text-xs font-bold text-gray-400 italic">No timezones found</div>
              )}
            </div>
          )}
        </div>

        {mismatchInfo && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-4">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
            <p className="text-xs font-bold text-amber-800 leading-relaxed">
              Your timezone belongs to <span className="underline">{mismatchInfo.timezoneCountry}</span>, but your profile country is <span className="underline">{mismatchInfo.selectedCountry}</span>.
            </p>
          </div>
        )}
      </div>

      {/* Schedule Configuration Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-black text-gray-900 tracking-tight mb-8">Weekly Work Schedule</h2>
        
        {/* Bulk Tool */}
        <div className="bg-gray-50 rounded-3xl p-8 mb-10 border border-gray-100">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 block">Quick Set for Weekdays</h3>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-4">
              <input type="time" defaultValue="09:00" id="bulkStart" className="px-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-bold shadow-sm outline-none" />
              <span className="text-xs font-black text-gray-300 uppercase">to</span>
              <input type="time" defaultValue="17:00" id="bulkEnd" className="px-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-bold shadow-sm outline-none" />
            </div>
            <button
              onClick={() => {
                const s = (document.getElementById('bulkStart') as HTMLInputElement)?.value || '09:00';
                const e = (document.getElementById('bulkEnd') as HTMLInputElement)?.value || '17:00';
                const currentScheduled = new Set(profile.availability.schedule.map((s: any) => s.day));
                const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
                const filtered = weekdays.filter(day => !currentScheduled.has(day));
                const news = [...profile.availability.schedule, ...filtered.map(day => ({ day, hours: { start: s, end: e } }))];
                updateSchedule(news);
              }}
              className="px-6 py-3.5 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-500 transition-all active:scale-95"
            >
              Apply to All Weekdays
            </button>
          </div>
        </div>

        {/* Individual Days */}
        <div className="space-y-4">
          {daysOfWeek.map((day) => {
            const daySchedule = profile.availability.schedule.find((s: any) => s.day === day);
            return (
              <div key={day} className={`p-4 rounded-[28px] border transition-all ${daySchedule ? 'bg-indigo-50 border-indigo-100 shadow-sm' : 'bg-gray-50/50 border-gray-100'}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${daySchedule ? 'bg-indigo-500 animate-pulse' : 'bg-gray-200 shadow-inner'}`}></div>
                    <span className={`text-sm font-black ${daySchedule ? 'text-indigo-900 uppercase tracking-widest' : 'text-gray-400'}`}>{day}</span>
                  </div>

                  {daySchedule ? (
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-indigo-100">
                        <span className="text-[10px] font-black text-indigo-300 uppercase">Start</span>
                        <input
                          type="time"
                          value={daySchedule.hours.start}
                          onChange={(e) => {
                            const news = profile.availability.schedule.map((s: any) => s.day === day ? { ...s, hours: { ...s.hours, start: e.target.value } } : s);
                            updateSchedule(news);
                          }}
                          className="bg-transparent text-sm font-bold text-indigo-700 outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-indigo-100">
                        <span className="text-[10px] font-black text-indigo-300 uppercase">End</span>
                        <input
                          type="time"
                          value={daySchedule.hours.end}
                          onChange={(e) => {
                            const news = profile.availability.schedule.map((s: any) => s.day === day ? { ...s, hours: { ...s.hours, end: e.target.value } } : s);
                            updateSchedule(news);
                          }}
                          className="bg-transparent text-sm font-bold text-indigo-700 outline-none"
                        />
                      </div>
                      <button
                        onClick={() => {
                          const news = profile.availability.schedule.filter((s: any) => s.day !== day);
                          updateSchedule(news);
                        }}
                        className="p-3 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        const s = (document.getElementById('bulkStart') as HTMLInputElement)?.value || '09:00';
                        const e = (document.getElementById('bulkEnd') as HTMLInputElement)?.value || '17:00';
                        updateSchedule([...profile.availability.schedule, { day, hours: { start: s, end: e } }]);
                      }}
                      className="px-6 py-2.5 bg-white text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-gray-100 shadow-sm hover:text-indigo-600 transition-all flex items-center gap-2"
                    >
                      <Plus className="w-3 h-3" />
                      Mark Working
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Flexibility Options Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-black text-gray-900 tracking-tight mb-8">Schedule Flexibility & Options</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            'Remote Work Available',
            'Flexible Hours',
            'Weekend Rotation',
            'Night Shift Available',
            'Split Shifts',
            'Part-Time Options',
            'Compressed Work Week',
            'Shift Swapping Allowed'
          ].map((option) => {
            const isSelected = profile.availability.flexibility.includes(option);
            return (
              <button
                key={option}
                onClick={() => {
                  const current = profile.availability.flexibility;
                  const news = isSelected ? current.filter((f: string) => f !== option) : [...current, option];
                  updateFlexibility(news);
                }}
                className={`
                  px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-left transition-all border
                  ${isSelected 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-200 translate-y-[-2px]' 
                    : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-white hover:border-harx-200 hover:text-gray-600'}
                `}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
