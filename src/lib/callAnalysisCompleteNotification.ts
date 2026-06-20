import toast from 'react-hot-toast';
import { Brain } from 'lucide-react';
import { createElement } from 'react';
import type { EscrowMessage } from './escrowSocket';

export const CALL_ANALYSIS_COMPLETE_EVENT = 'harx:call-analysis-complete';

export type CallAnalysisCompleteDetail = EscrowMessage & {
  openModal?: boolean;
};

export function dispatchCallAnalysisCompleteEvent(data: CallAnalysisCompleteDetail) {
  window.dispatchEvent(new CustomEvent(CALL_ANALYSIS_COMPLETE_EVENT, { detail: data }));
}

export function showCallAnalysisCompleteToast(data: EscrowMessage) {
  const callId = data.callId ? String(data.callId) : '';
  if (!callId) return;

  const leadName = data.leadName ? String(data.leadName) : 'client';
  const isError = data.ai_call_status === 'error';
  const isApproved = data.validByAI === true;

  const title = isError
    ? 'Analyse terminée — erreur'
    : isApproved
      ? 'Analyse terminée — appel validé'
      : 'Analyse terminée';

  const message = isError
    ? `L'analyse de l'appel avec ${leadName} a échoué. Vous pouvez relancer depuis le détail.`
    : `L'analyse de l'appel avec ${leadName} est prête.`;

  toast(
    (toastData) =>
      createElement(
        'div',
        { className: 'flex items-start gap-3' },
        createElement(Brain, { className: 'w-5 h-5 text-harx-600 shrink-0' }),
        createElement(
          'div',
          null,
          createElement('p', { className: 'font-bold text-sm' }, title),
          createElement('p', { className: 'text-xs mt-1 opacity-90' }, message),
          createElement(
            'button',
            {
              type: 'button',
              className: 'mt-2 text-xs font-black uppercase tracking-widest text-harx-600',
              onClick: () => {
                toast.dismiss(toastData.id);
                dispatchCallAnalysisCompleteEvent({ ...data, openModal: true });
              },
            },
            "Voir l'analyse"
          )
        )
      ),
    { duration: 10000, icon: null }
  );
}

export function handleCallAnalysisCompleteMessage(data: EscrowMessage) {
  if (data?.type !== 'call_analysis_complete') return false;
  showCallAnalysisCompleteToast(data);
  dispatchCallAnalysisCompleteEvent(data);
  return true;
}
