import React from 'react';
import { CheckCircle2, Circle, Loader2, AlertTriangle, Cloud } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EDITOR_UX_NS } from '../../../i18n/editorUx';
import { editorSectionAnchor } from '../../../utils/profileSectionCompletion';

const scrollToSection = (id) => {
  const el = document.getElementById(editorSectionAnchor(id));
  if (!el) return;
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
};

/** Badge d'enregistrement automatique, toujours visible (aria-live poli). */
export function AutoSaveBadge({ status }) {
  const { t } = useTranslation(EDITOR_UX_NS);
  const map = {
    idle: { text: t('overview.autosaveIdle'), Icon: Cloud, cls: 'text-white/70' },
    pending: { text: t('overview.autosavePending'), Icon: Loader2, cls: 'text-white/80' },
    saving: { text: t('overview.autosaveSaving'), Icon: Loader2, cls: 'text-white/90', spin: true },
    saved: { text: t('overview.autosaveSaved'), Icon: CheckCircle2, cls: 'text-emerald-300' },
    error: { text: t('overview.autosaveError'), Icon: AlertTriangle, cls: 'text-amber-300' },
  };
  const { text, Icon, cls, spin } = map[status] || map.idle;
  return (
    <p role="status" aria-live="polite" className={`flex items-center gap-1.5 text-xs font-medium ${cls}`}>
      <Icon className={`h-4 w-4 shrink-0 ${spin ? 'animate-spin' : ''}`} aria-hidden="true" />
      {text}
    </p>
  );
}

/**
 * Tableau de bord de l'éditeur : progression globale, une puce par section (lien d'ancrage),
 * prochaine étape et état de l'enregistrement automatique.
 */
export default function EditorOverview({ sections, overall, autoSaveStatus }) {
  const { t } = useTranslation(EDITOR_UX_NS);
  const nextLabel = overall.firstIncomplete ? t(`sections.${overall.firstIncomplete}`) : null;
  return (
    <div className="mb-8 overflow-hidden rounded-2xl bg-[#0C1C2E] text-white shadow-lg">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-lg font-extrabold sm:text-xl">{t('overview.title')}</h3>
            <p className="mt-1 text-sm text-white/75">{t('overview.subtitle')}</p>
          </div>
          <div className="shrink-0 sm:text-right">
            <p className="text-sm font-bold">{t('overview.progress', { done: overall.done, total: overall.total })}</p>
            <div
              className="mt-2 h-2 w-full rounded-full bg-white/15 sm:w-52"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={overall.percent}
              aria-label={t('overview.progress', { done: overall.done, total: overall.total })}
            >
              <div
                className="h-2 rounded-full bg-gradient-to-r from-harx-500 to-harx-alt-500 transition-all duration-500"
                style={{ width: `${overall.percent}%` }}
              />
            </div>
          </div>
        </div>
        <ul className="mt-4 flex flex-wrap gap-2">
          {sections.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => scrollToSection(s.id)}
                aria-label={t('overview.goTo', { section: t(`sections.${s.id}`) })}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                  s.complete
                    ? 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/40 hover:bg-emerald-400/25'
                    : 'bg-white/10 text-white ring-white/25 hover:bg-white/20'
                }`}
              >
                {s.complete ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <Circle className="h-3.5 w-3.5" aria-hidden="true" />}
                {t(`sections.${s.id}`)}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-white/90">
            {nextLabel ? t('overview.next', { section: nextLabel }) : t('overview.allDone')}
          </p>
          <AutoSaveBadge status={autoSaveStatus} />
        </div>
      </div>
    </div>
  );
}
