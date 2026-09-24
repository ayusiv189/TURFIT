import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import {
  subscribeUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  sendPushNotification,
  registerDevicePushToken,
} from '../../services/pushNotificationService';
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
  Zap,
} from 'lucide-react-native';

export const NotificationsScreen: React.FC = () => {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(profile?.pushToken || null);

  useEffect(() => {
    if (!user) return;

    // Register & retrieve device token
    registerDevicePushToken(user.uid).then((token) => {
      if (token) setPushToken(token);
    });

    // Subscribe to real-time notifications
    const unsubscribe = subscribeUserNotifications(user.uid, (data) => {
      setNotifications(data);
    });

    return () => unsubscribe();
  }, [user]);

  const onRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    const token = await registerDevicePushToken(user.uid);
    if (token) setPushToken(token);
    setRefreshing(false);
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.warn('Error marking read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      await markAllNotificationsAsRead(user.uid);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.warn('Error marking all read:', err);
    }
  };

  const handleSendTestPush = async () => {
    if (!user) return;
    setSendingTest(true);
    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      await sendPushNotification({
        recipientId: user.uid,
        title: 'Match Alert: Slot Confirmed! ⚽',
        message: `Your TruFit session is active at ${timeStr}. Live match lobby and gate pass are ready!`,
        type: 'BOOKING_CONFIRMED',
      });
      Alert.alert(
        'Push Notification Sent! 🔔',
        'A real-time push alert was dispatched to your registered device profile.'
      );
    } catch (err: any) {
      Alert.alert('Notice', err?.message || 'Could not send test push.');
    } finally {
      setSendingTest(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'BOOKING':
      case 'SLOT_REMINDER':
        return <Calendar size={16} color="#10b981" />;
      case 'REWARD':
      case 'LOYALTY_REWARD':
        return <Award size={16} color="#f59e0b" />;
      case 'LOBBY':
      case 'TEAM':
        return <Shield size={16} color="#38bdf8" />;
      default:
        return <Tag size={16} color="#94a3b8" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <View style={styles.container}>
      {/* Device Push Status & Test Header */}
      <View style={styles.statusCard}>
        <View style={styles.statusTopRow}>
          <View style={styles.statusBadgeRow}>
            <Smartphone size={16} color="#10b981" />
            <Text style={styles.statusTitle}>Mobile Push Service</Text>
            <View style={styles.activePill}>
              <View style={styles.activeDot} />
              <Text style={styles.activePillText}>Active</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.testBtn, sendingTest && { opacity: 0.6 }]}
            onPress={handleSendTestPush}
            disabled={sendingTest}
          >
            {sendingTest ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Send size={12} color="#ffffff" />
                <Text style={styles.testBtnText}>Test Push</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.tokenSub}>
          {pushToken
            ? `Token: ${pushToken.slice(0, 24)}... (FCM & Expo Channel)`
            : 'Registering device channel with Firebase Cloud Messaging...'}
        </Text>
      </View>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <Text style={styles.sectionHeading}>
          Activity & Alerts {unreadCount > 0 && `(${unreadCount} unread)`}
        </Text>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={handleMarkAllRead}
            activeOpacity={0.7}
          >
            <CheckCheck size={14} color="#10b981" />
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.notifCard, !item.isRead && styles.unreadCard]}
            onPress={() => handleMarkRead(item.id)}
            activeOpacity={0.8}
          >
            <View style={styles.iconCircle}>{getIcon(item.type)}</View>

            <View style={styles.content}>
              <View style={styles.headerRow}>
                <Text style={styles.title}>{item.title}</Text>
                {!item.isRead && <View style={styles.unreadDot} />}
              </View>
              <Text style={styles.message}>{item.message}</Text>
              <Text style={styles.time}>
                {new Date(item.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                • {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Bell size={40} color="#64748b" />
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptyDesc}>
              You're all caught up! Game alerts, lobby invites, and booking passes will appear here in real time.
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  statusCard: {
    backgroundColor: '#0f172a',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  statusTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 5,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  activePillText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '700',
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  testBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  tokenSub: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sectionHeading: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  markAllText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
  },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: '#131b2e',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 12,
  },
  unreadCard: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0b1120',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  message: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 16,
    marginBottom: 6,
  },
  time: {
    fontSize: 10,
    color: '#64748b',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
