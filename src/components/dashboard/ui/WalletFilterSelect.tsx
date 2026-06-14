import { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { Check, ChevronDown } from 'lucide-react';

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

const TONE_STYLES: Record<
  WalletFilterTone,
  { dot: string; activeText: string; idleText: string; activeBg: string }
> = {
  neutral: {
    dot: 'bg-slate-300',
    activeText: 'text-slate-900',
    idleText: 'text-slate-700',
    activeBg: 'bg-slate-50',
  },
  success: {
    dot: 'bg-emerald-500',
    activeText: 'text-emerald-700',
    idleText: 'text-slate-700',
    activeBg: 'bg-emerald-50',
  },
  danger: {
    dot: 'bg-rose-500',
    activeText: 'text-rose-700',
    idleText: 'text-slate-700',
    activeBg: 'bg-rose-50',
  },
  warning: {
    dot: 'bg-amber-500',
    activeText: 'text-amber-700',
    idleText: 'text-slate-700',
    activeBg: 'bg-amber-50',
  },
  brand: {
    dot: 'bg-harx-500',
    activeText: 'text-harx-800',
    idleText: 'text-slate-700',
    activeBg: 'bg-harx-50',
  },
};

type WalletFilterSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: WalletFilterOption[];
  className?: string;
};

export function WalletFilterSelect({
  label,
  value,
  onChange,
  options,
  className = '',
}: WalletFilterSelectProps) {
  const selected = options.find((o) => o.value === value) ?? options[0];
  const selectedTone = TONE_STYLES[selected?.tone ?? 'neutral'];

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Listbox value={value} onChange={onChange}>
        {({ open }) => (
          <>
            <Listbox.Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-1">
              {label}
            </Listbox.Label>
            <div className="relative">
              <Listbox.Button
                className={`relative w-full cursor-pointer rounded-xl border bg-white py-2.5 pl-3.5 pr-10 text-left shadow-sm transition-all hover:border-slate-300 focus:outline-none ${
                  open
                    ? 'border-harx-400 ring-2 ring-harx-500/20'
                    : 'border-slate-200'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  {selected?.tone && selected.tone !== 'neutral' && (
                    <span className={`h-2 w-2 rounded-full shrink-0 ${selectedTone.dot}`} />
                  )}
                  <span className="block truncate text-xs font-bold text-slate-800" title={selected?.label}>
                    {selected?.label}
                  </span>
                </span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                      open ? 'rotate-180 text-harx-500' : ''
                    }`}
                  />
                </span>
              </Listbox.Button>

              <Transition
                as={Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Listbox.Options className="absolute z-[100] mt-1.5 max-h-64 w-full overflow-auto rounded-xl border border-slate-100 bg-white py-1.5 shadow-xl shadow-slate-300/25 focus:outline-none">
                  {options.map((option) => {
                    const tone = TONE_STYLES[option.tone ?? 'neutral'];
                    return (
                      <Listbox.Option
                        key={option.value}
                        value={option.value}
                        className={({ active, selected: isSelected }) =>
                          `relative cursor-pointer select-none px-3 py-2.5 transition-colors ${
                            active || isSelected ? tone.activeBg : 'hover:bg-slate-50'
                          }`
                        }
                      >
                        {({ selected: isSelected }) => (
                          <div className="flex items-start justify-between gap-2 pr-6">
                            <div className="flex items-start gap-2 min-w-0">
                              <span
                                className={`h-2 w-2 rounded-full shrink-0 mt-1.5 ${tone.dot}`}
                              />
                              <div className="min-w-0">
                                <p
                                  className={`text-xs leading-snug ${
                                    isSelected
                                      ? `font-bold ${tone.activeText}`
                                      : `font-medium ${tone.idleText}`
                                  }`}
                                  title={option.label}
                                >
                                  {option.label}
                                </p>
                                {option.hint && (
                                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">{option.hint}</p>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <Check className={`absolute right-3 top-2.5 h-4 w-4 shrink-0 ${tone.activeText}`} />
                            )}
                          </div>
                        )}
                      </Listbox.Option>
                    );
                  })}
                </Listbox.Options>
              </Transition>
            </div>
          </>
        )}
      </Listbox>
    </div>
  );
}
