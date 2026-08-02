import type { RepTransactionRow } from './client';

/**
 * Date de référence pour le filtre période wallet :
 * - ventes / rétractation → date de réservation (createdAt), alignée sur la liste transactions ;
 * - appels validés → date d'activité de l'appel.
 */
export function resolveLedgerPeriodDate(
  row: RepTransactionRow,
  callActivityDateById: Map<string, string>
): string | undefined {
  if (row.type === 'transaction') {
    return row.createdAt;
  }
  if (row.callId) {
    const fromCall = callActivityDateById.get(String(row.callId));
    if (fromCall) return fromCall;
  }
  if (row.call?.startTime) return row.call.startTime;
  return row.createdAt;
}

const SALE_STATUS_RANK: Record<string, number> = {
  pending_retraction: 4,
  earned: 3,
  paid: 2,
  refused: 1,
  reversed: 0,
};

/** Une vente = une ligne ledger (évite double comptage earned + pending_retraction). */
export function dedupeSaleLedgerRows(rows: RepTransactionRow[]): RepTransactionRow[] {
  const saleByKey = new Map<string, RepTransactionRow>();
  const others: RepTransactionRow[] = [];

  const saleKey = (row: RepTransactionRow) => {
    if (row.callId) return `call:${row.callId}`;
    if (row.sourceId) return `src:${row.sourceId}`;
    if (row.transactionDocId) return `tx:${row.transactionDocId}`;
    return `id:${row._id}`;
  };

  for (const row of rows) {
    if (row.type !== 'transaction') {
      others.push(row);
      continue;
    }
    const key = saleKey(row);
    const prev = saleByKey.get(key);
    const rowRank = SALE_STATUS_RANK[row.status] ?? 0;
    const prevRank = prev ? (SALE_STATUS_RANK[prev.status] ?? 0) : -1;
    if (!prev || rowRank > prevRank) {
      saleByKey.set(key, row);
    }
  }

  return [...others, ...saleByKey.values()];
}

/** Index ventes ledger par callId (après déduplication). */
export function indexSaleLedgerByCallId(
  rows: RepTransactionRow[]
): Map<string, RepTransactionRow> {
  const map = new Map<string, RepTransactionRow>();
  for (const row of dedupeSaleLedgerRows(rows)) {
    if (row.type !== 'transaction' || !row.callId) continue;
    map.set(String(row.callId), row);
  }
  return map;
}

export type ValidatedLedgerBreakdown = {
  validatedCallsAmount: number;
  validatedCallsCount: number;
  validatedSalesAmount: number;
  validatedSalesCount: number;
  validatedBonusAmount: number;
  validatedBonusCount: number;
  validatedInPeriod: number;
};

/** Commission définitivement créditée — exclut les ventes encore en rétractation 14j. */
const isValidatedNonRetractedRow = (row: RepTransactionRow) =>
  row.status === 'earned' || row.status === 'paid';

/** Somme des commissions validées et non rétractées sur la période (appels / ventes / bonus). */
export function computeValidatedLedgerBreakdown(
  rows: RepTransactionRow[],
  opts: {
    inPeriod: (dateStr?: string) => boolean;
    activityDate: (row: RepTransactionRow) => string | undefined;
    selectedGigId?: string;
  }
): ValidatedLedgerBreakdown {
  let validatedCallsAmount = 0;
  let validatedCallsCount = 0;
  let validatedSalesAmount = 0;
  let validatedSalesCount = 0;
  let validatedBonusAmount = 0;
  let validatedBonusCount = 0;

  for (const row of rows) {
    if (!isValidatedNonRetractedRow(row)) continue;
    if (opts.selectedGigId && opts.selectedGigId !== 'all' && row.gigId && row.gigId !== opts.selectedGigId) {
      continue;
    }
    if (!opts.inPeriod(opts.activityDate(row))) continue;

    const share = row.repShare || 0;
    if (row.type === 'call_validated') {
      validatedCallsAmount += share;
      validatedCallsCount += 1;
    } else if (row.type === 'transaction') {
      validatedSalesAmount += share;
      validatedSalesCount += 1;
    } else if (row.type === 'bonus') {
      validatedBonusAmount += share;
      validatedBonusCount += 1;
    }
  }

  return {
    validatedCallsAmount,
    validatedCallsCount,
    validatedSalesAmount,
    validatedSalesCount,
    validatedBonusAmount,
    validatedBonusCount,
    validatedInPeriod: validatedCallsAmount + validatedSalesAmount + validatedBonusAmount,
  };
}
