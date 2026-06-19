import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, MessageSquare } from 'lucide-react';
import { ScriptCockpitPanel } from './ScriptCockpitPanel';

export type GigScriptReaderModalProps = {
  gigId: string;
  title?: string;
  onClose: () => void;
};

/** Lecteur script identique au cockpit (phases agent / prospect). */
export function GigScriptReaderModal({ gigId, title, onClose }: GigScriptReaderModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-md overflow-y-auto">
      <div className="min-h-full flex flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-slate-950/90 backdrop-blur px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 min-w-0">
            <MessageSquare className="h-5 w-5 shrink-0 text-indigo-400" />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">
                Script d&apos;appel
              </p>
              {title ? (
                <p className="text-sm font-bold text-white truncate">{title}</p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
            title="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <main className="flex-1 w-full max-w-3xl mx-auto p-4 sm:p-6 md:p-8">
          <ScriptCockpitPanel gigId={gigId} gigTitle={title} />
        </main>

        <footer className="sticky bottom-0 border-t border-white/10 bg-slate-950/90 backdrop-blur px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto sm:ml-auto flex justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white hover:bg-white/10 transition-colors"
          >
            Retour aux formations
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
