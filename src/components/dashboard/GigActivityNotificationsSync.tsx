import { useEffect, useRef } from 'react';
import axios from 'axios';
import i18n from '../../i18n';
import { NOTIFICATIONS_REFRESH_EVENT } from '../../contexts/NotificationsContext';
import { getAgentId, getAuthToken } from '../../utils/authUtils';
import { upsertNotificationApi } from '../../services/api/notificationsApi';
import type { RepNotificationKind } from '../../contexts/NotificationsContext';
import { fetchEnrolledGigsForAgent, trainingApiBase } from '../../utils/trainingScriptRequirement';
import { getGigsApiBase } from '../../utils/gigsApiBase';
import { repApiUrl } from '../../utils/repApiUrl';

const SEEN_PREFIX = 'harx_gig_activity_seen_v2_';
const POLL_MS = 3 * 60 * 1000;

type SeenState = {
  initialized: boolean;
  keys: string[];
};

function matchingApi(): string {
  return String(import.meta.env.VITE_MATCHING_API_URL || 'https://v25matchingbackend-production.up.railway.app/api').replace(/\/$/, '');
}

function kbApi(): string {
  const raw =
    import.meta.env.VITE_KNOWLEDGEBASE_API_URL ||
    import.meta.env.VITE_BACKEND_KNOWLEDGEBASE_API ||
    'https://v25knowledgebasebackend-production.up.railway.app/api';
  const base = String(raw).replace(/\/$/, '');
  return base.endsWith('/api') ? base : `${base}/api`;
}

function loadSeen(repId: string): SeenState {
  try {
    const raw = localStorage.getItem(`${SEEN_PREFIX}${repId}`);
    if (!raw) return { initialized: false, keys: [] };
    const parsed = JSON.parse(raw) as SeenState;
    return {
      initialized: !!parsed.initialized,
      keys: Array.isArray(parsed.keys) ? parsed.keys.map(String) : [],
    };
  } catch {
    return { initialized: false, keys: [] };
  }
}

function saveSeen(repId: string, keys: string[]): void {
  localStorage.setItem(
    `${SEEN_PREFIX}${repId}`,
    JSON.stringify({ initialized: true, keys: Array.from(new Set(keys)) })
  );
}

function nid(raw: unknown): string {
  if (raw == null) return '';
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw === 'object' && raw !== null) {
    const o = raw as { _id?: unknown; $oid?: unknown; id?: unknown };
    if (o.$oid) return String(o.$oid).trim();
    if (o._id) return nid(o._id);
    if (o.id) return String(o.id).trim();
  }
  return String(raw).trim();
}

function asList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  const row = payload as Record<string, unknown>;
  for (const key of ['data', 'documents', 'matches', 'preferedmatches', 'agents', 'gigs', 'scripts']) {
    if (Array.isArray(row[key])) return row[key] as unknown[];
  }
  return [];
}

function scorePercent(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return NaN;
  return n <= 1 ? Math.round(n * 100) : Math.round(n);
}

function isJoined(status: unknown): boolean {
  const s = String(status || '').toLowerCase();
  if (!s) return true;
  return ['enrolled', 'accepted', 'active', 'approved'].includes(s);
}

function isInactive(status: unknown, isActive?: unknown): boolean {
  if (isActive === false) return true;
  const s = String(status || '').toLowerCase();
  return ['inactive', 'disabled', 'deactivated', 'archived', 'paused', 'draft', 'cancelled', 'canceled'].includes(s);
}

function copy(isFr: boolean, fr: { title: string; message: string }, en: { title: string; message: string }) {
  return isFr ? fr : en;
}

/**
 * Notifications activité GIG : matching ≥ 50 %, nouveau REP, formation/consigne,
 * action assignée, document KB, nouveau script, désactivation.
 * Premier passage = baseline (pas de flood). Ensuite upsert des nouveautés.
 */
