/** Same rule as `microservices/v25_gigsmanualcreation_backend/src/utils/gigCommissionAgentFacing.ts`: agent-facing amounts use × multiplier. */
export const AGENT_COMMISSION_MULTIPLIER = 0.7;

export type GigCommissionLike = {
  transactionCommission?: number | { type?: string; amount?: string | number };
  bonusAmount?: string | number;
  bonus?: string | number;
  minimumVolume?: { amount?: string | number; period?: string; unit?: string };
  bonusPeriod?: string;
  bonusType?: string;
};

/** Populated by the gigs API (recommended). When present, UI and wallet must not apply ×0.7 again. */
export type AgentFacingCommissionBlock = {
  sourceMultiplier: number;
  commission_per_call?: number | null;
  transactionCommission?: number | { type?: string; amount?: string | number } | null;
  bonusAmount?: number | null;
  bonus?: number | null;
  baseAmount?: number | null;
};

export type GigCommissionExtended = GigCommissionLike & {
  commission_per_call?: number | string;
  baseAmount?: string | number;
  currency?: unknown;
  agentFacing?: AgentFacingCommissionBlock;
};

export function applyAgentCut(val: unknown): number | null {
  if (val === undefined || val === null || val === '') return null;
  const num = parseFloat(String(val).replace(/,/g, ''));
  if (Number.isNaN(num)) return null;
  return Number((num * AGENT_COMMISSION_MULTIPLIER).toFixed(2));
}

function unitLabelFr(unitRaw: string | undefined): string {
  const u = String(unitRaw || '').toUpperCase();
  if (u === 'CALLS' || u === 'APPEL' || u === 'APPELS') return 'appels';
  if (u === 'TRANSACTIONS' || u === 'TRANSACTION') return 'transactions';
  if (u === 'SALES' || u === 'VENTES' || u === 'VENTE') return 'ventes';
  if (!u) return 'unités';
  return u.toLowerCase();
}

function periodLabelFr(periodRaw: string | undefined): string | null {
  const p = String(periodRaw || '').toLowerCase();
  if (!p) return null;
  if (p.includes('month') || p === 'monthly' || p === 'mois') return 'mois';
  if (p.includes('week') || p === 'weekly' || p.includes('semaine')) return 'semaine';
  if (p.includes('day') || p === 'daily' || p.includes('jour')) return 'jour';
  return periodRaw!.trim();
}

/**
 * Client-side mirror of server enrichment when `agentFacing` is absent (legacy APIs).
 * Keep logic aligned with `microservices/v25_gigsmanualcreation_backend/src/utils/gigCommissionAgentFacing.ts`.
 */
export function buildAgentFacingBlock(comm: GigCommissionExtended | undefined | null): AgentFacingCommissionBlock | null {
  if (!comm) return null;
  const block: AgentFacingCommissionBlock = { sourceMultiplier: AGENT_COMMISSION_MULTIPLIER };

  const per = applyAgentCut(comm.commission_per_call as unknown);
  if (per !== null && per > 0) block.commission_per_call = per;

  const rawTx = comm.transactionCommission;
  if (rawTx !== undefined && rawTx !== null) {
    if (typeof rawTx === 'object') {
      const type = String(rawTx.type || '').toLowerCase();
      const amtRaw = rawTx.amount;
      const amt =
        amtRaw !== undefined && amtRaw !== null ? Number(String(amtRaw).replace(/,/g, '')) : NaN;
      if (!Number.isNaN(amt) && amt > 0) {
        if (type === 'percentage' || type === 'percent' || type === '%') {
          block.transactionCommission = { type: String(rawTx.type || 'percentage'), amount: amt };
        } else {
          const cut = applyAgentCut(amt);
          if (cut !== null && cut > 0) block.transactionCommission = cut;
        }
      }
    } else {
      const num = Number(String(rawTx).replace(/,/g, ''));
      if (!Number.isNaN(num) && num > 0) {
        const cut = applyAgentCut(num);
        if (cut !== null && cut > 0) block.transactionCommission = cut;
      }
    }
  }

  const bonusRaw = comm.bonusAmount ?? comm.bonus;
  const bonusCut = applyAgentCut(bonusRaw as unknown);
  if (bonusCut !== null && bonusCut > 0) {
    block.bonusAmount = bonusCut;
    block.bonus = bonusCut;
  }

  const baseCut = applyAgentCut(comm.baseAmount as unknown);
  if (baseCut !== null && baseCut > 0) block.baseAmount = baseCut;

  const hasMore = block.commission_per_call != null || block.transactionCommission != null || block.bonusAmount != null || block.baseAmount != null;
  return hasMore ? block : null;
}

