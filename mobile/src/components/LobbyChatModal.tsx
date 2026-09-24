import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import {
  X,
  Send,
  Trash2,
  Clock,
  Flame,
  Shield,
  MessageSquare,
  Crown,
  CheckCircle2,
  Info,
  Sparkles,
} from 'lucide-react-native';
import { Lobby, LobbyMessage } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
  sendLobbyChatMessage,
  subscribeLobbyMessages,
  purgeAllLobbyMessages,
  cleanupExpiredLobbyMessages,
  getLobbyChatExpiryLabel,
} from '../services/lobbyChatService';

interface LobbyChatModalProps {
  visible: boolean;
  lobby: Lobby | null;
  onClose: () => void;
}

const QUICK_PRESETS = [
  '👋 Hey squad!',
  '⏱️ On my way, 5 mins!',
  '👕 What jersey color?',
  '📍 Arrived at the turf!',
  '🔥 Great game everyone!',
];

export const LobbyChatModal: React.FC<LobbyChatModalProps> = ({
  visible,
  lobby,
  onClose,
}) => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<LobbyMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [purging, setPurging] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const isHost = lobby?.hostId === user?.uid;
  const expiryInfo = getLobbyChatExpiryLabel(lobby);

  // Subscribe to real-time messages & run quiet cleanup on open
  useEffect(() => {
    if (!visible || !lobby?.id) {
      setMessages([]);
      return;
    }

    // Free background cleanup of expired messages
    cleanupExpiredLobbyMessages(lobby.id).catch(() => {});

    const unsubscribe = subscribeLobbyMessages(lobby.id, (updatedMessages) => {
      setMessages(updatedMessages);
    });

    return () => {
      unsubscribe();
    };
  }, [visible, lobby?.id]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  if (!visible || !lobby) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend || inputText).trim();
    if (!content || !user || !lobby) return;

    setSending(true);
    if (!textToSend) setInputText('');

    try {
      const senderName = profile?.displayName || user.displayName || 'Squad Player';
      await sendLobbyChatMessage({
        lobbyId: lobby.id,
        senderId: user.uid,
        senderName,
        senderPhotoURL: profile?.photoURL || user.photoURL || null,
        text: content,
        isHost,
        lobby,
      });
    } catch (err: any) {
      Alert.alert('Chat Error', err?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handlePurgeChat = () => {
    Alert.alert(
      'Purge Ephemeral Chat',
      'Are you sure you want to delete all squad messages immediately? This cannot be undone and helps protect athlete privacy post-match.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purge All Messages',
          style: 'destructive',
          onPress: async () => {
            setPurging(true);
            try {
              const count = await purgeAllLobbyMessages(lobby.id);
              Alert.alert('Chat Cleared', `Successfully purged ${count} messages from this lobby.`);
            } catch (err: any) {
              Alert.alert('Purge Error', err?.message || 'Could not purge chat.');
            } finally {
              setPurging(false);
            }
          },
        },
      ]
    );
  };

  const formatMessageTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.chatIconBadge}>
                <MessageSquare size={16} color="#38bdf8" />
              </View>
              <View style={styles.headerTitleBox}>
                <View style={styles.headerTitleRow}>
                  <Text style={styles.headerTitle} numberOfLines={1}>
                    {lobby.name}
                  </Text>
                  <View style={styles.sportPill}>
                    <Text style={styles.sportPillText}>{(lobby.sport || 'SPORTS').toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.headerSub}>
                  {lobby.turfName} • {lobby.startTime}
                </Text>
              </View>
            </View>

            <View style={styles.headerRightActions}>
              {isHost && (
                <TouchableOpacity
                  style={styles.purgeBtn}
                  onPress={handlePurgeChat}
                  disabled={purging || messages.length === 0}
                  accessibilityLabel="Purge squad messages"
                >
                  <Trash2 size={15} color={messages.length > 0 ? '#ef4444' : '#64748b'} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <X size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Ephemeral Policy Banner */}
          <View style={styles.ephemeralBanner}>
            <View style={styles.ephemeralBannerIcon}>
              <Flame size={14} color="#f59e0b" />
            </View>
            <View style={styles.ephemeralBannerTextCol}>
              <View style={styles.ephemeralBadgeRow}>
                <Text style={styles.ephemeralBadgeText}>Ephemeral Squad Chat</Text>
                <View style={styles.expiryPill}>
                  <Clock size={10} color="#38bdf8" />
                  <Text style={styles.expiryPillText}>{expiryInfo.timeRemainingLabel}</Text>
                </View>
              </View>
              <Text style={styles.ephemeralPolicyDesc}>
                {expiryInfo.policyNote}
              </Text>
            </View>
          </View>

          {/* Messages Feed */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <MessageSquare size={24} color="#475569" />
                </View>
                <Text style={styles.emptyTitle}>Squad Chat is Open</Text>
                <Text style={styles.emptyDesc}>
                  Coordinate match timings, kit colors, and pitch arrival with your squad.
                </Text>
                <Text style={styles.emptyEphemeralTip}>
                  🔒 Zero permanent history: All messages automatically purge 2h post-match.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isMe = item.senderId === user?.uid;
              const isMsgHost = item.isHost;

              if (item.type === 'SYSTEM') {
                return (
                  <View style={styles.systemMessageContainer}>
                    <Text style={styles.systemMessageText}>{item.text}</Text>
                  </View>
                );
              }

              return (
                <View
                  style={[
                    styles.messageRow,
                    isMe ? styles.messageRowRight : styles.messageRowLeft,
                  ]}
                >
                  {!isMe && (
                    <View style={styles.senderAvatar}>
                      {item.senderPhotoURL ? (
                        <Image
                          source={{ uri: item.senderPhotoURL }}
                          style={styles.senderAvatarImg}
                        />
                      ) : (
                        <Text style={styles.senderAvatarText}>
                          {(item.senderName || 'P').charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                  )}

                  <View
                    style={[
                      styles.messageBubble,
                      isMe ? styles.messageBubbleRight : styles.messageBubbleLeft,
                    ]}
                  >
                    {!isMe && (
                      <View style={styles.senderInfoRow}>
                        <Text style={styles.senderName}>{item.senderName}</Text>
                        {isMsgHost && (
                          <View style={styles.hostBadge}>
                            <Crown size={9} color="#f59e0b" />
                            <Text style={styles.hostBadgeText}>Host</Text>
                          </View>
                        )}
                      </View>
                    )}

                    <Text
                      style={[
                        styles.messageText,
                        isMe ? styles.messageTextRight : styles.messageTextLeft,
                      ]}
                    >
                      {item.text}
                    </Text>

                    <View style={styles.messageFooter}>
                      <Text
                        style={[
                          styles.messageTime,
                          isMe ? styles.messageTimeRight : styles.messageTimeLeft,
                        ]}
                      >
                        {formatMessageTime(item.createdAt)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            }}
          />

          {/* Quick reply presets */}
          <View style={styles.presetBar}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={QUICK_PRESETS}
              keyExtractor={(item) => item}
              contentContainerStyle={styles.presetScroll}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.presetChip}
                  onPress={() => handleSendMessage(item)}
                  disabled={sending}
                >
                  <Text style={styles.presetChipText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>

          {/* Chat Input Bar */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Message squad teammates..."
              placeholderTextColor="#64748b"
              multiline
              maxLength={300}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!inputText.trim() || sending) && styles.sendBtnDisabled,
              ]}
              onPress={() => handleSendMessage()}
              disabled={!inputText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#030712" />
              ) : (
                <Send size={16} color="#030712" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    height: '82%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0c1220',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  chatIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBox: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    maxWidth: '75%',
  },
  sportPill: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  sportPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#38bdf8',
  },
  headerSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  purgeBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  closeBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  ephemeralBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  ephemeralBannerIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  ephemeralBannerTextCol: {
    flex: 1,
  },
  ephemeralBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  ephemeralBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fbbf24',
  },
  expiryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  expiryPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38bdf8',
  },
  ephemeralPolicyDesc: {
    fontSize: 10,
    color: '#cbd5e1',
    lineHeight: 14,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 10,
  },
  emptyEphemeralTip: {
    fontSize: 11,
    color: '#fbbf24',
    textAlign: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
    gap: 8,
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  senderAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  senderAvatarImg: {
    width: '100%',
    height: '100%',
  },
  senderAvatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  messageBubble: {
    maxWidth: '78%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  messageBubbleLeft: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  messageBubbleRight: {
    backgroundColor: '#0284c7',
    borderTopRightRadius: 4,
  },
  senderInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38bdf8',
  },
  hostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  hostBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#fbbf24',
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
  },
  messageTextLeft: {
    color: '#f8fafc',
  },
  messageTextRight: {
    color: '#ffffff',
    fontWeight: '500',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 3,
  },
  messageTime: {
    fontSize: 9,
  },
  messageTimeLeft: {
    color: '#94a3b8',
  },
  messageTimeRight: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  systemMessageContainer: {
    alignSelf: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  systemMessageText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
  },
  presetBar: {
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    backgroundColor: '#0c1220',
    paddingVertical: 8,
  },
  presetScroll: {
    paddingHorizontal: 12,
    gap: 6,
  },
  presetChip: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#090d16',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#131b2e',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 13,
    maxHeight: 80,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#334155',
    opacity: 0.5,
  },
});
