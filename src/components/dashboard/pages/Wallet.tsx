import React, { useState, useEffect } from 'react';
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
const MIN_WITHDRAWAL_AMOUNT = 1000;

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

  const getCallCountForGig = (gigId: string) => {
    if (gigId === 'all') return realCalls.length;
    return realCalls.filter(record => {
      const recordGig = record.lead?.gigId;
      const idStr = typeof recordGig === 'object' 
        ? (recordGig?._id || (recordGig as any)?.$oid) 
        : recordGig;
      return idStr === gigId;
    }).length;
  };

  const gigsFilterOptions = [
    { id: 'all', title: `Tous les Gigs (${getCallCountForGig('all')})` },
    ...Array.from(new Set(realCalls.map(c => {
      const gig = c.lead?.gigId;
      return typeof gig === 'object' ? (gig?._id || (gig as any)?.$oid) : gig;
    }).filter(Boolean))).map(id => {
      const call = realCalls.find(c => {
        const gig = c.lead?.gigId;
        const gigId = typeof gig === 'object' ? (gig?._id || (gig as any)?.$oid) : gig;
        return gigId === id;
      });
      const title = call?.lead?.gigId?.title || "Projet Sans Titre";
      return { id, title: `${title} (${getCallCountForGig(id)})` };
    })
  ];

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

  const balanceStats = [
    {
      title: t('wallet.availableBalance'),
      amount: `${availableBalance.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€`,
      icon: Wallet,
      change: `+${getWeeklyEarnings().toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€ cette semaine`,
      status: 'positive'
    },
    {
      title: t('wallet.pendingEarnings'),
      amount: `${pendingEarnings.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€`,
      icon: Clock,
      change: `${pendingTransactionsCount} transactions en attente`,
      status: 'neutral'
    }
  ];

  return (
    <div className="space-y-6 relative">
      {/* Mini Notification Toast */}
      {toastMessage.text && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-xl border z-[9999] transition-all flex items-center gap-2 animate-in slide-in-from-bottom-2 ${
          toastMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {toastMessage.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
          <span className="text-xs font-bold">{toastMessage.text}</span>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{t('wallet.title')}</h1>
        <div className="flex items-center space-x-4">
          <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs font-bold transition-all">
            <Download className="w-4 h-4" />
            <span>{t('wallet.downloadStatement')}</span>
          </button>
          <button 
            onClick={handleOpenWithdraw}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95"
          >
            {t('wallet.withdrawFunds')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {balanceStats.map((stat, index) => {
          const isAvailable = index === 0;
          const progressPct = isAvailable
            ? Math.min(100, Math.round((availableBalance / MIN_WITHDRAWAL_AMOUNT) * 100))
            : 0;
          const remainingToMin = Math.max(0, MIN_WITHDRAWAL_AMOUNT - availableBalance);
          const canWithdraw = isAvailable && availableBalance >= MIN_WITHDRAWAL_AMOUNT;
          return (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <stat.icon className="w-6 h-6 text-blue-600" />
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  stat.status === 'positive' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                }`}>
                  {stat.change}
                </span>
              </div>
              <p className="mt-4 text-2xl font-black text-slate-800 tracking-tight">{stat.amount}</p>
              <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">{stat.title}</p>

              {isAvailable && (
                <div
                  className={`mt-5 relative overflow-hidden rounded-2xl p-4 border ${
                    canWithdraw
                      ? 'bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/40 border-emerald-100'
                      : 'bg-gradient-to-br from-slate-50 via-white to-blue-50/40 border-slate-100'
                  }`}
                >
                  {/* Decorative glow */}
                  <div
                    className={`absolute -top-10 -right-10 h-24 w-24 rounded-full blur-2xl ${
                      canWithdraw ? 'bg-emerald-300/30' : 'bg-blue-300/20'
                    }`}
                  />

                  <div className="relative z-10 flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                          canWithdraw
                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                            : 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
                        }`}
                      >
                        {canWithdraw ? <ShieldCheck className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-tight">
                          Seuil de retrait
                        </p>
                        <p className="text-sm font-black text-slate-900 tracking-tight leading-tight">
                          {MIN_WITHDRAWAL_AMOUNT.toLocaleString('fr-FR')}€
                        </p>
                      </div>
                    </div>
                    <div
                      className={`text-xs font-black px-2.5 py-1 rounded-full shrink-0 ${
                        canWithdraw
                          ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                          : 'bg-white text-slate-700 border border-slate-200'
                      }`}
                    >
                      {progressPct}%
                    </div>
                  </div>

                  <div className="relative z-10 h-2.5 w-full bg-slate-100/80 rounded-full overflow-hidden shadow-inner">
                    <div
                      className={`h-full transition-all duration-1000 ease-out rounded-full relative ${
                        canWithdraw
                          ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/40'
                          : 'bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 shadow-lg shadow-blue-500/30'
                      }`}
                      style={{ width: `${Math.max(progressPct, 2)}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/40 to-transparent rounded-full" />
                    </div>
                  </div>

                  <div className="relative z-10 mt-3 flex items-center gap-2">
                    {canWithdraw ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <p className="text-[11px] font-black text-emerald-700 uppercase tracking-wider">
                          Retrait disponible
                        </p>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <p className="text-[11px] font-bold text-slate-500">
                          Encore{' '}
                          <span className="font-black text-slate-900">
                            {remainingToMin.toLocaleString('fr-FR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}€
                          </span>{' '}
                          avant retrait
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div>
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Header Tabs */}
            <div className="flex border-b border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setActiveTab('transactions')}
                className={`flex-1 py-4 text-center text-xs font-black uppercase tracking-widest border-b-2 transition-all ${
                  activeTab === 'transactions' 
                    ? 'border-blue-600 text-blue-600 bg-white' 
                    : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50/50'
                }`}
              >
                {t('wallet.transactionHistory')}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('calls')}
                className={`flex-1 py-4 text-center text-xs font-black uppercase tracking-widest border-b-2 transition-all ${
                  activeTab === 'calls' 
                    ? 'border-blue-600 text-blue-600 bg-white' 
                    : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50/50'
                }`}
              >
                Liste des Appels & Gains
              </button>
            </div>

            {activeTab === 'transactions' ? (
              <>
                <div className="p-6 border-b border-gray-100">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Historique de Retraits & Commissions</h2>
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Gig Filter */}
                      <select
                        value={selectedGigId}
                        onChange={(e) => setSelectedGigId(e.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      >
                        {gigsFilterOptions.map(gig => (
                          <option key={gig.id} value={gig.id}>{gig.title}</option>
                        ))}
                      </select>

                      {/* Transaction Filter */}
                      <select
                        value={transactionValidationFilter}
                        onChange={(e) => setTransactionValidationFilter(e.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      >
                        <option value="all">Toutes les Ventes</option>
                        <option value="validated">Ventes Validées</option>
                        <option value="pending">Ventes en Attente</option>
                        <option value="rejected">Ventes Refusées</option>
                        <option value="to_validate">À Valider (Moi)</option>
                      </select>

                      <select
                        value={selectedDateRange}
                        onChange={(e) => setSelectedDateRange(e.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      >
                        <option value="today">Today</option>
                        <option value="this-week">This Week</option>
                        <option value="this-month">This Month</option>
                        <option value="last-month">Last Month</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {transactions
                    .filter(tx => {
                      // Apply Gig Filter if it's a commission transaction
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
                    })
                    .map((transaction) => (
                    <div key={transaction.id} className="p-6 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`p-2.5 rounded-xl ${
                            transaction.type === 'Payout' ? 'bg-orange-50 text-orange-600' :
                            transaction.type === 'Bonus' ? 'bg-violet-50 text-violet-600' :
                            transaction.type === 'Vente validée' ? 'bg-blue-50 text-blue-600' :
                            'bg-emerald-50 text-emerald-600'
                          }`}>
                            {transaction.type === 'Payout' ? (
                              <ArrowUpRight className="w-5 h-5" />
                            ) : (
                              <ArrowDownRight className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-800 text-sm">{transaction.type === 'Payout' ? 'Retrait Demandé' : transaction.type}</p>
                            <p className="text-xs text-slate-400 font-semibold mt-0.5">{transaction.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-slate-900 text-sm">
                            {transaction.type === 'Payout' ? '-' : '+'}
                            {transaction.amount.toFixed(2)} €
                          </p>
                          <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                            transaction.status === 'Completed' 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              : 'bg-amber-50 text-amber-600 border border-amber-100'
                          }`}>
                            {transaction.status === 'Completed' ? 'Complété' : 'En cours'}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400 font-bold">
                        <span>Ref: {transaction.reference}</span>
                        <span>{new Date(transaction.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                        Suivi des Appels éligibles aux commissions
                      </h3>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                        Total : {getCallCountForGig('all')} appels
                      </span>
                      {selectedGigId !== 'all' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100">
                          Ce Gig : {getCallCountForGig(selectedGigId)}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1 uppercase">
                      Chaque appel validé par l'entreprise crédite votre solde de gains.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-slate-400">Filtrer par Gig :</span>
                      <select
                        value={selectedGigId}
                        onChange={(e) => setSelectedGigId(e.target.value)}
                        className="border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-black text-slate-700 bg-white shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        {gigsFilterOptions.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.title}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-slate-400">Appels :</span>
                      <select
                        value={callValidationFilter}
                        onChange={(e) => setCallValidationFilter(e.target.value as any)}
                        className="border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-black text-slate-700 bg-white shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="all">Tous les appels</option>
                        <option value="approved">Validés uniquement</option>
                        <option value="pending">En attente / Non validés</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-slate-400">Transactions :</span>
                      <select
                        value={transactionValidationFilter}
                        onChange={(e) => setTransactionValidationFilter(e.target.value as any)}
                        className="border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-black text-slate-700 bg-white shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="all">Toutes les transactions</option>
                        <option value="approved">Validées (Signées)</option>
                        <option value="refused">Refusées</option>
                        <option value="pending">À valider (En attente)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Remboursement / Commission de Gig Info Banner */}
                <div className="mx-6 mt-6 p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-200">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-blue-500/15 text-blue-600 rounded-xl shrink-0">
                      <Sparkles className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <span className="text-[9px] text-blue-600 font-extrabold uppercase tracking-widest block">Barème de Commission</span>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed mt-0.5">
                        {getSelectedGigCommission().rules}
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-[9px] font-black text-slate-400 block uppercase tracking-wider">
                      Ma commission
                    </span>
                    <span className="text-sm font-black text-blue-600 block mt-0.5">
                      {getSelectedGigCommission().rate}
                    </span>
                    {!getSelectedGigCommission().bonus.startsWith('Aucun') && (
                      <span className="inline-block text-[8px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md mt-1.5 max-w-[220px] text-right leading-snug">
                        {getSelectedGigCommission().bonus}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  <CallRecords 
                    gigId={selectedGigId === 'all' ? undefined : selectedGigId} 
                    callValidationFilter={callValidationFilter}
                    transactionValidationFilter={transactionValidationFilter}
                    onAnalysisSettled={fetchWalletData}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* WINDOW 1: GLASSMORPHIC WITHDRAWAL MODAL */}
      {/* ========================================================================= */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white border border-slate-100 rounded-[2rem] shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Design Accents */}
            <div className="absolute -top-12 -left-12 w-40 h-40 bg-emerald-500/5 blur-[50px] rounded-full pointer-events-none"></div>
            <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-blue-500/5 blur-[50px] rounded-full pointer-events-none"></div>

            {/* Header Area */}
            <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
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
                          ? 'border-blue-500 bg-blue-50/25 ring-1 ring-blue-500' 
                          : 'border-slate-100 bg-slate-50 hover:bg-slate-100/50'
                      }`}
                    >
                      <Bank className={`w-5 h-5 mb-2 ${selectedMethod === 'bank' ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span className="text-xs font-black text-slate-700">Compte Bancaire</span>
                      <span className="text-[10px] text-slate-400 font-bold mt-0.5">Transit (...4567)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('paypal')}
                      className={`p-4 rounded-2xl border text-left flex flex-col transition-all ${
                        selectedMethod === 'paypal' 
                          ? 'border-blue-500 bg-blue-50/25 ring-1 ring-blue-500' 
                          : 'border-slate-100 bg-slate-50 hover:bg-slate-100/50'
                      }`}
                    >
                      <CreditCard className={`w-5 h-5 mb-2 ${selectedMethod === 'paypal' ? 'text-blue-600' : 'text-slate-400'}`} />
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
                      className="block w-full pl-9 pr-24 py-3 bg-slate-50 border border-slate-100 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded-2xl text-sm font-extrabold text-slate-800"
                    />
                    <div className="absolute inset-y-1 right-1 flex items-center">
                      <button
                        type="button"
                        onClick={() => setWithdrawAmount(availableBalance.toString())}
                        className="px-3.5 h-full bg-white hover:bg-slate-50 border border-slate-150 text-[10px] font-black text-blue-600 rounded-xl uppercase tracking-wider transition-all shadow-sm active:scale-95"
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
                <div className="bg-blue-50/70 border border-blue-100 p-3.5 rounded-2xl flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-[10px] text-blue-900 font-semibold leading-relaxed">
                    <span className="font-black uppercase tracking-wider">Retrait minimum : {MIN_WITHDRAWAL_AMOUNT}€.</span>
                    {' '}Les demandes inférieures à ce seuil sont automatiquement refusées par la plateforme.
                  </p>
                </div>

                {/* Security hint disclaimer */}
                <div className="bg-slate-50 p-3.5 rounded-2xl flex items-start gap-2.5">
                  <Shield className="w-4 h-4 text-blue-500 mt-0.5 shrink-0 animate-pulse" />
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
                            : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
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
                    className="block w-32 mx-auto text-center py-2.5 bg-slate-50 border border-slate-100 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded-2xl text-lg font-black text-slate-800 tracking-[0.75em]"
                  />
                  <p className="text-center text-[9px] text-blue-500 font-bold mt-2 uppercase tracking-wide">
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