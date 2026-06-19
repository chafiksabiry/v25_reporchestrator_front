import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, DollarSign, Clock, Phone, Target, Award, Briefcase, CheckCircle2, Wallet as WalletIcon, Hourglass, Trophy, Flame, CalendarDays, CalendarCheck, CalendarClock, CalendarX, Timer, Filter as FilterIcon, Receipt, XCircle, Inbox, ChevronDown } from 'lucide-react';
import api, { repTransactionsApi, type RepTransactionRow } from '../../../utils/client';
import { slotApi, type Reservation } from '../../../services/api/slotApi';
import { billedMinutesFromSeconds } from '../../../utils/billingMinutes';
import { repApiUrl } from '../../../utils/repApiUrl';

interface DashboardProps {
  profile?: any;
}

type GigFilterOption = {
  _id: string;
  title: string;
  commission?: any;
  rewardBonus?: number;
};

function normalizeGigEntry(raw: any): GigFilterOption | null {
  if (!raw) return null;

  if (typeof raw === 'string') {
    return { _id: raw, title: `Gig ${raw.slice(-6)}` };
  }

  if (raw.gigId || raw.gig) {
    const nested = raw.gigId || raw.gig;
    if (typeof nested === 'object') {
      const id = String(nested._id || nested.id || nested.$oid || '');
      if (!id) return null;
      return {
        _id: id,
        title: nested.title || raw.gigTitle || `Gig ${id.slice(-6)}`,
        commission: nested.commission || raw.commission,
        rewardBonus: nested.rewardBonus || raw.rewardBonus,
      };
    }
    return { _id: String(nested), title: raw.gigTitle || `Gig ${String(nested).slice(-6)}` };
  }

  const id = String(raw._id || raw.id || '');
  if (!id) return null;
  return {
    _id: id,
    title: raw.title || `Gig ${id.slice(-6)}`,
    commission: raw.commission,
    rewardBonus: raw.rewardBonus,
  };
}

