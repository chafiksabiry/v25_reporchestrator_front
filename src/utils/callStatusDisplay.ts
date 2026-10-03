export interface StatusBadge {
  label: string;
  tone: string;
  title?: string;
}

/** Official HARX disposition ladder (only labels allowed as call status). */
export const HARX_LADDER: Record<string, StatusBadge> = {
  to_call: {
    label: 'À appeler',
    tone: 'bg-slate-50 text-slate-600 border-slate-200',
  },
  called_unreachable: {
    label: 'Appelé – Injoignable',
    tone: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  called_voicemail: {
    label: 'Appelé – Répondeur',
    tone: 'bg-orange-50 text-orange-700 border-orange-200',
    title: 'Twilio/Telnyx AMD → Appelé – Répondeur',
  },
  called_wrong_number: {
    label: 'Appelé – Numéro non attribué',
    tone: 'bg-rose-50 text-rose-700 border-rose-200',
    title: 'Twilio/Telnyx Failed → Appelé – Numéro non attribué',
  },
  called_callback: {
    label: 'Appelé – Souhaite être rappelé',
    tone: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  called_rdv: {
    label: 'Appelé – RDV pris pour rappel',
    tone: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  argued_rdv: {
    label: 'Appel argumenté – RDV pris / délai de réflexion',
    tone: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  argued_declined: {
    label: 'Appel argumenté – Transaction déclinée',
    tone: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  argued_done: {
    label: 'Appel argumenté – Transaction aboutie',
    tone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
};

export function callOutcomeBadge(outcome: string | null | undefined): StatusBadge | null {
  if (!outcome) return null;
  const map: Record<string, StatusBadge> = {
    // Twilio / Telnyx telephony → HARX ladder
    voicemail: { ...HARX_LADDER.called_voicemail, title: 'Twilio/Telnyx AMD / répondeur' },
    busy: { ...HARX_LADDER.called_unreachable, title: 'Twilio/Telnyx Busy' },
    no_answer: { ...HARX_LADDER.called_unreachable, title: 'Twilio/Telnyx No-Answer' },
    wrong_number: { ...HARX_LADDER.called_wrong_number, title: 'Twilio/Telnyx Failed' },
    callback_requested: { ...HARX_LADDER.called_callback },
    appointment: { ...HARX_LADDER.called_rdv },
    transaction: { ...HARX_LADDER.argued_done },
    argued_interested: { ...HARX_LADDER.argued_rdv },
    refusal: { ...HARX_LADDER.argued_declined },
    not_interested: { ...HARX_LADDER.argued_declined },
    already_equipped: { ...HARX_LADDER.argued_declined },
    fraud: { label: 'Fraude', tone: 'bg-rose-100 text-rose-800 border-rose-300' },
    // Legacy too_short → ladder only (never « Trop court » / « Sans suite » / « Non validé »)
    too_short: { ...HARX_LADDER.called_unreachable },
    connected_no_sale: { ...HARX_LADDER.called_unreachable },
  };
  return map[outcome] || HARX_LADDER.called_unreachable;
}

const PROSPECT_RUBRICS: Array<{ key: string; label: string; tone: string; legacyKeys?: string[] }> = [
  { key: 'called_unreachable', label: HARX_LADDER.called_unreachable.label, tone: HARX_LADDER.called_unreachable.tone },
  { key: 'called_voicemail', label: HARX_LADDER.called_voicemail.label, tone: HARX_LADDER.called_voicemail.tone },
  {
    key: 'called_wrong_number',
    label: HARX_LADDER.called_wrong_number.label,
    tone: HARX_LADDER.called_wrong_number.tone,
    legacyKeys: ['PAS AU COURANT'],
  },
  {
    key: 'called_callback',
    label: HARX_LADDER.called_callback.label,
    tone: HARX_LADDER.called_callback.tone,
    legacyKeys: ['A plus tard'],
  },
  { key: 'called_rdv', label: HARX_LADDER.called_rdv.label, tone: HARX_LADDER.called_rdv.tone },
  {
    key: 'argued_rdv',
    label: HARX_LADDER.argued_rdv.label,
    tone: HARX_LADDER.argued_rdv.tone,
    legacyKeys: ['RDV'],
  },
  {
    key: 'argued_declined',
    label: HARX_LADDER.argued_declined.label,
    tone: HARX_LADDER.argued_declined.tone,
    legacyKeys: ['PAS INTÉRESSÉS', 'DÉJÀ ÉQUIPÉS'],
  },
  { key: 'argued_done', label: HARX_LADDER.argued_done.label, tone: HARX_LADDER.argued_done.tone },
];

export function getProspectStatusBadge(
  aiCallScore?: Record<string, { passed?: boolean; score?: number }> | null
): StatusBadge | null {
  if (!aiCallScore) return null;

  const fraudScore = aiCallScore['Fraud detection']?.score;
  if (typeof fraudScore === 'number' && fraudScore < 50) return null;

  let best: { rubric: typeof PROSPECT_RUBRICS[number]; score: number } | null = null;

  for (const rubric of PROSPECT_RUBRICS) {
    const keys = [rubric.key, ...(rubric.legacyKeys || [])];
    for (const key of keys) {
      const metric = aiCallScore[key];
      if (!metric) continue;
      const passed = typeof metric.passed === 'boolean' ? metric.passed : (metric.score ?? 0) >= 50;
      if (!passed) continue;
      const score = metric.score ?? 0;
      if (!best || score >= best.score) {
        best = { rubric, score };
      }
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
  'connected_no_sale',
]);

/** Twilio / post-analysis badge when callOutcome is missing or legacy `too_short`. */
export function resolveTwilioOrPostAnalysisBadge(call: CallLike): StatusBadge {
  if (isCallVoicemail(call)) {
    const badge = callOutcomeBadge('voicemail');
    return badge
      ? { ...badge, title: 'Répondeur — aucun échange avec le prospect' }
      : { label: 'Appelé – Répondeur', tone: 'bg-orange-50 text-orange-700 border-orange-200' };
  }

  const status = String(call.status || '').toLowerCase();
  if (status === 'busy') {
    return callOutcomeBadge('busy') || { label: 'Appelé – Injoignable', tone: 'bg-slate-50 text-slate-600 border-slate-200' };
  }
  if (['no-answer', 'noanswer', 'canceled', 'cancelled'].includes(status)) {
    return callOutcomeBadge('no_answer') || { label: 'Appelé – Injoignable', tone: 'bg-slate-50 text-slate-600 border-slate-200' };
  }
  if (status === 'failed') {
    return callOutcomeBadge('wrong_number') || { label: 'Appelé – Numéro non attribué', tone: 'bg-rose-50 text-rose-700 border-rose-200' };
  }

  const outcome = String(call.callOutcome || '').toLowerCase();
  if (outcome && outcome !== 'too_short') {
    const badge = callOutcomeBadge(outcome);
    if (badge) return { ...badge, title: `Résultat appel : ${outcome}` };
  }

  // Never surface « Terminé / Sans suite / Non validé » — stick to the ladder.
  return {
    ...HARX_LADDER.called_unreachable,
    title: 'Aucun échange commercial exploitable → Appelé – Injoignable',
  };
}

export type CallLike = {
  validByAI?: boolean | null;
  valid?: boolean | null;
  duration?: number | null;
  status?: string | null;
  ai_call_status?: string | null;
  callOutcome?: string | null;
  ai_summary?: string | null;
  ai_summary_fr?: string | null;
  ai_summary_en?: string | null;
  flags?: { fraud?: boolean; selfCall?: boolean; transactionDetected?: boolean };
  ai_call_score?: Record<string, { passed?: boolean; score?: number; feedback?: string; feedback_fr?: string; feedback_en?: string }> | null;
  lead?: { Stage?: string; status?: string; nextAction?: string; repDisposition?: string | null } | null;
  /** Twilio AMD: human | machine_start | machine_end_beep | fax | unknown */
  answeredBy?: string | null;
  transaction?: {
    validByCompany?: boolean | null;
    validByAI?: boolean | null;
    retractionStatus?: string | null;
    retractionEndsAt?: string | Date | null;
  } | null;
};

const VOICEMAIL_REGEX =
  /messagerie|messagerie\s+(vocale|automatique)|r[ée]pondeur|laissez\s+(votre|un)\s+message|bo[îi]te\s+vocale|voicemail|answering\s+machine|leave\s+(a|your)\s+message|after\s+(the\s+)?(tone|beep)|appel\s+non\s+productif|non\s+productif|aucun(?:e)?\s+(?:interaction|[ée]change)|aucun\s+(?:él|el)[ée]ment\s+exploitable|n['']?est\s+pas\s+disponible|votre\s+correspondant|tombe?\s+(?:imm[ée]diatement\s+)?sur\s+la?\s?messagerie|redirig[ée]\s+vers\s+la?\s?messagerie/i;

function isMachineAnswer(call: CallLike): boolean {
  const answeredBy = String(call.answeredBy || '').toLowerCase();
  if (answeredBy.startsWith('machine') || answeredBy === 'fax' || answeredBy.includes('amd')) {
    return true;
  }
  // Telnyx AMD / answering machine hints on status or outcome
  const status = String(call.status || '').toLowerCase();
  const outcome = String(call.callOutcome || '').toLowerCase();
  return (
    status.includes('machine') ||
    status.includes('amd') ||
    outcome.includes('machine') ||
    outcome === 'answering_machine' ||
    outcome === 'amd'
  );
}

/**
 * Twilio / Telnyx lifecycle → HARX ladder only.
 * Never returns « Terminé », « Non validé », « Trop court », etc.
 */
export function twilioCallStatusBadge(status?: string | null): StatusBadge {
  const key = String(status || '').toLowerCase();
  if (['queued', 'initiated', 'ringing', 'in-progress', 'active', 'bridging'].includes(key)) {
    return { ...HARX_LADDER.to_call, title: `Twilio/Telnyx ${key} → À appeler` };
  }
  if (key === 'busy' || key === 'no-answer' || key === 'noanswer' || key === 'canceled' || key === 'cancelled') {
    return {
      ...HARX_LADDER.called_unreachable,
      title: `Twilio/Telnyx ${key} → Appelé – Injoignable`,
    };
  }
  if (key === 'failed') {
    return {
      ...HARX_LADDER.called_wrong_number,
      title: 'Twilio/Telnyx Failed → Appelé – Numéro non attribué',
    };
  }
  if (key === 'completed' || key === 'hangup') {
    // Completed alone is not a commercial status — never show « Terminé ».
    return {
      ...HARX_LADDER.called_unreachable,
      title: 'Appel terminé côté opérateur — statut commercial à préciser',
    };
  }
  return { ...HARX_LADDER.called_unreachable, title: status || undefined };
}

/**
 * Single user-facing call status: always one of the 9 HARX ladder labels.
 * Maps Twilio/Telnyx AMD → Appelé – Répondeur, Busy/No-Answer → Appelé – Injoignable.
 */
export function resolveHarxLadderStatusBadge(
  call: CallLike,
  ledgerTxStatus?: string | null
): StatusBadge {
  if (isCallVoicemail(call)) {
    return {
      ...HARX_LADDER.called_voicemail,
      title: 'AMD / répondeur — aucun échange avec le prospect',
    };
  }

  const stored = String(call.lead?.repDisposition || '').trim();
  if (stored && HARX_LADDER[stored]) {
    return { ...HARX_LADDER[stored], title: `Disposition : ${stored}` };
  }

  const hist = historyDisposition(call);
  if (hist && HARX_LADDER[hist]) {
    return { ...HARX_LADDER[hist] };
  }

  if (hasBookedSaleCommission(call, ledgerTxStatus)) {
    return { ...HARX_LADDER.argued_done };
  }

  const prospect = getProspectStatusBadge(call.ai_call_score);
  if (prospect) return prospect;

  const outcome = String(call.callOutcome || '').toLowerCase();
  if (outcome === 'transaction') return { ...HARX_LADDER.argued_done };
  if (outcome === 'argued_interested') return { ...HARX_LADDER.argued_rdv };
  if (['refusal', 'not_interested', 'already_equipped'].includes(outcome)) {
    return { ...HARX_LADDER.argued_declined };
  }
  if (outcome === 'callback_requested') return { ...HARX_LADDER.called_callback };
  if (outcome === 'appointment') return { ...HARX_LADDER.called_rdv };
  if (outcome === 'wrong_number') return { ...HARX_LADDER.called_wrong_number };
  if (outcome === 'voicemail') return { ...HARX_LADDER.called_voicemail };
  if (outcome === 'busy' || outcome === 'no_answer' || outcome === 'too_short' || outcome === 'connected_no_sale') {
    return { ...HARX_LADDER.called_unreachable };
  }

  return resolveTwilioOrPostAnalysisBadge(call);
}

export function isCallVoicemail(call: CallLike): boolean {
  if (call.callOutcome === 'voicemail') return true;
  if (isMachineAnswer(call)) return true;
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
    ? 'Voicemail — no exchange with the prospect. No commission is due.'
    : 'Messagerie — aucun échange avec le prospect. Aucune commission n\'est due.';
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

/** Messagerie or fraude — hide per-rubric cards; executive summary still shown. */
export function isNonEvaluableCall(call: CallLike): boolean {
  return isCallVoicemail(call) || isCallFraudDetected(call);
}

/** Minimum billable duration (seconds) before AI analysis is allowed. */
export const MIN_CALL_ANALYSIS_SECONDS = 30;

/** True when the call is too short for a reliable commercial AI audit. */
export function isCallTooShortForAnalysis(call: Pick<CallLike, 'duration' | 'ai_call_status'>): boolean {
  if (call.ai_call_status === 'too_short') return true;
  const duration = Number((call as any).duration);
  return Number.isFinite(duration) && duration > 0 && duration < MIN_CALL_ANALYSIS_SECONDS;
}

/** HARX ladder value for a stored call, used by the history status filter. */
export function historyDisposition(call: CallLike): string | null {
  if (isCallVoicemail(call)) return 'called_voicemail';
  const outcome = String(call.callOutcome || '').toLowerCase();
  const status = String(call.status || '').toLowerCase();
  if (
    outcome === 'voicemail' ||
    outcome === 'amd' ||
    outcome === 'answering_machine' ||
    status.includes('amd') ||
    status.includes('machine')
  ) {
    return 'called_voicemail';
  }
  if (outcome === 'wrong_number' || status === 'failed') return 'called_wrong_number';
  if (
    outcome === 'no_answer' ||
    outcome === 'busy' ||
    outcome === 'too_short' ||
    outcome === 'connected_no_sale' ||
    ['no-answer', 'noanswer', 'busy', 'canceled', 'cancelled'].includes(status)
  ) {
    return 'called_unreachable';
  }
  if (outcome === 'callback_requested') return 'called_callback';
  if (outcome === 'appointment') return 'called_rdv';
  if (outcome === 'argued_interested') return 'argued_rdv';
  if (outcome === 'transaction') return 'argued_done';
  if (['refusal', 'not_interested', 'already_equipped'].includes(outcome)) return 'argued_declined';
  const stored = String(call.lead?.repDisposition || '').trim();
  if (stored && HARX_LADDER[stored]) return stored;
  return null;
}

/** History status dropdown — ladder ids only. */
export function callMatchesHistoryStatus(call: CallLike, filter: string): boolean {
  if (!filter || filter === 'all') return true;
  if (filter === 'called_voicemail' || filter === 'voicemail') return isCallVoicemail(call);
  const hist = historyDisposition(call);
  if (hist === filter) return true;
  // Fallback: compare resolved ladder badge key by label
  const badge = resolveHarxLadderStatusBadge(call);
  const entry = Object.entries(HARX_LADDER).find(([, v]) => v.label === badge.label);
  return entry?.[0] === filter;
}

const SCORE_RUBRIC_KEYS = [
  'Agent fluency',
  'Sentiment analysis',
  'Fraud detection',
  'Script coherence',
  'Argumentation',
  'Script adherence',
];

/** Hover bubble: why the AI assigned this score (evidence only, no invention). */
export function getScoreDecisionTooltip(call: CallLike, language: string = 'fr'): string {
  const isEn = String(language || '').toLowerCase().startsWith('en');
  const lines: string[] = [];
  const score = call.ai_call_score?.overall?.score;
  if (typeof score === 'number') {
    lines.push(
      isEn
        ? `Overall score ${score}% based only on recorded evidence.`
        : `Score global ${score}% calculé uniquement sur les preuves enregistrées.`
    );
  }
  const duration = Number((call as any).duration);
  if (Number.isFinite(duration) && duration > 0) {
    lines.push(
      isEn ? `Call duration: ${Math.round(duration)}s.` : `Durée de l’appel : ${Math.round(duration)}s.`
    );
  }
  const bits = SCORE_RUBRIC_KEYS.map((key) => {
    const metric = call.ai_call_score?.[key];
    return typeof metric?.score === 'number' ? `${key}: ${metric.score}%` : null;
  }).filter(Boolean);
  if (bits.length) {
    lines.push(isEn ? `Rubrics: ${bits.join(' · ')}` : `Critères : ${bits.join(' · ')}`);
  }
  const feedback = isEn
    ? call.ai_call_score?.overall?.feedback_en || call.ai_call_score?.overall?.feedback || ''
    : call.ai_call_score?.overall?.feedback_fr || call.ai_call_score?.overall?.feedback || '';
  if (String(feedback).trim()) lines.push(String(feedback).trim().slice(0, 280));
  lines.push(
    isEn
      ? 'The AI must not invent facts that are absent from the transcript.'
      : 'L’IA ne doit pas inventer de faits absents de la transcription.'
  );
  return lines.join('\n');
}

export function getTooShortAnalysisNotice(language: string = 'fr', durationSec?: number): string {
  const d =
    typeof durationSec === 'number' && Number.isFinite(durationSec) && durationSec > 0
      ? ` (${Math.round(durationSec)}s)`
      : '';
  return language.toLowerCase().startsWith('en')
    ? `Call too short${d} — the transcript is kept. QA analysis only runs for calls over ${MIN_CALL_ANALYSIS_SECONDS} seconds.`
    : `Appel trop court${d} — la retranscription est conservée. L’analyse QA ne se lance qu’au-delà de ${MIN_CALL_ANALYSIS_SECONDS} secondes.`;
}

const UNSCORED_OUTCOMES = new Set([
  'voicemail',
  'no_answer',
  'busy',
  'wrong_number',
  'callback_requested',
  'appointment',
  'too_short',
]);

const UNSCORED_STATUS_HINTS = [
  'a appeler',
  'à appeler',
  'to call',
  'injoignable',
  'unreachable',
  'répondeur',
  'repondeur',
  'voicemail',
  'numéro non attribué',
  'numero non attribue',
  'wrong number',
  'souhaite être rappelé',
  'souhaite etre rappele',
  'rdv pris pour rappel',
];

/** No scoring: < 1 min, or prospect statuses that are not a real commercial exchange. */
export function shouldHideCallScoring(call: CallLike): boolean {
  if (isCallTooShortForAnalysis(call)) return true;
  if (isNonEvaluableCall(call)) return true;
  const outcome = String(call.callOutcome || '').toLowerCase();
  if (UNSCORED_OUTCOMES.has(outcome)) return true;
  const twilio = String(call.status || '').toLowerCase();
  if (['no-answer', 'noanswer', 'busy', 'canceled', 'cancelled', 'failed'].includes(twilio)) {
    return true;
  }
  const leadBlob = `${call.lead?.Stage || ''} ${call.lead?.status || ''} ${call.lead?.nextAction || ''}`.toLowerCase();
  return UNSCORED_STATUS_HINTS.some((hint) => leadBlob.includes(hint));
}

export function anonymizePhone(raw?: string | null): string {
  const s = String(raw || '').trim();
  if (!s) return '';
  const digits = s.replace(/\D/g, '');
  if (digits.length < 4) return '••••';
  const prefix = s.trim().startsWith('+') ? '+' : '';
  return `${prefix}${digits.slice(0, 2)}••••${digits.slice(-2)}`;
}

export function anonymizeEmail(raw?: string | null): string {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (!s.includes('@')) return `${s.slice(0, 1)}••••`;
  const [user, domain] = s.split('@');
  const tld = domain.split('.').pop() || 'com';
  return `${(user[0] || '•').toLowerCase()}••••@••••.${tld}`;
}

/** Street and postal code stay hidden. The city can still be shown by the caller. */
export function anonymizeStreet(raw?: string | null): string {
  const s = String(raw || '').trim();
  return s ? '••••' : '';
}

/** Birth date keeps only the year. */
export function anonymizeBirthDate(raw?: string | null): string {
  const s = String(raw || '').trim();
  if (!s) return '';
  const year = s.match(/(19|20)\d{2}/);
  return year ? `••/••/${year[0]}` : '••/••/••••';
}

export function anonymizePersonName(raw?: string | null): string {
  const s = String(raw || '').trim();
  if (!s) return 'Prospect';
  return s
    .split(/\s+/)
    .map((part) => `${(part[0] || '').toUpperCase()}••••`)
    .join(' ');
}

export type CoachingKind = 'excellent' | 'critical' | null;

export function resolveCallCoaching(call: CallLike): CoachingKind {
  const score = getDisplayOverallScore(call);
  if (score == null) return null;
  if (score >= 85) return 'excellent';
  if (score <= 35) return 'critical';
  return null;
}

/** Display score: hidden for short / non-commercial statuses and voicemail/fraud. */
export function getDisplayOverallScore(call: CallLike): number | null {
  if (shouldHideCallScoring(call)) return null;
  const raw = call.ai_call_score?.overall?.score;
  return typeof raw === 'number' ? raw : null;
}

/** Score shown on the executive summary card (hidden / 0 when scoring is disabled). */
export function getExecutiveSummaryScore(call: CallLike): number {
  if (shouldHideCallScoring(call)) return 0;
  const raw = call.ai_call_score?.overall?.score;
  return typeof raw === 'number' ? raw : 0;
}

export function getExecutiveSummaryText(call: CallLike, language: string = 'fr'): string {
  const isEn = String(language || '').toLowerCase().startsWith('en');
  if (isCallVoicemail(call)) return getVoicemailCallNotice(language);
  if (isCallFraudDetected(call)) {
    const fromOverall = isEn
      ? (call.ai_call_score?.overall?.feedback_en || call.ai_call_score?.overall?.feedback || '')
      : (call.ai_call_score?.overall?.feedback_fr || call.ai_call_score?.overall?.feedback || '');
    if (fromOverall.trim()) return fromOverall;
    return getFraudCommissionNotice(language);
  }
  const fromSummary = isEn
    ? (call.ai_summary_en || call.ai_summary || '')
    : (call.ai_summary_fr || call.ai_summary || '');
  if (fromSummary.trim()) return fromSummary;
  return isEn
    ? (call.ai_call_score?.overall?.feedback_en || call.ai_call_score?.overall?.feedback || '')
    : (call.ai_call_score?.overall?.feedback_fr || call.ai_call_score?.overall?.feedback || '');
}

export function hasAiCallAnalysis(call: CallLike): boolean {
  if (isCallTooShortForAnalysis(call)) return false;
  if (typeof call.ai_call_score?.overall?.score === 'number') return true;
  const overall = call.ai_call_score?.overall;
  if (overall?.feedback || overall?.feedback_fr || overall?.feedback_en) return true;
  if (call.ai_summary || call.ai_summary_fr || call.ai_summary_en) return true;
  return isNonEvaluableCall(call);
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
    | {
        distinctVoices?: number;
        sameSpeakerSuspected?: boolean;
        fraudReason?: string;
        confidence?: number;
      }
    | undefined;
  if (!voiceAnalysis) return typeof fraudScore === 'number' && fraudScore < 50;

  const reason = String(voiceAnalysis.fraudReason || '');
  if (['single_speaker_ai', 'same_voice_ai', 'transcript_no_customer', 'transcript_customer_absent'].includes(reason)) {
    return true;
  }

  const confidence = typeof voiceAnalysis.confidence === 'number' ? voiceAnalysis.confidence : 0;
  if (voiceAnalysis.distinctVoices === 1 && confidence >= 75) return true;
  if (voiceAnalysis.sameSpeakerSuspected === true && confidence >= 75) return true;
  return false;
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
  // Always the official HARX ladder — never Terminé / Non validé / Trop court / En attente.
  return resolveHarxLadderStatusBadge(call, ledgerTxStatus);
}

export function resolveUnvalidatedTransactionStatus(call: CallLike): StatusBadge {
  if (isCallFraudDetected(call)) {
    return {
      label: 'Fraude',
      tone: 'bg-rose-100 text-rose-800 border-rose-300',
      title: 'Fraude détectée — aucune transaction validée',
    };
  }

  // Stale inconsistency: call is AI-valid but transaction still carries an old
  // AI auto-reject (validByAI=false + validByCompany=false). Ignore it and
  // fall through to disposition — company "Not signed" keeps validByAI null/true.
  const staleAiAutoReject =
    call.validByAI === true &&
    call.transaction?.validByAI === false &&
    call.transaction?.validByCompany === false;

  if (call.transaction?.validByCompany === false && !staleAiAutoReject) {
    return {
      ...HARX_LADDER.argued_declined,
      title: 'Décision entreprise : transaction déclinée',
    };
  }

  // Never « Non validé » — show the same HARX ladder status as the call.
  return resolveHarxLadderStatusBadge(call);
}
