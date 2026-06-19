import React, { useEffect, useMemo, useState } from 'react';
import { Bot, User, Loader2, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useGigScript } from '../../copilot/hooks/useGigScript';

type ReplicaPair = { agent?: { replica?: string }; lead?: { replica?: string } };

export type ScriptReaderTheme = 'dark' | 'light';

export type ScriptCockpitPanelProps = {
  gigId: string;
  gigTitle?: string;
  theme?: ScriptReaderTheme;
  className?: string;
  onFinish?: () => void;
};

function themeClasses(theme: ScriptReaderTheme) {
  const dark = theme === 'dark';
  return {
    muted: dark ? 'text-slate-400' : 'text-slate-500',
    border: dark ? 'border-white/10' : 'border-slate-200',
    panel: dark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-200 shadow-sm',
    agentAccent: dark ? 'text-indigo-400' : 'text-indigo-600',
    agentBg: dark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600',
    leadAccent: dark ? 'text-emerald-400' : 'text-emerald-600',
    leadBg: dark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-600',
    body: dark ? 'text-slate-200' : 'text-slate-800',
    nav: dark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-200',
    btnGhost: dark
      ? 'border-white/10 text-slate-300 hover:bg-white/10 disabled:opacity-30'
      : 'border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30',
    btnPrimary: 'bg-gradient-to-r from-indigo-500 to-pink-500 text-white disabled:opacity-30',
    btnFinish: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 hover:to-teal-400',
    optionActive: dark ? 'bg-indigo-500/25 border-indigo-400' : 'bg-indigo-50 border-indigo-400',
    optionIdle: dark ? 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]' : 'bg-slate-50 border-slate-200 hover:bg-slate-100',
    phaseActive: dark ? 'bg-indigo-500/30 border-indigo-400/50 text-white' : 'bg-indigo-100 border-indigo-300 text-indigo-900',
    phaseIdle: dark ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-500',
    response: dark ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-100' : 'bg-emerald-50 border-emerald-200 text-emerald-900',
  };
}

