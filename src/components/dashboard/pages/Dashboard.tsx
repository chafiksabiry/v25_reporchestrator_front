import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TrendingUp, DollarSign, Clock, Phone, Target, Award, Briefcase, CheckCircle2, Wallet as WalletIcon, Trophy, Flame, CalendarDays, CalendarCheck, CalendarX, Timer, Filter as FilterIcon, ChevronDown, ChevronRight, RotateCcw, Building2, ShieldCheck, ShieldAlert, Rocket, Calculator, Pencil, Check, Medal, ListChecks, PhoneCall, BookOpen, GraduationCap, Ban, Zap, FileText, History } from 'lucide-react';
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
import {
  isDateInPeriod,
  resolveIanaZone,
  zonedWallTimeToUtc,
  type StatsPeriod,
} from '../../../utils/planningMetrics';

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

/** Inclusive end of period (local calendar day), or null for "all". */
const getPeriodEndYmd = (period: PeriodKey): string | null => {
  const now = new Date();
  switch (period) {
    case 'today': {
      return toLocalYmd(getPeriodStart('today'));
    }
    case 'week': {
      const start = new Date(getPeriodStart('week'));
      start.setDate(start.getDate() + 6); // Sunday
      return toLocalYmd(start.getTime());
    }
    case 'month': {
      const d = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return toLocalYmd(d.getTime());
    }
    case 'quarter': {
      const q = Math.floor(now.getMonth() / 3);
      const d = new Date(now.getFullYear(), q * 3 + 3, 0);
      return toLocalYmd(d.getTime());
    }
    case 'year': {
      const d = new Date(now.getFullYear(), 11, 31);
      return toLocalYmd(d.getTime());
    }
    case 'all':
    default:
      return null;
  }
};

/** Local calendar day yyyy-MM-dd for a reservation. */
function reservationYmd(r: { reservationDate?: string; date?: string }): string {
  return String(r.reservationDate || r.date || '').slice(0, 10);
}

/** Duration in hours from API, else derived from start/end, else 1h. */
function reservationDurationHours(r: {
  duration?: number;
  startTime?: string;
  endTime?: string;
}): number {
  const dur = Number(r.duration);
  if (Number.isFinite(dur) && dur > 0) return dur;
  const start = String(r.startTime || '').slice(0, 5);
  const end = String(r.endTime || '').slice(0, 5);
  if (/^\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}$/.test(end)) {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const hours = (eh * 60 + em - (sh * 60 + sm)) / 60;
    if (Number.isFinite(hours) && hours > 0) return hours;
  }
  return 1;
}

