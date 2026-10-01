import { useCallback, useEffect, useState } from 'react';
import { CreditCard, ArrowLeft, Loader, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast, Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { getAgentPlan, getAgentData, refreshOnboardingStatus } from '../../services/apiConfig';
import config from '../../config';
import progressService from '../../services/progressService';
import { EmbeddedRepSubscriptionFlow } from '../dashboard/EmbeddedRepSubscriptionFlow';
import { localizeRepPlan } from '../../utils/repPlanI18n';

function Subscription() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPlanId, setCurrentPlanId] = useState<string | undefined>();
  const [activePlanName, setActivePlanName] = useState<string | undefined>();
  const [phase4Completed, setPhase4Completed] = useState(false);
  const [justActivated, setJustActivated] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [agentId, setAgentId] = useState<string | undefined>();
  const [customerEmail, setCustomerEmail] = useState<string | undefined>();

  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        const userData = config.getUserData();
        if (!userData.agentId) {
          setError('Profil représentant introuvable. Reconnectez-vous.');
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
          const agentData = await getAgentData();
          const phase4Status =
            agentData?.onboardingProgress?.phases?.phase4?.status;
          setPhase4Completed(phase4Status === 'completed');
        } catch {
          /* optional — button still shown if plan exists */
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
        setError('Impossible de charger les formules d’abonnement.');
      } finally {
        setLoading(false);
      }
    };

    void initialize();
  }, [t]);

  const handlePlanSubscribed = useCallback(
    (plan?: { _id: string; name: string; description?: string; features?: string[]; stripePriceId?: string }) => {
      if (plan) {
        setCurrentPlanId(String(plan._id));
        const localized = localizeRepPlan(plan, t).name;
        setActivePlanName(localized);
        toast.success(t('subscriptionFlow.planActivated', { name: localized }));
      } else {
        toast.success(t('subscriptionFlow.subscriptionActive'));
      }
      setJustActivated(true);
    },
    [t]
  );

  const handleContinueOnboarding = useCallback(async () => {
    const userData = config.getUserData();
    if (!userData.agentId) return;

    setContinuing(true);
    try {
      await refreshOnboardingStatus(userData.agentId);
      await progressService.updatePhaseStatus(4, 'completed');
      navigate('/orchestrator');
    } catch (err) {
      console.error('Post-subscription onboarding update failed:', err);
      navigate('/orchestrator');
    } finally {
      setContinuing(false);
    }
  }, [navigate]);

  const canContinueOnboarding = Boolean(currentPlanId) && !phase4Completed;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-harx-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Toaster position="top-right" />

      <button
        type="button"
        onClick={() => navigate('/orchestrator')}
        className="mb-4 flex items-center text-slate-600 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="mr-2 h-5 w-5" />
        {t('subscriptionFlow.backToOnboarding')}
      </button>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-harx-50 text-harx-500">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">
              {t('subscriptionFlow.choosePlan')}
            </h2>
            {activePlanName && (
              <p className="mt-1 text-sm font-bold text-green-600">
                {t('subscriptionFlow.yourPlan')} : {activePlanName}
              </p>
            )}
          </div>
        </div>

        {canContinueOnboarding && (
          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
              <p className="text-sm font-bold text-green-800">
                {justActivated && activePlanName
                  ? t('subscriptionFlow.planJustActivated', { name: activePlanName })
                  : activePlanName
                    ? t('subscriptionFlow.planActiveBanner', { name: activePlanName })
                    : t('subscriptionFlow.planActiveBanner', { name: '' })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleContinueOnboarding()}
              disabled={continuing}
              className="shrink-0 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-green-700 disabled:opacity-60"
            >
              {continuing ? t('subscriptionFlow.updating') : t('subscriptionFlow.continueOnboarding')}
            </button>
          </div>
        )}

        <EmbeddedRepSubscriptionFlow
          agentId={agentId}
          customerEmail={customerEmail}
          currentPlanId={currentPlanId}
          onSubscribed={handlePlanSubscribed}
        />
      </div>
    </div>
  );
}

export default Subscription;
