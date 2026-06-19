type CommissionCall = {
  validByAI?: boolean | null;
  repCallCommission?: number;
  repTransactionCommission?: number;
  transactionOccurred?: boolean | null;
  callOutcome?: string | null;
  flags?: { transactionDetected?: boolean };
  ai_call_score?: Record<string, { passed?: boolean; score?: number; transaction_detected?: boolean }> | null;
  lead?: {
    gigId?: {
      commission?: { commission_per_call?: number; transactionCommission?: number };
      rewardPerCall?: number;
      rewardPerSale?: number;
    };
  };
  transaction?: {
    validByAI?: boolean | null;
    validByCompany?: boolean | null;
    validByReps?: boolean | null;
    repTransactionCommission?: number;
  } | null;
};

const REP_SHARE = 0.7;

const PROSPECT_RUBRIC_KEYS = ['RDV', 'A plus tard', 'PAS INTÉRESSÉS', 'PAS AU COURANT', 'DÉJÀ ÉQUIPÉS'];

const NON_SALE_CALLOUTCOMES = new Set([
  'appointment',
  'callback_requested',
  'refusal',
  'not_interested',
  'already_equipped',
  'voicemail',
  'no_answer',
  'busy',
  'wrong_number',
  'fraud',
  'too_short',
  'connected_no_sale',
  'argued_interested',
]);

/** RDV / rubriques prospect — pas une vente commerciale. */
export function isProspectRubricOnly(record: CommissionCall): boolean {
  if (record.callOutcome === 'transaction') return false;
  if (record.flags?.transactionDetected === true) return false;
  if (record.ai_call_score?.transaction_detected?.passed === true) return false;
  if (record.transactionOccurred === true) return false;

  if (record.callOutcome && NON_SALE_CALLOUTCOMES.has(record.callOutcome)) {
    return true;
  }

  const score = record.ai_call_score;
  if (!score || typeof score !== 'object') return false;

  for (const key of PROSPECT_RUBRIC_KEYS) {
    const metric = (score as Record<string, { passed?: boolean; score?: number }>)[key];
    if (!metric) continue;
    const passed = typeof metric.passed === 'boolean' ? metric.passed : (metric.score ?? 0) >= 50;
    if (passed) return true;
  }

  return false;
}

/** IA a détecté une vente — en attente validation entreprise. */
export function hasDetectedTransactionSale(record: CommissionCall): boolean {
  if (record.validByAI !== true) return false;

  if (record.callOutcome === 'transaction') return true;
  if (record.flags?.transactionDetected === true) return true;
  const txDet = record.ai_call_score?.transaction_detected;
  if (txDet === true) return true;
  if (txDet && typeof txDet === 'object' && txDet.passed === true) return true;
  if (record.transactionOccurred === true) return true;
  if (record.transaction?.validByAI === true) return true;

  // RDV / rappel / rubriques prospect ≠ vente — pas de commission transaction.
  if (isProspectRubricOnly(record)) return false;

  if (record.transaction?.validByReps === true) return true;
  return false;
}

/** Vente confirmée — entreprise a validé (`validByCompany === true`). */
export function hasValidatedTransactionSale(record: CommissionCall): boolean {
  return !!record.transaction && record.transaction.validByCompany === true;
}

export function resolveCallRepCommission(record: CommissionCall): number {
  if (record.repCallCommission !== undefined && record.repCallCommission !== null) {
    return Number(record.repCallCommission);
  }
  const base =
    record.lead?.gigId?.commission?.commission_per_call ??
    record.lead?.gigId?.rewardPerCall ??
    4;
  return base * REP_SHARE;
}

export function resolveTransactionRepCommission(record: CommissionCall): number {
  if (record.repTransactionCommission !== undefined && record.repTransactionCommission !== null) {
    return Number(record.repTransactionCommission);
  }
  if (
    record.transaction?.repTransactionCommission !== undefined &&
    record.transaction?.repTransactionCommission !== null
  ) {
    return Number(record.transaction.repTransactionCommission);
  }
  const base =
    record.lead?.gigId?.commission?.transactionCommission ??
    record.lead?.gigId?.rewardPerSale ??
    30;
  return base * REP_SHARE;
}

/** Montant en attente de validation entreprise — ventes uniquement (pas appels/RDV). */
export function resolveClientValidationPendingAmount(
  record: CommissionCall & { _id?: unknown; transaction?: { _id?: unknown } | null },
  _ledgerCallIds: Set<string>,
  bookedTxSourceIds: Set<string>,
  callId: string
): number {
  // Appel validé IA (ex. RDV, argumenté) → commission appel, pas « validation client ».
  // Seules les ventes détectées en attente de validByCompany comptent ici.
  if (!hasDetectedTransactionSale(record)) return 0;

  const txSourceId = String(record.transaction?._id || callId);
  if (bookedTxSourceIds.has(txSourceId) || record.transaction?.validByCompany === true) {
    return 0;
  }

  return resolveTransactionRepCommission(record);
}

export function isCallPendingClientValidation(
  record: CommissionCall & { _id?: unknown; transaction?: { _id?: unknown } | null },
  ledgerCallIds: Set<string>,
  bookedTxSourceIds: Set<string>,
  callId: string
): boolean {
  return resolveClientValidationPendingAmount(record, ledgerCallIds, bookedTxSourceIds, callId) > 0;
}
