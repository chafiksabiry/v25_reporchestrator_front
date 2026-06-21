export type BilingualText = { fr: string; en: string };

export type AgentFraudStatsApi = {
  agentId: string;
  fraudCount: number;
  warnings?: {
    repBlacklist?: BilingualText;
    countLabel?: BilingualText;
    commissionNotice?: BilingualText;
  };
};

export function pickBilingual(text: BilingualText | undefined, language: string): string {
  if (!text) return '';
  return language.toLowerCase().startsWith('en') ? text.en : text.fr;
}

export function getDashCallsApiBase(): string {
  const fromImportMeta = (import.meta as any).env?.VITE_DASH_CALLS_API_URL;
  const raw =
    fromImportMeta ||
    (typeof window !== 'undefined' ? (window as any).__HARX_ENV__?.VITE_DASH_CALLS_API_URL : undefined) ||
    'https://v25dashcallsbackend-production.up.railway.app/api';
  return raw.endsWith('/api') ? raw : `${String(raw).replace(/\/+$/, '')}/api`;
}

export async function fetchAgentFraudStats(agentId: string): Promise<AgentFraudStatsApi | null> {
  const base = getDashCallsApiBase();
  if (!base || !agentId) return null;
  try {
    const res = await fetch(`${base}/calls/agent/${encodeURIComponent(agentId)}/fraud-stats`);
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}
