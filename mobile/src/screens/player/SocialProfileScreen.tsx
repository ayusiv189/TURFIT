import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Modal
} from 'react-native';
import { db } from '../../lib/firebase';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  orderBy
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import {
  User as UserIcon,
  MapPin,
  Calendar,
  Award,
  Users,
  Grid,
  Heart,
  MessageSquare,
  ShieldCheck,
  ArrowLeft,
  UserPlus,
  UserCheck
} from 'lucide-react-native';

interface SocialPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  mediaUrl?: string;
  likes: string[];
  commentsCount: number;
  createdAt: any;
}

export const SocialProfileScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { userId } = route.params || {};
  const { user } = useAuth();
  const [profileUser, setProfileUser] = useState<any>(null);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'posts' | 'about'>('posts');

  const isSelf = user?.uid === userId;

  useEffect(() => {
    const fetchProfileAndPosts = async () => {
      if (!userId) return;
      try {
        // 1. Fetch user profile
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setProfileUser(data);
          setFollowersCount(data.followersCount || 0);
          setFollowingCount(data.followingCount || 0);
        } else {
          setProfileUser({
            uid: userId,
            displayName: 'TruFit Member',
            role: 'PLAYER',
            bio: 'Passionate athlete on TruFit.',
          });
        }

        // 2. Fetch user's social posts
        const q = query(
          collection(db, 'socialPosts'),
          where('authorId', '==', userId),
          orderBy('createdAt', 'desc')
        );
        const postSnap = await getDocs(q);
        const postList = postSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as SocialPost[];
        setPosts(postList);

        // 3. Check follow status if not self
        if (!isSelf && user) {
          const followId = `${user.uid}_${userId}`;
          const followSnap = await getDoc(doc(db, 'follows', followId));
          setIsFollowing(followSnap.exists());
        }
      } catch (err) {
        console.error('Error loading social profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndPosts();
  }, [userId, user]);

  const handleToggleFollow = async () => {
    if (!user || isSelf) return;
    const followId = `${user.uid}_${userId}`;
    const followRef = doc(db, 'follows', followId);
    try {
      if (isFollowing) {
        await deleteDoc(followRef);
        setIsFollowing(false);
        setFollowersCount((prev) => Math.max(0, prev - 1));
      } else {
        await setDoc(followRef, {
          id: followId,
          followerId: user.uid,
          targetId: userId,
          createdAt: new Date().toISOString(),
        });
        setIsFollowing(true);
        setFollowersCount((prev) => prev + 1);
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
    }
  };

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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{profileUser?.displayName || 'Profile'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card Header */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {profileUser?.avatarUrl || profileUser?.photoURL ? (
              <Image source={{ uri: profileUser.avatarUrl || profileUser.photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <UserIcon size={32} color="#10b981" />
              </View>
            )}
          </View>

          <Text style={styles.name}>{profileUser?.displayName || 'TruFit Member'}</Text>
          <Text style={styles.username}>@{profileUser?.username || userId?.substring(0, 8)}</Text>
          <Text style={styles.roleBadge}>{profileUser?.role || 'PLAYER'}</Text>

          {profileUser?.bio ? (
            <Text style={styles.bio}>{profileUser.bio}</Text>
          ) : null}

          {/* Stats Bar */}
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{posts.length}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => navigation.navigate('FollowersFollowing', { userId, initialTab: 'followers' })}
            >
              <Text style={styles.statValue}>{followersCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => navigation.navigate('FollowersFollowing', { userId, initialTab: 'following' })}
            >
              <Text style={styles.statValue}>{followingCount}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
          </View>

          {!isSelf && user && (
            <TouchableOpacity
              style={[styles.followBtn, isFollowing && styles.followingBtn]}
              onPress={handleToggleFollow}
            >
              {isFollowing ? (
                <>
                  <UserCheck size={16} color="#ffffff" />
                  <Text style={styles.followBtnText}>Following</Text>
                </>
              ) : (
                <>
                  <UserPlus size={16} color="#ffffff" />
                  <Text style={styles.followBtnText}>Follow</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
            onPress={() => setActiveTab('posts')}
          >
            <Grid size={18} color={activeTab === 'posts' ? '#10b981' : '#64748b'} />
            <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>Posts Grid</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'about' && styles.activeTab]}
            onPress={() => setActiveTab('about')}
          >
            <Award size={18} color={activeTab === 'about' ? '#10b981' : '#64748b'} />
            <Text style={[styles.tabText, activeTab === 'about' && styles.activeTabText]}>About</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'posts' ? (
          <View style={styles.postsGrid}>
            {posts.length === 0 ? (
              <View style={styles.emptyPosts}>
                <Text style={styles.emptyText}>No posts shared yet.</Text>
              </View>
            ) : (
              posts.map((post) => (
                <TouchableOpacity
                  key={post.id}
                  style={styles.gridItem}
                  onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
                >
                  {post.mediaUrl ? (
                    <Image source={{ uri: post.mediaUrl }} style={styles.gridImage} />
                  ) : (
                    <View style={styles.gridTextOnly}>
                      <Text style={styles.gridTextSnippet} numberOfLines={4}>
                        {post.content}
                      </Text>
                    </View>
                  )}
                  <View style={styles.gridOverlay}>
                    <View style={styles.overlayMetric}>
                      <Heart size={12} color="#ffffff" fill="#ffffff" />
                      <Text style={styles.overlayText}>{post.likes?.length || 0}</Text>
                    </View>
                    <View style={styles.overlayMetric}>
                      <MessageSquare size={12} color="#ffffff" fill="#ffffff" />
                      <Text style={styles.overlayText}>{post.commentsCount || 0}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        ) : (
          <View style={styles.aboutCard}>
            <Text style={styles.sectionTitle}>Athlete Details</Text>
            <View style={styles.infoRow}>
              <MapPin size={16} color="#94a3b8" />
              <Text style={styles.infoText}>{profileUser?.city || 'City not specified'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Calendar size={16} color="#94a3b8" />
              <Text style={styles.infoText}>
                Joined {profileUser?.createdAt ? new Date(profileUser.createdAt).toLocaleDateString() : 'Recently'}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090d16' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#090d16' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b', flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
  scrollContent: { paddingBottom: 32 },
  profileCard: { backgroundColor: '#0f172a', margin: 16, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#1e293b', alignItems: 'center' },
  avatarContainer: { marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: '#10b981' },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#10b981' },
  name: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginBottom: 2 },
  username: { color: '#94a3b8', fontSize: 13, marginBottom: 8 },
  roleBadge: { backgroundColor: '#10b98120', color: '#10b981', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, fontSize: 11, fontWeight: 'bold', overflow: 'hidden', marginBottom: 12 },
  bio: { color: '#cbd5e1', fontSize: 13, textAlign: 'center', marginBottom: 16, lineHeight: 18 },
  statsBar: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#1e293b', paddingVertical: 12, marginBottom: 16 },
  statItem: { alignItems: 'center' },
  statValue: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  statLabel: { color: '#64748b', fontSize: 11, marginTop: 2 },
  followBtn: { backgroundColor: '#10b981', width: '100%', paddingVertical: 10, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  followingBtn: { backgroundColor: '#334155' },
  followBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  tabsRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1e293b', backgroundColor: '#0f172a', marginHorizontal: 16, borderRadius: 12, overflow: 'hidden' },
  tab: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 12 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#10b981' },
  tabText: { color: '#64748b', fontWeight: 'bold', fontSize: 13 },
  activeTabText: { color: '#ffffff' },
  postsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 8 },
  gridItem: { width: '31%', aspectRatio: 1, backgroundColor: '#0f172a', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#1e293b', position: 'relative' },
  gridImage: { width: '100%', height: '100%' },
  gridTextOnly: { flex: 1, padding: 8, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  gridTextSnippet: { color: '#ffffff', fontSize: 10, textAlign: 'center' },
  gridOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', opacity: 0, gap: 8 },
  overlayMetric: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  overlayText: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' },
  emptyPosts: { width: '100%', padding: 40, alignItems: 'center' },
  emptyText: { color: '#64748b', fontSize: 13 },
  aboutCard: { backgroundColor: '#0f172a', margin: 16, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#1e293b' },
  sectionTitle: { color: '#ffffff', fontSize: 15, fontWeight: 'bold', marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  infoText: { color: '#cbd5e1', fontSize: 13 }
});
