import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { 
  Wallet, 
  Clock, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  CreditCard, 
  Ban as Bank, 
  Shield, 
  AlertCircle, 
  Download, 
  Filter, 
  ChevronRight, 
  Lock, 
  Bell,
  Check,
  X,
  ShieldCheck,
  KeyRound,
  Sparkles,
  Phone
} from 'lucide-react';

import { CallRecords } from '../CallRecords';
import { WalletFilterSelect } from '../ui/WalletFilterSelect';
import api, { repTransactionsApi, type RepTransactionRow } from '../../../utils/client';
import { useAuth } from '../../../contexts/AuthContext';
import { getAgentId } from '../../../utils/authUtils';
import Cookies from 'js-cookie';
import type { GigCommissionExtended } from '../../../utils/gigCommissionDisplay';
import {
  resolveWalletPerCallEur,
  resolveWalletTransactionEur,
  getBonusPillDisplay
} from '../../../utils/gigCommissionDisplay';

// Minimum withdrawal amount enforced by the backend
// (see `requestAgentWithdrawal` in escrowController.js).
const MIN_WITHDRAWAL_AMOUNT = 1;

export function WalletPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  // Use the same agentId resolution as the rest of the app (header, calls).
  // `user?.agentId` from AuthContext can differ from the profile/agent _id that
  // the AgentWallet ledger is keyed on, which made the wallet page fetch an
  // empty wallet (0,00€) while the header showed the real balance.
  const agentId = getAgentId() || user?.agentId;
  const [activeTab, setActiveTab] = useState('transactions');
  const [selectedDateRange, setSelectedDateRange] = useState('this-month');
  const [selectedGigId, setSelectedGigId] = useState('all');
  const [callValidationFilter, setCallValidationFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [transactionValidationFilter, setTransactionValidationFilter] = useState<
    'all' | 'approved' | 'validated' | 'refused' | 'pending'
  >('all');

  // Dynamic state metrics for real payouts
  const [availableBalance, setAvailableBalance] = useState(0);
  const [pendingEarnings, setPendingEarnings] = useState(0);
  const [lifetimeEarnings, setLifetimeEarnings] = useState(0);
  const [pendingTransactionsCount, setPendingTransactionsCount] = useState(0);

  // Filter and Call Records for "Liste des Appels"
  const [realCalls, setRealCalls] = useState<any[]>([]);
  const [backendWithdrawals, setBackendWithdrawals] = useState<any[]>([]);
  const [repLedgerRows, setRepLedgerRows] = useState<RepTransactionRow[]>([]);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);

  // Maps the backend rep ledger to a display row. We deliberately drop the
  // gross amount and the HARX share so the rep never sees the 70/30 split —
  // that info is confidential.
  const mapRepLedgerToDisplay = (rows: RepTransactionRow[]) =>
    rows.map((row) => {
      const typeLabel =
        row.type === 'call_validated'
          ? 'Appel validé'
          : row.type === 'transaction'
            ? 'Vente validée'
            : 'Bonus';
      const gigTitle = row.gig?.title || 'Projet';
      return {
        id: `rep-${row._id}`,
        type: typeLabel,
        ledgerType: row.type,
        amount: row.repShare,
        status: row.status === 'earned' ? 'Completed' : row.status === 'paid' ? 'Paid' : 'Refused',
        date: row.createdAt,
        method: 'Wallet',
        reference: row.callId || row.sourceId,
        description: `${typeLabel} — ${gigTitle}`,
        gigId: row.gigId
      };
    });

  // The rep wallet is fed exclusively by RepTransaction (via /escrow/agent/wallet
  // and /escrow/agent/transactions). We no longer recompute balances client-side
  // from calls: that would diverge from the server ledger as soon as the booking
  // logic evolves. Calls are still fetched so the gigs filter / call records UI
  // can render, but the balances above come from `fetchWalletData` only.
  const fetchRealCalls = async () => {
    try {
      const localAgentId = localStorage.getItem('agentId');
      if (!localAgentId) return;
      const response = await api.calls.getByAgentId(localAgentId);
      if (response && response.success && Array.isArray(response.data)) {
        setRealCalls(response.data);
      }
    } catch (err) {
      console.error('Error fetching real calls for counts in Wallet:', err);
    }
  };

  useEffect(() => {
    fetchRealCalls();
    fetchWalletData();

    const onCallsUpdated = () => {
      fetchRealCalls();
      fetchWalletData();
    };
    window.addEventListener('CALLS_STATE_UPDATED', onCallsUpdated);
    return () => {
      window.removeEventListener('CALLS_STATE_UPDATED', onCallsUpdated);
    };
  }, []);

  // Resolves the gig id of a call regardless of how the backend serialised it
  // (populated object, ObjectId, or $oid wrapper). Returns undefined when the
  // call is not attached to any gig.
  const getGigIdFromCall = (record: any): string | undefined => {
    const recordGig = record?.lead?.gigId;
    if (!recordGig) return undefined;
    const idStr = typeof recordGig === 'object'
      ? (recordGig?._id || recordGig?.$oid)
      : recordGig;
    return idStr || undefined;
  };

  const getCallCountForGig = (gigId: string) => {
    // "all" must only count calls that actually belong to a gig (i.e. the
    // company's gigs the rep worked on), not every raw call in the database.
    // Otherwise the total diverges from the sum of the per-gig counts.
    if (gigId === 'all') {
      return realCalls.filter(record => Boolean(getGigIdFromCall(record))).length;
    }
    return realCalls.filter(record => getGigIdFromCall(record) === gigId).length;
  };

  const gigsFilterOptions = [
    { id: 'all', title: `Tous les Gigs (${getCallCountForGig('all')})` },
    ...Array.from(new Set(realCalls.map(getGigIdFromCall).filter(Boolean) as string[])).map(id => {
      const call = realCalls.find(c => getGigIdFromCall(c) === id);
      const title = call?.lead?.gigId?.title || "Projet Sans Titre";
      return { id, title: `${title} (${getCallCountForGig(id)})` };
    })
  ];

  const gigSelectOptions = useMemo(
    () => gigsFilterOptions.map((g) => ({ value: g.id, label: g.title })),
    [gigsFilterOptions]
  );

  const dateRangeOptions = useMemo(
    () => [
      { value: 'today', label: "Aujourd'hui" },
      { value: 'this-week', label: 'Cette semaine' },
      { value: 'this-month', label: 'Ce mois' },
      { value: 'last-month', label: 'Mois dernier' },
    ],
    []
  );

  const transactionSaleOptions = useMemo(
    () => [
      { value: 'all', label: 'Toutes les ventes', tone: 'brand' as const },
      { value: 'validated', label: 'Ventes validées', tone: 'success' as const },
      { value: 'pending', label: 'Ventes en attente', tone: 'warning' as const },
      { value: 'refused', label: 'Ventes refusées', tone: 'danger' as const },
    ],
    []
  );

  const callValidationOptions = useMemo(
    () => [
      { value: 'all', label: 'Tous les appels', tone: 'brand' as const },
      { value: 'approved', label: 'Validés uniquement', tone: 'success' as const },
      { value: 'pending', label: 'En attente / Non validés', tone: 'warning' as const },
    ],
    []
  );

  const callTxValidationOptions = useMemo(
    () => [
      { value: 'all', label: 'Toutes les transactions', tone: 'brand' as const },
      { value: 'approved', label: 'Validées (Signées)', tone: 'success' as const },
      { value: 'refused', label: 'Refusées', tone: 'danger' as const },
      { value: 'pending', label: 'À valider (En attente)', tone: 'warning' as const },
    ],
    []
  );

  const resetTransactionFilters = () => {
    setSelectedGigId('all');
    setTransactionValidationFilter('all');
    setSelectedDateRange('this-month');
  };

  const resetCallFilters = () => {
    setSelectedGigId('all');
    setCallValidationFilter('all');
    setTransactionValidationFilter('all');
  };

  // Rep keeps 70% of every commission; HARX keeps 30%. We only display the rep share.
  const REP_SHARE = 0.7;
  const fmtEur = (value: number) => `${(value).toFixed(2)} €`;

  /** Reads bonus from gig.commission.bonusAmount + minimumVolume (70% rep share). */
  const formatGigBonusLine = (comm: GigCommissionExtended | undefined): string => {
    const pill = getBonusPillDisplay(comm, ' €');
    if (!pill) return 'Aucun bonus actif';
    return pill.secondary ? `${pill.primary} — ${pill.secondary}` : pill.primary;
  };

  const gigCommissions: Record<string, { rate: string; rules: string; bonus: string }> = {
    all: {
      rate: 'Taux Variable',
      rules: 'Sélectionnez un Gig spécifique pour consulter votre commission sur ce projet.',
      bonus: 'Bonus actifs'
    },
    '69df585b6cad0fd23cffc2ae': {
      rate: `${fmtEur(4 * REP_SHARE)} / appel + ${fmtEur(30 * REP_SHARE)} / transaction`,
      rules: "Une transaction est comptabilisée uniquement si le contrat est signé et non rétracté dans les 14 jours. Les résiliations dans les 3 mois suivant la signature entraînent l'annulation et le remboursement de la commission correspondante.",
      bonus: `+${fmtEur(120 * REP_SHARE)} — chaque 25 appels / mois`
    },
    'insurance-premium': {
      rate: `${fmtEur(2 * REP_SHARE)} / min d'appel`,
      rules: 'Commissions calculées sur la durée totale des appels validés par la compagnie.',
      bonus: `+${fmtEur(5 * REP_SHARE)} bonus validation`
    },
    'cpf-booster': {
      rate: `${fmtEur(2 * REP_SHARE)} / min d'appel`,
      rules: 'Applicable sur les appels d\'une durée supérieure à 1 minute avec CPF valide.',
      bonus: `+${fmtEur(10 * REP_SHARE)} bonus conversion`
    },
    'telecom-pro': {
      rate: `${fmtEur(2 * REP_SHARE)} / min d'appel`,
      rules: 'Taux standard appliqué sur tous les appels professionnels validés.',
      bonus: 'Aucun bonus'
    }
  };

  const getSelectedGigCommission = () => {
    if (selectedGigId === 'all') return gigCommissions.all;

    const callFromGig = realCalls.find(record => {
      const recordGig = record.lead?.gigId;
      const idStr = typeof recordGig === 'object' ? (recordGig?._id || (recordGig as any)?.$oid) : recordGig;
      return idStr === selectedGigId;
    });

    if (callFromGig) {
      const gigData = typeof callFromGig.lead?.gigId === 'object' ? callFromGig.lead.gigId : null;
      const comm = gigData?.commission as GigCommissionExtended | undefined;
      const callRate = resolveWalletPerCallEur(comm, gigData?.rewardPerCall);
      const txRate = resolveWalletTransactionEur(comm, gigData?.rewardPerSale);

      let bonus = formatGigBonusLine(comm);
      if (bonus.startsWith('Aucun') && gigCommissions[selectedGigId]) {
        bonus = gigCommissions[selectedGigId].bonus;
      }

      return {
        rate: `${fmtEur(callRate)} / appel + ${fmtEur(txRate)} / transaction`,
        rules:
          comm?.additionalDetails ||
          gigData?.description ||
          "Barème de commission standard pour ce projet.",
        bonus
      };
    }

    return gigCommissions[selectedGigId] || {
      rate: 'Non spécifié',
      rules: 'Aucune donnée de commission disponible pour ce projet.',
      bonus: 'Aucun'
    };
  };

  // Fetch wallet and withdrawals from backend
  const fetchWalletData = async () => {
    if (!agentId) return;
    setIsLoadingWallet(true);
    try {
      const [walletRes, withdrawalsRes, ledgerRes] = await Promise.all([
        api.get(`/escrow/agent/wallet/${agentId}`),
        api.get(`/escrow/agent/withdrawals/${agentId}`),
        repTransactionsApi.list(agentId, { status: 'earned', limit: 300 }).catch(() => null)
      ]);

      if (walletRes.data?.success) {
        setAvailableBalance(walletRes.data.data.availableBalance);
        const pendingTotal =
          (walletRes.data.data.pendingWithdrawals || 0) +
          (walletRes.data.data.pendingCommissions || 0);
        setPendingEarnings(pendingTotal);
        setLifetimeEarnings(walletRes.data.data.lifetimeEarnings);
        setPendingTransactionsCount(walletRes.data.data.pendingCount || 0);
      }

      if (ledgerRes?.success && Array.isArray(ledgerRes.data)) {
        setRepLedgerRows(ledgerRes.data);
      }

      if (withdrawalsRes.data?.success) {
        const formattedWithdrawals = withdrawalsRes.data.data.map((w: any) => ({
          id: w._id,
          type: 'Payout',
          amount: w.amount,
          status: w.status === 'pending' ? 'Processing' : w.status === 'completed' ? 'Completed' : 'Failed',
          date: w.createdAt,
          method: w.method === 'bank' ? 'Bank Transfer' : 'PayPal',
          reference: w.reference,
          description: w.description
        }));
        setBackendWithdrawals(formattedWithdrawals);
      }
    } catch (err) {
      console.error('Error fetching wallet data:', err);
    } finally {
      setIsLoadingWallet(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, [agentId]);

  // Refresh wallet cards live when the WebSocket layer signals new commissions.
  useEffect(() => {
    const handler = () => {
      void fetchWalletData();
    };
    window.addEventListener('REP_WALLET_REFRESH', handler);
    return () => window.removeEventListener('REP_WALLET_REFRESH', handler);
  }, [agentId]);

  // Sync state changes with localStorage and emit sync event
  useEffect(() => {
    localStorage.setItem('rep_available_balance', availableBalance.toString());
    localStorage.setItem('rep_pending_balance', pendingEarnings.toString());
    window.dispatchEvent(new Event('WALLET_BALANCE_UPDATED'));
  }, [availableBalance, pendingEarnings]);

  // Earned this week, sourced directly from the RepTransaction ledger (70% rep share).
  const getWeeklyEarnings = () => {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return repLedgerRows.reduce((total, row) => {
      if (row.status !== 'earned') return total;
      const created = new Date(row.createdAt);
      if (created >= oneWeekAgo) total += row.repShare || 0;
      return total;
    }, 0);
  };

  useEffect(() => {
    localStorage.setItem('rep_available_balance', availableBalance.toString());
    localStorage.setItem('rep_pending_balance', pendingEarnings.toString());
    window.dispatchEvent(new Event('WALLET_BALANCE_UPDATED'));
  }, [availableBalance, pendingEarnings]);

  // Stateful transaction log
  const [transactions, setTransactions] = useState<any[]>([]);

  // RepTransaction ledger is the sole source of truth (70% repShare).
  // Withdrawals come from the agent withdrawal collection.
  useEffect(() => {
    const ledgerTxs = mapRepLedgerToDisplay(repLedgerRows);
    setTransactions(
      [...backendWithdrawals, ...ledgerTxs].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    );
  }, [backendWithdrawals, repLedgerRows]);



  // Withdrawal Modal States
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawStep, setWithdrawStep] = useState(1); // 1 = Entry, 2 = 2FA, 3 = Success
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('bank');
  const [verificationCode, setVerificationCode] = useState('');
  const [validationError, setValidationError] = useState('');
  const [lastWithdrawal, setLastWithdrawal] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | null }>({ text: '', type: null });

  // Transaction detail modal
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);

  const showToast = (text: string, type: 'success' | 'error') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage({ text: '', type: null }), 3000);
  };

  // Launch Withdrawal Modal
  const handleOpenWithdraw = () => {
    if (availableBalance <= 0) {
      showToast('Votre solde disponible est insuffisant pour un retrait.', 'error');
      return;
    }
    if (availableBalance < MIN_WITHDRAWAL_AMOUNT) {
      showToast(
        `Le retrait minimum est de ${MIN_WITHDRAWAL_AMOUNT}€. Solde actuel : ${availableBalance.toFixed(2)}€.`,
        'error'
      );
      return;
    }
    setWithdrawAmount('');
    setSelectedMethod('bank');
    setWithdrawStep(1);
    setVerificationCode('');
    setValidationError('');
    setShowWithdrawModal(true);
  };

  // Handle Step 1 Submit (Amount & Method Verification)
  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setValidationError('Veuillez saisir un montant valide supérieur à 0.');
      return;
    }
    if (amount < MIN_WITHDRAWAL_AMOUNT) {
      setValidationError(`Le montant minimum de retrait est de ${MIN_WITHDRAWAL_AMOUNT}€.`);
      return;
    }
    if (amount > availableBalance) {
      setValidationError(`Le montant dépasse votre solde disponible de ${availableBalance.toFixed(2)}€.`);
      return;
    }
    setValidationError('');
    setWithdrawStep(2); // Advance to 2FA stage
  };

  // Handle Step 2 Submit (2FA Check)
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode.trim() !== '1234') {
      setValidationError('Code de vérification incorrect. Saisissez 1234 pour simuler la validation.');
      return;
    }
    setValidationError('');
    
    // Process withdrawal
    const parsedAmount = parseFloat(withdrawAmount);
    
    try {
      const res = await api.post('/escrow/agent/withdraw', {
        agentId,
        amount: parsedAmount,
        method: selectedMethod,
        methodDetails: selectedMethod === 'bank' ? 'Bank Account (...4567)' : 'PayPal (john.doe@example.com)',
        companyId: Cookies.get('companyId') || localStorage.getItem('companyId')
      });

      if (res.data?.success) {
        setLastWithdrawal(res.data.withdrawal);
        showToast(`Demande de retrait de ${parsedAmount.toFixed(2)}€ envoyée avec succès.`, 'success');
        fetchWalletData(); // Refresh wallet data
        setWithdrawStep(3); // Go to Success page
      } else {
        setValidationError(res.data?.error || 'Échec du traitement du retrait.');
      }
    } catch (err: any) {
      console.error('Error processing withdrawal:', err);
      setValidationError(err.response?.data?.error || 'Une erreur est survenue lors du retrait.');
    }
  };

  const fmtMoney = (value: number) =>
    value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const weeklyEarnings = getWeeklyEarnings();
  const progressPct = Math.min(100, Math.round((availableBalance / MIN_WITHDRAWAL_AMOUNT) * 100));
  const remainingToMin = Math.max(0, MIN_WITHDRAWAL_AMOUNT - availableBalance);
  const canWithdraw = availableBalance >= MIN_WITHDRAWAL_AMOUNT;

  const filteredTransactions = transactions.filter((tx) => {
    if (selectedGigId !== 'all' && tx.gigId && tx.gigId !== selectedGigId) return false;
    if (transactionValidationFilter !== 'all') {
      if (transactionValidationFilter === 'approved' || transactionValidationFilter === 'validated') {
        if (tx.type === 'Payout') return false;
        if (tx.status !== 'Completed' && tx.status !== 'Paid') return false;
      }
      if (transactionValidationFilter === 'pending' && tx.status !== 'Processing' && tx.status !== 'Pending') return false;
      if (transactionValidationFilter === 'refused' && tx.status !== 'Refused') return false;
    }
    return true;
  });

  const getTxVisual = (type: string) => {
    if (type === 'Payout') {
      return { iconBg: 'bg-amber-50', iconText: 'text-amber-600', cardBorder: 'border-amber-100/60', label: 'Retrait' };
    }
    if (type === 'Bonus') {
      return { iconBg: 'bg-violet-50', iconText: 'text-violet-600', cardBorder: 'border-violet-100/60', label: 'Bonus' };
    }
    if (type === 'Vente validée') {
      return { iconBg: 'bg-harx-50', iconText: 'text-harx-600', cardBorder: 'border-harx-100/60', label: 'Vente' };
    }
    return { iconBg: 'bg-emerald-50', iconText: 'text-emerald-600', cardBorder: 'border-emerald-100/60', label: 'Commission' };
  };

  const getTxStatusBadge = (status: string) => {
    if (status === 'Completed' || status === 'Paid') {
      return { label: 'Complété', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    if (status === 'Refused' || status === 'Failed') {
      return { label: 'Refusé', className: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
    return { label: 'En cours', className: 'bg-amber-50 text-amber-700 border-amber-200' };
  };

  return (
    <div className="space-y-6 relative">
      {/* Inline Notification Banner (within the page, below the navbar) */}
      {toastMessage.text && (
        <div className={`px-5 py-3 rounded-xl shadow-sm border transition-all flex items-center gap-3 animate-in slide-in-from-top-2 fade-in ${
          toastMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {toastMessage.type === 'success' ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
          <span className="text-xs font-bold flex-1">{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage({ text: '', type: null })}
            className={`p-1 rounded-lg shrink-0 transition-colors ${
              toastMessage.type === 'success' ? 'hover:bg-emerald-100 text-emerald-600' : 'hover:bg-rose-100 text-rose-600'
            }`}
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{t('wallet.title')}</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Suivez vos gains, vos commissions et gérez vos retraits en toute sécurité.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenWithdraw}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-harx text-white rounded-xl text-xs font-bold shadow-lg shadow-harx-500/25 hover:shadow-xl hover:shadow-harx-500/30 transition-all active:scale-95"
          >
            <ArrowUpRight className="w-4 h-4" />
            {t('wallet.withdrawFunds')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Hero: Available balance (premium dark card) ───────────────── */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-7 text-white shadow-xl shadow-slate-900/25">
          {/* Brand glow accents */}
          <div className="absolute -top-16 -right-10 h-56 w-56 rounded-full bg-harx-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-harx-alt-500/15 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/50">
                    {t('wallet.availableBalance')}
                  </p>
                  <p className="text-[11px] font-semibold text-white/40 mt-0.5">Solde retirable</p>
                </div>
              </div>
              {weeklyEarnings > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/20">
                  <ArrowDownRight className="w-3 h-3" />
                  +{fmtMoney(weeklyEarnings)}€ cette semaine
                </span>
              )}
            </div>

            <div className="mt-6 mb-7">
              <p className="text-4xl sm:text-5xl font-black tracking-tight leading-none">
                {fmtMoney(availableBalance)}<span className="text-2xl sm:text-3xl text-white/40 ml-1">€</span>
              </p>
            </div>

            {/* Withdrawal threshold progress */}
            <div className="mt-auto">
              <div className="flex items-center justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2">
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                    canWithdraw ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/70 border border-white/15'
                  }`}>
                    {canWithdraw ? <ShieldCheck className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/50">
                    Seuil de retrait · {MIN_WITHDRAWAL_AMOUNT.toLocaleString('fr-FR')}€
                  </span>
                </div>
                <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                  canWithdraw ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/80 border border-white/15'
                }`}>
                  {progressPct}%
                </span>
              </div>

              <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out relative ${
                    canWithdraw
                      ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                      : 'bg-gradient-harx'
                  }`}
                  style={{ width: `${Math.max(progressPct, 2)}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent rounded-full" />
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                {canWithdraw ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <p className="text-[11px] font-black text-emerald-300 uppercase tracking-wider">
                      Retrait disponible
                    </p>
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5 text-white/40 shrink-0" />
                    <p className="text-[11px] font-semibold text-white/50">
                      Encore <span className="font-black text-white">{fmtMoney(remainingToMin)}€</span> avant retrait
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Pending earnings (clean white card) ───────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl bg-white p-7 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-start justify-between">
            <div className="h-11 w-11 rounded-2xl bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <span className="inline-flex items-center text-[11px] font-black px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
              {pendingTransactionsCount} en attente
            </span>
          </div>

          <div className="mt-6">
            <p className="text-3xl font-black text-slate-900 tracking-tight leading-none">
              {fmtMoney(pendingEarnings)}<span className="text-xl text-slate-300 ml-1">€</span>
            </p>
            <p className="text-[10px] text-slate-400 font-black mt-2 uppercase tracking-widest">
              {t('wallet.pendingEarnings')}
            </p>
          </div>

          <div className="mt-auto pt-5">
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <Shield className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                Les gains en attente sont crédités après validation des appels et ventes par l'entreprise.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Header Tabs — segmented control */}
            <div className="p-3 sm:p-4 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white">
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100/80 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('transactions')}
                  className={`group relative flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                    activeTab === 'transactions'
                      ? 'bg-white text-harx-600 shadow-sm shadow-slate-300/40 ring-1 ring-slate-200/70'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <span className={`flex h-6 w-6 items-center justify-center rounded-lg shrink-0 transition-colors ${
                    activeTab === 'transactions' ? 'bg-harx-50 text-harx-600' : 'bg-slate-200/60 text-slate-400 group-hover:bg-slate-200'
                  }`}>
                    <Wallet className="w-3.5 h-3.5" />
                  </span>
                  <span className="truncate">{t('wallet.transactionHistory')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('calls')}
                  className={`group relative flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                    activeTab === 'calls'
                      ? 'bg-white text-harx-600 shadow-sm shadow-slate-300/40 ring-1 ring-slate-200/70'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <span className={`flex h-6 w-6 items-center justify-center rounded-lg shrink-0 transition-colors ${
                    activeTab === 'calls' ? 'bg-harx-50 text-harx-600' : 'bg-slate-200/60 text-slate-400 group-hover:bg-slate-200'
                  }`}>
                    <Phone className="w-3.5 h-3.5" />
                  </span>
                  <span className="truncate">Liste des Appels & Gains</span>
                </button>
              </div>
            </div>

            {activeTab === 'transactions' ? (
              <>
                {/* ── Title zone ── */}
                <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-7 w-7 rounded-lg bg-harx-50 flex items-center justify-center">
                        <Wallet className="w-3.5 h-3.5 text-harx-600" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-harx-600">
                        Historique financier
                      </span>
                    </div>
                    <h2 className="text-base font-black text-slate-900 tracking-tight">
                      Retraits & Commissions
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Suivez vos commissions validées et vos demandes de retrait.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black tracking-tight bg-slate-900 text-white">
                      {filteredTransactions.length}
                      <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider">
                        opération{filteredTransactions.length !== 1 ? 's' : ''}
                      </span>
                    </span>
                  </div>
                </div>

                {/* ── Filter zone ── */}
                <div className="px-5 sm:px-6 py-4 bg-slate-50/50 border-b border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Filter className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Filtres</span>
                    </div>
                    {(selectedGigId !== 'all' || transactionValidationFilter !== 'all' || selectedDateRange !== 'this-month') && (
                      <button
                        type="button"
                        onClick={resetTransactionFilters}
                        className="text-[10px] font-black uppercase tracking-wider text-harx-600 hover:text-harx-700 transition-colors"
                      >
                        Réinitialiser
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <WalletFilterSelect
                      label="Filtrer par gig"
                      value={selectedGigId}
                      onChange={setSelectedGigId}
                      options={gigSelectOptions}
                    />
                    <WalletFilterSelect
                      label="Ventes"
                      value={transactionValidationFilter}
                      onChange={(v) => setTransactionValidationFilter(v as typeof transactionValidationFilter)}
                      options={transactionSaleOptions}
                    />
                    <WalletFilterSelect
                      label="Période"
                      value={selectedDateRange}
                      onChange={setSelectedDateRange}
                      options={dateRangeOptions}
                    />
                  </div>
                </div>

                <div className="p-4 sm:p-6 bg-slate-50/40">
                  {filteredTransactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-slate-200 bg-white">
                      <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                        <Wallet className="w-7 h-7 text-slate-300" />
                      </div>
                      <p className="text-sm font-black text-slate-700 uppercase tracking-wider">Aucune transaction</p>
                      <p className="text-xs text-slate-400 font-medium mt-1 max-w-xs">
                        Ajustez les filtres ou effectuez des appels validés pour voir vos commissions ici.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredTransactions.map((transaction) => {
                        const visual = getTxVisual(transaction.type);
                        const statusBadge = getTxStatusBadge(transaction.status);
                        const isPayout = transaction.type === 'Payout';
                        const title = isPayout ? 'Retrait demandé' : transaction.type;

                        return (
                          <button
                            key={transaction.id}
                            type="button"
                            onClick={() => setSelectedTransaction(transaction)}
                            className={`group relative w-full text-left overflow-hidden rounded-2xl border bg-white p-4 sm:p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-harx-500/30 transition-all duration-200 cursor-pointer ${visual.cardBorder}`}
                          >
                            <div className="absolute inset-y-0 left-0 w-1 bg-gradient-harx opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className={`p-3 rounded-2xl shrink-0 shadow-sm ${visual.iconBg} ${visual.iconText}`}>
                                  {isPayout ? (
                                    <ArrowUpRight className="w-5 h-5" />
                                  ) : (
                                    <ArrowDownRight className="w-5 h-5" />
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${visual.iconBg} ${visual.iconText}`}>
                                      {visual.label}
                                    </span>
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${statusBadge.className}`}>
                                      {statusBadge.label}
                                    </span>
                                  </div>
                                  <p className="font-extrabold text-slate-900 text-sm">{title}</p>
                                  <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-2 leading-relaxed">
                                    {transaction.description}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-bold mt-2 truncate">
                                    Réf. {transaction.reference}
                                  </p>
                                </div>
                              </div>

                              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:pl-4 sm:border-l sm:border-slate-100 shrink-0">
                                <p className={`text-xl font-black tracking-tight ${isPayout ? 'text-slate-900' : 'text-emerald-600'}`}>
                                  {isPayout ? '−' : '+'}
                                  {transaction.amount.toFixed(2)} €
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  {new Date(transaction.date).toLocaleDateString('fr-FR', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </p>
                                <span className="hidden sm:flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-slate-300 group-hover:text-harx-500 transition-colors">
                                  Détails
                                  <ChevronRight className="w-3 h-3" />
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* ── Title zone ── */}
                <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-7 w-7 rounded-lg bg-harx-50 flex items-center justify-center">
                        <Phone className="w-3.5 h-3.5 text-harx-600" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-harx-600">
                        Suivi des appels
                      </span>
                    </div>
                    <h3 className="text-base font-black text-slate-900 tracking-tight">
                      Appels éligibles aux commissions
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Chaque appel validé par l'entreprise crédite votre solde de gains.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black tracking-tight bg-slate-900 text-white">
                      {getCallCountForGig('all')}
                      <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider">
                        appels
                      </span>
                    </span>
                    {selectedGigId !== 'all' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black tracking-tight bg-harx-50 text-harx-700 border border-harx-100">
                        {getCallCountForGig(selectedGigId)}
                        <span className="text-[9px] font-bold text-harx-400 uppercase tracking-wider">
                          ce gig
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Filter zone ── */}
                <div className="px-5 sm:px-6 py-4 bg-slate-50/50 border-b border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Filter className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Filtres</span>
                    </div>
                    {(selectedGigId !== 'all' || callValidationFilter !== 'all' || transactionValidationFilter !== 'all') && (
                      <button
                        type="button"
                        onClick={resetCallFilters}
                        className="text-[10px] font-black uppercase tracking-wider text-harx-600 hover:text-harx-700 transition-colors"
                      >
                        Réinitialiser
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <WalletFilterSelect
                      label="Filtrer par gig"
                      value={selectedGigId}
                      onChange={setSelectedGigId}
                      options={gigSelectOptions}
                    />
                    <WalletFilterSelect
                      label="Appels"
                      value={callValidationFilter}
                      onChange={(v) => setCallValidationFilter(v as typeof callValidationFilter)}
                      options={callValidationOptions}
                    />
                    <WalletFilterSelect
                      label="Transactions"
                      value={transactionValidationFilter}
                      onChange={(v) => setTransactionValidationFilter(v as typeof transactionValidationFilter)}
                      options={callTxValidationOptions}
                    />
                  </div>
                </div>

                {/* Remboursement / Commission de Gig Info Banner */}
                <div className="mx-6 mt-6 relative overflow-hidden p-5 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-200 shadow-lg shadow-slate-900/20">
                  <div className="absolute -top-12 -right-8 h-32 w-32 rounded-full bg-harx-500/20 blur-3xl pointer-events-none" />
                  <div className="relative z-10 flex items-start gap-3">
                    <div className="p-2.5 bg-white/10 backdrop-blur-sm border border-white/15 text-harx-300 rounded-xl shrink-0">
                      <Sparkles className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <span className="text-[9px] text-harx-300 font-extrabold uppercase tracking-widest block">Barème de Commission</span>
                      <p className="text-xs text-white/60 font-medium leading-relaxed mt-0.5">
                        {getSelectedGigCommission().rules}
                      </p>
                    </div>
                  </div>
                  <div className="relative z-10 text-left sm:text-right shrink-0">
                    <span className="text-[9px] font-black text-white/40 block uppercase tracking-wider">
                      Ma commission
                    </span>
                    <span className="text-sm font-black text-white block mt-0.5">
                      {getSelectedGigCommission().rate}
                    </span>
                    {!getSelectedGigCommission().bonus.startsWith('Aucun') && (
                      <span className="inline-block text-[8px] font-black text-emerald-300 bg-emerald-500/15 border border-emerald-400/20 px-1.5 py-0.5 rounded-md mt-1.5 max-w-[220px] text-right leading-snug">
                        {getSelectedGigCommission().bonus}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 sm:p-6 bg-slate-50/40">
                  <CallRecords 
                    gigId={selectedGigId === 'all' ? undefined : selectedGigId} 
                    callValidationFilter={callValidationFilter}
                    transactionValidationFilter={
                      transactionValidationFilter === 'validated'
                        ? 'approved'
                        : transactionValidationFilter
                    }
                    onAnalysisSettled={fetchWalletData}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TRANSACTION DETAIL MODAL */}
      {/* ========================================================================= */}
      {selectedTransaction && (() => {
        const tx = selectedTransaction;
        const visual = getTxVisual(tx.type);
        const statusBadge = getTxStatusBadge(tx.status);
        const isPayout = tx.type === 'Payout';
        const title = isPayout ? 'Retrait demandé' : tx.type;
        return createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/60 animate-in fade-in duration-200"
            onClick={() => setSelectedTransaction(null)}
          >
            <div
              className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl ring-1 ring-slate-900/5 animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header — compact */}
              <div className="relative px-5 py-5 bg-gradient-to-br from-slate-900 to-slate-800">
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="absolute top-3 right-3 p-1.5 hover:bg-white/10 text-white/50 hover:text-white rounded-lg transition-all"
                  aria-label="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-3.5">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shrink-0 shadow-md ${visual.iconBg} ${visual.iconText}`}>
                    {isPayout ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] font-black uppercase tracking-widest text-harx-300 block">
                      {visual.label}
                    </span>
                    <p className={`text-2xl font-black tracking-tight leading-tight ${isPayout ? 'text-white' : 'text-emerald-400'}`}>
                      {isPayout ? '−' : '+'}
                      {tx.amount.toFixed(2)} €
                    </p>
                  </div>
                  <span className={`ml-auto self-start mt-0.5 inline-flex items-center px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${statusBadge.className}`}>
                    {statusBadge.label}
                  </span>
                </div>
              </div>

              {/* Body — detail rows */}
              <div className="px-5 py-2">
                <div className="flex items-start justify-between gap-4 py-3 border-b border-slate-100">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0 pt-0.5">Type</span>
                  <span className="text-xs font-bold text-slate-800 text-right">{title}</span>
                </div>
                {tx.description && (
                  <div className="flex items-start justify-between gap-4 py-3 border-b border-slate-100">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0 pt-0.5">Description</span>
                    <span className="text-xs font-medium text-slate-600 text-right leading-relaxed">{tx.description}</span>
                  </div>
                )}
                {tx.method && (
                  <div className="flex items-start justify-between gap-4 py-3 border-b border-slate-100">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0 pt-0.5">Méthode</span>
                    <span className="text-xs font-bold text-slate-800 text-right">{tx.method}</span>
                  </div>
                )}
                <div className="flex items-start justify-between gap-4 py-3 border-b border-slate-100">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0 pt-0.5">Date</span>
                  <span className="text-xs font-bold text-slate-800 text-right capitalize">
                    {new Date(tx.date).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                {tx.reference && (
                  <div className="flex items-start justify-between gap-4 py-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0 pt-0.5">Référence</span>
                    <span className="text-[11px] font-mono font-semibold text-slate-500 text-right break-all">{tx.reference}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 pt-2 pb-5">
                <button
                  type="button"
                  onClick={() => setSelectedTransaction(null)}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}

      {/* ========================================================================= */}
      {/* WINDOW 1: GLASSMORPHIC WITHDRAWAL MODAL */}
      {/* ========================================================================= */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white border border-slate-100 rounded-[2rem] shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Design Accents */}
            <div className="absolute -top-12 -left-12 w-40 h-40 bg-harx-500/5 blur-[50px] rounded-full pointer-events-none"></div>
            <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-harx-alt-500/5 blur-[50px] rounded-full pointer-events-none"></div>

            {/* Header Area */}
            <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-harx-50 text-harx-600 rounded-xl">
                  <Wallet className="w-5 h-5 animate-bounce-subtle" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Demande de Retrait</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Transférer vers vos comptes</p>
                </div>
              </div>
              <button 
                onClick={() => setShowWithdrawModal(false)}
                className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ERROR DISPLAY */}
            {validationError && (
              <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-xl font-semibold flex items-center gap-2 border border-rose-100">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{validationError}</span>
              </div>
            )}

            {/* ==================== STEP 1: FORM DETAILS ==================== */}
            {withdrawStep === 1 && (
              <form onSubmit={handleStep1Submit} className="space-y-4">
                {/* Method selector */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-2">
                    Méthode de Paiement
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('bank')}
                      className={`p-4 rounded-2xl border text-left flex flex-col transition-all ${
                        selectedMethod === 'bank' 
                          ? 'border-harx-400 bg-harx-50/40 ring-1 ring-harx-400' 
                          : 'border-slate-100 bg-slate-50 hover:bg-slate-100/50'
                      }`}
                    >
                      <Bank className={`w-5 h-5 mb-2 ${selectedMethod === 'bank' ? 'text-harx-600' : 'text-slate-400'}`} />
                      <span className="text-xs font-black text-slate-700">Compte Bancaire</span>
                      <span className="text-[10px] text-slate-400 font-bold mt-0.5">Transit (...4567)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('paypal')}
                      className={`p-4 rounded-2xl border text-left flex flex-col transition-all ${
                        selectedMethod === 'paypal' 
                          ? 'border-harx-400 bg-harx-50/40 ring-1 ring-harx-400' 
                          : 'border-slate-100 bg-slate-50 hover:bg-slate-100/50'
                      }`}
                    >
                      <CreditCard className={`w-5 h-5 mb-2 ${selectedMethod === 'paypal' ? 'text-harx-600' : 'text-slate-400'}`} />
                      <span className="text-xs font-black text-slate-700">PayPal Wallet</span>
                      <span className="text-[10px] text-slate-400 font-bold mt-0.5">john.doe@example.com</span>
                    </button>
                  </div>
                </div>

                {/* Amount entry */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                      Montant à Retirer
                    </label>
                    <span className="text-[10px] text-slate-500 font-black uppercase">
                      Min: {MIN_WITHDRAWAL_AMOUNT}€ · Max: {availableBalance.toFixed(2)}€
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <span className="text-slate-400 font-black text-xs">€</span>
                    </div>
                    <input
                      type="number"
                      required
                      min={MIN_WITHDRAWAL_AMOUNT}
                      step="any"
                      placeholder={`${MIN_WITHDRAWAL_AMOUNT}.00`}
                      value={withdrawAmount}
                      onChange={(e) => {
                        setWithdrawAmount(e.target.value);
                        setValidationError('');
                      }}
                      className="block w-full pl-9 pr-24 py-3 bg-slate-50 border border-slate-100 focus:border-harx-400 focus:bg-white focus:ring-2 focus:ring-harx-500/20 outline-none rounded-2xl text-sm font-extrabold text-slate-800 transition-all"
                    />
                    <div className="absolute inset-y-1 right-1 flex items-center">
                      <button
                        type="button"
                        onClick={() => setWithdrawAmount(availableBalance.toString())}
                        className="px-3.5 h-full bg-white hover:bg-slate-50 border border-slate-150 text-[10px] font-black text-harx-600 rounded-xl uppercase tracking-wider transition-all shadow-sm active:scale-95"
                      >
                        Utiliser Max
                      </button>
                    </div>
                  </div>

                  {/* Fast selection buttons — only show those reachable
                      with the current available balance. */}
                  <div className="flex gap-2 mt-2">
                    {[MIN_WITHDRAWAL_AMOUNT, 2000, 5000].map((quick) => {
                      const reachable = quick <= availableBalance;
                      return (
                        <button
                          key={quick}
                          type="button"
                          disabled={!reachable}
                          onClick={() => {
                            setWithdrawAmount(quick.toString());
                            setValidationError('');
                          }}
                          className={`flex-1 py-1 text-[10px] font-extrabold rounded-lg transition-all border ${
                            reachable
                              ? 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-100'
                              : 'bg-slate-50/50 text-slate-300 border-slate-100/50 cursor-not-allowed'
                          }`}
                        >
                          {quick.toLocaleString('fr-FR')}€
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Minimum amount banner */}
                <div className="bg-harx-50/70 border border-harx-100 p-3.5 rounded-2xl flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-harx-500 mt-0.5 shrink-0" />
                  <p className="text-[10px] text-harx-900 font-semibold leading-relaxed">
                    <span className="font-black uppercase tracking-wider">Retrait minimum : {MIN_WITHDRAWAL_AMOUNT}€.</span>
                    {' '}Les demandes inférieures à ce seuil sont automatiquement refusées par la plateforme.
                  </p>
                </div>

                {/* Security hint disclaimer */}
                <div className="bg-slate-50 p-3.5 rounded-2xl flex items-start gap-2.5">
                  <Shield className="w-4 h-4 text-harx-500 mt-0.5 shrink-0 animate-pulse" />
                  <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                    Vos fonds seront transférés sur-le-champ vers la plateforme sélectionnée. Des contrôles de conformité KYC sont actifs sur ce compte.
                  </p>
                </div>

                <div className="pt-2">
                  {(() => {
                    const numericAmount = parseFloat(withdrawAmount);
                    const isBelowMin = !Number.isNaN(numericAmount) && numericAmount > 0 && numericAmount < MIN_WITHDRAWAL_AMOUNT;
                    const isAboveBalance = !Number.isNaN(numericAmount) && numericAmount > availableBalance;
                    const disabled = !withdrawAmount || isBelowMin || isAboveBalance || numericAmount <= 0;
                    return (
                      <button
                        type="submit"
                        disabled={disabled}
                        className={`w-full py-3 text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl shadow-md transition-all active:scale-95 ${
                          disabled
                            ? 'bg-slate-300 cursor-not-allowed'
                            : 'bg-gradient-harx hover:shadow-lg hover:shadow-harx-500/30'
                        }`}
                      >
                        {isBelowMin
                          ? `Minimum ${MIN_WITHDRAWAL_AMOUNT}€ requis`
                          : "Suivant: Vérifier l'identité"}
                      </button>
                    );
                  })()}
                </div>
              </form>
            )}

            {/* ==================== STEP 2: 2FA SECURITY CHECK ==================== */}
            {withdrawStep === 2 && (
              <form onSubmit={handleStep2Submit} className="space-y-4">
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <div className="p-4 bg-amber-50 text-amber-500 border border-amber-100 rounded-3xl mb-3 shadow-inner">
                    <KeyRound className="w-6 h-6 animate-pulse" />
                  </div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Double Facteur Activé</h4>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 max-w-xs uppercase leading-tight">
                    Nous avons envoyé un code de vérification à votre appareil.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-2 text-center">
                    Entrer le code à 4 chiffres
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    placeholder="••••"
                    value={verificationCode}
                    onChange={(e) => {
                      setVerificationCode(e.target.value.replace(/\D/g, ''));
                      setValidationError('');
                    }}
                    className="block w-32 mx-auto text-center py-2.5 bg-slate-50 border border-slate-100 focus:border-harx-400 focus:bg-white focus:ring-2 focus:ring-harx-500/20 outline-none rounded-2xl text-lg font-black text-slate-800 tracking-[0.75em] transition-all"
                  />
                  <p className="text-center text-[9px] text-harx-500 font-bold mt-2 uppercase tracking-wide">
                    Code de démonstration : Saisissez <span className="underline font-black text-xs">1234</span>
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setWithdrawStep(1)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all"
                  >
                    Retour
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-sm active:scale-95"
                  >
                    Confirmer
                  </button>
                </div>
              </form>
            )}

            {/* ==================== STEP 3: SUCCESS SPLASH ==================== */}
            {withdrawStep === 3 && (
              <div className="space-y-4 py-4 text-center">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 border border-emerald-100 rounded-full mx-auto flex items-center justify-center shadow-lg relative">
                  <Check className="w-8 h-8" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-400 rounded-full flex items-center justify-center text-white text-[8px] font-black animate-ping" />
                </div>
                
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center justify-center gap-1">
                    Retrait Soumis ! <Sparkles className="w-4 h-4 text-amber-500" />
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase max-w-sm mx-auto leading-relaxed">
                    Félicitations, votre demande de {parseFloat(withdrawAmount).toFixed(2)}€ a été enregistrée.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left max-w-xs mx-auto text-xs font-bold space-y-2 text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-[10px] uppercase">Montant</span>
                    <span className="text-slate-800 font-black">{parseFloat(withdrawAmount).toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-[10px] uppercase">Frais de réseau</span>
                    <span className="text-emerald-600 font-black">Gratuit</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-[10px] uppercase">Statut</span>
                    <span className="text-amber-600 font-black uppercase text-[10px]">Traitement en cours...</span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-slate-200 pt-2 text-[10px] text-slate-400">
                    <span>TRANSACTION REF</span>
                    <span>{lastWithdrawal?.reference || 'WTH-PENDING'}</span>
                  </div>
                </div>

                <div className="pt-2 max-w-xs mx-auto">
                  <button
                    onClick={() => {
                      setShowWithdrawModal(false);
                      showToast('Retrait enregistré avec succès !', 'success');
                    }}
                    className="w-full py-3 bg-slate-900 hover:bg-black text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl shadow-md transition-all active:scale-95"
                  >
                    Fermer le Guichet
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}