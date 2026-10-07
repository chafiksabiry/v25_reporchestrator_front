export type LeadLike = Record<string, any> & {
  customFields?: Record<string, string> | Map<string, string>;
};

export interface MergeContext {
  repName?: string;
  companyName?: string;
  prospectName?: string;
  repVisibility?: Record<string, boolean>;
  emptyFallback?: string;
}

const LEGACY_ALIASES: Array<{ pattern: RegExp; resolve: (lead: LeadLike, ctx: MergeContext) => string }> = [
  {
    pattern: /\[\s*Nom du (?:client\/)?prospect\s*\]/gi,
    resolve: (lead, ctx) => ctx.prospectName || leadValue(lead, 'Deal_Name'),
  },
  {
    pattern: /\[\s*Nom(?:\s+du)?\s+prospect\s*\]/gi,
    resolve: (lead, ctx) => ctx.prospectName || leadValue(lead, 'Deal_Name'),
  },
  {
    pattern: /\[\s*Nom du client\s*\]/gi,
    resolve: (lead, ctx) => ctx.prospectName || leadValue(lead, 'Deal_Name'),
  },
  {
    pattern: /\[\s*Votre\s*Nom\s*\]/gi,
    resolve: (_lead, ctx) => ctx.repName || '',
  },
  {
    pattern: /\[\s*Prénom(?:\s+de\s+l['’]?agent)?\s*\]/gi,
    resolve: (_lead, ctx) => ctx.repName || '',
  },
  {
    pattern: /\[\s*Nom de (?:l['’])?entreprise(?:\s+prospect)?\s*\]/gi,
    resolve: (lead, ctx) =>
      ctx.companyName ||
      leadValue(lead, 'Account_Name') ||
      leadValue(lead, 'company') ||
      '',
  },
  {
    pattern: /\[\s*Nom de la (?:société|societe|company|compagnie)\s*\]/gi,
    resolve: (_lead, ctx) => ctx.companyName || '',
  },
  {
    pattern: /\[\s*Société\s*\]/gi,
    resolve: (_lead, ctx) => ctx.companyName || '',
  },
  {
    pattern: /\[\s*Entreprise\s*\]/gi,
    resolve: (_lead, ctx) => ctx.companyName || '',
  },
];

function leadValue(lead: LeadLike | null | undefined, field: string): string {
  if (!lead) return '';
  const v = lead[field];
  if (v == null) return '';
  return String(v).trim();
}

function customValue(lead: LeadLike | null | undefined, header: string): string {
  if (!lead?.customFields) return '';
  const map = lead.customFields;
  const v = map instanceof Map ? map.get(header) : map[header];
  if (v == null) return '';
  return String(v).trim();
}

function resolveTokenKey(key: string, lead: LeadLike | null | undefined, ctx: MergeContext): string {
  const k = String(key || '').trim();
  if (!k) return '';
  if (k === 'repName' || k === 'rep.name') return String(ctx.repName || '').trim();
  if (k === 'companyName' || k === 'company.name') return String(ctx.companyName || '').trim();
  if (k === 'prospectName') {
    return (
      String(ctx.prospectName || '').trim() ||
      leadValue(lead, 'Deal_Name') ||
      `${leadValue(lead, 'First_Name')} ${leadValue(lead, 'Last_Name')}`.trim()
    );
  }
  if (k.startsWith('custom.')) return customValue(lead, k.slice('custom.'.length));
  if (ctx.repVisibility && Object.prototype.hasOwnProperty.call(ctx.repVisibility, k)) {
    if (ctx.repVisibility[k] === false) return '';
  }
  return leadValue(lead, k);
}

/** Replace {{Field}} / {{custom.X}} / legacy [Nom du prospect] with lead values. */
export function renderScript(
  text: string | undefined | null,
  lead?: LeadLike | null,
  ctx: MergeContext = {}
): string {
  if (!text) return '';
  const fallback = ctx.emptyFallback ?? '—';
  let out = String(text);

  out = out.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_full, rawKey: string) => {
    const value = resolveTokenKey(rawKey, lead, ctx);
    return value || fallback;
  });

  for (const alias of LEGACY_ALIASES) {
    out = out.replace(alias.pattern, () => {
      const value = alias.resolve(lead || {}, ctx);
      return value || fallback;
    });
  }

  return out;
}
