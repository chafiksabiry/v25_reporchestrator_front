export interface StatusBadge {
  label: string;
  tone: string;
  title?: string;
}

export function callOutcomeBadge(outcome: string | null | undefined): StatusBadge | null {
  if (!outcome) return null;
  const map: Record<string, StatusBadge> = {
    transaction: { label: 'Vente', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    appointment: { label: 'RDV', tone: 'bg-violet-50 text-violet-700 border-violet-200' },
    callback_requested: { label: 'Rappel', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
    argued_interested: { label: 'Argumenté', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    refusal: { label: 'Refus', tone: 'bg-rose-50 text-rose-700 border-rose-200' },
    not_interested: { label: 'Pas intéressé', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
    already_equipped: { label: 'Déjà équipé', tone: 'bg-blue-50 text-blue-700 border-blue-200' },
    voicemail: { label: 'Messagerie', tone: 'bg-slate-50 text-slate-600 border-slate-200' },
    no_answer: { label: 'Non décroché', tone: 'bg-slate-50 text-slate-600 border-slate-200' },
    busy: { label: 'Occupé', tone: 'bg-slate-50 text-slate-600 border-slate-200' },
    wrong_number: { label: 'Faux numéro', tone: 'bg-rose-50 text-rose-700 border-rose-200' },
    fraud: { label: 'Fraude', tone: 'bg-rose-100 text-rose-800 border-rose-300' },
    too_short: { label: 'Trop court', tone: 'bg-slate-50 text-slate-500 border-slate-200' },
    connected_no_sale: { label: 'Sans suite', tone: 'bg-slate-50 text-slate-600 border-slate-200' },
  };
  return map[outcome] || { label: outcome.replace(/_/g, ' '), tone: 'bg-slate-50 text-slate-600 border-slate-200' };
}

const PROSPECT_RUBRICS: Array<{ key: string; label: string; tone: string }> = [
  { key: 'RDV', label: 'RDV', tone: 'bg-violet-50 text-violet-700 border-violet-200' },
  { key: 'A plus tard', label: 'Plus tard', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'PAS INTÉRESSÉS', label: 'Pas intéressé', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'PAS AU COURANT', label: 'Pas au courant', tone: 'bg-slate-50 text-slate-600 border-slate-200' },
  { key: 'DÉJÀ ÉQUIPÉS', label: 'Déjà équipé', tone: 'bg-blue-50 text-blue-700 border-blue-200' },
];

export function getProspectStatusBadge(
  aiCallScore?: Record<string, { passed?: boolean; score?: number }> | null
): StatusBadge | null {
  if (!aiCallScore) return null;

  const fraudScore = aiCallScore['Fraud detection']?.score;
  if (typeof fraudScore === 'number' && fraudScore < 50) return null;

  let best: { rubric: typeof PROSPECT_RUBRICS[number]; score: number } | null = null;

  for (const rubric of PROSPECT_RUBRICS) {
    const metric = aiCallScore[rubric.key];
    if (!metric) continue;
    const passed = typeof metric.passed === 'boolean' ? metric.passed : (metric.score ?? 0) >= 50;
    if (!passed) continue;
    const score = metric.score ?? 0;
    if (!best || score >= best.score) {
      best = { rubric, score };
    }
  }

  if (!best) return null;
  return { label: best.rubric.label, tone: best.rubric.tone, title: best.rubric.key };
}

const PRIORITY_CALLOUTCOMES = new Set([
  'transaction',
  'fraud',
  'refusal',
  'voicemail',
  'no_answer',
  'busy',
  'wrong_number',
  'too_short',
]);

export type CallLike = {
  validByAI?: boolean | null;
  valid?: boolean | null;
  ai_call_status?: string | null;
  callOutcome?: string | null;
  ai_summary?: string | null;
  ai_summary_fr?: string | null;
  flags?: { fraud?: boolean; selfCall?: boolean; transactionDetected?: boolean };
  ai_call_score?: Record<string, { passed?: boolean; score?: number; feedback?: string; feedback_fr?: string; feedback_en?: string }> | null;
  transaction?: {
    validByCompany?: boolean | null;
    validByAI?: boolean | null;
    retractionStatus?: string | null;
    retractionEndsAt?: string | Date | null;
  } | null;
};

const VOICEMAIL_REGEX =
  /messagerie|messagerie\s+(vocale|automatique)|r[ée]pondeur|laissez\s+(votre|un)\s+message|bo[îi]te\s+vocale|voicemail|answering\s+machine|leave\s+(a|your)\s+message|after\s+(the\s+)?(tone|beep)|appel\s+non\s+productif|non\s+productif|aucun(?:e)?\s+(?:interaction|[ée]change)|aucun\s+(?:él|el)[ée]ment\s+exploitable|n['']?est\s+pas\s+disponible|votre\s+correspondant|tombe?\s+(?:imm[ée]diatement\s+)?sur\s+la?\s?messagerie|redirig[ée]\s+vers\s+la?\s?messagerie/i;

export function isCallVoicemail(call: CallLike): boolean {
  if (call.callOutcome === 'voicemail') return true;
  const feedback = String(
    call.ai_summary_fr ||
      call.ai_summary ||
      call.ai_call_score?.overall?.feedback_fr ||
      call.ai_call_score?.overall?.feedback ||
      call.ai_call_score?.overall?.feedback_en ||
      ''
  ).toLowerCase();
  return VOICEMAIL_REGEX.test(feedback);
}

export function getVoicemailCallNotice(language: string = 'fr'): string {
  return language.toLowerCase().startsWith('en')
    ? 'Voicemail — no exchange with the prospect. This is not fraud and no commission is due.'
    : 'Messagerie — aucun échange avec le prospect. Ce n\'est pas une fraude et aucune commission n\'est due.';
}

/** True when AI or system flagged fraud (including self-call). Excludes voicemail. */
export function isCallFraudDetected(call: CallLike): boolean {
  if (isCallVoicemail(call)) return false;
  if (call.flags?.fraud === true || call.flags?.selfCall === true) return true;
  if (call.callOutcome === 'fraud') return true;
  const fraudScore = call.ai_call_score?.['Fraud detection']?.score;
  if (typeof fraudScore === 'number' && fraudScore < 50) return true;
  return false;
}

export type TranscriptEntry = {
  speaker?: string;
  text?: string;
  timestamp?: string;
  start?: string;
  end?: string;
  simulated?: boolean;
  originalSpeaker?: string;
};

type AiCallScoreWithVoice = Record<string, { passed?: boolean; score?: number; voiceAnalysis?: Record<string, unknown> }> | null | undefined;

function isAgentSpeakerLabel(label: string): boolean {
  return /agent|rep|commercial|vendeur|conseiller|seller|harx/i.test(label);
}

export function isSingleVoiceSelfCall(aiCallScore?: AiCallScoreWithVoice): boolean {
  const fraudScore = aiCallScore?.['Fraud detection']?.score;
  if (typeof fraudScore === 'number' && fraudScore >= 50) return false;

  const voiceAnalysis = aiCallScore?.['Fraud detection']?.voiceAnalysis as
    | { distinctVoices?: number; sameSpeakerSuspected?: boolean; fraudReason?: string }
    | undefined;
  if (!voiceAnalysis) return typeof fraudScore === 'number' && fraudScore < 50;

  if (voiceAnalysis.distinctVoices === 1) return true;
  if (voiceAnalysis.sameSpeakerSuspected === true) return true;
  return ['single_speaker_ai', 'same_voice_ai'].includes(String(voiceAnalysis.fraudReason || ''));
}

export function getDisplayTranscript(
  transcript: TranscriptEntry[] | undefined | null,
  aiCallScore?: AiCallScoreWithVoice
): TranscriptEntry[] {
  if (!transcript?.length) return [];
  if (!isSingleVoiceSelfCall(aiCallScore)) return transcript;

  return transcript.map((entry) => {
    const speaker = String(entry.speaker || '');
    if (entry.simulated || isAgentSpeakerLabel(speaker)) return entry;
    return {
      ...entry,
      originalSpeaker: entry.originalSpeaker || speaker,
      speaker: 'Voix simulée',
      simulated: true,
    };
  });
}

export function getSelfCallTranscriptNotice(
  aiCallScore?: AiCallScoreWithVoice,
  language: string = 'fr'
): string | null {
  if (!isSingleVoiceSelfCall(aiCallScore)) return null;
  return language === 'en'
    ? 'Only one human voice was detected on this recording. Customer labels in the transcript were inferred by AI and may be simulated by the same person (self-call).'
    : 'Une seule voix humaine a été détectée sur cet enregistrement. Les tours « Client » du transcript ont été inférés par l\'IA et peuvent être simulés par la même personne (auto-appel).';
}

export function isSimulatedTranscriptTurn(entry: TranscriptEntry): boolean {
  return entry.simulated === true || String(entry.speaker || '').toLowerCase().includes('simul');
}

function isEnglishLanguage(language: string): boolean {
  return String(language || '').toLowerCase().startsWith('en');
}

/** Avertissement rep : risque de blacklist en cas de fraudes répétées. */
export function getFraudBlacklistWarning(language: string = 'fr'): string {
  return isEnglishLanguage(language)
    ? 'Warning: if fraudulent calls continue, you may be blacklisted. The company can make this decision at any time.'
    : 'Attention : en cas de fraudes répétées, vous pourriez être blacklisté. L\'entreprise peut prendre cette décision à tout moment.';
}

/** Aucune commission due sur un appel frauduleux. */
export function getFraudCommissionNotice(language: string = 'fr'): string {
  return isEnglishLanguage(language)
    ? 'Fraud detected — no call or transaction commission is due on this recording.'
    : 'Fraude détectée — aucune commission appel ni transaction n\'est due sur cet enregistrement.';
}

/** Titre du bandeau liste (ex. « 2 fraudes détectées »). */
export function getFraudDetectedCountLabel(count: number, language: string = 'fr'): string {
  const n = Math.max(0, Math.round(count));
  if (isEnglishLanguage(language)) {
    return n === 1 ? '1 fraud detected' : `${n} frauds detected`;
  }
  return n === 1 ? '1 fraude détectée' : `${n} fraudes détectées`;
}

/** Vente encore dans la fenêtre légale de rétractation (14j). */
export function isTransactionInRetraction(
  call: CallLike,
  ledgerTxStatus?: string | null
): boolean {
  if (ledgerTxStatus === 'pending_retraction') return true;
  if (call.transaction?.retractionStatus === 'pending') return true;
  return false;
}

export const RETRACTION_BADGE: StatusBadge = {
  label: 'Rétractation 14j',
  tone: 'bg-amber-50 text-amber-800 border-amber-200',
  title: 'Commission en période de rétractation légale (14 jours)',
};

export function formatRetractionEndsLabel(
  retractionEndsAt?: string | Date | null
): string | null {
  if (!retractionEndsAt) return null;
  const ts = new Date(retractionEndsAt).getTime();
  if (!Number.isFinite(ts)) return null;
  return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function isCallRejectedByAI(call: CallLike): boolean {
  if (isCallFraudDetected(call)) return true;
  if (call.validByAI === false || call.valid === false) return true;
  if (call.ai_call_status === 'auto_refused') return true;
  return false;
}

export function isCallApprovedByAI(call: CallLike): boolean {
  if (isCallFraudDetected(call)) return false;
  return call.validByAI === true || call.valid === true;
}

export const CALL_REJECTED_BADGE: StatusBadge = {
  label: 'Appel refusé',
  tone: 'bg-rose-50 text-rose-700 border-rose-200',
  title: 'L\'appel n\'a pas été validé par l\'IA — aucune transaction à traiter',
};

/** Vente réservée au ledger ou validée entreprise — prime sur RDV / rubriques prospect. */
export function hasBookedSaleCommission(
  call: CallLike,
  ledgerTxStatus?: string | null
): boolean {
  if (
    ledgerTxStatus === 'pending_retraction' ||
    ledgerTxStatus === 'earned' ||
    ledgerTxStatus === 'paid'
  ) {
    return true;
  }
  if (call.transaction?.validByCompany === true) return true;
  if (call.transaction?.retractionStatus === 'pending') return true;
  return false;
}

export function resolveCallDispositionStatus(
  call: CallLike,
  ledgerTxStatus?: string | null
): StatusBadge {
  if (isCallVoicemail(call)) {
    const badge = callOutcomeBadge('voicemail');
    if (badge) return { ...badge, title: 'Messagerie — aucun échange avec le prospect' };
  }

  if (isCallFraudDetected(call)) {
    const badge = callOutcomeBadge('fraud');
    if (badge) {
      return { ...badge, title: 'Fraude détectée — appel et transaction non validés' };
    }
  }

  if (hasBookedSaleCommission(call, ledgerTxStatus)) {
    const badge = callOutcomeBadge('transaction');
    if (badge) {
      return {
        ...badge,
        title: isTransactionInRetraction(call, ledgerTxStatus)
          ? 'Vente validée — en rétractation 14j'
          : 'Vente validée — commission transaction',
      };
    }
  }

  const outcome = call.callOutcome;

  if (outcome && PRIORITY_CALLOUTCOMES.has(outcome)) {
    const badge = callOutcomeBadge(outcome);
    if (badge) return { ...badge, title: `Résultat appel : ${outcome}` };
  }

  const prospect = getProspectStatusBadge(call.ai_call_score);
  if (prospect) return prospect;

  const outcomeBadge = callOutcomeBadge(outcome);
  if (outcomeBadge) {
    return { ...outcomeBadge, title: `Résultat appel : ${outcome}` };
  }

  if (call.transaction?.validByAI === false) {
    return {
      label: 'Pas de vente IA',
      tone: 'bg-slate-50 text-slate-600 border-slate-200',
      title: 'L\'IA n\'a pas détecté de transaction',
    };
  }

  return {
    label: 'En attente',
    tone: 'bg-blue-50 text-blue-600 border-blue-200',
    title: 'En attente validation entreprise',
  };
}

export function resolveUnvalidatedTransactionStatus(call: CallLike): StatusBadge {
  if (isCallVoicemail(call)) {
    const badge = callOutcomeBadge('voicemail');
    return badge
      ? { ...badge, title: 'Messagerie — aucune commission due' }
      : { label: 'Messagerie', tone: 'bg-slate-50 text-slate-600 border-slate-200', title: 'Messagerie — aucune commission due' };
  }

  if (isCallFraudDetected(call)) {
    return {
      label: 'Fraude',
      tone: 'bg-rose-100 text-rose-800 border-rose-300',
      title: 'Fraude détectée — aucune transaction validée',
    };
  }

  if (call.transaction?.validByCompany === false) {
    return {
      label: 'Call refused',
      tone: 'bg-rose-50 text-rose-700 border-rose-200',
      title: 'Décision entreprise : refusé',
    };
  }

  if (isCallRejectedByAI(call)) {
    return CALL_REJECTED_BADGE;
  }

  return resolveCallDispositionStatus(call);
}
