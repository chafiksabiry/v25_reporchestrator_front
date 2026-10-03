import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { connectRepEnrollmentSocket } from '../lib/enrollmentSocket';
import { connectRepNotificationSocket } from '../lib/notificationSocket';
import { getAgentId, getAuthToken } from '../utils/authUtils';
import i18n from '../i18n';
import {
  fetchNotifications,
  upsertNotificationApi,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications,
  type ApiNotification,
} from '../services/api/notificationsApi';
import { fetchEnrolledGigsForAgent, fetchInvitedGigsForAgent } from '../utils/trainingScriptRequirement';

export type RepNotificationKind =
  | 'enrollment'
  | 'script_required'
  | 'certification_required'
  | 'general'
  | 'matching'
  | 'teammate'
  | 'training_added'
  | 'action_assigned'
  | 'kb_document'
  | 'script_added'
  | 'deactivated';

export type RepNotification = {
  id: string;
  notificationKey?: string;
  kind: RepNotificationKind;
  status?: string;
  gigId?: string;
  journeyId?: string;
  title: string;
  message: string;
  createdAt: number;
  read: boolean;
  actionPath?: string;
};

export type UpsertNotificationInput = {
  id: string;
  kind: RepNotificationKind;
  title: string;
  message: string;
  gigId?: string;
  journeyId?: string;
  actionPath?: string;
  playSound?: boolean;
  status?: string;
};

type NotificationsContextValue = {
  notifications: RepNotification[];
  unreadCount: number;
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  upsertNotification: (input: UpsertNotificationInput) => void;
  addEnrollmentNotification: (
    status: string,
    gigId?: string,
    gigTitle?: string,
    meta?: { enrollmentId?: string; invitationSentAt?: string | number }
  ) => void;
  markAsRead: (id: string) => void;
  markAsUnread: (id: string) => void;
  markAllRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export const NOTIFICATIONS_REFRESH_EVENT = 'NOTIFICATIONS_REFRESH';

function playNotificationSound() {
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);

    const notes = [
      { freq: 784, start: 0, dur: 0.18 },
      { freq: 1047, start: 0.16, dur: 0.28 },
    ];

    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t0 = now + start;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    });

    master.gain.setValueAtTime(1, now);
    window.setTimeout(() => ctx.close().catch(() => {}), 900);
  } catch {
    /* ignore */
  }
}

function mapApiRow(row: ApiNotification): RepNotification {
  return {
    id: row.id,
    notificationKey: row.notificationKey,
    kind: row.kind,
    status: row.status,
    gigId: row.gigId,
    journeyId: row.journeyId,
    title: row.title,
    message: row.message,
    createdAt: row.createdAt,
    read: row.read,
    actionPath: row.actionPath,
  };
}

