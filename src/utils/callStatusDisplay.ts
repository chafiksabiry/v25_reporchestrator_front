export interface StatusBadge {
  label: string;
  tone: string;
  title?: string;
}

export function callOutcomeBadge(outcome: string | null | undefined): StatusBadge | null {
  if (!outcome) return null;
  const map: Record<string, StatusBadge> = {
    transaction: { label: 'Transaction', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    appointment: { label: 'RDV', tone: 'bg-violet-50 text-violet-700 border-violet-200' },
    callback_requested: { label: 'Rappel', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
    argued_interested: { label: 'Argumenté', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    refusal: { label: 'Refus', tone: 'bg-rose-50 text-rose-700 border-rose-200' },
    not_interested: { label: 'Pas intéressé', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
    already_equipped: { label: 'Déjà équipé', tone: 'bg-blue-50 text-blue-700 border-blue-200' },
    voicemail: { label: 'Messagerie', tone: 'bg-slate-50 text-slate-600 border-slate-200' },
    no_answer: { label: 'Non décroché', tone: 'bg-slate-50 text-slate-600 border-slate-200' },
    busy: { label: 'Occupé', tone: 'bg-slate-50 text-slate-600 border-slate-200' },
    wrong_number: { label: 'Faux numéro', tone: 'bg-rose-50 text-rose-700 border-rose-200' },
    fraud: { label: 'Fraude', tone: 'bg-rose-100 text-rose-800 border-rose-300' },
    too_short: { label: 'Trop court', tone: 'bg-slate-50 text-slate-500 border-slate-200' },
    connected_no_sale: { label: 'Sans suite', tone: 'bg-slate-50 text-slate-600 border-slate-200' },
  };
  return map[outcome] || { label: outcome.replace(/_/g, ' '), tone: 'bg-slate-50 text-slate-600 border-slate-200' };
}

const PROSPECT_RUBRICS: Array<{ key: string; label: string; tone: string }> = [
  { key: 'RDV', label: 'RDV', tone: 'bg-violet-50 text-violet-700 border-violet-200' },
  { key: 'A plus tard', label: 'Rappel', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'PAS INTÉRESSÉS', label: 'Pas intéressé', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'PAS AU COURANT', label: 'Pas au courant', tone: 'bg-slate-50 text-slate-600 border-slate-200' },
  { key: 'DÉJÀ ÉQUIPÉS', label: 'Déjà équipé', tone: 'bg-blue-50 text-blue-700 border-blue-200' },
];

export function getProspectStatusBadge(
  aiCallScore?: Record<string, { passed?: boolean; score?: number }> | null
): StatusBadge | null {
  if (!aiCallScore) return null;
  for (const rubric of PROSPECT_RUBRICS) {
    const metric = aiCallScore[rubric.key];
    if (!metric) continue;
    const passed = typeof metric.passed === 'boolean' ? metric.passed : (metric.score ?? 0) >= 50;
    if (passed) {
      return { label: rubric.label, tone: rubric.tone, title: rubric.key };
    }
  }
  return null;
}

type CallLike = {
  callOutcome?: string | null;
  ai_call_score?: Record<string, { passed?: boolean; score?: number }> | null;
  transaction?: { validByCompany?: boolean | null; validByAI?: boolean | null } | null;
};

export function resolveUnvalidatedTransactionStatus(call: CallLike): StatusBadge {
  if (call.transaction?.validByCompany === false) {
    return {
      label: 'Refusé entreprise',
      tone: 'bg-rose-50 text-rose-700 border-rose-200',
      title: 'Décision entreprise : refusé',
    };
  }

  const outcome = callOutcomeBadge(call.callOutcome);
  if (outcome) {
    return { ...outcome, title: `Résultat appel : ${call.callOutcome}` };
  }

  const prospect = getProspectStatusBadge(call.ai_call_score);
  if (prospect) return prospect;

  if (call.transaction?.validByAI === false) {
    return {
      label: 'Pas de vente IA',
      tone: 'bg-slate-50 text-slate-600 border-slate-200',
      title: 'L\'IA n\'a pas détecté de transaction',
    };
  }

  return {
    label: 'En attente',
    tone: 'bg-blue-50 text-blue-600 border-blue-200',
    title: 'En attente validation entreprise',
  };
}
