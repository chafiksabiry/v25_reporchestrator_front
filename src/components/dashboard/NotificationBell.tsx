import { useEffect, useRef, useState } from 'react';
import { Bell, Check, CheckCheck, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../../contexts/NotificationsContext';
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

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications();
  const { i18n } = useTranslation();
  const isFr = (i18n.language || '').toLowerCase().startsWith('fr');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next && unreadCount > 0) markAllRead();
      return next;
    });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
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
          className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] border border-white/20 rounded-2xl shadow-2xl shadow-[#8A1250]/40 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/20 bg-white/10 backdrop-blur-sm">
            <span className="text-sm font-black text-white">
              {isFr ? 'Notifications' : 'Notifications'}
            </span>
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="flex items-center gap-1 text-[11px] font-bold text-white/80 hover:text-white transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {isFr ? 'Tout effacer' : 'Clear all'}
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center text-white/70">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-60" />
                <p className="text-sm font-medium">
                  {isFr ? 'Aucune notification' : 'No notifications'}
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="flex items-start gap-3 px-4 py-3 border-b border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div
                    className={`mt-0.5 shrink-0 h-7 w-7 rounded-lg flex items-center justify-center ${
                      n.status === 'enrolled'
                        ? 'bg-emerald-500/30 text-emerald-200'
                        : n.status === 'rejected'
                        ? 'bg-rose-500/30 text-rose-200'
                        : 'bg-white/20 text-white'
                    }`}
                  >
                    {n.status === 'enrolled' ? (
                      <CheckCheck className="h-4 w-4" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white leading-tight">{n.title}</p>
                    <p className="text-xs text-white/80 mt-0.5 leading-snug">{n.message}</p>
                    <p className="text-[10px] text-white/50 mt-1 font-medium">
                      {timeAgo(n.createdAt, isFr)}
                    </p>
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
