import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

const STRIPE_PRICING_SCRIPT = 'https://js.stripe.com/v3/pricing-table.js';

const DEFAULT_PRICING_TABLE_ID = 'prctbl_1Tik6uPJXYVCMk8p9YtkUCsb';
const DEFAULT_PUBLISHABLE_KEY =
  'pk_live_51TCj3DPJXYVCMk8pTo20zxqkRKZSes7sCY6TJjSYdXqNEjCSvrsbtprRhy52KoggYnNpiJi0se31LuahqFLqN9Ex00kbTYXVSK';

let scriptLoadPromise: Promise<void> | null = null;

function loadStripePricingScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${STRIPE_PRICING_SCRIPT}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = STRIPE_PRICING_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Impossible de charger Stripe Pricing Table'));
    document.body.appendChild(script);
  });

  return scriptLoadPromise;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'stripe-pricing-table': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          'pricing-table-id'?: string;
          'publishable-key'?: string;
        },
        HTMLElement
      >;
    }
  }
}

export type StripeRepPricingTableProps = {
  className?: string;
};

/** Tableau de prix Stripe — plans représentants (Freemium, Standard, Pro, Elite). */
export function StripeRepPricingTable({ className = '' }: StripeRepPricingTableProps) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pricingTableId =
    import.meta.env.VITE_STRIPE_REP_PRICING_TABLE_ID || DEFAULT_PRICING_TABLE_ID;
  const publishableKey =
    import.meta.env.VITE_STRIPE_REP_PUBLISHABLE_KEY || DEFAULT_PUBLISHABLE_KEY;

  useEffect(() => {
    let cancelled = false;
    void loadStripePricingScript()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erreur Stripe');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </p>
    );
  }

  if (!ready) {
    return (
      <div className={`flex items-center justify-center py-16 ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-harx-500" />
      </div>
    );
  }

  return (
    <div className={className}>
      <stripe-pricing-table
        pricing-table-id={pricingTableId}
        publishable-key={publishableKey}
      />
    </div>
  );
}
