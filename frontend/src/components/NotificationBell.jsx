import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, BriefcaseBusiness, CheckCircle, XCircle, Info, Star, X, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const API_BASE = 'http://localhost:5114';

const TYPE_META = {
  job_request_received:        { icon: BriefcaseBusiness, color: 'text-blue-400',    label: 'Novi zahtev'                     },
  job_request_accepted:        { icon: CheckCircle,        color: 'text-green-400',   label: 'Zahtev prihvaćen'                },
  job_request_declined:        { icon: XCircle,            color: 'text-red-400',     label: 'Zahtev odbijen'                  },
  job_confirmed:               { icon: CheckCircle,        color: 'text-green-400',   label: 'Posao zakazan'                   },
  job_started:                 { icon: BriefcaseBusiness,  color: 'text-blue-400',    label: 'Posao započet'                   },
  job_finished:                { icon: CheckCircle,        color: 'text-purple-400',  label: 'Posao završen'                   },
  job_cancelled:               { icon: XCircle,            color: 'text-red-400',     label: 'Posao otkazan'                   },
  payment_captured:            { icon: CheckCircle,        color: 'text-green-400',   label: 'Uplata potvrđena'                },
  review_received:             { icon: Star,               color: 'text-yellow-400',  label: 'Nova ocena'                      },
  reschedule_proposed:         { icon: BriefcaseBusiness,  color: 'text-purple-400',  label: 'Predlog novog termina'           },
  reschedule_accepted:         { icon: CheckCircle,        color: 'text-green-400',   label: 'Termin promenjen'                },
  reschedule_declined:         { icon: XCircle,            color: 'text-red-400',     label: 'Predlog odbijen'                 },
  survey_proposed:             { icon: Search,             color: 'text-amber-400',   label: 'Predlog izviđanja'               },
  survey_declined:             { icon: XCircle,            color: 'text-red-400',     label: 'Izviđanje odbijeno'              },
  survey_scheduled:            { icon: Search,             color: 'text-amber-400',   label: 'Izviđanje zakazano'              },
  survey_reschedule_proposed:  { icon: BriefcaseBusiness,  color: 'text-purple-400',  label: 'Predlog termina izviđanja'      },
  survey_reschedule_accepted:  { icon: CheckCircle,        color: 'text-green-400',   label: 'Termin izviđanja promenjen'     },
  survey_cancelled:            { icon: XCircle,            color: 'text-red-400',     label: 'Izviđanje otkazano'              },
  survey_completed:            { icon: CheckCircle,        color: 'text-green-400',   label: 'Izviđanje završeno'              },
  general:                     { icon: Info,               color: 'text-gray-400',    label: 'Obaveštenje'                     },
};

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)    return 'malopre';
  if (diff < 3600)  return `pre ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `pre ${Math.floor(diff / 3600)}h`;
  return `pre ${Math.floor(diff / 86400)} dana`;
}

function resolveNavigation(n, role) {
  const userDash = role === 'Craftsman' ? '/dashboard' : '/users/dashboard';
  switch (n.type) {
    case 'job_request_received':
      return n.relatedEntityId ? `/job-request/${n.relatedEntityId}` : '/dashboard';
    case 'job_request_accepted':
    case 'job_request_declined':
    case 'job_confirmed':
    case 'job_started':
    case 'job_finished':
    case 'job_cancelled':
    case 'payment_captured':
    case 'reschedule_proposed':
    case 'reschedule_accepted':
    case 'reschedule_declined':
      return userDash;
    case 'survey_proposed':
    case 'survey_declined':
    case 'survey_scheduled':
    case 'survey_reschedule_proposed':
    case 'survey_reschedule_accepted':
    case 'survey_cancelled':
    case 'survey_completed':
      return userDash;
    case 'review_received':
      return n.relatedEntityId ? `/craftsmen/${n.relatedEntityId}#reviews` : '/dashboard';
    default:
      return null;
  }
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [modal, setModal] = useState(null);
  const dropdownRef = useRef(null);

  const recipientType = user?.role === 'Craftsman' ? 'craftsman' : 'user';

  // Initial fetch of existing notifications
  useEffect(() => {
    if (!user) return;
    api.getNotifications(user.id, recipientType, 20)
      .then(res => {
        if (res.success) {
          setNotifications(res.data);
          setUnread(res.unreadCount);
        }
      })
      .catch(() => {});
  }, [user?.id, recipientType]);

  // SSE connection for real-time notifications
  useEffect(() => {
    if (!user) return;
    const url = `${API_BASE}/api/notifications/stream?recipientId=${user.id}&recipientType=${recipientType}`;
    const es = new EventSource(url);

    es.onmessage = (e) => {
      try {
        const n = JSON.parse(e.data);
        setNotifications(prev => {
          if (prev.some(x => x.notificationId === n.notificationId)) return prev;
          return [n, ...prev];
        });
        setUnread(c => c + 1);
      } catch {
        // ignore malformed messages
      }
    };

    es.onerror = () => {
      // EventSource auto-reconnects; nothing to do
    };

    return () => es.close();
  }, [user?.id, recipientType]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const removeNotification = (id) => {
    setNotifications(prev => {
      const n = prev.find(x => x.notificationId === id);
      if (n && !n.isRead) setUnread(c => Math.max(0, c - 1));
      return prev.filter(x => x.notificationId !== id);
    });
    api.deleteNotification(id).catch(() => {});
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    removeNotification(id);
  };

  const handleClick = (n) => {
    // Mark as read locally
    if (!n.isRead) {
      setNotifications(prev => prev.map(x => x.notificationId === n.notificationId ? { ...x, isRead: true } : x));
      setUnread(c => Math.max(0, c - 1));
      api.markNotificationRead(n.notificationId).catch(() => {});
    }
    setOpen(false);
    setModal(n);
  };

  const handleModalNavigate = () => {
    const path = resolveNavigation(modal, user?.role);
    removeNotification(modal.notificationId);
    setModal(null);
    if (path) navigate(path);
  };

  const handleDeleteAll = async () => {
    const ids = notifications.map(n => n.notificationId);
    setNotifications([]);
    setUnread(0);
    ids.forEach(id => api.deleteNotification(id).catch(() => {}));
  };

  if (!user) return null;

  return (
    <>
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
                  onClick={handleDeleteAll}
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
                    <div
                      key={n.notificationId}
                      className={`flex gap-3 px-4 py-3 border-b border-gray-700/50 last:border-0 group ${
                        !n.isRead ? 'bg-blue-900/10' : ''
                      }`}
                    >
                      <button
                        onClick={() => handleClick(n)}
                        className="flex gap-3 flex-1 min-w-0 text-left hover:bg-gray-700/40 -mx-1 px-1 rounded transition"
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
                      <button
                        onClick={(e) => handleDelete(e, n.notificationId)}
                        className="flex-shrink-0 self-start mt-0.5 p-1 rounded text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition opacity-0 group-hover:opacity-100"
                        aria-label="Obriši"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal — renderuje se u document.body via portal da izbegne parent stacking context */}
      {modal && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const meta = TYPE_META[modal.type] ?? TYPE_META.general;
              const Icon = meta.icon;
              const path = resolveNavigation(modal, user?.role);
              return (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-full bg-gray-700 ${meta.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm">{modal.title}</p>
                      <p className="text-gray-500 text-[11px]">{timeAgo(modal.createdAt)}</p>
                    </div>
                    <button
                      onClick={() => setModal(null)}
                      className="text-gray-500 hover:text-white transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-gray-300 text-sm leading-relaxed mb-6">{modal.message}</p>

                  <div className="flex gap-3">
                    {path && (
                      <button
                        onClick={handleModalNavigate}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition"
                      >
                        Pogledaj
                      </button>
                    )}
                    <button
                      onClick={() => { removeNotification(modal.notificationId); setModal(null); }}
                      className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium rounded-xl transition"
                    >
                      Obriši
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
