import { useEffect, useRef } from 'react';
import axios from 'axios';
import i18n from '../../i18n';
import { NOTIFICATIONS_REFRESH_EVENT } from '../../contexts/NotificationsContext';
import { getAgentId, getAuthToken } from '../../utils/authUtils';
import {
  deleteNotificationByKey,
  upsertNotificationApi,
} from '../../services/api/notificationsApi';
import {
  fetchEnrolledGigsForAgent,
  gigIdFromJourney,
  journeyKey,
  journeyTitle,
  scriptModuleStillPending,
  scriptNotificationId,
  trainingApiBase,
  type JourneyRowLite,
  type RepProgressRowLite,
  type StructuredProgressLite,
} from '../../utils/trainingScriptRequirement';

type SlideSummaryJourney = {
  journeyId: string;
  completedUnits?: number;
  totalUnits?: number;
};

function normalizeStructured(raw: unknown): StructuredProgressLite | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const modules = Array.isArray(row.modules)
    ? row.modules.map((m: unknown) => {
        const mod = m as Record<string, unknown>;
        return {
          moduleId: String(mod.moduleId || '').trim(),
          status: String(mod.status || 'pending'),
          progressPercentage: Number(mod.progressPercentage || 0),
        };
      })
    : [];
  return {
    status: String(row.status || 'pending'),
    modules,
  };
}

function isJourneyCompleted(
  journeyId: string,
  slideJourneys: SlideSummaryJourney[] | undefined,
  progressRow: RepProgressRowLite | undefined,
  structured: StructuredProgressLite | undefined
): boolean {
  const slideRow = slideJourneys?.find((j) => j.journeyId === journeyId);
  if (slideRow && Number(slideRow.totalUnits) > 0) {
    const pct = Math.round(
      (Number(slideRow.completedUnits || 0) / Number(slideRow.totalUnits)) * 100
    );
    if (pct >= 100) return true;
  }
  if (structured?.status === 'completed') return true;
  if (Number(progressRow?.progressPercentage) >= 100) return true;
  return false;
}

function buildScriptNotificationCopy(
  trainingTitle: string,
  isFr: boolean
): { title: string; message: string } {
  if (isFr) {
    return {
      title: "Script d'appel à compléter",
      message: `Formation « ${trainingTitle} » : lisez et validez le module script (obligatoire pour le cockpit).`,
    };
  }
  return {
    title: 'Call script required',
    message: `Training "${trainingTitle}": read and complete the call script module (required for cockpit access).`,
  };
}

/**
 * Synchronise les notifications « script obligatoire » côté API (dash_rep_back),
 * puis rafraîchit la cloche.
 */
export function ScriptRequirementNotificationsSync() {
  const syncingRef = useRef(false);

  useEffect(() => {
    const sync = async () => {
      if (syncingRef.current) return;
      const repId = getAgentId();
      const token = getAuthToken() || '';
      const base = trainingApiBase();
      if (!repId || !token || !base) return;

      syncingRef.current = true;
      const isFr = (i18n.language || '').toLowerCase().startsWith('fr');

      try {
        const enrolled = await fetchEnrolledGigsForAgent(repId, token);
        const journeyMap = new Map<string, JourneyRowLite>();

        try {
          const repRes = await axios.get<unknown[]>(
            `${base}/training_journeys/rep/${encodeURIComponent(repId)}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const repList = Array.isArray(repRes.data) ? repRes.data : [];
          for (const raw of repList) {
            const j = raw as JourneyRowLite;
            const id = journeyKey(j);
            if (id) journeyMap.set(id, j);
          }
        } catch {
          /* optional */
        }

        await Promise.all(
          enrolled.map(async ({ gigId, title: gigTitle }) => {
            try {
              const r = await axios.get<{ success?: boolean; data?: unknown[] }>(
                `${base}/training_journeys/gig/${encodeURIComponent(gigId)}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              const arr = Array.isArray(r.data?.data) ? r.data.data : [];
              for (const raw of arr) {
                const j = { ...(raw as JourneyRowLite), __gigId: gigId, __gigTitle: gigTitle };
                const id = journeyKey(j);
                if (id) journeyMap.set(id, j);
              }
            } catch {
              /* ignore per-gig errors */
            }
          })
        );

        const progressByJourney: Record<string, RepProgressRowLite> = {};
        try {
          const pr = await axios.get<{
            success?: boolean;
            data?: Array<RepProgressRowLite & { journeyId?: string }>;
          }>(`${base}/training_journeys/rep/${encodeURIComponent(repId)}/trainings-progress`);
          const rows = Array.isArray(pr.data?.data) ? pr.data.data : [];
          for (const row of rows) {
            const cid = String(row.journeyId || '').trim();
            if (cid) progressByJourney[cid] = row;
          }
        } catch {
          /* ignore */
        }

        let slideJourneys: SlideSummaryJourney[] = [];
        try {
          const sr = await axios.get<{ success?: boolean; data?: { journeys?: SlideSummaryJourney[] } }>(
            `${base}/training_journeys/rep/${encodeURIComponent(repId)}/progress-summary`
          );
          const payload = sr.data?.data && typeof sr.data.data === 'object' ? sr.data.data : sr.data;
          slideJourneys = Array.isArray((payload as { journeys?: SlideSummaryJourney[] })?.journeys)
            ? (payload as { journeys: SlideSummaryJourney[] }).journeys
            : [];
        } catch {
          slideJourneys = [];
        }

        const structuredByJourney: Record<string, StructuredProgressLite> = {};

        for (const [jid, journey] of journeyMap.entries()) {
          const progress = progressByJourney[jid];
          let structured = structuredByJourney[jid];
          if (!structured) {
            try {
              const sr = await axios.get<{ success?: boolean; data?: unknown }>(
                `${base}/training_journeys/progress/${encodeURIComponent(repId)}/${encodeURIComponent(jid)}`
              );
              const parsed = normalizeStructured(sr.data?.data);
              if (parsed) structuredByJourney[jid] = parsed;
              structured = parsed || undefined;
            } catch {
              structured = undefined;
            }
          }

          const completed = isJourneyCompleted(jid, slideJourneys, progress, structured);
          const scriptPending = scriptModuleStillPending(journey, structured, progress);
          const notifKey = scriptNotificationId(jid);

          if (completed && scriptPending) {
            const title = journeyTitle(journey);
            const { title: nTitle, message } = buildScriptNotificationCopy(title, isFr);
            const gigId = gigIdFromJourney(journey);
            await upsertNotificationApi({
              notificationKey: notifKey,
              kind: 'script_required',
              title: nTitle,
              message,
              gigId: gigId || undefined,
              journeyId: jid,
              actionPath: gigId ? `/training?gigId=${encodeURIComponent(gigId)}` : '/training',
            });
          } else {
            await deleteNotificationByKey(notifKey).catch(() => {});
          }
        }

        window.dispatchEvent(new Event(NOTIFICATIONS_REFRESH_EVENT));
      } finally {
        syncingRef.current = false;
      }
    };

    void sync();
    const interval = window.setInterval(() => void sync(), 5 * 60 * 1000);
    const onTrainingUpdate = () => void sync();
    window.addEventListener('TRAINING_PROGRESS_UPDATED', onTrainingUpdate);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('TRAINING_PROGRESS_UPDATED', onTrainingUpdate);
    };
  }, []);

  return null;
}
