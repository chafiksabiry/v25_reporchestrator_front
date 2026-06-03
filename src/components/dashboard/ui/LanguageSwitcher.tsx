import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Check } from 'lucide-react';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: 'en', label: 'English', short: 'EN', flagUrl: 'https://flagcdn.com/w320/gb.png' },
    { code: 'fr', label: 'Français', short: 'FR', flagUrl: 'https://flagcdn.com/w320/fr.png' }
  ];

  const currentLang = languages.find(l => i18n.language.startsWith(l.code)) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectLanguage = (code: string) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white/5 hover:bg-white/10 p-1 pr-3 rounded-2xl border border-white/10 shadow-sm transition-all duration-300 group text-white"
        title="Change Language"
      >
        <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0 shadow-inner">
          <img src={currentLang.flagUrl} alt={currentLang.label} className="w-full h-full object-cover scale-150" />
        </div>
        <span className="font-black text-sm tracking-wider">
          {currentLang.short}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 group-hover:text-white ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-3 w-40 bg-[#0A0A0A] border border-white/10 rounded-2xl p-1.5 shadow-2xl z-50 flex flex-col gap-1 overflow-hidden animate-in fade-in slide-in-from-top-2 backdrop-blur-xl">
          {languages.map((lang) => {
            const isActive = i18n.language.startsWith(lang.code);
            return (
              <button
                key={lang.code}
                onClick={() => selectLanguage(lang.code)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-bold ${
                  isActive 
                    ? 'bg-gradient-to-br from-orange-500 to-pink-600 text-white shadow-md' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
                title={lang.label}
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full overflow-hidden shadow-inner shrink-0 ring-2 ring-white/10">
                    <img src={lang.flagUrl} alt={lang.label} className="w-full h-full object-cover scale-150" />
                  </div>
                  <span className="tracking-wide text-white">{lang.label}</span>
                </div>
                {isActive && <Check className="w-4 h-4 text-white" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
