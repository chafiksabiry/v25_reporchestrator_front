import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PhoneOff,
  Volume2,
  MicOff,
  Mic,
  Headphones,
  UserRound,
  Mail,
  Phone,
  Briefcase,
  Building2,
  Clock,
  FileText,
} from 'lucide-react';
import StatusCard from './StatusCard';
import { useAgent } from '../../contexts/AgentContext';
import { TwilioCallService } from '../../services/twilioCallService';
import { useAudioVisualizer } from '../../hooks/useAudioVisualizer';
import { useLead } from '../../hooks/useLead';
import api from '../../../utils/client';
import { getAgentId } from '../../../utils/authUtils';

type LeadCallRow = {
  _id?: string;
  sid?: string;
  createdAt?: string;
  startTime?: string;
  duration?: number;
  status?: string;
  leadId?: string | { _id?: string; $oid?: string };
  lead?: { _id?: string; id?: string };
};

function resolveLeadIdFromCall(call: LeadCallRow): string {
  const raw = call.leadId || call.lead?._id || call.lead?.id;
  if (!raw) return '';
  if (typeof raw === 'object') return String((raw as any)._id || (raw as any).$oid || '');
  return String(raw);
}

function formatCallWhen(iso?: string, locale = 'fr'): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(seconds?: number): string {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

const TopStatusBar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { state, dispatch } = useAgent();

  useAudioVisualizer(state.mediaStream);

  const searchParams = new URLSearchParams(window.location.search);
  const leadId = searchParams.get('leadId') || sessionStorage.getItem('activeLeadId');
  const { lead, loading: leadLoading } = useLead(leadId);

  const [callExpanded, setCallExpanded] = useState(false);
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [leadCalls, setLeadCalls] = useState<LeadCallRow[]>([]);
  const [leadCallsLoading, setLeadCallsLoading] = useState(false);

  const prospectName = useMemo(() => {
    if (!lead) return '';
    return (
      lead.name ||
      lead.Deal_Name ||
      [lead.First_Name, lead.Last_Name].filter(Boolean).join(' ').trim() ||
      t('workspace.prospectProfile.unknown')
    );
  }, [lead, t]);

  const prospectEmail = lead?.email || lead?.Email_1 || '';
  const prospectPhone = lead?.phone || lead?.Phone || '';
  const prospectCompany =
    (typeof lead?.company === 'string' ? lead.company : '') ||
    lead?.companyId ||
    lead?.Company ||
    '';
  const prospectStage = lead?.Stage || lead?.status || lead?.Pipeline || '';
  const prospectNotes = lead?.notes || lead?.Description || lead?.Activity_Tag || '';
  const prospectGigTitle =
    (typeof lead?.gigId === 'object' && lead?.gigId?.title) || '';

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!leadId) {
        setLeadCalls([]);
        return;
      }
      const agentId = getAgentId();
      if (!agentId) return;
      setLeadCallsLoading(true);
      try {
        const response = await api.calls.getByAgentId(agentId);
        if (cancelled) return;
        const rows = response?.success && Array.isArray(response.data) ? response.data : [];
        const filtered = rows
          .filter((c: LeadCallRow) => resolveLeadIdFromCall(c) === String(leadId))
          .sort((a: LeadCallRow, b: LeadCallRow) => {
            const ta = new Date(a.createdAt || a.startTime || 0).getTime();
            const tb = new Date(b.createdAt || b.startTime || 0).getTime();
            return tb - ta;
          })
          .slice(0, 8);
        setLeadCalls(filtered);
      } catch {
        if (!cancelled) setLeadCalls([]);
      } finally {
        if (!cancelled) setLeadCallsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  const handleToggleMic = () => {
    dispatch({ type: 'TOGGLE_MIC' });
  };

  const handleToggleSpeaker = () => {
    dispatch({ type: 'TOGGLE_OUTPUT_MODE' });
  };

  const handleToggleRecording = async () => {
    const { sid, isRecording } = state.callState;
    const userId = localStorage.getItem('agentId') || '';

    if (!sid) {
      console.error('No active call SID found for recording toggle');
      return;
    }

    try {
      if (isRecording) {
        await TwilioCallService.stopRecording(sid, userId);
        dispatch({ type: 'UPDATE_CALL_STATE', callState: { isRecording: false } });
      } else {
        await TwilioCallService.startRecording(sid, userId);
        dispatch({ type: 'UPDATE_CALL_STATE', callState: { isRecording: true } });
      }
    } catch (error) {
      console.error('Failed to toggle recording:', error);
    }
  };

  return (
    <div className="w-full max-w-[1800px] mx-auto px-2 py-2">
      <div className="grid grid-cols-4 gap-3 min-h-[110px]">
        {/* CALL CARD */}
        <StatusCard
          icon={<PhoneOff size={20} className={state.callState.isActive ? 'text-white' : 'text-emerald-500'} />}
          title="Call Status"
          value={
            state.callState.isActive ? (
              <span className="text-white font-black animate-pulse">ACTIVE CALL</span>
            ) : (
              <span className="text-white/60 font-bold uppercase tracking-widest text-xs">Waiting...</span>
            )
          }
          status="info"
          className={
            state.callState.isActive
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600 border-none shadow-lg shadow-emerald-500/20'
              : 'bg-white border-gray-100'
          }
          iconClassName={state.callState.isActive ? 'bg-white/20 border-white/30' : 'bg-emerald-50 border-emerald-100'}
          expandable
          expanded={callExpanded}
          onToggle={() => setCallExpanded((e) => !e)}
        />

        {/* RECORDING CARD */}
        <div className="relative group">
          <StatusCard
            icon={<Mic size={20} className={state.callState.isRecording ? 'text-white' : 'text-rose-500'} />}
            title="Recording"
            value={
              state.callState.isRecording ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-black animate-pulse">LIVE REC</span>
                    {state.callState.isActive && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleRecording();
                        }}
                        className="px-2 py-0.5 bg-white/20 text-white rounded-lg text-[8px] font-black uppercase tracking-widest border border-white/30 hover:bg-white/40 transition-all"
                      >
                        Stop
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex gap-1">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="w-1 h-3 bg-white/40 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.1}s` }}
                        />
                      ))}
                    </div>
                    <span className="text-[8px] font-bold text-white/60 uppercase tracking-widest">Capturing...</span>
                  </div>
                </div>
              ) : state.callState.recordingUrl ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(state.callState.recordingUrl!, '_blank');
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20 transition-all flex items-center gap-1.5"
                >
                  <Headphones size={12} />
                  <span>Play</span>
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Stopped</span>
                    {state.callState.isActive && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleRecording();
                        }}
                        className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-lg text-[8px] font-black uppercase tracking-widest border border-gray-200 hover:bg-gray-200 transition-all"
                      >
                        Start
                      </button>
                    )}
                  </div>
                </div>
              )
            }
            className={
              state.callState.isRecording
                ? 'bg-gradient-to-br from-red-600 to-rose-700 border-none shadow-lg shadow-red-500/30'
                : 'bg-white border-gray-100'
            }
            iconClassName={
              state.callState.isRecording ? 'bg-white/20 border-white/30' : 'bg-rose-50 border-rose-100'
            }
          />
        </div>

        {/* PROSPECT PROFILE CARD */}
        <StatusCard
          icon={<UserRound size={20} className="text-violet-500" />}
          title={t('workspace.prospectProfile.title')}
          value={
            leadLoading ? (
              <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                {t('workspace.prospectProfile.loading')}
              </span>
            ) : lead ? (
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-gray-900 font-bold text-sm uppercase truncate">{prospectName}</span>
                <span className="text-violet-500/80 text-[9px] font-bold uppercase tracking-widest truncate">
                  {prospectCompany || prospectGigTitle || t('workspace.prospectProfile.consultHint')}
                </span>
              </div>
            ) : (
              <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                {t('workspace.prospectProfile.noLead')}
              </span>
            )
          }
          expandable={Boolean(lead)}
          expanded={profileExpanded}
          onToggle={() => lead && setProfileExpanded((e) => !e)}
          className={
            lead
              ? 'bg-white border-violet-100 hover:border-violet-200 cursor-pointer'
              : 'bg-gray-50 border-gray-100'
          }
          iconClassName={lead ? 'bg-violet-50 border-violet-100' : 'bg-gray-100 border-gray-200'}
        />

        {/* AUDIO OUTPUT CARD */}
        <StatusCard
          icon={
            state.isSpeakerPhone ? (
              <Volume2 size={20} className="text-cyan-500" />
            ) : (
              <Headphones size={20} className="text-cyan-500" />
            )
          }
          title="Audio Output"
          value={
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-900 font-black text-xs uppercase">
                  {state.isSpeakerPhone ? 'Speaker' : 'Headset'}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleSpeaker();
                  }}
                  className="px-2 py-0.5 bg-cyan-50 text-cyan-600 rounded-lg text-[8px] font-black uppercase tracking-widest border border-cyan-100 hover:bg-cyan-100 transition-all"
                >
                  Switch
                </button>
              </div>
              <div className="w-full flex items-center" onClick={(e) => e.stopPropagation()}>
                <Volume2 size={12} className={state.volume === 0 ? 'text-gray-400 mr-2' : 'text-cyan-400 mr-2'} />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={state.volume}
                  onChange={(e) => dispatch({ type: 'UPDATE_VOLUME', volume: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>
            </div>
          }
          className="bg-white border-gray-100 hover:border-cyan-200"
          iconClassName="bg-cyan-50 border-cyan-100"
        />
      </div>

      {callExpanded && (
        <div className="bg-white/80 backdrop-blur-xl border border-gray-100 rounded-3xl mt-4 p-8 w-full max-w-[1800px] mx-auto shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-xl">
                <PhoneOff size={24} className="text-emerald-500" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Call Controls & Recording</h2>
            </div>
            <button
              className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-400 hover:text-gray-900"
              onClick={() => setCallExpanded(false)}
            >
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M18 12H6" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-3 gap-12">
            <div className="space-y-6">
              <div className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Audio Hardware</div>
              <div className="flex space-x-3">
                <button
                  className={`flex-1 p-4 rounded-3xl transition-all flex flex-col items-center gap-3 border-2 ${
                    state.isMicMuted
                      ? 'bg-rose-50 border-rose-100/50 text-rose-500'
                      : 'bg-emerald-50 border-emerald-100/50 text-emerald-600 hover:border-emerald-200 hover:bg-emerald-100/50'
                  }`}
                  onClick={handleToggleMic}
                >
                  <div className={`p-3 rounded-2xl ${state.isMicMuted ? 'bg-rose-100' : 'bg-emerald-100 shadow-sm'}`}>
                    {state.isMicMuted ? <MicOff size={24} /> : <Mic size={24} />}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {state.isMicMuted ? 'Muted' : 'Mic Active'}
                  </span>
                </button>
                <button
                  className={`flex-1 p-4 rounded-3xl transition-all flex flex-col items-center gap-3 border-2 ${
                    state.isSpeakerPhone
                      ? 'bg-cyan-50 border-cyan-100/50 text-cyan-600'
                      : 'bg-indigo-50 border-indigo-100/50 text-indigo-600 hover:border-indigo-200 hover:bg-indigo-100/50'
                  }`}
                  onClick={handleToggleSpeaker}
                >
                  <div
                    className={`p-3 rounded-2xl ${state.isSpeakerPhone ? 'bg-cyan-100' : 'bg-indigo-100 shadow-sm'}`}
                  >
                    {state.isSpeakerPhone ? <Volume2 size={24} /> : <Headphones size={24} />}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {state.isSpeakerPhone ? 'Speaker' : 'Headset'}
                  </span>
                </button>
              </div>
            </div>
            <div className="space-y-6">
              <div className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Live Connection</div>
              <div
                className={`h-[180px] rounded-[32px] flex flex-col items-center justify-center gap-5 border-2 border-dashed transition-all ${
                  state.callState.isActive ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100'
                }`}
              >
                <div
                  className={`p-5 rounded-3xl ${
                    state.callState.isActive
                      ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  <PhoneOff size={32} />
                </div>
                <span
                  className={`text-xs font-black uppercase tracking-[0.3em] ${
                    state.callState.isActive ? 'text-emerald-600' : 'text-gray-400'
                  }`}
                >
                  {state.callState.isActive ? 'Active Stream' : 'Offline'}
                </span>
              </div>
            </div>
            <div className="space-y-6">
              <div className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Data Capture</div>
              <div className="bg-gray-900 rounded-[32px] p-7 flex flex-col h-[180px] justify-between shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        state.callState.isRecording
                          ? 'bg-rose-500 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.6)]'
                          : 'bg-white/20'
                      }`}
                    />
                    <span className="text-[11px] font-black text-white/70 uppercase tracking-widest">
                      {state.callState.isRecording ? 'Capturing Audio' : 'Secure Vault'}
                    </span>
                  </div>
                  {state.callState.isActive && (
                    <button
                      onClick={handleToggleRecording}
                      className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all ${
                        state.callState.isRecording
                          ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                          : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                      }`}
                    >
                      {state.callState.isRecording ? 'Stop' : 'Start'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {profileExpanded && lead && (
        <div className="bg-white/90 backdrop-blur-xl border border-violet-100 rounded-3xl mt-4 p-6 sm:p-8 w-full max-w-[1800px] mx-auto shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-violet-500/25 shrink-0">
                {prospectName
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0])
                  .join('')
                  .toUpperCase() || '?'}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-500 mb-1">
                  {t('workspace.prospectProfile.title')}
                </p>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight truncate">{prospectName}</h2>
                <p className="text-xs font-semibold text-gray-500 mt-1">
                  {t('workspace.prospectProfile.prepareHint')}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="p-2.5 hover:bg-gray-100 rounded-xl transition-all text-gray-400 hover:text-gray-900 border border-gray-100 shrink-0"
              onClick={() => setProfileExpanded(false)}
              aria-label="Close"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Fiche */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-violet-50 rounded-xl">
                  <FileText size={16} className="text-violet-500" />
                </div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-600">
                  {t('workspace.prospectProfile.sheet')}
                </h3>
              </div>
              <dl className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <dt className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                      {t('workspace.prospectProfile.email')}
                    </dt>
                    <dd className="font-bold text-gray-800 break-all">{prospectEmail || '—'}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <dt className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                      {t('workspace.prospectProfile.phone')}
                    </dt>
                    <dd className="font-bold text-gray-800">{prospectPhone || '—'}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Building2 className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <dt className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                      {t('workspace.prospectProfile.company')}
                    </dt>
                    <dd className="font-bold text-gray-800">{prospectCompany || '—'}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Briefcase className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <dt className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                      {t('workspace.prospectProfile.gig')}
                    </dt>
                    <dd className="font-bold text-gray-800">{prospectGigTitle || '—'}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <UserRound className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <dt className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                      {t('workspace.prospectProfile.stage')}
                    </dt>
                    <dd className="font-bold text-gray-800">{prospectStage || '—'}</dd>
                  </div>
                </div>
                {prospectNotes ? (
                  <div className="pt-2 border-t border-gray-200/80">
                    <dt className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">
                      {t('workspace.prospectProfile.notes')}
                    </dt>
                    <dd className="text-xs font-medium text-gray-600 leading-relaxed whitespace-pre-wrap">
                      {String(prospectNotes)}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>

            {/* Historique */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-amber-50 rounded-xl">
                  <Clock size={16} className="text-amber-500" />
                </div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-600">
                  {t('workspace.prospectProfile.history')}
                </h3>
              </div>

              {leadCallsLoading ? (
                <p className="text-xs font-semibold text-gray-400 py-6 text-center">
                  {t('workspace.prospectProfile.loadingHistory')}
                </p>
              ) : leadCalls.length === 0 ? (
                <p className="text-xs font-semibold text-gray-400 py-6 text-center">
                  {t('workspace.prospectProfile.noHistory')}
                </p>
              ) : (
                <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {leadCalls.map((call) => (
                    <li
                      key={String(call._id || call.sid)}
                      className="flex items-center justify-between gap-3 rounded-xl bg-white border border-gray-100 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-gray-800 uppercase tracking-wide truncate">
                          {formatCallWhen(call.createdAt || call.startTime, i18n.language)}
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                          {call.status || 'call'} · {formatDuration(call.duration)}
                        </p>
                      </div>
                      <Phone className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopStatusBar;
