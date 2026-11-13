import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from '@stripe/react-stripe-js';
import { X, ShieldCheck, Check, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  getRepresentativePlans,
  getRepStripeConfig,
  updateProfilePlan,
} from '../../utils/profileUtils';
import { profileApi } from '../../utils/client';
import { localizeRepPlan } from '../../utils/repPlanI18n';

interface ApiPlan {
  _id: string;
  name: string;
  price: number;
  currency?: string;
  stripePriceId?: string;
  description?: string;
  features?: string[];
}

interface Props {
  agentId?: string;
  customerEmail?: string;
  currentPlanId?: string;
  onSubscribed?: (plan?: ApiPlan) => void;
}

const FALLBACK_PUBLIC_KEY =
  'pk_live_51TCj3DPJXYVCMk8pTo20zxqkRKZSes7sCY6TJjSYdXqNEjCSvrsbtprRhy52KoggYnNpiJi0se31LuahqFLqN9Ex00kbTYXVSK';

function formatPrice(amount: number, currency: string | undefined, locale: string): string {
  const cur = (currency || 'EUR').toUpperCase();
  if (!Number.isFinite(amount)) return '—';
  const [whole, frac = '00'] = Number(amount).toFixed(2).split('.');
  const normalized = `${whole}.${frac}`;
  const intlLocale = locale.startsWith('fr') ? 'fr-FR' : 'en-US';
  try {
    return new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(normalized));
  } catch {
    return `${normalized} ${cur}`;
  }
}

function requiresStripeCheckout(plan: ApiPlan): boolean {
  return Boolean(plan.stripePriceId?.trim());
}

function isPaidPlan(plan: ApiPlan): boolean {
  return plan.price > 0;
}

