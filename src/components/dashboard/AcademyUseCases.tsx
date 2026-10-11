import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Headphones, Lightbulb, ShieldAlert } from 'lucide-react';
import api from '../../utils/client';
import { getAgentId } from '../../utils/authUtils';
import {
  anonymizeEmail,
  anonymizePersonName,
  anonymizePhone,
  resolveCallCoaching,
  type CoachingKind,
} from '../../utils/callStatusDisplay';

type UseCaseCall = {
  _id?: string;
  call_id?: string;
  sid?: string;
  startTime?: string | Date;
  createdAt?: string | Date;
  duration?: number;
  recording_url?: string;
  recording_url_cloudinary?: string;
  ai_call_score?: { overall?: { score?: number; feedback?: string; feedback_fr?: string; feedback_en?: string } };
  callOutcome?: string | null;
  flags?: { fraud?: boolean };
  lead?: {
    First_Name?: string;
    Last_Name?: string;
    name?: string;
    phone?: string;
    Phone?: string;
    email?: string;
    Email_1?: string;
    Stage?: string;
    gigId?: { _id?: string; title?: string };
  };
};

function callGigId(row: UseCaseCall): string {
  const g = row.lead?.gigId;
  if (!g) return '';
  if (typeof g === 'string') return g;
  return String(g._id || '').trim();
}

export function AcademyUseCases({ gigFilter }: { gigFilter: string }) {
  const { t, i18n } = useTranslation();
  const [rows, setRows] = useState<UseCaseCall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const agentId = getAgentId();
      if (!agentId) {
        setLoading(false);
        return;
      }
      try {
        const response = await api.calls.getByAgentId(agentId);
        const data = Array.isArray(response?.data) ? response.data : [];
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cases = useMemo(() => {
    return rows
      .filter((row) => {
        const kind = resolveCallCoaching(row);
        if (!kind) return false;
        if (gigFilter && gigFilter !== '__all__') {
          const gid = callGigId(row);
          if (gid && gid !== gigFilter) return false;
        }
        return true;
      })
      .map((row) => {
        const kind = resolveCallCoaching(row) as Exclude<CoachingKind, null>;
        const rawName = row.lead?.First_Name
          ? `${row.lead.First_Name} ${row.lead.Last_Name || ''}`.trim()
          : row.lead?.name || '';
        return {
          id: String(row.call_id || row.sid || row._id || ''),
          kind,
          score: row.ai_call_score?.overall?.score,
          when: row.startTime || row.createdAt,
          duration: Number(row.duration || 0),
          name: anonymizePersonName(rawName),
          phone: anonymizePhone(row.lead?.phone || row.lead?.Phone),
          email: anonymizeEmail(row.lead?.email || row.lead?.Email_1),
          gigTitle: row.lead?.gigId && typeof row.lead.gigId === 'object' ? row.lead.gigId.title : '',
          recording: row.recording_url_cloudinary || row.recording_url || '',
          feedback:
            i18n.language.startsWith('en')
              ? row.ai_call_score?.overall?.feedback_en || row.ai_call_score?.overall?.feedback || ''
              : row.ai_call_score?.overall?.feedback_fr || row.ai_call_score?.overall?.feedback || '',
        };
      });
  }, [rows, gigFilter, i18n.language]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-8 text-sm font-semibold text-slate-500">
        {t('trainingPage.useCasesLoading', 'Chargement des use cases…')}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-harx-100 bg-gradient-to-br from-harx-50/70 to-white p-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-harx-600">
          {t('trainingPage.useCasesKicker', 'Briefing / Coaching')}
        </p>
        <h3 className="mt-1 text-lg font-black text-slate-900">
          {t('trainingPage.useCasesTitle', 'Use cases à étudier')}
        </h3>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          {t(
            'trainingPage.useCasesIntro',
            'Les appels excellents et les appels à retravailler deviennent des briefings pour votre amélioration continue. Les données prospect (téléphone, email, nom) sont anonymisées. L’entreprise peut partager ces cas avec les autres REPS du même GIG.'
          )}
        </p>
      </div>

      {cases.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-black text-slate-800">
            {t('trainingPage.useCasesEmptyTitle', 'Aucun use case pour le moment')}
          </p>
          <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">
            {t(
              'trainingPage.useCasesEmptyDesc',
              'Les appels très réussis (≥ 85 %) et les appels à retravailler (≤ 35 %) apparaîtront ici, hors appels trop courts ou non commerciaux.'
            )}
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cases.map((item) => {
            const excellent = item.kind === 'excellent';
            return (
              <li
                key={item.id}
                className={`rounded-2xl border bg-white p-5 shadow-sm ${
                  excellent ? 'border-emerald-100' : 'border-orange-100'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      excellent ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'
                    }`}
                  >
                    {excellent ? <Lightbulb className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {excellent
                        ? t('trainingPage.useCasesExcellent', 'Modèle à suivre')
                        : t('trainingPage.useCasesCritical', 'Erreurs à ne plus commettre')}
                    </p>
                    <h4 className="font-black text-slate-900 mt-0.5">{item.name}</h4>
                    <p className="text-[11px] font-semibold text-slate-400 mt-1">
                      ID {item.id.length > 18 ? `${item.id.slice(0, 8)}…${item.id.slice(-4)}` : item.id}
                      {item.phone ? ` · ${item.phone}` : ''}
                      {item.email ? ` · ${item.email}` : ''}
                    </p>
                    {item.gigTitle ? (
                      <p className="text-[10px] font-bold text-harx-700 mt-1 uppercase tracking-wider">{item.gigTitle}</p>
                    ) : null}
                  </div>
                  {typeof item.score === 'number' ? (
                    <span className={`text-sm font-black ${excellent ? 'text-emerald-600' : 'text-orange-600'}`}>
                      {item.score}%
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  {excellent
                    ? t(
                        'trainingPage.useCasesExcellentHint',
                        'Réécoutez cet appel et inspirez-vous-en pour vos prochains briefs.'
                      )
                    : t(
                        'trainingPage.useCasesCriticalHint',
                        'Réécoutez cet appel pour identifier les erreurs et les éviter ensuite.'
                      )}
                </p>
                {item.feedback ? (
                  <p className="mt-2 text-xs italic text-slate-500 line-clamp-3">“{item.feedback}”</p>
                ) : null}
                {item.recording ? (
                  <a
                    href={item.recording}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-harx-700 hover:text-harx-800"
                  >
                    <Headphones className="w-3.5 h-3.5" />
                    {t('trainingPage.useCasesReplay', 'Réécouter')}
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
