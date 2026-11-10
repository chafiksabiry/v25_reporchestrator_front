import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Lightbulb, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isSatisfactionPending } from './OnboardingSatisfactionModal';

const SEEN_KEY = 'harx_rep_hints_seen';
const OFF_KEY = 'harx_rep_hints_off';

interface Hint {
  id: string;
  selector: string;
  /** Default French copy (also stored in the locale files under repHints.<id>). */
  text: string;
}

/** Contextual tips per screen, shown one at a time, once each. */
const HINTS: Record<string, Hint[]> = {
  '/dashboard': [
    { id: 'dash-marketplace', selector: '[data-tour="nav-marketplace"]', text: 'Commencez ici : parcourez les gigs et demandez votre inscription.' },
    { id: 'dash-wallet', selector: '[data-tour="topbar-wallet"]', text: 'Vos gains s’affichent ici dès qu’un appel est validé.' },
    { id: 'dash-help', selector: '[data-tour="help-button"]', text: 'Un doute ? Ce bouton « ? » vous explique l’écran en deux minutes.' },
  ],
  '/marketplace': [
    { id: 'mkt-heart', selector: '[data-hint="gig-heart"]', text: 'Touchez le cœur pour mettre un gig de côté et le comparer plus tard.' },
    { id: 'mkt-favorites', selector: '[data-hint="tab-favorite"]', text: 'Retrouvez ici tous les gigs que vous avez mis en favori.' },
    { id: 'mkt-requested', selector: '[data-hint="tab-requested"]', text: 'Vos demandes d’inscription en attente de réponse de l’entreprise sont ici.' },
  ],
};

function readSeen(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}
function writeSeen(ids: string[]) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(ids));
  } catch {
    /* storage unavailable */
  }
}
function hintsOff(): boolean {
  try {
    return localStorage.getItem(OFF_KEY) === '1';
  } catch {
    return false;
  }
}

interface Box { top: number; left: number; width: number; height: number }

function visibleBox(el: HTMLElement): Box | null {
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  if (r.right <= 0 || r.bottom <= 0 || r.left >= window.innerWidth || r.top >= window.innerHeight) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/**
 * Animated speech bubbles that point at the real controls of the current screen and explain,
 * in one sentence, what they are for. One at a time, never twice, never during the guided tour.
 */
export function RepHintBubbles() {
  const { pathname, search } = useLocation();
  const { t } = useTranslation();
  const route = pathname.replace(/\/+$/, '') || '/';
  const tourActive = new URLSearchParams(search).get('tour') === '1';
  const hints = useMemo(() => HINTS[route === '/' ? '/dashboard' : route] ?? [], [route]);
  const [seen, setSeen] = useState<string[]>(readSeen);
  const [armed, setArmed] = useState(false);
  const [current, setCurrent] = useState<{ hint: Hint; box: Box } | null>(null);

  // Let the screen settle before the first bubble appears.
  useEffect(() => {
    setArmed(false);
    if (!hints.length || tourActive) return;
    const timer = window.setTimeout(() => setArmed(true), 1600);
    return () => window.clearTimeout(timer);
  }, [route, hints, tourActive]);

  const pending = useMemo(() => hints.filter((h) => !seen.includes(h.id)), [hints, seen]);

  // Pick the first pending hint whose target is on screen, and follow its position.
  useLayoutEffect(() => {
    setCurrent(null);
    if (!armed || tourActive || hintsOff() || !pending.length) return;
    let stop = false;
    const measure = () => {
      if (stop) return;
      if (isSatisfactionPending()) return setCurrent(null);
      for (const hint of pending) {
        const el = document.querySelector(hint.selector) as HTMLElement | null;
        const box = el ? visibleBox(el) : null;
        if (box) {
          setCurrent((c) =>
            c && c.hint.id === hint.id && Math.abs(c.box.top - box.top) < 1 && Math.abs(c.box.left - box.left) < 1 ? c : { hint, box },
          );
          return;
        }
      }
      setCurrent(null);
    };
    measure();
    const timer = window.setInterval(measure, 400);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [armed, tourActive, pending]);

  const dismiss = useCallback((id: string, all = false) => {
    if (all) {
      try { localStorage.setItem(OFF_KEY, '1'); } catch { /* ignore */ }
    }
    setCurrent(null);
    setSeen((prev) => {
      const next = prev.includes(id) ? prev : [...prev, id];
      writeSeen(next);
      return next;
    });
  }, []);

  if (!current) return null;
  const { hint, box } = current;
  const w = Math.min(280, window.innerWidth - 24);
  const below = box.top + box.height + 14 + 130 < window.innerHeight;
  const toRight = box.left + box.width + 14 + w < window.innerWidth && box.left + box.width / 2 < 200;
  const cx = box.left + box.width / 2;
  const style: React.CSSProperties = toRight
    ? { width: w, left: box.left + box.width + 14, top: Math.max(12, box.top + box.height / 2 - 40) }
    : {
        width: w,
        left: Math.min(Math.max(12, cx - w / 2), window.innerWidth - w - 12),
        ...(below ? { top: box.top + box.height + 14 } : { bottom: window.innerHeight - box.top + 14 }),
      };
  const arrowLeft = toRight ? undefined : Math.min(Math.max(18, cx - (style.left as number) - 7), w - 32);

  return (
    <div className="pointer-events-none fixed inset-0 z-[65]" data-testid="rep-hint" aria-live="polite">
      {/* Pulsing beacon on the target */}
      <span
        className="fixed rounded-full"
        style={{ top: box.top + box.height / 2 - 14, left: box.left + box.width / 2 - 14, width: 28, height: 28 }}
      >
        <span className="harx-hint-ping absolute inset-0 rounded-full bg-amber-300/70" />
        <span className="absolute inset-[9px] rounded-full bg-amber-300 shadow-[0_0_0_3px_rgba(255,255,255,0.9)]" />
      </span>
      <div className="harx-hint-bubble pointer-events-auto fixed" style={style} role="status">
        <div className="harx-hint-bubble-inner relative rounded-2xl bg-white p-3.5 shadow-2xl ring-1 ring-black/5">
          {!toRight && (
            <span
              className="absolute h-3.5 w-3.5 rotate-45 bg-white ring-1 ring-black/5"
              style={{ left: arrowLeft, ...(below ? { top: -7 } : { bottom: -7 }) }}
            />
          )}
          {toRight && <span className="absolute -left-[7px] top-9 h-3.5 w-3.5 rotate-45 bg-white ring-1 ring-black/5" />}
          <div className="relative flex items-start gap-2.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-harx text-white">
              <Lightbulb className="h-4 w-4" />
            </span>
            <p className="flex-1 text-[13px] font-semibold leading-snug text-slate-700">{t(`repHints.${hint.id}`, hint.text)}</p>
            <button type="button" aria-label={t('repHints.close', 'Fermer')} onClick={() => dismiss(hint.id)} className="-mr-1 -mt-1 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="relative mt-2.5 flex items-center justify-between">
            <button type="button" onClick={() => dismiss(hint.id, true)} className="text-[11px] font-bold text-slate-400 hover:text-slate-600">
              {t('repHints.off', 'Ne plus afficher les astuces')}
            </button>
            <button type="button" onClick={() => dismiss(hint.id)} className="rounded-lg bg-gradient-harx px-3 py-1.5 text-[11px] font-black text-white shadow active:scale-95">
              {t('repHints.ok', 'Compris')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
