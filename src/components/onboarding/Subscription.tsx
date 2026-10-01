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
import { fetchProfileFromAPI, updateProfileData } from '../../utils/profileUtils';
import { isRepProfilePublished } from '../../utils/repOnboardingNextStep';

function Subscription() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPlanId, setCurrentPlanId] = useState<string | undefined>();
  const [activePlanName, setActivePlanName] = useState<string | undefined>();
  const [finalizing, setFinalizing] = useState(false);
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
          const [agentData, profile] = await Promise.all([
            getAgentData().catch(() => null),
            fetchProfileFromAPI().catch(() => null),
          ]);
          if (isRepProfilePublished(agentData) || isRepProfilePublished(profile)) {
            navigate('/marketplace', { replace: true });
            return;
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
        setError('Impossible de charger les formules d’abonnement.');
      } finally {
        setLoading(false);
      }
    };

    void initialize();
  }, [navigate, t]);

  const finalizeAfterPlan = useCallback(
    async (planName?: string) => {
      const userData = config.getUserData();
      if (!userData.agentId) return;

      setFinalizing(true);
      try {
        await refreshOnboardingStatus(userData.agentId);
        await progressService.updatePhaseStatus(4, 'completed');

        // Defense in depth if backend auto-publish has not synced yet.
        const profile = await fetchProfileFromAPI();
        if (profile?._id && !isRepProfilePublished(profile)) {
          await updateProfileData(profile._id, { status: 'completed' });
        }

        toast.success(
          planName
            ? t('subscriptionFlow.planActivated', { name: planName })
            : t('subscriptionFlow.publishSuccess')
        );
        navigate('/marketplace', { replace: true });
      } catch (err) {
        console.error('Post-subscription auto-publish failed:', err);
        toast.error(t('profile.errors.publish'));
      } finally {
        setFinalizing(false);
      }
    },
    [navigate, t]
  );

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

      <button
        type="button"
        onClick={() => navigate('/profile-editor')}
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

        {currentPlanId && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600 mt-0.5" />
            <p className="text-sm font-bold text-green-800 leading-relaxed">
              {t('subscriptionFlow.autoPublishHint')}
            </p>
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