function mergeGigOptions(...lists: any[][]): GigFilterOption[] {
  const map = new Map<string, GigFilterOption>();
  for (const list of lists) {
    for (const item of list) {
      const gig = normalizeGigEntry(item);
      if (!gig) continue;
      const existing = map.get(gig._id);
      map.set(gig._id, {
        ...existing,
        ...gig,
        title: gig.title || existing?.title || `Gig ${gig._id.slice(-6)}`,
        commission: gig.commission ?? existing?.commission,
        rewardBonus: gig.rewardBonus ?? existing?.rewardBonus,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title, 'fr'));
}

type PeriodKey = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all';

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'week', label: 'Cette semaine' },
  { key: 'month', label: 'Ce mois' },
  { key: 'quarter', label: 'Ce trimestre' },
  { key: 'year', label: 'Cette année' },
  { key: 'all', label: 'Tout' },
];

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
  const [callsData, setCallsData] = useState<any[]>([]);
  const [gigsData, setGigsData] = useState<any[]>([]);
  const [reservationsData, setReservationsData] = useState<Reservation[]>([]);
  const [, setLoading] = useState(true);
  const [selectedGigId, setSelectedGigId] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>('month');
  const [isGigDropdownOpen, setIsGigDropdownOpen] = useState(false);
  type TransactionFilter = 'all' | 'paid' | 'earned' | 'refused';
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>('all');
  type CallFilter = 'all' | 'valid' | 'invalid';
  const [callFilter, setCallFilter] = useState<CallFilter>('all');

  // Earnings & objectifs (RepTransaction-backed)
  const [walletStats, setWalletStats] = useState<{
    availableBalance: number;
    pendingCommissions: number;
    lifetimeEarnings: number;
  }>({ availableBalance: 0, pendingCommissions: 0, lifetimeEarnings: 0 });
  const [repLedger, setRepLedger] = useState<RepTransactionRow[]>([]);

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

        setCallsData(callsList);
        setGigsData(mergeGigOptions(
          Array.isArray(gigs.data) ? gigs.data : [],
          profileGigs,
          matchingGigs,
          callsList.map((call: any) => call.gigId).filter(Boolean),
          ledgerList.map((tx: RepTransactionRow) => tx.gig).filter(Boolean),
          ledgerList.filter((tx: RepTransactionRow) => tx.gigId).map((tx: RepTransactionRow) => ({
            _id: tx.gigId,
            title: tx.gig?.title,
          })),
        ));
        setReservationsData(Array.isArray(reservationsRes) ? reservationsRes : []);

        if (walletRes?.data?.success && walletRes.data.data) {
          const w = walletRes.data.data;
          const available = Number(w.availableBalance || 0);
          setWalletStats({
            availableBalance: available,
            pendingCommissions: Number(w.pendingCommissions || 0),
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
  }, [profile]);

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

  // Earnings this week (last 7 days), 70% rep share from the ledger
  const weeklyEarnings = useMemo(() => {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return repLedger.reduce((sum, row) => {
      if (row.status !== 'earned') return sum;
      const created = new Date(row.createdAt).getTime();
      if (created < oneWeekAgo) return sum;
      return sum + (row.repShare || 0);
    }, 0);
  }, [repLedger]);

  // Earnings within the currently selected period
  const periodEarnings = useMemo(() => {
    return repLedger.reduce((sum, row) => {
      if (row.status !== 'earned') return sum;
      const created = new Date(row.createdAt).getTime();
      if (periodStartTs > 0 && created < periodStartTs) return sum;
      return sum + (row.repShare || 0);
    }, 0);
  }, [repLedger, periodStartTs]);

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
    return repLedger.filter((row: any) => {
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
    const acc = { all: 0, valid: 0, invalid: 0 };
    filteredCalls.forEach((call: any) => {
      acc.all += 1;
      const isValid = call.valid === true || call.validByAI === true;
      if (isValid) acc.valid += 1;
      else acc.invalid += 1;
    });
    return acc;
  }, [filteredCalls]);

  const visibleCalls = useMemo(() => {
    const list = filteredCalls.filter((call: any) => {
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
      .slice(0, 8);
  }, [filteredCalls, callFilter]);

  // Multi-objectifs — daily / weekly / monthly call goals + reservation goal
  const multiObjectifs = useMemo(() => {
    const todayStart = getPeriodStart('today');
    const weekStart = getPeriodStart('week');
    const monthStart = getPeriodStart('month');

    const callsByPeriod = (startTs: number) =>
      callsData.filter((c: any) => {
        if (selectedGigId !== 'all') {
          const cGigId = typeof c.gigId === 'object' ? (c.gigId?._id || c.gigId?.id) : c.gigId;
          if (cGigId !== selectedGigId) return false;
        }
        const ts = new Date(c.createdAt || c.startTime || c.date || 0).getTime();
        return ts >= startTs;
      }).length;

    const reservationsByPeriod = (startTs: number) =>
      reservationsData.filter((r: any) => {
        if (selectedGigId !== 'all') {
          const rGigId = typeof r.gigId === 'object' ? (r.gigId?._id || r.gigId?.id) : r.gigId;
          if (rGigId !== selectedGigId) return false;
        }
        if (r.status === 'cancelled') return false;
        const ts = new Date(r.reservationDate || r.date || 0).getTime();
        return ts >= startTs;
      }).length;

    const dailyTarget = 5;
    const weeklyTarget = 25;
    const reservationsWeekTarget = 5;

    const dailyCurrent = callsByPeriod(todayStart);
    const weeklyCurrent = callsByPeriod(weekStart);
    const monthCalls = callsByPeriod(monthStart);
    const reservationsThisWeek = reservationsByPeriod(weekStart);

    return {
      daily: {
        current: dailyCurrent,
        target: dailyTarget,
        progressPct: Math.min(100, Math.round((dailyCurrent / dailyTarget) * 100)),
      },
      weekly: {
        current: weeklyCurrent,
        target: weeklyTarget,
        progressPct: Math.min(100, Math.round((weeklyCurrent / weeklyTarget) * 100)),
      },
      monthCalls,
      reservationsWeekly: {
        current: reservationsThisWeek,
        target: reservationsWeekTarget,
        progressPct: Math.min(100, Math.round((reservationsThisWeek / reservationsWeekTarget) * 100)),
      },
    };
  }, [callsData, reservationsData, selectedGigId]);

  // Objectif gig — uses the selected gig's bonus thresholds (volume + bonus amount).
  // Counts only this month's calls of the matching gig.
  const objectif = useMemo(() => {
    if (selectedGigId === 'all') {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthCalls = callsData.filter((c) => {
        const d = new Date(c.createdAt || c.startTime || 0).getTime();
        return d >= monthStart.getTime();
      }).length;
      return {
        label: 'Tous les Gigs',
        current: monthCalls,
        target: 0,
        bonusAmount: 0,
        progressPct: 0
      };
    }

    const gig = gigsData.find((g) => (g._id || g.id) === selectedGigId);
    const target = gig?.commission?.minimumVolume || gig?.commission?.bonusMinimumCalls || 25;
    const bonusGross = gig?.commission?.bonusAmount || gig?.rewardBonus || 120;
    const bonusRepShare = Math.round(bonusGross * 0.7 * 100) / 100;

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const current = callsData.filter((c) => {
      const cGigId = typeof c.gigId === 'object' ? (c.gigId?._id || c.gigId?.id) : c.gigId;
      if (cGigId !== selectedGigId) return false;
      const d = new Date(c.createdAt || c.startTime || 0).getTime();
      return d >= monthStart.getTime();
    }).length;

    const progressPct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
    return {
      label: gig?.title || 'Gig',
      current,
      target,
      bonusAmount: bonusRepShare,
      progressPct
    };
  }, [selectedGigId, gigsData, callsData]);

  const displayName = profile?.personalInfo?.name ? profile.personalInfo.name.split(' ')[0] : 'User';

  const selectedGigLabel = useMemo(() => {
    if (selectedGigId === 'all') return 'Tous les Gigs';
    return gigsData.find((g) => g._id === selectedGigId)?.title || 'Gig';
  }, [selectedGigId, gigsData]);

  return (
    <div className="space-y-10 pb-10 animate-in fade-in duration-700">
      {/* Dynamic Filter Header */}
      <div className="flex flex-col gap-4 bg-white/40 backdrop-blur-xl rounded-[2rem] p-6 border border-white/60 shadow-xl shadow-slate-200/10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              Bonjour, {displayName} 👋
            </h1>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
              Suivi en temps réel de vos indicateurs de performance commerciale
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="relative flex items-center gap-2.5">
              <Briefcase size={16} className="text-purple-600 animate-pulse" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gig :</span>
              <div className="relative min-w-[220px] max-w-[320px]">
                <button
                  type="button"
                  onClick={() => setIsGigDropdownOpen((open) => !open)}
                  className="w-full flex items-center justify-between gap-2 bg-white/80 border border-slate-100 hover:border-purple-200 px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-700 shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all duration-300"
                >
                  <span className="truncate text-left normal-case">{selectedGigLabel}</span>
                  <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-300 ${isGigDropdownOpen ? 'rotate-180 text-purple-500' : ''}`} />
                </button>

                {isGigDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsGigDropdownOpen(false)} aria-hidden />
                    <div className="absolute top-full left-0 mt-2 z-50 min-w-full w-max max-w-[min(420px,calc(100vw-2rem))] bg-white/95 backdrop-blur-xl border border-slate-100 rounded-2xl shadow-xl shadow-purple-100/40 p-2 animate-in fade-in slide-in-from-top-1 duration-200 max-h-72 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGigId('all');
                          setIsGigDropdownOpen(false);
                        }}
                        className="block w-full text-left px-1 py-0.5"
                      >
                        <span
                          className={`inline-flex items-center gap-2 max-w-full px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all ${
                            selectedGigId === 'all'
                              ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-200/80 shadow-sm'
                              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selectedGigId === 'all' ? 'bg-purple-500' : 'bg-slate-300'}`} />
                          Tous les Gigs
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
                              setIsGigDropdownOpen(false);
                            }}
                            className="block w-full text-left px-1 py-0.5"
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
                  </>
                )}
              </div>
            </div>

            <div className="relative flex items-center gap-2.5">
              <CalendarDays size={16} className="text-blue-600" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Période :</span>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as PeriodKey)}
                className="appearance-none bg-white/80 border border-slate-100 hover:border-blue-200 px-4 py-2.5 pr-10 rounded-2xl text-xs font-black uppercase tracking-wider text-slate-700 shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 min-w-[180px]"
                style={{
                  backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                  backgroundPosition: 'right 0.75rem center',
                  backgroundSize: '1rem',
                  backgroundRepeat: 'no-repeat'
                }}
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Wallet strip — compact KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Solde disponible',
            value: `${walletStats.availableBalance.toFixed(2)} €`,
            sub: 'Prêt au retrait',
            icon: WalletIcon,
            accent: 'emerald'
          },
          {
            label: 'En attente',
            value: `${walletStats.pendingCommissions.toFixed(2)} €`,
            sub: 'Validation IA',
            icon: Hourglass,
            accent: 'amber'
          },
          {
            label: selectedPeriod === 'all' ? 'Cette semaine' : `Gains — ${PERIOD_OPTIONS.find(p => p.key === selectedPeriod)?.label}`,
            value: `${(selectedPeriod === 'all' ? weeklyEarnings : periodEarnings).toFixed(2)} €`,
            sub: selectedPeriod === 'all' ? '7 derniers jours' : 'Filtré par période',
            icon: TrendingUp,
            accent: 'blue'
          },
          {
            label: 'Gains totaux',
            value: `${walletStats.lifetimeEarnings.toFixed(2)} €`,
            sub: 'Depuis votre arrivée',
            icon: Trophy,
            accent: 'dark'
          },
        ].map((kpi, idx) => {
          const isDark = kpi.accent === 'dark';
          return (
            <div
              key={idx}
              className={`relative overflow-hidden rounded-3xl p-5 shadow-xl transition-all duration-300 hover:-translate-y-0.5 ${
                isDark
                  ? 'bg-slate-950 text-white border border-slate-800 shadow-slate-900/20'
                  : 'bg-white/50 backdrop-blur-xl border border-white/60 shadow-slate-200/20'
              }`}
            >
              {isDark && <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-harx-500/30 blur-3xl" />}
              <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={`text-[9px] font-black uppercase tracking-widest truncate ${isDark ? 'text-white/50' : 'text-slate-400'}`}>
                    {kpi.label}
                  </p>
                  <p className={`text-2xl font-black tracking-tighter mt-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {kpi.value}
                  </p>
                  <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${
                    isDark ? 'text-white/50' : `text-${kpi.accent}-600`
                  }`}>
                    {kpi.sub}
                  </p>
                </div>
                <div className={`h-9 w-9 rounded-2xl flex items-center justify-center shrink-0 ${
                  isDark ? 'bg-white/10 text-white' : `bg-${kpi.accent}-500/10 text-${kpi.accent}-600`
                }`}>
                  <kpi.icon size={16} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Activité Récente — Transactions & Calls cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transactions card */}
        <div className="bg-white/50 backdrop-blur-xl border border-white/60 rounded-[28px] shadow-xl shadow-slate-200/20 overflow-hidden flex flex-col">
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Receipt size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase">Transactions</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    Vos commissions & paiements
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
                { key: 'all', label: 'Tous', accent: 'slate', count: transactionStats.all.count },
                { key: 'earned', label: 'Payé', accent: 'emerald', count: transactionStats.earned.count },
                { key: 'paid', label: 'Versé', accent: 'blue', count: transactionStats.paid.count },
                { key: 'refused', label: 'Refusé', accent: 'rose', count: transactionStats.refused.count },
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
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Aucune transaction</p>
                <p className="text-[11px] text-slate-400 mt-1">Aucun résultat pour ce filtre</p>
              </div>
            ) : (
              <ul className="space-y-2 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
                {visibleTransactions.map((tx) => {
                  const statusMeta =
                    tx.status === 'earned'
                      ? { label: 'Payé', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' }
                      : tx.status === 'paid'
                      ? { label: 'Versé', cls: 'bg-blue-50 text-blue-700 border-blue-100' }
                      : { label: 'Refusé', cls: 'bg-rose-50 text-rose-700 border-rose-100' };
                  const typeLabel =
                    tx.type === 'call_validated' ? 'Appel validé'
                    : tx.type === 'transaction' ? 'Vente'
                    : 'Bonus';
                  const gigTitle = tx.gig?.title || (gigsData.find((g: any) => (g._id || g.id) === tx.gigId)?.title) || 'Gig';
                  return (
                    <li key={tx._id} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/70 border border-white/60 hover:border-emerald-200/60 hover:bg-white transition-all duration-200">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                          <DollarSign size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-900 truncate">{typeLabel} · {gigTitle}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {new Date(tx.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
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
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Calls card */}
        <div className="bg-white/50 backdrop-blur-xl border border-white/60 rounded-[28px] shadow-xl shadow-slate-200/20 overflow-hidden flex flex-col">
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                  <Phone size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase">Appels</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    Historique & validation IA
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-black text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0">
                {callStats.all} appel{callStats.all > 1 ? 's' : ''}
              </span>
            </div>

            {/* Filter pills */}
            <div className="flex flex-wrap gap-2">
              {([
                { key: 'all', label: 'Tous', accent: 'slate', count: callStats.all },
                { key: 'valid', label: 'Validés', accent: 'emerald', count: callStats.valid },
                { key: 'invalid', label: 'Non validés', accent: 'rose', count: callStats.invalid },
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
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Aucun appel</p>
                <p className="text-[11px] text-slate-400 mt-1">Aucun résultat pour ce filtre</p>
              </div>
            ) : (
              <ul className="space-y-2 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
                {visibleCalls.map((call: any) => {
                  const isValid = call.valid === true || call.validByAI === true;
                  const contact = (call.lead?.First_Name || call.lead?.Last_Name)
                    ? `${call.lead.First_Name || ''} ${call.lead.Last_Name || ''}`.trim()
                    : (call.lead?.name || call.contactName || call.to || call.from || call.phoneNumber || 'Contact inconnu');
                  const phoneNum = call.lead?.phone || call.lead?.Phone || call.to || call.from || call.phoneNumber;
                  const hasLeadName = !!(call.lead?.First_Name || call.lead?.Last_Name || call.lead?.name);
                  const durationSec = Number(call.duration || 0);
                  const billedMin = billedMinutesFromSeconds(durationSec);
                  const dateStr = call.startTime || call.createdAt;
                  const cGigId = typeof call.gigId === 'object' ? (call.gigId?._id || call.gigId?.id) : call.gigId;
                  const gigTitle = (typeof call.gigId === 'object' && call.gigId?.title) || (gigsData.find((g: any) => (g._id || g.id) === cGigId)?.title) || '';
                  return (
                    <li key={call._id || call.sid || `${contact}-${dateStr}`} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/70 border border-white/60 hover:border-indigo-200/60 hover:bg-white transition-all duration-200">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isValid ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                        }`}>
                          {isValid ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-900 truncate flex items-center gap-2">
                            <span>{contact}</span>
                            {hasLeadName && phoneNum && (
                              <span className="text-[11px] font-normal text-slate-400">({phoneNum})</span>
                            )}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                            {dateStr ? new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—'}
                            {billedMin > 0 && ` · ${billedMin} min`}
                            {gigTitle && ` · ${gigTitle}`}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full border shrink-0 ${
                        isValid
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-rose-50 text-rose-700 border-rose-100'
                      }`}>
                        {isValid ? 'Validé' : 'Non validé'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Reservations / Travail planifié */}
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-violet-500/10 text-violet-600 flex items-center justify-center">
              <CalendarCheck size={18} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight uppercase">Mes Réservations</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Sessions planifiées & heures travaillées
              </p>
            </div>
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {reservationStats.total} réservation{reservationStats.total > 1 ? 's' : ''} sur la période
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[24px] p-5 shadow-xl shadow-slate-200/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total</span>
              <CalendarDays size={16} className="text-slate-500" />
            </div>
            <span className="text-2xl font-black text-slate-900 tracking-tighter">{reservationStats.total}</span>
            <p className="text-[10px] font-bold text-slate-500 mt-1">Sessions</p>
          </div>

          <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[24px] p-5 shadow-xl shadow-slate-200/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">À venir</span>
              <CalendarClock size={16} className="text-blue-500" />
            </div>
            <span className="text-2xl font-black text-blue-600 tracking-tighter">{reservationStats.upcoming}</span>
            <p className="text-[10px] font-bold text-slate-500 mt-1">Planifiées</p>
          </div>

          <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[24px] p-5 shadow-xl shadow-slate-200/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Effectuées</span>
              <CheckCircle2 size={16} className="text-emerald-500" />
            </div>
            <span className="text-2xl font-black text-emerald-600 tracking-tighter">{reservationStats.completed}</span>
            <p className="text-[10px] font-bold text-slate-500 mt-1">Honorées</p>
          </div>

          <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[24px] p-5 shadow-xl shadow-slate-200/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Manquées</span>
              <CalendarX size={16} className="text-rose-500" />
            </div>
            <span className="text-2xl font-black text-rose-600 tracking-tighter">{reservationStats.noShow + reservationStats.cancelled}</span>
            <p className="text-[10px] font-bold text-slate-500 mt-1">
              {reservationStats.cancelled} annul. · {reservationStats.noShow} no-show
            </p>
          </div>

          <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[24px] p-5 shadow-xl shadow-slate-200/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Heures travaillées</span>
              <Timer size={16} className="text-amber-500" />
            </div>
            <span className="text-2xl font-black text-amber-600 tracking-tighter">{reservationStats.workedHours}h</span>
            <p className="text-[10px] font-bold text-slate-500 mt-1">/ {reservationStats.scheduledHours}h prévues</p>
          </div>

          <div className="bg-slate-950 text-white border border-slate-800 rounded-[24px] p-5 shadow-xl shadow-slate-900/30 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-harx-500/30 blur-2xl" />
            <div className="flex items-center justify-between mb-3 relative z-10">
              <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">Assiduité</span>
              <Award size={16} className="text-harx-400" />
            </div>
            <span className="text-2xl font-black tracking-tighter relative z-10">{reservationStats.attendanceRate}%</span>
            <p className="text-[10px] font-bold text-white/60 mt-1 relative z-10">Taux d'assiduité</p>
          </div>
        </div>

        {/* Upcoming reservations list */}
        {upcomingReservations.length > 0 && (
          <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[24px] p-6 shadow-xl shadow-slate-200/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Prochaines sessions</h3>
              <Clock size={14} className="text-slate-400" />
            </div>
            <ul className="space-y-2.5">
              {upcomingReservations.map((r: any) => {
                const dateStr = r.reservationDate || r.date;
                const d = new Date(dateStr);
                const gigTitle = typeof r.gigId === 'object' ? (r.gigId?.title || 'Gig') : (gigsData.find((g: any) => (g._id || g.id) === r.gigId)?.title || 'Gig');
                return (
                  <li key={r._id || `${r.gigId}-${dateStr}-${r.startTime}`} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/60 border border-white/60">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0">
                        <CalendarClock size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-900 truncate">{gigTitle}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })} · {r.startTime}–{r.endTime}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0">
                      {r.duration}h
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Multi-objectifs */}
      <div className="bg-white/40 backdrop-blur-xl rounded-[32px] border border-white/60 shadow-xl shadow-slate-200/20 p-8 overflow-hidden relative">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Target size={18} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight uppercase">Mes Objectifs</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Suivi des cibles quotidiennes, hebdomadaires et mensuelles
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Daily objective */}
          <div className="bg-white/60 border border-white/60 rounded-[24px] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-cyan-600" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Objectif du jour</span>
              </div>
              <span className="text-[10px] font-black text-slate-700">{multiObjectifs.daily.progressPct}%</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900 tracking-tighter">
                {multiObjectifs.daily.current}<span className="text-base text-slate-400">/{multiObjectifs.daily.target}</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Appels aujourd'hui</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-700 ease-out rounded-full ${
                  multiObjectifs.daily.progressPct >= 100
                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                    : 'bg-gradient-to-r from-cyan-400 to-cyan-600'
                }`}
                style={{ width: `${multiObjectifs.daily.progressPct}%` }}
              />
            </div>
          </div>

          {/* Weekly objective */}
          <div className="bg-white/60 border border-white/60 rounded-[24px] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays size={14} className="text-indigo-600" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Objectif hebdo</span>
              </div>
              <span className="text-[10px] font-black text-slate-700">{multiObjectifs.weekly.progressPct}%</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900 tracking-tighter">
                {multiObjectifs.weekly.current}<span className="text-base text-slate-400">/{multiObjectifs.weekly.target}</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Appels cette semaine</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-700 ease-out rounded-full ${
                  multiObjectifs.weekly.progressPct >= 100
                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                    : 'bg-gradient-to-r from-indigo-400 to-indigo-600'
                }`}
                style={{ width: `${multiObjectifs.weekly.progressPct}%` }}
              />
            </div>
          </div>

          {/* Reservations objective */}
          <div className="bg-white/60 border border-white/60 rounded-[24px] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarCheck size={14} className="text-violet-600" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sessions hebdo</span>
              </div>
              <span className="text-[10px] font-black text-slate-700">{multiObjectifs.reservationsWeekly.progressPct}%</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900 tracking-tighter">
                {multiObjectifs.reservationsWeekly.current}<span className="text-base text-slate-400">/{multiObjectifs.reservationsWeekly.target}</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Réservations actives</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-700 ease-out rounded-full ${
                  multiObjectifs.reservationsWeekly.progressPct >= 100
                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                    : 'bg-gradient-to-r from-violet-400 to-violet-600'
                }`}
                style={{ width: `${multiObjectifs.reservationsWeekly.progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Objectif gig */}
      <div className="bg-white/40 backdrop-blur-xl rounded-[32px] border border-white/60 shadow-xl shadow-slate-200/20 p-8 overflow-hidden relative">
        <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-harx-500/10 blur-3xl -mr-24 -mt-24" />
        <div className="flex items-start justify-between gap-6 flex-wrap relative z-10">
          <div className="flex items-start gap-4 min-w-0">
            <div className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
              <Target size={22} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-slate-900 tracking-tight">Objectif du mois</h3>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 truncate">
                {objectif.label}
              </p>
            </div>
          </div>

          {objectif.target > 0 ? (
            <div className="text-right shrink-0">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                Bonus à débloquer
              </span>
              <span className="text-2xl font-black text-emerald-600 tracking-tighter block mt-1 flex items-center justify-end gap-1.5">
                <Flame size={18} className="text-emerald-500" />
                +{objectif.bonusAmount.toFixed(2)} €
              </span>
            </div>
          ) : (
            <span className="text-[10px] font-bold text-slate-400 italic">
              Sélectionnez un Gig pour voir l'objectif
            </span>
          )}
        </div>

        {objectif.target > 0 && (
          <div className="mt-6 space-y-3 relative z-10">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-600">
                <span className="text-slate-900 text-base font-black">{objectif.current}</span>
                {' '}/{' '}
                <span>{objectif.target}</span>
                {' appels validés ce mois-ci'}
              </span>
              <span className="font-black text-slate-900">{objectif.progressPct}%</span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ease-out rounded-full ${
                  objectif.progressPct >= 100
                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                    : 'bg-gradient-to-r from-rose-400 to-rose-600'
                }`}
                style={{ width: `${objectif.progressPct}%` }}
              />
            </div>
            {objectif.progressPct >= 100 ? (
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 size={12} /> Objectif atteint — bonus crédité
              </p>
            ) : (
              <p className="text-[10px] font-bold text-slate-500">
                Plus que {objectif.target - objectif.current} appels validés pour décrocher votre bonus.
              </p>
            )}
          </div>
        )}
      </div>

    </div>
  );
}