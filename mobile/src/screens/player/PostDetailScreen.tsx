import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { db } from '../../lib/firebase';
import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Heart, MessageSquare, Send, Trash2, User } from 'lucide-react-native';

interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  text: string;
  createdAt: any;
}

interface Post {
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

export const PostDetailScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { postId } = route.params || {};
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [commentText, setCommentText] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchPostAndComments = async () => {
    if (!postId) return;
    try {
      const postRef = doc(db, 'socialPosts', postId);
      const postSnap = await getDoc(postRef);
      if (postSnap.exists()) {
        setPost({ id: postSnap.id, ...postSnap.data() } as Post);
      }

      const q = query(
        collection(db, 'socialPosts', postId, 'comments'),
        orderBy('createdAt', 'asc')
      );
      const commSnap = await getDocs(q);
      const commList = commSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Comment[];
      setComments(commList);
    } catch (err) {
      console.error('Error fetching post details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPostAndComments();
  }, [postId]);

  const handleLike = async () => {
    if (!user || !post) return;
    const postRef = doc(db, 'socialPosts', post.id);
    const hasLiked = post.likes?.includes(user.uid);
    try {
      if (hasLiked) {
        await updateDoc(postRef, { likes: arrayRemove(user.uid) });
      } else {
        await updateDoc(postRef, { likes: arrayUnion(user.uid) });
      }
      fetchPostAndComments();
    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !user || !post) return;
    const text = commentText.trim();
    setCommentText('');
    setSubmitting(true);
    try {
      const commentData = {
        authorId: user.uid,
        authorName: user.email?.split('@')[0] || 'TruFit Athlete',
        text,
        createdAt: Timestamp.now(),
      };
      await addDoc(collection(db, 'socialPosts', post.id, 'comments'), commentData);
      const postRef = doc(db, 'socialPosts', post.id);
      await updateDoc(postRef, {
        commentsCount: (post.commentsCount || 0) + 1,
      });
      fetchPostAndComments();
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!post || !user || post.authorId !== user.uid) return;
    try {
      await deleteDoc(doc(db, 'socialPosts', post.id));
      navigation.goBack();
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={20} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post Not Found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const liked = user && post.likes?.includes(user.uid);
  const isMyPost = user && post.authorId === user.uid;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post Details</Text>
        {isMyPost && (
          <TouchableOpacity onPress={handleDeletePost} style={styles.deleteBtn}>
            <Trash2 size={18} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.postCard}>
            <TouchableOpacity
              style={styles.postHeader}
              onPress={() => navigation.navigate('SocialProfile', { userId: post.authorId })}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{post.authorName?.charAt(0) || 'P'}</Text>
              </View>
              <View>
                <Text style={styles.authorName}>{post.authorName}</Text>
                <Text style={styles.postTime}>
                  {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                </Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.postContent}>{post.content}</Text>

            {post.mediaUrl ? (
              <Image source={{ uri: post.mediaUrl }} style={styles.postImage} resizeMode="cover" />
            ) : null}

            <View style={styles.postActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
                <Heart size={18} color={liked ? '#ef4444' : '#94a3b8'} fill={liked ? '#ef4444' : 'none'} />
                <Text style={[styles.actionText, liked && { color: '#ef4444' }]}>{post.likes?.length || 0}</Text>
              </TouchableOpacity>

              <View style={styles.actionBtn}>
                <MessageSquare size={18} color="#94a3b8" />
                <Text style={styles.actionText}>{comments.length}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.commentsTitle}>Comments ({comments.length})</Text>

          {comments.map((item) => (
            <View key={item.id} style={styles.commentCard}>
              <View style={styles.commentAvatar}>
                <User size={14} color="#10b981" />
              </View>
              <View style={styles.commentBody}>
                <Text style={styles.commentAuthor}>{item.authorName}</Text>
                <Text style={styles.commentText}>{item.text}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Write a comment..."
            placeholderTextColor="#64748b"
            value={commentText}
            onChangeText={setCommentText}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!commentText.trim() || submitting) && styles.disabledSend]}
            disabled={!commentText.trim() || submitting}
            onPress={handleAddComment}
          >
            <Send size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090d16' },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#090d16' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
  deleteBtn: { padding: 4 },
  scrollContent: { padding: 16 },
  postCard: { backgroundColor: '#0f172a', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#1e293b' },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },
  authorName: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  postTime: { color: '#64748b', fontSize: 10, marginTop: 2 },
  postContent: { color: '#e2e8f0', fontSize: 14, lineHeight: 20, marginBottom: 12 },
  postImage: { width: '100%', height: 220, borderRadius: 12, marginBottom: 12 },
  postActions: { flexDirection: 'row', gap: 24, borderTopWidth: 1, borderTopColor: '#1e293b', paddingTop: 12, marginTop: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  commentsTitle: { color: '#ffffff', fontWeight: 'bold', fontSize: 15, marginBottom: 12 },
  commentCard: { backgroundColor: '#0f172a', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#1e293b', flexDirection: 'row', gap: 10 },
  commentAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  commentBody: { flex: 1 },
  commentAuthor: { color: '#ffffff', fontWeight: 'bold', fontSize: 12, marginBottom: 2 },
  commentText: { color: '#cbd5e1', fontSize: 13 },
  inputBar: { padding: 12, backgroundColor: '#0f172a', borderTopWidth: 1, borderTopColor: '#1e293b', flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, backgroundColor: '#1e293b', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, color: '#ffffff', fontSize: 14 },
  sendBtn: { backgroundColor: '#10b981', width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  disabledSend: { opacity: 0.5 }
});
