const REP_ROUTE_TITLES: Array<{ test: (path: string, search: string) => boolean; label: string }> = [
  { test: (p) => p.startsWith('/profile-import'), label: 'Import CV' },
  { test: (p) => p.startsWith('/profile-editor'), label: 'Éditeur de profil' },
  { test: (p, s) => p === '/profile' && s.includes('edit=true'), label: 'Modifier le profil' },
  { test: (p) => p === '/profile', label: 'Mon profil' },
  { test: (p) => p.startsWith('/orchestrator/signup'), label: 'Orchestrator · Inscription' },
  { test: (p) => p.startsWith('/orchestrator/profile'), label: 'Orchestrator · Création de profil' },
  { test: (p) => p.startsWith('/orchestrator/skills'), label: 'Orchestrator · Compétences' },
  { test: (p) => p.startsWith('/orchestrator/subscription'), label: 'Orchestrator · Abonnement' },
  { test: (p) => p.startsWith('/orchestrator/marketplace'), label: 'Orchestrator · Marketplace' },
  { test: (p) => p.startsWith('/orchestrator/operations'), label: 'Orchestrator · Opérations' },
  { test: (p) => p.startsWith('/orchestrator/support'), label: 'Orchestrator · Support' },
  { test: (p) => p.startsWith('/orchestrator/quality'), label: 'Orchestrator · Qualité' },
  { test: (p) => p.startsWith('/orchestrator/career'), label: 'Orchestrator · Carrière' },
  { test: (p) => p.startsWith('/orchestrator/wallet'), label: 'Orchestrator · Portefeuille' },
  { test: (p) => p === '/orchestrator', label: 'Orchestrator' },
  { test: (p) => p === '/dashboard' || p === '/', label: 'Tableau de bord' },
  { test: (p, s) => p.startsWith('/workspace') && s.includes('tab=voice'), label: 'Prospects' },
  { test: (p, s) => p.startsWith('/workspace') && s.includes('tab=calls'), label: 'Historique' },
  { test: (p, s) => p.startsWith('/workspace') && s.includes('tab=copilot'), label: 'COCKPIT' },
  { test: (p) => p.startsWith('/workspace'), label: 'Espace de travail' },
  { test: (p) => p.startsWith('/marketplace'), label: 'Missions' },
  { test: (p) => /^\/gig\/[^/]+$/.test(p), label: 'Mission' },
  { test: (p) => /^\/company\/[^/]+$/.test(p), label: 'Entreprise' },
  { test: (p) => p.startsWith('/training'), label: 'Formation' },
  { test: (p) => p.startsWith('/session-planning'), label: 'Planification' },
  { test: (p) => p.startsWith('/wallet'), label: 'Portefeuille' },
  { test: (p) => p.startsWith('/account-settings'), label: 'Paramètres du compte' },
  { test: (p) => p.startsWith('/payouts'), label: 'Paiements' },
  { test: (p) => p.startsWith('/learning'), label: 'Apprentissage' },
  { test: (p) => p.startsWith('/community'), label: 'Communauté' },
  { test: (p) => p.startsWith('/import-leads'), label: 'Import prospects' },
  { test: (p) => p.startsWith('/calls'), label: 'Appels' },
  { test: (p) => p.startsWith('/call-report'), label: "Rapport d'appel" },
  { test: (p) => p.startsWith('/operations'), label: 'Opérations' },
  { test: (p) => p.startsWith('/certification'), label: 'Certification' },
  { test: (p) => p.startsWith('/assessment'), label: 'Évaluation' },
  { test: (p) => p.startsWith('/profile-wizard'), label: 'Assistant profil' },
  { test: (p) => p.startsWith('/linkedin-callback'), label: 'LinkedIn' },
  { test: (p) => p.startsWith('/reps-profile'), label: 'Profil REPS' },
];

export function stripRepsPrefix(pathname: string): string {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/reps') return '/';
  if (path.startsWith('/reps/')) return path.slice('/reps'.length) || '/';
  return path;
}

export function resolveRepTabTitle(pathname: string, search = ''): string {
  const path = stripRepsPrefix(pathname.replace(/\/+$/, '') || '/');
  const match = REP_ROUTE_TITLES.find(({ test }) => test(path, search));
  return match?.label ?? 'Portail rep';
}

export function buildRepPageTitle(sectionLabel: string): string {
  return `HARX — Rep · ${sectionLabel}`;
}

export function isRepPortalPath(pathname: string): boolean {
  const appPath = stripRepsPrefix(pathname.replace(/\/+$/, '') || '/');
  if (pathname.startsWith('/reps')) return true;
  return (
    REP_ROUTE_TITLES.some(({ test }) => test(appPath, '')) ||
    appPath.startsWith('/gig/') ||
    appPath.startsWith('/company/')
  );
}
