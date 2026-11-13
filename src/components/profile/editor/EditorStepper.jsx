import React, { useRef } from 'react';
import { CheckCircle2, Circle, Loader2, AlertTriangle, Cloud } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EDITOR_UX_NS } from '../../../i18n/editorUx';

export const editorTabId = (id) => `editor-tab-${id}`;
export const editorPanelId = (id) => `editor-panel-${id}`;

/** Badge d'enregistrement automatique, toujours visible (aria-live poli). Version courte en petit écran. */
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
    <p role="status" aria-live="polite" title={text} className={`flex min-w-0 items-center gap-1.5 text-xs font-medium ${cls}`}>
      <Icon className={`h-4 w-4 shrink-0 ${spin ? 'animate-spin' : ''}`} aria-hidden="true" />
      <span className="truncate">{text}</span>
    </p>
  );
}

/**
 * Bandeau de navigation de l'éditeur : titre, progression, enregistrement automatique et
 * onglets (une seule section affichée à la fois). Occupe une hauteur fixe et faible.
 * Clavier : flèches gauche/droite, Début/Fin (motif WAI-ARIA « tabs »).
 */
export default function EditorStepper({ title, tabs, overall, activeId, onSelect, autoSaveStatus }) {
  const { t } = useTranslation(EDITOR_UX_NS);
  const listRef = useRef(null);

  const onKeyDown = (e) => {
    const i = tabs.findIndex((x) => x.id === activeId);
    let next = i;
    if (e.key === 'ArrowRight') next = Math.min(tabs.length - 1, i + 1);
    else if (e.key === 'ArrowLeft') next = Math.max(0, i - 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    else return;
    e.preventDefault();
    onSelect(tabs[next].id);
    requestAnimationFrame(() => listRef.current?.querySelector(`#${editorTabId(tabs[next].id)}`)?.focus());
  };

  return (
    <div className="shrink-0 bg-[#0C1C2E] px-4 py-2.5 text-white sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-extrabold sm:text-lg">{title}</h2>
          <p className="text-xs text-white/70">
            {t('overview.progress', { done: overall.done, total: overall.total })}
          </p>
        </div>
        <div className="flex w-1/2 min-w-0 flex-col items-end gap-1.5 sm:w-auto sm:max-w-[22rem]">
          <AutoSaveBadge status={autoSaveStatus} />
          <div
            className="h-1.5 w-full min-w-[7rem] rounded-full bg-white/15"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={overall.percent}
            aria-label={t('overview.progress', { done: overall.done, total: overall.total })}
          >
            <div className="h-1.5 rounded-full bg-gradient-to-r from-harx-500 to-harx-alt-500 transition-all duration-500" style={{ width: `${overall.percent}%` }} />
          </div>
        </div>
      </div>
      <div
        ref={listRef}
        role="tablist"
        aria-label={t('tabs.listLabel')}
        onKeyDown={onKeyDown}
        className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1"
      >
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          const Icon = tab.complete ? CheckCircle2 : Circle;
          return (
            <button
              key={tab.id}
              id={editorTabId(tab.id)}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={editorPanelId(tab.id)}
              tabIndex={active ? 0 : -1}
              onClick={() => onSelect(tab.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                active
                  ? 'bg-white text-[#0C1C2E] ring-white'
                  : tab.complete
                    ? 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/40 hover:bg-emerald-400/25'
                    : 'bg-white/10 text-white ring-white/25 hover:bg-white/20'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${active && tab.complete ? 'text-emerald-600' : ''}`} aria-hidden="true" />
              {t(`tabs.${tab.id}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
