import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { db } from '../../lib/firebase';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { MessageSquare, ChevronRight, User } from 'lucide-react-native';

interface Conversation {
  id: string;
  participants: string[];
  participantNames?: Record<string, string>;
  lastMessage?: string;
  updatedAt?: any;
}

export const MessagingInboxScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchConversations = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'direct_conversations'),
          where('participants', 'array-contains', user.uid)
        );
        const snapshot = await getDocs(q);
        const items: Conversation[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Conversation[];
        setConversations(items);
      } catch (err) {
        console.error('Error fetching conversations:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConversations();
  }, [user]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages Inbox</Text>
        <Text style={styles.headerSubtitle}>Direct chats with players, coaches, and venue owners</Text>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => {
          const otherUserId = item.participants?.find((p) => p !== user?.uid) || 'User';
          const otherName = item.participantNames?.[otherUserId] || 'TruFit Member';
          return (
            <TouchableOpacity
              style={styles.convCard}
              onPress={() => navigation.navigate('ChatThread', { conversationId: item.id, recipientName: otherName })}
            >
              <View style={styles.avatar}>
                <User size={20} color="#10b981" />
              </View>
              <View style={styles.convInfo}>
                <Text style={styles.convName}>{otherName}</Text>
                <Text style={styles.lastMessage} numberOfLines={1}>
                  {item.lastMessage || 'Tap to start chatting...'}
                </Text>
              </View>
              <ChevronRight size={18} color="#64748b" />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MessageSquare size={40} color="#334155" />
            <Text style={styles.emptyText}>No direct conversations yet.</Text>
            <Text style={styles.emptySubtext}>Connect with other players from matches, lobbies, or teams to start messaging.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090d16' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#090d16' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#ffffff' },
  headerSubtitle: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  listContainer: { padding: 16 },
  convCard: { backgroundColor: '#0f172a', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1e293b', flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  convInfo: { flex: 1 },
  convName: { color: '#ffffff', fontWeight: 'bold', fontSize: 15, marginBottom: 4 },
  lastMessage: { color: '#94a3b8', fontSize: 13 },
  emptyContainer: { padding: 40, alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16, marginTop: 16 },
  emptySubtext: { color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 6, lineHeight: 18 }
});
