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

/** App-relative path. The router basename is already `/reps`. */
export function callAnalysisHistoryPath(callId: string): string {
  return `/workspace?tab=calls&callId=${encodeURIComponent(callId)}`;
}

/**
 * Where a notification click should go.
 * Analysis notifications deep-link the call even when the stored path is the
 * old `/reps/workspace?tab=calls` (that prefix doubles the basename and the
 * catch-all sends the rep back to the dashboard).
 * Enrollment alerts open the related gig details page.
 */
export function resolveRepNotificationPath(n: {
  notificationKey?: string;
  actionPath?: string;
  gigId?: string;
  kind?: string;
  status?: string;
}): string | null {
  const fromKey = /^call-analysis-complete-(.+)$/.exec(String(n.notificationKey || ''));
  if (fromKey?.[1]) return callAnalysisHistoryPath(fromKey[1]);

  const gigId = String(n.gigId || '').trim();
  const isEnrollment =
    n.kind === 'enrollment' ||
    n.status === 'enrolled' ||
    n.status === 'rejected' ||
    n.status === 'invited' ||
    String(n.notificationKey || '').startsWith('enrollment-');

  if (n.status === 'invited' || String(n.notificationKey || '').includes('-invited')) {
    return '/marketplace?tab=invited';
  }

  if (isEnrollment && gigId) {
    return `/gig/${encodeURIComponent(gigId)}`;
  }

  const raw = String(n.actionPath || '').trim();
  if (!raw) {
    if (isEnrollment) return '/marketplace';
    return null;
  }
  if (raw === '/reps' || raw === '/reps/') return '/dashboard';
  if (raw === '/gigs' || raw.startsWith('/gigs?')) {
    return gigId ? `/gig/${encodeURIComponent(gigId)}` : '/marketplace';
  }
  if (raw.startsWith('/reps/')) return raw.slice('/reps'.length);
  // Stored path like `/gig/:id` or `/marketplace`
  if (raw.startsWith('/gig/') || raw.startsWith('/marketplace') || raw.startsWith('/workspace')) {
    return raw;
  }
  return raw;
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
