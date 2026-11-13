import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Calendar,
  Check,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  Monitor,
  Rocket,
  Sparkles,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import mascotte from '../../assets/mascotte2.png';

/** Set once the rep has finished (or dismissed) the product tour. */
export const REP_TOUR_DONE_KEY = 'harx_rep_product_tour_done';
const TOUR_PARAM = 'tour';
const STEP_PARAM = 'step';

export function isRepTourDone(): boolean {
  try {
    return localStorage.getItem(REP_TOUR_DONE_KEY) === '1';
  } catch {
    return false;
  }
}

function setRepTourDone(done: boolean) {
  try {
    if (done) localStorage.setItem(REP_TOUR_DONE_KEY, '1');
    else localStorage.removeItem(REP_TOUR_DONE_KEY);
  } catch {
    /* storage unavailable */
  }
}

export interface RepTourStep {
  id: string;
  /** Screen the step lives on (the tour navigates there). */
  path: string;
  /** Element to spotlight; when absent or off-screen the card is centered. */
  selector?: string;
  icon: LucideIcon;
  /** Short, concrete action the rep can do right after this step. */
  hasTip?: boolean;
}

export const REP_TOUR_STEPS: RepTourStep[] = [
  { id: 'welcome', path: '/dashboard', icon: Sparkles },
  { id: 'dashboard', path: '/dashboard', selector: '[data-tour="nav-dashboard"]', icon: LayoutDashboard },
  { id: 'marketplace', path: '/marketplace', selector: '[data-tour="nav-marketplace"]', icon: Briefcase, hasTip: true },
  { id: 'training', path: '/training', selector: '[data-tour="nav-training"]', icon: GraduationCap, hasTip: true },
  { id: 'workspace', path: '/workspace', selector: '[data-tour="nav-workspace"]', icon: Monitor, hasTip: true },
  { id: 'planning', path: '/session-planning', selector: '[data-tour="nav-session-planning"]', icon: Calendar, hasTip: true },
  { id: 'wallet', path: '/wallet', selector: '[data-tour="topbar-wallet"]', icon: Wallet },
  { id: 'help', path: '/dashboard', selector: '[data-tour="help-button"]', icon: HelpCircle },
];

