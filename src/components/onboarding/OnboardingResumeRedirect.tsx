import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader } from 'lucide-react';
import { fetchProfileFromAPI } from '../../utils/profileUtils';
import { getRepOnboardingStep } from '../../utils/repOnboardingNextStep';

/**
 * Never show the old orchestrator hub. Always resume the concrete current step
 * (import CV → profile-editor → subscription → dashboard/marketplace).
 */
export default function OnboardingResumeRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const profile = await fetchProfileFromAPI();
        if (cancelled) return;
        const next = getRepOnboardingStep(profile);
        let path = next.path || '/profile-import';
        if (path === '/orchestrator' || path.startsWith('/orchestrator/')) {
          path = path === '/orchestrator/subscription' ? '/subscription' : '/profile-import';
        }
        navigate(path, { replace: true });
      } catch (err) {
        console.error('Onboarding resume redirect failed:', err);
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