/** End of slot as local ms (for upcoming vs past). */
function reservationEndMs(r: {
  reservationDate?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
}): number {
  const ymd = reservationYmd(r);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return 0;
  const end = String(r.endTime || r.startTime || '23:59').slice(0, 5);
  const d = new Date(`${ymd}T${end}:00`);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function toLocalYmd(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

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
  const goalsCardRef = useRef<HTMLDivElement>(null);
  const [earningsGoals, setEarningsGoals] = useState<EarningsGoals>(loadEarningsGoals);
  const [callGoals, setCallGoals] = useState<CountGoals>(() => loadCountGoals('harx_call_goals'));
  const [transactionGoals, setTransactionGoals] = useState<CountGoals>(() => loadCountGoals('harx_transaction_goals'));
  const [editingGoal, setEditingGoal] = useState<null | 'earnings' | 'calls' | 'transactions'>(null);
  const [goalInput, setGoalInput] = useState('0');
  // Reservations cancellation stats period
  const [cancelStatsPeriod, setCancelStatsPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('week');

  useEffect(() => {
    if (!goalsOpen) return;
    const frame = requestAnimationFrame(() => {
      goalsCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(frame);
  }, [goalsOpen]);

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

  // Reservations filtered by gig + period (inclusive calendar range for the selected period)
  const filteredReservations = useMemo(() => {
    const startYmd = periodStartTs > 0 ? toLocalYmd(periodStartTs) : '';
    const endYmd = getPeriodEndYmd(selectedPeriod);
    return reservationsData.filter((r: any) => {
      if (selectedGigId !== 'all') {
        const rGigId = typeof r.gigId === 'object' ? (r.gigId?._id || r.gigId?.id) : r.gigId;
        if (String(rGigId || '') !== String(selectedGigId)) return false;
      }
      if (startYmd && endYmd) {
        const ymd = reservationYmd(r);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
        if (ymd < startYmd || ymd > endYmd) return false;
      }
      return true;
    });
  }, [reservationsData, selectedGigId, periodStartTs, selectedPeriod]);

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

  // Reservation statistics from real matching API rows (filtered by gig + dashboard period)
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
      const duration = reservationDurationHours(r);
      scheduledHours += duration;

      const status = String(r.status || '').toLowerCase();
      if (status === 'cancelled') {
        cancelled += 1;
        return;
      }

      const endTs = reservationEndMs(r);
      const isFuture = endTs > 0 ? endTs > nowTs : false;

      if (isFuture) {
        upcoming += 1;
        return;
      }

      // Past reserved slot
      if (r.attended === false) {
        noShow += 1;
        return;
      }

      // attended === true OR attendance not tracked yet → counted as effectuée
      completed += 1;
      workedHours += duration;
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

  // Last-minute cancel rate for Sem./Mois/Trim./Année chips (≤ 2h before slot start)
  const cancelRate = useMemo(() => {
    const period = cancelStatsPeriod as StatsPeriod;
    const gigTz =
      selectedGigId !== 'all'
        ? resolveIanaZone(gigsData.find((g) => g._id === selectedGigId)?.availability?.time_zone)
        : null;

    const relevant = reservationsData.filter((r: any) => {
      if (selectedGigId !== 'all') {
        const rGigId = typeof r.gigId === 'object' ? (r.gigId?._id || r.gigId?.id) : r.gigId;
        if (String(rGigId || '') !== String(selectedGigId)) return false;
      }
      const ymd = reservationYmd(r);
      return isDateInPeriod(ymd, period);
    });

    if (relevant.length === 0) return null;

    const lastMinute = relevant.filter((r: any) => {
      if (String(r.status || '').toLowerCase() !== 'cancelled') return false;
      const ymd = reservationYmd(r);
      const start = String(r.startTime || '00:00').slice(0, 5);
      const cancelledRaw = r.cancelledAt || r.canceledAt || r.updatedAt;
      if (!cancelledRaw) return false;
      const cancelledAt = new Date(cancelledRaw);
      if (Number.isNaN(cancelledAt.getTime())) return false;

      let slotStart: Date | null = null;
      if (gigTz) slotStart = zonedWallTimeToUtc(ymd, start, gigTz);
      if (!slotStart) slotStart = new Date(`${ymd}T${start}:00`);
      if (!slotStart || Number.isNaN(slotStart.getTime())) return false;

      const diffMs = slotStart.getTime() - cancelledAt.getTime();
      return diffMs >= 0 && diffMs <= 2 * 60 * 60 * 1000;
    }).length;

    return Math.round((lastMinute / relevant.length) * 100);
  }, [reservationsData, selectedGigId, gigsData, cancelStatsPeriod]);

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

  // Objectifs appels/transactions → alimentent automatiquement le simulateur
  useEffect(() => {
    const calls = callGoals[goalsPeriod] || 0;
    const txs = Math.min(transactionGoals[goalsPeriod] || 0, calls);
    if (calls <= 0 && txs <= 0) return;
    if (gigsData.length === 0) return;

    const preferredId =
      (selectedGigId !== 'all' && gigsData.some((g) => g._id === selectedGigId) ? selectedGigId : null)
      || (hoursGigId && gigsData.some((g) => g._id === hoursGigId) ? hoursGigId : null)
      || gigsData[0]?._id
      || null;
    if (!preferredId) return;

    setShowCalculator(true);
    setSimGigs((current) => {
      const ids = Object.keys(current).length > 0 ? Object.keys(current) : [preferredId];
      const next: Record<string, { calls: string; transactions: string }> = { ...current };
      ids.forEach((id) => {
        next[id] = {
          calls: calls > 0 ? String(calls) : '',
          transactions: txs > 0 ? String(txs) : '',
        };
      });
      if (!next[preferredId]) {
        next[preferredId] = {
          calls: calls > 0 ? String(calls) : '',
          transactions: txs > 0 ? String(txs) : '',
        };
      }
      return next;
    });
    // selectedGigId / hoursGigId / gigsData lus au moment du sync objectifs uniquement
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callGoals, transactionGoals, goalsPeriod, gigsData.length]);

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
    <div className="space-y-1.5 pb-1 animate-in fade-in duration-500">
      {/* Dynamic Filter Header */}
      <div className="flex flex-col gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black uppercase tracking-tight text-slate-800 sm:text-xl">
              {t('dashboard.home.greeting', { name: displayName })}
            </h1>
          </div>
          <button
            type="button"
            onClick={goToProduction}
            className="harx-go-live group inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-gradient-to-r from-[#e11d48] to-[#be123c] px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
          >
            <Rocket size={13} className="transition-transform group-hover:rotate-12" />
            {t('dashboard.home.goLive.title')}
            <ChevronRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <div className="relative flex items-center gap-1.5">
              <Briefcase size={14} className="text-slate-500" />
              <div className="relative w-full min-w-0 sm:min-w-[180px] sm:max-w-[260px]">
                <button
                  ref={gigTriggerRef}
                  type="button"
                  onClick={toggleGigDropdown}
                  className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-slate-100 bg-white/80 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm transition-all duration-300 hover:border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  <span className="truncate text-left normal-case">{selectedGigLabel}</span>
                  <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-300 ${isGigDropdownOpen ? 'rotate-180 text-purple-500' : ''}`} />
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

            <div className="relative flex items-center gap-1.5">
              <CalendarDays size={14} className="text-blue-600" />
              <div className="relative w-full min-w-0 sm:min-w-[140px] sm:max-w-[200px]">
                <button
                  ref={periodTriggerRef}
                  type="button"
                  onClick={togglePeriodDropdown}
                  className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-slate-100 bg-white/80 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm transition-all duration-300 hover:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <span className="truncate text-left">{selectedPeriodLabel}</span>
                  <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-300 ${isPeriodDropdownOpen ? 'rotate-180 text-blue-500' : ''}`} />
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

      {/* ── Opérations ── */}
      <section className="space-y-1.5" aria-labelledby="dashboard-ops-heading">
        <h2 id="dashboard-ops-heading" className="px-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
          {t('dashboard.home.sections.operations', 'Opérations')}
        </h2>

        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
          <div className={`flex flex-col rounded-xl border px-2.5 py-1.5 shadow-sm ${qualityAlerts.fraud > 0 ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-center justify-between gap-1">
              <p className={`text-[9px] font-bold uppercase tracking-wider leading-tight ${qualityAlerts.fraud > 0 ? 'text-rose-700' : 'text-slate-500'}`}>Fraude</p>
              <ShieldAlert size={12} className={`shrink-0 ${qualityAlerts.fraud > 0 ? 'text-rose-600' : 'text-emerald-500'}`} />
            </div>
            <p className={`mt-0.5 text-base font-black tracking-tight leading-none ${qualityAlerts.fraud > 0 ? 'text-rose-700' : 'text-emerald-600'}`}>
              {qualityAlerts.fraud}
            </p>
          </div>
          <div className="flex flex-col rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm">
            <div className="flex items-center justify-between gap-1">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 leading-tight">Score qualité</p>
              <Award size={12} className="shrink-0 text-indigo-500" />
            </div>
            <p className="mt-0.5 text-base font-black tracking-tight text-indigo-600 leading-none">
              {qualityAlerts.quality == null ? '—' : qualityAlerts.quality}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <div className="flex shrink-0 items-center gap-1.5">
              <ListChecks size={14} className="text-violet-600" />
              <h3 className="text-[10px] font-black uppercase tracking-tight text-slate-800 whitespace-nowrap">À faire aujourd'hui</h3>
            </div>
            <span className="inline-flex items-center gap-1 rounded-lg border border-violet-100 bg-violet-50 px-2 py-1 text-[10px] font-bold text-slate-700">
              <GraduationCap size={11} className="shrink-0 text-violet-600" />
              Formations
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg border border-blue-100 bg-blue-50 px-2 py-1 text-[10px] font-bold text-slate-700">
              <BookOpen size={11} className="shrink-0 text-blue-600" />
              Scripts
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-slate-700">
              <FileText size={11} className="shrink-0 text-emerald-600" />
              KB
            </span>
            <button
              type="button"
              onClick={() => navigate('/academy')}
              className="harx-flash harx-flash--violet group inline-flex shrink-0 items-center justify-center gap-1 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-200"
            >
              <GraduationCap size={11} />
              Academy
              <ChevronRight size={11} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          <div className="hidden h-6 w-px bg-slate-200 sm:block" />

          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <div className="flex shrink-0 items-center gap-1.5">
              <PhoneCall size={14} className="text-amber-600" />
              <h3 className="text-[10px] font-black uppercase tracking-tight text-slate-800 whitespace-nowrap">Rappels</h3>
            </div>
            <p className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-500">Aucun rappel pour le moment</p>
            <button
              type="button"
              onClick={() => navigate('/workspace')}
              className="harx-flash harx-flash--amber group inline-flex shrink-0 items-center justify-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
            >
              <PhoneCall size={11} />
              Prospects
              <ChevronRight size={11} className="transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/workspace?tab=calls')}
              className="harx-flash harx-flash--slate group inline-flex shrink-0 items-center justify-center gap-1 rounded-full bg-gradient-to-r from-slate-700 to-slate-900 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            >
              <History size={11} />
              {t('dashboard.home.sections.callHistory', 'Historique')}
              <ChevronRight size={11} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:p-2.5">
          <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-violet-200/40 blur-2xl" />
          <div className="relative z-10 mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                <CalendarCheck size={15} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-tight text-slate-800">{t('dashboard.home.reservations.title')}</h3>
              </div>
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              {t('dashboard.home.reservations.count', {
                count: reservationStats.total,
                period: selectedPeriod === 'all'
                  ? t('dashboard.home.reservations.countPeriodAll')
                  : selectedPeriodLabel,
              })}
            </span>
          </div>

          <div className="relative z-10 flex flex-wrap gap-1.5">
            <div className="flex min-w-[72px] flex-col rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5">
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">{t('dashboard.home.reservations.total')}</span>
              <span className="text-lg font-black tracking-tighter text-slate-900 leading-none">{reservationStats.total}</span>
            </div>
            <div className="flex min-w-[72px] flex-col rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-1.5">
              <span className="text-[8px] font-black uppercase tracking-widest text-blue-500/80">{t('dashboard.home.reservations.upcoming')}</span>
              <span className="text-lg font-black tracking-tighter text-blue-600 leading-none">{reservationStats.upcoming}</span>
            </div>
            <div className="flex min-w-[72px] flex-col rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5">
              <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600/80">{t('dashboard.home.reservations.completed')}</span>
              <span className="text-lg font-black tracking-tighter text-emerald-600 leading-none">{reservationStats.completed}</span>
            </div>
            <div className="flex min-w-[72px] flex-col rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5">
              <span className="text-[8px] font-black uppercase tracking-widest text-rose-500/80">{t('dashboard.home.reservations.missed')}</span>
              <span className="text-lg font-black tracking-tighter text-rose-600 leading-none">{reservationStats.noShow}</span>
            </div>
            <div className="flex min-w-[72px] flex-col rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5">
              <span className="text-[8px] font-black uppercase tracking-widest text-amber-600/80">{t('dashboard.home.reservations.hoursWorked')}</span>
              <span className="text-lg font-black tracking-tighter text-amber-600 leading-none">{reservationStats.workedHours}h</span>
            </div>
            <div className="flex min-w-[72px] flex-col rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5">
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">{t('dashboard.home.reservations.attendance')}</span>
              <span className="text-lg font-black tracking-tighter text-slate-800 leading-none">{reservationStats.attendanceRate}%</span>
            </div>
            <div className="flex min-w-[120px] flex-col gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5">
              <div className="flex items-center gap-1.5">
                <Ban size={11} className="text-slate-500" />
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{t('sessionPlanning.lastMinuteCancel', 'Taux d\'annulation')}</p>
                <p className="ml-auto text-sm font-black tracking-tight text-slate-800 leading-none">
                  {cancelRate == null ? '—' : `${cancelRate}%`}
                </p>
              </div>
              <div className="flex flex-wrap gap-0.5">
                {(['week', 'month', 'quarter', 'year'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCancelStatsPeriod(key)}
                    className={`rounded px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider transition ${
                      cancelStatsPeriod === key ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {key === 'week' ? 'Sem.' : key === 'month' ? 'Mois' : key === 'quarter' ? 'Trim.' : 'Année'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-1.5">
            <button
              type="button"
              onClick={() => {
                const gigId = selectedGigId !== 'all' ? selectedGigId : '';
                navigate(gigId ? `/session-planning?gigId=${encodeURIComponent(String(gigId))}` : '/session-planning');
              }}
              className="harx-flash harx-flash--cyan group inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-teal-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
            >
              <CalendarCheck size={12} />
              {t('dashboard.home.reservations.book')}
              <ChevronRight size={12} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Finance ── */}
      <section className="space-y-1.5" aria-labelledby="dashboard-finance-heading">
        <h2 id="dashboard-finance-heading" className="px-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
          {t('dashboard.home.sections.finance', 'Finance')}
        </h2>

        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-6">
          <div className="flex flex-col rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm">
            <div className="flex items-center justify-between gap-1">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
                {earningsPipeline.periodStartTitle}
              </p>
              <CalendarDays size={12} className="shrink-0 text-slate-400" />
            </div>
            <p className="mt-0.5 text-base font-black tracking-tight text-slate-800 leading-none">
              {fmtMoney(earningsPipeline.periodStartBalance)} €
            </p>
            {earningsPipeline.periodStartDateLabel && (
              <p className="mt-0.5 truncate text-[9px] text-slate-400">{earningsPipeline.periodStartDateLabel}</p>
            )}
          </div>

          <div className="flex flex-col rounded-xl border border-emerald-100 bg-white px-2.5 py-1.5 shadow-sm">
            <div className="flex items-center justify-between gap-1">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
                {t('dashboard.home.pipeline.availableBalance')}
              </p>
              <WalletIcon size={12} className="shrink-0 text-emerald-500" />
            </div>
            <p className="mt-0.5 text-base font-black tracking-tight text-slate-800 leading-none">
              {fmtMoney(earningsPipeline.availableBalance)} €
            </p>
            <p className="mt-0.5 text-[9px] font-semibold text-emerald-600">
              {t('dashboard.home.pipeline.readyToWithdraw')}
            </p>
          </div>

          <div className="flex flex-col rounded-xl border border-emerald-100 bg-white px-2.5 py-1.5 shadow-sm">
            <div className="flex items-center justify-between gap-1">
              <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 leading-tight">
                {t('dashboard.home.pipeline.validatedEarnings')}
              </p>
              <ShieldCheck size={12} className="shrink-0 text-emerald-500" />
            </div>
            <p className="mt-0.5 text-base font-black tracking-tight text-emerald-700 leading-none">
              +{fmtMoney(earningsPipeline.validatedInPeriod)} €
            </p>
            <p className="mt-0.5 truncate text-[9px] text-emerald-600/80">
              {t('dashboard.home.pipeline.calls', { count: earningsPipeline.validatedCallsCount || 0 })}
              {' · '}
              {t('dashboard.home.pipeline.sales', { count: earningsPipeline.validatedSalesCount || 0 })}
            </p>
          </div>

          <div className="flex flex-col rounded-xl border border-orange-100 bg-white px-2.5 py-1.5 shadow-sm">
            <div className="flex items-center justify-between gap-1">
              <p className="text-[9px] font-bold uppercase tracking-wider text-orange-700 leading-tight">
                {t('dashboard.home.pipeline.retraction')}
              </p>
              <RotateCcw size={12} className="shrink-0 text-orange-500" />
            </div>
            <p className="mt-0.5 text-base font-black tracking-tight text-orange-700 leading-none">
              {earningsPipeline.retractionAmount > 0 ? '+' : ''}{fmtMoney(earningsPipeline.retractionAmount)} €
            </p>
            <p className="mt-0.5 text-[9px] text-orange-600/80">
              {earningsPipeline.retractionCount > 0
                ? t('dashboard.home.pipeline.salesRetraction', { count: earningsPipeline.retractionCount })
                : t('dashboard.home.pipeline.noSales')}
            </p>
          </div>

          <div className="flex flex-col rounded-xl border border-amber-100 bg-white px-2.5 py-1.5 shadow-sm">
            <div className="flex items-center justify-between gap-1">
              <p className="text-[9px] font-bold uppercase tracking-wider text-amber-700 leading-tight">
                {t('dashboard.home.pipeline.clientValidation')}
              </p>
              <Building2 size={12} className="shrink-0 text-amber-500" />
            </div>
            <p className="mt-0.5 text-base font-black tracking-tight text-amber-700 leading-none">
              +{fmtMoney(earningsPipeline.clientValidationAmount)} €
            </p>
            <p className="mt-0.5 text-[9px] text-amber-600/80">
              {earningsPipeline.clientValidationCount > 0
                ? t('dashboard.home.pipeline.pendingCount', { count: earningsPipeline.clientValidationCount })
                : t('dashboard.home.pipeline.nothingPending')}
            </p>
          </div>

          <div className="relative flex flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 shadow-sm">
            <div className="relative z-10 flex items-center justify-between gap-1">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-300 leading-tight">
                {t('dashboard.home.pipeline.periodTotal')}
              </p>
              <Trophy size={12} className="shrink-0 text-amber-300" />
            </div>
            <p className="relative z-10 mt-0.5 text-base font-black tracking-tight text-white leading-none">
              {fmtMoney(earningsPipeline.totalGains)} €
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-amber-100 bg-white p-2 shadow-sm sm:p-2.5">
          <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-amber-200/40 blur-3xl" />
          <div className="relative z-10 mb-1 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <Medal size={15} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-tight text-slate-800">Classement des gains</h3>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                  {selectedGigId === 'all' ? 'Sélectionnez un GIG' : selectedGigLabel}
                </p>
              </div>
            </div>
          </div>
          <div className="relative z-10 min-h-[2.5rem]" aria-hidden={true} />
        </div>

      {/* Objectifs — pavé unique consolidé avec objectifs company + objectif REP + simulateur */}
      <div ref={goalsCardRef} className="relative scroll-mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:p-2.5">
        <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-slate-200/50 blur-3xl" />

        {/* Header */}
        <div className={`relative z-10 flex flex-wrap items-center justify-between gap-2 ${goalsOpen ? 'mb-2' : ''}`}>
          <button
            type="button"
            onClick={() => setGoalsOpen((open) => !open)}
            className="flex min-w-0 items-center gap-2 text-left"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm shadow-violet-300/50">
              <Target size={15} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-black uppercase tracking-tight text-slate-800">{t('dashboard.home.goals.title')}</h2>
              <p className="truncate text-[9px] font-bold uppercase tracking-widest text-violet-500">
                {goals.label}
              </p>
            </div>
            <span className="relative inline-flex h-7 w-7 shrink-0 items-center justify-center">
              {!goalsOpen && (
                <span className="absolute inset-0 rounded-full bg-violet-400/60 motion-reduce:hidden animate-ping" />
              )}
              <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white ring-2 ring-violet-100">
                <ChevronDown size={14} className={`transition-transform duration-300 ${goalsOpen ? 'rotate-180' : ''}`} />
              </span>
            </span>
          </button>
          {/* Sélecteur période */}
          <div className="flex shrink-0 flex-wrap gap-0.5">
            {(GOALS_PERIODS as GoalsPeriod[]).map((key) => {
              const periodTone: Record<GoalsPeriod, { on: string; off: string }> = {
                today: {
                  on: 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-sm shadow-sky-300/60',
                  off: 'bg-sky-50 text-sky-600 hover:bg-sky-100 border border-sky-100',
                },
                week: {
                  on: 'bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-sm shadow-violet-300/60',
                  off: 'bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-100',
                },
                month: {
                  on: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-300/60',
                  off: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100',
                },
                quarter: {
                  on: 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm shadow-amber-300/60',
                  off: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-100',
                },
                year: {
                  on: 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-sm shadow-rose-300/60',
                  off: 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100',
                },
              };
              const tone = periodTone[key];
              return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setGoalsPeriod(key);
                  setSelectedPeriod(key);
                  setEditingGoal(null);
                }}
                className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-wider transition ${
                  goalsPeriod === key ? tone.on : tone.off
                }`}
              >
                {goalsPeriodLabels[key]}
              </button>
              );
            })}
          </div>
        </div>

        {goalsOpen && (
        <div className="relative z-10 space-y-3">

          {/* Consigne pédagogique */}
          <div className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 via-sky-50 to-violet-50 p-3.5 shadow-sm">
            <p className="text-[10px] font-black text-cyan-700 uppercase tracking-[0.18em] mb-1.5">
              {t('dashboard.home.goals.howtoTitle')}
            </p>
            <p className="text-[13px] font-bold text-slate-800 leading-snug">
              {t('dashboard.home.goals.howtoBody')}
            </p>
            <p className="text-[11px] font-semibold text-cyan-700/90 mt-2 leading-snug">
              {t('dashboard.home.goals.howtoHint')}
            </p>
          </div>

          <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em]">{t('dashboard.home.goals.hoursMinLabel')}</p>

          {selectedGigId === 'all' ? (
            <div className="space-y-3">
              <p className="text-[12px] font-bold text-slate-600 leading-snug">
                Chaque GIG a ses propres heures et son propre bonus. Les objectifs d'appels, de transactions et de gains, plus bas, comptent sur tous les GIGs.
              </p>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setHoursMenuOpen((open) => !open)}
                  className="w-full flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-left"
                >
                  <span className="text-[12px] font-black text-slate-900 truncate">
                    {goals.perGig.find((gig) => gig.id === hoursGigId)?.title || 'Choisir un GIG'}
                      </span>
                  <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ${hoursMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {hoursMenuOpen && (
                  <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
                    {goals.perGig.map((gig) => (
                      <button
                        key={gig.id}
                        type="button"
                        onClick={() => { setHoursGigId(gig.id); setHoursMenuOpen(false); }}
                        className={`w-full px-3 py-2.5 text-left text-[12px] font-bold truncate transition ${gig.id === hoursGigId ? 'bg-slate-800 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                      >
                        {gig.title}
                      </button>
                    ))}
                </div>
              )}
                    </div>
              {goals.perGig.filter((gig) => gig.id === hoursGigId).map((gig) => (
                <div key={gig.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 space-y-2">
                  {([
                    { label: 'Jour', row: gig.hours.daily },
                    { label: 'Semaine', row: gig.hours.weekly },
                    { label: 'Mois', row: gig.hours.monthly },
                  ] as const).map(({ label, row }) => (
                    <div key={label} className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
                      <span className={`text-[11px] font-black ${row.reached ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {row.target > 0 ? `${row.current}h / ${row.target}h` : `${row.current}h · pas de minimum`}
                      </span>
                    </div>
                  ))}
                  <p className={`text-[11px] font-bold ${gig.bonus.triggered ? 'text-emerald-600' : 'text-slate-500'}`}>
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
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                <span className="text-slate-900 font-black tracking-tighter">
                    {row.current}h<span className="text-slate-400 font-bold text-sm">{row.target > 0 ? `/${row.target}h` : ''}</span>
                </span>
                  <span className={`text-[10px] font-black min-w-[32px] text-right ${row.reached ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {row.target > 0 ? `${row.progressPct}%` : '—'}
                </span>
              </div>
            </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${row.reached ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-violet-400 to-violet-500'}`} style={{ width: `${row.progressPct}%` }} />
            </div>
          </div>
          ))}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Flame size={13} className={goals.bonus.triggered ? 'text-emerald-400' : 'text-orange-400'} />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('dashboard.home.goals.bonusTitle')}</span>
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
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${goals.bonus.triggered ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-orange-400 to-amber-400'}`} style={{ width: `${goals.bonus.progressPct}%` }} />
            </div>
            <p className="text-[10px] font-bold text-slate-400">
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

          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] pt-1">
            {t('dashboard.home.goals.myGoalsLabel')} · {goalsPeriodLabels[goalsPeriod]}
          </p>y

          {([
            {
              kind: 'calls' as const,
              title: t('dashboard.home.goals.callsTitle'),
              icon: <Phone size={13} className="text-cyan-300" />,
              current: goals.calls.current,
              target: repCallGoal,
              progress: callGoalProgress,
              barClass: 'bg-gradient-to-r from-cyan-400 to-sky-400',
              doneClass: 'bg-gradient-to-r from-emerald-400 to-lime-400',
            },
            {
              kind: 'transactions' as const,
              title: t('dashboard.home.goals.transactionsTitle'),
              icon: <Zap size={13} className="text-amber-300" />,
              current: goals.transactions.current,
              target: repTxGoal,
              progress: txGoalProgress,
              barClass: 'bg-gradient-to-r from-amber-400 to-orange-400',
              doneClass: 'bg-gradient-to-r from-emerald-400 to-lime-400',
            },
          ]).map((item) => (
            <div key={item.kind} className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {item.icon}
                  <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{item.title}</span>
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
                        className="w-16 bg-white border border-cyan-300 text-slate-900 rounded-lg px-2 py-1 text-xs font-black text-center focus:outline-none focus:border-cyan-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        autoFocus
                      />
                      <button type="button" onClick={() => saveCountGoal(item.kind, goalInput)} className="p-1.5 rounded-lg bg-emerald-500/40 text-emerald-200" aria-label="Enregistrer">
                        <Check size={12} />
                      </button>
                    </>
                  ) : (
                    <>
                  <span className="text-slate-900 font-black tracking-tighter">
                        {item.current}<span className="text-slate-400 font-bold text-sm">{item.target > 0 ? `/${item.target}` : ''}</span>
                  </span>
                      <span className={`text-[10px] font-black text-right ${item.progress >= 100 && item.target > 0 ? 'text-emerald-300' : 'text-cyan-200'}`}>
                        {item.target > 0 ? `${item.progress}%` : 'à définir'}
                  </span>
                      <button
                        type="button"
                        onClick={() => { setGoalInput(String(item.target || '')); setEditingGoal(item.kind); }}
                        className="p-1.5 rounded-lg bg-cyan-50 text-cyan-700 hover:bg-cyan-100 transition ring-1 ring-cyan-200"
                        aria-label={`Modifier l'objectif ${item.title}`}
                      >
                        <Pencil size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${item.progress >= 100 && item.target > 0 ? item.doneClass : item.barClass}`} style={{ width: `${item.target > 0 ? item.progress : 0}%` }} />
              </div>
            </div>
          ))}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Trophy size={14} className="text-amber-500" />
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{t('dashboard.home.goals.earningsTitle')} · {goalsPeriodLabels[goalsPeriod]}</span>
              </div>
              {editingGoal === 'earnings' ? (
                <button
                  type="button"
                  onClick={() => saveEarningsGoal(goalInput)}
                  className="p-1.5 rounded-lg bg-emerald-500/40 text-emerald-200 hover:bg-emerald-500/60 transition"
                  aria-label="Enregistrer l'objectif de gains"
                >
                  <Check size={12} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setGoalInput(String(repEarningsGoal || '')); setEditingGoal('earnings'); }}
                  className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition ring-1 ring-slate-200"
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
                  className="flex-1 bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-sm font-black focus:outline-none focus:border-slate-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="Ex. 500"
                  autoFocus
                />
                <span className="text-slate-600 text-sm font-bold">€</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-3xl font-black text-slate-800 tracking-tighter">{fmtMoney(goals.earned)} €</span>
                  <span className="text-sm font-bold text-slate-500">
                    {repEarningsGoal > 0 ? `/ ${fmtMoney(repEarningsGoal)} €` : 'Objectif à définir'}
                  </span>
                </div>
                <div className="h-3 w-full bg-white rounded-full border border-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${earningsGoalProgress >= 100 ? 'bg-gradient-to-r from-emerald-400 to-lime-400' : 'bg-gradient-to-r from-slate-500 to-slate-700'}`}
                    style={{ width: `${repEarningsGoal > 0 ? earningsGoalProgress : 0}%` }}
                      />
                    </div>
                <p className="text-[11px] font-bold text-slate-500">
                  {repEarningsGoal > 0
                    ? (earningsGoalProgress >= 100
                      ? 'Objectif atteint'
                      : `${earningsGoalProgress}% · il reste ${fmtMoney(Math.max(0, repEarningsGoal - goals.earned))} €`)
                    : 'Fixez votre gain cible pour le jour, la semaine ou le mois'}
                </p>
              </div>
            )}
          </div>

          <div className="h-px bg-slate-200" />
          <button
            type="button"
            onClick={() => setShowCalculator((open) => !open)}
            className="w-full flex items-center justify-between gap-2 text-left group rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2.5 hover:bg-cyan-500/20 transition"
          >
            <div className="flex items-center gap-2">
              <Calculator size={14} className="text-cyan-300" />
              <span className="text-[11px] font-black text-cyan-800 uppercase tracking-widest group-hover:text-cyan-950 transition">{t('dashboard.home.goals.simulatorTitle')}</span>
            </div>
            <ChevronDown size={14} className={`text-cyan-200 transition-transform ${showCalculator ? 'rotate-180' : ''}`} />
          </button>
          {showCalculator && (
            <div className="rounded-2xl border border-cyan-200 bg-white p-4 space-y-3 shadow-[0_0_32px_-10px_rgba(34,211,238,0.45)]">
              {gigsData.length === 0 ? (
                <p className="text-[12px] font-bold text-slate-500">Aucun GIG disponible.</p>
              ) : gigsData.map((gig) => {
                const selected = Boolean(simGigs[gig._id]);
                const row = simRows.find((item) => item.id === gig._id);
                return (
                  <div key={gig._id} className={`rounded-xl border p-3 space-y-2 ${selected ? 'border-cyan-400/50 bg-cyan-500/10' : 'border-slate-200 bg-slate-50'}`}>
                    <button
                      type="button"
                      onClick={() => toggleSimGig(gig._id)}
                      className="w-full flex items-center gap-2 text-left"
                    >
                      <span className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${selected ? 'bg-cyan-400 border-cyan-300 text-slate-950' : 'border-white/40'}`}>
                        {selected ? <Check size={10} /> : null}
                      </span>
                      <span className="text-[12px] font-black text-slate-900 truncate">{gig.title || t('dashboard.home.gigFallback')}</span>
                    </button>
                    {selected && row && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                            <label className="text-[9px] font-black text-cyan-200 uppercase tracking-wider block">Appels</label>
                  <input
                    type="number"
                              min={0}
                              value={simGigs[gig._id]?.calls ?? ''}
                              onChange={(e) => setSimField(gig._id, 'calls', e.target.value)}
                              placeholder="0"
                              className="w-full bg-white border border-cyan-200 text-slate-900 rounded-xl px-2 py-1.5 text-sm font-black text-center focus:outline-none focus:border-cyan-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <p className="text-[10px] font-bold text-cyan-700/80 text-center">× {fmtMoney(row.callRate)} €</p>
                </div>
                <div className="space-y-1">
                            <label className="text-[9px] font-black text-amber-200 uppercase tracking-wider block">Transactions</label>
                  <input
                    type="number"
                              min={0}
                              max={Math.max(0, Math.round(Number(simGigs[gig._id]?.calls) || 0))}
                              value={simGigs[gig._id]?.transactions ?? ''}
                              onChange={(e) => setSimField(gig._id, 'transactions', e.target.value)}
                              placeholder="0"
                              className="w-full bg-white border border-amber-200 text-slate-900 rounded-xl px-2 py-1.5 text-sm font-black text-center focus:outline-none focus:border-amber-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <p className="text-[10px] font-bold text-amber-700/80 text-center">× {fmtMoney(row.txRate)} €</p>
                            <p className="text-[9px] font-bold text-slate-400 text-center">Pas plus que les appels</p>
                </div>
                </div>
                        {row.bonusAmount > 0 && (
                          <p className={`text-[11px] font-bold ${row.bonusIncluded ? 'text-emerald-600' : 'text-amber-200/80'}`}>
                            {row.bonusIncluded
                              ? `Bonus inclus +${fmtMoney(row.bonusAmount)} €`
                              : `Bonus +${fmtMoney(row.bonusAmount)} € dès ${row.bonusTarget} transactions ${bonusPeriodLabel[row.bonusPeriod]}`}
                          </p>
                        )}
                        <p className="text-[11px] font-bold text-slate-700">
                          {row.calls} × {fmtMoney(row.callRate)} € + {row.transactions} × {fmtMoney(row.txRate)} €
                          {row.bonusIncluded ? ` + ${fmtMoney(row.bonusAmount)} €` : ''}
                          {' = '}{fmtMoney(row.total)} €
                        </p>
                      </>
            )}
          </div>
                );
              })}
              <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-cyan-50 border border-emerald-200 px-4 py-3 shadow-[0_0_24px_-6px_rgba(52,211,153,0.55)]">
                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">{t('dashboard.home.goals.simulatorResult')}</p>
                <p className="text-2xl font-black text-emerald-600 tracking-tight">+{fmtMoney(simTotal)} €</p>
            </div>
          </div>
          )}

          </div>
        )}
      </div>
      </section>

    </div>
  );
}