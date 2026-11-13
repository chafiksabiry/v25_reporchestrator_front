import { useCallback, useEffect, useState } from 'react';
import { CreditCard, ArrowLeft, Loader, CheckCircle2, Rocket, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast, Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { getAgentPlan, getAgentData, refreshOnboardingStatus } from '../../services/apiConfig';
import config from '../../config';
import progressService from '../../services/progressService';
import { EmbeddedRepSubscriptionFlow } from '../dashboard/EmbeddedRepSubscriptionFlow';
import { localizeRepPlan } from '../../utils/repPlanI18n';
import { fetchProfileFromAPI, updateProfileData } from '../../utils/profileUtils';
import { getRepOnboardingStep, isRepProfilePublished } from '../../utils/repOnboardingNextStep';
import { isRepTourDone, repTourUrl } from './RepProductTour';
import { OnboardingSatisfactionModal, clearSatisfactionPending, isSatisfactionPending, markSatisfactionPending } from './OnboardingSatisfactionModal';

function Subscription() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { t: tx } = useTranslation('repsx');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPlanId, setCurrentPlanId] = useState<string | undefined>();
  const [activePlanName, setActivePlanName] = useState<string | undefined>();
  const [finalizing, setFinalizing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showSatisfaction, setShowSatisfaction] = useState(false);
  const [agentId, setAgentId] = useState<string | undefined>();
  const [customerEmail, setCustomerEmail] = useState<string | undefined>();

  /** After plan choice: complete phase 4, then ask the rep to publish (no auto-nav). */
  const finalizeAfterPlan = useCallback(
    async (planName?: string) => {
      const userData = config.getUserData();
      if (!userData.agentId) return;

      setFinalizing(true);
      try {
        await refreshOnboardingStatus(userData.agentId);
        await progressService.updatePhaseStatus(4, 'completed');

        toast.success(
          planName
            ? t('subscriptionFlow.planActivated', { name: planName })
            : t('subscriptionFlow.subscriptionActive')
        );
        if (planName) setActivePlanName(planName);
        setShowPublishModal(true);
      } catch (err) {
        console.error('Post-subscription finalize failed:', err);
        toast.error(t('profile.errors.publish'));
      } finally {
        setFinalizing(false);
      }
    },
    [t]
  );

  const handlePublishProfile = useCallback(async () => {
    setPublishing(true);
    // Posé avant la publication : le profil publié déclenche une redirection vers /marketplace qui ferait disparaître la fenêtre.
    markSatisfactionPending();
    try {
      const profile = await fetchProfileFromAPI();
      if (profile?._id && !isRepProfilePublished(profile)) {
        await updateProfileData(profile._id, { status: 'completed' });
      }
      toast.success(t('subscriptionFlow.publishSuccess'));
      setShowPublishModal(false);
      setShowSatisfaction(true);
    } catch (err) {
      console.error('Profile publish failed:', err);
      clearSatisfactionPending();
      toast.error(t('profile.errors.publish'));
    } finally {
      setPublishing(false);
    }
  }, [t]);

  const handleSatisfactionClose = useCallback(() => {
    clearSatisfactionPending();
    setShowSatisfaction(false);
    void fetchProfileFromAPI()
      .catch(() => null)
      .finally(() => {
        // Fin d'onboarding : on lance la visite guidée de l'espace (une seule fois).
        navigate(isRepTourDone() ? '/marketplace' : repTourUrl(0), { replace: true });
      });
  }, [navigate]);

  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        const userData = config.getUserData();
        if (!userData.agentId) {
          setError(t('subscriptionFlow.errors.profileNotFound'));
          return;
        }

        setAgentId(userData.agentId);
        setCustomerEmail(String(userData.email || '').trim() || undefined);

        const planData = await getAgentPlan(userData.agentId);
        if (planData?.plan?._id) {
          setCurrentPlanId(String(planData.plan._id));
          if (planData.plan.name) {
            setActivePlanName(localizeRepPlan(planData.plan, t).name);
          }
        }

        try {
          const [agentData, profile] = await Promise.all([
            getAgentData().catch(() => null),
            fetchProfileFromAPI().catch(() => null),
          ]);
          const live = profile || agentData;
          if (isRepProfilePublished(live) && isSatisfactionPending()) {
            // Rechargement pendant la fenêtre de satisfaction : on la réaffiche au lieu de renvoyer le rep vers /marketplace.
            setShowSatisfaction(true);
            return;
          }
          if (isRepProfilePublished(live)) {
            navigate('/marketplace', { replace: true });
            return;
          }
          if (live) {
            const next = getRepOnboardingStep(live);
            // Reconnect with plan already chosen but profile not published → publish popup.
            if (
              next.path === '/subscription' &&
              (planData?.plan?._id || live?.plan)
            ) {
              const name = planData?.plan?.name
                ? localizeRepPlan(planData.plan, t).name
                : undefined;
              await finalizeAfterPlan(name);
              return;
            }
            // Only bounce back if phase 2 is incomplete — user may open /subscription
            // from the profile confirm step to choose a plan (next.path === '/profile').
            if (next.path === '/profile-import' || next.path === '/profile-editor') {
              navigate(next.path, { replace: true });
              return;
            }
          }
        } catch {
          /* optional */
        }

        const userProgress = await progressService.getUserProgress();
        if (
          !userProgress.completedPhaseIds.includes(4) &&
          userProgress.inProgressPhaseId !== 4
        ) {
          await progressService.updatePhaseStatus(4, 'in-progress');
        }
      } catch (err) {
        console.error('Subscription onboarding init failed:', err);
        setError(t('subscriptionFlow.errors.plansLoad'));
      } finally {
        setLoading(false);
      }
    };

    void initialize();
  }, [navigate, t, finalizeAfterPlan]);

  const goBack = useCallback(() => navigate('/profile-editor', { state: { allowBack: true } }), [navigate]);

  const handlePlanSubscribed = useCallback(
    (plan?: { _id: string; name: string; description?: string; features?: string[]; stripePriceId?: string }) => {
      if (plan) {
        setCurrentPlanId(String(plan._id));
        const localized = localizeRepPlan(plan, t).name;
        setActivePlanName(localized);
        void finalizeAfterPlan(localized);
      } else {
        void finalizeAfterPlan();
      }
    },
    [finalizeAfterPlan, t]
  );

  if (loading || finalizing) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader className="h-8 w-8 animate-spin text-harx-500" />
        {finalizing && (
          <p className="text-sm font-bold text-slate-500">
            {t('subscriptionFlow.finalizing')}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Toaster position="top-right" />

      {error && (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-700"
          >
            {t('repJourney.errors.retry')}
          </button>
        </div>
      )}

      <div>
        <div className="relative mb-2 overflow-hidden rounded-2xl bg-gradient-to-r from-[#0C1C2E] to-[#1b3a5c] px-4 py-2.5 text-white">
          <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-[#F90080]/25 blur-2xl" />
          <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={goBack}
                aria-label={tx('plan.backAria')}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-black text-[#0C1C2E] shadow-md transition hover:bg-pink-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/50 active:scale-95"
              >
                <ArrowLeft className="h-4 w-4 text-[#F90080]" strokeWidth={3} aria-hidden="true" />
                {t('subscriptionFlow.backToOnboarding')}
              </button>
              {activePlanName && (
                <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-2.5 py-1 text-xs font-black text-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('subscriptionFlow.yourPlan')} : {activePlanName}
                </p>
              )}
            </div>

            {/* Rassurance : ce qui se passe après le choix (reflète le flux réel) */}
            <div aria-label={tx('plan.afterTitle')} role="group" className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
                {tx('plan.afterTitle')}
              </p>
              <ol className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                {[1, 2, 3].map((n) => (
                  <li key={n} className="flex items-center gap-1.5 whitespace-nowrap text-xs font-bold" title={tx(`plan.after${n}Body`)}>
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white ${n === 1 ? 'bg-emerald-500' : n === 2 ? 'bg-sky-500' : 'bg-[#F90080]'}`} aria-hidden="true">
                      {n}
                    </span>
                    {tx(`plan.afterShort${n}`)}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        <EmbeddedRepSubscriptionFlow
          agentId={agentId}
          customerEmail={customerEmail}
          currentPlanId={currentPlanId}
          onSubscribed={handlePlanSubscribed}
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={goBack}
            aria-label={tx('plan.backAria')}
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#0C1C2E]/15 bg-white px-3 py-1.5 text-xs font-black text-[#0C1C2E] transition hover:border-[#F90080]/50 hover:bg-pink-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#F90080]/25"
          >
            <ArrowLeft className="h-4 w-4 text-[#F90080]" strokeWidth={3} aria-hidden="true" />
            {t('subscriptionFlow.backToOnboarding')}
          </button>
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
            {tx('plan.securePayment')}
          </p>
        </div>
      </div>

      {showPublishModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="publish-profile-title"
            className="relative w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-harx text-white shadow-lg shadow-harx-500/25">
              <Rocket className="h-6 w-6" />
            </div>
            <h2
              id="publish-profile-title"
              className="text-lg font-black tracking-tight text-slate-900"
            >
              {t('profile.header.publishReady')}
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-500 leading-relaxed">
              {activePlanName
                ? t('subscriptionFlow.planActiveBanner', { name: activePlanName })
                : t('subscriptionFlow.onboardingCompletePublish')}
            </p>
            <button
              type="button"
              onClick={() => void handlePublishProfile()}
              disabled={publishing}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-harx px-5 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-harx-500/20 transition hover:opacity-90 disabled:opacity-60"
            >
              {publishing ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  {t('profile.header.publishing')}
                </>
              ) : (
                t('subscriptionFlow.publish')
              )}
            </button>
          </div>
        </div>
      )}

      <OnboardingSatisfactionModal
        open={showSatisfaction}
        onClose={handleSatisfactionClose}
      />
    </div>
  );
}

export default Subscription;
