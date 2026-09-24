import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView
} from 'react-native';
import { db } from '../../lib/firebase';
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { Send, ArrowLeft } from 'lucide-react-native';

interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: any;
}

export const ChatThreadScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { conversationId, recipientName } = route.params || {};
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);

  const fetchMessages = async () => {
    if (!conversationId) return;
    try {
      const q = query(
        collection(db, 'direct_conversations', conversationId, 'messages'),
        orderBy('createdAt', 'asc')
      );
      const snapshot = await getDocs(q);
      const items: Message[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Message[];
      setMessages(items);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000); // Poll for real-time update
    return () => clearInterval(interval);
  }, [conversationId]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !user || !conversationId) return;
    const text = inputText.trim();
    setInputText('');
    setSending(true);
    try {
      const msgData = {
        senderId: user.uid,
        text,
        createdAt: Timestamp.now(),
      };
      await addDoc(collection(db, 'direct_conversations', conversationId, 'messages'), msgData);
      await updateDoc(doc(db, 'direct_conversations', conversationId), {
        lastMessage: text,
        updatedAt: Timestamp.now(),
      });
      fetchMessages();
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{recipientName || 'Chat'}</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          renderItem={({ item }) => {
            const isMe = item.senderId === user?.uid;
            return (
              <View style={[styles.bubbleWrapper, isMe ? styles.myBubbleWrapper : styles.otherBubbleWrapper]}>
                <View style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}>
                  <Text style={[styles.bubbleText, isMe ? styles.myBubbleText : styles.otherBubbleText]}>
                    {item.text}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#64748b"
            value={inputText}
            onChangeText={setInputText}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || sending) && styles.disabledSend]}
            disabled={!inputText.trim() || sending}
            onPress={handleSendMessage}
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
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b', flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
  chatContainer: { flex: 1 },
  messageList: { padding: 16 },
  bubbleWrapper: { marginBottom: 12, flexDirection: 'row' },
  myBubbleWrapper: { justifyContent: 'flex-end' },
  otherBubbleWrapper: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '75%', padding: 12, borderRadius: 16 },
  myBubble: { backgroundColor: '#10b981', borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: '#1e293b', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, lineHeight: 18 },
  myBubbleText: { color: '#ffffff' },
  otherBubbleText: { color: '#e2e8f0' },
  inputBar: { padding: 12, backgroundColor: '#0f172a', borderTopWidth: 1, borderTopColor: '#1e293b', flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, backgroundColor: '#1e293b', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, color: '#ffffff', fontSize: 14 },
  sendBtn: { backgroundColor: '#10b981', width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  disabledSend: { opacity: 0.5 }
});
