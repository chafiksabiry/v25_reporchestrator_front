import { Check, HelpCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type RepOnboardingGuideKey =
  | 'profile-import'
  | 'profile-editor'
  | 'profile'
  | 'subscription'
  | 'dashboard'
  | 'marketplace'
  | 'gig-details'
  | 'company-profile'
  | 'session-planning'
  | 'workspace';

type Props = {
  open: boolean;
  guideKey: RepOnboardingGuideKey | null;
  onClose: () => void;
};

/**
 * On-demand help for the REP onboarding flow — mirrors the company-side
 * pattern (StepGuideModal + a persistent "?" button) rather than a one-shot
 * popup: always available, never forced, never shown automatically.
 */
export function RepOnboardingHelpModal({ open, guideKey, onClose }: Props) {
  const { t } = useTranslation();
  if (!open || !guideKey) return null;

  const titleKey = `repOnboardingGuide.${guideKey}.title`;
  const descriptionKey = `repOnboardingGuide.${guideKey}.description`;
  const tipsKey = `repOnboardingGuide.${guideKey}.tips`;

  const fallbacks: Record<RepOnboardingGuideKey, { title: string; description: string; tips: string[] }> = {
    'profile-import': {
      title: 'Importer votre CV',
      description:
        "Déposez votre CV pour pré-remplir automatiquement votre profil — expériences, compétences, langues. Rien n'est définitif : vous pourrez tout corriger à l'étape suivante.",
      tips: [
        "Pas de CV sous la main ? Vous pouvez créer votre profil manuellement à la place.",
        'Les champs mal extraits se corrigent facilement à l’étape suivante.',
      ],
    },
    'profile-editor': {
      title: 'Compléter votre profil',
      description:
        'Ajoutez votre photo, vos expériences (avec vidéo si possible) et vos disponibilités. Un profil complet est mis en avant auprès des entreprises.',
      tips: [
        'Une vidéo courte par expérience rassure bien plus qu’un texte seul.',
        'Vos disponibilités précises évitent les propositions de missions incompatibles avec votre emploi du temps.',
      ],
    },
    profile: {
      title: 'Vérifier et publier votre profil',
      description:
        'Relisez l’ensemble de votre profil avant publication — c’est ce que les entreprises verront pour vous proposer des missions.',
      tips: [
        'Publier votre profil est nécessaire pour être visible et recevoir des propositions de GIG.',
        'Vous pourrez toujours modifier votre profil après publication.',
      ],
    },
    subscription: {
      title: 'Choisir votre plan',
      description:
        'Sélectionnez le plan correspondant à votre activité pour activer votre compte. Chaque plan détaille ses propres avantages à l’écran.',
      tips: ['Ce choix active votre compte — comparez les plans proposés avant de valider.'],
    },
    dashboard: {
      title: 'Votre tableau de bord',
      description:
        'Vue d’ensemble de votre activité : missions en cours, gains, et raccourcis vers vos prochaines actions.',
      tips: [
        'Les cartes vous amènent directement à l’écran correspondant (missions, portefeuille, planification).',
        'Revenez ici à tout moment via "Tableau de Bord" dans le menu de gauche.',
      ],
    },
    marketplace: {
      title: 'La Marketplace des GIGs',
      description:
        'Parcourez les missions (GIGs) proposées par les entreprises. Postulez à celles qui vous correspondent, ou mettez-les en favori pour plus tard.',
      tips: [
        '"POSTULER" envoie votre candidature à l’entreprise ; "INSCRITE" signifie que votre candidature est déjà envoyée.',
        'Utilisez les onglets (Favoris, Invitations, Inscrites) pour retrouver rapidement vos missions.',
        'Les filtres Secteurs/Activités affinent la liste selon votre spécialité.',
      ],
    },
    'gig-details': {
      title: 'Détails de la mission',
      description:
        'Retrouvez ici toutes les informations sur la mission : description, prérequis, et l’état de votre candidature.',
      tips: [
        '"COMMENCER" lance la mission une fois votre candidature acceptée par l’entreprise.',
        'Le statut affiché se met à jour automatiquement dès que l’entreprise valide votre candidature.',
      ],
    },
    'company-profile': {
      title: 'Profil de l’entreprise',
      description:
        'Consultez les informations de l’entreprise qui propose la mission avant de postuler ou de démarrer votre activité.',
      tips: ['Ces informations vous aident à mieux préparer vos échanges avec les prospects.'],
    },
    'session-planning': {
      title: 'Planification',
      description:
        'Organisez vos créneaux de travail sur vos missions actives pour structurer votre activité.',
      tips: ['Planifier vos sessions aide à répartir votre charge de travail sur la semaine.'],
    },
    workspace: {
      title: 'Espace de Travail',
      description:
        'Votre espace d’appel : sélectionnez un prospect pour voir sa fiche et son historique d’échanges, puis lancez l’appel depuis le Cockpit.',
      tips: [
        '"PROSPECTS" liste les contacts à traiter pour le GIG actif ; "HISTORIQUE" retrace vos appels passés.',
        'Le panneau "Cockpit" s’ouvre automatiquement pendant un appel pour afficher le script et enregistrer la conversation.',
      ],
    },
  };

  const fb = fallbacks[guideKey];
  const rawTips = t(tipsKey, { returnObjects: true }) as unknown;
  const tips = Array.isArray(rawTips) && rawTips.length > 0 ? (rawTips as string[]) : fb.tips;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rep-onboarding-help-title"
        className="relative w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          aria-label={t('repOnboardingGuide.close', 'Fermer')}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-harx text-white shadow-md">
          <HelpCircle className="h-5 w-5" />
        </div>

        <h2 id="rep-onboarding-help-title" className="pr-8 text-lg font-black tracking-tight text-slate-900">
          {t(titleKey, fb.title)}
        </h2>
        <p className="mt-1.5 text-sm font-medium text-slate-500 leading-relaxed">
          {t(descriptionKey, fb.description)}
        </p>

        <ul className="mt-4 space-y-2">
          {tips.map((tip, idx) => (
            <li key={idx} className="flex items-start gap-2 rounded-2xl border border-harx-100 bg-harx-50/60 px-3 py-2.5 text-xs text-slate-600 leading-relaxed">
              <Check className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-harx-600" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-gradient-harx px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-harx-500/20 transition hover:opacity-90"
        >
          {t('repOnboardingGuide.gotIt', 'Compris')}
        </button>
      </div>
    </div>
  );
}
