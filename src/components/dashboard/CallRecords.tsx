import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
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
  RotateCcw,
} from 'lucide-react';
import api, { repTransactionsApi, type RepTransactionRow } from '../../utils/client';
import { getCallAnalyzeErrorMessage } from '../../utils/callAnalyzeErrors';
import {
  hasDetectedTransactionSale,
  resolveCallRepCommission,
  resolveTransactionRepCommission,
} from '../../utils/commissionUtils';
import { formatRetractionEndsLabel, isCallApprovedByAI, isCallRejectedByAI, isTransactionInRetraction, resolveCallDispositionStatus, resolveUnvalidatedTransactionStatus } from '../../utils/callStatusDisplay';
import { indexSaleLedgerByCallId } from '../../utils/repLedgerBreakdown';
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
    retractionStatus?: string | null;
    retractionEndsAt?: string | null;
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
  transactionValidationFilter?: 'all' | 'approved' | 'refused' | 'pending' | 'retraction';
  /** Twilio CallSid of a call that should auto-open in the details modal
   *  as soon as it lands in the fetched records list. Used by Workspace
   *  to deep-link the rep into the AI-insights modal right after they
   *  hang up. */
  autoOpenSid?: string;
  /** Dashboard overlay: open this call's modal without rendering the list. */
  overlayOpenCallId?: string | null;
  /** Called when the overlay modal is closed. */
  onOverlayClose?: () => void;
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

/** Disposition pill — rubriques prospect (RDV, plus tard…) avant argued_interested. */
function dispositionBadge(record: Pick<CallRecord, 'callOutcome' | 'ai_call_score' | 'transaction' | 'validByAI' | 'valid' | 'ai_call_status'>): { label: string; tone: string } | null {
  if (isCallRejectedByAI(record)) return null;
  const status = resolveCallDispositionStatus(record);
  if (['À confirmer', 'En attente', 'Pas de vente IA'].includes(status.label)) return null;
  return status;
}

