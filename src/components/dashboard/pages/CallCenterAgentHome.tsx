import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Phone, Monitor, Lock, ArrowRight, Headset } from 'lucide-react';

type Props = {
  displayName?: string;
};

/**
 * Dedicated home for call-center staff agents — ops console, not marketplace dashboard.
 */
export function CallCenterAgentHome({ displayName }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mustChange =
    typeof window !== 'undefined' && localStorage.getItem('mustChangePassword') === '1';
  const name = displayName || 'Agent';

  return (
    <div className="min-h-full bg-slate-50 -m-4 sm:-m-6 p-4 sm:p-8 animate-in fade-in duration-500">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-800">
            <Headset className="h-3.5 w-3.5" />
            {t('dashboard.ccAgent.badge', 'Call center agent')}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
            {t('dashboard.ccAgent.greeting', { name, defaultValue: `Welcome, ${name}` })}
          </h1>
          <p className="max-w-xl text-sm font-medium text-slate-500 leading-relaxed">
            {t(
              'dashboard.ccAgent.subtitle',
              'Your employer assigned this account. Open Workspace to handle calls — no marketplace or wallet.'
            )}
          </p>
        </header>

        {mustChange ? (
          <button
            type="button"
            onClick={() => navigate('/account-settings?changePassword=1')}
            className="w-full flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-left hover:bg-amber-100/80 transition-colors"
          >
            <Lock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-amber-950">
                {t('dashboard.ccAgent.passwordTitle', 'Change your temporary password')}
              </p>
              <p className="text-xs font-medium text-amber-800/80 mt-1">
                {t(
                  'dashboard.ccAgent.passwordBody',
                  'Your account was created with a temporary password. Set a personal one before continuing.'
                )}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-amber-700 shrink-0 mt-1" />
          </button>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => navigate('/workspace?tab=voice')}
            className="group rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm hover:border-emerald-300 hover:shadow-md transition-all"
          >
            <div className="h-11 w-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/25 group-hover:scale-105 transition-transform">
              <Monitor className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-black text-slate-900">
              {t('dashboard.ccAgent.workspaceTitle', 'Workspace')}
            </h2>
            <p className="mt-1.5 text-sm text-slate-500 font-medium leading-relaxed">
              {t(
                'dashboard.ccAgent.workspaceBody',
                'Leads, live dialing, call history and copilot for your assigned projects.'
              )}
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-700">
              {t('dashboard.ccAgent.open', 'Open')}
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/workspace?tab=calls')}
            className="group rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm hover:border-teal-300 hover:shadow-md transition-all"
          >
            <div className="h-11 w-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/20 group-hover:scale-105 transition-transform">
              <Phone className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-black text-slate-900">
              {t('dashboard.ccAgent.callsTitle', 'Call history')}
            </h2>
            <p className="mt-1.5 text-sm text-slate-500 font-medium leading-relaxed">
              {t(
                'dashboard.ccAgent.callsBody',
                'Review recent calls and outcomes for your call-center assignments.'
              )}
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-700">
              {t('dashboard.ccAgent.open', 'Open')}
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
