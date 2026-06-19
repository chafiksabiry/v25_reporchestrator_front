import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, MessageSquare, Sun, Moon } from 'lucide-react';
import { ScriptCockpitPanel, type ScriptReaderTheme } from './ScriptCockpitPanel';

export type GigScriptReaderModalProps = {
  gigId: string;
  title?: string;
  onClose: () => void;
};

const THEME_STORAGE_KEY = 'harx_script_reader_theme';

function readStoredTheme(): ScriptReaderTheme {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return v === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

/** Lecteur script plein écran — 2 colonnes, sans scroll page, thème clair/sombre. */
export function GigScriptReaderModal({ gigId, title, onClose }: GigScriptReaderModalProps) {
  const [theme, setTheme] = useState<ScriptReaderTheme>(() => readStoredTheme());

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toggleTheme = () => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const isDark = theme === 'dark';

  return createPortal(
    <div
      className={`fixed inset-0 z-[200] flex flex-col h-screen w-screen overflow-hidden ${
        isDark ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'
      }`}
    >
      <header
        className={`shrink-0 flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-6 ${
          isDark ? 'border-white/10 bg-slate-950' : 'border-slate-200 bg-white'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className={`h-5 w-5 shrink-0 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
          <div className="min-w-0">
            <p
              className={`text-[10px] font-black uppercase tracking-widest ${
                isDark ? 'text-indigo-300' : 'text-indigo-600'
              }`}
            >
              Script d&apos;appel
            </p>
            {title ? <p className="text-sm font-bold truncate">{title}</p> : null}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleTheme}
            className={`rounded-xl border p-2.5 transition-colors ${
              isDark
                ? 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
            title={isDark ? 'Mode clair' : 'Mode sombre'}
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-xl border p-2.5 transition-colors ${
              isDark
                ? 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
            title="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-hidden p-3 sm:p-4 md:p-5">
        <ScriptCockpitPanel gigId={gigId} gigTitle={title} theme={theme} className="h-full" />
      </main>

      <footer
        className={`shrink-0 flex justify-end border-t px-4 py-2.5 sm:px-6 ${
          isDark ? 'border-white/10 bg-slate-950' : 'border-slate-200 bg-white'
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          className={`rounded-xl border px-5 py-2 text-xs font-black uppercase tracking-widest transition-colors ${
            isDark
              ? 'border-white/10 bg-white/5 text-white hover:bg-white/10'
              : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100'
          }`}
        >
          Retour aux formations
        </button>
      </footer>
    </div>,
    document.body
  );
}
