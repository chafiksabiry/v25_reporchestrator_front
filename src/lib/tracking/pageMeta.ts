import { DEFAULT_PAGE_DESCRIPTION, HARX_SITE_URL } from './constants';

export type PageMeta = {
  title: string;
  description: string;
  canonical?: string;
};

const BASE_TITLE = 'HARX';

const ROUTE_META: Array<{ test: (path: string) => boolean; meta: PageMeta }> = [
  {
    test: (p) => p === '/' || p === '',
    meta: {
      title: `${BASE_TITLE} — We inspire growth`,
      description: DEFAULT_PAGE_DESCRIPTION,
      canonical: `${HARX_SITE_URL}/`,
    },
  },
  {
    test: (p) => p.startsWith('/auth/choice'),
    meta: {
      title: `${BASE_TITLE} — Choix du profil`,
      description: 'Rejoignez HARX en tant qu’entreprise ou rep indépendant.',
      canonical: `${HARX_SITE_URL}/auth/choice`,
    },
  },
  {
    test: (p) => p.startsWith('/auth/signin'),
    meta: {
      title: `${BASE_TITLE} — Connexion`,
      description: 'Connectez-vous à votre espace HARX.',
      canonical: `${HARX_SITE_URL}/auth/signin`,
    },
  },
  {
    test: (p) => p.startsWith('/auth/register-company'),
    meta: {
      title: `${BASE_TITLE} — Inscription entreprise`,
      description: 'Créez votre compte entreprise HARX.',
      canonical: `${HARX_SITE_URL}/auth/register-company`,
    },
  },
  {
    test: (p) => p.startsWith('/auth/register-rep'),
    meta: {
      title: `${BASE_TITLE} — Inscription rep`,
      description: 'Créez votre profil rep certifié HARX avec votre CV.',
      canonical: `${HARX_SITE_URL}/auth/register-rep`,
    },
  },
  {
    test: (p) => p.startsWith('/auth/register'),
    meta: {
      title: `${BASE_TITLE} — Inscription`,
      description: 'Créez votre compte HARX.',
      canonical: `${HARX_SITE_URL}/auth/register`,
    },
  },
  {
    test: (p) => p.startsWith('/auth/recovery'),
    meta: {
      title: `${BASE_TITLE} — Récupération de compte`,
      description: 'Réinitialisez votre mot de passe HARX.',
      canonical: `${HARX_SITE_URL}/auth/recovery`,
    },
  },
  {
    test: (p) => p.startsWith('/auth'),
    meta: {
      title: `${BASE_TITLE} — Authentification`,
      description: 'Accédez à votre espace HARX.',
      canonical: `${HARX_SITE_URL}/auth/signin`,
    },
  },
  {
    test: (p) => p.startsWith('/admin/signin'),
    meta: {
      title: `${BASE_TITLE} — Admin · Connexion`,
      description: 'Connexion back office HARX.',
      canonical: `${HARX_SITE_URL}/admin/signin`,
    },
  },
  {
    test: (p) => p.startsWith('/admin/users'),
    meta: {
      title: `${BASE_TITLE} — Admin · Utilisateurs`,
      description: 'Gestion des utilisateurs HARX.',
      canonical: `${HARX_SITE_URL}/admin/users`,
    },
  },
  {
    test: (p) => p.startsWith('/admin/wallet'),
    meta: {
      title: `${BASE_TITLE} — Admin · Wallet`,
      description: 'Gestion des wallets HARX.',
      canonical: `${HARX_SITE_URL}/admin/wallet`,
    },
  },
  {
    test: (p) => p.startsWith('/admin'),
    meta: {
      title: `${BASE_TITLE} — Admin`,
      description: 'Back office administrateur HARX.',
      canonical: `${HARX_SITE_URL}/admin`,
    },
  },
  {
    test: (p) => p.startsWith('/company'),
    meta: {
      title: `${BASE_TITLE} — Portail entreprise`,
      description: 'Pilotez vos opérations, reps et campagnes depuis le portail entreprise HARX.',
      canonical: `${HARX_SITE_URL}/company`,
    },
  },
  {
    test: (p) => p.includes('/reps/orchestrator') || p.includes('/reporchestrator'),
    meta: {
      title: `${BASE_TITLE} — Onboarding rep`,
      description: 'Parcours d’onboarding rep HARX.',
      canonical: `${HARX_SITE_URL}/reps/orchestrator`,
    },
  },
  {
    test: (p) => p.includes('/reps/dashboard') || p.includes('/reps/profile'),
    meta: {
      title: `${BASE_TITLE} — Dashboard rep`,
      description: 'Tableau de bord rep HARX.',
      canonical: `${HARX_SITE_URL}/reps`,
    },
  },
  {
    test: (p) => p.startsWith('/reps') || p.startsWith('/reporchestrator'),
    meta: {
      title: `${BASE_TITLE} — Portail rep`,
      description: 'Gérez votre activité rep, vos gigs et vos revenus sur HARX.',
      canonical: `${HARX_SITE_URL}/reps`,
    },
  },
  {
    test: (p) => p.startsWith('/linkedin'),
    meta: {
      title: `${BASE_TITLE} — LinkedIn`,
      description: 'Connexion LinkedIn HARX.',
    },
  },
];

export function normalizeTrackingPath(path: string): string {
  const withoutHash = path.split('#')[0] || '/';
  const pathname = withoutHash.startsWith('/') ? withoutHash : `/${withoutHash}`;
  return pathname.replace(/\/+$/, '') || '/';
}

export function resolvePageMeta(rawPath: string): PageMeta {
  const full = rawPath || '/';
  const match = ROUTE_META.find(({ test }) => test(full) || test(normalizeTrackingPath(full)));
  return (
    match?.meta ?? {
      title: BASE_TITLE,
      description: DEFAULT_PAGE_DESCRIPTION,
      canonical: `${HARX_SITE_URL}${normalizeTrackingPath(full) === '/' ? '' : normalizeTrackingPath(full)}`,
    }
  );
}

export function buildTrackingPath(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}
