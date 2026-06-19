import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

export type WalletFilterTone =
  | 'neutral'
  | 'success'
  | 'danger'
  | 'warning'
  | 'brand';

export type WalletFilterOption = {
  value: string;
  label: string;
  hint?: string;
  tone?: WalletFilterTone;
};

export type WalletFilterAccent = 'blue' | 'purple' | 'harx';

const TONE_PILL: Record<
  WalletFilterTone,
  { selected: string; dot: string; dotIdle: string }
> = {
  neutral: {
    selected: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/80 shadow-sm',
    dot: 'bg-slate-500',
    dotIdle: 'bg-slate-300',
  },
  success: {
    selected: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/80 shadow-sm',
    dot: 'bg-emerald-500',
    dotIdle: 'bg-slate-300',
  },
  danger: {
    selected: 'bg-rose-100 text-rose-700 ring-1 ring-rose-200/80 shadow-sm',
    dot: 'bg-rose-500',
    dotIdle: 'bg-slate-300',
  },
  warning: {
    selected: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200/80 shadow-sm',
    dot: 'bg-amber-500',
    dotIdle: 'bg-slate-300',
  },
  brand: {
    selected: 'bg-harx-50 text-harx-800 ring-1 ring-harx-200/80 shadow-sm',
    dot: 'bg-harx-500',
    dotIdle: 'bg-slate-300',
  },
};

const ACCENT_TRIGGER: Record<
  WalletFilterAccent,
  { hoverBorder: string; focusRing: string; chevronOpen: string }
> = {
  blue: {
    hoverBorder: 'hover:border-blue-200',
    focusRing: 'focus:ring-blue-500/20',
    chevronOpen: 'text-blue-500',
  },
  purple: {
    hoverBorder: 'hover:border-purple-200',
    focusRing: 'focus:ring-purple-500/20',
    chevronOpen: 'text-purple-500',
  },
  harx: {
    hoverBorder: 'hover:border-harx-300',
    focusRing: 'focus:ring-harx-500/20',
    chevronOpen: 'text-harx-500',
  },
};

const ACCENT_PILL: Record<WalletFilterAccent, { selected: string; dot: string; dotIdle: string }> = {
  blue: {
    selected: 'bg-blue-100 text-blue-700 ring-1 ring-blue-200/80 shadow-sm',
    dot: 'bg-blue-500',
    dotIdle: 'bg-slate-300',
  },
  purple: {
    selected: 'bg-purple-100 text-purple-700 ring-1 ring-purple-200/80 shadow-sm',
    dot: 'bg-purple-500',
    dotIdle: 'bg-slate-300',
  },
  harx: {
    selected: 'bg-harx-50 text-harx-800 ring-1 ring-harx-200/80 shadow-sm',
    dot: 'bg-harx-500',
    dotIdle: 'bg-slate-300',
  },
};

type DropdownPos = {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  placement: 'below' | 'above';
};

type WalletFilterSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: WalletFilterOption[];
  className?: string;
  accent?: WalletFilterAccent;
  /** Where to open the menu relative to the trigger. Default: auto (prefers below). */
  placement?: 'auto' | 'above' | 'below';
};

export function WalletFilterSelect({
  label,
  value,
  onChange,
  options,
  className = '',
  accent = 'harx',
  placement = 'auto',
}: WalletFilterSelectProps) {
  const selected = options.find((o) => o.value === value) ?? options[0];
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<DropdownPos | null>(null);
  const triggerAccent = ACCENT_TRIGGER[accent];

  const readDropdownPos = (): DropdownPos => {
    const rect = triggerRef.current!.getBoundingClientRect();
    const width = Math.max(rect.width, 200);
    const estimatedMenuHeight = Math.min(options.length * 44 + 16, 320);
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openAbove =
      placement === 'above'
      || (placement === 'auto' && spaceBelow < estimatedMenuHeight + 12 && spaceAbove > spaceBelow);

    if (openAbove) {
      return {
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left,
        width,
        placement: 'above',
      };
    }

    return {
      top: rect.bottom + 8,
      left: rect.left,
      width,
      placement: 'below',
    };
  };

  const closeDropdown = () => {
    setIsOpen(false);
    setDropdownPos(null);
  };

  const openDropdown = () => {
    if (!triggerRef.current) return;
    setDropdownPos(readDropdownPos());
    setIsOpen(true);
  };

  const toggleDropdown = () => {
    if (isOpen) closeDropdown();
    else openDropdown();
  };

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const updatePosition = () => {
      if (!triggerRef.current) return;
      setDropdownPos(readDropdownPos());
    };

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  const getOptionPill = (option: WalletFilterOption, isSelected: boolean) => {
    if (option.tone) {
      const tone = TONE_PILL[option.tone];
      return isSelected
        ? tone.selected
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900';
    }
    return isSelected
      ? ACCENT_PILL[accent].selected
      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900';
  };

  const getOptionDot = (option: WalletFilterOption, isSelected: boolean) => {
    if (option.tone) {
      const tone = TONE_PILL[option.tone];
      return isSelected ? tone.dot : tone.dotIdle;
    }
    return isSelected ? ACCENT_PILL[accent].dot : ACCENT_PILL[accent].dotIdle;
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-1">
        {label}
      </span>
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={toggleDropdown}
          className={`relative w-full flex items-center justify-between gap-2 cursor-pointer rounded-xl border border-slate-200 bg-white py-2.5 pl-3.5 pr-10 text-left shadow-sm transition-all ${triggerAccent.hoverBorder} focus:outline-none focus:ring-2 ${triggerAccent.focusRing}`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className="flex items-center gap-2 min-w-0">
            <span className="block truncate text-xs font-bold text-slate-800 normal-case" title={selected?.label}>
              {selected?.label}
            </span>
          </span>
          <ChevronDown
            className={`absolute right-3 h-4 w-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? `rotate-180 ${triggerAccent.chevronOpen}` : ''
            }`}
          />
        </button>

        {isOpen && dropdownPos && createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onClick={closeDropdown} aria-hidden />
            <div
              className="fixed z-[9999] bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-300/30 p-2 max-h-[min(320px,calc(100vh-6rem))] overflow-y-auto"
              style={{
                ...(dropdownPos.placement === 'above'
                  ? { bottom: dropdownPos.bottom }
                  : { top: dropdownPos.top }),
                left: dropdownPos.left,
                minWidth: dropdownPos.width,
                maxWidth: 'min(420px, calc(100vw - 2rem))',
              }}
              role="listbox"
              aria-label={label}
            >
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      closeDropdown();
                    }}
                    className="block w-full text-left px-1 py-0.5"
                    role="option"
                    aria-selected={isSelected}
                  >
                    <span
                      className={`inline-flex items-start gap-2 max-w-full px-3 py-2 rounded-xl text-[11px] font-semibold leading-snug normal-case transition-all ${getOptionPill(option, isSelected)}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${getOptionDot(option, isSelected)}`} />
                      <span className="text-left">
                        {option.label}
                        {option.hint && (
                          <span className="block text-[10px] font-medium text-slate-400 mt-0.5">{option.hint}</span>
                        )}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>,
          document.body
        )}
      </div>
    </div>
  );
}