export function CallRecords({
  gigId,
  leadId,
  callValidationFilter = 'all',
  transactionValidationFilter = 'all',
  autoOpenSid,
  overlayOpenCallId,
  onOverlayClose,
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
  const [analysisError, setAnalysisError] = useState<{ callId: string; message: string } | null>(null);
  const [repLedgerByCallId, setRepLedgerByCallId] = useState<Map<string, RepTransactionRow>>(new Map());

  const resolveCallId = (record: CallRecord) =>
    typeof record._id === 'object' ? String((record._id as any).$oid) : String(record._id);

  const getLedgerTxStatus = (record: CallRecord) =>
    repLedgerByCallId.get(resolveCallId(record))?.status ?? null;

  const fetchRepLedger = async () => {
    try {
      const agentId = localStorage.getItem('agentId');
      if (!agentId) return;
      const response = await repTransactionsApi.list(agentId, { limit: 500 });
      if (!response?.success || !Array.isArray(response.data)) return;

      setRepLedgerByCallId(indexSaleLedgerByCallId(response.data));
    } catch (err) {
      console.error('Failed to fetch rep ledger for call records:', err);
    }
  };

  const getRetractionEndsLabel = (record: CallRecord) => {
    const ledgerRow = repLedgerByCallId.get(resolveCallId(record));
    const endsAt =
      ledgerRow?.withdrawableAt ||
      (ledgerRow?.meta as { retractionEndsAt?: string } | undefined)?.retractionEndsAt ||
      record.transaction?.retractionEndsAt;
    return formatRetractionEndsLabel(endsAt);
  };

  const renderTransactionCommissionPill = (record: CallRecord, compact = false) => {
    const ledgerStatus = getLedgerTxStatus(record);
    const amount = resolveTransactionRepCommission(record).toFixed(2);
    const endsLabel = getRetractionEndsLabel(record);
    const pillClass = compact
      ? 'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border'
      : 'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase border';

    if (isTransactionInRetraction(record, ledgerStatus)) {
      return (
        <span className={`inline-flex ${compact ? 'flex-row' : 'flex-col'} items-center gap-0.5`}>
          <span
            className={`${pillClass} bg-amber-50 text-amber-800 border-amber-200`}
            title={endsLabel ? `Rétractation jusqu'au ${endsLabel}` : 'Rétractation légale 14 jours'}
          >
            <RotateCcw className="w-3 h-3" />
            +{amount}€
            {compact && <span className="normal-case tracking-normal font-bold">· 14j</span>}
          </span>
          {!compact && (
            <span className="text-[7px] font-black uppercase tracking-wider text-amber-600 text-center">
              Rétractation 14j{endsLabel ? ` · fin ${endsLabel}` : ''}
            </span>
          )}
        </span>
      );
    }

    if (record.transaction?.validByCompany === true || ledgerStatus === 'earned' || ledgerStatus === 'paid') {
      return (
        <span className={`${pillClass} bg-emerald-50 text-emerald-700 border-emerald-100`}>
          <Check className="w-3 h-3" />
          +{amount}€
        </span>
      );
    }

    if (isCallRejectedByAI(record) || isCallApprovedByAI(record)) {
      const txStatus = resolveUnvalidatedTransactionStatus(record);
      return (
        <span className={`${pillClass} ${txStatus.tone}`} title={txStatus.title}>
          {isCallRejectedByAI(record) ? (
            <X className="w-3 h-3" />
          ) : record.transaction?.validByCompany === false || !hasDetectedTransactionSale(record) ? (
            <Clock className="w-3 h-3" />
          ) : (
            <Clock className="w-3 h-3 animate-pulse" />
          )}
          {txStatus.label}
        </span>
      );
    }

    return <span className="text-slate-300 font-bold text-sm">—</span>;
  };

  const renderModalCommissionsBanner = (record: CallRecord) => {
    const ledgerStatus = getLedgerTxStatus(record);
    const inRetraction = isTransactionInRetraction(record, ledgerStatus);
    const endsLabel = getRetractionEndsLabel(record);
    const showCall = record.validByAI === true || record.valid === true;
    const showTx =
      inRetraction ||
      record.transaction?.validByCompany === true ||
      ledgerStatus === 'earned' ||
      ledgerStatus === 'paid' ||
      hasDetectedTransactionSale(record);

    if (!showCall && !showTx) return null;

    return (
      <div className={`px-4 md:px-8 py-4 border-b border-slate-100 ${inRetraction ? 'bg-amber-50/60' : 'bg-slate-50/80'}`}>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-3">
          Commissions sur cet appel
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {showCall && (
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-emerald-100 shadow-sm">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[10px] font-black uppercase text-slate-500">Appel</span>
              <span className="text-sm font-black text-emerald-700">
                +{resolveCallRepCommission(record).toFixed(2)}€
              </span>
            </div>
          )}
          {showTx && (
            <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border shadow-sm ${
              inRetraction ? 'border-amber-200' : 'border-emerald-100'
            }`}>
              <CreditCard className={`w-3.5 h-3.5 ${inRetraction ? 'text-amber-600' : 'text-emerald-600'}`} />
              <span className="text-[10px] font-black uppercase text-slate-500">Vente</span>
              {renderTransactionCommissionPill(record, true)}
            </div>
          )}
        </div>
        {inRetraction && (
          <p className="mt-3 text-[11px] font-semibold text-amber-800 leading-relaxed">
            <RotateCcw className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
            Commission vente en rétractation légale (14 jours).
            {endsLabel ? ` Disponible après le ${endsLabel}.` : ' Elle sera créditée au solde après ce délai.'}
          </p>
        )}
      </div>
    );
  };

  const patchCallInLists = (callId: string, patch: Partial<CallRecord>) => {
    setCallRecords((prev) =>
      prev.map((r) => {
        const id = typeof r._id === 'object' ? (r._id as any).$oid : r._id;
        return id === callId ? { ...r, ...patch } : r;
      })
    );
    setSelectedCall((prev) => {
      if (!prev) return prev;
      const id = typeof prev._id === 'object' ? (prev._id as any).$oid : prev._id;
      return id === callId ? { ...prev, ...patch } : prev;
    });
  };
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
      setAnalysisError(null);
      const response = await api.calls.analyze(callId);

      // Auto-analysis may already be running after hangup — poll, don't error.
      if (response.inProgress) {
        console.info('ℹ️ AI analysis already in progress — waiting for results…');
        patchCallInLists(callId, { ai_call_status: 'processing' });
        await fetchCallRecords(true);
        return;
      }

      if (!response.success) {
        const message = getCallAnalyzeErrorMessage(response);
        setAnalysisError({ callId, message });
        toast.error(message);
        patchCallInLists(callId, { ai_call_status: 'error' });
        return;
      }

      if (response.success) {
        setAnalysisError(null);
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
        void fetchRepLedger();
        // A freshly validated call books commissions server-side — refresh wallet.
        if (response.validByAI === true || (response.data as any)?.validByAI === true) {
          onAnalysisSettled?.();
        }
      }
    } catch (error) {
      const message = getCallAnalyzeErrorMessage(error);
      setAnalysisError({ callId, message });
      toast.error(message);
      patchCallInLists(callId, { ai_call_status: 'error' });
      console.error('Error analyzing call:', error);
    } finally {
      setAnalyzingCallId(null);
    }
  };

  useEffect(() => {
    fetchCallRecords();
    void fetchRepLedger();
  }, [gigId, leadId]);

  useEffect(() => {
    const handler = () => {
      void fetchRepLedger();
    };
    window.addEventListener('REP_WALLET_REFRESH', handler);
    return () => window.removeEventListener('REP_WALLET_REFRESH', handler);
  }, []);

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
    if (someSettled) {
      void fetchRepLedger();
      onAnalysisSettled?.();
    }
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
    setAnalysisError(null);
  };

  const closeCallModal = () => {
    setSelectedCall(null);
    if (overlayOpenCallId) onOverlayClose?.();
  };

  useEffect(() => {
    if (!overlayOpenCallId) return;
    const match = callRecords.find((r) => {
      const id = typeof r._id === 'object' ? (r._id as any).$oid : r._id;
      return id === overlayOpenCallId || r.sid === overlayOpenCallId;
    });
    if (match) openCallDetails(match, 'insights');
  }, [overlayOpenCallId, callRecords]);

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
    const ledgerStatus = getLedgerTxStatus(record);
    if (transactionValidationFilter === 'retraction' && !isTransactionInRetraction(record, ledgerStatus)) {
      return false;
    }
    if (transactionValidationFilter === 'approved') {
      if (record.transaction?.validByCompany !== true && ledgerStatus !== 'earned' && ledgerStatus !== 'paid') {
        return false;
      }
      if (isTransactionInRetraction(record, ledgerStatus)) return false;
    }
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
  const selectedCallId = selectedCall
    ? (typeof selectedCall._id === 'object' ? (selectedCall._id as any).$oid : selectedCall._id)
    : null;
  const selectedCallAnalysisError =
    analysisError?.callId === selectedCallId ? analysisError.message : null;

  const renderAnalysisErrorBanner = () =>
    selectedCallAnalysisError ? (
      <div
        role="alert"
        className="w-full max-w-lg mx-auto flex items-start gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-medium text-left"
      >
        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
        <p>{selectedCallAnalysisError}</p>
      </div>
    ) : null;

  return (
    <div className={overlayOpenCallId ? 'contents' : 'space-y-5 relative'}>
      {!overlayOpenCallId && (
      <>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-harx-600 mb-1">
            {t('calls.recordsTitle')}
          </p>
          <h2 className="text-base font-black text-slate-900 tracking-tight">
            Appels & commissions
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {filteredRecords.length} appel{filteredRecords.length !== 1 ? 's' : ''} affiché{filteredRecords.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => void fetchCallRecords()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 bg-white border border-slate-200 rounded-xl hover:border-harx-300 hover:text-harx-600 transition-all shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{t('calls.refresh')}</span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-2xl border border-slate-100 bg-white p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 rounded-md w-40" />
                  <div className="flex gap-2">
                    <div className="h-5 bg-slate-100 rounded-full w-16" />
                    <div className="h-5 bg-slate-100 rounded-full w-20" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="flex flex-col justify-center items-center py-16 text-center rounded-2xl border border-dashed border-slate-200 bg-white">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
            <Phone className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">{t('calls.noCalls')}</h3>
          <p className="text-xs text-slate-500 mt-2 max-w-sm font-medium">{t('calls.noCallsDetail')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map((record: CallRecord) => {
            const callId = typeof record._id === 'object' ? (record._id as any).$oid : record._id;
            const leadName =
              record.lead?.First_Name
                ? `${record.lead.First_Name} ${record.lead.Last_Name || ''}`.trim()
                : record.lead?.name || record.to || record.from || 'Client inconnu';
            const leadPhone = record.lead?.phone || record.lead?.Phone || record.to || record.from;
            const status = record.status?.toLowerCase() || '';
            const isUnansweredStatus = ['no-answer', 'noanswer', 'busy', 'canceled', 'cancelled', 'failed'].includes(status);
            const showValidationSection =
              status === 'completed' || record.validByAI != null || record.valid != null || isCallRejectedByAI(record) || isCallApprovedByAI(record) || isUnansweredStatus;
            const outcomeBadge = dispositionBadge(record);

            return (
              <div
                key={callId}
                className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <div className="absolute inset-y-0 left-0 w-1 bg-gradient-harx opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
                  {/* Lead + meta */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                        record.direction === 'inbound'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-harx-50 text-harx-600'
                      }`}
                    >
                      <Phone className="w-5 h-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-extrabold text-slate-900 text-sm truncate">{leadName}</h3>
                        {leadPhone && (
                          <span className="text-[11px] font-semibold text-slate-400">{leadPhone}</span>
                        )}
                        {record.validByAI === true && (
                          <BadgeCheck className="w-4 h-4 text-emerald-500 shrink-0" title="Appel validé par l'IA" />
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {outcomeBadge && (
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${outcomeBadge.tone}`}>
                            {outcomeBadge.label}
                          </span>
                        )}
                        {isTransactionInRetraction(record, getLedgerTxStatus(record)) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border bg-amber-50 text-amber-800 border-amber-200">
                            <RotateCcw className="w-2.5 h-2.5" />
                            Rétractation 14j
                          </span>
                        )}
                        {record.flags?.fraud === true && record.callOutcome !== 'fraud' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">
                            <ShieldAlert className="w-2.5 h-2.5" />
                            Fraude
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                            status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-100'
                          }`}
                        >
                          {record.status}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                            record.direction === 'inbound'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-harx-50 text-harx-700'
                          }`}
                        >
                          {record.direction}
                        </span>
                        <span className="text-[9px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                          {Math.floor((record.duration || 0) / 60)}m {(record.duration || 0) % 60}s
                        </span>
                      </div>

                      <p className="text-[10px] font-semibold text-slate-400 mt-2 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 shrink-0" />
                        {new Date(record.startTime || record.createdAt).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>

                  {/* Score */}
                  {record.ai_call_score?.overall?.score !== undefined && (
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-100 shrink-0">
                      <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                      <span className="text-sm font-black">{record.ai_call_score.overall.score}%</span>
                    </div>
                  )}

                  {/* Validation pills */}
                  {showValidationSection && (
                    <div className="flex flex-wrap sm:flex-nowrap items-stretch gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 shrink-0">
                      <div className="flex flex-col items-center justify-center gap-1 min-w-[100px] px-2">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Appel</span>
                        {record.validByAI === true || record.valid === true ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <Check className="w-3 h-3" />
                            +{resolveCallRepCommission(record).toFixed(2)}€
                          </span>
                        ) : isCallRejectedByAI(record) ? (
                          (() => {
                            const disp = dispositionBadge(record);
                            if (disp) {
                              return (
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase border ${disp.tone}`}
                                  title={record.ai_refusal_reason || record.callOutcome || undefined}
                                >
                                  {disp.label}
                                </span>
                              );
                            }
                            return (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-100"
                                title={record.ai_refusal_reason || undefined}
                              >
                                <X className="w-3 h-3" />
                                {isUnansweredStatus
                                  ? status === 'busy'
                                    ? 'Occupé'
                                    : status === 'no-answer' || status === 'noanswer'
                                      ? 'Non décroché'
                                      : 'Annulé'
                                  : 'Refusé'}
                              </span>
                            );
                          })()
                        ) : record.ai_call_status === 'error' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-100">
                            <X className="w-3 h-3" />
                            Erreur
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase bg-white text-slate-500 border border-slate-200">
                            <Clock className="w-3 h-3 animate-pulse" />
                            Pending analyse
                          </span>
                        )}
                      </div>

                      <div className="w-px bg-slate-200 hidden sm:block self-stretch" />

                      <div className="flex flex-col items-center justify-center gap-1 min-w-[100px] px-2">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Transaction</span>
                        {renderTransactionCommissionPill(record)}
                      </div>
                    </div>
                  )}

                  {status === 'completed' && (
                    <button
                      onClick={() => openCallDetails(record, 'insights')}
                      className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-harx-600 hover:bg-harx-50 hover:border-harx-200 transition-all shrink-0 self-start lg:self-center"
                      title="Voir l'analyse IA"
                    >
                      <Brain className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      </>
      )}

      {/* Modal Detail View */}
      {selectedCall && createPortal(
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={closeCallModal}></div>

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
                    onClick={closeCallModal}
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
                  onClick={closeCallModal}
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
                        +{resolveCallRepCommission(selectedCall).toFixed(2)}€
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
                  ) : (
                    renderTransactionCommissionPill(selectedCall, true)
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1.5 text-slate-400" title="Validation Finale">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  {(() => {
                    const inRetraction = isTransactionInRetraction(selectedCall, getLedgerTxStatus(selectedCall));
                    if (selectedCall.transaction?.validByReps === true) {
                      return inRetraction ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border bg-amber-500/10 text-amber-700 border-amber-500/20">
                          <RotateCcw className="w-3 h-3" />
                          +{resolveTransactionRepCommission(selectedCall).toFixed(2)}€ · 14j
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                          <Check className="w-3 h-3" />
                          +{resolveTransactionRepCommission(selectedCall).toFixed(2)}€
                        </span>
                      );
                    }
                    if (selectedCall.transaction?.validByReps === false) {
                      return (
                        <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border bg-rose-500/10 text-rose-600 border-rose-500/20">
                          <X className="w-3 h-3" />
                        </span>
                      );
                    }
                    return (
                      <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border bg-amber-500/10 text-amber-600 border-amber-500/20">
                        <Clock className="w-3 h-3" />
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>

            {renderModalCommissionsBanner(selectedCall)}

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
                      {renderAnalysisErrorBanner()}
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
                      {renderAnalysisErrorBanner()}
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
                onClick={closeCallModal}
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

