import React from 'react';
import { CheckCircle2, Circle, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import '../../../i18n/editorUx';
import { EDITOR_UX_NS } from '../../../i18n/editorUx';
import { editorSectionAnchor, SUMMARY_MIN_CHARS } from '../../../utils/profileSectionCompletion';

/** Pastille de complétion d'une section : icône + texte (jamais la couleur seule). */
export function CompletionPill({ completion }) {
  const { t } = useTranslation(EDITOR_UX_NS);
  if (!completion) return null;
  const { complete, done, total } = completion;
  const label = complete ? t('pill.complete') : done === 0 ? t('pill.todo') : t('pill.partial', { done, total });
  const tone = complete
    ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
    : done === 0
      ? 'bg-slate-100 text-slate-700 ring-slate-200'
      : 'bg-amber-50 text-amber-900 ring-amber-200';
  const Icon = complete ? CheckCircle2 : Circle;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tone}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

/**
 * Carte de section : bandeau d'accent HARX, titre, pastille de complétion, aide
 * contextuelle repliable (clavier + lecteur d'écran) et zone de contrôles (Modifier / Annuler…).
 * Ne porte aucune logique de sauvegarde : elle enveloppe le contenu existant.
 */
export default function EditorSectionCard({
  id,
  title,
  subtitle,
  help,
  completion,
  controls,
  children,
  actions,
  className = '',
}) {
  const { t } = useTranslation(EDITOR_UX_NS);
  const titleId = `${editorSectionAnchor(id)}-title`;
  return (
    <section
      id={editorSectionAnchor(id)}
      aria-labelledby={titleId}
      className={`scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      <div className="h-1 bg-gradient-to-r from-harx-500 via-harx-alt-500 to-harx-600" aria-hidden="true" />
      <div className="p-5 sm:p-6">
        <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 id={titleId} className="text-lg font-bold text-[#0C1C2E] sm:text-xl">
                {title}
              </h3>
              <CompletionPill completion={completion} />
            </div>
            {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {actions}
            {controls}
          </div>
        </header>
        {completion && !completion.complete ? (
          <p className="mb-4 text-sm font-medium text-amber-900">
            {t('missingPrefix', {
              list: completion.missing.map((m) => t(`missing.${m}`, { min: SUMMARY_MIN_CHARS })).join(', '),
            })}
          </p>
        ) : null}
        {help ? (
          <details className="group mb-4 rounded-xl border border-harx-100 bg-harx-50/60 px-4 py-2.5 text-sm text-slate-700">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded font-semibold text-harx-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-harx-500">
              <HelpCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t('help.open')}
            </summary>
            <p className="mt-2 leading-relaxed">{help}</p>
          </details>
        ) : null}
        {children}
      </div>
    </section>
  );
}
