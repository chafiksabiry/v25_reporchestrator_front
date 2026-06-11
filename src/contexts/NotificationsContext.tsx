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

export type RepNotification = {
  id: string;
  /** Enrollment outcome that triggered the notification. */
  status: 'enrolled' | 'rejected' | string;
  gigId?: string;
  title: string;
  message: string;
  createdAt: number;
  read: boolean;
};

type NotificationsContextValue = {
  notifications: RepNotification[];
  unreadCount: number;
  markAllRead: () => void;
  clearAll: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const MAX_NOTIFICATIONS = 50;

/**
 * Play a short two-tone chime via the Web Audio API (no audio asset needed).
 * Wrapped in try/catch because browsers may block audio before any user
 * interaction; in that case we simply stay silent.
 */
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

    // Two ascending notes (G5 then C6) for a pleasant "ding-dong".
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
    // Close the context shortly after to free resources.
    window.setTimeout(() => ctx.close().catch(() => {}), 900);
  } catch {
    /* audio not available / blocked — ignore */
  }
}

function storageKey(): string {
  const agentId = getAgentId() || 'anon';
  return `rep_notifications_${agentId}`;
}

function loadFromStorage(): RepNotification[] {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildMessage(status: string): { title: string; message: string } {
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

  // Persist on every change.
  useEffect(() => {
    try {
      localStorage.setItem(storageKey(), JSON.stringify(notifications));
    } catch {
      /* ignore quota errors */
    }
  }, [notifications]);

  const addNotification = useCallback((status: string, gigId?: string) => {
    const { title, message } = buildMessage(status);
    const notif: RepNotification = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status,
      gigId,
      title,
      message,
      createdAt: Date.now(),
      read: false,
    };
    setNotifications((prev) => [notif, ...prev].slice(0, MAX_NOTIFICATIONS));
    playNotificationSound();
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => (n.read ? n : { ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Listen to enrollment outcomes (approve/reject) in real time, globally.
  useEffect(() => {
    const dispose = connectRepEnrollmentSocket((data) => {
      const status = String(data?.status || '');
      if (status === 'enrolled' || status === 'rejected') {
        addNotification(status, data?.gigId ? String(data.gigId) : undefined);
      }
    });
    return dispose;
  }, [addNotification]);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
      markAllRead,
      clearAll,
    }),
    [notifications, markAllRead, clearAll]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    // Safe fallback so the bell never crashes if used outside the provider.
    return { notifications: [], unreadCount: 0, markAllRead: () => {}, clearAll: () => {} };
  }
  return ctx;
}
