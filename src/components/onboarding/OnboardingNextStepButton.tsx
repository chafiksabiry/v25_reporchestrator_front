import { useState } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, Sparkles, CheckCircle2, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  onClick: () => void;
  /** Title shown in the small success banner (e.g. the next phase name). */
  title?: string;
  /** Hint line shown under the banner title. */
  hint?: string;
  disabled?: boolean;
}

/**
 * Floating "Next step" guide button, mirroring the company orchestrator.
 * Rendered into document.body via a portal so it stays viewport-fixed
 * regardless of any overflow / transform on ancestors.
 */
export function OnboardingNextStepButton({
  onClick,
  title,
  hint,
  disabled = false,
}: Props) {
  const { i18n } = useTranslation();
  const isFr = (i18n.language || "en").slice(0, 2) === "fr";
  const label = isFr ? "Étape suivante" : "Next step";
  const bannerTitle = title || (isFr ? "Continuez votre onboarding" : "Continue your onboarding");
  const bannerHint = hint || (isFr ? "Passez à l’étape suivante" : "Move on to the next step");
  const [alertDismissed, setAlertDismissed] = useState(false);

  const content = (
    <div
      style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 9999 }}
      aria-live="polite"
      className="pointer-events-none"
    >
      <div className="onboarding-next-step-card pointer-events-auto flex flex-col items-end gap-2">
        {/* Guide banner */}
        {!alertDismissed && (
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200/60 bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 px-4 py-2.5 shadow-lg shadow-emerald-500/15 backdrop-blur-md">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-green-500 shadow-md shadow-emerald-500/30">
              <CheckCircle2 size={14} strokeWidth={2.5} className="text-white" />
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] font-black uppercase tracking-widest text-emerald-700">
                {bannerTitle}
              </span>
              <span className="text-[12px] font-semibold text-emerald-800/80">
                {bannerHint}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAlertDismissed(true)}
              aria-label={isFr ? "Fermer" : "Close"}
              className="ml-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-emerald-400 transition-colors hover:bg-emerald-100 hover:text-emerald-700"
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* Next Step button */}
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          title={label}
          className={`onboarding-next-step group relative inline-flex items-center gap-2.5 overflow-hidden rounded-xl px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_8px_32px_rgba(16,185,129,0.50)] ring-1 ring-white/40 transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/80 ${
            disabled
              ? "cursor-not-allowed opacity-55 saturate-50"
              : "hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(16,185,129,0.70)] active:scale-[0.98]"
          }`}
        >
          <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500" />
          <span className="absolute inset-0 bg-gradient-to-r from-teal-500 via-emerald-400 to-green-600 opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-disabled:opacity-0" />
          <span className="onboarding-next-step-shine pointer-events-none absolute inset-y-0 left-0 w-1/2 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          <span className="onboarding-next-step-ping pointer-events-none absolute -inset-1 rounded-xl bg-emerald-400/35" />

          <span className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 shadow-inner backdrop-blur-sm">
            <Sparkles
              size={14}
              className="text-white drop-shadow-sm transition-transform duration-300 group-hover:rotate-12 group-disabled:rotate-0"
              strokeWidth={2.5}
            />
          </span>
          <span className="relative">{label}</span>
          <ChevronRight
            size={17}
            strokeWidth={3}
            className="relative transition-transform duration-300 group-hover:translate-x-1 group-disabled:translate-x-0"
          />
        </button>
      </div>

      <style>{`
        @keyframes onboardingNextStepCardIn {
          0%  { opacity: 0; transform: translateY(12px) scale(0.96); }
          100%{ opacity: 1; transform: translateY(0)    scale(1);    }
        }
        .onboarding-next-step-card {
          animation: onboardingNextStepCardIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        @keyframes onboardingNextStepShine {
          0%   { transform: translateX(-120%); }
          100% { transform: translateX(220%);  }
        }
        @keyframes onboardingNextStepPing {
          0%   { opacity: 0.5; transform: scale(0.95); }
          100% { opacity: 0;   transform: scale(1.4);  }
        }
        .onboarding-next-step-shine {
          animation: onboardingNextStepShine 3s ease-in-out infinite;
        }
        .onboarding-next-step-ping {
          animation: onboardingNextStepPing 2.4s ease-out infinite;
        }
        .onboarding-next-step:hover .onboarding-next-step-shine {
          animation-duration: 1.4s;
        }
        .onboarding-next-step:disabled .onboarding-next-step-shine,
        .onboarding-next-step:disabled .onboarding-next-step-ping {
          animation: none;
          opacity: 0;
        }
      `}</style>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}

export default OnboardingNextStepButton;
