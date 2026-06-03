import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useAgent } from '../../contexts/AgentContext';
import { useLead } from '../../hooks/useLead';
import { useGigScript } from '../../hooks/useGigScript';
import { 
  Globe, 
  X, 
  ExternalLink, 
  Copy, 
  Check, 
  RefreshCw, 
  ShieldAlert,
  Search,
  Sparkles,
  Bot,
  User,
  Mic,
  MicOff,
  PhoneOff
} from 'lucide-react';

export function IframeWorkspace() {
  const { state, dispatch } = useAgent();
  const activeContact = state.callState?.contact;
  const location = useLocation();

  // Fetch script details dynamically based on URL lead and gig
  const searchParams = new URLSearchParams(location.search);
  const leadId = searchParams.get('leadId') || sessionStorage.getItem('activeLeadId');
  const urlGigId = searchParams.get('gigId') || sessionStorage.getItem('activeGigId');
  const { lead: apiLead } = useLead(leadId);
  const gig = apiLead?.gigId;
  
  const resolvedGigId = urlGigId || (typeof gig === 'string' ? gig : gig?._id);
  const { scripts, activeScript, loading: scriptLoading } = useGigScript(resolvedGigId);

  const isOpen = state.isIframeOpen;
  const setIsOpen = (val: boolean) => dispatch({ type: 'TOGGLE_IFRAME', payload: val });

  const [activeTab, setActiveTab] = useState<'oggodata' | 'zoho' | 'custom'>('oggodata');
  const [customUrl, setCustomUrl] = useState('https://www.oggodata.com/');
  const [currentIframeUrl, setCurrentIframeUrl] = useState('https://www.oggodata.com/');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);

  // Active script iframe selection (when playbook.iframes is populated)
  const [activeScriptIframeIdx, setActiveScriptIframeIdx] = useState(0);

  // Normalized list of iframes coming from the active script's playbook.
  // Falls back to an empty array so consumers can safely use `.length`.
  const scriptIframes = useMemo(() => {
    const raw = activeScript?.playbook?.iframes;
    if (!Array.isArray(raw)) return [] as Array<{ id?: string; label?: string; url: string }>;
    return raw
      .filter((it: any) => it && typeof it.url === 'string' && it.url.trim().length > 0)
      .map((it: any, idx: number) => ({
        id: it.id || `script-iframe-${idx}`,
        label: (it.label && String(it.label).trim()) || `Lien ${idx + 1}`,
        url: String(it.url).trim()
      }));
  }, [activeScript]);

  const hasScriptIframes = scriptIframes.length > 0;
  const hasMultipleScriptIframes = scriptIframes.length > 1;

  // Reset the active script iframe when the underlying script changes
  useEffect(() => {
    setActiveScriptIframeIdx(0);
  }, [activeScript?._id]);

  // Script visibility state
  const [showScript, setShowScript] = useState(true);

  // Phase pagination state
  const [activePhaseIndex, setActivePhaseIndex] = useState(0);

  // Active replica index inside the active phase
  const [activeReplicaIndex, setActiveReplicaIndex] = useState(0);

  // Support for interactive cockpit stages schema
  const interactiveStages = activeScript?.playbook?.stages || [];
  const hasInteractiveStages = Array.isArray(interactiveStages) && interactiveStages.length > 0;

  // Interactive UI States for objection options & checklist
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  // Reset interactive states when changing phase
  useEffect(() => {
    setSelectedOptionId(null);
  }, [activePhaseIndex]);

  // Group script by phase
  const scriptByPhase = activeScript?.script?.reduce((acc: any, item: any) => {
    if (!acc[item.phase]) acc[item.phase] = [];
    acc[item.phase].push(item);
    return acc;
  }, {} as Record<string, any[]>) || {};

  const phases = Object.keys(scriptByPhase);
  const activePhase = phases[activePhaseIndex];
  const rawReplicas = activePhase ? scriptByPhase[activePhase] : [];

  // Group flat replicas of the phase into Agent-Lead pairs
  const replicas = useMemo(() => {
    const pairs: { agent?: any; lead?: any }[] = [];
    let i = 0;
    while (i < rawReplicas.length) {
      const current = rawReplicas[i];
      const isAgent = current.actor === 'agent' || current.actor?.toLowerCase() === 'agent';
      if (isAgent) {
        const next = rawReplicas[i + 1];
        const isNextLead = next && (next.actor === 'lead' || next.actor?.toLowerCase() === 'lead' || next.actor?.toLowerCase() === 'prospect');
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

  // True only when the gig has real script content to display.
  // When false, the script sidebar stays hidden and the iframe uses full width.
  const hasScriptContent = useMemo(() => {
    if (scriptLoading) return false;
    if (!activeScript || scripts.length === 0) return false;

    const stages = activeScript?.playbook?.stages;
    if (Array.isArray(stages) && stages.length > 0) {
      return stages.some(
        (stage: any) =>
          Boolean(String(stage?.introReplica || '').trim()) ||
          (Array.isArray(stage?.options) && stage.options.length > 0) ||
          (Array.isArray(stage?.checklist) && stage.checklist.length > 0) ||
          (Array.isArray(stage?.reminders) && stage.reminders.length > 0)
      );
    }

    const scriptItems = activeScript?.script;
    return (
      Array.isArray(scriptItems) &&
      scriptItems.some((item: any) => Boolean(String(item?.replica || '').trim()))
    );
  }, [scriptLoading, activeScript, scripts.length]);

  const shouldShowScriptPanel = showScript && hasScriptContent;

  // Reset active phase and replica when script changes
  useEffect(() => {
    setActivePhaseIndex(0);
    setActiveReplicaIndex(0);
  }, [scripts]);

  // Reset replica index when phase changes
  useEffect(() => {
    setActiveReplicaIndex(0);
  }, [activePhaseIndex]);

  // Sync iframe source when active tab changes, appending gigId and leadId dynamically.
  // Script iframes (defined inside the playbook) take precedence over the legacy
  // hard-coded OGGODATA/Zoho/custom shortcuts so the cockpit always reflects the
  // tools the company chose for the active gig.
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const leadId = searchParams.get('leadId') || sessionStorage.getItem('activeLeadId') || '';
    const gigId = searchParams.get('gigId') || sessionStorage.getItem('activeGigId') || '';

    const appendParams = (url: string) => {
      try {
        const u = new URL(url);
        if (gigId) u.searchParams.set('gigId', gigId);
        if (leadId) u.searchParams.set('leadId', leadId);
        return u.toString();
      } catch (e) {
        const separator = url.includes('?') ? '&' : '?';
        let res = url;
        if (gigId) {
          res += `${separator}gigId=${encodeURIComponent(gigId)}`;
        }
        if (leadId) {
          res += `${res.includes('?') ? '&' : '?'}leadId=${encodeURIComponent(leadId)}`;
        }
        return res;
      }
    };

    if (hasScriptIframes) {
      const safeIdx = Math.min(activeScriptIframeIdx, scriptIframes.length - 1);
      setCurrentIframeUrl(appendParams(scriptIframes[safeIdx].url));
      return;
    }

    if (activeTab === 'oggodata') {
      setCurrentIframeUrl(appendParams('https://www.oggodata.com/'));
    } else if (activeTab === 'zoho') {
      setCurrentIframeUrl(appendParams('https://crm.zoho.eu'));
    } else {
      setCurrentIframeUrl(appendParams(customUrl));
    }
  }, [activeTab, customUrl, location.search, hasScriptIframes, scriptIframes, activeScriptIframeIdx]);

  const handleCustomUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let formattedUrl = customUrl.trim();
    if (formattedUrl && !/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }
    setCustomUrl(formattedUrl);
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleRefresh = () => {
    setIframeKey(prev => prev + 1);
  };

  return createPortal(
    <>
      {/* Floating Button on the Center of the Right Side */}
      {!isOpen && (
        <div className="fixed right-0 top-1/2 -translate-y-1/2 z-[160] flex items-center">
          <button
            onClick={() => setIsOpen(true)}
            className="bg-gradient-to-r from-orange-400 via-rose-500 to-rose-600 hover:from-orange-500 hover:to-rose-700 text-white font-black text-[10px] tracking-widest uppercase py-4 px-2.5 rounded-l-2xl shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:shadow-[0_0_30px_rgba(244,63,94,0.5)] transition-all duration-300 transform hover:-translate-x-1.5 flex flex-col items-center gap-2 border-y border-l border-white/20 select-none writing-mode-vertical"
            style={{ writingMode: 'vertical-lr', textOrientation: 'mixed' }}
            title="Ouvrir l'Espace OGGODATA / ZOHO"
          >
            <Globe className="w-4 h-4 animate-spin-slow rotate-90" />
            <span className="mt-1 font-extrabold">EXTERNES</span>
          </button>
        </div>
      )}

      {/* Backdrop overlay for the left 30% of screen */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[9998] animate-in fade-in duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Side drawer modal taking most of the width on the right */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 w-[95vw] lg:w-[90vw] min-w-[320px] bg-slate-950 z-[9999] flex flex-col overflow-hidden border-l border-white/10 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-right duration-500">
          
          {/* CRM Header & Toolbar at the very top of the drawer */}
          <div className="p-4 md:p-6 border-b border-white/10 bg-slate-950/80 backdrop-blur-md flex flex-col gap-3 shrink-0">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-orange-400 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20">
                  <Globe className="w-4.5 h-4.5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs md:text-sm font-black uppercase tracking-widest text-white">Espace de Travail Externe</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">OGGODATA, ZOHO & Outils Intégrés</p>
                </div>
              </div>

              {/* Fast Copy Actions Bar & Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {activeContact && (
                  <div className="bg-gradient-to-r from-orange-500/10 to-rose-500/10 border border-rose-500/20 rounded-xl px-2.5 py-1 flex items-center gap-2 shrink-0">
                    <span className="text-[9px] font-black text-white uppercase tracking-tight truncate max-w-[100px]">
                      {activeContact.First_Name}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopy(`${activeContact.First_Name} ${activeContact.Last_Name || ''}`.trim(), 'name')}
                        className="px-1.5 py-0.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-300 hover:text-white transition-all flex items-center gap-0.5"
                      >
                        {copiedField === 'name' ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                        Nom
                      </button>
                      {activeContact.Telephony && (
                        <button
                          onClick={() => handleCopy(activeContact.Telephony, 'phone')}
                          className="px-1.5 py-0.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-300 hover:text-white transition-all flex items-center gap-0.5"
                        >
                          {copiedField === 'phone' ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                          Tél
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Embedded Call Controls (Active only during a call) */}
                {state.callState.isActive && (
                  <div className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 rounded-xl p-1 shrink-0 shadow-inner">
                    <button
                      onClick={() => dispatch({ type: 'TOGGLE_MIC' })}
                      className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${state.isMicMuted ? 'bg-rose-500 text-white shadow-[0_0_10px_rgba(243,24,96,0.4)]' : 'bg-transparent hover:bg-white/10 text-rose-300 hover:text-white'}`}
                      title={state.isMicMuted ? 'Activer le micro' : 'Couper le micro'}
                    >
                      {state.isMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    </button>
                    
                    <button
                      onClick={() => {
                        if (state.twilioConnection) {
                          state.twilioConnection.disconnect();
                        }
                      }}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-600/20 flex items-center gap-1.5 active:scale-95"
                      title="Raccrocher l'appel en cours"
                    >
                      <PhoneOff className="w-3 h-3" />
                      Raccrocher
                    </button>
                  </div>
                )}

                {/* Toggle Script Display Button — only when a script exists */}
                {hasScriptContent && (
                  <button
                    onClick={() => setShowScript(!showScript)}
                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1 border shrink-0 ${
                      showScript 
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 border-indigo-400/50 text-white shadow-lg shadow-indigo-500/20' 
                        : 'bg-indigo-950/40 hover:bg-indigo-900/40 border-indigo-500/30 text-indigo-300'
                    }`}
                  >
                    <Sparkles className={`w-3 h-3 ${showScript ? 'animate-pulse' : ''}`} />
                    {showScript ? 'Masquer le Script' : 'Afficher le Script'}
                  </button>
                )}

                {/* Close Drawer Button */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 bg-rose-600/15 hover:bg-rose-600/30 border border-rose-500/30 rounded-xl text-[9px] font-black uppercase tracking-widest text-rose-300 hover:text-white transition-all flex items-center gap-1 shadow-lg shadow-rose-500/5 hover:scale-105 shrink-0"
                  title="Fermer l'espace"
                >
                  <X className="w-3.5 h-3.5" />
                  Fermer
                </button>
              </div>
            </div>
          </div>

          {/* Main Workspace Body Content */}
          <div className="flex-1 flex flex-col xl:flex-row min-h-0 overflow-hidden bg-slate-900">
            {/* Sidebar Area: Script displayed with custom toggle */}
            {shouldShowScriptPanel && (
              <div className="w-full xl:w-[420px] shrink-0 max-h-[40vh] xl:max-h-full overflow-y-auto custom-scrollbar bg-slate-900/60 backdrop-blur-2xl border-b xl:border-b-0 xl:border-r border-white/10 flex flex-col p-4 md:p-6 animate-in slide-in-from-top xl:slide-in-from-left duration-500 shadow-[inset_-10px_0_30px_rgba(0,0,0,0.2)] z-10">
                <div className="flex flex-col gap-4">
                  
                  {/* Script mini-header */}
                  <div className="flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping shrink-0" />
                      <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">SCRIPT DE VENTE ACTIF</span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider truncate max-w-[200px] md:max-w-none">• {gig?.title || 'GUIDE DE CONVERSATION'}</span>
                    </div>
                    {scriptLoading && (
                      <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    )}
                  </div>



                  {/* Combined Agent-Lead responsive pairs or Premium Interactive Cockpit */}
                  {hasInteractiveStages ? (
                      (() => {
                        const currentStage = interactiveStages[activePhaseIndex];
                        if (!currentStage) return null;
                        return (
                          <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                            {/* Stacked grid of agent speech and compliance/checks/objections */}
                            <div className="flex flex-col gap-5">
                              {/* Left Column: Agent Replica Card */}
                              <div className="relative overflow-hidden rounded-[1.25rem] border p-5 pl-7 flex flex-col gap-4 group transition-all duration-300 bg-white/[0.02] hover:bg-white/[0.04] border-white/5 hover:border-indigo-500/30 shadow-[0_4px_30px_rgba(0,0,0,0.1)] backdrop-blur-sm">
                                {/* Glowing left accent bar */}
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500 opacity-80" />
                                
                                <div className="flex gap-4 items-start">
                                  <div className="p-2.5 rounded-xl h-fit shrink-0 bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                                    <Bot className="w-5 h-5 animate-pulse" />
                                  </div>
                                  <div className="space-y-1.5 flex-1 min-w-0 text-left">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">
                                        {currentStage.introTitle || "CONSEILLER (VOUS)"}
                                      </span>
                                      <button
                                        onClick={() => handleCopy(currentStage.introReplica, 'agent_replica')}
                                        className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                                        title="Copier la réplique du conseiller"
                                      >
                                        {copiedField === 'agent_replica' ? (
                                          <span className="text-emerald-400">Copié</span>
                                        ) : (
                                          <span>Copier</span>
                                        )}
                                      </button>
                                    </div>
                                    <p className="text-[13px] md:text-sm leading-relaxed font-medium text-slate-200 tracking-wide">
                                      {currentStage.introReplica}
                                    </p>
                                  </div>
                                </div>

                                {/* Reminders / Warnings list */}
                                {currentStage.reminders && currentStage.reminders.length > 0 && (
                                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                                    {currentStage.reminders.map((rem: any, idx: number) => (
                                      <div 
                                        key={idx} 
                                        className={`p-2 rounded-lg border flex items-center gap-2 text-left ${
                                          rem.type === 'warning' 
                                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' 
                                            : rem.type === 'clock' 
                                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' 
                                              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                                        }`}
                                      >
                                        <span className="text-[10px] font-black opacity-50">•</span>
                                        <p className="text-[10px] font-bold leading-normal">{rem.text}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Right Column: Objection options, Checklist, or general guidance */}
                              <div className="space-y-4 text-left">
                                {currentStage.options && currentStage.options.length > 0 ? (
                                  <div className="space-y-2.5">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block border-b border-white/5 pb-1">
                                      {currentStage.optionsTitle || "GÉRER LA RÉACTION DU PROSPECT"}
                                    </span>
                                    
                                    <div className="grid grid-cols-1 gap-1.5">
                                      {currentStage.options.map((opt: any) => (
                                        <button
                                          key={opt.id}
                                          onClick={() => setSelectedOptionId(opt.id)}
                                          className={`p-3 rounded-2xl border text-left transition-all duration-300 outline-none flex flex-col justify-between cursor-pointer group ${
                                            selectedOptionId === opt.id
                                              ? 'bg-indigo-500/20 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.15)] scale-[1.01]'
                                              : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-indigo-500/30 shadow-sm'
                                          }`}
                                        >
                                          <span className="text-[10px] font-black text-slate-100 flex items-center gap-1">
                                            {opt.id === 'prospect_confirms' ? '✓' : '↻'} {opt.label}
                                          </span>
                                          <span className="text-[9px] text-slate-400 font-bold mt-0.5 leading-snug">
                                            {opt.subtext}
                                          </span>
                                        </button>
                                      ))}
                                    </div>

                                    {/* Reveal recommended response box if selected */}
                                    {selectedOptionId && (
                                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl space-y-1.5 animate-in fade-in duration-200">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[8.5px] font-extrabold text-emerald-400 uppercase tracking-widest block">
                                            Réponse Recommandée
                                          </span>
                                          <button
                                            onClick={() => handleCopy(currentStage.options.find((o: any) => o.id === selectedOptionId)?.recommendedResponse || '', 'recommended')}
                                            className="text-[8px] font-bold text-emerald-400 hover:text-emerald-300 uppercase tracking-wider cursor-pointer"
                                          >
                                            {copiedField === 'recommended' ? 'Copié' : 'Copier'}
                                          </button>
                                        </div>
                                        <p className="text-[10px] font-black text-emerald-100 leading-normal italic">
                                          {currentStage.options.find((o: any) => o.id === selectedOptionId)?.recommendedResponse}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                ) : currentStage.checklist && currentStage.checklist.length > 0 ? (
                                  <div className="space-y-2.5">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block border-b border-white/5 pb-1">
                                      {currentStage.checklistTitle || "DONNÉES À COLLECTER"}
                                    </span>

                                    <div className="bg-slate-900/60 rounded-xl border border-white/5 overflow-hidden divide-y divide-white/5 shadow-inner">
                                      {currentStage.checklist.map((item: string, idx: number) => {
                                        const key = `rep-check-${currentStage.id}-${idx}`;
                                        const isChecked = !!checkedItems[key];
                                        return (
                                          <label 
                                            key={idx}
                                            className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-850/60 cursor-pointer transition-all"
                                          >
                                            <input 
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={() => setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }))}
                                              className="rounded border-white/10 bg-slate-950 text-indigo-500 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                                            />
                                            <span className={`text-[10px] font-bold ${isChecked ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                                              {item}
                                            </span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            {/* Back/Next Step Navigation bar */}
                            <div className="p-3 bg-white/[0.02] backdrop-blur-sm border border-white/5 rounded-2xl flex items-center justify-between gap-3 shrink-0 mt-2 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                              <button
                                disabled={activePhaseIndex === 0}
                                onClick={() => setActivePhaseIndex(prev => Math.max(0, prev - 1))}
                                className="px-4 py-2 bg-slate-900/60 hover:bg-slate-800 disabled:opacity-20 disabled:pointer-events-none border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-300 hover:text-white transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-sm"
                              >
                                ← Précédent
                              </button>
                              
                              <span className="text-[9.5px] text-slate-400 font-extrabold tracking-widest uppercase">
                                ÉTAPE INTERACTIVE {activePhaseIndex + 1} SUR {interactiveStages.length}
                              </span>

                              <button
                                disabled={activePhaseIndex === interactiveStages.length - 1}
                                onClick={() => setActivePhaseIndex(prev => Math.min(interactiveStages.length - 1, prev + 1))}
                                className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 disabled:from-slate-800 disabled:to-slate-800 disabled:opacity-20 disabled:pointer-events-none text-white border border-indigo-400/10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-200 flex items-center gap-1.5 cursor-pointer shadow-lg shadow-purple-500/15"
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
                          <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                            
                            {/* Combined Stacked Cards */}
                            <div className="flex flex-col gap-5">
                              {/* Agent Replica Card */}
                              {currentPair.agent ? (
                                <div className="relative overflow-hidden rounded-[1.25rem] border p-5 pl-7 flex flex-col gap-4 group transition-all duration-300 bg-white/[0.02] hover:bg-white/[0.04] border-white/5 hover:border-indigo-500/30 shadow-[0_4px_30px_rgba(0,0,0,0.1)] backdrop-blur-sm">
                                  {/* Glowing left accent bar */}
                                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500 opacity-80" />
                                  
                                  <div className="flex gap-4 items-start">
                                    <div className="p-2.5 rounded-xl h-fit shrink-0 transition-transform duration-300 group-hover:scale-110 bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                                      <Bot className="w-5 h-5 animate-pulse" />
                                    </div>
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">
                                          CONSEILLER (VOUS)
                                        </span>
                                        <button
                                          onClick={() => handleCopy(currentPair.agent.replica, 'agent_replica')}
                                          className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                                          title="Copier la réplique du conseiller"
                                        >
                                          {copiedField === 'agent_replica' ? (
                                            <span className="text-emerald-400">Copié</span>
                                          ) : (
                                            <span>Copier</span>
                                          )}
                                        </button>
                                      </div>
                                      <p className="text-[13px] md:text-sm leading-relaxed font-medium text-slate-200 tracking-wide">
                                        {currentPair.agent.replica}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="hidden xl:flex items-center justify-center p-6 bg-slate-900/20 border border-dashed border-white/5 rounded-2xl">
                                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pas de réplique conseiller</p>
                                </div>
                              )}

                              {/* Lead Replica Card */}
                              {currentPair.lead ? (
                                <div className="relative overflow-hidden rounded-[1.25rem] border p-5 pl-7 flex flex-col gap-4 group transition-all duration-300 bg-white/[0.02] hover:bg-white/[0.04] border-white/5 hover:border-emerald-500/30 shadow-[0_4px_30px_rgba(0,0,0,0.1)] backdrop-blur-sm">
                                  {/* Glowing left accent bar */}
                                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 via-teal-500 to-emerald-600 opacity-80" />
                                  
                                  <div className="flex gap-4 items-start">
                                    <div className="p-2.5 rounded-xl h-fit shrink-0 transition-transform duration-300 group-hover:scale-110 bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                      <User className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">
                                          PROSPECT (RÉPONSE ATTENDUE)
                                        </span>
                                        <button
                                          onClick={() => handleCopy(currentPair.lead.replica, 'lead_replica')}
                                          className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                                          title="Copier la réplique attendue"
                                        >
                                          {copiedField === 'lead_replica' ? (
                                            <span className="text-emerald-400">Copié</span>
                                          ) : (
                                            <span>Copier</span>
                                          )}
                                        </button>
                                      </div>
                                      <p className="text-[13px] md:text-sm leading-relaxed font-medium text-slate-200 tracking-wide">
                                        {currentPair.lead.replica}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="hidden xl:flex items-center justify-center p-6 bg-slate-900/20 border border-dashed border-white/5 rounded-2xl">
                                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pas de réplique prospect</p>
                                </div>
                              )}
                            </div>

                            {/* Consolidated Pager & Navigation controls below the cards */}
                            <div className="p-3 bg-white/[0.02] backdrop-blur-sm border border-white/5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shrink-0 mt-2 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                              <div className="flex items-center gap-2 w-full justify-between sm:w-auto">
                                <button
                                  disabled={activeReplicaIndex === 0}
                                  onClick={() => setActiveReplicaIndex(prev => Math.max(0, prev - 1))}
                                  className="px-4 py-2 bg-slate-900/60 hover:bg-slate-800 disabled:opacity-20 disabled:pointer-events-none border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-300 hover:text-white transition-all duration-300 flex items-center gap-1.5 shadow-sm cursor-pointer"
                                >
                                  ← Précédent
                                </button>
                                
                                <span className="text-[10px] text-slate-400 font-extrabold tracking-widest uppercase px-2">
                                  CONVERSATION ÉTAPE {activeReplicaIndex + 1} / {replicas.length}
                                </span>

                                <button
                                  disabled={activeReplicaIndex === replicas.length - 1}
                                  onClick={() => setActiveReplicaIndex(prev => Math.min(replicas.length - 1, prev + 1))}
                                  className="px-4 py-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 disabled:from-slate-800 disabled:to-slate-800 disabled:opacity-20 disabled:pointer-events-none text-white border border-indigo-400/10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-200 flex items-center gap-1.5 hover:scale-103 active:scale-97 shadow-lg shadow-purple-500/15 cursor-pointer"
                                >
                                  Suivant →
                                </button>
                              </div>
                            </div>

                          </div>
                        );
                      })()
                    ) : null}
                </div>
              </div>
            )}

            {/* Main Area: CRM Iframe Workspace */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-950 relative z-0">

              {/* Script iframe tab bar - only rendered when the playbook ships
                  more than one iframe so a single-iframe script stays clean. */}
              {hasMultipleScriptIframes && (
                <div className="shrink-0 bg-slate-900/80 backdrop-blur-md border-b border-white/10 px-3 py-2 flex items-center gap-2 overflow-x-auto custom-scrollbar">
                  <div className="flex items-center gap-1.5 shrink-0 mr-1">
                    <Globe className="w-3 h-3 text-indigo-300" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-300">Outils du script</span>
                  </div>
                  <div className="h-4 w-px bg-white/10 mx-1 shrink-0" />
                  {scriptIframes.map((iframe, idx) => {
                    const isActive = idx === activeScriptIframeIdx;
                    return (
                      <button
                        key={iframe.id}
                        onClick={() => {
                          setActiveScriptIframeIdx(idx);
                          setIframeKey(prev => prev + 1);
                        }}
                        title={iframe.url}
                        className={`shrink-0 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 border ${
                          isActive
                            ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 border-transparent text-white shadow-lg shadow-purple-500/20'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
                        }`}
                      >
                        <Globe className={`w-3 h-3 ${isActive ? 'animate-pulse' : ''}`} />
                        <span className="truncate max-w-[160px]">{iframe.label}</span>
                      </button>
                    );
                  })}
                  <div className="ml-auto flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={handleRefresh}
                      title="Recharger la page"
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                    <a
                      href={currentIframeUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      title="Ouvrir dans un nouvel onglet"
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all flex items-center"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* Single-iframe header strip - keeps refresh / open-in-new-tab
                  affordances available without showing tabs. */}
              {hasScriptIframes && !hasMultipleScriptIframes && (
                <div className="shrink-0 bg-slate-900/80 backdrop-blur-md border-b border-white/10 px-3 py-2 flex items-center gap-2">
                  <Globe className="w-3 h-3 text-indigo-300" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-300 truncate">
                    {scriptIframes[0].label}
                  </span>
                  <span className="text-[9px] text-slate-500 font-bold truncate hidden md:inline">
                    • {scriptIframes[0].url}
                  </span>
                  <div className="ml-auto flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={handleRefresh}
                      title="Recharger la page"
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                    <a
                      href={currentIframeUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      title="Ouvrir dans un nouvel onglet"
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all flex items-center"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              <div className="flex-1 relative bg-white min-h-0">
                <iframe
                  key={iframeKey}
                  src={currentIframeUrl}
                  className="w-full h-full border-none"
                  title="External Workspace View"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                  loading="lazy"
                />
              </div>
            </div>

          </div>
        </div>
      )}
    </>,
    document.body
  );
}

export default IframeWorkspace;