export function GigActivityNotificationsSync() {
  const syncingRef = useRef(false);

  useEffect(() => {
    const sync = async () => {
      if (syncingRef.current) return;
      const repId = getAgentId();
      const token = getAuthToken() || '';
      if (!repId || !token) return;
      syncingRef.current = true;
      const isFr = (i18n.language || '').toLowerCase().startsWith('fr');
      const headers = { Authorization: `Bearer ${token}` };
      const seen = loadSeen(repId);
      const nextKeys = new Set(seen.keys);
      const pending: Array<{
        key: string;
        kind: RepNotificationKind;
        title: string;
        message: string;
        gigId?: string;
        journeyId?: string;
        actionPath?: string;
        status: string;
      }> = [];

      const remember = (key: string, n?: (typeof pending)[number]) => {
        if (!key) return;
        if (!seen.initialized) {
          nextKeys.add(key);
          return;
        }
        if (seen.keys.includes(key)) {
          nextKeys.add(key);
          return;
        }
        nextKeys.add(key);
        if (n) pending.push(n);
      };

      try {
        const enrolled = await fetchEnrolledGigsForAgent(repId, token).catch(() => []);
        const enrolledIds = new Set(enrolled.map((g) => g.gigId));

        // 1) Matching auto ≥ 50 % — POST /matches/agent/:id (le GET /matches n'existe pas)
        try {
          const res = await axios.post(
            `${matchingApi()}/matches/agent/${encodeURIComponent(repId)}`,
            {
              weights: {
                experience: 0.15,
                skills: 0.2,
                industry: 0.15,
                language: 0.1,
                availability: 0.1,
                timezone: 0.05,
                performance: 0.2,
                region: 0.05,
              },
            },
            { headers }
          );
          const rows = asList(res.data);
          for (const raw of rows) {
            const row = raw as Record<string, any>;
            const scorePct = scorePercent(row?.totalMatchingScore ?? row?.overallScore ?? row?.score ?? row?.matchScore);
            if (!Number.isFinite(scorePct) || scorePct < 50) continue;
            const gigId = nid(row?.gigId?._id || row?.gigId || row?.gig?._id);
            if (!gigId || enrolledIds.has(gigId)) continue;
            const title = String(row?.gig?.title || row?.gigId?.title || row?.gigTitle || row?.title || 'Gig');
            const key = `match:${gigId}`;
            remember(key, {
              key,
              kind: 'matching',
              status: 'matching',
              gigId,
              actionPath: `/marketplace?gigId=${encodeURIComponent(gigId)}`,
              ...copy(
                isFr,
                {
                  title: 'Nouveau projet correspondant',
                  message: `« ${title} » matche à ${scorePct} % avec votre profil.`,
                },
                {
                  title: 'New matching project',
                  message: `"${title}" matches your profile at ${scorePct}%.`,
                }
              ),
            });
          }
        } catch {
          /* optional */
        }

        // 2) Nouveaux REPS sur les GIGS déjà inscrits
        await Promise.all(
          enrolled.map(async ({ gigId, title }) => {
            try {
              const res = await axios.get(`${matchingApi()}/gig-agents/gig/${encodeURIComponent(gigId)}`, { headers });
              const rows = asList(res.data);
              for (const raw of rows) {
                const row = raw as Record<string, any>;
                if (!isJoined(row?.status)) continue;
                const otherId = nid(row?.agentId?._id || row?.agentId);
                if (!otherId || otherId === repId) continue;
                const name = String(
                  row?.agentId?.personalInfo?.name ||
                    row?.agentId?.firstName ||
                    row?.agentId?.name ||
                    row?.agentName ||
                    'REP'
                );
                const key = `teammate:${gigId}:${otherId}`;
                remember(key, {
                  key,
                  kind: 'teammate',
                  status: 'teammate',
                  gigId,
                  actionPath: `/workspace?gigId=${encodeURIComponent(gigId)}`,
                  ...copy(
                    isFr,
                    {
                      title: 'Nouveau REP sur votre GIG',
                      message: `${name} a rejoint « ${title} ».`,
                    },
                    {
                      title: 'New REP on your gig',
                      message: `${name} joined "${title}".`,
                    }
                  ),
                });
              }
            } catch {
              /* ignore */
            }
          })
        );

        // 3) Formations / consignes + 7) désactivation formation
        const trainingBase = trainingApiBase();
        if (trainingBase) {
          await Promise.all(
            enrolled.map(async ({ gigId, title }) => {
              try {
                const res = await axios.get(
                  `${trainingBase}/training_journeys/gig/${encodeURIComponent(gigId)}`,
                  { headers }
                );
                const arr = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
                for (const j of arr) {
                  const jid = nid(j?._id || j?.id);
                  if (!jid) continue;
                  const jTitle = String(j?.title || j?.name || 'Formation');
                  const isConsigne = /consigne|instruction/i.test(
                    `${j?.type || ''} ${j?.category || ''} ${jTitle}`
                  );
                  const key = `training:${jid}`;
                  remember(key, {
                    key,
                    kind: 'training_added',
                    status: 'training_added',
                    gigId,
                    journeyId: jid,
                    actionPath: `/training?gigId=${encodeURIComponent(gigId)}`,
                    ...copy(
                      isFr,
                      {
                        title: isConsigne ? 'Nouvelle consigne' : 'Nouvelle formation',
                        message: isConsigne
                          ? `La consigne « ${jTitle} » a été ajoutée sur ${title}.`
                          : `La formation « ${jTitle} » a été ajoutée sur ${title}.`,
                      },
                      {
                        title: isConsigne ? 'New instruction' : 'New training',
                        message: isConsigne
                          ? `Instruction "${jTitle}" was added on ${title}.`
                          : `Training "${jTitle}" was added on ${title}.`,
                      }
                    ),
                  });
                  if (isInactive(j?.status, j?.isActive)) {
                    const dkey = `deact:training:${jid}`;
                    remember(dkey, {
                      key: dkey,
                      kind: 'deactivated',
                      status: 'deactivated',
                      gigId,
                      journeyId: jid,
                      actionPath: `/training?gigId=${encodeURIComponent(gigId)}`,
                      ...copy(
                        isFr,
                        {
                          title: 'Formation désactivée',
                          message: `« ${jTitle} » n’est plus active sur ${title}.`,
                        },
                        {
                          title: 'Training deactivated',
                          message: `"${jTitle}" is no longer active on ${title}.`,
                        }
                      ),
                    });
                  }
                }
              } catch {
                /* ignore */
              }
            })
          );
        }

        // 4) Actions assignées au REP (parcours assignés + actions onboarding)
        try {
          if (trainingBase) {
            const res = await axios.get(`${trainingBase}/training_journeys/rep/${encodeURIComponent(repId)}`, {
              headers,
            });
            const arr = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
            for (const j of arr) {
              const jid = nid(j?._id || j?.id);
              if (!jid) continue;
              if (nextKeys.has(`training:${jid}`)) continue;
              const jTitle = String(j?.title || j?.name || 'Action');
              const key = `action:journey:${jid}`;
              remember(key, {
                key,
                kind: 'action_assigned',
                status: 'action_assigned',
                journeyId: jid,
                actionPath: '/training',
                ...copy(
                  isFr,
                  {
                    title: 'Action assignée',
                    message: `Une formation vous a été assignée : « ${jTitle} ».`,
                  },
                  {
                    title: 'Action assigned',
                    message: `A training was assigned to you: "${jTitle}".`,
                  }
                ),
              });
            }
          }
        } catch {
          /* ignore */
        }
        try {
          const profileRes = await fetch(repApiUrl(`/profiles/${repId}`), { headers });
          if (profileRes.ok) {
            const profile = await profileRes.json();
            const phases = profile?.onboardingProgress?.phases || {};
            for (const [phaseKey, phase] of Object.entries(phases)) {
              const rawActions = (phase as { requiredActions?: unknown })?.requiredActions;
              const actions: Array<{ id: string; label: string }> = Array.isArray(rawActions)
                ? rawActions.map((a, idx) => {
                    const row = (a && typeof a === 'object' ? a : {}) as Record<string, unknown>;
                    const id = String(row.id || row.key || row.type || `${phaseKey}-${idx}`);
                    return { id, label: String(row.label || row.title || row.type || id) };
                  })
                : rawActions && typeof rawActions === 'object'
                  ? Object.keys(rawActions as Record<string, unknown>).map((id) => ({ id, label: id }))
                  : [];
              actions.forEach((action) => {
                const aid = action.id;
                const label = action.label;
                const key = `action:onboarding:${aid}`;
                remember(key, {
                  key,
                  kind: 'action_assigned',
                  status: 'action_assigned',
                  actionPath: '/onboarding/continue',
                  ...copy(
                    isFr,
                    {
                      title: 'Action assignée',
                      message: `Nouvelle action : ${label}.`,
                    },
                    {
                      title: 'Action assigned',
                      message: `New action: ${label}.`,
                    }
                  ),
                });
              });
            }
          }
        } catch {
          /* ignore */
        }

        // 5) Documents KB + 6) scripts + 7) désactivation script / projet
        const gigsBase = getGigsApiBase();
        await Promise.all(
          enrolled.map(async ({ gigId, title }) => {
            try {
              const docsRes = await axios.get(`${kbApi()}/documents`, { params: { gigId } });
              const docs = asList(docsRes.data) as Record<string, any>[];
              for (const doc of docs) {
                const did = nid(doc?._id || doc?.id);
                if (!did) continue;
                const dTitle = String(doc?.name || doc?.title || 'Document');
                const key = `kb:${did}`;
                remember(key, {
                  key,
                  kind: 'kb_document',
                  status: 'kb_document',
                  gigId,
                  actionPath: `/workspace?gigId=${encodeURIComponent(gigId)}`,
                  ...copy(
                    isFr,
                    {
                      title: 'Nouveau document KB',
                      message: `« ${dTitle} » a été ajouté à la base de connaissances de ${title}.`,
                    },
                    {
                      title: 'New KB document',
                      message: `"${dTitle}" was added to the ${title} knowledge base.`,
                    }
                  ),
                });
              }
            } catch {
              /* ignore */
            }

            try {
              const [callScripts, ragScripts] = await Promise.all([
                axios.get(`${kbApi()}/scripts/gig/${encodeURIComponent(gigId)}`).then((r) => asList(r.data)).catch(() => []),
                axios.get(`${kbApi()}/rag/scripts`, { params: { gigId } }).then((r) => asList(r.data)).catch(() => []),
              ]);
              const scripts = [...callScripts, ...ragScripts] as Record<string, any>[];
              for (const script of scripts) {
                const sid = nid(script?._id || script?.id);
                if (!sid) continue;
                const sTitle = String(script?.title || script?.name || 'Script');
                const key = `script:${sid}`;
                remember(key, {
                  key,
                  kind: 'script_added',
                  status: 'script_added',
                  gigId,
                  actionPath: `/training?gigId=${encodeURIComponent(gigId)}`,
                  ...copy(
                    isFr,
                    {
                      title: 'Nouveau script',
                      message: `Un script « ${sTitle} » a été ajouté sur ${title}.`,
                    },
                    {
                      title: 'New script',
                      message: `Script "${sTitle}" was added on ${title}.`,
                    }
                  ),
                });
                if (isInactive(script?.status, script?.isActive)) {
                  const dkey = `deact:script:${sid}`;
                  remember(dkey, {
                    key: dkey,
                    kind: 'deactivated',
                    status: 'deactivated',
                    gigId,
                    actionPath: `/training?gigId=${encodeURIComponent(gigId)}`,
                    ...copy(
                      isFr,
                      {
                        title: 'Script désactivé',
                        message: `Le script « ${sTitle} » n’est plus actif sur ${title}.`,
                      },
                      {
                        title: 'Script deactivated',
                        message: `Script "${sTitle}" is no longer active on ${title}.`,
                      }
                    ),
                  });
                }
              }
            } catch {
              /* ignore */
            }

            if (gigsBase) {
              try {
                const gRes = await axios.get(`${gigsBase}/gigs/${encodeURIComponent(gigId)}`);
                const gig = gRes.data?.data || gRes.data?.gig || gRes.data;
                if (gig && isInactive(gig.status, gig.isActive)) {
                  const dkey = `deact:gig:${gigId}`;
                  remember(dkey, {
                    key: dkey,
                    kind: 'deactivated',
                    status: 'deactivated',
                    gigId,
                    actionPath: `/marketplace?gigId=${encodeURIComponent(gigId)}`,
                    ...copy(
                      isFr,
                      {
                        title: 'Projet désactivé',
                        message: `Le projet « ${title} » a été désactivé.`,
                      },
                      {
                        title: 'Project deactivated',
                        message: `Project "${title}" was deactivated.`,
                      }
                    ),
                  });
                }
              } catch {
                /* ignore */
              }
            }
          })
        );

        saveSeen(repId, Array.from(nextKeys));

        if (seen.initialized && pending.length > 0) {
          for (const n of pending) {
            await upsertNotificationApi({
              notificationKey: n.key,
              kind: n.kind,
              status: n.status,
              title: n.title,
              message: n.message,
              gigId: n.gigId,
              journeyId: n.journeyId,
              actionPath: n.actionPath,
            }).catch(() => {});
          }
          window.dispatchEvent(new Event(NOTIFICATIONS_REFRESH_EVENT));
        }
      } finally {
        syncingRef.current = false;
      }
    };

    void sync();
    const interval = window.setInterval(() => void sync(), POLL_MS);
    return () => window.clearInterval(interval);
  }, []);

  return null;
}