/** Where to send a rep to start the tour (used after the satisfaction popup and from the launcher). */
export function repTourUrl(step = 0): string {
  const s = REP_TOUR_STEPS[Math.min(Math.max(step, 0), REP_TOUR_STEPS.length - 1)];
  return `${s.path}?${TOUR_PARAM}=1&${STEP_PARAM}=${step}`;
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** True when the element is actually visible inside the viewport (sidebar is off-screen on mobile). */
function visibleBox(el: HTMLElement): Box | null {
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  if (r.right <= 0 || r.bottom <= 0 || r.left >= window.innerWidth || r.top >= window.innerHeight) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/**
 * Guided product tour shown at the end of onboarding: spotlights the real menu entries, one at a time,
 * and explains what each one is for. State lives in the URL (`?tour=1&step=n`) so a reload or a screen
 * change keeps the tour going.
 */
export function RepProductTour() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const { t } = useTranslation();
  const active = params.get(TOUR_PARAM) === '1';
  const rawStep = Number(params.get(STEP_PARAM) ?? 0);
  const index = Number.isFinite(rawStep) ? Math.max(0, rawStep) : 0;
  const total = REP_TOUR_STEPS.length;
  const finished = active && index >= total;
  const step = active && index < total ? REP_TOUR_STEPS[index] : null;
  const [box, setBox] = useState<Box | null>(null);

  const clean = useMemo(() => {
    const next = new URLSearchParams(search);
    next.delete(TOUR_PARAM);
    next.delete(STEP_PARAM);
    const qs = next.toString();
    return `${pathname}${qs ? `?${qs}` : ''}`;
  }, [pathname, search]);

  // Follow the step's screen.
  useEffect(() => {
    if (!step) return;
    if (pathname.replace(/\/+$/, '') !== step.path) navigate(repTourUrl(index), { replace: true });
  }, [step, index, pathname, navigate]);

  // Locate the element (it may mount late) and track its position.
  useLayoutEffect(() => {
    setBox(null);
    if (!step?.selector) return;
    let stop = false;
    let scrolled = false;
    const measure = () => {
      if (stop) return;
      const el = document.querySelector(step.selector!) as HTMLElement | null;
      if (!el) return setBox(null);
      if (!scrolled) {
        scrolled = true;
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
      const next = visibleBox(el);
      setBox((b) =>
        b && next && Math.abs(b.top - next.top) < 1 && Math.abs(b.left - next.left) < 1 && Math.abs(b.width - next.width) < 1 && Math.abs(b.height - next.height) < 1
          ? b
          : next,
      );
    };
    measure();
    const timer = window.setInterval(measure, 250);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [step, pathname]);

  if (!active) return null;

  const quit = () => {
    setRepTourDone(true);
    navigate(clean, { replace: true });
  };
  const go = (n: number) => navigate(repTourUrl(n), { replace: true });

  if (finished) {
    const missions: { path: string; label: string; icon: LucideIcon }[] = [
      { path: '/marketplace', label: t('repTour.finish.m1', 'Choisir mon premier gig'), icon: Briefcase },
      { path: '/training', label: t('repTour.finish.m2', 'Démarrer ma première formation'), icon: GraduationCap },
      { path: '/session-planning', label: t('repTour.finish.m3', 'Planifier ma première session'), icon: Calendar },
    ];
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" data-testid="rep-tour-done">
        <div role="dialog" aria-label={t('repTour.finish.title', 'Vous êtes prêt !')} className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white text-slate-900 shadow-2xl">
          <div className="bg-gradient-harx px-6 pb-6 pt-7 text-center text-white">
            <img src={mascotte} alt="" aria-hidden="true" className="mx-auto mb-2 h-20 w-auto" />
            <h2 className="text-2xl font-black">{t('repTour.finish.title', 'Vous êtes prêt !')}</h2>
            <p className="mt-1 text-sm font-medium text-white/90">{t('repTour.finish.text', 'Vous savez où tout se trouve. Passez à l’action avec une première mission :')}</p>
          </div>
          <div className="space-y-2 p-5">
            {missions.map((m, i) => (
              <button
                key={m.path}
                type="button"
                onClick={() => {
                  setRepTourDone(true);
                  navigate(m.path, { replace: true });
                }}
                className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-harx-400 hover:bg-white hover:shadow-md"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-harx text-white">
                  <m.icon className="h-4.5 w-4.5" />
                </span>
                <span className="flex-1 text-sm font-black">{m.label}</span>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{i + 1}/3</span>
                <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-harx-500" />
              </button>
            ))}
            <button type="button" onClick={quit} className="w-full pt-2 text-center text-xs font-bold text-slate-500 hover:text-slate-700">
              {t('repTour.finish.later', 'Je m’en occupe plus tard')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!step) return null;

  const Icon = step.icon;
  const isWelcome = step.id === 'welcome';
  const title = t(`repTour.steps.${step.id}.title`, STEP_DEFAULTS[step.id].title);
  const text = t(`repTour.steps.${step.id}.text`, STEP_DEFAULTS[step.id].text);
  const tip = step.hasTip ? t(`repTour.steps.${step.id}.tip`, STEP_DEFAULTS[step.id].tip ?? '') : '';

  const cardW = Math.min(390, window.innerWidth - 24);
  const centered = !box || isWelcome;
  const cardStyle: React.CSSProperties = (() => {
    if (centered) return { left: Math.max(12, (window.innerWidth - cardW) / 2), top: '50%', transform: 'translateY(-50%)', width: cardW };
    // Menu entries sit on the left: put the card to their right; top-bar items: below them.
    const right = box.left + box.width + 18;
    if (right + cardW < window.innerWidth && box.left < window.innerWidth / 2) {
      return { width: cardW, left: right, top: Math.min(Math.max(12, box.top - 8), window.innerHeight - 300) };
    }
    return { width: cardW, left: Math.min(Math.max(12, box.left + box.width - cardW), window.innerWidth - cardW - 12), top: box.top + box.height + 16 };
  })();

  return (
    <div className="fixed inset-0 z-[70]" data-testid="rep-tour" aria-live="polite">
      {box && !isWelcome ? (
        <div
          className="pointer-events-none fixed rounded-2xl ring-2 ring-amber-300 transition-all duration-300"
          style={{ top: box.top - 6, left: box.left - 6, width: box.width + 12, height: box.height + 12, boxShadow: '0 0 0 9999px rgba(2,6,23,0.72), 0 0 28px 4px rgba(251,191,36,0.55)' }}
        />
      ) : (
        <div className="pointer-events-none fixed inset-0 bg-slate-950/70 backdrop-blur-[2px]" />
      )}
      <div role="dialog" aria-label={title} className="fixed overflow-hidden rounded-3xl bg-white text-slate-900 shadow-2xl ring-1 ring-black/5" style={cardStyle}>
        <div className="flex items-center gap-3 bg-gradient-harx px-4 py-3 text-white">
          {isWelcome ? (
            <img src={mascotte} alt="" aria-hidden="true" className="h-12 w-auto" />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/20">
              <Icon className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/80">
              {t('repTour.stepOf', { defaultValue: 'Visite guidée · {{n}} sur {{total}}', n: index + 1, total })}
            </p>
            <h2 className="text-base font-black leading-tight">{title}</h2>
          </div>
          <button type="button" aria-label={t('repTour.quit', 'Quitter la visite')} onClick={quit} className="rounded-lg p-1.5 text-white/85 hover:bg-white/15">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 px-4 pb-4 pt-3">
          <p className="text-sm font-medium leading-relaxed text-slate-600">{text}</p>
          {tip ? (
            <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold leading-snug text-amber-900 ring-1 ring-amber-200">
              <Rocket className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{tip}</span>
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1" aria-hidden="true">
              {REP_TOUR_STEPS.map((s, i) => (
                <span key={s.id} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-harx-500' : i < index ? 'w-1.5 bg-harx-300' : 'w-1.5 bg-slate-200'}`} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {index > 0 ? (
                <button type="button" onClick={() => go(index - 1)} className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-100">
                  <ArrowLeft className="h-3.5 w-3.5" /> {t('repTour.prev', 'Précédent')}
                </button>
              ) : null}
              <button type="button" onClick={() => go(index + 1)} className="inline-flex items-center gap-1 rounded-xl bg-gradient-harx px-4 py-2 text-xs font-black text-white shadow-md transition hover:brightness-110 active:scale-95">
                {isWelcome ? t('repTour.start', 'C’est parti') : index + 1 === total ? t('repTour.done', 'Terminer') : t('repTour.next', 'Suivant')}
                {index + 1 === total ? <Check className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Small pill that (re)starts the tour; hidden once the rep has completed it. */
export function RepTourLauncher({ className = '' }: { className?: string }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [done, setDone] = useState(isRepTourDone());
  useEffect(() => {
    const id = window.setInterval(() => setDone(isRepTourDone()), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (done) return null;
  return (
    <button
      type="button"
      onClick={() => navigate(repTourUrl(0))}
      className={`flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-black text-harx-600 shadow-lg shadow-black/20 ring-1 ring-harx-200 transition hover:scale-105 active:scale-95 ${className}`}
    >
      <Sparkles className="h-4 w-4" />
      {t('repTour.launch', 'Visite guidée')}
    </button>
  );
}

export { setRepTourDone };

const STEP_DEFAULTS: Record<string, { title: string; text: string; tip?: string }> = {
  welcome: {
    title: 'Bienvenue chez HARX !',
    text: 'Votre profil est publié : votre espace est ouvert. En moins de deux minutes, découvrez à quoi sert chaque rubrique et comment décrocher votre première mission.',
  },
  dashboard: {
    title: 'Votre tableau de bord',
    text: 'Votre point de départ : vos indicateurs, votre progression et les prochaines actions à mener. Revenez-y chaque jour pour savoir quoi faire en priorité.',
  },
  marketplace: {
    title: 'La marketplace des gigs',
    text: 'Ici, les entreprises clientes publient leurs missions. Parcourez-les, ouvrez le détail, mettez vos préférés en favori puis demandez votre inscription.',
    tip: 'Essayez : ajoutez 2 ou 3 gigs en favori pour les comparer tranquillement.',
  },
  training: {
    title: 'Formation et certifications',
    text: 'Des parcours courts pour monter en compétence et décrocher des certifications. Plus vous êtes formé, plus les entreprises vous choisissent.',
    tip: 'Commencez par le premier module : il se termine en quelques minutes.',
  },
  workspace: {
    title: 'Votre poste de travail',
    text: 'C’est là que vous travaillez : vos leads, vos appels, l’historique et le copilote qui vous souffle les bonnes réponses en direct.',
    tip: 'Une fois inscrit à un gig, vos leads apparaissent ici.',
  },
  planning: {
    title: 'Votre planning',
    text: 'Réservez vos sessions de travail et gardez la main sur vos disponibilités : les entreprises savent ainsi quand compter sur vous.',
    tip: 'Planifiez dès maintenant votre première session.',
  },
  wallet: {
    title: 'Votre portefeuille',
    text: 'Vos commissions s’y accumulent après chaque appel validé. Suivez votre solde disponible, vos gains en attente et vos retraits.',
  },
  help: {
    title: 'Besoin d’aide ? Le bouton « ? »',
    text: 'Sur chaque écran important, ce bouton vous explique en deux minutes comment l’utiliser. Vous pouvez aussi relancer cette visite à tout moment.',
  },
};