export function EmbeddedRepSubscriptionFlow({
  agentId,
  customerEmail,
  currentPlanId,
  onSubscribed,
}: Props) {
  const { t, i18n } = useTranslation();
  const { t: tx } = useTranslation('repsx');
  const uiLang = (i18n.language || 'en').slice(0, 2) === 'fr' ? 'fr' : 'en';

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
        setPlansError(err instanceof Error ? err.message : t('subscriptionFlow.loadingPlans'));
      })
      .finally(() => {
        if (!cancelled) setLoadingPlans(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

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
        onSubscribed?.(plan);
      } catch (err: unknown) {
        const axiosErr = err as {
          response?: { data?: { message?: string; errors?: string[] } };
          message?: string;
        };
        const message =
          axiosErr?.response?.data?.errors?.[0] ||
          axiosErr?.response?.data?.message ||
          (err instanceof Error ? err.message : 'Activation du plan gratuite impossible');
        setInitError(message);
      } finally {
        setActivatingFreePlanId(null);
      }
    },
    [agentId, onSubscribed]
  );

  const openStripeCheckout = useCallback(
    async (plan: ApiPlan) => {
      if (!agentId) {
        setInitError('Profil représentant introuvable — rechargez la page.');
        return;
      }
      if (!plan.stripePriceId) {
        setInitError('Ce plan n’a pas de prix Stripe configuré.');
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
          locale: uiLang,
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
    [agentId, customerEmail, uiLang]
  );

  const handlePlanAction = useCallback(
    async (plan: ApiPlan) => {
      if (String(activePlanId) === String(plan._id)) return;
      if (plan.price <= 0) {
        await activateFreePlan(plan);
        return;
      }
      if (requiresStripeCheckout(plan)) {
        await openStripeCheckout(plan);
        return;
      }
      setInitError('Ce plan payant doit être configuré dans Stripe.');
    },
    [activePlanId, activateFreePlan, openStripeCheckout]
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
      onSubscribed?.(selectedPlan ?? undefined);
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
          {t('subscriptionFlow.loadingPlans')}
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
        <p className="text-sm font-bold">{t('subscriptionFlow.noPlans')}</p>
      </div>
    );
  }

  const selectedCopy = selectedPlan ? localizeRepPlan(selectedPlan, t) : null;

  return (
    <div>
      {initError && !selectedPlan && (
        <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-red-600">
          <p className="text-sm font-bold">{initError}</p>
        </div>
      )}

      <div
        role="list"
        aria-label={tx('plan.plansRegion')}
        className="grid grid-cols-1 gap-5 pt-3 md:grid-cols-2 xl:grid-cols-4"
      >
        {plans.map((plan) => {
          const isCurrent = String(activePlanId) === String(plan._id);
          const isPaid = isPaidPlan(plan);
          const isBusy =
            (initLoading && selectedPlan?._id === plan._id) ||
            activatingFreePlanId === plan._id;
          const copy = localizeRepPlan(plan, t);
          const actionLabel = isCurrent
            ? t('subscriptionFlow.currentPlan')
            : isBusy
              ? t('subscriptionFlow.updating')
              : isPaid
                ? t('subscriptionFlow.startTrial')
                : t('subscriptionFlow.subscribe');

          return (
            <div
              key={plan._id}
              role="listitem"
              aria-current={isCurrent ? 'true' : undefined}
              className={`relative flex flex-col rounded-3xl border-2 bg-white p-5 shadow-sm transition-all duration-300 sm:p-6 ${
                isCurrent
                  ? 'border-emerald-500 bg-emerald-50/30 shadow-lg ring-4 ring-emerald-500/15'
                  : 'border-slate-100 hover:-translate-y-1 hover:border-[#F90080]/40 hover:shadow-lg'
              }`}
            >
              {isCurrent && (
                <span className="absolute -top-3 left-5 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow">
                  <Check className="h-3 w-3" strokeWidth={3} /> {t('subscriptionFlow.yourPlan')}
                </span>
              )}

              {/* Identité + prix */}
              <div className="rounded-2xl bg-[#0C1C2E] px-4 py-4 text-white">
                <h3 className="text-base font-black uppercase leading-tight tracking-tight">{copy.name}</h3>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-1.5">
                  <span className="text-3xl font-black tracking-tight">
                    {isPaid ? formatPrice(plan.price, plan.currency, uiLang) : tx('plan.free')}
                  </span>
                  {isPaid && (
                    <span className="text-xs font-bold text-white/60">{t('subscriptionFlow.perMonth')}</span>
                  )}
                </div>
                {isPaid && (
                  <p className="mt-1.5 inline-flex rounded-full bg-[#F90080] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                    {t('subscriptionFlow.freeTrial')}
                  </p>
                )}
              </div>

              {copy.description && (
                <p className="mt-3 text-xs font-medium leading-relaxed text-slate-600">{copy.description}</p>
              )}

              {copy.features.length > 0 && (
                <div className="mt-4 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    {tx('plan.included')}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {copy.features.map((feat, i) => (
                      <li
                        key={`${plan._id}-feat-${i}`}
                        className={`flex items-start gap-2 text-xs leading-snug text-slate-700 ${
                          i === 0 ? 'font-black text-[#0C1C2E]' : 'font-medium'
                        }`}
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#F90080]" strokeWidth={3} aria-hidden="true" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                type="button"
                onClick={() => void handlePlanAction(plan)}
                disabled={isCurrent || isBusy}
                aria-label={
                  isCurrent
                    ? tx('plan.currentAria', { name: copy.name })
                    : tx('plan.chooseAria', { action: actionLabel, name: copy.name })
                }
                className={`mt-6 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black tracking-tight transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#F90080]/30 ${
                  isCurrent
                    ? 'cursor-default border-2 border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'bg-gradient-harx text-white shadow-md shadow-harx-500/20 hover:opacity-90 active:scale-[0.98]'
                } disabled:cursor-default disabled:opacity-100`}
              >
                {isBusy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {isCurrent && <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />}
                {actionLabel}
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
                      {t('subscriptionFlow.secureCheckout')}
                    </h2>
                    <p className="truncate text-xs font-bold text-slate-500">
                      {selectedCopy?.name || selectedPlan.name} —{' '}
                      {formatPrice(selectedPlan.price, selectedPlan.currency, uiLang)}{' '}
                      {t('subscriptionFlow.perMonth')}
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
                      {t('subscriptionFlow.initializingStripe')}
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
                    {t('subscriptionFlow.finalizing')}
                  </div>
                )}

                {completed && (
                  <div className="flex flex-col items-center gap-4 p-8 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
                      <Check className="h-7 w-7" strokeWidth={3} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black tracking-tight text-slate-900">
                        {t('subscriptionFlow.subscriptionActive')}
                      </h3>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {t('subscriptionFlow.subscribedTo', {
                          name: selectedCopy?.name || selectedPlan.name,
                        })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="mt-2 rounded-xl bg-harx-500 px-6 py-2.5 text-sm font-black tracking-tight text-white shadow transition-all duration-200 hover:bg-harx-600"
                    >
                      {t('subscriptionFlow.continueOnboarding')}
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
