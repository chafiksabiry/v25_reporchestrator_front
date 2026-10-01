import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader } from 'lucide-react';
import { fetchProfileFromAPI } from '../../utils/profileUtils';
import { getRepOnboardingStep } from '../../utils/repOnboardingNextStep';

/**
 * The old phase-hub screen (INTÉGRATION / ONBOARDING REPS) is retired.
 * Any visit to `/orchestrator` resumes the concrete next onboarding step.
 */
export default function OrchestratorHubRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const profile = await fetchProfileFromAPI();
        if (cancelled) return;
        const next = getRepOnboardingStep(profile);
        const path =
          !next.path || next.path === '/orchestrator'
            ? '/profile-import'
            : next.path;
        navigate(path, { replace: true });
      } catch (err) {
        console.error('Orchestrator hub redirect failed:', err);
        if (!cancelled) {
          navigate('/profile-import', { replace: true });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="flex h-64 items-center justify-center text-slate-500">
      <Loader className="h-8 w-8 animate-spin text-harx-500" />
    </div>
  );
}
