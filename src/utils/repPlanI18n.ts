/**
 * Map representative Stripe/DB plan documents onto localized copy.
 * Product names stay brandable but description + features follow the UI language.
 */

export type PlanLike = {
  name?: string;
  description?: string;
  features?: string[];
  stripePriceId?: string;
};

export type LocalizedPlanCopy = {
  name: string;
  description: string;
  features: string[];
};

const PRICE_TO_KEY: Record<string, string> = {
  price_1TijYQPJXYVCMk8pmTIcfZdB: 'takeAChance',
  price_1TijZ3PJXYVCMk8pKIBh5iVG: 'payTheBills',
  price_1Tija4PJXYVCMk8pEq0pKTpC: 'moneyMustBeFunny',
  price_1TijafPJXYVCMk8pmfJxnQPE: 'richMansWorld',
};

export const resolveRepPlanI18nKey = (plan: PlanLike): string | null => {
  const priceId = String(plan.stripePriceId || '').trim();
  if (priceId && PRICE_TO_KEY[priceId]) return PRICE_TO_KEY[priceId];

  const name = String(plan.name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  if (name.includes('take a chance') || name.includes('freemium')) return 'takeAChance';
  if (name.includes('pay the bills') || name.includes('standard')) return 'payTheBills';
  if (name.includes('money must be funny') || name.includes('pro representative')) {
    return 'moneyMustBeFunny';
  }
  if (name.includes('rich man') || name.includes('elite')) return 'richMansWorld';
  return null;
};

type Translate = (key: string, options?: Record<string, unknown>) => string;

export const localizeRepPlan = (plan: PlanLike, t: Translate): LocalizedPlanCopy => {
  const key = resolveRepPlanI18nKey(plan);
  if (!key) {
    return {
      name: plan.name || '',
      description: plan.description || '',
      features: Array.isArray(plan.features) ? plan.features : [],
    };
  }

  const base = `repPlans.${key}`;
  const name = t(`${base}.name`, { defaultValue: plan.name || '' });
  const description = t(`${base}.description`, { defaultValue: plan.description || '' });
  const translatedFeatures: string[] = [];
  for (let i = 0; i < 12; i += 1) {
    const featKey = `${base}.features.${i}`;
    const value = t(featKey, { defaultValue: '' });
    if (!value || value === featKey) break;
    translatedFeatures.push(value);
  }

  return {
    name,
    description,
    features:
      translatedFeatures.length > 0
        ? translatedFeatures
        : Array.isArray(plan.features)
          ? plan.features
          : [],
  };
};
