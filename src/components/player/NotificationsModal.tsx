import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  sendInAppNotification,
  registerWebPushToken,
} from '../../lib/pushNotificationService';
import { InAppNotification } from '../../types';
import {
  Bell,
  CheckCheck,
  Calendar,
  Award,
  Shield,
  Tag,
  Smartphone,
  Send,
  X,
  CheckCircle2,
  RefreshCw,
  Clock,
  Sparkles,
  Zap,
  MessageSquare,
} from 'lucide-react';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (text: string, type?: 'success' | 'error') => void;
  onOpenDirectMessageWithUser?: (userId: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  showToast,
  onOpenDirectMessageWithUser,
}) => {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [sendingTest, setSendingTest] = useState<boolean>(false);
  const [browserPermission, setBrowserPermission] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  useEffect(() => {
    if (!user || !isOpen) return;

    // Register web push token
    registerWebPushToken(user.uid).then(() => {
      if (typeof Notification !== 'undefined') {
        setBrowserPermission(Notification.permission);
      }
    });

    // Subscribe to live Firestore notifications
    const unsubscribe = subscribeUserNotifications(user.uid, (data) => {
      setNotifications(data);
    });

    return () => unsubscribe();
  }, [user, isOpen]);

  const handleRequestBrowserPermission = async () => {
    if (typeof Notification === 'undefined') {
      showToast('Notifications are not supported in this browser.', 'error');
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      setBrowserPermission(perm);
      if (perm === 'granted') {
        showToast('Browser notifications enabled! 🔔', 'success');
        if (user) {
          await registerWebPushToken(user.uid);
        }
      } else {
        showToast('Notification permission was not granted.', 'error');
      }
    } catch (err) {
      console.warn('Error requesting permission:', err);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, read: true } : n))
      );

      const clickedNotif = notifications.find((n) => n.id === id);
      if (clickedNotif && clickedNotif.type === 'DIRECT_MESSAGE' && clickedNotif.senderId) {
        if (onOpenDirectMessageWithUser) {
          onOpenDirectMessageWithUser(clickedNotif.senderId);
        }
        onClose();
      }
    } catch (err) {
      console.warn('Error marking read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      await markAllNotificationsAsRead(user.uid);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, read: true }))
      );
      showToast('All notifications marked as read', 'success');
    } catch (err) {
      console.warn('Error marking all read:', err);
    }
  };

  const handleSendTestPush = async () => {
    if (!user) return;
    setSendingTest(true);
    try {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      await sendInAppNotification({
        recipientId: user.uid,
        title: 'Match Alert: Slot Confirmed! ⚽',
        message: `Your TruFit session is active at ${timeStr}. Live match lobby and gate pass are ready!`,
        type: 'BOOKING_CONFIRMED',
      });
      showToast('Real-time test alert dispatched! 🔔', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Could not send test notification.', 'error');
    } finally {
      setSendingTest(false);
    }
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.isRead && !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'BOOKING':
      case 'BOOKING_CONFIRMED':
      case 'SLOT_REMINDER':
        return <Calendar className="w-4 h-4 text-emerald-400" />;
      case 'REWARD':
      case 'LOYALTY_REWARD':
        return <Award className="w-4 h-4 text-amber-400" />;
      case 'LOBBY':
      case 'TEAM':
      case 'MATCH':
        return <Shield className="w-4 h-4 text-cyan-400" />;
      case 'DIRECT_MESSAGE':
        return <MessageSquare className="w-4 h-4 text-indigo-400" />;
      default:
        return <Tag className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Notifications Center</span>
                {unreadCount > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">Real-time alerts, bookings & match invitations</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Browser Permission & Test Push Banner */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="text-xs font-bold text-white block">Web Push Service</span>
              <span className="text-[11px] text-slate-400">
                Status: {browserPermission === 'granted' ? '✅ Enabled' : '⚠️ Permission Needed'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {browserPermission !== 'granted' && (
              <button
                onClick={handleRequestBrowserPermission}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-md transition-colors cursor-pointer flex-1 sm:flex-initial text-center"
              >
                Enable Alerts
              </button>
            )}

            <button
              disabled={sendingTest}
              onClick={handleSendTestPush}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 flex-1 sm:flex-initial"
            >
              {sendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Test Push</span>
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="p-4 flex-1 overflow-y-auto space-y-2.5">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Bell className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-xs font-bold text-white">No notifications yet</p>
              <p className="text-[11px] text-slate-500">
                You'll receive instant alerts when your slots are confirmed or teams challenge your lobby!
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const isUnread = !notif.isRead && !notif.read;
              return (
                <div
                  key={notif.id}
                  onClick={() => handleMarkRead(notif.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    isUnread
                      ? 'bg-slate-800/80 border-indigo-500/40 shadow-md ring-1 ring-indigo-500/20'
                      : 'bg-slate-950/40 border-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 shrink-0 mt-0.5">
                    {getIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={`text-xs font-bold truncate ${isUnread ? 'text-white' : 'text-slate-300'}`}>
                        {notif.title}
                      </h4>
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{notif.message}</p>
                    <span className="text-[10px] text-slate-500 mt-1.5 block">
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">{notifications.length} total notifications</span>
            <button
              onClick={handleMarkAllRead}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark all as read</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
