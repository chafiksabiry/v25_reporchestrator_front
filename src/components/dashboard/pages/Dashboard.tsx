import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TrendingUp, DollarSign, Clock, Phone, Target, Award, Briefcase, CheckCircle2, Wallet as WalletIcon, Trophy, Flame, CalendarDays, CalendarCheck, CalendarClock, CalendarX, Timer, Filter as FilterIcon, ChevronDown, ChevronRight, RotateCcw, Building2, ShieldCheck, ShieldAlert, Rocket, Calculator, Pencil, Check, Users, Medal, ListChecks, PhoneCall, BookOpen, GraduationCap, Ban, Zap, FileText } from 'lucide-react';
import api, { repTransactionsApi, type RepTransactionRow } from '../../../utils/client';
import { slotApi, type Reservation } from '../../../services/api/slotApi';
import { repApiUrl } from '../../../utils/repApiUrl';
import {
  resolveClientValidationPendingAmount,
} from '../../../utils/commissionUtils';
import { computeValidatedLedgerBreakdown, dedupeSaleLedgerRows, resolveLedgerPeriodDate } from '../../../utils/repLedgerBreakdown';
import { getResolvedAgentFacing } from '../../../utils/gigCommissionDisplay';
import { getDisplayOverallScore, isCallFraudDetected } from '../../../utils/callStatusDisplay';
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

type PeriodKey = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all';
type GoalsPeriod = Exclude<PeriodKey, 'all'>;

const GOALS_PERIODS: GoalsPeriod[] = ['today', 'week', 'month', 'quarter', 'year'];

type EarningsGoals = Record<GoalsPeriod, number>;
type CountGoals = Record<GoalsPeriod, number>;

function emptyCountGoals(): CountGoals {
  return { today: 0, week: 0, month: 0, quarter: 0, year: 0 };
}

function loadCountGoals(storageKey: string): CountGoals {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || '{}') as Partial<CountGoals>;
    const next = emptyCountGoals();
    (Object.keys(next) as GoalsPeriod[]).forEach((key) => {
      next[key] = Math.max(0, Number(parsed[key]) || 0);
    });
    return next;
  } catch {
    return emptyCountGoals();
  }
}

function loadEarningsGoals(): EarningsGoals {
  const empty: EarningsGoals = { today: 0, week: 0, month: 0, quarter: 0, year: 0 };
  try {
    const parsed = JSON.parse(localStorage.getItem('harx_earnings_goals') || '{}') as Partial<EarningsGoals>;
    const legacy = Number(localStorage.getItem('harx_earnings_goal') || '0');
    return {
      today: Number(parsed.today) || 0,
      week: Number(parsed.week) || legacy || 0,
      month: Number(parsed.month) || 0,
      quarter: Number(parsed.quarter) || 0,
      year: Number(parsed.year) || 0,
    };
  } catch {
    return empty;
  }
}

function hourMinimums(availability: any) {
  const hours = availability?.minimumHours || {};
  return {
    daily: Number(hours.daily || 0),
    weekly: Number(hours.weekly || 0),
    monthly: Number(hours.monthly || 0),
  };
}

function bonusPeriodKey(commission: any): GoalsPeriod {
  const raw = String(commission?.minimumVolume?.period || commission?.bonusPeriod || commission?.bonusType || '').toLowerCase();
  if (raw.includes('day') || raw.includes('jour') || raw === 'daily') return 'today';
  if (raw.includes('week') || raw.includes('semaine')) return 'week';
  if (raw.includes('quarter') || raw.includes('trimestre')) return 'quarter';
  if (raw.includes('year') || raw.includes('ann')) return 'year';
  return 'month';
}

function monthTransactions(commission: any): number {
  return Number(commission?.minimumVolume?.amount || 0);
}

