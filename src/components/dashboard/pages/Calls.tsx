import React from 'react';
import { CallRecords } from '../CallRecords';
import { useTranslation } from 'react-i18next';

export function Calls() {
  const { t } = useTranslation();

  return (
    <div className="animate-in fade-in duration-700">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase tracking-widest">
          {t('calls.title')}
        </h1>
        <p className="text-slate-500 font-medium mt-1">
          {t('calls.subtitle')}
        </p>
      </div>

      <div className="bg-white/40 backdrop-blur-xl rounded-[40px] border border-white/60 p-8 shadow-2xl shadow-slate-200/40">
        <CallRecords />
      </div>
    </div>
  );
}
