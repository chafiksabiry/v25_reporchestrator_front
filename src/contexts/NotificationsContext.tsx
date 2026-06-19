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
import { getAgentId } from '../utils/authUtils';
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

export type RepNotificationKind = 'enrollment' | 'script_required' | 'certification_required' | 'general';

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
  addEnrollmentNotification: (status: string, gigId?: string) => void;
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

function buildEnrollmentMessage(status: string): { title: string; message: string } {
  const isFr = (i18n.language || '').toLowerCase().startsWith('fr');
  if (status === 'enrolled') {
    return isFr
      ? { title: 'Candidature approuvée', message: 'Votre candidature a été approuvée — vous êtes inscrit !' }
      : { title: 'Application approved', message: 'Your application was approved — you are enrolled!' };
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
      const prevKeys = knownKeysRef.current;
      const hasNew = mapped.some(
        (n) => n.notificationKey && !prevKeys.has(n.notificationKey) && !n.read
      );
      if (hasNew) playNotificationSound();
      knownKeysRef.current = new Set(
        mapped.map((n) => n.notificationKey).filter((k): k is string => Boolean(k))
      );
      setNotifications(mapped);
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
    return () => window.removeEventListener(NOTIFICATIONS_REFRESH_EVENT, onRefresh);
  }, [refreshNotifications]);

  const upsertNotification = useCallback((input: UpsertNotificationInput) => {
    void (async () => {
      try {
        const created = await upsertNotificationApi({
          notificationKey: input.id,
          kind: input.kind,
          title: input.title,
          message: input.message,
          gigId: input.gigId,
          journeyId: input.journeyId,
          actionPath: input.actionPath,
          status: input.status,
        });
        if (created && input.playSound !== false) playNotificationSound();
        await refreshNotifications();
      } catch (err) {
        console.warn('[Notifications] upsert failed', err);
      }
    })();
  }, [refreshNotifications]);

  const addEnrollmentNotification = useCallback(
    (status: string, gigId?: string) => {
      const { title, message } = buildEnrollmentMessage(status);
      const key = `enrollment-${gigId || 'general'}-${status}`;
      upsertNotification({
        id: key,
        kind: 'enrollment',
        status,
        title,
        message,
        gigId,
        playSound: true,
      });
    },
    [upsertNotification]
  );

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
    const dispose = connectRepEnrollmentSocket((data) => {
      const status = String(data?.status || '');
      if (status === 'enrolled' || status === 'rejected') {
        addEnrollmentNotification(status, data?.gigId ? String(data.gigId) : undefined);
      }
    });
    return dispose;
  }, [addEnrollmentNotification]);

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