function agentTxAmount(commission: any): number {
  const facing = getResolvedAgentFacing(commission);
  const tx = facing?.transactionCommission;
  if (typeof tx === 'number' && tx > 0) return tx;
  if (tx && typeof tx === 'object') {
    const type = String(tx.type || '').toLowerCase();
    const amount = Number(String(tx.amount ?? '').replace(/,/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    if (type === 'percentage' || type === 'percent' || type === '%') return 0;
    return amount;
  }
  return 0;
}

function agentCallAmount(commission: any): number {
  return Number(getResolvedAgentFacing(commission)?.commission_per_call || 0);
}

function agentBonusAmount(commission: any, rewardBonus?: number): number {
  const amount = Number(getResolvedAgentFacing(commission)?.bonusAmount || 0);
  if (amount > 0) return amount;
  const gross = Number(rewardBonus || 0);
  return gross > 0 ? Math.round(gross * 0.7 * 100) / 100 : 0;
}

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

  // Earnings & objectifs (RepTransaction-backed)
  const [walletStats, setWalletStats] = useState<{
    availableBalance: number;
    pendingCommissions: number;
    pendingRetraction: number;
    lifetimeEarnings: number;
  }>({ availableBalance: 0, pendingCommissions: 0, pendingRetraction: 0, lifetimeEarnings: 0 });
  const [repLedger, setRepLedger] = useState<RepTransactionRow[]>([]);

  // Simulateur : chiffres saisis par GIG. Les commissions et le bonus viennent du GIG.
  const [showCalculator, setShowCalculator] = useState(false);
  const [simGigs, setSimGigs] = useState<Record<string, { calls: string; transactions: string }>>({});
  const [hoursGigId, setHoursGigId] = useState<string | null>(null);
  const [hoursMenuOpen, setHoursMenuOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [earningsGoals, setEarningsGoals] = useState<EarningsGoals>(loadEarningsGoals);
  const [callGoals, setCallGoals] = useState<CountGoals>(() => loadCountGoals('harx_call_goals'));
  const [transactionGoals, setTransactionGoals] = useState<CountGoals>(() => loadCountGoals('harx_transaction_goals'));
  const [editingGoal, setEditingGoal] = useState<null | 'earnings' | 'calls' | 'transactions'>(null);
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

  const goals = useMemo(() => {
    const startTs = getPeriodStart(goalsPeriod);
    const scopedGigs = selectedGigId === 'all'
      ? gigsData
      : gigsData.filter((g) => g._id === selectedGigId);
    const hourTargets = scopedGigs.reduce(
      (sum, gig) => {
        const mins = hourMinimums(gig.availability);
        return {
          daily: sum.daily + mins.daily,
          weekly: sum.weekly + mins.weekly,
          monthly: sum.monthly + mins.monthly,
        };
      },
      { daily: 0, weekly: 0, monthly: 0 }
    );
    const bonusAmount = scopedGigs.reduce((sum, gig) => {
      const facing = getResolvedAgentFacing(gig.commission as any);
      const amount = Number(facing?.bonusAmount || 0);
      if (amount > 0) return sum + amount;
      const gross = Number(gig.rewardBonus || 0);
      return sum + (gross > 0 ? Math.round(gross * 0.7 * 100) / 100 : 0);
    }, 0);

    const matchesGig = (gigId: any) => {
      if (selectedGigId === 'all') return true;
      const id = typeof gigId === 'object' ? (gigId?._id || gigId?.id) : gigId;
      return id === selectedGigId;
    };

    const sales = dedupeSaleLedgerRows(repLedger);
    const gigIdOf = (gigId: any) => (typeof gigId === 'object' ? (gigId?._id || gigId?.id) : gigId);
    const isSuccessfulSale = (row: RepTransactionRow) =>
      row.type === 'transaction' && (row.status === 'earned' || row.status === 'paid' || row.status === 'pending_retraction');

    const countSales = (since: number, onlyGigId?: string) => {
      let count = 0;
      sales.forEach((row) => {
        if (!isSuccessfulSale(row)) return;
        const gid = gigIdOf(row.gigId);
        if (onlyGigId) {
          if (gid !== onlyGigId) return;
        } else if (!matchesGig(row.gigId)) return;
        const ts = new Date(row.createdAt || 0).getTime();
        if (!ts || ts < since) return;
        count += 1;
      });
      return count;
    };

    const countSince = (since: number, kind: 'calls' | 'hours') => {
      if (kind === 'calls') {
        return callsData.filter((call: any) => {
          if (!matchesGig(call.gigId)) return false;
          const ts = new Date(call.createdAt || call.startTime || call.date || 0).getTime();
          if (!ts || ts < since) return false;
          return call.valid === true || call.validByAI === true;
        }).length;
      }
      let hours = 0;
      reservationsData.forEach((reservation: any) => {
        if (!matchesGig(reservation.gigId)) return;
        if (reservation.status === 'cancelled' || reservation.attended === false) return;
        const ts = new Date(reservation.reservationDate || reservation.date || 0).getTime();
        if (!ts || ts < since || ts > Date.now()) return;
        hours += Number(reservation.duration || 0);
      });
      return Math.round(hours * 10) / 10;
    };

    const validatedCalls = countSince(startTs, 'calls');
    const hoursToday = countSince(getPeriodStart('today'), 'hours');
    const hoursWeek = countSince(getPeriodStart('week'), 'hours');
    const hoursMonth = countSince(getPeriodStart('month'), 'hours');
    const validatedTransactions = countSales(startTs);

    let earned = 0;
    sales.forEach((row) => {
      if (!matchesGig(row.gigId)) return;
      const ts = new Date(row.createdAt || 0).getTime();
      if (!ts || ts < startTs) return;
      if (row.status === 'earned') earned += row.repShare || 0;
    });

    let bonusCurrent = 0;
    let bonusTarget = 0;
    let gigsTriggered = 0;
    let gigsWithTarget = 0;
    let bonusWindow: GoalsPeriod = 'month';
    scopedGigs.forEach((gig) => {
      const target = monthTransactions(gig.commission);
      if (target <= 0) return;
      gigsWithTarget += 1;
      const periodKey = bonusPeriodKey(gig.commission);
      bonusWindow = periodKey;
      const current = countSales(getPeriodStart(periodKey), gig._id);
      bonusTarget += target;
      bonusCurrent += current;
      if (current >= target) gigsTriggered += 1;
    });
    const bonusTriggered = gigsWithTarget > 0 && gigsTriggered === gigsWithTarget;

    const pct = (current: number, target: number) =>
      target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
    const labelGig = selectedGigId === 'all'
      ? t('dashboard.home.allGigs')
      : (gigsData.find((g) => g._id === selectedGigId)?.title || t('dashboard.home.gigFallback'));

    const bar = (current: number, target: number) => ({
      current,
      target,
      progressPct: pct(current, target),
      reached: target > 0 && current >= target,
    });

    const hoursForGig = (gigId: string, since: number) => {
      let hours = 0;
      reservationsData.forEach((reservation: any) => {
        if (gigIdOf(reservation.gigId) !== gigId) return;
        if (reservation.status === 'cancelled' || reservation.attended === false) return;
        const ts = new Date(reservation.reservationDate || reservation.date || 0).getTime();
        if (!ts || ts < since || ts > Date.now()) return;
        hours += Number(reservation.duration || 0);
      });
      return Math.round(hours * 10) / 10;
    };

    const perGig = scopedGigs.map((gig) => {
      const mins = hourMinimums(gig.availability);
      const target = monthTransactions(gig.commission);
      const period = bonusPeriodKey(gig.commission);
      const current = countSales(getPeriodStart(period), gig._id);
      const facing = getResolvedAgentFacing(gig.commission as any);
      const amount = Number(facing?.bonusAmount || 0);
      const gross = Number(gig.rewardBonus || 0);
    return {
        id: gig._id,
        title: gig.title || t('dashboard.home.gigFallback'),
        hours: {
          daily: bar(hoursForGig(gig._id, getPeriodStart('today')), mins.daily),
          weekly: bar(hoursForGig(gig._id, getPeriodStart('week')), mins.weekly),
          monthly: bar(hoursForGig(gig._id, getPeriodStart('month')), mins.monthly),
        },
        bonus: {
          current,
          target,
          period,
          bonusAmount: amount > 0 ? amount : (gross > 0 ? Math.round(gross * 0.7 * 100) / 100 : 0),
          triggered: target > 0 && current >= target,
        },
      };
    });

    return {
      label: labelGig,
      hours: {
        daily: bar(hoursToday, hourTargets.daily),
        weekly: bar(hoursWeek, hourTargets.weekly),
        monthly: bar(hoursMonth, hourTargets.monthly),
      },
      transactions: { current: validatedTransactions },
      calls: { current: validatedCalls },
      bonus: {
        current: bonusCurrent,
        target: bonusTarget,
        bonusAmount: Math.round(bonusAmount * 100) / 100,
        progressPct: pct(bonusCurrent, bonusTarget),
        triggered: bonusTriggered,
        period: bonusWindow,
        gigsTriggered,
        gigsWithTarget,
      },
      perGig,
      earned,
    };
  }, [callsData, reservationsData, repLedger, selectedGigId, gigsData, goalsPeriod, t]);

  const simRows = useMemo(() => {
    return gigsData
      .filter((gig) => simGigs[gig._id])
      .map((gig) => {
        const entry = simGigs[gig._id];
        const calls = Math.max(0, Math.round(Number(entry.calls) || 0));
        const transactions = Math.min(calls, Math.max(0, Math.round(Number(entry.transactions) || 0)));
        const callRate = agentCallAmount(gig.commission);
        const txRate = agentTxAmount(gig.commission);
        const bonusAmount = agentBonusAmount(gig.commission, gig.rewardBonus);
        const bonusTarget = monthTransactions(gig.commission);
        const bonusPeriod = bonusPeriodKey(gig.commission);
        const bonusIncluded = bonusAmount > 0 && (bonusTarget <= 0 || transactions >= bonusTarget);
        const callEarnings = calls * callRate;
        const transactionEarnings = transactions * txRate;
        const bonusEarnings = bonusIncluded ? bonusAmount : 0;
        return {
          id: gig._id,
          title: gig.title || t('dashboard.home.gigFallback'),
          calls,
          transactions,
          callRate,
          txRate,
          bonusAmount,
          bonusTarget,
          bonusPeriod,
          bonusIncluded,
          callEarnings,
          transactionEarnings,
          bonusEarnings,
          total: callEarnings + transactionEarnings + bonusEarnings,
        };
      });
  }, [gigsData, simGigs, t]);

  const simTotal = simRows.reduce((sum, row) => sum + row.total, 0);

  const repEarningsGoal = earningsGoals[goalsPeriod] || 0;
  const repCallGoal = callGoals[goalsPeriod] || 0;
  const repTxGoal = Math.min(transactionGoals[goalsPeriod] || 0, repCallGoal);
  const earningsGoalProgress = repEarningsGoal > 0
    ? Math.min(100, Math.round((goals.earned / repEarningsGoal) * 100))
    : 0;
  const callGoalProgress = repCallGoal > 0
    ? Math.min(100, Math.round((goals.calls.current / repCallGoal) * 100))
    : 0;
  const txGoalProgress = repTxGoal > 0
    ? Math.min(100, Math.round((goals.transactions.current / repTxGoal) * 100))
    : 0;
  const bonusPeriodLabel: Record<GoalsPeriod, string> = {
    today: "aujourd'hui",
    week: 'cette semaine',
    month: 'ce mois',
    quarter: 'ce trimestre',
    year: 'cette année',
  };

  const qualityAlerts = useMemo(() => {
    let fraud = 0;
    let scoreSum = 0;
    let scored = 0;
    filteredCalls.forEach((call) => {
      if (isCallFraudDetected(call)) fraud += 1;
      const score = getDisplayOverallScore(call);
      if (score != null) {
        scoreSum += score;
        scored += 1;
      }
    });
    return {
      fraud,
      quality: scored > 0 ? Math.round(scoreSum / scored) : null,
    };
  }, [filteredCalls]);

  const cancelRate = useMemo(() => {
    if (reservationStats.total === 0) return null;
    return Math.round((reservationStats.cancelled / reservationStats.total) * 100);
  }, [reservationStats]);

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

  useEffect(() => {
    if (!selectedGigId || selectedGigId === 'all') return;
    setSimGigs((current) => (
      current[selectedGigId] ? current : { ...current, [selectedGigId]: { calls: '', transactions: '' } }
    ));
  }, [selectedGigId]);

  useEffect(() => {
    if (selectedPeriod !== 'all') setGoalsPeriod(selectedPeriod);
  }, [selectedPeriod]);

  const saveEarningsGoal = (raw: string) => {
    const value = Math.max(0, Number(raw) || 0);
    setEarningsGoals((current) => {
      const next = { ...current, [goalsPeriod]: value };
      localStorage.setItem('harx_earnings_goals', JSON.stringify(next));
      return next;
    });
    setEditingGoal(null);
  };

  const toggleSimGig = (id: string) => {
    setSimGigs((current) => {
      if (current[id]) {
        const next = { ...current };
        delete next[id];
        return next;
      }
      return { ...current, [id]: { calls: '', transactions: '' } };
    });
  };

  const setSimField = (id: string, field: 'calls' | 'transactions', value: string) => {
    setSimGigs((current) => {
      const prev = current[id] || { calls: '', transactions: '' };
      if (value.trim() === '') {
        if (field === 'calls') return { ...current, [id]: { calls: '', transactions: '' } };
        return { ...current, [id]: { ...prev, transactions: '' } };
      }
      const digits = Math.max(0, Math.round(Number(value) || 0));
      if (field === 'calls') {
        const typedTx = prev.transactions.trim() === '' ? 0 : Math.max(0, Math.round(Number(prev.transactions) || 0));
        const nextTx = prev.transactions.trim() === '' ? '' : String(Math.min(typedTx, digits));
        return { ...current, [id]: { calls: String(digits), transactions: nextTx } };
      }
      const callCap = Math.max(0, Math.round(Number(prev.calls) || 0));
      return { ...current, [id]: { ...prev, transactions: String(Math.min(digits, callCap)) } };
    });
  };

  const saveCountGoal = (kind: 'calls' | 'transactions', raw: string) => {
    let value = Math.max(0, Math.round(Number(raw) || 0));
    if (kind === 'transactions') value = Math.min(value, callGoals[goalsPeriod] || 0);
    const apply = (current: CountGoals, storageKey: string, nextValue: number) => {
      const next = { ...current, [goalsPeriod]: nextValue };
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    };
    if (kind === 'calls') {
      setCallGoals((current) => apply(current, 'harx_call_goals', value));
      setTransactionGoals((current) => {
        if ((current[goalsPeriod] || 0) <= value) return current;
        return apply(current, 'harx_transaction_goals', value);
      });
    } else {
      setTransactionGoals((current) => apply(current, 'harx_transaction_goals', value));
    }
    setEditingGoal(null);
  };

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
      {/* Dynamic Filter Header */}
      <div className="flex flex-col gap-5 rounded-[2rem] border border-rose-100 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              {t('dashboard.home.greeting', { name: displayName })}
            </h1>
            <p className="text-[11px] font-semibold text-slate-500 tracking-wide mt-1 max-w-md">
              {t('dashboard.home.subtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={goToProduction}
            className="harx-go-live group inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-gradient-to-r from-[#ff4d4d] to-[#db2777] px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-300"
          >
            <Rocket size={15} className="group-hover:rotate-12 transition-transform" />
            {t('dashboard.home.goLive.title')}
            <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="relative flex items-center gap-2">
              <Briefcase size={16} className="text-rose-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{String(t('dashboard.home.gigLabel')).replace(/\s*:\s*$/, '')}</span>
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

            <div className="relative flex items-center gap-2">
              <CalendarDays size={16} className="text-blue-600" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{String(t('dashboard.home.periodLabel')).replace(/\s*:\s*$/, '')}</span>
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-white to-emerald-50/50 p-4 shadow-sm min-h-[108px] flex flex-col">
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

        <div className="rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-white to-emerald-50/40 p-4 shadow-sm min-h-[108px] flex flex-col">
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
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-lg min-h-[108px] flex flex-col relative overflow-hidden">
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

        <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm min-h-[108px] flex flex-col">
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
      </div>

      {/* Objectifs — pavé unique consolidé avec objectifs company + objectif REP + simulateur */}
      <div className="bg-slate-950 rounded-[32px] border border-harx-500/30 ring-1 ring-harx-500/20 shadow-2xl shadow-harx-900/20 p-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-harx-500/20 blur-3xl -mr-24 -mt-24 pointer-events-none" />
        <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl -ml-16 -mb-16 pointer-events-none" />

        {/* Header */}
        <div className={`flex items-center justify-between gap-4 flex-wrap relative z-10 ${goalsOpen ? 'mb-6' : ''}`}>
          <button
            type="button"
            onClick={() => setGoalsOpen((open) => !open)}
            className="flex items-center gap-3 min-w-0 text-left"
          >
            <div className="h-10 w-10 rounded-2xl bg-harx-500/20 text-harx-400 flex items-center justify-center shrink-0">
              <Target size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-black text-white tracking-tight uppercase">{t('dashboard.home.goals.title')}</h2>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-0.5 truncate">
                {goals.label}
              </p>
            </div>
            <ChevronDown size={16} className={`text-white/50 shrink-0 transition-transform ${goalsOpen ? 'rotate-180' : ''}`} />
          </button>
          {/* Sélecteur période */}
          <div className="flex flex-wrap gap-1 shrink-0">
            {(GOALS_PERIODS as GoalsPeriod[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setGoalsPeriod(key);
                  setSelectedPeriod(key);
                  setEditingGoal(null);
                }}
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

        {goalsOpen && (
        <div className="relative z-10 space-y-4">

          <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">GIG · heures minimum</p>

          {selectedGigId === 'all' ? (
            <div className="space-y-3">
              <p className="text-[12px] font-bold text-white/70 leading-snug">
                Chaque GIG a ses propres heures et son propre bonus. Les objectifs d'appels, de transactions et de gains, plus bas, comptent sur tous les GIGs.
              </p>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setHoursMenuOpen((open) => !open)}
                  className="w-full flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/5 px-3 py-3 text-left"
                >
                  <span className="text-[12px] font-black text-white truncate">
                    {goals.perGig.find((gig) => gig.id === hoursGigId)?.title || 'Choisir un GIG'}
                  </span>
                  <ChevronDown size={14} className={`text-white/50 shrink-0 transition-transform ${hoursMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {hoursMenuOpen && (
                  <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto rounded-2xl border border-white/15 bg-slate-950 shadow-xl">
                    {goals.perGig.map((gig) => (
                      <button
                        key={gig.id}
                        type="button"
                        onClick={() => { setHoursGigId(gig.id); setHoursMenuOpen(false); }}
                        className={`w-full px-3 py-2.5 text-left text-[12px] font-bold truncate transition ${gig.id === hoursGigId ? 'bg-white text-slate-900' : 'text-white/80 hover:bg-white/10'}`}
                      >
                        {gig.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {goals.perGig.filter((gig) => gig.id === hoursGigId).map((gig) => (
                <div key={gig.id} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 space-y-2">
                  {([
                    { label: 'Jour', row: gig.hours.daily },
                    { label: 'Semaine', row: gig.hours.weekly },
                    { label: 'Mois', row: gig.hours.monthly },
                  ] as const).map(({ label, row }) => (
                    <div key={label} className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-black text-white/45 uppercase tracking-widest">{label}</span>
                      <span className={`text-[11px] font-black ${row.reached ? 'text-emerald-400' : 'text-white'}`}>
                        {row.target > 0 ? `${row.current}h / ${row.target}h` : `${row.current}h · pas de minimum`}
                      </span>
                    </div>
                  ))}
                  <p className={`text-[11px] font-bold ${gig.bonus.triggered ? 'text-emerald-400' : 'text-white/55'}`}>
                    {gig.bonus.triggered
                      ? `Bonus déclenché · +${gig.bonus.bonusAmount.toFixed(2)} €`
                      : gig.bonus.target > 0
                        ? `Bonus ${gig.bonus.current}/${gig.bonus.target} transactions réussies ${bonusPeriodLabel[gig.bonus.period]}`
                        : 'Pas de bonus sur ce GIG'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
          <>
          {([
            { label: 'Quotidien', row: goals.hours.daily },
            { label: 'Semaine', row: goals.hours.weekly },
            { label: 'Mois', row: goals.hours.monthly },
          ] as const).map(({ label, row }) => (
            <div key={label} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <CalendarCheck size={13} className="text-violet-400 shrink-0" />
                  <span className="text-[10px] font-black text-white/70 uppercase tracking-widest">{label}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                      <span className="text-white font-black tracking-tighter">
                    {row.current}h<span className="text-white/40 font-bold text-sm">{row.target > 0 ? `/${row.target}h` : ''}</span>
                      </span>
                  <span className={`text-[10px] font-black min-w-[32px] text-right ${row.reached ? 'text-emerald-400' : 'text-white/60'}`}>
                    {row.target > 0 ? `${row.progressPct}%` : '—'}
                      </span>
                    </div>
                  </div>
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${row.reached ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-violet-400 to-violet-500'}`} style={{ width: `${row.progressPct}%` }} />
                  </div>
                </div>
          ))}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Flame size={13} className={goals.bonus.triggered ? 'text-emerald-400' : 'text-orange-400'} />
                <span className="text-[10px] font-black text-white/70 uppercase tracking-widest">{t('dashboard.home.goals.bonusTitle')}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-emerald-300 font-black tracking-tight">
                  {goals.bonus.bonusAmount > 0 ? `+${goals.bonus.bonusAmount.toFixed(2)} €` : '—'}
                </span>
                <span className={`text-[10px] font-black min-w-[32px] text-right ${goals.bonus.triggered ? 'text-emerald-400' : 'text-orange-300'}`}>
                  {goals.bonus.target > 0 ? `${goals.bonus.progressPct}%` : '—'}
                </span>
              </div>
            </div>
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${goals.bonus.triggered ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-orange-400 to-amber-400'}`} style={{ width: `${goals.bonus.progressPct}%` }} />
            </div>
            <p className="text-[10px] font-bold text-white/35">
              {goals.bonus.gigsWithTarget > 1
                ? `${goals.bonus.gigsTriggered}/${goals.bonus.gigsWithTarget} GIGs ont déclenché le bonus`
                : goals.bonus.triggered
                  ? `Bonus déclenché · ${goals.bonus.current} transactions réussies ${bonusPeriodLabel[goals.bonus.period]}`
                  : goals.bonus.target > 0
                    ? `${goals.bonus.current}/${goals.bonus.target} transactions réussies ${bonusPeriodLabel[goals.bonus.period]} · seuil du GIG`
                    : 'Aucun volume minimum de transactions sur ce GIG'}
            </p>
          </div>
          </>
          )}

          <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] pt-1">Mes objectifs · {goalsPeriodLabels[goalsPeriod]}</p>

          {([
            {
              kind: 'calls' as const,
              title: t('dashboard.home.goals.callsTitle'),
              icon: <Phone size={13} className="text-cyan-400" />,
              current: goals.calls.current,
              target: repCallGoal,
              progress: callGoalProgress,
            },
            {
              kind: 'transactions' as const,
              title: 'Transactions',
              icon: <Zap size={13} className="text-amber-400" />,
              current: goals.transactions.current,
              target: repTxGoal,
              progress: txGoalProgress,
            },
          ]).map((item) => (
            <div key={item.kind} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {item.icon}
                  <span className="text-[10px] font-black text-white/70 uppercase tracking-widest">{item.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  {editingGoal === item.kind ? (
                    <>
                      <input
                        type="number"
                        min={0}
                        max={item.kind === 'transactions' ? repCallGoal : undefined}
                        value={goalInput}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (item.kind !== 'transactions' || raw.trim() === '') {
                            setGoalInput(raw);
                            return;
                          }
                          const capped = Math.min(Math.max(0, Math.round(Number(raw) || 0)), repCallGoal);
                          setGoalInput(String(capped));
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveCountGoal(item.kind, goalInput); }}
                        className="w-16 bg-white/10 border border-white/20 text-white rounded-lg px-2 py-1 text-xs font-black text-center focus:outline-none focus:border-harx-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        autoFocus
                      />
                      <button type="button" onClick={() => saveCountGoal(item.kind, goalInput)} className="p-1.5 rounded-lg bg-emerald-500/30 text-emerald-300" aria-label="Enregistrer">
                        <Check size={12} />
                      </button>
                    </>
                  ) : (
                    <>
                  <span className="text-white font-black tracking-tighter">
                        {item.current}<span className="text-white/40 font-bold text-sm">{item.target > 0 ? `/${item.target}` : ''}</span>
                  </span>
                      <span className={`text-[10px] font-black text-right ${item.progress >= 100 && item.target > 0 ? 'text-emerald-400' : 'text-white/50'}`}>
                        {item.target > 0 ? `${item.progress}%` : 'à définir'}
                  </span>
                      <button
                        type="button"
                        onClick={() => { setGoalInput(String(item.target || '')); setEditingGoal(item.kind); }}
                        className="p-1.5 rounded-lg bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition"
                        aria-label={`Modifier l'objectif ${item.title}`}
                      >
                        <Pencil size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${item.progress >= 100 && item.target > 0 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-harx-300 to-harx-500'}`} style={{ width: `${item.target > 0 ? item.progress : 0}%` }} />
              </div>
            </div>
          ))}

          <div className="rounded-2xl border border-harx-400/40 bg-harx-500/15 p-4 space-y-3 shadow-[0_0_40px_-12px_rgba(236,72,153,0.65)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Trophy size={14} className="text-harx-300" />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Mon objectif gains · {goalsPeriodLabels[goalsPeriod]}</span>
              </div>
              {editingGoal === 'earnings' ? (
                <button
                  type="button"
                  onClick={() => saveEarningsGoal(goalInput)}
                  className="p-1.5 rounded-lg bg-emerald-500/30 text-emerald-300 hover:bg-emerald-500/50 transition"
                  aria-label="Enregistrer l'objectif de gains"
                >
                  <Check size={12} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setGoalInput(String(repEarningsGoal || '')); setEditingGoal('earnings'); }}
                  className="p-1.5 rounded-lg bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition"
                  aria-label="Modifier l'objectif de gains"
                >
                  <Pencil size={12} />
                </button>
              )}
            </div>
            {editingGoal === 'earnings' ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveEarningsGoal(goalInput); }}
                  className="flex-1 bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 text-sm font-black focus:outline-none focus:border-harx-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="Ex. 500"
                  autoFocus
                />
                <span className="text-white/60 text-sm font-bold">€</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-3xl font-black text-white tracking-tighter">{fmtMoney(goals.earned)} €</span>
                  <span className="text-sm font-bold text-white/50">
                    {repEarningsGoal > 0 ? `/ ${fmtMoney(repEarningsGoal)} €` : 'Objectif à définir'}
                  </span>
                </div>
                <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${earningsGoalProgress >= 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-harx-300 to-harx-500'}`}
                    style={{ width: `${repEarningsGoal > 0 ? earningsGoalProgress : 0}%` }}
                      />
                    </div>
                <p className="text-[11px] font-bold text-white/70">
                  {repEarningsGoal > 0
                    ? (earningsGoalProgress >= 100
                      ? 'Objectif atteint'
                      : `${earningsGoalProgress}% · il reste ${fmtMoney(Math.max(0, repEarningsGoal - goals.earned))} €`)
                    : 'Fixez votre gain cible pour le jour, la semaine ou le mois'}
                </p>
              </div>
            )}
          </div>

          <div className="h-px bg-white/10" />
          <button
            type="button"
            onClick={() => setShowCalculator((open) => !open)}
            className="w-full flex items-center justify-between gap-2 text-left group"
          >
            <div className="flex items-center gap-2">
              <Calculator size={13} className="text-cyan-400" />
              <span className="text-[10px] font-black text-white/70 uppercase tracking-widest group-hover:text-white transition">Simulateur</span>
            </div>
            <ChevronDown size={12} className={`text-white/30 transition-transform ${showCalculator ? 'rotate-180' : ''}`} />
          </button>
          {showCalculator && (
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
              {gigsData.length === 0 ? (
                <p className="text-[12px] font-bold text-white/50">Aucun GIG disponible.</p>
              ) : gigsData.map((gig) => {
                const selected = Boolean(simGigs[gig._id]);
                const row = simRows.find((item) => item.id === gig._id);
                return (
                  <div key={gig._id} className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
                    <button
                      type="button"
                      onClick={() => toggleSimGig(gig._id)}
                      className="w-full flex items-center gap-2 text-left"
                    >
                      <span className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${selected ? 'bg-harx-500 border-harx-400 text-white' : 'border-white/30'}`}>
                        {selected ? <Check size={10} /> : null}
                      </span>
                      <span className="text-[12px] font-black text-white truncate">{gig.title || t('dashboard.home.gigFallback')}</span>
                    </button>
                    {selected && row && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-white/40 uppercase tracking-wider block">Appels</label>
                            <input
                              type="number"
                              min={0}
                              value={simGigs[gig._id]?.calls ?? ''}
                              onChange={(e) => setSimField(gig._id, 'calls', e.target.value)}
                              placeholder="0"
                              className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-2 py-1.5 text-sm font-black text-center focus:outline-none focus:border-cyan-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <p className="text-[10px] font-bold text-white/45 text-center">× {fmtMoney(row.callRate)} €</p>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-white/40 uppercase tracking-wider block">Transactions</label>
                            <input
                              type="number"
                              min={0}
                              max={Math.max(0, Math.round(Number(simGigs[gig._id]?.calls) || 0))}
                              value={simGigs[gig._id]?.transactions ?? ''}
                              onChange={(e) => setSimField(gig._id, 'transactions', e.target.value)}
                              placeholder="0"
                              className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-2 py-1.5 text-sm font-black text-center focus:outline-none focus:border-cyan-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <p className="text-[10px] font-bold text-white/45 text-center">× {fmtMoney(row.txRate)} €</p>
                            <p className="text-[9px] font-bold text-white/35 text-center">Pas plus que les appels</p>
                          </div>
                        </div>
                        {row.bonusAmount > 0 && (
                          <p className={`text-[11px] font-bold ${row.bonusIncluded ? 'text-emerald-300' : 'text-white/45'}`}>
                            {row.bonusIncluded
                              ? `Bonus inclus +${fmtMoney(row.bonusAmount)} €`
                              : `Bonus +${fmtMoney(row.bonusAmount)} € dès ${row.bonusTarget} transactions ${bonusPeriodLabel[row.bonusPeriod]}`}
                          </p>
                        )}
                        <p className="text-[11px] font-bold text-white/70">
                          {row.calls} × {fmtMoney(row.callRate)} € + {row.transactions} × {fmtMoney(row.txRate)} €
                          {row.bonusIncluded ? ` + ${fmtMoney(row.bonusAmount)} €` : ''}
                          {' = '}{fmtMoney(row.total)} €
                        </p>
                      </>
                    )}
                  </div>
                );
              })}
              <div className="rounded-xl bg-harx-500/20 border border-harx-400/30 px-4 py-3">
                <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Résultat</p>
                <p className="text-xl font-black text-harx-300 tracking-tight">+{fmtMoney(simTotal)} €</p>
              </div>
            </div>
          )}

        </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-orange-200/60 bg-gradient-to-br from-white to-orange-50/40 p-4 shadow-sm min-h-[108px] flex flex-col">
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
        </div>

        <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-white to-amber-50/40 p-4 shadow-sm min-h-[108px] flex flex-col">
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
        </div>

        <div className={`rounded-2xl border p-4 shadow-sm min-h-[108px] flex flex-col ${qualityAlerts.fraud > 0 ? 'border-rose-300 bg-rose-50' : 'border-emerald-200/70 bg-white'}`}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700 leading-tight">Fraude</p>
            <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${qualityAlerts.fraud > 0 ? 'bg-rose-500/15 text-rose-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
              <ShieldAlert size={14} />
            </div>
          </div>
          <p className={`text-xl font-black tracking-tight mt-2 ${qualityAlerts.fraud > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
            {qualityAlerts.fraud}
          </p>
          <p className="text-[10px] text-slate-500 mt-auto pt-2">
            {qualityAlerts.fraud > 0 ? 'Appels signalés sur la période' : 'Aucun signalement'}
          </p>
        </div>

        <div className="rounded-2xl border border-indigo-200/70 bg-white p-4 shadow-sm min-h-[108px] flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 leading-tight">Score qualité</p>
            <div className="h-8 w-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
              <Award size={14} />
            </div>
          </div>
          <p className="text-xl font-black text-indigo-700 tracking-tight mt-2">
            {qualityAlerts.quality == null ? '—' : qualityAlerts.quality}
          </p>
          <p className="text-[10px] text-slate-500 mt-auto pt-2">Moyenne des appels scorés</p>
        </div>
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

      <button
        type="button"
        onClick={() => navigate('/calls')}
        className="w-full flex items-center justify-between gap-3 px-6 py-4 rounded-[28px] bg-slate-900 text-white shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all group"
      >
        <span className="flex items-center gap-3">
          <span className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center">
            <Phone size={18} />
          </span>
          <span className="text-sm font-black uppercase tracking-tight">{t('dashboard.home.historyButton')}</span>
        </span>
        <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
      </button>

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
                  <p className="text-[10px] text-slate-400">Lire avant vos créneaux</p>
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

    </div>
  );
}