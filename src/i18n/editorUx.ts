import i18n from './index';

/**
 * Textes de la refonte de l'éditeur de profil (espace de noms propre « editorUx »),
 * volontairement séparés de fr.json / en.json pour éviter les conflits entre lots.
 */
export const EDITOR_UX_NS = 'editorUx';

const fr = {
  overview: {
    title: 'Votre profil, section par section',
    subtitle: 'Chaque section complétée rend votre profil plus lisible pour les entreprises.',
    progress: '{{done}} sur {{total}} sections complètes',
    next: 'Prochaine étape : {{section}}',
    allDone: 'Toutes les sections sont complètes. Vous pouvez continuer.',
    goTo: 'Aller à la section {{section}}',
    autosaveIdle: 'Vos modifications sont enregistrées automatiquement.',
    autosavePending: 'Modification détectée…',
    autosaveSaving: 'Enregistrement en cours…',
    autosaveSaved: 'Enregistré automatiquement',
    autosaveError: 'Échec de l’enregistrement — vos données restent à l’écran, réessayez avec « Enregistrer ».',
  },
  tabs: {
    identity: 'Identité & photo',
    experience: 'Expériences',
    summary: 'Résumé',
    availability: 'Disponibilités',
    video: 'Vidéo',
    step: 'Étape {{n}} sur {{total}}',
    prev: 'Précédent',
    next: 'Suivant',
    listLabel: 'Sections du profil',
  },
  sections: {
    identity: 'Identité',
    photo: 'Photo',
    languages: 'Langues',
    experience: 'Expériences',
    summary: 'Résumé',
    availability: 'Disponibilités',
  },
  pill: {
    complete: 'Complet',
    partial: '{{done}}/{{total}}',
    todo: 'À compléter',
  },
  missing: {
    name: 'votre nom',
    country: 'votre pays',
    phone: 'votre téléphone',
    photo: 'une photo de profil',
    languages: 'au moins une langue',
    experience: 'au moins une expérience',
    experienceDetails: 'un intitulé et une entreprise pour chaque expérience',
    summary: 'un résumé d’au moins {{min}} caractères',
    schedule: 'au moins un créneau horaire complet',
    video: 'votre vidéo de présentation',
  },
  missingPrefix: 'Il manque : {{list}}.',
  help: {
    open: 'Pourquoi cette section ?',
    identity:
      'Les entreprises voient votre nom, votre pays et un moyen de vous joindre. Des informations exactes évitent les malentendus lors des premiers contacts.',
    photo:
      'Un visage lisible inspire confiance. Préférez une photo de face, bien éclairée, fond neutre, sans lunettes de soleil.',
    languages:
      'Les langues parlées sont un critère de sélection pour de nombreuses missions. Indiquez votre niveau réel.',
    experience:
      'Vos expériences montrent ce que vous savez déjà faire. Quelques lignes concrètes valent mieux qu’une longue liste.',
    summary:
      'C’est la première chose que lit une entreprise. Visez 3 à 5 phrases : votre métier, votre expérience clé, ce que vous apportez.',
    availability:
      'Vos créneaux permettent de vous proposer des missions compatibles avec votre rythme. Vous pourrez les modifier à tout moment.',
  },
  empty: {
    exampleLabel: 'Exemple',
    whyLabel: 'Pourquoi ?',
    experience: {
      title: 'Ajoutez votre première expérience',
      what: 'Un poste que vous avez occupé : intitulé, entreprise, dates et 2 à 3 missions.',
      why: 'Les entreprises cherchent des preuves concrètes de ce que vous savez faire.',
      example: 'Conseiller clientèle — Société Exemple (2021–2024) : traitement de 60 appels par jour, satisfaction client de 92 %.',
      cta: 'Ajouter une expérience',
      ctaHint: 'Cliquez sur « Modifier » en haut de la section pour ajouter une expérience.',
    },
    languages: {
      title: 'Aucune langue renseignée',
      what: 'Les langues que vous parlez, avec votre niveau.',
      why: 'C’est un critère de sélection pour beaucoup de missions de relation client.',
      example: 'Français — natif · Anglais — courant (C1)',
      ctaHint: 'Cliquez sur « Modifier » dans « Informations personnelles » pour ajouter une langue.',
    },
    summary: {
      title: 'Votre résumé est vide',
      what: 'Une présentation courte de votre parcours (3 à 5 phrases).',
      why: 'Elle donne envie de lire la suite de votre profil.',
      example:
        'Conseillère relation client bilingue avec 4 ans d’expérience en support téléphonique. À l’aise avec les clients exigeants, je garde le sens de l’écoute et la clarté au téléphone.',
      ctaHint: 'Cliquez sur « Modifier » puis « Régénérer » pour en créer un à partir de votre CV, ou écrivez le vôtre.',
    },
    availability: {
      title: 'Aucun créneau défini',
      what: 'Les jours et horaires où vous pouvez travailler, avec votre fuseau horaire.',
      why: 'Sans créneaux, nous ne pouvons pas vous proposer de missions adaptées.',
      example: 'Lundi–vendredi, 09:00–17:00 (Paris) · samedi 10:00–14:00',
      ctaHint: 'Cliquez sur « Modifier » puis choisissez vos jours et vos horaires.',
    },
  },
  summaryHint: {
    empty: 'Écrivez 3 à 5 phrases : métier, expérience clé, ce que vous apportez.',
    short: 'Encore un peu court ({{chars}} caractères). Ajoutez votre expérience clé — visez au moins {{min}} caractères.',
    good: 'Longueur idéale ({{chars}} caractères).',
    long: 'Un peu long ({{chars}} caractères). Les entreprises lisent vite : gardez l’essentiel (moins de {{max}}).',
  },
  placeholders: {
    summary: 'Ex. : Conseillère relation client bilingue, 4 ans d’expérience en support téléphonique. J’aime résoudre les problèmes dès le premier appel…',
  },
  photoHint: {
    missing: 'Ajoutez une photo de face, bien éclairée.',
    ok: 'Photo ajoutée. Cliquez dessus pour l’agrandir.',
  },
  hints: {
    name: 'Indiquez prénom et nom, comme sur vos documents.',
    country: 'Choisissez le pays où vous vivez et travaillez.',
    phone: 'Exemple : +33 6 12 34 56 78 (avec l’indicatif du pays).',
    email: 'Exemple : prenom.nom@exemple.com',
    languages: 'Ajoutez au moins une langue, par exemple « Français — natif ».',
  },
};

