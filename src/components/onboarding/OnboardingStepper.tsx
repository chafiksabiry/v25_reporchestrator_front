import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, ChevronDown, Circle, Clock, HelpCircle, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import mascotte from '../../assets/mascotte2.png';
import {
  canRevisitStep,
  getEditorChecklist,
  getEditorCompletion,
  getJourneyProgress,
  REP_JOURNEY_STEPS,
} from '../../utils/repOnboardingProgress';

const NIGHT = '#0C1C2E';
const MAGENTA = '#F90080';
const COLLAPSE_KEY = 'harx_rep_journey_guide_collapsed';

function readCollapsed(): boolean {
  try {
    const stored = localStorage.getItem(COLLAPSE_KEY);
    if (stored !== null) return stored === '1';
  } catch {
    /* stockage indisponible */
  }
  // Premier passage sur mobile : consigne repliée pour laisser la place au contenu.
  return typeof window !== 'undefined' && window.innerWidth < 640;
}

type Props = {
  userProfile: any;
  onOpenHelp?: () => void;
};

/**
 * Bandeau de parcours affiché en haut des 4 étapes d'accueil (import, éditeur, profil, plan) :
 * progression globale, consigne de l'étape (quoi / pourquoi / combien de temps),
 * checklist de ce qui reste à faire dans l'éditeur, retour possible sans perte.
 * Lecture seule : ne modifie ni le profil ni la logique des pages qu'il surmonte.
 */
export function OnboardingStepper({ userProfile, onOpenHelp }: Props) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const progress = getJourneyProgress(pathname);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      /* stockage indisponible */
    }
  }, [collapsed]);

  if (!progress) return null;
  const step = REP_JOURNEY_STEPS[progress.index];
  const id = step.id;
  const showChecklist = id === 'editor';
  const checklist = showChecklist ? getEditorChecklist(userProfile) : [];
  const completion = getEditorCompletion(checklist);
  const allDone = showChecklist && completion.done === completion.total;

  const goBack = (path: string) => navigate(path, { state: { allowBack: true } });

  return (
    <section
      aria-label={t('repJourney.regionLabel')}
      className="mb-5 overflow-hidden rounded-3xl text-white shadow-lg shadow-slate-900/10"
      style={{ background: `linear-gradient(135deg, ${NIGHT} 0%, #14304d 100%)` }}
    >
      <div className="px-5 pt-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
            {t('repJourney.stepOf', { current: progress.index + 1, total: progress.total })}
          </p>
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/80">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {t('repJourney.remaining', { count: progress.remainingMinutes })}
          </p>
        </div>

        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress.percent}
          aria-label={t('repJourney.progressLabel')}
          className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-white/15"
        >
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `${progress.percent}%`, background: `linear-gradient(90deg, #ff4d4d, ${MAGENTA})` }}
          />
        </div>

        <ol className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-1.5">
          {REP_JOURNEY_STEPS.map((s, i) => {
            const done = i < progress.index;
            const current = i === progress.index;
            const revisit = done && canRevisitStep(pathname, s.path);
            const label = t(`repJourney.steps.${s.id}.short`);
            const inner = (
              <>
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    current ? 'text-white' : done ? 'bg-emerald-400 text-slate-900' : 'bg-white/15 text-white/60'
                  }`}
                  style={current ? { backgroundColor: MAGENTA } : undefined}
                >
                  {done ? <Check className="h-3 w-3" aria-hidden="true" /> : i + 1}
                </span>
                <span className={`text-xs font-semibold ${current ? 'text-white' : done ? 'text-white/85' : 'text-white/55'}`}>
                  {label}
                </span>
              </>
            );
            return (
              <li key={s.id} className="flex items-center gap-1" aria-current={current ? 'step' : undefined}>
                {revisit ? (
                  <button
                    type="button"
                    onClick={() => goBack(s.path)}
                    title={t('repJourney.revisitHint')}
                    className="flex items-center gap-1.5 rounded-full px-1.5 py-0.5 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  >
                    {inner}
                  </button>
                ) : (
                  <span className="flex items-center gap-1.5 px-1.5 py-0.5">{inner}</span>
                )}
                {i < REP_JOURNEY_STEPS.length - 1 && <span className="mx-0.5 text-white/25" aria-hidden="true">›</span>}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mt-3 border-t border-white/10 bg-white/[0.04] px-5 py-3.5 sm:px-6">
        <div className="flex items-start gap-3">
          <img
            src={mascotte}
            alt=""
            aria-hidden="true"
            className="h-12 w-12 shrink-0 rounded-2xl bg-white/90 object-contain p-1 shadow-md"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-extrabold leading-snug text-white">{t(`repJourney.steps.${id}.title`)}</h2>
              <button
                type="button"
                onClick={() => setCollapsed((c) => !c)}
                aria-expanded={!collapsed}
                aria-controls="rep-journey-guide"
                className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-white/70 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                {collapsed ? t('repJourney.showGuide') : t('repJourney.hideGuide')}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${collapsed ? '' : 'rotate-180'}`} aria-hidden="true" />
              </button>
            </div>
            <p className="mt-0.5 text-sm font-medium text-white/85">{t(`repJourney.steps.${id}.cheer`)}</p>

            {!collapsed && (
              <div id="rep-journey-guide" className="mt-3 space-y-2.5">
                <dl className="grid gap-2 text-sm sm:grid-cols-3">
                  <div className="rounded-2xl bg-white/[0.08] px-3 py-2">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-white/60">{t('repJourney.what')}</dt>
                    <dd className="mt-0.5 font-medium text-white">{t(`repJourney.steps.${id}.what`)}</dd>
                  </div>
                  <div className="rounded-2xl bg-white/[0.08] px-3 py-2">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-white/60">{t('repJourney.why')}</dt>
                    <dd className="mt-0.5 font-medium text-white">{t(`repJourney.steps.${id}.why`)}</dd>
                  </div>
                  <div className="rounded-2xl bg-white/[0.08] px-3 py-2">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-white/60">{t('repJourney.howLong')}</dt>
                    <dd className="mt-0.5 font-medium text-white">
                      {t('repJourney.minutes', { count: progress.currentMinutes })}
                      <span className="block text-xs font-normal text-white/70">{t(`repJourney.steps.${id}.timeNote`)}</span>
                    </dd>
                  </div>
                </dl>

                {showChecklist && (
                  <div className="rounded-2xl bg-white/[0.08] px-3 py-2.5" aria-live="polite">
                    <p className="text-xs font-bold text-white">
                      {allDone
                        ? t('repJourney.checklist.allDone')
                        : t('repJourney.checklist.title', { left: completion.total - completion.done, done: completion.done, total: completion.total })}
                    </p>
                    <ul className="mt-1.5 grid gap-1 sm:grid-cols-2">
                      {checklist.map((item) => (
                        <li key={item.id} className="flex items-start gap-2 text-xs text-white/90">
                          {item.done ? (
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden="true" />
                          ) : (
                            <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/40" aria-hidden="true" />
                          )}
                          <span>
                            <span className="font-semibold">{t(`repJourney.checklist.items.${item.id}.label`)}</span>
                            {!item.done && (
                              <span className="block text-white/65">{t(`repJourney.checklist.items.${item.id}.hint`)}</span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/70">
                  <p className="inline-flex items-center gap-1.5">
                    <Save className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
                    {t(id === 'editor' ? 'repJourney.autosaveEditor' : 'repJourney.autosaveGeneric')}
                  </p>
                  {onOpenHelp && (
                    <button
                      type="button"
                      onClick={onOpenHelp}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1 font-semibold text-white/90 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                    >
                      <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('repJourney.needHelp')}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
