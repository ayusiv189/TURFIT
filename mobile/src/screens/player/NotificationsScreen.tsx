import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { getUserNotifications, markNotificationAsRead } from '../../services/communityService';
import { InAppNotification } from '../../types';
import { Bell, Check, Calendar, Award, Shield, Tag } from 'lucide-react-native';

export const NotificationsScreen: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const data = await getUserNotifications(user.uid);
      setNotifications(data);
    } catch (err) {
      console.warn('Error loading notifications:', err);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
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

  const getIcon = (type: string) => {
    switch (type) {
      case 'BOOKING':
        return <Calendar size={16} color="#10b981" />;
      case 'REWARD':
        return <Award size={16} color="#f59e0b" />;
      case 'LOBBY':
      case 'TEAM':
        return <Shield size={16} color="#38bdf8" />;
      default:
        return <Tag size={16} color="#94a3b8" />;
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
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
              <Text style={styles.time}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Bell size={40} color="#64748b" />
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptyDesc}>You're all caught up! Game alerts and reminders will appear here.</Text>
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
  listContent: {
    padding: 16,
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
