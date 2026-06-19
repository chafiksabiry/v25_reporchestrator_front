import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { connectRepEnrollmentSocket } from '../lib/enrollmentSocket';
import { getAgentId } from '../utils/authUtils';
import i18n from '../i18n';

export type RepNotificationKind = 'enrollment' | 'script_required' | 'certification_required' | 'general';

export type RepNotification = {
  id: string;
  kind: RepNotificationKind;
  /** Legacy enrollment status (enrolled / rejected). */
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
  /** Play chime when creating a new notification (default true). */
  playSound?: boolean;
};

type NotificationsContextValue = {
  notifications: RepNotification[];
  unreadCount: number;
  upsertNotification: (input: UpsertNotificationInput) => void;
  addEnrollmentNotification: (status: string, gigId?: string) => void;
  markAsRead: (id: string) => void;
  markAsUnread: (id: string) => void;
  markAllRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const MAX_NOTIFICATIONS = 100;

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

function storageKey(): string {
  const agentId = getAgentId() || 'anon';
  return `rep_notifications_${agentId}`;
}

function normalizeStoredNotification(raw: unknown): RepNotification | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const id = String(row.id || '').trim();
  if (!id) return null;
  const kindRaw = String(row.kind || row.status || 'general');
  const kind: RepNotificationKind =
    kindRaw === 'script_required' ||
    kindRaw === 'certification_required' ||
    kindRaw === 'enrollment' ||
    kindRaw === 'general'
      ? kindRaw
      : row.status === 'enrolled' || row.status === 'rejected'
        ? 'enrollment'
        : 'general';

  return {
    id,
    kind,
    status: row.status != null ? String(row.status) : undefined,
    gigId: row.gigId != null ? String(row.gigId) : undefined,
    journeyId: row.journeyId != null ? String(row.journeyId) : undefined,
    title: String(row.title || ''),
    message: String(row.message || ''),
    createdAt: Number(row.createdAt) || Date.now(),
    read: Boolean(row.read),
    actionPath: row.actionPath != null ? String(row.actionPath) : undefined,
  };
}

function loadFromStorage(): RepNotification[] {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeStoredNotification)
      .filter((n): n is RepNotification => n != null);
  } catch {
    return [];
  }
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
  const [notifications, setNotifications] = useState<RepNotification[]>(() => loadFromStorage());

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(), JSON.stringify(notifications));
    } catch {
      /* ignore */
    }
  }, [notifications]);

  const upsertNotification = useCallback((input: UpsertNotificationInput) => {
    setNotifications((prev) => {
      const idx = prev.findIndex((n) => n.id === input.id);
      if (idx >= 0) {
        const existing = prev[idx];
        const updated: RepNotification = {
          ...existing,
          kind: input.kind,
          title: input.title,
          message: input.message,
          gigId: input.gigId,
          journeyId: input.journeyId,
          actionPath: input.actionPath,
        };
        const next = [...prev];
        next[idx] = updated;
        return next;
      }

      if (input.playSound !== false) playNotificationSound();

      const notif: RepNotification = {
        id: input.id,
        kind: input.kind,
        gigId: input.gigId,
        journeyId: input.journeyId,
        title: input.title,
        message: input.message,
        actionPath: input.actionPath,
        createdAt: Date.now(),
        read: false,
      };
      return [notif, ...prev].slice(0, MAX_NOTIFICATIONS);
    });
  }, []);

  const addEnrollmentNotification = useCallback((status: string, gigId?: string) => {
    const { title, message } = buildEnrollmentMessage(status);
    upsertNotification({
      id: `enrollment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      kind: 'enrollment',
      title,
      message,
      gigId,
      playSound: true,
    });
  }, [upsertNotification]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id && !n.read ? { ...n, read: true } : n))
    );
  }, []);

  const markAsUnread = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id && n.read ? { ...n, read: false } : n))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => (n.read ? n : { ...n, read: true })));
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

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
