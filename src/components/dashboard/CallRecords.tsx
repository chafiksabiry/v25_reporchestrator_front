import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  Phone,
  Calendar,
  Brain,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  X,
  Check,
  BadgeCheck,
  MessageSquare,
  Star,
  Globe,
  TrendingUp,
  Activity as ActivityIcon,
  BookOpen,
  Clock,
  CreditCard,
} from 'lucide-react';
import api from '../../utils/client';
import {
  hasValidatedTransactionSale,
  resolveCallRepCommission,
  resolveTransactionRepCommission,
} from '../../utils/commissionUtils';
import { PremiumAudioPlayer } from './PremiumAudioPlayer';

export interface CallRecord {
  repTransactionCommission: undefined;
  repCallCommission?: number;
  _id: string;
  call_id?: string;
  agent: string;
  lead?: Lead;
  sid?: string;
  parentCallSid?: string | null;
  direction: 'inbound' | 'outbound-dial';
  provider?: 'twilio';
  startTime: Date;
  endTime?: Date | null;
  status: string;
  duration: number;
  price?: number;
  recording_url?: string;
  recording_url_cloudinary?: string;
  quality_score?: number;
  transactionOccurred?: boolean | null;
  transaction?: {
    repTransactionCommission?: number;
    _id?: string;
    validByAI?: boolean;
    validByCompany?: boolean;
    validByReps?: boolean | null;
    updatedAt?: string;
    valid?: boolean | null;
  } | null;
  validByAI?: boolean | null;
  valid?: boolean | null;
  ai_refusal_reason?: string | null;
  argumentation_score?: number;
  // Each rubric carries: numeric `score`, free-text `feedback`, and a
  // server-persisted boolean `passed` (true when score ≥ 50) used to render
  // the Yes / No badge without re-thresholding on the client.
  ai_call_score?: {
    'Agent fluency': { score: number; feedback: string; passed?: boolean };
    'Sentiment analysis': { score: number; feedback: string; passed?: boolean };
    'Fraud detection': { score: number; feedback: string; passed?: boolean };
    'Script coherence': { score: number; feedback: string; passed?: boolean };
    'Argumentation': { score: number; feedback: string; passed?: boolean };
    'Script adherence'?: { score: number; feedback: string; passed?: boolean };
    'Transaction analysis'?: { score: number; feedback: string; passed?: boolean };
    overall: {
      feedback_fr: string | null | undefined;
      feedback_en: string | null | undefined; score: number; feedback: string; passed?: boolean 
};
    transaction_detected?: boolean;
    refusal_detected?: boolean;
  };
  // ── Unified call-analysis layer (shared with calls backend + ops dashboard) ──
  /** Lifecycle of the AI analyzer: pending → processing → scored | auto_refused | error. */
  ai_call_status?: 'pending' | 'processing' | 'scored' | 'auto_refused' | 'error' | null;
  /** Persisted summary (LLM). Falls back to ai_call_score.overall.feedback when absent. */
  ai_summary?: string | null;
  /** Disposition of the call (transaction, appointment, refusal, voicemail, ...). */
  callOutcome?:
    | 'transaction'
    | 'appointment'
    | 'callback_requested'
    | 'argued_interested'
    | 'refusal'
    | 'not_interested'
    | 'already_equipped'
    | 'voicemail'
    | 'no_answer'
    | 'busy'
    | 'wrong_number'
    | 'fraud'
    | 'too_short'
    | 'connected_no_sale'
    | null;
  callOutcomeSource?: 'ai' | 'rep' | 'system' | null;
  /** Denormalised flags. `flags.fraud` is the canonical fraud signal now. */
  flags?: {
    fraud?: boolean;
    serious?: boolean;
    transactionDetected?: boolean;
    refusalDetected?: boolean;
  };
  callbackAt?: string | Date | null;
  appointmentAt?: string | Date | null;
  agentValidation?: string;
  companyValidation?: string;
  childCalls?: string[];
  from?: string;
  to?: string;
  transcript?: {
    speaker: string;
    text: string;
    timestamp?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

type AiRubricMetricData = {
  score: number;
  feedback: string;
  passed?: boolean;
  feedback_en?: string;
  feedback_fr?: string;
};

function getAiRubricMetric(
  scores: CallRecord['ai_call_score'] | undefined,
  key: string
): AiRubricMetricData | undefined {
  if (!scores) return undefined;
  const raw = (scores as Record<string, unknown>)[key];
  if (!raw || typeof raw !== 'object' || !('score' in raw)) return undefined;
  return raw as AiRubricMetricData;
}

interface Lead {
  _id: string;
  name?: string;
  First_Name?: string;
  Last_Name?: string;
  company?: string;
  Deal_Name?: string;
  email?: string;
  Email_1?: string;
  phone?: string;
  Phone?: string;
  gigId?: {
    _id: string;
    title: string;
    commission?: {
      commission_per_call?: number;
      transactionCommission?: number;
    };
    rewardPerCall?: number;
    rewardPerSale?: number;
  };
  status?: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
  value?: number;
  probability?: number;
  source?: string;
  assignedTo?: string;
  lastContact?: Date;
  nextAction?: 'call' | 'email' | 'meeting' | 'follow-up';
  notes?: string;
  metadata?: {
    ai_analysis?: {
      score?: number;
      sentiment?: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

interface CallRecordsProps {
  gigId?: string;
  leadId?: string;
  callValidationFilter?: 'all' | 'approved' | 'pending';
  transactionValidationFilter?: 'all' | 'approved' | 'refused' | 'pending';
  /** Twilio CallSid of a call that should auto-open in the details modal
   *  as soon as it lands in the fetched records list. Used by Workspace
   *  to deep-link the rep into the AI-insights modal right after they
   *  hang up. */
  autoOpenSid?: string;
  /** Called once we've successfully opened the deep-linked modal so the
   *  parent can clear its `pendingOpenCallSid` state and avoid re-opening
   *  on subsequent renders. */
  onAutoOpenHandled?: () => void;
  /** Fired when one or more calls finish AI analysis (pending → settled).
   *  Used by the wallet page to refresh balances since a validated call/sale
   *  books new commissions server-side. */
  onAnalysisSettled?: () => void;
}

/** A `processing`/`pending` call older than this is considered stuck (worker
 *  hung or backend restarted mid-analysis). We stop the infinite spinner and
 *  let the user retry instead of waiting forever. Kept in sync with the
 *  backend's STALE_PROCESSING_MS. */
const STALE_ANALYSIS_MS = 5 * 60 * 1000;

/** Is the AI analyzer still running (or hasn't run yet) for this call? */
function isAnalysisPending(record: CallRecord): boolean {
  // Prefer the explicit lifecycle field when the backend has set it.
  if (record.ai_call_status) {
    return record.ai_call_status === 'pending' || record.ai_call_status === 'processing';
  }
  // Legacy fallback: pre-analyzer calls only had `validByAI == null`.
  return record.validByAI == null;
}

/** Has a pending analysis been stuck long enough that we should let the user
 *  retry rather than keep spinning? */
function isAnalysisStale(record: CallRecord): boolean {
  if (!isAnalysisPending(record)) return false;
  const ts = record.updatedAt ? new Date(record.updatedAt).getTime() : NaN;
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts > STALE_ANALYSIS_MS;
}

/** Map `callOutcome` to a short label + tone for the disposition pill. */
function callOutcomeBadge(
  outcome: CallRecord['callOutcome'] | undefined
): { label: string; tone: string } | null {
  if (!outcome) return null;
  const map: Record<string, { label: string; tone: string }> = {
    transaction:        { label: 'Transaction',  tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    appointment:        { label: 'RDV',          tone: 'bg-violet-50 text-violet-700 border-violet-200' },
    callback_requested: { label: 'Rappel',       tone: 'bg-amber-50 text-amber-700 border-amber-200' },
    argued_interested:  { label: 'Argumenté',    tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    refusal:            { label: 'Refus',        tone: 'bg-rose-50 text-rose-700 border-rose-200' },
    not_interested:     { label: 'Pas intéressé', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
    already_equipped:   { label: 'Déjà équipé',  tone: 'bg-blue-50 text-blue-700 border-blue-200' },
    voicemail:          { label: 'Messagerie',   tone: 'bg-slate-50 text-slate-600 border-slate-200' },
    no_answer:          { label: 'Non décroché', tone: 'bg-slate-50 text-slate-600 border-slate-200' },
    busy:               { label: 'Occupé',       tone: 'bg-slate-50 text-slate-600 border-slate-200' },
    wrong_number:       { label: 'Faux numéro',  tone: 'bg-rose-50 text-rose-700 border-rose-200' },
    fraud:              { label: 'Fraude',       tone: 'bg-rose-100 text-rose-800 border-rose-300' },
    too_short:          { label: 'Trop court',   tone: 'bg-slate-50 text-slate-500 border-slate-200' },
    connected_no_sale:  { label: 'Sans suite',   tone: 'bg-slate-50 text-slate-600 border-slate-200' },
  };
  return map[outcome] || null;
}

export function CallRecords({
  gigId,
  leadId,
  callValidationFilter = 'all',
  transactionValidationFilter = 'all',
  autoOpenSid,
  onAutoOpenHandled,
  onAnalysisSettled,
}: CallRecordsProps) {
  const { t, i18n } = useTranslation();
  const [callRecords, setCallRecords] = useState<CallRecord[]>([]);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'transcript' | 'insights'>('transcript');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyzingCallId, setAnalyzingCallId] = useState<string | null>(null);
  const fetchCallRecords = async (silent = false) => {
    try {
      const agentId = localStorage.getItem('agentId');
      if (!agentId) throw new Error('Agent ID not found');

      const response = await api.calls.getByAgentId(agentId);

      if (response && response.success && Array.isArray(response.data)) {
        setCallRecords(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch call records');
      }
      if (!silent) setLoading(false);
    } catch (err: any) {
      if (!silent) {
        setError(err.message || 'Failed to fetch call records');
        setLoading(false);
      }
    }
  };

  const handleAnalyzeCall = async (callId: string) => {
    try {
      setAnalyzingCallId(callId);
      const response = await api.calls.analyze(callId);

      // Auto-analysis may already be running after hangup — poll, don't error.
      if (response.inProgress) {
        console.info('ℹ️ AI analysis already in progress — waiting for results…');
        if (selectedCall && (selectedCall._id === callId || (selectedCall as any).$oid === callId)) {
          setSelectedCall({ ...selectedCall, ai_call_status: 'processing' });
        }
        await fetchCallRecords(true);
        return;
      }

      if (response.success) {
        if (selectedCall && (selectedCall._id === callId || (selectedCall as any).$oid === callId)) {
          const isFullDoc =
            response.data && typeof response.data === 'object' && '_id' in response.data;
          const patch: Partial<CallRecord> = isFullDoc
            ? (response.data as Partial<CallRecord>)
            : {
                ai_call_score: response.data,
                transcript: response.transcript || selectedCall.transcript,
                validByAI: response.validByAI,
                valid: response.validByAI,
                argumentation_score: response.data?.Argumentation?.score,
                ai_call_status: 'scored',
                callOutcome: response.callOutcome ?? selectedCall.callOutcome ?? null,
              };
          setSelectedCall({ ...selectedCall, ...patch });
        }
        fetchCallRecords();
        // A freshly validated call books commissions server-side — refresh wallet.
        if (response.validByAI === true || (response.data as any)?.validByAI === true) {
          onAnalysisSettled?.();
        }
      }
    } catch (error) {
      console.error('Error analyzing call:', error);
    } finally {
      setAnalyzingCallId(null);
    }
  };

  useEffect(() => {
    fetchCallRecords();
  }, [gigId, leadId]);
  const autoOpenHandledRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (!autoOpenSid) return;
    if (autoOpenHandledRef.current === autoOpenSid) return;

    fetchCallRecords(true);
    let attempts = 0;
    const tryOpen = () => {
      attempts += 1;
      const match = callRecords.find(
        (r) => r.sid === autoOpenSid || r._id === autoOpenSid
      );
      if (match) {
        autoOpenHandledRef.current = autoOpenSid;
        setSelectedCall(match);
        setActiveTab('insights');
        onAutoOpenHandled?.();
        return true;
      }
      return false;
    };

    if (tryOpen()) return;
    const interval = setInterval(async () => {
      await fetchCallRecords(true);
      if (tryOpen() || attempts >= 8) {
        clearInterval(interval);
        if (attempts >= 8) onAutoOpenHandled?.();
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [autoOpenSid]);
  useEffect(() => {
    if (!autoOpenSid) return;
    if (autoOpenHandledRef.current === autoOpenSid) return;
    const match = callRecords.find(
      (r) => r.sid === autoOpenSid || r._id === autoOpenSid
    );
    if (match) {
      autoOpenHandledRef.current = autoOpenSid;
      setSelectedCall(match);
      setActiveTab('insights');
      onAutoOpenHandled?.();
    }
  }, [callRecords, autoOpenSid, onAutoOpenHandled]);
  const hasPendingAnalyses = callRecords.some((r) => isAnalysisPending(r));

  useEffect(() => {
    if (!hasPendingAnalyses) return;
    const interval = setInterval(() => {
      fetchCallRecords(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [hasPendingAnalyses]);

  // Detect calls that just finished analysis (pending -> settled). When that
  // happens for a validated call, the backend books new commissions, so we
  // notify the parent (wallet) to refresh balances.
  const prevPendingIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const currentPending = new Set(
      callRecords.filter((r) => isAnalysisPending(r)).map((r) => r._id)
    );
    const prevPending = prevPendingIdsRef.current;

    let someSettled = false;
    prevPending.forEach((id) => {
      if (!currentPending.has(id)) {
        const settled = callRecords.find((r) => r._id === id);
        // Only refresh when the settled call actually earns (validated).
        if (settled && settled.validByAI === true) someSettled = true;
      }
    });

    prevPendingIdsRef.current = currentPending;
    if (someSettled) onAnalysisSettled?.();
  }, [callRecords, onAnalysisSettled]);

  useEffect(() => {
    if (!selectedCall) return;
    const refreshed = callRecords.find((r) => r._id === selectedCall._id);
    if (!refreshed) return;
    const wasPending = isAnalysisPending(selectedCall);
    const isScoredNow = !isAnalysisPending(refreshed);
    if (wasPending && isScoredNow) {
      setSelectedCall(refreshed);
    }
  }, [callRecords, selectedCall]);


  const openCallDetails = (call: CallRecord, tab: 'transcript' | 'insights') => {
    setSelectedCall(call);
    setActiveTab(tab);
  };

  const filteredRecords = callRecords.filter(record => {
    if (leadId && record.lead?._id !== leadId) return false;
    if (gigId) {
      const recordGig = record.lead?.gigId;
      const idStr = typeof recordGig === 'object'
        ? (recordGig?._id || (recordGig as any)?.$oid)
        : recordGig;
      if (idStr !== gigId) return false;
    }

    // Call Validation Filter
    if (callValidationFilter === 'approved' && record.validByAI !== true) return false;
    // "Pending" = analyzer hasn't reached a verdict yet. Uses the new
    // ai_call_status field when available, falls back to the legacy
    // `validByAI == null` heuristic for older calls.
    if (callValidationFilter === 'pending' && !isAnalysisPending(record)) return false;

    // Transaction Validation Filter
    if (transactionValidationFilter === 'approved' && record.transaction?.validByReps !== true) return false;
    if (transactionValidationFilter === 'refused' && record.transaction?.validByReps !== false) return false;
    if (transactionValidationFilter === 'pending' && record.transaction?.validByReps != null) return false;

    return true;
  });

  // Actively analyzing = we just kicked it off (analyzingCallId) OR the backend
  // reports pending/processing AND the lock isn't stale. A stale lock no longer
  // blocks the button so the user can relaunch the analysis.
  const selectedCallStale = selectedCall ? isAnalysisStale(selectedCall) : false;
  const selectedCallAnalyzing = selectedCall
    ? analyzingCallId === selectedCall._id ||
      (isAnalysisPending(selectedCall) && !selectedCallStale)
    : false;

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest">{t('calls.recordsTitle')}</h2>
        <button
          onClick={() => void fetchCallRecords()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{t('calls.refresh')}</span>
        </button>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse pb-6 border-b border-slate-50 last:border-none last:pb-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 shrink-0"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-100 rounded-md w-36"></div>
                    <div className="flex gap-2">
                      <div className="h-4 bg-slate-100 rounded-full w-14"></div>
                      <div className="h-4 bg-slate-100 rounded-full w-14"></div>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-md w-28 mt-1"></div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 md:gap-6">
                  <div className="h-8 bg-slate-100 rounded-full w-24"></div>
                  <div className="h-8 bg-slate-100 rounded-full w-24"></div>
                  <div className="h-10 w-10 bg-slate-100 rounded-xl"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="flex flex-col justify-center items-center p-20 text-center">
            <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center mb-6">
              <Phone className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">{t('calls.noCalls')}</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-sm">
              {t('calls.noCallsDetail')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filteredRecords.map((record: CallRecord) => {
              const callId = typeof record._id === 'object' ? (record._id as any).$oid : record._id;
              return (
                <div
                  key={callId}
                  className="p-6 hover:bg-slate-50/50 transition-all duration-300 group"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${record.direction === 'inbound' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                        <Phone className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-sm tracking-tight flex items-center gap-2 flex-wrap">
                          <span>
                            {record.lead?.First_Name ? `${record.lead.First_Name} ${record.lead.Last_Name || ''}`.trim() :
                              record.lead?.name || record.to || record.from || 'Unknown Customer'}
                          </span>
                          {record.lead && (record.lead.First_Name || record.lead.Last_Name || record.lead.name) && (
                            <span className="text-xs font-normal text-slate-400">
                              ({record.lead.phone || record.lead.Phone || record.to || record.from})
                            </span>
                          )}
                          {record.validByAI === true && (
                            <span
                              title="Appel validé par l'IA — commission RepTransaction créée"
                              className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0"
                            >
                              <BadgeCheck className="w-3 h-3" />
                            </span>
                          )}
                          {(() => {
                            const badge = callOutcomeBadge(record.callOutcome);
                            if (!badge) return null;
                            return (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${badge.tone}`}
                                title={`Issue de l'appel : ${badge.label}`}
                              >
                                {badge.label}
                              </span>
                            );
                          })()}
                          {record.flags?.fraud === true && record.callOutcome !== 'fraud' && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border bg-rose-100 text-rose-800 border-rose-300"
                              title="Score Fraud detection < 50"
                            >
                              <ShieldAlert className="w-2.5 h-2.5" />
                              Fraude
                            </span>
                          )}
                        </h3>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm border ${record.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100/50' : 'bg-rose-50 text-rose-600 border-rose-100/50'}`}>
                            {record.status}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${record.direction === 'inbound' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
                            }`}>
                            {record.direction}
                          </span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 text-slate-500 border border-slate-100 px-2 py-0.5 rounded-full">
                            Durée: {Math.floor((record.duration || 0) / 60)}m {(record.duration || 0) % 60}s
                          </span>
                        </div>
                        <div className="text-[10px] font-bold text-slate-400/90 mt-2 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-300" />
                          <span>{new Date(record.startTime || record.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1 flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          <span>ID: {typeof record._id === 'object' ? (record._id as any).$oid : record._id}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 md:gap-6">
                      {record.ai_call_score?.overall?.score !== undefined && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-full border border-amber-100/50 shadow-sm">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          <span className="text-xs font-black">{record.ai_call_score.overall.score}%</span>
                        </div>
                      )}

                      {(() => {
                        const status = record.status?.toLowerCase() || '';
                        const isCompleted = status === 'completed';
                        // Calls that never reached a human (no-answer / busy / canceled / failed)
                        // are auto-refused server-side, so `validByAI` is already false.
                        // We still render the badge in that case so the rep sees WHY there's
                        // no commission, instead of a silent "-".
                        const isUnansweredStatus = ['no-answer', 'noanswer', 'busy', 'canceled', 'cancelled', 'failed'].includes(status);
                        const showValidationSection = isCompleted || record.validByAI != null || isUnansweredStatus;
                        return showValidationSection;
                      })() ? (
                        <>
                          <div className="h-8 w-px bg-slate-200/70 hidden sm:block"></div>
                          {/* Validation de l'Appel AI */}
                          <div className="flex flex-col items-center gap-1 min-w-[120px]">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">Appel</span>
                            {record.validByAI === true || record.valid === true ? (
                              <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100/40 shadow-sm w-36 whitespace-nowrap">
                                <Check className="w-3.5 h-3.5" />
                                Validé par AI (+{resolveCallRepCommission(record).toFixed(2)}€)
                              </span>
                            ) : record.validByAI === false ? (
                              (() => {
                                const status = record.status?.toLowerCase() || '';
                                const isUnansweredStatus = ['no-answer', 'noanswer', 'busy', 'canceled', 'cancelled', 'failed'].includes(status);
                                const label = isUnansweredStatus
                                  ? (status === 'busy' ? 'Occupé' : status === 'no-answer' || status === 'noanswer' ? 'Non décroché' : status === 'failed' ? 'Échec' : 'Annulé')
                                  : 'Refusé AI';
                                return (
                                  <span
                                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100/40 shadow-sm w-32 whitespace-nowrap"
                                    title={record.ai_refusal_reason || label}
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    {label}
                                  </span>
                                );
                              })()
                            ) : record.ai_call_status === 'error' ? (
                              <span
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100/40 shadow-sm w-32 whitespace-nowrap"
                                title="L'analyse a échoué — réessayez depuis l'aperçu"
                              >
                                <X className="w-3.5 h-3.5" />
                                Erreur analyse
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-50 text-slate-400 border border-slate-200/40 shadow-sm w-32 whitespace-nowrap"
                                title={
                                  record.ai_call_status === 'processing'
                                    ? "L'IA scanne l'enregistrement…"
                                    : "Analyse à venir"
                                }
                              >
                                <Clock className="w-3.5 h-3.5 animate-pulse" />
                                Analyse en cours
                              </span>
                            )}
                          </div>

                          <div className="h-8 w-px bg-slate-200/70 hidden sm:block"></div>

                          <div className="flex flex-col items-center gap-1 min-w-[120px]">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">Transaction</span>
                            {record.transaction?.validByReps === true ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100/40 shadow-sm w-36 whitespace-nowrap">
                                  <Check className="w-3.5 h-3.5" />
                                  Signé (+{resolveTransactionRepCommission(record).toFixed(2)}€)
                                </span>
                              </div>
                            ) : (record.validByAI === null || record.validByAI === undefined) ? (
                              <div className="flex flex-col items-center justify-center min-w-[80px]">
                                <span className="text-slate-300 font-bold text-sm tracking-widest">-</span>
                              </div>
                            ) : hasValidatedTransactionSale(record) ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-200/40 shadow-sm w-44 whitespace-nowrap text-center cursor-help" title="Transaction validée par l'IA — commission comptée au portefeuille (disponible ou en attente)">
                                  <Check className="w-3.5 h-3.5 text-blue-500" />
                                  Validé IA (+{resolveTransactionRepCommission(record).toFixed(2)}€)
                                </span>
                                {record.argumentation_score !== undefined && (
                                  <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Score: {record.argumentation_score}%</span>
                                )}
                              </div>
                            ) : record.transaction?.validByAI === false ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100/40 shadow-sm w-32 whitespace-nowrap">
                                  <X className="w-3.5 h-3.5" />
                                  Refusé AI
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center min-w-[80px]">
                                <span className="text-slate-300 font-bold text-sm tracking-widest">-</span>
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="h-8 w-px bg-slate-200/70 hidden sm:block"></div>
                          <div className="flex flex-col items-center justify-center min-w-[80px]">
                            <span className="text-slate-300 font-bold text-sm tracking-widest">-</span>
                          </div>
                        </>
                      )}

                      {record.status?.toLowerCase() === 'completed' && (
                        <div className="flex items-center gap-2 ml-2">
                          <button
                            onClick={() => openCallDetails(record, 'insights')}
                            className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-100 transition-all"
                            title="View Details"
                          >
                            <Brain className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Detail View */}
      {/* Modal Detail View */}
      {selectedCall && createPortal(
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setSelectedCall(null)}></div>

          <div className="relative bg-white w-full md:max-w-5xl h-[92vh] md:h-[88vh] max-h-[92vh] md:max-h-[88vh] rounded-[24px] md:rounded-[36px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-slate-100/80">
            {/* Modal Header */}
            <div className="px-4 py-4 md:px-8 md:py-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10 shrink-0">
              <div className="flex justify-between items-start md:items-center w-full md:w-auto flex-1">
                <div>
                  <h2 className="text-sm md:text-base font-black text-slate-900 uppercase tracking-widest leading-snug">
                    {selectedCall.lead?.First_Name ? `${selectedCall.lead.First_Name} ${selectedCall.lead.Last_Name || ''}`.trim() : 'Call Details'}
                  </h2>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5 italic">
                    {new Date(selectedCall.startTime || selectedCall.createdAt).toLocaleString()} • {selectedCall.duration ? `${Math.floor(selectedCall.duration / 60)}m ${selectedCall.duration % 60}s` : '0s'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 opacity-60">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded-md">
                      Call ID: {typeof selectedCall._id === 'object' ? (selectedCall._id as any).$oid : selectedCall._id}
                    </span>
                  </div>
                </div>
                {/* Close button on mobile */}
                <div className="md:hidden">
                  <button
                    onClick={() => setSelectedCall(null)}
                    className="p-2 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl border border-slate-100 transition-all shadow-sm"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="w-full md:w-auto md:flex-1 max-w-full md:max-w-md shrink-0">
                {(() => {
                  const recordingUrl = selectedCall.recording_url_cloudinary || selectedCall.recording_url;
                  if (!recordingUrl) return <div className="text-[10px] font-black text-slate-400 uppercase text-center py-2 bg-slate-100/50 rounded-xl italic">No recording</div>;
                  const finalUrl = (recordingUrl.includes('twilio.com') && !recordingUrl.endsWith('.mp3')) ? `${recordingUrl}.mp3` : recordingUrl;
                  return <PremiumAudioPlayer url={finalUrl} />;
                })()}
              </div>

              {/* Close button on desktop */}
              <div className="hidden md:flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setSelectedCall(null)}
                  className="p-2 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl border border-slate-100 transition-all shadow-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tabs & Status Header */}
            <div className="px-4 py-3 md:px-8 md:py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 bg-white shrink-0">
              <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap scrollbar-none pb-1 lg:pb-0">
                <button
                  onClick={() => setActiveTab('transcript')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'transcript' ? 'bg-gradient-harx text-white shadow-lg shadow-harx-500/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                >
                  <MessageSquare className="w-4 h-4" />
                  {t('calls.transcript')}
                </button>
                <button
                  onClick={() => setActiveTab('insights')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'insights' ? 'bg-gradient-harx text-white shadow-lg shadow-harx-500/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                >
                  <ActivityIcon className="w-4 h-4" />
                  {t('calls.aiInsights')}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3 md:gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1.5 text-slate-400" title="Appel">
                    <Phone className="w-4 h-4" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Appel</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${selectedCall.validByAI === true ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                    selectedCall.validByAI === false ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                      'bg-amber-500/10 text-amber-600 border-amber-500/20'
                    }`} title={selectedCall.validByAI === true ? 'Validé par AI' : selectedCall.validByAI === false ? 'Refusé AI' : 'En cours'}>
                    {selectedCall.validByAI === true ? (
                      <div className="flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        +{((selectedCall.lead?.gigId?.commission?.commission_per_call || selectedCall.lead?.gigId?.rewardPerCall || 4) * 0.7).toFixed(2)}€
                      </div>
                    ) : selectedCall.validByAI === false ? (
                      <X className="w-3 h-3" />
                    ) : (
                      <Clock className="w-3 h-3 animate-pulse" />
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1.5 text-slate-400" title="Transaction">
                    <CreditCard className="w-4 h-4" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction</span>
                  </div>
                  {(selectedCall.validByAI === null || selectedCall.validByAI === undefined) ? (
                    <span className="inline-flex items-center justify-center p-1.5 rounded-full bg-slate-50 text-slate-400 border border-slate-100/40 shadow-sm" title="En attente">
                      <Clock className="w-3 h-3" />
                    </span>
                  ) : selectedCall.transaction?.validByAI === true ? (
                    <span className="inline-flex items-center justify-center p-1.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100/40 shadow-sm" title="Wait for Company Validation">
                      <Clock className="w-3 h-3 animate-pulse" />
                    </span>
                  ) : selectedCall.transaction?.validByAI === false ? (
                    <span className="inline-flex items-center justify-center p-1.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100/40 shadow-sm" title="Refusé AI">
                      <X className="w-3 h-3" />
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center p-1.5 rounded-full bg-slate-50 text-slate-400 border border-slate-100/40 shadow-sm" title="Aucune vente">
                      <Clock className="w-3 h-3" />
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1.5 text-slate-400" title="Validation Finale">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${selectedCall.transaction?.validByReps === true ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                    selectedCall.transaction?.validByReps === false ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                      'bg-amber-500/10 text-amber-600 border-amber-500/20'
                    }`} title={selectedCall.transaction?.validByReps === true ? 'Vente déclarée' : selectedCall.transaction?.validByReps === false ? 'Pas de vente' : 'En attente'}>
                    {selectedCall.transaction?.validByReps === true ? (
                      <div className="flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        +{(selectedCall.transaction?.repTransactionCommission !== undefined ? selectedCall.transaction.repTransactionCommission : (selectedCall.lead?.gigId?.commission?.transactionCommission || selectedCall.lead?.gigId?.rewardPerSale || 30) * 0.7).toFixed(2)}€
                      </div>
                    ) : selectedCall.transaction?.validByReps === false ? (
                      <X className="w-3 h-3" />
                    ) : (
                      <Clock className="w-3 h-3" />
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-slate-50/20 custom-scrollbar">
              {activeTab === 'transcript' ? (
                <div className="max-w-4xl mx-auto space-y-6">
                  {selectedCall.transcript && selectedCall.transcript.length > 0 ? (
                    selectedCall.transcript.map((t, i) => (
                      <div key={i} className={`flex gap-3 sm:gap-4 ${t.speaker?.toLowerCase().includes('agent') ? 'flex-row' : 'flex-row-reverse'}`}>
                        <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${t.speaker?.toLowerCase().includes('agent') ? 'items-start' : 'items-end'}`}>
                          <div className="flex items-center gap-2 mb-1 px-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t.speaker}</span>
                            <span className="text-[9px] font-bold text-slate-300">{t.timestamp}</span>
                          </div>
                          <div className={`px-4 py-3 sm:px-5 sm:py-4 rounded-[20px] sm:rounded-3xl text-sm font-medium leading-relaxed ${t.speaker?.toLowerCase().includes('agent')
                            ? 'bg-white text-slate-700 rounded-tl-none border border-slate-100 shadow-sm'
                            : 'bg-gradient-harx text-white rounded-tr-none shadow-lg shadow-harx-500/20'
                            }`}>
                            {t.text}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-10 text-center flex flex-col items-center justify-center gap-4">
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">Transcript not available</p>
                      {selectedCallStale && (
                        <p className="text-amber-500 font-bold text-[10px] uppercase tracking-widest">
                          Analyse bloquée — relancez-la
                        </p>
                      )}
                      <button
                        onClick={() => handleAnalyzeCall(selectedCall._id)}
                        disabled={selectedCallAnalyzing}
                        className="flex items-center gap-2 px-6 py-3 bg-harx-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-harx-600 transition-all shadow-lg shadow-harx-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Brain className={`w-4 h-4 ${selectedCallAnalyzing ? 'animate-spin' : ''}`} />
                        {selectedCallAnalyzing ? 'Analyse...' : selectedCallStale ? 'Réessayer l\'analyse' : 'Analyze & Transcribe'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="max-w-5xl mx-auto space-y-8 pb-4">
                  {(!selectedCall.ai_call_score || !selectedCall.ai_call_score.overall?.score) ? (
                    <div className="py-10 text-center flex flex-col items-center justify-center gap-4">
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">
                        Analyse détaillée non encore générée
                      </p>
                      {selectedCallStale && (
                        <p className="text-amber-500 font-bold text-[10px] uppercase tracking-widest">
                          Analyse bloquée — relancez-la
                        </p>
                      )}
                      <button
                        onClick={() => handleAnalyzeCall(selectedCall._id)}
                        disabled={selectedCallAnalyzing}
                        className="flex items-center gap-2 px-6 py-3 bg-harx-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-harx-600 transition-all shadow-lg shadow-harx-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Brain className={`w-4 h-4 ${selectedCallAnalyzing ? 'animate-spin' : ''}`} />
                        {selectedCallAnalyzing ? 'Analyse...' : selectedCallStale ? 'Réessayer l\'analyse' : 'Lancer l\'analyse IA'}
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Executive Summary Section - Now at the Top */}
                      <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-[28px] sm:rounded-[40px] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                        <div className="relative bg-white rounded-[28px] sm:rounded-[40px] border border-emerald-100/50 shadow-2xl shadow-emerald-500/5 p-6 sm:p-10 overflow-hidden">
                          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full -mr-40 -mt-40 blur-3xl"></div>

                          <div className="relative z-10">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-6 sm:mb-8">
                              <div className="flex items-center gap-4 sm:gap-6">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
                                  <Star className="w-6 h-6 sm:w-8 sm:h-8" />
                                </div>
                                <div>
                                  <h4 className="text-lg sm:text-2xl font-black text-slate-900 uppercase tracking-widest">{t('calls.executiveSummary')}</h4>
                                  <p className="text-[10px] sm:text-xs font-bold text-emerald-600 uppercase tracking-widest mt-0.5 sm:mt-1 opacity-80">Audit Global de Performance</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 bg-slate-50/80 px-4 py-3 sm:px-6 sm:py-4 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm self-start sm:self-auto">
                                <div className="text-right">
                                  <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Score Global</p>
                                  <div className="text-2xl sm:text-4xl font-black text-slate-900 leading-none">
                                    {selectedCall.ai_call_score?.overall?.score || 0}<span className="text-base sm:text-xl text-slate-400">%</span>
                                  </div>
                                </div>
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                                  <TrendingUp className={`w-5 h-5 sm:w-6 sm:h-6 ${(selectedCall.ai_call_score?.overall?.score || 0) >= 70 ? 'text-emerald-500' : 'text-rose-500'}`} />
                                </div>
                              </div>
                            </div>

                            <div className="bg-gradient-to-br from-slate-50 to-white rounded-[20px] sm:rounded-[32px] p-5 sm:p-8 border border-slate-100 shadow-inner">
                              <p className="text-base sm:text-xl font-bold text-slate-800 leading-relaxed italic relative">
                                <span className="absolute -left-2 -top-4 sm:-left-4 sm:-top-4 text-emerald-200 text-4xl sm:text-6xl font-serif opacity-50">&quot;</span>
                                {/* Prefer the bilingual persisted ai_summary; fall back to bilingual overall feedback. */}
                                {i18n.language === 'en'
                                  ? (selectedCall.ai_summary || selectedCall.ai_call_score?.overall?.feedback_en || selectedCall.ai_summary || selectedCall.ai_call_score?.overall?.feedback || 'Analysis in progress...')
                                  : (selectedCall.ai_summary || selectedCall.ai_call_score?.overall?.feedback_fr || selectedCall.ai_summary || selectedCall.ai_call_score?.overall?.feedback || 'Analyse en cours...')}
                                <span className="text-emerald-200 text-4xl sm:text-6xl font-serif opacity-50 ml-1 leading-none align-bottom">&quot;</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Detailed Metrics Section */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-4 px-4">
                          <div className="h-px flex-1 bg-slate-200/60"></div>
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center">{t('calls.detailedAnalysis')}</h5>
                          <div className="h-px flex-1 bg-slate-200/60"></div>
                        </div>



                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                          {(() => {
                            const colorMap: Record<string, { bg: string, text: string, bgBar: string }> = {
                              emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', bgBar: 'bg-emerald-500' },
                              blue: { bg: 'bg-blue-50', text: 'text-blue-600', bgBar: 'bg-blue-500' },
                              rose: { bg: 'bg-rose-50', text: 'text-rose-600', bgBar: 'bg-rose-500' },
                              indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', bgBar: 'bg-indigo-500' },
                              amber: { bg: 'bg-amber-50', text: 'text-amber-600', bgBar: 'bg-amber-500' },
                              violet: { bg: 'bg-violet-50', text: 'text-violet-600', bgBar: 'bg-violet-500' },
                            };

                            return [
                              { label: t('calls.metrics.fluency', 'Agent Fluency'), key: "Agent fluency", icon: Globe, color: 'emerald' },
                              { label: t('calls.metrics.sentiment', 'Sentiment Analysis'), key: "Sentiment analysis", icon: ActivityIcon, color: 'blue' },
                              { label: t('calls.metrics.fraud', 'Fraud Detection'), key: "Fraud detection", icon: ShieldAlert, color: 'rose' },
                              { label: t('calls.metrics.coherence', 'Script Coherence'), key: "Script coherence", icon: ShieldCheck, color: 'indigo' },
                              { label: t('calls.metrics.argumentation', 'Argumentation Quality'), key: "Argumentation", icon: TrendingUp, color: 'amber' },
                              { label: t('calls.metrics.adherence', 'Script Adherence'), key: "Script adherence", icon: BookOpen, color: 'violet' },
                              { label: t('calls.metrics.transaction', 'Transaction Analysis'), key: "Transaction analysis", icon: TrendingUp, color: 'emerald' }
                            ].map((metric, mIdx) => {
                              const metricData = getAiRubricMetric(selectedCall.ai_call_score, metric.key);
                              if (!metricData && metric.key === "Script adherence") return null;

                              const isFraudMetric = metric.key === "Fraud detection";
                              const originalScore = metricData?.score || 0;
                              const score = isFraudMetric ? (100 - originalScore) : originalScore;

                              const scoreColorClass = originalScore >= 80 ? 'text-emerald-600 bg-emerald-50' :
                                originalScore >= 50 ? 'text-amber-600 bg-amber-50' :
                                  'text-rose-600 bg-rose-50';

                              const passed =
                                typeof metricData?.passed === 'boolean'
                                  ? metricData.passed
                                  : originalScore >= 50;

                              const displayedPassed = isFraudMetric ? (passed ? 'No' : 'Yes') : (passed ? 'Yes' : 'No');

                              const rawFeedback = i18n.language === 'en'
                                ? (metricData?.feedback_en || metricData?.feedback || '')
                                : (metricData?.feedback_fr || metricData?.feedback || '');

                              const theme = colorMap[metric.color] || { bg: 'bg-slate-50', text: 'text-slate-600', bgBar: 'bg-slate-500' };

                              return (
                                <div key={mIdx} className="bg-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-6 border border-slate-100 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
                                  <div>
                                    <div className="flex justify-between items-start mb-4 sm:mb-6">
                                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl ${theme.bg} ${theme.text} flex items-center justify-center shadow-sm shrink-0`}>
                                        <metric.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                                      </div>
                                      <div className="text-right flex flex-col items-end gap-1.5">
                                        <div className={`px-2.5 py-1 rounded-xl text-base sm:text-lg font-black shadow-sm border border-transparent ${scoreColorClass}`}>
                                          {score}%
                                        </div>
                                        <span
                                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                                            passed
                                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                              : 'bg-rose-50 text-rose-700 border-rose-200'
                                          }`}
                                          title={passed ? 'Critère validé' : 'Critère non validé'}
                                        >
                                          {passed ? (
                                            <Check className="w-2.5 h-2.5" />
                                          ) : (
                                            <X className="w-2.5 h-2.5" />
                                          )}
                                          {displayedPassed}
                                        </span>
                                      </div>
                                    </div>

                                    <h5 className="text-[11px] sm:text-[12px] font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                                      <span className={`w-1.5 h-3.5 ${theme.bgBar} rounded-full`}></span>
                                      {metric.label}
                                    </h5>
                                  </div>

                                  <div className="mt-2">
                                    <div className="text-xs sm:text-[13px] font-medium text-slate-600 leading-relaxed bg-slate-50/50 rounded-xl sm:rounded-2xl p-4 border border-slate-50 group-hover:bg-white group-hover:border-slate-100 transition-all max-h-[160px] overflow-y-auto custom-scrollbar italic">
                                      {rawFeedback ? rawFeedback.split('"').map((part: string, i: number) =>
                                        i % 2 === 1 ? (
                                          <span key={i} className="bg-amber-100/50 text-amber-900 font-bold px-1 rounded border-b border-amber-200 not-italic">&quot;{part}&quot;</span>
                                        ) : part
                                      ) : (i18n.language === 'en' ? 'Detailed analysis unavailable.' : 'Analyse détaillée indisponible.')}
                                    </div>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>

                      {/* Statuts et Réponses Prospect Section */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-4 px-4 pt-4">
                          <div className="h-px flex-1 bg-slate-200/60"></div>
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center">Statuts & Réponses Prospect</h5>
                          <div className="h-px flex-1 bg-slate-200/60"></div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                          {(() => {
                            const colorMap: Record<string, { bg: string, text: string, bgBar: string }> = {
                              emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', bgBar: 'bg-emerald-500' },
                              blue: { bg: 'bg-blue-50', text: 'text-blue-600', bgBar: 'bg-blue-500' },
                              rose: { bg: 'bg-rose-50', text: 'text-rose-600', bgBar: 'bg-rose-500' },
                              indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', bgBar: 'bg-indigo-500' },
                              amber: { bg: 'bg-amber-50', text: 'text-amber-600', bgBar: 'bg-amber-500' },
                            };

                            return [
                              { label: 'Pas intéressé', key: "PAS INTÉRESSÉS", icon: ShieldAlert, color: 'rose' },
                              { label: 'Pas au courant', key: "PAS AU COURANT", icon: Globe, color: 'blue' },
                              { label: 'Déjà équipé / Fourni', key: "DÉJÀ ÉQUIPÉS", icon: ShieldCheck, color: 'indigo' },
                              { label: 'Prise de RDV', key: "RDV", icon: Calendar, color: 'emerald' },
                              { label: 'À plus tard / Rappel', key: "A plus tard", icon: Clock, color: 'amber' }
                            ].map((metric, mIdx) => {
                              const metricData = getAiRubricMetric(selectedCall.ai_call_score, metric.key);
                              if (!metricData) return null;
                              const score = metricData?.score || 0;
                              const scoreColorClass = score >= 50 ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-50';
                              const passed = typeof metricData?.passed === 'boolean' ? metricData.passed : score >= 50;

                              const theme = colorMap[metric.color] || { bg: 'bg-slate-50', text: 'text-slate-600', bgBar: 'bg-slate-500' };

                              return (
                                <div key={mIdx} className="bg-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-6 border border-slate-100 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
                                  <div>
                                    <div className="flex justify-between items-start mb-4 sm:mb-6">
                                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl ${theme.bg} ${theme.text} flex items-center justify-center shadow-sm shrink-0`}>
                                        <metric.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                                      </div>
                                      <div className="text-right flex flex-col items-end gap-1.5">
                                        <div className={`px-2.5 py-1 rounded-xl text-[10px] sm:text-xs font-black shadow-sm border border-transparent ${scoreColorClass}`}>
                                          {passed ? 'Détecté' : 'Non détecté'} ({score}%)
                                        </div>
                                        <span
                                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                                            passed
                                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                              : 'bg-slate-50 text-slate-500 border-slate-100'
                                          }`}
                                          title={passed ? 'Détecté par l\'IA' : 'Non détecté par l\'IA'}
                                        >
                                          {passed ? (
                                            <Check className="w-2.5 h-2.5" />
                                          ) : (
                                            <X className="w-2.5 h-2.5" />
                                          )}
                                          {passed ? 'Oui' : 'Non'}
                                        </span>
                                      </div>
                                    </div>

                                    <h5 className="text-[11px] sm:text-[12px] font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                                      <span className={`w-1.5 h-3.5 ${theme.bgBar} rounded-full`}></span>
                                      {metric.label}
                                    </h5>
                                  </div>

                                  <div className="mt-2">
                                    <div className="text-xs sm:text-[13px] font-medium text-slate-600 leading-relaxed bg-slate-50/50 rounded-xl sm:rounded-2xl p-4 border border-slate-50 group-hover:bg-white group-hover:border-slate-100 transition-all max-h-[160px] overflow-y-auto custom-scrollbar italic">
                                      {metricData?.feedback ? metricData.feedback.split('"').map((part: string, i: number) =>
                                        i % 2 === 1 ? (
                                          <span key={i} className="bg-amber-100/50 text-amber-900 font-bold px-1 rounded border-b border-amber-200 not-italic">&quot;{part}&quot;</span>
                                        ) : part
                                      ) : 'Analyse indisponible.'}
                                    </div>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

            </div>

            <div className="px-4 py-4 md:px-8 md:py-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setSelectedCall(null)}
                className="px-6 py-2.5 sm:px-8 sm:py-3 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all shadow-lg active:scale-95 shrink-0"
              >
                {t('calls.closeDetails')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

