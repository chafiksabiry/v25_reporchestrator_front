import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from '@stripe/react-stripe-js';
import { X, ShieldCheck, Check, Loader2 } from 'lucide-react';
import {
  getRepresentativePlans,
  getRepStripeConfig,
  updateProfilePlan,
} from '../../utils/profileUtils';
import { profileApi } from '../../utils/client';

interface ApiPlan {
  _id: string;
  name: string;
  price: number;
  currency: string;
  stripePriceId?: string;
  description?: string;
  features?: string[];
}

interface Props {
  agentId?: string;
  customerEmail?: string;
  currentPlanId?: string;
  onSubscribed?: () => void;
}

const FALLBACK_PUBLIC_KEY =
  'pk_live_51TCj3DPJXYVCMk8pTo20zxqkRKZSes7sCY6TJjSYdXqNEjCSvrsbtprRhy52KoggYnNpiJi0se31LuahqFLqN9Ex00kbTYXVSK';

function formatPrice(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: (currency || 'EUR').toUpperCase(),
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency?.toUpperCase() || 'EUR'}`;
  }
}

function isFreePlan(plan: ApiPlan): boolean {
  return !plan.stripePriceId || plan.price <= 0;
}

export function EmbeddedRepSubscriptionFlow({
  agentId,
  customerEmail,
  currentPlanId,
  onSubscribed,
}: Props) {
  const [plans, setPlans] = useState<ApiPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState(
    import.meta.env.VITE_STRIPE_REP_PUBLISHABLE_KEY || FALLBACK_PUBLIC_KEY
  );
  const [activePlanId, setActivePlanId] = useState(currentPlanId || '');

  const [selectedPlan, setSelectedPlan] = useState<ApiPlan | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [initLoading, setInitLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [activatingFreePlanId, setActivatingFreePlanId] = useState<string | null>(null);

  const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey]);

  useEffect(() => {
    setActivePlanId(currentPlanId || '');
  }, [currentPlanId]);

  useEffect(() => {
    let cancelled = false;
    void getRepStripeConfig()
      .then((cfg) => {
        if (cancelled) return;
        const key = cfg?.stripe?.publishableKey;
        if (key) setPublishableKey(key);
      })
      .catch(() => {
        /* env fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingPlans(true);
    getRepresentativePlans()
      .then((data) => {
        if (cancelled) return;
        setPlans(Array.isArray(data) ? data : []);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPlansError(err instanceof Error ? err.message : 'Impossible de charger les formules');
      })
      .finally(() => {
        if (!cancelled) setLoadingPlans(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const closeModal = useCallback(() => {
    if (confirming) return;
    setSelectedPlan(null);
    setClientSecret(null);
    setSessionId(null);
    setInitError(null);
    setCompleted(false);
  }, [confirming]);

  useEffect(() => {
    if (typeof document === 'undefined' || !selectedPlan) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [selectedPlan, closeModal]);

  const activateFreePlan = useCallback(
    async (plan: ApiPlan) => {
      if (!agentId) {
        setInitError('Profil représentant introuvable — rechargez la page.');
        return;
      }
      setActivatingFreePlanId(plan._id);
      setInitError(null);
      try {
        await updateProfilePlan(agentId, plan._id);
        setActivePlanId(plan._id);
        onSubscribed?.();
      } catch (err: unknown) {
        const message =
          (err as { message?: string })?.message ||
          (err instanceof Error ? err.message : 'Activation du plan gratuite impossible');
        setInitError(message);
      } finally {
        setActivatingFreePlanId(null);
      }
    },
    [agentId, onSubscribed]
  );

  const openPaidCheckout = useCallback(
    async (plan: ApiPlan) => {
      if (!agentId) {
        setInitError('Profil représentant introuvable — rechargez la page.');
        return;
      }
      if (!plan.stripePriceId) {
        setInitError('Ce plan payant n’a pas de prix Stripe configuré.');
        return;
      }

      setSelectedPlan(plan);
      setClientSecret(null);
      setSessionId(null);
      setInitError(null);
      setCompleted(false);
      setInitLoading(true);

      try {
        const { data } = await profileApi.initRepSubscriptionCheckout({
          agentId,
          priceId: plan.stripePriceId,
          planId: plan._id,
          customerEmail: customerEmail?.trim() || undefined,
        });

        if (!data?.clientSecret) {
          throw new Error('clientSecret manquant côté serveur');
        }

        setClientSecret(data.clientSecret);
        setSessionId(data.sessionId);
      } catch (err: unknown) {
        const axiosErr = err as {
          response?: { data?: { message?: string; error?: string } };
          message?: string;
        };
        const message =
          axiosErr?.response?.data?.message ||
          axiosErr?.response?.data?.error ||
          (err instanceof Error ? err.message : 'Impossible d’initialiser le paiement');
        setInitError(message);
      } finally {
        setInitLoading(false);
      }
    },
    [agentId, customerEmail]
  );

  const handlePlanAction = useCallback(
    async (plan: ApiPlan) => {
      if (String(activePlanId) === String(plan._id)) return;
      if (isFreePlan(plan)) {
        await activateFreePlan(plan);
        return;
      }
      await openPaidCheckout(plan);
    },
    [activePlanId, activateFreePlan, openPaidCheckout]
  );

  const handleStripeComplete = useCallback(async () => {
    if (!sessionId) {
      setInitError('Session Stripe introuvable — confirmation impossible.');
      return;
    }
    setConfirming(true);
    try {
      await profileApi.confirmRepSubscriptionCheckout({ sessionId });
      setCompleted(true);
      if (selectedPlan) {
        setActivePlanId(selectedPlan._id);
      }
      onSubscribed?.();
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { message?: string; error?: string } };
        message?: string;
      };
      const message =
        axiosErr?.response?.data?.message ||
        axiosErr?.response?.data?.error ||
        (err instanceof Error ? err.message : 'Confirmation de l’abonnement impossible');
      setInitError(message);
    } finally {
      setConfirming(false);
    }
  }, [sessionId, onSubscribed, selectedPlan]);

  if (loadingPlans) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Loader2 className="h-8 w-8 animate-spin text-harx-500" />
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
          Chargement des formules…
        </p>
      </div>
    );
  }

  if (plansError) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-red-600">
        <p className="text-sm font-bold">{plansError}</p>
      </div>
    );
  }

  if (!plans.length) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6 text-slate-600">
        <p className="text-sm font-bold">Aucune formule disponible pour le moment.</p>
      </div>
    );
  }

  return (
    <div>
      {initError && !selectedPlan && (
        <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-red-600">
          <p className="text-sm font-bold">{initError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {plans.map((plan) => {
          const isCurrent = String(activePlanId) === String(plan._id);
          const isPaid = !isFreePlan(plan);
          const isBusy =
            (initLoading && selectedPlan?._id === plan._id) ||
            activatingFreePlanId === plan._id;

          return (
            <div
              key={plan._id}
              className={`relative flex flex-col rounded-3xl border bg-white p-6 shadow-sm transition-all duration-300 ${
                isCurrent
                  ? 'scale-[1.02] border-green-500 shadow-md ring-2 ring-green-500/40'
                  : 'border-slate-100 hover:-translate-y-1 hover:shadow-lg'
              }`}
            >
              {isCurrent && (
                <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-green-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow">
                  <Check className="h-3 w-3" strokeWidth={3} /> Votre formule
                </span>
              )}

              <h3 className="text-xl font-black tracking-tight text-slate-900">{plan.name}</h3>
              {plan.description && (
                <p className="mt-1 text-xs font-medium text-slate-500">{plan.description}</p>
              )}

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-black tracking-tight text-slate-900">
                  {formatPrice(plan.price, plan.currency)}
                </span>
                <span className="text-xs font-bold text-slate-400">/ mois</span>
              </div>

              {isPaid && (
                <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-harx-600">
                  7 jours d&apos;essai gratuit
                </p>
              )}

              {Array.isArray(plan.features) && plan.features.length > 0 && (
                <ul className="mt-4 flex-1 space-y-2">
                  {plan.features.map((feat, i) => (
                    <li
                      key={`${plan._id}-feat-${i}`}
                      className="flex items-start gap-2 text-xs font-medium text-slate-700"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-harx-500" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                onClick={() => void handlePlanAction(plan)}
                disabled={isCurrent || isBusy}
                className={`mt-6 w-full rounded-xl px-4 py-2.5 text-sm font-black tracking-tight transition-all duration-300 ${
                  isCurrent
                    ? 'cursor-default border-2 border-green-200 bg-green-50 text-green-700'
                    : 'bg-harx-500 text-white shadow hover:bg-harx-600'
                } disabled:cursor-default disabled:opacity-100`}
              >
                {isCurrent
                  ? 'Formule actuelle'
                  : isBusy
                    ? 'Chargement…'
                    : isPaid
                      ? 'Démarrer l’essai'
                      : 'S’abonner'}
              </button>
            </div>
          );
        })}
      </div>

      {selectedPlan &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[2147483000] flex animate-fade-in items-start justify-center overflow-y-auto bg-[#0a0b14]/80 backdrop-blur-md"
            style={{ padding: 'clamp(8px, 4vh, 32px) 16px' }}
            onClick={closeModal}
          >
            <div
              className="relative my-auto flex w-full max-w-2xl flex-col rounded-3xl border border-white/10 bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-3xl border-b border-slate-100 bg-white px-6 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-harx-50 text-harx-500 shadow-inner">
                    <ShieldCheck size={22} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-black tracking-tight text-slate-900">
                      Paiement sécurisé
                    </h2>
                    <p className="truncate text-xs font-bold text-slate-500">
                      {selectedPlan.name} — {formatPrice(selectedPlan.price, selectedPlan.currency)} / mois
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={confirming}
                  className="ml-3 shrink-0 rounded-xl bg-slate-50 p-2 text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Fermer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="px-4 py-4">
                {initError && (
                  <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-red-600">
                    <p className="text-sm font-bold">{initError}</p>
                  </div>
                )}

                {!clientSecret && !initError && !completed && (
                  <div className="flex h-64 flex-col items-center justify-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-harx-500" />
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                      Initialisation Stripe…
                    </p>
                  </div>
                )}

                {clientSecret && !completed && (
                  <div className="stripe-embedded-wrapper">
                    <EmbeddedCheckoutProvider
                      stripe={stripePromise}
                      options={{ clientSecret, onComplete: handleStripeComplete }}
                    >
                      <EmbeddedCheckout />
                    </EmbeddedCheckoutProvider>
                  </div>
                )}

                {confirming && (
                  <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-center text-[11px] font-bold text-blue-800/80">
                    Finalisation de votre abonnement…
                  </div>
                )}

                {completed && (
                  <div className="flex flex-col items-center gap-4 p-8 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
                      <Check className="h-7 w-7" strokeWidth={3} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black tracking-tight text-slate-900">
                        Abonnement actif
                      </h3>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        Vous êtes abonné à {selectedPlan.name}.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="mt-2 rounded-xl bg-harx-500 px-6 py-2.5 text-sm font-black tracking-tight text-white shadow transition-all duration-200 hover:bg-harx-600"
                    >
                      Continuer
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
