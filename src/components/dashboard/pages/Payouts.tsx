import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  CreditCard, 
  Ban as Bank, 
  History, 
  Clock,
  X,
  Check,
  AlertCircle,
  KeyRound,
  Sparkles,
  Shield,
  DollarSign
} from 'lucide-react';

export function Payouts() {
  // Dynamic state metrics for simulating real-time payouts
  const [availableBalance, setAvailableBalance] = useState(() => {
    const saved = localStorage.getItem('rep_available_balance');
    return saved ? parseFloat(saved) : 1250.00;
  });
  const [pendingEarnings, setPendingEarnings] = useState(() => {
    const saved = localStorage.getItem('rep_pending_balance');
    return saved ? parseFloat(saved) : 325.00;
  });
  const [lifetimeEarnings, setLifetimeEarnings] = useState(12450.00);

  // Sync state changes with localStorage and emit sync event
  useEffect(() => {
    localStorage.setItem('rep_available_balance', availableBalance.toString());
    localStorage.setItem('rep_pending_balance', pendingEarnings.toString());
    window.dispatchEvent(new Event('WALLET_BALANCE_UPDATED'));
  }, [availableBalance, pendingEarnings]);

  const [transactions, setTransactions] = useState([
    {
      id: 1,
      type: 'Payout',
      amount: 450.00,
      status: 'Completed',
      date: '2024-03-15',
      method: 'Bank Transfer'
    },
    {
      id: 2,
      type: 'Bonus',
      amount: 100.00,
      status: 'Processing',
      date: '2024-03-14',
      method: 'PayPal'
    },
    {
      id: 3,
      type: 'Reward',
      amount: 75.00,
      status: 'Completed',
      date: '2024-03-10',
      method: 'Bank Transfer'
    }
  ]);

  // Withdrawal Modal States
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawStep, setWithdrawStep] = useState(1); // 1 = Entry, 2 = 2FA, 3 = Success
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('bank');
  const [verificationCode, setVerificationCode] = useState('');
  const [validationError, setValidationError] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | null }>({ text: '', type: null });

  const showToast = (text: string, type: 'success' | 'error') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage({ text: '', type: null }), 3000);
  };

  const handleOpenWithdraw = () => {
    if (availableBalance <= 0) {
      showToast('Votre solde disponible est insuffisant pour un retrait.', 'error');
      return;
    }
    setWithdrawAmount('');
    setSelectedMethod('bank');
    setWithdrawStep(1);
    setVerificationCode('');
    setValidationError('');
    setShowWithdrawModal(true);
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setValidationError('Veuillez saisir un montant valide supérieur à 0.');
      return;
    }
    if (amount > availableBalance) {
      setValidationError(`Le montant dépasse votre solde disponible de $${availableBalance.toFixed(2)}.`);
      return;
    }
    setValidationError('');
    setWithdrawStep(2);
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode.trim() !== '1234') {
      setValidationError('Code de vérification incorrect. Saisissez 1234 pour simuler la validation.');
      return;
    }
    setValidationError('');
    
    // Process withdrawal
    const parsedAmount = parseFloat(withdrawAmount);
    setAvailableBalance(prev => prev - parsedAmount);
    setPendingEarnings(prev => prev + parsedAmount);

    // Add transaction to history list
    const newTx = {
      id: Date.now(),
      type: 'Payout',
      amount: parsedAmount,
      status: 'Processing',
      date: new Date().toISOString().split('T')[0],
      method: selectedMethod === 'bank' ? 'Bank Transfer' : 'PayPal'
    };

    setTransactions(prev => [newTx, ...prev]);
    setWithdrawStep(3);
  };

  const stats = [
    {
      title: 'Available Balance',
      amount: `$${availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: Wallet,
      change: '+$450 this week'
    },
    {
      title: 'Pending Payouts',
      amount: `$${pendingEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: Clock,
      change: `${transactions.filter(t => t.status === 'Processing').length} transactions`
    },
    {
      title: 'Total Earned',
      amount: `$${lifetimeEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: CreditCard,
      change: 'Since joining'
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
        <h1 className="text-2xl font-bold text-gray-900">Payouts & Earnings</h1>
        <button 
          onClick={handleOpenWithdraw}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95"
        >
          Request Payout
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-blue-50 rounded-lg">
                <stat.icon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="mt-4 text-2xl font-semibold text-gray-900 tracking-tight">{stat.amount}</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-sm text-gray-500">{stat.title}</p>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{stat.change}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6 border-b border-slate-50 pb-4">
          <h2 className="text-lg font-semibold text-gray-900">Transaction History</h2>
          <button className="text-blue-600 hover:text-blue-700 flex items-center text-xs font-bold">
            <History className="w-4 h-4 mr-1" />
            View All
          </button>
        </div>
        <div className="space-y-4">
          {transactions.map((transaction, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 border border-slate-150 rounded-xl hover:bg-slate-50/50 transition-all">
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-lg ${
                  transaction.type === 'Payout' ? 'bg-orange-50 text-orange-600' : 
                  transaction.type === 'Bonus' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  {transaction.type === 'Payout' ? (
                    <ArrowUpRight className="w-5 h-5" />
                  ) : (
                    <ArrowDownRight className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{transaction.type === 'Payout' ? 'Retrait Demandé' : transaction.type}</p>
                  <p className="text-xs text-gray-500">{transaction.date} via {transaction.method}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-gray-900">${transaction.amount.toFixed(2)}</p>
                <span className={`inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${
                  transaction.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                }`}>
                  {transaction.status === 'Completed' ? 'Complété' : 'En cours'}
                </span>
              </div>
            </div>
          ))}
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
                      Max: ${availableBalance.toFixed(2)}
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <DollarSign className="h-4.5 w-4.5 text-slate-400" />
                    </div>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      placeholder="0.00"
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

                  {/* Fast selection buttons */}
                  <div className="flex gap-2 mt-2">
                    {[100, 250, 500].map((quick) => (
                      <button
                        key={quick}
                        type="button"
                        onClick={() => {
                          setWithdrawAmount(quick.toString());
                          setValidationError('');
                        }}
                        className="flex-1 py-1 bg-slate-50 hover:bg-slate-100 text-[10px] font-extrabold text-slate-600 rounded-lg transition-all border border-slate-100"
                      >
                        ${quick}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Security hint disclaimer */}
                <div className="bg-slate-50 p-3.5 rounded-2xl flex items-start gap-2.5">
                  <Shield className="w-4 h-4 text-blue-500 mt-0.5 shrink-0 animate-pulse" />
                  <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                    Vos fonds seront transférés sur-le-champ vers la plateforme sélectionnée. Des contrôles de conformité KYC sont actifs sur ce compte.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-95"
                  >
                    Suivant: Vérifier l'identité
                  </button>
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
                    Félicitations, votre demande de ${parseFloat(withdrawAmount).toFixed(2)} a été enregistrée.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left max-w-xs mx-auto text-xs font-bold space-y-2 text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-[10px] uppercase">Montant</span>
                    <span className="text-slate-800 font-black">${parseFloat(withdrawAmount).toFixed(2)}</span>
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
                    <span>TRX-{Math.floor(200000 + Math.random() * 800000)}</span>
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