export function ScriptCockpitPanel({
  gigId,
  gigTitle,
  theme = 'dark',
  className = '',
  onFinish,
}: ScriptCockpitPanelProps) {
  const t = themeClasses(theme);
  const { activeScript, loading: scriptLoading } = useGigScript(gigId);
  const [activePhaseIndex, setActivePhaseIndex] = useState(0);
  const [activeReplicaIndex, setActiveReplicaIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const interactiveStages = activeScript?.playbook?.stages || [];
  const hasInteractiveStages = Array.isArray(interactiveStages) && interactiveStages.length > 0;

  const scriptByPhase = useMemo(() => {
    const items = activeScript?.script || [];
    return items.reduce(
      (acc: Record<string, typeof items>, item: { phase?: string }) => {
        const phase = String(item?.phase || 'Script');
        if (!acc[phase]) acc[phase] = [];
        acc[phase].push(item);
        return acc;
      },
      {} as Record<string, typeof items>
    );
  }, [activeScript?.script]);

  const phases = Object.keys(scriptByPhase);
  const activePhase = phases[activePhaseIndex];
  const rawReplicas = activePhase ? scriptByPhase[activePhase] : [];

  const replicas = useMemo((): ReplicaPair[] => {
    const pairs: ReplicaPair[] = [];
    let i = 0;
    while (i < rawReplicas.length) {
      const current = rawReplicas[i] as { actor?: string; replica?: string };
      const isAgent =
        current.actor === 'agent' || String(current.actor || '').toLowerCase() === 'agent';
      if (isAgent) {
        const next = rawReplicas[i + 1] as { actor?: string; replica?: string } | undefined;
        const isNextLead =
          next &&
          (next.actor === 'lead' ||
            String(next.actor || '').toLowerCase() === 'lead' ||
            String(next.actor || '').toLowerCase() === 'prospect');
        if (isNextLead) {
          pairs.push({ agent: current, lead: next });
          i += 2;
        } else {
          pairs.push({ agent: current });
          i += 1;
        }
      } else {
        pairs.push({ lead: current });
        i += 1;
      }
    }
    return pairs;
  }, [rawReplicas]);

  const stepCount = hasInteractiveStages ? interactiveStages.length : replicas.length;
  const stepIndex = hasInteractiveStages ? activePhaseIndex : activeReplicaIndex;
  const isLastStep = stepCount > 0 && stepIndex >= stepCount - 1;

  useEffect(() => {
    setActivePhaseIndex(0);
    setActiveReplicaIndex(0);
  }, [gigId, activeScript?._id]);

  useEffect(() => {
    setActiveReplicaIndex(0);
    setSelectedOptionId(null);
  }, [activePhaseIndex]);

  const handleCopy = (text: string, field: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedField(field);
    window.setTimeout(() => setCopiedField(null), 2000);
  };

  const goPrev = () => {
    if (hasInteractiveStages) setActivePhaseIndex((p) => Math.max(0, p - 1));
    else setActiveReplicaIndex((p) => Math.max(0, p - 1));
  };

  const goNext = () => {
    if (hasInteractiveStages) setActivePhaseIndex((p) => Math.min(interactiveStages.length - 1, p + 1));
    else setActiveReplicaIndex((p) => Math.min(replicas.length - 1, p + 1));
  };

  if (scriptLoading) {
    return (
      <div className={`flex h-full items-center justify-center ${t.muted} ${className}`}>
        <Loader2 className={`h-7 w-7 animate-spin ${t.agentAccent}`} />
        <p className="text-xs font-bold uppercase tracking-widest ml-3">Chargement…</p>
      </div>
    );
  }

  if (!activeScript) {
    return (
      <div className={`flex h-full items-center justify-center rounded-2xl border p-8 ${t.panel} ${t.muted} ${className}`}>
        <p className="text-sm font-semibold">Aucun script actif pour ce projet.</p>
      </div>
    );
  }

  const currentStage = hasInteractiveStages ? interactiveStages[activePhaseIndex] : null;
  const currentPair = !hasInteractiveStages ? replicas[activeReplicaIndex] : null;

  const agentTitle =
    currentStage?.introTitle ||
    (activePhase && !hasInteractiveStages ? activePhase : 'Conseiller (vous)');
  const agentText = currentStage?.introReplica || currentPair?.agent?.replica || '';
  const options = currentStage?.options || [];

  return (
    <div className={`flex flex-col h-full min-h-0 gap-2 sm:gap-3 ${className}`}>
      {/* Phase pills — compact, no wrap scroll */}
      {(hasInteractiveStages && interactiveStages.length > 1) || (!hasInteractiveStages && phases.length > 1) ? (
        <div className="shrink-0 flex gap-1.5 overflow-x-auto scrollbar-none">
          {(hasInteractiveStages ? interactiveStages : phases).map((item: unknown, idx: number) => {
            const label = hasInteractiveStages
              ? String((item as { introTitle?: string }).introTitle || `Étape ${idx + 1}`)
              : String(item);
            return (
              <button
                key={`phase-${idx}`}
                type="button"
                onClick={() => (hasInteractiveStages ? setActivePhaseIndex(idx) : setActivePhaseIndex(idx))}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-wider border transition-all ${
                  idx === activePhaseIndex ? t.phaseActive : t.phaseIdle
                }`}
              >
                {label.length > 28 ? `${label.slice(0, 28)}…` : label}
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Two columns — fills remaining height, no page scroll */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {/* LEFT — Agent */}
        <section
          className={`relative flex flex-col min-h-0 rounded-2xl border p-4 pl-5 overflow-hidden ${t.panel}`}
        >
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500" />
          <div className="shrink-0 flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`p-2 rounded-lg shrink-0 ${t.agentBg}`}>
                <Bot className="w-4 h-4" />
              </div>
              <span className={`text-[9px] font-black uppercase tracking-widest truncate ${t.agentAccent}`}>
                {agentTitle}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(agentText, 'agent_replica')}
              className={`shrink-0 px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase ${t.btnGhost}`}
            >
              {copiedField === 'agent_replica' ? 'Copié' : 'Copier'}
            </button>
          </div>
          <div className={`flex-1 min-h-0 overflow-hidden ${t.body}`}>
            <p className="text-xs sm:text-sm leading-snug h-full overflow-hidden">
              {agentText}
            </p>
          </div>
        </section>

        {/* RIGHT — Prospect / options */}
        <section className={`relative flex flex-col min-h-0 rounded-2xl border p-4 overflow-hidden ${t.panel}`}>
          {hasInteractiveStages && options.length > 0 ? (
            <>
              <div className="shrink-0 flex items-center gap-2 mb-2">
                <div className={`p-2 rounded-lg shrink-0 ${t.leadBg}`}>
                  <User className="w-4 h-4" />
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest ${t.leadAccent}`}>
                  {currentStage?.optionsTitle || 'Réaction du prospect'}
                </span>
              </div>
              <div className="flex-1 min-h-0 flex flex-col gap-1.5 overflow-hidden">
                {options.map((opt: { id: string; label?: string; subtext?: string; recommendedResponse?: string }) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedOptionId(opt.id)}
                    className={`shrink-0 text-left p-2.5 rounded-xl border transition-all ${
                      selectedOptionId === opt.id ? t.optionActive : t.optionIdle
                    }`}
                  >
                    <span className={`block text-[10px] font-black leading-tight ${t.body}`}>{opt.label}</span>
                    {opt.subtext ? (
                      <span className={`block text-[9px] mt-0.5 leading-snug ${t.muted}`}>{opt.subtext}</span>
                    ) : null}
                  </button>
                ))}
                {selectedOptionId ? (
                  <div className={`mt-1 p-2.5 rounded-xl border shrink-0 ${t.response}`}>
                    <p className="text-[9px] font-black uppercase tracking-wider mb-1 opacity-80">
                      Réponse recommandée
                    </p>
                    <p className="text-[10px] sm:text-xs leading-relaxed italic">
                      {options.find((o: { id: string }) => o.id === selectedOptionId)?.recommendedResponse}
                    </p>
                  </div>
                ) : null}
              </div>
            </>
          ) : currentPair?.lead ? (
            <>
              <div className="absolute md:relative left-0 top-0 bottom-0 w-1 md:hidden bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-l-2xl" />
              <div className="shrink-0 flex items-center justify-between gap-2 mb-2 pl-2 md:pl-0">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${t.leadBg}`}>
                    <User className="w-4 h-4" />
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${t.leadAccent}`}>
                    Prospect (réponse attendue)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(currentPair.lead!.replica || '', 'lead_replica')}
                  className={`px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase ${t.btnGhost}`}
                >
                  {copiedField === 'lead_replica' ? 'Copié' : 'Copier'}
                </button>
              </div>
              <div className={`flex-1 min-h-0 overflow-hidden ${t.body}`}>
                <p className="text-xs sm:text-sm leading-snug h-full overflow-hidden">
                  {currentPair.lead.replica}
                </p>
              </div>
            </>
          ) : (
            <div className={`flex-1 flex items-center justify-center text-center px-4 ${t.muted}`}>
              <p className="text-xs font-semibold">
                {hasInteractiveStages
                  ? 'Sélectionnez une réaction prospect à gauche.'
                  : 'Pas de réplique prospect pour cette étape.'}
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Navigation — fixed height */}
      {stepCount > 0 ? (
        <nav
          className={`shrink-0 flex items-center justify-between gap-2 rounded-xl border px-3 py-2 ${t.nav}`}
        >
          <button
            type="button"
            disabled={stepIndex === 0}
            onClick={goPrev}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase ${t.btnGhost}`}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Précédent
          </button>
          <span className={`text-[9px] font-extrabold uppercase tracking-wider text-center ${t.muted}`}>
            {isLastStep ? (
              <>
                <span className={theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}>
                  Dernière étape
                </span>
                <span className="mx-1 opacity-50">·</span>
                {stepIndex + 1} / {stepCount}
              </>
            ) : (
              <>Étape {stepIndex + 1} / {stepCount}</>
            )}
          </span>
          {isLastStep ? (
            <button
              type="button"
              onClick={() => onFinish?.()}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase shadow-lg shadow-emerald-500/20 ${t.btnFinish}`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Terminer
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase ${t.btnPrimary}`}
            >
              Suivant
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </nav>
      ) : null}
    </div>
  );
}
