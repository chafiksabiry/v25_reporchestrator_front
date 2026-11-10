/** Liens d'invitation à rejoindre HARX : en tant que REP ou en tant qu'entreprise (pages d'inscription publiques, une URL par langue). */
export type InviteAudience = 'rep' | 'company';

const SITE_LANGS = ['fr', 'en', 'es', 'ar'] as const;

export function inviteLang(language: string | undefined | null): (typeof SITE_LANGS)[number] {
  const two = String(language || '').slice(0, 2).toLowerCase();
  return (SITE_LANGS as readonly string[]).includes(two) ? (two as (typeof SITE_LANGS)[number]) : 'en';
}

export function buildInviteLink(opts: { origin: string; language?: string | null; audience: InviteAudience; ref?: string | null }): string {
  const path = opts.audience === 'rep' ? '/auth/register-rep' : '/auth/register-company';
  const params = new URLSearchParams({
    utm_source: 'share',
    utm_medium: 'invite',
    utm_campaign: opts.audience === 'rep' ? 'rep_invite' : 'company_invite',
  });
  if (opts.ref) params.set('ref', opts.ref);
  return `${opts.origin.replace(/\/+$/, '')}/${inviteLang(opts.language)}${path}?${params.toString()}`;
}
