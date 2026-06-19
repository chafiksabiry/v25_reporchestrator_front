import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  MessageSquare,
  Trash2,
  X,
  Mail,
  MailOpen,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNotifications, type RepNotification } from '../../contexts/NotificationsContext';
import { HARX_NAVBAR_BG } from '../../utils/harxBrand';

function timeAgo(ts: number, isFr: boolean): string {
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return isFr ? "À l'instant" : 'Just now';
  if (m < 60) return isFr ? `Il y a ${m} min` : `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return isFr ? `Il y a ${h} h` : `${h} h ago`;
  const d = Math.floor(h / 24);
  return isFr ? `Il y a ${d} j` : `${d} d ago`;
}

function notificationIcon(n: RepNotification) {
  if (n.kind === 'script_required') {
    return (
      <div className="mt-0.5 shrink-0 h-7 w-7 rounded-lg flex items-center justify-center bg-amber-500/30 text-amber-100">
        <MessageSquare className="h-4 w-4" />
      </div>
    );
  }
  if (n.status === 'enrolled' || n.kind === 'enrollment') {
    return (
      <div className="mt-0.5 shrink-0 h-7 w-7 rounded-lg flex items-center justify-center bg-emerald-500/30 text-emerald-200">
        <CheckCheck className="h-4 w-4" />
      </div>
    );
  }
  if (n.status === 'rejected') {
    return (
      <div className="mt-0.5 shrink-0 h-7 w-7 rounded-lg flex items-center justify-center bg-rose-500/30 text-rose-200">
        <Check className="h-4 w-4" />
      </div>
    );
  }
  return (
    <div className="mt-0.5 shrink-0 h-7 w-7 rounded-lg flex items-center justify-center bg-white/20 text-white">
      <Bell className="h-4 w-4" />
    </div>
  );
}

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAsUnread,
    markAllRead,
    removeNotification,
    clearAll,
  } = useNotifications();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isFr = (i18n.language || '').toLowerCase().startsWith('fr');
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const visible = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  const handleOpenNotification = (n: RepNotification) => {
    if (!n.read) markAsRead(n.id);
    if (n.actionPath) {
      navigate(n.actionPath);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-2.5 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all duration-200 shadow-sm"
        aria-label={isFr ? 'Notifications' : 'Notifications'}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none ring-2 ring-white shadow-md animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{ backgroundImage: HARX_NAVBAR_BG }}
          className="absolute right-0 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] border border-white/20 rounded-2xl shadow-2xl shadow-[#8A1250]/40 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="px-4 py-3 border-b border-white/20 bg-white/10 backdrop-blur-sm space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-sm font-black text-white block">
                  {isFr ? 'Notifications' : 'Notifications'}
                </span>
                <span className="text-[10px] font-medium text-white/60">
                  {isFr ? 'Historique' : 'History'} · {notifications.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                    title={isFr ? 'Tout marquer comme lu' : 'Mark all read'}
                  >
                    <MailOpen className="h-4 w-4" />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                    title={isFr ? 'Tout effacer' : 'Clear all'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${
                  filter === 'all' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                {isFr ? 'Toutes' : 'All'} ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('unread')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${
                  filter === 'unread' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                {isFr ? 'Non lues' : 'Unread'} ({unreadCount})
              </button>
            </div>
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            {visible.length === 0 ? (
              <div className="px-4 py-10 text-center text-white/70">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-60" />
                <p className="text-sm font-medium">
                  {filter === 'unread'
                    ? isFr
                      ? 'Aucune notification non lue'
                      : 'No unread notifications'
                    : isFr
                      ? 'Aucune notification'
                      : 'No notifications'}
                </p>
              </div>
            ) : (
              visible.map((n) => (
                <div
                  key={n.id}
                  className={`group flex items-start gap-2 px-3 py-3 border-b border-white/10 transition-colors ${
                    n.read ? 'hover:bg-white/5' : 'bg-white/10 hover:bg-white/15'
                  }`}
                >
                  {!n.read && (
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-sky-300 shadow-sm" aria-hidden />
                  )}
                  {n.read && <span className="mt-2 h-2 w-2 shrink-0" aria-hidden />}
                  {notificationIcon(n)}
                  <button
                    type="button"
                    onClick={() => handleOpenNotification(n)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className={`text-sm leading-tight ${n.read ? 'font-semibold text-white/90' : 'font-bold text-white'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-white/80 mt-0.5 leading-snug line-clamp-3">{n.message}</p>
                    <p className="text-[10px] text-white/50 mt-1 font-medium">{timeAgo(n.createdAt, isFr)}</p>
                  </button>
                  <div className="flex flex-col gap-0.5 opacity-80 group-hover:opacity-100 shrink-0">
                    <button
                      type="button"
                      onClick={() => (n.read ? markAsUnread(n.id) : markAsRead(n.id))}
                      className="p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10"
                      title={
                        n.read
                          ? isFr
                            ? 'Marquer non lu'
                            : 'Mark unread'
                          : isFr
                            ? 'Marquer lu'
                            : 'Mark read'
                      }
                    >
                      {n.read ? <Mail className="h-3.5 w-3.5" /> : <MailOpen className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeNotification(n.id)}
                      className="p-1 rounded-md text-white/70 hover:text-rose-200 hover:bg-rose-500/20"
                      title={isFr ? 'Supprimer' : 'Delete'}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
