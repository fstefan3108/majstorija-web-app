import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, BriefcaseBusiness, CheckCircle, XCircle, Info, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const POLL_INTERVAL_MS = 30_000;

const TYPE_META = {
  job_request_received:  { icon: BriefcaseBusiness, color: 'text-blue-400',   label: 'Novi zahtev'      },
  job_request_accepted:  { icon: CheckCircle,        color: 'text-green-400',  label: 'Zahtev prihvaćen' },
  job_request_declined:  { icon: XCircle,            color: 'text-red-400',    label: 'Zahtev odbijen'   },
  job_confirmed:         { icon: CheckCircle,        color: 'text-green-400',  label: 'Posao potvrđen'   },
  job_finished:          { icon: CheckCircle,        color: 'text-purple-400', label: 'Posao završen'    },
  payment_captured:      { icon: CheckCircle,        color: 'text-green-400',  label: 'Uplata potvrđena' },
  review_received:       { icon: Star,               color: 'text-yellow-400', label: 'Nova ocena'       },
  general:               { icon: Info,               color: 'text-gray-400',   label: 'Obaveštenje'      },
};

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)    return 'malopre';
  if (diff < 3600)  return `pre ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `pre ${Math.floor(diff / 3600)}h`;
  return `pre ${Math.floor(diff / 86400)} dana`;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const dropdownRef = useRef(null);

  const recipientType = user?.role === 'Craftsman' ? 'craftsman' : 'user';

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.getNotifications(user.id, recipientType, 20);
      if (res.success) {
        setNotifications(res.data);
        setUnread(res.unreadCount);
      }
    } catch {
      // Tiho ignoriši
    }
  }, [user, recipientType]);

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const resolveNavigation = (n) => {
    switch (n.type) {
      case 'job_request_received':
        // Majstor klikne → otvara konkretan zahtev
        return n.relatedEntityId ? `/job-request/${n.relatedEntityId}` : '/dashboard';
      case 'job_request_accepted':
      case 'job_request_declined':
        // Korisnik klikne → ide na dashboard da vidi status
        return '/dashboard';
      case 'job_confirmed':
      case 'payment_captured':
        // Majstor klikne → dashboard sa zakazanim poslovima
        return '/dashboard';
      case 'review_received':
        // Majstor klikne → njegov profil, sekcija recenzija
        return n.relatedEntityId ? `/craftsmen/${n.relatedEntityId}#reviews` : '/dashboard';
      default:
        return null;
    }
  };

  const handleMarkRead = (n) => {
    // 1. Navigiraj odmah
    const path = resolveNavigation(n);
    if (path) navigate(path);

    setOpen(false);

    // 2. Ukloni iz liste i briši iz baze u pozadini
    setNotifications((prev) => prev.filter((x) => x.notificationId !== n.notificationId));
    if (!n.isRead) setUnread((c) => Math.max(0, c - 1));

    api.deleteNotification(n.notificationId).catch(() => {});
  };

  const handleMarkAllRead = async () => {
    await api.markAllNotificationsRead(user.id, recipientType).catch(() => {});
    setNotifications([]);
    setUnread(0);
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition"
        aria-label="Notifikacije"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <h3 className="text-white font-semibold text-sm">Notifikacije</h3>
            {notifications.length > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-blue-400 hover:text-blue-300 transition"
              >
                Obriši sve
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-gray-500 text-sm">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Nema notifikacija
              </div>
            ) : (
              notifications.map((n) => {
                const meta = TYPE_META[n.type] ?? TYPE_META.general;
                const Icon = meta.icon;
                return (
                  <button
                    key={n.notificationId}
                    onClick={() => handleMarkRead(n)}
                    className={`w-full text-left flex gap-3 px-4 py-3 hover:bg-gray-700/60 transition border-b border-gray-700/50 last:border-0 ${
                      !n.isRead ? 'bg-blue-900/10' : ''
                    }`}
                  >
                    <div className={`flex-shrink-0 mt-0.5 ${meta.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className={`text-sm font-medium leading-tight ${!n.isRead ? 'text-white' : 'text-gray-300'}`}>
                          {n.title}
                        </p>
                        {!n.isRead && (
                          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-400 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[11px] text-gray-500 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}