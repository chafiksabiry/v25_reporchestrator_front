import React, { useEffect, useMemo, useState } from 'react';
import { Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { useGigScript } from '../../copilot/hooks/useGigScript';

type ReplicaPair = { agent?: { replica?: string }; lead?: { replica?: string } };

export type ScriptCockpitPanelProps = {
  gigId: string;
  gigTitle?: string;
  className?: string;
};

export function ScriptCockpitPanel({ gigId, gigTitle, className = '' }: ScriptCockpitPanelProps) {
  const { activeScript, loading: scriptLoading } = useGigScript(gigId);
  const [activePhaseIndex, setActivePhaseIndex] = useState(0);
  const [activeReplicaIndex, setActiveReplicaIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
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

  if (scriptLoading) {
    return (
      <div className={`flex flex-col items-center justify-center py-20 text-slate-400 ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400 mb-3" />
        <p className="text-xs font-bold uppercase tracking-widest">Chargement du script…</p>
      </div>
    );
  }

  if (!activeScript) {
    return (
      <div className={`rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-slate-400 ${className}`}>
        <p className="text-sm font-semibold">Aucun script actif pour ce projet.</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping shrink-0" />
          <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">
            Script d&apos;appel
          </span>
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider truncate">
            • {gigTitle || activeScript.targetClient || 'Guide de conversation'}
          </span>
        </div>
      </div>

      {activeScript.details?.trim() ? (
        <p className="text-sm text-slate-300 leading-relaxed text-left whitespace-pre-wrap border border-white/5 rounded-xl p-4 bg-white/[0.02]">
          {activeScript.details.trim()}
        </p>
      ) : null}

      {!hasInteractiveStages && phases.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {phases.map((phase, idx) => (
            <button
              key={phase}
              type="button"
              onClick={() => setActivePhaseIndex(idx)}
              className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                idx === activePhaseIndex
                  ? 'bg-indigo-500/30 border-indigo-400/50 text-white'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              {phase}
            </button>
          ))}
        </div>
      ) : null}

      {hasInteractiveStages ? (
        (() => {
          const currentStage = interactiveStages[activePhaseIndex];
          if (!currentStage) return null;
          return (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-5">
                <div className="relative overflow-hidden rounded-[1.25rem] border p-5 pl-7 bg-white/[0.02] border-white/5">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500 opacity-80" />
                  <div className="flex gap-4 items-start">
                    <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">
                          {currentStage.introTitle || 'CONSEILLER (VOUS)'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(currentStage.introReplica || '', 'agent_replica')}
                          className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[8px] font-black uppercase text-slate-400"
                        >
                          {copiedField === 'agent_replica' ? 'Copié' : 'Copier'}
                        </button>
                      </div>
                      <p className="text-sm leading-relaxed text-slate-200">{currentStage.introReplica}</p>
                    </div>
                  </div>
                </div>

                {currentStage.options?.length > 0 ? (
                  <div className="space-y-2 text-left">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      {currentStage.optionsTitle || 'Gérer la réaction du prospect'}
                    </span>
                    <div className="grid gap-1.5">
                      {currentStage.options.map((opt: { id: string; label?: string; subtext?: string; recommendedResponse?: string }) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedOptionId(opt.id)}
                          className={`p-3 rounded-2xl border text-left ${
                            selectedOptionId === opt.id
                              ? 'bg-indigo-500/20 border-indigo-400'
                              : 'bg-white/[0.03] border-white/5'
                          }`}
                        >
                          <span className="text-[10px] font-black text-slate-100">{opt.label}</span>
                          {opt.subtext ? (
                            <span className="block text-[9px] text-slate-400 mt-0.5">{opt.subtext}</span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                    {selectedOptionId ? (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-left">
                        <p className="text-[10px] text-emerald-100 italic">
                          {currentStage.options.find((o: { id: string }) => o.id === selectedOptionId)?.recommendedResponse}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={activePhaseIndex === 0}
                  onClick={() => setActivePhaseIndex((p) => Math.max(0, p - 1))}
                  className="px-4 py-2 rounded-xl text-[9px] font-black uppercase text-slate-300 disabled:opacity-30 border border-white/10"
                >
                  ← Précédent
                </button>
                <span className="text-[9px] text-slate-400 font-extrabold uppercase">
                  Étape {activePhaseIndex + 1} / {interactiveStages.length}
                </span>
                <button
                  type="button"
                  disabled={activePhaseIndex >= interactiveStages.length - 1}
                  onClick={() => setActivePhaseIndex((p) => Math.min(interactiveStages.length - 1, p + 1))}
                  className="px-4 py-2 rounded-xl text-[9px] font-black uppercase text-white bg-gradient-to-r from-indigo-500 to-pink-500 disabled:opacity-30"
                >
                  Suivant →
                </button>
              </div>
            </div>
          );
        })()
      ) : replicas.length > 0 ? (
        (() => {
          const currentPair = replicas[activeReplicaIndex];
          if (!currentPair) return null;
          return (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-5">
                {currentPair.agent ? (
                  <div className="relative overflow-hidden rounded-[1.25rem] border p-5 pl-7 bg-white/[0.02] border-white/5">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500" />
                    <div className="flex gap-4 items-start">
                      <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300">
                        <Bot className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">
                            Conseiller (vous)
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(currentPair.agent!.replica || '', 'agent_replica')}
                            className="text-[8px] font-black uppercase text-slate-400"
                          >
                            {copiedField === 'agent_replica' ? 'Copié' : 'Copier'}
                          </button>
                        </div>
                        <p className="text-sm leading-relaxed text-slate-200">{currentPair.agent.replica}</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {currentPair.lead ? (
                  <div className="relative overflow-hidden rounded-[1.25rem] border p-5 pl-7 bg-white/[0.02] border-white/5">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-emerald-600" />
                    <div className="flex gap-4 items-start">
                      <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">
                            Prospect (réponse attendue)
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(currentPair.lead!.replica || '', 'lead_replica')}
                            className="text-[8px] font-black uppercase text-slate-400"
                          >
                            {copiedField === 'lead_replica' ? 'Copié' : 'Copier'}
                          </button>
                        </div>
                        <p className="text-sm leading-relaxed text-slate-200">{currentPair.lead.replica}</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={activeReplicaIndex === 0}
                  onClick={() => setActiveReplicaIndex((p) => Math.max(0, p - 1))}
                  className="px-4 py-2 rounded-xl text-[9px] font-black uppercase text-slate-300 disabled:opacity-30 border border-white/10"
                >
                  ← Précédent
                </button>
                <span className="text-[9px] text-slate-400 font-extrabold uppercase">
                  Conversation {activeReplicaIndex + 1} / {replicas.length}
                  {activePhase ? ` • ${activePhase}` : ''}
                </span>
                <button
                  type="button"
                  disabled={activeReplicaIndex >= replicas.length - 1}
                  onClick={() => setActiveReplicaIndex((p) => Math.min(replicas.length - 1, p + 1))}
                  className="px-4 py-2 rounded-xl text-[9px] font-black uppercase text-white bg-gradient-to-r from-indigo-500 to-pink-500 disabled:opacity-30"
                >
                  Suivant →
                </button>
              </div>
            </div>
          );
        })()
      ) : (
        <p className="text-sm text-slate-400 text-center py-8">Script sans répliques configurées.</p>
      )}
    </div>
  );
}