function buildEnrollmentMessage(status: string, gigTitle?: string): { title: string; message: string } {
  const isFr = (i18n.language || '').toLowerCase().startsWith('fr');
  const suffix = gigTitle ? ` (${gigTitle})` : '';
  if (status === 'invited') {
    return isFr
      ? {
          title: 'Nouvelle invitation',
          message: gigTitle
            ? `Une entreprise vous invite sur « ${gigTitle} ».`
            : 'Une entreprise vous invite à rejoindre un gig.',
        }
      : {
          title: 'New invitation',
          message: gigTitle
            ? `A company invited you to “${gigTitle}”.`
            : 'A company invited you to join a gig.',
        };
  }
  if (status === 'enrolled') {
    return isFr
      ? { title: 'Candidature approuvée', message: `Votre candidature a été approuvée — vous êtes inscrit !${suffix}` }
      : { title: 'Application approved', message: `Your application was approved — you are enrolled!${suffix}` };
  }
  if (status === 'rejected') {
    return isFr
      ? { title: 'Candidature non retenue', message: "Votre candidature n'a pas été retenue. Vous pouvez re-postuler." }
      : { title: 'Application not selected', message: 'Your application was not selected. You can re-apply.' };
  }
  return isFr
    ? { title: 'Mise à jour', message: 'Le statut de votre candidature a changé.' }
    : { title: 'Update', message: 'Your application status changed.' };
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<RepNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const knownKeysRef = useRef<Set<string>>(new Set());

  const refreshNotifications = useCallback(async () => {
    const agentId = getAgentId();
    if (!agentId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      const rows = await fetchNotifications();
      const mapped = rows.map(mapApiRow);
      const serverKeys = new Set(
        mapped.map((n) => n.notificationKey).filter((k): k is string => Boolean(k))
      );

      setNotifications((prev) => {
        // Keep recent optimistic rows until the server has them (avoid wipe on slow upsert).
        const pendingOptimistic = prev.filter((n) => {
          const key = n.notificationKey || n.id;
          if (!key || serverKeys.has(key)) return false;
          const age = Date.now() - (n.createdAt || 0);
          return age >= 0 && age < 120_000;
        });
        const merged = [...pendingOptimistic, ...mapped];
        const prevKeys = knownKeysRef.current;
        const hasNew = merged.some(
          (n) => n.notificationKey && !prevKeys.has(n.notificationKey) && !n.read
        );
        if (hasNew) playNotificationSound();
        knownKeysRef.current = new Set(
          merged.map((n) => n.notificationKey).filter((k): k is string => Boolean(k))
        );
        return merged;
      });
    } catch (err) {
      console.warn('[Notifications] fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshNotifications();
    const onRefresh = () => void refreshNotifications();
    window.addEventListener(NOTIFICATIONS_REFRESH_EVENT, onRefresh);
    const poll = window.setInterval(() => void refreshNotifications(), 45_000);
    return () => {
      window.removeEventListener(NOTIFICATIONS_REFRESH_EVENT, onRefresh);
      window.clearInterval(poll);
    };
  }, [refreshNotifications]);

  const upsertNotification = useCallback((input: UpsertNotificationInput) => {
    const optimistic: RepNotification = {
      id: input.id,
      notificationKey: input.id,
      kind: input.kind,
      status: input.status,
      title: input.title,
      message: input.message,
      gigId: input.gigId,
      journeyId: input.journeyId,
      actionPath:
        input.actionPath ||
        (input.kind === 'enrollment' && input.status === 'invited'
          ? '/marketplace?tab=invited'
          : input.kind === 'enrollment' && input.gigId
            ? `/gig/${input.gigId}`
            : input.kind === 'enrollment'
              ? '/marketplace'
              : undefined),
      createdAt: Date.now(),
      read: false,
    };

    // Show instantly in the bell (don't wait for network).
    setNotifications((prev) => {
      const without = prev.filter(
        (n) => n.notificationKey !== input.id && n.id !== input.id
      );
      return [optimistic, ...without];
    });
    knownKeysRef.current.add(input.id);
    if (input.playSound !== false) playNotificationSound();

    void (async () => {
      try {
        const created = await upsertNotificationApi({
          notificationKey: input.id,
          kind: input.kind,
          title: input.title,
          message: input.message,
          gigId: input.gigId,
          journeyId: input.journeyId,
          actionPath: optimistic.actionPath,
          status: input.status,
        });
        if (created?.id && created.id !== input.id) {
          setNotifications((prev) =>
            prev.map((n) =>
              n.notificationKey === input.id || n.id === input.id
                ? { ...n, id: created.id, createdAt: created.createdAt || n.createdAt }
                : n
            )
          );
        }
      } catch (err) {
        console.warn('[Notifications] upsert failed', err);
        void refreshNotifications();
      }
    })();
  }, [refreshNotifications]);

  const addEnrollmentNotification = useCallback(
    (
      status: string,
      gigId?: string,
      gigTitle?: string,
      meta?: { enrollmentId?: string; invitationSentAt?: string | number }
    ) => {
      const { title, message } = buildEnrollmentMessage(status, gigTitle);
      // Invites: unique key per invite wave (re-invite after reject → new bell row).
      // Never use Date.now() for stable poll sync — that would spam a new row every tick.
      let key: string;
      if (status === 'invited') {
        const inviteMs =
          meta?.invitationSentAt != null ? new Date(meta.invitationSentAt).getTime() : NaN;
        if (Number.isFinite(inviteMs)) {
          key = `enrollment-${gigId || 'general'}-invited-${meta?.enrollmentId || 'x'}-${inviteMs}`;
        } else if (meta?.enrollmentId) {
          key = `enrollment-${gigId || 'general'}-invited-${meta.enrollmentId}`;
        } else {
          key = `enrollment-${gigId || 'general'}-invited`;
        }
      } else {
        key = `enrollment-${gigId || 'general'}-${status}`;
      }
      if (knownKeysRef.current.has(key)) {
        // Already shown — avoid duplicate sound / re-insert.
        return;
      }
      upsertNotification({
        id: key,
        kind: 'enrollment',
        status,
        title,
        message,
        gigId,
        actionPath:
          status === 'invited'
            ? '/marketplace?tab=invited'
            : gigId
              ? `/gig/${gigId}`
              : '/marketplace',
        playSound: true,
      });
    },
    [upsertNotification]
  );

  // Keep invite/enrollment alerts in the bell on EVERY page (not only after opening Gigs).
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const agentId = getAgentId();
      const token = getAuthToken();
      if (!agentId || !token) return;
      try {
        const [rows, enrolled, invited] = await Promise.all([
          fetchNotifications(),
          fetchEnrolledGigsForAgent(agentId, token),
          fetchInvitedGigsForAgent(agentId, token),
        ]);
        if (cancelled) return;
        const keys = new Set(
          rows.map((r) => r.notificationKey).filter((k): k is string => Boolean(k))
        );

        // Invites: optimistic local insert so Dashboard/TopBar badge updates immediately.
        for (const gig of invited) {
          addEnrollmentNotification('invited', gig.gigId, gig.title, {
            enrollmentId: gig.enrollmentId,
            invitationSentAt: gig.invitationSentAt,
          });
        }

        // Enrolled backfill (API only — quieter, no sound spam on every poll).
        let wrote = false;
        const upserts: Promise<unknown>[] = [];
        for (const gig of enrolled) {
          const key = `enrollment-${gig.gigId}-enrolled`;
          if (keys.has(key) || knownKeysRef.current.has(key)) continue;
          const { title, message } = buildEnrollmentMessage('enrolled', gig.title);
          upserts.push(
            upsertNotificationApi({
              notificationKey: key,
              kind: 'enrollment',
              status: 'enrolled',
              title,
              message,
              gigId: gig.gigId,
              actionPath: `/gig/${gig.gigId}`,
            })
          );
          keys.add(key);
          wrote = true;
        }
        if (upserts.length) await Promise.all(upserts);
        if (!cancelled && wrote) await refreshNotifications();
      } catch (err) {
        console.warn('[Notifications] enrollment/invite sync failed', err);
      }
    };
    // Run ASAP on any page (Dashboard included), then keep in sync.
    const start = window.setTimeout(() => void run(), 80);
    const poll = window.setInterval(() => void run(), 20_000);
    return () => {
      cancelled = true;
      window.clearTimeout(start);
      window.clearInterval(poll);
    };
  }, [refreshNotifications, addEnrollmentNotification]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id && !n.read ? { ...n, read: true } : n))
    );
    void markNotificationRead(id, true).catch((err) => {
      console.warn('[Notifications] mark read failed', err);
      void refreshNotifications();
    });
  }, [refreshNotifications]);

  const markAsUnread = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id && n.read ? { ...n, read: false } : n))
    );
    void markNotificationRead(id, false).catch((err) => {
      console.warn('[Notifications] mark unread failed', err);
      void refreshNotifications();
    });
  }, [refreshNotifications]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => (n.read ? n : { ...n, read: true })));
    void markAllNotificationsRead().catch((err) => {
      console.warn('[Notifications] mark all read failed', err);
      void refreshNotifications();
    });
  }, [refreshNotifications]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    void deleteNotification(id).catch((err) => {
      console.warn('[Notifications] delete failed', err);
      void refreshNotifications();
    });
  }, [refreshNotifications]);

  const clearAll = useCallback(() => {
    setNotifications([]);
    void clearAllNotifications().catch((err) => {
      console.warn('[Notifications] clear all failed', err);
      void refreshNotifications();
    });
  }, [refreshNotifications]);

  useEffect(() => {
    const dispose = connectRepEnrollmentSocket(
      (data) => {
        const status = String(data?.status || '');
        if (status === 'enrolled' || status === 'rejected' || status === 'invited') {
          // Optimistic bell update (instant). No extra full refresh — upsert syncs id.
          addEnrollmentNotification(
            status,
            data?.gigId ? String(data.gigId) : undefined,
            data?.gigTitle ? String(data.gigTitle) : undefined,
            {
              enrollmentId: data?.enrollmentId ? String(data.enrollmentId) : undefined,
              invitationSentAt:
                data?.invitationSentAt != null
                  ? (data.invitationSentAt as string | number)
                  : undefined,
            }
          );
        } else {
          void refreshNotifications();
        }
      },
      {
        onConnect: () => {
          void refreshNotifications();
        },
      }
    );
    return dispose;
  }, [addEnrollmentNotification, refreshNotifications]);

  // Realtime activity notifications from dash_rep_back (matching, teammate, training, KB, …).
  useEffect(() => {
    const dispose = connectRepNotificationSocket(
      (data) => {
        const n = data.notification;
        if (!n) return;
        const key = String(n.notificationKey || n.id || '').trim();
        if (!key) {
          void refreshNotifications();
          return;
        }
        if (knownKeysRef.current.has(key)) {
          return;
        }
        const kind = (n.kind || 'general') as RepNotificationKind;
        const row: RepNotification = {
          id: String(n.id || key),
          notificationKey: key,
          kind,
          status: n.status,
          title: String(n.title || 'Notification'),
          message: String(n.message || ''),
          gigId: n.gigId ? String(n.gigId) : undefined,
          journeyId: n.journeyId ? String(n.journeyId) : undefined,
          actionPath: n.actionPath ? String(n.actionPath) : undefined,
          createdAt: typeof n.createdAt === 'number' ? n.createdAt : Date.now(),
          read: !!n.read,
        };
        knownKeysRef.current.add(key);
        setNotifications((prev) => {
          const without = prev.filter(
            (x) => x.notificationKey !== key && x.id !== row.id && x.id !== key
          );
          return [row, ...without];
        });
        if (data.created !== false && !row.read) {
          playNotificationSound();
        }
      },
      {
        onConnect: () => {
          void refreshNotifications();
        },
      }
    );
    return dispose;
  }, [refreshNotifications]);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
      loading,
      refreshNotifications,
      upsertNotification,
      addEnrollmentNotification,
      markAsRead,
      markAsUnread,
      markAllRead,
      removeNotification,
      clearAll,
    }),
    [
      notifications,
      loading,
      refreshNotifications,
      upsertNotification,
      addEnrollmentNotification,
      markAsRead,
      markAsUnread,
      markAllRead,
      removeNotification,
      clearAll,
    ]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    return {
      notifications: [],
      unreadCount: 0,
      loading: false,
      refreshNotifications: async () => {},
      upsertNotification: () => {},
      addEnrollmentNotification: () => {},
      markAsRead: () => {},
      markAsUnread: () => {},
      markAllRead: () => {},
      removeNotification: () => {},
      clearAll: () => {},
    };
  }
  return ctx;
}