const en: typeof fr = {
  overview: {
    title: 'Your profile, section by section',
    subtitle: 'Each completed section makes your profile easier for companies to read.',
    progress: '{{done}} of {{total}} sections complete',
    next: 'Next step: {{section}}',
    allDone: 'All sections are complete. You can continue.',
    goTo: 'Go to the {{section}} section',
    autosaveIdle: 'Your changes are saved automatically.',
    autosavePending: 'Change detected…',
    autosaveSaving: 'Saving…',
    autosaveSaved: 'Saved automatically',
    autosaveError: 'Saving failed — your data is still on screen, try again with “Save”.',
  },
  tabs: {
    identity: 'Identity & photo',
    experience: 'Experience',
    summary: 'Summary',
    availability: 'Availability',
    video: 'Video',
    step: 'Step {{n}} of {{total}}',
    prev: 'Previous',
    next: 'Next',
    listLabel: 'Profile sections',
  },
  sections: {
    identity: 'Identity',
    photo: 'Photo',
    languages: 'Languages',
    experience: 'Experience',
    summary: 'Summary',
    availability: 'Availability',
  },
  pill: {
    complete: 'Complete',
    partial: '{{done}}/{{total}}',
    todo: 'To complete',
  },
  missing: {
    name: 'your name',
    country: 'your country',
    phone: 'your phone number',
    photo: 'a profile photo',
    languages: 'at least one language',
    experience: 'at least one experience',
    experienceDetails: 'a job title and a company for each experience',
    summary: 'a summary of at least {{min}} characters',
    schedule: 'at least one complete time slot',
    video: 'your introduction video',
  },
  missingPrefix: 'Missing: {{list}}.',
  help: {
    open: 'Why this section?',
    identity:
      'Companies see your name, your country and a way to reach you. Accurate details avoid misunderstandings in first contacts.',
    photo:
      'A clear face builds trust. Prefer a front-facing, well-lit photo on a plain background, without sunglasses.',
    languages:
      'Spoken languages are a selection criterion for many missions. State your real level.',
    experience:
      'Your experience shows what you can already do. A few concrete lines beat a long list.',
    summary:
      'It is the first thing a company reads. Aim for 3 to 5 sentences: your job, your key experience, what you bring.',
    availability:
      'Your time slots let us suggest missions that fit your schedule. You can change them at any time.',
  },
  empty: {
    exampleLabel: 'Example',
    whyLabel: 'Why?',
    experience: {
      title: 'Add your first experience',
      what: 'A position you held: title, company, dates and 2 to 3 duties.',
      why: 'Companies look for concrete proof of what you can do.',
      example: 'Customer advisor — Example Company (2021–2024): 60 calls a day, 92% customer satisfaction.',
      cta: 'Add an experience',
      ctaHint: 'Click “Edit” at the top of this section to add an experience.',
    },
    languages: {
      title: 'No language yet',
      what: 'The languages you speak, with your level.',
      why: 'It is a selection criterion for many customer-relations missions.',
      example: 'French — native · English — fluent (C1)',
      ctaHint: 'Click “Edit” in “Personal information” to add a language.',
    },
    summary: {
      title: 'Your summary is empty',
      what: 'A short presentation of your background (3 to 5 sentences).',
      why: 'It makes people want to read the rest of your profile.',
      example:
        'Bilingual customer-relations advisor with 4 years of phone-support experience. Comfortable with demanding customers, I stay attentive and clear on the phone.',
      ctaHint: 'Click “Edit” then “Regenerate” to create one from your CV, or write your own.',
    },
    availability: {
      title: 'No time slot defined',
      what: 'The days and hours you can work, with your time zone.',
      why: 'Without time slots we cannot suggest suitable missions.',
      example: 'Monday–Friday, 09:00–17:00 (Paris) · Saturday 10:00–14:00',
      ctaHint: 'Click “Edit” then choose your days and hours.',
    },
  },
  summaryHint: {
    empty: 'Write 3 to 5 sentences: job, key experience, what you bring.',
    short: 'A bit short ({{chars}} characters). Add your key experience — aim for at least {{min}} characters.',
    good: 'Ideal length ({{chars}} characters).',
    long: 'A bit long ({{chars}} characters). Companies read fast: keep the essentials (under {{max}}).',
  },
  placeholders: {
    summary: 'E.g. Bilingual customer-relations advisor, 4 years of phone-support experience. I like solving problems on the first call…',
  },
  photoHint: {
    missing: 'Add a front-facing, well-lit photo.',
    ok: 'Photo added. Click it to enlarge.',
  },
  hints: {
    name: 'Enter first and last name, as on your documents.',
    country: 'Choose the country where you live and work.',
    phone: 'Example: +33 6 12 34 56 78 (with the country code).',
    email: 'Example: first.last@example.com',
    languages: 'Add at least one language, for example “French — native”.',
  },
};

i18n.addResourceBundle('fr', EDITOR_UX_NS, fr, true, false);
i18n.addResourceBundle('en', EDITOR_UX_NS, en, true, false);

export const editorUxBundles = { fr, en };
