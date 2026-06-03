import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { addWeeks, format, startOfWeek } from 'date-fns';
import { Calendar, Save, RotateCcw } from 'lucide-react';

export type WeekPlanBlock = {
  isoDay: number;
  startTime: string;
  endTime: string;
  duration?: number;
};

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8);
const ISO_DAYS = [1, 2, 3, 4, 5, 6, 7];
const ISO_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function blockKey(isoDay: number, hour: number) {
  const t = `${hour.toString().padStart(2, '0')}:00`;
  return `${isoDay}-${t}`;
}

function blocksToKeys(blocks: WeekPlanBlock[]): Set<string> {
  const s = new Set<string>();
  for (const b of blocks) {
    const h = parseInt(String(b.startTime).split(':')[0], 10);
    if (!Number.isNaN(h)) s.add(blockKey(b.isoDay, h));
  }
  return s;
}

function keysToBlocks(keys: Set<string>): WeekPlanBlock[] {
  const out: WeekPlanBlock[] = [];
  keys.forEach((k) => {
    const [d, t] = k.split('-');
    const isoDay = parseInt(d, 10);
    const hour = parseInt(t.split(':')[0], 10);
    if (Number.isNaN(isoDay) || Number.isNaN(hour)) return;
    const st = `${hour.toString().padStart(2, '0')}:00`;
    const en = `${(hour + 1).toString().padStart(2, '0')}:00`;
    out.push({ isoDay, startTime: st, endTime: en, duration: 1 });
  });
  return out.sort((a, b) => a.isoDay - b.isoDay || a.startTime.localeCompare(b.startTime));
}

