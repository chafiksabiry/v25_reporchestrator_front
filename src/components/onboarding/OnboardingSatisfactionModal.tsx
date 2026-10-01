import { useState } from 'react';
import { Star, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const ONBOARDING_SATISFACTION_KEY = 'harx_onboarding_satisfaction_done';

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * Optional post-onboarding feedback when the rep first reaches the marketplace.
 * Score and comment are optional; dismiss / skip is always allowed.
 */
export function OnboardingSatisfactionModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const persistAndClose = (payload?: { score: number | null; comment: string }) => {
    try {
      localStorage.setItem(
        ONBOARDING_SATISFACTION_KEY,
        JSON.stringify({
          done: true,
          at: new Date().toISOString(),
          score: payload?.score ?? null,
          comment: payload?.comment?.trim() || '',
        })
      );
    } catch {
      /* ignore quota / private mode */
    }
    onClose();
  };

  const handleSubmit = () => {
    setSubmitting(true);
    persistAndClose({ score, comment });
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-satisfaction-title"
        className="relative w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <button
          type="button"
          onClick={() => persistAndClose()}
          className="absolute right-3 top-3 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          aria-label={t('onboardingSatisfaction.close')}
        >
          <X className="h-4 w-4" />
        </button>

        <h2
          id="onboarding-satisfaction-title"
          className="pr-8 text-lg font-black tracking-tight text-slate-900"
        >
          {t('onboardingSatisfaction.title')}
        </h2>
        <p className="mt-1.5 text-sm font-medium text-slate-500 leading-relaxed">
          {t('onboardingSatisfaction.subtitle')}
        </p>

        <div className="mt-5 flex items-center justify-center gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = score !== null && n <= score;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setScore(n)}
                className="rounded-xl p-1.5 transition hover:scale-110 active:scale-95"
                aria-label={t('onboardingSatisfaction.starAria', { n })}
              >
                <Star
                  className={`h-8 w-8 ${
                    active ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                  }`}
                />
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-center text-[11px] font-bold uppercase tracking-widest text-slate-400">
          {t('onboardingSatisfaction.scoreOptional')}
        </p>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-slate-400">
            {t('onboardingSatisfaction.commentLabel')}
          </span>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder={t('onboardingSatisfaction.commentPlaceholder')}
            className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-harx-400 focus:outline-none focus:ring-2 focus:ring-harx-200"
          />
        </label>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => persistAndClose()}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            {t('onboardingSatisfaction.skip')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-xl bg-gradient-harx px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-harx-500/20 transition hover:opacity-90 disabled:opacity-60"
          >
            {t('onboardingSatisfaction.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
