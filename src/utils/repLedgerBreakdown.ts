import type { RepTransactionRow } from './client';

export type ValidatedLedgerBreakdown = {
  validatedCallsAmount: number;
  validatedCallsCount: number;
  validatedSalesAmount: number;
  validatedSalesCount: number;
  validatedBonusAmount: number;
  validatedBonusCount: number;
  validatedInPeriod: number;
};

const isActiveLedgerRow = (row: RepTransactionRow) =>
  row.status === 'earned' || row.status === 'pending_retraction' || row.status === 'paid';

/** Somme des commissions validées sur la période, ventilées appels / ventes / bonus. */
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
    if (!isActiveLedgerRow(row)) continue;
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
