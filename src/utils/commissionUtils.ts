type CommissionCall = {
  validByAI?: boolean | null;
  repCallCommission?: number;
  repTransactionCommission?: number;
  transactionOccurred?: boolean | null;
  callOutcome?: string | null;
  flags?: { transactionDetected?: boolean };
  ai_call_score?: { transaction_detected?: boolean };
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

/** IA a détecté une vente — en attente validation entreprise. */
export function hasDetectedTransactionSale(record: CommissionCall): boolean {
  if (record.validByAI !== true) return false;

  if (record.transaction?.validByAI === true) return true;
  if (record.transaction?.validByReps === true) return true;
  if (record.transactionOccurred === true) return true;
  if (record.callOutcome === 'transaction') return true;
  if (record.flags?.transactionDetected === true) return true;
  if (record.ai_call_score?.transaction_detected === true) return true;
  return false;
}

/** Vente confirmée — entreprise a validé (`validByCompany === true`). */
export function hasValidatedTransactionSale(record: CommissionCall): boolean {
  return hasDetectedTransactionSale(record) && record.transaction?.validByCompany === true;
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
