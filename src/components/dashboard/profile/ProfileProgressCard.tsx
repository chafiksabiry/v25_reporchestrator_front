import React from 'react';
import { ArrowRight, Check, CircleDashed, Clock, HelpCircle, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getProfileNextAction } from '../../../utils/repProfileProgress';
import type { EditorChecklistId } from '../../../utils/repOnboardingProgress';

interface Props {
  profile: any;
  /** Appelé avec le chemin de l'étape suivante (/profile-editor ou /subscription). */
  onNavigate: (path: string) => void;
}

/**
 * Carte « Votre avancement » : où j'en suis, quoi faire maintenant, pourquoi, combien de temps,
 * et un bouton vers l'étape suivante. Remplace les anciens bandeaux d'onboarding du profil
 * sans changer les destinations (/profile-editor, /subscription).
 */
export const ProfileProgressCard: React.FC<Props> = ({ profile, onNavigate }) => {
  const { t } = useTranslation('repsx');
  const { t: tg } = useTranslation();
  const action = getProfileNextAction(profile);

  if (action.kind === 'done') return null;

  const ready = action.kind === 'choose-plan';
  const stepKey = ready ? 'plan' : 'editor';

  const itemLabel = (id: EditorChecklistId) => tg(`repJourney.checklist.items.${id}.label`);
  const itemHint = (id: EditorChecklistId) => tg(`repJourney.checklist.items.${id}.hint`);

  return (
    <section
      aria-label={t('profile.progress.regionLabel')}
      className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-lg shadow-slate-300/30 animate-in fade-in slide-in-from-top-2 duration-400"
    >
      {/* En-tête : état + barre de progression */}
      <div className="relative bg-[#0C1C2E] px-5 py-4 sm:px-6">
        <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-[#F90080]/20 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-widest ${
                ready ? 'bg-emerald-400/20 text-emerald-200' : 'bg-[#F90080]/20 text-pink-200'
              }`}
            >
              {ready ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <CircleDashed className="h-3.5 w-3.5" />}
              {ready ? t('profile.progress.stateReady') : t('profile.progress.stateIncomplete')}
            </span>
          </div>
          <p className="text-xs font-bold text-white/80">
            {t('profile.progress.count', { done: action.done, total: action.total })}
          </p>
        </div>
        <div
          className="relative mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/15"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={action.percent}
          aria-label={t('profile.progress.title')}
        >
          <div
            className="h-full rounded-full bg-gradient-harx transition-all duration-500"
            style={{ width: `${action.percent}%` }}
          />
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-8">
        {/* Prochaine étape : quoi, pourquoi, durée, bouton */}
        <div className="flex flex-col">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#F90080]">
            {t('profile.progress.nextStep')}
          </p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-[#0C1C2E]">
            {ready ? t('profile.progress.readyTitle') : tg(`repJourney.steps.${stepKey}.title`)}
          </h2>

          <dl className="mt-3 space-y-2.5 text-sm">
            <div>
              <dt className="text-[11px] font-black uppercase tracking-widest text-slate-400">{tg('repJourney.what')}</dt>
              <dd className="font-medium text-slate-700">
                {ready ? t('profile.progress.readyBody') : tg(`repJourney.steps.${stepKey}.what`)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-black uppercase tracking-widest text-slate-400">{tg('repJourney.why')}</dt>
              <dd className="font-medium text-slate-700">{tg(`repJourney.steps.${stepKey}.why`)}</dd>
            </div>
            {action.minutes > 0 && (
              <div>
                <dt className="text-[11px] font-black uppercase tracking-widest text-slate-400">{tg('repJourney.howLong')}</dt>
                <dd className="inline-flex items-center gap-1.5 font-bold text-slate-700">
                  <Clock className="h-3.5 w-3.5 text-[#F90080]" aria-hidden="true" />
                  {tg('repJourney.minutes', { count: action.minutes })}
                </dd>
              </div>
            )}
          </dl>

          <button
            type="button"
            onClick={() => onNavigate(action.path)}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-harx px-6 py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-harx-500/25 transition hover:opacity-90 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#F90080]/30 active:scale-[0.98] sm:w-auto sm:self-start"
          >
            {ready ? t('profile.progress.ctaPlan') : t('profile.progress.ctaComplete')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>

          <p className="mt-3 flex items-start gap-1.5 text-xs font-medium text-slate-500">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
            {t('profile.progress.saved')}
          </p>
        </div>

        {/* Éléments obligatoires */}
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
            {t('profile.progress.itemsTitle')}
          </p>
          <ul className="mt-2 space-y-2">
            {action.items.map((item) => {
              const isNext = !ready && item.id === action.nextItemId;
              return (
                <li
                  key={item.id}
                  className={`flex items-start gap-3 rounded-2xl border px-3.5 py-3 ${
                    item.done
                      ? 'border-emerald-100 bg-emerald-50/60'
                      : isNext
                        ? 'border-[#F90080]/40 bg-pink-50/60 ring-1 ring-[#F90080]/20'
                        : 'border-slate-100 bg-slate-50'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      item.done ? 'bg-emerald-500 text-white' : 'border-2 border-slate-300 bg-white text-transparent'
                    }`}
                    aria-hidden="true"
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <p className={`text-sm font-black ${item.done ? 'text-emerald-800' : 'text-[#0C1C2E]'}`}>
                        {itemLabel(item.id)}
                      </p>
                      <span
                        className={`text-[10px] font-black uppercase tracking-widest ${
                          item.done ? 'text-emerald-600' : isNext ? 'text-[#F90080]' : 'text-slate-400'
                        }`}
                      >
                        {item.done
                          ? t('profile.progress.itemDone')
                          : isNext
                            ? t('profile.progress.itemNext')
                            : t('profile.progress.itemTodo')}
                      </span>
                    </div>
                    {!item.done && (
                      <p className="mt-0.5 flex items-start gap-1 text-xs font-medium text-slate-600">
                        <HelpCircle className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
                        {itemHint(item.id)}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default ProfileProgressCard;
