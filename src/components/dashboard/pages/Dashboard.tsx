import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TrendingUp, DollarSign, Clock, Phone, Target, Award, Briefcase, CheckCircle2, Wallet as WalletIcon, Trophy, Flame, CalendarDays, CalendarCheck, CalendarClock, CalendarX, Timer, Filter as FilterIcon, Receipt, XCircle, Inbox, ChevronDown, ChevronRight, X, RotateCcw, Building2, ShieldCheck, Rocket, Calculator, Pencil, Check, Users, Medal, ListChecks, PhoneCall, BookOpen, GraduationCap, Ban, Zap, FileText } from 'lucide-react';
import api, { repTransactionsApi, type RepTransactionRow } from '../../../utils/client';
import { slotApi, type Reservation } from '../../../services/api/slotApi';
import { billedMinutesFromSeconds } from '../../../utils/billingMinutes';
import { repApiUrl } from '../../../utils/repApiUrl';
import { CallRecords } from '../CallRecords';
import {
  resolveClientValidationPendingAmount,
  resolveTransactionRepCommission,
} from '../../../utils/commissionUtils';
import { isTransactionInRetraction } from '../../../utils/callStatusDisplay';
import { computeValidatedLedgerBreakdown, dedupeSaleLedgerRows, indexSaleLedgerByCallId, resolveLedgerPeriodDate } from '../../../utils/repLedgerBreakdown';
import { getGigsApiBase } from '../../../utils/gigsApiBase';
import { isCallCenterStaff } from '../../../utils/callCenterStaff';
import { CallCenterAgentHome } from './CallCenterAgentHome';
import { persistActiveGigId, withActiveGig } from '../../../utils/activeGigNav';

interface DashboardProps {
  profile?: any;
}

type GigFilterOption = {
  _id: string;
  title: string;
  commission?: any;
  rewardBonus?: number;
  availability?: any; // minimumHours.daily/weekly/monthly
};

function isPlaceholderGigTitle(title: string | undefined | null, id: string): boolean {
  if (!title || !String(title).trim()) return true;
  const t = String(title).trim();
  const shortId = id.slice(-6);
  if (t === `Gig ${shortId}`) return true;
  if (t === id || t === shortId) return true;
  if (/^Gig\s+[a-f0-9]{4,12}$/i.test(t)) return true;
  return false;
}

function firstRealGigTitle(id: string, ...candidates: unknown[]): string {
  const strings = candidates
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim());
  const real = strings.find((t) => !isPlaceholderGigTitle(t, id));
  return real || strings[0] || `Gig ${id.slice(-6)}`;
}

function normalizeGigEntry(raw: any): GigFilterOption | null {
  if (!raw) return null;

  if (typeof raw === 'string') {
    return { _id: raw, title: `Gig ${raw.slice(-6)}` };
  }

  if (raw.gigId || raw.gig) {
    const nested = raw.gigId || raw.gig;
    if (typeof nested === 'object' && nested) {
      const id = String(nested._id || nested.id || nested.$oid || '');
      if (!id) return null;
      return {
        _id: id,
        title: firstRealGigTitle(
          id,
          nested.title,
          nested.name,
          raw.gigTitle,
          raw.gigName,
          raw.title,
          raw.name
        ),
        commission: nested.commission || raw.commission,
        rewardBonus: nested.rewardBonus || raw.rewardBonus,
        availability: nested.availability || raw.availability,
      };
    }
    const id = String(nested);
    return {
      _id: id,
      title: firstRealGigTitle(id, raw.gigTitle, raw.gigName, raw.title, raw.name),
    };
  }

  const id = String(raw._id || raw.id || '');
  if (!id) return null;
  return {
    _id: id,
    title: firstRealGigTitle(id, raw.title, raw.name, raw.gigTitle, raw.gigName),
    commission: raw.commission,
    rewardBonus: raw.rewardBonus,
    availability: raw.availability,
  };
}

function mergeGigOptions(lists: any[][], locale = 'fr'): GigFilterOption[] {
  const map = new Map<string, GigFilterOption>();
  for (const list of lists) {
    for (const item of list) {
      const gig = normalizeGigEntry(item);
      if (!gig) continue;
      const existing = map.get(gig._id);
      map.set(gig._id, {
        ...existing,
        ...gig,
        // Never let a "Gig abc123" fallback overwrite a real title from another source.
        title: firstRealGigTitle(gig._id, existing?.title, gig.title),
        commission: gig.commission ?? existing?.commission,
        rewardBonus: gig.rewardBonus ?? existing?.rewardBonus,
        availability: gig.availability ?? existing?.availability,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title, locale));
}

function resolveCallRefId(call: any): string | null {
  if (!call) return null;
  const id = call._id;
  if (typeof id === 'object' && id?.$oid) return String(id.$oid);
  return call.sid || (id ? String(id) : null);
}

function normalizeRecordId(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'object' && value !== null) {
    const obj = value as { $oid?: string; _id?: unknown; toString?: () => string };
    if (obj.$oid) return String(obj.$oid);
    if (obj._id) return normalizeRecordId(obj._id);
    if (typeof obj.toString === 'function' && obj.toString() !== Object.prototype.toString) {
      const str = obj.toString();
      if (str && str !== '[object Object]') return str;
    }
  }
  return String(value);
}

function resolveTransactionCallId(tx: RepTransactionRow): string | null {
  return tx.callId || tx.call?._id || tx.call?.sid || null;
}

/** Masque un numéro de téléphone : garde le préfixe pays + les 2 derniers chiffres.
 *  Ex: +33623984708 → +336 •• •• 08   |   0623984708 → 06 •• •• 08 */
function maskPhone(raw: string | undefined | null): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 6) return raw;
  const suffix = digits.slice(-2);
  const prefix = raw.startsWith('+') ? raw.slice(0, raw.indexOf(digits[0]) + 3) : digits.slice(0, 2);
  return `${prefix} •• •• ${suffix}`;
}

const clickableRowClass =
  'group w-full text-left flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/70 border border-white/60 hover:border-emerald-200/80 hover:bg-white hover:shadow-md transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20 active:scale-[0.99]';

const clickableCallRowClass =
  'group w-full text-left flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/70 border border-white/60 hover:border-indigo-200/80 hover:bg-white hover:shadow-md transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20 active:scale-[0.99]';

type PeriodKey = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all';
type GoalsPeriod = Exclude<PeriodKey, 'all'>;

const GOALS_PERIODS: GoalsPeriod[] = ['today', 'week', 'month', 'quarter', 'year'];

const GOAL_TARGETS: Record<GoalsPeriod, { calls: number; sessions: number; bonusScale: number }> = {
  today: { calls: 5, sessions: 1, bonusScale: 1 / 30 },
  week: { calls: 25, sessions: 5, bonusScale: 1 / 4 },
  month: { calls: 100, sessions: 20, bonusScale: 1 },
  quarter: { calls: 300, sessions: 60, bonusScale: 3 },
  year: { calls: 1200, sessions: 240, bonusScale: 12 },
};

