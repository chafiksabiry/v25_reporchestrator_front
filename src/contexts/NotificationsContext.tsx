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
