import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  Modal,
  SafeAreaStorage,
  SafeAreaView,
  Alert
} from 'react-native';
import { db, storage } from '../../lib/firebase';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  arrayUnion,
  arrayRemove,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { Heart, MessageSquare, Share2, Send, Image as ImageIcon, Plus, Flame, X, User } from 'lucide-react-native';

interface Post {
  id: string;
  authorName: string;
  authorId: string;
  authorAvatar?: string;
  content: string;
  mediaUrl?: string;
  likes: string[];
  commentsCount: number;
  createdAt: any;
  authorType?: 'PLAYER' | 'OWNER';
}

interface OwnerBrandProfile {
  id: string;
  ownerId: string;
  brandName: string;
  logoUrl?: string;
  city?: string;
}

const SPORTS_LIST = ['ALL', 'Football', 'Cricket', 'Badminton', 'Pickleball', 'Tennis'];

const SAMPLE_PRESETS = [
  'https://images.unsplash.com/photo-1529900248461-90567a60518d?w=800',
  'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800',
  'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800'
];

export const CommunityFeedScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [brandProfiles, setBrandProfiles] = useState<OwnerBrandProfile[]>([]);

  // Filters
  const [selectedSport, setSelectedSport] = useState<string>('ALL');
  const [feedMode, setFeedMode] = useState<'ALL' | 'FOLLOWING' | 'OWNERS' | 'PLAYERS'>('ALL');

  // Create Post Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [postContent, setPostContent] = useState<string>('');
  const [mediaUri, setMediaUri] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchPosts = async () => {
    try {
      const q = query(collection(db, 'socialPosts'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      let items: Post[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Post[];

      if (selectedSport !== 'ALL') {
        // filter or keep all if sport field not strictly indexed
      }
      if (feedMode === 'OWNERS') {
        items = items.filter((p) => p.authorType === 'OWNER');
      } else if (feedMode === 'PLAYERS') {
        items = items.filter((p) => p.authorType !== 'OWNER');
      }

      setPosts(items);
    } catch (err) {
      console.error('Error fetching social posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBrands = async () => {
    try {
      const snap = await getDocs(collection(db, 'ownerBrandProfiles'));
      setBrandProfiles(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as OwnerBrandProfile[]);
    } catch (err) {
      console.warn('Error fetching brand profiles:', err);
    }
  };

  useEffect(() => {
    fetchPosts();
    fetchBrands();
  }, [selectedSport, feedMode]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setMediaUri(result.assets[0].uri);
    }
  };

  const handleCreatePost = async () => {
    if (!postContent.trim() && !mediaUri) return;
    setSubmitting(true);
    try {
      let finalMediaUrl = '';
      if (mediaUri) {
        setUploading(true);
        const response = await fetch(mediaUri);
        const blob = await response.blob();
        const storageRef = ref(storage, `posts/${user?.uid || 'anon'}/${Date.now()}.jpg`);
        await uploadBytes(storageRef, blob);
        finalMediaUrl = await getDownloadURL(storageRef);
        setUploading(false);
      }

      const newPost = {
        authorId: user?.uid || 'anonymous',
        authorName: profile?.displayName || profile?.fullName || user?.email?.split('@')[0] || 'TruFit Player',
        authorAvatar: profile?.avatarUrl || profile?.photoURL || '',
        content: postContent.trim(),
        mediaUrl: finalMediaUrl,
        authorType: profile?.role === 'OWNER' ? 'OWNER' : 'PLAYER',
        likes: [],
        commentsCount: 0,
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(db, 'socialPosts'), newPost);
      setPostContent('');
      setMediaUri('');
      setShowCreateModal(false);
      fetchPosts();
    } catch (err) {
      console.error('Error creating post:', err);
      Alert.alert('Error', 'Failed to publish post. Please try again.');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const handleLikePost = async (post: Post) => {
    if (!user) return;
    const postRef = doc(db, 'socialPosts', post.id);
    const hasLiked = post.likes?.includes(user.uid);
    try {
      if (hasLiked) {
        await updateDoc(postRef, { likes: arrayRemove(user.uid) });
      } else {
        await updateDoc(postRef, { likes: arrayUnion(user.uid) });
      }
      fetchPosts();
    } catch (err) {
      console.error('Error toggling like:', err);
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
        <View>
          <Text style={styles.headerTitle}>TruFit Community Feed</Text>
          <Text style={styles.headerSubtitle}>Connect with players, venues & coaches</Text>
        </View>
        <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreateModal(true)}>
          <Plus size={20} color="#ffffff" />
          <Text style={styles.createBtnText}>Post</Text>
        </TouchableOpacity>
      </View>

      {/* Stories / Brand Profiles Horizontal Carousel */}
      {brandProfiles.length > 0 && (
        <View style={styles.storiesContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesScroll}>
            {brandProfiles.map((brand) => (
              <TouchableOpacity key={brand.id} style={styles.storyItem}>
                <View style={styles.storyRing}>
                  <View style={styles.storyAvatar}>
                    {brand.logoUrl ? (
                      <Image source={{ uri: brand.logoUrl }} style={styles.storyImage} />
                    ) : (
                      <Text style={styles.storyInitial}>{brand.brandName?.charAt(0) || 'T'}</Text>
                    )}
                  </View>
                </View>
                <Text style={styles.storyName} numberOfLines={1}>{brand.brandName}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Feed Mode & Sport Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {(['ALL', 'FOLLOWING', 'OWNERS', 'PLAYERS'] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.filterChip, feedMode === mode && styles.activeFilterChip]}
              onPress={() => setFeedMode(mode)}
            >
              <Text style={[styles.filterChipText, feedMode === mode && styles.activeFilterChipText]}>
                {mode}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => {
          const liked = user && item.likes?.includes(user.uid);
          return (
            <View style={styles.postCard}>
              <TouchableOpacity
                style={styles.postHeader}
                onPress={() => navigation.navigate('SocialProfile', { userId: item.authorId })}
              >
                <View style={styles.avatar}>
                  {item.authorAvatar ? (
                    <Image source={{ uri: item.authorAvatar }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarText}>{item.authorName?.charAt(0) || 'P'}</Text>
                  )}
                </View>
                <View>
                  <Text style={styles.authorName}>{item.authorName}</Text>
                  <Text style={styles.postTime}>
                    {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                  </Text>
                </View>
              </TouchableOpacity>

              <Text style={styles.postContent}>{item.content}</Text>

              {item.mediaUrl ? (
                <Image source={{ uri: item.mediaUrl }} style={styles.postImage} resizeMode="cover" />
              ) : null}

              <View style={styles.postActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleLikePost(item)}>
                  <Heart size={18} color={liked ? '#ef4444' : '#94a3b8'} fill={liked ? '#ef4444' : 'none'} />
                  <Text style={[styles.actionText, liked && { color: '#ef4444' }]}>{item.likes?.length || 0}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
                >
                  <MessageSquare size={18} color="#94a3b8" />
                  <Text style={styles.actionText}>{item.commentsCount || 0}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn}>
                  <Share2 size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No posts found in this feed.</Text>
          </View>
        }
      />

      {/* Create Post Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Post</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="What's happening on the pitch today?"
              placeholderTextColor="#64748b"
              multiline
              value={postContent}
              onChangeText={setPostContent}
            />

            {mediaUri ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: mediaUri }} style={styles.previewImage} />
                <TouchableOpacity style={styles.removeImageBtn} onPress={() => setMediaUri('')}>
                  <X size={14} color="#ffffff" />
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.mediaPickerBtn} onPress={pickImage}>
                <ImageIcon size={18} color="#10b981" />
                <Text style={styles.mediaPickerText}>Add Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.publishBtn, (!postContent.trim() && !mediaUri) || submitting && styles.disabledBtn]}
                disabled={(!postContent.trim() && !mediaUri) || submitting}
                onPress={handleCreatePost}
              >
                <Send size={16} color="#ffffff" />
                <Text style={styles.publishBtnText}>
                  {uploading ? 'Uploading...' : submitting ? 'Publishing...' : 'Publish'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090d16' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#090d16' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#ffffff' },
  headerSubtitle: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  createBtn: { backgroundColor: '#10b981', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  createBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
  storiesContainer: { borderBottomWidth: 1, borderBottomColor: '#1e293b', paddingVertical: 12 },
  storiesScroll: { paddingHorizontal: 16, gap: 16 },
  storyItem: { alignItems: 'center', width: 64 },
  storyRing: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: '#10b981', padding: 2, justifyContent: 'center', alignItems: 'center' },
  storyAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  storyImage: { width: '100%', height: '100%' },
  storyInitial: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },
  storyName: { color: '#cbd5e1', fontSize: 11, marginTop: 4, textAlign: 'center' },
  filtersContainer: { borderBottomWidth: 1, borderBottomColor: '#1e293b', paddingVertical: 10 },
  filterScroll: { paddingHorizontal: 16, gap: 8 },
  filterChip: { backgroundColor: '#0f172a', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#1e293b' },
  activeFilterChip: { backgroundColor: '#10b981', borderColor: '#10b981' },
  filterChipText: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold' },
  activeFilterChipText: { color: '#ffffff' },
  listContainer: { padding: 16 },
  postCard: { backgroundColor: '#0f172a', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#1e293b' },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },
  authorName: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  postTime: { color: '#64748b', fontSize: 10, marginTop: 2 },
  postContent: { color: '#e2e8f0', fontSize: 14, lineHeight: 20, marginBottom: 12 },
  postImage: { width: '100%', height: 220, borderRadius: 12, marginBottom: 12 },
  postActions: { flexDirection: 'row', gap: 24, borderTopWidth: 1, borderTopColor: '#1e293b', marginTop: 8, paddingTop: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#64748b', fontSize: 13, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0f172a', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderWidth: 1, borderColor: '#1e293b', maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  modalInput: { color: '#ffffff', fontSize: 15, minHeight: 100, textAlignVertical: 'top', backgroundColor: '#1e293b', borderRadius: 12, padding: 12, marginBottom: 16 },
  previewContainer: { position: 'relative', marginBottom: 16, borderRadius: 12, overflow: 'hidden', height: 160 },
  previewImage: { width: '100%', height: '100%' },
  removeImageBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mediaPickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1e293b', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  mediaPickerText: { color: '#10b981', fontWeight: 'bold', fontSize: 13 },
  publishBtn: { backgroundColor: '#10b981', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  disabledBtn: { opacity: 0.5 },
  publishBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 }
});