function mondayKey(d: Date) {
  return format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

type TypicalWeekPanelProps = {
  gigId: string;
  repId: string;
  selectedDate: Date;
  onSelectedDateChange?: (d: Date) => void;
  onNotify?: (message: string, type: 'success' | 'error') => void;
};

export function TypicalWeekPanel({ gigId, repId, selectedDate, onSelectedDateChange, onNotify }: TypicalWeekPanelProps) {
  const base = (import.meta.env.VITE_MATCHING_API_URL || '').replace(/\/$/, '');
  const [scope, setScope] = useState<'template' | 'week'>('template');
  const [templateWeek, setTemplateWeek] = useState<WeekPlanBlock[]>([]);
  const [weekOverrides, setWeekOverrides] = useState<{ weekStart: string; blocks: WeekPlanBlock[] }[]>([]);
  const [draftKeys, setDraftKeys] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const mondayStr = useMemo(() => mondayKey(selectedDate), [selectedDate]);

  const fetchPlan = useCallback(async () => {
    if (!base || !gigId || !repId) return;
    setLoading(true);
    try {
      const r = await axios.get<{ data?: { templateWeek?: WeekPlanBlock[]; weekOverrides?: { weekStart: string; blocks: WeekPlanBlock[] }[] } }>(
        `${base}/gig-agents/session-planning`,
        { params: { gigId, agentId: repId } }
      );
      const d = r.data?.data;
      setTemplateWeek(Array.isArray(d?.templateWeek) ? d.templateWeek : []);
      setWeekOverrides(Array.isArray(d?.weekOverrides) ? d.weekOverrides : []);
    } catch {
      setTemplateWeek([]);
      setWeekOverrides([]);
      onNotify?.('Impossible de charger la semaine type (vérifiez le gig et l’inscription).', 'error');
    } finally {
      setLoading(false);
    }
  }, [base, gigId, repId]);

  useEffect(() => {
    void fetchPlan();
  }, [fetchPlan]);

  const effectiveBlocks = useMemo(() => {
    if (scope === 'template') return templateWeek;
    const ov = weekOverrides.find((o) => o.weekStart === mondayStr);
    return ov?.blocks?.length ? ov.blocks : templateWeek;
  }, [scope, templateWeek, weekOverrides, mondayStr]);

  useEffect(() => {
    if (loading) return;
    setDraftKeys(blocksToKeys(effectiveBlocks));
  }, [scope, mondayStr, loading, effectiveBlocks]);

  const toggleCell = (isoDay: number, hour: number) => {
    const k = blockKey(isoDay, hour);
    setDraftKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const handleSave = async () => {
    if (!base || !gigId || !repId) return;
    const blocks = keysToBlocks(draftKeys);
    setSaving(true);
    try {
      if (scope === 'template') {
        await axios.put(`${base}/gig-agents/session-planning`, {
          gigId,
          agentId: repId,
          mode: 'template',
          templateWeek: blocks
        });
        onNotify?.('Semaine type enregistrée (s’applique à toutes les semaines par défaut).', 'success');
      } else {
        await axios.put(`${base}/gig-agents/session-planning`, {
          gigId,
          agentId: repId,
          mode: 'week',
          weekStart: mondayStr,
          weekBlocks: blocks
        });
        onNotify?.('Planning de cette semaine enregistré — la semaine type n’a pas été modifiée.', 'success');
      }
      await fetchPlan();
    } catch {
      onNotify?.('Échec de l’enregistrement.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleClearWeekOverride = async () => {
    if (!base || !gigId || !repId || scope !== 'week') return;
    setSaving(true);
    try {
      await axios.put(`${base}/gig-agents/session-planning`, {
        gigId,
        agentId: repId,
        mode: 'week',
        weekStart: mondayStr,
        weekBlocks: []
      });
      onNotify?.('Exception de semaine supprimée — retour à la semaine type.', 'success');
      await fetchPlan();
    } catch {
      onNotify?.('Échec.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!base) {
    return (
      <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-4 text-sm text-amber-900">
        Variable <code className="font-mono">VITE_MATCHING_API_URL</code> manquante.
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-gray-100 bg-white/90 p-6 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-harx-500/10 p-2">
            <Calendar className="h-5 w-5 text-harx-600" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-tight text-gray-900">Semaine type & exceptions</h3>
            <p className="text-[11px] font-semibold text-gray-500 mt-0.5">
              La <span className="text-harx-700">semaine type</span> s’applique à toutes les semaines. Vous pouvez adapter{' '}
              <span className="text-harx-700">une semaine précise</span> sans changer la semaine type.
            </p>
          </div>
        </div>
        <div className="flex rounded-xl border border-gray-200 p-1 bg-gray-50/80">
          <button
            type="button"
            onClick={() => setScope('template')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${
              scope === 'template' ? 'bg-harx-600 text-white shadow' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Semaine type
          </button>
          <button
            type="button"
            onClick={() => setScope('week')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${
              scope === 'week' ? 'bg-harx-600 text-white shadow' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Cette semaine
          </button>
        </div>
      </div>

      {scope === 'week' && (
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <p className="text-xs font-semibold text-gray-600">
            Semaine du <span className="tabular-nums font-bold text-gray-900">{mondayStr}</span> (lundi). Vous pouvez aussi naviguer avec les flèches.
          </p>
          {onSelectedDateChange ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelectedDateChange(addWeeks(selectedDate, -1))}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50"
              >
                ← Semaine −1
              </button>
              <button
                type="button"
                onClick={() => onSelectedDateChange(addWeeks(selectedDate, 1))}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50"
              >
                Semaine +1 →
              </button>
            </div>
          ) : null}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500 py-8 text-center font-medium">Chargement…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/90">
                <th className="p-2 text-left font-black text-gray-400 w-14">H</th>
                {ISO_DAYS.map((iso, i) => (
                  <th key={iso} className="p-2 text-center font-black text-gray-500 min-w-[52px]">
                    {ISO_LABELS[i]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOURS.map((hour) => (
                <tr key={hour} className="border-t border-gray-100">
                  <td className="p-1.5 text-gray-500 font-bold tabular-nums">{hour}:00</td>
                  {ISO_DAYS.map((isoDay) => {
                    const on = draftKeys.has(blockKey(isoDay, hour));
                    return (
                      <td key={`${isoDay}-${hour}`} className="p-0.5 text-center">
                        <button
                          type="button"
                          onClick={() => toggleCell(isoDay, hour)}
                          className={`w-full min-h-[28px] rounded-md transition-colors ${
                            on ? 'bg-harx-500 text-white shadow-sm' : 'bg-gray-50 hover:bg-gray-100 text-transparent'
                          }`}
                          aria-label={`${ISO_LABELS[isoDay - 1]} ${hour}h`}
                        >
                          {on ? '●' : ''}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 justify-end">
        {scope === 'week' && (
          <button
            type="button"
            onClick={() => void handleClearWeekOverride()}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Réinitialiser cette semaine
          </button>
        )}
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || loading}
          className="inline-flex items-center gap-2 rounded-xl bg-harx-600 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-harx-700 disabled:opacity-50 shadow-sm"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Enregistrement…' : scope === 'template' ? 'Enregistrer la semaine type' : 'Enregistrer cette semaine'}
        </button>
      </div>
    </div>
  );
}