export function getResolvedAgentFacing(comm: GigCommissionExtended | undefined): AgentFacingCommissionBlock | null {
  if (!comm) return null;
  if (comm.agentFacing && typeof comm.agentFacing.sourceMultiplier === 'number') {
    return comm.agentFacing;
  }
  return buildAgentFacingBlock(comm);
}

/**
 * Second line for the bonus pill (e.g. "chaque 25 appels / mois") from minimumVolume / bonusPeriod.
 */
export function formatBonusVolumeLine(comm: GigCommissionLike | undefined): string | null {
  if (!comm) return null;
  const mv = comm.minimumVolume;
  const amount = mv?.amount !== undefined && mv?.amount !== null ? String(mv.amount).trim() : '';
  if (amount && amount !== '0') {
    const unit = unitLabelFr(mv?.unit);
    const periodSrc = comm.bonusPeriod || comm.bonusType || mv?.period;
    const period = periodLabelFr(periodSrc);
    if (period) return `chaque ${amount} ${unit} / ${period}`;
    return `chaque ${amount} ${unit}`;
  }
  const fallbackPeriod = periodLabelFr(comm.bonusPeriod || comm.bonusType);
  if (fallbackPeriod) return `par ${fallbackPeriod}`;
  return null;
}

export type TransactionPillDisplay = {
  primary: string;
  /** When true, do not append currency symbol after primary */
  isPercent: boolean;
};

function transactionPillFromEffectiveTx(
  eff: number | { type?: string; amount?: string | number }
): TransactionPillDisplay | null {
  if (typeof eff === 'number') {
    if (eff <= 0) return null;
    return { primary: String(eff), isPercent: false };
  }
  const type = String(eff.type || '').toLowerCase();
  const amtRaw = eff.amount;
  const amt =
    amtRaw !== undefined && amtRaw !== null ? Number(String(amtRaw).replace(/,/g, '')) : NaN;
  if (Number.isNaN(amt) || amt <= 0) return null;
  if (type === 'percentage' || type === 'percent' || type === '%') {
    return { primary: `${amt}%`, isPercent: true };
  }
  return { primary: String(amt), isPercent: false };
}

/**
 * Transaction badge: uses `commission.agentFacing.transactionCommission` when set by the API,
 * otherwise applies ×0.7 to gross `transactionCommission` (legacy).
 */
export function getTransactionPillDisplay(
  comm: GigCommissionExtended | undefined,
  currencySymbol: string
): TransactionPillDisplay | null {
  const resolved = getResolvedAgentFacing(comm);
  const effTx = resolved?.transactionCommission;
  if (effTx !== undefined && effTx !== null) {
    const pill = transactionPillFromEffectiveTx(effTx);
    if (pill) return pill;
  }

  const raw = comm?.transactionCommission;
  if (raw === undefined || raw === null) return null;

  if (typeof raw === 'object') {
    const type = String(raw.type || '').toLowerCase();
    const amtRaw = raw.amount;
    const amt =
      amtRaw !== undefined && amtRaw !== null ? Number(String(amtRaw).replace(/,/g, '')) : NaN;
    if (Number.isNaN(amt) || amt <= 0) return null;

    if (type === 'percentage' || type === 'percent' || type === '%') {
      return { primary: `${amt}%`, isPercent: true };
    }

    const cut = applyAgentCut(amt);
    if (cut !== null && cut > 0) return { primary: `${cut}`, isPercent: false };
    return null;
  }

  const num = Number(String(raw).replace(/,/g, ''));
  if (Number.isNaN(num) || num <= 0) return null;

  const cut = applyAgentCut(num);
  if (cut === null || cut <= 0) return null;
  return { primary: `${cut}`, isPercent: false };
}

