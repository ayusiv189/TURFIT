import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { db } from '../../lib/firebase';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, User as UserIcon, UserPlus, UserCheck } from 'lucide-react-native';

interface FollowUserItem {
  id: string;
  followerId?: string;
  targetId?: string;
  followerName?: string;
  followerAvatar?: string;
  followerRole?: string;
  targetName?: string;
  targetAvatar?: string;
}

export const FollowersFollowingScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { userId, initialTab = 'followers' } = route.params || {};
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [items, setItems] = useState<FollowUserItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchList = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        let q;
        if (activeTab === 'followers') {
          q = query(collection(db, 'follows'), where('targetId', '==', userId));
        } else {
          q = query(collection(db, 'follows'), where('followerId', '==', userId));
        }
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as FollowUserItem[];
        setItems(list);

        // Check which ones current user is following
        if (user) {
          const map: Record<string, boolean> = {};
          for (const item of list) {
            const targetId = activeTab === 'followers' ? item.followerId : item.targetId;
            if (targetId && targetId !== user.uid) {
              const followId = `${user.uid}_${targetId}`;
              const followSnap = await getDoc(doc(db, 'follows', followId));
              map[targetId] = followSnap.exists();
            }
          }
          setFollowingMap(map);
        }
      } catch (err) {
        console.error('Error fetching followers/following list:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchList();
  }, [userId, activeTab, user]);

  const handleToggleFollow = async (targetUid: string) => {
    if (!user || targetUid === user.uid) return;
    const followId = `${user.uid}_${targetUid}`;
    const followRef = doc(db, 'follows', followId);
    const isCurrentlyFollowing = followingMap[targetUid];
    try {
      if (isCurrentlyFollowing) {
        await deleteDoc(followRef);
        setFollowingMap((prev) => ({ ...prev, [targetUid]: false }));
      } else {
        await setDoc(followRef, {
          id: followId,
          followerId: user.uid,
          targetId: targetUid,
          createdAt: new Date().toISOString(),
        });
        setFollowingMap((prev) => ({ ...prev, [targetUid]: true }));
      }
    } catch (err) {
      console.error('Error toggling follow in list:', err);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Connections</Text>
      </View>

      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'followers' && styles.activeTab]}
          onPress={() => setActiveTab('followers')}
        >
          <Text style={[styles.tabText, activeTab === 'followers' && styles.activeTabText]}>Followers</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'following' && styles.activeTab]}
          onPress={() => setActiveTab('following')}
        >
          <Text style={[styles.tabText, activeTab === 'following' && styles.activeTabText]}>Following</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => {
            const targetUid = activeTab === 'followers' ? item.followerId : item.targetId;
            const name = activeTab === 'followers' ? item.followerName : item.targetName;
            const avatar = activeTab === 'followers' ? item.followerAvatar : item.targetAvatar;
            const isSelf = user?.uid === targetUid;
            const isFollowing = targetUid ? followingMap[targetUid] : false;

            return (
              <TouchableOpacity
                style={styles.userCard}
                onPress={() => targetUid && navigation.navigate('SocialProfile', { userId: targetUid })}
              >
                {avatar ? (
                  <Image source={{ uri: avatar }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <UserIcon size={18} color="#10b981" />
                  </View>
                )}
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{name || 'TruFit Athlete'}</Text>
                  <Text style={styles.userRole}>@{targetUid?.substring(0, 8)}</Text>
                </View>

                {!isSelf && targetUid && user && (
                  <TouchableOpacity
                    style={[styles.miniFollowBtn, isFollowing && styles.miniFollowingBtn]}
                    onPress={() => handleToggleFollow(targetUid)}
                  >
                    {isFollowing ? (
                      <UserCheck size={14} color="#ffffff" />
                    ) : (
                      <UserPlus size={14} color="#ffffff" />
                    )}
                    <Text style={styles.miniFollowText}>{isFollowing ? 'Following' : 'Follow'}</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No {activeTab} found.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090d16' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#090d16' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b', flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
  tabsRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1e293b', backgroundColor: '#0f172a' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#10b981' },
  tabText: { color: '#64748b', fontWeight: 'bold', fontSize: 14 },
  activeTabText: { color: '#ffffff' },
  listContainer: { padding: 16 },
  userCard: { backgroundColor: '#0f172a', borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#1e293b', flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  userInfo: { flex: 1 },
  userName: { color: '#ffffff', fontWeight: 'bold', fontSize: 14, marginBottom: 2 },
  userRole: { color: '#64748b', fontSize: 11 },
  miniFollowBtn: { backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniFollowingBtn: { backgroundColor: '#334155' },
  miniFollowText: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#64748b', fontSize: 13 }
});