const getPeriodStart = (period: PeriodKey): number => {
  const now = new Date();
  switch (period) {
    case 'today': {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
    case 'week': {
      const d = new Date(now);
      const day = d.getDay();
      const diff = (day + 6) % 7; // Monday start
      d.setDate(d.getDate() - diff);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
    case 'month': {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return d.getTime();
    }
    case 'quarter': {
      const q = Math.floor(now.getMonth() / 3);
      const d = new Date(now.getFullYear(), q * 3, 1);
      return d.getTime();
    }
    case 'year': {
      const d = new Date(now.getFullYear(), 0, 1);
      return d.getTime();
    }
    case 'all':
    default:
      return 0;
  }
};

export function Dashboard({ profile }: DashboardProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const dateLocale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-US';
  const fmtMoney = (value: number) =>
    value.toLocaleString(dateLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = useMemo(() => [
    { key: 'today', label: t('dashboard.home.periods.today') },
    { key: 'week', label: t('dashboard.home.periods.week') },
    { key: 'month', label: t('dashboard.home.periods.month') },
    { key: 'quarter', label: t('dashboard.home.periods.quarter') },
    { key: 'year', label: t('dashboard.home.periods.year') },
    { key: 'all', label: t('dashboard.home.periods.all') },
  ], [t]);

  const getPeriodStartTitle = (period: PeriodKey): string =>
    t(`dashboard.home.periodStart.${period}`);

  const getPeriodStartHint = (period: PeriodKey): string =>
    t(`dashboard.home.periodStartHint.${period}`);

  const getPeriodStartDateLabel = (period: PeriodKey): string => {
    const start = getPeriodStart(period);
    if (!start) return '';
    return new Date(start).toLocaleDateString(dateLocale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };
  const [callsData, setCallsData] = useState<any[]>([]);
  const [gigsData, setGigsData] = useState<any[]>([]);
  const [reservationsData, setReservationsData] = useState<Reservation[]>([]);
  const [, setLoading] = useState(true);
  const [selectedGigId, setSelectedGigId] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>('month');
  const [goalsPeriod, setGoalsPeriod] = useState<GoalsPeriod>('week');
  const [isGigDropdownOpen, setIsGigDropdownOpen] = useState(false);
  const gigTriggerRef = useRef<HTMLButtonElement>(null);
  const [gigDropdownPos, setGigDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);
  const periodTriggerRef = useRef<HTMLButtonElement>(null);
  const [periodDropdownPos, setPeriodDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  type TransactionFilter = 'all' | 'paid' | 'earned' | 'pending_retraction' | 'refused';
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>('all');
  type CallFilter = 'all' | 'valid' | 'invalid' | 'pending_client';
  const [callFilter, setCallFilter] = useState<CallFilter>('all');
  const callsSectionRef = useRef<HTMLDivElement>(null);
  const transactionsSectionRef = useRef<HTMLDivElement>(null);

  // Earnings & objectifs (RepTransaction-backed)
  const [walletStats, setWalletStats] = useState<{
    availableBalance: number;
    pendingCommissions: number;
    pendingRetraction: number;
    lifetimeEarnings: number;
  }>({ availableBalance: 0, pendingCommissions: 0, pendingRetraction: 0, lifetimeEarnings: 0 });
  const [repLedger, setRepLedger] = useState<RepTransactionRow[]>([]);
  const [overlayCallId, setOverlayCallId] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<RepTransactionRow | null>(null);

  // Calculator / Simulateur
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcCalls, setCalcCalls] = useState(12);
  const [calcConvRate, setCalcConvRate] = useState(10); // %
  const [calcCommission, setCalcCommission] = useState(25); // € per sale
  // REP personal earnings goal
  const [repEarningsGoal, setRepEarningsGoal] = useState(() => Number(localStorage.getItem('harx_earnings_goal') || '0'));
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('0');
  // Reservations cancellation stats period
  const [cancelStatsPeriod, setCancelStatsPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('week');

  useEffect(() => {
    const agentId = profile?._id || localStorage.getItem('agentId') || localStorage.getItem('userId');
    const realUserId = (profile?.userId && typeof profile?.userId === 'object')
      ? profile?.userId?._id
      : (profile?.userId || localStorage.getItem('userId'));

    if (!agentId) return;

    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token') || '';
        const dashboardApi = (import.meta.env.VITE_DASHBOARD_COMPANY_API_URL || 'https://v25dashboardbackend-production.up.railway.app/api').replace(/\/$/, '');
        const gigsQuery = new URLSearchParams({
          agentId: String(agentId),
          ...(realUserId ? { userId: String(realUserId) } : {}),
        });

        const profileGigsPromise = (async () => {
          const fromProp = Array.isArray(profile?.gigs)
            ? profile.gigs.filter((g: any) => g.status === 'enrolled')
            : [];
          if (fromProp.length > 0) return fromProp;
          if (!token) return [];
          try {
            const profileRes = await fetch(repApiUrl(`/profiles/${agentId}`), {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!profileRes.ok) return [];
            const profileData = await profileRes.json();
            return (Array.isArray(profileData.gigs) ? profileData.gigs : [])
              .filter((g: any) => g.status === 'enrolled');
          } catch {
            return [];
          }
        })();

        const matchingGigsPromise = (async () => {
          const matchingUrl = import.meta.env.VITE_MATCHING_API_URL;
          if (!matchingUrl || !token) return [];
          try {
            const res = await fetch(
              `${matchingUrl}/gig-agents/agents/${encodeURIComponent(String(agentId))}/gigs?status=enrolled`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) return [];
            const data = await res.json();
            return Array.isArray(data.gigs) ? data.gigs.map((row: any) => row.gig).filter(Boolean) : [];
          } catch {
            return [];
          }
        })();

        const [callsRes, gigsRes, walletRes, ledgerRes, reservationsRes, profileGigs, matchingGigs] = await Promise.all([
          fetch(`${dashboardApi}/calls?agentId=${encodeURIComponent(String(agentId))}`),
          fetch(`${dashboardApi}/calls/gigs?${gigsQuery.toString()}`),
          api.get(`/escrow/agent/wallet/${agentId}`).catch(() => null),
          repTransactionsApi.list(agentId, { limit: 300 }).catch(() => null),
          slotApi.getReservations(agentId).catch(() => []),
          profileGigsPromise,
          matchingGigsPromise,
        ]);

        const [calls, gigs] = await Promise.all([callsRes.json(), gigsRes.json()]);
        const callsList = Array.isArray(calls.data) ? calls.data : [];
        const ledgerList = ledgerRes?.success && Array.isArray(ledgerRes.data) ? ledgerRes.data : [];

        // Matching enrollments are the source of truth (same as Training / Cockpit).
        // Profile.gigs often still lists deleted/orphan enrollments as "Gig abc123".
        const fromMatching = mergeGigOptions([matchingGigs], i18n.language);
        const fromProfile = mergeGigOptions([profileGigs], i18n.language);
        const enrolledMerged =
          fromMatching.length > 0 ? fromMatching : fromProfile;
        const enrolledIds = new Set(enrolledMerged.map((g) => g._id));

        // Only use calls / ledger / dashboard gigs to enrich titles of enrolled IDs —
        // never to add extra filter rows.
        const titleHints = mergeGigOptions(
          [
            Array.isArray(gigs.data) ? gigs.data : [],
            callsList.map((call: any) => call.gigId).filter(Boolean),
            ledgerList.map((tx: RepTransactionRow) => tx.gig).filter(Boolean),
            ledgerList
              .filter((tx: RepTransactionRow) => tx.gigId)
              .map((tx: RepTransactionRow) => ({
                _id: tx.gigId,
                title: tx.gig?.title,
              })),
          ],
          i18n.language
        ).filter((g) => enrolledIds.has(g._id));

        const mergedGigs = mergeGigOptions([enrolledMerged, titleHints], i18n.language);

        // Resolve leftover "Gig abc123" labels + enrich commission/availability from the gigs API.
        const gigsApi = getGigsApiBase();
        // Fetch details for any GIG that still has a placeholder title OR is missing commission/availability
        const needsDetails = mergedGigs.filter(
          (g) => isPlaceholderGigTitle(g.title, g._id) || !g.commission || !g.availability
        );
        if (needsDetails.length > 0 && gigsApi) {
          const detailsById = new Map<string, { title?: string; commission?: any; availability?: any }>();
          await Promise.all(
            needsDetails.map(async (g) => {
              try {
                const res = await fetch(`${gigsApi}/gigs/${encodeURIComponent(g._id)}/details`);
                if (!res.ok) return;
                const data = await res.json();
                const payload = data?.data || data?.gig || data;
                const title = firstRealGigTitle(
                  g._id,
                  payload?.title,
                  payload?.name,
                  data?.title,
                  data?.name
                );
                detailsById.set(g._id, {
                  title: !isPlaceholderGigTitle(title, g._id) ? title : undefined,
                  commission: payload?.commission || data?.commission,
                  availability: payload?.availability || data?.availability,
                });
              } catch {
                /* ignore per-gig failures */
              }
            })
          );
          if (detailsById.size > 0) {
            for (const g of mergedGigs) {
              const details = detailsById.get(g._id);
              if (!details) continue;
              if (details.title) g.title = details.title;
              if (details.commission && !g.commission) g.commission = details.commission;
              if (details.availability && !g.availability) g.availability = details.availability;
            }
          }
        }

        // Drop enrollments that no longer resolve to a real gig document.
        const liveGigs = mergedGigs
          .filter((g) => !isPlaceholderGigTitle(g.title, g._id))
          .sort((a, b) => a.title.localeCompare(b.title, i18n.language));

        setCallsData(callsList);
        setGigsData(liveGigs);
        setReservationsData(Array.isArray(reservationsRes) ? reservationsRes : []);

        if (walletRes?.data?.success && walletRes.data.data) {
          const w = walletRes.data.data;
          const available = Number(w.availableBalance || 0);
          setWalletStats({
            availableBalance: available,
            pendingCommissions: Number(w.pendingCommissions || 0),
            pendingRetraction: Number(w.pendingRetraction || 0),
            lifetimeEarnings: Number(w.lifetimeEarnings || 0)
          });
          // Sync to localStorage so TopBar shows the correct balance immediately
          localStorage.setItem('rep_available_balance', String(available));
          localStorage.setItem('rep_pending_balance', String(Number(w.pendingCommissions || 0)));
          window.dispatchEvent(new Event('WALLET_BALANCE_UPDATED'));
        }
        if (ledgerRes?.success && Array.isArray(ledgerRes.data)) {
          setRepLedger(ledgerRes.data);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile, i18n.language]);

  const periodStartTs = useMemo(() => getPeriodStart(selectedPeriod), [selectedPeriod]);

  const repSaleLedgerByCallId = useMemo(
    () => indexSaleLedgerByCallId(repLedger),
    [repLedger]
  );

  // Dynamic filter logic — apply gig + period
  const filteredCalls = React.useMemo(() => {
    return callsData.filter(call => {
      if (selectedGigId !== 'all') {
        const cGigId = typeof call.gigId === 'object' ? (call.gigId?._id || call.gigId?.id) : call.gigId;
        if (cGigId !== selectedGigId) return false;
      }
      if (periodStartTs > 0) {
        const ts = new Date(call.createdAt || call.startTime || call.date || 0).getTime();
        if (!ts || ts < periodStartTs) return false;
      }
      return true;
    });
  }, [callsData, selectedGigId, periodStartTs]);

  // Reservations filtered by gig + period (period applies to reservation date)
  const filteredReservations = useMemo(() => {
    return reservationsData.filter((r: any) => {
      if (selectedGigId !== 'all') {
        const rGigId = typeof r.gigId === 'object' ? (r.gigId?._id || r.gigId?.id) : r.gigId;
        if (rGigId !== selectedGigId) return false;
      }
      if (periodStartTs > 0) {
        const dateStr = r.reservationDate || r.date;
        if (!dateStr) return false;
        const ts = new Date(dateStr).getTime();
        if (!ts || ts < periodStartTs) return false;
      }
      return true;
    });
  }, [reservationsData, selectedGigId, periodStartTs]);

  const callActivityDateById = useMemo(() => {
    const map = new Map<string, string>();
    for (const call of callsData) {
      const id = resolveCallRefId(call);
      const date = call.startTime || call.createdAt || call.date;
      if (id && date) map.set(id, date);
    }
    return map;
  }, [callsData]);

  /** Pipeline: Solde disponible → Rétractation → Validation client → Total */
  const earningsPipeline = useMemo(() => {
    const inPeriod = (dateStr: string | undefined) => {
      if (periodStartTs === 0) return true;
      if (!dateStr) return false;
      const ts = new Date(dateStr).getTime();
      return Boolean(ts && ts >= periodStartTs);
    };

    const activeLedger = (row: RepTransactionRow) =>
      row.status === 'earned' || row.status === 'pending_retraction' || row.status === 'paid';

    const ledgerForPipeline = dedupeSaleLedgerRows(repLedger);

    const ledgerCallIds = new Set<string>();
    ledgerForPipeline.forEach((row) => {
      if (!activeLedger(row)) return;
      const id = normalizeRecordId(row.callId) || normalizeRecordId(row.call?._id);
      if (id) ledgerCallIds.add(id);
    });

    const bookedTxSourceIds = new Set(
      ledgerForPipeline
        .filter((row) => activeLedger(row) && row.type === 'transaction' && row.sourceId)
        .map((row) => String(row.sourceId))
    );

    const periodDate = (row: RepTransactionRow) =>
      resolveLedgerPeriodDate(row, callActivityDateById);

    let clientValidationAmount = 0;
    let clientValidationCount = 0;
    const pendingClientValidationCallIds = new Set<string>();

    filteredCalls.forEach((call) => {
      const callId = resolveCallRefId(call);
      if (!callId) return;

      const pending = resolveClientValidationPendingAmount(
        call,
        ledgerCallIds,
        bookedTxSourceIds,
        callId
      );

      if (pending > 0) {
        clientValidationAmount += pending;
        clientValidationCount += 1;
        pendingClientValidationCallIds.add(callId);
      }
    });

    let retractionAmount = 0;
    let retractionCount = 0;

    ledgerForPipeline.forEach((row) => {
      if (row.status !== 'pending_retraction' || row.type !== 'transaction') return;
      const activityDate = periodDate(row);
      if (!inPeriod(activityDate)) return;
      if (selectedGigId !== 'all') {
        const rGigId = typeof row.gigId === 'object' ? (row.gigId as any)?._id : row.gigId;
        if (rGigId !== selectedGigId) return;
      }
      retractionAmount += row.repShare || 0;
      retractionCount += 1;
    });

    const ledgerBreakdown = computeValidatedLedgerBreakdown(ledgerForPipeline, {
      inPeriod,
      activityDate: periodDate,
      selectedGigId: selectedGigId !== 'all' ? selectedGigId : undefined,
    });

    const earnedInPeriod = ledgerForPipeline.reduce((sum, row) => {
      if (row.status !== 'earned') return sum;
      if (selectedGigId !== 'all') {
        const rGigId = typeof row.gigId === 'object' ? (row.gigId as any)?._id : row.gigId;
        if (rGigId !== selectedGigId) return sum;
      }
      if (!inPeriod(periodDate(row))) return sum;
      return sum + (row.repShare || 0);
    }, 0);

    const periodStartBalance = Math.max(0, walletStats.availableBalance - earnedInPeriod);
    /** Total = départ + gains validés + rétractation + validation en attente (buckets disjoints). */
    const totalGains =
      periodStartBalance +
      ledgerBreakdown.validatedInPeriod +
      retractionAmount +
      clientValidationAmount;

    return {
      availableBalance: walletStats.availableBalance,
      periodStartBalance,
      earnedInPeriod,
      periodStartTitle: getPeriodStartTitle(selectedPeriod),
      periodStartDateLabel: getPeriodStartDateLabel(selectedPeriod),
      periodStartHint: getPeriodStartHint(selectedPeriod),
      retractionAmount,
      retractionCount,
      clientValidationAmount,
      clientValidationCount,
      totalGains,
      ...ledgerBreakdown,
      pendingClientValidationCallIds,
    };
  }, [
    filteredCalls,
    repLedger,
    callActivityDateById,
    periodStartTs,
    selectedPeriod,
    selectedGigId,
    walletStats.availableBalance,
    t,
    dateLocale,
  ]);

  const focusClientValidationPending = () => {
    setCallFilter('pending_client');
    window.setTimeout(() => {
      callsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const focusValidatedEarnings = () => {
    setTransactionFilter('earned');
    window.setTimeout(() => {
      transactionsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const focusRetractionTransactions = () => {
    setTransactionFilter('pending_retraction');
    window.setTimeout(() => {
      transactionsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  // Reservation statistics (work the rep has booked)
  const reservationStats = useMemo(() => {
    const nowTs = Date.now();
    let total = 0;
    let upcoming = 0;
    let completed = 0;
    let cancelled = 0;
    let noShow = 0;
    let scheduledHours = 0;
    let workedHours = 0;

    filteredReservations.forEach((r: any) => {
      total += 1;
      const dateStr = r.reservationDate || r.date;
      const ts = dateStr ? new Date(dateStr).getTime() : 0;
      const duration = Number(r.duration || 0);
      scheduledHours += duration;

      if (r.status === 'cancelled') {
        cancelled += 1;
        return;
      }

      if (ts && ts > nowTs) {
        upcoming += 1;
        return;
      }

      // Past reservation
      if (r.attended === true) {
        completed += 1;
        workedHours += duration;
      } else if (r.attended === false) {
        noShow += 1;
      } else {
        // No explicit attendance flag — assume completed
        completed += 1;
        workedHours += duration;
      }
    });

    const pastCount = completed + noShow;
    const attendanceRate = pastCount > 0 ? Math.round((completed / pastCount) * 100) : 0;

    return {
      total,
      upcoming,
      completed,
      cancelled,
      noShow,
      scheduledHours: Math.round(scheduledHours * 10) / 10,
      workedHours: Math.round(workedHours * 10) / 10,
      attendanceRate,
    };
  }, [filteredReservations]);

  // Next 3 upcoming reservations (sorted ascending)
  const upcomingReservations = useMemo(() => {
    const nowTs = Date.now();
    return [...filteredReservations]
      .filter((r: any) => {
        if (r.status === 'cancelled') return false;
        const dateStr = r.reservationDate || r.date;
        const ts = dateStr ? new Date(dateStr).getTime() : 0;
        return ts > nowTs;
      })
      .sort((a: any, b: any) => {
        const ta = new Date(a.reservationDate || a.date).getTime();
        const tb = new Date(b.reservationDate || b.date).getTime();
        return ta - tb;
      })
      .slice(0, 3);
  }, [filteredReservations]);

  // Transactions filtered by gig + period
  const filteredTransactions = useMemo(() => {
    return dedupeSaleLedgerRows(repLedger).filter((row: any) => {
      if (selectedGigId !== 'all') {
        const rGigId = typeof row.gigId === 'object' ? (row.gigId?._id || row.gigId?.id) : row.gigId;
        if (rGigId !== selectedGigId) return false;
      }
      if (periodStartTs > 0) {
        const ts = new Date(row.createdAt).getTime();
        if (!ts || ts < periodStartTs) return false;
      }
      return true;
    });
  }, [repLedger, selectedGigId, periodStartTs]);

  // Transaction breakdown by status (counts + totals)
  const transactionStats = useMemo(() => {
    const acc = {
      all: { count: 0, total: 0 },
      paid: { count: 0, total: 0 },
      earned: { count: 0, total: 0 },
      pending_retraction: { count: 0, total: 0 },
      refused: { count: 0, total: 0 },
    };
    filteredTransactions.forEach((row: RepTransactionRow) => {
      const share = row.repShare || 0;
      acc.all.count += 1;
      acc.all.total += share;
      if (row.status === 'paid') {
        acc.paid.count += 1;
        acc.paid.total += share;
      } else if (row.status === 'earned') {
        acc.earned.count += 1;
        acc.earned.total += share;
      } else if (row.status === 'pending_retraction') {
        acc.pending_retraction.count += 1;
        acc.pending_retraction.total += share;
      } else if (row.status === 'refused') {
        acc.refused.count += 1;
        acc.refused.total += share;
      }
    });
    return acc;
  }, [filteredTransactions]);

  // Transactions list (filtered + sorted desc)
  const visibleTransactions = useMemo(() => {
    const list = filteredTransactions.filter((row: RepTransactionRow) => {
      if (transactionFilter === 'all') return true;
      return row.status === transactionFilter;
    });
    return [...list]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  }, [filteredTransactions, transactionFilter]);

  // Call validation breakdown + visible list
  const callStats = useMemo(() => {
    const acc = { all: 0, valid: 0, invalid: 0, pending_client: 0 };
    filteredCalls.forEach((call: any) => {
      acc.all += 1;
      const isValid = call.valid === true || call.validByAI === true;
      if (isValid) acc.valid += 1;
      else acc.invalid += 1;
      const callId = resolveCallRefId(call);
      if (callId && earningsPipeline.pendingClientValidationCallIds.has(callId)) {
        acc.pending_client += 1;
      }
    });
    return acc;
  }, [filteredCalls, earningsPipeline.pendingClientValidationCallIds]);

  const visibleCalls = useMemo(() => {
    const list = filteredCalls.filter((call: any) => {
      if (callFilter === 'pending_client') {
        const callId = resolveCallRefId(call);
        return callId ? earningsPipeline.pendingClientValidationCallIds.has(callId) : false;
      }
      if (callFilter === 'all') return true;
      const isValid = call.valid === true || call.validByAI === true;
      return callFilter === 'valid' ? isValid : !isValid;
    });
    return [...list]
      .sort((a: any, b: any) => {
        const ta = new Date(a.createdAt || a.startTime || 0).getTime();
        const tb = new Date(b.createdAt || b.startTime || 0).getTime();
        return tb - ta;
      })
      .slice(0, callFilter === 'pending_client' ? 20 : 8);
  }, [filteredCalls, callFilter, earningsPipeline.pendingClientValidationCallIds]);

  const goals = useMemo(() => {
    const startTs = getPeriodStart(goalsPeriod);
    const targets = GOAL_TARGETS[goalsPeriod];

    const callsCurrent = callsData.filter((c: any) => {
      if (selectedGigId !== 'all') {
        const cGigId = typeof c.gigId === 'object' ? (c.gigId?._id || c.gigId?.id) : c.gigId;
        if (cGigId !== selectedGigId) return false;
      }
      const ts = new Date(c.createdAt || c.startTime || c.date || 0).getTime();
      return ts >= startTs;
    }).length;

    const sessionsCurrent = reservationsData.filter((r: any) => {
      if (selectedGigId !== 'all') {
        const rGigId = typeof r.gigId === 'object' ? (r.gigId?._id || r.gigId?.id) : r.gigId;
        if (rGigId !== selectedGigId) return false;
      }
      if (r.status === 'cancelled') return false;
      const ts = new Date(r.reservationDate || r.date || 0).getTime();
      return ts >= startTs;
    }).length;

    const gig = selectedGigId === 'all'
      ? null
      : gigsData.find((g) => (g._id || g.id) === selectedGigId);
    const monthlyBonusTarget = gig?.commission?.minimumVolume || gig?.commission?.bonusMinimumCalls || 0;
    const bonusTarget = monthlyBonusTarget > 0
      ? Math.max(1, Math.round(monthlyBonusTarget * targets.bonusScale))
      : 0;
    const bonusGross = gig?.commission?.bonusAmount || gig?.rewardBonus || 0;
    const bonusAmount = Math.round(bonusGross * 0.7 * 100) / 100;

    const pct = (current: number, target: number) =>
      target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

    return {
      calls: {
        current: callsCurrent,
        target: targets.calls,
        progressPct: pct(callsCurrent, targets.calls),
      },
      sessions: {
        current: sessionsCurrent,
        target: targets.sessions,
        progressPct: pct(sessionsCurrent, targets.sessions),
      },
      bonus: {
        label: gig?.title || t('dashboard.home.allGigs'),
        current: callsCurrent,
        target: bonusTarget,
        bonusAmount,
        progressPct: pct(callsCurrent, bonusTarget),
      },
    };
  }, [callsData, reservationsData, selectedGigId, gigsData, goalsPeriod, t]);

  // Company targets from GIG contract
  const companyTargets = useMemo(() => {
    const gig = selectedGigId === 'all' ? null : gigsData.find((g) => g._id === selectedGigId);
    const empty = { hoursTarget: 0, transactionTarget: 0, commissionPerCall: 0, transactionCommission: 0, volumeUnit: 'Transactions', volumePeriod: 'Monthly' };
    if (!gig) return empty;
    const g = gig as any;

    // Heures cibles : dans availability.minimumHours (mensuel en priorité)
    const hoursTarget = Number(
      g.availability?.minimumHours?.monthly ||
      (g.availability?.minimumHours?.weekly ? g.availability.minimumHours.weekly * 4 : 0) ||
      (g.availability?.minimumHours?.daily ? g.availability.minimumHours.daily * 20 : 0) ||
      0
    );

    // Volume min : commission.minimumVolume.amount (c'est un string dans le schéma)
    const transactionTarget = Number(g.commission?.minimumVolume?.amount || 0);

    // Commissions
    const commissionPerCall = Number(g.commission?.commission_per_call || 0);
    const transactionCommission = Number(g.commission?.transactionCommission || 0);

    return {
      hoursTarget,
      transactionTarget,
      commissionPerCall,
      transactionCommission,
      volumeUnit: String(g.commission?.minimumVolume?.unit || 'Transactions'),
      volumePeriod: String(g.commission?.minimumVolume?.period || 'Monthly'),
    };
  }, [selectedGigId, gigsData]);

  // Calculator result
  const calcResult = useMemo(() => {
    const transactions = Math.round(calcCalls * (calcConvRate / 100));
    const earnings = transactions * calcCommission;
    return { transactions, earnings };
  }, [calcCalls, calcConvRate, calcCommission]);

  // Cancel rate from reservations
  const cancelRate = useMemo(() => {
    if (reservationStats.total === 0) return null;
    return Math.round((reservationStats.cancelled / reservationStats.total) * 100);
  }, [reservationStats]);

  // Earnings goal progress
  const earningsGoalProgress = useMemo(() => {
    if (repEarningsGoal <= 0) return 0;
    return Math.min(100, Math.round((earningsPipeline.earnedInPeriod / repEarningsGoal) * 100));
  }, [earningsPipeline.earnedInPeriod, repEarningsGoal]);

  const goalsPeriodLabels: Record<GoalsPeriod, string> = {
    today: t('dashboard.home.goals.periodDay'),
    week: t('dashboard.home.goals.periodWeek'),
    month: t('dashboard.home.goals.periodMonth'),
    quarter: t('dashboard.home.goals.periodQuarter'),
    year: t('dashboard.home.goals.periodYear'),
  };

  const displayName = profile?.personalInfo?.name ? profile.personalInfo.name.split(' ')[0] : t('dashboard.home.defaultUser');

  const selectedGigLabel = useMemo(() => {
    if (selectedGigId === 'all') return t('dashboard.home.allGigs');
    return gigsData.find((g) => g._id === selectedGigId)?.title || t('dashboard.home.gigFallback');
  }, [selectedGigId, gigsData, t]);

  const selectedPeriodLabel = useMemo(
    () => PERIOD_OPTIONS.find((p) => p.key === selectedPeriod)?.label || t('dashboard.home.periods.month'),
    [selectedPeriod, PERIOD_OPTIONS, t]
  );

  const readGigDropdownPos = () => {
    const rect = gigTriggerRef.current!.getBoundingClientRect();
    return {
      top: rect.bottom + 8,
      left: rect.left,
      width: Math.max(rect.width, 280),
    };
  };

  const readPeriodDropdownPos = () => {
    const rect = periodTriggerRef.current!.getBoundingClientRect();
    return {
      top: rect.bottom + 8,
      left: rect.left,
      width: Math.max(rect.width, 200),
    };
  };

  const closeGigDropdown = () => {
    setIsGigDropdownOpen(false);
    setGigDropdownPos(null);
  };

  const closePeriodDropdown = () => {
    setIsPeriodDropdownOpen(false);
    setPeriodDropdownPos(null);
  };

  // Sync simulateur avec les données réelles GIG quand on change de GIG
  useEffect(() => {
    if (companyTargets.transactionCommission > 0) {
      setCalcCommission(companyTargets.transactionCommission);
    } else if (companyTargets.commissionPerCall > 0) {
      setCalcCommission(companyTargets.commissionPerCall);
    }
  }, [companyTargets.transactionCommission, companyTargets.commissionPerCall]);

  const goToProduction = () => {
    const gigId = selectedGigId !== 'all' ? selectedGigId : '';
    if (gigId) persistActiveGigId(gigId);
    navigate(withActiveGig('/workspace', gigId || undefined));
  };

  const openGigDropdown = () => {
    if (!gigTriggerRef.current) return;
    closePeriodDropdown();
    setGigDropdownPos(readGigDropdownPos());
    setIsGigDropdownOpen(true);
  };

  const openPeriodDropdown = () => {
    if (!periodTriggerRef.current) return;
    closeGigDropdown();
    setPeriodDropdownPos(readPeriodDropdownPos());
    setIsPeriodDropdownOpen(true);
  };

  const toggleGigDropdown = () => {
    if (isGigDropdownOpen) closeGigDropdown();
    else openGigDropdown();
  };

  const togglePeriodDropdown = () => {
    if (isPeriodDropdownOpen) closePeriodDropdown();
    else openPeriodDropdown();
  };

  const openCallDetails = (call: any) => {
    const callId = resolveCallRefId(call);
    if (callId) setOverlayCallId(callId);
  };

  const openTransactionDetails = (tx: RepTransactionRow) => {
    const callId = resolveTransactionCallId(tx);
    if (callId) {
      setOverlayCallId(callId);
      return;
    }
    setSelectedTransaction(tx);
  };

  useLayoutEffect(() => {
    if (!isGigDropdownOpen || !gigTriggerRef.current) return;

    const updatePosition = () => {
      if (!gigTriggerRef.current) return;
      setGigDropdownPos(readGigDropdownPos());
    };

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isGigDropdownOpen]);

  useLayoutEffect(() => {
    if (!isPeriodDropdownOpen || !periodTriggerRef.current) return;

    const updatePosition = () => {
      if (!periodTriggerRef.current) return;
      setPeriodDropdownPos(readPeriodDropdownPos());
    };

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isPeriodDropdownOpen]);

  if (isCallCenterStaff()) {
    return <CallCenterAgentHome displayName={displayName} />;
  }

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-700">
      <div className="flex justify-center">
        <button
          type="button"
          onClick={goToProduction}
          className="group relative w-full overflow-hidden rounded-[28px] bg-gradient-harx px-5 py-5 sm:px-8 sm:py-6 text-white shadow-2xl shadow-harx-500/35 hover:shadow-harx-500/50 hover:-translate-y-0.5 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-harx-400/40"
        >
          <div className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-white/20 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-8 h-28 w-28 rounded-full bg-black/10 blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-4 min-w-0">
              <div className="h-16 w-16 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/25 group-hover:scale-105 transition-transform shadow-inner">
                <Rocket size={30} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/80">
                  {t('dashboard.home.goLive.eyebrow')}
                </p>
                <p className="text-2xl sm:text-3xl font-black uppercase tracking-tight leading-none mt-1">
                  {t('dashboard.home.goLive.title')}
                </p>
                <p className="text-sm font-semibold text-white/90 mt-2">
                  {t('dashboard.home.goLive.subtitle')}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 rounded-2xl bg-white text-harx-600 px-6 py-3.5 text-xs font-black uppercase tracking-widest shadow-lg group-hover:bg-white/95 shrink-0">
              {t('dashboard.home.goLive.cta')}
              <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </button>
      </div>

      {/* Dynamic Filter Header */}
      <div className="flex flex-col gap-4 bg-white/40 backdrop-blur-xl rounded-[2rem] p-6 border border-white/60 shadow-xl shadow-slate-200/10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              {t('dashboard.home.greeting', { name: displayName })}
            </h1>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
              {t('dashboard.home.subtitle')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="relative flex items-center gap-2.5">
              <Briefcase size={16} className="text-purple-600 animate-pulse" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('dashboard.home.gigLabel')}</span>
              <div className="relative w-full min-w-0 sm:min-w-[220px] sm:max-w-[320px]">
                <button
                  ref={gigTriggerRef}
                  type="button"
                  onClick={toggleGigDropdown}
                  className="w-full flex items-center justify-between gap-2 bg-white/80 border border-slate-100 hover:border-purple-200 px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-700 shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all duration-300"
                >
                  <span className="truncate text-left normal-case">{selectedGigLabel}</span>
                  <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-300 ${isGigDropdownOpen ? 'rotate-180 text-purple-500' : ''}`} />
                </button>

                {isGigDropdownOpen && gigDropdownPos && createPortal(
                  <>
                    <div
                      className="fixed inset-0 z-[9998]"
                      onClick={closeGigDropdown}
                      aria-hidden
                    />
                    <div
                      className="fixed z-[9999] bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-300/30 p-2 max-h-[min(320px,calc(100vh-6rem))] overflow-y-auto"
                      style={{
                        top: gigDropdownPos.top,
                        left: gigDropdownPos.left,
                        minWidth: gigDropdownPos.width,
                        maxWidth: 'min(420px, calc(100vw - 2rem))',
                      }}
                      role="listbox"
                      aria-label={t('dashboard.home.filterByGig')}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGigId('all');
                          closeGigDropdown();
                        }}
                        className="block w-full text-left px-1 py-0.5"
                        role="option"
                        aria-selected={selectedGigId === 'all'}
                      >
                        <span
                          className={`inline-flex items-center gap-2 max-w-full px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all ${
                            selectedGigId === 'all'
                              ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-200/80 shadow-sm'
                              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selectedGigId === 'all' ? 'bg-purple-500' : 'bg-slate-300'}`} />
                          {t('dashboard.home.allGigs')}
                        </span>
                      </button>

                      {gigsData.length > 0 && <div className="h-px bg-slate-100 my-1.5 mx-2" />}

                      {gigsData.map((gig) => {
                        const gigId = gig._id || gig.id;
                        const isSelected = selectedGigId === gigId;
                        return (
                          <button
                            key={gigId}
                            type="button"
                            onClick={() => {
                              setSelectedGigId(gigId);
                              closeGigDropdown();
                            }}
                            className="block w-full text-left px-1 py-0.5"
                            role="option"
                            aria-selected={isSelected}
                          >
                            <span
                              className={`inline-flex items-start gap-2 max-w-full px-3 py-2 rounded-xl text-[11px] font-semibold leading-snug normal-case transition-all ${
                                isSelected
                                  ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-200/80 shadow-sm'
                                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${isSelected ? 'bg-purple-500' : 'bg-slate-300'}`} />
                              <span className="text-left">{gig.title}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </>,
                  document.body
                )}
              </div>
            </div>

            <div className="relative flex items-center gap-2.5">
              <CalendarDays size={16} className="text-blue-600" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('dashboard.home.periodLabel')}</span>
              <div className="relative w-full min-w-0 sm:min-w-[180px] sm:max-w-[240px]">
                <button
                  ref={periodTriggerRef}
                  type="button"
                  onClick={togglePeriodDropdown}
                  className="w-full flex items-center justify-between gap-2 bg-white/80 border border-slate-100 hover:border-blue-200 px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-700 shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                >
                  <span className="truncate text-left">{selectedPeriodLabel}</span>
                  <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-300 ${isPeriodDropdownOpen ? 'rotate-180 text-blue-500' : ''}`} />
                </button>

                {isPeriodDropdownOpen && periodDropdownPos && createPortal(
                  <>
                    <div
                      className="fixed inset-0 z-[9998]"
                      onClick={closePeriodDropdown}
                      aria-hidden
                    />
                    <div
                      className="fixed z-[9999] bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-300/30 p-2 max-h-[min(320px,calc(100vh-6rem))] overflow-y-auto"
                      style={{
                        top: periodDropdownPos.top,
                        left: periodDropdownPos.left,
                        minWidth: periodDropdownPos.width,
                        maxWidth: 'min(320px, calc(100vw - 2rem))',
                      }}
                      role="listbox"
                      aria-label={t('dashboard.home.filterByPeriod')}
                    >
                      {PERIOD_OPTIONS.map((opt) => {
                        const isSelected = selectedPeriod === opt.key;
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => {
                              setSelectedPeriod(opt.key);
                              closePeriodDropdown();
                            }}
                            className="block w-full text-left px-1 py-0.5"
                            role="option"
                            aria-selected={isSelected}
                          >
                            <span
                              className={`inline-flex items-center gap-2 max-w-full px-3 py-2 rounded-xl text-[11px] font-semibold transition-all ${
                                isSelected
                                  ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200/80 shadow-sm'
                                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? 'bg-blue-500' : 'bg-slate-300'}`} />
                              {opt.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </>,
                  document.body
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gains pipeline */}
      <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-3">
        {/* 1. Solde au début de la période */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm min-h-[118px] flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
              {earningsPipeline.periodStartTitle}
            </p>
            <div className="h-8 w-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
              <CalendarDays size={14} />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900 tracking-tight mt-2">
            {fmtMoney(earningsPipeline.periodStartBalance)} €
          </p>
          {earningsPipeline.periodStartDateLabel && (
            <p className="text-[10px] text-slate-400 mt-auto pt-2">
              {earningsPipeline.periodStartDateLabel}
            </p>
          )}
        </div>

        {/* 2. Solde disponible */}
        <div className="rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-white to-emerald-50/50 p-4 shadow-sm min-h-[118px] flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
              {t('dashboard.home.pipeline.availableBalance')}
            </p>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <WalletIcon size={14} />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900 tracking-tight mt-2">
            {fmtMoney(earningsPipeline.availableBalance)} €
          </p>
          <p className="text-[10px] font-semibold text-emerald-600 mt-auto pt-2">
            {t('dashboard.home.pipeline.readyToWithdraw')}
          </p>
        </div>

        {/* 3. Gains validés */}
        <button
          type="button"
          onClick={focusValidatedEarnings}
          disabled={earningsPipeline.validatedInPeriod === 0}
          className={`rounded-2xl border p-4 shadow-sm min-h-[118px] flex flex-col text-left transition-all ${
            transactionFilter === 'earned'
              ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-400/30'
              : 'border-emerald-200/60 bg-gradient-to-br from-white to-emerald-50/40 hover:border-emerald-300 hover:shadow-md'
          } ${earningsPipeline.validatedInPeriod === 0 ? 'opacity-80 cursor-default' : 'cursor-pointer'}`}
          aria-label={t('dashboard.home.pipeline.ariaValidated')}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 leading-tight">
              {t('dashboard.home.pipeline.validatedEarnings')}
            </p>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <ShieldCheck size={14} />
            </div>
          </div>
          <p className="text-xl font-black text-emerald-700 tracking-tight mt-2">
            +{fmtMoney(earningsPipeline.validatedInPeriod)} €
          </p>
          <p className="text-[10px] text-emerald-600/80 mt-auto pt-2 truncate">
            {t('dashboard.home.pipeline.calls', { count: earningsPipeline.validatedCallsCount })}
            {' · '}
            {t('dashboard.home.pipeline.sales', { count: earningsPipeline.validatedSalesCount })}
          </p>
        </button>

        {/* 4. Rétractation */}
        <button
          type="button"
          onClick={focusRetractionTransactions}
          disabled={earningsPipeline.retractionCount === 0}
          className={`rounded-2xl border p-4 shadow-sm min-h-[118px] flex flex-col text-left transition-all ${
            transactionFilter === 'pending_retraction'
              ? 'border-orange-400 bg-orange-50 ring-2 ring-orange-400/30'
              : 'border-orange-200/60 bg-gradient-to-br from-white to-orange-50/40 hover:border-orange-300 hover:shadow-md'
          } ${earningsPipeline.retractionCount === 0 ? 'opacity-80 cursor-default' : 'cursor-pointer'}`}
          aria-label={t('dashboard.home.pipeline.ariaRetraction')}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-700 leading-tight">
              {t('dashboard.home.pipeline.retraction')}
            </p>
            <div className="h-8 w-8 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0">
              <RotateCcw size={14} />
            </div>
          </div>
          <p className="text-xl font-black text-orange-700 tracking-tight mt-2">
            {earningsPipeline.retractionAmount > 0 ? '+' : ''}{fmtMoney(earningsPipeline.retractionAmount)} €
          </p>
          <p className="text-[10px] text-orange-600/80 mt-auto pt-2">
            {earningsPipeline.retractionCount > 0
              ? t('dashboard.home.pipeline.salesRetraction', { count: earningsPipeline.retractionCount })
              : t('dashboard.home.pipeline.noSales')}
          </p>
        </button>

        {/* 5. Validation client */}
        <button
          type="button"
          onClick={focusClientValidationPending}
          disabled={earningsPipeline.clientValidationCount === 0}
          className={`rounded-2xl border p-4 shadow-sm min-h-[118px] flex flex-col text-left transition-all ${
            callFilter === 'pending_client'
              ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-400/30'
              : 'border-amber-200/60 bg-gradient-to-br from-white to-amber-50/40 hover:border-amber-300 hover:shadow-md'
          } ${earningsPipeline.clientValidationCount === 0 ? 'opacity-80 cursor-default' : 'cursor-pointer'}`}
          aria-label={t('dashboard.home.pipeline.ariaClientValidation')}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 leading-tight">
              {t('dashboard.home.pipeline.clientValidation')}
            </p>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Building2 size={14} />
            </div>
          </div>
          <p className="text-xl font-black text-amber-700 tracking-tight mt-2">
            +{fmtMoney(earningsPipeline.clientValidationAmount)} €
          </p>
          <p className="text-[10px] text-amber-600/80 mt-auto pt-2">
            {earningsPipeline.clientValidationCount > 0
              ? t('dashboard.home.pipeline.pendingCount', { count: earningsPipeline.clientValidationCount })
              : t('dashboard.home.pipeline.nothingPending')}
          </p>
        </button>

        {/* 6. Total période */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-lg min-h-[118px] flex flex-col relative overflow-hidden col-span-2 md:col-span-1">
          <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-harx-500/25 blur-2xl pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/50 leading-tight">
              {t('dashboard.home.pipeline.periodTotal')}
            </p>
            <div className="h-8 w-8 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0">
              <Trophy size={14} />
            </div>
          </div>
          <p className="relative z-10 text-xl font-black text-white tracking-tight mt-2">
            {fmtMoney(earningsPipeline.totalGains)} €
          </p>
        </div>
      </div>

      {/* Objectifs — pavé unique consolidé avec objectifs company + objectif REP + simulateur */}
      <div className="bg-slate-950 rounded-[32px] border border-slate-800 shadow-2xl shadow-slate-900/40 p-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-harx-500/20 blur-3xl -mr-24 -mt-24 pointer-events-none" />
        <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl -ml-16 -mb-16 pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap relative z-10 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-2xl bg-harx-500/20 text-harx-400 flex items-center justify-center shrink-0">
              <Target size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-black text-white tracking-tight uppercase">{t('dashboard.home.goals.title')}</h2>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-0.5 truncate">
                {goals.bonus.label}
              </p>
            </div>
          </div>
          {/* Sélecteur période */}
          <div className="flex flex-wrap gap-1 shrink-0">
            {(GOALS_PERIODS as GoalsPeriod[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setGoalsPeriod(key)}
                className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider transition ${
                  goalsPeriod === key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'bg-white/10 text-white/55 hover:bg-white/20 hover:text-white'
                }`}
              >
                {goalsPeriodLabels[key]}
              </button>
            ))}
          </div>
        </div>

        <div className="relative z-10 space-y-4">

          {/* ── Section : Objectifs Company (depuis contrat GIG) ── */}
          {(companyTargets.hoursTarget > 0 || companyTargets.transactionTarget > 0) && (
            <>
              <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Objectifs company · GIG</p>
              {companyTargets.hoursTarget > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-blue-400" />
                      <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Heures travaillées</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white font-black tracking-tighter">
                        {reservationStats.workedHours}h<span className="text-white/40 font-bold text-sm">/{companyTargets.hoursTarget}h</span>
                      </span>
                      <span className={`text-[10px] font-black min-w-[32px] text-right ${
                        companyTargets.hoursTarget > 0 && reservationStats.workedHours >= companyTargets.hoursTarget ? 'text-emerald-400' : 'text-white/60'
                      }`}>
                        {companyTargets.hoursTarget > 0 ? `${Math.min(100, Math.round((reservationStats.workedHours / companyTargets.hoursTarget) * 100))}%` : '—'}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${
                      companyTargets.hoursTarget > 0 && reservationStats.workedHours >= companyTargets.hoursTarget
                        ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                        : 'bg-gradient-to-r from-blue-400 to-blue-500'
                    }`} style={{ width: `${companyTargets.hoursTarget > 0 ? Math.min(100, Math.round((reservationStats.workedHours / companyTargets.hoursTarget) * 100)) : 0}%` }} />
                  </div>
                </div>
              )}
              {companyTargets.transactionTarget > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap size={13} className="text-amber-400" />
                      <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">
                        {companyTargets.volumeUnit} · {companyTargets.volumePeriod}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white font-black tracking-tighter">
                        {earningsPipeline.validatedSalesCount}<span className="text-white/40 font-bold text-sm">/{companyTargets.transactionTarget}</span>
                      </span>
                      <span className={`text-[10px] font-black min-w-[32px] text-right ${
                        earningsPipeline.validatedSalesCount >= companyTargets.transactionTarget ? 'text-emerald-400' : 'text-amber-400/80'
                      }`}>
                        {`${Math.min(100, Math.round((earningsPipeline.validatedSalesCount / companyTargets.transactionTarget) * 100))}%`}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${
                      earningsPipeline.validatedSalesCount >= companyTargets.transactionTarget
                        ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                        : 'bg-gradient-to-r from-amber-400 to-orange-400'
                    }`} style={{ width: `${Math.min(100, Math.round((earningsPipeline.validatedSalesCount / companyTargets.transactionTarget) * 100))}%` }} />
                  </div>
                </div>
              )}
              <div className="h-px bg-white/10" />
            </>
          )}

          {/* ── Section : Objectifs REP (appels + sessions) ── */}
          <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Mes objectifs activité</p>

          {/* Appels */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone size={13} className="text-cyan-400" />
                <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">{t('dashboard.home.goals.callsTitle')}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white font-black tracking-tighter">
                  {goals.calls.current}<span className="text-white/40 font-bold text-sm">/{goals.calls.target}</span>
                </span>
                <span className={`text-[10px] font-black min-w-[32px] text-right ${goals.calls.progressPct >= 100 ? 'text-emerald-400' : 'text-white/60'}`}>
                  {goals.calls.progressPct}%
                </span>
              </div>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-700 ease-out rounded-full ${
                goals.calls.progressPct >= 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-cyan-400 to-cyan-500'
              }`} style={{ width: `${goals.calls.progressPct}%` }} />
            </div>
          </div>

          {/* Sessions */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarCheck size={13} className="text-violet-400" />
                <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">{t('dashboard.home.goals.sessionsTitle')}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white font-black tracking-tighter">
                  {goals.sessions.current}<span className="text-white/40 font-bold text-sm">/{goals.sessions.target}</span>
                </span>
                <span className={`text-[10px] font-black min-w-[32px] text-right ${goals.sessions.progressPct >= 100 ? 'text-emerald-400' : 'text-white/60'}`}>
                  {goals.sessions.progressPct >= 100 ? <span className="inline-flex items-center gap-0.5"><CheckCircle2 size={9} />{goals.sessions.progressPct}%</span> : `${goals.sessions.progressPct}%`}
                </span>
              </div>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-700 ease-out rounded-full ${
                goals.sessions.progressPct >= 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-violet-400 to-violet-500'
              }`} style={{ width: `${goals.sessions.progressPct}%` }} />
            </div>
          </div>

          {/* Bonus GIG si disponible */}
          {goals.bonus.target > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame size={13} className="text-amber-400" />
                  <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">{t('dashboard.home.goals.bonusTitle')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white font-black tracking-tighter">
                    {goals.bonus.current}<span className="text-white/40 font-bold text-sm">/{goals.bonus.target}</span>
                  </span>
                  <span className={`text-[10px] font-black min-w-[32px] text-right ${goals.bonus.progressPct >= 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {goals.bonus.progressPct >= 100 ? '✓' : `${goals.bonus.progressPct}%`}
                  </span>
                </div>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-1000 ease-out rounded-full ${
                  goals.bonus.progressPct >= 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-amber-400 to-orange-500'
                }`} style={{ width: `${goals.bonus.progressPct}%` }} />
              </div>
              <p className="text-[10px] font-black text-emerald-400 tracking-tight">
                {t('dashboard.home.gigGoal.bonusReward', { amount: goals.bonus.bonusAmount.toFixed(2) })}
              </p>
            </div>
          )}

          {/* ── Objectif gains personnalisé du REP ── */}
          <div className="h-px bg-white/10" />
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Trophy size={13} className="text-harx-400" />
                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Mon objectif gains</span>
              </div>
              {!editingGoal ? (
                <button
                  type="button"
                  onClick={() => { setGoalInput(String(repEarningsGoal)); setEditingGoal(true); }}
                  className="p-1 rounded-lg bg-white/10 text-white/50 hover:text-white hover:bg-white/20 transition"
                >
                  <Pencil size={11} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const v = Math.max(0, Number(goalInput) || 0);
                    setRepEarningsGoal(v);
                    localStorage.setItem('harx_earnings_goal', String(v));
                    setEditingGoal(false);
                  }}
                  className="p-1 rounded-lg bg-emerald-500/30 text-emerald-400 hover:bg-emerald-500/50 transition"
                >
                  <Check size={11} />
                </button>
              )}
            </div>
            {editingGoal ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { const v = Math.max(0, Number(goalInput) || 0); setRepEarningsGoal(v); localStorage.setItem('harx_earnings_goal', String(v)); setEditingGoal(false); } }}
                  className="flex-1 bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 text-sm font-black focus:outline-none focus:border-harx-400"
                  placeholder="Ex: 1000"
                  autoFocus
                />
                <span className="text-white/50 text-sm font-bold">€</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-black text-white tracking-tighter">
                    {fmtMoney(earningsPipeline.earnedInPeriod)} €
                  </span>
                  {repEarningsGoal > 0 && (
                    <span className="text-[11px] font-bold text-white/40">/ {fmtMoney(repEarningsGoal)} € objectif</span>
                  )}
                </div>
                {repEarningsGoal > 0 ? (
                  <>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          earningsGoalProgress >= 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-harx-400 to-harx-500'
                        }`}
                        style={{ width: `${earningsGoalProgress}%` }}
                      />
                    </div>
                    <p className="text-[10px] font-bold text-white/40">
                      {earningsGoalProgress}% · {earningsGoalProgress >= 100 ? '🎉 Objectif atteint !' : `Il reste ${fmtMoney(Math.max(0, repEarningsGoal - earningsPipeline.earnedInPeriod))} € à gagner`}
                    </p>
                  </>
                ) : (
                  <p className="text-[10px] font-bold text-white/30 italic">Cliquer sur ✏️ pour définir un objectif de gains</p>
                )}
              </div>
            )}
          </div>

          {/* ── Simulateur de gains ── */}
          <div className="h-px bg-white/10" />
          <button
            type="button"
            onClick={() => setShowCalculator((p) => !p)}
            className="w-full flex items-center justify-between gap-2 text-left group"
          >
            <div className="flex items-center gap-2">
              <Calculator size={13} className="text-cyan-400" />
              <span className="text-[10px] font-black text-white/50 uppercase tracking-widest group-hover:text-white/80 transition">Simulateur de gains</span>
            </div>
            <ChevronDown size={12} className={`text-white/30 transition-transform ${showCalculator ? 'rotate-180' : ''}`} />
          </button>

          {showCalculator && (
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
              <p className="text-[9px] text-white/30 font-black uppercase tracking-widest">Calculez vos gains estimés par session</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-white/40 uppercase tracking-wider block">Appels / session</label>
                  <input
                    type="number"
                    min={1} max={200}
                    value={calcCalls}
                    onChange={(e) => setCalcCalls(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-2 py-1.5 text-sm font-black text-center focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-white/40 uppercase tracking-wider block">Conversion %</label>
                  <input
                    type="number"
                    min={1} max={100}
                    value={calcConvRate}
                    onChange={(e) => setCalcConvRate(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-2 py-1.5 text-sm font-black text-center focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-white/40 uppercase tracking-wider block">Commission € / vente</label>
                  <input
                    type="number"
                    min={1}
                    value={calcCommission}
                    onChange={(e) => setCalcCommission(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-2 py-1.5 text-sm font-black text-center focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
              {/* Résultat */}
              <div className="rounded-xl bg-harx-500/15 border border-harx-500/30 px-4 py-3 flex items-center justify-between">
                <p className="text-[10px] text-white/60 font-bold">
                  {calcCalls} appels × {calcConvRate}% = <strong className="text-white">{calcResult.transactions} vente{calcResult.transactions !== 1 ? 's' : ''}</strong>
                </p>
                <p className="text-xl font-black text-harx-400 tracking-tight">
                  +{calcResult.earnings.toFixed(2)} €
                </p>
              </div>
              <p className="text-[9px] text-white/25 font-bold">Estimation indicative — basée sur vos paramètres GIG.</p>
            </div>
          )}

        </div>
      </div>

      {/* Activité Récente — Transactions & Calls cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transactions card */}
        <div ref={transactionsSectionRef} className="bg-white/50 backdrop-blur-xl border border-white/60 rounded-[28px] shadow-xl shadow-slate-200/20 overflow-hidden flex flex-col">
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Receipt size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase">{t('dashboard.home.transactions.title')}</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    {t('dashboard.home.transactions.subtitle')}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-black text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0">
                {transactionStats.all.total.toFixed(2)} €
              </span>
            </div>

            {/* Filter pills */}
            <div className="flex flex-wrap gap-2">
              {([
                { key: 'all', label: t('dashboard.home.transactions.filterAll'), accent: 'slate', count: transactionStats.all.count },
                { key: 'earned', label: t('dashboard.home.transactions.filterEarned'), accent: 'emerald', count: transactionStats.earned.count },
                { key: 'pending_retraction', label: t('dashboard.home.transactions.filterRetraction'), accent: 'amber', count: transactionStats.pending_retraction.count },
                { key: 'paid', label: t('dashboard.home.transactions.filterPaid'), accent: 'blue', count: transactionStats.paid.count },
                { key: 'refused', label: t('dashboard.home.transactions.filterRefused'), accent: 'rose', count: transactionStats.refused.count },
              ] as { key: TransactionFilter; label: string; accent: string; count: number }[]).map((tab) => {
                const active = transactionFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setTransactionFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 ${
                      active
                        ? tab.accent === 'slate'
                          ? 'bg-slate-900 text-white shadow-md'
                          : tab.accent === 'emerald'
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                          : tab.accent === 'amber'
                          ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                          : tab.accent === 'blue'
                          ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30'
                          : 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                        : 'bg-white/60 text-slate-500 hover:bg-white hover:text-slate-800'
                    }`}
                  >
                    {tab.label}
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${
                      active ? 'bg-white/25' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Transactions list */}
          <div className="px-6 pb-6 flex-1">
            {visibleTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="h-14 w-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                  <Inbox size={22} />
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('dashboard.home.transactions.empty')}</p>
                <p className="text-[11px] text-slate-400 mt-1">{t('dashboard.home.transactions.emptyFilter')}</p>
              </div>
            ) : (
              <ul className="space-y-2 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
                {visibleTransactions.map((tx) => {
                  const statusMeta =
                    tx.status === 'earned'
                      ? { label: t('dashboard.home.transactions.statusEarned'), cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' }
                      : tx.status === 'paid'
                      ? { label: t('dashboard.home.transactions.statusPaid'), cls: 'bg-blue-50 text-blue-700 border-blue-100' }
                      : tx.status === 'pending_retraction'
                      ? { label: t('dashboard.home.transactions.statusRetraction'), cls: 'bg-amber-50 text-amber-800 border-amber-200' }
                      : { label: t('dashboard.home.transactions.statusRefused'), cls: 'bg-rose-50 text-rose-700 border-rose-100' };
                  const typeLabel =
                    tx.type === 'call_validated' ? t('dashboard.home.transactions.typeCallValidated')
                    : tx.type === 'transaction' ? t('dashboard.home.transactions.typeSale')
                    : t('dashboard.home.transactions.typeBonus');
                  const gigTitle = tx.gig?.title || (gigsData.find((g: any) => (g._id || g.id) === tx.gigId)?.title) || t('dashboard.home.gigFallback');
                  return (
                    <li key={tx._id}>
                      <button
                        type="button"
                        onClick={() => openTransactionDetails(tx)}
                        className={clickableRowClass}
                        aria-label={t('dashboard.home.transactions.ariaView', { type: typeLabel })}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <DollarSign size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-slate-900 truncate">{typeLabel} · {gigTitle}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              {new Date(tx.createdAt).toLocaleDateString(dateLocale, { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full border ${statusMeta.cls}`}>
                            {statusMeta.label}
                          </span>
                          <span className="text-sm font-black text-slate-900 tracking-tighter">
                            +{(tx.repShare || 0).toFixed(2)} €
                          </span>
                          <ChevronRight size={14} className="text-slate-300 group-hover:text-emerald-500 transition-colors shrink-0" />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Calls card */}
        <div
          ref={callsSectionRef}
          className={`bg-white/50 backdrop-blur-xl border rounded-[28px] shadow-xl shadow-slate-200/20 overflow-hidden flex flex-col transition-all ${
            callFilter === 'pending_client'
              ? 'border-amber-300 ring-2 ring-amber-200/80'
              : 'border-white/60'
          }`}
        >
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                  <Phone size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase">{t('dashboard.home.callsSection.title')}</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    {callFilter === 'pending_client'
                      ? t('dashboard.home.callsSection.subtitlePending')
                      : t('dashboard.home.callsSection.subtitle')}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-black text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0">
                {t('dashboard.home.callsSection.count', { count: callStats.all })}
              </span>
            </div>

            {/* Filter pills */}
            <div className="flex flex-wrap gap-2">
              {([
                { key: 'all', label: t('dashboard.home.callsSection.filterAll'), accent: 'slate', count: callStats.all },
                { key: 'valid', label: t('dashboard.home.callsSection.filterValid'), accent: 'emerald', count: callStats.valid },
                { key: 'invalid', label: t('dashboard.home.callsSection.filterInvalid'), accent: 'rose', count: callStats.invalid },
                { key: 'pending_client', label: t('dashboard.home.callsSection.filterPending'), accent: 'amber', count: callStats.pending_client },
              ] as { key: CallFilter; label: string; accent: string; count: number }[]).map((tab) => {
                const active = callFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setCallFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 ${
                      active
                        ? tab.accent === 'slate'
                          ? 'bg-slate-900 text-white shadow-md'
                          : tab.accent === 'emerald'
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                          : tab.accent === 'amber'
                          ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                          : 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                        : 'bg-white/60 text-slate-500 hover:bg-white hover:text-slate-800'
                    }`}
                  >
                    {tab.label}
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${
                      active ? 'bg-white/25' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Calls list */}
          <div className="px-6 pb-6 flex-1">
            {visibleCalls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="h-14 w-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                  <Inbox size={22} />
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {callFilter === 'pending_client'
                    ? t('dashboard.home.callsSection.emptyPending')
                    : t('dashboard.home.callsSection.empty')}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {callFilter === 'pending_client'
                    ? t('dashboard.home.callsSection.emptyPendingDetail')
                    : t('dashboard.home.callsSection.emptyFilter')}
                </p>
              </div>
            ) : (
              <ul className="space-y-2 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
                {visibleCalls.map((call: any) => {
                  const isValid = call.valid === true || call.validByAI === true;
                  const contact = (call.lead?.First_Name || call.lead?.Last_Name)
                    ? `${call.lead.First_Name || ''} ${call.lead.Last_Name || ''}`.trim()
                    : (call.lead?.name || call.contactName || call.to || call.from || call.phoneNumber || t('dashboard.home.callsSection.unknownContact'));
                  const phoneNum = call.lead?.phone || call.lead?.Phone || call.to || call.from || call.phoneNumber;
                  const hasLeadName = !!(call.lead?.First_Name || call.lead?.Last_Name || call.lead?.name);
                  const durationSec = Number(call.duration || 0);
                  const billedMin = billedMinutesFromSeconds(durationSec);
                  const dateStr = call.startTime || call.createdAt;
                  const cGigId = typeof call.gigId === 'object' ? (call.gigId?._id || call.gigId?.id) : call.gigId;
                  const gigTitle = (typeof call.gigId === 'object' && call.gigId?.title) || (gigsData.find((g: any) => (g._id || g.id) === cGigId)?.title) || '';
                  const callId = resolveCallRefId(call);
                  const isPendingClient = callId
                    ? earningsPipeline.pendingClientValidationCallIds.has(callId)
                    : false;
                  const ledgerTxStatus = callId ? repSaleLedgerByCallId.get(callId)?.status ?? null : null;
                  const inRetraction = isTransactionInRetraction(call, ledgerTxStatus);
                  const txCommission = resolveTransactionRepCommission(call);
                  return (
                    <li key={call._id || call.sid || `${contact}-${dateStr}`}>
                      <button
                        type="button"
                        onClick={() => openCallDetails(call)}
                        className={clickableCallRowClass}
                        aria-label={t('dashboard.home.callsSection.ariaView', { contact })}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${
                            isValid ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                          }`}>
                            {isValid ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-slate-900 truncate flex items-center gap-2">
                              <span>{contact}</span>
                              {hasLeadName && phoneNum && (
                                <span className="text-[11px] font-normal text-slate-400">({maskPhone(phoneNum)})</span>
                              )}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                              {dateStr ? new Date(dateStr).toLocaleDateString(dateLocale, { day: '2-digit', month: 'short' }) : '—'}
                              {billedMin > 0 && ` · ${billedMin} min`}
                              {gigTitle && ` · ${gigTitle}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {inRetraction && (
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full border bg-amber-50 text-amber-800 border-amber-200 inline-flex items-center gap-1">
                              <RotateCcw size={10} />
                              {t('dashboard.home.callsSection.retractionBadge', { amount: txCommission.toFixed(2) })}
                            </span>
                          )}
                          {callFilter === 'pending_client' || isPendingClient ? (
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                              {t('dashboard.home.callsSection.pendingSale')}
                            </span>
                          ) : (
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full border ${
                              isValid
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-rose-50 text-rose-700 border-rose-100'
                            }`}>
                              {isValid ? t('dashboard.home.callsSection.validated') : t('dashboard.home.callsSection.notValidated')}
                            </span>
                          )}
                          <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0" />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Classement des gains du GIG */}
      <div className="bg-slate-950 rounded-[32px] border border-slate-800 shadow-2xl shadow-slate-900/40 p-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="flex items-center justify-between gap-3 flex-wrap mb-5 relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Medal size={18} />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight uppercase">Classement des gains</h2>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-0.5">
                {selectedGigId === 'all' ? 'Sélectionnez un GIG pour voir le classement' : selectedGigLabel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users size={14} className="text-white/30" />
            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">REPs inscrits</span>
          </div>
        </div>
        {selectedGigId === 'all' ? (
          <div className="relative z-10 flex flex-col items-center justify-center py-10 text-center">
            <div className="h-14 w-14 rounded-2xl bg-white/5 text-white/20 flex items-center justify-center mb-3">
              <Medal size={24} />
            </div>
            <p className="text-xs font-bold text-white/30 uppercase tracking-wider">Sélectionnez un GIG</p>
            <p className="text-[11px] text-white/20 mt-1">Le classement des REPs s'affiche par GIG</p>
          </div>
        ) : (
          <div className="relative z-10">
            {/* Podium — top 3 */}
            <div className="flex items-end justify-center gap-3 mb-6">
              {[2, 1, 3].map((pos) => {
                const isFirst = pos === 1;
                const podiumColors: Record<number, string> = {
                  1: 'from-amber-400/30 to-amber-500/10 border-amber-500/30',
                  2: 'from-slate-400/20 to-slate-500/10 border-slate-500/20',
                  3: 'from-amber-700/20 to-amber-800/10 border-amber-700/20',
                };
                const rankColors: Record<number, string> = { 1: 'text-amber-400', 2: 'text-slate-300', 3: 'text-amber-700' };
                const medalEmojis: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
                if (pos === 1) {
                  return (
                    <div key={pos} className={`flex flex-col items-center gap-2 bg-gradient-to-b ${podiumColors[pos]} border rounded-[20px] px-5 py-4 ${isFirst ? 'pb-6' : 'pb-4'}`}>
                      <span className="text-2xl">{medalEmojis[pos]}</span>
                      <div className="h-10 w-10 rounded-2xl bg-harx-500/30 flex items-center justify-center">
                        <Users size={16} className="text-harx-400" />
                      </div>
                      <div className="text-center">
                        <p className={`text-xs font-black ${rankColors[pos]}`}>#{pos}</p>
                        <p className="text-[10px] font-bold text-white/60 truncate max-w-[80px]">{displayName}</p>
                        <p className="text-sm font-black text-white">{fmtMoney(earningsPipeline.earnedInPeriod)} €</p>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={pos} className={`flex flex-col items-center gap-2 bg-gradient-to-b ${podiumColors[pos]} border rounded-[20px] px-4 py-3`}>
                    <span className="text-lg opacity-30">{medalEmojis[pos]}</span>
                    <div className="h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center">
                      <Users size={13} className="text-white/20" />
                    </div>
                    <p className={`text-[10px] font-black ${rankColors[pos]} opacity-30`}>#{pos}</p>
                    <p className="text-[10px] text-white/20">—</p>
                  </div>
                );
              })}
            </div>
            <p className="text-center text-[10px] font-bold text-white/20 italic">Classement complet disponible prochainement · Données multi-REP en cours d'intégration</p>
          </div>
        )}
      </div>

      {/* Réservations — bandeau style Planning */}
      <div className="bg-slate-950 rounded-[32px] border border-slate-800 shadow-2xl shadow-slate-900/40 p-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-violet-500/15 blur-2xl -mr-16 -mt-16 pointer-events-none" />
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5 relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
              <CalendarCheck size={18} />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight uppercase">{t('dashboard.home.reservations.title')}</h2>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-0.5">{t('dashboard.home.reservations.subtitle')}</p>
            </div>
          </div>
          <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">
            {t('dashboard.home.reservations.count', { count: reservationStats.total })}
          </span>
        </div>

        {/* Métriques en ligne — style Planning */}
        <div className="flex flex-wrap gap-3 relative z-10">
          {/* Total */}
          <div className="flex flex-col gap-0.5 rounded-2xl bg-white/10 border border-white/10 px-4 py-3 min-w-[100px]">
            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{t('dashboard.home.reservations.total')}</span>
            <span className="text-2xl font-black text-white tracking-tighter">{reservationStats.total}</span>
            <span className="text-[10px] font-bold text-white/40">{t('dashboard.home.reservations.sessions')}</span>
          </div>
          {/* À venir */}
          <div className="flex flex-col gap-0.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 px-4 py-3 min-w-[100px]">
            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{t('dashboard.home.reservations.upcoming')}</span>
            <span className="text-2xl font-black text-blue-400 tracking-tighter">{reservationStats.upcoming}</span>
            <span className="text-[10px] font-bold text-white/40">{t('dashboard.home.reservations.scheduled')}</span>
          </div>
          {/* Effectuées */}
          <div className="flex flex-col gap-0.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 min-w-[100px]">
            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{t('dashboard.home.reservations.completed')}</span>
            <span className="text-2xl font-black text-emerald-400 tracking-tighter">{reservationStats.completed}</span>
            <span className="text-[10px] font-bold text-white/40">{t('dashboard.home.reservations.honored')}</span>
          </div>
          {/* Manquées */}
          <div className="flex flex-col gap-0.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 min-w-[120px]">
            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{t('dashboard.home.reservations.missed')}</span>
            <span className="text-2xl font-black text-rose-400 tracking-tighter">{reservationStats.noShow + reservationStats.cancelled}</span>
            <span className="text-[10px] font-bold text-white/40">
              {t('dashboard.home.reservations.missedDetail', { cancelled: reservationStats.cancelled, noShow: reservationStats.noShow })}
            </span>
          </div>
          {/* Heures */}
          <div className="flex flex-col gap-0.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 min-w-[120px]">
            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{t('dashboard.home.reservations.hoursWorked')}</span>
            <span className="text-2xl font-black text-amber-400 tracking-tighter">{reservationStats.workedHours}h</span>
            <span className="text-[10px] font-bold text-white/40">{t('dashboard.home.reservations.hoursScheduled', { hours: reservationStats.scheduledHours })}</span>
          </div>
          {/* Assiduité */}
          <div className="flex flex-col gap-0.5 rounded-2xl bg-harx-500/15 border border-harx-500/25 px-4 py-3 min-w-[100px]">
            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{t('dashboard.home.reservations.attendance')}</span>
            <span className="text-2xl font-black text-white tracking-tighter">{reservationStats.attendanceRate}%</span>
            <span className="text-[10px] font-bold text-white/40">{t('dashboard.home.reservations.attendanceRate')}</span>
          </div>
          {/* Last Minute Cancel avec sélecteur de période */}
          <div className="flex flex-col gap-1.5 rounded-2xl bg-white/8 border border-white/10 px-4 py-3 min-w-[160px]">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <Ban size={13} className="text-rose-400" />
              </div>
              <div>
                <p className="text-[9px] text-white/40 font-black uppercase tracking-widest">{t('sessionPlanning.lastMinuteCancel', 'Taux d\'annulation')}</p>
                <p className="text-xl font-black text-white tracking-tight">
                  {cancelRate == null ? '—' : `${cancelRate}%`}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {(['week', 'month', 'quarter', 'year'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCancelStatsPeriod(key)}
                  className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition ${
                    cancelStatsPeriod === key ? 'bg-white text-slate-900' : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                >
                  {key === 'week' ? 'Sem.' : key === 'month' ? 'Mois' : key === 'quarter' ? 'Trim.' : 'Année'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Prochaines réservations (condensé) */}
        {upcomingReservations.length > 0 && (
          <div className="mt-4 relative z-10">
            <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">{t('dashboard.home.reservations.upcomingSessions')}</p>
            <div className="flex flex-wrap gap-2">
              {upcomingReservations.map((r: any) => {
                const dateStr = r.reservationDate || r.date;
                const d = new Date(dateStr);
                const gigTitle = typeof r.gigId === 'object' ? (r.gigId?.title || t('dashboard.home.gigFallback')) : (gigsData.find((g: any) => (g._id || g.id) === r.gigId)?.title || t('dashboard.home.gigFallback'));
                return (
                  <button
                    key={r._id || `${r.gigId}-${dateStr}-${r.startTime}`}
                    type="button"
                    onClick={() => { const gigId = typeof r.gigId === 'object' ? (r.gigId?._id || r.gigId?.id) : r.gigId; if (gigId) navigate(`/session-planning?gigId=${encodeURIComponent(String(gigId))}`); }}
                    className="flex items-center gap-2 bg-white/8 border border-white/15 rounded-2xl px-3 py-2 hover:bg-white/15 transition text-left group"
                  >
                    <CalendarClock size={13} className="text-violet-400 shrink-0" />
                    <div>
                      <p className="text-[10px] font-black text-white truncate max-w-[140px]">{gigTitle}</p>
                      <p className="text-[9px] text-white/40 font-bold">
                        {d.toLocaleDateString(dateLocale, { weekday: 'short', day: '2-digit', month: 'short' })} · {r.startTime}–{r.endTime}
                      </p>
                    </div>
                    <span className="text-[9px] font-black text-white/40 bg-white/10 px-1.5 py-0.5 rounded-lg">{r.duration}h</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* À faire du jour + Rappels — pavés compacts avec CTA apparent */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* To-Do du jour */}
        <div className="rounded-[28px] border border-slate-200/70 bg-white/60 backdrop-blur-xl shadow-xl shadow-slate-200/20 overflow-hidden">
          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-2xl bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0">
                <ListChecks size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">À faire aujourd'hui</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Formations · Scripts · Documents KB</p>
              </div>
            </div>
            <ul className="space-y-2 mb-4">
              <li className="flex items-center gap-3 p-2.5 rounded-xl bg-violet-50 border border-violet-100">
                <GraduationCap size={14} className="text-violet-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-700 truncate">Formations assignées</p>
                  <p className="text-[10px] text-slate-400">Accéder à HARX Academy</p>
                </div>
              </li>
              <li className="flex items-center gap-3 p-2.5 rounded-xl bg-blue-50 border border-blue-100">
                <BookOpen size={14} className="text-blue-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-700 truncate">Scripts de vente</p>
                  <p className="text-[10px] text-slate-400">Lire avant vos sessions</p>
                </div>
              </li>
              <li className="flex items-center gap-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                <FileText size={14} className="text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-700 truncate">Documents assignés (KB)</p>
                  <p className="text-[10px] text-slate-400">Par votre Company</p>
                </div>
              </li>
            </ul>
          </div>
          {/* CTA apparent */}
          <button
            type="button"
            onClick={() => navigate('/academy')}
            className="w-full flex items-center justify-between gap-3 px-5 py-4 bg-violet-600 text-white hover:bg-violet-700 transition-all group"
          >
            <div className="flex items-center gap-2">
              <GraduationCap size={16} />
              <span className="text-xs font-black uppercase tracking-widest">Accéder à l'Academy</span>
            </div>
            <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Rappels à effectuer */}
        <div className="rounded-[28px] border border-slate-200/70 bg-white/60 backdrop-blur-xl shadow-xl shadow-slate-200/20 overflow-hidden">
          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <PhoneCall size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">Rappels à effectuer</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Prospects · Callbacks planifiés</p>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
                <PhoneCall size={20} />
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vos rappels apparaîtront ici</p>
              <p className="text-[11px] text-slate-400 mt-1">Gérez vos prospects depuis l'espace dédié</p>
            </div>
          </div>
          {/* CTA apparent */}
          <button
            type="button"
            onClick={() => navigate('/workspace')}
            className="w-full flex items-center justify-between gap-3 px-5 py-4 bg-amber-500 text-white hover:bg-amber-600 transition-all group"
          >
            <div className="flex items-center gap-2">
              <PhoneCall size={16} />
              <span className="text-xs font-black uppercase tracking-widest">Voir mes prospects</span>
            </div>
            <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {overlayCallId && (
        <CallRecords
          overlayOpenCallId={overlayCallId}
          onOverlayClose={() => setOverlayCallId(null)}
        />
      )}

      {selectedTransaction && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998] bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setSelectedTransaction(null)}
            aria-hidden
          />
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-md bg-white rounded-[28px] border border-slate-200 shadow-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{t('dashboard.home.transactionModal.title')}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                    {selectedTransaction.type === 'bonus'
                      ? t('dashboard.home.transactionModal.typeBonus')
                      : selectedTransaction.type === 'transaction'
                        ? t('dashboard.home.transactionModal.typeSale')
                        : t('dashboard.home.transactionModal.typeCommission')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTransaction(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  aria-label={t('dashboard.home.transactionModal.close')}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('dashboard.home.transactionModal.repAmount')}</span>
                  <span className="text-xl font-black text-emerald-600">+{(selectedTransaction.repShare || 0).toFixed(2)} €</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">{t('dashboard.home.transactionModal.status')}</span>
                  <span className="text-xs font-bold text-slate-700 capitalize">
                    {selectedTransaction.status === 'pending_retraction'
                      ? t('dashboard.home.transactionModal.statusRetraction')
                      : selectedTransaction.status === 'earned'
                        ? t('dashboard.home.transactionModal.statusEarned')
                        : selectedTransaction.status === 'paid'
                          ? t('dashboard.home.transactionModal.statusPaid')
                          : selectedTransaction.status === 'refused'
                            ? t('dashboard.home.transactionModal.statusRefused')
                            : selectedTransaction.status}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">{t('dashboard.home.transactionModal.gig')}</span>
                  <span className="text-xs font-semibold text-slate-700 text-right">
                    {selectedTransaction.gig?.title || gigsData.find((g) => g._id === selectedTransaction.gigId)?.title || '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">{t('dashboard.home.transactionModal.date')}</span>
                  <span className="text-xs font-semibold text-slate-700">
                    {new Date(selectedTransaction.createdAt).toLocaleString(dateLocale)}
                  </span>
                </div>
                {selectedTransaction.description && (
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    {selectedTransaction.description}
                  </p>
                )}
                {selectedTransaction.status === 'pending_retraction' && (
                  <p className="text-xs font-medium text-amber-800 leading-relaxed bg-amber-50 rounded-2xl p-4 border border-amber-100">
                    {t('dashboard.home.transactionModal.retractionNote')}
                  </p>
                )}
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => setSelectedTransaction(null)}
                  className="w-full py-2.5 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-colors"
                >
                  {t('dashboard.home.transactionModal.close')}
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

    </div>
  );
}