export type BonusPillDisplay = { primary: string; secondary: string | null };

export function getBonusPillDisplay(
  comm: GigCommissionExtended | undefined,
  currencySymbol: string
): BonusPillDisplay | null {
  const resolved = getResolvedAgentFacing(comm);
  const effBonus = resolved?.bonusAmount ?? resolved?.bonus;
  if (effBonus !== undefined && effBonus !== null && effBonus !== '' && Number(effBonus) !== 0) {
    const cut = Number(effBonus);
    if (!Number.isNaN(cut) && cut > 0) {
      const sym = String(effBonus).includes('€') ? '' : currencySymbol;
      const primary = `+${cut}${sym}`;
      const secondary = formatBonusVolumeLine(comm);
      return { primary, secondary };
    }
  }

  const raw = comm?.bonusAmount ?? comm?.bonus;
  if (raw === undefined || raw === null || raw === '') return null;
  const base = parseFloat(String(raw).replace(/,/g, ''));
  if (Number.isNaN(base) || base === 0) return null;

  const cut = applyAgentCut(raw);
  if (cut === null || cut <= 0) return null;

  const sym = String(raw).includes('€') ? '' : currencySymbol;
  const primary = `+${cut}${sym}`;
  const secondary = formatBonusVolumeLine(comm);
  return { primary, secondary };
}

/** Wallet: flat EUR per validated call (after agent cut). */
export function resolveWalletPerCallEur(comm: GigCommissionExtended | undefined, rewardPerCallFallback?: number): number {
  const r = getResolvedAgentFacing(comm);
  if (r?.commission_per_call != null && r.commission_per_call > 0) return Number(r.commission_per_call);
  const cut = applyAgentCut(comm?.commission_per_call as unknown);
  if (cut !== null && cut > 0) return cut;
  if (rewardPerCallFallback != null && Number(rewardPerCallFallback) > 0) return Number(rewardPerCallFallback);
  return 4.0;
}

/** Wallet: flat EUR per validated transaction when model is currency; 0 when percent-only. */
export function resolveWalletTransactionEur(comm: GigCommissionExtended | undefined, rewardPerSaleFallback?: number): number {
  const r = getResolvedAgentFacing(comm);
  const t = r?.transactionCommission;
  if (typeof t === 'number' && t > 0) return t;
  if (t && typeof t === 'object') {
    const typ = String(t.type || '').toLowerCase();
    if (typ === 'percentage' || typ === 'percent' || typ === '%') return 0;
    const amt = Number((t as { amount?: unknown }).amount);
    if (!Number.isNaN(amt) && amt > 0) return amt;
  }

  const raw = comm?.transactionCommission;
  if (typeof raw === 'number') {
    const cut = applyAgentCut(raw);
    return cut !== null && cut > 0 ? cut : rewardPerSaleFallback ?? 30.0;
  }
  if (raw && typeof raw === 'object') {
    const typ = String((raw as { type?: string }).type || '').toLowerCase();
    if (typ === 'percentage' || typ === 'percent' || typ === '%') return 0;
    const amtRaw = (raw as { amount?: unknown }).amount;
    const amt = amtRaw !== undefined && amtRaw !== null ? Number(String(amtRaw).replace(/,/g, '')) : NaN;
    if (!Number.isNaN(amt) && amt > 0) {
      const cut = applyAgentCut(amt);
      return cut !== null && cut > 0 ? cut : rewardPerSaleFallback ?? 30.0;
    }
  }
  if (rewardPerSaleFallback != null && Number(rewardPerSaleFallback) > 0) return Number(rewardPerSaleFallback);
  return 30.0;
}
