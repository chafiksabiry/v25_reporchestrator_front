import React from 'react';
import { Lightbulb } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EDITOR_UX_NS } from '../../../i18n/editorUx';

/**
 * État vide pédagogique : que mettre ici, pourquoi, un exemple concret, et comment agir.
 * `kind` ∈ experience | languages | summary | availability (clés editorUx.empty.<kind>).
 */
export default function EditorEmptyState({ kind, Icon, onAction, actionLabel }) {
  const { t } = useTranslation(EDITOR_UX_NS);
  const k = `empty.${kind}`;
  return (
    <div className="rounded-2xl border-2 border-dashed border-harx-200 bg-gradient-to-br from-harx-50/70 to-white p-5 sm:p-6">
      <div className="flex items-start gap-4">
        {Icon ? (
          <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-harx-500 to-harx-alt-500 text-white sm:flex">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-[#0C1C2E]">{t(`${k}.title`)}</p>
          <p className="mt-1 text-sm text-slate-700">{t(`${k}.what`)}</p>
          <p className="mt-1 text-sm text-slate-600">
            <span className="font-semibold text-slate-700">{t('empty.whyLabel')}</span> {t(`${k}.why`)}
          </p>
          <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-harx-700">
              <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
              {t('empty.exampleLabel')}
            </p>
            <p className="italic">{t(`${k}.example`)}</p>
          </div>
          {onAction ? (
            <button
              type="button"
              onClick={onAction}
              className="mt-4 rounded-xl bg-gradient-to-r from-harx-500 to-harx-alt-500 px-4 py-2 text-sm font-bold text-white shadow hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-harx-500 focus-visible:ring-offset-2"
            >
              {actionLabel}
            </button>
          ) : (
            <p className="mt-3 text-sm font-medium text-harx-700">{t(`${k}.ctaHint`)}</p>
          )}
        </div>
      </div>
    </div>
  );
}
